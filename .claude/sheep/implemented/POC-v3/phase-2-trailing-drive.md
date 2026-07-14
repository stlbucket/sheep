# Phase 2 — Trailing Drive + Auto-Stand

## ▶ Invocation
**Trigger:** "run phase 2" / reaching P2 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 1 complete (auto-stand needs the stand posture).
**Do:** implement Tasks, run Verify, tick P2 in `plan.md`, **STOP, and report**.

## Goal
Walk-on becomes a **trailing** drive: the dog never catches up to moving
sheep, and when the flock stalls on backpressure he **converts to a stand** on
his own — with the command strip following his actual state. Rules **E1–E2**.

## Tasks
- **§0 (schema):** `driveTrailGap 70` px (30–160·5 — the gap to the nearest
  driven sheep that walk-on will not close), `stallSpeed 8` px/s (2–30·1 —
  flock-ahead forward speed below which the drive counts as stalled),
  `stallDwell 1.5` s (0–5·0.25 — how long the stall must hold before
  auto-stand). Mark `driveShrink` `exposed:false` (superseded).
- **§1 `stepDog` walk_on:** governor replaces the shrink-forever creep — the
  dog seeks the drive point behind the flock but **clamps his advance so the
  distance to the nearest non-penned sheep ahead never drops below
  `driveTrailGap`** (E1). Stall detection: mean forward (goal-ward) speed of
  the sheep in his pressure arc < `stallSpeed` while their `fwdPush` > 0,
  sustained `stallDwell` → **`d.command = 'stand'`** (E2), posture profile
  from P1, position held.
- **§3 strip-follows-state (Q5, locked):** the strip highlight is driven by
  the dog's actual `command` each frame (a tiny state→UI sync in §2/§4 render
  or §3), not just by button clicks — auto-stand must light the Stand button.
  `issue()` remains the player→sim path.

## Verify (measured 2026-07-13 — PASS)
- **E1:** 400 s continuous 20-sheep drive: min ahead-gap **51 px ≥ trailGap
  40** — the dog never caught the driven sheep; drive speed matches pre-v3.
- **E2 (gate jam, its real scenario):** 12 px gate + gate-mouth crowd under
  walk-on → **auto-stand at 5.5 s** (= 4 s spool-up + 1.5 s dwell, on
  schedule); re-issued walk-on drives again and re-stands at 6.4 s when the
  jam re-establishes (the E3 tap rhythm's precondition).
- **No false stands:** 400 s of open-field driving, zero spurious conversions.
- **Strip-follows-state:** forcing `dog.command = 'stand'` (as auto-stand
  does) lights the Stand button via the render loop with no player input.
- Zero console errors.

## As-built additions (2026-07-13 — the E2 detector took four iterations)
1. **Front-hemisphere filter:** gap + stall consider only sheep ahead of the
   dog's facing (dot > 0.3) — post-gather stragglers beside him froze the
   naive version solid (GCM +50 px in 140 s).
2. **Gap CONTROLLER, not fixed standoff:** `driveDist` closes at 25 px/s while
   the ahead-gap is ample and backs off when it tightens — replacing
   `driveShrink`'s blind creep with feedback on the actual gap. (A fixed
   standoff left the dog 140 px back exerting ~0.03 threat forever.)
3. **`driveTrailGap` default 70 → 40:** the gap must sit inside the threat
   range that mobilizes sheep (~`R_flee`/3); at 70 px threat ≈ 0.1 is under
   the boldness hold and the "drive" is a genuine permanent stall.
4. **Stall statistic = EMA of arc-mean forward speed** (τ ≈ 1.5 s, seeded
   optimistic on command): raw mean false-trips during spool-up, max never
   trips (one jittering sheep always exceeds it). Plus a 4 s arm delay and an
   at-the-gap condition.
- **Finding (for P4/Q8):** against a plain fence *off-gate*, the flock never
  "stops" — it leaks sideways around the pressure indefinitely, so E2
  correctly never fires there. One dog cannot bottle a flock against an
  unbroken wall; only the gate funnel binds. Realistic, and exactly why the
  flank-sweep is the off-gate tool.

## Done when
- [ ] Trail governor + stall→stand transition wired; strip follows state.
- [ ] Measured E1/E2 checks pass; v1 drive regression passes.
- [ ] Zero console errors; §1 DOM-free (UI sync lives outside §1).

## Gotchas
- **Stall ≠ lull:** sheep pausing between pressure pulses mustn't trigger
  auto-stand — that's what `stallDwell` + the `fwdPush > 0` condition guard;
  verify no spurious stands during an open-field drive.
- The E3 impulse (next phase) re-enters from stand — leave `setCommand`
  clean for a walk_on-while-standing to be distinguishable (it's just a
  command while `d.command === 'stand'`; no special casing needed yet).
- Penned/`through` sheep are not "ahead" — exclude from the gap and stall
  calculations or the dog stands forever at the gate.
