/**
 * PIXPORT E2E Demo — Autonomous Payment Agent
 *
 * Demonstrates the full decision flow on Hedera TESTNET:
 *   BR Code → World ID tier → HIP-336 allowance check → POST /pay → HCS log
 *
 * Runs two scenarios back-to-back:
 *   CASE 1  APPROVE — orb-verified identity + allowance sufficient → payment executes
 *   CASE 2  REJECT  — no World ID proof → tier "none" → immediate rejection
 *
 * Required env vars (see .env.example):
 *   HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, HEDERA_HCS_TOPIC_ID, HEDERA_HTS_TOKEN_ID
 *   HEDERA_TREASURY_ID   — token owner account for allowance check
 *   WORLD_MOCK=true      — bypass World ID API (no phone needed)
 *   GATEWAY_MOCK=true    — bypass real gateway HTTP call (standalone demo)
 *                          Set to false and start `npm run dev -w packages/gateway` for real E2E.
 *
 * Usage:
 *   npm run demo -w packages/agent
 */

import "dotenv/config";
import { runPaymentAgent } from "./agent.js";
import type { AgentDecision, PaymentRequest } from "./types.js";

// Standard demo BR Code (same code for all cases; amount passed explicitly via request.amount)
const BR_CODE_DEMO =
  "00020126330014BR.GOV.BCB.PIX0111123456789010208PIXPORT52040000530398654041.005802BR5913PIXPORT Demo6009Sao Paulo62070503***6304A1B2";

const PAYER_ACCOUNT = process.env.HEDERA_ACCOUNT_ID ?? "0.0.12345";
const HCS_TOPIC_ID = process.env.HEDERA_HCS_TOPIC_ID ?? process.env.HCS_TOPIC_ID ?? "0.0.9742958";

async function main(): Promise<void> {
  banner("PIXPORT — Autonomous Payment Agent E2E Demo");
  console.log(`  Payer account : ${PAYER_ACCOUNT}`);
  console.log(`  HCS topic     : ${HCS_TOPIC_ID}`);
  console.log(`  WORLD_MOCK    : ${process.env.WORLD_MOCK ?? "false"}`);
  console.log(`  GATEWAY_MOCK  : ${process.env.GATEWAY_MOCK ?? "false"}`);
  console.log();

  // ── CASE 1: APPROVE ─────────────────────────────────────────────────────────
  // Orb-verified World ID proof + real Mirror Node allowance check.
  // Payer 0.0.9743531 has 20,000 units remaining (200 BRL); 1 BRL = 100 units → passes.
  // In mock mode the World ID proof is accepted without calling the Cloud API.
  section("CASE 1 — APPROVE (orb-verified + 1 BRL payment, allowance 200 BRL remaining)");

  const case1: PaymentRequest = {
    brCode: BR_CODE_DEMO,
    amount: "1.00",              // 1 BRL = 100 units << 20,000 remaining → APPROVE
    payerAccountId: PAYER_ACCOUNT,
    mandateId: "mnd-e2e-approve-001",
    worldIdProof: {
      // Accepted as-is when WORLD_MOCK=true.
      // For a real proof, use https://simulator.worldcoin.org (see DEV_TEST.md).
      proof: "0x" + "aa".repeat(256),
      merkle_root: "0x" + "bb".repeat(32),
      nullifier_hash: "0x" + "cc".repeat(32),
      verification_level: "orb",
      signal: PAYER_ACCOUNT,
    },
  };

  const result1 = await runPaymentAgent(case1);
  printDecision(result1, HCS_TOPIC_ID);

  // ── CASE 2: REJECT (ALLOWANCE_EXCEEDED — 300 BRL > 200 BRL remaining) ───────
  // Orb-verified identity, but requested amount (300 BRL = 30,000 units) exceeds
  // the 20,000 units remaining on-chain for payer 0.0.9743531.
  // This tests the autonomous allowance enforcement path.
  section("CASE 2 — REJECT (orb-verified, 300 BRL requested > 200 BRL remaining → ALLOWANCE_EXCEEDED)");

  const case2: PaymentRequest = {
    brCode: BR_CODE_DEMO,
    amount: "300.00",            // 300 BRL = 30,000 units > 20,000 remaining → REJECT
    payerAccountId: PAYER_ACCOUNT,
    mandateId: "mnd-e2e-reject-allowance-001",
    worldIdProof: {
      proof: "0x" + "aa".repeat(256),
      merkle_root: "0x" + "bb".repeat(32),
      nullifier_hash: "0x" + "dd".repeat(32),   // different nullifier to avoid reuse detection
      verification_level: "orb",
      signal: PAYER_ACCOUNT,
    },
  };

  const result2 = await runPaymentAgent(case2);
  printDecision(result2, HCS_TOPIC_ID);

  // ── CASE 3: REJECT (TIER_INSUFFICIENT — no World ID proof) ──────────────────
  // No worldIdProof → tier "none" (maxSpend = 0) → agent rejects immediately.
  // The rejection is logged to HCS as an audit record.
  section("CASE 3 — REJECT (no World ID proof → TIER_INSUFFICIENT)");

  const case3: PaymentRequest = {
    brCode: BR_CODE_DEMO,
    amount: "1.00",
    payerAccountId: PAYER_ACCOUNT,
    mandateId: "mnd-e2e-reject-tier-001",
    // worldIdProof intentionally omitted
  };

  const result3 = await runPaymentAgent(case3);
  printDecision(result3, HCS_TOPIC_ID);

  // ── Summary ─────────────────────────────────────────────────────────────────
  banner("Demo Summary");
  console.log(`  Case 1 (APPROVE — 1 BRL, within allowance)   : ${result1.decision.toUpperCase()}`);
  console.log(`  Case 2 (REJECT  — 300 BRL, exceeds allowance): ${result2.decision.toUpperCase()}`);
  console.log(`  Case 3 (REJECT  — no World ID, tier=none)    : ${result3.decision.toUpperCase()}`);
  console.log();
  console.log(`  HCS Audit Topic  : https://hashscan.io/testnet/topic/${HCS_TOPIC_ID}`);
  console.log();

  const ok = result1.decision === "approve" &&
             result2.decision === "reject" &&
             result3.decision === "reject";
  if (!ok) console.error("  [WARN] Demo did not produce expected approve+2×reject outcomes.");
  process.exit(ok ? 0 : 1);
}

function printDecision(decision: AgentDecision, topicId: string): void {
  console.log(`\n  ▶ Decision   : ${decision.decision.toUpperCase()}`);
  console.log(`    Reason     : ${decision.reason}`);

  if (decision.decision === "approve") {
    console.log(`    Tier       : ${decision.tier.label} (max: ${decision.tier.maxSpend})`);
  } else {
    console.log(`    Code       : ${decision.code}`);
  }

  if (decision.hcsMessageId) {
    const txId = decision.hcsMessageId;
    const encoded = encodeURIComponent(txId);
    console.log(`    HCS TX ID  : ${txId}`);
    console.log(`    HashScan   : https://hashscan.io/testnet/transaction/${encoded}`);
  } else {
    console.log(`    HCS TX ID  : (not logged — check HEDERA credentials)`);
  }
  console.log();
}

function banner(text: string): void {
  console.log("═".repeat(60));
  console.log(`  ${text}`);
  console.log("═".repeat(60));
  console.log();
}

function section(text: string): void {
  console.log("─".repeat(60));
  console.log(`  ${text}`);
  console.log("─".repeat(60));
}

main().catch((err) => {
  console.error("[Demo] Fatal error:", err instanceof Error ? err.message : err);
  process.exit(2);
});
