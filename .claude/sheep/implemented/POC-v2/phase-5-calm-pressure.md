# Phase 5 — Calm/Pressure Transitions

## ▶ Invocation
**Trigger:** "run phase 5" / reaching P5 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 4 complete.
**Do:** implement Tasks, run Verify, tick P5 in `plan.md`, **STOP, and report**.

## Goal
The idle state and the herding state hand off cleanly: dog pressure dissolves
idle instantly (**B1**), sustained calm gradually re-scatters a gathered flock
(**B2**), with hysteresis so sheep don't flicker at the threat boundary. This
formalizes the interim "nonzero threat" test from P3/P4 into the real state
machine.

## Tasks *(as-built 2026-07-13 — re-scatter mechanism changed during verification)*
- **§0 (`Idle` category):** `calmDelay 5` s (0–20·0.5, exposed). ~~`relaxTime`~~
  → **`crowdTolerance 2`** (0–10·1): timer-based relax drift went stale (sheep
  settle mid-gather, timers expire before release; adopters inherited expired
  timers → frozen blob). As built, **crowd dispersal** paces B2 with no timers:
  an idle grazer with more than `crowdTolerance` strangers (non-groupmates)
  within `idleCohRadius` drifts away from the local crowd centroid until its
  neighborhood thins. Self-organizing, self-terminating, can't go stale.
- **§1 per-sheep state machine:** `idle ⇄ alert`.
  - `idle → alert`: immediately on any nonzero threat `T` (B1). Alert sheep =
    exactly POC-v1 behavior (full cohesion/alignment/flee/boldness/panic).
  - `alert → idle`: only after `calmDelay` seconds of continuous zero threat
    (per-sheep timer; any threat resets it).
  - On re-entering idle: re-derive the sheep's group from its current local
    cluster (neighbors within `idleCohRadius`); re-roll wanderer status at
    `wandererFrac`; resume graze/step behavior. Separation + gated cohesion
    then loosen the gathered blob over roughly `relaxTime` — tune
    `idleSpeedCap`/`grazeStepEvery` interplay so the drift reads gradual, not
    a scatter-explosion.
- Replace P3/P4's interim threat test with this state everywhere it was used.

## Verify (measured 2026-07-13; seed 1337)
- **B1/B2 cycle:** 60 s gather → *that'll do* → 100% idle by +15 s, groups
  re-derived under the size cap (25 group ids); released crowd holds ~45 s
  (biggest cluster 27), then visibly dissolves — biggest 27 → 19, clusters
  12 → 18 by +105 s. Pace tunable via `crowdTolerance`.
- **A-rules unregressed:** idle field 8.2 px mean /10 s, 25 clusters at t0.
- **No flicker: PASS** — dog parked with `R_flee` edge bisecting a group
  (lie-down, intensity 0.3): max **2** idle⇄alert transitions per sheep over
  10 s; in-range sheep stay alert while stressed (lie-down ≠ heel confirmed).
- Full gate-run + scoring card + lie-down-at-gate relief → **deferred to P6**
  (that phase's whole job).

## Feel-note for the owner (closes P3's deferred question)
Gather-accumulation is **spatial, not identity-based**: collected sheep
re-fragment into small groups after `calmDelay`, but they stay adjacent, and
re-alert as one blob the moment pressure returns — so gather-then-drive works.
The scattered 80-sheep start makes a full gather a genuinely long job (the dog
must visit each region — Strömbom collect); that difficulty is a design knob,
not a sim defect. Judge it hands-on at P6.

## Done when
- [ ] Per-sheep idle⇄alert with calmDelay hysteresis; B1 instant, B2 gradual.
- [ ] Re-scatter metrics above; no boundary flicker; v1 run regression passes.
- [ ] No console errors; §1 DOM-free.

## Gotchas
- The calm timer is **per sheep** — a flock half-in half-out of threat must
  split states cleanly (that's the point of A4/A5-style local behavior).
- Re-rolling wanderers on every idle re-entry with a naive `rng()` breaks
  determinism across replays — derive from the seeded PRNG stream.
- B2 pacing is feel-critical: too fast punishes lie-down tactics at the gate
  (lie-down keeps `lieDownIntensity 0.3` ≠ zero threat, so sheep shouldn't go
  idle at the gate — verify that explicitly).
