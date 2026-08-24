# Lever Model — the tuning surface

**Status:** proposed 2026-08-18 (owner session). Design doc, **no code**.
**Specced and shipped 2026-08-21** as
[`implemented/POC-v5/tuning-levers.md`](../implemented/POC-v5/tuning-levers.md)
(Q13–Q20 on their bolded defaults; acceptance log at the P6 gate); that
spec's Appendix B corrections are folded in below, marked *(correction …)* /
*(As built …)*. Every endpoint number below
is a **proposal awaiting hands-on calibration** — only the 0.5 column is
measured, and that column was **verified against the shipped defaults
2026-08-21: all 79 values match exactly**.

The PoC exposes **109 raw params** across 11 categories, 84 of them as live
sliders *(correction, POC-v5 P6: 87 live controllers at the time of writing
— POC-v4 had added `flankOvershootDeg` — and **124 schema keys / 105
controllers** as shipped in POC-v5, which added the spawn-layout params and
exposed `canvasW`/`canvasH`)*. That is a tuning surface no one can hold in their head. This doc
collapses it to **12 levers** in **3 domains**, without removing a single raw
param.

Vocabulary is pinned in [`../../../CONTEXT.md`](../../../CONTEXT.md). The force
math is [`force-model.md`](./force-model.md); the threat math is
[`threat-model.md`](./threat-model.md). This doc is neither — it is the map from
*things the owner says* to *numbers the sim reads*.

---

## The four decisions this model rests on

| # | Decision | Why it went this way |
|---|---|---|
| 1 | **Emit vs. receive** — the dog owns everything that *shapes* the threat field; the sheep owns everything that *responds* to it. No raw param has two owners. | Threat is dog-emission × sheep-tolerance, so `R_flee`/`w_flee` are reachable from both sides. Two owners means the last lever you touch wins and the other starts lying. |
| 2 | **Stamp-and-release** — moving a lever writes its raw params once, then it stops claiming them. Hand-editing a raw param afterwards simply wins; the lever reads `0.55 (modified)`. | Raw params stay the single source of truth. §1 SIM, `sheep-defaults.json.js`, export, and determinism are all **completely unchanged**. Every good default so far came from hands-on raw tuning; that must keep working. |
| 3 | **Hand-authored endpoint profiles** — each lever is two coherent worlds, lerped. | Sweeping each param from its own schema min to max produces incoherent endpoints (Presence 1.0 would give `R_flee` 300 *and* `coneK` 8 — enormous reach through a needle-thin cone, which is not a dog). |
| 4 | **The 0.5 anchor** — every lever at 0.5 emits the shipped defaults **exactly**. | v1–v3 acceptance was measured at those numbers across seeds 1337 and 42. `[reset all levers to 0.5]` must give back the proven simulation, bit for bit. |

Consequence of (4): endpoints are authored **outward from a known-good center**,
so `0.5` is never a number to invent — it is copied from
`sheep-defaults.json.js`.

---

## Domains

| Domain | Levers | Owns | What it answers |
|---|---|---|---|
| **dog-behavior** | Presence · Standoff · Sweep · Touch | 30 params | What kind of dog is this? |
| **sheep-behavior** | Nerve · Cohesion · Restlessness · Character | 29 params | What kind of animal is this? |
| **pasture-builder** | Scale · Gate · Approach · Strictness | 20 params | What kind of job is this? |
| *(not levered)* | — | 41 keys (2026-08-22, incl. `debug.*`) | superseded · derived · substrate · debug · judging |

**109 params, 109 homes, no param owned twice.** (Verified against the live
`SETTINGS` schema.)

---

# dog-behavior

## Dog · Presence
*How much threat he radiates at all.* **0** = a dog the sheep barely mind;
**1** = a dog that empties the field.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `R_flee` | 70 | **120** | 200 | |
| `ambient` | 0.05 | **0.20** | 0.45 | 0 = pure cone, 1 = pure radius |
| `coneK` | 4.0 | **2.0** | 1.2 | *inverted* — lower = wider eye |
| `lieDownBlock` | 0.8 | **1.4** | 2.2 | |
| `standBlock` | 1.3 | **2.2** | 3.4 | must stay > `lieDownBlock` (D3) |
| `lieDownIntensity` | 0.15 | **0.30** | 0.55 | |
| `postureRange` | 0.40 | **0.60** | 0.85 | fraction of `R_flee` |
| `postureConeK` | 6.0 | **4.0** | 2.5 | *inverted* |
| `dogAvoidRadius` | 25 | **45** | 80 | the A8 soft keep-out *(emit side)* |

