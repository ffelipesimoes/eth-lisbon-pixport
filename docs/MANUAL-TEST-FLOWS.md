# PIXPORT — Manual Test Flows (runbook)

> **Audience:** Felipe (board), judges, any external tester.  
> **Goal:** Exercitar cada cenário do MVP com comandos exatos, resultado esperado e links de verificação (HashScan / Mirror Node / console).  
> **Network:** Hedera **Testnet** only. Never paste production Pix keys or operator private keys into chat/commits.

---

## Live on-chain anchors (always open first)

| Artifact | ID | HashScan |
|----------|----|----------|
| HTS token EURC-demo | `0.0.9742957` | https://hashscan.io/testnet/token/0.0.9742957 |
| HCS audit topic | `0.0.9742958` | https://hashscan.io/testnet/topic/0.0.9742958 |
| Treasury (token holder) | `0.0.9742864` | https://hashscan.io/testnet/account/0.0.9742864 |
| Spender (HIP-336 demo) | `0.0.9743531` | https://hashscan.io/testnet/account/0.0.9743531 |
| **RECUSA** (headline) | `0.0.9743531-1784978501.389600418` | https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418 |
| Transfer SUCCESS | `0.0.9743531-1784978497.572441319` | https://hashscan.io/testnet/transaction/0.0.9743531-1784978497.572441319 |
| HIP-336 approve 500 EURC | `0.0.9742864-1784978497.752430412` | https://hashscan.io/testnet/transaction/0.0.9742864-1784978497.752430412 |
| Scheduled TX | `0.0.9743558` | https://hashscan.io/testnet/schedule/0.0.9743558 |

Mirror Node base: `https://testnet.mirrornode.hedera.com/api/v1`

> HashScan is a SPA — `curl` may 404; open links in a browser. Prefer Mirror Node REST for machine checks.

---

## Demo BR Codes (CRC-valid, payee = `teste@pixport.demo`)

Use these exact strings (do not retype by hand — CRC will break):

| Label | Amount field | BR Code |
|-------|--------------|---------|
| Open value | none | `00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo5204000053039865802BR5912PIXPORT Demo6006Lisboa62070503***63047A55` |
| R$ 1,00 | `1.00` | `00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo52040000530398654041.005802BR5912PIXPORT Demo6006Lisboa62070503***630462EF` |
| R$ 25,00 | `25.00` | `00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo520400005303986540525.005802BR5912PIXPORT Demo6006Lisboa62070503***63045F40` |
| R$ 999,00 (over-allowance probe) | `999.00` | `00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo5204000053039865406999.005802BR5912PIXPORT Demo6006Lisboa62070503***63040B3E` |

---

## Flow 1 — Setup / run the demo

### Prerequisites

- Node.js ≥ 20
- Git clone of this repo
- Hedera testnet account from https://portal.hedera.com/ (for live txs)
- Optional: World ID staging app from https://developer.worldcoin.org (Flow 5)
- Optional: Pix sandbox credentials (Flow 3 — real payout; see pending note)

### 1.1 Install

```bash
git clone https://github.com/ffelipesimoes/eth-lisbon-pixport.git
cd eth-lisbon-pixport
npm install
cp .env.example .env
```

### 1.2 Fill `.env` (sandbox — never commit)

Minimum for gateway + on-chain audit:

```bash
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.XXXXXXXX   # your portal account OR reuse team treasury if shared
HEDERA_OPERATOR_KEY=302e0201...  # DER ED25519 from portal

# Block 1 entities already live on testnet (safe to copy):
HTS_TOKEN_ID=0.0.9742957
HCS_TOPIC_ID=0.0.9742958
HEDERA_TREASURY_ID=0.0.9742864

# After Flow 1.4 / allowance demo, set spender as payer for POST /pay:
# HEDERA_SPENDER_ID=0.0.9743531   # example from public demo; regenerate if you re-run allowance
# HEDERA_SPENDER_KEY=...

GATEWAY_PORT=3001
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3001

# Pix — leave placeholders for stub mode (Flow 3 pending real adapter)
PIX_API_BASE_URL=https://api.sandbox.banco.com.br/pix/v2
PIX_CLIENT_ID=your-client-id-here
PIX_CLIENT_SECRET=your-client-secret-here
PIX_SANDBOX=true
```

### 1.3 Health check — gateway only

```bash
# Terminal A
npm run dev -w packages/gateway
# expect: PIXPORT gateway listening on port 3001

# Terminal B
curl -sS http://localhost:3001/health
```

