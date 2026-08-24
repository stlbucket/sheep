# Phase 0 — Perimeter in §1

## ▶ Invocation
**Trigger:** "run phase 0" / first unchecked in [`plan.md`](./plan.md).
**Prerequisite:** none.
**Do:** implement Tasks in `sheep-poc.html`, run Verify, tick P0 in
`plan.md`, **STOP, and report**. **Constraints:** plan.md Global invariants.

## Goal
The flock outline becomes a sim concept: `FlockSim` owns the convex hull of
the working flock and can answer "how far from the GCM, along bearing θ, is
the boundary of the hull offset outward by `offset` px?" — the geometry P2's
flank will track. §2 draws the existing dotted outline from `sim.hull`
(pixel-identical) and gains a `debug.dogTrack` overlay showing the offset
hull at `flankStandoff`. **No behavior changes in this phase** — the dog's
steering is untouched; idle and command runs stay byte-identical to v5.

## Tasks
- **§0 (`Debug` category):** `debug.dogTrack` boolean, default **true**,
  `export: false`, description ≈ "Dashed offset of the flock hull at
  `flankStandoff` — the line the flanking dog tracks (C8); drawn only while
  he flanks". (Debug keys are exempt from lever ownership.)
- **§1:** move `convexHull(pts)` from §2 into §1 verbatim (it is pure). In
  `FlockSim`: `this.hull = []` in the constructor; `computeHull()` over the
  working flock (not `down`, not `through` — the same set `computeGCM` uses)
  called in `step()` right after the GCM is refreshed, **before** `stepDog`.
  Add `distToHull(pt)` (0 inside; else min distance to the hull's edges;
  1-point hull → point distance, 2-point → segment distance) and
  `perimeterRadius(theta, offset)`: bisection on `t ∈ [0, tMax]` of
  `distToHull(GCM + t·(cos θ, sin θ)) − offset` (monotone nondecreasing
  along an outward ray from an interior point of a convex set), `tMax` =
  farthest-sheep distance + offset + 1, ~24 iterations; empty hull → `offset`.
- **§2:** `drawFlockOutline` uses `sim.hull` instead of recomputing (keep
  `outlineLengths` offset, markers, 1/2-point cases as they are). New
  `drawDogTrack()`: when `params.debug.dogTrack` and the dog is in
  `come_by`/`away`, sample `perimeterRadius(θ, params.flankStandoff)` at
  ~72 bearings and stroke the closed polyline, dashed, in the dog's colour
  at low alpha. Drawn under the sheep, after the outline.
- **§3/§4:** nothing.

## Verify (measured, headless)
- **Hull parity (acceptance 8):** on seeds 1337/42/7 at t=0 and after 10 s
  idle, `sim.hull` equals the pre-change §2 `convexHull` result on the same
  point set vertex-for-vertex (same order).
- **Radius sanity:** for 36 bearings, the point `GCM + r(θ)·û` has
  `distToHull` = `offset` within 0.5 px; `r(θ)` ≥ the distance of every
  sheep within ±5° of θ plus `offset` − 0.5 px; at `offset 0` the point sits
  on the hull boundary (`distToHull` < 0.5 px). Lone sheep → `r ≡ offset`.
- **Nothing moved:** idle 10 s digest of all sheep positions identical to
  the same run before the change; a scripted come-by at 1337 reproduces
  v5's handoff tick and carry exactly (the dog code is untouched).
- Static: §1 has no `canvas`/`document`/`window` references; page parses.

## Done when
- [ ] `convexHull`, `hull`, `distToHull`, `perimeterRadius` in §1; §2 draws
      from `sim.hull`; `debug.dogTrack` overlay wired.
- [ ] Parity + radius checks measured; idle/come-by runs byte-identical to v5.
- [ ] Mirrors copied; zero console errors (static) — owner's `file://` eyeball.

## Gotchas
- `computeHull` must run **after** `computeGCM` in `step()` and on the same
  sheep subset, or the GCM can fall outside the hull (penned sheep) and the
  ray bisection loses monotonicity.
- Andrew's chain returns cross>0 order, which is **visually clockwise** on
  the y-down canvas — `drawFlockOutline` relies on that; don't "fix" it.
- `distToHull` for 2 points is segment distance, not line distance.
- Don't compute the hull inside `stepDog` per bearing sample — once per
  step, stored.
