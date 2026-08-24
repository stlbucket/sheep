# POC-v11 — napkin layout + phone landscape

Source: owner napkin [docs/napkins/layout.drawio](../../../../docs/napkins/layout.drawio)
— pasture left; ONE right column, stacked: **dog controls** → **debug controls**
(the old top grouping relocated) → **levers section**. Plus phone-size behavior:
portrait blocks with a rotate prompt, landscape offers full-screen.

## Features

| Feature | Spec | Status |
|---|---|---|
| Side-column layout (napkin) + scale-to-fit pasture | [side-column-layout.md](side-column-layout.md) | implemented |
| Phone landscape: rotate overlay + ⛶ full-screen button | [phone-landscape.md](phone-landscape.md) | implemented |

## Locked decisions (this version)

- **Q61** — dog-controls box holds the 3×3 command pad + That'll Do only; the
  Dog raw-param panel stays under the Advanced disclosure in the levers section.
- **Q62** — the WHOLE top grouping moves into the debug box: seed row, Reseed,
  panels, capture, pause, Reset, layout readout **and the HUD stats**. No strip
  above the pasture remains.
- **Q63** — the pasture contain-fits the space left of the column (CSS scale
  only; internal sim resolution `params.canvasW/H` untouched).
- **Q64** — full-screen is an explicit ⛶ button, NOT a first-tap hijack.

## Still open

Parked in the specs, each with a bolded default (H-toggle scope, phone
breakpoint, upscale cap, column width).

Plan: [plan.md](plan.md)

## Touch-ups (owner, 2026-08-24, post-implementation)

1. Right-column order is now **debug controls → dog controls → levers** (debug
   box on top; supersedes the napkin's dog-first order).
2. Phone landscape: the sidebar shows the **command pad ONLY** (`#side-debug`
   and `#side-levers` hidden by the phone media query).
3. Phone pad shrunk to fit the 240 px sidebar completely: 26 px rows, 11 px
   labels, kbd hints hidden (no keyboard on a phone).
4. Phone sidebar vertically centered (`justify-content: center` on `#side`).
5. Two-word button labels break onto two lines on phone (`.w2` span on the
   second word — inline on desktop, block on phone).
6. All phone buttons share the resulting 2-line size (36 px rows; That'll Do
   width matches one pad cell).
7. Reseed ↻ / pause / capture ⎘ moved into a small `.aux` row below the pad
   (both layouts — so the phone pad-only sidebar keeps them); debug box retains
   seed input, panels and Reset.
8. ⛶ full-screen moved off the pasture into its own little sidebar section
   (`#side-fullscreen`) above the button grid — still phone-only + API-gated.
9. ⛶ label tracks state via `fullscreenchange` — "⛶ full-screen" ↔
   "⛶ exit full-screen" (covers Esc / system exits too).
