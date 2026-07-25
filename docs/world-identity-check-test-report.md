# World Identity Check (Beta) — Test Report

> **Prize track:** World Identity Check Beta — **formal test-documentation deliverable** (two parts: dev feedback + user feedback).
> **Product proof (separate doc):** [docs/WORLD-IDENTITY-CHECK.md](./WORLD-IDENTITY-CHECK.md) — flows, screenshots, reproduce checklist.
> **Owner:** WorldEngineer · **Status:** Part 1 (dev feedback) **complete** · Part 2 (user feedback) **pending venue sessions** — collection protocol ready, recruiting tracked in [VALIDATION.md](../VALIDATION.md).
> **Last updated:** 2026-07-25 (evening — console widget + gateway verify endpoint landed, D7/D8 resolved)

This report is the test record for PIXPORT's use of **World Identity Check (Beta)**: server-side verification of `orb`/`device` proofs via `verifyCloudProof()` (`@worldcoin/idkit-core/backend`, Cloud API v2), where the Identity Check result sets the payer's HIP-336 allowance tier (orb → HIGH 1,000,000 units · device → MEDIUM 100,000 units · none → ZERO/reject). Implementations: [`packages/agent/src/worldid.ts`](../packages/agent/src/worldid.ts) (agent/CLI path) and [`packages/gateway/src/worldid/index.ts`](../packages/gateway/src/worldid/index.ts) + [`packages/gateway/src/routes/worldid.ts`](../packages/gateway/src/routes/worldid.ts) (console/HTTP path — same semantics, exposed as `GET /worldid/config` + `POST /worldid/verify`); browser side: IDKit widget in [`packages/console/src/app/page.tsx`](../packages/console/src/app/page.tsx).

---

## Part 1 — Dev feedback (SDK / API / docs / setup)

### Test environment

| Component | Version / value |
|---|---|
| SDK (declared) | `@worldcoin/idkit-standalone` ^2.2.5 |
| SDK (resolved, transitive) | `@worldcoin/idkit` 2.4.2 · `@worldcoin/idkit-core` 2.1.0 |
| Verification API | Cloud API v2 — `verifyCloudProof()` |
| Hosts used | `staging-developer.worldcoin.org/api/v2/verify` (staging) · `developer.worldcoin.org/api/v2/verify` (production) |
| Stack | Node 22 / TypeScript 5.8 / tsx · Hedera testnet |
| Action | `pixport-payment` · Signal: payer Hedera account ID |

### D1 — `verifyCloudProof` endpoint construction is ambiguous

**Friction:** it is not clear from the API surface whether the `endpoint` argument should already include `/{app_id}` or whether the SDK appends it. Our code carries both interpretations in comments and resolves it by passing the full URL explicitly:

```ts
// packages/agent/src/worldid.ts:76-79
// verifyCloudProof appends /{app_id} automatically when this is passed as endpoint.
// We pass the full endpoint including app_id to be explicit.
const endpoint = `${base}/${config.appId}`;
```

**Impact:** ~30 min reading SDK source to confirm actual URL construction; risk of a 404 against the wrong path on first integration.
**Suggestion:** document the exact final URL in the `verifyCloudProof` TSDoc, or accept `{ env: "staging" | "production", appId }` and build the URL internally.

### D2 — `VerificationLevel` enum requires a double cast from `ISuccessResult` JSON

**Friction:** the proof deserialized from IDKit's success result types `verification_level` as a string union (`"orb" | "device"`), which is not assignable to the SDK's `VerificationLevel` enum without `as unknown as`:

```ts
// packages/agent/src/worldid.ts:88-89
// Cast to IDKit enum — runtime values "orb"/"device" match enum members exactly
verification_level: proof.verification_level as unknown as IDKitVerificationLevel,
```

**Impact:** minor, but every TS integrator hits it; `as unknown as` defeats type safety exactly at the security-critical field.
**Suggestion:** export a string-union type (or a parser) from `idkit-core` so the wire format is assignable without casts.

### D3 — First run fails on the placeholder `app_id` from `.env.example`

**Friction:** copying `.env.example` and filling only Hedera keys throws on startup:

```ts
// packages/agent/src/worldid.ts:53-57
if (process.env.WORLD_MOCK !== "true" && (!appId || appId.startsWith("app_X"))) {
  throw new Error("WORLD_APP_ID is not configured. Set it in .env or set WORLD_MOCK=true for dev testing.");
}
```

