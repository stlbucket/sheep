# Phase 1 — Blocking Postures: Lie-down + Stand

## ▶ Invocation
**Trigger:** "run phase 1" / reaching P1 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 0 complete.
**Do:** implement Tasks, run Verify, tick P1 in `plan.md`, **STOP, and report**.

## Goal
Stationary postures become **directional walls**: lie-down's cone blocks
(sheep cross only under flock backpressure), and the new **stand** command
blocks harder. The boldest sheep can still dart around. Rules **D1–D3**.

## Tasks
- **§0 (schema):** `lieDownBlock 1.4` (0–3·0.1 — in-cone threat multiplier
  while lying; the cone gets *stronger* than a moving dog's even though
  overall intensity stays soft), `standBlock 2.2` (0–4·0.1), posture cone
  tightness `postureConeK 4` (1–8·0.5 — tighter, waller cone for both
  postures), `dartBoldness 0.8` (0.5–1·0.05 — Q4). Keep `lieDownIntensity`
  for the *ambient* (out-of-cone) component.
- **§1 flee/eye:** while the dog's command is `lie_down` or `stand`, the
  eye model uses the posture profile: ambient stays low
  (`lieDownIntensity`-scaled), but **in-cone threat is multiplied** by
  `lieDownBlock` / `standBlock` with `postureConeK` tightness — a hard arc,
  soft flanks. D2 needs no new code: the boldness gate + gap-seeking already
  produce darting; confirm `dartBoldness`-tier sheep still attempt it (tune,
  don't suppress).
- **§1 `stepDog`:** new `stand` case — same as lie_down (hold position, face
  the flock) with the stand profile.
- **§3:** 6th command button **Stand** (hotkey **A**) in the strip (Q2);
  HOTKEYS map + HUD label. Schema/inspector untouched by the new command
  (commands aren't params).

## Verify (measured 2026-07-13 — profile-probe method; results in As-built)
- **Blocking (D1) + escalation (D3): PASS at force level** — threat probed via
  a teleported sheep at controlled (dist, angle):
  | T @ 40 px | on-axis | 45° | 90° flank | @60 px axis | @90 px axis |
  |---|---|---|---|---|---|
  | walk-on | 0.741 | 0.444 | 0.148 | 0.500 | 0.156 |
  | lie-down | 0.609 | 0.171 | **0.025** | 0.108 | **0** |
  | stand | **0.942** | 0.254 | **0.025** | 0.167 | **0** |
  Ordering stand > lie (front wall), soft flanks (darting channel), zero reach
  at driving distance (the relief property, strictly better than v1's 0.3×
  residual). New lie-down front wall ≈ 2.7× the old one.
- **Relief regression:** proven at force level (posture T = 0 beyond
  `postureRange`·`R_flee` = 72 px); wall test: a group parked 45–50 px from
  either posture is evicted just past the 72 px ring and then left alone.
- **Behavioral gate traffic (D1/D2 crossing counts, dart tally): deferred to
  P4** — scripted open-loop scenarios produced no natural traffic toward a
  parked dog (measured zero in the control condition too); real gate work is
  closed-loop play. P4's acceptance owns it.
- Stand fully wired: button, highlight, hotkey A; six commands in the strip.

## Done when
- [ ] Posture threat profiles wired; stand command + button + hotkey live.
- [ ] Crossing-rate ordering measured: open ≫ lie-down > stand; darts rare
      but present.
- [ ] Crush relief regression passes; zero console errors.

## As-built additions (2026-07-13)
- **`postureRange` (0.6, new param):** the posture threat reaches only
  `postureRange`·`R_flee` (72 px) — the resolution to this phase's headline
  gotcha. The wall is fierce close-in but *nonexistent* at driving distance,
  so D1's blocking and v1's lie-down gate-relief coexist by construction.
- **Watch-item for P4/Q8 (measured):** a flock driven against the fence
  *off-gate* calms into a hard deadlock — rear pressure only wakes the back
  rows (GCM pinned at x≈718 for 100+ s). A come-by flank along the fence
  unsticks it (pile swept y 539 → 141), but blind scripting overshoots the
  gate: gate alignment is closed-loop play. P2's auto-stand + P3's impulses
  are the tools; P4 must exercise this loop deliberately.

## Gotchas
- **Don't break the crush loop:** lie-down's job at the gate is *relief*
  (lower fleeFwd). The block multiplier applies to the *approach* arc — make
  sure the geometry (dog beyond the gate facing the flock) doesn't re-create
  forward pressure on sheep already in the mouth.
- Stand at heel is impossible by definition (stand is a posted posture, heel
  is at the owner) — a stand command exits heel like any other command.
- Hotkey A must not collide: current map is Q/E/W/S/D + F/R.
