# Phase 2 — Idle Spawn & Graze

## ▶ Invocation
**Trigger:** "run phase 2" / reaching P2 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 1 complete.
**Do:** implement Tasks, run Verify, tick P2 in `plan.md`, **STOP, and report**.

## Goal
The unpressured field reads as "sheep standing around", not "a swarm":
scattered small-group spawn, most sheep grazing with occasional
step-and-re-settle, a small minority wandering. Rules **A1 A2 A3 A5(size) A6**
of [flock-behavior.md](./flock-behavior.md).

## Tasks
- **§0 (new `Idle` category in `SETTINGS`):** `clusterSizeMin 2`, `clusterSizeMax
  5`, `clusterSpread` (~2 L jitter around seed), `clusterMinGap` (~10 L between
  seeds, > `clusterDist` 70 so spawn groups are distinct), `wandererFrac 0.12`
  (0–0.5·0.01), `idleSpeedCap 25` px/s, `grazeStepEvery 4` s (mean),
  `grazeStepLen 12` px (~1 L). Exposed sliders for all; sensible ranges.
- **§1 spawn:** replace the single spawn box with **cluster seeds**: draw group
  sizes uniformly from `[clusterSizeMin, clusterSizeMax]` until `sheepCount` is
  consumed (~18–24 groups at 80); place seeds ≥ `clusterMinGap` apart (rejection
  sample, seeded PRNG) within the left field; jitter members `clusterSpread`
  around their seed. Flag `floor(sheepCount · wandererFrac)` random sheep as
  **wanderers**.
- **§1 idle motion:** per-sheep idle behavior replaces the old uniform graze:
  - *Grazers:* near-stationary; a per-sheep timer (mean `grazeStepEvery`,
    jittered) triggers a `grazeStepLen` step in a random direction, then
    re-settle. Heading random-walks slowly (`wanderTurn`).
  - *Wanderers:* slow drift in a persistent random direction at ≤ `grazeSpeed`.
  - Idle speed hard-capped at `idleSpeedCap`.
- Keep the existing boid forces wired (P3 bounds them) — this phase is spawn +
  per-sheep idle drive.

## Verify (measured, per the verify playbook)
- Reload at seed: cluster count at t=0 in **~18–25** (single-linkage at
  `clusterDist`), sizes 2–5 (an occasional merged pair ≤7 tolerated at a
  second seed).
- **Idle drive in isolation** (`w_coh`/`w_align` sliders → 0, reseed — removes
  the P3 confounder): over 10 s, ≥ 90% of grazers displace < 3 L with visible
  shuffle-steps (small nonzero mean displacement); wanderers ≈ 10–15% all show
  steady slow drift (A3). *(Scope corrected 2026-07-13: with default cohesion
  the flock still converges — that is Phase 3's acceptance, not this phase's.)*
- POC-v1 regression (defaults restored): come-by still sweeps and gathers the
  scattered groups.

## Done when
- [ ] Scattered cluster spawn from schema params (A5 sizes, A6 separation).
- [ ] Grazer/wanderer split with step-and-re-settle (A1–A3).
- [ ] Measured verify numbers above; no console errors; §1 still DOM-free.

## Gotchas
- Cohesion is still global-ish until P3 — groups **will** creep together this
  phase; A4/A5-hold is *not* this phase's acceptance. Don't over-fix here.
- Seeded PRNG for cluster placement (reuse `makePRNG`) or reseed/replay breaks.
- Rejection sampling for seeds needs an attempt cap → fall back to best-so-far
  (tiny fields + many groups can't always satisfy `clusterMinGap`).
- The old spawn box params (`spawnMinX/MaxX`) become the cluster-seed region.
