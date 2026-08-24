# Phase 2 — Whole Pasture with Irregular Holes (F6)

## ▶ Invocation
**Trigger:** "run phase 2" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 1 ticked.
**Do:** implement Tasks, run Verify, tick P2 in `plan.md`, **STOP, and
report**. **Constraints:** plan.md Global invariants.

## Goal
The `whole-pasture` archetype: groups reach toward every fence, but the
field has **several irregular empty patches** that move every draw, with
**no sheep inside them**. Reads as patchy grazing — not a lattice, not a
blob. Rules **F6**, **F3-amended** (ideal line from the initial GCM).
Q24 defaults.

## Tasks
- **§0 (`Spawn` category):** `holeCountMin 2` / `holeCountMax 5` (int,
  0–8), `holeRadiusMin 70` / `holeRadiusMax 180` (float px, 20–400·5),
  `holeLobes 3` (int 1–5, "max overlapping discs per hole; 1 = round").
  All exposed, `onChange: 'respawn'`, F6 descriptions.
- **§1 `sampleWholePasture`:**
  - Once per spawn: draw `k ∈ [holeCountMin, holeCountMax]` holes; each hole
    = `1..holeLobes` discs: first disc center uniform over the play rect
    (may touch/overlap the fence — a bare corner is a legal hole), radius
    uniform in `[holeRadiusMin, holeRadiusMax]`; subsequent lobes centered
    within the previous disc's radius of it (so the union is one connected
    irregular blob). Store `this.holes` (array of discs, tagged by hole id)
    for §2 debug drawing.
  - Candidate seed: uniform over the play rect inset by 30 px (same inset as
    today). Reject if inside any hole disc **expanded by `clusterSpread`**
    (members jitter) or inside the F8 clearance. Min-gap rejection as in P1;
    the `grow` argument is unused here (the region is already the field).
  - If rejection exhausts 150 tries (holes cover the field), fall back to
    the most-isolated candidate **that is outside all holes**; if none, drop
    the *smallest* hole and retry once — never place a sheep in a hole.
  - `idealPath[0]` = initial GCM of the spawned sheep (compute after
    placement) for this archetype.
- **§2:** `debug.spawnHoles` (Debug boolean, default false, `export:
  false`) draws the hole discs faintly — owner tuning aid; the HUD shows the
  layout name (P1).
- **Defaults file:** the five new keys.

## Verify (measured, 6 forced reseeds + 12 random)
- **Coverage:** sheep bounding box spans ≥ **80 %** of the play rect's width
  and height in every forced draw.
- **Holes:** ≥ 2 holes per draw with radius ≥ `holeRadiusMin` contain
  **zero** sheep (test every disc); hole count and centers differ across
  the 6 draws (no repeated layout).
- **Not a lattice / not a blob:** nearest-neighbour distance between group
  seeds has coefficient of variation > 0.3 (lattices are near 0); biggest
  idle cluster share at t=0 < 0.5 (A4 quick metric).
- **F8:** zero sheep within `spawnGateClear` of the mouth; zero committed.
- **Idle stability:** 10 s hands-off → A1 still-fraction ≈ 1.0; A4 holds;
  dog F1 facing < 1°.
- **Ideal line:** `idealPath[0]` ≈ initial GCM (< 1 px).
- Anchor unchanged: forced beside-gate seed 1337 digest still = P0's.
- Zero console errors (owner `file://`); toggle `debug.spawnHoles` to see
  the holes outline the empty patches.

## Done when
- [x] Five hole tunables + debug overlay live; defaults file updated.
- [x] Sampler measured on coverage/holes/F8/idle; anchor intact. (The nn-CV
      "variation" threshold was mis-specified — see plan.md P2 note.)

## Gotchas
- Expand holes by `clusterSpread` when rejecting *seeds* — otherwise member
  jitter leaks sheep into holes and the "zero inside" check fails.
- With `sheepCount 150`, `clusterMinGap 120`, and 5 big holes, the field
  can't hold the groups at min gap; the fallback must degrade by
  *clustering tighter*, not by violating holes or clearance.
- `Math.min(...seeds.map(...))` per candidate is O(groups²) over 150 tries —
  fine at ≤ 40 groups; don't "optimize" it into a grid in §1.
