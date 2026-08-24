# Dog Commands & Influence v8 — gentle flanks (C11) · offset downs (D4)

**Status:** implemented 2026-08-24 (acceptance measured PASS, see log; owner `file://` eyeball pending). Extends
[POC-v9 dog-behavior](../POC-v9/dog-behavior.md).

Four new *buttons*, two new *mechanics*: a flank the dog runs at half his
speed, and a lie-down whose block beam sits 30° off his facing. Neither is a
new verb — `COMMANDS` stays at six; the variants ride `setCommand` entry opts
and two new dog-state fields.

## Goals

1. **C11** — come-easy / away-easy: exactly come-by / away — same perimeter
   sweep, corner-first start (C10), gate-line park (C8) and easy handoff (C9)
   — but the dog's top speed is `flankEasySpeedFrac` × `dogVMax` (**0.5**).
2. **D4** — left-down / right-down: exactly lie-down — same beam width
   (`lieConeDeg`), reach (`lieConeExt`) and postureRange ambient flanks — but
   the beam's center sits `downConeOffsetDeg` (**30°**) to the dog's own
   left / right of his facing (Q59: left = facing − 30° on the y-down canvas).

## Non-goals

- New entries in `COMMANDS` / new phases in the command state machine.
- Changing plain come-by/away/lie-down/easy/walk-on in any way.
- Levers for the new params (parked like the v9 cones, anchored at defaults).

## Design

**§0** — two tunables (Dog folder, lil-gui): `flankEasySpeedFrac` 0.5
(0.1–1 × dogVMax) and `downConeOffsetDeg` 30 (0–90°); both registered in
`LEVER_NOT_LEVERED.parked`.

**§1 dog state** — `flankEasy` (bool) and `lieSide` (−1 | 0 | +1), set by
`setCommand(cmd, opts)` from `opts.easy` / `opts.side` and cleared on every
other command; the C9 handoff clears `flankEasy` as it converts to easy.

**§1 steering** — the flank case computes `flankV = flankEasy ?
dogVMax × flankEasySpeedFrac : dogVMax`; the arrive-seek `vmax` uses it, and
the flank-point advance cap scales with it so the point cannot lap the slowed
dog (the same reasoning as the P5 cap).

**§1 flee()** — the eye direction becomes
`eyeDir = facing + lieSide × downConeOffsetDeg` (radians); `cosT` is measured
against `eyeDir`. `lieSide` is 0 outside lie-down, so every other profile is
bit-identical.

**§2** — drawEye's wedge centers on the same `eyeDir`, so the drawn contour
*is* the sim contour; the HUD `cmd` line tags variants (`·easy`, `·left`,
`·right`); capture ⎘ emits `flankEasy` / `lieSide` when set.

## Constraints

- §1 stays DOM-free; all tunables in §0 with lil-gui bindings.
- Boot ownership assertion stays green (new keys parked, no key unclaimed).
- Defaults file gains both keys; root `index.html` / `sheep-defaults.json.js`
  copies stay in sync with `poc/`.

## Acceptance criteria

7. A come-easy flank's measured top speed ≈ `dogVMax` × 0.5 (± arrive-seek
   easing); a plain come-by's ≈ `dogVMax`. Away-easy mirrors.
8. A come-easy flank parks on the gate line and hands off to easy (C9) like
   come-by; after handoff `flankEasy` is clear.
9. Left-down: probing `flee()` around a posed dog, threat is ~half-strength at
   facing −30°±`lieConeDeg`/2 edges and max near facing −30°; at facing +30°
   it is near zero. Right-down mirrors. Plain lie-down stays centered.
10. Plain-command regression: walk-on / easy / come-by numbers match v9.
11. Boot: ownership assertion OK (…= 158 schema keys), zero console errors.

## Acceptance log — 2026-08-24

Harness: whole script under the Proxy DOM/lil-gui stub (scratchpad
`harness-v10.js`), threat probed at 0.9 R_flee around a posed dog
(facing 0), speeds measured over the live sweep.

| # | check | measured | verdict |
|---|---|---|---|
| 7 | come-easy top speed | plain 110 px/s (= dogVMax) · gentle 55 px/s (= 0.5×), seeds 7/42/1337; away-easy 55.0 | **PASS** |
| 8 | gentle handoff | seed 7: come-easy → easy at 32.3 s, `flankEasy` false after | **PASS** |
| 9 | beam swing | plain peak at 0° (0.170), left peak at −30° (0.170, +30° = 0.000), right mirror exactly | **PASS** |
| 10 | plain regression | plain lie-down contour identical shape/values to v9 (0.170 / 0.115 / 0.034 / 0.004); plain flank 110 px/s | **PASS** |
| 11 | boot | `anchor 94/94 exact · ownership 94 levered + 64 not-levered = 158 schema keys · OK`, 0 errors/warns; other-command clears verified | **PASS** |
