/**
 * PIXPORT E2E Demo — Autonomous Payment Agent with World Identity Check (Beta)
 *
 * Demonstrates the full decision flow on Hedera TESTNET:
 *   BR Code → World Identity Check (Beta) → tier → HIP-336 allowance check → POST /pay → HCS log
 *
 * Four scenarios (run sequentially):
 *
 *   CASE 1  APPROVE  — Identity Check ✓ (orb-verified) + 1 BRL → HIGH tier → payment executes
 *   CASE 2  REJECT   — Identity Check ✓ (orb-verified) + 300 BRL → allowance exhausted
 *   CASE 3  REJECT   — device-verified (NOT Identity Check) + 1500 BRL → TIER_INSUFFICIENT
 *                       device tier caps at 100,000 units (1,000 BRL); 1,500 BRL exceeds it
 *   CASE 4  REJECT   — no World ID proof → TIER_INSUFFICIENT (Identity Check required)
 *
 * Cases 1 + 2 together show the autonomous allowance enforcement path (orb tier).
 * Case 3 shows the Identity Check gate: device-verified users can only pay up to 1,000 BRL.
 * Case 4 shows the fallback gate: no proof → immediate rejection.
 *
 * Required env vars (see .env.example):
 *   HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, HEDERA_HCS_TOPIC_ID, HEDERA_HTS_TOKEN_ID
 *   HEDERA_TREASURY_ID   — token owner account for allowance check
 *   WORLD_MOCK=true      — bypass World Identity Check API (no phone needed)
 *   GATEWAY_MOCK=true    — bypass real gateway HTTP call (standalone demo)
 *
 * Usage:
 *   npm run demo -w packages/agent
 */

import "dotenv/config";
import { runPaymentAgent } from "./agent.js";
import type { AgentDecision, PaymentRequest } from "./types.js";
import { TIERS } from "./types.js";

// Standard demo BR Code (same code for all cases; amount passed explicitly via request.amount)
const BR_CODE_DEMO =
  "00020126330014BR.GOV.BCB.PIX0111123456789010208PIXPORT52040000530398654041.005802BR5913PIXPORT Demo6009Sao Paulo62070503***6304A1B2";

const PAYER_ACCOUNT = process.env.HEDERA_ACCOUNT_ID ?? "0.0.12345";
const HCS_TOPIC_ID = process.env.HEDERA_HCS_TOPIC_ID ?? process.env.HCS_TOPIC_ID ?? "0.0.9742958";

