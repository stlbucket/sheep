# Phase 4 — phone landscape

**▶ Invocation:** after phase 3. §2 markup/CSS + §3 wiring; feature-detect —
zero console errors on every platform.

**Goal:** phone-size portrait is blocked by a rotate prompt; phone-size
landscape offers a ⛶ full-screen button (Q64) and compacts spacing.

## Tasks

- **§2 markup:** `#rotate-overlay` (animated 📱 icon + message) first in body;
  `#fullscreen-btn` inside `#wrap`.
- **§2 CSS:** overlay fixed/z-3000, icon `rotate(0→90deg)` alternate loop;
  button absolute top-right of the pasture, hidden by default; media queries —
  portrait overlay at `(pointer: coarse) and (orientation: portrait) and
  (max-width: 600px)`; button + 264 px column + 6 px padding at
  `(pointer: coarse) and (max-height: 600px)` gated on `body.can-fullscreen`.
- **§3 JS:** if `documentElement.requestFullscreen` exists add
  `body.can-fullscreen` + click toggle (enter → try
  `screen.orientation.lock('landscape')`, all promises `.catch`ed).

## Verify

Desktop: no overlay/button at any size. Emulated phone portrait: overlay +
animation; landscape: overlay gone, ⛶ shows, toggles full-screen, pasture
refits (resize event). iPhone Safari: no button, no errors.

## Done when

- [x] Overlay + button behave per spec on desktop/Android/iPhone profiles.

**Gotchas:** fullscreen needs a user gesture — never call it from load/resize.
`orientation.lock` rejects on desktop browsers → always `.catch`. Use `100dvh`
(with `100vh` fallback) so phone browser chrome doesn't hide the pad.
