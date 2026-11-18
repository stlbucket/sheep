# Phase 6 — HUD

**▶ Invocation:** after phase 5. `web/lib/sheep-score-ui.js` and small edits in the three pages. Owns Q103 and Q106.

**Goal:** During play the score is prominent in the upper left with the chain meter, strikes, flock value and objective list; pops are tiered; jackpots and strikes get banners; the new kinds are drawn (VH1–VH6, FO render).

## Tasks

- **lib:** replace the top-centre badge with the top-left HUD block; chain meter driven by `comboT / comboWindowNow`; strike marks; flock value with a falling state; objective list and start banner; pop classes per tier; a banner queue for `strike`, `file`, `frenzy`, `finisher`, `onego`, `gate`, `objective` events.
- **3D pages:** move `#cam-bar` below the HUD block; tint and scale for `black`, `bell` (with a bell), `yearling`.
- **2D page:** make room top-left; colour and size for the three new kinds.

## Verify

Headless Chrome on `file://`, all three pages: verdict-and-hud.md criteria 1–6 and 12, field-objectives.md criterion 9, zero console errors. Screenshot each page mid-run and read it.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** The closed-drawer pad owns the top-right corner on the 3D pages and the stress meter the bottom right; keep clear of both. The 3D render half is an inline module, so the lib stays a classic script loaded before it. In phone landscape the HUD must shrink, not wrap over the pad.
