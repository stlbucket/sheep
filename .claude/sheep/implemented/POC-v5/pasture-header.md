# Pasture header — seed control + stats above the pasture

**Status:** implemented 2026-08-21; moved here from `spec/` 2026-08-23 (owner-directed, outside the
[POC-v5 plan](./plan.md) — same class as
[`control-layout.md`](./control-layout.md): a UI/render change only; no §1
SIM behavior touched). Q-A–Q-E taken on their bolded defaults. Verified
headless in Node under a DOM stub (boot clean, criteria 4/5/7/8 exercised
by script); criteria 1–3 and 6 are the owner's eyeball from `file://`.

Owner's words (2026-08-21): *"make the seed control appear above the
pasture. lower the pasture so that all the stats above don't overlay. but
not halfway down the screen."*

Today the run stats (`#hud`) are an absolutely-positioned box **inside** the
canvas at its top-left, and the seed control lives only in the collapsed
lil-gui `Course & Meta → Sim` folder plus a `Reseed → new flock` button in
`Tools`. Both are hard to reach mid-run and the HUD covers ~300 × 60 px of
pasture where sheep can actually be. This spec moves the seed control and
the stats into a **header strip above the canvas**, and pushes the pasture
down by exactly that strip's height — no more.

## Goals

1. A **seed control** is visible above the pasture at all times, without
   opening any lil-gui panel: the current seed, the layout it drew, a way to
   type a seed, and a way to draw a new one.
2. The **stats readout** (fps / cmd / intensity / crush / injuries / penned /
   time / score) sits in the same header strip, so nothing textual overlays
   the pasture.
3. The pasture's top edge moves down by the header height only — **target
   ≤ 110 px from the viewport top** at the default 1120 × 720 canvas
   (today it is 10 px). "Not halfway down the screen."
4. The command pad below the pasture stays fully visible without scrolling
   on a typical laptop (≥ 900 px tall viewport) — the existing
   `control-layout.md` acceptance 1 must keep holding.

## Non-goals (this change)

- The fixed lil-gui columns (`#panel-left-col` top-left, `#panel-dog-col`
  top-right) are **not** moved or resized. The Levers panel will still overlap
  the pasture's left edge on narrow viewports; that is a separate layout
  question (see Q-D).
- No change to what Reset / Reseed / `random seed on load` *do* — POC-v5 Q21
  and Q22 stand. The header only surfaces existing §3 actions.
- The on-canvas **flock stress** meter (`drawStressMeter`, top-center, 220 ×
  10 px) stays on the canvas — it is a spatial overlay, not a stat line
  (Q-C asks whether it should also move).
- No new tunables; nothing in §0 `SETTINGS` changes.

## Design

### Page stack (top → bottom)

```
body padding-top (10 px)
┌──────────────────────────── #header  (width = canvas width) ───────────────────────────┐
│ seed [ 1337  ] [Reseed ↻]                            fps 60  cmd stand  intensity 0.40  │
│ layout: whole-pasture                                crush 0.0/4.0  injuries 0  penned 0/80│
│                                                      time 12s  score 1000                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
gap (12 px)
┌──────────────────────────── #wrap / canvas 1120 × 720 ──────────────────────────────────┐
│  (flock stress meter stays top-center on canvas)                                         │
…
#controls (command pad — unchanged)
```

`#header` is a flex row: **seed group left**, **stats right** (right-aligned,
`white-space: pre`, the same three lines the HUD prints today minus the
`seed … · layout` tail, which moves to the seed group). Per Q-A the
`random seed on load` toggle stays in lil-gui only. Height is content
height — about **64–72 px** at the 13 px monospace font — and the canvas
starts immediately after the 12 px body gap, i.e. **~90–100 px from the
top**.

### Seed group

| Element | Behavior |
|---|---|
| `seed` number input | Shows `params.seed`. Typing a value + Enter (or blur) sets `params.seed` and calls the existing `respawn` hook (`resizeCanvas(); sim.reseed(params.seed)`), then `hideCard(); issue('that_ll_do')` — identical to editing the lil-gui `PRNG seed` field. The lil-gui field is refreshed (`updateDisplay`) so the two never disagree. |
| `Reseed ↻` button | Exactly the existing `Tools → Reseed → new flock` action: random seed → reseed → hide card → `that_ll_do`. The Tools button stays (no hotkey today; Q-B asks about one). |
| `layout:` readout | `sim.layout` — the archetype the current seed drew (`beside-gate` / `whole-pasture` / `weighted`). Read-only; to force one, use `Course & Meta → Spawn → spawn layout` as today. |
| `random seed on load` checkbox | Bound to `params.randomSeedOnLoad`, mirrored with the lil-gui control. Boot-time only (POC-v5 F4), so toggling it does nothing until the next load — label it so (`random seed on load (next load)`), or drop it from the header per Q-A. |