## Dog · Standoff
*How much room he gives the flock.* **0** = works right on top of them, quick
and darty; **1** = works from a long way off, steady and unhurried.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `dogVMax` | 150 | **110** | 95 | *inverted* — must stay above sheep `vMax` |
| ~~`flankStandoff`~~ | ~~80~~ | ~~**140**~~ | ~~240~~ | superseded 2026-08-22 (POC-v6 touch-up 3): the dog runs the outline itself |
| `perimeterMargin` | 24 | **36** | 60 | the herd perimeter line's offset from the outermost sheep — drawn AND tracked (v6 touch-up 3) |
| `fenceSeekReach` | 48 | **72** | 120 | 2 × margin — was hard-wired to 2 × `flankStandoff` |
| `R_drive` | 95 | **140** | 220 | |
| `R_driveMin` | 42 | **55** | 90 | |
| `driveTrailGap` | 25 | **40** | 70 | **coupled to Presence** — see guards |

## Dog · Sweep
*The shape of his flank.* **0** = tight and economical; **1** = a big,
deliberate, wide sweep that finishes the job.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `flankConeDeg` | 30 | **45** | 62 | the C3 eye angle |
| `flankAdvance` | 1.8 | **1.0** | 0.5 | *inverted* — deliberate = slower |
| `flankOvershootDeg` | 30 | **90** | 150 | C7; 0 restores v3 balance-point handoff |
| `flankHandoffDeg` | 45 | **30** | 15 | *inverted* — tighter tolerance = more deliberate |
| `fenceSeekBias` | 0.25 | **0.60** | 0.90 | how hard he slots between sheep and fence |

## Dog · Touch
*The character of his hands at the gate.* **0** = soft, patient, long presses;
**1** = sharp, punchy, insistent.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `shoveMult` | 1.2 | **1.5** | 2.0 | |
| `shoveDur` | 1.2 | **0.8** | 0.5 | *inverted* — punchy = shorter |
| `shoveDecay` | 0.9 | **0.5** | 0.3 | *inverted* |
| `barkMult` | 1.6 | **2.0** | 2.8 | |
| `barkDur` | 0.7 | **0.4** | 0.25 | *inverted* |
| `barkDecay` | 0.5 | **0.3** | 0.2 | *inverted* |
| `leanMult` | 1.1 | **1.2** | 1.45 | |
| `leanDur` | 2.2 | **1.5** | 1.0 | *inverted* |
| `leanDecay` | 0.8 | **0.5** | 0.35 | *inverted* |
| `stallSpeed` | 4 | **8** | 14 | quicker to call a stall |
| `stallDwell` | 2.5 | **1.5** | 0.8 | *inverted* — quicker to convert to stand |

The three impulse flavors keep their **relative** ordering at every position:
lean < shove < bark in strength, bark < shove < lean in duration.

---

# sheep-behavior

## Sheep · Nerve
*How readily they react to threat they can feel.* **0** = stoic, hard to move;
**1** = hair-trigger.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `boldMean` | 0.55 | **0.30** | 0.12 | *inverted* — bold sheep are calm sheep |
| `boldnessTheta` | 0.85 | **0.50** | 0.25 | *inverted* — ignore-the-dog threshold |
| `panicThreshold` | 0.85 | **0.60** | 0.38 | *inverted* |
| `panicMult` | 1.3 | **1.6** | 2.0 | |
| `w_flee` | 1.1 | **2.0** | 3.2 | *(receive side of the threat split)* |
| `w_avoid` | 0.15 | **0.40** | 0.80 | A8 keep-out *response* |
| `vMax` | 70 | **90** | 115 | **coupled to Standoff** — see guards |

