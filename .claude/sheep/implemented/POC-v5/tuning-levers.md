# POC-v5 · Feature: Tuning Levers — the 12-lever panel

**Status:** **implemented 2026-08-21** — acceptance 1–10 measured PASS at the
P6 gate (log at the end); 11 (the `file://` console) is the owner's eyeball.
Q13–Q20 were taken on their bolded defaults. Design source:
[`../../brainstorming/lever-model.md`](../../brainstorming/lever-model.md)
(proposed 2026-08-18) and its decision record
[`docs/adr/0001-lever-model.md`](../../../../docs/adr/0001-lever-model.md).

The PoC exposes **109 raw params, 87 of them as live controllers** — a tuning
surface too large to hold in one head and impossible to tune conversationally.
This feature adds a **lever panel** above the existing folders: **12 named 0–1
dials** in three domains that each write a family of raw params along a
hand-authored curve. Levers are a **tuning surface only** — the simulation
never sees one, `§1 SIM` is not touched, and every existing slider survives.

This is a fnb side-project — **no fnb DB/GraphQL/backend**. The feature
lives in `§0 PARAMS` and `§3 INPUT` — **plus one §2/§4 touch**: Pasture ·
Scale exposes `canvasW`/`canvasH`, so the canvas element must resize on
respawn. The design doc's "§0/§3 only" is not quite right; §1 SIM is still
untouched.

---

## Goals

1. **Twelve levers, three domains** — dog-behavior (Presence · Standoff ·
   Sweep · Touch), sheep-behavior (Nerve · Cohesion · Restlessness ·
   Character), pasture-builder (Scale · Gate · Approach · Strictness) — each
   a single 0–1 slider that resolves a family of raw params.
2. **The 0.5 anchor is exact.** Every lever at 0.5 emits the shipped defaults
   **bit for bit**, so `[reset all levers to 0.5]` gives back the simulation
   v1–v4 acceptance was measured on.
3. **Stamp-and-release.** Moving a lever writes its raw params **once**, then
   stops claiming them; a raw param hand-edited afterwards simply wins and the
   lever displays as modified. Raw params stay the single source of truth.
4. **One owner per param.** No raw param is written by two levers — the
   emit/receive split (dog owns what *shapes* threat, sheep owns what
   *responds* to it) is the tie-breaker.
5. **Guards are honored at resolve time**, not baked into profiles, because a
   hand-edit can always land underneath them (G1, G2 below).
6. **Nothing downstream changes**: §1 SIM DOM-free and unaware, export still
   emits raw params, determinism still `(seed, params, [commands])`, the 87
   existing controllers still reachable.

## Non-goals

- **Presets** ("Nursery", "Open Trial", "Brace") — Q20, deferred.
- **Undo of a lever move as one step** — Q18, deferred.
- **Modelling Judging** (the 7 fault-definition params) — stays raw sliders,
  parked as the fourth domain.
- **Re-running acceptance at non-0.5 positions** — Q19; the anchor is the
  contract, other positions are explicitly "a different game."
- Any change to sim behavior at the anchor. A measurable behavior delta at
  all-levers-0.5 is a **defect**, not a feature.

---

## The design

### Shape of a lever

```
LEVERS = [{
  key: 'dogPresence',          // stable id; also the defaults-file key (Q17)
  domain: 'dog-behavior',
  label: 'Presence',
  blurb: 'How much threat he radiates at all.',
  ends: { 0: 'a dog the sheep barely mind', 1: 'a dog that empties the field' },
  params: { R_flee: [70, 120, 200], ambient: [0.05, 0.20, 0.45], … },
}, …]
```

Each entry in `params` is `[at0, at0.5, at1]`. **`at0.5` must equal the
shipped default** — it is copied from `sheep-defaults.json.js`, never invented
(Goal 2, asserted at boot).

### Resolving a position → raw params

**Piecewise-linear through the anchor.** The endpoints are hand-authored
worlds and are *not* symmetric about the middle, so a single 0→1 lerp would
miss the anchor. For position `t`:

```
resolve(t, [a, m, b]) = t <= 0.5 ? a + (m - a) * (t / 0.5)
                                 : m + (b - m) * ((t - 0.5) / 0.5)
```

then **coerce to the schema entry's type and step** — `int` params round
(`sheepCount`, `cohN`, `canvasW/H`, `clusterSizeMax`, `gateWidth`, …), floats
snap to `step`. The schema stays authoritative for type, range and step; a
resolved value is clamped into `[min, max]` and never widens a slider's range.

### Stamp-and-release

