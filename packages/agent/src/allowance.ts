/**
 * HIP-336 allowance checker via Hedera Mirror Node.
 *
 * Queries: GET /api/v1/accounts/{ownerId}/allowances/tokens
 * Returns the current approved allowance for a specific spender + token.
 *
 * We also use hedera-agent-kit to submit HCS messages, but allowance
 * reads go directly to the Mirror Node REST API (no on-chain tx needed).
 */

import type { AllowanceState } from "./types.js";

const MIRROR_NODE: Record<string, string> = {
  testnet: "https://testnet.mirrornode.hedera.com",
  mainnet: "https://mainnet-public.mirrornode.hedera.com",
};

export interface AllowanceConfig {
  network: "testnet" | "mainnet";
  tokenId: string;
  /** HTS token owner account (treasury). The HIP-336 allowance is owner → spender. */
  treasuryId: string;
}

export function loadAllowanceConfig(): AllowanceConfig {
  const network = (process.env.HEDERA_NETWORK ?? "testnet") as "testnet" | "mainnet";
  const tokenId = process.env.HEDERA_HTS_TOKEN_ID ?? process.env.HTS_TOKEN_ID ?? "";
  const treasuryId = process.env.HEDERA_TREASURY_ID ?? "";
  return { network, tokenId, treasuryId };
}

/**
 * Mirror Node token allowance item shape.
 * Docs: https://mainnet-public.mirrornode.hedera.com/api/v1/docs/#/accounts
 */
interface MirrorNodeAllowanceItem {
  owner: string;
  spender: string;
  token_id: string;
  amount: number;
  amount_granted: number;
}

interface MirrorNodeAllowanceResponse {
  allowances: MirrorNodeAllowanceItem[];
}

/**
 * Fetch the current HIP-336 token allowance from the Mirror Node.
 *
 * Returns null if no allowance has been granted for this spender+token pair.
 */
export async function fetchAllowance(
  ownerAccountId: string,
  spenderAccountId: string,
  config: AllowanceConfig,
): Promise<AllowanceState | null> {
  const base = MIRROR_NODE[config.network] ?? MIRROR_NODE.testnet;
  const url =
    `${base}/api/v1/accounts/${ownerAccountId}/allowances/tokens` +
    `?spender.id=${spenderAccountId}&token.id=${config.tokenId}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    throw new Error(
      `Mirror Node unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    throw new Error(`Mirror Node returned HTTP ${response.status} for allowance query`);
  }

  const data = (await response.json()) as MirrorNodeAllowanceResponse;

  if (!data.allowances || data.allowances.length === 0) {
    return null;
  }

  const item = data.allowances[0];
  // amount = remaining allowance; amount_granted = originally approved amount
  // spent = granted - remaining
  const approvedAmount = BigInt(Math.round(item.amount_granted));
  const remainingAmount = BigInt(Math.round(item.amount));
  const spentAmount = approvedAmount - remainingAmount;

  return {
    ownerAccountId,
    spenderAccountId,
    tokenId: item.token_id,
    approvedAmount,
    spentAmount,
    remainingAmount,
  };
}

/**
 * Check if an allowance is sufficient for a requested payment amount.
 *
 * @param allowanceState - current on-chain allowance (null = no allowance set)
 * @param requestedAmount - amount the agent wants to pay (in token minor units)
 * @param tierMaxSpend - maximum spend allowed for the payer's identity tier
 * @returns { allowed: true } or { allowed: false, reason, code }
 */
export function checkAllowanceSufficiency(
  allowanceState: AllowanceState | null,
  requestedAmount: bigint,
  tierMaxSpend: bigint,
): { allowed: boolean; reason: string; code?: string } {
  if (tierMaxSpend === 0n) {
    return {
      allowed: false,
      reason: "Identity tier allows zero spending — World ID verification required.",
      code: "TIER_INSUFFICIENT",
    };
  }

  if (!allowanceState) {
    return {
      allowed: false,
      reason: "No HIP-336 allowance has been approved for this account.",
      code: "ALLOWANCE_UNSET",
    };
  }

  if (allowanceState.remainingAmount < requestedAmount) {
    return {
      allowed: false,
      reason: `Allowance exhausted: remaining ${allowanceState.remainingAmount}, requested ${requestedAmount}. On-chain: SPENDER_DOES_NOT_HAVE_ALLOWANCE.`,
      code: "ALLOWANCE_EXCEEDED",
    };
  }

  // Tier cap: the tier defines the maximum total approved allowance, not per-tx
  if (allowanceState.approvedAmount > tierMaxSpend) {
    // The mandate was over-approved for this tier — still enforce the tier cap
    // by checking if remaining > tier cap (shouldn't happen in normal flow, but guard)
    if (requestedAmount > tierMaxSpend) {
      return {
        allowed: false,
        reason: `Requested amount ${requestedAmount} exceeds tier maximum ${tierMaxSpend}.`,
        code: "TIER_INSUFFICIENT",
      };
    }
  }

  return { allowed: true, reason: "Allowance sufficient." };
}
