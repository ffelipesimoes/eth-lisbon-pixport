import {
  Client,
  TopicMessageSubmitTransaction,
  AccountAllowanceApproveTransaction,
  TokenId,
  TopicId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";
const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID || "0.0.9742958";
const HTS_TOKEN_ID = process.env.HTS_TOKEN_ID || "0.0.9742957";

function buildClient(): Client {
  const accountId = process.env.HEDERA_OPERATOR_ID ?? "";
  const privateKey = process.env.HEDERA_OPERATOR_KEY ?? "";
  if (!accountId || !privateKey) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY are required");
  }
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(accountId), PrivateKey.fromString(privateKey));
  return client;
}

export interface AllowanceResult {
  allowed: boolean;
  remainingUnits: bigint;
  remainingBrl: string;
  reason?: string;
}

export async function checkAllowance(
  ownerAccountId: string,
  spenderAccountId: string,
  requestedAmountBrl: string,
  tokenId: string = HTS_TOKEN_ID,
): Promise<AllowanceResult> {
  const isMock = process.env.ALLOWANCE_MOCK === "true";
  const effectiveTokenId = tokenId || "0.0.9742957";

  if (isMock) {
    const requestedUnits = BigInt(Math.round(parseFloat(requestedAmountBrl) * 100));
    const mockRemainingUnits = 1000000n; // R$ 10.000,00 mock allowance
    if (requestedUnits > mockRemainingUnits) {
      return {
        allowed: false,
        remainingUnits: mockRemainingUnits,
        remainingBrl: "10000.00",
        reason: `Requested ${requestedAmountBrl} BRL exceeds remaining mock allowance 10000.00 BRL`,
      };
    }
    return {
      allowed: true,
      remainingUnits: mockRemainingUnits,
      remainingBrl: "10000.00",
    };
  }

  try {
    const url = `${MIRROR_BASE}/api/v1/accounts/${ownerAccountId}/allowances/tokens?spender.id=${spenderAccountId}&token.id=${effectiveTokenId}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return {
        allowed: false,
        remainingUnits: 0n,
        remainingBrl: "0.00",
        reason: `Mirror Node HTTP ${resp.status}`,
      };
    }

    const data = (await resp.json()) as { allowances?: Array<{ amount: number }> };
    const allowances = data.allowances ?? [];
    if (allowances.length === 0) {
      return {
        allowed: false,
        remainingUnits: 0n,
        remainingBrl: "0.00",
        reason: "No allowance found for spender",
      };
    }

    const remainingUnits = BigInt(allowances[0].amount ?? 0);
    const remainingBrl = (Number(remainingUnits) / 100).toFixed(2);
    const requestedUnits = BigInt(Math.round(parseFloat(requestedAmountBrl) * 100));

    if (requestedUnits > remainingUnits) {
      return {
        allowed: false,
        remainingUnits,
        remainingBrl,
        reason: `Requested ${requestedAmountBrl} BRL exceeds remaining allowance ${remainingBrl} BRL`,
      };
    }

    return {
      allowed: true,
      remainingUnits,
      remainingBrl,
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

/**
 * Submit an on-chain HIP-336 AccountAllowanceApproveTransaction to Hedera.
 * Sets the exact token allowance on the Hedera ledger for spenderAccountId.
 */
export async function approveAllowanceOnChain(
  spenderAccountId: string,
  maxAmountBrl: string,
  tokenId: string = HTS_TOKEN_ID,
): Promise<{ transactionId: string; hashscanUrl: string } | null> {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  if (!operatorId || !operatorKey || !tokenId) return null;

  const amountUnits = Math.round(parseFloat(maxAmountBrl) * 100);
  if (isNaN(amountUnits) || amountUnits < 0) return null;

  const client = buildClient();
  try {
    const tx = await new AccountAllowanceApproveTransaction()
      .approveTokenAllowance(
        TokenId.fromString(tokenId),
        AccountId.fromString(operatorId),
        AccountId.fromString(spenderAccountId),
        amountUnits,
      )
      .execute(client);

    await tx.getReceipt(client);
    const txId = tx.transactionId.toString();
    return {
      transactionId: txId,
      hashscanUrl: `https://hashscan.io/testnet/transaction/${txId}`,
    };
  } catch (err) {
    console.error("Hedera on-chain approveAllowance failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    client.close();
  }
}

export interface HcsLogResult {
  sequenceNumber: number;
  transactionId: string;
  hashscanUrl: string;
}

export async function logDecisionToHcs(
  message: Record<string, unknown>,
  topicId: string = HCS_TOPIC_ID,
): Promise<HcsLogResult> {
  if (!topicId) {
    throw new Error("HCS_TOPIC_ID not configured");
  }

  const payload = {
    ...message,
    timestamp: message.timestamp ? String(message.timestamp) : new Date().toISOString(),
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
      hashscanUrl: `https://hashscan.io/testnet/topic/${topicId}`,
    };
  } finally {
    client.close();
  }
}

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
