# Field objectives II (FO7–FO12)

**Status:** implemented 2026-11-17 (owner `file://` eyeball pending) — built from the owner's interview answers on the bolded defaults of Q99–Q102; acceptance measured PASS ([log](#acceptance-log--2026-11-17)). Depends on [scoring.md](./scoring.md).

[POC-v14 field objectives](../POC-v14/field-objectives.md) put drive gates and three special sheep in the pasture, each paying a flat amount. The owner asked for three changes: drive gates should **feed the multiplier** so the long way round is a real choice, there should be **more kinds of special sheep**, and each course should state **one or two side objectives**.

## Goals

1. Taking the flock through a drive gate changes the rest of the run, not just the total by a few hundred.
2. Three new specials, each recognizable at a glance and each changing how the flock handles.
3. Every course opens by stating something specific to try for.
4. The same seed still lays out the same gate, flock, obstacles, drive gates and v14 specials as before.

## Non-goals

- Changing the golden ewe, lamb or ram (the "specials with conditions" option was not chosen).
- A fixed trials course, shedding, new dog commands.

## Semantic rules (what it must look like)

FO1–FO6 stand, except that FO2's flat whole-flock bonus is replaced by FO7.

### FO — field objectives (continued)

- **FO7 — gates feed the multiplier.** When **every sheep still being worked** has gone through a drive gate, that gate is cleared and **the multiplier on every later crossing is one higher for the rest of the run**. Two cleared gates add two. The gate visibly changes and a banner announces it. Each sheep through the gap still scores a small amount on its own.
- **FO8 — black sheep.** Some courses have one **black sheep**. She is worth **twice** an ordinary sheep, and she is trouble: she startles sooner than the others, and **when she bolts the sheep near her bolt too**.
- **FO9 — bellwether.** Some courses have one **bellwether**, a ewe with a bell. **Sheep near her go where she goes** more readily than they follow each other. If she is the **first sheep through the pen gate** she is worth **three times** an ordinary sheep; otherwise she scores as one.
- **FO10 — skittish yearling.** Some courses have one **yearling**: smaller, and she **moves off the dog from much further away** than the flock does. Penned CALM or PERFECT she is worth **three times** an ordinary sheep; penned RUSHED she scores as one.
- **FO11 — side objectives.** Each course states **one or two side objectives** when it starts, chosen from the list below and only from those the course makes possible. They stay listed on screen, each marked the moment it is met or lost. **Each one met on a won run multiplies the run by ×1.25.**

  | Side objective | Possible when | Met when |
  |---|---|---|
  | **Save the best for last** | the course has a golden ewe | she is the last sheep penned |
  | **Lead them in** | the course has a bellwether | she is the first sheep penned |
  | **Through the gates** | the course has a drive gate | every drive gate is cleared |
  | **No rush** | always | no sheep is penned RUSHED |
  | **Long file** | always | a chain of at least half the flock |
  | **Few words** | always | won within the Quiet Hand allowance |
  | **On your feet** | always | won without a lie-down command |
  | **Spotless** | always | won with no strikes |

- **FO12 — collected.** Penning each kind of special and meeting each side objective is remembered between runs ([records.md](./records.md) RC3).

*(room to grow)*

## Force-model mapping (the how)

- **Gate multiplier (FO7):** `run.gateMult` starts at 0 and gains `driveGateMult` when a gate's `done` flips. A crossing's multiplier is `run.combo + run.gateMult` ([scoring.md](./scoring.md) SC15). `driveGateBonus` is removed; `driveGatePoints` stays, scaled to the new tiers.
- **New kinds:** `s.kind` gains `black`, `bell`, `yearling`, assigned by the specials PRNG stream **after** the three v14 rolls so existing seeds keep their golden ewe, lamb and ram.
- **Black sheep (FO8):** her own threat is scaled by `blackThreatScale` (she reaches the panic threshold sooner); while her `panic` flag is set, sheep within `blackSpookRadius` take an added threat of `blackSpookThreat`. This uses the existing panic path; no new steering term.
- **Bellwether (FO9):** neighbors within `bellRadius` weight her in alignment and cohesion by `bellWeight` instead of 1. She pays `bellMult` if `run.crossings === 0` at her crossing.
- **Yearling (FO10):** her flight distance is scaled by `yearlingFlightScale` and she is drawn at `yearlingSize`. She pays `yearlingMult` unless RUSHED.
- **Side objectives (FO11):** `sim.sideObjectives` is `[{ id, label, state: 'open' | 'met' | 'lost' }]`, rolled in `spawn()` from a third PRNG stream derived from the seed, `sideObjectiveCount` of them from the eligible pool. States update in `updateScore` and at the win; each `met` on a won run contributes `multSideObjective` to the end multipliers. A state change pushes an `objective` score event.
- **Wave mode:** new specials roll each wave like the v14 ones; no drive gates (owner Q85) and no side objectives (Q102).
- **Rendering:** each page gives the three new kinds a distinct look (black fleece; a bell and collar; small and leggy) and draws a cleared gate differently, as it does today.

## Tunables

Category **Objectives**. **Removed:** `driveGateBonus`.

