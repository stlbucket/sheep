# Input Remap v2 — arrow hotkeys (I5) · 3×3 pad (U1)

**Status:** implemented 2026-08-24 (DOM-side: code-inspected + clean headless boot; owner `file://` eyeball pending). Supersedes the
QWEASD map from POC-v5's control layout. §3 INPUT + pad CSS/HTML only —
**§1 is untouched by this spec** (the new *commands* live in
[command-variants.md](./command-variants.md)).

The six commands (plus the four new variant buttons) move to the arrow keys
with ⇧/⌥ chords, and the pad regroups into a 3×3 that mirrors the chords.

## Goals

1. **I5** — arrow hotkeys: ← come-by · → away · ↑ walk-on · ↓ lie-down ·
   ⇧↑ easy · ⏎ that'll-do; letters removed (Q57).
2. **Q58 chords** — ⇧← come-easy · ⇧→ away-easy · ⌥← left-down · ⌥→ right-down.
3. **U1/Q60** — the 3×3 pad: row 1 Come By / Walk On / Away, row 2 Come Easy /
   Easy / Away Easy, row 3 Left Down / Lie Down / Right Down; That'll Do apart
   lower-right; every button's `<kbd>` shows its key glyph.

## Non-goals

- F / R / H (finish / reset / panels), the seed control, capture ⎘ — unchanged.
- A keyboard chord for bark/lean (Q61 parked): the flavors stay ⇧/⌥-click on
  Walk On; `flavorOf` applies to clicks only now.
- Gamepad/touch input.

## Design

**HOTKEYS** becomes a per-key `{ plain, shift, alt }` map on `ev.key`
(`ArrowLeft` … `Enter`); resolution order alt → shift → plain, missing chord
falls back to plain (⇧↓ = lie-down). Handled keys `preventDefault()` — arrows
must not scroll the page and ⏎ must not re-click a focused button. The
INPUT/TEXTAREA early-return guard stays (typing a seed never commands the dog).

**issue(cmd)** resolves §3-only variant names through a `VARIANTS` table to the
§1 verb + entry opts (`come_by_easy → ['come_by', {easy:true}]` …); the strip
highlight compares against a **displayCommand(dog)** derived from dog state
(`flankEasy`, `lieSide`), keeping the locked Q5 rule: the strip shows the dog's
ACTUAL state, auto-easy included.

## Constraints

- §3 stays player→command only: keys/buttons call `sim.setCommand()`, never
  touch sheep or dog steering.
- Page runnable from `file://`, zero console errors.

## Acceptance criteria

1. ← → ↑ ↓ issue come-by / away / walk-on / lie-down; ⇧↑ easy; ⏎ that'll-do.
2. ⇧← / ⇧→ issue come-easy / away-easy; ⌥← / ⌥→ left-down / right-down.
3. Q / W / E / A / S / D no longer issue commands; F / R / H still work.
4. The pad renders as the Q60 3×3 with That'll Do apart; `<kbd>` glyphs match.
5. Arrow keys do not scroll the page; typing in the seed field issues nothing.
6. The active highlight follows the dog's actual state, variants included
   (a come-easy flank lights *Come Easy*, its handoff lights *Easy*).

## Acceptance log — 2026-08-24

Criteria 1–6 are §3/DOM behavior. Verified by construction + headless boot
(Proxy stub, zero console errors/warns): `HOTKEYS` maps exactly ←/→/↑/↓/⏎ with
⇧/⌥ chords and no letter keys; `VARIANTS` resolves the four button names to
the §1 verbs + opts; grid areas match the Q60 3×3; handled keys
`preventDefault()`; INPUT/TEXTAREA guard unchanged. The strip's
`displayCommand` path is exercised by the harness (variant state present and
cleared). Owner `file://` eyeball **pending** (as v5–v9 shipped): arrows
drive, no page scroll, pad reads as three rows, Come Easy lights during a
gentle flank.

### Amendment — 2026-08-24 (Q61 flavor chords)

The owner un-parked Q61 at the end-of-run gate: the E3 walk-on impulse
flavors get chords — **⌥↑ = lean, ⇧⌥↑ = bark** (resolution order
alt+shift → alt → shift → plain; ⇧↑ still = easy, plain ↑ while in easy
still = shove). A HOTKEYS entry may now be `[cmd, flavor]`; ⇧/⌥-click on
Walk On keeps working. Verified: `node --check` + headless boot clean, root
copy re-synced.

### Amendment — 2026-08-24 (control-chrome touch-up)

Five owner items after the Q61 gate, applied to the shipped version:

1. **pause/unpause** button in the header next to capture ⎘, hotkey **P** —
   freezes sim stepping in §4 (accumulator zeroed so resume doesn't
   fast-forward); rendering, panels, sliders and capture stay live.
2. **Finish button removed** — the **F** hotkey still calls `finishRun()`
   (functionality kept, chrome dropped).
3. **Reset** moved up into the header row (same `data-action="reset"` wiring,
   same **R** hotkey).
4. The vertical spacer between pad and run group became a **horizontal rule
   below the 3×3 grid** (`#controls` is a centered column now).
5. **That'll Do** sits below that rule, centered (still `data-cmd`, still ⏎,
   still lights via the strip).

Verified: `node --check` + headless boot clean (158 keys OK, 0 errors), root
copy re-synced. Owner `file://` eyeball pending with the rest of v10.
