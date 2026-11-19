# Bulls — a wandering obstacle

**Status:** implemented 2026-11-18. Acceptance measured PASS ([log](#acceptance-log--2026-11-18)). Owner `file://` check pending. Q111–Q117 parked on their bolded defaults.

A new obstacle type from one owner note (2026-11-18): "0-3 large black bulls might be wandering any given field. the sheep react as if it is a rock, but with a little wider berth. the bull just does it's thing. it isn't affected by the dog." Until now everything in the field that was not a sheep stood still. A bull is the first obstacle that moves, so a lane that was open a minute ago may not be, and a flock parked beside a bull gets shuffled along.

## Goals

1. Any pasture can have 0–3 bulls on it, drawn large and black on every page.
2. To a sheep a bull is a rock with a little more room round it.
3. The bull wanders on his own. The dog, the sheep and the wolves change nothing about where he goes.
4. Turning bulls off (`bullMax` 0) leaves the sim exactly as it was before bulls, and turning them on does not move a seed's gate, obstacles, flock or drive gates.

## Non-goals (this version)

- No bull behaviour toward anything: he does not charge, chase, scare or injure.
- No scoring for or against bulls, and no change to the reference run or par.
- No bulls on the competition course.
- No slider beside the dog pad. The dials live in the levers panel.

## Rules (B)

| Rule | What you see |
|---|---|
| **B1** | A pasture has 0–3 bulls. Each of `bullMax` (3) slots holds a bull with `bullChance` (0.4), so about 1 field in 5 has none and about 1 in 15 has three. Wave mode lays new bulls with each wave. A competition course never has one. |
| **B2** | A bull is large (a solid disc of radius `bullRadius` 17 px, drawn about 34 px long beside a 12 px sheep) and black, with cream horns. He starts clear of the fence, the pen approach, the handler's post, the stands and rocks, the drive gates, the other bulls and every sheep. |
| **B3** | Sheep treat him as a rock with a wider berth: they push off him and sidestep him from `bullBerth` (14 px) further out than they would a rock, a group parts round him, and he is solid. |
| **B4** | He does his own thing: stands grazing for `bullGrazeMin`–`bullGrazeMax` (3–10 s), then ambles at `bullSpeed` (16 px/s) to another spot, turning at `bullTurnRate` and striding out only once he faces it. He goes round stands and rocks, stays off the pen approach and the handler's post, and always leaves a lane between himself and the fence. |
| **B5** | Nothing affects him. The dog working the field, the flock, a mortar blast: his path is the same with or without them. Anything in his way is moved aside (he is solid to the sheep and the dog; they are not solid to him). |
| **B6** | The dog treats him as a rock too: goes round him, and cannot work sheep through him (cover, as a rock gives). |

## Design

- Bulls live in their own list, `sim.bulls`, not `sim.obstacles`. Each is `{ x, y, r, kind: 'bull', heading, vx, vy, state: 'graze' | 'walk', … }`. `sim.solids()` is the union the four existing loops walk (`pushOut`, `obstacleForce`, `coverBetween`, `dogDetour`); with no bulls it returns `sim.obstacles` itself, so those loops do what they did.
- Keeping them out of `sim.obstacles` means the obstacles-or-gates rule (EX1), the pages' static obstacle art, the `obstacles` slider readout and the assault's rock blast shield never see a bull.
- `obstacleForce` adds `bullBerth` to both `r_obstacle` and `obstacleLook` for a bull. That is the whole "wider berth".
- `placeBulls(seed)` runs after the flock and the drive gates and draws from its own PRNG stream. `stepBulls(dt)` runs first in `step()` and draws from a second stream of its own. It reads no dog and no sheep state, which is what makes B5 true by construction.
- A walk target is accepted only if the straight line to it clears the static obstacles, the pen approach and the handler's post. A bull that cannot find one keeps grazing and looks again. A walk that takes more than twice its expected time is abandoned.
- Rendering: `drawBulls()` on `web/2d.html` (top-down body, head, horns, tail, collision disc as a faint shadow). `buildBull()` / `updateBulls()` on the three 3D pages (box-and-icosahedron bull scaled to his radius, head down while grazing, legs swinging while he walks). The competition page carries the same code and never has a bull to draw.

## Constraints

- §1 SIM stays DOM-free: everything is in `web/lib/sheep-sim.js`, which still loads in plain node.
- All tunables are in §0: eight new keys in the `Obstacles` category, with lil-gui bindings generated from the schema, and matching entries in `web/sheep-defaults.json.js`.
- PRNG-stream discipline: bulls never draw from `this.rng`.
- The golden replay (`SC-18`) is unchanged; the test helpers pin `bullMax: 0` and the bull checks ask for bulls explicitly.

## New keys

| Key | Default | Meaning |
|---|---|---|
| `bullMax` | 3 | most bulls a pasture can have (0 = none) |
| `bullChance` | 0.4 | chance each slot holds a bull |
| `bullRadius` | 17 px | his solid disc |
| `bullBerth` | 14 px | extra room sheep give him over a rock |
| `bullSpeed` | 16 px/s | his amble |
| `bullTurnRate` | 1.2 rad/s | how fast he swings round |
| `bullGrazeMin` | 3 s | shortest graze |
| `bullGrazeMax` | 10 s | longest graze |

All eight are anchored (no lever moves them) until a `/sheep tune` pass.

## Acceptance criteria

1. Over many seeds at the page settings every bull count from 0 to 3 occurs and none exceeds 3; every bull starts clear of the fence lane, the pen approach, the obstacles, the flock and the other bulls. (`B-1`)
2. The same seed lays the same gate, obstacles and flock with bulls on or off; a competition course never has a bull. (`B-2`)
3. A bull pushes a sheep off and is sidestepped from further out than a rock of the same size, pushes harder at the same distance, and is solid. (`B-3`)
4. With the dog working the field for 90 s and with him at heel for 90 s, every bull ends in exactly the same place. (`B-4`)
5. Bulls move, stay inside the fence lane and off the pen approach, never stand in a stand or rock, and no sheep or dog is ever inside one. (`B-5`)
6. A field with bulls is still workable: the demo handler pens 30 sheep with every bull slot filled. (`B-6`)
7. On every page bulls appear at the defaults without marking the run "tuned", are drawn, wander while the page runs, and the console stays clean. (`B-p1`, `B-p2`, `errors-bulls`)
8. Every check that passed before still passes, including the golden replay.

## Acceptance log — 2026-11-18

Sim suite `npm test`: 77/77.

| Check | Result |
|---|---|
| `B-1` | 600 pastures: 0 / 1 / 2 / 3 bulls on 123 / 270 / 171 / 36 fields, 0 placement violations |
| `B-2` | 0 of 200 courses moved; 0 competition courses with a bull |
| `B-3` | push at 29 px: rock 0.00, bull 0.10 · sidestep at 77 px: rock 0.00, bull 0.02 · at 10 px: rock 0.57, bull 0.81 |
| `B-4` | 12 bulls over 4 seeds, identical positions and headings with and without a working dog |
| `B-5` | 12 of 12 moved more than 20 px in 90 s; 0 out of range; 0 overlaps |
| `B-6` | demo handler, 30 sheep, 3 bulls: won in 19 s · 33 s · 29 s |
| `SC-18` | golden replay unchanged |

Page suite `npm run test:pages`: 127/127. On `2d.html`, `3d.html` and `3d-assault.html`: bulls turn up over 60 courses at the defaults without marking the page "tuned", three bulls are on the page with every slot filled and they wander, zero console errors. On `3d-competition.html`: no bull in 60 courses, zero console errors.

## Open questions (parked — default in bold)

- **Q111** How often? **Each of 3 slots at 40 %** (none on 1 field in 5, three on 1 in 15), or a flat 0–3, or rarer.
- **Q112** Does a bull hide sheep from the dog the way a rock does? **Yes, cover as a rock** (the note says sheep react to him as a rock), or solid but see-through.
- **Q113** Bulls on the competition course? **No, it stays a clean field**, or yes.
- **Q114** Does a field with bulls still get drive gates on the 2D page? **Yes, bulls do not count as obstacles for the obstacles-or-gates rule**, or no gates on a field with a bull.
- **Q115** In the assault, does a bull shield sheep from a blast, or react to one? **Neither: only rocks shield, and nothing moves the bull**.
- **Q116** A quick control for bulls beside the dog pad, like the `obstacles` slider? **No, levers panel only**.
- **Q117** Should a bull ever do more than wander (snort and scatter sheep that crowd him, charge the dog)? **No, he is a moving rock** for now.
