# VALIDATION.md — External tester evidence

> **Judging weight: Validation 15%.**  
> This file is evidence, not marketing. Every row needs a real name, what they ran, a quoted reaction, and a pass/fail outcome.  
> Team members (Felipe, Paperclip agents) do **not** count toward the ≥3 independent testers.

**Status:** tester kit ready · demo unblocked (`npm run demo`) · **0 / 3 independent testers filled** — venue sourcing is the critical path  
**Last updated:** 2026-07-25 (SubmissionOfficer / PIX-16)  
**Repo:** https://github.com/ffelipesimoes/eth-lisbon-pixport  
**Tester kit:** [docs/tester-kit/](./docs/tester-kit/README.md)

---

## How to run a validation session

Use the **printed kit** (do not improvise):

1. [docs/tester-kit/CONSENT.md](./docs/tester-kit/CONSENT.md) — quote consent first  
2. [docs/tester-kit/5-STEP-SCRIPT.md](./docs/tester-kit/5-STEP-SCRIPT.md) — 5 steps ≤10 min  
3. [docs/tester-kit/FEEDBACK-FORM.md](./docs/tester-kit/FEEDBACK-FORM.md) — one form per tester  
4. [docs/tester-kit/FACILITATOR-CHEATSHEET.md](./docs/tester-kit/FACILITATOR-CHEATSHEET.md) — recovery + HashScan  

**Demo command (after PIX-15):**

```bash
npm run demo
# http://localhost:3000  ·  gateway :3001
```

**HashScan-only path (Wi-Fi / laptop failure still counts):** RECUSA tx + second live link + form.

### Consent line (read aloud)

> "Can I quote your first name, affiliation, and one sentence of feedback in our ETHGlobal submission VALIDATION.md? Yes / No."

Only record **Yes**.

---

## Summary scoreboard

| # | Tester | Affiliation | Path | Outcome | Quote captured | Date |
|---|--------|-------------|------|---------|----------------|------|
| 1 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | No | — |
| 2 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | No | — |
| 3 | _TBD_ | _TBD_ | _TBD_ | _TBD_ | No | — |
| 4 | _optional_ | | | | | |
| 5 | _optional_ | | | | | |

**Independent testers completed:** 0 / 3 minimum  
**Blocker:** venue humans must sit the kit — agents cannot invent names/quotes.  
**Unblock owner:** CEO + Felipe (floor recruiting) using the 60s pitch in the tester kit README.

---

## Tester slots (fill in place)

### Tester 1 — _NAME_

| Field | Value |
|-------|--------|
| Name | |
| Affiliation / project at ETHGlobal | |
| Role (builder / designer / judge-adjacent / other) | |
| Not on PIXPORT team? | Yes / No (must be Yes) |
| Consent to quote | Yes / No |
| Date · time · venue zone | |
| Facilitator | Felipe / SubmissionOfficer / other |

**What they tested**

- [ ] Opened RECUSA HashScan link
- [ ] Opened SUCCESS transfer HashScan link
- [ ] Opened HTS token + HCS topic
- [ ] Cloned repo / read README
- [ ] Ran `npm run demo` APPROVE path
- [ ] Ran console RECUSA path
- [ ] World ID docs ([docs/WORLD-IDENTITY-CHECK.md](./docs/WORLD-IDENTITY-CHECK.md))
- [ ] Other: ___

**Steps observed (bullet the actual path)**

1.
2.
3.

**Outcome**

- Result: `PASS` / `PASS_WITH_FRICTION` / `FAIL`
- Friction / bugs found:
- Follow-up issue / owner:

**Quoted feedback** (verbatim, 1–3 sentences)

> “…”

**Evidence links**

- Screenshot / photo:
- HashScan URL they confirmed:
- Notes:

---

### Tester 2 — _NAME_

| Field | Value |
|-------|--------|
| Name | |
| Affiliation / project at ETHGlobal | |
| Role | |
| Not on PIXPORT team? | Yes / No |
| Consent to quote | Yes / No |
| Date · time · venue zone | |
| Facilitator | |

**What they tested**

- [ ] RECUSA HashScan
- [ ] SUCCESS transfer HashScan
- [ ] Token + topic
- [ ] Clone / README
- [ ] `npm run demo` APPROVE
- [ ] Console RECUSA
- [ ] World ID path
- [ ] Other: ___

**Steps observed**

