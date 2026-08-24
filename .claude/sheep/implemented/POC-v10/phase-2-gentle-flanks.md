# Phase 2 — gentle flanks (C11)

**▶ Invocation:** `/sheep implement POC-v10 phase 2` · prerequisite: phase 1 ·
do only this phase; §1 stays DOM-free.

**Goal:** Come Easy / Away Easy buttons (+ ⇧←/⇧→) flank exactly like
come-by/away at `flankEasySpeedFrac` × `dogVMax`
([command-variants.md](./command-variants.md) C11, criteria 2 & 6–8).

## Tasks

- **§0:** `flankEasySpeedFrac` (Dog, 0.5, 0.1–1, ×dogVMax) + parked in
  `LEVER_NOT_LEVERED`.
- **§1:** dog state `flankEasy`; `setCommand` reads `opts.easy` on flanks and
  clears it elsewhere; flank case computes `flankV` and scales the advance
  cap; arrive-seek `vmax` uses `flankV` for a gentle flank; C9 handoff clears
  `flankEasy`.
- **(HTML):** Come Easy / Away Easy buttons in the mid row.
- **§3:** `VARIANTS` table (`come_by_easy` → `['come_by', {easy:true}]`, …);
  `displayCommand`/`updateStrip` show the variant; ⇧←/⇧→ chords.

## Verify

Harness: issue `come_by {easy:true}` vs plain `come_by` on the same seed;
measured top speed over the sweep ≈ 0.5 × vs ≈ 1 × `dogVMax`; the gentle flank
still parks and hands off to easy with `flankEasy` cleared.

**Done when:** [ ] half-speed measured · [ ] handoff to easy intact ·
[ ] strip lights Come Easy → Easy · [ ] boot clean.

**Gotchas:** scale `advCap` too or the flank point laps the slowed dog and he
oscillates (the P5 lesson); don't touch the E3 early-return path in
setCommand (it must not clear state — the dog is staying in easy).