async function main(): Promise<void> {
  banner("PIXPORT — Autonomous Payment Agent E2E Demo");
  console.log(`  Payer account    : ${PAYER_ACCOUNT}`);
  console.log(`  HCS topic        : ${HCS_TOPIC_ID}`);
  console.log(`  WORLD_MOCK       : ${process.env.WORLD_MOCK ?? "false"}`);
  console.log(`  GATEWAY_MOCK     : ${process.env.GATEWAY_MOCK ?? "false"}`);
  console.log();
  console.log("  Identity Check (Beta) tier mapping:");
  console.log(`    orb    (Identity Check ✓) → HIGH   tier — max ${TIERS.orb.maxSpend} units`);
  console.log(`    device (not Identity Check) → MEDIUM tier — max ${TIERS.device.maxSpend} units`);
  console.log(`    none   (no proof)           → ZERO   tier — immediate reject`);
  console.log();

  // ── CASE 1: APPROVE (Identity Check ✓ — orb tier) ─────────────────────────
  // Orb-verified World Identity Check proof → HIGH tier (1,000,000 units max).
  // Payment: 1 BRL = 100 units → well within both tier cap and allowance → APPROVE.
  section("CASE 1 — APPROVE [Identity Check ✓ orb] 1 BRL within allowance");

  const case1: PaymentRequest = {
    brCode: BR_CODE_DEMO,
    amount: "1.00",
    payerAccountId: PAYER_ACCOUNT,
    mandateId: "mnd-e2e-approve-001",
    worldIdProof: {
      // In WORLD_MOCK=true mode, this proof is accepted without calling the Identity Check API.
      // For a real staging proof: use https://simulator.worldcoin.org (see DEV_TEST.md).
      proof: "0x" + "aa".repeat(256),
      merkle_root: "0x" + "bb".repeat(32),
      nullifier_hash: "0x" + "cc".repeat(32),
      verification_level: "orb",   // Identity Check ✓ — HIGH tier
      signal: PAYER_ACCOUNT,
    },
  };

  const result1 = await runPaymentAgent(case1);
  printDecision(result1, HCS_TOPIC_ID);

  // ── CASE 2: REJECT (orb tier cap exceeded) ──────────────────────────────────
  // Orb-verified (Identity Check) → HIGH tier cap = 1,000,000 units = 10,000 BRL.
  // This payment: 15,000 BRL = 1,500,000 units > 1,000,000 tier max → TIER_INSUFFICIENT.
  // Even with Identity Check, the per-payment cap protects against runaway spending.
  section("CASE 2 — REJECT [Identity Check ✓ orb] 15000 BRL > orb tier cap (10000 BRL) → TIER_INSUFFICIENT");

  const case2: PaymentRequest = {
    brCode: BR_CODE_DEMO,
    amount: "15000.00",            // 1,500,000 units > TIER_ORB_MAX (1,000,000)
    payerAccountId: PAYER_ACCOUNT,
    mandateId: "mnd-e2e-reject-orbcap-001",
    worldIdProof: {
      proof: "0x" + "aa".repeat(256),
      merkle_root: "0x" + "bb".repeat(32),
      nullifier_hash: "0x" + "dd".repeat(32),
      verification_level: "orb",
      signal: PAYER_ACCOUNT,
    },
  };

  const result2 = await runPaymentAgent(case2);
  printDecision(result2, HCS_TOPIC_ID);

  // ── CASE 3: REJECT (device-verified — NOT Identity Check — over tier cap) ──
  // Device-verified user (Identity Check NOT completed) → MEDIUM tier.
  // MEDIUM tier caps at 100,000 units = 1,000 BRL per payment.
  // This payment: 1,500 BRL = 150,000 units > 100,000 tier cap → TIER_INSUFFICIENT.
  // To pay 1,500 BRL, the user must complete World Identity Check (orb verification).
  section("CASE 3 — REJECT [device-verified, NOT Identity Check] 1500 BRL > device tier cap (1000 BRL) → TIER_INSUFFICIENT");

  const case3: PaymentRequest = {
    brCode: BR_CODE_DEMO,
    amount: "1500.00",             // 150,000 units > TIER_DEVICE_MAX (100,000)
    payerAccountId: PAYER_ACCOUNT,
    mandateId: "mnd-e2e-reject-device-tier-001",
    worldIdProof: {
      proof: "0x" + "aa".repeat(256),
      merkle_root: "0x" + "bb".repeat(32),
      nullifier_hash: "0x" + "ee".repeat(32),
      verification_level: "device",  // device-only — NOT Identity Check → MEDIUM tier
      signal: PAYER_ACCOUNT,
    },
  };

  const result3 = await runPaymentAgent(case3);
  printDecision(result3, HCS_TOPIC_ID);

  // ── CASE 4: REJECT (no World ID proof → TIER_INSUFFICIENT) ─────────────────
  // No worldIdProof → tier "none" (maxSpend = 0) → agent rejects immediately.
  // Any payment amount triggers this — Identity Check is mandatory.
  section("CASE 4 — REJECT [no World ID proof] → TIER_INSUFFICIENT (Identity Check required)");

  const case4: PaymentRequest = {
    brCode: BR_CODE_DEMO,
    amount: "1.00",
    payerAccountId: PAYER_ACCOUNT,
    mandateId: "mnd-e2e-reject-tier-001",
    // worldIdProof intentionally omitted — Identity Check not performed
  };

  const result4 = await runPaymentAgent(case4);
  printDecision(result4, HCS_TOPIC_ID);

  // ── Summary ─────────────────────────────────────────────────────────────────
  banner("Demo Summary");
  console.log(`  Case 1 APPROVE — Identity Check ✓ (orb),   1 BRL within allowance         : ${result1.decision.toUpperCase()}`);
  console.log(`  Case 2 REJECT  — Identity Check ✓ (orb),   15000 BRL > orb tier cap       : ${result2.decision.toUpperCase()}`);
  console.log(`  Case 3 REJECT  — device-verified (no IC),  1500 BRL > device tier cap     : ${result3.decision.toUpperCase()}`);
  console.log(`  Case 4 REJECT  — no proof at all                                          : ${result4.decision.toUpperCase()}`);
  console.log();
  console.log(`  HCS Audit Topic  : https://hashscan.io/testnet/topic/${HCS_TOPIC_ID}`);
  console.log(`  HashScan Browse  : https://hashscan.io/testnet/`);
  console.log();

  const ok = result1.decision === "approve" &&
             result2.decision === "reject" &&
             result3.decision === "reject" &&
             result4.decision === "reject";
  if (!ok) console.error("  [WARN] Demo did not produce expected approve+3×reject outcomes.");
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
  console.log("═".repeat(68));
  console.log(`  ${text}`);
  console.log("═".repeat(68));
  console.log();
}

function section(text: string): void {
  console.log("─".repeat(68));
  console.log(`  ${text}`);
  console.log("─".repeat(68));
}

main().catch((err) => {
  console.error("[Demo] Fatal error:", err instanceof Error ? err.message : err);
  process.exit(2);
});