| Key | Default | What it does |
|---|---|---|
| `driveGatePoints` | 50 | Points per sheep through the gap (was 100) |
| `driveGateMult` | 1 | Multiplier added per cleared gate |
| `blackChance` | 0.3 | Chance a course has a black sheep |
| `blackMult` | 2 | Her worth |
| `blackThreatScale` | 1.5 | How much more easily she startles |
| `blackSpookRadius` | 70 px | How far her panic spreads |
| `blackSpookThreat` | 0.6 | Threat added to sheep in that radius while she panics |
| `bellChance` | 0.3 | Chance a course has a bellwether |
| `bellMult` | 3 | Her worth when first through the gate |
| `bellRadius` | 120 px | How far her pull reaches |
| `bellWeight` | 4 | Her weight in a neighbor's alignment and cohesion |
| `yearlingChance` | 0.3 | Chance a course has a yearling |
| `yearlingMult` | 3 | Her worth when penned CALM or PERFECT |
| `yearlingFlightScale` | 1.6 | Her flight distance as a multiple of the flock's |
| `yearlingSize` | 0.8 | Her drawn size |
| `sideObjectiveCount` | 2 | Side objectives per course (0 switches them off) |
| `multSideObjective` | 1.25 | End multiplier per side objective met (retuned 2026-11-17, was 1.5) |

## Constraints

- **§1 stays DOM-free**; the start banner and the objective list are drawn by `web/lib/sheep-score-ui.js`.
- **No magic numbers**: every value above is a `SETTINGS` entry.
- **Seeds are stable**: with the three new chances at 0 and `sideObjectiveCount` at 0, a seed plays exactly as in v14.
- New specials change flock behavior on purpose; they are the only behavior change in this version, and each is off when its chance is 0.

## Acceptance criteria

1. With the new chances and `sideObjectiveCount` at 0, a fixed command script on a fixed seed gives the same sheep positions as v14 after 60 s.
2. Clearing one drive gate raises the multiplier of the next crossing by exactly 1 and of every crossing after it; clearing a second raises it by 2. `driveGateBonus` appears nowhere under `web/`.
3. Over 400 seeds each new kind appears at about its chance, never two of a kind, and the golden ewe, lamb and ram fall on the same sheep as in v14.
4. Forcing the black sheep into a panic raises the stress of sheep inside `blackSpookRadius` and not of sheep outside it; she pays twice an ordinary sheep of the same tier and condition.
5. Moving the bellwether alone draws sheep inside `bellRadius` after her measurably more than moving an ordinary ewe does; she pays ×3 as the first crossing and ×1 otherwise.
6. The yearling starts to move with the dog further away than any ordinary sheep does; she pays ×3 CALM or PERFECT and ×1 RUSHED.
7. A course never states a side objective it cannot offer (no golden ewe objective without a golden ewe, and so on), and states exactly `sideObjectiveCount` when enough are eligible.
8. Each side objective can be met and can be lost, flips state at the right moment, and multiplies a won run by 1.25 only when met.
9. All three pages show the start banner, the objective list, the three new kinds and a cleared gate, with zero console errors.

## Open questions (built on the bolded default — still the owner's to change)

- **Q99 — what a cleared gate does.** **Adds 1 to the multiplier for the rest of the run, and each sheep through the gap still pays 50** · adds 1 and the per-sheep points go away · doubles the multiplier instead of adding.
- **Q100 — which new specials.** **Black sheep, bellwether and skittish yearling, as above** · only the black sheep and the bellwether · a different set (name them).
- **Q101 — what a side objective pays.** **a multiplier on the run for each one met (×1.25 since the retune)** · a flat 5,000 each · ×2 for meeting both, nothing for one.
- **Q102 — side objectives in wave mode.** **None** · one per wave, paying on that wave's points.

## Built differently from the draft

- **The bellwether is drawn pale blue with a bell on the 2D page and pale blue and slightly larger on the 3D pages.** The 3D sheep are one instanced mesh, so a separate bell model was not added.
- **Spooked sheep move away from the black sheep**, not from the dog, when the dog is out of their reach; when he is in reach her spook adds to his pressure.
- **Side objectives that only a win can settle** (No rush, Few words, On your feet, Spotless) are marked met at the win; the others are met or lost the moment it happens. On a run that is not won, every objective still open is lost.
- **FO12** (collected between runs) is in [records.md](./records.md) RC3.

## Acceptance log — 2026-11-17

Headless node (`npm test`) for 1–8; headless Chrome on `file://` (`npm run test:pages`) for 9.

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | new things off → same sheep positions as v14 | the POC-v14 golden replay matches on three seeds; with everything on, a seed lays the same gate, obstacles and flock | PASS |
| 2 | a cleared gate raises every later crossing's multiplier by 1; a second by 2 | ×1 → ×2 → ×3; crossings 400 then 600; 50 per sheep still paid; `driveGateBonus` nowhere | PASS |
| 3 | 400 seeds: new kinds at about their chance, never two of a kind, v14 specials unmoved | black 29 %, bellwether 28 %, yearling 31 %; 0 duplicates; 0 moved | PASS |
| 4 | a panicking black sheep stresses sheep inside her radius only; pays ×2 | near 0.34, far 0; 400 vs 200; she feels 1.04 where a ewe feels 0.69 | PASS |
| 5 | sheep follow a moving bellwether more than an ordinary ewe; ×3 first, ×1 otherwise | 75.5 px vs 49.1 px in 3 s; 600 / 200 | PASS |
| 6 | the yearling moves off from further away; ×3 CALM, ×1 RUSHED | at 150 px she feels 0.123, a ewe 0; 600 / 50 | PASS |
| 7 | never an impossible objective; exactly two | 300 seeds: 0 violations, all eight kinds occur; none in wave mode | PASS |
| 8 | each objective can be met and lost, flips at the right moment, ×1.25 only when met | 8 of 8; No rush flips on the rushed crossing with one event | PASS |
| 9 | all three pages show the start banner, the list, the new kinds and a cleared gate | start banner and two listed objectives; six special kinds drawn; gate cleared, meter reads ×2; zero console errors | PASS ×3 |
