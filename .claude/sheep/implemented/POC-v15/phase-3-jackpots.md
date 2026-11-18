# Phase 3 — jackpots

**▶ Invocation:** after phase 2. `web/lib/sheep-sim.js` and `web/sheep-defaults.json.js` only.

**Goal:** The four jackpots exist in the sim and each emits its own score event: SC21–SC24.

## Tasks

- **§0:** add `perfectFileMin`, `multOneGo`, `frenzyEvery`, `frenzySecs`, `frenzyExtend`, `frenzyMax`, `finisherPoints`.
- **§1:** per-chain record `{ n, rushed, points }` closed wherever the chain ends (lapse, strike, run end) with the perfect-file payout; `run.frenzyT` opened on each `frenzyEvery` step, doubling crossings and extending; the finisher award on the crossing that fills the pen; ONE GO added to `endMultipliers()` when the run had exactly one chain and it never lapsed; event kinds `file`, `frenzy`, `finisher`, `onego`; `score()` gains `frenzyT` and `jackpots`.

## Verify

Headless node script: scoring.md criteria 13–16, and criterion 1 again with every jackpot firing.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** A chain still live when the run ends must be closed before the end multipliers are computed, or its perfect-file payout is missed. The frenzy doubles a crossing's points, not the chain value, so it must not change the next crossing's multiplier.
