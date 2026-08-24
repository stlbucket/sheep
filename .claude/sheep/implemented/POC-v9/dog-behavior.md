# Dog Commands & Influence v7 — easy cone (E6) · lie-down cone (D3) · gate-attraction overlay (V1)

**Status:** implemented 2026-08-24 (owner note, built without gates; `file://`
eyeball pending). Extends [POC-v8 dog-behavior](../POC-v8/dog-behavior.md).

One owner note, three dog-side items: make the gate's draw area *visible* the
way the dog's presence is, and give **easy** and **lie-down** their own
intense-pressure cones — narrower and longer than the profiles they inherited.

## Goals

1. **V1** — the gate-attraction area (G2 `gate attraction radius`) is
   highlighted in a light-blue transparent overlay, like the dog presence
   wash.
2. **E6** — easy's intense-pressure cone: **30° full width**, reach
   **+30 % from normal** (R_flee × 1.3).
3. **D3** — lie-down's intense-pressure cone: **40° full width**, reach
   **+15 % from normal** (R_flee × 1.15).

## Non-goals

- Walk-on's eye (E5: coneK ≈ 90°, reach R_flee × (1 + `driveConeExt`)) —
  untouched.
- The ambient floor (R_flee, `ambient` 0.2) — untouched in every mode.
- Lie-down's ambient flanks and gate relief (D1) — deliberately preserved:
  the flanks keep `posture range` × R_flee (0.6) while only the beam extends.

## Design

**Cone width in degrees.** A new §1 helper `coneKFromDeg(deg)` converts a
cone's full width — measured at the **half-strength contour**, the contour
drawEye has always drawn — to the equivalent `cos^k` exponent
(k = ln ½ / ln cos(width/2); 30° → k ≈ 20.0, 40° → k ≈ 11.2). The falloff
stays soft (cos^k), matching the house force model; only the width is now
specified in degrees.

**flee() per command** (T = threat):

| command | cone width | cone reach | ambient part |
|---|---|---|---|
| walk-on | coneK (≈ 90°) | R_flee × (1 + `driveConeExt`) = 1.5 × | floor at R_flee |
| **easy** | **`easyConeDeg` 30°** | **R_flee × (1 + `easyConeExt` 0.3)** | floor at R_flee |
| **lie-down** | **`lieConeDeg` 40°** | **R_flee × (1 + `lieConeExt` 0.15)** | flanks at `postureRange` × R_flee (0.6), strength `ambient`·`lieDownIntensity` |
| heel / flank | coneK | R_flee | floor at R_flee |

Lie-down's profile becomes *flanks + beam* explicitly:
`T = gp·ambient·lieDownIntensity + gb·cos^k(lieConeDeg)·lieDownBlock`, where
`gp` fades at 0.6 R and `gb` at 1.15 R. `postureConeK` is **superseded** (the
beam width is degrees now) and left the Presence lever.

**drawEye** now renders per command: the wedge uses the command's width and
reach, and lie-down's ambient circle shrinks to `postureRange` × R_flee — the
viz *is* the sim contour in every mode.

**V1 — drawGateAttract** (§2, gated by new `debug.gateAttract`, default ON):
a light-blue (`rgba(110,180,255,…)`) filled disc of radius `gateAttractR` at
the gate mouth with a brighter inner disc at half the radius — exactly where
the G2 smoothstep saturates to full pull. Drawn under the sheep, next to the
fence/crush layer; the dashed G1/G2 debug rings (`debug.gateZone`) are
unchanged.

## Constraints

- §1 stays DOM-free (`coneKFromDeg` is pure math; the overlay is §2 only).
- All tunables in §0 with lil-gui bindings: `easyConeDeg`, `easyConeExt`,
  `lieConeDeg`, `lieConeExt` (Dog folder), `debug.gateAttract` (Debug).
- Page stays runnable from `file://`; no new files.

## Acceptance criteria

1. Easy's threat is felt on-axis at 1.25 R_flee and not at 1.35 R_flee.
2. Easy's threat at 15° off-axis is half the on-axis value; ~nothing at 30°.
3. Walk-on unchanged: reach 1.5 R_flee, half strength at 45°.
4. Lie-down's beam felt at 1.10 R_flee, not at 1.20; half strength at 20°
   off-axis; ~nothing at 40°.
5. Lie-down behind the dog: ambient flank felt inside 0.6 R_flee, zero beyond
   (gate relief preserved).
6. The gate shows a light-blue transparent disc of radius `gateAttractR`
   with a stronger core, under the sheep; toggling `gate attraction area`
   off removes it.
7. Boot clean: lever audit OK, no console errors.

## Acceptance log — 2026-08-24

Harness: whole script under the Proxy DOM/lil-gui stub (scratchpad
`harness.js`), levers 0.5, `randomSeedOnLoad` off; threat probed by placing
sheep 0 around a posed dog and calling `sim.flee()`.

| # | check | measured | verdict |
|---|---|---|---|
| 1 | easy reach | 1.25 R > 0 · 1.35 R = 0 | **PASS** |
| 2 | easy width | ratio 0.500 at 15° · 0.056 at 30° | **PASS** |
| 3 | walk-on regression | 1.45 R > 0 · 1.55 R = 0 · ratio 0.500 at 45° | **PASS** |
| 4 | lie-down beam | 1.10 R > 0 · 1.20 R = 0 · ratio 0.500 at 20° · 0.051 at 40° | **PASS** |
| 5 | lie-down flanks | felt at 0.3 R behind · zero at 0.7 R behind | **PASS** |
| 6 | V1 overlay | code-inspection + `file://` eyeball pending (render-only) | drawn under sheep, gated |
| 7 | boot | `anchor 94/94 exact · 94 levered + 60 not-levered = 154 schema keys · OK`, 0 errors | **PASS** |

Regression side-by-side vs the v8 build (scripted come-by → drive, 150 s):
seeds 1337/1403 identical; **seed 42 pens 0/80 (v8: 43/80)** because the run
auto-converts to easy and the narrow beam holds instead of pushing — the
intended E6 softening, flagged and then retuned the same day.

### Amendment — 2026-08-24 retune (owner Q56)

The owner chose "retune easy now" on the flag. Sweep (scratchpad
`tune-easy2.js`, seed 42, worked gate = E3 tap / 5 s): 30° + shove taps 9/80,
30° + bark 30, 30° + lean 23→53; **45° + shove taps 40/80 = the v8 rate**;
width or reach alone (45–60°, ext 0.5) 0; never-auto-easy 0; shoveMult
1.75–2.5 chaotic (0). **`easyConeDeg` default 30 → 45** (reach, taps, and
everything else unchanged); harness re-run green with param-derived contours
(half strength at 22.5°). Easy's role reads as *hold and steer*; the taps
push.
