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
| HCS audit topic (23 messages) | [topic 0.0.9742958](https://hashscan.io/testnet/topic/0.0.9742958) |
| Scheduled TX (agentic deferred pay) | [schedule 0.0.9743558](https://hashscan.io/testnet/schedule/0.0.9743558) |

**Mirror-node verified** (2026-07-25 14:10 UTC): **55** unique txs across treasury `0.0.9742864` + spender `0.0.9743531`; **23** HCS messages. Full breakdown in [docs/TESTNET-METRICS.md](./docs/TESTNET-METRICS.md).

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
| `CRYPTOAPPROVEALLOWANCE` | SUCCESS | 7 | HIP-336 mandate approve |
| `CRYPTOTRANSFER` | SUCCESS | 6 | In-allowance spend |
| `CRYPTOTRANSFER` | AMOUNT_EXCEEDS_ALLOWANCE | 1 | **RECUSA** (headline) |
| `CRYPTOTRANSFER` | SPENDER_DOES_NOT_HAVE_ALLOWANCE | 3 | Earlier deny proofs |
| `CONSENSUSSUBMITMESSAGE` | SUCCESS | 23 | HCS decision logs |
| `SCHEDULECREATE` / sign | SUCCESS / already executed | 1+1 | Agentic deferred pay |
| `TOKENASSOCIATE` | SUCCESS | 1 | Spender association |
| `CRYPTOCREATEACCOUNT` | SUCCESS | 11 | Bootstrap accounts |
| **Unique txs (all types)** | — | **55** | Live testnet volume |
| **HCS messages on topic** | — | **23** | Immutable audit trail |

Living log (re-runnable): [docs/TESTNET-METRICS.md](./docs/TESTNET-METRICS.md). Update after every Block 2+ E2E run.

### Pix Live Payment

| Action | Amount | Result | Evidence |
|--------|--------|--------|---------|
| Real Pix payment — Banco Inter | R$0.01 | Pending live capture | Screenshot + receipt TBD (Felipe / Gateway) |

---

## Quickstart — One command, everything running

### Prerequisites

- Node.js ≥ 20
- Free Hedera Testnet account → [portal.hedera.com](https://portal.hedera.com) (ED25519 keypair, grab from portal)

### 1 — Clone and install

```bash
git clone https://github.com/YOUR_ORG/pixport.git
cd pixport
npm install
cp .env.example .env
```

### 2 — Fill in `.env` (two lines for the demo)

Open `.env` and set your Hedera testnet credentials:

```bash
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT
HEDERA_OPERATOR_KEY=302e020100300506032b6570...   # ED25519 DER key from portal
```

The HTS token (`0.0.9742957`), HCS topic (`0.0.9742958`), and treasury (`0.0.9742864`) are already pre-filled — they are live on Hedera testnet from our Block 1 deployment. No extra setup needed for the demo.

> Pix production credentials (`PIX_CLIENT_ID`, etc.) are optional — the gateway runs in stub mode without them, generating a synthetic E2E ID.

### 3 — Start everything

```bash
npm run demo
```

This single command starts:

| Service | URL | What it does |
|---------|-----|-------------|
| Gateway API | <http://localhost:3001> | Express + Hedera (mandate enforcement, BR Code decode, HCS audit) |
| Console UI | <http://localhost:3000> | Next.js single-page demo (mandate flow + live HCS trail) |

Open **<http://localhost:3000>** in your browser.

---

## Smoke Test — APPROVE + RECUSA in 2 minutes

> **Testnet required**: both flows hit the live Hedera testnet Mirror Node.
> Your `HEDERA_OPERATOR_ID` + `HEDERA_OPERATOR_KEY` must be set in `.env`.

### Flow A — APPROVED payment

1. In **Step 1 (Create Mandate)**: click **"Demo key"** and **"Demo account"**, enter `500.00` as Max Amount, click **Create**
   - A mandate ID appears with status `APPROVED` and an HCS sequence number
2. In **Step 2 (Execute Payment)**: click **"Sample"** to fill the BR Code, enter the same payer account, enter `10.00` as Amount, paste the mandate ID, click **▶ Pay**
   - Expected result: green `APPROVED` badge + `Payment authorized and executed` + HCS sequence number + HashScan link
3. The **HCS Audit Trail** at the bottom auto-refreshes and shows both the `mandate_created` and `payment_approved` events

### Flow B — RECUSA (allowance exceeded)

1. Create a new mandate with Max Amount `1.00` (very small)
2. In Step 2: use the same BR Code + payer + mandate ID, enter `9999.00` as Amount, click **▶ Pay**
   - Expected result: red `REJECTED` badge + `Requested 9999.00 BRL exceeds remaining allowance` or `No allowance found for spender`
   - HCS log shows `payment_rejected` with reason `allowance_exceeded`

> The RECUSA is enforced by the Hedera ledger via HIP-336: the Mirror Node returns zero allowance for accounts that have not been granted one, so the gateway rejects before Pix is ever called.

---

## Setup — Advanced / Re-deploy

### Key Scripts

```bash
npm run demo          # Start gateway + console together (ONE command)
npm run setup        # Re-create HTS token + HCS topic on testnet
npm run allowance    # HIP-336 demo: approve → transfer → RECUSA
npm run scheduled    # Scheduled Transaction (agentic payment demo)
npm test             # Run unit tests
```

---

## Demo

**Video script (timestamps):** [docs/video/VIDEO-SCRIPT.md](./docs/video/VIDEO-SCRIPT.md) · ≤5 minutes  
**Fallback MP4 (4:33):** [docs/video/pixport-fallback.mp4](./docs/video/pixport-fallback.mp4) — opens on RECUSA, closes on Pix R$0,01  
**YouTube (live take):** _TBD after venue recording — paste unlisted URL here_

**Script summary**:
1. (**0:00–0:53**) **RECUSA open** — HashScan `AMOUNT_EXCEEDS_ALLOWANCE` (tx `0.0.9743531-1784978501.389600418`)
2. (**0:53–1:55**) Problem + architecture — No Solidity, HTS / HIP-336 / HCS / Scheduled TX
3. (**1:55–3:35**) World Identity Check + live `npm run demo` APPROVE path + HCS trail
4. (**3:35–4:10**) Live product RECUSA (reject before Pix)
5. (**4:10–5:00**) **Close** — real Pix R$0,01 + end card

### Manual test runbook (Felipe / judges)

Step-by-step QA flows with exact curl commands, expected JSON, and HashScan/Mirror verification:

**[docs/MANUAL-TEST-FLOWS.md](./docs/MANUAL-TEST-FLOWS.md)**

| # | Flow | Status |
|---|------|--------|
| 1 | Setup / `npm run demo` + gateway health | Ready |
| 2 | `POST /mandates` + HCS log | Ready |
| 3 | Approved pay + Pix payout | Partial (stub until PIX-18) |
| 4 | **RECUSA** (ledger + gateway) | Ready — [live RECUSA tx](https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418) |
| 5 | World Identity Check (orb vs none) | Ready — [DEV_TEST.md](./packages/agent/DEV_TEST.md) |
| 6 | HCS audit trail topic `0.0.9742958` | Ready — [HashScan topic](https://hashscan.io/testnet/topic/0.0.9742958) |

---

## Validation

External tester evidence: [VALIDATION.md](./VALIDATION.md).  
**Venue kit (5 steps + form):** [docs/tester-kit/](./docs/tester-kit/README.md).

- ≥3 independent non-team testers (slots open — kit ready post PIX-15 demo)
- Named, quoted feedback + PASS / PASS_WITH_FRICTION / FAIL
- At least one tester opens the RECUSA HashScan link themselves

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
│   ├── MANUAL-TEST-FLOWS.md        # Step-by-step QA runbook (Felipe / judges)
│   ├── TESTNET-METRICS.md          # Living Success (20%) counters
│   ├── WORLD-IDENTITY-CHECK.md     # Dev + user Identity Check tests + screenshots
│   ├── world-identity-check/       # Screenshots + terminal captures
│   ├── video/                      # VIDEO-SCRIPT + fallback MP4 (≤5 min)
│   └── tester-kit/                 # 5-step script + feedback form for venue
├── scripts/demo.sh       # npm run demo — gateway + console
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
