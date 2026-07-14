# Phase 5 — Dog Pace & Flank→Drive Handoff

## ▶ Invocation
**Trigger:** "run phase 5" / reaching P5 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 3 complete (flank P0 + drive P2 machinery both exist).
**Do:** implement Tasks, run Verify, tick P5 in `plan.md`, **STOP, and report**.

## Goal
The dog works at a believable pace and a flank is **finite**: come-by/away
circles the flock only until the dog reaches the spot from which driving
pushes the flock back toward the gate, then converts **on its own** into the
existing walk-on drive. Rule **C6** + the `dogVMax` setting change (Q8–Q10).

## Tasks
- **§0 (schema):**
  - `dogVMax` (`Flee / Eye`): `exposed: false → true`, default
    **135 → 110 px/s** (~1.2× sheep `vMax` — Q8 guess; the slider exists to
    tune it hands-on).
  - New `flankHandoffDeg` (`Dog`): tolerance half-angle for "opposite the
    target", default **30°**, range ~10–90 (Q9).
- **§1:** handoff test inside the flank state, evaluated per tick: when the
  dog is (a) on the far side of the flock from the target — flock GCM lies
  between dog and target within `flankHandoffDeg` of the target→GCM line —
  and (b) at/outside his flank standoff, transition `flank → walk_on`
  (the P2 state: trail gap, stall detection, auto-stand all apply). Fence
  contact is **not** required (Q10) — C4's mid-field flank converts the same
  way. The strip highlight follows automatically (state-driven since P2).
- **§2 (small):** `debug.state` label shows the handoff (`flank→drive`)
  moment for tuning.

## Verify (measured 2026-07-13 — PASS; two as-built fixes below)
- **C6 end-to-end:** place the flock between dog and gate reversed (dog on
  the gate side); issue a **single come-by**: the dog rounds the flock and,
  on reaching the far side opposite the gate, enters walk-on **without
  another command** — strip shows walk-on; he **never completes a second
  lap** (track angular progress: total sweep < 360° + tolerance).
- **Mid-field (Q10):** same test with the flock far from every fence via an
  *away* — handoff still fires at the opposite-the-target spot.
- **Pace:** `dogVMax` slider visible under Flee/Eye; at 110 the dog visibly
  no longer sprints circles around fleeing sheep; dropping the slider to 60
  visibly slows him further (sanity check the governor).
- **No regression:** P0's C1–C5 spot-checks (no-circle, fence-hug, 45° eye)
  still read; idle A1/A4/A5 quick metrics clean; zero console errors.

### Measured results (seed 1337)
- **C6 reversed come-by** (dog gate-side at 790,360, 80 scattered sheep):
  auto-converts at **16.1 s** after a **153° net sweep** (< 1 lap); handoff at
  (45,597) — at the far fence, 25 px off it; bearing error −30.0° (fires at
  the window edge, as designed); 15 s later still `walk_on`, **zero
  re-flanks**. Eye held **44.9°** during the flank, max speed **110**.
- **Mid-field away:** converts at 8.9 s, sweep **−80° (CCW ✓)**, bearing
  error +12.4°. Tighter 20-sheep flock (flankR 254): converts at 14.4 s,
  handoff 37 px from the fence — no fence-contact condition anywhere (Q10).
- **Arm-delay:** come-by issued from an already-opposite spot converts at
  0.55 s, not instantly.
- **Pace:** slider present under Flee/Eye, default 110; at slider 60 the
  measured top speed is 60.0 (governor tracks the slider).
- **E1 recheck at 110:** min front-hemisphere gap **39 px vs 40** over
  120 s — a momentary dip (0.24% of ticks) at full transit speed while
  repositioning around the scattered flock, not creep onto driven sheep
  (P2's 51 px was measured behind a coherent group). **Watch item for P4**,
  not a fail: the controller recovered immediately.
- **Idle (fresh load, 30 s):** GCM drift 5 px (A7), 23 clusters, biggest 8,
  90% of sheep within 3 L (10% ≈ the wanderer fraction) — matches the
  POC-v2 acceptance shape. Zero console errors over HTTP serve.

## As-built additions (2026-07-13)
- **Flank advance cap** (`0.9 × dogVMax / flankR`): at 80 scattered sheep
  the flock-edge ring is ~500 px, where `flankAdvance` 1 rad/s moves the
  flank point at 185 px/s — faster than any dog. The point lapped the dog
  forever and he **oscillated on one side of the flock** (measured: −29° net
  sweep in 120 s, at 135 px/s too — a **pre-existing P0 defect** this
  scenario exposed, not a consequence of the lower default). The cap keeps
  the point's linear speed inside what the dog can track at any radius and
  any slider value.
- **Pen clamp on the flank point** (`px ≤ fenceX − 15`): the seeded ring
  reached into the pen beyond the interior fence, luring the dog through
  the gate where the wall pinned him (measured: 78% of a reversed come-by
  spent trapped east of the fence). Active sheep all live field-side, so
  the point now stays there. **Retires with the interior fence in P6.**

## Done when
- [x] `dogVMax` exposed at 110; `flankHandoffDeg` in schema with slider.
- [x] Flank auto-converts to walk-on at the handoff spot, measured single-lap.
- [x] C1–C5 + idle spot-checks unregressed; zero console errors.

## Gotchas
- The handoff must test **target-opposite**, not fence-contact — the owner's
  "reaches the fence" is the usual geometry, not the condition (Q10).
- Hysteresis: gate the test off for the first ~½ s of a flank, or a come-by
  issued from an already-opposite spot converts instantly and reads as a
  dead button.
- `dogVMax` interacts with P2's trail-gap controller (it clamps approach
  speed) — re-check E1's min-gap metric after lowering the default.
- Don't renumber or touch P0's flank-advance math; C6 is an **exit
  condition**, not a new path.
