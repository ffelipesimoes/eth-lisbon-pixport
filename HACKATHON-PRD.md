# PIXPORT — Hackathon PRD

> Generated via `hackathon-helper/hackathon-prd` skill · Hedera Global Hackathon 2025

---

## 1. Problem Statement

Brazil's Pix instant payment network processes **≥60 million transactions/day** with no on-chain mandate enforcement. Businesses, fintechs, and payroll processors that want to automate recurring Pix payments or sub-delegate spending rights face a critical gap: **there is no programmable, auditable allowance layer for Pix**. Any sub-agent can pay any amount at any time — there is no on-chain guardrail.

**Target Users**:
- Payroll platforms that distribute wages via Pix
- Fintech expense-management tools managing employee Pix budgets
- Merchants offering Pix-based subscription billing
- B2B treasury teams with delegated payment authorities

**Current Solutions**: Manual approval workflows in spreadsheets or internal tools; no blockchain-based enforcement exists anywhere for Pix.

**Why Web3?**: Pix mandates enforced only on Web2 can be bypassed, altered, or spoofed by an insider. An on-chain allowance (HIP-336) is cryptographically enforced: a spender literally cannot exceed an approved amount — the ledger rejects it. Immutable HCS audit trail provides non-repudiable compliance logs for regulators.

---

## 2. Solution Overview

PIXPORT is a **Hedera-native mandate layer for Pix payments**. It combines HIP-336 (HTS allowance mechanism) with the Hedera Consensus Service (HCS) to create programmable, auditable spending limits for Pix. A payer (company treasury) approves a spending allowance on-chain; a spender (payroll agent or sub-agent) can execute Pix payments only up to that limit — any attempt to exceed it is rejected on-chain (`SPENDER_DOES_NOT_HAVE_ALLOWANCE`) before the Pix API is ever called.

World ID integration ensures that every new Pix mandate holder is a verified unique human — preventing Sybil attacks and duplicate mandate fraud.

**Hackathon Track Alignment**:
- **Hedera AI & Agentic Payments** — spender sub-agents operate autonomously within on-chain mandate bounds
- **Hedera No-Solidity** — 100% `@hashgraph/sdk` (Hiero); zero Solidity, zero EVM
- **World Identity Check Beta** — World ID verification required to receive a Pix mandate

### Key Features (MVP)

1. **HIP-336 Allowance Enforcement** — Treasury approves spending limit (HTS `approveAllowance`); gateway enforces it before every Pix payment call; RECUSA (rejection) on-chain when limit exceeded
2. **HCS Audit Trail** — Every approve, transfer, RECUSA, and Pix confirmation is written to an HCS topic with timestamp; tamper-proof compliance log
3. **Real Pix R$0.01 Payment** — End-to-end: World ID → Hedera allowance check → live Pix payout via Banco Inter SDK; proves the full stack works

### Non-Goals (v1)

- Multi-payer mandate pools (v2 roadmap)
- DEX liquidity for the mandate token (v3)
- Mobile app / PWA (desktop web console only for hackathon)
- Mainnet deployment (testnet only for demo)

---

## 3. Hedera Integration Architecture

### Network Services Used

| Service | Purpose | Why This Service? |
|---------|---------|-------------------|
| **HTS — Fungible Token (EURC-demo)** | Represents Pix spending capacity; allowance is denominated in token units | HIP-336 native allowance mechanism — only possible on HTS, not achievable with Web2 |
| **HIP-336 Allowance** | Treasury approves per-spender spending limit on-chain | Cryptographic enforcement: ledger rejects `transferFrom` exceeding allowance — no bypass possible |
| **HCS Topic** | Immutable, ordered audit log for all mandate events | Tamper-proof compliance trail; timestamped consensus for regulators |
| **Scheduled Transactions** | Pre-authorised deferred Pix payments | Demonstrates agentic payment capability — agent schedules future payment within mandate |

