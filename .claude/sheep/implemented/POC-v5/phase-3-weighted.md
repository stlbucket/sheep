# Phase 3 — Weighted to One Area + the Random Mix (F7, F5)

## ▶ Invocation
**Trigger:** "run phase 3" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 2 ticked.
**Do:** implement Tasks, run Verify, tick P3 in `plan.md`, **STOP, and
report**. **Constraints:** plan.md Global invariants.

## Goal
The `weighted` archetype: **most** of the flock concentrated around a focus
that can land **anywhere** (including across the field from the gate), with
a sparse tail elsewhere; the core is *many small groups close together*, not
one blob. With all three samplers live, `random` now draws equal thirds.
Rules **F7**, **F5**. Q25 defaults.

## Tasks
- **§0 (`Spawn`):** `focusShare 0.75` (float 0.3–1·0.05), `focusRadius 150`
  (float px 60–400·10, "core radius at 80 sheep; scales with √(n/80)"),
  `focusGapScale 0.5` (float 0.2–1·0.05, "clusterMinGap multiplier inside
  the core"). Exposed, `onChange: 'respawn'`.
- **§1 `sampleWeighted`:**
  - Focus: uniform over the play rect inset by `focusRadius/2`, rejecting
    the F8 clearance (+ `focusRadius/2` so the core can't lap the gate).
    Store `this.focus` for debug.
  - Effective radius `R = focusRadius · sqrt(n / 80)`.
  - Split the group-size list: accumulate groups into the **core** until
    their member sum ≥ `focusShare · n`; the rest are **tail**.
  - Core seeds: uniform disc of radius `R` around the focus (`R·sqrt(u)`),
    min gap `clusterMinGap · focusGapScale`, F8 clearance still applies.
  - Tail seeds: whole-field uniform (P2's sampler with **no holes**), normal
    min gap, and additionally ≥ `R + clusterMinGap` from the focus so the
    tail reads as *elsewhere*.
  - `idealPath[0]` = initial GCM.
- **§2:** with `debug.spawnHoles` on, also draw the focus disc.
- **Defaults file:** the three new keys.

## Verify (measured)
- **F7, forced, 6 reseeds:** ≥ **70 %** of sheep within `1.2·R` of the focus
  every draw; focus position varies; ≥ 1 of the 6 draws has the focus
  > half the play-rect width from the gate mouth; the core holds ≥ 4
  distinct spawn groups.
- **Not a blob, no explosion:** biggest-cluster share (A4 metric) at t=0 and
  at t=10 s differ by ≤ 0.1; A1 still-fraction ≈ 1.0 over the 10 s; no
  sheep leaves the field.
- **F5 mix, `random`, 12 reseeds:** all three archetypes appear (record the
  tally; expected ≈ 4/4/4). Repeat with `randomSeedOnLoad` off at seed
  1337 twice → same archetype both times (determinism).
- **F8** and dog **F1** as in P2; anchor digest unchanged.
- Zero console errors (owner `file://`): cycle the dropdown, reseed a few
  times per option.

## Done when
- [x] Three focus tunables live; defaults file updated.
- [x] Weighted sampler measured; random mix measured; anchor intact. (The
      cluster-share drift criterion was replaced by a physical core-stability
      measure — see plan.md P3 note.)

## Gotchas
- The in-core min gap `120 × 0.5 = 60 px` with `clusterSpread 24` means
  groups nearly touch — intended (crowded but grouped). If A4's "one blob"
  metric trips at t=0, raise `focusGapScale` rather than shrinking
  `clusterSpread` (which changes the beside-gate anchor).
- Tail groups must be fed from the *same* size list, not re-drawn — group
  **count** still derives from `sheepCount` (H1).
- The crowd-dispersal drive (B2) will slowly spread the core over minutes;
  that is the v3-measured behavior, not a defect. Only the first 10 s are
  gated.
