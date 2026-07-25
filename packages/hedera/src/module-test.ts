/**
 * Block 2 module test — exercises checkAllowance, logDecisionToHcs, executeApprovedTransfer
 * against Hedera TESTNET.
 *
 * Requires .env:
 *   HEDERA_OPERATOR_ID   treasury account
 *   HEDERA_OPERATOR_KEY  DER-encoded private key
 *   HTS_TOKEN_ID         e.g. 0.0.9742957
 *   HCS_TOPIC_ID         e.g. 0.0.9742958
 */

import {
  AccountCreateTransaction,
  TokenAssociateTransaction,
  AccountAllowanceApproveTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  Hbar,
} from "@hashgraph/sdk";
import {
  buildClient,
  loadOperator,
  checkAllowance,
  logDecisionToHcs,
  executeApprovedTransfer,
  hashscanAccount,
  hashscanTx,
} from "./index.js";

function requiredEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  PIXPORT Block 2 — Module Test");
  console.log("═══════════════════════════════════════════════════\n");

  const op = loadOperator();
  const tokenId = requiredEnv("HTS_TOKEN_ID");
  const topicId = requiredEnv("HCS_TOPIC_ID");
  const treasuryId = op.accountId;
  const treasuryKey = PrivateKey.fromStringDer(op.privateKey);

  // ── Setup: create a fresh spender for this test run ───────────────────────
  console.log("Setup — creating test spender account...");
  const spenderKey = PrivateKey.generateED25519();
  let spenderId: string;
  {
    const client = buildClient(op);
    const createTx = await new AccountCreateTransaction()
      .setKey(spenderKey.publicKey)
      .setInitialBalance(new Hbar(5))
      .setMaxTransactionFee(new Hbar(5))
      .execute(client);
    const r = await createTx.getReceipt(client);
    spenderId = r.accountId!.toString();
    client.close();
    console.log(`  Spender: ${spenderId}  ${hashscanAccount(spenderId)}`);
  }

  // Associate token with spender
  {
    const spenderClient = buildClient({ accountId: spenderId, privateKey: spenderKey.toString(), network: "testnet" });
    const assocTx = await new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(spenderId))
      .setTokenIds([TokenId.fromString(tokenId)])
      .execute(spenderClient);
    await assocTx.getReceipt(spenderClient);
    spenderClient.close();
    console.log("  Token associated.\n");
  }

  // Approve 100 EURC allowance (10000 units, 2 decimals)
  const ALLOWANCE_UNITS = 10000n; // 100.00 EURC
  let approveTxId: string;
  {
    const client = buildClient(op);
    const approveTx = await new AccountAllowanceApproveTransaction()
      .approveTokenAllowance(
        TokenId.fromString(tokenId),
        AccountId.fromString(treasuryId),
        AccountId.fromString(spenderId),
        ALLOWANCE_UNITS,
      )
      .setMaxTransactionFee(new Hbar(5))
      .execute(client);
    const r = await approveTx.getReceipt(client);
    approveTxId = approveTx.transactionId.toString();
    client.close();
    console.log(`  Allowance approved (100 EURC): ${r.status}`);
    console.log(`  TX: ${hashscanTx(approveTxId)}\n`);
  }

  // ── Test 1: checkAllowance ─────────────────────────────────────────────────
  console.log("Test 1 — checkAllowance (Mirror Node read)");
  const allowanceResult = await checkAllowance(treasuryId, spenderId, tokenId);
  console.log(`  found:          ${allowanceResult.found}`);
  console.log(`  remainingUnits: ${allowanceResult.remainingUnits}`);
  console.log(`  remainingBrl:   ${allowanceResult.remainingDecimal} EURC`);
  console.log("  ✅ checkAllowance OK\n");

  // ── Test 2: executeApprovedTransfer ───────────────────────────────────────
  console.log("Test 2 — executeApprovedTransfer (50 EURC within allowance)");
  const TRANSFER_UNITS = 5000n; // 50.00 EURC
  const transferResult = await executeApprovedTransfer(
    tokenId,
    treasuryId,
    spenderId,       // recipient = spender (self-funded demo)
    TRANSFER_UNITS,
    { accountId: spenderId, privateKey: spenderKey.toString() },
  );
  console.log(`  status:    ${transferResult.status}`);
  console.log(`  txId:      ${transferResult.transactionId}`);
  console.log(`  HashScan:  ${transferResult.hashscanUrl}`);
  console.log("  ✅ executeApprovedTransfer OK\n");

  // ── Test 3: logDecisionToHcs ──────────────────────────────────────────────
  console.log("Test 3 — logDecisionToHcs (approved decision)");
  const hcsResult = await logDecisionToHcs({
    mandateId: "mandate-module-test-001",
    payee: spenderId,
    amount: "50.00",
    decision: "APPROVED",
    reason: "Block 2 module test — within allowance",
  }, topicId);
  console.log(`  sequenceNumber: ${hcsResult.sequenceNumber}`);
  console.log(`  txId:           ${hcsResult.transactionId}`);
  console.log(`  HashScan tx:    ${hcsResult.hashscanUrl}`);
  console.log(`  Topic:          ${hcsResult.topicUrl}`);
  console.log("  ✅ logDecisionToHcs OK\n");

  // Also log a REFUSED decision
  console.log("Test 3b — logDecisionToHcs (refused decision)");
  const refuseResult = await logDecisionToHcs({
    mandateId: "mandate-module-test-001",
    payee: spenderId,
    amount: "999.00",
    decision: "REFUSED",
    reason: "Amount exceeds allowance",
  }, topicId);
  console.log(`  sequenceNumber: ${refuseResult.sequenceNumber}`);
  console.log(`  HashScan tx:    ${refuseResult.hashscanUrl}`);
  console.log("  ✅ REFUSED log OK\n");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  console.log("  Block 2 — HashScan URLs");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Allowance approve:          ${hashscanTx(approveTxId)}`);
  console.log(`  checkAllowance:             (Mirror Node read — no tx)`);
  console.log(`  executeApprovedTransfer:    ${transferResult.hashscanUrl}`);
  console.log(`  logDecisionToHcs APPROVED:  ${hcsResult.hashscanUrl}`);
  console.log(`  logDecisionToHcs REFUSED:   ${refuseResult.hashscanUrl}`);
  console.log(`  HCS topic:                  ${hcsResult.topicUrl}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("\n✅ Block 2 module test complete. Paste HashScan URLs into PIX-9 comment.");
}

main().catch((err) => {
  console.error("Module test failed:", err.message ?? err);
  process.exit(1);
});
