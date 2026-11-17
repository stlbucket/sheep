# Phase 3 — objectives (sim)

**▶ Invocation:** after phase 2. `web/lib/sheep-sim.js` only.

**Goal:** Drive gates (FO1–FO3) and special sheep (FO4–FO6) exist and score in the sim.

## Tasks

- **§0:** the `Objectives` keys; claim them in `LEVER_NOT_LEVERED.objectives`.
- **§1:** `placeDriveGates` after `spawn`, on its own PRNG stream, panels appended to the solid set as `hurdle` discs that give no cover; crossing test and per-gate bonus in `updateScore`; `assignSpecials` on its own stream (`s.kind`, `s.mother`); kind multiplier in `onPenned`; lamb follow force; ram flee/speed scale and stand state.

## Verify

Headless node: with `driveGateMax` 0 and `specials` off a fixed seed replays the phase-2 build position for position; 200 seeds place no gate on a fence, obstacle, pen approach or sheep; a sheep through a gap scores once; whole-flock bonus pays once; golden stressed = 500, calm at ×2 = 2000; lamb stays near its mother; lamb behind mother = 300; ram stands inside `ramStandDist` and releases past `ramStandRelease`.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** Gates are placed AFTER the flock so the flock's own draws never see them. `coverBetween` must skip hurdles.
