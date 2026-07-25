/**
 * PIXPORT Agent — CLI entry point.
 *
 * Usage (stdin JSON):
 *   echo '{"brCode":"...","payerAccountId":"0.0.12345","mandateId":"mnd-1"}' | npm run pay
 *
 * Usage (HTTP server mode — Block 2):
 *   npm run dev
 *   POST http://localhost:3002/agent/pay  { brCode, payerAccountId, mandateId, worldIdProof? }
 *
 * For Block 1: stdin mode is sufficient to demonstrate autonomous decisions.
 */

import "dotenv/config";
import { runPaymentAgent } from "./agent.js";
import { PaymentRequestSchema } from "./types.js";

async function main() {
  // Read JSON from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  if (!raw) {
    console.error("Usage: echo '<JSON>' | npm run pay");
    console.error('  JSON shape: { brCode, payerAccountId, mandateId, worldIdProof? }');
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Invalid JSON on stdin");
    process.exit(1);
  }

  const request = PaymentRequestSchema.safeParse(parsed);
  if (!request.success) {
    console.error("Request validation failed:", request.error.format());
    process.exit(1);
  }

  console.log("[PIXPORT Agent] Starting autonomous payment decision...");
  const decision = await runPaymentAgent(request.data);

  console.log("\n══════════════════════════════════════════");
  console.log(`  Decision:    ${decision.decision.toUpperCase()}`);
  console.log(`  Reason:      ${decision.reason}`);
  if (decision.decision === "approve") {
    console.log(`  Tier:        ${decision.tier.label} (max: ${decision.tier.maxSpend})`);
  } else {
    console.log(`  Code:        ${decision.code}`);
  }
  if (decision.hcsMessageId) {
    console.log(`  HCS TX:      ${decision.hcsMessageId}`);
  }
  console.log("══════════════════════════════════════════\n");

  // Output machine-readable result to stdout
  process.stdout.write(JSON.stringify(decision, (_, v) =>
    typeof v === "bigint" ? v.toString() : v
  ) + "\n");

  process.exit(decision.decision === "approve" ? 0 : 1);
}

main().catch((err) => {
  console.error("[PIXPORT Agent] Fatal error:", err);
  process.exit(2);
});
