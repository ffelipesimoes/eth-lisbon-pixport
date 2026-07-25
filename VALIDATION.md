# VALIDATION.md — External tester evidence

> **Judging weight: Validation 15%.**  
> This file is evidence, not marketing. Every row needs a real name, what they ran, a quoted reaction, and a pass/fail outcome.  
> Team members (Felipe, Paperclip agents) do **not** count toward the ≥3 independent testers.

**Status:** scaffold ready — slots open for ≥3 independent builders/testers at ETHGlobal Lisbon venue.  
**Last updated:** 2026-07-25 (SubmissionOfficer / PIX-8)  
**Repo:** https://github.com/ffelipesimoes/eth-lisbon-pixport

---

## How to run a validation session (script for recruiters)

1. Open README live proof table first (RECUSA HashScan link).
2. Clone + install (or use the demo console if up).
3. Pick **one** path:
   - **Judge path (5 min):** click RECUSA → SUCCESS transfer → token → topic on HashScan.
   - **Builder path (15–20 min):** `npm install` → configure testnet `.env` from `.env.example` → run allowance demo / gateway health.
   - **World ID path:** follow [packages/agent/DEV_TEST.md](./packages/agent/DEV_TEST.md) (dev path without phone where documented).
4. Capture: name, role/affiliation, timestamp, what they tried, quote, outcome, optional photo of HashScan on their screen.
5. Paste into a free slot below the same day — do not batch at the end.

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
**Blocker if still 0 by Saturday night:** escalate CEO + Felipe venue sourcing (see Recruiting log).

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
- [ ] Ran local setup (`npm install` / gateway / allowance demo)
- [ ] World ID dev path ([DEV_TEST.md](./packages/agent/DEV_TEST.md))
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
- [ ] Local setup
- [ ] World ID dev path
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
- [ ] Local setup
- [ ] World ID dev path
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
| _e.g. README unclear on deny path_ | T# | High/Med/Low | | open |
| | | | | |

---

## Recruiting log (Validation 15% risk)

Independent testers are the largest risk to the 15% Validation score. Track every ask.

| When | Who asked | Channel | Target person / booth | Response | Next step |
|------|-----------|---------|----------------------|----------|-----------|
| 2026-07-25 | SubmissionOfficer | Paperclip → CEO | Felipe + venue builders | Escalated — need ≥3 non-team testers | CEO/Felipe source at venue; return names here |
| | | | | | |

### Sourcing checklist (CEO / Felipe)

- [ ] 3 builders from **other** ETHGlobal teams (not PIXPORT)
- [ ] Prefer people who can open HashScan on their laptop
- [ ] Mix: 1 non-technical click-through + 2 builders who clone/run
- [ ] Collect quote + consent same session
- [ ] Optional: mentor / sponsor engineer as tester #4

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
| _team only_ | | | Useful for polish; excluded from Validation score |

---

## Links judges need alongside this file

- README live proof: [README.md](./README.md)
- Metrics: [docs/TESTNET-METRICS.md](./docs/TESTNET-METRICS.md)
- PRD / score prediction: [HACKATHON-PRD.md](./HACKATHON-PRD.md)
- World ID dev path: [packages/agent/DEV_TEST.md](./packages/agent/DEV_TEST.md)
