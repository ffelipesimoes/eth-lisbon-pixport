# PIXPORT Demo Video Script (≤5 min)

**Status:** locked for recording + fallback storyboard  
**Target length:** 4:30–5:00  
**Opens with:** RECUSA (on-chain reject)  
**Closes with:** real Pix R$0,01  
**Fallback artifact:** [video-fallback-storyboard.md](./video-fallback-storyboard.md) + `docs/video/pixport-fallback.mp4`  
**Issue:** PIX-16

---

## Pre-roll checklist (T−5 min)

| # | Check | Ready |
|---|--------|:-----:|
| 1 | `npm run demo` → console http://localhost:3000 + gateway :3001 | ☐ |
| 2 | Browser tabs open: Console · RECUSA HashScan · HCS topic · SUCCESS transfer | ☐ |
| 3 | RECUSA tx live: [0.0.9743531-1784978501.389600418](https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418) | ☐ |
| 4 | HCS topic live: [0.0.9742958](https://hashscan.io/testnet/topic/0.0.9742958) | ☐ |
| 5 | Sample BR Code button works; demo mandate + pay flows rehearsed once | ☐ |
| 6 | Pix self-pay path ready (Felipe phone / Banco Inter sandbox receipt) OR stub + “live capture pending” card | ☐ |
| 7 | Mic test; 1080p; hide bookmarks bar; zoom 110% on console | ☐ |
| 8 | No secrets on screen (no `.env`, no private keys, no PIX client secret) | ☐ |

**HashScan bookmarks (open before record):**

1. RECUSA — https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418  
2. Transfer OK — https://hashscan.io/testnet/transaction/0.0.9743531-1784978497.572441319  
3. HIP-336 approve — https://hashscan.io/testnet/transaction/0.0.9742864-1784978497.752430412  
4. HTS token — https://hashscan.io/testnet/token/0.0.9742957  
5. HCS topic — https://hashscan.io/testnet/topic/0.0.9742958  
6. Schedule — https://hashscan.io/testnet/schedule/0.0.9743558  

---

## Timestamped script

### 0:00–0:08 — Cold open title

**On screen:** Full-screen card  
`PIXPORT` · `No Solidity. 100% Hedera Native.` · ETHGlobal Lisbon 2026  

**VO:**  
> "PIXPORT — an on-chain mandate layer for Pix. Zero Solidity. Network-enforced limits. Every decision audited."

---

### 0:08–0:53 — OPEN: RECUSA (mandatory ~45s)

**On screen:** HashScan RECUSA transaction  
Result badge: `AMOUNT_EXCEEDS_ALLOWANCE`  
Highlight: spender `0.0.9743531`, token `0.0.9742957`

**VO (pace slow, punch the result):**  
> "Watch what the ledger does when an agent tries to overspend.  
> Treasury approved a HIP-336 allowance. The spender tries to pull more than remaining.  
> Hedera rejects it — `AMOUNT_EXCEEDS_ALLOWANCE`.  
> That is **RECUSA**: not an app `if`, not a smart contract — the network itself.  
> No Pix call. No money moved. Immutable proof on HashScan."

**Click path:**  
1. Open RECUSA tx → scroll to Result  
2. Flash token id + accounts  
3. Optional: open approve tx in background tab to show the 500 EURC mandate that made the reject meaningful  

**B-roll alt if HashScan slow:** freeze-frame of RECUSA result + cut to HCS message with `payment_rejected` / `allowance_exceeded`

---

### 0:53–1:25 — Problem + claim

**On screen:** One slide  

| Today | With PIXPORT |
|-------|----------------|
| Pix = instant, no mandate | HIP-336 allowance = hard cap |
| Agent can overspend | Ledger RECUSA before Pix |
| Audit = CSV hell | HCS ordered trail |

**VO:**  
> "Brazil's Pix moves tens of millions of payments a day — with no programmable mandate.  
> Treasuries and AI agents need a hard stop. PIXPORT puts that stop on Hedera: HTS token, HIP-336 allowance, HCS audit, scheduled transactions for deferred agentic pay.  
> First technical claim for judges: **zero Solidity, zero EVM** — only `@hashgraph/sdk`."

---

### 1:25–1:55 — Architecture (15–20s visual)

**On screen:** README architecture diagram (or console layout)  

**VO:**  
> "Flow: BR Code in → World Identity Check sets the tier → gateway checks on-chain allowance → approve or RECUSA → every decision lands on HCS.  
> If allowed, Pix fires. If not, the network already said no."

**Visual beats (cut every ~5s):**  
1. Console UI  
2. Diagram block World ID → Gateway  
3. HTS / HIP-336 / HCS row  
4. Badge: No Solidity  

---

### 1:55–2:25 — World Identity Check (prize path)

**On screen:** [docs/WORLD-IDENTITY-CHECK.md](../WORLD-IDENTITY-CHECK.md) screenshots — orb APPROVE vs device REJECT  

**VO:**  
> "World Identity Check Beta gates every payment. Orb-verified humans get the HIGH tier. Device-only is capped. No proof — tier zero, reject before Pix.  
> Identity is not cosmetics: it sets the mandate ceiling the ledger will enforce."

| Check | Tier | Demo |
|-------|------|------|
| orb | HIGH | APPROVE 1 BRL |
| device | MEDIUM | REJECT 1,500 BRL |
| none | ZERO | REJECT immediately |

---

### 2:25–3:35 — Live console happy path (~70s)

**On screen:** http://localhost:3000 after `npm run demo`

**Actions (narrate while clicking):**

| t | Action | Expect |
|---|--------|--------|
| 2:25 | Point at gateway healthy + HCS trail | No offline banner |
| 2:35 | Step 1: Demo key + Demo account + max `500.00` → Create | Mandate APPROVED + HCS seq |
| 2:50 | Step 2: Sample BR Code + amount `10.00` + mandate → Pay | Green APPROVED |
| 3:05 | Open HashScan link from result / refresh HCS trail | `payment_approved` visible |
| 3:20 | One-line No-Solidity reminder | “still zero `.sol` files” |

**VO:**  
> "One command: `npm run demo`.  
> Create a mandate — payee key, payer account, max amount.  
> Paste a BACEN BR Code, pay ten reais against a five-hundred mandate.  
> Approved. Sequence number on HCS. You can open the topic live on HashScan — judges, the links are in the README."

---

### 3:35–4:10 — Live RECUSA in the product (~35s)

**On screen:** Console again  

**Actions:**  
1. New mandate max `1.00` **or** reuse and request `9999.00`  
2. Pay → red REJECTED  
3. Reason: allowance exceeded / no allowance  
4. HCS shows `payment_rejected`  

**VO:**  
> "Same product, deny path. Request more than remaining.  
> Gateway checks Mirror Node HIP-336 state and refuses before Pix.  
> Rejected decision is still written to HCS — compliance needs the nos, not only the yeses.  
> That pairs with the pre-recorded ledger RECUSA you saw in the open."

---

### 4:10–4:45 — CLOSE: real Pix R$0,01 (~35s)

**On screen (preferred):** Phone / Banco Inter receipt for R$0,01 self-pay (Felipe)  
**Fallback on screen:** Gateway response with E2E id + “Pix stub / live capture” card + promise of receipt in submission  

**VO (preferred):**  
> "And the money path is real. One centavo Pix — R$0,01 — paid on the live rail.  
> Mandate checked. Identity checked. Ledger said yes. Pix settled.  
> PIXPORT: agentic payments that cannot overspend."

**VO (fallback if receipt not ready):**  
> "The gateway is wired for Banco Inter Pix. In this recording we show the authorized path and the synthetic E2E id from stub mode; the live R$0,01 self-pay receipt is attached in the submission pack.  
> The mandate and RECUSA proofs are already on Hedera testnet — open the README links."

---

### 4:45–5:00 — Sting / CTA

**On screen:**  

```
PIXPORT
No Solidity · HIP-336 · HCS · World Identity Check
github.com/ffelipesimoes/eth-lisbon-pixport
README → live HashScan proofs
```

**VO:**  
> "PIXPORT — mandates for Pix, enforced by Hedera. Thanks."

Hard stop at **5:00**. Prefer end at **4:50**.

---

## Shot list (edit order)

| # | Shot | Duration | Source |
|---|------|----------|--------|
| A | Title card | 8s | Canva / storyboard PNG |
| B | RECUSA HashScan result | 45s | Browser |
| C | Problem slide | 30s | Slide |
| D | Architecture | 30s | README diagram |
| E | World ID screenshots | 30s | `docs/world-identity-check/*.png` |
| F | Console APPROVE | 70s | localhost:3000 |
| G | Console RECUSA | 35s | localhost:3000 |
| H | Pix R$0,01 | 35s | Phone / receipt |
| I | End card | 15s | Slide |

---

## Narration — clean full text (teleprompter)

> PIXPORT — an on-chain mandate layer for Pix. Zero Solidity. Network-enforced limits. Every decision audited.  
>  
> Watch what the ledger does when an agent tries to overspend. Treasury approved a HIP-336 allowance. The spender tries to pull more than remaining. Hedera rejects it — amount exceeds allowance. That is RECUSA: not an app if, not a smart contract — the network itself. No Pix call. No money moved. Immutable proof on HashScan.  
>  
> Brazil's Pix moves tens of millions of payments a day — with no programmable mandate. Treasuries and AI agents need a hard stop. PIXPORT puts that stop on Hedera: HTS, HIP-336, HCS, scheduled transactions. First technical claim: zero Solidity, zero EVM — only the Hashgraph SDK.  
>  
> Flow: BR Code in, World Identity Check sets the tier, gateway checks on-chain allowance, approve or RECUSA, every decision on HCS. If allowed, Pix fires.  
>  
> World Identity Check Beta gates every payment. Orb-verified humans get high tier. Device-only is capped. No proof — reject before Pix.  
>  
> One command: npm run demo. Create a mandate. Paste a BR Code. Pay within the limit — approved, logged on HCS.  
> Same product, deny path — request too much, rejected, still written to the audit trail.  
>  
> And the money path is real: one centavo Pix, R$0,01. Mandate checked. Identity checked. Ledger said yes. Pix settled.  
> PIXPORT — mandates for Pix, enforced by Hedera. Thanks.

**Word count ~280 → ~4:40 at 100 wpm** (comfortable with pauses on RECUSA + UI).

---

## Recording SOP

1. Rehearse once silent (click path only).  
2. Record primary take (OBS / QuickTime, 1080p30, system audio off unless VO live).  
3. If VO separate: export silent A-roll, record VO to script, mux.  
4. Export ≤5:00 MP4 H.264.  
5. Upload YouTube **unlisted** + keep local `docs/video/pixport-demo.mp4`.  
6. Paste URL into README **Demo** section same hour.  
7. If venue chaos: ship **fallback MP4** from storyboard (`pixport-fallback.mp4`) + this script; re-record live UI when possible.

---

## Acceptance (PIX-16 video criteria)

| Criterion | Met by |
|-----------|--------|
| ≤5 min | Target 4:30–5:00; hard cut 5:00 |
| Opens with RECUSA | 0:08–0:53 block mandatory |
| Shows BR Code → Identity → tier → allowance → decision → live HCS | 1:55–3:35 |
| Closes with Pix R$0,01 | 4:10–4:45 (live or labeled fallback) |
| Names HTS / HCS / HIP-336 + World Identity Check | VO + on-screen labels |
| Script with timestamps in git | this file |
| Fallback recorded | `docs/video/pixport-fallback.mp4` + storyboard |

---

## Owners

| Piece | Owner |
|-------|--------|
| Script + fallback storyboard MP4 | SubmissionOfficer |
| Live UI take (`npm run demo`) | SubmissionOfficer + GatewayEngineer on-call |
| R$0,01 receipt capture | Felipe / CEO venue |
| YouTube upload + README link | SubmissionOfficer |
