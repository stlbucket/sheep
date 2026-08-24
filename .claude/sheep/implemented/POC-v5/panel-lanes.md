# Panel lanes — keep the fixed lil-gui columns off the pasture

**Status:** implemented 2026-08-21; moved here from `spec/` 2026-08-23 — owner-directed, outside the
[POC-v5 plan](./plan.md); resolves **Q-D** of
[`pasture-header.md`](./pasture-header.md). UI/layout only; no §0 `SETTINGS`,
no §1 SIM. Q-F–Q-I taken on their bolded defaults; Q-G resolved by the
symmetric-lane rule. Verified headless (boot clean, `H` toggle, `--canvas-w`
tracking, lane arithmetic for every acceptance viewport); the on-screen
positions (criteria 1–7) are the owner's `getBoundingClientRect()` /
eyeball from `file://`.

## The problem

The two lil-gui columns are `position: fixed` at the viewport corners
(`#panel-left-col` top-left: Levers + Advanced disclosure, ~245 px wide and
~500 px tall with the three domain folders open; `#panel-dog-col` top-right:
Dog + Course & Meta, shown only while Advanced is open). The page stack
(header → pasture → command pad) is centered on the **full** viewport width,
ignoring those columns. So whenever the viewport is narrower than
`canvasW + 2 × 245 + gutters ≈ 1640 px` the Levers panel lies **over the
pasture's left ~60–250 px** — over the fence, the gate when it draws on the
west side, and any sheep there. Lowering the pasture below the panel is the
"halfway down the screen" the owner ruled out in `pasture-header.md`.

## Goals

1. The Levers column never covers the pasture: the stage (header + canvas +
   pad) sits **right of a reserved lane** whenever centering would collide.
2. On wide viewports (≥ ~1640 px) nothing changes — the stage stays
   centered exactly where it is today.
3. With **Advanced open**, the right column gets the same treatment
   (symmetric lanes) while the viewport has room for both.
4. A one-key **hide panels** toggle for play, so a narrow laptop can still
   have a centered pasture when no tuning is happening.
5. `canvasW` (Course & Meta → Stage / Pasture · Scale lever) keeps working:
   the lane rule tracks the live canvas width, not 1120.

## Non-goals

- Resizing or scaling the canvas to fit — `canvasW`/`canvasH` are tunables
  with §1 consequences (`playRect`), not layout knobs.
- Making the lil-gui columns scroll with the page or docking them into the
  flow — they stay `fixed` so a tall panel never pushes the pad off-screen.
- Any change to the panel contents or the Advanced split (POC-v3 Q1,
  lever-model Q16).
- Viewports narrower than `canvasW + lane` (≈ 1400 px at 1120): the page
  scrolls horizontally rather than covering the pasture. See Q-F.

## Options considered

| Option | Effect | Verdict |
|---|---|---|
| **A — reserve a lane** (stage left edge = `max(lane, centered)`) | Deterministic, no toggles, wide screens unchanged, narrow screens shift right; sub-1400 px scrolls | **default** |
| B — collapse Levers by default | Only the 24 px title bar overlaps; but Levers is the v5 primary surface and the owner opens it every session | fallback if A feels too jumpy |
| C — dock columns into a 3-column page grid | Cleanest geometry, but the tall column then scrolls with the page and the pad can drop below the fold | rejected (control-layout acceptance 1) |
| D — hide-panels toggle only | Fixes play, not tuning — during tuning the overlap is exactly when you need to see the fence | include **with** A, not instead |

## Design (A + D)

### Stage wrapper

`#header`, `#wrap` and `#controls` move inside one `<div id="stage">` (flex
column, `align-items: center`, `gap: 12px` — the body's current gap moves
here). `body` becomes `align-items: flex-start`; the stage positions itself.

### Lane rule

```
lane       = 245 px (lil-gui root width) + 16 px gutter = 261 px
lane-l = lane-r = panels hidden ? 0 : lane      // symmetric, Advanced or not (Q-G)

stage.left = lane-l + max(0, (100vw − lane-l − lane-r − canvasW) / 2)
```

