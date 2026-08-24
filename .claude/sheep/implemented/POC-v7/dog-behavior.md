# POC-v7 · Feature: Dog Commands & Influence v5 — the re-paced drive

**Owner's notes (2026-08-22):** "the walk on command should make the dog
move at the same speed as the sheep, while easy is 1/2 speed of sheep. both
of these commands extend the cone of intensity from the dog by an additional
50%."

Amends [POC-v6 dog-behavior.md](../POC-v6/dog-behavior.md) (E, I groups).

## Semantic rules

### E. Walk-on — the drive (amended)

- **E4 — pace (new).** A walk-on dog moves at **the sheep's own top speed**
  (`walkOnSpeedFrac` × `vMax` = 90 px/s), not `dogVMax`. He keeps up with
  a flock on the move; he does **not** out-run it. Come-by / away and the
  recall are unchanged at `dogVMax` (110).
- **E5 — reach (new).** While driving (walk-on **or** easy) the dog's **eye
  cone reaches 50 % further** (`R_flee × (1 + driveConeExt)` = 180 px
  dead ahead). The ambient floor — what a sheep beside or behind him feels
  — keeps `R_flee`. The debug eye draws the longer wedge while driving.

### I. Easy — the slow drive (amended)

- **I2 — amended.** Easy is **half the sheep's speed** (`easySpeedFrac` ×
  `vMax` = 45 px/s; was ⅓ of `dogVMax` = 36). The E1 gap governor scales by
  the easy : walk-on ratio (0.5) as before.

*(room to grow)*

## Tunables

- **New:** `walkOnSpeedFrac` (Dog, **1** × vMax, 0.5–1.6 · 0.05; Standoff
  `[1.15, 1, 0.85]`), `driveConeExt` (Flee / Eye, **0.5** × R_flee, 0–1.5 ·
  0.05; Presence `[0.25, 0.5, 0.8]`).
- **Changed:** `easySpeedFrac` **0.33 → 0.5**, unit `× dogVMax` → `× vMax`;
  Standoff row `[0.4, 0.33, 0.25]` → `[0.6, 0.5, 0.4]`.
- `dogVMax` (110) and guard G2 (`dogVMax ≥ 1.05 × vMax`) stand — they pace
  the flank and the recall only now.

## Acceptance log — 2026-08-22

Headless, anchor seed 1337, speed sampled while the dog is closing on his
target (> 45 px out); threat measured on a zero-boldness sheep with the dog
at full intensity, facing +x.

| # | rule | v7 | v6 | verdict |
|---|---|---|---|---|
| 1 | E4 walk-on speed | **90.0 px/s** (= vMax) | 110 | **PASS** |
| 2 | I2 easy speed | **45.0 px/s** (= ½ vMax) | 36.3 | **PASS** |
| 3 | flank speed unchanged | come-by **110.0** | 110 | **PASS** |
| 4 | E5 reach dead ahead | walk-on stress at 150 px **0.059**, 175 px 0.002, 185 px 0 (reach 180); come-by at 150 px **0** | 0 at 150 in every command | **PASS** |
| 5 | E5 off-axis unchanged | walk-on at 100 px, 90° off: **0.015** = v6; at 150 px 90°: 0 | 0.015 / 0 | **PASS** |
| 6 | cone profile | walk-on at 60 px ahead 0.693 (v6 0.500), 110 px 0.273 (0.020) — the stretched cone; at contact still ≤ 1 | — | noted (Q42) |

The E1 governor, E2 stall → easy and E3 impulse paths are untouched; the
flank → easy handoff ticks are identical to v6 (15.3 s / 11.7 s).
