# Phase 5 — Lever Panel, Advanced Disclosure, Canvas Resize, Persistence

## ▶ Invocation
**Trigger:** "run phase 5" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 4 ticked.
**Do:** implement Tasks, run Verify, tick P5 in `plan.md`, **STOP, and
report**. **Constraints:** plan.md Global invariants.

## Goal
The owner can *use* the levers: a **Levers** root above the existing panels
(3 domain folders × 4 sliders, `Reset all levers to 0.5`, `Reset this
domain`), `(modified)` and `limited by …` readouts, the three existing
panels collapsed under **Advanced** unchanged internally; **Pasture ·
Scale** works because `canvasW/H` are exposed and the canvas resizes on
respawn (Q14); lever positions persist/round-trip via the defaults file and
export (Q17); the ⓘ grid shows a param's lever stamp. Proves levers
acceptance **2, 4, 8, 9, 10**.

## Tasks
- **§0 schema:** `canvasW`/`canvasH` → `exposed: true`, `onChange:
  'respawn'` (ranges per lever-model Scale: 800–1500 / 520–960).
- **§0 `PANELS`/`buildGui`:** a fourth root `panel-levers` (container above
  the others; HTML gets the div), built from `LEVERS` not `SETTINGS`: per
  domain a folder, per lever `add(leverState.pos, key, 0, 1, 0.01)` with
  `onChange → setLever(key, t)` then **push the written raw values into
  their controllers** (`updateDisplay()` on every controller whose
  `_setting.key` the lever owns) and fire `HOOKS.respawn` for pasture
  levers (Q15; dog/sheep levers apply live). Lever name suffix renders
  `(modified)` / `limited by Presence` from `leverState` on each rerender.
  Buttons: reset-all, reset-domain (both = `setLever(k, 0.5)` loops).
- **§3 Advanced:** wrap the three existing roots in one collapsed
  disclosure (a lil-gui root titled **Advanced** that the three existing
  containers nest under, or a plain `<details>` — keep the ⓘ grid and
  tooltips working: they hang off `SETTINGS` + `_setting` back-links, so
  nothing about them changes).
- **§3 ⓘ inspector:** when a param is owned by a lever, the grid row shows
  `lever · stamp` next to the value (acceptance 10).
- **§2/§4 canvas resize:** on `respawn`, if `params.canvasW/H` differ from
  the `<canvas>` element size, set `canvas.width/height` (and the CSS size)
  before `sim.reseed` — §1 already reads bounds from `params` each reseed
  (`playRect()`), so no §1 change. Confirm the fence, gate, pen apron and
  HUD all derive from `playRect()`/params, not from cached numbers.
- **Persistence:** `buildParams` (or a sibling `loadLeverState`) reads
  `SHEEP_DEFAULTS.levers` into `leverState.pos` **without** resolving (the
  raw params are the truth; positions are UI state); `exportParams` appends
  the `levers` block. A position that disagrees with the raw values simply
  shows `(modified)` after boot — by design (Q17).
- **Defaults file:** the `levers` block with twelve 0.5s.

## Verify (measured where possible; the panel itself is the owner's eyeball)
- **Acceptance 2 (headless):** randomize all 12 positions via `setLever`,
  then reset-all → `params` deep-equals the anchor copy.
- **Acceptance 8 (headless):** Scale 0 / 0.5 / 1 → `playRect()` matches
  800×520 / 1120×720 / 1500×960 minus insets; gate on the perimeter of the
  *new* rect; `sheepCount` 18/80/150 sheep spawned inside it; dog facing
  < 1°; Gate 1.0 and Approach 1.0 respawn with no NaN and the gate inside
  corner margin.
- **Acceptance 9 (headless):** export → parse the emitted JS → feed it as
  `SHEEP_DEFAULTS` to a fresh `buildParams` → raw values and lever positions
  both reproduce.
- **Acceptance 4 / 10 / panel (owner, `file://`):** Levers root on top
  with 12 sliders + 2 buttons; move Presence to 0.7 → Advanced › Dog
  sliders visibly move; hand-edit `R_flee` → Presence reads `(modified)`;
  move Standoff → `R_flee` stays; Standoff 1.0 → `limited by Presence`; all
  **87 + 11 + 2** existing/new controllers still present under Advanced
  (controller census = exposed schema entries); ⓘ grid shows stamps; Scale
  1.0 visibly enlarges the canvas and the page stays laid out (command pad
  below still reachable). Zero console errors.

## Done when
- [x] Levers root, Advanced disclosure, readouts, reset buttons, ⓘ stamp.
- [x] `canvasW/H` exposed; canvas resizes on respawn; Scale endpoints
      measured (800×520 / 1120×720 / 1500×960).
- [x] `levers` block round-trips through defaults + export.

## Gotchas
- lil-gui `onChange` fires during `updateDisplay()` in some versions — guard
  against the lever handler re-entering itself when it pushes values into
  the raw controllers (set a `syncing` flag).
- Resizing `canvas.width` clears it — harmless, the next frame redraws.
  CSS layout (`justify-content: flex-start`, pasture near the top) must
  still fit 1500×960 on the owner's screen; if not, scale the CSS size and
  keep the backing size — render already uses `params.canvasW/H`.
- Controller census counts **exposed** entries: 87 (v4) + 11 (v5 spawn) +
  2 (`canvasW/H`) = **100** raw controllers + 12 lever sliders. Count
  against the live schema.
- Reset-all must also clear `limitedBy`, and must respawn once (not 12
  times) — batch the pasture respawn.
