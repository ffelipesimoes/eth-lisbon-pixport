# Testnet metrics log (Success 20%)

Living counter of Hedera **testnet** usage for PIXPORT judging (Success criterion).  
Re-verify with mirror node before each submission gate (Saturday night + Sunday morning).

**Network:** Hedera Testnet  
**Primary accounts:** treasury/operator `0.0.9742864`, spender `0.0.9743531`  
**HTS token:** [`0.0.9742957`](https://hashscan.io/testnet/token/0.0.9742957)  
**HCS topic:** [`0.0.9742958`](https://hashscan.io/testnet/topic/0.0.9742958)  
**Schedule:** [`0.0.9743558`](https://hashscan.io/testnet/schedule/0.0.9743558)

---

## Snapshot — 2026-07-25 14:10 UTC (SubmissionOfficer / PIX-16)

Source: `https://testnet.mirrornode.hedera.com/api/v1`  
Method: list txs for both accounts (`limit=100`), dedupe by `transaction_id`; topic messages for HCS count.

| Type | Result | Count |
|------|--------|------:|
| TOKENCREATION | SUCCESS | 1 |
| CONSENSUSCREATETOPIC | SUCCESS | 1 |
| CRYPTOAPPROVEALLOWANCE | SUCCESS | 7 |
| CRYPTOTRANSFER | SUCCESS | 6 |
| CRYPTOTRANSFER | AMOUNT_EXCEEDS_ALLOWANCE | 1 |
| CRYPTOTRANSFER | SPENDER_DOES_NOT_HAVE_ALLOWANCE | 3 |
| CONSENSUSSUBMITMESSAGE | SUCCESS | 23 |
| SCHEDULESIGN | SCHEDULE_ALREADY_EXECUTED | 1 |
| TOKENASSOCIATE | SUCCESS | 1 |
| CRYPTOCREATEACCOUNT | SUCCESS | 11 |
| **Unique transactions** | | **55** |
| **HCS messages (topic 0.0.9742958)** | | **23** |

### Headline demo txs (must stay live)

| Label | transaction_id | Mirror result | HashScan |
|-------|----------------|---------------|----------|
| Approve HIP-336 | `0.0.9742864-1784978497-752430412` | CRYPTOAPPROVEALLOWANCE SUCCESS | [link](https://hashscan.io/testnet/transaction/0.0.9742864-1784978497.752430412) |
| Transfer OK | `0.0.9743531-1784978497-572441319` | CRYPTOTRANSFER SUCCESS | [link](https://hashscan.io/testnet/transaction/0.0.9743531-1784978497.572441319) |
| **RECUSA** | `0.0.9743531-1784978501-389600418` | AMOUNT_EXCEEDS_ALLOWANCE | [link](https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418) |
| HCS log | `0.0.9742864-1784978503-777535015` | CONSENSUSSUBMITMESSAGE SUCCESS | [link](https://hashscan.io/testnet/transaction/0.0.9742864-1784978503.777535015) |
| Schedule create | `0.0.9742864-1784978677-267041555` | SCHEDULECREATE SUCCESS | [link](https://hashscan.io/testnet/transaction/0.0.9742864-1784978677.267041555) |

Mirror note: REST uses `-` between seconds and nanos (`…-1784978497-752430412`); HashScan UI uses `.` (`…-1784978497.752430412`). Both refer to the same tx.

### Verification commands

```bash
# Entities
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.9742957" | jq .token_id
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.9742958" | jq .topic_id
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/schedules/0.0.9743558" | jq .schedule_id

# RECUSA
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.9743531-1784978501-389600418" \
  | jq '.transactions[0] | {name, result}'

# HCS count
curl -sS "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.9742958/messages?limit=100" \
  | jq '.messages | length'
```

---

## Prior snapshot — 2026-07-25 morning (PIX-8)

| Metric | Value |
|--------|------:|
| Unique txs | 39 |
| HCS messages | 13 |

---

## Update log

| Date | Who | Delta | New unique tx total | New HCS msgs |
|------|-----|-------|--------------------:|-------------:|
| 2026-07-25 | SubmissionOfficer | Block 1 baseline documented for README | 39 | 13 |
| 2026-07-25 14:10 UTC | SubmissionOfficer (PIX-16) | Post Block 2–4 E2E + demo traffic; mirror recount both accounts | **55** | **23** |
| _next tester session_ | SubmissionOfficer | _append after venue tests_ | | |

When tester sessions or E2E land more txs, append a row and bump the README metrics table in the same commit.