**Impact:** every new environment dies on first boot until the developer registers an app or discovers mock mode. The error message does point to the fix (good), but the portal registration itself is the real gate (see D6).
**Suggestion:** ship a `WORLD_MOCK=true` default in the example env for first boot, or a `idkit doctor`-style CLI that validates app/action reachability before runtime.

### D4 — Staging and production verify on different hosts, selected out-of-band

**Friction:** staging proofs only verify against `staging-developer.worldcoin.org`, production proofs only against `developer.worldcoin.org`. The host must be chosen by the integrator (`WORLD_ENV`) and must match the environment of the app registered in the portal — a mismatch surfaces as a generic verification failure, not a clear "wrong environment" error. We hardcoded both hosts:

```ts
// packages/agent/src/worldid.ts:36-39
const WORLD_API_V2_BASE: Record<string, string> = {
  staging: "https://staging-developer.worldcoin.org/api/v2/verify",
  production: "https://developer.worldcoin.org/api/v2/verify",
};
```

**Impact:** easy to misconfigure when moving from simulator testing to production; failure mode is opaque.
**Suggestion:** return a distinct error code for "proof valid but wrong environment", or derive the host from the `app_id` prefix (`app_staging_…` vs `app_…`).

### D5 — Nullifier reuse breaks iterative testing

**Friction:** the Cloud API rejects re-used nullifiers, so re-running the same captured proof across test iterations fails:

> "Nullifier hash uniqueness: The Cloud API rejects re-used nullifiers. For multiple test runs, generate new proofs each time (different `mandateId` + different simulator run)." — [`DEV_TEST.md`](../packages/agent/DEV_TEST.md), Architecture Notes

**Impact:** correct behavior for Sybil resistance, but it makes regression testing against recorded fixtures impossible; every test run needs a fresh simulator round-trip.
**Suggestion:** a staging-only "accept seen nullifiers" toggle on the app, or a documented fixture-reset endpoint, would make CI against the real API practical.

### D6 — No credentials-free happy path; simulator must be discovered in external docs

