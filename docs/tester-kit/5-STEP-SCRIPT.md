# 5-step tester script (≤10 min)

Facilitator reads **bold**. Tester does the actions. Do not drive their mouse unless they are stuck >60s.

**Prep (facilitator, before they sit):**

```bash
cd pixport   # or eth-lisbon-pixport
cp -n .env.example .env   # ensure HEDERA_OPERATOR_ID + KEY set
npm run demo              # console :3000 · gateway :3001
```

Open tabs for them:

1. http://localhost:3000  
2. https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418 (RECUSA)  
3. https://hashscan.io/testnet/topic/0.0.9742958 (HCS)  
4. https://github.com/ffelipesimoes/eth-lisbon-pixport (README)

---

## Consent (30s)

Read [CONSENT.md](./CONSENT.md). **Stop if No.**

---

## Step 1 — RECUSA proof (2 min) · *required*

**"Open the RECUSA HashScan tab. What is the transaction result?"**

Expect: `AMOUNT_EXCEEDS_ALLOWANCE` (or clear fail status).

**"In one sentence, what does that mean for an AI agent with a spending limit?"**

Capture their answer — often becomes the quote.

- [ ] Tester opened link themselves  
- [ ] Result confirmed  

---

## Step 2 — README / No-Solidity claim (1 min)

**"Skim the top of the README. What is the first technical claim?"**

Expect: No Solidity / 100% Hedera native / zero EVM.

**"Click any other live HashScan link (token, topic, or success transfer). Does it resolve?"**

- [ ] No-Solidity noticed  
- [ ] Second HashScan link OK  

---

## Step 3 — Live console APPROVE (3 min)

**"On localhost:3000 — Create Mandate: click Demo key, Demo account, max 500, Create."**

Expect: mandate id + APPROVED-ish status + HCS sequence.

**"Execute Payment: Sample BR Code, amount 10, paste mandate, Pay."**

Expect: green APPROVED (or clear authorized message) + HCS trail update.

If gateway offline banner: facilitator runs `npm run demo` recovery (see cheatsheet) — note friction.

- [ ] Mandate created  
- [ ] Pay APPROVED  
- [ ] HCS trail shows new event  

---

## Step 4 — Live console RECUSA (2 min)

**"Create a tight mandate (max 1.00) or pay 9999 against the previous mandate. Hit Pay."**

Expect: red REJECTED + reason about allowance + HCS `payment_rejected` / similar.

**"Did Pix get called, or did we stop earlier?"**

Expect: stopped before Pix / on-chain or gateway mandate check.

- [ ] REJECTED visible  
- [ ] Tester understands pre-Pix stop  

---

## Step 5 — Feedback form (2 min)

Hand [FEEDBACK-FORM.md](./FEEDBACK-FORM.md).

**"Write one honest sentence — what clicked, what was confusing, would you trust this for an agent wallet?"**

Optional: photo of their screen on RECUSA HashScan (no faces required).

- [ ] Form complete  
- [ ] Quote present  
- [ ] Outcome selected  

---

## Paths if short on time

| Time | Do |
|------|-----|
| 5 min only | Steps 1 + 2 + form (HashScan-only tester still counts) |
| 8 min | Steps 1–4 + short quote |
| 12 min | Full + World ID screenshots in `docs/WORLD-IDENTITY-CHECK.md` |

---

## World ID optional bonus (+3 min)

Open [docs/WORLD-IDENTITY-CHECK.md](../WORLD-IDENTITY-CHECK.md).

**"Orb tier can approve; device / none reject. Does that match what you'd want for agentic pay?"**

Note answer on form under "Other".
