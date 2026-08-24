# Phase 1 — Flank Overshoot (C7)

## ▶ Invocation
**Trigger:** "run phase 1" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 0 ticked.
**Do:** implement Tasks in `sheep-poc.html` (+ regenerate
`sheep-defaults.json.js` for the new schema entry), run Verify, tick P1 in
`plan.md`, **STOP, and report**. **Constraints:** plan.md Global invariants.

## Goal
The flank→drive handoff (v3's C6) stops firing at the balance point: the dog
carries the flank **`flankOvershootDeg` (default 90°) further** around the
flock, then self-converts to walk-on as before. Rule **C7**. At slider 0 the
POC-v3 behavior returns exactly.

## Tasks
- **§0 (`Dog` category, schema):** `flankOvershootDeg 90`° (0–180 · 5),
  exposed, description ≈ "C7: how far past the balance point (opposite the
  target) a flank carries before it hands off to walk-on; 0 = convert at
  balance (POC-v3)". `flankHandoffDeg` (the tolerance cone) is unchanged.
- **§1 `stepDog`, come_by/away C6 test:** today the test compares the dog's
  bearing from the GCM (`bear`) against the goal→GCM line extended (`opp`)
  within `flankHandoffDeg`. Rotate the station: compare against
  `opp + dir · flankOvershootDeg` (in radians), where `dir` is the angular
  direction the dog's bearing actually advances for this command (CW for
  come-by, CCW for away, in the screen's y-down frame). Everything else —
  0.5 s arm delay, on-station proximity (< 60 px of the flank target),
  tolerance cone, `d.handoff` marker, state-driven strip flip — stays as is.
- **§2:** no change — the existing `handoff` debug marker will now render
  ~90° past balance; confirm visually.
- **defaults file:** regenerate/extend `sheep-defaults.json.js` with the new
  key (schema-generated, same as v3 P9's export path).

## Verify (measured)
- **C7, reversed come-by** (v3's C6 scenario: flock between dog and gate):
  log the dog's bearing sweep. He **passes** within `flankHandoffDeg` of the
  old balance line **without converting**, converts within tolerance of
  balance + 90°, and the `handoff` marker sits ~90° past balance. No second
  lap (total sweep bounded well under 360° + overshoot).
- **v3 parity at 0:** set `flankOvershootDeg 0`, rerun the same seed: the
  handoff fires at the balance point with sweep comparable to the v3 P4
  measurements (no other drift).
- **Strip follows:** at conversion the highlight flips to walk-on with no
  player input (Q5 convention).
- **Q12 data (log, don't gate):** during the dog's return transit from the
  overshot station back behind the flock, sample the flock GCM's lateral
  displacement off the goal line; report the peak. This is the owner's
  hands-on question — the phase only measures it.
- Regression spot-checks: mid-field away reversal still pure CCW (C4/C5),
  eye still ≈45° off travel (C3), E1 trail gap holds after conversion, idle
  A1/A4 flat. Zero console errors from `file://`.

## Done when
- [x] `flankOvershootDeg` schema entry + slider live; defaults file carries it.
- [x] Handoff station rotated by the slider; 0 reproduces v3.
- [x] Measured checks above; §1 DOM-free. (Measured headless — see below;
  file:// console check falls to P2/owner, per the no-webserver rule.)

## As-built notes & measurements (2026-07-14)

Measured **headless in Node** (owner rule: no webserver): §0+§1 extracted by
the section markers — invariant #3 is what makes this possible — with an
inert stub for §0's lil-gui panel wiring, driven at dt = 1/60 via
`sim.step()`; scenario = command issued from spawn, seeds 1337/42.

- **C7 passes.** Come-by @90° overshoot: the dog sat **armed + on-station
  inside the OLD balance cone for 178/179 ticks (~3 s) without converting**
  (the sign gotcha is dead: a wrong sign would have converted there),
  then handed off at **+60.3° / +60.5°** past balance (within the ±30°
  tolerance of the 90° station), sweep 257°/263° — no second lap. Away:
  converts at **+83.9°**, sweep 251°, correct direction. Strip-follow is
  state-driven off `d.command` (flips to `walk_on`, v3-proven rendering).
- **Parity at 0:** conversion at **+4.1° / −15.6°** from balance — the v3
  balance-cone semantics exactly (tolerance-edge firing included); eye
  45.0–45.2°, idle A1/A4 flat (still 1.0, dist-GCM 185.4→185.4/10 s).
- **Cone-edge effect (report to owner):** the handoff fires at the **near
  edge** of the station cone, so the effective carry ≈ `overshoot −
  handoffTol` (60° at defaults) — the same edge effect that made v3 convert
  up to 30° *short* of balance (seed 42: −15.6°). If hands-on wants a true
  ~90° carry: overshoot ~120° or a tighter `flankHandoffDeg`; sliders exist.
- **Q12 data (logged, not gated):** peak lateral GCM drift off the
  handoff→goal line over the first 20 s of drive: **28.4 / 7.6 px** (come-by
  @90), **22.9 px** (away @90) vs **16.0 / 17.6 px** at overshoot 0 — the
  overshoot adds little; the locked "no special case" default looks safe.
- **⚠ Watch item (E1 transit dip, for P2/owner):** min front-hemisphere gap
  over the same window: 38.9/38.9 (come-by, matches v3's known ~39 transit
  dip) but **27.6 px** on away @90 vs the 35 px (gap−5) line — the longer
  ~84° return transit cuts closer past the flock flank before the trail
  governor takes over. Same phenomenon Q12 tracks; logged for the owner's
  hands-on read rather than special-cased (per the locked default).

## Gotchas
- **The rotation sign is the whole phase.** A wrong sign converts the flank
  90° *early* instead of late. Don't trust the cone-rotation `sign` variable
  blindly — it rotates *facing*, not bearing advance. Measure which way
  `bear` actually moves per command on a live run, then aim the station.
- Angle wrap: keep the comparison on `angleDiff` (it exists) — naive
  subtraction breaks when `opp + overshoot` crosses ±π.
- A come-by issued when the dog already sits at the *overshot* station will
  convert right after the 0.5 s arm delay — same as v3's behavior at the
  balance point; fine, but don't "fix" it into skipping the arm delay.
- The GCM moves while the dog flanks; the station is `opp`-relative per tick,
  so it moves too — expect converted sweeps ≈90° more than v3's measured
  201°/268°, not exactly +90.
