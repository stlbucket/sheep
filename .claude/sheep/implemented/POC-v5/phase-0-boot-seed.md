# Phase 0 — Boot Seed (F4)

## ▶ Invocation
**Trigger:** "run phase 0" / reaching P0 from [`plan.md`](./plan.md).
**Prerequisite:** POC-v4 complete (it is).
**Do:** implement Tasks in `sheep-poc.html` + `sheep-defaults.json.js`, run
Verify, tick P0 in `plan.md`, **STOP, and report**. **Constraints:** plan.md
Global invariants.

## Goal
Every page load is a **new course** without the player pressing anything;
typing a seed replays a course exactly. Rule **F4** on Q21/Q22 defaults:
boot draws a seed when `randomSeedOnLoad` is true; **Reset run** replays the
current seed; **Reseed → new flock** draws a new one; `respawn` hooks keep
the current seed.

## Tasks
- **§0 (`Sim` category, schema):**
  - `randomSeedOnLoad` — boolean, default **true**, exposed, description ≈
    "F4: draw a fresh PRNG seed on every page load; off = boot with the
    pinned `seed` below (tuning / regression)". No hook (boot-time only).
  - `seed` — flip to `exposed: true`; it is an int with no min/max today, so
    `buildGui` must handle a **range-less int** (plain number field — lil-gui
    `add(obj, prop)` with no bounds). Give it `onChange: 'respawn'` so typing
    a seed re-lays that course (use `onFinishChange` for range-less number
    fields to avoid respawning on every keystroke — add that as a schema
    flag or special-case the no-range int in `buildGui`).
- **§4 BOOTSTRAP:** before `new FlockSim(params)`: `if
  (params.randomSeedOnLoad) params.seed = Math.floor(Math.random() * 1e6)`.
  Then, once GUIs exist, refresh the `seed` controller display
  (`controller.updateDisplay()`), so the panel shows the drawn seed. This is
  the **only new `Math.random()`**; §1 untouched.
- **§4 Tools:** unchanged — Reseed already draws + stamps `params.seed`;
  `restartRun()` already replays `params.seed`. Confirm in code, don't
  re-implement.
- **Defaults file:** add `"randomSeedOnLoad": true`; leave `"seed": 1337`
  (it is the pinned value when the flag is off).
- **§1:** nothing.

## Verify (measured)
- **Static / headless:** `grep -n Math.random` → exactly two hits, both
  outside §1 (Reseed button, boot draw). The §0+§1 Node slice still boots
  with `randomSeedOnLoad: false`, seed 1337 → gate side/position and the
  80 sheep positions **digest-identical** to v4 (record the digest; P1 and
  P6 reuse it).
- **F4 on the page (owner eyeball from `file://`):** reload 5 times; the
  Sim panel's `seed` differs each time, gate lands in different spots, and
  the flock is laid out differently (acceptance 1). Type an earlier seed →
  identical course (acceptance 2).
- **Q22:** after a run's score card, Reset run → same gate; Reseed → new.
- Idle A1/A4 spot check at the pinned seed unchanged; zero console errors.

## Done when
- [x] `randomSeedOnLoad` + exposed `seed` controllers live; defaults file
      carries the flag.
- [x] Boot draws the seed in §4 only; pinned boot reproduces v4's digest
      (`abe2c1ca69f2` @1337, `5eaa48d697e9` @42).
- [ ] Owner's `file://` check: 5 reloads → 5 courses; seed replay exact. **(pending owner)**

## Gotchas
- `buildParams` runs before §4, so the boot draw must happen **after**
  `params` exists and **before** `new FlockSim` — there is exactly one spot.
- Hooks only fire on user interaction; the boot draw must not go through
  `HOOKS.respawn` (no `sim` yet).
- `exportParams` will now export whatever seed was drawn — that is correct
  (a pasted export reproduces the course when the flag is off).
- lil-gui number fields without min/max have no slider; the ⓘ inspector's
  range formatter (`fmtRange`-style code near `type === 'boolean'`) must
  not print `undefined–undefined`.
