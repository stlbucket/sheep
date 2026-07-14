# Phase 7 — Gate Commitment

## ▶ Invocation
**Trigger:** "run phase 7" / reaching P7 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 6 complete (perimeter gate exists).
**Do:** implement Tasks, run Verify, tick P7 in `plan.md`, **STOP, and report**.

## Goal
Sheep that are **near the gate and moving toward it continue on and
through** — approach momentum carries them out; no threshold stall or
turn-back, no dog pressure needed for the last body-lengths. Rule **G1**
([course-and-flock.md](./course-and-flock.md)) — the perimeter
generalization of v1's `through`.

## Tasks
- **§0 (schema, `Gate + Crush`):** `gateApproachR` (radius of the commitment
  zone around the gate mouth, default **60 px**) and `w_through` (strength
  of the gateward commitment bias, default **2.0**).
- **§1:** commitment funnel: a sheep inside `gateApproachR` whose velocity
  points into the mouth (dot of velocity with the gate's inward→outward axis
  above a small threshold) gains a `w_through` steering bias toward/through
  the mouth that **outweighs fence repulsion and crowd back-push**; once the
  nose crosses the plane, the sheep is committed one-way (v1 semantics —
  no re-entry). Sheep in the zone but moving *away* are untouched — this is
  commitment, not suction.
- **§2 (small):** optional debug toggle drawing the approach zone while
  tuning.

## Verify
- **G1 measured:** drive small groups at the gate ~10 times; every sheep
  that enters the approach zone moving gateward **exits the field** without
  reversing (count reversals-at-threshold: expect 0), including when the
  dog's pressure is dropped the moment the sheep enters the zone.
- **No suction:** idle sheep grazing near the gate (inside `gateApproachR`,
  not moving gateward) do **not** get pulled through over 60 s.
- **Crush unaffected:** a deliberate jam still registers crush at the mouth
  (the bias must not zero the back-pressure that crush measures).
- Zero console errors; idle spot-checks clean.

## Done when
- [ ] Commitment zone + bias in schema and sim; one-way crossing preserved.
- [ ] 10-approach measurement: zero threshold turn-backs; zero idle suction.
- [ ] Crush still measurable; zero console errors.

## Gotchas
- The bias must require **existing gateward motion** — keying on proximity
  alone recreates POC-v2's open Q6 (idle drifters self-penning), only worse
  on a perimeter gate.
- Balance against `w_fence`: the mouth gaps the fence force (P6), but the
  gate *posts* still repel — the commitment bias must beat the posts'
  corner-fields or sheep will ricochet at the jambs.
- Watch interaction with a **blocking dog at the gate** (D1/D3): a lying dog
  covering the mouth should still hold sheep out — commitment applies to
  sheep already moving through despite him, which is exactly D1's
  backpressure squeeze.
