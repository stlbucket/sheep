# Phase 5 — verdict (sim)

**▶ Invocation:** after phase 4. `web/lib/sheep-sim.js` and `web/sheep-defaults.json.js` only. Owns Q105.

**Goal:** The sim can say how good a run was: reference score, percent, rank and four category grades (VH7–VH9, sim half).

## Tasks

- **§0:** add `rankBands`, `gradeBands`, `safetyPanicCost`; remove `starCalmShare`.
- **§1:** `referenceScore()` (closed form, fixed at spawn into `run.reference`); `rank()`; `categories()`; `score()` gains `rank`, `percent`, `reference`, `categories`, `endMults`, `bust`, `strikes`, `awards` with rarity, `objectives`, `specials` penned, and drops `stars`.

## Verify

Headless node script: verdict-and-hud.md criteria 7, 8 and 10, and criterion 11 for `web/lib/`. Pages still load (the v14 card must tolerate a missing `stars`).

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** `rankBands` and `gradeBands` are lists: check how the settings schema and lil-gui handle a non-scalar key before choosing the shape (six scalar keys may be simpler). The reference must use the course as spawned, including which specials it has.
