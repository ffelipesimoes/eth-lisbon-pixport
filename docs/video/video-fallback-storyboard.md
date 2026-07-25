# Video fallback storyboard

**File:** [pixport-fallback.mp4](./pixport-fallback.mp4)  
**Duration:** 4:33 (≤5:00)  
**Generated:** 2026-07-25 · SubmissionOfficer · PIX-16  
**Purpose:** shippable pitch if live UI / venue mic fails; still opens on RECUSA and closes on Pix R$0,01.

| t | Slide | Frame | Content |
|---|-------|-------|---------|
| 0:00–0:08 | Title | `frames/00.png` | PIXPORT · No Solidity |
| 0:08–0:53 | **RECUSA open** | `frames/01.png` | `AMOUNT_EXCEEDS_ALLOWANCE` + live tx id |
| 0:53–1:18 | Problem | `frames/02.png` | Pix today vs PIXPORT |
| 1:18–1:48 | Architecture | `frames/03.png` | World ID → Gateway → HIP-336 → HCS |
| 1:48–2:18 | World Identity Check | `frames/04.png` | orb / device / none tiers |
| 2:18–3:08 | Console APPROVE | `frames/05.png` | `npm run demo` happy path |
| 3:08–3:43 | Console RECUSA | `frames/06.png` | product deny + HCS |
| 3:43–4:18 | **Pix close** | `frames/07.png` | R$0,01 self-pay |
| 4:18–4:33 | End card | `frames/08.png` | repo + HashScan CTA |

Narration: read [VIDEO-SCRIPT.md](./VIDEO-SCRIPT.md) teleprompter block over this MP4 (or use as silent visual with burned titles).

## Regenerate

```bash
# frames already in docs/video/frames/
# requires node_modules/ffmpeg-static after npm install
FFMPEG=node_modules/ffmpeg-static/ffmpeg
# see scripts in git history / re-run SubmissionOfficer generator
```

## Upgrade path

Replace fallback with live screen recording following VIDEO-SCRIPT shot list; keep this file as edit map.
