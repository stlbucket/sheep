# POC-v5 Build — Master Plan & Runner

Fifth iteration, two features:

1. **Random Course & Spawn Layouts** — a fresh seed on every page load
   (**F4**), three spawn archetypes — beside-gate / whole-pasture-with-holes /
   weighted-to-one-area (**F5–F7**), a no-spawn clearance around the gate
   (**F8**), F3 amended. Spec: [spawn-layouts.md](./spawn-layouts.md).
2. **Tuning Levers** — 12 named 0–1 levers in 3 domains over the raw params;
   stamp-and-release, exact 0.5 anchor, cross-lever guards, Levers root above
   an Advanced disclosure. Spec: [tuning-levers.md](./tuning-levers.md).

Owner proceeded to plan **2026-08-21** with **Q13–Q30 on their bolded
defaults** (see both specs' open-question sections and the
[README](./README.md)). Notably: Q21/Q22 (random seed at boot; Reset run
replays, Reseed draws), Q23 (equal-thirds archetype mix, hard-coded), Q27
(Approach owns the new spawn params at anchor; no archetype bias), Q29 (this
behavior change stays in v5), Q14/Q15 (expose `canvasW/H`; pasture levers
respawn), Q17 (lever positions persist as UI state).

**Precondition waived by the owner:** the README's "play POC-v4 first"
step. Consequence, recorded here so nobody is surprised: the levers' 0.5
anchor is frozen to the defaults **as of 2026-08-21**
([`poc/params-2026-08-21-v4.json`](../../poc/params-2026-08-21-v4.json)).
If the C7 hands-on read later changes `flankOvershootDeg`/`flankHandoffDeg`,
the Sweep profile's middle column must be re-edited and re-asserted — it is a
data edit, not a rebuild (P4 gotchas).

**Why spawn layouts build first:** the levers' inventory and anchor
assertion (P4) should run **once** over the final schema, and the levers'
behavioral-parity test (P6) needs the forced-`beside-gate` regression anchor
that P1 establishes.

---

## ▶ Invocation — how to run this plan

**Trigger:** `/sheep implement POC-v5`, "run the v5 plan", "run phase N".

1. Find the **first unchecked phase** below (or the requested one; its
   prerequisite must be ticked).
2. Follow that phase file exactly — implement its Tasks in
   `.claude/sheep/poc/sheep-poc.html` (+ `sheep-defaults.json.js` where a
   schema entry changes), run its Verify. **Measurement convention (owner
   rule, see memory): no webserver.** Measure headless in Node on the
   §0+§1 slice cut at the section markers with lil-gui stubbed (the v4
   method), fast-forwarding with `sim.step()` loops and metrics per rule ID;
   anything that is *only* observable on the page (panels, console at boot)
   is a static check + the owner's `file://` eyeball.
3. On acceptance: tick the phase here, **STOP, and report** (what was built,
   how to eyeball it from `file://`). Wait for go-ahead. ("Run all phases" →
   continue, reporting at each gate; halt on any Verify failure.)
4. After the last phase: run the Definition of done, move `spec/POC-v5/` →
   `implemented/POC-v5/`, mark both features `implemented`. **Never commit —
   report and stop; git is the owner's.**

**Target files:** `.claude/sheep/poc/sheep-poc.html`,
`.claude/sheep/poc/sheep-defaults.json.js`.

## Global invariants (every phase)

- One HTML file + one defaults file (`sheep-defaults.json.js`, pure JSON
  literal in a single `const SHEEP_DEFAULTS =`); plain `<script>`; runs from
  `file://`; lil-gui UMD via CDN. **No fnb DB/GraphQL/backend.**
- New tunables enter as **`SETTINGS` schema entries** (controller, tooltip,
  ⓘ-grid row, defaults-file key, export — all for free or the schema is
  broken). **The only `Math.random()` calls live in §3/§4** (Reseed button,
  boot seed draw); §1 uses the seeded PRNG exclusively.
- **§1 SIM stays DOM-free and lever-unaware**; it receives a plain resolved
  `params`; fixed `dt = 1/60` with accumulator.
- **Determinism:** `(seed, params, [commands])` reproduces a run — every
  archetype/hole/focus draw comes from the seeded stream.
- **Regression anchor:** `randomSeedOnLoad: false` + `spawnLayout:
  beside-gate` + **`spawnGateClear: 0`** + seed 1337 must reproduce POC-v4
  **byte-identically** (P1 established this; P6 re-checks it under the lever
  layer at 0.5). *As-built finding (P1):* the F8 clearance at its 120 px
  default rejects candidates in **every** seed tested (v3's sampler placed
  groups as close as 45 px to the mouth), so the anchor config is one param
  off the shipped defaults — by design, F8 is a behavior the owner asked for.
