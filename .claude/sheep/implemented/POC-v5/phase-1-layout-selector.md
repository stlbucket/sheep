# Phase 1 — Layout Selector, Sampler Split, Gate Clearance (F8 + anchor)

## ▶ Invocation
**Trigger:** "run phase 1" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 0 ticked.
**Do:** implement Tasks, run Verify, tick P1 in `plan.md`, **STOP, and
report**. **Constraints:** plan.md Global invariants.

## Goal
The schema gains an **`enum` type**; a `spawnLayout` selector appears
(`random · beside-gate · whole-pasture · weighted`); `spawn()` is split into
a dispatcher + per-archetype **seed samplers**, with `beside-gate` = today's
sampler verbatim; the **F8 gate clearance** applies to every sampler. In
this phase `random`, `whole-pasture` and `weighted` all fall back to
`beside-gate` (logged once) — P2/P3 fill them in. Proves F8 and pins the
**v4 regression anchor**.

## Tasks
- **§0 schema — new `enum` type:** entries carry `options: [...]` (strings)
  and a string `default`. Touch every type switch: `buildParams` (copy
  string), `buildGui` (`f.add(holder, prop, e.options)` → dropdown),
  `exportParams` (string passes through), §3 inspector value/range
  formatters (`fmtValue`/range text → list the options). A JSON string, so
  the defaults-file invariant holds.
- **§0 entries (category `Gate + Crush`, or a new `Spawn` category mapped
  into the Course & Meta panel — pick `Spawn`, it will hold 9 keys):**
  - `spawnLayout` — enum, options `['random','beside-gate','whole-pasture',
    'weighted']`, default **`random`**, exposed, `onChange: 'respawn'`.
  - `spawnGateClear` — float px, default **120**, 40–300·5, exposed,
    `onChange: 'respawn'`, description ≈ "F8: no group seed within this
    distance of the gate mouth (+ clusterSpread), any archetype".
  - Rewrite `spawnGateOffset`/`spawnDepth` descriptions: "beside-gate
    archetype only".
- **§1 `spawn()` refactor:**
  - Extract today's `sampleSpawn(grow)` into `sampleBesideGate(grow)`.
  - Add `pickLayout()`: if `p.spawnLayout !== 'random'` return it **without
    consuming a PRNG draw**; else `['beside-gate','whole-pasture',
    'weighted'][Math.floor(this.rng() * 3)]` (Q23 equal thirds). Store
    `this.layout` (render/debug may show it). Called **after**
    `placeGate()` — inside `spawn()`, first thing.
  - Dispatcher: `const sampler = { 'beside-gate': …, 'whole-pasture': …,
    'weighted': … }[this.layout]`; the two unimplemented samplers alias
    beside-gate in this phase — **quietly** (§1 stays silent; the phase
    report says so, P2/P3 replace the aliases).
  - **F8 clearance** in the min-gap rejection loop: reject a candidate seed
    if `hypot(c − gate) < p.spawnGateClear + p.clusterSpread`. Applies to
    every sampler. The existing "most-isolated fallback" must never pick a
    rejected-for-clearance candidate — track clearance separately from gap.
  - `idealPath` first vertex: keep the spawn-region center for beside-gate;
    P2 switches the others to the initial GCM.
- **Defaults file:** add `spawnLayout: "random"`, `spawnGateClear: 120`.
- **§2:** optional — print the layout name in the existing HUD line
  (`seed · layout`), helps the owner eyeball P2/P3.

## Verify (measured, headless Node slice)
- **Regression anchor:** `randomSeedOnLoad: false`, `spawnLayout:
  'beside-gate'`, seed 1337 → sheep-position digest **identical to P0's
  digest** (the forced path consumes no extra PRNG draw). Same at seed 42.
- **F8:** 12 reseeds (forced beside-gate) → min distance from any sheep to
  the gate mouth ≥ `spawnGateClear` (120 px); zero `committed`/`through` at
  t=0. Note: v3's default offset is 200 px along the fence and 30+ px deep,
  so at defaults this mostly confirms; also test `spawnGateOffset 60` to see
  the clearance actually bite.
- **Enum plumbing (static):** export emits `"spawnLayout": "random"`;
  `buildParams` round-trips a pasted enum; unknown option string → falls
  back to default with one warning (typo guard, like unknown keys).
- **Dog F1** facing-vs-GCM < 1° after every reseed; idle A1/A4 flat.
- Zero console errors (owner `file://`): dropdown shows four options.

## Done when
- [x] `enum` type works end to end (GUI, export, inspector, defaults).
- [x] `spawn()` = `pickLayout` + dispatcher + shared clearance; beside-gate
      digest-identical to v4 at seeds 1337/42 **with `spawnGateClear 0`** (at
      120 every seed changes — see plan.md anchor note).
- [x] F8 measured (24 seeds, min 125.4 px, 0 committed); A1/A4/F1 hold.

## Gotchas
- **PRNG stream discipline is the whole game here.** Forced archetype: no
  draw. `random`: one draw, taken *after* `placeGate()` and *before* group
  sizes — so the gate/home/dog of seed 1337 never move. Document the order
  in a comment above `spawn()`.
- The most-isolated fallback in the rejection loop currently keeps "best so
  far" by gap only — a clearance-violating candidate must be excluded from
  `best`, not just from the success test.
- lil-gui dropdown `onChange` fires with the new value; `HOOKS.respawn`
  ignores arguments — fine.
- `enum` values are strings in `params`; §1 compares with `===` against
  literals. Don't map to ints.
