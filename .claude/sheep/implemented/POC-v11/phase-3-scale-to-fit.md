# Phase 3 — scale-to-fit pasture

**▶ Invocation:** after phase 2. §2 JS + a resize listener; sim resolution
stays `params.canvasW/H`.

**Goal:** the pasture contain-fits `#stage` (Q63) — CSS scale only, re-fit on
window resize and on `canvasW/H` changes.

## Tasks

- **§2 JS:** `fitCanvas()` — `scale = min(stageW/canvasW, stageH/canvasH)`
  (uncapped, parked default), sets `canvas.style.width/height`;
  `resizeCanvas()` calls it (replacing header-width tracking);
  `window.addEventListener('resize', fitCanvas)`.

## Verify

Resize the window: pasture grows/shrinks, 1120:720 aspect exact (no
distortion); `canvasW/H` sliders respawn + refit; H (hiding levers) doesn't
change the fit (column width is constant).

## Done when

- [x] Contain-fit live on resize + slider changes, zero console errors.

**Gotchas:** scale CSS size only — writing `canvas.width` clears the frame and
belongs to `resizeCanvas`. `#stage` needs `min-width: 0` in the flex row or it
won't shrink.
