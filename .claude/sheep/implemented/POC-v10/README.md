# POC-v10 — Spec Index

Tenth iteration of the sheep PoC. Started **2026-08-24** from one owner note,
run end-to-end in a single session ("do all of the following from beginning to
end"): the control shortcuts move to the **arrow keys**, the command pad
regroups into a **3×3**, and four new command buttons arrive — the gentle
flanks (**come-easy / away-easy**) and the offset downs (**left-down /
right-down**). Predecessor [POC-v9](../POC-v9/README.md) shipped 2026-08-24.

## Features

| Feature | Spec | Status |
|---|---|---|
| Input Remap v2 — arrow hotkeys (I5), 3×3 pad (U1) | [input-remap.md](./input-remap.md) | **implemented** 2026-08-24 — DOM checks code-inspected + clean boot, owner `file://` eyeball pending ([log](./input-remap.md#acceptance-log--2026-08-24)) |
| Dog Commands & Influence v8 — gentle flanks (C11), offset downs (D4) | [command-variants.md](./command-variants.md) | **implemented** 2026-08-24 — acceptance measured PASS ([log](./command-variants.md#acceptance-log--2026-08-24)) |

## Locked decisions (this version)

From the owner's note (2026-08-24), taken as given:

- **I5** — shortcuts: come-by **←**, away **→**, walk-on **↑**, lie-down **↓**,
  easy **⇧↑**, that'll-do **⏎ (Return)**.
- **U1** — Come By and Away move up into a row with Walk On.
- **C11** — new buttons **come-easy** / **away-easy**: same as come-by / away
  but the dog moves at **half speed**.
- **D4** — new buttons **left-down** / **right-down**: same as lie-down but the
  intensity cone sits **30° to the left / right**.

Clarified with the owner the same day (numbering continues from v9's Q56):

- **Q57 — letters replaced.** The QWEASD letter hotkeys are **removed**; arrows
  + Return are the only command keys. F / R / H (finish / reset / panels) stay.
  ⇧↑ always means *easy*; the bark/lean walk-on impulse flavors stay reachable
  as **⇧/⌥-click on the Walk On button** (a plain ↑ while in easy still fires
  the E3 shove tap).
- **Q58 — new buttons get the symmetric chord scheme.** ⇧← come-easy,
  ⇧→ away-easy (⇧ = gentle, matching ⇧↑ easy); ⌥← left-down, ⌥→ right-down.
- **Q59 — cone frame = the dog's facing.** Left/right-down swing the lie-down
  beam 30° to the dog's *own* left/right of where he faces (bird's-eye:
  the dog's left = counter-clockwise on the y-down canvas, facing − 30°).
- **Q60 — 3×3 pad.** Flanks on top (Come By / Walk On / Away), gentle row mid
  (Come Easy / Easy / Away Easy), downs on the bottom (Left Down / Lie Down /
  Right Down); That'll Do stays set apart lower-right.

## Still open

- ~~**Q61** — keyboard access to the bark/lean impulse flavors (old ⇧W/⌥W)~~
  **Resolved** (owner, 2026-08-24, same session) → chords added: **⌥↑ lean,
  ⇧⌥↑ bark** (⇧↑ stays easy; ⇧/⌥-click on Walk On still works); see
  [input-remap.md](./input-remap.md#amendment--2026-08-24-q61-flavor-chords).

(nothing else open)

## Touch-ups (same day)

After ship the owner added a control-chrome pass — pause/unpause in the
header (P), Finish button removed (F hotkey kept), Reset moved to the header,
the pad's vertical spacer became a horizontal rule, That'll Do centered below
it — see the [input-remap amendment](./input-remap.md#amendment--2026-08-24-control-chrome-touch-up).

Plan: [plan.md](./plan.md) · phases 1–3.
