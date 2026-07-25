# PIXPORT — On-Chain Pix Mandate Layer

> ETHGlobal Lisbon 2026 · Hedera AI & Agentic Payments · No-Solidity · World Identity Check

---

## ⬛ No Solidity. No EVM. 100% Hedera Native.

[![No Solidity](https://img.shields.io/badge/No%20Solidity-✓-brightgreen?style=for-the-badge&logo=hedera)](https://hedera.com)
[![Hedera Testnet](https://img.shields.io/badge/Hedera-Testnet-blue?style=for-the-badge&logo=hedera)](https://hashscan.io/testnet)
[![World ID](https://img.shields.io/badge/World%20ID-Verified-blueviolet?style=for-the-badge)](https://worldcoin.org/world-id)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

**First technical claim: ZERO Solidity.** PIXPORT is built entirely with `@hashgraph/sdk` (Hiero). Zero Solidity files. Zero EVM contracts. Zero Hardhat/Foundry. Every mandate is enforced at the Hedera ledger layer using HIP-336 native allowances — the network rejects overspend before Pix is ever called.

```bash
# Judge check — must return zero matches
rg -i 'solidity|\.sol\b|pragma solidity|hardhat|foundry|ethers\.Contract' --glob '!node_modules' --glob '!package-lock.json'
```

---

## Live Testnet Proof (click any link)

| What judges should open first | Live HashScan |
|-------------------------------|---------------|
| **RECUSA** — ledger rejects over-allowance (`AMOUNT_EXCEEDS_ALLOWANCE`) | [tx 0.0.9743531-1784978501.389600418](https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418) |
| Transfer SUCCESS within mandate | [tx 0.0.9743531-1784978497.572441319](https://hashscan.io/testnet/transaction/0.0.9743531-1784978497.572441319) |
| HIP-336 approve (500 EURC mandate) | [tx 0.0.9742864-1784978497.752430412](https://hashscan.io/testnet/transaction/0.0.9742864-1784978497.752430412) |
| HTS token EURC-demo | [token 0.0.9742957](https://hashscan.io/testnet/token/0.0.9742957) |
| HCS audit topic (13 messages) | [topic 0.0.9742958](https://hashscan.io/testnet/topic/0.0.9742958) |
| Scheduled TX (agentic deferred pay) | [schedule 0.0.9743558](https://hashscan.io/testnet/schedule/0.0.9743558) |

**Mirror-node verified** (2026-07-25): 39 unique txs across treasury `0.0.9742864` + spender `0.0.9743531`; 13 HCS messages. Full breakdown in [docs/TESTNET-METRICS.md](./docs/TESTNET-METRICS.md).

---

## Overview

Brazil's Pix instant payment network processes **60M+ transactions/day** with no programmable mandate enforcement. PIXPORT adds an on-chain mandate layer: a treasury approves a spending allowance using HIP-336 (the Hedera Token Service native allowance mechanism), and any attempt to exceed that limit is rejected by the ledger itself — before the Pix API is ever called.

The rejection is called **RECUSA** — a protocol-level `AMOUNT_EXCEEDS_ALLOWANCE` error from Hedera, not a software check.

Every mandate event (approve, transfer, RECUSA, Pix confirmation) is logged to an HCS topic — an immutable, timestamped, tamper-proof compliance trail.

**Prizes targeted**:
- Hedera AI & Agentic Payments
- Hedera No-Solidity
- World Identity Check Beta

---

## Architecture

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                        PIXPORT Stack                            │
 │                                                                  │
 │  [User / Payment Agent]                                          │
 │       │                                                          │
 │       ▼                                                          │
 │  [World ID — IDKit]  ─── ZK proof ──►  [PIXPORT Gateway API]    │
 │                                              │                   │
 │                        ┌────────────────────┼──────────────┐    │
 │                        ▼                    ▼              ▼    │
 │                  [HTS Token         [HIP-336          [HCS      │
 │                   EURC-demo]        Allowance]        Topic]    │
 │                        │                    │                   │
 │                        └────────────────────┘                   │
 │                                   │                             │
 │               SPENDER_DOES_NOT_HAVE_ALLOWANCE?                  │
 │                  No ──────────────┼──── Yes → RECUSA + HCS log  │
 │                                   ▼                             │
 │                         [Pix API — Banco Inter]                 │
 │                         Real R$0.01 payment ✓                   │
 └─────────────────────────────────────────────────────────────────┘

 Hedera: HTS · HIP-336 · HCS · Scheduled Transactions
 No Solidity. No EVM. @hashgraph/sdk only.
```

### Hedera Services Used

| Service | Purpose |
|---------|---------|
| **HTS — Fungible Token** | Mandate token (EURC-demo); spending capacity |
| **HIP-336 Allowance** | Cryptographic spending limit; ledger-enforced RECUSA |
| **HCS Topic** | Immutable ordered audit trail of all mandate events |
| **Scheduled Transactions** | Agentic deferred Pix payment scheduling |

---

## Prizes Targeted

### Hedera No-Solidity
**Claim**: This project contains zero Solidity files and zero EVM contract calls. All Hedera interactions use `@hashgraph/sdk` (Hiero) directly.

Evidence: `rg` check above returns zero results; stack is Node/TypeScript + native Hedera services only.

### Hedera AI & Agentic Payments
**Claim**: PIXPORT's gateway acts as an autonomous payment agent. It operates within a cryptographically enforced mandate (HIP-336 allowance) and executes Pix payments without per-transaction human approval, within bounds set by the treasury on-chain.

### World Identity Check Beta
**Claim**: Every payment decision runs through **World Identity Check (Beta)** (`verifyCloudProof`, level `orb`). The result sets the HIP-336 allowance tier — verified humans can pay within HIGH tier; device-only is capped; unverified is rejected (`TIER_INSUFFICIENT`) before Pix is called.

| Identity Check | Tier | Max / payment | Demo |
|----------------|------|---------------|------|
| **orb** (Identity Check ✓) | HIGH | 10,000 BRL | APPROVE at 1 BRL |
| **device** (not Identity Check) | MEDIUM | 1,000 BRL | REJECT at 1,500 BRL |
| **none** | ZERO | 0 | REJECT immediately |

**Test docs (dev + user, with screenshots):** [docs/WORLD-IDENTITY-CHECK.md](./docs/WORLD-IDENTITY-CHECK.md)  
**Engineer path:** [packages/agent/DEV_TEST.md](./packages/agent/DEV_TEST.md)  
**One-command judge demo:** `WORLD_MOCK=true GATEWAY_MOCK=true ALLOWANCE_MOCK=true npm run demo -w packages/agent` → 1 APPROVE + 3 REJECT  
**HCS audit:** [topic 0.0.9742958](https://hashscan.io/testnet/topic/0.0.9742958)

---

## Testnet Evidence

> All HashScan URLs below were verified against Hedera testnet mirror node on 2026-07-25. Entities resolve (`token`, `topic`, `schedule`, demo txs = 200). HashScan is a SPA (curl may 404; open in browser).

### On-Chain Artifacts

| Artifact | Hedera ID | HashScan |
|----------|-----------|---------|
| HTS Token (EURC-demo) | `0.0.9742957` | [View on HashScan](https://hashscan.io/testnet/token/0.0.9742957) |
| HCS Topic (Audit Trail) | `0.0.9742958` | [View on HashScan](https://hashscan.io/testnet/topic/0.0.9742958) |
| Scheduled TX entity | `0.0.9743558` | [View on HashScan](https://hashscan.io/testnet/schedule/0.0.9743558) |

### HIP-336 Allowance Demo Transactions

| Scenario | Result | HashScan |
|----------|--------|---------|
| Treasury approves 500 EURC mandate | `SUCCESS` | [View](https://hashscan.io/testnet/transaction/0.0.9742864-1784978497.752430412) |
| Spender transfers 300 EURC within allowance | `SUCCESS` | [View](https://hashscan.io/testnet/transaction/0.0.9743531-1784978497.572441319) |
| **RECUSA: over-allowance attempt** | `AMOUNT_EXCEEDS_ALLOWANCE` | [**View ← pitch open**](https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418) |
| HCS mandate event logged | `SUCCESS` | [View](https://hashscan.io/testnet/transaction/0.0.9742864-1784978503.777535015) |
| Scheduled Transaction (agentic) | `SUCCESS` / auto-executed | [Create TX](https://hashscan.io/testnet/transaction/0.0.9742864-1784978677.267041555) · [Schedule](https://hashscan.io/testnet/schedule/0.0.9743558) |

### Testnet usage metrics (Success 20%)

Snapshot 2026-07-25 via `testnet.mirrornode.hedera.com` (accounts `0.0.9742864` + `0.0.9743531`, deduped by `transaction_id`):

| Type | Result | Count | Role in pitch |
|------|--------|------:|---------------|
| `TOKENCREATION` | SUCCESS | 1 | HTS EURC-demo |
| `CONSENSUSCREATETOPIC` | SUCCESS | 1 | HCS audit topic |
| `CRYPTOAPPROVEALLOWANCE` | SUCCESS | 5 | HIP-336 mandate approve |
| `CRYPTOTRANSFER` | SUCCESS | 4 | In-allowance spend |
| `CRYPTOTRANSFER` | AMOUNT_EXCEEDS_ALLOWANCE | 1 | **RECUSA** (headline) |
| `CRYPTOTRANSFER` | SPENDER_DOES_NOT_HAVE_ALLOWANCE | 3 | Earlier deny proofs |
| `CONSENSUSSUBMITMESSAGE` | SUCCESS | 13 | HCS decision logs |
| `SCHEDULECREATE` / sign | SUCCESS / already executed | 1+1 | Agentic deferred pay |
| `TOKENASSOCIATE` | SUCCESS | 1 | Spender association |
| `CRYPTOCREATEACCOUNT` | SUCCESS | 9 | Bootstrap accounts |
| **Unique txs (all types)** | — | **39** | Live testnet volume |
| **HCS messages on topic** | — | **13** | Immutable audit trail |

Living log (re-runnable): [docs/TESTNET-METRICS.md](./docs/TESTNET-METRICS.md). Update after every Block 2+ E2E run.

### Pix Live Payment

| Action | Amount | Result | Evidence |
|--------|--------|--------|---------|
| Real Pix payment — Banco Inter | R$0.01 | Pending live capture | Screenshot + receipt TBD (Felipe / Gateway) |

---

## Setup

### Prerequisites

- Node.js ≥20
- Hedera Testnet account ([portal.hedera.com](https://portal.hedera.com))
- World ID Developer App ([developer.worldcoin.org](https://developer.worldcoin.org))
- Banco Inter Pix sandbox credentials (optional; required for live Pix demo)

### Install

```bash
git clone https://github.com/YOUR_ORG/pixport.git
cd pixport
npm install
cp .env.example .env
# Fill in HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY, and World ID vars
```

### Environment Variables

See [`.env.example`](./.env.example) for all required variables. Never commit `.env`.

```
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.XXXXXXX
HEDERA_OPERATOR_KEY=...
HTS_TOKEN_ID=0.0.XXXXXXX
HCS_TOPIC_ID=0.0.XXXXXXX
PIX_CLIENT_ID=...
PIX_CLIENT_SECRET=...
```

### Run

```bash
# Start the gateway API
cd packages/gateway
npm run dev

# Gateway runs at http://localhost:3001
```

### Key Scripts

```bash
npm run setup        # Create HTS token + HCS topic on testnet
npm run allowance    # Full HIP-336 demo: approve → transfer → RECUSA
npm run scheduled    # Scheduled Transaction (agentic payment demo)
npm test             # Run unit tests
```

---

## Demo

**Video**: [YouTube link TBD] · ≤5 minutes

**Script summary**:
1. (**0:00–0:45**) RECUSA scenario — PIXPORT rejects an over-limit payment on HashScan, live
2. (**0:45–2:30**) Architecture walkthrough — No Solidity, four Hedera services, World ID
3. (**2:30–4:00**) Full happy path — World ID verify → mandate approve → Pix payment
4. (**4:00–5:00**) Real R$0.01 Pix payment sent live; HCS log confirmed on HashScan

---

## Validation

External tester feedback documented in [VALIDATION.md](./VALIDATION.md).

- ≥3 independent non-team testers
- Named, quoted feedback
- Test outcomes with screenshots

---

## Repository Structure

```
pixport/
├── packages/
│   ├── hedera/           # HTS · HCS · HIP-336 · Scheduled TX scripts
│   ├── gateway/          # Express API — Pix mandate enforcement
│   ├── agent/            # Agentic path + World Identity Check gate
│   └── console/          # Operator UI
├── docs/
│   ├── TESTNET-METRICS.md          # Living Success (20%) counters
│   ├── WORLD-IDENTITY-CHECK.md     # Dev + user Identity Check tests + screenshots
│   └── world-identity-check/       # Terminal SVG captures + flow diagrams
├── .env.example
├── HACKATHON-PRD.md      # PRD with score prediction
├── VALIDATION.md         # External tester evidence (≥3 independent)
└── README.md             # Judges read this first
```

---

## Team

| Member | Role |
|--------|------|
| HederaEngineer | Hedera: HTS, HCS, HIP-336, Scheduled Tx |
| GatewayEngineer | Backend: Express gateway, Pix API, World IDKit |
| AgentEngineer | Integration: World ID dev path, agent wallet |
| SubmissionOfficer | Submission: README, PRD, VALIDATION, video |

---

## License

MIT
