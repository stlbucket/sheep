# POC-v5 · Feature: Random Course & Spawn Layouts — Semantic Rules

**Status:** **implemented 2026-08-21** — acceptance 2–10 measured PASS at the
P6 gate (log at the end); 1 (five `file://` reloads) is the owner's eyeball.
Q21–Q30 were taken on their bolded defaults; still a **living rules list**.
Source: owner's notes, 2026-08-21 ("the sheep always spawn in the
same area … totally random each time … sometimes the whole pasture with
irregular holes … sometimes heavily weighted toward one area … the gate
should always be in a random spot as well").

Continues the **course layout** rules from
[`../POC-v3/course-and-flock.md`](../POC-v3/course-and-flock.md)
(group **F**, rules F1–F3; this spec keeps the lettering — **F continued**).
Observable behavior only; mechanism ideas stay in Design notes. Sibling to
[`tuning-levers.md`](./tuning-levers.md), whose **Pasture · Approach** lever
owns today's spawn params — see Q27.

This is a fnb side-project — **no fnb DB/GraphQL/backend**. Rules must be
implementable inside §1 SIM driven by §0 `params`/`SETTINGS`; the only
non-seeded randomness allowed is the **boot seed draw in §4**.

---

## Diagnosis — why it reads as "always the same area"

Two separate causes, both real; the spec fixes both.

| Symptom | Cause in the shipped PoC | Fix |
|---|---|---|
| **Same gate, same flock every time the page opens** | The gate *is* already a random perimeter draw (v3 **F1**) and the spawn side is random (**F2**) — but both are *seeded*, and `seed` defaults to **1337** in `sheep-defaults.json.js`. Boot (`new Sim` → `reseed(params.seed)`), **Reset run**, and every `onChange: 'respawn'` hook reuse `params.seed`. Only the **Reseed → new flock** button ever draws a fresh seed. So the "random" course is the same course on every load. | **F4** — the seed is drawn fresh on every load (Q21). |
| **Even after reseeding, the flock is always a lump beside the gate** | v3 **F2** *by design* anchors the spawn region ~`spawnGateOffset` along the fence on one side of the gate, `spawnDepth` into the field. There is one layout shape; only its side and position vary. | **F5–F8** — the spawn is drawn from **three layout archetypes**, two of which are not gate-relative at all. |

The gate itself needs no new placement rule — F1 stands. What changes is
*when* a new course is drawn (F4) and *what the flock looks like on it*
(F5–F8).

---

## Setting & UI changes

- **Boot seed becomes a draw, not a default.** New Sim-panel boolean
  (working name `randomSeedOnLoad`, default **true**): on page load §4 draws
  a fresh seed and stamps it into `params.seed`. The `seed` controller
  becomes **exposed** (editable number) so a course can be replayed by
  typing its number; the defaults file's `seed` value is only used when
  `randomSeedOnLoad` is false (a *pinned* course for tuning/regression).
