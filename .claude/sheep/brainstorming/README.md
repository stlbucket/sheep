# Sheepdog Herding Game — Brainstorming

Index + living notes for a sheepdog-trial herding game. Captures the design
conversation and points at the deep-dive docs. **This is a design/planning
effort — no prototype code has been written yet, and (per owner) no fnb/DB work
happens here; fnb is only a future backend, figured out separately.**

## The concept

Bird's-eye herding game. You command one or more **dogs**; you never directly
control the sheep. Dogs apply *pressure* through the natural predator–prey
relationship — threat and "eye" (stare-down), never contact. The herd behaves
like a cohesive **"blob of jelly"** whose motion is emergent. Goal: move and/or
collect the flock to a target (pen / gate / field corner).

Commands (voice-flavored buttons; you say the dog's name in multi-dog scenarios):

| Command | Effect *(as of POC-v3, 2026-07-13)* |
|---|---|
| **Come by** | **Flank** the flock **clockwise** — not a fixed orbit: the dog works around the flock edge, slotting between sheep and fence, eye held ~45° off his travel line so passed sheep push inward. Finite: he carries the flank **~90° past the balance point** (the spot opposite the target) and only there hands off to walk-on by himself (C6 + C7). |
| **Away** | Same flanking, **counter-clockwise**. |
| **Walk on** | **Trailing drive**: the dog presses from behind but never catches up (trail-gap governor). If the flock stalls against backpressure he auto-converts to **stand** (the strip follows); tapping walk-on from there fires a pressure **impulse** — plain tap = shove, Shift = bark (punchier), Alt = lean (calmer). |
| **Lie down** | Blocking posture: the covered arc reads as a soft one-way wall (crossable only under crowd backpressure); pressure elsewhere released so a gate front can trickle through. |
| **Stand** | 6th command (POC-v3): the firmer blocking posture — same shape as lie-down, harder wall. |
| **That'll do** | Job done; dog runs back to the owner's side. |

Scale ranges from **1 dog vs 1 sheep** up to **3–4 dogs vs ~150 sheep**;
physics/difficulty dials TBD. UX = bird's-eye view + command buttons.

## Why it works (design thesis)

It's **indirect control over emergent agents** — the same loop that carries
*Pikmin*, *Katamari*, *Untitled Goose Game*. The satisfying moments (compaction,
splitting, stragglers peeling off, gate bottlenecks) *emerge* from local rules
rather than being scripted. Player skill = learning to **read and shape the
blob**. You don't animate the drama; the simulation produces it.

## Grounding: this is a solved simulation problem

- Sheep = Reynolds **boids** (separation / cohesion / alignment) + a
  **flee-from-dog** force.
- It matches **Strömbom et al. 2014, "Solving the shepherding problem"**
  (J. R. Soc. Interface): a shepherd needs only two behaviors — **collect**
  (fetch the furthest straggler back to the group) and **drive** (position
  behind the group and push toward the goal). Your commands are the *manual*
  version of that shepherd. Details in [`force-model.md`](./force-model.md).

## Architecture decision (settles the 2D→3D question)

The **simulation is 2D on the ground plane regardless of how it's rendered.**
So split it hard:

- **Sim layer** — pure 2D vector math; engine-agnostic; unit-testable headless.
- **Render layer** — swappable: 2D sprites first, 3D models on the same plane
  later (that's the *only* place the Blender → glTF → Godot animation pipeline
  enters).

Start 2D, prove the fun lives in the sim, re-skin later. The uncertainty about
dimensionality is itself a *reason* to build this split from day one.

## Prototype path (recommended)

Smallest thing that proves the game: **1 dog, ~20 sheep, one field, one goal,
all five commands, dots-and-triangles art.** Prove the *feel*. Order:

1. **Throwaway JS/Canvas PoC** to tune the force model + command feel (fastest
   possible iteration). Rationale → [`js-poc.md`](./js-poc.md); build plan →
   [`poc-plan.md`](./poc-plan.md).
2. **Port the proven numbers** into a Godot `FlockSim`. → [`godot-prototype.md`](./godot-prototype.md)

No engine required to validate the simulation. No backend anywhere in the
prototype.

## Deep dives

- [`force-model.md`](./force-model.md) — the actual force equations, emergent
  behaviors, dog steering, tuning table.
- [`godot-prototype.md`](./godot-prototype.md) — 1-v-20 Godot node structure +
  the sim/render split.
- [`threat-model.md`](./threat-model.md) — radius vs. gaze cone ("eye"); the
  ambient-cone hybrid, how facing is derived, multi-dog flanking.
- [`failure-and-scoring.md`](./failure-and-scoring.md) — arcade vs. zen; the
  four-axis subtractive score, the crush→injury fault paired with lie-down, modes.
- [`js-poc.md`](./js-poc.md) — throwaway JS Canvas PoC: *why* JS-first beats
  Godot-first, and *what* to render/prove.
- [`poc-plan.md`](./poc-plan.md) — the **build plan** for that PoC: file layout,
  8-phase build order, data shapes, definition of done, risks.
- [`lever-model.md`](./lever-model.md) — *(specced 2026-08-21 →
  [`implemented/POC-v5/`](../implemented/POC-v5/README.md))* the **tuning surface**: 109 raw params
  collapsed to **12 levers** in 3 domains (dog-behavior, sheep-behavior,
  pasture-builder), with the emit/receive ownership split, the 0.5 anchor, and
  the hand-authored endpoint profiles. Vocabulary pinned in
  [`../../../CONTEXT.md`](../../../CONTEXT.md).

## Open design questions (parked)

- ~~**Difficulty dials**~~ **Largely resolved 2026-08-18** → the 109 raw params
  collapse to **12 levers** in three domains; flock size and field size became
  **Pasture · Scale**, boldness/flightiness split into **Sheep · Nerve** (the
  mean) and **Sheep · Character** (the spread), goal shape became
  **Pasture · Gate**. See [`lever-model.md`](./lever-model.md). **Shipped
  2026-08-21 in [POC-v5](../implemented/POC-v5/README.md)** as the Levers
  panel (anchor 88/88 exact, lever layer measured inert at 0.5). *Still open
  there:* terrain & line-of-sight (first cut shipped 2026-11-14 as [POC-v12 obstacles](../implemented/POC-v12/obstacles.md) — solid stands / rocks that give cover; no lever owns them yet, Q67), split-the-flock as a goal
  type, and the per-lever `/sheep tune` calibration pass — every endpoint is
  still a proposal.
- **Approach endpoints vs archetypes (parked 2026-08-21, POC-v5 Q27's
  deferred half):** Approach owns the nine spawn-layout params but at flat
  anchor profiles and with no say over *which* archetype `random` draws.
  Should Approach 1.0 lean toward whole-pasture (the hardest gather) and 0.0
  toward beside-gate, and should its endpoints shape the holes / the core?
  **Default: no bias, flat profiles** until a tune pass has played the three
  archetypes at 0.5 — the archetype mix is a course property, the lever a
  difficulty dial, and coupling them early hides which one the owner is
  actually feeling.
- ~~**Threat = radius or cone/"eye"?**~~ **Resolved** → ambient-cone hybrid with
  derived facing; see [`threat-model.md`](./threat-model.md).
- ~~**Timed/scored (arcade tension) vs zen/flow?**~~ **Resolved** → four-axis
  subtractive score + stars + a mode toggle (same engine does both); see
  [`failure-and-scoring.md`](./failure-and-scoring.md).
- ~~**Failure state**~~ **Resolved** → three-tier fault taxonomy; the
  crush→injury fault is paired with the lie-down verb. Same doc.
- **Determinism**: a run = `(level_seed, [timestamped commands])` → tiny to
  store, cheat-resistant, free replays/ghosts. (Backend concern — later.)
- ~~**Flank overshoot (post-v3, 2026-07-14)**~~ **Resolved 2026-08-21** →
  the **station** rotates, not the sweep requirement: `flankOvershootDeg`
  (Dog, 90°, `0` = v3) moves the C6 handoff point that far past the balance
  point in the flank direction. Shipped in
  [POC-v4](../implemented/POC-v4/dog-behavior.md) as **C7**, measured at
  +60.3…+85.8° of carry with no second lap. *Still open there:* whether the
  dog's side-on pressure during the longer return transit needs damping —
  measured drift is 16–43.6 px vs 10.4–23.8 px at overshoot 0 (flock radius
  ≈ 185 px), which the owner judges hands-on (v4 Q12). **Moot since
  2026-08-22:** POC-v6 C8 ends the flank *at* the gate line (overshoot
  default 0) — there is no return transit unless the dial is raised.
- ~~**Perimeter flank + easy (owner, 2026-08-22)**~~ **Resolved 2026-08-22** →
  shipped as [POC-v6](../implemented/POC-v6/dog-behavior.md): come-by/away
  track the herd perimeter (the §1 convex hull at `perimeterMargin` — the
  dotted outline itself since the owner's same-day touch-up 3; the 140 px
  `flankStandoff` track is superseded) to the
  **gate line**, where the flank point parks and the dog drops into
  **easy** — a slow forward drive at `easySpeedFrac` (⅓) of walk-on that
  **replaces stand** (E2/E3 re-routed; lie-down is the only posture).
  *Still open there:* Q32–Q37 on their bolded defaults (Q38 — E1's governor
  rates as tunables, scaled in easy — shipped the same day; easy's threat
  profile = drive eye; parked point ignores fence-seek; Q31 — hull at
  `flankStandoff` vs the drawn outline — was **overturned** by the owner:
  the dog runs the outline). The pre-existing fence-seek step at
  `2 × flankStandoff` was smoothed the same day (`fenceSeekRamp`); the reach
  is now `fenceSeekReach` (72).

## Animation pipeline (reference, for the 3D re-skin later)

Blender: model → armature/rig → weight paint → author named **Actions**
(idle/run/lie-down) → export **glTF (.glb)** with actions → Godot imports as a
scene with an `AnimationPlayer` per clip → wrap in `AnimationTree`
(state machine / blend spaces) driven from GDScript. 2D prototype needs none of
this — just sprite frames.
