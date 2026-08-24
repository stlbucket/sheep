# Phone landscape: rotate overlay + ⛶ full-screen button

**Status:** implemented (owner Q64: button, not first-tap)

On phone-size screens the game is landscape-only: portrait shows a full-page
rotate prompt; landscape shows a ⛶ button that enters full-screen (and tries
to lock landscape).

## Goals

1. Phone-size + portrait → full-page overlay: animated tipping-phone icon +
   "rotate your phone" message; the game is not interactable beneath it.
2. Phone-size + landscape → ⛶ button overlaid top-right of the pasture;
   tap toggles document full-screen.
3. After entering full-screen, attempt `screen.orientation.lock('landscape')`
   (Android honors it); failures ignored.
4. Compact phone-landscape spacing: 6 px app padding, 264 px column.

## Non-goals

- No auto/first-tap full-screen (Q64) — browsers demand a user gesture anyway.
- No separate portrait layout; portrait is simply blocked.
- No PWA manifest / Add-to-Home-Screen flow this version.

## Design

- Phone-size is pure CSS media queries (no JS resize logic):
  `(pointer: coarse)` **and short viewport side ≤ 600 px**.
  - Portrait overlay: `(pointer: coarse) and (orientation: portrait) and (max-width: 600px)`.
  - Landscape compaction + button: `(pointer: coarse) and (max-height: 600px)`.
- The ⛶ button only renders when the fullscreen API exists: §3 adds
  `body.can-fullscreen` after feature-detecting `requestFullscreen` — iPhone
  Safari has no element-fullscreen API, so it never shows the button there
  (known platform limit, accepted; the 100dvh layout still fills the screen).
- Exit: same button while `document.fullscreenElement` is set.

## Constraints

- Invariant 2 (single file, `file://`), 3 (§1 untouched), 5 (runnable, no
  console errors — every fullscreen promise has a `.catch`).

## Acceptance criteria

1. Desktop (fine pointer): no overlay, no ⛶ button, at any window size.
2. Phone portrait (device or emulation): overlay covers the page, icon
   animates, message legible; rotating to landscape dismisses it (CSS).
3. Phone landscape: ⛶ visible (where the API exists); tap → full-screen;
   tap again → exits; pasture refits both ways.
4. iPhone Safari: no button, no errors — page still lays out edge to edge.

## Open questions (parked — default in bold)

- Phone breakpoint: **coarse pointer + short side ≤ 600 px** — bump to 700 px
  if a large phone slips through.
- iPhone true full-screen: **accept the no-button no-op**; a home-screen web
  app manifest could fake it in a later version.
