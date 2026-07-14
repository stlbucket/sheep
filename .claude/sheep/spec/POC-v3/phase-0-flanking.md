# Phase 0 — Flanking Come-by / Away

## ▶ Invocation
**Trigger:** "run phase 0" / reaching P0 from [`plan.md`](./plan.md).
**Prerequisite:** POC-v2 complete (it is).
**Do:** implement Tasks in `sheep-poc.html`, run Verify, tick P0 in `plan.md`,
**STOP, and report**. **Constraints:** plan.md Global invariants.

## Goal
Come-by/away stop being fixed orbits and become **flanking**: the dog works
around the flock edge (clockwise for come-by, counter-clockwise for away),
seeking the gap **between sheep and fence**, with his eye held **~45° off his
line of travel** toward the flock. Rules **C1–C5**.

## Tasks
- **§0 (`Dog` category, schema):** `flankStandoff 140` px (60–300·5 — replaces
  `R_orbit`'s role), `flankConeDeg 45`° (20–70·1, slider per Q3),
  `flankAdvance 1.0` rad/s-equivalent pace along the flock edge (0.2–3·0.1),
  `fenceSeekBias 0.6` (0–1·0.05 — how strongly the flank path hugs the
  fence side when one is near). Mark `R_orbit`/`omega` `exposed:false`
  (documented, superseded).
- **§1 `stepDog` — come_by/away cases replaced:**
  - **Anchor point** = the flock member *most counter-flank-ward* (the sheep
    the dog should get beyond first — nearest un-gathered edge sheep in the
    flank direction), not the GCM.
  - **Flank target**, recomputed per tick: a point `flankStandoff` beyond that
    anchor on the side **away from the flock center**, biased toward the
    nearest fence by `fenceSeekBias` when the flock is within ~2×standoff of
    a fence (C2); advance the target around the flock edge at `flankAdvance`
    in the command's direction (CW for come_by — Q1).
  - **Facing (the eye):** `facing = heading(vel) rotated flankConeDeg toward
    the flock side` — moment-by-moment (C3). Falls back to face-flock when
    nearly stationary.
  - Mid-field reversal (C4): with no fence within reach, the same logic holds
    a `flankStandoff` ring — flanking needs no fence.
- **§2:** the existing eye-cone debug draw needs no change (it follows
  `facing`) — confirm it visibly points ~45° off the dog's track.

## Verify (measured)
- **Not a circle:** track the dog for 20 s of come-by on the scattered
  80-sheep field: distance-to-GCM variance is high (an orbit holds it ±few px)
  and the path's initial leg heads toward the fence side beyond the nearest
  sheep (C2).
- **Eye angle:** sampled per second while flanking, the angle between the
  dog's velocity heading and its facing ≈ `flankConeDeg` ± 10° (C3).
- **Push direction:** sheep the dog passes acquire velocity **inward**
  (toward flock center), not radially away from the dog's track (C3 effect).
- **C4:** issue away mid-field (flock far from fences): the dog holds
  ~`flankStandoff` from the flock edge while circling CCW.
- POC-v2 spot-check: idle field A1/A4/A5 quick metrics unchanged; 20-sheep
  gather still works (possibly better).

## Done when
- [ ] Orbit code replaced by flank-target steering; directions CW/CCW per Q1.
- [ ] Eye held at `flankConeDeg` off the line of travel, slider-tunable.
- [ ] Measured checks above; zero console errors; §1 DOM-free.

## As-built additions (found during verification, 2026-07-13)
- **Ring-radius smoothing + clearance floor.** The sector-max edge radius is
  discontinuous as the bearing sweeps — a raw radius snap dragged the flank
  point through the flock on a reversal (measured: 180 px gap → 15 px).
  As built: `d.flankR` lerps toward the sector radius (≈3/s), seeds from the
  dog's radius on command, and extends outward until the point clears every
  sheep by ≥ 0.6×`flankStandoff`. Result: min gap 37 px over 50 s with two
  reversals (10th percentile 64 px).
- Measured verify: dist-to-GCM sd 36 (range 339–484 — not a circle); first
  leg ran the left then top fence between sheep and boundary; eye 44.8–46.5°
  mean; stressed sheep inward velocity +31 px/s; idle A-spot 8.2 px/10 s;
  20-sheep gather+drive progresses (GCM → 621 in 60 s).

## Gotchas
- The anchor ("most counter-flank-ward sheep") must ignore penned/`through`
  sheep or the dog runs to the pen.
- Facing fallback when `|vel| ≈ 0` (arrivals) — never let facing NaN.
- Keep `setCommand`'s orbit-angle seeding for compatibility until the old code
  is fully removed; delete dead code, don't strand it.
- A flank target beyond the field boundary must clamp to the play rect minus
  the dog's radius — he can't stand inside the fence.
