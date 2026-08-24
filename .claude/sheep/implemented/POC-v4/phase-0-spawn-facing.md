# Phase 0 — Spawn Facing (F1)

## ▶ Invocation
**Trigger:** "run phase 0" / reaching P0 from [`plan.md`](./plan.md).
**Prerequisite:** POC-v3 complete (it is).
**Do:** implement Tasks in `sheep-poc.html`, run Verify, tick P0 in `plan.md`,
**STOP, and report**. **Constraints:** plan.md Global invariants.

## Goal
At sim start and on every reset, the dog **faces the flock** — the body
triangle and eye-cone arc read as watching the sheep from the very first
frame, never staring due east at a fence. Rule **F1**. Pure initialization:
no tunable, no behavior change after t=0.

## Tasks
- **§0:** nothing — F1 has no tunable.
- **§1 (Sim construction/reset):** the dog currently initializes
  `facing: 0` hardcoded. After the sheep are spawned (ordering matters — the
  GCM must exist), set `facing = atan2(GCM.y − dog.y, GCM.x − dog.x)`. Use
  the same active-flock centroid the steering uses (`computeGCM` excludes
  penned/down sheep). Every code path that rebuilds the sim (fresh boot,
  reseed, reset button) must pass through this init.
- **§2:** no change — the triangle and eye-cone already render along
  `facing`; confirm they point at the flock at t=0.

## Verify (measured)
- **F1 across seeds:** boot at ≥5 different seeds; at t=0 the angle between
  `dog.facing` and the direction dog→GCM is ~0° (< 1°, it's an assignment).
  Repeat after an in-page reset/reseed.
- **Visual read:** screenshot one seed at t=0 — eye-cone arc visibly covers
  the flock side.
- **No behavior drift:** with no commands issued, a 10 s idle run's A1/A4
  quick metrics match POC-v3 (the heeled dog exerts zero pressure, so
  facing must not change idle behavior).
- Zero console errors from `file://`.

## Done when
- [x] Spawn/reset facing derived toward the flock GCM on every rebuild path.
- [x] Measured checks above; zero console errors; §1 DOM-free.

## As-built additions (found during implementation, 2026-07-14)
- **A spawn-only init was impossible:** the `that_ll_do` steering case (the
  dog's spawn command) re-derives facing **away** from the flock *every
  tick* ("disengage → flock relaxes", POC-v2) — any t=0 assignment was
  overwritten one tick later. As built, the at-heel branch (dist-to-owner
  < 12) now faces the flock (`faceGCM`) while the **en-route** disengage
  facing is untouched — en route the dog's intensity is live and his eye off
  the herd matters; at heel intensity is `heelIntensity` (0), so the
  watching eye is pressure-free and A7 is intact.
- Mechanism: new `faceFlock()` §1 helper (facing ← bearing to `computeGCM()`),
  called at construction and at the end of `reseed()` (after `spawn()` — the
  *new* herd's GCM; `placeGate()` runs earlier and would see the old herd).
- Measured (localhost HTTP, seeds 1337/42/7/99/2026/555): facing-vs-GCM
  **0.000°** at boot and after every reseed (init path, pre-step),
  **0.003°** after 120 ticks at heel (facing tracks GCM drift); heel
  intensity 0 throughout; idle A1/A4 spot: still-frac 1.0, mean dist-to-GCM
  186.5 → 187.6 over 10 s (matches v3 P8's 185→187); console clean (only
  the browser's own favicon-404 line); screenshot confirms the eye-cone arc
  covers the flock side at rest.

## Gotchas
- **Init order:** if the dog is constructed before the sheep array exists,
  compute facing *after* sheep spawn (end of the constructor/reset), not in
  the dog literal.
- Degenerate case: zero active sheep (n slider tricks) → keep the old
  default (0) rather than `atan2(0,0)` NaN.
- The first command overwrites facing anyway — resist the urge to touch
  anything past t=0.
