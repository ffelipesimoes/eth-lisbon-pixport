/**
 * PIXPORT Block 1 — HIP-336 Allowance Demo
 *
 * Demonstrates the full mandate lifecycle on Hedera TESTNET:
 *
 *   Step 1: Treasury creates a SECOND account (the "spender")
 *   Step 2: Treasury approves a 500 EURC allowance for the spender (HIP-336)
 *   Step 3: Spender transfers 300 EURC within allowance  → SUCCESS
 *   Step 4: Spender attempts 400 EURC (exceeds remaining 200) → RECUSA
 *            Network returns: SPENDER_DOES_NOT_HAVE_ALLOWANCE
 *   Step 5: Each step logged to HCS audit topic
 *
 * All HashScan URLs printed at the end for the README.
 *
 * Requires .env with:
 *   HEDERA_OPERATOR_ID    — treasury (token holder)
 *   HEDERA_OPERATOR_KEY   — treasury private key (DER or raw)
 *   HTS_TOKEN_ID          — from `npm run setup`
 *   HCS_TOPIC_ID          — from `npm run setup`
 */

import {
  AccountCreateTransaction,
  AccountAllowanceApproveTransaction,
  TransferTransaction,
  TopicMessageSubmitTransaction,
  TokenAssociateTransaction,
  AccountBalanceQuery,
  Hbar,
  PrivateKey,
  AccountId,
  TokenId,
  Status,
} from "@hashgraph/sdk";
import {
  buildClient,
  loadOperator,
  hashscanTx,
  hashscanAccount,
} from "./client.js";

function requiredEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

