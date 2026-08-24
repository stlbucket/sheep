# POC-v8 · Feature: Dog Commands & Influence v6 — the corner-first flank start

**Owner's note (2026-08-23, with a `capture ⎘` snapshot of seed 235078, dog
at heel at 1004,96):** "when the dog starts NOT close to the herd perimeter,
the first waypoint should be the first corner it would encounter. so in this
case, come by should start by going at point 2; away should start by going
at point 21 or so."

Amends [POC-v7 dog-behavior.md](../POC-v7/dog-behavior.md) and the C group
of [POC-v6 dog-behavior.md](../POC-v6/dog-behavior.md).

## Semantic rules

### C. Flanking commands — come-by / away (continued)

- **C10 — the opening leg (new).** A flank issued while the dog is
  **outside the herd perimeter line** (owner Q46: `flankCornerFrom` = 0 —
  *every* start from outside the dotted line; raise the key to exempt near
  starts) does **NOT** start by cutting in to the nearest
  point of the line. His **first waypoint is the first corner of the
  outline he would meet** going round in the flank direction — come-by:
  the next corner **clockwise** of where he stands; away: the next
  **counter-clockwise** — and he runs **straight to it**. Only on reaching
  it does the C8 sweep begin. A dog already on or near the line (or among
  the sheep) picks the line up where he stands, as before. Side midpoints
  are not corners. *(Owner, 2026-08-23.)*

*(room to grow)*

## Design notes

- The perimeter's numbered points (corner apexes + side midpoints,
  clockwise) moved from §2 into **§1 `FlockSim.perimeterMarkers(offset)`**
  so the sim can steer by them; §2's outline drawing and the capture
  snapshot read the same list, so the number the owner quotes is the point
  the dog aims at. `firstCornerBearing(sign, from, offset)` picks the
  corner.
- `setCommand` seeds `flankAngle` at that corner's bearing and sets
  `dog.flankWaypoint`; `stepDog` holds the point (advance 0) until the dog
  is within the existing 60 px on-station radius, then clears it. The C8
  arm/park logic is untouched — a corner-first start that happens to land
  past the gate line is simply not armed and runs the whole perimeter, as
  any gate-side start does since v6.
- `captureState().dog.flank.cornerFirst` reports whether he is still on
  the opening leg.

## Tunables

- **New:** `flankCornerFrom` (Dog, **0** px, 0–300 · 4; not levered —
  substrate). 0 (shipped, owner Q46) = every flank from outside the line
  starts corner-first; raise it to exempt near starts (300 ≈ the v7
  start). First shipped at 36 with a Sweep home `[80, 36, 16]`, both
  overturned the same day.
- Unchanged: `perimeterMargin` 36, `flankAdvance` 1, `flankHandoffDeg` 30,
  `flankOvershootDeg` 0.

## Acceptance criteria (measured headless per the no-webserver rule)

1. **C10 on the owner's capture** (seed 235078, `random` layout → whole
   pasture, 80 sheep, heel, t = 16.9 s — reproduces the pasted snapshot
   exactly, 18 markers): come-by's first target is marker **2** (≤ 5 px);
   away's is marker **18** (≤ 10 px); the dog reaches that marker before
   any other corner.
2. **The hold:** the opening leg never brings the dog closer than the
   perimeter margin (36 px) to a sheep.
3. **Nothing else moved:** on seeds 1337, 42, 1403 (from heel, 1 s) both
   flanks still convert to easy at the same marker as the v7 build, within
   1 s.
4. Boot: `[levers] … 137 schema keys · OK`, no console errors.

## Acceptance log — 2026-08-23

Harness: whole script under the Proxy DOM/lil-gui stub (scratchpad
`harness.js`), levers 0.5, `randomSeedOnLoad` off; v7 = the poc mirror
before copying. "Visited" = the dog within 45 px of a marker.

| # | check | v8 | v7 | verdict |
|---|---|---|---|---|
| 1a | 235078 come-by first target | **1049,327 = #2 @ 0 px**; visits #2 at 1.7 s, then #4…#14; → easy at **#14** 17.7 s | first target 825,159 (#18 @ 77 px — the line at his own bearing); visits #1, #2, … → easy at #14 18.8 s | **PASS** |
| 1b | 235078 away first target | **761,111 = #18 @ 6 px**; visits #18 at 1.8 s, #17…#2; → easy at **#2** 22.1 s | 822,157 (#18 @ 74 px); → easy at #2 22.2 s | **PASS** |
| 2 | min dog–sheep, opening leg | **39 px** (come-by) / **48 px** (away) | 41 / 48 | **PASS** (without the hold: 3 px) |
| 3 | 1337 cb / aw | first #2 @ 13 px / #22 @ 8 px; → easy at #22 24.1 s / #3 20.8 s | → #22 24.4 s / #3 21.4 s | **PASS** |
| 3 | 42 cb / aw | first #1 @ 0 / #23 (fence-pulled); → easy at #24 19.5 s / #3 17.8 s | → #24 19.7 s / #3 18.7 s | **PASS** |
| 3 | 1403 cb / aw | dog 42 px outside the line → corner-first; first #1 @ 3 / #25 @ 2; → easy at #25 16.7 s / #3 19.6 s | → #25 17.1 s / #3 19.9 s | **PASS** |
| 4 | boot | `anchor 96/96 exact · 96 levered + 41 not-levered = 137 schema keys · OK`, 0 errors | 95/95 · 136 | **PASS** |

Addendum after the owner's Q46 answer (`flankCornerFrom` 36 → 0), same
harness: all seven rows above are **unchanged** (every heel start was
already past 36 px), boot `anchor 95/95 · 95 levered + 42 not-levered =
137 schema keys · OK`; a mid-run reversal (235078: come-by → easy 3 s →
away) starts with the dog ON/INSIDE the line (distToHull 0), correctly
skips the corner opening, and completes at ≥ 36 px from every sheep.

Note on 1403 away: the dog stands on corner #1's bearing, so the first
corner *counter-clockwise* is #25 at the far end of one long straight side
— he runs that side as a chord (which on a straight side *is* the line).
The 8–10 px dog–sheep minimum on 1403 happens later in the sweep and is
identical in v7 (bolters into the dog), not an opening-leg effect.
