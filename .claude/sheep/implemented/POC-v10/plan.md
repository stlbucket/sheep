# POC-v10 build plan — arrow controls · 3×3 pad · gentle flanks · offset downs

## ▶ Invocation

`/sheep implement POC-v10 [phase N | all]` — one phase per go: run the first
unchecked phase below, verify, tick it, **stop and report**. `all` runs the
phases in order, reporting at each gate and halting on any Verify failure.
This run: the owner said "do all of the following from beginning to end" →
`all`.

## Global invariants

The skill's invariants 1–8 apply unchanged; the ones that bite here:
one HTML file + one defaults file, plain `<script>`, runnable from `file://`;
**§1 stays DOM-free** (the variants enter §1 only as `setCommand` opts + two
state fields); all tunables in §0 with lil-gui bindings; every phase leaves
the page runnable with zero console errors; root `index.html` /
`sheep-defaults.json.js` are byte-copies of the `poc/` files — sync after
editing.

## Section map

| § | contents touched |
|---|---|
| §0 PARAMS | `flankEasySpeedFrac`, `downConeOffsetDeg` (+ parked in ownership) |
| §1 SIM | dog state `flankEasy`/`lieSide`, setCommand opts, flank speed/cap, vmax, flee eye axis |
| §2 RENDER | pad CSS grid, drawEye wedge center, HUD variant tag |
| §3 INPUT | HOTKEYS remap, VARIANTS table, displayCommand strip |
| §4 BOOTSTRAP | updateStrip call |

## Phases

| # | file | goal | proves |
|---|---|---|---|
| 1 | [phase-1-arrow-remap.md](./phase-1-arrow-remap.md) | arrows + ⏎ drive the six commands; pad rows regroup | keyboard remap works; letters retired |
| 2 | [phase-2-gentle-flanks.md](./phase-2-gentle-flanks.md) | C11 come-easy / away-easy at half dog speed | measured flank top speed halves |
| 3 | [phase-3-offset-downs.md](./phase-3-offset-downs.md) | D4 left/right-down beam ±30°; sync + snapshot | probed threat beam swings; boot green |

## Progress tracker

- [x] Phase 1 — arrow remap + 3×3 pad (2026-08-24)
- [x] Phase 2 — gentle flanks (C11) (2026-08-24)
- [x] Phase 3 — offset downs (D4) + defaults/root sync + snapshot (2026-08-24)

## Definition of done

All acceptance criteria 1–11 across the two specs measured PASS (DOM-only
checks: code-inspected + owner `file://` eyeball pending, as v5–v9 shipped);
headless boot shows the ownership assertion OK and zero errors; root copies
byte-identical to `poc/`; a `params-2026-08-24-v10.json` snapshot exists;
folder moved to `implemented/POC-v10/`, statuses → implemented.
