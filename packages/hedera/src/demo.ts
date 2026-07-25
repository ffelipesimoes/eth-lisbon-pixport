/**
 * PIXPORT Block 1 — Full Demo Runner
 *
 * Runs all four steps in sequence:
 *   1. Create HTS token (EURC-demo)
 *   2. Create HCS topic (audit trail)
 *   3. HIP-336 allowance: approve → transfer → RECUSA
 *   4. Scheduled Transaction demo
 *
 * Outputs all HashScan URLs for the README.
 */

import { execSync } from "child_process";

function run(label: string, script: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("═".repeat(60));
  try {
    execSync(`tsx ${script}`, { stdio: "inherit", cwd: new URL("..", import.meta.url).pathname });
  } catch (err) {
    console.error(`\n❌ ${label} failed — check output above.`);
    process.exit(1);
  }
}

run("Step 1 + 2: HTS Token + HCS Topic", "src/setup.ts");
run("Steps 3–5: HIP-336 Allowance + RECUSA", "src/allowance-demo.ts");
run("Step 6: Scheduled Transaction", "src/scheduled.ts");

console.log("\n✅ All Block 1 deliverables complete. Add HashScan URLs to README.");
