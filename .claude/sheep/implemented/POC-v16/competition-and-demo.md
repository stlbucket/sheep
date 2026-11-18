# POC-v16 — competition course, obstacles or gates, demo mode

Built 2026-11-18 straight from three owner messages, with no interview. Owner `file://` check pending. Check ids below are the ones in `test/sim.test.js` and `test/pages.test.js`.

## Obstacles or drive gates (EX)

- **EX1** A pasture course has obstacles or drive gates, never both. `placeDriveGates` lays none when the course drew any obstacle.
- **EX2** The 3D pastures (`web/3d.html`, `web/3d-assault.html`) never carry drive gates. Each page sets `params.driveGateMax = 0` before `lib/sheep-score-ui.js` loads, so the page is not "tuned".
- The 2D page keeps optional drive gates on courses that drew no obstacles.

## Competition course (CC)

`params.course = 'competition'` (set by `web/3d-competition.html`, with `sheepCount = 8`). Not available in wave mode.

- **CC1** A clean field: no obstacles, no special sheep, only drive gates.
- **CC2** 4–6 gates (`compGatesMin` / `compGatesMax`) on a required path: start → gate 1 → … → gate N → pen. Legs are at least `compLegMin`, no turn sharper than `compTurnMax`, no leg crosses another or runs through another gate. Own PRNG stream, so a seed's pen gate is where its pasture course has it. Each gate stands square to the leg that arrives at it.
- **CC3** Gates are taken in order and one way. Only the current gate counts a crossing. It is cleared when every sheep still being worked has been through it.
- **CC4** The pen is shut until the last gate is cleared: the mouth is fence, draws nobody, and a sheep cannot cross it.
- **CC5** The flock starts as one group at the head of the path.
- **CC6** The dog works toward the current objective (`sim.aim()`): the next gate, then the pen. Walk-on and easy drive at it and a flank ends on its line. Wide of the gate's line of approach, or after a miss, the aim is a spot square in front of the gate. On a pasture course `aim()` is the pen centre, unchanged.
- **CC7** The reference run counts the gates (their points and their multiplier on every crossing). Par adds the path length at half a walk.
- The page draws the path dashed on the grass, a number over each gate (amber = next, green tick = cleared) and a red bar across the pen while it is shut.

## Demo mode (DM)

`lib/sheep-auto.js` (`AutoHandler`, DOM-free) and `lib/sheep-demo-ui.js` (`DemoUI`). On `2d.html`, `3d.html` and `3d-competition.html`. Not on the assault page.

- **DM1** The handler only calls `sim.setCommand` with the pad's verbs. It never moves the dog or a sheep.
- **DM2** `demo ▶` beside reseed, or the A key, turns it on. The pad lights the dog's live command (as it always has), pulses when the command changes, and a line on the stage says what he is doing and why.
- **DM5** Until demo has been turned on once in this browser (`localStorage` `sheep.demoUsed.v1`, shared by every page), the button pulses blue every few seconds.
- **DM3** Any pad button, arrow key or ⏎ from the player turns demo off. Demo survives a reseed or replay.
- **DM4** A run the demo touched is never saved: no best, no history, no collection. The card says "demo run — not saved".
- **The plan** (first match wins): pen full → that'll do · flank running → let it run, cut it into the drive once square behind · strung out → gather with flanks to and fro · off the drive line → steering flank · panic → lie down a moment · at the open pen → easy, then lie down while they file in · otherwise walk on.

## Measured (2026-11-18, headless)

| Course | Runs | Penned the whole flock | Bust | Typical time |
|---|---|---|---|---|
| Competition, 8 sheep | 20 seeds | 20 | 0 | 50–85 s |
| Pasture, 80 sheep, page defaults | 20 seeds | 13 | 7 | 22–231 s |
| Pasture, 30 sheep, no obstacles | 3 seeds | 3 | 0 | 26–33 s |

Every pasture bust is three panic strikes. Nearly all of those panics happen while a flank squeezes the dog between the fence and sheep standing against it (dog about 15 px off the fence, sheep 30–45 px off it, threat 0.70–0.71 against a 0.7 panic threshold). A player hits the same thing. Not changed here, because it is dog physics and would move the golden replay.

## Open

- The "textbook run" is still only a reference score. The demo handler is competent, not optimal.
- Competition runs score far above 100 % of the reference (300–570 % in the demo), so the rank bands are generous there.
- No competition course on the 2D page.