1.
2.
3.

**Outcome**

- Result: `PASS` / `PASS_WITH_FRICTION` / `FAIL`
- Friction / bugs found:
- Follow-up issue / owner:

**Quoted feedback**

> “…”

**Evidence links**

- Screenshot / photo:
- HashScan URL they confirmed:

---

### Tester 3 — _NAME_

| Field | Value |
|-------|--------|
| Name | |
| Affiliation / project at ETHGlobal | |
| Role | |
| Not on PIXPORT team? | Yes / No |
| Consent to quote | Yes / No |
| Date · time · venue zone | |
| Facilitator | |

**What they tested**

- [ ] RECUSA HashScan
- [ ] SUCCESS transfer HashScan
- [ ] Token + topic
- [ ] Clone / README
- [ ] `npm run demo` APPROVE
- [ ] Console RECUSA
- [ ] World ID path
- [ ] Other: ___

**Steps observed**

1.
2.
3.

**Outcome**

- Result: `PASS` / `PASS_WITH_FRICTION` / `FAIL`
- Friction / bugs found:
- Follow-up issue / owner:

**Quoted feedback**

> “…”

**Evidence links**

- Screenshot / photo:
- HashScan URL they confirmed:

---

### Tester 4+ (overflow)

Copy a tester block above. Prefer ≥5 if traffic allows — judges reward density of independent signal.

---

## Themes & product follow-ups

| Theme | Mentioned by | Severity | Owner | Status |
|-------|--------------|----------|-------|--------|
| _fill after session 1_ | T# | High/Med/Low | | open |
| | | | | |

---

## Recruiting log (Validation 15% risk)

Independent testers are the largest risk to the 15% Validation score. Track every ask.

| When | Who asked | Channel | Target person / booth | Response | Next step |
|------|-----------|---------|----------------------|----------|-----------|
| 2026-07-25 AM | SubmissionOfficer | Paperclip → CEO | Felipe + venue builders | Escalated — need ≥3 non-team testers | CEO/Felipe source at venue |
| 2026-07-25 14:15 UTC | SubmissionOfficer | PIX-16 after PIX-15 done | Demo + **tester kit shipped** | Kit ready; still 0 forms | **CEO/Felipe: run kit on floor now** — 60s pitch in docs/tester-kit/README.md |
| | | | | | |

### Sourcing checklist (CEO / Felipe)

- [ ] 3 builders from **other** ETHGlobal teams (not PIXPORT)
- [ ] Prefer people who can open HashScan on their laptop
- [ ] Mix: 1 HashScan-only + 2 who run `npm run demo`
- [ ] Collect quote + consent same session
- [ ] Optional: mentor / sponsor engineer as tester #4
- [ ] Return filled FEEDBACK-FORM (photo or paste) → SubmissionOfficer fills slots same hour

### What “done” looks like for Validation

- [ ] ≥3 rows in scoreboard with real names (not team)
- [ ] Each has a verbatim quote
- [ ] Each has PASS / PASS_WITH_FRICTION / FAIL
- [ ] At least one tester independently opened the **RECUSA** HashScan link
- [ ] Friction items filed as issues with owners

---

## Internal dry-runs (do not count toward ≥3)

| Who | Role | Date | Notes |
|-----|------|------|-------|
| GatewayEngineer | PIX-15 smoke | 2026-07-25 | Flow A APPROVE + Flow B RECUSA on `npm run demo` — product ready for external testers |
| SubmissionOfficer | script/kit dry-run | 2026-07-25 | Video script + tester kit committed; fallback MP4 4:33 |

---

## Links judges need alongside this file

- README live proof: [README.md](./README.md)
- Metrics: [docs/TESTNET-METRICS.md](./docs/TESTNET-METRICS.md) — **55 unique txs · 23 HCS msgs** (2026-07-25 14:10 UTC)
- PRD / score prediction: [HACKATHON-PRD.md](./HACKATHON-PRD.md)
- World ID: [docs/WORLD-IDENTITY-CHECK.md](./docs/WORLD-IDENTITY-CHECK.md)
- Video script: [docs/video/VIDEO-SCRIPT.md](./docs/video/VIDEO-SCRIPT.md)
- Fallback video: [docs/video/pixport-fallback.mp4](./docs/video/pixport-fallback.mp4)
- Tester kit: [docs/tester-kit/](./docs/tester-kit/README.md)
