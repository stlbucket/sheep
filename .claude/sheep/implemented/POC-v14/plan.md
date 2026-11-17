# POC-v14 plan — count-up scoring, field objectives, replay modes

## ▶ Invocation

`/sheep implement POC-v14 [phase N | all]` — run the first unchecked phase below, verify, tick, **stop and report**; `all` runs every phase, reporting at each gate and halting on any Verify failure.

## Global invariants

The skill's invariants 1–8 apply; the ones that bite here: physics only in `web/lib/` and loadable in plain node (2, 3); every tunable a `SETTINGS` entry claimed by a lever or `LEVER_NOT_LEVERED` (4); all three pages runnable from `file://` with zero console errors after every phase (5); scoring and objectives never draw from `this.rng`, so a seed's course is unchanged.

## Section map

| § | This version |
|---|---|
| §0 PARAMS (`web/lib/sheep-sim.js`) | old penalty weights out; new `Scoring` keys; new `Objectives` and `Modes` categories; Strictness lever re-pointed |
| §1 SIM (`web/lib/sheep-sim.js`) | event scoring, `points`, `scoreEvents`, `award()`, new `score()` shape, drive gates, special sheep, wave mode |
| §A (`web/lib/assault-sim.js`) | wolf points through `sim.award`, `s.lost` on a mortar kill |
| shared UI (`web/lib/sheep-score-ui.js`, new) | HUD line, pops, tally card, saved bests, daily and waves buttons — one copy for all three pages |
| §2–§4 (each page) | load the new lib, hand it a projection, draw drive gates and special sheep |

## Phases

| # | file | goal | proves |
|---|---|---|---|
| 1 | [phase-1-sim-scoring.md](phase-1-sim-scoring.md) | count-up scoring in the sim | headless: score starts at 0, never drops, combo and bonuses add up |
| 2 | [phase-2-score-ui.md](phase-2-score-ui.md) | shared HUD, pops and tally card on all three pages; assault points | pages load clean, card totals match the sim |
| 3 | [phase-3-objectives-sim.md](phase-3-objectives-sim.md) | drive gates and special sheep in the sim | headless: off = v13 replay; gates and specials score as specified |
| 4 | [phase-4-objectives-render.md](phase-4-objectives-render.md) | draw drive gates and specials on all three pages | visible and distinct, pages load clean |
| 5 | [phase-5-bests-daily.md](phase-5-bests-daily.md) | saved bests and the daily seed | best survives a reload; storage failure is harmless |
| 6 | [phase-6-waves.md](phase-6-waves.md) | wave mode | clock, time per sheep, next wave keeps the score |
| 7 | [phase-7-acceptance.md](phase-7-acceptance.md) | full acceptance pass and docs | every spec criterion measured |

## Progress tracker

- [x] Phase 1 — sim scoring
- [x] Phase 2 — score UI
- [x] Phase 3 — objectives (sim)
- [x] Phase 4 — objectives (render)
- [x] Phase 5 — bests and daily seed
- [x] Phase 6 — wave mode
- [x] Phase 7 — acceptance

## Definition of done

Every acceptance criterion in [scoring.md](./scoring.md), [field-objectives.md](./field-objectives.md) and [replay-modes.md](./replay-modes.md) is measured (headless node for the sim, headless Chrome on `file://` for the pages) with zero console errors; an acceptance log is appended to each spec; the folder moves to `implemented/POC-v14/`; statuses read `implemented`.
