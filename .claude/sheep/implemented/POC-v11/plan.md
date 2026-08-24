# POC-v11 plan — napkin layout + phone landscape

## ▶ Invocation

`/sheep implement POC-v11 [phase N | all]` — run the first unchecked phase
below, verify, tick, **stop and report**; `all` runs every phase, reporting at
each gate and halting on any Verify failure.

## Global invariants

The skill's invariants 1–8 apply; the ones that bite here: single HTML file +
defaults file from `file://` (2); **§1 SIM untouched** (3); no new magic
numbers in the sim (4 — this version adds zero tunables); page always runnable
(5).

## Section map

| § | This version |
|---|---|
| §0 PARAMS | unchanged |
| §1 SIM | **untouched** |
| §2 RENDER | CSS + body markup rework, `fitCanvas()`, HUD reflow |
| §3 INPUT | fullscreen button wiring; panels-toggle scope comment |
| §4 BOOTSTRAP | drop narrow-viewport auto-hide |

## Phases

| # | file | goal | proves |
|---|---|---|---|
| 1 | [phase-1-side-column.md](phase-1-side-column.md) | napkin DOM/CSS: #app row, dog + debug boxes | pad & old header work from the right column |
| 2 | [phase-2-levers-section.md](phase-2-levers-section.md) | all lil-gui panels into the levers section | levers + Advanced stack & scroll in-column |
| 3 | [phase-3-scale-to-fit.md](phase-3-scale-to-fit.md) | contain-fit pasture + resize listener | canvas fills leftover space, aspect kept |
| 4 | [phase-4-phone-landscape.md](phase-4-phone-landscape.md) | portrait overlay + ⛶ full-screen | phone portrait blocked; landscape full-screens |

## Progress tracker

- [x] Phase 1 — side column (dog + debug boxes)
- [x] Phase 2 — levers section
- [x] Phase 3 — scale-to-fit pasture
- [x] Phase 4 — phone landscape

## Definition of done

All spec acceptance criteria pass on the `file://` page with zero console
errors; `index.html` re-synced (byte-identical copy); folder moved to
`implemented/POC-v11/`; statuses `implemented`.
