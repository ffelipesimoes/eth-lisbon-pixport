# PIXPORT — On-Chain Pix Mandate Layer

> Hedera Global Hackathon 2025 · Brazil Track

---

## ⬛ No Solidity. No EVM. 100% Hedera Native.

[![No Solidity](https://img.shields.io/badge/No%20Solidity-✓-brightgreen?style=for-the-badge&logo=hedera)](https://hedera.com)
[![Hedera Testnet](https://img.shields.io/badge/Hedera-Testnet-blue?style=for-the-badge&logo=hedera)](https://hashscan.io/testnet)
[![World ID](https://img.shields.io/badge/World%20ID-Verified-blueviolet?style=for-the-badge)](https://worldcoin.org/world-id)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

**PIXPORT is built entirely with `@hashgraph/sdk` (Hiero). Zero Solidity. Zero EVM contracts. Every mandate is enforced at the Hedera ledger layer using HIP-336 native allowances.**

---

## Overview

Brazil's Pix instant payment network processes **60M+ transactions/day** with no programmable mandate enforcement. PIXPORT adds an on-chain mandate layer: a treasury approves a spending allowance using HIP-336 (the Hedera Token Service native allowance mechanism), and any attempt to exceed that limit is rejected by the ledger itself — before the Pix API is ever called.

The rejection is called **RECUSA** — a protocol-level `AMOUNT_EXCEEDS_ALLOWANCE` error from Hedera, not a software check.

Every mandate event (approve, transfer, RECUSA, Pix confirmation) is logged to an HCS topic — an immutable, timestamped, tamper-proof compliance trail.

**Prizes targeted**:
- 🏆 Hedera AI & Agentic Payments
- 🏆 Hedera No-Solidity
- 🏆 World Identity Check Beta

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

### 🏆 Hedera No-Solidity
**Claim**: This project contains zero Solidity files and zero EVM contract calls. All Hedera interactions use `@hashgraph/sdk` (Hiero) directly.

Evidence: `grep -r "solidity\|\.sol\|0x167" . --include="*.ts" --include="*.js"` returns zero results.

### 🏆 Hedera AI & Agentic Payments
**Claim**: PIXPORT's gateway acts as an autonomous payment agent. It operates within a cryptographically enforced mandate (HIP-336 allowance) and executes Pix payments without per-transaction human approval, within bounds set by the treasury on-chain.

### 🏆 World Identity Check Beta
**Claim**: Every new PIXPORT mandate holder must pass World ID verification (via IDKit). The ZK proof ensures one mandate per unique human, preventing Sybil and duplicate mandate fraud.

Dev path and user flow documented in [WORLD-ID-DOCS.md](./WORLD-ID-DOCS.md) (coming Saturday).

---

## Testnet Evidence

> HashScan URLs are filled in by HederaEngineer as each milestone lands. All links below are live and clickable at submission time.

### On-Chain Artifacts

| Artifact | Hedera ID | HashScan |
|----------|-----------|---------|
| HTS Token (EURC-demo) | `0.0.9742957` | [View on HashScan](https://hashscan.io/testnet/token/0.0.9742957) |
| HCS Topic (Audit Trail) | `0.0.9742958` | [View on HashScan](https://hashscan.io/testnet/topic/0.0.9742958) |

### HIP-336 Allowance Demo Transactions

| Scenario | Result | HashScan |
|----------|--------|---------|
| Treasury approves 500 EURC mandate | ✅ `SUCCESS` | [View](https://hashscan.io/testnet/transaction/0.0.9742864-1784978497.752430412) |
| Spender transfers 300 EURC within allowance | ✅ `SUCCESS` | [View](https://hashscan.io/testnet/transaction/0.0.9743531-1784978497.572441319) |
| **RECUSA: 400 EURC exceeds 200 remaining** | ❌ `AMOUNT_EXCEEDS_ALLOWANCE` | [**View ← README**](https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418) |
| HCS mandate event logged | ✅ `SUCCESS` | [View](https://hashscan.io/testnet/transaction/0.0.9742864-1784978503.777535015) |
| Scheduled Transaction (agentic) | ✅ `AUTO-EXECUTED` | [Create TX](https://hashscan.io/testnet/transaction/0.0.9742864-1784978677.267041555) · [Schedule](https://hashscan.io/testnet/schedule/0.0.9743558) |

### Pix Live Payment

| Action | Amount | Result | Evidence |
|--------|--------|--------|---------|
| Real Pix payment — Banco Inter | R$0.01 | ✅ Paid | Screenshot TBD |

**Total testnet transactions**: `11+` _(Block 1 complete — updated continuously by HederaEngineer)_

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
│   └── gateway/          # Express API — Pix mandate enforcement
│       └── src/
│           ├── pix/      # Pix API integration (Banco Inter)
│           ├── allowlist/ # HIP-336 allowance checks
│           ├── brcode/   # BR Code / QR code parsing
│           └── routes/   # API routes
├── .env.example
├── HACKATHON-PRD.md      # PRD with score prediction
├── VALIDATION.md         # External tester feedback (≥3 testers)
└── README.md
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