### Ecosystem Integrations

| Partner / Platform | Integration | Value Added |
|--------------------|------------|-------------|
| **HashScan** | Live testnet evidence links in README | Judges can verify every on-chain action independently |
| **World ID (IDKit)** | Human verification before mandate issuance | Prevents Sybil/duplicate mandate fraud; qualifies for World Identity Check Beta prize |
| **Banco Inter Pix API** | Real R$0.01 live payment at demo close | Proves full-stack integration beyond testnet simulation |

### Architecture Diagram

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                        PIXPORT Stack                            │
 │                                                                  │
 │  [User / Agent]                                                  │
 │       │                                                          │
 │       ▼                                                          │
 │  [World ID — IDKit]  ─── proof ───►  [Gateway API]              │
 │                                          │                       │
 │                          ┌───────────────┼───────────────┐       │
 │                          ▼               ▼               ▼       │
 │                    [HTS Token]    [HIP-336          [HCS Topic]  │
 │                    (EURC-demo)    Allowance]        (Audit Log)  │
 │                          │               │                       │
 │                          └───────────────┘                       │
 │                                  │                               │
 │                    SPENDER_DOES_NOT_HAVE_ALLOWANCE (RECUSA)?     │
 │                         No ──────┼────── Yes → reject + HCS log │
 │                                  ▼                               │
 │                        [Pix API — Banco Inter]                   │
 │                        Real R$0.01 payment                       │
 └─────────────────────────────────────────────────────────────────┘

 Hedera Services: HTS · HIP-336 · HCS · Scheduled Transactions
 No Solidity. No EVM. 100% @hashgraph/sdk (Hiero).
