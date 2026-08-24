# Side-column layout (napkin) + scale-to-fit pasture

**Status:** implemented (owner napkin 2026-08-24; Q61–Q63 locked)

One flex row replaces the old three-lane page (fixed lil-gui columns left/right
+ centered stage): the pasture fills the left, and a single scrollable 320 px
column on the right stacks three boxes per the napkin — dog controls, debug
controls, levers section.

## Goals

1. Page layout matches `docs/napkins/layout.drawio`.
2. Top-right box = the 3×3 command pad + That'll Do (Q61).
3. Middle box = the entire old header grouping incl. HUD stats (Q62), re-laid
   vertically for a narrow box (HUD reflowed to 4 short lines, same facts).
4. Bottom box = Levers panel + Advanced disclosure + the three raw-param
   panels (Sheep, Dog, Course & Meta), lil-gui roots stretched to column width.
5. Pasture contain-fits the remaining space (Q63) and re-fits on window resize
   and on `canvasW/H` slider changes.

## Non-goals

- No §1 SIM changes, no new §0 params (pure §2/§3/§4 [throwaway] UI work).
- No theming/skin changes; existing colors and controls stay.

## Design

```
<body>
  #rotate-overlay                      (phone-landscape.md)
  #app (flex row, 100dvh)
    #stage (flex:1, centers)
      #wrap (relative)
        canvas#field  ·  #fullscreen-btn  ·  #card (now centers over pasture)
    #side (320px, scrolls)
      section#side-dog     → #controls (pad + That'll Do, grid columns 1fr)
      section#side-debug   → seed row · button row · layout row · #hud
      section#side-levers  → #panel-levers · #panel-sheep · #panel-dog · #panel-meta
```

- `fitCanvas()` (§2): `scale = min(stage.clientWidth/canvas.width,
  stage.clientHeight/canvas.height)`; sets CSS width/height only.
  `resizeCanvas()` calls it; `window.resize` listener added (there was none).
- Removed: panel-lane CSS + `--canvas-w` tracking, `#header` strip + its CSS,
  the narrow-viewport `panels-hidden` auto-hide in §4 (moot with scaling).
- `body.panels-hidden` now hides **#side-levers only** — phones have no H key
  to bring back a fully hidden column, and the pad must stay reachable.
- `body.advanced-closed` hides the three raw panels individually
  (`#panel-sheep/-dog/-meta`) — the old `#panel-dog-col` wrapper is gone.

## Constraints

- Invariant 2 (one file + defaults file, `file://`), 3 (§1 DOM-free — untouched),
  4 (no new tunables introduced), 5 (page runnable, zero console errors).

## Acceptance criteria

1. Open from `file://`: pasture left, one right column with three boxes in
   napkin order; no fixed panels overlapping the canvas; zero console errors.
2. Pad commands + That'll Do work from the top box; active-command highlight
   and keyboard equivalents unchanged.
3. Seed edit, Reseed, panels (H), capture ⎘, pause (P), Reset (R), layout
   readout and live HUD all function from the debug box; no header above the
   pasture.
4. Levers slide, Advanced opens → Sheep/Dog/Course & Meta appear stacked
   below, column scrolls; panels stretch to column width.
5. Resize the window → pasture rescales, aspect 1120:720 preserved, no
   distortion; `canvasW/H` sliders still respawn + refit.
6. H hides only the levers section; pad + debug box remain.
7. Post-run score card centers over the pasture.

## Open questions (parked — default in bold)

- H-toggle scope: **levers section only** (vs whole column) — revisit if the
  owner wants a "pasture only" view.
- Upscale cap: **none** (contain-fit may scale past 1× on wide screens; mild
  blur accepted) — cap at 1× if it reads fuzzy.
- Column width: **320 px desktop / 264 px phone landscape**.
