# Phase 2 — Perimeter flank + easy handoff (C8, C9)

## ▶ Invocation
**Trigger:** "run phase 2" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 1 ticked.
**Do:** implement Tasks in `sheep-poc.html` + `sheep-defaults.json.js`, run
Verify, tick P2 in `plan.md`, **STOP, and report**. **Constraints:** plan.md
Global invariants.

## Goal
The flank point rides the hull offset by `flankStandoff` (P0's
`perimeterRadius`) instead of the sector-max circle, so the dog follows the
flock's shape (C8); the handoff fires when the dog has **reached** the gate
line (signed progress ≥ 0, bounded by `flankHandoffDeg`), defaults to no
overshoot, and converts to **easy** (C9). C7 is superseded by spec.

## Tasks
- **§0 schema:** `flankOvershootDeg` default **90 → 0**, description: "C8
  (POC-v6): the flank ends AT the gate line; this carries the station past
  it in the flank direction for a wider sweep (v4's C7 behavior at 90). 0 =
  hand off on the line." `flankHandoffDeg` description: "how far PAST the
  gate line the on-station check may catch the dog (C8 reach bound) —
  v3/v4's ± tolerance cone became one-sided". `flankStandoff` description:
  "…beyond the flock's convex hull (the perimeter line, C8)".
- **§0 levers:** Sweep row `flankOvershootDeg: [0, 0, 60]` (Q33) — anchor 0.
- **§1 `stepDog` come_by/away:** replace the sector-max `edge` loop with
  `rr = this.perimeterRadius(d.flankAngle, p.flankStandoff)`; keep the
  radius smoothing (`3·dt`), the linear-speed cap, the clearance floor
  (now a no-op safety), fence seek and field clamp. Handoff test: compute
  `prog = sign · angleDiff(bear, station)` (positive once the bearing has
  crossed the station in the flank direction) and fire when `d.flankT > 0.5
  && dist(pos, target) < 60 && prog >= 0 && prog <= flankHandoffDeg·π/180`.
  On fire: `d.command = 'easy'`, `d.driveT = d.stallT = 0`, `d.fwdEMA =
  stallSpeed·3`, `d.handoff = pos`, `d.facing = faceGCM`.
- **§2:** the `handoff` debug marker now reads `handoff → easy`; the
  `debug.dogTrack` overlay (P0) is already conditioned on flanking.
- **Defaults file:** `flankOvershootDeg: 0`. Mirrors copied.

## Verify (measured, headless)
- **C8 shape / acceptance 1:** seeds 1337 & 42, come-by and away from 0.5 s
  idle: over on-station ticks (`dist(pos, target) < 60`), `distToHull(pos)`
  within **±25 px of `flankStandoff`** on ≥ 90 % of ticks (fence-clamped
  ticks excluded and counted); bearing advance monotone in the command's
  direction (net reversal < 5°). Also on a deliberately elongated flock
  (whole-pasture seed or a 3:1 stretched spawn): the dog's path aspect
  ratio follows the hull's (ratio within 25 % of the hull's), which the v5
  circle could not do — log both.
- **C8 handoff / acceptance 2:** signed carry past the gate line at the
  handoff tick ∈ **[0°, 30°]** on all four runs (no negative carry); total
  sweep < 360°. With `flankOvershootDeg 90` the station rotates and the
  carry lands in [90°, 120°] — the dial still works (Q33).
- **C9 / acceptance 3:** `dog.command === 'easy'` at the handoff tick with
  no input; the E1 gap then holds ≥ 35 px through 20 s of easy.
- **Regressions:** C3 eye 45° off travel; C4/C5 reversal pure CCW; C1 no
  orbit (radius sd > 0 — with the hull it should be *larger* than v5's on
  non-round flocks); D1 wall = v5; idle digest = v5; F1 0.000°; `[levers] …
  OK` with `flankOvershootDeg` anchor 0.

## Done when
- [ ] Flank point from `perimeterRadius`; signed reach handoff → `easy`;
      `flankOvershootDeg 0` + Sweep row re-anchored; defaults + mirrors.
- [ ] Acceptance 1–3 measured at 1337/42 (+ the elongated-flock log);
      regressions hold.
- [ ] Zero console errors (static) — owner's `file://` eyeball.

## Gotchas
- **Sign again.** `prog` must be positive *after* the bearing has passed the
  station in the direction `flankAngle` actually advances (`sign` = +1 CW
  for come-by in the y-down frame). Measure on a live run before trusting
  it — v4's P1 gotcha.
- The GCM and hull move while the dog flanks; the station is per-tick.
  With `prog ≥ 0` and the 30° bound, a dog that is carried past the bound
  by a fast GCM swing (prog > 30°) would run another lap — log if it ever
  happens; if it does, the bound should grow, not the sign flip.
- `perimeterRadius` at a hull **corner** changes direction sharply; the
  `3·dt` radius smoothing plus the arrive-seek keeps the dog's path round
  — expect the track to look like the offset outline, not the raw hull.
- A come-by issued from a dog already *on* the gate line converts right
  after the 0.5 s arm delay into easy — fine, same as v3/v4.