async function hcsLog(
  topicId: string,
  message: object,
  operatorId: string,
  operatorKey: string
): Promise<string> {
  const client = buildClient();
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(JSON.stringify(message))
    .execute(client);
  const receipt = await tx.getReceipt(client);
  client.close();
  console.log(`     HCS audit: ${receipt.status} → ${hashscanTx(tx.transactionId.toString())}`);
  return tx.transactionId.toString();
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  PIXPORT — HIP-336 Allowance Demo (Block 1)");
  console.log("═══════════════════════════════════════════════════\n");

  const op = loadOperator();
  const tokenId = requiredEnv("HTS_TOKEN_ID");
  const topicId = requiredEnv("HCS_TOPIC_ID");

  const treasuryId = op.accountId;
  const treasuryKey = PrivateKey.fromStringDer(op.privateKey);

  console.log(`Treasury:    ${treasuryId}`);
  console.log(`Token:       ${tokenId}`);
  console.log(`Topic:       ${topicId}\n`);

  // ── Step 1: Create Spender Account ────────────────────────────────────
  console.log("Step 1/5 — Creating spender account on testnet...");
  {
    const client = buildClient(op);
    const spenderKey = PrivateKey.generateED25519();

    const createTx = await new AccountCreateTransaction()
      .setKey(spenderKey.publicKey)
      .setInitialBalance(new Hbar(10))
      .setMaxTransactionFee(new Hbar(5))
      .execute(client);

    const createReceipt = await createTx.getReceipt(client);
    const spenderId = createReceipt.accountId!.toString();
    const createTxId = createTx.transactionId.toString();

    console.log(`  ✅ Spender account created`);
    console.log(`     Spender ID:  ${spenderId}`);
    console.log(`     HashScan:    ${hashscanAccount(spenderId)}`);
    console.log(`     TX:          ${hashscanTx(createTxId)}`);

    await hcsLog(topicId, {
      event: "account_created",
      role: "spender",
      accountId: spenderId,
      txId: createTxId,
      timestamp: new Date().toISOString(),
    }, treasuryId, op.privateKey);

    // Write spender credentials to a temp object we pass through steps
    const spenderInfo = { spenderId, spenderKey, spenderKeyStr: spenderKey.toString() };
    client.close();

    // ── Step 2: Associate spender with the EURC token ──────────────────────
    console.log("\nStep 2/5 — Associating spender with EURC-demo token...");
    {
      const spenderClient = buildClient({ accountId: spenderId, privateKey: spenderKey.toString(), network: "testnet" });
      const assocTx = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(spenderId))
        .setTokenIds([TokenId.fromString(tokenId)])
        .execute(spenderClient);
      const assocReceipt = await assocTx.getReceipt(spenderClient);
      console.log(`  ✅ Token association: ${assocReceipt.status}`);
      console.log(`     TX: ${hashscanTx(assocTx.transactionId.toString())}`);
      spenderClient.close();
    }

    // ── Step 3: Approve 500 EURC allowance (HIP-336) ──────────────────────
    console.log("\nStep 3/5 — Treasury approves 500 EURC allowance for spender (HIP-336)...");
    const ALLOWANCE_AMOUNT = 50000n; // 500.00 EURC (2 decimals)
    {
      const approveClient = buildClient(op);
      const approveTx = await new AccountAllowanceApproveTransaction()
        .approveTokenAllowance(
          TokenId.fromString(tokenId),
          AccountId.fromString(treasuryId),
          AccountId.fromString(spenderId),
          ALLOWANCE_AMOUNT,
        )
        .setMaxTransactionFee(new Hbar(5))
        .execute(approveClient);

      const approveReceipt = await approveTx.getReceipt(approveClient);
      const approveTxId = approveTx.transactionId.toString();
      console.log(`  ✅ Allowance approved: ${approveReceipt.status}`);
      console.log(`     Amount:    500.00 EURC (HIP-336)`);
      console.log(`     HashScan:  ${hashscanTx(approveTxId)}`);

      await hcsLog(topicId, {
        event: "allowance_approved",
        treasury: treasuryId,
        spender: spenderId,
        tokenId,
        amount: ALLOWANCE_AMOUNT.toString(),
        txId: approveTxId,
        timestamp: new Date().toISOString(),
      }, treasuryId, op.privateKey);
      approveClient.close();

      // ── Step 4: Transfer 300 EURC WITHIN allowance → SUCCESS ─────────────
      console.log("\nStep 4/5 — Spender transfers 300 EURC within allowance → expect SUCCESS...");
      const TRANSFER_AMOUNT = 30000n; // 300.00 EURC

      // HIP-336: spender must be the transaction operator (fee payer).
      // Hedera identifies the spender by who pays the fee, not by extra signatures.
      const spenderOpConfig = { accountId: spenderId, privateKey: spenderKey.toString(), network: "testnet" as const };
      const transferClient = buildClient(spenderOpConfig);
      const transferTx = await new TransferTransaction()
        .addApprovedTokenTransfer(
          TokenId.fromString(tokenId),
          AccountId.fromString(treasuryId),
          -TRANSFER_AMOUNT,
        )
        .addTokenTransfer(
          TokenId.fromString(tokenId),
          AccountId.fromString(spenderId),
          TRANSFER_AMOUNT,
        )
        .setMaxTransactionFee(new Hbar(5))
        .freezeWith(transferClient);

      const transferResponse = await transferTx.execute(transferClient);
      const transferReceipt = await transferResponse.getReceipt(transferClient);
      const transferTxId = transferResponse.transactionId.toString();

      console.log(`  ✅ Transfer status: ${transferReceipt.status}`);
      console.log(`     Amount:    300.00 EURC`);
      console.log(`     HashScan:  ${hashscanTx(transferTxId)}`);

      await hcsLog(topicId, {
        event: "transfer_approved",
        treasury: treasuryId,
        spender: spenderId,
        tokenId,
        amount: TRANSFER_AMOUNT.toString(),
        remaining: (ALLOWANCE_AMOUNT - TRANSFER_AMOUNT).toString(),
        txId: transferTxId,
        timestamp: new Date().toISOString(),
      }, treasuryId, op.privateKey);
      transferClient.close();

      // ── Step 5: RECUSA — Transfer 400 EURC EXCEEDS remaining 200 ─────────
      console.log("\nStep 5/5 — RECUSA: Spender tries 400 EURC (exceeds 200 remaining)...");
      console.log("           Expected: SPENDER_DOES_NOT_HAVE_ALLOWANCE");
      const RECUSA_AMOUNT = 40000n; // 400.00 EURC — exceeds remaining 200

      let recusaTxId = "";
      let recusaStatus = "";
      try {
        // HIP-336: spender must be operator — reuse spenderOpConfig from Step 4
        const recusaClient = buildClient(spenderOpConfig);
        const recusaTx = await new TransferTransaction()
          .addApprovedTokenTransfer(
            TokenId.fromString(tokenId),
            AccountId.fromString(treasuryId),
            -RECUSA_AMOUNT,
          )
          .addTokenTransfer(
            TokenId.fromString(tokenId),
            AccountId.fromString(spenderId),
            RECUSA_AMOUNT,
          )
          .setMaxTransactionFee(new Hbar(5))
          .freezeWith(recusaClient);

        const recusaResponse = await recusaTx.execute(recusaClient);

        // This getReceipt() call will throw with SPENDER_DOES_NOT_HAVE_ALLOWANCE
        const recusaReceipt = await recusaResponse.getReceipt(recusaClient);
        recusaTxId = recusaResponse.transactionId.toString();
        recusaStatus = recusaReceipt.status.toString();
        recusaClient.close();
      } catch (err: unknown) {
        // Expected: ReceiptStatusError with SPENDER_DOES_NOT_HAVE_ALLOWANCE
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("SPENDER_DOES_NOT_HAVE_ALLOWANCE")) {
          recusaStatus = "SPENDER_DOES_NOT_HAVE_ALLOWANCE";
          // Extract transaction ID from error message
          const txMatch = errMsg.match(/\d+\.\d+\.\d+@\d+\.\d+/);
          if (txMatch) {
            recusaTxId = txMatch[0];
          }
          console.log(`  ❌ RECUSA confirmed: ${recusaStatus}`);
        } else {
          console.error("  Unexpected error:", errMsg);
          throw err;
        }
      }

      if (recusaTxId) {
        console.log(`     HashScan:  ${hashscanTx(recusaTxId)}`);
      }

      // Log RECUSA to HCS
      await hcsLog(topicId, {
        event: "transfer_refused",
        reason: "SPENDER_DOES_NOT_HAVE_ALLOWANCE",
        treasury: treasuryId,
        spender: spenderId,
        tokenId,
        attempted: RECUSA_AMOUNT.toString(),
        remaining: (ALLOWANCE_AMOUNT - TRANSFER_AMOUNT).toString(),
        txId: recusaTxId,
        timestamp: new Date().toISOString(),
      }, treasuryId, op.privateKey);

      // ── Summary ───────────────────────────────────────────────────────────
      console.log("\n═══════════════════════════════════════════════════");
      console.log("  HIP-336 Demo Complete — HashScan URLs");
      console.log("═══════════════════════════════════════════════════");
      console.log(`  Approve allowance:  ${hashscanTx(approveTxId)}`);
      console.log(`  Transfer (success): ${hashscanTx(transferTxId)}`);
      if (recusaTxId) {
        console.log(`  RECUSA (rejected):  ${hashscanTx(recusaTxId)}  ← README`);
      }
      console.log(`  Spender account:    ${hashscanAccount(spenderId)}`);
      console.log("═══════════════════════════════════════════════════");

      // Write spender credentials to env hint
      console.log(`\n  Add to .env for spender operations:`);
      console.log(`  HEDERA_SPENDER_ID=${spenderId}`);
      console.log(`  HEDERA_SPENDER_KEY=${spenderInfo.spenderKeyStr}`);
    }
  }
}

main().catch((err) => {
  console.error("Allowance demo failed:", err.message ?? err);
  process.exit(1);
});