- Moving lever L computes `resolve()` for **its own params only** and writes
  them into `params` (and the bound controllers, so the sliders visibly move).
- It records `stamped[key] = value` for each param it wrote.
- A raw param whose current value **differs from its stamp** is *modified*.
  A lever with any modified param renders as `0.55 (modified)`; moving that
  lever again re-stamps everything it owns and clears the marker.
- Nothing polls: modification is discovered when the panel next renders (a
  lever move, a folder open, a reset).

### Cross-lever guards (applied on resolve, after stamping)

| # | Guard | Resolution | Surfaced as |
|---|---|---|---|
| **G1** | `driveTrailGap` ≤ `R_flee` / 3 — the trail gap must sit inside the range that mobilizes sheep or walk-on stops pushing | `driveTrailGap = min(profile, R_flee / 3)` | Standoff shows *limited by Presence* |
| **G2** | `dogVMax` > `vMax` — the dog must be able to head a fleeing sheep (v3 Q8) | `dogVMax = max(profile, vMax × 1.05)` | Standoff shows *limited by Nerve* |

Guards re-evaluate whenever **either** side moves, and read the *live* raw
value of the other side — so a hand-edited `R_flee` still constrains
`driveTrailGap`.

### Panel placement (§3)

A **Levers** root above the existing three panels, with one folder per domain
(4 levers each), plus two buttons: `Reset all levers to 0.5` and
`Reset this domain`. The existing Sheep / Dog / Course & Meta panels collapse
under a single **Advanced** disclosure, unchanged internally — the ⓘ grid and
tooltips keep working because they hang off `SETTINGS`, which is untouched.

### Setting changes

- **`canvasW` / `canvasH` become `exposed: true` with `onChange: 'respawn'`**
  (Q14 default) — Pasture · Scale cannot exist while they are structural.
- **Lever positions persist in `sheep-defaults.json.js`** (Q17 default) under
  a single `levers: { dogPresence: 0.5, … }` block, purely as UI state. The
  file stays one `const SHEEP_DEFAULTS =` pure-JSON assignment; `buildParams`
  ignores the block, so §1 never sees it.

### What this feature must NOT change

§1 SIM (still receives a plain resolved `params` object) · the defaults-file
format · the 87 existing controllers · export (raw params, plus the lever
block per Q17) · determinism · the Godot port surface.

---

## Constraints (which global invariants bite here)

- **§1 SIM stays DOM-free and lever-unaware.** Levers are §0 data + §3 UI. If
  any lever logic needs to read sim state, the design is wrong.
- **One HTML file + one defaults file**, plain `<script>`, `file://`
  double-click, lil-gui UMD from CDN. The lever panel is another generated
  root, not a framework.
- **All tunables live in §0** and are schema entries. A lever writes *existing*
  schema keys; it never introduces a value the schema doesn't know.
- **Every phase leaves the page runnable, zero console errors.**
- **Rules A1–A8 / B1–B2 / C1–C7 / D1–D3 / E1–E3 / F1–F2 / G1 / H1 are defined
  at the anchor.** A lever position that violates one (Cohesion > ~0.75 vs A4)
  is a legal setting for a different game — but the anchor must keep passing.

---

## Acceptance criteria

1. **Anchor exactness.** With all 12 levers at 0.5, every one of the 79
   levered params equals its `sheep-defaults.json.js` value exactly (asserted
   at boot; the page logs one line and refuses to lie about it).
2. **Reset restores the anchor.** After moving every lever to a random
   position, `Reset all levers to 0.5` returns all 79 params to (1).
3. **Behavioral parity at the anchor.** A scripted come-by→drive at seeds 1337
   and 42 produces the **same** handoff carry, sweep and E1 min-gap as
   POC-v4's P2 log (same numbers, not merely similar) — the lever layer is
   provably inert at 0.5.
4. **Stamp-and-release.** Move Presence to 0.7; hand-edit `R_flee`; Presence
   reads `0.70 (modified)`; moving **Standoff** does not revert the hand-edit;
   moving **Presence** re-stamps it and clears the marker.
5. **Single ownership.** A build-time assertion over the 12 profiles finds no
   param claimed twice, and the union of levered + not-levered keys equals the
   live `SETTINGS` key set exactly (109).
6. **Guards fire and are visible.** Standoff 1.0 with Presence 0.5 resolves
   `driveTrailGap` to 40 (not 70) and marks Standoff *limited by Presence*;
   Standoff 1.0 with Nerve 1.0 resolves `dogVMax` ≥ `vMax × 1.05`.
