# Phase 9 — Panel Split & Defaults File

## ▶ Invocation
**Trigger:** "run phase 9" / reaching P9 from [`plan.md`](./plan.md).
**Prerequisite:** Phases 5–8 complete (so the defaults file captures the
final v3 slider set).
**Do:** implement Tasks, run Verify, tick P9 in `plan.md`, **STOP, and report**.

## Goal
The GUI splits into **sheep-side left / dog-side right / Course & Meta
collapsed below the dog panel** (Q1), and **every slider default moves to
`sheep-defaults.json.js`** — one editable file, no HTML edits to retune
(Q2; invariant #2 amended to "one HTML + one defaults file").
Setting & UI changes of [course-and-flock.md](./course-and-flock.md).

## Tasks
- **§0 (schema + GUI builder):**
  - Category→panel map (data, next to `SETTINGS`): sheep = `Sheep, Idle,
    Boids, Boldness`; dog = `Dog, Flee / Eye`; meta = `Stage, Gate + Crush,
    Scoring, Debug, Sim`.
  - `buildGui` produces **three `lil.GUI` roots** placed via their
    `container`/CSS: sheep panel top-**left**, dog panel top-**right**, meta
    panel **below the dog panel, collapsed** (`gui.close()`).
  - `buildParams` resolves defaults as **schema default ← overridden by
    `SHEEP_DEFAULTS[key]`** when present; a console warning lists unknown
    keys in the file (typo guard), missing keys just fall back.
- **New file `poc/sheep-defaults.json.js`:** exactly one statement —
  `const SHEEP_DEFAULTS = { …every exported tunable's current default, pure
  JSON literal… }` (generated from the schema; `export:false` debug entries
  excluded). Loaded by one `<script src="sheep-defaults.json.js">` tag ahead
  of the main script; guarded in the HTML (`typeof SHEEP_DEFAULTS`) so a
  missing file still boots with schema defaults.
- **§3:** the P7(v1) params-export button writes the **defaults-file
  format** (the JSON literal body), so a tuning session round-trips into
  `sheep-defaults.json.js` by paste.
- **§1:** untouched (it still receives one resolved plain `params`).

## Verify
- **Double-click from `file://`:** page runs, zero console errors; sheep
  panel left, dog panel right, Course & Meta collapsed under the dog panel;
  every previously exposed slider present in its mapped panel (count check
  against the schema).
- **Defaults round-trip:** edit one value in `sheep-defaults.json.js`
  (e.g. `dogVMax`), reload → the slider starts at the edited value; delete
  the file, reload → schema defaults, one console *warning* (not error) at
  most; restore.
- **Inspector intact:** tooltips + the ⓘ settings grid still work across all
  three panels (they walk `SETTINGS`, not a single gui root).
- Sim behavior byte-identical at unchanged defaults (same seed → same first
  100 `step()` states before/after the refactor).

## Done when
- [ ] Three panels per the Q1 map; `sheep-defaults.json.js` is the source of
      slider defaults; export button emits the file format.
- [ ] Round-trip + missing-file fallback verified; inspector works; sim
      states unchanged at same seed.
- [ ] Zero console errors from `file://`; §1 untouched.

## Gotchas
- lil-gui autoPlace stacks roots top-right — pass explicit `container`
  divs (fixed-position left/right) or the three panels will overlap.
- Keep the file **pure JSON inside the assignment** (double-quoted keys, no
  comments, no trailing commas) so it can be pasted to/from real JSON tools
  — that's the point of the owner's ask.
- `HOOKS.respawn` fires on user change only; overridden defaults must be
  applied **before** `sim` is constructed (they're just `params` values —
  no hook replay needed).
- Point-type (`goal`) and dotted keys (`debug.*`) need the same
  `settingTarget` resolution when overlaying — don't flat-assign.
