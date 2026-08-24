# POC-v8 — Spec Index

Eighth iteration of the sheep PoC. Started and **shipped 2026-08-23** from
one owner note (pasted with a `capture ⎘` snapshot, seed 235078): a flank
issued while the dog is **not close to the herd perimeter** starts at the
**first corner of the outline he would meet** in the flank direction, not
at the nearest bit of the line. Predecessor [POC-v7](../POC-v7/README.md)
shipped 2026-08-22.

Built straight from the note — no plan phases; one spec, one headless
acceptance pass on the owner's own capture plus the three regression seeds,
v7 build side by side. Snapshot
[`poc/params-2026-08-23-v8.json`](../../poc/params-2026-08-23-v8.json)
differs from v7's by **one new key** (`flankCornerFrom` 0). The owner's
`file://` eyeball is **pending** (as v4–v7 shipped).

**This is a behavior version.** It changes the *opening leg* of a flank only;
the sweep, the gate line and the C9 handoff are untouched (measured: every
regression seed converts at the same marker as v7, within 0.3 s). The
levers' 0.5 anchor stays exact (`anchor 95/95 · 95 levered + 42 not-levered
= 137 schema keys · OK`).

## Features

| Feature | Spec | Status |
|---|---|---|
| Dog Commands & Influence v6 — corner-first flank start (C10) | [dog-behavior.md](./dog-behavior.md) | **implemented** 2026-08-23 — acceptance measured PASS ([log](./dog-behavior.md#acceptance-log--2026-08-23)) |

## Locked decisions (this version)

From the owner's note (2026-08-23), taken as given:

- **When the dog starts NOT close to the herd perimeter, the first waypoint
  is the first corner he would encounter.** On the pasted capture (dog at
  heel, 1004,96; 18 markers): **come-by starts by going at marker 2**, away
  at the corner counter-clockwise of him (the owner wrote "21 or so" — the
  capture had 18 markers, so this is read as the last corner before #1,
  i.e. **#18**; see Q45).

## Q45–Q49 — asked and **answered by the owner, 2026-08-23**

Shipped first on bolded defaults, then walked with the owner the same day.
All kept **except Q46**, changed to *always corner-first*:

- **Q45 — kept.** "First corner he would encounter" = the first **corner** marker
  (never a side midpoint) whose bearing from the flock centre lies ahead of
  the dog's own bearing in the flank direction — come-by: the next corner
  clockwise; away: the next counter-clockwise. On the capture that is #2
  for come-by (as the owner said) and **#18** for away (the owner's "21 or
  so" does not exist on an 18-marker outline; #18 is the last corner before
  #1 and the one his CCW run meets first).
- **Q46 — overturned: always corner-first.** `flankCornerFrom` shipped at
  36 px; the owner chose **0** — **every** flank issued from outside the
  dotted line opens at the first corner; only a dog on or inside the line
  picks it up where he stands. The key stays as an escape hatch (raise it
  to restore the v7 cut-in for near starts) but is **not levered**
  (substrate) — the Sweep row `[80, 36, 16]` was dropped with it.
- **Q47 — kept.** The flank point **holds on that corner** (riding the perimeter as
  the flock moves) until the dog is within the existing 60 px on-station
  radius; only then does the sweep advance. Without the hold the point
  crept ~0.35 rad/s ahead while he ran, and on the capture he brushed sheep
  79 at **3 px** — with it, 39 px.
- **Q48 — kept.** The chord from the dog to the corner is taken as safe: he is
  outside the line, the corner is on it, and there is no corner between —
  so the straight run stays in the outer half-plane of the edge he is over.
  Measured opening-leg minimum dog–sheep distance 39–41 px on all four
  seeds. No visibility test is done.
- **Q49 — kept.** The corner is chosen once, at command time; if the outline
  reshapes before he arrives the point still rides the perimeter at that
  bearing, whether or not it is still a corner.

## Carried forward from POC-v7

- Owner `file://` eyeball of v6's Q32–Q37 and v7's Q39–Q44 — still pending,
  now alongside this version's C10 read (Q45–Q49 themselves are answered).
- The v7 difficulty finding (anchor seeds won 80/80 by a plain come-by →
  walk-on) is unchanged by this version.
