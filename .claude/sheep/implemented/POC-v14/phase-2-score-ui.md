# Phase 2 — score UI

**▶ Invocation:** after phase 1. New `web/lib/sheep-score-ui.js`; small edits in the three pages and `web/lib/assault-sim.js`.

**Goal:** One shared HUD line, pop layer and count-up tally card (SC7, SC8), and wolf points (SC11).

## Tasks

- **lib:** `ScoreUI.init({ stage, project, onAgain })`, `ScoreUI.frame(sim, dt)`, `ScoreUI.hud(sim)`, `ScoreUI.hide()`; pops are DOM labels placed by the page's `project(x, y)`; the card counts up line by line and a click or key skips it; styles injected by the lib.
- **pages:** load the lib, delete the old `showCard`, call the lib from the frame loop, print its HUD line.
- **assault:** `sim.award('wolf', wolfPoints, …)` when a wolf is killed; `s.lost = true` on a mortar kill; card title handles survivors.

## Verify

Headless Chrome on `file://`: all three pages load with zero console errors; forcing sheep through the gate shows pops and a HUD score; finishing shows the card whose final total equals `sim.score().total`; a click skips the count-up.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** The 3D pages' render half is an inline module — the lib must be a classic script loaded before it. `2d.html` ignores `?seed=`.