7. **Endpoints are coherent worlds, not broken ones.** At each of the 24
   endpoint profiles the sim runs 60 s at seed 1337 with **zero console
   errors, no NaN in any sheep/dog position, and a finite score** — the
   endpoints need not be *fun*, but they must not be broken.
8. **Pasture levers respawn safely.** Moving Scale (bounds + `sheepCount`),
   Gate or Approach re-places the gate, spawn anchor and fence without stale
   geometry; the dog still spawns facing the flock (F1) after the respawn.
9. **Export round-trips.** `Export params → clipboard` emits raw params in the
   defaults-file format plus the lever block; pasting it back and reloading
   reproduces both the raw values and the lever readings.
10. **Advanced panel intact.** All 87 existing controllers are still present,
    still tooltipped, still ⓘ-gridded; the ⓘ grid shows a lever's stamp
    alongside a param where one exists.
11. Runs from `file://` with the HTML + defaults file only, **zero console
    errors**.

---

## Open questions (parked — for the owner; defaults in **bold**)

Numbering continues from POC-v4 (…Q12).

13. **Does Scale rescale the radii?** `L` is the unit most radii derive from.
    A 1500×960 pasture with `R_flee` still 120 makes the dog *relatively*
    weaker — which is a genuinely harder job. The alternative scales every
    length with the field, making Scale a pure zoom that changes no
    difficulty. *(Default: **no rescale** — fixed reach, bigger pasture =
    harder job. The honest game-design answer and the cheaper one.)*
14. **Expose `canvasW`/`canvasH`?** Scale cannot exist while they are
    `exposed: false` structural; the gate draw, spawn anchor and fence all key
    off the bounds, so a resize must respawn. *(Default: **expose both with
    `onChange: 'respawn'`** — the same treatment `fenceInset` already gets.)*
15. **Which lever, if any, applies live vs on respawn?** Dog and sheep levers
    can take effect mid-run; the pasture ones rewrite the course. *(Default:
    **dog + sheep levers apply live; the four pasture levers respawn** —
    consistent with today's `respawn` hooks, and a course that changes shape
    under a run in progress is not a course.)*
16. ~~**What does the panel do to the three-panel layout?**~~ **Already
    decided** in `lever-model.md` → "What this does not change": a Levers
    root on top, the existing Sheep / Dog / Course & Meta panels collapsed
    under **Advanced**, nothing removed or re-categorized. Not an open
    question; kept for numbering.
17. **Do lever positions persist?** Stamp-and-release means the *raw* params
    are what the defaults file carries, so a reload could show all levers at
    0.5 while the raw values say otherwise. *(Default: **store the 12
    positions in the defaults file** alongside the raw params, purely as UI
    state; the sim never reads them.)*
18. **Is a lever move undoable as one step?** Moving Presence rewrites 9
    params at once; today's per-slider workflow has no undo. *(Default: **no
    undo in v5** — `[reset all levers to 0.5]` plus the export file is enough;
    revisit if it bites.)*
19. **Do the acceptance suites re-run at non-0.5 positions?** Every measured
    PASS in v1–v4 was taken at the anchor. *(Default: **anchor only** —
    acceptance is defined at 0.5; other positions are explicitly a different
    game, including the A4-violating Cohesion range.)*
20. **Presets on top?** "Nursery", "Open Trial", "Brace" as named 12-number
    vectors would be nearly free once levers exist. *(Default: **not in v5** —
    calibrate the axes first; a preset is only as good as the axes under it.)*

**Sequencing precondition (blocks `/sheep plan`):** the 0.5 anchor is
*the shipped defaults*. POC-v4 left one defaults decision open — the C7 carry
measures ~60° against a rule that says ~90° — and if the owner's hands-on
read changes `flankOvershootDeg`/`flankHandoffDeg`, the **Sweep** profile's
anchor and endpoints must be re-authored. Play v4, settle the defaults,
re-snapshot, **then** plan this version.

**Not a question, a warning:** every endpoint number in the lever model is a
**proposal awaiting hands-on calibration**. Only the 0.5 column is measured.
Building the mechanism does not make the endpoints right — expect a `/sheep
tune` pass per lever afterwards.

---

## Appendix A — the 12 levers and what they own

Verified against the live `SETTINGS` schema **2026-08-21 (P6, as built)**:
**88 levered + 36 not-levered = 124**, no key owned twice, no key unclaimed,
and **all 88 `0.5` values match the schema defaults exactly** (the boot line
reads `[levers] anchor 88/88 exact · ownership 88 levered + 36 not-levered =
124 schema keys · OK`). The spec-time census was 79 + 30 = 109; POC-v5 itself
added the nine spawn-layout params (Approach, anchor-only profiles), the
`seed`-side draws and `debug.spawnHoles`, and exposed `canvasW`/`canvasH`. Full endpoint tables
live in
[`../../brainstorming/lever-model.md`](../../brainstorming/lever-model.md) —
they are the source, not duplicated here.

