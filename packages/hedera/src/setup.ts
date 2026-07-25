/**
 * PIXPORT Block 1 — Hedera Testnet Setup
 *
 * Creates:
 *   1. HTS fungible token  (EURC-demo)
 *   2. HCS topic           (payment audit trail)
 *
 * Outputs HashScan URLs for each artifact.
 * Saves token ID and topic ID to stdout so they can be added to .env.
 */

import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TopicCreateTransaction,
  PrivateKey,
  AccountId,
  Hbar,
} from "@hashgraph/sdk";
import {
  buildClient,
  loadOperator,
  hashscanToken,
  hashscanTopic,
  hashscanTx,
} from "./client.js";

async function createEurcToken(): Promise<{ tokenId: string; txId: string }> {
  const op = loadOperator();
  const client = buildClient(op);

  console.log("Creating EURC-demo fungible token on Hedera TESTNET...");

  const supplyKey = PrivateKey.fromStringDER(op.privateKey);

  const tx = await new TokenCreateTransaction()
    .setTokenName("EURC Demo")
    .setTokenSymbol("EURC")
    .setTokenType(TokenType.FUNGIBLE_COMMON)
    .setDecimals(2)
    .setInitialSupply(1_000_000_00)
    .setTreasuryAccountId(AccountId.fromString(op.accountId))
    .setSupplyType(TokenSupplyType.INFINITE)
    .setAdminKey(supplyKey.publicKey)
    .setSupplyKey(supplyKey.publicKey)
    .setTokenMemo("PIXPORT EURC-demo — HIP-336 mandate token")
    .setMaxTransactionFee(new Hbar(30))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const tokenId = receipt.tokenId!.toString();
  const txId = tx.transactionId.toString();

  client.close();
  return { tokenId, txId };
}

async function createHcsTopic(): Promise<{ topicId: string; txId: string }> {
  const op = loadOperator();
  const client = buildClient(op);
  const submitKey = PrivateKey.fromStringDER(op.privateKey);

  console.log("Creating HCS audit topic on Hedera TESTNET...");

  const tx = await new TopicCreateTransaction()
    .setTopicMemo("PIXPORT payment audit trail — HCS")
    .setAdminKey(submitKey.publicKey)
    .setSubmitKey(submitKey.publicKey)
    .setMaxTransactionFee(new Hbar(5))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const topicId = receipt.topicId!.toString();
  const txId = tx.transactionId.toString();

  client.close();
  return { topicId, txId };
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  PIXPORT — Hedera Testnet Setup (Block 1)");
  console.log("═══════════════════════════════════════════════════\n");

  const { tokenId, txId: tokenTxId } = await createEurcToken();
  console.log(`  ✅ EURC-demo token created`);
  console.log(`     Token ID:    ${tokenId}`);
  console.log(`     HashScan:    ${hashscanToken(tokenId)}`);
  console.log(`     TX:          ${hashscanTx(tokenTxId)}\n`);

  const { topicId, txId: topicTxId } = await createHcsTopic();
  console.log(`  ✅ HCS audit topic created`);
  console.log(`     Topic ID:    ${topicId}`);
  console.log(`     HashScan:    ${hashscanTopic(topicId)}`);
  console.log(`     TX:          ${hashscanTx(topicTxId)}\n`);

  console.log("═══════════════════════════════════════════════════");
  console.log("  Add to .env:");
  console.log(`  HTS_TOKEN_ID=${tokenId}`);
  console.log(`  HCS_TOPIC_ID=${topicId}`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Setup failed:", err.message ?? err);
  process.exit(1);
});