```

---

## 4. Hedera Network Impact

### Account Creation

- Every new PIXPORT user (payer or spender) must create or have a Hedera account to hold/receive HTS allowance
- Estimated hackathon demo: 3–5 new testnet accounts
- Production estimate: 10,000+ accounts in Year 1 (targeting payroll platforms serving 50k+ employees)

### Active Accounts

- Monthly Active Accounts: each Pix mandate renewal and payment execution touches the allowance chain
- Estimated MAA at 1,000 active corporate users: ~3,000 MAA (treasury + spender pairs)

### Transactions Per Second

- Each Pix payment generates: 1× HCS message + 1× HTS `transferFrom` + optional 1× Scheduled Tx
- At 10,000 daily Pix mandates: ~30 TPS burst during payroll runs

### Audience Exposure

- **140 million** Brazilians use Pix — largest instant payment network in the world by volume
- PIXPORT exposes this audience to Hedera as the compliance + trust layer for their daily payment rails
- Target market size: R$10B+/month in Pix B2B transactions (Brazilian Central Bank, 2024)

---

## 5. Innovation & Differentiation

### Ecosystem Gap

No project in the Hedera ecosystem bridges a real-world national payment rail (Pix) with on-chain mandate enforcement. Existing Hedera projects focus on DeFi, NFTs, or tokenised assets — PIXPORT targets TradFi payment automation.

### Cross-Chain Comparison

No equivalent exists on any major chain for Pix specifically. Ethereum has ERC-20 `approve`/`transferFrom` patterns, but HIP-336 is superior for this use case: native to HTS (lower fees), doesn't require a Solidity contract, and works at the ledger level — the rejection is protocol-level, not contract-level.

### Novel Hedera Usage

Using HIP-336 allowance as a **fiat payment mandate enforcer** is non-obvious — HIP-336 is typically used for DeFi spending approvals (like ERC-20 `approve` for DEX swaps). PIXPORT repurposes it as a compliance primitive for traditional payment rails, where the token represents spending authority rather than financial value.

---

## 6. Feasibility & Business Model

### Technical Feasibility

- **Hedera Services Required**: HTS, HCS, HIP-336, Scheduled Transactions — all available on testnet today
- **Team Capabilities**: Full-stack TypeScript (Node.js/Express); Hedera SDK expertise; Pix API integration (Banco Inter sandbox)
- **Technical Risks**: Pix API rate limits during demo; HCS message ordering under load
- **Mitigation**: Pre-record fallback video; use HCS batching if needed

### Business Model (Lean Canvas)

| Element | Description |
|---------|-------------|
| **Problem** | No on-chain Pix mandate enforcement; compliance audit trails are manual; spender fraud is undetectable until after the fact |
| **Solution** | HIP-336 mandate layer + HCS audit trail + World ID verification |
| **Key Metrics** | Mandates created/month; RECUSA events caught; Pix volume enforced; Hedera TPS contribution |
| **Unique Value Prop** | "Your Pix budget, enforced on-chain. Every cent, every time, auditable." |
| **Unfair Advantage** | First-mover on Pix × Hedera; deep Pix domain knowledge; No-Solidity stack = lower fees |
| **Channels** | B2B: HR/payroll platforms (ADP, Gusto BR); direct fintech BD; Hedera ecosystem partnerships |
| **Customer Segments** | Brazilian payroll platforms, expense-management fintechs, B2B treasury teams |
| **Cost Structure** | Hedera testnet fees (near-zero); Pix sandbox (free); hosting $50/month |
| **Revenue Streams** | SaaS: R$X per mandate/month; premium: compliance export + HCS query API; enterprise: white-label |

### Why Web3 is Required

Web2-only mandate enforcement requires every party to trust a centralised database. A single insider or a compromised API can alter limits or approve payments retroactively. HIP-336 makes the spending limit **protocol-enforced** — the Hedera ledger rejects any `transferFrom` exceeding the approved allowance. No central admin can override it. The HCS audit trail is immutable by design — no record can be deleted or altered post-consensus.

---

## 7. Execution Plan

### MVP Scope (Hackathon)

| Feature | Priority | Estimated Effort | Hedera Service |
|---------|----------|-----------------|----------------|
| HTS token creation (EURC-demo) | P0 | 2h | HTS |
| HCS topic creation + publish | P0 | 2h | HCS |
| HIP-336 approve allowance flow | P0 | 3h | HTS + HIP-336 |
| Transfer within allowance | P0 | 2h | HTS + HIP-336 |
| RECUSA: transfer exceeds allowance | P0 | 1h | HTS + HIP-336 |
| Scheduled Transaction demo | P1 | 2h | Scheduled Tx |
| Gateway API (Express/TypeScript) | P0 | 4h | All services |
| World IDKit integration | P1 | 3h | World ID |
| Real Pix R$0.01 payment | P0 | 2h | Banco Inter SDK |
| Web console (Next.js) | P2 | 4h | — |
| VALIDATION.md (≥3 real testers) | P0 | ongoing | — |

### Team Roles

| Member | Role | Key Responsibilities |
|--------|------|---------------------|
| HederaEngineer | Blockchain Lead | HTS, HCS, HIP-336, Scheduled Tx, HashScan URLs |
| GatewayEngineer | Backend Lead | Express gateway, Pix API, World IDKit, API spec |
| AgentEngineer | Integration Lead | World ID dev path, agent wallet, testnet runner |
| SubmissionOfficer | Submission Lead | README, HACKATHON-PRD, VALIDATION, video script |

### Design Decisions

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Token standard | HTS native vs ERC-20/Solidity | HTS native | No Solidity = lower fees, native HIP-336 support, qualifies for No-Solidity prize |
| Audit trail | HCS vs centralised DB | HCS | Tamper-proof, ordered consensus; no trust requirement |
| Identity | KYC vendor vs World ID | World ID | Privacy-preserving, decentralised, hackathon prize track |
| Payment rail | Simulated vs real Pix | Real Pix (R$0.01) | Judges reward working demos over mocks |

### Post-Hackathon Roadmap

- **Month 1–2**: Open beta with 3 pilot payroll platforms; mainnet HTS token; Pix production credentials
- **Month 3–6**: Multi-spender mandate pools; recurring payment scheduling; compliance export API
- **Month 6–12**: White-label SDK for fintechs; SaucerSwap liquidity for mandate token; Series A BD

---

## 8. Validation Strategy

### Feedback Sources

- Independent developers testing the dev setup path (World IDKit + gateway)
- Fintech practitioners reviewing the mandate model
- Hedera ecosystem members reviewing HIP-336 usage

### Validation Milestones

| Milestone | Target | Timeline |
|-----------|--------|----------|
| ≥3 external testers (non-team) | 3 testers with written feedback | Before submission Sunday |
| Dev path tested (World IDKit + gateway) | Screenshot of successful World ID proof + HCS message | Saturday |
| Real Pix payment executed | HashScan tx + bank statement screenshot | Saturday night |
| VALIDATION.md with real quotes | ≥3 named, quoted testers | Sunday morning |

### Market Feedback Cycles

1. **Cycle 1** (hackathon): Deploy to testnet → 3+ external testers → collect feedback in VALIDATION.md
2. **Cycle 2** (post-hackathon): Beta with 3 pilot companies → refine mandate UX based on payroll operator feedback

---

## 9. Go-To-Market Strategy

### Target Market

- **TAM**: R$10B+/month in B2B Pix transactions (Brazilian Central Bank, 2024)
- **SAM**: R$500M/month in payroll + expense-management Pix flows (HR tech segment)
- **Initial Target**: 5 payroll platforms using Pix, each with 1,000–50,000 employees

### Distribution Channels

1. **Hedera ecosystem**: Showcase at Hedera meetups in São Paulo and Rio de Janeiro post-hackathon
2. **B2B direct**: LinkedIn outreach to CFOs and treasury managers at mid-market Brazilian companies

### Growth Strategy

- Network effect: each mandate creates Hedera accounts for both payer and spender
- Partner with Banco Inter as first enterprise pilot (Pix API already integrated)
- Open-source the gateway SDK → developer-led adoption in the Pix ecosystem

---

## 10. Pitch Outline

1. **The Problem** (30s): "140 million Brazilians use Pix. But there's no guardrail: a sub-agent can pay any amount, at any time, to anyone. Fraud, over-payment, and compliance nightmares cost companies millions."
2. **The Solution** (60s): "PIXPORT puts a mandate layer on Pix. We use Hedera HIP-336 — the allowance mechanism — to enforce spending limits on-chain. The ledger rejects any payment that exceeds the approved limit. No Solidity, no EVM, no trust required." [Show RECUSA on HashScan]
3. **Hedera Integration** (45s): "We use four Hedera services: HTS for the mandate token, HIP-336 for cryptographic allowance enforcement, HCS for the immutable audit trail, and Scheduled Transactions for agentic payment scheduling. Zero Solidity. 100% @hashgraph/sdk."
4. **Traction** (30s): "In 48 hours: [N] testnet transactions, 3 external testers, and a real R$0.01 Pix payment sent live on stage."
5. **The Opportunity** (30s): "R$10 billion/month in B2B Pix. We're the first on-chain mandate layer. SaaS model: R$X per mandate/month. Year 1 target: 10,000 mandates."
6. **The Ask** (15s): "Hedera grant to scale to mainnet and onboard 3 pilot payroll platforms in Q3 2025."

### Key Metrics to Present

- Testnet transaction count (HashScan, live link)
- Number of external testers + quoted feedback
- Real Pix payment amount (R$0.01, bank statement screenshot)
- TAM: R$10B+/month B2B Pix (Banco Central do Brasil, 2024)

---

## Parking Lot (Future Ideas)

- PIXPORT DAO: mandate governance on-chain (HCS topic vote)
- HTS custom fees: automatic platform fee on every Pix mandate transfer
- Stablecoin collateral: DREX (Brazil CBDC) as mandate backing when available
- SaucerSwap liquidity for the mandate token

---

## Predicted Score Assessment

> Based on judging criteria per `references/judging-criteria.md`. Scores are 1–5 per criterion.

| Criterion | Predicted Score | Weight | Weighted | Rationale | How to Improve |
|-----------|----------------|--------|----------|-----------|----------------|
| **Innovation** (10%) | 4/5 | 10% | 0.8 | Novel: HIP-336 as Pix mandate enforcer is not seen cross-chain or in Hedera ecosystem; World ID adds uniqueness | Publish a brief "why this is new" in README to make novelty visible to judges at a glance |
| **Feasibility** (10%) | 4/5 | 10% | 0.8 | Real Pix API credentials, working Hedera SDK code, clear business model; team has Pix domain knowledge | Complete the Lean Canvas table in this PRD; link it from README |
| **Execution** (20%) | 3/5 | 20% | 1.2 | Working testnet MVP with 4 Hedera services; TypeScript codebase is clean; limited UI for hackathon | Add screenshots of console UI; ensure HCS audit log is visible on HashScan |
| **Integration** (15%) | 4/5 | 15% | 1.2 | 4 Hedera services (HTS, HCS, HIP-336, Scheduled Tx) used meaningfully; creative use of HIP-336 for fiat mandates | Add ecosystem partner link (HashScan deeplink); consider HashPack wallet-connect for demo |
| **Validation** (15%) | 2/5 | 15% | 0.6 | Currently only team testers; needs ≥3 external, named, quoted testers in VALIDATION.md | Priority: recruit 3 non-team testers before Sunday; get written feedback by Saturday night |
| **Success** (20%) | 4/5 | 20% | 1.6 | Pix audience = 140M Brazilians; architecture creates Hedera accounts per mandate; HCS + HTS TPS contribution is real | Document account-creation flow and TPS estimates in README; show testnet tx count |
| **Pitch** (10%) | 3/5 | 10% | 0.6 | README is informative but not pitched; no deck or video yet | Complete video script by Saturday; open with RECUSA scenario; close with live Pix payment |
| **Total** | **24/35** | **100%** | **6.8/10** | **Estimated Final Grade: ~69%** | Validation and Pitch are the highest-leverage improvements before Sunday |

### Score Math

```
Weighted Score = (Score / 5) × (Weight / 100 × 35)
Total = 0.8 + 0.8 + 1.2 + 1.2 + 0.6 + 1.6 + 0.6 = 6.8 / 10 → ~69%

