# POC-v5 — Spec Index

Feature specs for the fifth iteration of the sheep PoC. Add more by running
`/sheep spec POC-v5 <notes>` (or `/sheep rule <notes>` for behavior rules).

Pipeline: **spec → plan → implement**. Started **2026-08-21** from the owner's
lever-model design session
([`lever-model.md`](../../brainstorming/lever-model.md), proposed 2026-08-18;
decision record [`docs/adr/0001-lever-model.md`](../../../../docs/adr/0001-lever-model.md)).
Predecessor [POC-v4](../POC-v4/README.md) shipped 2026-08-21.
**Planned 2026-08-21** — [`plan.md`](./plan.md), **7 phases** (P0–P3 spawn
layouts, P4–P5 levers, P6 acceptance & sync). **Completed 2026-08-21** — all
seven phases ticked, both specs' acceptance logs filled from a headless
measurement pass (anchor parity vs POC-v4 to the decimal on every
unambiguous metric, 101/101 shared params identical, 24 endpoints clean, 30
spawn courses inside every threshold); the owner's `file://` console check
(DoD item 5 / five-reload F4 check) is **pending** — as v4 shipped, named
honestly. Owner proceeded with
**Q13–Q30 on their bolded defaults** and **waived the "play POC-v4 first"
precondition** (consequence recorded in the plan: the 0.5 anchor freezes the
2026-08-21 defaults; a later C7 change is a Sweep middle-column edit).

**This version is a tuning-surface version, not a behavior version.** Nothing
about how the flock or the dog behaves at the shipped defaults may change —
that is acceptance criterion 3, not a hope. **One scoped exception (added
2026-08-21):** [`spawn-layouts.md`](./spawn-layouts.md) changes *where the
flock starts* (random seed per load, three layout archetypes). Criterion 3 is
read as "sim dynamics **given a course**"; the course draw is measured by that
spec's own criteria. Whether it stays in v5 or moves to v6 is **Q29**.

## Features

| Feature | Spec | Status |
|---|---|---|
| Tuning Levers — 12 named 0–1 levers in 3 domains over the raw params; stamp-and-release, 0.5 anchor, cross-lever guards | [tuning-levers.md](./tuning-levers.md) | **implemented** 2026-08-21 — acceptance 1–10 measured PASS, 11 pending owner; Q13–Q20 on bolded defaults |
| Random Course & Spawn Layouts — fresh seed every load (F4), three spawn archetypes: beside-gate / whole-pasture-with-holes / weighted-to-one-area (F5–F7), gate clearance (F8), `spawnLayout` enum selector | [spawn-layouts.md](./spawn-layouts.md) | **implemented** 2026-08-21 — acceptance 2–10 measured PASS, 1 pending owner; living rules list; Q21–Q30 on bolded defaults |

## Locked decisions (carried in from the design session)

Settled in [`lever-model.md`](../../brainstorming/lever-model.md) and the ADR;
they are expensive to revisit once 24 endpoint profiles are authored against
them, so they enter the spec as given, not as questions:

- **Emit vs. receive** — the dog owns everything that *shapes* the threat
  field (`R_flee`, `ambient`, `coneK`, posture blocks, `dogAvoidRadius`); the
  sheep owns everything that *responds* to it (`w_flee`, `boldnessTheta`,
  `panicThreshold`, `panicMult`, `w_avoid`). No raw param has two owners.
- **Stamp-and-release** — a lever writes its params once, then stops claiming
  them; a hand-edit afterwards wins and the lever reads `(modified)`.
- **Hand-authored endpoint profiles** — each lever is two coherent worlds,
  lerped; sweeping each param min→max independently produces incoherent
  endpoints.
- **The 0.5 anchor** — every lever at 0.5 emits the shipped defaults exactly.
  **Verified 2026-08-21**: all 79 anchor values match
  `poc/sheep-defaults.json.js`, so this is assertable at boot.

## Precondition before planning — **waived by the owner 2026-08-21**

**Play POC-v4 first.** Its C7 carry measures ~60° against a rule that says
~90°; if the hands-on read changes `flankOvershootDeg`/`flankHandoffDeg`,
the shipped defaults — and therefore this version's 0.5 anchor and the Sweep
profile — change with them. Settle the defaults and re-snapshot before
`/sheep plan POC-v5`.

