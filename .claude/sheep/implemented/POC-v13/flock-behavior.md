# Flock behavior — POC-v13 (trot turn, trot wind-down, gate cone)

Status: **implemented** 2026-11-16. Extends [POC-v9 flock-behavior](../POC-v9/flock-behavior.md) (T1–T4) and [POC-v7 gate-attraction](../POC-v7/gate-attraction.md) (G1–G4). Code: `updateTrot`, `updateGateCone` and `integrate` in `web/lib/sheep-sim.js`; overlays in the three pages.

## Rules

| ID | Rule (what it must look like) |
|---|---|
| **T5** | When the dog **ends or reverses a live flank sweep** beside a collected group he is pressing — he parks, lies down, turns back, or goes to walk-on / easy — the group, **standing or not**, is likely to **stream off at a trot away from him**: the front few go first and the rest file in behind. A recall to heel does not do this. |
| **T6** | A trot **does not last**: each sheep trots for a few seconds at most, pressure or not, and once it has dropped out it **cannot be pulled straight back in** by the sheep still trotting around it. A trot covers a fraction of the field, never the whole of it. |
| **T7** | An unpressured sheep leaving the trot **eases down through a walk to a stand** along the line it was on, then goes back to grazing after the usual calm delay. Felt pressure or a fence cancels the walk. |
| **G5** | While a trotting line's **leaders are heading gate-ward**, the gate's draw area **grows a cone** from the mouth along the axis toward them, and shrinks back when there are none. The cone never grows past the leaders, and **grazing sheep never feel it**. A trot lead that the gate is drawing bends its line into the mouth. |

| **T8** | A trot only starts in a group the dog is **actually working**: a real share of it must be properly pressed, not one sheep on the faint edge of his eye. Only sheep of **that group** file in behind, and a **grazing sheep is never swept in** — a group across the field does not trot off because the dog walked on somewhere else. Applies to T1 and T5. |

T3's fence stop is unchanged and still drops the trot outright (now also starting the T6 rest).

## New keys

| Key | Label | Default | Rule |
|---|---|---|---|
| `trotPressMin` | trot pressure level | 0.1 | T8 |
| `trotPressFrac` | trot pressed share | 0.25 | T8 |
| `trotTurnWindow` | trot turn window | 1.5 s | T5 |
| `trotTurnProb` | trot turn chance | 0.9 /s | T5 |
| `trotMaxDur` | trot time limit | 4 s | T6 |
| `trotRest` | trot rest | 6 s | T6 |
| `trotWindDown` | trot wind-down | 3 s | T7 |
| `gateConeGrow` | gate cone growth | 60 px/s | G5 |
| `gateConeDeg` | gate cone width | 50° | G5 |
| `gateConeMax` | gate cone reach | 220 px | G5 |

Setting `trotTurnWindow`, `trotMaxDur`, `trotRest`, `trotWindDown` and `gateConeGrow` to 0 restores the v12 mechanisms, except T8's follower rule (same group, not grazing), which has no switch.

## Changed defaults

| Key | Old → new | Why |
|---|---|---|
| `trotGroupMin` | 20 → 12 | "a sizable group" — a collected dozen can stream off |
| `trotLeadCount` | 3 → 5 | a broader front to the stream |
| `trotFollowR` | 40 → 56 | stragglers follow from further back |
| `trotSpeedMult` | 1.15 → 1.05 | "a slow trot" |
| `trotDecayMin` | 0.2 → 0.35 | fades sooner once clear of the dog |
| `trotDecayRamp` | 5 → 3 s | same |
| `calmDelay` | 5 → 3 s | back to grazing sooner (Restlessness anchor `[12, 3, 1.5]`) |
| `w_align` | 0.2 → 0.3 | the group lines up behind its leaders instead of flattening (Cohesion anchor `[0.08, 0.3, 0.5]`) |
| `panicThreshold` | 0.6 → 0.7 | less panic sprinting (Nerve anchor `[0.9, 0.7, 0.4]`) |
| `panicMult` | 1.6 → 1.4 | a slower sprint (Nerve anchor `[1.2, 1.4, 2]`) |
| `perimeterMargin` | 36 → 44 | owner 2026-11-16: sheep too stressed with the dog near, "back him off a few pixels"; mean stress of pressed sheep during flanks 0.210 → 0.175 over 8 seeds (Standoff anchor `[24, 44, 64]`) |
| `gateAttractR` | 80 → 100 | "a little further" (Gate anchor `[140, 100, 60]`) |

Left alone, though proposed: `trotAlignMin`, `trotMoveSpeed`, `trotTriggerProb`. T5 does the job at the turn, and loosening the general T1 trigger as well would have made trots more common everywhere, against T6's intent.

## Acceptance log — 2026-11-16

Headless against `web/lib/sheep-sim.js` (plain node `vm`, shipped defaults), 8 seeds × 90 s, scripted come-by → walk-on → away → walk-on → lie-down → walk-on. "v12 values" = the same script with the new mechanisms off and the old defaults restored.

| Check | v12 values | v13 | Result |
|---|---|---|---|
| T5 — trots starting inside a turn window | 0 in 8 seeds | 15–48 sheep in 5 of 8 seeds (seeds 1 and 2 never get a group pressed enough; seed 4 trots outside the window) | PASS |
| T6 — longest single trot | 12.07 s / 488 px | 4.00 s / 265 px | PASS |
| T8 — trot starts more than 200 px from the dog (10 seeds × 40 s, flank → walk-on twice) | 47 of 805 starts, furthest 446 px | 0 of 320 starts, furthest 200 px | PASS |
| G5 — cone grows with gate-ward leaders | n/a | grew in 6 seeds, to the 220 px cap in 2 | PASS |
| Lever assertion | — | `anchor 100/100 exact · 184 schema keys · OK` | PASS |
| Pages — `2d`, `3d`, `3d-assault` load from `file://` in headless Chrome, sim stepped | — | zero console errors or warnings; cone overlay seen in 3D | PASS |

History: the first build the same day had no T8. The owner saw groups across the field start trotting when the dog walked on and reverted it; T8 is the fix, and the numbers above are from the rebuilt version.

Not measured: T7 has no numeric check — it was built and runs clean, but the walk-then-graze look is for the owner's eye. The scoring anchors of earlier versions (win rates) were not re-run against the new defaults.

## Open questions (parked — default in bold)

- **Q71** — Should a panic sprint count as a "fast trot" for the gate cone? **No — only trot leads grow it**; a panic is per-tick and has no line.
- **Q72** — Must the leaders be heading gate-ward for the cone to grow? **Yes** — a column trotting away is not reeled back.
- **Q73** — Should grazing sheep inside the cone be drawn? **No** — only alert / trotting sheep feel the extra reach.
- **Q74** — Loosen the general T1 trigger as well (`trotAlignMin` 0.3, `trotMoveSpeed` 10, `trotTriggerProb` 0.5)? **No** — see "Left alone" above.
