# Phase 2 — strikes and multipliers

**▶ Invocation:** after phase 1. `web/lib/sheep-sim.js`, `web/lib/assault-sim.js`, `web/sheep-defaults.json.js`. Owns Q94, Q95, Q98, Q110.

**Goal:** A run can bust, end bonuses multiply, time is a tie-breaker, there are eleven awards, and an unfinished run gets partial credit: SC16–SC20.

## Tasks

- **§0:** add `strikeMax`, `strikePanics`, `panicRearm`, `fenceSlamSpeed`, `multFullFlock`, `multClean`, `multAllCalm`, `multAwardCommon`, `multAwardRare`, `multAwardLegendary`, `fullPurseShare`; `parPointsPerSec` → 10; remove `fullFlockBonus`, `cleanRunBonus`, `awardPoints`.
- **§1:** panic onset detection (edge on `s.panic`, re-armed after `panicRearm`); fence-slam detection in the fence-clamp path (speed into the fence above `fenceSlamSpeed`, same re-arm); `strike(reason, x, y)`; the injury path calls it; third strike sets `run.bust` and finishes the run; `run.playPoints`; `endMultipliers()` builds the list for won, ended-early and bust runs (SC18, SC20); the win path and `finishRun` pay `playPoints × (endMult − 1)` then the time bonus; the award table with rarity and the new tests (`run.lieDowns`, `run.fullFlanks`, `run.trotEver`, `run.valueMin`); wave mode pays the multipliers on each wave's play points and carries strikes.
- **§A:** a mortar kill calls `sim.strike('mortar', x, y)` (owner Q96).

## Verify

Headless node script: scoring.md criteria 7–12 and 17, plus criterion 1 across a bust.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** The win path runs twice in the code today (course and wave branches) — change both. `reseed` issues `that_ll_do`, which must not count as a command or a lie-down. Crush injuries stay off (Q96), so test the downed-sheep strike through `injureAtGate()`. The slam test must read velocity before the clamp zeroes it, and must not change any sheep's motion (scoring.md criterion 18).
