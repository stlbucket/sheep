# POC-v3 · Feature: Course, Gate & Flock Setup — Semantic Rules

**Status:** **implemented 2026-07-13** — F/G/H + UI measured PASS at the P4
gate (log below); still a **living rules list**. Built by
[`plan.md`](./plan.md) Phases 6–9; Q1/Q2 resolved by owner, Q3–Q6 built on
their parked defaults (owner may still re-judge hands-on).

Semantic rules for the **course layout** (where the gate and the flock start),
**gate-exit behavior**, and **idle group sizes** — observable behavior, stated
independently of the force math. Sibling to
[`dog-behavior.md`](./dog-behavior.md) (groups C/D/E) and
[`../../implemented/POC-v2/flock-behavior.md`](../../implemented/POC-v2/flock-behavior.md)
(groups A/B); this spec continues the lettering with **F/G/H**.

This is a fnb side-project — **no fnb DB/GraphQL/backend**. Rules must be
implementable inside §1 SIM driven by §0 `params`/`SETTINGS`.

Related: the current course is an **interior** fence at `fenceX` 820 with a
gate gap at `gateY` (POC-v1 phase 5) — group F supersedes that layout. The v1
`through` mechanic is the seed of G1.

---

## Setting & UI changes

- **Gate settings superseded:** `fenceX` / `gateY` (interior fence line) give
  way to a **perimeter gate** placed at a random, seeded spot (F1). `goal`
  becomes the gate center rather than an independent pen point. `gateWidth`
  survives as-is.
- **Spawn settings superseded:** `spawnMinX` / `spawnMaxX` (fixed left-field
  region) give way to a spawn region **anchored near the gate, off to one
  side** (F2), rotating with wherever the gate lands.
- **Group-size settings reshaped:** `clusterSizeMin`/`clusterSizeMax` (2–5)
  become **1 to n** with **n a slider — default 10, max 20** (H1). Min is
  fixed at 1; the slider is n.
- **Panel split:** sheep-side tunables (**Sheep, Idle, Boids, Boldness**) in
  a panel on the **left**; dog-side (**Dog, Flee/Eye**) in a panel on the
  **right**; the rest (**Stage, Gate + Crush, Scoring, Debug, Sim**) in a
  **collapsed "Course & Meta" panel below the dog panel**. *(Q1 resolved by
  owner 2026-07-13.)*
- **Defaults move to `sheep-defaults.json.js`** — a sibling file holding
  every slider default as **one `const SHEEP_DEFAULTS = { …pure JSON… }`
  assignment**, loaded by a second `<script src>` tag, so tuning results can
  be edited without touching the HTML and double-click-from-`file://` still
  works (a true `.json` can't be fetched from `file://`). *(Q2 resolved by
  owner 2026-07-13 — amends skill invariant #2 to "one HTML + one defaults
  file".)*

## Semantic rules

### F. Course layout — gate & start

- **F1.** The gate sits at a **random spot on the perimeter fence** — reseed
  the run and it can land on **any side** of the field. Placement is
  **seeded** (same seed → same gate).
- **F2.** The flock **spawns near the gate and off to ONE side of it** — a
  start point close to the intended destination, not centered on the gate and
  not across the field.
- **F3.** A run therefore reads as **working the flock around the field**:
  from a start beside the destination gate, the natural course takes the
  sheep out into the field, around, and back in through the gate — **NOT** a
  straight-line nudge from spawn through the gate. *(Owner's stated intent
  for F1+F2; how hard "straight in" is discouraged is Q4.)*

*(room to grow)*

### G. Gate behavior — commitment

- **G1.** Sheep that are **near the gate and moving toward it continue on and
  through** — approach momentum carries them out; they do **NOT** stall or
  turn back at the threshold, and the last few body-lengths need **no dog
  pressure**.

*(room to grow)*

### H. Idle group sizes

- **H1.** At-rest groups vary from **1 to n** members — n is a **slider,
  default 10, max 20**. Singleton sheep are legal idle groups. *(Supersedes
  the fixed **~2–5** clause of
  [flock-behavior A5](../../implemented/POC-v2/flock-behavior.md) — the
  loose-groups-scattered-across-the-field picture of A5/A6 still holds.)*

*(room to grow)*

---

## Design notes (light — planning will refine the "how")

- **F1 moves the gate to the outer fence**, so the fence force must gap at
  the gate and "through" now means **leaving the field**. What's on the other
  side (pen, despawn, count) is Q3. The interior `fenceX` wall disappears —
  the field becomes one open area (Q6 confirms).
- **F1 placement is a seeded draw** on the perimeter (avoid corners by some
  margin so the gate mouth is flat fence). All gate-relative logic — fence
  gap, crush measurement (`crushRadius` at the gate mouth), scoring's ideal
  line — must take the gate position as data, not assume the right wall.
- **F2 anchors the spawn region relative to the gate**: a cluster-seed region
  a short way along the fence to one (random) side of the gate, replacing the
  fixed left-field box. Cluster seeding itself (POC-v2 P2) is unchanged.
- **G1 is a commitment funnel**, generalizing v1's `through`: within an
  approach zone of the gate mouth, a sheep whose velocity points gateward
  gets a through-bias stronger than the fence/crowd forces that would
  otherwise bounce it — one-way once committed, per v1.
- **H1 is a spawn-table change**: group sizes drawn 1..n (n = the slider).
  Group *count* still derives from `sheepCount`. Expect the idle field to
  read lumpier at n=10 than POC-v2's 2–5; A4 (no global blob) must still
  hold.
- **Panel split** is §0/§3 work only (two lil-gui roots or repositioned
  folders); §1 never sees the GUI.
- **Defaults file**: whatever Q2 lands on, `SETTINGS` stays the single schema
  — the file supplies *defaults* the schema consumes, so §1 still receives a
  plain resolved `params`.

---

## Tunables likely involved

Existing: `gateWidth`, `crushRadius`, `sheepCount`, `clusterSpread`,
`clusterMinGap`, `seed`; superseded: `fenceX`, `gateY`, `spawnMinX`,
`spawnMaxX`, `clusterSizeMin`, `clusterSizeMax` (reshaped → the H1 slider),
`goal` (follows the gate).
Likely **new** (names TBD in planning): gate corner margin, spawn offset
along fence + spawn distance from gate, gate approach-zone radius (G1),
through-bias strength (G1), max group size n (H1 slider — default 10,
max 20).

---

## Open questions (parked — for the owner; defaults in **bold**)

1. ~~**Panel sides & category mapping?**~~ **Resolved** (owner, 2026-07-13,
   after reviewing the 11-category list) → **sheep-side left** (Sheep, Idle,
   Boids, Boldness), **dog-side right** (Dog, Flee/Eye), **Course & Meta
   collapsed below the dog panel** (Stage, Gate + Crush, Scoring, Debug,
   Sim). → Setting & UI changes.
2. ~~**"JSON file included in the html" vs the `file://` invariant?**~~
   **Resolved** (owner, 2026-07-13) → **`sheep-defaults.json.js`**: a pure
   JSON literal wrapped in a single `const SHEEP_DEFAULTS =` assignment,
   loaded by one extra `<script src>` tag; double-click still works.
   Invariant #2 amended to "one HTML + one defaults file". → Setting & UI
   changes.
3. **What's through the gate?** Sheep now exit the field itself. (Default:
   a **small pen drawn just outside the perimeter gate**; crossing = penned
   and the sheep settles there, as v1.)
