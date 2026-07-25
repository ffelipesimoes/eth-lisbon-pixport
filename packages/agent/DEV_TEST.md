# PIXPORT Agent — World Identity Check (Beta) Dev & User Test Paths

> **For judges and developers testing World Identity Check without a real Orb or World App.**
> Covers: Simulator path (no phone), user path (real World App), and rejection scenarios.

---

## What is World Identity Check (Beta)?

World Identity Check is World's Beta product that verifies a person is a **unique, orb-verified human** — not a bot, not a duplicate account. In PIXPORT, Identity Check status determines the payer's **AllowanceTier**:

| World Identity Check Result | Verification Level | Tier   | Max Payment per Request |
|---|---|---|---|
| Identity Check ✓ (Orb-verified) | `orb`    | HIGH   | 10,000 BRL (1,000,000 units) |
| Device-verified (no Orb)         | `device` | MEDIUM |  1,000 BRL   (100,000 units) |
| No proof / unverified            | `none`   | ZERO   | Rejected immediately         |

The agent autonomously reads the on-chain HIP-336 allowance and **only approves** payments within both the tier cap and the remaining allowance. Identity Check is mandatory — device-only verification gets a hard 1,000 BRL ceiling.

---

## Path A — Staging Simulator (recommended for judges, no phone required)

This path generates a **real cryptographic proof** verifiable by the World staging Cloud API.

### Prerequisites

You need a **staging app_id** from the World Developer Portal. Two options:

**Option 1 — Use PIXPORT's staging app_id** (if provided by SubmissionOfficer in VALIDATION.md):
```env
WORLD_APP_ID=app_staging_<provided-value>
```

**Option 2 — Register your own staging app** (2 minutes):
1. Open https://developer.worldcoin.org
2. Sign in with your World App account
3. Click **New App** → choose **Staging** environment
4. Create an action named `pixport-payment`
5. Copy the `app_id` (format: `app_staging_…`)

### Steps

**1. Configure environment**
```bash
cd packages/agent
cp .env.example .env
```
Edit `.env`:
```env
WORLD_APP_ID=app_staging_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
WORLD_ACTION=pixport-payment
WORLD_ENV=staging
WORLD_MOCK=false          # use real staging API
GATEWAY_MOCK=true         # no gateway server needed for the agent demo
HEDERA_ACCOUNT_ID=0.0.XXXXX
HEDERA_PRIVATE_KEY=0x...
HEDERA_HCS_TOPIC_ID=0.0.9742958
HEDERA_TREASURY_ID=0.0.9742864
```

**2. Generate a staging orb proof** (Identity Check)
- Open https://simulator.worldcoin.org
- Enter your `app_id` (the `app_staging_…` value)
- Enter action: `pixport-payment`
- Enter signal: your Hedera payer account ID (e.g. `0.0.12345`)
- Select verification level: **`orb`** ← this is the Identity Check level
- Click **Generate Proof** → copy the JSON output

**3. Submit to the agent (APPROVE case — Identity Check ✓)**
```bash
echo '{
  "brCode": "00020126330014BR.GOV.BCB.PIX0111123456789010208PIXPORT52040000530398654041.005802BR5913PIXPORT Demo6009Sao Paulo62070503***6304A1B2",
  "payerAccountId": "0.0.12345",
  "mandateId": "mnd-judge-001",
  "amount": "1.00",
  "worldIdProof": {
    "proof": "<proof from simulator>",
    "merkle_root": "<merkle_root from simulator>",
    "nullifier_hash": "<nullifier_hash from simulator>",
    "verification_level": "orb",
    "signal": "0.0.12345"
  }
}' | npm run pay -w packages/agent
```

**Expected output (APPROVE):**
```
[WorldID] Identity Check result: orb [Identity Check ✓ — Orb-verified human]
[Agent] Identity: Identity Check ✓ (orb) → tier "Orb-verified human" (maxSpend: 1000000)
[Agent] Allowance: remaining=…
[Agent] Decision: APPROVE — calling gateway POST /pay
══════════════════════════════════════════════════════════════════════
  Decision:    APPROVE
  Tier:        Orb-verified human (max: 1000000)
  HCS TX:      0.0.XXXXX@…
══════════════════════════════════════════════════════════════════════
```

**4. Test device-only rejection (NOT Identity Check)**
- Same simulator, change verification level to **`device`**
- Generate a new proof with a **different signal** or keep the same
- Submit with `amount: "1500.00"` (1,500 BRL = 150,000 units > device tier cap)

```bash
echo '{
  "brCode": "...",
  "payerAccountId": "0.0.12345",
  "mandateId": "mnd-judge-device-001",
  "amount": "1500.00",
  "worldIdProof": {
    "proof": "<device-level proof from simulator>",
    "merkle_root": "...",
    "nullifier_hash": "...",
    "verification_level": "device",
    "signal": "0.0.12345"
  }
}' | npm run pay -w packages/agent
```

