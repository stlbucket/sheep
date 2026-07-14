# POC-v2 — Spec Index

Feature specs for the second iteration of the sheep PoC. A version may bundle
multiple features; add more by running `/sheep spec POC-v2 <notes>` again.

Pipeline: **spec → plan → implement**. **Implemented 2026-07-13** — all 7
phases of [`plan.md`](./plan.md) executed and browser-verified; acceptance log
in [flock-behavior.md](./flock-behavior.md). Params snapshot:
`../../poc/params-2026-07-13-v2.json`.

## Features

| Feature | Spec | Status |
|---|---|---|
| Settings Inspector — self-describing tunables: one schema drives `params` + lil-gui, hover tooltips, per-category ⓘ grid | [settings-inspector.md](./settings-inspector.md) | **implemented 2026-07-13** (P0–P1) |
| Flock Behavior — semantic rules for how the flock behaves; idle state (80 sheep, no convergence, loose 2–5 groups, idle dog inert) + pressure/calm transitions | [flock-behavior.md](./flock-behavior.md) | **implemented 2026-07-13** (P2–P6; A1–A8 + B1–B2 measured PASS ×2 seeds; open Q8 for owner) |

## Locked decisions (this version)

- Schema is the **single source of truth**: `params` defaults + lil-gui
  folders/ranges are generated from it.
- Document **all ~64 params** (incl. currently hidden ones) via an `exposed` flag.
- Per-category detail popup triggered by an **ⓘ button per lil-gui folder**.
- **No hidden-param promotions**; detail grid is **read-only**, structural
  values shown as read-only rows. (Owner, 2026-07-13.)
- `sheepCount`: default **80**, slider max **80 → 150** (perf caveat noted).
- `w_line` slider range bug fixed to **0–3·0.1** (default 0.4 unchanged).

## Still open

- **For the owner:** flock-behavior **open Q8** — is the (measured) difficulty
  of driving 80 scattered sheep the intended skill curve? Recommended: play the
  build before changing the model. Q6 (idle self-penning) parked, low urgency.