4. **How near is the start, and is "straight in" prevented or merely
   unrewarding?** (Default: spawn center **~200 px along the fence** from
   the gate; no hard block — F3 is achieved by course/scoring, not walls,
   and the scoring ideal-line update is deferred until this is played.)
5. **When does the gate re-randomize?** (Default: **on reseed/respawn only**
   — stable within a run, new course each reseed.)
6. **Does the interior fence (`fenceX` wall) disappear entirely?** (Default:
   **yes** — one open field with a perimeter gate; the v1 right-side pen
   retires with it.)

---

## Acceptance (for the F/G/H rules so far)

**F — course:** reseed ~6 times: the gate appears at different perimeter
spots including different sides; each time the flock spawns in a cluster
group **near the gate, offset to one side**, never straddling the mouth and
never across the field. Same seed twice → same gate, same spawn side.

**G — commitment:** drive a few sheep to the gate mouth: sheep inside the
approach zone moving gateward pass **through without turning back**, even if
the dog stops pressing; no sheep oscillates on the threshold.

**H — group sizes:** at the default slider (n=10), the idle field shows
groups from **singletons up to ~10**, scattered per A5/A6; slider to 20 →
groups up to ~20 appear after respawn; slider to 1 → all singletons. A4
still holds (no global blob).

**UI / defaults:** double-click the HTML from `file://`: page runs, zero
console errors; sheep-side tunables sit in a left panel, dog-side in a right
panel, Course & Meta collapsed below the dog panel (Q1); editing
`sheep-defaults.json.js` and reloading changes the starting slider values
without touching the HTML (Q2).

---

## Acceptance log — P4 gate, 2026-07-13

**F: PASS.** 8 reseeds → gate on 3 different perimeter sides, corner
clearance ≥ 112 px (margin 80), same seed twice → identical gate + spawn
side. Spawn GCM on the seeded side every reseed (|along-fence offset|
86–412 px), zero sheep straddling the mouth, zero across the field. F3 read:
the course visibly plays out-and-around (screenshot in the run log).

**G: PASS.** 10 seeds: **92 committed zone-entries → 92 through, 0
reversals-at-threshold, 0 stranded**, including dog-pressure dropped at first
commitment (30 s windows). No suction: 3 seeds × 60 s idle beside the gate
(up to 18 sheep near the zone) → 0 through. As-built: commitment is sticky
per-sheep with a 1.5× leash (a pure per-tick force stranded 6/10 mid-zone
when the dog quit a jam).

**H: PASS.** n=10: spawn groups span 1–10 with singletons, 15–18 groups at
80 sheep; n=20 → max sizes up to 20 over six seeds; n=1 → 80 singletons.
A4 held (mean dist-to-GCM 185→187 px over 30 s); B2 held (released blob
dissolves 1→9 clusters, biggest-cluster share 1.0→0.68 over 6 min — slower
than v2's 2–5 world, as the lumpier field implies).

**UI / defaults: PASS.** Three panels per the Q1 map (controller census
84/84 vs schema); defaults round-trip (file edit → slider) and missing-file
fallback (schema defaults + one warning) measured; export emits the file
format (body parses as pure JSON); ⓘ grids + tooltips work across all three
roots; sim byte-identical pre/post refactor (100-step digest at seed 1337);
`file://` boot in headless Chrome: zero console errors.
