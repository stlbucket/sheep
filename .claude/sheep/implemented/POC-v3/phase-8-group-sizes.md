# Phase 8 — Idle Group Sizes 1–n

## ▶ Invocation
**Trigger:** "run phase 8" / reaching P8 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 6 complete (spawn anchor is gate-relative).
**Do:** implement Tasks, run Verify, tick P8 in `plan.md`, **STOP, and report**.

## Goal
At-rest groups vary from **1 to n** members, with n a slider — **default 10,
max 20**; singleton sheep are legal idle groups. Rule **H1**
([course-and-flock.md](./course-and-flock.md)), superseding POC-v2 A5's
fixed 2–5.

## Tasks
- **§0 (schema, `Idle`):** reshape the pair — `clusterSizeMin` becomes an
  `exposed:false` documentation row fixed at **1**; `clusterSizeMax` becomes
  the H1 slider: label **"max group size"**, default **5 → 10**, range
  **1–20**, `onChange: 'respawn'` (kept).
- **§1 (spawn table only):** group sizes drawn **uniformly 1..n** at seeding
  (n = `clusterSizeMax`); group *count* still derives from `sheepCount`;
  cluster-seed scatter (`clusterSpread`, `clusterMinGap`) unchanged. Idle
  cohesion/`crowdTolerance` mechanics untouched — bigger groups simply exist.
- **§2:** nothing.

## Verify
- **H1 at defaults (n=10):** respawn several seeds: observed group sizes
  span **1 through ~10** including visible singletons; groups scattered per
  A5/A6 (spatially separated, different places).
- **Slider sweep:** n=20 → groups up to ~20 appear after respawn; n=1 → the
  whole field is singletons.
- **A4 holds:** 30 s idle at n=10: no global blob, mean dist-to-GCM flat
  (the lumpier field must not tip cohesion into convergence).
- **B2 sanity:** a released crowd still re-scatters (crowdTolerance now
  fights bigger legal groups — check it still dissolves).
- Zero console errors.

## Done when
- [ ] Slider reshaped (1–20, default 10); sizes drawn 1..n; singletons legal.
- [ ] H1 measured at n=1/10/20; A4/A6 + B2 spot-checks clean.
- [ ] Zero console errors.

## Gotchas
- `crowdTolerance` (default 2) counts *strangers* within the idle cohesion
  radius — a legal group of 10 packs members closer than 2–5 did; make sure
  same-group members aren't counted as strangers, or big groups instantly
  self-dissolve.
- Uniform 1..n at n=10 nearly doubles mean group size → fewer groups at the
  same `sheepCount`; the A5 acceptance language ("~18–24 groups at 80") is
  superseded — measure against H1, not the old counts.
- Keep the draw **seeded** (respawn reproducibility).
