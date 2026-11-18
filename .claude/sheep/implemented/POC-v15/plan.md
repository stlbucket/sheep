# POC-v15 plan — scoring rework, objectives II, verdict and HUD, records

## ▶ Invocation

`/sheep implement POC-v15 [phase N | all]` — run the first unchecked phase below, verify, tick, **stop and report**; `all` runs every phase, reporting at each gate and halting on any Verify failure.

**Precondition:** the owner has reviewed the four specs. Q90, Q96, Q97 and Q104 are answered; the other parked questions (through Q110) each carry a bolded default; the phases below are written against those defaults, so an answer that differs changes the phase that owns it (noted per phase).

## Global invariants

The skill's invariants 1–8 apply; the ones that bite here: physics only in `web/lib/` and loadable in plain node (2, 3); every tunable a `SETTINGS` entry claimed by a lever or `LEVER_NOT_LEVERED`, with a default in `web/sheep-defaults.json.js` (4); all three pages runnable from `file://` with zero console errors after every phase (5); scoring never draws from `this.rng`, and new specials and side objectives roll after the v14 rolls on their own streams, so a seed's course is unchanged.

## Section map

| § | This version |
|---|---|
| §0 PARAMS (`web/lib/sheep-sim.js`) | tier, condition, chain, strike, multiplier, jackpot keys in `Scoring`; new specials and side-objective keys in `Objectives`; band and history keys in `Modes`; six keys removed; Strictness lever gains two |
| §1 SIM (`web/lib/sheep-sim.js`) | `s.cond`, tiers, uncapped chain, strikes and bust, end multipliers, awards, partial credit, jackpots, gate multiplier, three new kinds, side objectives, `referenceScore()`, `rank()`, `categories()`, wider `score()` |
| §A (`web/lib/assault-sim.js`) | a mortar kill removes the sheep's condition from the flock value and is a strike (owner Q96) |
| shared UI (`web/lib/sheep-score-ui.js`) | top-left HUD block, chain meter, strikes, flock value, tiered pops, banner queue, objective list, new card, history and collection panels, storage |
| §2–§4 (each page) | make room for the HUD (camera bar moves on the 3D pages), draw the three new kinds |

## Phases

| # | file | goal | proves |
|---|---|---|---|
| 1 | [phase-1-tiers-condition-chain.md](phase-1-tiers-condition-chain.md) | tiers, condition, flock value, uncapped chain in the sim | headless: tier values, drain and recovery, chain steps, window tightening |
| 2 | [phase-2-strikes-multipliers.md](phase-2-strikes-multipliers.md) | strikes and bust, end multipliers, time, awards, partial credit | headless: bust on the third strike, multiplier products, each award on and off |
| 3 | [phase-3-jackpots.md](phase-3-jackpots.md) | perfect file, one go, frenzy, last sheep | headless: each jackpot fires once, on its condition only |
| 4 | [phase-4-objectives-sim.md](phase-4-objectives-sim.md) | gate multiplier, three new specials, side objectives in the sim | headless: off = v14 replay; each new rule as specified |
| 5 | [phase-5-verdict-sim.md](phase-5-verdict-sim.md) | reference score, rank, percent, category grades in the sim | headless: reference matches a scripted run; ranks and grades at their thresholds |
| 6 | [phase-6-hud.md](phase-6-hud.md) | top-left HUD, chain meter, strikes, flock value, tiered pops, banners, new kinds drawn | pages load clean; HUD values equal the sim's |
| 7 | [phase-7-card-records.md](phase-7-card-records.md) | new end card, history, band bests, collection | card total equals the sim's; records survive a reload; storage failure is harmless |
| 8 | [phase-8-acceptance.md](phase-8-acceptance.md) | full acceptance pass and docs | every spec criterion measured |

Phases 1–5 touch only the sim and the defaults file. Between phase 1 and phase 6 the pages keep running on the v14 UI, which reads only the fields `score()` already has; phase 1 keeps those fields present.

## Progress tracker

- [x] Phase 1 — tiers, condition, chain
- [x] Phase 2 — strikes and multipliers
- [x] Phase 3 — jackpots
- [x] Phase 4 — objectives (sim)
- [x] Phase 5 — verdict (sim)
- [x] Phase 6 — HUD
- [x] Phase 7 — card and records
- [x] Phase 8 — acceptance

## Definition of done

Every acceptance criterion in [scoring.md](./scoring.md), [field-objectives.md](./field-objectives.md), [verdict-and-hud.md](./verdict-and-hud.md) and [records.md](./records.md) is measured (headless node for the sim, headless Chrome on `file://` for the pages) with zero console errors; the projected score spread in scoring.md is replaced by measured figures; an acceptance log is appended to each spec; the folder moves to `implemented/POC-v15/`; statuses read `implemented`.
