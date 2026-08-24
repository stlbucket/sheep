# Phase 4 — Lever Model: Data, Resolve, Guards, Assertions

## ▶ Invocation
**Trigger:** "run phase 4" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 3 ticked (the schema is final — the inventory is
computed once).
**Do:** implement Tasks, run Verify, tick P4 in `plan.md`, **STOP, and
report**. **Constraints:** plan.md Global invariants; the levers spec's
"What this feature must NOT change".

## Goal
The lever layer exists as **§0 data + pure functions** with no UI yet:
`LEVERS` (12 profiles), `resolveLever`, schema coercion, guards G1/G2,
stamp-and-release bookkeeping, and two **boot assertions** that log one line
each — anchor exactness and single ownership. Proves levers acceptance
**1, 5, 6** headless and on the console.

## Tasks
- **§0 `LEVERS`** — the shape in tuning-levers.md → "Shape of a lever".
  Twelve entries, profiles transcribed from
  [`lever-model.md`](../../brainstorming/lever-model.md) (`[at0, at0.5,
  at1]`; the middle column is the **shipped default, copied not invented**).
  **Extend Pasture · Approach** (Q27) with the nine spawn keys from
  P1–P3 at `[default, default, default]` (anchor-safe, no archetype bias):
  `spawnGateClear`, `holeCountMin/Max`, `holeRadiusMin/Max`, `holeLobes`,
  `focusShare`, `focusRadius`, `focusGapScale`. `spawnLayout` and
  `randomSeedOnLoad` join `seed` as **not levered** ("a draw, not a dial").
- **§0 `resolveLever(t, [a, m, b])`** — piecewise-linear through the anchor
  (spec formula); then `coerce(entry, v)`: ints round, floats snap to
  `step`, clamp to `[min, max]`; never widen a range.
- **§0 guards** — `applyGuards(params)`: G1 `driveTrailGap = min(profile,
  R_flee/3)`, G2 `dogVMax = max(profile, vMax × 1.05)`; returns which lever
  is *limited by* which (for P5's readout). Re-evaluated whenever either
  side's lever moves, reading **live** raw values.
- **§0 lever state** — `leverState = { pos: {key: 0.5…}, stamped: {paramKey:
  value}, limitedBy: {leverKey: otherLeverKey} }`; `setLever(key, t)` writes
  its own params into `params` + `stamped`, then `applyGuards`. Pure data
  in; P5 wires controllers.
- **§0 boot assertions** (run after `buildParams`, before `new FlockSim`):
  1. **Anchor:** for every levered key, `coerce(resolve(0.5, profile)) ===
     params[key]` (the defaults-file value). Log `[levers] anchor OK
     88/88` or list the mismatches. **Refuse to lie:** mismatches log as
     `console.error` (a console error is exactly the signal the owner checks).
  2. **Ownership:** no key in two profiles; levered ∪ not-levered ===
     `SETTINGS` key set. Expected: **88 levered + 32 not-levered = 120**
     (109 v4 + 11 v5). Count against the live schema, not these literals.
- **Defaults file:** `levers: { dogPresence: 0.5, … }` block (Q17) — add
  now so `buildParams` learns to ignore it (it is not a `SETTINGS` key →
  the unknown-key warning must exempt `levers`). Export adds the block
  (finish in P5).
- **§1:** nothing. **§3:** nothing yet.

## Verify (measured, headless Node slice + static)
- Anchor assertion passes for all levered keys; ownership assertion passes
  with the live counts reported.
- **Resolve sanity:** for each of the 24 endpoints, every coerced value
  lies within its schema `[min, max]` and on its `step` grid; each int
  param is an integer.
- **Guards (acceptance 6):** `setLever('dogStandoff', 1.0)` with Presence at
  0.5 → `driveTrailGap` **40** (not 70), `limitedBy.dogStandoff ===
  'dogPresence'`; Standoff 1.0 + Nerve 1.0 → `dogVMax ≥ vMax × 1.05`.
- **Stamp-and-release (data level, acceptance 4's core):** Presence 0.7 →
  stamps; hand-set `params.R_flee` → `modified(presence) === true`; move
  Standoff → `R_flee` untouched; move Presence → re-stamped, marker clear.
- **Inertness:** with all positions 0.5, `params` is deep-equal to a
  `buildParams` fresh copy; forced beside-gate seed 1337 digest = P0's.
- Zero console errors at `file://` boot (owner): the two `[levers]` lines
  appear, nothing else new.

## Done when
- [x] `LEVERS` (12, Approach extended), resolve/coerce/guards/state as pure
      §0 functions; assertions log at boot (88/88 · 88+36=124).
- [x] Measured: anchor, ownership, endpoints in range, guards, stamp
      semantics, inertness.

## Gotchas
- **If the owner later changes a shipped default** (the waived v4 C7
  precondition), the anchor assertion fails loudly on the next boot — the
  fix is editing that profile's middle column, not disabling the check.
- `coerce` must use the **schema** step/min/max, not the lever-model
  tables; `sheepCount` and `canvasW/H` are ints.
- Guards read *live* raw values (a hand-edited `R_flee` constrains
  `driveTrailGap`); never read `stamped`.
- `buildParams`' unknown-key typo guard will flag `levers` — exempt exactly
  that key.
- Keep all of this **above** §1 in the file, and keep §1's `params` a plain
  object: the sim must not be able to tell levers exist.