All of this is §3 INPUT / §4 BOOTSTRAP wiring over state that already exists;
§1 still receives `seed` as plain data.

### Stats group

The `#hud` element moves out of `#wrap` into `#header` and loses
`position: absolute`. The render loop's `hud.textContent = …` line in §2 is
unchanged except that the `seed N · layout` tail is dropped (the seed group
shows it). Keep the element id `hud` so nothing else needs renaming.

### CSS deltas (all `[throwaway]`)

| Where | Change |
|---|---|
| `#header` (new) | `display: flex; justify-content: space-between; align-items: flex-start; width: <canvas width>px; gap: 16px; padding: 6px 8px; background: rgba(10,13,16,.55); border: 1px solid #2c353d; border-radius: 4px;` — same chrome as today's HUD. Width tracks the canvas: set `header.style.width = canvas.width + 'px'` inside `resizeCanvas()` (§2), since `canvasW` is live-editable (POC-v5 Q14). |
| `#hud` | drop `position/top/left`; keep `white-space: pre`; `text-align: right`. |
| `#wrap` | unchanged (`position: relative` still hosts the canvas; nothing absolute left inside except the post-run `#card`, which is fixed anyway). |
| `body` | unchanged — `justify-content: flex-start`, `gap: 12px`, `padding-top: 10px`. The pasture drops by exactly the header's height plus one gap. No extra top margin. |

## Constraints

- **Invariant 3 — §1 stays DOM-free.** The header reads `params.seed`,
  `sim.layout`, `sim.score()`; it never reaches into `Sim` beyond the calls
  §3 already makes (`reseed`, `finishRun`).
- **Invariant 4 — no new tunables.** Header height is CSS, not a param;
  nothing new in `SETTINGS` or `sheep-defaults.json.js`.
- **Invariant 5 — page stays runnable** at every step; zero console errors.
- Canvas resize (`canvasW`/`canvasH`, Pasture · Scale lever) must keep the
  header the canvas's width — hook into `resizeCanvas()`, do not hard-code
  1120.
- Hotkeys Q/E/W/S/A/D/F/R are unchanged; the seed input must **not** swallow
  them while unfocused, and **must** swallow them while focused (typing a
  seed containing no letters is still typing — blur on Enter so the pad works
  again immediately).

## Acceptance criteria (eyeball on the running page, file://)

1. On load, a header strip sits above the pasture showing `seed <n>`, the
   drawn `layout`, a `Reseed` button, and the stats block on the right.
   Nothing textual is drawn over the pasture except the flock-stress meter.
2. The canvas's top edge is **≤ 110 px** from the viewport top at the default
   1120 × 720 canvas (measure: `document.getElementById('field').getBoundingClientRect().top`).
3. The command pad is fully visible without scrolling at 1120 × 720 on a
   ≥ 900 px-tall viewport (control-layout acceptance 1 still holds).
4. Typing `1337` + Enter in the header seed input re-lays seed 1337 — gate,
   spawn side and layout match the lil-gui `PRNG seed` route and the
   lil-gui field now also reads 1337.
5. Clicking `Reseed` changes the header seed, the layout readout, and the
   course; the run timer and score reset; `Reset` (R) afterwards replays that
   same seed (POC-v5 Q22).
6. Stats in the header update live (fps/time tick; penned count climbs as
   sheep pen).
7. Changing `canvas width` (Course & Meta → Stage, or the Pasture · Scale
   lever) resizes the header to match the new canvas width.
8. With the seed input focused, pressing `R` types into the field (does not
   reset); after Enter/blur, `R` resets the run again.

## Open questions (parked — default in bold)

- **Q-A — does `random seed on load` belong in the header?** It is
  boot-time-only, so a header toggle that does nothing until reload may
  confuse. **Default: leave it in lil-gui `Course & Meta → Sim` only; header
  shows seed + layout + Reseed.**
- **Q-B — hotkey for Reseed?** `N` (new course) is free. **Default: no hotkey
  in this change** — accidental reseeds mid-run are worse than a click.
- **Q-C — should the flock-stress meter move into the header too?** It is
  the last overlay on the pasture. **Default: no** — it is read spatially
  against the flock; and it is 10 px tall, not a stat line.
- ~~**Q-D — the Levers panel (fixed, top-left, ~245 px wide, ~500 px tall)
  still overlaps the pasture's left edge whenever the viewport is narrower
  than 1120 + 2 × 245 ≈ 1610 px.**~~ **Spec'd 2026-08-21** →
  [`panel-lanes.md`](./panel-lanes.md): reserve a lane so the stage sits
  right of the column when centering would collide; `H` hides all panels.
- **Q-E — where does this spec live?** No version was named; like
  `control-layout.md` it sits at `spec/` root as an owner-directed touch-up.
  **Default: stay here; implement as a single phase outside the POC-v5
  plan; fold into POC-v5 P6 acceptance & sync only if it lands before P6.**
