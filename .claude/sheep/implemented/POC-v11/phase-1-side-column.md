# Phase 1 — side column: dog + debug boxes

**▶ Invocation:** first phase; no prerequisite. Touch only §2 markup/CSS and
the §2 header/HUD JS. Keep every id (`seed-input`, `reseed-btn`, `panels-btn`,
`capture-btn`, `pause-btn`, `[data-action=reset]`, `layout-out`, `hud`,
`[data-cmd]`) — §3 wiring must keep working untouched.

**Goal:** the napkin's right column exists: `#app` flex row → `#stage` (pasture)
left, `#side` right with `#side-dog` (3×3 pad + That'll Do) on top and
`#side-debug` (seed row · buttons · layout · HUD) beneath.

## Tasks

- **§2 markup:** wrap page in `#app`; move `#controls` into `section#side-dog`;
  rebuild the header content as `section#side-debug` (seed row / button row /
  layout row / `#hud`); delete `#header`; move `#card` inside `#wrap`.
- **§2 CSS:** `#app` flex row (100dvh, 10 px padding); `#side` 320 px scroll
  column; section chrome (old header background); pad grid → `repeat(3, 1fr)`
  ×32 px, 12 px buttons; `#side-debug` vertical rows; `#hud` left-aligned.
- **§2 JS:** drop `header` element + width tracking; reflow `hud.textContent`
  to 4 short lines (same facts).

## Verify

Open from `file://`: pad on top-right issues commands (highlight follows);
seed/Reseed/capture/pause/Reset/layout/HUD all live in the middle box; nothing
above the pasture; zero console errors.

## Done when

- [x] Napkin boxes 1–2 in place, all controls functional, page runnable.

**Gotchas:** `#card` centers via nearest positioned ancestor — keep it inside
`#wrap` (which is `position: relative`). `hud` refresh runs every frame; keep
the seed-input focus guard.
