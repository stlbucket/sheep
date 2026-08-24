---
status: accepted
date: 2026-08-18
---

# The lever model sits above the raw params, not in place of them

The PoC exposes 109 raw params (84 as live sliders) across 11 categories — a
tuning surface too large to hold in one head, and too large to tune
conversationally. We collapsed it to **12 named 0–1 levers** in three domains
(dog-behavior, sheep-behavior, pasture-builder), each driving a family of raw
params along a hand-authored curve. Levers are a **tuning surface only**: the
simulation never sees one. Details in
[`.claude/sheep/brainstorming/lever-model.md`](../../.claude/sheep/brainstorming/lever-model.md);
vocabulary in [`CONTEXT.md`](../../CONTEXT.md).

Three sub-decisions carry the design, and all three are expensive to revisit
once 24 endpoint profiles have been authored against them.

## Emit vs. receive — no raw param has two owners

Threat is dog-emission × sheep-tolerance, so `R_flee` and `w_flee` are both
reachable from a "how scary is the dog" lever *and* a "how jumpy are the sheep"
lever. We split on the physics instead of on intuition: the **dog owns
everything that shapes the threat field** (`R_flee`, `ambient`, `coneK`, the
posture block multipliers, `dogAvoidRadius`); the **sheep owns everything that
responds to it** (`w_flee`, `boldnessTheta`, `panicThreshold`, `panicMult`,
`w_avoid`).

The rejected alternative — letting both levers write the shared params — fails
silently rather than loudly: the last lever you touch wins, and the other one
keeps displaying a position it no longer produces. A cross-domain "Threat"
lever was also considered and rejected for breaking the three-domain model the
owner asked for.

## Stamp-and-release — raw params stay the single source of truth

Moving a lever writes its raw params **once**, then stops claiming them. A raw
param edited by hand afterwards simply wins, and the lever displays as
`0.55 (modified)`.

This is the reason the blast radius is small: §1 SIM is untouched and still
receives a plain resolved `params` object, `sheep-defaults.json.js` keeps its
format, export still emits raw params (so tuning stays portable to Godot), and
a run is still deterministically `(seed, params, [commands])`. Building the
levers is a §0/§3 job only.

The alternative worth remembering is the **offset model** — lever sets a base,
hand-edits stored as deltas on top, so moving the lever later carries your
tweaks along. It is strictly more powerful and was rejected on cost: it changes
the defaults-file format and adds state the sim would have to round-trip. A
lever-authoritative model (raw sliders become read-only) was rejected outright
because every good default in v1–v3 came from hands-on raw tuning
(`boldSd` 0.10 → 0.22, `dogVMax` 135 → 110), and that workflow must survive.

**Consequence:** because a hand-edit wins, the two physics constraints between
levers (`driveTrailGap` ≤ `R_flee`/3, and `dogVMax` > `vMax`) cannot be baked
into the profiles — they must be applied as clamps **at resolve time**. See the
"Cross-lever guards" section of the lever model.

## The 0.5 anchor — the middle is the measured simulation

Every lever at 0.5 emits the shipped defaults **exactly**, and endpoints are
authored outward from that center. `[reset all levers to 0.5]` gives back the
v3 simulation bit for bit.

v1–v3 acceptance was measured across seeds 1337 and 42 at those exact numbers.
Authoring endpoint profiles freely would have meant no lever position
reproduces the proven baseline — the tuning work would have been quietly
discarded the moment the lever panel shipped. The anchor also means `0.5` is
never a number anyone has to invent: it is copied from
`sheep-defaults.json.js`.

**Consequence:** acceptance is defined **at the anchor only**. Other lever
positions are explicitly "a different game" — including Cohesion above ~0.75,
which is expected to violate rule A4 (no global blob) by design rather than by
defect.