**Friction:** nothing verifiable works without (a) a World App sign-in to register a portal app and (b) knowing that [simulator.worldcoin.org](https://simulator.worldcoin.org) exists and produces staging-valid proofs. This discovery cost is why we introduced an explicit mock mode so judges can run the full decision demo in <5 s with zero credentials:

```bash
WORLD_MOCK=true GATEWAY_MOCK=true ALLOWANCE_MOCK=true npm run demo -w packages/agent
# → 1 APPROVE + 3 REJECT, exit 0 (captured in docs/world-identity-check/)
```

**Impact:** the single largest setup cost in the integration; also a demo-robustness risk (live verify on stage depends on portal reachability) — mitigated by the documented fallback flag (see "Stage fallback" below).
**Suggestion:** link the simulator directly from the portal action page and from `verifyCloudProof` docs; consider a signed "test proof" the SDK can emit for staging apps.

### D7 — `idkit-core` is imported but not declared (transitive-only) — ✅ RESOLVED

**Friction:** `packages/agent` imports `@worldcoin/idkit-core/backend` directly, but only declares `@worldcoin/idkit-standalone` in `package.json`; `idkit-core@2.1.0` resolves only via hoisting from `idkit-standalone` → `@worldcoin/idkit@2.4.2` → `idkit-core@2.1.0` (see `package-lock.json` / `yarn.lock`).

**Impact:** works under npm/yarn hoisting; breaks under strict dependency isolation (pnpm, PnP). Latent build fragility, filed for cleanup.
**Suggestion (to World):** promote `idkit-core/backend` to a documented standalone entry point for server-side-only integrators who don't need the widget.

**Resolution (2026-07-25, PIX-24):** `@worldcoin/idkit-core@^2.1.0` is now a **direct declared dependency** of both `@pixport/agent` and `@pixport/gateway`. `npm ls @worldcoin/idkit-core` shows `2.1.0 deduped` — identical resolved version as the transitive path, so zero behavior change; the declaration removes the pnpm/PnP fragility.

### D8 — Widget docs assume a registered app; staging widget behavior undocumented — ✅ RESOLVED (widget shipped)

**Friction:** all frontend material assumes a production `app_id`. There is no documented guidance for rendering the IDKit widget against a staging app during development, so our console currently has **no widget** (`packages/console/package.json` has no `@worldcoin/idkit*` dependency) and the user path is exercised via CLI + simulator instead. Closing this is tracked as a follow-up (console "Verify with World" button → proof → backend verify).

**Impact:** the browser user journey can't be demoed end-to-end without portal registration; forces CLI-only user testing at the venue.
**Suggestion:** a staging quickstart for the React widget (`<IDKitWidget app_id="app_staging_…">` + simulator QR) would close the gap.

**Resolution (2026-07-25, PIX-24):** the widget is now in the console and the browser journey exists end-to-end:

- `packages/console` declares `@worldcoin/idkit@^2.4.2`; the payment flow has a **Verify with World** step (`<IDKitWidget app_id action="pixport-payment" signal={payerAccountId} verification_level="orb">`) whose `onSuccess` posts the proof to the backend — the client is never trusted.
- New gateway endpoints: `GET /worldid/config` (widget config: app_id/action/env/mock — single source of truth, console never hardcodes it) and `POST /worldid/verify` (server-side `verifyCloudProof()` → tier; outcome logged to HCS as `identity_check`, best-effort).
- The resolved tier is displayed **next to the payment cap** and gates the Pay button: orb → HIGH R$ 10.000,00 · device → MEDIUM R$ 1.000,00 · unverified → Pay blocked; amount above the tier cap blocks with an explicit message. Re-verifying at a different level changes the cap in place — the behavior change is observable in the UI, not a static badge.
- Verified in this workspace: production `next build` clean; live smoke of `POST /worldid/verify` (mock mode) returning orb→`10000.00` and device→`1000.00`; 400 on malformed body; 503 with actionable message when `WORLD_APP_ID` is unset and mock is off; SSR render of the fallback UI confirmed.
- The remaining gap (real staging `app_id` from the Developer Portal) is tracked separately (PIX-25) — the staging quickstart suggestion to World stands.

### Setup timeline (real, from git history)

| When (UTC, 2026-07-25) | What landed | Commit |
|---|---|---|
| 13:33 | E2E agent: World tier → allowance → `/pay` → HCS | `ee544da` |
| 13:46 | Explicit Identity Check gate + per-payment tier enforcement | `7f9744c` |
| 13:51 | Demo console (HCS trail; no widget yet) | `5af2ca8` |
| 13:55–13:56 | Judge docs + terminal screenshots | `d9b47dc`, `5e71f55` |
| 19:20 | Console IDKit widget + gateway `/worldid/verify` + stage fallback flag (D7/D8 resolved; rebased onto wizard console) | `18bd0b3` |

Backend verification + four-case demo + judge-facing docs landed same-day; the blocking prerequisite throughout was portal registration (D3/D6), still pending for a real (non-mock) proof run.

### What went well

- `verifyCloudProof()` semantics are clean: once app/action/signal/level align, `{ success: true }` is unambiguous and the ZK binding of `verification_level` removes any need to trust client claims.
- The staging simulator produces cryptographically valid proofs — real verification without an Orb.
- The v2 signal design let us bind proofs to the payer's Hedera account with zero PII (see Data minimization).

---

## Part 2 — User feedback (venue sessions)

> **Status: PENDING real sessions.** 0/3 independent testers recruited so far — see [VALIDATION.md](../VALIDATION.md) scoreboard. Recruiting owner: CEO/Felipe (venue floor, 60 s pitch in [tester kit](./tester-kit/README.md)). Fill owner: WorldEngineer — this section is updated same-hour as forms arrive. **No data below is fabricated; empty slots are intentional.**

### Collection protocol (per session, ≤10 min)

1. Consent line read aloud ([CONSENT.md](./tester-kit/CONSENT.md)); only record **Yes**.
2. Run [5-STEP-SCRIPT.md](./tester-kit/5-STEP-SCRIPT.md) with the World-specific path: simulator QR or World App → proof → backend `verifyCloudProof` → tier → APPROVE/REJECT decision.
3. One [FEEDBACK-FORM.md](./tester-kit/FEEDBACK-FORM.md) per tester, capturing the World-specific signals below.

**World-specific signals to record:** comprehension ("what do you think Identity Check proved?") · friction (QR scan, World App prompt, simulator UX) · drop-off step · camera/selfie/Orb problems · whether the tier change (device 1,000 BRL cap vs orb 10,000 BRL cap) was understood as the point of the demo.

### Session log

#### U1 — _pending_

| Field | Value |
|---|---|
| Name / affiliation | |
| World App installed? Orb-verified? | |
| Path used (World App / simulator QR / CLI) | |
| Comprehension of Identity Check → tier | |
| Friction observed | |
| Drop-off step (if any) | |
| Camera / selfie / Orb issues | |
| Quote (with consent) | |
| Outcome | PASS / PASS_WITH_FRICTION / FAIL |

#### U2 — _pending_

_(same fields)_

#### U3 — _pending_

_(same fields)_

### Internal dry-runs (do not count as independent testers)

| Who | Date | Notes |
|---|---|---|
| GatewayEngineer | 2026-07-25 | `npm run demo` smoke — APPROVE + RECUSA paths green |
| SubmissionOfficer | 2026-07-25 | Tester-kit dry-run; fallback MP4 4:33 |

---

## Data minimization justification (track requirement)

PIXPORT requests the **minimum identity attributes** needed to gate money movement — nothing more:

| Attribute requested | Why it is necessary | What we deliberately do **not** collect |
|---|---|---|
| `action = pixport-payment` | Scopes the proof to the payment intent; prevents replaying a proof issued for another action. | — |
| `signal = payer Hedera account ID` | Binds the proof to the on-chain payer, so a proof can't be lifted and attached to a different account's allowance. It is a pseudonymous ledger ID, not personal data. | No name, email, phone, CPF, date of birth, nationality. |
| `verification_level` (`orb`) | The **only** identity attribute consumed: it is the input that selects the allowance tier (orb → HIGH). Without it there is no Sybil-resistant basis for the limit. | We never read or store raw biometrics — the Orb processes them; we receive only the ZK proof. |
| `nullifier_hash` | Uniqueness without identity: prevents the same human from sybiling multiple mandates, while revealing nothing about who they are. Stored only as part of the HCS decision audit. | No linkage to off-chain identity is attempted. |

Net effect: the system learns "a unique Orb-verified human controls this payer account" — and nothing else about them.

---

## Stage fallback (demo robustness — documented)

| Mechanism | Status | Detail |
|---|---|---|
| `WORLD_MOCK=true` | ✅ implemented + documented | Skips the Cloud API and trusts the proof's `verification_level`. Dev/judge use only; guard refuses start with placeholder `app_id` otherwise. (Spec named this `SKIP_WORLDID`; implemented as `WORLD_MOCK` — same function.) Applies to **both** verify paths: agent (`packages/agent`) and gateway (`POST /worldid/verify`). |
| `NEXT_PUBLIC_SKIP_WORLDID=true` (console) | ✅ implemented 2026-07-25 (PIX-24) | Console-side alias of the spec's `SKIP_WORLDID`: replaces the IDKit widget with a **pre-applied tier selector** (orb → R$ 10.000 / device → R$ 1.000) that posts a mock proof to `POST /worldid/verify`. The demo never depends on portal/simulator reachability. **Requires `WORLD_MOCK=true` on the gateway** — otherwise the mock proof is honestly rejected by the real `verifyCloudProof` call. Both flags are in `.env.example` with safe defaults (`false`); `npm run demo` exports them from `.env` to both processes. |
| Pre-applied tier via env | ✅ implemented | `TIER_ORB_MAX` / `TIER_DEVICE_MAX` / `TIER_UNVERIFIED_MAX` set tier caps without redeploy (honored by agent and gateway alike). |
| One-command offline demo | ✅ verified 2026-07-25, exit 0 | `WORLD_MOCK=true GATEWAY_MOCK=true ALLOWANCE_MOCK=true npm run demo -w packages/agent` → 1 APPROVE + 3 REJECT ([captured](./world-identity-check/e2e-demo-terminal.txt)). Re-verified after the PIX-24 dependency changes — same result. |
| Console tier fallback | ✅ implemented 2026-07-25 (PIX-24) | Selector + mock proof + backend-tier display shipped (see `NEXT_PUBLIC_SKIP_WORLDID` row above); SSR render of the fallback UI verified. Stage plan is unchanged: live widget if the portal app exists (PIX-25), fallback selector otherwise — plus CLI demo as second fallback. |

---

## Open follow-ups

| Gap | Owner | Tracking |
|---|---|---|
| ~~IDKit widget in console ("Verify with World" → backend verify → tier badge)~~ | WorldEngineer | ✅ shipped 2026-07-25 (PIX-24) — see D8 resolution |
| Developer Portal app/action registration + first real (non-mock) staging proof e2e | CEO/Felipe (portal sign-in) → WorldEngineer (run + capture) | Paperclip child issue of PIX-23 (PIX-25) |
| Fill Part 2 with ≥2–3 real venue sessions | WorldEngineer (fill) · CEO/Felipe (recruit) | This doc + [VALIDATION.md](../VALIDATION.md) |
| ~~Declare `@worldcoin/idkit-core` as a direct dependency (D7)~~ | WorldEngineer | ✅ shipped 2026-07-25 (PIX-24) — see D7 resolution |
