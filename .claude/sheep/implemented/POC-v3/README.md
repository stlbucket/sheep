# POC-v3 — Spec Index

Feature specs for the third iteration of the sheep PoC. Add more by running
`/sheep spec POC-v3 <notes>` again.

Pipeline: **spec → plan → implement**. **Version complete 2026-07-13**: all
ten phases of [`plan.md`](./plan.md) ticked, P4 acceptance measured (logs in
each spec). Q8 (80-sheep gather) and D2's dart event remain parked for the
owner's hands-on read.

## Features

| Feature | Spec | Status |
|---|---|---|
| Dog Commands & Influence v2 — flanking come-by/away (fence-seeking, 45° cone), blocking lie-down, new **stand** command, never-catch-up walk-on with auto-stand + impulse, **finite flank→drive handoff (C6)** | [dog-behavior.md](./dog-behavior.md) | **implemented** (P4 acceptance log in spec) |
| Course, Gate & Flock Setup — random perimeter gate, spawn near-gate-one-side, gate commitment, 1–n idle groups (slider, default 10 / max 20), sheep-left/dog-right panel split, `sheep-defaults.json.js` | [course-and-flock.md](./course-and-flock.md) | **implemented** (P4 acceptance log in spec) — living rules list |

## Locked decisions (this version)

- **Come-by = clockwise, away = counter-clockwise** (tradition kept; matches v1).
- **Stand is a 6th command** (own button + hotkey); lie-down/stand = escalation pair.
- Command strip highlight **follows the dog's actual state** (auto-stand shows).
- Walk-on impulse: **standard shove default, modifier keys for bark / lean**,
  all three shapes tunable.
- Flank cone angle is a **slider** (start 45°); dart threshold **boldness > ~0.8**.
- v3 acceptance **re-measures POC-v2 open Q8** (80-sheep full-field drive).

## Locked decisions (2026-07-13 additions)

- **Panel map** (course Q1): sheep-side **left** (Sheep, Idle, Boids,
  Boldness) · dog-side **right** (Dog, Flee/Eye) · **Course & Meta collapsed
  below the dog panel** (Stage, Gate + Crush, Scoring, Debug, Sim).
- **Defaults file** (course Q2): **`sheep-defaults.json.js`** — one
  `const SHEEP_DEFAULTS =` assignment around a pure JSON literal;
  **global invariant #2 amended** (owner) to "one HTML + one defaults file".

## Still open (for the owner, hands-on)

- **POC-v2 Q8** — 80-sheep full gather: re-measured at P4, **stays open**
  (20-sheep runs complete in 28–45 s; scripted 600 s at 80 ends 3–7/80; full
  data in `../POC-v2/flock-behavior.md` Q8). Judge whether that is the
  intended 1-dog ceiling or the drive needs help.
- **D2 dart** — the top-tail population now exists (`boldSd` 0.22 → 0–2 per
  80 over the 0.8 threshold; was impossible at the old hard-coded sd 0.1),
  but a dart was not observed in ~13 min of automated posture scenarios —
  rare-by-design; watch for one live.
- Q3–Q6 / Q9–Q10 were built on their parked defaults and measured at P4;
  re-judge by feel anytime (all are sliders or reseed-visible).
- v4 follow-ups logged in the dog-behavior acceptance log: stale
  `dog.target` on command entry, walk-on parking when no sheep is ahead,
  `crushThreshold` re-calibration post-G1.
