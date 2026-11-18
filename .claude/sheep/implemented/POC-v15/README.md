# POC-v15 — Spec Index

Fifteenth iteration of the sheep PoC. Started and **shipped 2026-11-17** from one owner note: **"scoring is still pretty boring, and the range of results is not satisfying"**, followed by an eleven-step interview the same day. Predecessor [POC-v14](../POC-v14/README.md) shipped 2026-11-16.

The v14 score counts up, but a sloppy win and a great win land close together, nothing can go wrong, the number climbs smoothly with no big moments, and the end card does not say how well the run went. The owner confirmed all four complaints. This version widens the spread (tiers, an uncapped chain, multiplying bonuses, jackpots), adds stakes (a flock value that drains and three strikes), adds more to go for on the field, and replaces stars with a rank, category grades and a percentage.

## Features

| Feature | Spec | Status |
|---|---|---|
| Scoring rework (SC12–SC24): three tiers, sheep condition and flock value, uncapped quality-fed chain, three strikes, multiplying end bonuses, more awards, partial credit, four jackpots | [scoring.md](./scoring.md) | **implemented** 2026-11-17 — acceptance measured PASS |
| Field objectives II (FO7–FO12): drive gates feed the multiplier, three new special sheep, side objectives | [field-objectives.md](./field-objectives.md) | **implemented** 2026-11-17 — acceptance measured PASS |
| Verdict and HUD (VH1–VH9): score top-left, chain meter, strikes and flock value, tiered pops and banners, shepherd ranks, category grades, percent | [verdict-and-hud.md](./verdict-and-hud.md) | **implemented** 2026-11-17 — acceptance measured PASS |
| Records (RC1–RC4): run history, bests per flock-size band, award and challenge collection | [records.md](./records.md) | **implemented** 2026-11-17 — acceptance measured PASS |

Built from [plan.md](./plan.md) (8 phases, all ticked).

## Locked decisions (this version)

From the owner's interview, 2026-11-17:

| # | Aspect | Decision |
|---|---|---|
| 1 | Diagnosis | All four: scores look alike, nothing can go wrong, no big moments, result not legible |
| 2 | Sheep worth | **Three tiers**: RUSHED 50, CALM 200, PERFECT 500 |
| 3 | Stream | **Uncapped and quality-fed**: perfect +2, calm +1, rushed holds; the window tightens as the chain grows |
| 4 | Stakes | **Both**: a flock value that drains under stress, and **three strikes** that bust the run |
| 5 | Time | **Barely matters** — a tie-breaker |
| 6 | End bonuses | **Multiply the total**; more and rarer awards; **partial credit** when the run is not won |
| 7 | Objectives | Drive gates **add to the base multiplier**; **more kinds of special**; **side objectives** per course |
| 8 | Jackpots | All four: perfect file, whole flock in one go, hot streak window, last-sheep finisher |
| 9 | Verdict | **Named shepherd ranks**, **category breakdown**, **percent of the course maximum**. Owner note: **the running point total is prominent in the upper left during play** |
| 10 | In-run HUD | Chain meter with window bar, strikes and flock value, bigger tiered pops. (Pace against best was **not** chosen.) |
| 11 | Records | Run history with ranks, bests per flock-size band, award and challenge collection |

Asked after the draft, answered by the owner the same day:

- **Q90** — a sheep pays its **gate tier × its condition** (0 to 100 %).
- **Q96** — strikes come from **fence slams** and, on the assault page, **mortar kills**, as well as every fifth panic. Crush injuries stay off.
- **Q97** — **keep every bonus multiplying** and tune the values after playing.
- **Q104** — **100 % is a textbook run** (every sheep calm in one chain, no jackpots counted); better runs read above 100 %.

Carried over from v14 and still true: the score **never decreases** (SC1). Condition lowers what a sheep will pay and a bust ends the run, but no event takes points off the total.

## Still open

Seventeen questions were built on their bolded defaults and are still the owner's to change: Q91–Q95, Q98 and Q110 in [scoring.md](./scoring.md), Q99–Q102 in [field-objectives.md](./field-objectives.md), Q103, Q105, Q106 in [verdict-and-hud.md](./verdict-and-hud.md), Q107–Q109 in [records.md](./records.md). The owner's `file://` eyeball is **pending**.

**Retuned the same day (Q97).** As first built, 26 of 33 finished driven runs were in the top rank, because a flock files through the gate in one long chain and every jackpot fired. Ten values were changed from measurement, with the owner's approval: finished runs now spread 0 / 1 / 1 / 7 / 6 / 15 / 3 across the seven ranks, and gentle handling scores about ten times rough handling. The values, the before-and-after and what is still not fixed are in [scoring.md](./scoring.md#retune--2026-11-17).

**Still to look at:** no run busted in any of the 64 measured runs (the most strikes taken was 1), so the stakes rarely bite; and the measurements come from scripted handlers, not a player.

## What was built

Acceptance: headless node on the sim (`npm test`, 58 checks) and headless Chrome on `file://` for the three pages (`npm run test:pages`, 89 checks, zero console errors); both suites were rewritten for this version. The flock and dog physics replay the POC-v14 recording exactly when the new specials are off.

**57 new keys** (38 in `Scoring`, 16 in `Objectives`, 3 in `Modes`; two of them, `penStressMemory` and `strikeCooldown`, were added during the build), **6 removed** (`comboMax`, `fullFlockBonus`, `cleanRunBonus`, `awardPoints`, `starCalmShare`, `driveGateBonus`). `web/lib/sheep-score-ui.js` was rewritten. Each spec ends with what was built differently from the draft.

Worth knowing: crush injuries are still switched off in the sim, so in the plain game a strike comes from panics (every fifth) or, rarely, a fence slam; on the assault page also from a shell that kills.
