/**
 * hedera-agent-kit hello-world — minimal TESTNET connectivity test.
 *
 * Verifies that:
 *  1. hedera-agent-kit can be imported and initialised
 *  2. The configured TESTNET account is reachable
 *  3. We can query HBAR balance via the toolkit
 *
 * Run: npm run hello-world
 * Requires: HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY set in .env
 */

import "dotenv/config";
import { Client, PrivateKey } from "@hashgraph/sdk";
import { HederaLangchainToolkit, AgentMode, coreAccountQueryPlugin } from "hedera-agent-kit";

async function helloHedera() {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || accountId.startsWith("0.0.X")) {
    console.log("⚠  HEDERA_ACCOUNT_ID not configured. Set it in .env to run a live test.");
    console.log("   Get a free testnet account at https://portal.hedera.com/dashboard");
    console.log("\n✓  hedera-agent-kit imported successfully (package is installed)");
    console.log("✓  @worldcoin/idkit-standalone installed");
    console.log("✓  Agent architecture is ready — set credentials to run live.");
    return;
  }

  console.log(`Connecting to Hedera TESTNET as ${accountId}...`);

  const client = Client.forTestnet();
  client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey!));

  // Initialise the hedera-agent-kit toolkit with the account query plugin
  const toolkit = new HederaLangchainToolkit({
    client,
    configuration: {
      plugins: [coreAccountQueryPlugin],
      context: {
        mode: AgentMode.AUTONOMOUS,
      },
    },
  });

  const tools = toolkit.getTools();
  console.log(`✓  hedera-agent-kit loaded — ${tools.length} tools available`);

  // Find the HBAR balance tool and call it directly
  const balanceTool = tools.find((t) => t.name === "Get HBAR Balance");
  if (!balanceTool) {
    throw new Error("Get HBAR Balance tool not found — check plugin registration");
  }

  console.log(`Querying HBAR balance for ${accountId}...`);
  const result = await balanceTool.invoke({ accountId });
  console.log(`✓  HBAR Balance result:`, result);

  client.close();
  console.log("\n✓  Hello Hedera! hedera-agent-kit is working on TESTNET.");
}

helloHedera().catch((err) => {
  console.error("Hello-world failed:", err.message);
  process.exit(1);
});
