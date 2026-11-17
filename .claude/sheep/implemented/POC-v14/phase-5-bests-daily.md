# Phase 5 — bests and daily seed

**▶ Invocation:** after phase 4. `web/lib/sheep-score-ui.js` plus one button row per page.

**Goal:** Saved best per exact course (RM1–RM3) and the daily seed (RM4).

## Tasks

- **§0:** `mode` enum (`course`, `daily`, `waves`) in a new `Modes` category.
- **lib:** `localStorage` entry `sheep.best.v1` behind try/catch; course key; defaults-only rule with `tuned — not saved`; best in the HUD and on the card; `daily` button sets the local-date seed and draws layout, flock size and obstacles from it.

## Verify

Headless Chrome: a higher second total shows New best and survives a reload; a lower one changes nothing; storage stubbed to throw still plays with zero errors; daily twice gives the same course; a daily best is separate from the typed seed.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** `file://` storage is per browser; nothing more is promised.