**Expected:**

```json
{"status":"ok","service":"pixport-gateway"}
```

### 1.4 On-chain Block 1 demo (`npm run demo`)

Replays HTS + HCS setup, HIP-336 approve → in-allowance transfer → **RECUSA**, then Scheduled TX.

```bash
# From repo root (uses packages/hedera scripts)
npm run demo -w packages/hedera
```

Equivalent step-by-step:

```bash
npm run setup -w packages/hedera       # HTS token + HCS topic (skip if using existing IDs above)
npm run allowance -w packages/hedera   # approve → transfer → RECUSA + HCS logs
npm run scheduled -w packages/hedera   # agentic deferred pay schedule
```

**Expected console markers:**

- `✅ Allowance approved` + HashScan TX URL  
- `✅ Transfer status: SUCCESS`  
- `❌ RECUSA confirmed: AMOUNT_EXCEEDS_ALLOWANCE` (or `SPENDER_DOES_NOT_HAVE_ALLOWANCE`)  
- Final block `HIP-336 Demo Complete — HashScan URLs`  
- Hint lines: `HEDERA_SPENDER_ID=...` / `HEDERA_SPENDER_KEY=...` → paste into `.env`

**Verify without re-running (public fixtures already on chain):**

```bash
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.9743531-1784978501-389600418" \
  | jq '.transactions[0] | {name, result}'
# → { "name": "CRYPTOTRANSFER", "result": "AMOUNT_EXCEEDS_ALLOWANCE" }
```

Open in browser: https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418

### 1.5 Optional console UI

```bash
npm run dev -w packages/console
# open http://localhost:3000  (default Next.js)
# NEXT_PUBLIC_GATEWAY_URL must point to http://localhost:3001
```

### Local URLs

| Service | URL |
|---------|-----|
| Gateway API | http://localhost:3001 |
| Health | http://localhost:3001/health |
| Audit proxy | http://localhost:3001/audit?limit=10 |
| Console (if started) | http://localhost:3000 |

---

## Flow 2 — Create mandate (`POST /mandates`)

Creates an in-memory mandate, adds payee to allowlist, logs `mandate_created` to HCS topic `0.0.9742958`.

### Prerequisites

- Flow 1.3 gateway running with `HCS_TOPIC_ID` + operator credentials set  
- Payee Pix key you will reuse in BR Codes (`teste@pixport.demo` below)  
- `payerAccountId` = spender that holds (or will hold) HIP-336 allowance (e.g. `0.0.9743531` from public demo, or your `HEDERA_SPENDER_ID`)

### Steps

```bash
export GATEWAY=http://localhost:3001
export PAYER=0.0.9743531   # or $HEDERA_SPENDER_ID

curl -sS -X POST "$GATEWAY/mandates" \
  -H 'Content-Type: application/json' \
  -d "{
    \"payeePixKey\": \"teste@pixport.demo\",
    \"payerAccountId\": \"$PAYER\",
    \"maxAmount\": \"100.00\",
    \"memo\": \"manual-test-flow-2\"
  }" | tee /tmp/pixport-mandate.json | jq .
```

Save the id:

```bash
export MANDATE_ID=$(jq -r .mandateId /tmp/pixport-mandate.json)
echo "MANDATE_ID=$MANDATE_ID"
curl -sS "$GATEWAY/mandates/$MANDATE_ID" | jq .
```

### Expected result

HTTP **201** body shape:

```json
{
  "mandateId": "<uuid>",
  "status": "approved",
  "payeePixKey": "teste@pixport.demo",
  "payerAccountId": "0.0.9743531",
  "maxAmount": "100.00",
  "hcsTopicId": "0.0.9742958",
  "hcsSequenceNumber": <number>,
  "createdAt": "2026-…"
}
```

### Verify on HashScan / Mirror

1. Note `hcsSequenceNumber` from the response.  
2. Browser: https://hashscan.io/testnet/topic/0.0.9742958 — latest message should decode to JSON with `"event":"mandate_created"` (or gateway-normalized `decision` fields).  
3. Mirror:

```bash
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.9742958/messages?limit=5&order=desc" \
  | jq '.messages[] | {seq: .sequence_number, body: (.message | @base64d)}'
```

4. Gateway proxy:

```bash
curl -sS "$GATEWAY/audit?limit=5" | jq .
```

**Pass criteria:** `status=approved`, allowlist contains payee (Flow 3/4 will fail with `payee_not_on_allowlist` if this step was skipped), HCS sequence present when credentials work.