## Sheep · Cohesion
*Jelly stiffness.* **0** = loose scatter with no flock body at all; **1** = one
tight blob that moves as a unit.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `w_coh` | 0.4 | **1.0** | 2.0 | |
| `cohN` | 5 | **10** | 16 | topological, not metric |
| `cohScale` | 55 | **100** | 140 | |
| `w_sep` | 2.2 | **1.5** | 1.0 | *inverted* |
| `r_sep` | 26 | **18** | 12 | *inverted* |
| `minSep` | 6 | **4** | 3 | *inverted* |
| `w_align` | 0.08 | **0.20** | 0.45 | sheep are not starlings — stays weak |
| `r_align` | 22 | **36** | 55 | |

⚠ **Cohesion above ~0.75 is expected to violate rule A4** (no global blob). That
is a legal setting for a different game, not a defect — but the acceptance suite
must be run at 0.5.

## Sheep · Restlessness
*How fast a gathered flock comes undone.* **0** = statues; leave them gathered
and they stay gathered. **1** = never settles; every gather dissolves behind
you.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `grazeSpeed` | 6 | **15** | 30 | |
| `idleSpeedCap` | 10 | **25** | 45 | |
| `grazeStepEvery` | 9 | **4** | 1.5 | *inverted* — A2 shuffle cadence |
| `grazeStepLen` | 5 | **12** | 24 | |
| `wandererFrac` | 0.03 | **0.12** | 0.30 | A3 |
| `calmDelay` | 12 | **5** | 2 | *inverted* — B1/B2 hysteresis |
| `crowdTolerance` | 6 | **2** | 0 | *inverted* — paces the B2 re-scatter |
| `w_graze` | 0.12 | **0.30** | 0.60 | |
| `wanderTurn` | 0.6 | **1.5** | 3.0 | |
| `idleCohRadius` | 90 | **60** | 40 | *inverted* — group-membership range |

This is the lever that creates **time pressure** (B2). At 0 the game is zen; at
1 you cannot bank progress.

## Sheep · Character
*How much individuals differ from the average.* **0** = eighty identical sheep;
**1** = a flock full of individuals, oddballs guaranteed.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `boldSd` | 0.04 | **0.22** | 0.38 | |
| `dartBoldness` | 0.95 | **0.80** | 0.62 | *inverted* — D2's rare darter |
| `protestProb` | 0.20 | **0.60** | 0.95 | |
| `protestDur` | 0.12 | **0.30** | 0.55 | |

Character is independent of Nerve on purpose: POC-v3 P4 found `boldSd` was
**0.10**, making `boldness > 0.8` a 5σ event — D2's darter was mathematically
impossible while the *mean* looked perfectly reasonable. Character 0.0
reproduces that world deliberately.

---

# pasture-builder

The pasture is a **seeded generator**: `seed` draws a gate position on the
perimeter and a spawn side (F1/F2), and the four levers below decide what kind
of course that draw produces. `seed` is **not a lever** — it is a draw, and it
sits beside the panel as a reseed button, as today.

## Pasture · Scale
*How big a job is this.* **0** = a nursery pen with a handful of sheep; **1** =
a wide open trial field with a full flock.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `canvasW` | 800 | **1120** | 1500 | ⚠ currently `exposed: false` |
| `canvasH` | 520 | **720** | 960 | ⚠ currently `exposed: false` |
| `fenceInset` | 40 | **56** | 80 | also the pen apron outside the gate |
| `sheepCount` | 18 | **80** | 150 | |
| `w_fence` | 1.7 | **1.5** | 1.3 | *inverted*, mild |
| `r_fence` | 34 | **30** | 26 | *inverted*, mild |

`sheepCount` moved here from the `Sheep` category deliberately: **80-vs-20 is a
property of the challenge, not of sheep nature.** A sheep-behavior lever
describes how one sheep behaves at any count.

## Pasture · Gate
*How punishing the mouth is.* **0** = a barn door; **1** = a needle.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `gateWidth` | 60 | **42** | 24 | *inverted* |
| `gateCornerMargin` | 160 | **80** | 45 | *inverted* — nearer a corner = awkward approach |
| `gateApproachR` | 100 | **60** | 30 | *inverted* — G1 commitment zone |
| `w_through` | 3.2 | **2.0** | 1.1 | *inverted* — weaker commitment = harder |
| `crushRadius` | 30 | **40** | 55 | wider crush neighborhood = harsher mouth |

