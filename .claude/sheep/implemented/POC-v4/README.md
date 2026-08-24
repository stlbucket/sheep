# POC-v4 — Spec Index

Feature specs for the fourth iteration of the sheep PoC. Add more by running
`/sheep spec POC-v4 <notes>` (or `/sheep rule <notes>` for behavior rules).

Pipeline: **spec → plan → implement**. Started 2026-07-14 from the owner's
post-v3 hands-on notes
([`force-model.md`](../../brainstorming/force-model.md) → "Post-POC-v3
refinements"). **Planned 2026-07-14** — [`plan.md`](./plan.md), 3 phases;
owner proceeded with Q11/Q12 on their bolded defaults. **Complete
2026-08-21** — all 3 phases ticked, F1/C7 measured PASS, no v2/v3
regressions; acceptance log in
[`dog-behavior.md`](./dog-behavior.md#acceptance-log--p2-gate-2026-08-21).

## Features

| Feature | Spec | Status |
|---|---|---|
| Dog Commands & Influence v3 — spawn facing the flock (F1), flank carries ~90° past balance before the walk-on handoff (C7, amends C6) | [dog-behavior.md](./dog-behavior.md) | **implemented** 2026-08-21 |

## Locked decisions (this version)

- **Q11 → station rotation** (owner, 2026-07-14, planned on the default):
  the C7 handoff *station* rotates `flankOvershootDeg` (slider, start 90°,
  0 = v3) past the balance point in the flank direction.
- **Q12 → no return-transit damping special case** (same): the E1 trail
  governor is trusted first; P1/P2 log the flock's lateral drift during the
  return transit for the owner's hands-on read.

## Shipped

- `flankOvershootDeg` (Dog, 90°, 0–180·5) — the C7 station rotation; **0
  restores POC-v3 exactly** (measured). Defaults snapshot:
  [`poc/params-2026-08-21-v4.json`](../../poc/params-2026-08-21-v4.json),
  which differs from the v3 snapshot by that one key alone.
- Cone-edge note for tuning: the handoff fires at the station cone's **near**
  edge, so the effective carry ≈ `flankOvershootDeg − flankHandoffDeg`
  (≈ 60° at defaults). Want a true ~90°? Raise the overshoot to ~120° or
  tighten the tolerance — both are sliders.

## Still open

- **Q12 hands-on read** — the measured drift is **16–43.6 px @ overshoot 90
  vs 10.4–23.8 px @ 0** (flock radius ≈ 185 px) and E1's gap never broke, so
  the "no special case" default looks safe on paper. Does it look acceptable
  *in play*, or does v5 need eye damping on the return transit?
- **C7 carry: ~60° measured vs "~90°" in the rule.** The phase passed on its
  ±30° tolerance; whether 60° *reads* as another 90° is the owner's call.
  If not: `flankOvershootDeg` ~120 or `flankHandoffDeg` ~15, then
  re-snapshot. **Settle this before POC-v5** — its 0.5 anchor freezes the
  shipped defaults into 12 lever profiles.
- **P1's away@90 transit dip** (27.6 px) did not reproduce under P2's
  settled-start scenario (37.0 px) — scenario-dependent, not cleared.
- **Live `file://` console check** — the owner's eyeball (no-webserver rule);
  static invariants (parse, refs, defaults keys, mirrors) are clean. DoD is
  4 of 5 until then.
- Carried from POC-v3 (see [its README](../POC-v3/README.md)):
  POC-v2 Q8 (80-sheep gather ceiling), D2 dart sighting, plus the logged v4
  follow-ups — stale `dog.target` on command entry, walk-on parking when no
  sheep is ahead, `crushThreshold` re-calibration post-G1.
