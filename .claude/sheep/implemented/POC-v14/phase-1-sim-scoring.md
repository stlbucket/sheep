# Phase 1 — sim scoring

**▶ Invocation:** first phase. `web/lib/sheep-sim.js` and `web/sheep-defaults.json.js` only.

**Goal:** The sim scores by events: SC1–SC6 and the sim half of SC9–SC11.

## Tasks

- **§0:** remove `w_time`, `w_line`, `w_cohesion`, `w_calm`, `injuryWeight` (schema and defaults file); add the `Scoring` keys from the spec plus `lineOnDist`, `photoFinishSecs`, `starCalmShare`; re-point the Strictness lever at `penCalmStress`, `comboWindow`, `parBase`, `parPerSheep`; claim the rest in `LEVER_NOT_LEVERED.scoring`.
- **§1:** `resetRun` gains points, tally, combo and command state; `onPenned(s)` at the gate crossing; `award(kind, points, x, y, label)` and the `scoreEvents` queue; win handling (full flock, clean run, time bonus, awards); injury resets the combo; `setCommand` counts commands; new `score()` shape that still carries `penned`, `won`, `finished`, `raw`.

## Verify

Headless node script: total starts at 0 and is monotonic over a run; stressed pen = 100, calm pen = 200; three calm crossings inside the window = 200, 400, 600 and a late fourth = 200; multiplier capped; time bonus 400 at 20 s under par; each award on and off; old keys gone; lever assertion OK.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** `resetRun` is called from `spawn()`, before the dog exists on first construction. `reseed` issues `that_ll_do`, which must not count as a player command.
