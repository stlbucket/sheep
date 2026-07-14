# POC-v2 · Feature: Flock Behavior — Semantic Rules

**Status:** **implemented 2026-07-13** — A1–A8 and B1–B2 measured PASS at two
seeds (acceptance log below); still a **living rules list** (owner adds more
anytime). Open Q8 (80-sheep drive difficulty) awaits the owner's hands-on read.

These are **semantic rules**: observable behavior the simulation must produce,
stated independently of the force math. They read as acceptance criteria for how
the flock *feels* — especially at rest, before the dog applies pressure. The list
is expected to grow; each rule is numbered so we can reference and refine them.

This is a fnb side-project — **no fnb DB/GraphQL/backend**. Rules must be
implementable inside §1 SIM (DOM-free, ports to Godot) driven by §0 `params`.

Related: today's boid/graze/cohesion model lives in
[`../../brainstorming/force-model.md`](../../brainstorming/force-model.md); this
spec constrains what that model must *look like* at rest.

---

## Setting changes

- **`sheepCount` default `20 → 80`.** (Slider max rises 80 → 150 per the
  [settings review](./settings-inspector.md); today's actual default is 20.)

---

## Semantic rules

Convention: `A#` = start / idle (unpressured) behavior. New groups get new letters
as the owner adds them (e.g. `B#` under-pressure, `C#` gate behavior, …).

### A. Start / idle state — the unpressured flock
- **A1.** On game start the flock is **calm and low-mobility** — most sheep barely
  translate; the scene reads as "sheep standing around in a field," not "a swarm."
- **A2.** **Most sheep graze**: near-stationary, slow head-down local wander, not
  covering ground — with the **occasional step-and-re-settle** (a body-length
  shuffle every so often), so the field reads alive, not statuary.
  *(refined 2026-07-13, Q4)*
- **A3.** **A few** sheep wander off in a **random direction** (slow drift) — a
  small minority, not the majority.
- **A4.** The flock does **NOT converge on a single center point** — there is no
  global pull toward one center of mass. Left alone, they do not gather into one
  blob. *Timescale (Q2): this must hold on the scale of a run start (~30 s+);
  **very slow coalescing over minutes is acceptable**.*
- **A5.** Sheep sit in **several small loose groups of ~2–5**, standing in
  **different places** across the field. *Group size 2–5 is the invariant;
  group count scales with `sheepCount` (~18–24 groups at 80). (Q1)*
- **A6.** Those groups start **spatially separated** (scattered across the play
  area), not spawned as one clump that then disperses.
- **A7.** An **idle dog exerts no pressure**: with the dog at heel / stood down
  (game start, or after *that'll do* completes), sheep do **not** drift away
  from it — the flock's position does not change because an off-duty dog is
  standing nearby. *(Added from the 2026-07-13 baseline verification, where the
  idle dog herded the flock ~15 body-lengths into a corner; confirmed by owner.)*
- **A8.** Sheep **tend not to approach an idle dog**: a stood-down dog is a soft
  keep-out — grazing/wandering paths bias away from it, without flight, panic,
  or any herding effect (which A7 forbids). *(Owner, 2026-07-13, resolving Q5.)*

*(room to grow — owner is adding more rules here)*

### B. Under pressure — and the return to calm
- **B1.** **Dog pressure dissolves the idle state**: threatened sheep drop
  grazing/group structure and behave as one responsive flock (the POC-v1 boid
  behavior) while threat persists.
- **B2.** **Calm re-scatters the flock**: after sustained calm (dog stood down,
  no threat), a gathered flock **gradually relaxes back into loose grazing
  groups** — leave your gathered sheep too long and they drift apart. Slow
  enough to feel natural, fast enough to create time pressure mid-run.

*(room to grow)*

---

## Design notes (light — planning will refine the "how")

These are implications, not the implementation. Flagged because they're the hard
parts of honoring the rules above with a boid model:

- **Cohesion must be local & bounded, not global (A4/A5).** A single strong
  cohesion pull produces one blob. Options: cap cohesion to a short radius / few
  neighbors, and/or gate it off in the idle state so idle groups don't reach for
  each other.
- **Groups must resist merging (A5).** Plain boids tend to coalesce over time. To
  hold ~2–5-sheep groups apart at rest, cohesion likely needs to be **weak/local
  enough that separate groups don't feel each other**, or an idle state that
  suppresses long-range attraction entirely.
- **Scattered spawn (A6).** Replace the single spawn box with **several cluster
  seeds** (random points in the left field), each populated with 2–5 members
  jittered around the seed.
- **Idle vs. mobile split (A1–A3).** A per-sheep idle/graze baseline with a low
  speed cap, and a small random fraction flagged as "wanderers" with a slightly
  higher drift.
- **Idle dog must stand down (A7).** After *that'll do* (and at spawn) the dog
  keeps `intensity 1.0`, and its `R_flee` (120 px) overlaps the spawn area — the
  ambient floor of the eye model means even an unfocused dog pushes sheep.
  Options: drop `dogIntensity` to ~0 while at heel (a "stood down" command
  state, like lie-down's reduction), and/or spawn the owner/home outside
  `R_flee` of the herd. A8's soft keep-out is a separate weak avoidance
  steering on *sheep* (graze/wander biased away), not a flee force.
- **Calm → idle transition needs hysteresis (B1/B2).** A per-sheep (or
  per-flock) calm timer: threat dissolves idle instantly (B1); idle only
  resumes after sustained zero-threat, then relaxes gradually (B2) — otherwise
  sheep flicker between states at the threat boundary.

---

## Tunables likely involved

Existing: `sheepCount`, `grazeSpeed`, `w_graze`, `wanderTurn`, `damping`, `w_coh`,
`cohN`, `cohScale`.
Likely **new** (name TBD in planning): cluster size range (2–5; count derived
from `sheepCount`), wanderer fraction, idle speed cap, cohesion-idle gate,
graze step-and-re-settle cadence (A2), heel/stood-down dog intensity (A7),
idle-dog avoidance radius (A8), calm-relax timescale for re-scattering (B2).

---

## Open questions — all resolved by owner 2026-07-13

1. ~~**Counts** for the start groups / wanderer fraction?~~ **Resolved** →
   groups of **2–5** are the invariant; **count scales with `sheepCount`**
   (~18–24 groups at the new default of 80); **~10–15% wanderers**. Folded into A5.
2. ~~**Do idle groups stay put or slowly drift/merge?**~~ **Resolved** →
   **very slow coalescing is OK** (minutes-scale); A4/A5 must hold on the
   ~30 s+ run-start scale. Folded into A4.
3. ~~**Does pressure dissolve the idle state?**~~ **Resolved** → yes, fully —
   and sustained calm **slowly re-scatters** a gathered flock. Became **B1/B2**.
4. ~~**Grazing: step-and-re-settle or stationary?**~~ **Resolved** →
   occasional step + re-settle. Folded into A2.
5. ~~**A7 edge: sheep walks up to an idle dog?**~~ **Resolved** → sheep **tend
   not to approach** an idle dog (soft avoidance, no flight/herding). Became **A8**.

### New (from P3 implementation, 2026-07-13 — for the owner)

6. **Idle drifters self-pen:** left alone ~3 min, a handful of sheep wandered
   through the open gate and committed to the pen (v1 `through` mechanic).
   *(P4 update: this was mostly the alignment-glide artifact — after the idle
   alignment gate, 180 s idle shows 0 penned. Slow wanderers could still reach
   the gate on much longer timescales.)* Should `through` only arm once a run
   is "live"? (Default: **through only arms after the first dog command** —
   cheap, preserves v1 runs; low urgency now.)
7. **Minutes-scale edge-drift:** ~~groups pile along the fences~~ *(P4 update:
   was the alignment glide; after the gate the 180 s field is statistically
   identical to spawn — resolved, no action).*
8. **80-sheep drive difficulty (design, not defect):** under B1/B2, driven
   sheep settle and stand ~`calmDelay` after leaving the dog's reach, so
   driving a large scattered flock takes sustained regional work — measured:
   a 180 s naive walk-on at 80 sheep moves the GCM nowhere, while the same
   loop at 20 sheep pens 9. Is that the intended skill curve, or does the
   drive need help (e.g. driven sheep keep a forward bias longer, or
   `calmDelay` scales up while moving)? (Default: **play it first** — judge
   hands-on before changing the model.)

---

## Acceptance

**A-rules** — load the page with the dog idle (no commands):
- ~80 sheep appear in **several small, spatially separated groups** of ~2–5
  (~18–24 groups).
- The scene is **mostly still** — a couple of sheep drift slowly, the rest graze
  (with occasional shuffle-steps).
- Left alone for 30+ seconds, they **do not gather into one blob** or slide
  toward a common center (very slow minutes-scale coalescing is tolerated).
- The flock's overall position **does not shift away from the idle dog** (A7) —
  no corner-creep — and grazing paths don't wander onto the dog (A8).

**B-rules** — gather the flock with come-by/away, then *that'll do*:
- Under pressure the flock moves as one responsive blob (B1).
- After sustained calm, the gathered blob **visibly relaxes back into loose
  groups** over a noticeable-but-not-instant interval (B2).

---

## Baseline verification — 2026-07-13 (pre-implementation, expected fail)

`/sheep verify A1 A4 A5` against the POC-v1 build (seed 1337, 20 sheep, dog
idle at `that_ll_do`). Metrics: single-linkage clustering at `clusterDist`
(70 px), samples at t≈0 and t≈+10 s.

| Rule | Measured | Verdict |
|---|---|---|
| A1 | every sheep translated ~185 px (≈15 L) in 10 s; 0% stayed within 3 L | **fail** |
| A4 | one blob; mean dist-to-GCM 22 px (< 2 L), fully converged within seconds | **fail** |
| A5 | 1 cluster of 20 at both samples (want ~10–14 clusters of 2–5) | **fail** |

Findings: (a) with `cohN 10` of 20 sheep, "local" cohesion spans half the flock
→ global convergence is structural, not a slider fix; (b) the idle dog's
pressure (intensity 1.0, `R_flee` over the spawn box) herded the blob into the
bottom-left corner → rule A7. This table is the before-picture the POC-v2 plan
must beat.

---

## Acceptance verification — 2026-07-13 (POC-v2 implemented — PASS)

`/sheep verify` after P0–P5, seeds **1337 and 42**, 80 sheep, dog untouched at
heel, 30 s window (metrics per rule; 1337 / 42):

| Rule | Measured | Verdict |
|---|---|---|
| A1/A2 | grazers 8.3 / 10.1 px mean over 30 s; 100% within 3 L both seeds | **pass** |
| A3 | 9 wanderers (11%) drifting ~47–49 px/30 s | **pass** |
| A4 | mean dist-to-GCM 225→225 / 233→235 (flat; baseline: 22, converged) | **pass** |
| A5/A6 | 25 (all 2–5) / 21 (one 7) clusters at t=0; ≥21 at 30 s | **pass** |
| A7 | GCM moved 3.6 / 1.7 px in 30 s; max stress 0 (baseline: 185 px creep) | **pass** |
| A8 | no sheep within 129 / 153 px of the heel dog | **pass** |
| B1 | threat dissolves idle instantly; alert sheep = full v1 boids; max 2 idle⇄alert flips/sheep/10 s at the threat boundary (calmDelay hysteresis) | **pass** |
| B2 | released crowd holds ~45 s, then dissolves: biggest cluster 27→19 (1337), 22→20 (42); paced by `crowdTolerance` | **pass** |

**v1 milestone regression (at v1 scale, 20 sheep):** gather → drive moved GCM
470→907 through the gate, **9/20 penned**, max crush 1.42 with lie-down pulses,
scoring card renders. **At 80 scattered sheep a full-field drive stalls** —
driven sheep calm and stand after `calmDelay`, so the dog only moves its
120 px slice; a full gather/drive is now long, regional work (Strömbom
collect). Parked as open question 8.