---

## Flow 3 — Approved payment (within allowance) + Pix payout

> **Status: PARTIAL — Pix adapter concrete still landing ([PIX-18](/PIX/issues/PIX-18)).**  
> You can fully test BR Code decode → mandate → allowlist → HIP-336 allowance gate → HCS audit **today**.  
> Real `endToEndId` from PSP requires Felipe Pix sandbox/prod credentials + adapter. Until then gateway returns `SYNTHETIC-<uuid>` with console warning `pix_stub_mode`.

### Prerequisites

- Flow 2 completed in the **same gateway process** (mandates are in-memory)  
- `HTS_TOKEN_ID`, `HEDERA_TREASURY_ID`, and a spender with **remaining** on-chain allowance  
- Amount **≤ remaining allowance** and **≤ mandate.maxAmount** (mandate max is soft product bound; ledger is source of truth)

Check remaining allowance via Mirror (token decimals = 2 for EURC-demo):

```bash
export TREASURY=0.0.9742864
export SPENDER=0.0.9743531
export TOKEN=0.0.9742957

curl -sS "https://testnet.mirrornode.hedera.com/api/v1/accounts/${TREASURY}/allowances/tokens?spender.id=${SPENDER}" \
  | jq --arg t "$TOKEN" '.allowances[]? | select(.token_id==$t) | {token_id, amount, spender: .spender}'
```

### Steps

```bash
export BR_CODE='00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo52040000530398654041.005802BR5912PIXPORT Demo6006Lisboa62070503***630462EF'

curl -sS -X POST "$GATEWAY/pay" \
  -H 'Content-Type: application/json' \
  -d "{
    \"brCode\": \"$BR_CODE\",
    \"payerAccountId\": \"$SPENDER\",
    \"amount\": \"1.00\",
    \"mandateId\": \"$MANDATE_ID\"
  }" | tee /tmp/pixport-pay-ok.json | jq .
```

### Expected result (stub Pix mode — current)

HTTP **200**:

```json
{
  "decision": "approved",
  "reason": "Payment authorized and executed",
  "endToEndId": "SYNTHETIC-…",
  "payeePixKey": "teste@pixport.demo",
  "hcsSequenceNumber": <number>,
  "hashscanUrl": "https://hashscan.io/testnet/topic/0.0.9742958",
  "decidedAt": "…"
}
```

Gateway log may show: `Pix payout unavailable (credential stub), using synthetic E2E ID`.

### Expected result (when PIX-18 + credentials land)

- `endToEndId` matches PSP format (Efí/Inter)  
- `payoutNote` / audit payload shows `pix_executed`  
- Optional: bank app / sandbox console shows R$ debit (self-pay R$0,01 demo)

### Verify

```bash
# HCS latest should include payment_approved / APPROVED
curl -sS "$GATEWAY/audit?limit=3" | jq .

curl -sS "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.9742958/messages?limit=3&order=desc" \
  | jq '.messages[0] | {seq: .sequence_number, body: (.message | @base64d)}'
```

Browser: open `hashscanUrl` from the response.

**Pass criteria (today):** `decision=approved`, payee key correct, HCS sequence increments.  
**Pass criteria (submission-ready Pix):** same + non-synthetic `endToEndId` + bank evidence.

---

## Flow 4 — RECUSA (exceeds allowance)

Two complementary proofs:

| Path | What it proves | When to use |
|------|----------------|-------------|
| **4A Ledger RECUSA** | Hedera itself returns `AMOUNT_EXCEEDS_ALLOWANCE` | Judges / HashScan pitch (already live) |
| **4B Gateway RECUSA** | Product refuses before Pix; still logs HCS | API / agent demo |

### 4A — Open the live ledger RECUSA (no local setup)

1. Open: https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418  
2. Confirm status / result shows **AMOUNT_EXCEEDS_ALLOWANCE**.  
3. Mirror:

```bash
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.9743531-1784978501-389600418" \
  | jq '.transactions[0] | {name, result, transaction_id}'
```

**Expected:**

```json
{
  "name": "CRYPTOTRANSFER",
  "result": "AMOUNT_EXCEEDS_ALLOWANCE",
  "transaction_id": "0.0.9743531-1784978501-389600418"
}
```

4. Optional replay: `npm run allowance -w packages/hedera` and copy the new RECUSA HashScan URL from console.

### 4B — Gateway rejects over-allowance payment

Prerequisites: Flow 2 mandate for `teste@pixport.demo`; amount larger than remaining on-chain allowance (use `999.00` BR Code if spender remaining is small).

