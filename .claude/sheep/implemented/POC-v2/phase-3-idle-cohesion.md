# Phase 3 — Idle Cohesion Bounds

## ▶ Invocation
**Trigger:** "run phase 3" / reaching P3 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 2 complete.
**Do:** implement Tasks, run Verify, tick P3 in `plan.md`, **STOP, and report**.

## Goal
Left alone, groups hold apart: no convergence toward one center of mass on the
run-start timescale (30 s+); very slow minutes-scale coalescing is tolerated.
Rules **A4** and **A5(hold)** — the structural fix the baseline showed a slider
can't deliver (`cohN 10` spans half a small flock).

## Tasks *(as-built 2026-07-13 — mechanism refined during verification)*
- **§0 (`Idle` category):** `idleCohRadius 60` px, exposed 20–160·5. *(As
  built: not a force cutoff — reserved for P5's group re-derivation.)*
- **§1:** idle cohesion is **same-spawn-group only, unbounded range**: each
  sheep carries a `group` id from spawn; unpressured sheep feel cohesion only
  from their own group (a straggler walks home instead of being orphaned), and
  **never from other groups** — so groups can brush past without gluing.
  Radius-only gating was tried first and failed twice: cross-group merging is
  irreversible (field coalesced in ~3 min), and a hard radius cutoff orphans
  pushed-out members (group radius smeared to 285 px). Non-idle (threatened)
  sheep keep full topological cohesion — herding physics unchanged.
- **§1:** ~~alignment needs no extra gating~~ **Wrong — corrected in P4**: the
  normalized alignment output turns any standing group's micro-drift into a
  perpetual ~7.5 px/s glide; idle sheep don't align (see P4 as-built).
- Wanderers: no cohesion pull while wandering.

## Verify (measured — results 2026-07-13, dog neutralized via lie-down @ 0
intensity = P4's heel semantics applied manually; seed 1337, 80 sheep)
- **A4 no convergence: PASS** — mean dist-to-GCM **grows** 225 → 252 (30 s) →
  364 (180 s); baseline was 22 px fully-converged.
- **A5 groups hold: PASS on group integrity** — 25/25 spawn groups intact at
  every mark; mean group radius 8–15 px. (Raw single-linkage at 70 px
  under-counts — it *chains* adjacent-but-distinct groups as their centroids
  random-walk; group-identity metrics are the honest A5 measure.)
- **3-min soak: PASS** — largest spatial cluster 29/80 (36%) < 50%.
- Regression: threatened sheep keep full cohesion (28 stressed under come-by,
  blob physics unchanged) — but **gather no longer accumulates across groups**:
  calmed groups don't glue (correct per A4/B2). Accumulation returns at **P5**,
  whose idle re-entry re-derives groups from the current local cluster —
  gathered sheep become one group. Flag for feel-testing at P5's gate.

## Done when
- [x] Same-group idle cohesion; wanderers exempt; threatened = full cohesion.
- [x] A4/A5 metrics above beat the baseline rows (measured, two soak runs).
- [x] No console errors; §1 DOM-free.

## Observations logged for the owner (out of this phase's scope)
1. **Idle drifters self-pen**: over 3 idle minutes, 8/80 sheep wandered through
   the open gate and locked into the v1 `through` commitment. Rule candidate
   (C-group / run-lifecycle): parked in flock-behavior.md.
2. **Minutes-scale edge-drift**: shuffle-step diffusion + fence containment
   slowly piles groups along the field borders (visible at t≈180 s). No rule
   violated; polish/tuning candidate.

## Gotchas
- Idle test is per-sheep (`stress === 0`, last tick) until P5's state machine.
- Same-group cohesion must be **unbounded** — a radius cutoff orphans members.
- Don't touch separation — it's what keeps groups "loose" (A5) at any range.
