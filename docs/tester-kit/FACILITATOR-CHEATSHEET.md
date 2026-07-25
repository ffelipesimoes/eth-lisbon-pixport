# Facilitator cheatsheet

## One-command demo

```bash
npm run demo
# Console http://localhost:3000
# Gateway http://localhost:3001/health  (or HCS poll from UI)
```

`.env` needs at minimum:

```bash
HEDERA_OPERATOR_ID=0.0.x
HEDERA_OPERATOR_KEY=302e...   # ED25519 DER from portal.hedera.com
HTS_TOKEN_ID=0.0.9742957
HCS_TOPIC_ID=0.0.9742958
HEDERA_TREASURY_ID=0.0.9742864
GATEWAY_URL=http://localhost:3001
```

Never show `.env` on a shared screen.

## Smoke expectations

| Flow | Input | UI |
|------|-------|-----|
| APPROVE | mandate max 500 · pay 10 · Sample BR Code | green APPROVED + HCS |
| RECUSA | pay 9999 or max 1 | red REJECTED + allowance reason + HCS |

## Live HashScan (must work offline of laptop demo)

| Label | URL |
|-------|-----|
| **RECUSA** | https://hashscan.io/testnet/transaction/0.0.9743531-1784978501.389600418 |
| Transfer OK | https://hashscan.io/testnet/transaction/0.0.9743531-1784978497.572441319 |
| Approve | https://hashscan.io/testnet/transaction/0.0.9742864-1784978497.752430412 |
| Token | https://hashscan.io/testnet/token/0.0.9742957 |
| HCS topic | https://hashscan.io/testnet/topic/0.0.9742958 |
| Schedule | https://hashscan.io/testnet/schedule/0.0.9743558 |

If Wi-Fi dies: HashScan-only path (steps 1–2 + form) still counts as a real tester.

## Recovery

| Symptom | Fix |
|---------|-----|
| Amber "gateway offline" | Restart `npm run demo`; check :3001 |
| Mandate create fails | Operator key/id wrong; portal account funded on testnet |
| Pay always reject | Expected for 9999; for 10 BRL check spender/treasury config |
| HCS empty | Topic id wrong; mirror lag — wait 5s refresh |
| Browser console errors | Hard refresh; do not debug in front of tester >90s — switch to HashScan path |

## After each tester

1. Photo of form or type into VALIDATION.md immediately  
2. Tick scoreboard row  
3. File friction as issue owner in Themes table  
4. Do **not** invent quotes  

## Recruiting targets (non-team)

- Other hackathon tables (Hedera / payments / agents / World)  
- Mentors walking the floor  
- Sponsor engineers at Hedera / World booths  
- Avoid: Felipe, Paperclip agents, anyone who committed to this repo as team  

## Escalation

If **0** independent forms by Saturday night → CEO + Felipe venue blitz (VALIDATION recruiting log).  
If demo broken → [@GatewayEngineer](agent://gatewayengineer) + PIX-15 follow-up.  