## Pasture · Approach
*How far the course makes you work.* **0** = spawn on the gate's doorstep in
tidy lumps; **1** = spawn far along the fence, scattered wide.

| param | 0.0 | **0.5 (shipped)** | 1.0 | note |
|---|---|---|---|---|
| `spawnGateOffset` | 90 | **200** | 420 | along the fence, seeded side (F2) |
| `spawnDepth` | 80 | **140** | 250 | into the field from the fence |
| `clusterSpread` | 12 | **24** | 45 | |
| `clusterMinGap` | 60 | **120** | 240 | |
| `clusterSizeMax` | 16 | **10** | 4 | *inverted* — smaller groups = more scattered |
| `spawnGateClear` | 120 | **120** | 120 | POC-v5 F8 — anchor-only until a tune pass |
| `holeCountMin` | 2 | **2** | 2 | POC-v5 F6 — anchor-only |
| `holeCountMax` | 5 | **5** | 5 | POC-v5 F6 — anchor-only |
| `holeRadiusMin` | 70 | **70** | 70 | POC-v5 F6 — anchor-only |
| `holeRadiusMax` | 180 | **180** | 180 | POC-v5 F6 — anchor-only |
| `holeLobes` | 3 | **3** | 3 | POC-v5 F6 — anchor-only |
| `focusShare` | 0.75 | **0.75** | 0.75 | POC-v5 F7 — anchor-only |
| `focusRadius` | 150 | **150** | 150 | POC-v5 F7 — anchor-only |
| `focusGapScale` | 0.5 | **0.5** | 0.5 | POC-v5 F7 — anchor-only |

*(Extended 2026-08-21, POC-v5 P6.)* Approach **owns** the nine spawn-layout
params (Q27) so every schema key has one owner, but at flat anchor profiles:
the lever does not yet make a whole-pasture course tighter or a weighted
core looser, and it does **not** bias *which* archetype is drawn. Whether
Approach 1.0 should lean toward whole-pasture is parked in the brainstorming
README. Beside `seed`, **`spawnLayout` and `randomSeedOnLoad` are draws, not
dials** — not levered, by design.

`clusterSizeMax` (the H1 slider) lives here rather than in sheep-behavior
because it acts **only at spawn**: it paints the course's starting picture. What
group sizes re-form *after* pressure is governed by `idleCohRadius`, which
belongs to Restlessness.

## Pasture · Strictness
*How harshly this course judges.* **0** = zen, nothing punished; **1** =
championship trial.

| param | 0.0 | **0.5 (shipped)** | 1.0 |
|---|---|---|---|
| `w_time` | 0.02 | **0.10** | 0.30 |
| `w_line` | 0.08 | **0.40** | 1.20 |
| `w_cohesion` | 0.08 | **0.40** | 1.20 |
| `w_calm` | 0.12 | **0.60** | 1.80 |

Strictness sets **how harshly** a fault is weighed. It does **not** set what a
fault *is* — that's Judging, below.

---

## Cross-lever guards

Two pairs of levers are genuinely coupled through the physics. They are not
bugs; they are constraints the UI has to honor, or the sim silently misbehaves.

| # | Guard | Why | Bolded default |
|---|---|---|---|
| **G1** | `driveTrailGap` ≤ `R_flee` / 3 | The trail gap must sit inside the threat range that actually mobilizes sheep, or walk-on stops pushing. Standoff 1.0 (gap 70) against Presence 0.5 (`R_flee` 120 → limit 40) **violates this**. | **Clamp on resolve, and surface it**: `driveTrailGap` resolves to `min(profile, R_flee/3)` and the Standoff lever shows a "limited by Presence" marker. |
| **G2** | `dogVMax` > `vMax` | The dog must be able to head a fleeing sheep (POC-v3 Q8). Standoff 1.0 (`dogVMax` 95) against Nerve 1.0 (`vMax` 115) **violates this**. | **Clamp on resolve**: `dogVMax` resolves to `max(profile, vMax × 1.05)`. |

Guards are the price of stamp-and-release: because a hand-edit wins, a clamp
must be applied **at resolve time**, not baked into the profiles.

---

## Not levered (30 params)

