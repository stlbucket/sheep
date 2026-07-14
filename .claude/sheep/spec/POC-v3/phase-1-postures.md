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

## Verify (measured)
- **Blocking (D1):** drive a group toward the gate, lie the dog between flock
  and gate mouth: sheep in the covered arc **stall or divert** — crossings of
  the arc per minute drop sharply vs a `that_ll_do` dog; crossings that do
  happen coincide with backpressure (fwdPush > 0 behind them).
- **Escalation (D3):** repeat with stand: arc-crossing rate drops further
  (measurably below lie-down's).
- **Darting (D2):** over a few minutes of blocking with bold sheep present
  (boldness > `dartBoldness`), at least one dart-around occurs (sheep loops
  the flank at panic speed) — count them; > 0 and rare.
- Lie-down still relieves gate crush (v1 milestone: crush falls when lying).
- POC-v2 spot-check: A7/A8 unchanged (heel ≠ posture profiles).

## Done when
- [ ] Posture threat profiles wired; stand command + button + hotkey live.
- [ ] Crossing-rate ordering measured: open ≫ lie-down > stand; darts rare
      but present.
- [ ] Crush relief regression passes; zero console errors.

## Gotchas
- **Don't break the crush loop:** lie-down's job at the gate is *relief*
  (lower fleeFwd). The block multiplier applies to the *approach* arc — make
  sure the geometry (dog beyond the gate facing the flock) doesn't re-create
  forward pressure on sheep already in the mouth.
- Stand at heel is impossible by definition (stand is a posted posture, heel
  is at the owner) — a stand command exits heel like any other command.
- Hotkey A must not collide: current map is Q/E/W/S/D + F/R.
