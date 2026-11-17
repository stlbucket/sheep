# Field objectives (FO1–FO6)

**Status:** implemented 2026-11-16 (owner `file://` eyeball pending) — Q81–Q85 answered by the owner the same day; acceptance measured PASS ([log](#acceptance-log--2026-11-16)). Depends on [scoring.md](./scoring.md): everything here only adds scoring events to the count-up total.

Today the only thing to aim at is the pen gate. This spec puts optional things to go for out in the pasture: **drive gates** borrowed from real sheepdog trials, and a few **special sheep** worth more than the rest. Both create route and priority decisions without adding any way to lose points.

## Goals

1. A course can offer bonus points on the way to the pen, and ignoring them costs nothing.
2. Special sheep are recognizable at a glance on all three pages.
3. The same seed still lays out the same gate, flock and obstacles as before.

## Non-goals

- A fixed trials course (outrun, lift, fetch, drive, shed in order). Drive gates here are free-standing extras.
- Shedding (only marked sheep count). Parked for a later version.
- New dog commands.

## Semantic rules (what it must look like)

### FO — field objectives

- **FO1 — drive gates.** A course may carry **zero, one or two drive gates**: a pair of short hurdle panels with a gap between them, standing in open pasture. They are never in the pen gate's approach, against the fence, inside an obstacle or on a sheep's starting spot.
- **FO2 — through the gap scores.** Each sheep that passes **through the gap** of a drive gate adds **100 points**, once per sheep per gate, in either direction (owner Q82), with a pop at the gate. When **every sheep still being worked** has gone through the same gate, that gate pays a **bonus** and visibly changes (flag down, colour change) to show it is done.
- **FO3 — hurdles are solid.** Sheep and dog go round the panels, exactly as they go round a rock. A gate never traps a sheep.
- **FO4 — golden ewe.** Some courses have one **golden ewe**. She behaves like any other sheep and is worth **five times** an ordinary sheep through the pen gate. Calm still doubles her and the stream multiplier still applies (owner Q81), so a calm golden ewe at ×3 pays 3000.
- **FO5 — lamb and mother.** Some courses have a **lamb** that stays close to one particular ewe and follows her when she moves. If the lamb goes through the pen gate **right behind its mother**, the lamb is worth **three times** an ordinary sheep; otherwise it scores as an ordinary sheep.
- **FO6 — stubborn ram.** Some courses have one **ram**: bigger, slower to move off the dog and quicker to stop. Pressed too close, he **turns to face the dog and stands his ground** until the dog backs off or lies down (owner Q84); the rest of the flock may leave him behind. He is worth **three times** an ordinary sheep through the pen gate.

*(room to grow)*

## Force-model mapping (the how)

- **Drive gates** live in `sim.driveGates` as `{ x, y, angle, width, done, passed:Set }`. They are placed by a `placeDriveGates` step with **its own PRNG stream** derived from the seed, after obstacles, using the obstacle placement rejection tests plus a clearance from every obstacle group.
- **Panels** are added to the solid set as short capsules (or a row of small discs) so `obstacleForce`, `pushOut` and `dogDetour` handle them with no new steering code. Panels do **not** give cover from the dog.
- **Crossing test:** a sheep scores when its position crosses the gap segment between the two inner panel ends between one step and the next.
- **Specials** are a `s.kind` field (`ewe`, `golden`, `lamb`, `ram`), assigned at spawn from the specials PRNG stream. A per-kind **multiplier** on the base points (`penPoints` or `penCalmPoints`) is applied at the pen crossing, before the stream multiplier.
- **Lamb:** `s.mother` is the index of its ewe; the lamb gets an extra attraction toward her (`lambFollow`) and spawns beside her. "Right behind" means crossing within `comboWindow` after her.
- **Ram:** per-sheep multipliers on existing terms (`ramFleeScale` on the flee force, `ramSpeedScale` on top speed), plus a **stand** state: when the dog is inside `ramStandDist` and still advancing, the ram stops, faces him and ignores the flee force; it clears when the dog is beyond `ramStandRelease` or has been lying down for `ramStandWait`.
- **Rendering:** each page draws drive gates and gives the three special kinds a distinct look (colour and size in 2D; tint and scale in three.js).
- **Controls:** a `drive gates` count on the Course panel, random per course by default like obstacles, and a `specials` toggle.

## Tunables

New category **Objectives**.

| Key | Default | What it does |
|---|---|---|
| `driveGateMax` | 2 | Most drive gates a course can draw |
| `driveGateChance` | 0.5 | Chance each possible gate is present |
| `driveGateWidth` | 90 px | Gap between the panels |
| `driveGatePanel` | 50 px | Length of each panel |
| `driveGatePoints` | 100 | Points per sheep through the gap |
| `driveGateBonus` | 500 | Bonus when the whole working flock has been through |
| `specials` | on | Whether special sheep appear at all |
| `goldenChance` / `goldenMult` | 0.35 / 5 | Golden ewe frequency and worth (× an ordinary sheep) |
| `lambChance` / `lambMult` | 0.35 / 3 | Lamb frequency and worth when behind its mother |
| `lambFollow` | 1.5 | Strength of the lamb's pull toward its mother |
| `ramChance` / `ramMult` | 0.25 / 3 | Ram frequency and worth |
| `ramFleeScale` / `ramSpeedScale` | 0.6 / 0.85 | How much less the ram yields, and how much slower he is |
| `ramStandDist` / `ramStandRelease` | 60 / 110 px | Dog distance at which the ram stands, and at which he gives way again |
| `ramStandWait` | 2 s | How long the dog must lie down before a standing ram gives way |

## Constraints

- **§1 stays DOM-free**; kinds and gates are plain data, each page decides how they look.
- **PRNG discipline:** objectives never draw from `this.rng`, so with `driveGateMax` 0 and `specials` off a seed replays exactly as in POC-v13.
- **No magic numbers**; every key gets a lil-gui binding.
- All three pages stay runnable from `file://` with zero console errors.

## Acceptance criteria

1. With `driveGateMax` 0 and `specials` off, a headless run of a fixed seed matches POC-v13 position for position.
2. Over 200 seeds, no drive gate overlaps the fence, an obstacle, the pen gate approach or a spawn position.
3. A sheep walked through a gap scores `driveGatePoints` once; walking it through again scores nothing.
4. When the last working sheep passes a gate, `driveGateBonus` is added once and the gate renders as done.
5. No sheep or dog position is ever inside a panel.
6. A golden ewe penned alone and stressed adds 500; penned calm at ×2 she adds 2000.
7. A lamb left alone stays within a short distance of its mother over 30 s of grazing.
8. A lamb crossing stressed within the window after its mother scores 300 before the stream multiplier; crossing alone it scores as an ordinary sheep.
9. At the same dog distance the ram moves off later and more slowly than an ordinary sheep; with the dog walked inside `ramStandDist` he stops and faces the dog, and moves off again once the dog retreats past `ramStandRelease`.
10. Each special kind is visibly distinct on the 2D, 3D and 3D-assault pages.

## Q81–Q85 — asked and answered by the owner, 2026-11-16

- **Q81 — how special points combine:** the special's worth **stacks with everything** — it multiplies the base, calm doubles it, the stream multiplier applies.
- **Q82 — drive gate direction:** **either way** counts.
- **Q83 — how often specials appear:** each kind **rolls independently**, at most one of each per course.
- **Q84 — ram behavior:** harder to move, and he **also faces the dog** when pressed too close.
- **Q85 — wave mode:** **specials only**, re-rolled each wave; **no drive gates** in wave mode ([replay-modes.md](./replay-modes.md) RM5).

## Open questions

Nothing parked. Chances, worths and the ram's distances are proposals until a `/sheep tune` pass.

## Built differently from the draft

- **Drive gates are placed after the flock**, on their own stream, and reject any spot within a sheep-and-a-half of a starting sheep. That is what keeps goal 3 true with gates on: a seed's gate, obstacles and flock are unchanged.
- **Panels are rows of small `hurdle` discs** appended to `sim.obstacles`. `coverBetween` skips them and `obstacleItems` returns nothing for them, so they hide nothing and are never drawn as trees.
- **No separate drive-gate slider.** `driveGateMax` (0–4) and `driveGateChance` in the Objectives folder do the job.
- **A penned mother pulls her lamb to the gate**, so the lamb follows her in on its own if nothing stops it.
- **A gate that is done turns green** on all three pages; the 2D page also shows how many sheep have been through.

## Acceptance log — 2026-11-16

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | gates 0 + specials off replays POC-v13 | 3 seeds × 40 s × 40 sheep against the pre-v14 library: max deviation 0 px | PASS |
| — | goal 3: same layout with both on | 4 seeds: gate, obstacles and every sheep's start identical | PASS |
| 2 | 200 seeds, no bad placement | 209 gates on 158 seeds, 0 violations | PASS |
| 3 | through the gap scores once | 100, then nothing; outside the gap nothing | PASS |
| 4 | bonus once, gate done | 4 × 100 + 500; in the pages 40 × 100 + 500 and the gate redraws green | PASS |
| 5 | nothing inside a panel | closest sheep or dog edge distance 12 px over 6 driven courses | PASS |
| 6 | golden: 500 stressed, 2000 calm at ×2 | 500 / 2000 | PASS |
| 7 | lamb stays near its mother | max 18 px over 30 s (limit 60) | PASS |
| 8 | lamb behind mother 300, alone 100 | `LAMB +300 ×2` / 100 | PASS |
| 9 | ram yields less, stands, releases | stress ×0.6; stands and faces the dog inside 60 px; gives way past 110 px or after a 2.0 s lie-down; worth 300 | PASS |
| 10 | specials distinct on every page | screenshots of seed 31 on 2D / 3D / assault | PASS (eyeballed) |
| — | Q83 independent rolls | 400 seeds: golden 34 %, lamb 35 %, ram 27 %, never two of a kind | PASS |

Not measured: the ram's lower top speed in a live drive (the `ramSpeedScale` cap is a one-line clamp).
