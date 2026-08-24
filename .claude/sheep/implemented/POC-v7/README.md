# POC-v7 — Spec Index

Seventh iteration of the sheep PoC. Started and **shipped 2026-08-22** from
one owner directive ("implement all of this without asking me any
questions"): a **gate draw** that files the flock through the mouth in a
column, and a **re-paced drive** (walk-on at the sheep's own speed, easy at
half) whose eye cone reaches **50 % further**. Predecessor
[POC-v6](../POC-v6/README.md) shipped the same day.

Built straight from the notes — no plan phases; two specs, one headless
acceptance pass against the v6 build side by side. Snapshot
[`poc/params-2026-08-22-v7.json`](../../poc/params-2026-08-22-v7.json)
differs from v6's by **six new keys + one changed value** (`easySpeedFrac`
0.33 → **0.5**). The owner's `file://` eyeball is **pending** (as v4–v6
shipped).

**This is a behavior version.** It changes how sheep get through the gate
(they are *drawn*, not only pushed) and how fast the driving dog moves. The
levers' 0.5 anchor stays exact (`anchor 95/95 · 95 levered + 41
not-levered = 136 schema keys · OK`).

## Features

| Feature | Spec | Status |
|---|---|---|
| Gate draw — sheep within a radius of the mouth are drawn to it; sheep in close proximity to a drawn sheep are drawn after it → a column through the gate (G2–G4) | [gate-attraction.md](./gate-attraction.md) | **implemented** 2026-08-22 — acceptance measured PASS ([log](./gate-attraction.md#acceptance-log--2026-08-22-seeds-1337--42-regression-anchor-v6-build-side-by-side)) |
| Dog Commands & Influence v5 — walk-on paces the sheep (E4), easy is half that (I2 amended), both push the eye cone out 50 % (E5) | [dog-behavior.md](./dog-behavior.md) | **implemented** 2026-08-22 — acceptance measured PASS ([log](./dog-behavior.md#acceptance-log--2026-08-22)) |

## Locked decisions (this version)

From the owner's notes (2026-08-22), taken as given:

- **A gate-attraction radius** draws sheep toward the gate once inside it.
- **The draw spreads** to sheep in close proximity, so they move **in a
  column** through the gate.
- **The radius is about ⅔ of the dog-intimidation radius** (`R_flee` 120 →
  **80 px**).
- **Walk-on moves the dog at the same speed as the sheep**; **easy at half**
  the sheep's speed. (Flanks and the recall keep `dogVMax`.)
- **Both drive commands extend the dog's cone of intensity by an additional
  50 %.**

## Assumptions made in lieu of questions (owner may overturn)

- **Q39** The draw is a *sheep* rule: it acts whatever the dog is doing,
  and on idle sheep too (spawn keeps the mouth clear by `spawnGateClear`
  120 > 80, so no course starts with sheep in it). Being drawn counts as
  arousal — a drawn sheep is alert, not grazing, until the draw ends.
- **Q40** "Close proximity" = **30 px** (`gateFollowR`, ~2½ sheep lengths);
  a follower keeps **0.6** of its lead's pull per hop (`gateFollowDecay`)
  and the column dies out below 0.02 (~8 hops) so the whole flock is never
  dragged. Followers steer at their **lead**, not the mouth — that is what
  makes a column rather than a fan.
- **Q41** Draw weight **1.2** (`w_gateAttract`) sits under `w_flee` 2, so
  the dog can still pull a sheep off the mouth; G1 commitment and its
  1.5 × leash are unchanged and take over inside `gateApproachR`.
- **Q42** "Cone of intensity" = the **directional** eye term: its reach
  becomes `R_flee × (1 + driveConeExt)` = **180 px** while driving; the
  ambient floor keeps `R_flee`. Because the cone's falloff is stretched, a
  sheep dead ahead at 60 px feels 0.69 instead of 0.50 — the whole cone is
  longer, not just its tip.
- **Q43** Lever homes: `driveConeExt` → Presence `[0.25, 0.5, 0.8]`;
  `walkOnSpeedFrac` → Standoff `[1.15, 1, 0.85]`, `easySpeedFrac` →
  Standoff `[0.6, 0.5, 0.4]`; the four gate-draw keys → Gate
  (`gateAttractR [110, 80, 50]`, `w_gateAttract [1.8, 1.2, 0.7]`,
  `gateFollowR [40, 30, 22]`, `gateFollowDecay [0.75, 0.6, 0.45]`).
- **Q44** `gateAttractR` is a fixed default (80), not derived live from
  `R_flee` — "about ⅔" is honored at the anchor; moving Presence does not
  move the draw.

## Carried forward from POC-v6

- Owner `file://` eyeball of v6's Q32–Q37 (defaults in its spec) — still
  pending, now alongside this version's Q39–Q44.
- The v6 finding that the dog "cannot head a bolter" at `dogVMax` 110 vs
  `vMax` 90 is **sharper now**: a walk-on dog at 90 px/s cannot out-run
  any sheep at all; only a flank (110) can. By rule (E4), worth a
  hands-on read.
- **Difficulty**: with the draw on, both anchor seeds are now **won**
  (80/80) by a plain come-by → walk-on in 90–120 s where v6 penned 0 and
  23. If that reads as too easy, `w_gateAttract` / `gateAttractR` (or the
  Gate lever toward "needle") are the dials.