With VALIDATION improved to 4/5: +0.6 → ~75%
With VALIDATION 4/5 + PITCH 4/5: +0.6 +0.4 → ~79%
```

### Top Improvements by Score Impact

1. **Validation → 4/5** (+0.6 points, 6pp grade): Recruit 3 external testers with written quotes before Sunday. This is the single highest ROI action.
2. **Pitch → 4/5** (+0.4 points, 4pp grade): Record video with RECUSA opening + live Pix close. Polish README with judge-facing lead.
3. **Execution → 4/5** (+0.4 points, 4pp grade): Add UI screenshots; ensure setup instructions work end-to-end for a first-time tester.

---

## Section-to-Criteria Mapping

| PRD Section | Judging Criteria Addressed |
|-------------|---------------------------|
| 1. Problem Statement | Feasibility, Pitch |
| 2. Solution Overview | Innovation, Pitch, Execution |
| 3. Hedera Integration Architecture | Integration (primary), Innovation |
| 4. Network Impact | Success (primary) |
| 5. Innovation & Differentiation | Innovation (primary) |
| 6. Feasibility & Business Model | Feasibility (primary) |
| 7. Execution Plan | Execution (primary) |
| 8. Validation Strategy | Validation (primary) |
| 9. Go-To-Market | Execution, Success |
| 10. Pitch Outline | Pitch (primary) |