Symmetric lanes mean the band's center **is** the viewport center, so wide
screens are pixel-identical to today and nothing jumps when Advanced opens;
on narrow screens the `max(0, …)` clamps the stage to the left lane's edge
and the page scrolls horizontally if the canvas is wider than the band.

In CSS: `resizeCanvas()` (§2) writes `--canvas-w` on `#stage`; the
`panels-hidden` body class zeroes `--lane-l`/`--lane-r`; the margin is one
`calc(lane − 16px + max(0px, …))` expression over `100vw` (the 16 px is the
body's left padding). No JS layout code beyond writing the variable.

### Hide panels (D)

- Hotkey **`H`** (free — Q/E/W/S/A/D/F/R are taken) and a small `panels`
  button in the header's seed group toggle `body.panels-hidden`, which
  `display: none`s both columns and zeroes both lanes, so the stage
  re-centers on the full viewport.
- Not persisted (no `SETTINGS` entry, not exported) — a view state, like the
  Advanced disclosure.
- The hotkey obeys the existing "ignore keydowns targeted at inputs" guard.

### What does not move

The columns themselves: still `fixed`, still at `top: 0`, still
`max-height: 100vh; overflow-y: auto`.

## Constraints

- **Invariant 3** — nothing here touches §1; the only JS is one CSS-variable
  write in `resizeCanvas()` and one class toggle in §3.
- **Invariant 4** — no new tunables; `lane` is a CSS constant, not a param.
- **Invariant 5** — page runnable, zero console errors.
- `control-layout.md` acceptance 1 (pad visible without vertical scroll) and
  `pasture-header.md` acceptance 2 (canvas top ≤ 110 px) keep holding — this
  change moves things horizontally only.

## Acceptance criteria (measure with `getBoundingClientRect()` in the console)

1. At a viewport ≥ 1642 px wide, Advanced closed: `field.left` equals
   `(innerWidth − 1120) / 2` ± 1 px — unchanged from today.
2. At 1440 px wide, Advanced closed: `field.left ≥ 261` and the Levers
   panel's right edge (`#panel-left-col` rect) is left of `field.left`.
3. At 1440 px wide, Advanced open: `field.left ≥ 261` still; the right
   column overlaps the canvas's right edge (room for only one lane) — this is
   the documented degradation, not a failure.
4. At ≥ 1700 px wide, Advanced open: the canvas is centered in the band
   between the two columns and neither column touches it.
5. `H` hides both columns and the canvas re-centers on the full viewport;
   `H` again restores them and the lane rule re-applies. The header's
   `panels` button does the same.
6. Header, canvas and command pad move together (all inside `#stage`).
7. Changing `canvas width` to 1500 at 1440 px wide: `field.left` stays ≥ 261
   and the page gains a horizontal scrollbar instead of the panel covering
   the pasture.
8. Loading at a 1280 px-wide window: both columns start hidden and the
   canvas is centered (`field.left` = 80); `H` shows them and `field.left`
   becomes 261.

## Open questions (parked — default in bold)

- ~~**Q-F — what is the narrowest viewport to support cleanly?**~~
  **Resolved 2026-08-21 (owner)** → the alternative: **auto-hide on narrow
  load** — at boot, if `innerWidth < canvasW + lane` (≈ 1381 px at 1120) the
  page opens with `panels-hidden` set, so a narrow laptop starts centered;
  `H` brings the panels back (and the lane rule re-applies). Wider than
  that, the lane rule alone keeps the pasture clear. Below ~1120 px the page
  scrolls horizontally regardless.
- ~~**Q-G — centered-in-band vs. hard-left when the viewport has room for
  the lanes but Advanced is closed?**~~ **Resolved 2026-08-21** → moot:
  both lanes are reserved whenever panels are visible, so the band center
  equals the true center and Advanced opening moves nothing.
- **Q-H — `H` as the hotkey?** `H` for *hide* is free. **Default: `H`**;
  alternatives `` ` `` or `Tab` (Tab fights focus navigation).
- **Q-I — should `panels-hidden` persist across reloads?** **Default: no** —
  view state only, like Advanced; the defaults file stays pure params +
  lever positions (POC-v5 Q17).
