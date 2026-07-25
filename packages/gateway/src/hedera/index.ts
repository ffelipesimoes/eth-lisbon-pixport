/**
 * Gateway Hedera adapter — thin wrapper over @pixport/hedera.
 *
 * Uses HederaEngineer's reusable primitives:
 *   checkAllowance()    — Mirror Node REST (no tx)
 *   logDecisionToHcs()  — HCS TopicMessageSubmitTransaction
 *   fetchHcsMessages()  — Mirror Node REST for audit trail
 *
 * All credentials read from env; never hardcoded.
 */

import {
  checkAllowance as hederaCheckAllowance,
  logDecisionToHcs as hederaLogDecision,
  type HcsDecision,
} from "@pixport/hedera";

const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";
const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID ?? "";
const HTS_TOKEN_ID = process.env.HTS_TOKEN_ID ?? "";
const HEDERA_TREASURY_ID = process.env.HEDERA_TREASURY_ID ?? process.env.HEDERA_OPERATOR_ID ?? "";

export interface AllowanceResult {
  allowed: boolean;
  remainingUnits: bigint;
  remainingBrl: string;
  reason?: string;
}

/**
 * Check the HIP-336 token allowance for a spender on the treasury account.
 * Delegates to @pixport/hedera checkAllowance (Mirror Node REST).
 *
 * @param ownerAccountId      Token holder (treasury, e.g. 0.0.9742864)
 * @param spenderAccountId    Spender whose allowance we check (payerAccountId from mandate)
 * @param requestedAmountBrl  Requested amount as decimal BRL string (e.g. "50.00")
 * @param tokenId             HTS token ID override (defaults to HTS_TOKEN_ID env)
 */
export async function checkAllowance(
  ownerAccountId: string,
  spenderAccountId: string,
  requestedAmountBrl: string,
  tokenId: string = HTS_TOKEN_ID,
): Promise<AllowanceResult> {
  if (!tokenId) {
    return {
      allowed: false,
      remainingUnits: 0n,
      remainingBrl: "0.00",
      reason: "HTS_TOKEN_ID not configured",
    };
  }

  try {
    const result = await hederaCheckAllowance(ownerAccountId, spenderAccountId, tokenId);

    if (!result.found) {
      return {
        allowed: false,
        remainingUnits: 0n,
        remainingBrl: "0.00",
        reason: "No allowance found for spender",
      };
    }

    const requestedUnits = BigInt(Math.round(parseFloat(requestedAmountBrl) * 100));
    if (requestedUnits > result.remainingUnits) {
      return {
        allowed: false,
        remainingUnits: result.remainingUnits,
        remainingBrl: result.remainingDecimal,
        reason: `Requested ${requestedAmountBrl} BRL exceeds remaining allowance ${result.remainingDecimal} BRL`,
      };
    }

    return {
      allowed: true,
      remainingUnits: result.remainingUnits,
      remainingBrl: result.remainingDecimal,
    };
  } catch (err) {
    return {
      allowed: false,
      remainingUnits: 0n,
      remainingBrl: "0.00",
      reason: `Mirror Node error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export interface HcsLogResult {
  sequenceNumber: number;
  transactionId: string;
  hashscanUrl: string;
}

/**
 * Log a decision to the HCS topic.
 * Delegates to @pixport/hedera logDecisionToHcs.
 * The `message` is any structured object — wrapped into HcsDecision shape.
 */
export async function logDecisionToHcs(
  message: Record<string, unknown>,
  topicId: string = HCS_TOPIC_ID,
): Promise<HcsLogResult> {
  if (!topicId) {
    throw new Error("HCS_TOPIC_ID not configured");
  }

  const decision: HcsDecision = {
    mandateId: String(message.mandateId ?? ""),
    payee: String(message.payeePixKey ?? message.payee ?? ""),
    amount: String(message.amount ?? "0"),
    decision: (String(message.event ?? "").includes("approved") ? "APPROVED" : "REFUSED"),
    reason: message.reason ? String(message.reason) : undefined,
    timestamp: message.timestamp ? String(message.timestamp) : new Date().toISOString(),
    ...message,
  } as HcsDecision & Record<string, unknown>;

  const result = await hederaLogDecision(decision, topicId);

  return {
    sequenceNumber: result.sequenceNumber,
    transactionId: result.transactionId,
    hashscanUrl: result.topicUrl,
  };
}

/** Fetch latest messages from the HCS topic via Mirror Node */
export interface HcsMirrorEntry {
  sequenceNumber: number;
  topicId: string;
  consensusTimestamp: string;
  message: string;
  hashScanUrl: string;
}

export async function fetchHcsMessages(
  limit = 10,
  topicId: string = HCS_TOPIC_ID,
): Promise<HcsMirrorEntry[]> {
  if (!topicId) return [];

  const url = `${MIRROR_BASE}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      messages?: Array<{
        sequence_number: number;
        consensus_timestamp: string;
        message: string;
      }>;
    };

    return (data.messages ?? []).map((m) => ({
      sequenceNumber: m.sequence_number,
      topicId,
      consensusTimestamp: m.consensus_timestamp,
      message: Buffer.from(m.message, "base64").toString("utf8"),
      hashScanUrl: `https://hashscan.io/testnet/topic/${topicId}`,
    }));
  } catch {
    return [];
  }
}