```bash
export BR_OVER='00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo5204000053039865406999.005802BR5912PIXPORT Demo6006Lisboa62070503***63040B3E'

curl -sS -X POST "$GATEWAY/pay" \
  -H 'Content-Type: application/json' \
  -d "{
    \"brCode\": \"$BR_OVER\",
    \"payerAccountId\": \"$SPENDER\",
    \"amount\": \"999.00\",
    \"mandateId\": \"$MANDATE_ID\"
  }" | tee /tmp/pixport-pay-recusa.json | jq .
```

### Expected result

HTTP **422**:

```json
{
  "decision": "rejected",
  "reason": "Requested 999.00 BRL exceeds remaining allowance …",
  "payeePixKey": "teste@pixport.demo",
  "hcsSequenceNumber": <number>,
  "hashscanUrl": "https://hashscan.io/testnet/topic/0.0.9742958",
  "decidedAt": "…"
}
```

**No Pix call** should occur (no real transfer attempt in stub mode either for the payout path — rejection happens at allowance check).

### Verify HCS refusal log

```bash
curl -sS "$GATEWAY/audit?limit=5" | jq '.[] | {sequenceNumber, message}'
# message JSON should include payment_rejected / allowance_exceeded / REFUSED
```

Browser topic: https://hashscan.io/testnet/topic/0.0.9742958

**Pass criteria:** `decision=rejected`, reason mentions allowance, HCS sequence present, HashScan topic shows new message. For the pitch, also show 4A live RECUSA tx.

---

## Flow 5 — World Identity Check (verified vs unverified)

Dev path **without a phone** — World ID Simulator + staging Cloud API. Full notes also in [packages/agent/DEV_TEST.md](../packages/agent/DEV_TEST.md).

### Tier map (agent)

| Verification | Tier label | maxSpend (token minor units, default) |
|--------------|------------|----------------------------------------|
| `orb` | Orb-verified human | 1_000_000 |
| `device` | Device-verified | 100_000 |
| missing / failed | Unverified | **0 → reject** |

### 5.1 Staging app (once)

1. https://developer.worldcoin.org → create app → **Staging**  
2. Action name: `pixport-payment`  
3. Copy `app_id` (`app_staging_…`) into root or `packages/agent` env:

```bash
WORLD_APP_ID=app_staging_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
WORLD_ACTION=pixport-payment
WORLD_ENV=staging
```

### 5.2 Verified path (high tier — should pay / approve)

1. Open https://simulator.worldcoin.org  
2. Enter `app_id`, action `pixport-payment`  
3. Signal = payer Hedera id (e.g. `0.0.9743531`)  
4. Level = **orb** → Generate Proof → copy JSON fields  

```bash
cd packages/agent
# pipe payment request with worldIdProof (see DEV_TEST.md for full template)
echo '{
  "brCode": "00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo52040000530398654041.005802BR5912PIXPORT Demo6006Lisboa62070503***630462EF",
  "payerAccountId": "0.0.9743531",
  "mandateId": "'"$MANDATE_ID"'",
  "worldIdProof": {
    "proof": "<from simulator>",
    "merkle_root": "<from simulator>",
    "nullifier_hash": "<from simulator>",
    "verification_level": "orb",
    "signal": "0.0.9743531"
  }
}' | npm run pay
```

**Expected console:**

```
[Agent] Identity: verified (orb) → tier "Orb-verified human" (maxSpend: 1000000)
…
Decision:    APPROVE
```

### 5.3 Unverified path (must refuse)

```bash
echo '{
  "brCode": "00020126400014BR.GOV.BCB.PIX0118teste@pixport.demo52040000530398654041.005802BR5912PIXPORT Demo6006Lisboa62070503***630462EF",
  "payerAccountId": "0.0.9743531",
  "mandateId": "'"$MANDATE_ID"'"
}' | npm run pay
```

**Expected:** immediate reject — tier `Unverified` / `TIER_INSUFFICIENT` (or equivalent reason: no proof / maxSpend 0). **No** approved Pix path.

### Verify

- Screenshot or copy agent console for both 5.2 and 5.3  
- If agent logs to HCS, confirm new messages on https://hashscan.io/testnet/topic/0.0.9742958  
- Optional unit path: `WORLD_MOCK=true` / staging mock (see DEV_TEST.md Path B) for CI only — **not** sufficient alone for the Identity Check prize docs

**Pass criteria:** orb path reaches APPROVE tier; missing-proof path rejects without payment.

