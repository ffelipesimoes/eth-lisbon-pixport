/**
 * Hedera integration for the gateway.
 *
 * - checkAllowance: queries Mirror Node REST API (no SDK required)
 * - logDecisionToHcs: submits an audit message to HCS via the Hashgraph SDK
 *
 * All credentials read from env vars; never hardcoded.
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TopicMessageSubmitTransaction,
  TopicId,
} from "@hashgraph/sdk";
import "dotenv/config";

const MIRROR_NODE = "https://testnet.mirrornode.hedera.com";
const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID ?? "";
const HTS_TOKEN_ID = process.env.HTS_TOKEN_ID ?? "";

function buildClient(): Client {
  const accountId = process.env.HEDERA_OPERATOR_ID;
  const privateKey = process.env.HEDERA_OPERATOR_KEY;
  if (!accountId || !privateKey) {
    throw new Error("Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY");
  }
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromStringDer(privateKey),
  );
  return client;
}

export interface AllowanceResult {
  allowed: boolean;
  /** Remaining allowance in token's smallest unit (e.g. cents for 2-decimal token) */
  remainingUnits: bigint;
  /** Remaining allowance as decimal BRL string */
  remainingBrl: string;
  reason?: string;
}

/**
 * Check the HIP-336 token allowance for a spender on the treasury account
 * via the Hedera Mirror Node REST API.
 *
 * ownerAccountId  — account that holds the tokens (treasury)
 * spenderAccountId — account whose allowance we query
 * requestedAmountBrl — amount requested in BRL (e.g. "50.00")
 */
export async function checkAllowance(
  ownerAccountId: string,
  spenderAccountId: string,
  requestedAmountBrl: string,
  tokenId: string = HTS_TOKEN_ID,
): Promise<AllowanceResult> {
  if (!tokenId) {
    return { allowed: false, remainingUnits: 0n, remainingBrl: "0.00", reason: "HTS_TOKEN_ID not configured" };
  }

  const url = `${MIRROR_NODE}/api/v1/accounts/${ownerAccountId}/allowances/tokens?spender.id=${spenderAccountId}&token.id=${tokenId}`;

  let data: { allowances?: Array<{ amount_granted: number; amount: number }> };
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return { allowed: false, remainingUnits: 0n, remainingBrl: "0.00", reason: `Mirror Node error: ${resp.status}` };
    }
    data = (await resp.json()) as typeof data;
  } catch (err) {
    return { allowed: false, remainingUnits: 0n, remainingBrl: "0.00", reason: `Mirror Node unreachable: ${String(err)}` };
  }

  const allowances = data.allowances ?? [];
  if (allowances.length === 0) {
    return { allowed: false, remainingUnits: 0n, remainingBrl: "0.00", reason: "No allowance found for spender" };
  }

  // Mirror Node returns: amount_granted (original), amount (remaining)
  const entry = allowances[0];
  const remainingUnits = BigInt(entry.amount ?? 0);
  // Token has 2 decimals (EURC-demo)
  const remainingBrl = (Number(remainingUnits) / 100).toFixed(2);

  // Convert requested BRL to token units (2 decimals)
  const requestedUnits = BigInt(Math.round(parseFloat(requestedAmountBrl) * 100));

  if (requestedUnits > remainingUnits) {
    return {
      allowed: false,
      remainingUnits,
      remainingBrl,
      reason: `Requested ${requestedAmountBrl} BRL exceeds remaining allowance ${remainingBrl} BRL`,
    };
  }

  return { allowed: true, remainingUnits, remainingBrl };
}

export interface HcsLogResult {
  sequenceNumber: number;
  transactionId: string;
  hashscanUrl: string;
}

/**
 * Submit a structured audit message to the HCS topic.
 * Always called for both approved and rejected payments.
 */
export async function logDecisionToHcs(
  message: Record<string, unknown>,
  topicId: string = HCS_TOPIC_ID,
): Promise<HcsLogResult> {
  if (!topicId) {
    throw new Error("HCS_TOPIC_ID not configured");
  }

  const client = buildClient();
  try {
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(JSON.stringify(message))
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const txId = tx.transactionId.toString();
    const seqNum = receipt.topicSequenceNumber?.toNumber() ?? 0;

    // HashScan URL for the topic message
    const hashscanUrl = `https://hashscan.io/testnet/topic/${topicId}`;

    return { sequenceNumber: seqNum, transactionId: txId, hashscanUrl };
  } finally {
    client.close();
  }
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

  const url = `${MIRROR_NODE}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;
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
