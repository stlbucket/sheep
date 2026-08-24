# Control layout + pasture placement + flock outline

**Status:** implemented 2026-08-21; moved here from `spec/` 2026-08-23 (owner-directed, outside the POC-v5 plan —
a UI/render change only; no §1 SIM behavior touched).

Source diagram: [`control-layout.drawio`](./control-layout.drawio) — six
ellipses, no connectors. Read as a D-pad: the vertical axis is drive speed
(Walk On → Easy → Lie Down), the horizontal axis is flank direction
(Come By ↔ Away), and That'll Do sits apart at the lower right.

## What changed (all [throwaway] sections)

| Where | Change |
|---|---|
| CSS `body` | `justify-content: center` → `flex-start`; pasture now sits near the top of the page, leaving room for the command pad below it. |
| CSS/HTML `#controls` | Buttons laid out on a CSS grid matching the diagram (`grid-template-areas`). Finish / Reset are a separate stacked group right of a divider. Hotkeys unchanged (Q/E/W/S/A/D, F/R). |
| §0 `debug.flockOutline` | boolean, default **true** — toggles the outline. Not exported. |
| §0 ~~`debug.outlineLengths`~~ → `perimeterMargin` | ~~float 1–6, default **3** (unit: sheep-lengths) — outline offset from the outermost sheep. Not exported.~~ **Promoted 2026-08-22 (POC-v6 touch-up 3)** to a Dog sim param, **36 px** (12–96), exported, Standoff-levered — it is the line the flanking dog tracks. |
| §2 `SHEEP_LEN = 12` | the sheep body length `drawSheep` already used, now named and shared with the outline. |
| §0 `debug.outlineMarkers` | boolean, default **true** — numbered waypoints on the outline. Not exported. |
| §2 `drawOutlineMarkers()` | dots at every rounded corner's apex and every straight side's midpoint; labelled 1, 2, 3… starting at the marker nearest the gate and running clockwise (#1 drawn slightly larger). Lone sheep → four compass points. |
| §2 `convexHull()` / `drawFlockOutline()` | light-grey dotted outline = convex hull of the working flock (not penned, not injured) offset outward by `outlineLengths × SHEEP_LEN` px with round corners, so it tracks the flock's shape. Drawn under the sheep, over the ideal path. 1 sheep → circle; 2 → stadium. |

## Acceptance (eyeball on the running page)

1. Pasture is at the top of the page; the command pad is fully visible below it without scrolling at 1120×720 canvas on a typical laptop height.
2. Pad reads as the diagram: Walk On above, Come By / Easy / Away in a row, Lie Down below, That'll Do off to the lower right.
3. Active-command highlight still follows the dog's actual state (auto-stand lights the middle *Easy* button).
4. A dotted grey outline hugs the flock ~36 px outside the outermost sheep and reshapes as the flock moves, splits, or bunches; penned sheep drop out of it.
5. `Course & Meta → Debug → flock outline` hides it; `outline margin` resizes it live.
6. Numbered dots sit on the outline at each corner and each side's midpoint; #1 is the one nearest the gate and the numbers increase clockwise; `outline markers` hides them.

## Follow-up

- [`pasture-header.md`](./pasture-header.md) (implemented 2026-08-21) — moves the
  HUD stats and a seed control into a header strip **above** the pasture and
  lowers the canvas by that strip's height. Acceptance 1 above must keep
  holding after it lands.
- [`panel-lanes.md`](./panel-lanes.md) (implemented 2026-08-21) — keeps the fixed
  lil-gui columns off the pasture by reserving a lane (stage shifts right
  when centering would collide) plus an `H` hide-panels toggle.

## Open questions (parked — default in bold)

- ~~**Q-A — "Easy" vs "Stand".**~~ **Resolved 2026-08-21** → relabel only: the
  middle button reads *Easy* but still issues the `stand` command (E2
  auto-stand, cone-as-wall). Hotkey stays **A**. No §1 change.
  **Re-resolved 2026-08-22 ([POC-v6](../POC-v6/dog-behavior.md) I1)** →
  *Easy* is its own command (`data-cmd="easy"`, hotkey A): a slow forward
  drive at ~⅓ walk-on speed; `stand` no longer exists.
- ~~**Q-B — is the outline a render aid or a gameplay concept?**~~ **Resolved
  2026-08-22 (POC-v6 C8)** → gameplay concept: `convexHull` and `sim.hull`
  moved into §1 (the flanking dog tracks the hull offset by `flankStandoff`);
  §2 draws the dotted outline from `sim.hull`. ~~`outlineLengths` stays in
  `debug.*` — the drawn margin is still only a render aid; the dog's own
  track is drawn by `debug.dogTrack`.~~ **Re-resolved the same day (owner,
  touch-up 3):** the dog tracks the *drawn outline itself*; its margin is the
  sim param `perimeterMargin` (36 px), `flankStandoff` is superseded, and
  `debug.dogTrack` now just highlights the outline in the dog's colour while
  he flanks.
