import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import "dotenv/config";

export interface OperatorConfig {
  accountId: string;
  privateKey: string;
  network: "testnet";
}

export function loadOperator(): OperatorConfig {
  const accountId = process.env.HEDERA_OPERATOR_ID;
  const privateKey = process.env.HEDERA_OPERATOR_KEY;

  if (!accountId || !privateKey) {
    throw new Error(
      "Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY in .env\n" +
      "  1. Get a testnet account at https://portal.hedera.com/\n" +
      "  2. Copy .env.example to .env and fill in the credentials"
    );
  }

  return { accountId, privateKey, network: "testnet" };
}

export function buildClient(op?: OperatorConfig): Client {
  const operator = op ?? loadOperator();
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(operator.accountId),
    PrivateKey.fromStringDer(operator.privateKey),
  );
  return client;
}

export function hashscanTx(txId: string): string {
  // TX IDs look like: 0.0.12345@1784969015.123456789
  // HashScan format:  0.0.12345-1784969015.123456789
  return `https://hashscan.io/testnet/transaction/${txId.replace("@", "-")}`;
}

export function hashscanAccount(accountId: string): string {
  return `https://hashscan.io/testnet/account/${accountId}`;
}

export function hashscanToken(tokenId: string): string {
  return `https://hashscan.io/testnet/token/${tokenId}`;
}

export function hashscanTopic(topicId: string): string {
  return `https://hashscan.io/testnet/topic/${topicId}`;
}
