# Phase 6 — wave mode

**▶ Invocation:** after phase 5. `web/lib/sheep-sim.js`, the UI lib, one button per page.

**Goal:** Endless wave mode on a countdown clock (RM5, RM6).

## Tasks

- **§0:** `waveClock`, `waveSecsPerSheep`, `waveClockMax`, `waveGrowth`, `waveSheepMax`.
- **§1:** `run.clock`; time per crossing; `nextWave()` keeps points, gate and fence, re-lays obstacles and flock from a per-wave stream, re-rolls specials, places no drive gates; run ends at zero.
- **lib / pages:** `waves` button, clock in the HUD, waves cleared on the card; 3D course rebuild on `sim.courseRev`.

## Verify

Headless node: clock counts down, +3 s per crossing, capped; full pen spawns `waveGrowth` more sheep with the score kept and the gate unmoved; no drive gates; run ends at zero; same seed gives the same flocks wave for wave. Headless Chrome: the three pages run a wave change with zero errors.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** The assault keeps its wolves across waves because `sim.run` is the same object.
