# POC-v2 · Feature: Settings Inspector

**Status:** **implemented 2026-07-13** (plan P0–P1) — schema drives `params` +
gui, tooltips + ⓘ grids live; Appendix A extended with the POC-v2 Idle/Dog
params (now ~77 entries).

**Review outcome (2026-07-13):** audit of Appendix A vs `§0 params`/gui found
and fixed: `gateWidth` default is **42** (P5 tuning), `minSep` guards an
**inverse-linear** (not inverse-square) repulsion, `sheepCount` default becomes
**80** (per [flock-behavior](./flock-behavior.md)). Two code changes locked for
implementation: **`sheepCount` slider max 80 → 150** (perf caveat: brute-force
neighbors is O(n²); a spatial hash may be needed near 150) and **`w_line`
slider range 0–0.01 → 0–3·0.1** (bug: default 0.4 sat 40× above the slider max;
w_line accumulates the same normalized 0..1/s as its sibling axes).

Make every tunable in the sheep PoC **self-describing**. Today the PoC has ~64
tunables spread across 10 lil-gui folders, but ~half have no slider at all and
none carry a human-readable explanation. This feature adds a **single settings
schema** that becomes the source of truth for the whole tuning UI, plus two ways
to read what each setting does: **hover tooltips** in normal mode and a
**per-category detail grid** popup.

This is a fnb side-project — **no fnb DB/GraphQL/backend**. It also must honor the
POC's build invariants (one HTML file, one plain `<script>`, §1 SIM stays
DOM-free). See [Constraints](#constraints).

---

## Goals

1. **One schema, one source of truth.** A single in-file `SETTINGS` structure
   describes every tunable: key, category, label, type, default, valid values,
   unit, and a plain-English description. The `params` object **and** the lil-gui
   folders/controllers are **generated from it** — no more facts split between the
   `params` literal and the `gui.add(...)` calls.
2. **Complete coverage.** All ~64 params are documented, including the ~31 that
   currently have no slider, via an `exposed` flag.
3. **Hover to learn (normal mode).** Hovering a lil-gui control shows its
   description in a tooltip.
4. **Per-category reference popup.** Each lil-gui folder header gets an **ⓘ
   button**; clicking it opens a grid of every setting in that category with full
   detail (label, key, type, range, default, unit, current value, description).

## Non-goals (POC-v2)

- No editing from the popup grid — it is **read-only reference**; editing still
  happens through the lil-gui sliders. (Parked — see Open questions.)
- No search/filter across categories, no master "all settings" overlay (we chose
  per-folder ⓘ over a single tabbed overlay).
- Not adding new sliders for hidden params by default — `exposed` stays as it is
  today unless Appendix A flags a change. (Parked.)
- No change to §1 SIM behavior or the force model. This is tooling only.

---

## The settings schema (single source of truth)

An ordered array of entries lives at the top of §0. Shape of one entry:

```js
{
  key: 'r_sep',            // property name on params (or 'debug.eye' for nested)
  category: 'Boids',       // lil-gui folder (drives grouping + order)
  label: 'separation radius',
  type: 'float',           // 'float' | 'int' | 'boolean' | 'point'
  default: 18,
  min: 4, max: 60, step: 1, // omitted for boolean; point uses per-axis min/max
  unit: 'px',              // 'px' | 'px/s' | 'px/s²' | 'rad/s' | 's' | '—'
  description: 'How close two sheep tolerate before pushing apart.',
  exposed: true,           // false = documented but no slider
  export: true,            // false = excluded from the P7 params JSON export (e.g. debug)
  onChange: 'respawn'      // optional named hook (see below); most omit it
}
```

**Generation rules — the schema drives the app:**

- **`params` defaults:** at boot, build `params` by reducing `SETTINGS` → for each
  entry set `params[key] = default` (respecting nested keys like `debug.eye` and
  `point` values `{x,y}`). §1 SIM still receives the resulting plain `params`
  object exactly as today; it never sees the schema.
- **lil-gui folders:** iterate `SETTINGS` in order; create each `category` folder
  once (first appearance, in array order), then for every `exposed` entry add the
  right controller — `float`/`int` → `add(params, key, min, max, step)`,
  `boolean` → `add(...)`, `point` → an x and a y controller. `label` sets the
  controller name.
- **onChange hooks:** a few controls need side effects (e.g. `sheepCount` respawns
  the herd, `fenceInset` may relayout). The generator looks up a small
  `HOOKS = { respawn(){…}, … }` table by the entry's `onChange` name and wires it.
  This preserves today's special bindings without hardcoding them in the loop.
- **Export stays consistent:** the P7 "export params as JSON" emits only entries
  with `export: true` (so debug toggles stay out, as they do today).

The schema is **dev-tooling metadata**, not part of the Godot-bound SIM. The
salvage path is unchanged: export the resolved `params` **values** (already
supported) and lift §1. The `SETTINGS` array itself is throwaway.

---

## UI

### 1. Hover tooltip (normal mode)
Each generated controller shows its `description` on hover. Use a **small custom
styled tooltip** (a positioned `<div>`), not the native `title=` attribute —
native is slow to appear and unstyleable. Attach on the controller's
`.domElement`; show on `mouseenter`, hide on `mouseleave`. Tooltip also shows the
unit and range as a secondary line (e.g. `px · 4–60`).

### 2. Per-category detail grid (ⓘ button)
- Add an **ⓘ button** into each lil-gui folder's title row (the folder header
  `.title` element).
