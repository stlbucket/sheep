# Phase 4 — objectives (sim)

**▶ Invocation:** after phase 3. `web/lib/sheep-sim.js` and `web/sheep-defaults.json.js` only. Owns Q99–Q102.

**Goal:** Drive gates feed the multiplier, three new special kinds exist, and each course rolls side objectives: FO7–FO11.

## Tasks

- **§0:** `driveGatePoints` → 50; add `driveGateMult`, the `black*`, `bell*`, `yearling*` keys, `sideObjectiveCount`, `multSideObjective`; remove `driveGateBonus`.
- **§1:** `run.gateMult` raised when a gate completes, added to the crossing multiplier; `assignSpecials` rolls the three new kinds after the v14 rolls; black-sheep threat scale and spook, bellwether neighbor weight and first-through worth, yearling flight scale and conditional worth; `rollSideObjectives()` on its own PRNG stream, state tracking, `objective` events, and the side-objective entries in `endMultipliers()`; none in wave mode.

## Verify

Headless node script: field-objectives.md criteria 1–8.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** Roll order matters for seed stability: draw the new kinds strictly after the three v14 draws, and never draw from `this.rng`. A special's kind multiplier also belongs in `flockValue()` only where the kind pays unconditionally (golden, ram, black).