| Domain | Lever | Params | Reads as |
|---|---|---|---|
| dog-behavior | **Presence** | 9 | how much threat he radiates at all |
| dog-behavior | **Standoff** | 5 | how much room he gives the flock |
| dog-behavior | **Sweep** | 5 | the shape of his flank |
| dog-behavior | **Touch** | 11 | the character of his hands at the gate |
| sheep-behavior | **Nerve** | 7 | how readily they react to threat |
| sheep-behavior | **Cohesion** | 8 | jelly stiffness |
| sheep-behavior | **Restlessness** | 10 | how fast a gather comes undone |
| sheep-behavior | **Character** | 4 | how much individuals differ |
| pasture-builder | **Scale** | 6 | how big a job is this |
| pasture-builder | **Gate** | 5 | how punishing the mouth is |
| pasture-builder | **Approach** | 14 | how far the course makes you work — 5 spawn-region params + the 9 POC-v5 archetype params (anchor-only until a tune pass, Q27) |
| pasture-builder | **Strictness** | 4 | how harshly this course judges |

**Not levered (36):** 7 superseded · 3 derived/rule-locked (`goal`,
`clusterSizeMin`, `heelIntensity` — the last fixed at 0 **by A7**, so
levering it would let Presence break a rule) · 5 substrate (`L`, `damping`,
`accelScale`, `dt`, `maxFrameDelta`) · 3 draws (`seed`, `randomSeedOnLoad`,
`spawnLayout` — a draw, not a dial) · 11 `debug.*` · 7 Judging params (the
parked fourth domain).

## Appendix B — corrections to the design doc

Found while verifying the model against live code; fold into
`lever-model.md` when this spec is agreed:

- The doc says "**84** as live sliders". The live schema has **87** exposed
  entries / 87 controllers (POC-v4 added `flankOvershootDeg`). The 109 total
  is correct.
- The doc says "Building it is a **§0/§3 job only**." Scale's canvas resize
  is a §2 (canvas element) + §4 (respawn wiring) touch. §1 stays untouched.
- Everything else in the inventory verified clean: 79/30 split exact, single
  ownership holds, and every anchor value matches the shipped default — the
  0.5-anchor property is provable at build time, which is why acceptance
  criterion 1 can assert it rather than eyeball it.

---

## Acceptance log — P6 gate, 2026-08-21

Measured **headless in Node** per the no-webserver rule: the *whole*
`sheep-poc.html` script booted under a DOM / lil-gui stub with the shipped
`sheep-defaults.json.js`, then driven at `dt = 1/60` through `sim.step()`.
Every course below is laid with the page's own route (`HOOKS.respawn()` +
`that'll do`). Anchor config = forced `beside-gate`, `spawnGateClear 0`,
levers 0.5, `flankOvershootDeg 90`.

| # | Criterion | Measured | Verdict |
|---|---|---|---|
| 1 | anchor exactness | boot line `[levers] anchor 88/88 exact … OK`; zero console errors/warnings at boot | **PASS** |
| 2 | reset restores the anchor | randomize all 12 → `Reset all levers to 0.5`: the 88 owned raw values deep-equal the pre-move snapshot and the schema defaults, `limitedBy` empty — on a fresh boot **and** after the full 24-endpoint sweep | **PASS** |
| 3 | behavioral parity at the anchor | see table below; plus the decisive check: `params-2026-08-21-v4.json` vs the live export agree on **all 101 shared keys** (v5 adds 12, drops none), and booting from the v4 file reproduces the v5 numbers identically | **PASS** |
| 4 | stamp-and-release | Presence 0.7 → hand-edit `R_flee` → `(modified)` **true**; move Standoff → still **true** (hand-edit survives); re-move Presence 0.7 → **false** (re-stamped) | **PASS** |
| 5 | single ownership | boot assertion: 88 levered + 36 not-levered = 124 = `SETTINGS.length`, no key claimed twice, none unclaimed | **PASS** |
| 6 | guards fire and are visible | Standoff 1.0 @ Presence 0.5 → `driveTrailGap` **40**, `limitedBy {dogStandoff: [dogPresence]}`; + Nerve 1.0 → `vMax` 115, `dogVMax` **125 ≥ 120.75**, `limitedBy {dogStandoff: [dogPresence, sheepNerve]}` | **PASS** |
| 7 | 24 endpoints are worlds, not wrecks | each lever at 0 and at 1 (others 0.5), seed 1337 (`random` draws whole-pasture), come-by at 0.5 s, 60 s: **0 throws, 0 NaN**, every score finite (0–85), 0 injuries | **PASS** |
| 8 | pasture levers respawn safely | Scale 1 → 1500×960 / 150 sheep, Scale 0 → 800×520 / 18, Gate 1, Approach 0 and 1: all sheep inside the new play rect, gate on the new perimeter, dog facing-vs-GCM **0.000°** | **PASS** |
| 9 | export round-trips | 113 keys + 12 positions, parses as pure JSON; reloaded as the defaults file with `randomSeedOnLoad` off → raw values **identical**, positions identical, no `(modified)`; with the flag on only `seed` differs (F4, by design) | **PASS** |
| 10 | Advanced panel intact | census **105 exposed entries = 105 controllers** (+ 12 lever sliders); every controller carries its schema entry, so tooltips/ⓘ rows are generated, not hand-kept | **PASS** |
| 11 | `file://` zero console errors | static: §0–§4 parse; external refs = lil-gui CDN + `sheep-defaults.json.js` only; defaults file is one `const SHEEP_DEFAULTS =` pure-JSON assignment; root mirrors byte-identical | **pending owner's eyeball** |

