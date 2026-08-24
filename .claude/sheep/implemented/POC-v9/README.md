# POC-v9 — Spec Index

Ninth iteration of the sheep PoC. Started and **shipped 2026-08-24** from one
owner note, four items, "do these to completion without asking": a light-blue
overlay on the gate-attraction area, a narrower/longer intense-pressure cone
for **easy** and for **lie-down**, and a **trot** behavior for big moving
pressured groups. Predecessor [POC-v8](../POC-v8/README.md) shipped
2026-08-23.

Built straight from the note — no plan phases; two specs, one headless
acceptance pass (27/27) plus a v8-side-by-side regression run. Snapshot
[`poc/params-2026-08-24-v9.json`](../../poc/params-2026-08-24-v9.json)
differs from v8's by **18 new keys** (4 cone, 14 trot) and one demotion
(`postureConeK` superseded). The owner's `file://` eyeball is **pending**
(as v4–v8 shipped).

## Features

| Feature | Spec | Status |
|---|---|---|
| Dog Commands & Influence v7 — easy cone (E6), lie-down cone (D3), gate-attraction overlay (V1) | [dog-behavior.md](./dog-behavior.md) | **implemented** 2026-08-24 — acceptance measured PASS ([log](./dog-behavior.md#acceptance-log--2026-08-24)) |
| Flock Behavior v3 — the trot (T1–T3) | [flock-behavior.md](./flock-behavior.md) | **implemented** 2026-08-24 — acceptance measured PASS ([log](./flock-behavior.md#acceptance-log--2026-08-24)) |

## Locked decisions (this version)

From the owner's note (2026-08-24), taken as given:

- **V1** — the gate-attraction area gets a light-blue transparent overlay,
  "similar to the dog presence area" (= the drawEye red wash).
- **E6** — in easy, the intense-pressure cone narrows to **30°** and extends
  **+30 % from normal**.
- **D3** — in lie-down, the cone narrows to **40°** and extends **+15 % from
  normal**.
- **T1–T3** — a group of **over 20** sheep, moving in the same direction with
  current dog pressure, has a **20 %/s** chance that the lead sheep break into
  a trot; others then follow in a column; **5 %** chance the whole flock bolts
  at once; once dog pressure is **escaped**, a **5 % → 90 %** per-second
  chance of decaying back to normal.
- **T3 amendment (owner, same day):** the decay floor is **20 %** (not 5 %),
  and a trotting sheep **approaching a fence within a few sheep-lengths
  stops outright (100 %)** — new `trotFenceStop` 36 px (3 body-lengths),
  gate mouth exempt.
- **T4 amendment (owner, same day):** a trotting group stays **reactive to
  the dog** — a felt dog **in front** of a sheep's trot line makes it
  reverse and trot the other way (`trotReverseDeg` 120° forward cone); and
  the trot pace eased **a bit slower**, `trotSpeedMult` 1.3 → **1.15**
  (measured steady 63 px/s, was 69).

## Q50–Q55 — asked and **answered by the owner, 2026-08-24**

Shipped first on bolded defaults, then walked with the owner the same day.
All kept **except Q54**, loosened:

- **Q50 — kept.** Cone "angle" read as the cone's **FULL apex width at the
  half-strength contour** — the same contour drawEye has always drawn. That
  makes walk-on ~90° (coneK 2) and old lie-down ~65° (cos⁴), so "reduce to
  30°/40°" reads naturally as full widths. Implemented as a cos^k falloff of
  equivalent width (`coneKFromDeg`), not a hard cutoff.
- **Q51 — kept.** "Extend … from normal": "normal" read as **the normal eye reach,
  R_flee** (the same base `driveConeExt` is quoted against): easy reaches
  1.3 × R_flee (down from sharing walk-on's 1.5 ×), lie-down's beam
  1.15 × R_flee — while lie-down's ambient FLANKS keep `posture range`
  (0.6 × R_flee), preserving D1's off-beam gate relief.
- **Q52 — kept.** Trot decay ramp time: the owner gave a floor → 90 % per
  second but not over how long; **5 s of pressure-free trotting**
  (`trotDecayRamp`). (Floor later raised 5 % → 20 % by the T3 amendment;
  measured median drop 1.65 s after escape.)
- **Q53 — kept.** "The lead sheep" = **the 3 frontmost** along the group's mean
  heading (`trotLeadCount`).
- **Q54 — loosened: alignment ≥ 0.5.** Group = the scoring cluster
  (union-find at `clusterDist` 70 px); "same direction" shipped at order
  parameter ≥ 0.7 — the owner chose **≥ 0.5**, so a somewhat ragged drive
  can still break into a trot; mean speed floor stays **20 px/s**
  (`trotAlignMin`, `trotMoveSpeed`).
- **Q55 — kept.** Trot strength `w_trot` at **2** (steer-to-velocity form):
  measured steady trot ≈ 69 px/s vs ≈ 35 px/s plain — at 1 the "trot" ambled.

## Q56 — easy retune (owner chose "retune easy now", 2026-08-24)

The shipped 30° easy raised a flag: on the seed-42 regression script (come-by
→ drive 150 s) v8 penned 40–43/80 but v9 penned **0** — E2 auto-drops a
stalled walk-on into easy, and a 30° beam *holds* the pile instead of pushing
it, even with shove taps (9/80). Measured sweep (worked gate = E3 tap every
5 s from easy):

| candidate | seed 42 penned @90/150 s |
|---|---|
| shipped 30°, no taps | 0/0 |
| 30° + shove taps | 9/9 · shove 1.75–2.5 collapse to 0 (chaotic) |
| 30° + bark taps | 30/30 · + lean taps 23/**53** |
| **45° + shove taps** | **40/40 = the v8 rate** (bark: 41) |
| 45–60° alone, ext 0.5 alone, never-auto-easy | 0/0 |
| v8-easy revert (90°, 1.5 R) | 40/40 |

**Applied: `easyConeDeg` default 30 → 45** — still half of walk-on's ~90°,
reach stays 1.3 × R_flee, taps untouched (shove strength is measurably
chaotic — left alone). The note's literal 30° is one slider notch away; the
new story: *easy holds and steers; the tap rhythm pushes*. Real walk-on is
untouched (seeds 1337/1403 replay v8 tick for tick until an easy
conversion).

## Carried forward from POC-v8

- Owner `file://` eyeball of v6 Q32–Q37, v7 Q39–Q44, v8's C10 read — still
  pending (Q50–Q55 themselves are answered).
- Lever audit: `anchor 94/94 exact · 94 levered + 62 not-levered = 156 schema
  keys · OK` (postureConeK left the Presence lever as superseded; the new
  keys are **parked** un-levered until a tune pass authors endpoints).
