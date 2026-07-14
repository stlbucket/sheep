# Phase 0 — Settings Schema

## ▶ Invocation
**Trigger:** "run phase 0" / reaching P0 from [`plan.md`](./plan.md).
**Prerequisite:** none (POC-v1 complete).
**Do:** implement Tasks in `.claude/sheep/poc/sheep-poc.html`, run Verify, tick
P0 in `plan.md`, **STOP, and report**. **Constraints:** plan.md Global invariants.

## Goal
One `SETTINGS` array becomes the single source of truth: `params` defaults and
every lil-gui folder/controller are **generated** from it. Land the two locked
slider fixes. Spec: [settings-inspector.md](./settings-inspector.md) — this
phase is its acceptance criteria **1, 2, 5, 6**.

## Tasks
- **§0:** add `SETTINGS` — one entry per Appendix A row (all ~64, in category
  order), fields `key/category/label/type/default/min/max/step/unit/description/
  exposed/export/onChange`. Use the **corrected** values: `sheepCount` default
  **80**, range **1–150·1**, `onChange:'respawn'`; `gateWidth` default **42**;
  `w_line` range **0–3·0.1**; nested keys as `'debug.eye'`; `goal` as `point`.
- **§0:** `buildParams(SETTINGS)` → plain `params` object (nested keys, point
  → `{x,y}`); `buildGui(SETTINGS, params, HOOKS)` → folders in first-appearance
  order, controllers for `exposed` entries only, `label` as controller name;
  `HOOKS = { respawn: () => sim.reseed(params.seed) }` looked up by `onChange`.
- **Delete** the hand-written `params` literal, the whole `gui.addFolder/add`
  block, and the §4 `sheepCount` binding (its hook now lives in `HOOKS`).
- **§2/§4:** params-export button emits only `export:true` entries.
- **§1: untouched.** It still receives the same plain `params`.

## Verify
- Page boots from `file://` with **identical folders, labels, ranges, and
  defaults** as before (except the three intended changes) — zero console errors.
- `sheepCount` slider shows 1–150 default 80, and moving it **respawns** the herd.
- `w_line` slider spans 0–3 with default 0.4 visible (not pinned past max).
- Export button's JSON contains no `debug.*` keys.
- 80 sheep at 60 FPS (brute-force O(n²) headroom check — note the FPS).

## Done when
- [ ] `SETTINGS` covers all Appendix A rows, corrected values included.
- [ ] `params` + gui fully generated; hand-written versions deleted.
- [ ] `respawn` hook works; export filtered; §1 untouched.
- [ ] Boot-identical (minus intended changes); no console errors.

## Gotchas
- `HOOKS.respawn` closes over `sim`, which is created later in §4 — fine, the
  hook only *fires* on user interaction, but don't *call* it during buildGui.
- lil-gui needs the actual nested object for `'debug.eye'`
  (`add(params.debug, 'eye')`) — resolve the path, don't pass the dotted string.
- Keep `SETTINGS` order = Appendix A order; folder creation order follows it.
- 80 sheep is the new boot state — expect the (still-unfixed) one-blob idle
  look until P2/P3; that is not a P0 failure.