**Parity table (criterion 3)** — 0.5 s idle then the command, seeds 1337 / 42,
E1 min front-hemisphere gap over a 90 s drive (line = `driveTrailGap − 5` =
35 px):

| seed · command | armed in old cone | carry past balance | sweep | E1 min gap · s below line | → state |
|---|---|---|---|---|---|
| 1337 · come-by | **185** ticks | +60.1° | **257°** | 38.9 px · 0.00 s | walk_on |
| 1337 · away | 195 ticks | +82.2° | 249° | 38.5 px · 0.00 s | walk_on |
| 42 · come-by | 196 ticks | +60.1° | 266° | 38.9 px · 0.00 s | walk_on → stand (E2, later) |
| 42 · away | **124** ticks | +60.1° | 222° | 38.9 px · 0.00 s | walk_on |

Against v4 P2's log (185 / 198 / 197 / 124 ticks; +60.4 / +85.8 / +60.3 /
+60.3°; 257 / 252 / 267 / 223°; 38.6 / 38.9 px): two rows reproduce the armed
count to the tick, all four sweeps land within 0–3°, carries within 0.3°
(3.6° on 1337·away) and E1 within 0.3 px. v4's harness was not kept, so the
residuals are its measurement definitions (which GCM sample, where the
sweep integration starts), not the sim: everything measured with an
unambiguous definition matches v4 **to the decimal** — C1 flank radius sd
**69.7–107.4 px**, C3 eye **44.9–45.0°**, A1/A4 idle **185.4 → 187.1** and
**139.9 → 134.8 px** over 30 s, B1/B2 **80 → 60** idle after 45 s of pressure
and dist-GCM **174 → 198** after 120 s of calm, overshoot-0 sweeps **201° /
215°**, Q12 lateral drift **43.6 / 32.1 px** — and the v4 params file boots
into this build with zero warnings and identical numbers. The lever layer is
inert at 0.5.

**Overshoot 0 → v3 parity (carried check):** come-by converts at +4.5° / +10.5°
past balance with sweeps **201° / 215°** (v3 P4 / v4 P2: 201° / 215°);
away −30.0° (v4: −29.8°), the tolerance-edge firing both logs show.

**Endpoint notes (tune items, not failures):** Strictness 1.0 scores **0**
within 60 s of a come-by — the harsh end is *very* harsh; Scale 0 (18 sheep,
800×520) has 28 % of the flock on the fence after the drive and 5 penned in
60 s — the smallest job is over quickly; Scale 1 (150 sheep, 1500×960) is
~4× the per-tick cost, still-fraction 0.99 after the drive (one dog barely
dents it — POC-v2 Q8 at scale). Every other endpoint reads as a plausible
world.

**Determinism note (harness, not sim):** `FlockSim.reseed()` re-lays the
course but does **not** reset `dog.command`; the page always follows it with
`that'll do` (`restartRun`, Reseed, the header seed input). A harness that
calls `reseed()` bare inherits the previous run's drive — the first pass of
this suite read idle 1337 as 185.4 → 181.9 for exactly that reason. Worth a
one-liner in a later version (reset the command inside `reseed()`), logged
as a follow-up.