- Clicking it opens a **modal grid** for that category — a dismissible overlay
  (click-outside / Esc / ✕ closes). Only one open at a time.
- Grid columns: **Label · key · type · range (min–max·step, or true/false) ·
  default · unit · current value · description**. `current value` reads live from
  `params` at open time. Non-`exposed` rows are shown too (marked e.g. a muted
  "no slider" tag) so the grid is the complete reference for the category.
- Styling: reuse the throwaway HUD/panel CSS idiom; a clean table with sticky
  header, zebra rows, monospace for keys/values. Lives in §2 RENDER / §3 INPUT
  (DOM side) — never in §1.

---

## Constraints

- **Single file, one plain `<script>`.** The schema is an **inline JS literal**,
  not a separate `.json` file (can't `fetch` from `file://`, and the one-file rule
  forbids it). It is JSON-shaped and could be serialized out later if wanted.
- **§1 SIM stays DOM-free.** Schema parsing, `params` generation wiring, tooltips,
  and the grid modal all live in §0 / §2 / §3 — the SIM only ever consumes the
  resulting `params` values.
- **Page runs by double-click**, no console errors, after this feature lands.
- **lil-gui UMD** (`window.lil.GUI`) unchanged; we extend its DOM (folder titles)
  rather than replace it.

---

## Acceptance criteria

1. Deleting the old hand-written `gui.addFolder/add` block and the `params`
   literal, the app still boots identically — folders, sliders, ranges, and
   defaults all come from `SETTINGS`.
2. Every entry in Appendix A is present in `SETTINGS` with a description; the ~31
   currently-hidden params are documented (even if `exposed:false`).
3. Hovering any slider shows its description + unit/range tooltip.
4. Each folder header has an ⓘ button; clicking opens that category's grid with
   correct live current-values and closes cleanly.
5. `sheepCount` (and any other hooked control) still triggers its side effect.
6. Export still emits `export:true` values only; §1 SIM untouched.

---

## Open questions — all resolved by owner 2026-07-13

1. ~~**Editable grid?**~~ **Resolved** → **read-only** for v2; editing stays in
   the sliders.
2. ~~**Expose the hidden ones?**~~ **Resolved** → **no promotions**; all ~31
   hidden params stay documented-but-sliderless (`exposed:false`). New
   flock-behavior tunables get their sliders in planning as usual.
