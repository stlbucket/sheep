# POC-v7 · Feature: Gate Draw — the column through the mouth

**Owner's notes (2026-08-22):** "add a gate-attraction-radius that attracts
sheep toward the gate once they are within this distance. this attraction
will affect other sheep that are in close proximity such that they will move
in a column through the gate. this radius should be about 2/3 that of the
current dog-intimidation radius."

## Summary

Until v6 the only thing that got a sheep *through* the gate was pressure
from behind plus G1's last-body-lengths commitment — so a driven flock
arrived at the posts as a **wall**, pressed, and leaked through one at a
time (or not at all: v6 penned 0/80 and 23/80 on the anchor seeds under a
plain come-by → walk-on). This version adds a **draw**: inside
`gateAttractR` the mouth pulls a sheep in, and a sheep pulled in pulls its
near neighbors after it — a chain that reads as the flock **filing through
in a column**.

## Semantic rules

Continues group **G** (gate) from [POC-v3 G1](../POC-v3/course-and-flock.md).

### G. Gate (continued)

- **G2 — the draw.** A sheep within **`gateAttractR`** (**80 px**, ≈ ⅔ of
  `R_flee`) of the gate mouth is **drawn toward it** — whatever the dog is
  doing, and whether the sheep was grazing or not. The pull fades in over
  the outer half of the radius and is full inside 40 px. A drawn sheep is
  **alert** (it does not graze its way through).
- **G3 — the column.** A sheep in **close proximity** (**`gateFollowR`**,
  30 px) to a sheep that is being drawn is **drawn after it** — it steers
  at *that sheep*, not the mouth, at `gateFollowDecay` (0.6) of its lead's
  pull; and so on down the line, dying out below 0.02. The flock therefore
  reaches the mouth as a **line**, not a wall: the lateral spread of sheep
  inside 60 px of the gate reads as a **single file**, not the full gate
  width.
- **G4 — the dog still rules.** The draw is weaker than the dog's threat
  (`w_gateAttract` 1.2 < `w_flee` 2): a dog working the mouth can still
  pull a sheep off it; G1's commitment and its 1.5 × leash are unchanged.

*(room to grow)*

## Design notes

- One force, `fGate = w_gateAttract · pull · unit(target − pos)`, summed
  with the others in `integrate()`. `pull` is the direct draw
  (`smoothstep(R, R/2, dist)`) or, if larger, the best neighbor's
  **last-tick** pull × decay — one hop per tick, so the column is
  index-order-free and grows ~60 ticks/s.
- The draw counts as arousal for the B1/B2 idle machine (`stress > 0 ||
  gatePull > 0`), so drawn sheep move at alert speed and re-idle only
  `calmDelay` after the draw ends.
- `capture ⎘` carries `gatePull` + `lead` per drawn sheep, so a column can
  be discussed by index.

## Tunables

**New (Gate + Crush, all levered by Gate):** `gateAttractR` (**80 px**,
0–240 · 5; 0 = off), `w_gateAttract` (**1.2**, 0–4 · 0.1), `gateFollowR`
(**30 px**, 10–80 · 2), `gateFollowDecay` (**0.6**, 0–1 · 0.05).
`debug.gateZone` also draws the draw radius (fainter, longer dash) outside
the G1 zone.

## Acceptance criteria (measured headless per the no-webserver rule)

1. **G2 — direct draw.** A 24-sheep blob parked 110 px inside the mouth
   with a walk-on dog 70 px behind it is **all penned within 15 s**.
2. **G3 — column.** In that same test the mean lateral offset of sheep
   inside 60 px of the gate is **< ½ the gate half-width** (< 10.5 px),
   and the follow chain is **≥ 3 deep** at some tick.
3. **G4 — no harm.** No injuries; peak crush stays **below**
   `crushThreshold` (1.5) across the anchor runs.
4. **Idle unchanged.** With no command for 15 s the flock digest is
   **byte-identical** to v6 (nothing spawns inside the draw).
5. **The real flow.** come-by → handoff → walk-on on the anchor seeds pens
   **more** than v6 did.

## Acceptance log — 2026-08-22 (seeds 1337 & 42, regression anchor, v6 build side by side)

Harness: whole script under the Proxy DOM/lil-gui stub; forced
`beside-gate`, `spawnGateClear` 0, `randomSeedOnLoad` off, levers 0.5;
v6 = the root `index.html` mirror before copying.

| # | check | v7 | v6 | verdict |
|---|---|---|---|---|
| 1 | blob 24 @ 110 px, walk-on | **24/24** by 10 s (first through 1.5 s / 1.0 s) | 9/24 and 0/24 at 60 s | **PASS** |
| 2 | lateral spread inside 60 px | **4.8 / 4.9 px** mean; chain ≤ 6, followers ≤ 23 | 17.4 / 26.6 px (a wall) | **PASS** |
| 3 | injuries / peak crush | 0 / **0.2–1.3** (< 1.5) over every run | 0 / 0–0.7 | **PASS** |
| 4 | idle 15 s digest | **IDENTICAL** both seeds; 0 sheep ever inside 80 px; 0 drawn ticks | — | **PASS** |
| 5 | come-by → easy → walk-on, 120 s | **80/80 won** at 120 s (1337, first through 50 s) and **90 s** (42, first through 19.5 s); drawn ≤ 61, chain ≤ 9–10, lateral 28–30 px (the whole flock arriving, with stragglers pulled in at the end) | **0/80** and **23/80** | **PASS** |

Boot: `[levers] anchor 95/95 exact · ownership 95 levered + 41 not-levered
= 136 schema keys · OK`. Before the 0.02 floor the chain ran to 15 deep
with pulls of 0.6¹⁵ keeping sheep needlessly alert; with it both seeds win
and the chain tops out at 10.