| Class | Params | Why not |
|---|---|---|
| **Superseded** | `R_orbit` `omega` `driveShrink` `fenceX` `gateY` `spawnMinX` `spawnMaxX` | Retired by v3; kept in the schema for reference only. |
| **Derived / rule-locked** | `goal` (follows the gate) · `clusterSizeMin` (fixed at 1 by H1) · `heelIntensity` (**fixed at 0 by A7** — an idle dog exerts no pressure; making it levered would let Presence break a rule) |
| **Substrate** | `L` `damping` `accelScale` `dt` `maxFrameDelta` | The physics floor. Changing these changes *everything* non-locally; they are not a character trait of anything. |
| **Draw** | `seed` | Not a dial. |
| **Debug** | the 7 `debug.*` toggles | Render only, never exported. |
| **Judging** | `crushThreshold` `crushSustain` `injuryWeight` `lineNorm` `T_straggle` `splitMinSize` `clusterDist` | The **fourth, unmodelled domain** — see below. |

## Judging — the parked fourth domain

Strictness answers *how harshly does this course weigh a fault*. It leaves
unanswered *what is a fault at all*: how long outside the body makes a
**straggler**, how many sheep make a **split**, how much crowding becomes an
**injury**. Those seven params define the vocabulary the score is written in,
and they should be the same on every pasture or the numbers stop comparing.

**Parked.** They stay as raw sliders. Model them in a later pass — probably as
*definitions* rather than levers.

---

## Open questions (for the owner; defaults in **bold**)

1. **Does Scale rescale the radii?** `L` is the unit most radii derive from. If
   the pasture grows to 1500×960 but `R_flee` stays 120, the dog is
   *relatively* weaker — a big field is genuinely harder. The alternative is
   scaling every length with the field, which makes Scale a pure zoom and
   changes nothing about difficulty.
   *(Default: **no rescale** — the dog's reach is fixed and a bigger pasture is
   a harder job. This is the honest game-design answer and the cheaper one.)*
2. **`canvasW`/`canvasH` are `exposed: false` structural.** Scale cannot exist
   without exposing them and making a resize respawn safely (the gate draw, the
   spawn anchor and the fence all key off the bounds).
   *(Default: **expose both, `onChange: 'respawn'`** — same treatment
   `fenceInset` already gets.)*
3. **Do lever positions persist?** Stamp-and-release means the resolved raw
   params are what `sheep-defaults.json.js` exports, so a reload could come back
   with all levers reading 0.5 while the raw values say otherwise.
   *(Default: **store the 12 lever positions in the defaults file alongside the
   raw params**, purely as UI state; the sim never reads them.)*
4. **Should a lever move be undoable as one step?** Moving Presence rewrites 9
   params at once; today's per-slider workflow has no undo.
   *(Default: **no undo in v5** — `[reset all levers to 0.5]` plus the export
   file is enough; revisit if it bites.)*
5. **Do the acceptance suites re-run at non-0.5 positions?** Every measured PASS
   in v1–v3 was taken at the anchor.
   *(Default: **anchor only** — acceptance is defined at 0.5; other positions
   are explicitly "a different game," including the A4-violating Cohesion range.)*
6. **Are there presets on top?** "Nursery", "Open Trial", "Brace" as named
   12-number vectors would be nearly free once levers exist.
   *(Default: **not in v5** — get the levers calibrated first; a preset is only
   as good as the axes underneath it.)*

---

## What this does not change

Worth stating plainly, because the whole point of stamp-and-release is that the
blast radius is small:

- **§1 SIM is untouched.** It still receives a plain resolved `params` object.
- **`sheep-defaults.json.js` keeps its format** — one `const SHEEP_DEFAULTS =`
  pure-JSON assignment (plus lever positions, per Q3).
- **All 84 existing sliders survive**, collapsed under **Advanced** in their
  current three-panel layout. *(As built: 87 at spec time, 105 as shipped —
  see the correction at the top.)*
- **Determinism is unchanged**: a run is still `(seed, params, [commands])`.
- **Export still emits raw params**, so every tuning result stays portable to
  Godot exactly as before.

Building it is a **§0/§3 job only**: a resolve function, the guards, and a
lever panel above the existing folders. *(As built, POC-v5: plus a §2 touch —
`resizeCanvas()` so Scale can change the canvas — and its §4 respawn wiring.
§1 stayed untouched and lever-unaware.)*
