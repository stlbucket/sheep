# Phase 7 — card and records

**▶ Invocation:** after phase 6. `web/lib/sheep-score-ui.js` and `web/sheep-defaults.json.js`. Owns Q107–Q109.

**Goal:** The end card gives the verdict, and runs are remembered: VH7–VH9 (card half), RC1–RC4.

## Tasks

- **§0:** add `historyMax`, `bandSmallMax`, `bandMediumMax`.
- **lib (card):** headline rank or BUST, percent, points to the next rank, four category grades, play points then each end multiplier as its own counted line, time bonus, total; `history` and `collection` buttons; first-time flags.
- **lib (records):** guarded storage helpers; run record written once per run; band bests by percent per mode; collection counts; the two overlay panels; tuned runs marked and excluded from bests and collection.

## Verify

Headless Chrome on `file://`, all three pages: verdict-and-hud.md criteria 9 and 11, records.md criteria 1–9, zero console errors.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** The v14 per-course best and daily best must keep working untouched. Write the run record when the card first shows, not on every skip or replay. Test the storage-failure path by making `localStorage.setItem` throw before the lib loads.
