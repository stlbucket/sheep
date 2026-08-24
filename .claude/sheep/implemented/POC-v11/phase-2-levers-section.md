# Phase 2 — levers section

**▶ Invocation:** after phase 1. §2 markup/CSS only — the lil-gui construction
code (§3/§4) must not change except comments.

**Goal:** napkin box 3: `section#side-levers` stacks `#panel-levers` (Levers +
Advanced roots), `#panel-sheep`, `#panel-dog`, `#panel-meta`; the column
scrolls; fixed lanes are gone.

## Tasks

- **§2 markup:** delete `#panel-left-col` / `#panel-dog-col` wrappers; the four
  panel divs move into `#side-levers` in that order.
- **§2 CSS:** delete both fixed-column blocks + panel-lane `--canvas-w` rules;
  `#side-levers` transparent (lil-gui brings its own chrome), roots stretched
  (`width/--width: 100%`); `body.advanced-closed` now hides
  `#panel-sheep/-dog/-meta`; `body.panels-hidden` hides `#side-levers` only.
- **§4:** remove the narrow-viewport `panels-hidden` auto-hide (moot).

## Verify

Levers drag and update raw params; Advanced open → three panels appear below,
column scrolls; H toggles just the levers section; Tools folder (Course & Meta)
still reachable.

## Done when

- [x] All panels in-column, Advanced + H behave, zero console errors.

**Gotchas:** `advancedGui.onOpenClose` toggles `body.advanced-closed` — only
the CSS selector list changes, not the JS. lil-gui root width is
`var(--width)`; set both `width` and `--width`.