- **Spawn layout selector.** New `Gate + Crush`-category (or a new
  `Spawn` category — planning's call) **enum** param `spawnLayout` with
  values `random · beside-gate · whole-pasture · weighted`, default
  **`random`**, `onChange: 'respawn'`. `random` draws an archetype per
  reseed; the other three force one, for tuning and for `/sheep verify`.
  **The schema has no enum type today** (int/float/boolean/point only) —
  this feature adds one (lil-gui's `add(obj, prop, [options])`), with
  export, ⓘ-grid and tooltip support.
- **v3 spawn params narrow in scope.** `spawnGateOffset` / `spawnDepth` now
  govern **only** the `beside-gate` archetype. Their descriptions say so.
- **New tunables** for the two new archetypes and the gate clearance —
  listed under *Tunables likely involved*; all get lil-gui bindings and
  defaults-file entries (invariant #4).

---

## Semantic rules

### F. Course layout — gate & start (continued from POC-v3)

- **F4.** **Every page load is a new course.** Open the page (or reload it)
  and, **without pressing anything**, the gate position and the flock layout
  differ from the previous load. F1's determinism still holds *given a seed*:
  typing the same seed reproduces the same gate and the same layout, sheep
  for sheep. *(Owner, 2026-08-21: "totally random each time".)*
- **F5.** The flock's starting picture is drawn from **three distinct layout
  archetypes** — *beside the gate* (v3 F2), *whole pasture with holes* (F6),
  *weighted to one area* (F7). Across a dozen reseeds a viewer sees **all
  three**, and no archetype reads as a rare special case. *(Mix: Q23.)*
- **F6.** *Whole-pasture archetype.* The sheep occupy **the whole field** —
  groups reach toward every fence — but **NOT** evenly: the field has
  **several irregular empty patches** ("holes") of different sizes and
  shapes, positioned differently every draw, with **no sheep inside them**.
  It must read as patchy grazing, **not** a lattice and **not** one blob.
  *(Quantities: Q24.)*
- **F7.** *Weighted archetype.* **Most** of the flock is **concentrated
  around one focus** that can land **anywhere** in the field — including far
  from the gate and across the field from it — with a **sparse tail** of
  groups and singletons elsewhere. The core reads as *crowded but still
  grouped* (many small groups close together), **not** a single blob.
  *(Share/radius: Q25.)*
- **F8.** *All archetypes.* **No sheep starts in the gate mouth, on the pen
  apron, or inside a clearance zone around the gate** — a run never begins
  with sheep already committed (G1) or already through. The handler's post
  and the dog's spawn stay beside the gate as in v3/v4; the dog still spawns
  **facing the flock** (v4 F1) whatever the layout. *(Clearance: Q26.)*
- **F3 — amended.** "Working the flock around the field" remains the read of
  the **beside-gate** archetype only. The whole-pasture and weighted
  archetypes read as a **gather first, then drive** job: the natural course
  is *collect the scattered flock → bring it to the gate*, and "straight in"
  is not even available because there is no start beside the gate. The
  scoring ideal line (today: spawn-region center → gate → pen) starts from
  the **initial flock centroid** for those archetypes. *(Q28.)*

*(room to grow)*

---

## Design notes (light — planning will refine the "how")

- **F4 is a §4 change, not a §1 one.** §1 `Sim.reseed(seed)` stays pure and
  seeded; the *only* `Math.random()` is in §4 BOOTSTRAP (and the existing
  Reseed button in §3). Boot: `if (params.randomSeedOnLoad) params.seed =
  draw()` before `new Sim(params)`. **Reset run** keeps replaying
  `params.seed` (Q22) so a course can be retried; **Reseed** draws a new one
  as today. Every `respawn` hook keeps the current seed — sliding a spawn
  slider should re-lay the *same* course, otherwise tuning is impossible.
- **Draw the archetype *after* `placeGate()`** in the PRNG stream so seed
  1337's gate (and the dog's home) land exactly where v3/v4 measured them —
  only the sheep move. Cheap regression anchor.
- **One spawn pipeline, three seed-samplers.** Today `spawn()` already
  separates *where group seeds go* (`sampleSpawn`) from *how groups fill*
  (sizes 1..`clusterSizeMax`, `clusterMinGap` rejection sampling,
  `clusterSpread` jitter, `wandererFrac`). Keep all of that; only the sampler
  changes per archetype:
  - **beside-gate** — the v3 sampler verbatim.
  - **whole-pasture** — uniform over the play rect inset by `fenceInset`-ish
    margin, **rejecting** points inside any hole. Holes: draw `holeCount`
    irregular blobs, each the **union of 1–3 overlapping discs** of random
    radius in `[holeRadiusMin, holeRadiusMax]` — that is what makes them
    irregular rather than round. Holes may touch the fence (a bare corner is
    a legitimate hole). Guard: if holes + gate clearance cover so much of the
    field that `clusterMinGap` sampling fails, the existing `grow`-style
    fallback (most-isolated try) already degrades gracefully.
  - **weighted** — pick a focus uniformly over the field (rejecting the gate
    clearance); place `round(focusShare · n)` sheep's worth of groups with
    seeds drawn from a gaussian (or uniform disc) of `focusRadius` around it,
    with the min-gap **scaled down inside the core** (else 80 sheep in 10
    groups can't fit in 150 px); the remaining sheep as ordinary
    whole-field groups, no holes. Focus radius should scale with **√n** so
    20 sheep and 150 sheep both read as "concentrated".
- **F8 clearance** is one rejection test shared by all three samplers: a
  disc of `spawnGateClear` around the gate mouth, plus "not outside the
  fence line" (already guaranteed by the play-rect clamp). Group *members*
  jitter `clusterSpread` from their seed, so the test is against
  `spawnGateClear + clusterSpread`.
- **Idle rules are the hard part, not the sampling.** A4 (no global blob)
  and B2 (re-derived groups) were measured on the beside-gate lump. The
  weighted core is the risk: it is many groups inside one small radius, and
  the crowd-dispersal drive will slowly pull it apart (v3 measured
  biggest-cluster share 1.0 → 0.68 over 6 min). That is fine *if* it reads as
  a dense grazing patch at t=0 and the core does not visibly "explode" in the
  first seconds. Acceptance checks a 10 s idle per archetype.
- **Scoring's ideal line** (`idealPath`, used by the off-line penalty and the
  §2 path overlay) is built in `spawn()` from the spawn-region center. For
  the two new archetypes use the initial GCM as the first vertex. Nothing
  else in §1 assumes a spawn shape — `spawnSide` is only used by the v3
  sampler and the dog's home.
- **Levers (v5 sibling spec) — coordination, not conflict.** `seed` was
  already declared "a draw, not a dial" in the lever model, so F4 is
  consistent. The new tunables need **one owner** each; the natural owner is
  **Pasture · Approach** (Q27). The 0.5 anchor holds as long as the new
  params' shipped defaults are the anchor values — and since the *archetype*
  is a seed draw, it is outside the anchor by the same logic as `seed`.
- **The v5 README's "not a behavior version" line.** This feature changes
  what the flock looks like at shipped defaults and at the 0.5 anchor — by
  design. The owner placed it in v5 knowingly; the README is amended to say
  criterion 3 (no behavior delta at the anchor) is about **sim dynamics
  given a course**, and the course draw is this feature's own acceptance
  (Q29).

---

## Tunables likely involved

Existing, scope narrowed: `spawnGateOffset`, `spawnDepth` (beside-gate
only). Existing, shared by all archetypes: `clusterSizeMax` (H1),
`clusterSpread`, `clusterMinGap`, `wandererFrac`, `sheepCount`, `fenceInset`,
`gateCornerMargin`, `gateApproachR` (F8 default derives from it), `seed`
(becomes exposed). Superseded already: `spawnMinX`/`spawnMaxX`.

Likely **new** (names TBD in planning; defaults are Q24–Q26):

| working name | category | type | default | what it does |
|---|---|---|---|---|
| `randomSeedOnLoad` | Sim | boolean | **true** | F4 — draw a fresh seed at boot; false = pin the defaults-file seed |
| `spawnLayout` | Gate + Crush (or new `Spawn`) | **enum** (new type) | **`random`** | F5 — `random · beside-gate · whole-pasture · weighted`; respawn |
| `spawnGateClear` | Gate + Crush | float px | **120** (= 2 × `gateApproachR`) | F8 — no-spawn disc around the gate mouth; respawn |
| `holeCountMin` / `holeCountMax` | Spawn | int | **2 / 5** | F6 — number of empty patches; respawn |
| `holeRadiusMin` / `holeRadiusMax` | Spawn | float px | **70 / 180** | F6 — disc radii composing a patch; respawn |
| `holeLobes` | Spawn | int | **3** | F6 — max overlapping discs per patch (1 = round holes); respawn |
| `focusShare` | Spawn | float 0–1 | **0.75** | F7 — fraction of the flock in the core; respawn |
| `focusRadius` | Spawn | float px | **150** (at 80 sheep; scales √n) | F7 — core radius; respawn |
| `focusGapScale` | Spawn | float | **0.5** | F7 — `clusterMinGap` multiplier inside the core; respawn |

Not a tunable: the archetype mix weights (equal thirds, Q23) — hard-coded
unless the owner wants sliders.

---

## Constraints (global invariants that bite here)

- **#3 §1 DOM-free** — the boot seed draw lives in §4; §1 only ever receives
  `seed` as data. `Math.random()` never appears in §1.
- **#4 all tunables in §0** — eleven new schema keys (nine table rows, two of them min/max pairs) + the enum type, each
  with a lil-gui binding, a description, and a defaults-file entry; the
  export round-trips them.
- **#2 one HTML + one defaults file** — the enum type must serialize as a
  plain JSON string.
- **Determinism** — `(seed, params, [commands])` still reproduces a run; the
  archetype and every hole/focus draw come from the seeded PRNG.
- **No rule renumbering** — F1–F3 stand (F3 amended in place, not replaced);
  new rules are F4–F8.

---

## Acceptance criteria (checkable on the running page)

1. **F4 — fresh course per load.** Reload from `file://` **5 times**, touch
   nothing: **≥ 4 distinct** gate positions and **5 distinct** flock layouts
   (no two identical), and the Sim panel shows a different `seed` each time.
2. **F1/F4 — replay by seed.** Type a previous seed into the `seed` field and
   Reset run: the gate, the archetype, and every sheep position are
   **identical** to that earlier load (position digest matches).
3. **F5 — mix.** At `spawnLayout: random`, **12 reseeds** show **each
   archetype at least once** (expected ≈ 4/4/4; P(miss one) ≈ 2%). Forcing
   each archetype via the selector produces that archetype **every** reseed.
4. **F6 — whole pasture with holes** (selector forced, 6 reseeds): the
   sheep bounding box spans **≥ 80 %** of the play rect's width *and*
   height; **≥ 2 holes** of radius ≥ `holeRadiusMin` contain **zero** sheep;
   hole count/positions **differ** across reseeds; no two reseeds share a
   hole layout. Visual read: patchy, not gridded, not one blob.
5. **F7 — weighted** (forced, 6 reseeds): **≥ 70 %** of sheep lie within
   `focusRadius · 1.2` of the focus; the focus position **varies**, and at
   least one of the 6 draws puts it **> half a field width** from the gate;
   the core at t=0 consists of **≥ 4 groups** (not one).
6. **F2 — beside-gate** (forced): v3's F acceptance re-passes unchanged
   (spawn on the seeded side, never straddling the mouth, never across the
   field).
7. **F8 — clearance** (all archetypes, ≥ 12 reseeds): **zero** sheep within
   `spawnGateClear` of the gate mouth at t=0, zero `through`/`committed`
   flags at t=0; the dog's facing-vs-GCM angle is **< 1°** at t=0 (v4 F1).
8. **Idle stability per archetype:** 10 s hands-off for each forced
   archetype: A1 still-fraction and A4 (no global blob) hold; for *weighted*,
   the core neither explodes nor merges: the mean distance-to-focus of the
   sheep that started inside R changes by **< 10 %** over the 10 s and
   **≥ 90 %** of them are still within 1.2 R. *(Amended at P3, 2026-08-21:
   the original "biggest-cluster share changes ≤ 0.1" wording was a
   single-linkage metric sitting on the in-core gap — it flipped 0.2–0.3
   with graze steps while nothing moved physically, and rated the shipped
   v3 beside-gate layout as more of a blob than the weighted core.)*
9. **Scoring line:** for whole-pasture/weighted the §2 ideal-path overlay
   starts at the initial flock centroid; for beside-gate it is unchanged.
10. **Housekeeping:** `file://` boot with zero console errors; the eleven new
    controllers appear (census = schema); export emits them; §1 contains no
    `Math.random`, `document`, `window`, or `canvas`; the lever spec's
    inventory (Appendix A) is updated for the new owner assignments.

---

## Open questions (parked — for the owner; defaults in **bold**)

Numbering continues from `tuning-levers.md` (…Q20).

21. **Boot seed: random on every load?** The defaults file currently pins
    `seed: 1337`, which is why every load is the same course. *(Default:
    **yes — `randomSeedOnLoad: true`, seed drawn in §4 and shown/editable in
    the Sim panel**; the defaults-file seed is used only when the flag is
    off, as a pinned course for tuning and regression.)*
22. **Does "Reset run" replay the same course or draw a new one?** The owner
    said "each time" — but retrying the course you just failed is the point
    of a reset. *(Default: **Reset run replays the current seed; Reseed →
    new flock draws a new one; `respawn` hooks keep the seed** so sliders
    re-lay the same course.)*
23. **Archetype mix.** *(Default: **equal thirds**, hard-coded; no weight
    sliders in v5. `spawnLayout` can force any one.)*
24. **Hole geometry.** *(Default: **2–5 holes**, each 1–3 overlapping discs
    of **70–180 px** radius; holes may touch the fence; all sliders.)*
25. **Weighted core.** *(Default: **75 %** of the flock within a core of
    radius **150 px at 80 sheep, scaling with √n**; in-core min-gap ×
    **0.5**; the focus may land anywhere outside the gate clearance.)*
26. **Gate clearance for all archetypes.** *(Default: **120 px** = 2 ×
    `gateApproachR`, measured to group *seeds* plus `clusterSpread` — no
    member jitters into the mouth.)*
27. **Who owns the new params in the lever model?** The Approach lever
    already owns `spawnGateOffset`/`spawnDepth`/`clusterSpread`/
    `clusterMinGap`/`clusterSizeMax`. *(Default: **Approach owns the nine
    new params too, at profile values = shipped defaults (anchor-safe); the
    Approach lever does NOT bias the archetype draw** — the archetype stays a
    seed draw like `seed` itself. A future "Approach 1.0 = always scattered"
    endpoint can be authored in a `/sheep tune` pass.)*
28. **F3 amendment — gather-then-drive is the read for the new archetypes?**
    *(Default: **yes**; the scoring ideal line starts at the initial GCM for
    those archetypes; no scoring weights change in v5.)*
29. **v5 is declared "a tuning-surface version, not a behavior version" —
    this feature changes the start picture at the anchor.** *(Default:
    **keep it in v5 and amend the README**: criterion 3 applies to sim
    dynamics *given a course*; the course draw is measured by this spec's
    own criteria. Alternative: move this spec to a POC-v6 folder.)*
30. **More archetypes later?** Split flock (two camps), a string along one
    fence, a ring around the field edge. *(Default: **not in v5** — the enum
    is the extension point.)*

---

## Acceptance log — P6 gate, 2026-08-21

Measured **headless in Node** (whole script under a DOM / lil-gui stub,
shipped defaults file, `dt = 1/60`; courses laid via `HOOKS.respawn()` +
`that'll do`, exactly the page's route). Course set: **12 `random`** seeds
(11, 222, 3333, 44444, 5, 66, 777, 8888, 9, 1010, 1212, 1313) + **6 forced
per archetype** (200–205) = 30 courses. P0–P3's per-phase numbers stay in
[`plan.md`](./plan.md).

| # | Criterion | Measured | Verdict |
|---|---|---|---|
| 1 | F4 fresh course per load | each headless boot drew a different seed (157 514, 42 045, 191 073, …); the five on-page reloads are the owner's | **pending owner** |
| 2 | replay by seed | seed 777 laid twice with another course in between → identical position digest, same archetype | **PASS** |
| 3 | F5 mix | 12 random → **5 whole-pasture / 3 beside-gate / 4 weighted**, all present; forcing each archetype produced it on **18/18** courses | **PASS** |
| 4 | F6 whole pasture with holes | bbox **86–95 % × 80–94 %** of the play rect; **3–10** holes; **0** sheep inside any hole on all 6; **6/6** distinct hole layouts | **PASS** |
| 5 | F7 weighted | **75–84 %** of sheep within 1.2 R of the focus; foci 6/6 distinct, **225–531 px** from the gate (531 > half-width 504 on seed 205); core spans **7–13** spawn groups | **PASS** |
| 6 | F2 beside-gate | 12 seeds: every sheep on the seeded side of the mouth (along-fence signs uniform per course), max depth into the field **≤ 324 px** — never straddling, never across | **PASS** |
| 7 | F8 clearance | 30 courses: min sheep→mouth **125.1–299.6 px** (≥ 120), **0** committed, **0** through at t = 0; dog facing-vs-GCM **0.000°** on every course (v4 F1) | **PASS** |
| 8 | idle stability per archetype | 10 s hands-off: still-fraction **1.000 → 1.000** on all 30; weighted core mean dist-to-focus drifts **−3.9 … +3.1 %**, **100 %** still inside 1.2 R; mean dist-GCM drifts ≤ 2 % except the very compact beside-gate 205 (53 → 67 px — graze spread of a tight lump, the opposite of convergence) | **PASS** |
| 9 | scoring line | `idealPath[0]` = initial GCM to **0.00 px** on all 12 whole-pasture / weighted courses; beside-gate keeps v3's spawn-anchor start (61–176 px off the GCM, as before) | **PASS** |
| 10 | housekeeping | §1: **0** `document`/`window`/`canvas`/`lil` refs; `Math.random` × 2, both §3/§4 (header Reseed, boot draw); defaults file = one pure-JSON assignment, 113 keys, none unknown; census 105 = 105; Appendix A synced | **PASS** |

**Regression spot-checks at the anchor** (forced beside-gate, clearance 0,
levers 0.5): A1/A4 idle 30 s **1337: 185.4 → 187.1 px, 42: 139.9 → 134.8 px**
(= v4 P2 to the decimal), still-fraction 1.00; B1/B2 **80 → 60 idle** after
45 s of come-by, **174 → 198 px** and 80/80 idle again after 120 s of calm;
C1 radius sd 69.7–107.4 px, C3 eye 44.9–45.0°; E1 min gap 38.5–38.9 px, 0.00 s
below the line; E2 manufactured jam (80 sheep in 9-wide rows from 90 px
inside a 12 px mouth, dog 150 px behind the last row) → auto-stand at
**16.7 s / 11.5 s**, nearest driven sheep **54 / 57 px** (v4: 53 / 57 px at
7.6 / 16.8 s on its own rig); G1 commit→through **29/29** and **25/25**; H1
group sizes **1–10 all present** over the 30 courses; D1/D3 rest on the diff
(posture code untouched in v5) as they did in v4.

**Carried-forward observation:** the 300-consecutive-seed +2.4σ skew toward
beside-gate (P3, mulberry32 consecutive-seed correlation on the 4th draw)
does not show in scattered seeds; F4's boot draw is `Math.random()`-scattered,
so the shipped mix is the scattered one.
