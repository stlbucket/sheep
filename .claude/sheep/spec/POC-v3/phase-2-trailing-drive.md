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

## Verify (measured)
- **E1:** drive a moving group 30 s: per-tick min distance dog→nearest driven
  sheep never < `driveTrailGap` (log the minimum).
- **E2:** jam the flock at the gate mouth under walk-on: within
  ~`stallDwell`+1 s of the stall, `dog.command === 'stand'` and the strip
  highlights Stand; the dog holds position.
- Driving resumes when the player re-issues walk-on (normal command path).
- 20-sheep v1 drive milestone still completes (gather → drive → pen a few).
- POC-v2 spot-check: A-rules idle metrics unchanged.

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