3. ~~**Tooltip mechanism**~~ **Resolved** → **custom styled div** (as chosen).
4. ~~**Structural values in the grid?**~~ **Resolved** → yes — `canvasW`, `dt`,
   `seed` etc. appear as **read-only rows**, never sliders.

---

## Appendix A — settings inventory (review this)

Proposed schema content. Descriptions are enriched from the current inline
comments; **please correct any that are wrong before we plan/implement.** `exp?`
= currently has a slider. Ranges for exposed rows are today's slider bounds;
ranges for hidden rows are proposals. Units: px, px/s, px/s², rad/s, s, — .

### Stage
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| canvasW | canvas width | int | 1120 | — | px | no | Field width; structural (read-only). |
| canvasH | canvas height | int | 720 | — | px | no | Field height; structural (read-only). |
| fenceInset | fence inset | int | 20 | 0–60·1 | px | yes | Play-area border margin inside the canvas. |
| L | body length | int | 12 | — | px | no | One sheep body-length; the unit most radii derive from. |

### Sheep
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| sheepCount | herd size | int | 80 | 1–150·1 | — | yes* | Number of sheep; changing it respawns the herd. (Current slider is 1–80; raise to 150 at implementation.) |
| vMax | max speed | float | 90 | 20–240·5 | px/s | yes | Top sheep speed. |
| grazeSpeed | graze speed | float | 15 | 0–60·1 | px/s | yes | Gentle wander cruising speed when undisturbed. |
| damping | damping | float | 0.9 | 0.5–0.99·0.01 | — | yes | Velocity retained per tick (drag). |
| wanderTurn | wander turn rate | float | 1.5 | 0–4·0.1 | rad/s | no | How fast graze heading random-walks. |

\* `sheepCount` is exposed but wired with a respawn hook (`onChange:'respawn'`).

### Idle *(added by POC-v2 flock-behavior, P2–P5)*
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| clusterSizeMin | group size min | int | 2 | 1–8·1 | — | yes* | Smallest spawn group of sheep. |
| clusterSizeMax | group size max | int | 5 | 2–12·1 | — | yes* | Largest spawn group of sheep. |
| clusterSpread | group spread | float | 24 | 6–60·1 | px | yes* | Jitter of members around their group seed (uniform disc — bounded, no gaussian tails). |
| clusterMinGap | group min gap | float | 120 | 40–300·5 | px | yes* | Minimum distance between spawn-group seeds (best-effort). |
| wandererFrac | wanderer fraction | float | 0.12 | 0–0.5·0.01 | — | yes* | Share of sheep that slowly drift instead of grazing in place. |
| idleSpeedCap | idle speed cap | float | 25 | 0–90·1 | px/s | yes | Hard speed limit on unpressured sheep — keeps the idle field calm (A1). |
| grazeStepEvery | graze step every | float | 4 | 0.5–12·0.5 | s | yes | Mean time between a grazing sheep's shuffle-steps. |
| grazeStepLen | graze step length | float | 12 | 0–48·1 | px | yes | How far one shuffle-step carries (~1 body-length). |
| idleCohRadius | idle cohesion radius | float | 60 | 20–160·5 | px | yes | Group-membership range for re-deriving idle groups after pressure (idle cohesion itself is same-group only, unbounded). |
| dogAvoidRadius | dog avoid radius | float | 45 | 0–120·5 | px | yes | Idle sheep drift away from a stood-down dog inside this range — soft keep-out, not flight (A8). |
| w_avoid | dog avoid weight | float | 0.4 | 0–2·0.05 | — | yes | Strength of the idle keep-out drift. |
| calmDelay | calm delay | float | 5 | 0–20·0.5 | s | yes | Continuous zero-threat time before an alert sheep settles back to idle (B1/B2 hysteresis). |
| crowdTolerance | crowd tolerance | int | 2 | 0–10·1 | — | yes | Idle sheep drift off when more than this many strangers stand within idleCohRadius — paces the B2 re-scatter. |