## Still open

Owner review, all with bolded defaults in
[the spec](./tuning-levers.md#open-questions-parked--for-the-owner-defaults-in-bold):

- **Q13** Scale rescales the radii? (**no rescale**)
- **Q14** expose `canvasW`/`canvasH`? (**yes, `onChange: respawn`**)
- **Q15** which levers apply live vs respawn? (**dog+sheep live, pasture respawn**)
- ~~**Q16** panel layout~~ — already decided in `lever-model.md` (Levers root on top, existing panels under Advanced)
- **Q17** lever positions persist in the defaults file? (**yes, as UI state**)
- **Q18** one-step undo of a lever move? (**not in v5**)
- **Q19** acceptance at non-0.5 positions? (**anchor only**)
- **Q20** presets on top? (**not in v5**)

Spawn-layouts review, bolded defaults in
[that spec](./spawn-layouts.md#open-questions-parked--for-the-owner-defaults-in-bold):

- **Q21** draw a fresh seed on every page load? (**yes — `randomSeedOnLoad`; defaults-file seed only when pinned**)
- **Q22** Reset run replays the same course, Reseed draws a new one? (**yes**)
- **Q23** archetype mix? (**equal thirds, hard-coded; `spawnLayout` can force one**)
- **Q24** hole geometry? (**2–5 holes of 1–3 discs, 70–180 px**)
- **Q25** weighted core? (**75 % within 150 px @ 80 sheep, √n scaling**)
- **Q26** gate clearance? (**120 px = 2 × `gateApproachR`**)
- **Q27** lever ownership of the new params? (**Approach owns them at anchor; no archetype bias**)
- **Q28** F3 narrows to beside-gate; others read gather-then-drive? (**yes; ideal line from initial GCM**)
- **Q29** keep this behavior change inside v5? (**yes, README amended** — else POC-v6)
- **Q30** more archetypes? (**not in v5**)

**Carried forward out of v5 (for POC-v6 or a tune pass):**

- **Owner's `file://` check** — zero console errors, the `[levers] … OK` boot
  line, five reloads → five courses, seed replay exact.
- **`/sheep tune` pass per lever** — every endpoint is a proposal; P6 logged
  Strictness 1.0 (score 0 inside 60 s) and Scale 0 (28 % of 18 sheep on the
  fence after a drive) as the first calibration items.
- **Q27's deferred half** — should Approach bias the archetype draw / shape
  holes and core? Parked in `brainstorming/README.md`, default no bias.
- **Q30** — more archetypes (not in v5).
- **`reseed()` leaves `dog.command` alone** — the page resets it via
  `that'll do`; a bare `reseed()` inherits the previous drive (bit the P6
  harness). One-liner candidate.
- **`--lane` / header UI** — the owner-directed [`pasture-header.md`](./pasture-header.md)
  and [`panel-lanes.md`](./panel-lanes.md) touch-ups shipped alongside v5 (outside the
  plan).

Carried from earlier versions (not v5 scope unless the owner says so):

- **POC-v4 Q12** — return-transit drift after the C7 late handoff: does it
  need eye damping? Measured 16–43.6 px @ overshoot 90 vs 10.4–23.8 px @ 0;
  awaiting the owner's hands-on read. **Moot since POC-v6 (2026-08-22):**
  the flank ends at the gate line, overshoot default 0 — no return transit.
- **POC-v2 Q8** — the 80-sheep gather ceiling for one dog.
- **POC-v3 D2** — a dart has still never been *observed*, only made possible.
- v3's logged follow-ups: stale `dog.target` on command entry, walk-on parking
  with `fwdN 0`, `crushThreshold` re-calibration post-G1.
- **Judging** — the parked fourth domain (7 fault-definition params); levers
  set how harshly a fault is weighed, not what a fault *is*.

## Warning carried from the design doc

Every endpoint number is a **proposal awaiting hands-on calibration** — only
the 0.5 column is measured. Shipping the mechanism does not make the endpoints
right; expect a `/sheep tune` pass per lever afterwards.