**Expected output (REJECT — TIER_INSUFFICIENT):**
```
[WorldID] MOCK — device proof accepted without API call [device-only, not Identity Check]
[Agent] Identity: device-verified (not Identity Check) → tier "Device-verified" (maxSpend: 100000)
══════════════════════════════════════════════════════════════════════
  Decision:    REJECT
  Code:        TIER_INSUFFICIENT
  Reason:      Identity Check tier "Device-verified" allows max 100000 units...
               Complete World Identity Check (orb verification) for the 1000000-unit limit.
══════════════════════════════════════════════════════════════════════
```

This confirms: **device-verified users cannot exceed 1,000 BRL without completing Identity Check (orb).**

---

## Path B — Mock Mode (instant, zero network, CI-safe)

Skip all API calls entirely. The proof's `verification_level` is trusted as-is.

**Setup:**
```env
WORLD_MOCK=true
GATEWAY_MOCK=true
```

**Run the full demo (4 cases: approve + 3 rejections):**
```bash
WORLD_MOCK=true GATEWAY_MOCK=true ALLOWANCE_MOCK=true npm run demo -w packages/agent
```

`ALLOWANCE_MOCK=true` returns a synthetic 2,000,000-unit allowance for Case 1 (APPROVE), skipping the real Mirror Node query. Set `HEDERA_TREASURY_ID` + `HEDERA_ACCOUNT_ID` to use the real testnet allowance instead.

**Expected output:**
```
Case 1 APPROVE — Identity Check ✓ (orb),  1 BRL  within allowance   : APPROVE
Case 2 REJECT  — Identity Check ✓ (orb),  300 BRL exceeds allowance : REJECT
Case 3 REJECT  — device-verified (no IC),  1500 BRL > device cap    : REJECT
Case 4 REJECT  — no proof at all                                     : REJECT
```

All 4 cases run in < 5 seconds. HCS logging requires real Hedera credentials; set `HEDERA_ACCOUNT_ID` + `HEDERA_PRIVATE_KEY` + `HEDERA_HCS_TOPIC_ID` to see live HCS TX IDs.

---

## Path C — No World ID Proof (unverified rejection)

Submit a request **without** `worldIdProof`:

```bash
echo '{
  "brCode": "...",
  "payerAccountId": "0.0.12345",
  "mandateId": "mnd-no-proof-001",
  "amount": "1.00"
}' | npm run pay -w packages/agent
```

**Expected:** `TIER_INSUFFICIENT` — "No World ID proof provided — Identity Check required". HCS receives the rejection log.

---

## User Test Path (real World App — for SubmissionOfficer screenshots)

For a **real user** with the World App installed on their phone:

### Prerequisites
- World App installed and signed in
- User has completed **Orb verification** (this is Identity Check level)
- PIXPORT frontend running (or use the agent API directly)

### Steps

1. **Open PIXPORT payment flow** in a browser that has the IDKit widget loaded.
   *(Or: have a frontend page that calls IDKit with `app_id` and `action: "pixport-payment"`)*

2. **World App prompts the user** to confirm the `pixport-payment` action.

3. **User approves in World App** → IDKit returns an `ISuccessResult` with:
   ```json
   {
     "proof": "0x...",
     "merkle_root": "0x...",
     "nullifier_hash": "0x...",
     "verification_level": "orb"
   }
   ```

4. **Frontend sends to agent API** (or the user pastes into the CLI):
   ```bash
   echo '{
     "brCode": "<real BR Code>",
     "payerAccountId": "0.0.12345",
     "mandateId": "mnd-user-001",
     "amount": "1.00",
     "worldIdProof": {
       "proof": "<from World App>",
       "merkle_root": "<from World App>",
       "nullifier_hash": "<from World App>",
       "verification_level": "orb",
       "signal": "0.0.12345"
     }
   }' | npm run pay -w packages/agent
   ```
   Set `WORLD_ENV=production` and `WORLD_APP_ID=app_<production-app-id>`.

5. **Agent verifies via production Cloud API** → maps to HIGH tier → approves if allowance sufficient.

> **Screenshot guidance for SubmissionOfficer:** Capture steps 2–4 showing the World App prompt, approval, and agent decision. The `verification_level: "orb"` in the IDKit response proves Identity Check was used.

---

## Architecture Notes

- **Identity Check SDK**: `@worldcoin/idkit-core/backend` `verifyCloudProof()` (v2 API) is the canonical server-side verification function. PIXPORT uses this instead of a raw HTTP fetch.
- **Signal**: The payer's Hedera account ID (e.g. `0.0.12345`) is the signal. The v2 API hashes it with `hashToField()` — use the same raw string in the simulator.
- **Nullifier hash uniqueness**: The Cloud API rejects re-used nullifiers. For multiple test runs, generate new proofs each time (different `mandateId` + different simulator run).
- **Staging vs production**: `WORLD_ENV=staging` → `staging-developer.worldcoin.org`. Staging proofs from the simulator are cryptographically valid against the staging API.
- **HCS rejection log**: Every REJECT (all reasons) is written to the HCS topic as a `PAYMENT_REJECTED` audit event. Browse at `https://hashscan.io/testnet/topic/<HEDERA_HCS_TOPIC_ID>`.
