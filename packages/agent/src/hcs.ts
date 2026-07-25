/**
 * HCS (Hedera Consensus Service) audit logger.
 *
 * Uses hedera-agent-kit's "Submit Topic Message" tool to write every
 * pay/reject decision to the HCS audit topic. This creates an immutable,
 * timestamped, tamper-proof record on Hedera TESTNET.
 *
 * The topic ID is provided by HederaEngineer (HEDERA_HCS_TOPIC_ID in .env).
 */

import { Client, PrivateKey, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import type { HcsAuditEvent } from "./types.js";

export interface HcsConfig {
  topicId: string;
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet";
}

export function loadHcsConfig(): HcsConfig {
  const topicId = process.env.HEDERA_HCS_TOPIC_ID ?? "";
  const operatorId = process.env.HEDERA_ACCOUNT_ID ?? "";
  const operatorKey = process.env.HEDERA_PRIVATE_KEY ?? "";
  const network = (process.env.HEDERA_NETWORK ?? "testnet") as "testnet" | "mainnet";
  return { topicId, operatorId, operatorKey, network };
}

function buildHederaClient(config: HcsConfig): Client {
  const client = config.network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  client.setOperator(config.operatorId, PrivateKey.fromStringECDSA(config.operatorKey));
  return client;
}

/**
 * Write an audit event to the HCS topic.
 *
 * Returns the transaction ID string, or null if the topic is not yet configured.
 */
export async function logToHcs(
  event: HcsAuditEvent,
  config: HcsConfig,
): Promise<string | null> {
  if (!config.topicId || config.topicId.startsWith("0.0.X")) {
    console.warn("[HCS] Topic ID not configured — skipping HCS audit log (set HEDERA_HCS_TOPIC_ID)");
    return null;
  }
  if (!config.operatorId || config.operatorId.startsWith("0.0.X")) {
    console.warn("[HCS] Operator credentials not configured — skipping HCS audit log");
    return null;
  }

  const client = buildHederaClient(config);
  const message = JSON.stringify(event);

  try {
    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(config.topicId)
      .setMessage(message);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    console.log(`[HCS] Audit event logged: ${txId} (status: ${receipt.status})`);
    return txId;
  } finally {
    client.close();
  }
}