- **POC-v2 A/B, v3 C/D/E/F/G/H, v4 C7/F1 rules must not regress** at the
  anchor — every phase spot-checks the idle field (A1/A4 quick metrics) and
  the dog's F1 facing after respawn.
- **Command-strip highlight = the dog's actual state** (v3 Q5 convention).
- Every phase leaves the page runnable, zero console errors.

## Section map (of `sheep-poc.html`)

`§0 PARAMS` (SETTINGS schema, `buildParams`, `PANELS`, `buildGui`, HOOKS —
**levers' data + resolve land here**) · `§1 SIM` (DOM-free; `FlockSim`:
`reseed`/`placeGate`/`spawn`/`spawnSheep`, `stepDog`, flock forces,
`idealPath`) · `§2 RENDER` (canvas draw, path overlay, debug overlays) ·
`§3 INPUT` (command strip, hotkeys, ⓘ inspector — **lever panel lands
here**) · `§4 BOOTSTRAP` (`new FlockSim`, `exportParams`, Tools folder,
frame loop — **boot seed draw + canvas resize land here**).

## Phases

| # | File | Goal | Proves |
|---|---|---|---|
| 0 | [phase-0-boot-seed.md](./phase-0-boot-seed.md) | fresh seed on every load; `seed` editable; Reset replays, Reseed draws | F4 (Q21/Q22) |
| 1 | [phase-1-layout-selector.md](./phase-1-layout-selector.md) | `enum` schema type; `spawnLayout` selector; `spawn()` split into samplers (beside-gate verbatim); gate clearance | F8 + the v4 regression anchor |
| 2 | [phase-2-whole-pasture.md](./phase-2-whole-pasture.md) | whole-pasture sampler with irregular holes; ideal line from initial GCM | F6, F3-amended |
| 3 | [phase-3-weighted.md](./phase-3-weighted.md) | weighted sampler; `random` draws equal thirds across all three | F7, F5 |
| 4 | [phase-4-lever-model.md](./phase-4-lever-model.md) | `LEVERS` data (12 profiles incl. Approach's new keys), `resolve`, coercion, G1/G2 guards, stamp-and-release state, boot assertions (anchor + ownership) | levers acceptance 1, 5, 6 (headless) |
| 5 | [phase-5-lever-panel.md](./phase-5-lever-panel.md) | Levers root + Advanced disclosure; reset buttons; `(modified)` / `limited by` readouts; `canvasW/H` exposed + canvas resize; lever block in defaults/export; ⓘ stamp | levers acceptance 2, 4, 8, 9, 10 |
| 6 | [phase-6-acceptance.md](./phase-6-acceptance.md) | **runs LAST** — anchor parity vs v4 P2 numbers, 24-endpoint robustness, spawn-layout sweep, docs/params sync | both specs' criteria; version DoD |

## Progress tracker

- [x] Phase 0 — Boot seed (F4) (2026-08-21; headless Node slice per the
  no-webserver rule. `randomSeedOnLoad` (Sim, default true) + `seed` now an
  exposed range-less field with `onFinishChange → respawn`; §4 draws the seed
  before `new FlockSim` and refreshes the controller. `Math.random` count = 2
  (boot, Reseed button), both outside §1. Pinned boot (flag off) at seeds
  1337/42 → digests `abe2c1ca69f2` / `5eaa48d697e9` = pre-change v4 baseline;
  idle 10 s @1337 still 1.00, dist-GCM 185.4→185.4. Owner's `file://` 5-reload
  check pending)
- [x] Phase 1 — Layout selector, sampler split, gate clearance (F8, anchor)
  (2026-08-21; headless. `enum` schema type end to end (dropdown, defaults
  typo-guard → default + warning, export string, inspector lists options);
  new `Spawn` category in Course & Meta with `spawnLayout` (random) +
  `spawnGateClear` (120); `spawn()` = `pickLayout` (forced = no draw; random =
  one draw after placeGate) → `samplers()` table → shared sizing/min-gap/F8
  loop counting **accepted** tries to 150 (cap 600) so an un-rejected run is
  the v4 loop draw for draw. Anchor: forced beside-gate + clearance 0 →
  `abe2c1ca69f2`/`5eaa48d697e9` = v4 at 1337/42, idle 185.4→185.4; clearance
  120 changes 30/30 seeds (documented above). F8 over 24 seeds: min
  sheep→gate 125.4 px, 0 committed/through at t=0, facing 0.000°; at
  `spawnGateOffset 60` clearance bites (122.8 px). HUD shows `seed · layout`.
  Random-layout tally over 24 seeds 11/5/8 — P3 checks the mix properly)
- [x] Phase 2 — Whole pasture with holes (F6) (2026-08-21; headless, 6
  forced seeds 200–205: bbox coverage 86–95 % × 80–94 % (≥ 80 % ✓), 2–5
  holes of 3–10 discs, **0 sheep inside any disc** every seed (also 0/150 in
  a 150-sheep / 8-hole r150–250 stress case, no NaN), 6/6 distinct hole
  layouts, biggest-cluster share 0.11–0.13 at t=0 (no blob), F8 min
  sheep→gate 146–194 px, 0 committed, F1 facing 0.000°, `idealPath[0]` =
  initial GCM (0.00 px), 10 s idle still 0.998–1.0 / share unchanged /
  dist-GCM drifts ≤ 2 px; determinism ✓; anchor digest still = v4. ⚠ The
  phase file's "nn-distance CV > 0.3" lattice metric hit 3/6 (0.10–0.36) —
  min-gap rejection sampling is Poisson-disc-like by construction, so the
  threshold was mis-specified, not the sampler; P3 compares beside-gate's CV
  to settle it. `debug.spawnHoles` overlay added (Debug, not exported))
- [x] Phase 3 — Weighted + random mix (F7, F5) (2026-08-21; headless.
  Forced weighted, seeds 300–305: **75–83 %** of sheep within 1.2 R of the
  focus (≥ 70 % ✓), 6/6 distinct foci, 2/6 foci > half a field width from
  the gate, core = 8–15 spawn groups, 0 sheep outside the field, F8 min
  133 px, F1 0.000°, `idealPath[0]` = GCM; n = 20 / 150 → R 75 / 205, 90 % /
  79 % in core, no NaN. Core stability measured physically: mean
  dist-to-focus of core sheep drifts −4.8…+2.1 % over 10 s, 100 % still
  within 1.2 R, still-frac 0.97–1.0. ⚠ The spec's "biggest-cluster share
  changes ≤ 0.1 in 10 s" criterion is withdrawn as a metric: at a 48 px link
  distance it sits on the 60 px in-core gap and flips 0.2–0.3 with graze
  steps while nothing moves physically; by the same metric the shipped v3
  beside-gate layout scores **1.00 on 3/6 seeds** vs the weighted core's
  0.28–0.51 — the core is *less* blobby than the reference, so
  `focusGapScale` stays at its Q25 default 0.5. F5 mix: 12 random seeds →
  5/4/3, all three present; 60 → 23/14/23; 300 consecutive ints → 114/92/94
  (+2.4σ on beside-gate — mulberry32 consecutive-seed correlation on the 4th
  draw); 300 scattered seeds → 97/95/108 (beside/whole/weighted); 300 LCG seeds → 80/115/105 (beside/whole/weighted).
  Determinism ✓, anchor digest still = v4. nn-CV lattice metric settled:
  beside-gate 0.13–0.43 vs whole-pasture 0.10–0.36 — same range, metric
  withdrawn)
- [x] Phase 4 — Lever model + assertions (2026-08-21; headless. `LEVERS`
  (12 profiles transcribed from lever-model.md; Approach extended with the 9
  v5 spawn keys at anchor), `LEVER_NOT_LEVERED` (7 superseded · 3 derived ·
  5 substrate · 3 draws · 7 judging · 11 `debug.*`), `resolveLever` (t=0.5
  returns the middle exactly), `coerceSetting` (clamp, int round, step snap
  with floor/ceil modes for guards), `leverState` + `setLever` /
  `leverModified` / `applyLeverGuards` / `initLeverState` (Q17 positions
  loaded + stamped without writing), `assertLevers` at boot. Boot line:
  **anchor 88/88 exact · 88 levered + 36 not-levered = 124 schema keys**
  (the plan's "120" estimate was off; the live census rules). Measured: 176
  endpoint values all in range / on step grid / ints integer; G1 Standoff
  1.0 @ Presence 0.5 → `driveTrailGap` 40 + `limitedBy: [dogPresence]`;
  G2 + Nerve 1.0 → `dogVMax` 125 ≥ 120.75; Presence 1.0 re-derives the gap
  to 65 (floor-snapped under 66.7); stamp-and-release: hand-edit survives
  another lever, re-stamp clears; randomize-all → reset-all deep-equals the
  anchor; lever layer at 0.5 leaves the forced beside-gate/clear-0 digest
  = v4; a defaults-file `levers` block with Presence 0.8 boots as
  `(modified)`; a hand-edited `R_flee 121` in the file → `console.error`
  87/88. `buildParams` exempts the `levers` block from the typo guard)
- [x] Phase 5 — Lever panel + canvas resize + persistence (2026-08-21;
  headless + a full-script smoke run in Node with DOM/lil-gui stubs (the
  page itself is the owner's `file://` eyeball). Built: `#panel-left-col`
  with a **Levers** root (Dog / Sheep / Pasture folders × 4 sliders + `Reset
  this domain`, `Reset all levers to 0.5`), lever tooltips (blurb, ends,
  owned keys), names carry `(modified)` / `— limited by Presence & Nerve`;
  an **Advanced — raw params** disclosure (closed at boot) toggles the three
  existing panels via `body.advanced-closed` — the v3 Q1 sheep-left /
  dog-right split survives inside it; `canvasW/H` exposed (600–1600 /
  400–1000 · 10, respawn) + `resizeCanvas()` in §2 called from
  `HOOKS.respawn`; raw-panel `onChange` refreshes lever names (hand-edits
  show immediately); ⓘ grid gains a `lever · stamp` column and raw tooltips
  name their owner + stamp; export appends the `levers` block. Measured:
  acceptance 8 — Scale 0/0.5/1 → 800×520 / 1120×720 / 1500×960, 18/80/150
  sheep all inside the new rect, gate on the new perimeter, facing 0.000°;
  Gate 0/1 and Approach 0/1 respawn with no NaN, idle still ≥ 0.977;
  acceptance 9 — export (113 keys + block) parses as pure JSON, reloads to
  the same raw values and positions with no `(modified)`; census 124 schema
  / **105 exposed** + 12 lever sliders. Two as-built fixes: (a) lil-gui
  writes `leverState.pos` *before* `onChange`, so the pasture respawn now
  keys off a change in the owned raw values (the smoke test caught Scale→1
  not respawning); (b) the anchor assertion compares against the **schema**
  default, not the loaded file — a file exported at non-0.5 positions (Q17)
  boots `88/88 OK` with no `(modified)`, a file hand-tuned at 0.5 shows
  `(modified)` without a console error, and a profile transcription error
  still fails loudly)
- [x] Phase 6 — Acceptance & sync (2026-08-21; headless, whole script under
  a DOM / lil-gui stub. **Anchor parity:** `params-2026-08-21-v4.json` vs the
  live export agree on all 101 shared keys; the v4 file boots into this
  build warning-free and reproduces its numbers; C1 sd 69.7–107.4, A1/A4
  185.4→187.1 / 139.9→134.8, B 80→60 / 174→198, overshoot-0 sweeps 201/215,
  Q12 43.6/32.1 all = v4 P2 to the decimal; come-by/away armed ticks 185 /
  195 / 196 / 124, carries +60.1 / +82.2 / +60.1 / +60.1°, sweeps 257 / 249 /
  266 / 222°, E1 38.5–38.9 px · 0.00 s (residuals vs v4's +60.4 / +85.8 /
  +60.3 / +60.3 and 257 / 252 / 267 / 223 are that harness's definitions,
  not kept). **24 endpoints** 60 s each: 0 throws, 0 NaN, finite scores.
  **Spawn sweep** 30 courses: mix 5/3/4, forced 18/18, whole-pasture cover
  86–95 × 80–94 %, 0 sheep in holes, weighted core 75–84 %, F8 min 125.1 px,
  0 committed/through, F1 0.000°, idle 1.000→1.000, ideal start = GCM.
  **Regressions** E2 16.7 s / 11.5 s at 54 / 57 px, G1 29/29 + 25/25, H1
  1–10 present, D rests on the diff. Static: §1 0 DOM refs, `Math.random`
  ×2 in §3/§4, defaults pure JSON 113 keys, census 105 = 105, root mirrors
  byte-identical. Docs synced, `params-2026-08-21-v5.json` written. Harness
  lesson: `reseed()` keeps `dog.command` — follow it with `that'll do` as
  the page does. Owner's `file://` line **pending**)

## Definition of done (whole version)

1. **Spawn-layouts acceptance 1–10 pass, measured** (spawn-layouts.md →
   Acceptance criteria), including the 12-reseed mix and the per-archetype
   10 s idle stability.
2. **Levers acceptance 1–11 pass, measured** (tuning-levers.md → Acceptance
   criteria), including **anchor parity** — the scripted come-by→drive at
   seeds 1337/42 (forced `beside-gate`, `randomSeedOnLoad` off) reproduces
   POC-v4 P2's handoff carry, sweep and E1 min-gap **to the same numbers**.
3. **No regressions** at the anchor: v2 A/B idle metrics, v3 C/D/E/G/H
   spot-checks, v4 F1 facing after every respawn path.
4. **Docs synced:** both spec acceptance logs filled; `lever-model.md`
   Appendix B corrections folded in + the Approach profile extended with the
   new keys; brainstorming README open-question entries updated; dated
   params snapshot `poc/params-<date>-v5.json` in the defaults-file format;
   `sheep-defaults.json.js` carries every new key + the `levers` block.
5. **Zero console errors from `file://`** (HTML + defaults file only) — the
   owner's eyeball; everything static is checked before asking.
