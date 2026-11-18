# Phase 1 — tiers, condition, chain

**▶ Invocation:** first phase. `web/lib/sheep-sim.js` and `web/sheep-defaults.json.js` only. Owns Q91–Q93.

**Goal:** The sim pays by tier and condition and the chain is uncapped and quality-fed: SC12–SC15.

## Tasks

- **§0:** `penPoints` → 50; add `penPerfectPoints`, `penPerfectStress`, `condPanicDrain`, `condTrotDrain`, `condRecover`, `condFloor`, `comboWindowMin`, `comboTightenAt`; remove `comboMax` (schema, defaults file, `LEVER_NOT_LEVERED`); Strictness lever gains `penPerfectStress` and `comboWindowMin`.
- **§1:** `s.cond = 1` at spawn; update it each step for sheep not through; `flockValue()`; `run.valueStart`, `run.valueMin`; `onPenned` picks the tier, multiplies by `s.cond` and the kind multiplier, steps the chain by 2 / 1 / 0, and records tier counts; the window in `updateScore` comes from the lerp; `score()` gains `tiers`, `flockValue`, `valueStart`, `comboWindowNow`, `comboT` and keeps every v14 field (including `stars`, until phase 5).

## Verify

Headless node script: scoring.md criteria 1–6 and 18. Then load all three pages in headless Chrome on `file://`: zero console errors, a crossing still pops and the v14 card still totals.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** `calmPenned` now means CALM or PERFECT; the v14 card's calm line reads `tally.calm`, so keep `tallyAdd` keys stable. Condition must never feed back into steering. The lamb's `comboWindow` test (FO5) should use the base window, not the tightened one.