\* the cluster/wanderer params carry the `respawn` hook.

### Boids
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| r_sep | separation radius | float | 18 | 4–60·1 | px | yes | Distance below which sheep push apart. |
| minSep | min-separation clamp | float | 4 | 1–20·1 | px | yes | Floor on separation distance so the (inverse-linear) close-range repulsion can't explode. |
| cohN | cohesion neighbors | int | 10 | 1–20·1 | — | yes | How many nearest neighbors define the local center (topological). |
| cohScale | cohesion scale | float | 100 | 10–160·5 | px | yes | Spring range easing a sheep toward its local center of mass. |
| r_align | alignment radius | float | 36 | 6–120·1 | px | yes | Range over which sheep match heading. |
| w_sep | separation weight | float | 1.5 | 0–4·0.1 | — | yes | Strength of the push-apart force. |
| w_coh | cohesion weight | float | 1.0 | 0–4·0.1 | — | yes | Strength of the pull-together force. |
| w_align | alignment weight | float | 0.2 | 0–2·0.05 | — | yes | Strength of heading-matching (weak — sheep aren't starlings). |
| w_graze | graze weight | float | 0.3 | 0–2·0.05 | — | yes | Strength of the idle wander force. |
| accelScale | accel scale | float | 250 | 0–800·10 | px/s² | yes | Global responsiveness: accel per unit steering force. |

### Flee / Eye
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| dogVMax | dog max speed | float | 135 | 40–300·5 | px/s | no | Top dog speed (≈1.5× sheep). |
| R_flee | flee radius | float | 120 | 40–300·5 | px | yes | Distance within which the dog scares sheep. |
| w_flee | flee weight | float | 2.0 | 0–5·0.1 | — | yes | Strength of the run-from-dog force. |
| ambient | eye ambient floor | float | 0.2 | 0–1·0.05 | — | yes | 1 = pure radius threat, 0 = pure gaze-cone threat. |
| coneK | eye cone tightness | float | 2 | 0.5–8·0.5 | — | yes | How focused the dog's "eye" cone is (cosᵏ). |

### Dog
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| R_orbit | orbit radius | float | 160 | 60–300·5 | px | yes | Come-by/away standoff distance around the flock center. |
| omega | orbit speed | float | 1.2 | 0.2–3·0.1 | rad/s | yes | How fast the dog circles during come-by/away. |
| R_drive | drive standoff | float | 140 | 80–260·5 | px | yes | Walk-on standoff behind the flock. |
| driveShrink | drive shrink rate | float | 10 | 0–40·1 | px/s | yes | How fast walk-on closes that standoff over time. |
| R_driveMin | drive standoff floor | float | 55 | 40–160·5 | px | yes | Closest walk-on gets before stopping (don't walk into the blob). |
| lieDownIntensity | lie-down intensity | float | 0.3 | 0–1·0.05 | — | yes | Residual dog pressure while lying down. |
| heelIntensity | heel intensity | float | 0 | 0–1·0.05 | — | yes | Dog pressure while stood down at the owner's side — 0 = an idle dog exerts none (A7). *(POC-v2 P4)* |
| goal | goal / pen center | point | {970,360} | x 820–1100, y 20–700 | px | no | Where the flock is being driven. |

### Gate + Crush
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| fenceX | fence x | int | 820 | 600–1000·5 | px | no | Interior fence line; goal pen is x > fenceX. |
| gateY | gate center y | int | 360 | 20–700·5 | px | no | Vertical center of the gate gap. |
| gateWidth | gate width | int | 42 | 12–60·1 | px | yes | Gate opening size (default tuned up from 30 during P5). |
| w_fence | fence weight | float | 1.5 | 0–4·0.1 | — | yes | Strength of fence repulsion. |
| r_fence | fence range | float | 30 | 10–80·1 | px | yes | Distance at which the fence pushes sheep. |
| spawnMinX | spawn region min x | int | 220 | 20–800·5 | px | no | Left edge of the cluster-seed spawn region. |
| spawnMaxX | spawn region max x | int | 700 | 20–800·5 | px | no | Right edge of the cluster-seed spawn region (widened 500→700 for scattered groups, POC-v2 P2). |
| crushRadius | crush radius | float | 40 | 20–80·1 | px | yes | Gate-mouth neighborhood used to measure crush. |
| crushThreshold | crush threshold | float | 1.5 | 0.5–8·0.1 | — | yes | Density×pressure above which sustained crush injures (calibrated P5). |
| crushSustain | crush sustain | float | 0.8 | 0–3·0.1 | s | no | Seconds over threshold before an injury event fires. |

### Boldness
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| boldnessTheta | boldness hold | float | 0.5 | 0–1.5·0.05 | — | yes | Sheep ignores the dog while threat < boldness·θ. |
| panicThreshold | panic threshold | float | 0.6 | 0.2–1·0.05 | — | yes | Threat above this triggers a panic sprint (enables bolting). |
| panicMult | panic multiplier | float | 1.6 | 1–2.5·0.1 | — | yes | vMax multiplier while panicking. |
| protestProb | protest chance | float | 0.6 | 0–1·0.05 | — | no | Per-second chance a brave sheep protests just below threshold. |
| protestDur | protest duration | float | 0.3 | 0–1·0.05 | s | no | How long a protest stamp lasts. |

### Scoring
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| w_time | time penalty | float | 0.1 | 0–1·0.01 | — | yes | Points lost per second of run time. |
| w_line | line penalty | float | 0.4 | 0–3·0.1 | — | yes | Points lost per second fully off the ideal path. (Current slider 0–0.01 is a bug; fix to 0–3·0.1 at implementation.) |
| w_cohesion | cohesion penalty | float | 0.4 | 0–3·0.1 | — | yes | Points lost per straggler-fraction-second (+1.5× per split). |
| w_calm | calm penalty | float | 0.6 | 0–5·0.1 | — | yes | Points lost per second of full flock panic. |
| injuryWeight | injury weight | float | 5 | 0–20·0.5 | — | no | Stress-seconds equivalent charged per injury. |
| lineNorm | line norm | float | 150 | 20–400·5 | px | no | Path deviation that counts as "fully off-line". |
| T_straggle | straggle time | float | 3.0 | 0–6·0.5 | s | yes | Seconds outside the blob before a sheep counts as a straggler. |
| splitMinSize | split min size | int | 3 | 2–8·1 | — | yes | Min cluster size to count as a real sub-flock. |
| clusterDist | cluster link dist | float | 70 | 20–160·5 | px | no | Link distance for cluster/split detection. |

### Debug (render toggles — `export:false`)
| key | label | type | default | unit | exp? | description |
|---|---|---|---|---|---|---|
| debug.eye | flee cone + R_flee | boolean | true | — | yes | Draw the dog's gaze cone and flee radius. |
| debug.velocity | velocity vectors | boolean | false | — | yes | Draw per-sheep velocity arrows. |
| debug.neighbors | neighbor links | boolean | false | — | yes | Draw alignment-neighbor links. |
| debug.gcm | flock GCM | boolean | false | — | yes | Draw the flock's center of mass. |
| debug.dogTarget | dog target | boolean | false | — | yes | Draw the dog's current steering target. |
| debug.state | collect / drive | boolean | false | — | yes | Label the dog's current collect/drive state. |

### Sim (structural — mostly read-only)
| key | label | type | default | range | unit | exp? | description |
|---|---|---|---|---|---|---|---|
| seed | PRNG seed | int | 1337 | — | — | no | Seed for reproducible runs (reseed via the reseed button). |
| dt | fixed timestep | float | 0.0167 | — | s | no | Fixed simulation step (1/60 s). |
| maxFrameDelta | max frame delta | float | 0.25 | — | s | no | Clamp on real elapsed time to prevent spiral-of-death. |

---

## Appendix A.1 — POC-v3 deltas (2026-07-13)

The tables above are the POC-v2 snapshot. POC-v3 (see
[`../POC-v3/`](../POC-v3/)) changed the inventory as follows; the live schema
in `poc/sheep-poc.html §0` is authoritative, and every default now also lives
in [`poc/sheep-defaults.json.js`](../../poc/sheep-defaults.json.js) (Q2 —
edit the file, reload, no HTML changes).

### New (Dog — flanking / postures / drive, P0–P5)
| key | label | default | range | unit | notes |
|---|---|---|---|---|---|
| dogVMax | dog max speed | 110 | 40–300·5 | px/s | was hidden at 135; exposed + lowered (Q8 guess) |
| flankStandoff | flank standoff | 140 | 60–300·5 | px | distance beyond the flock EDGE while flanking |
| flankConeDeg | flank eye angle | 45 | 20–70·1 | ° | C3 held eye |
| flankAdvance | flank advance rate | 1.0 | 0.2–3·0.1 | rad/s | linear speed capped at 0.9·dogVMax (P5) |
| fenceSeekBias | fence seek bias | 0.6 | 0–1·0.05 | — | C2 slot between sheep and fence |
| flankHandoffDeg | flank handoff angle | 30 | 10–90·1 | ° | C6 finite-flank tolerance |
| driveTrailGap | drive trail gap | 40 | 20–160·5 | px | E1 governor (replaces driveShrink) |
| stallSpeed / stallDwell | stall detect | 8 / 1.5 | — | px/s · s | E2 auto-stand |
| shove/bark/lean Mult·Dur·Decay | impulse shapes | 1.5·0.8·0.5 / 2·0.4·0.3 / 1.2·1.5·0.5 | — | — · s · s | E3 flavors |
| R_driveMin | drive standoff floor | 55 | 40–160·5 | px | |
| lieDownBlock / standBlock | posture walls | 1.4 / 2.2 | 0–3 / 0–4 | — | D1/D3 (stand > lie) |
| postureConeK / postureRange | posture shape | 4 / 0.6 | — | — | tight arc, short reach |

### New (Course & flock, P6–P8 + P4)
| key | label | default | range | unit | notes |
|---|---|---|---|---|---|
| gateCornerMargin | gate corner margin | 80 | 40–200·5 | px | F1 perimeter-gate draw |
| spawnGateOffset / spawnDepth | spawn anchor | 200 / 140 | — | px | F2 near-gate-one-side |
| gateApproachR / w_through | gate commitment | 60 / 2.0 | — | px · — | G1 sticky funnel |
| clusterSizeMax | max group size | **10** (was 5) | 1–20·1 | — | H1 slider; sizes draw uniform 1..n |
| boldMean / boldSd | boldness draw | 0.3 / 0.22 | 0–1 / 0–0.5 | — | was hard-coded gauss(0.3, 0.1); sd raised so D2's >0.8 tail exists (~0–2 per 80) |
| debug.gateZone | gate approach zone | false | — | — | draws the G1 zone |

### Superseded (kept in the schema as `exposed:false` documentation)
| key | superseded by | phase |
|---|---|---|
| R_orbit, omega | flanking (C1–C6) | v3 P0 |
| driveShrink | driveTrailGap governor (E1) | v3 P2 |
| fenceX, gateY | seeded perimeter gate (`sim.gate`) | v3 P6 |
| spawnMinX, spawnMaxX | gate-anchored spawn (F2) | v3 P6 |
| clusterSizeMin | fixed at 1 (H1) | v3 P8 |
| goal | DERIVED (pen center outside the gate; also `export:false`) | v3 P6/P4 |

## Appendix A.2 — POC-v4 delta (2026-08-21)

One new tunable; **nothing else in the schema changed** — the shipped
`poc/params-2026-08-21-v4.json` differs from the v3 snapshot by this key
alone.

### New (Dog — flanking)
| key | label | default | range | unit | notes |
|---|---|---|---|---|---|
| flankOvershootDeg | flank overshoot | 90 | 0–180·5 | ° | C7: how far past the balance point the flank carries before handing off to walk-on. **0 = POC-v3 behavior** (measured parity). Effective carry ≈ this − `flankHandoffDeg`, because the handoff fires at the tolerance cone's near edge |

No tunable for **F1** (spawn facing the flock) — it is initialization only.
See [`../POC-v4/dog-behavior.md`](../POC-v4/dog-behavior.md).

## Appendix A.3 — POC-v6 delta (2026-08-22)

Source: [`../POC-v6/dog-behavior.md`](../POC-v6/dog-behavior.md) (C8/C9, I1–I4)
and its two same-day touch-ups. Live inventory is still the in-page ⓘ grid.

### New (Dog)

| key | label | default | range | unit | note |
|---|---|---|---|---|---|
| easySpeedFrac | easy speed | 0.33 | 0.1–0.8·0.01 | × dogVMax | I2 — easy's top speed as a fraction of walk-on's. Standoff lever `[0.4, 0.33, 0.25]` |
| fenceSeekRamp | fence seek ramp | 0.5 | 0–1·0.05 | — | touch-up: C2's fence pull fades in over this fraction of its reach (2 × flank standoff); 0 = the old hard step. `substrate`, not levered |
| parkFade | park fade | 0.5 | 0–2·0.05 | s | touch-up (Q37): a parked flank point's fence pull fades out over this long; 0 = instant. `substrate` |
| perimeterMargin | perimeter margin | 36 | 12–96·2 | px | touch-up 3: the herd perimeter line's offset from the outermost sheep — drawn AND the flanking dog's track (C8). Was `debug.outlineLengths` (3 sheep-lengths). Standoff lever `[24, 36, 60]` |
| fenceSeekReach | fence seek reach | 72 | 20–300·4 | px | touch-up 3: C2's pull reach, was hard-wired `2 × flankStandoff` (280). Standoff lever `[48, 72, 120]` |
| driveCloseRate | drive close rate | 25 | 5–80·1 | px/s | Q38: E1 governor's close rate (was a magic 25 in §1); easy scales it by `easySpeedFrac`. `substrate` |
| driveBackoffRate | drive back-off rate | 40 | 5–120·1 | px/s | Q38: E1 governor's back-off rate (was a magic 40); scaled in easy. `substrate` |

### Changed (Dog)

| key | was | now | note |
|---|---|---|---|
| flankOvershootDeg | 90 | **0** | C8: the flank ends at the gate line; the dial carries the station past it. Sweep lever row `[30, 90, 150]` → `[0, 0, 60]` |
| flankHandoffDeg | ± tolerance cone | one-sided reach bound | the flank point parks once its progress past the line is within this; the dog converts on arrival (< 25 px). **Inert on a fresh flank** (the point parks on the crossing tick) — only decides park-now vs go-round for a command issued already past the line |
| flankStandoff | beyond the flock EDGE (sector-max) | ~~beyond the **convex hull**~~ **SUPERSEDED** (touch-up 3) | hidden, `superseded`; key kept in the defaults file like `R_orbit`. The dog runs the outline itself (`perimeterMargin`) |

### Removed

| key | note |
|---|---|
| debug.outlineLengths | promoted to the sim param `perimeterMargin` (px) in touch-up 3 — the outline margin is gameplay now, not a render aid |
| standBlock | stand retired (I1); lie-down is the only posture, `lieDownBlock` unchanged. Removed from schema, not-levered list and defaults file; the Presence lever lost its row. Old snapshot files still carry the key (typo-guard warning if loaded) |

### Debug (not exported)

| key | default | note |
|---|---|---|
| debug.dogTrack | on | highlights the outline (hull + `perimeterMargin`) in the dog's colour while he flanks — it IS his track since touch-up 3 |