---

## Flow 6 — Auditable HCS trail (topic `0.0.9742958`)

### 6A — Browser (judge-friendly)

1. Open https://hashscan.io/testnet/topic/0.0.9742958  
2. Confirm messages list is non-empty (public baseline ≥ 13; live count grows with each test).  
3. Click a recent message → decode payload (JSON events such as `mandate_created`, `allowance_approved`, `transfer_approved`, `transfer_refused`, `payment_approved`, `payment_rejected`).

### 6B — Mirror Node CLI

```bash
# Message count
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.9742958/messages?limit=100" \
  | jq '.messages | length'

# Latest 5 decoded bodies
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.9742958/messages?limit=5&order=desc" \
  | jq -r '.messages[] | "seq=\(.sequence_number) ts=\(.consensus_timestamp)\n\(.message | @base64d)\n---"'
```

### 6C — Gateway audit proxy

```bash
curl -sS "http://localhost:3001/audit?limit=10" | jq .
```

Each entry includes `sequenceNumber`, `consensusTimestamp`, `message`, `hashScanUrl`.

### 6D — Tie a payment decision to HCS

After Flow 3 or 4, take `hcsSequenceNumber` from the JSON response and filter:

```bash
SEQ=$(jq -r .hcsSequenceNumber /tmp/pixport-pay-ok.json)   # or recusa file
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.9742958/messages?sequencenumber=${SEQ}" \
  | jq '.messages[0] | {seq: .sequence_number, body: (.message | @base64d)}'
```

**Pass criteria:** you can point a judge at topic `0.0.9742958` and show both an **approved** and a **refused** decision as immutable messages, plus the ledger RECUSA tx from Flow 4A.

---

## Suggested 10-minute path for Felipe (happy path + RECUSA)

| Min | Action |
|----:|--------|
| 0–1 | Open RECUSA HashScan (Flow 4A) — pitch proof already live |
| 1–3 | `npm install` + `.env` + `npm run dev -w packages/gateway` (Flow 1) |
| 3–4 | `POST /mandates` (Flow 2) → note `mandateId` + HCS seq |
| 4–6 | `POST /pay` R$1,00 (Flow 3) → `decision=approved` + audit |
| 6–8 | `POST /pay` R$999,00 (Flow 4B) → `decision=rejected` + audit |
| 8–10 | Topic browser + Mirror decode (Flow 6); optional World 5.2/5.3 if staging app ready |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `HCS_TOPIC_ID not configured` | missing env | set `HCS_TOPIC_ID=0.0.9742958` |
| Mandate 201 but no `hcsSequenceNumber` | operator key invalid / network | check `HEDERA_OPERATOR_*`; mandate still saved |
| `Mandate … not found` on `/pay` | gateway restarted (in-memory store) | re-run Flow 2 |
| `Payee … is not on the allowlist` | different pix key than mandate | use `teste@pixport.demo` in both |
| `No allowance found for spender` | wrong `payerAccountId` / no HIP-336 approve | run allowance demo; use printed spender id |
| `CRC16 validation failed` | BR Code truncated | paste full string from table above |
| `SYNTHETIC-…` endToEndId | Pix stub / PIX-18 pending | expected until adapter + credentials |
| HashScan curl 404 | SPA routing | use browser or Mirror Node REST |

---

## Security checklist (before any screenshot/commit)

- [ ] No `HEDERA_OPERATOR_KEY` / spender key in screenshots  
- [ ] No Pix client secret, mTLS cert, or production Pix key in docs  
- [ ] `.env` stays untracked (see `.gitignore`)  
- [ ] Prefer public testnet IDs and HashScan URLs in shared notes  

---

## Artifact status

| Flow | Runnable now? | Notes |
|------|---------------|-------|
| 1 Setup / demo | ✅ | `npm run demo -w packages/hedera` + gateway health |
| 2 Create mandate | ✅ | HCS log when operator configured |
| 3 Approved pay + Pix | ⚠️ | Decision + HCS ✅; real Pix ⏳ PIX-18 |
| 4 RECUSA | ✅ | Live ledger tx + gateway reject path |
| 5 World Identity | ✅ | Dev simulator path documented |
| 6 HCS trail | ✅ | Topic `0.0.9742958` live |

After PIX-18 lands: update Flow 3 expected `endToEndId`, add sandbox credential steps (still never commit secrets), and re-link any new HashScan txs in [TESTNET-METRICS.md](./TESTNET-METRICS.md).
