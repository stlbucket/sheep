# Phase 1 — Inspector UI (tooltips + ⓘ grid)

## ▶ Invocation
**Trigger:** "run phase 1" / reaching P1 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 0 complete.
**Do:** implement Tasks, run Verify, tick P1 in `plan.md`, **STOP, and report**.

## Goal
Every tunable is self-describing in the UI: hover tooltips on all generated
controllers, and a read-only per-category detail grid behind an ⓘ button in
each folder header. Spec acceptance **3, 4** of
[settings-inspector.md](./settings-inspector.md).

## Tasks
- **§2/§3 (DOM only — never §1):**
  - **Tooltip:** one absolutely-positioned styled `<div>` (not `title=`).
    On each generated controller's `.domElement`: `mouseenter` shows
    `description` + a secondary line `unit · min–max` (e.g. `px · 4–60`);
    `mouseleave` hides. Position near the cursor, clamp to viewport.
  - **ⓘ button:** injected into each lil-gui folder's `.title` row (stop the
    click from toggling the folder). Opens that category's modal grid; only one
    modal at a time; close on ✕ / Esc / click-outside.
  - **Grid:** columns Label · key · type · range (`min–max·step` or
    `true/false`) · default · unit · **current value** (read live from `params`
    at open) · description. Include non-`exposed` rows with a muted "no slider"
    tag. Sticky header, zebra rows, monospace keys/values — reuse the HUD/panel
    CSS idiom.
- Grid and tooltip content both read from `SETTINGS` — no duplicated facts.

## Verify
- Hovering any slider (spot-check ≥3 folders) shows description + unit/range;
  tooltip follows to another controller cleanly.
- ⓘ on every folder opens the right category; current-value column matches a
  live slider tweak made just before opening; hidden rows present and tagged.
- Esc, ✕, and click-outside all close; reopening a different folder works.
- Zero console errors; page still runs from `file://`.

## Done when
- [ ] Tooltips on all exposed controllers, from schema data.
- [ ] ⓘ grid per folder: complete rows, live values, read-only, closes cleanly.
- [ ] No §1 changes; no console errors.

## Gotchas
- lil-gui folder titles are `<button>`s — the injected ⓘ needs
  `event.stopPropagation()` or every open collapses the folder.
- Read current values at **open time** (snapshot), not live-bound — the grid is
  read-only reference, and live binding invites accidental edit coupling.
- `point` and nested `debug.*` rows need the same path resolution as P0.
