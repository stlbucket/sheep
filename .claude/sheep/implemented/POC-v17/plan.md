# POC-v17 — plan

Spec: [bulls.md](./bulls.md). Run in one go on the owner's instruction (2026-11-18: "spec, plan, implement"), so the phases below are a record, not gates.

## ▶ Invocation

`/sheep implement POC-v17` runs the first unchecked phase. Every phase is ticked, so the only use now is a touch-up: `/sheep implement POC-v17 phase N`.

## Global invariants

The ones in the skill, and for this version: bulls never draw from `this.rng`; `bullMax` 0 must replay the pre-bull sim exactly; physics only in `web/lib/sheep-sim.js`.

## Section map

| Section | File |
|---|---|
| §0 PARAMS, §1 SIM | `web/lib/sheep-sim.js`, `web/sheep-defaults.json.js` |
| §2 RENDER | `web/2d.html`, `web/3d.html`, `web/3d-assault.html`, `web/3d-competition.html` |
| Tests | `test/sim.test.js`, `test/pages.test.js` |

## Phases

| # | Goal | Proves |
|---|---|---|
| 1 | §0 keys, `sim.bulls`, `placeBulls`, `solids()` wired into `pushOut` / `obstacleForce` / `coverBetween` / `dogDetour` | B1–B3, B6; golden replay unchanged with `bullMax` 0 |
| 2 | `stepBulls`: graze, amble, turn, stay in range, solid against stands and rocks | B4, B5 |
| 3 | Sim checks `B-1` to `B-6` | acceptance 1–6, 8 |
| 4 | Draw the bull: `drawBulls()` on 2D, `buildBull()` / `updateBulls()` on the 3D pages | acceptance 7 |
| 5 | Page checks `B-p1`, `B-p2`, `errors-bulls`; docs | acceptance 7, 8 |

## Progress tracker

- [x] Phase 1 — bulls in the sim as solids
- [x] Phase 2 — wandering
- [x] Phase 3 — sim checks
- [x] Phase 4 — rendering on all four pages
- [x] Phase 5 — page checks and docs

## Definition of done

Both suites pass, the four pages load from `file://` with a clean console, and the spec's acceptance log is filled in. Owner `file://` eyeball pending.
