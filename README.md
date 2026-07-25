# PIXPORT — Hedera Mandate Layer

PIXPORT enforces Pix payment allowances on-chain via Hedera HIP-336 (allowance mechanism), HTS fungible tokens, and HCS audit trail.

## Stack

- Node.js / TypeScript
- `@hashgraph/sdk` (Hiero) — zero Solidity, zero EVM
- Hedera TESTNET only

## On-Chain Artifacts

| Artifact | ID | HashScan |
|---|---|---|
| HTS Token (EURC-demo) | TBD | TBD |
| HCS Topic (audit trail) | TBD | TBD |

## HIP-336 Allowance Demo

| Scenario | Result | HashScan |
|---|---|---|
| Approve allowance | ✅ | TBD |
| Transfer within allowance | ✅ | TBD |
| **RECUSA: Transfer exceeds allowance** | ❌ `SPENDER_DOES_NOT_HAVE_ALLOWANCE` | TBD |
| Scheduled Transaction | ✅ | TBD |

## Setup

```bash
cp .env.example .env
# Fill in your Hedera TESTNET credentials
npm install
npm run build
```

## Scripts

```bash
npm run setup        # Create HTS token + HCS topic
npm run allowance    # Run full HIP-336 allowance demo (approve → transfer → RECUSA)
npm run scheduled    # Demo scheduled transaction
```

## Environment

See `.env.example` for required variables.
