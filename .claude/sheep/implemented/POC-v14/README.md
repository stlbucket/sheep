# POC-v14 — Spec Index

Fourteenth iteration of the sheep PoC. Started and **shipped 2026-11-16** from one owner note: **"the scoring really sucks — it needs to count up; you should get a point for every sheep in the pen"**, followed by a brainstorm from which the owner picked all four idea groups. Predecessor [POC-v13](../POC-v13/README.md) shipped 2026-11-16.

The shipped score starts at 100 and only drains (`w_time`, `w_line`, `w_cohesion`, `w_calm`), so nothing the player does is ever rewarded. This version replaces it with a score that starts at 0 and only climbs, then adds things to go for on the field and reasons to replay.

## Features

| Feature | Spec | Status |
|---|---|---|
| Count-up scoring (SC1–SC11): points per sheep, calm bonus, stream combo, full-flock bonus, par clock, tally card with stars and awards, assault points | [scoring.md](./scoring.md) | **implemented** 2026-11-16 — acceptance measured PASS |
| Field objectives (FO1–FO6): drive gates, golden ewe, lamb and mother, stubborn ram | [field-objectives.md](./field-objectives.md) | **implemented** 2026-11-16 — acceptance measured PASS |
| Replay modes (RM1–RM6): saved bests, daily seed, wave mode | [replay-modes.md](./replay-modes.md) | **implemented** 2026-11-16 — acceptance measured PASS |

Suggested build order is the table order: the other two features only add scoring events to the first.

## Locked decisions (this version)

From the owner (2026-11-16), taken as given:

- The score **counts up**.
- **A point for every sheep in the pen.**
- All four brainstormed groups are in scope: **count-up core**, **par clock + tally card**, **field objectives**, **replay modes**.

Asked after the draft, answered by the owner the same day:

- **Q75** — **100 points per sheep, 200 calm**; every other value scaled to match.
- **Q76** — an injury subtracts nothing but **ends the combo**.
- **Q77–Q80** — par by formula (tune later), feat-based stars, the five drafted awards, wolves score on the assault page.
- **Q81–Q83** — a special's worth **stacks** with calm and combo; drive gates count **either way**; specials roll independently.
- **Q84** — the ram is harder to move and **turns to face the dog** when pressed too close.
- **Q85, Q89** — wave mode gets **specials but no drive gates**; flocks grow by two per wave and obstacles are re-laid.
- **Q86–Q88** — bests are per exact course, saved **only at default settings**, and the daily seed uses the **local date**.

## Still open

Nothing parked. All point values, chances and clock values are first proposals until a `/sheep tune` pass; none of the new keys has lever endpoints except the four the Strictness lever now owns. The owner's `file://` eyeball is **pending**.

Built from [plan.md](./plan.md) (7 phases, all ticked): headless node acceptance on the sim (34 checks) and headless Chrome on `file://` for the three pages (54 checks, zero console errors). **44 new keys** (18 in `Scoring`, 19 in the new `Objectives`, 7 in the new `Modes`), **5 removed** (`w_time`, `w_line`, `w_cohesion`, `w_calm`, `injuryWeight`), one new file `web/lib/sheep-score-ui.js`. Each spec ends with what was built differently from the draft.

Worth knowing: crush injuries were already switched off in the sim before this version, so the injury rules are built and tested but nothing triggers them in the plain game yet.
