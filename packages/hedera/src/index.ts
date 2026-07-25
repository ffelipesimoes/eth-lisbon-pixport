/**
 * @pixport/hedera — reusable on-chain primitives
 *
 * checkAllowance      → Mirror Node read (no tx)
 * logDecisionToHcs    → HCS TopicMessageSubmitTransaction
 * executeApprovedTransfer → HIP-336 approved transfer
 */

import {
  TransferTransaction,
  TopicMessageSubmitTransaction,
  TokenId,
  AccountId,
  TopicId,
  PrivateKey,
  Hbar,
} from "@hashgraph/sdk";
import "dotenv/config";
import { buildClient, hashscanTx, hashscanTopic } from "./client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AllowanceResult {
  /** Remaining allowance in token's smallest unit (EURC-demo: 2 decimals) */
  remainingUnits: bigint;
  /** Human-readable remaining, e.g. "200.00" */
  remainingDecimal: string;
  /** Was any allowance entry found? */
  found: boolean;
}

export interface HcsDecision {
  mandateId: string;
  payee: string;
  /** Amount as decimal string, e.g. "50.00" */
  amount: string;
  decision: "APPROVED" | "REFUSED";
  reason?: string;
  timestamp?: string;
}

export interface HcsLogResult {
  sequenceNumber: number;
  transactionId: string;
  /** HashScan URL for the submit transaction */
  hashscanUrl: string;
  /** HashScan URL for the topic itself */
  topicUrl: string;
}

export interface SpenderConfig {
  accountId: string;
  /** DER-encoded ED25519 private key */
  privateKey: string;
}

export interface TransferResult {
  transactionId: string;
  hashscanUrl: string;
  status: string;
}

// ─── Mirror Node ──────────────────────────────────────────────────────────────

const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";

/**
 * Query the HIP-336 token allowance remaining for a spender on the owner account.
 * Pure REST call — no SDK, no tx.
 *
 * @param ownerAccountId  Account that granted the allowance (treasury)
 * @param spenderAccountId Account whose allowance we query
 * @param tokenId         HTS token ID (e.g. "0.0.9742957")
 */
export async function checkAllowance(
  ownerAccountId: string,
  spenderAccountId: string,
  tokenId: string,
): Promise<AllowanceResult> {
  const url =
    `${MIRROR_BASE}/api/v1/accounts/${ownerAccountId}/allowances/tokens` +
    `?spender.id=${spenderAccountId}&token.id=${tokenId}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Mirror Node error ${resp.status}: ${await resp.text()}`);
  }

  const data = (await resp.json()) as {
    allowances?: Array<{ amount: number; amount_granted: number }>;
  };

  const allowances = data.allowances ?? [];
  if (allowances.length === 0) {
    return { remainingUnits: 0n, remainingDecimal: "0.00", found: false };
  }

  // `amount` is the remaining allowance (amount_granted - spent)
  const remainingUnits = BigInt(allowances[0].amount ?? 0);
  const remainingDecimal = (Number(remainingUnits) / 100).toFixed(2);
  return { remainingUnits, remainingDecimal, found: true };
}

// ─── HCS log ──────────────────────────────────────────────────────────────────

/**
 * Submit an audit decision to an HCS topic.
 * Logs both APPROVED and REFUSED decisions.
 *
 * @param decision  Structured decision payload
 * @param topicId   Override topic ID (defaults to HCS_TOPIC_ID env var)
 */
export async function logDecisionToHcs(
  decision: HcsDecision,
  topicId: string = process.env.HCS_TOPIC_ID ?? "",
): Promise<HcsLogResult> {
  if (!topicId) throw new Error("topicId required (or set HCS_TOPIC_ID)");

  const payload = {
    ...decision,
    timestamp: decision.timestamp ?? new Date().toISOString(),
  };

  const client = buildClient();
  try {
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(JSON.stringify(payload))
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const txId = tx.transactionId.toString();
    const sequenceNumber = Number(receipt.topicSequenceNumber ?? 0n);

    return {
      sequenceNumber,
      transactionId: txId,
      hashscanUrl: hashscanTx(txId),
      topicUrl: hashscanTopic(topicId),
    };
  } finally {
    client.close();
  }
}

// ─── Approved Transfer ────────────────────────────────────────────────────────

/**
 * Execute an HIP-336 approved token transfer: spender moves tokens from
 * the owner's account to the recipient.
 *
 * The spender must be the operator (pays fees). Uses the spender's
 * credentials to build a separate client — owner's key is NOT required.
 *
 * @param tokenId           HTS token ID
 * @param ownerAccountId    Account that holds the tokens (grants allowance)
 * @param recipientAccountId Account that receives the tokens
 * @param amountUnits       Amount in token's smallest unit (bigint)
 * @param spender           Spender account + private key
 */
export async function executeApprovedTransfer(
  tokenId: string,
  ownerAccountId: string,
  recipientAccountId: string,
  amountUnits: bigint,
  spender: SpenderConfig,
): Promise<TransferResult> {
  const spenderClient = buildClient({
    accountId: spender.accountId,
    privateKey: spender.privateKey,
    network: "testnet",
  });

  try {
    const tx = await new TransferTransaction()
      .addApprovedTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(ownerAccountId),
        -amountUnits,
      )
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(recipientAccountId),
        amountUnits,
      )
      .setMaxTransactionFee(new Hbar(5))
      .freezeWith(spenderClient);

    const response = await tx.execute(spenderClient);
    const receipt = await response.getReceipt(spenderClient);
    const txId = response.transactionId.toString();

    return {
      transactionId: txId,
      hashscanUrl: hashscanTx(txId),
      status: receipt.status.toString(),
    };
  } finally {
    spenderClient.close();
  }
}

// Re-export client helpers so gateway/agent need only one import
export {
  buildClient,
  loadOperator,
  hashscanTx,
  hashscanAccount,
  hashscanToken,
  hashscanTopic,
} from "./client.js";
export type { OperatorConfig } from "./client.js";
