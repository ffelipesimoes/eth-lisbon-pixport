/**
 * PIXPORT Block 1 — Scheduled Transaction Demo
 *
 * Creates a Hedera ScheduledTransaction that defers an HBAR transfer
 * by scheduling it for future execution. This demonstrates how PIXPORT
 * can schedule agentic Pix payments to be executed after World ID
 * verification clears or after a time-lock.
 *
 * The ScheduledTransaction is a first-class Hedera primitive — no contracts needed.
 *
 * Requires .env with:
 *   HEDERA_OPERATOR_ID  — payer account
 *   HEDERA_OPERATOR_KEY — private key (DER or raw)
 */

import {
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  TransferTransaction,
  AccountId,
  Hbar,
  PrivateKey,
  Timestamp,
} from "@hashgraph/sdk";
import { buildClient, loadOperator, hashscanTx } from "./client.js";

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  PIXPORT — Scheduled Transaction Demo (Block 1)");
  console.log("═══════════════════════════════════════════════════\n");

  const op = loadOperator();
  const client = buildClient(op);
  const operatorKey = PrivateKey.fromStringDer(op.privateKey);

  // Build the inner transaction (a simple HBAR self-transfer for demo)
  const innerTransfer = new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(op.accountId), new Hbar(-1))
    .addHbarTransfer(AccountId.fromString(op.accountId), new Hbar(1));

  console.log("Creating ScheduledTransaction (deferred 1 HBAR self-transfer)...");

  // Wrap in a ScheduleCreateTransaction
  const scheduleTx = await new ScheduleCreateTransaction()
    .setScheduledTransaction(innerTransfer)
    .setScheduleMemo("PIXPORT deferred Pix payment — agentic mandate")
    .setAdminKey(operatorKey.publicKey)
    .setPayerAccountId(AccountId.fromString(op.accountId))
    .setMaxTransactionFee(new Hbar(10))
    .execute(client);

  const scheduleReceipt = await scheduleTx.getReceipt(client);
  const scheduleId = scheduleReceipt.scheduleId!.toString();
  const scheduleTxId = scheduleTx.transactionId.toString();

  console.log(`  ✅ Scheduled transaction created`);
  console.log(`     Schedule ID: ${scheduleId}`);
  console.log(`     Create TX:   ${hashscanTx(scheduleTxId)}`);
  console.log(`     HashScan:    https://hashscan.io/testnet/schedule/${scheduleId}`);

  // Sign to trigger execution immediately (all required signatures satisfied)
  console.log("\nSigning scheduled transaction to trigger execution...");
  const signTx = await new ScheduleSignTransaction()
    .setScheduleId(scheduleId)
    .setMaxTransactionFee(new Hbar(5))
    .execute(client);

  const signReceipt = await signTx.getReceipt(client);
  const signTxId = signTx.transactionId.toString();

  console.log(`  ✅ Schedule signed and executed: ${signReceipt.status}`);
  console.log(`     Sign TX:     ${hashscanTx(signTxId)}`);

  client.close();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Scheduled Transaction — HashScan URLs");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Create:   ${hashscanTx(scheduleTxId)}`);
  console.log(`  Sign/Exec: ${hashscanTx(signTxId)}`);
  console.log(`  Schedule: https://hashscan.io/testnet/schedule/${scheduleId}`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Scheduled TX demo failed:", err.message ?? err);
  process.exit(1);
});
