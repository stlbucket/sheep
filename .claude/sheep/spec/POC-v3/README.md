# POC-v3 — Spec Index

Feature specs for the third iteration of the sheep PoC. Add more by running
`/sheep spec POC-v3 <notes>` again.

Pipeline: **spec → plan → implement**. Spec agreed and **planned 2026-07-13**:
build plan is [`plan.md`](./plan.md) (5 phases). Run `/sheep implement POC-v3`
to execute it one phase at a time.

## Features

| Feature | Spec | Status |
|---|---|---|
| Dog Commands & Influence v2 — flanking come-by/away (fence-seeking, 45° cone), blocking lie-down, new **stand** command, never-catch-up walk-on with auto-stand + impulse | [dog-behavior.md](./dog-behavior.md) | **planned** ([plan.md](./plan.md) P0–P4) |

## Locked decisions (this version)

- **Come-by = clockwise, away = counter-clockwise** (tradition kept; matches v1).
- **Stand is a 6th command** (own button + hotkey); lie-down/stand = escalation pair.
- Command strip highlight **follows the dog's actual state** (auto-stand shows).
- Walk-on impulse: **standard shove default, modifier keys for bark / lean**,
  all three shapes tunable.
- Flank cone angle is a **slider** (start 45°); dart threshold **boldness > ~0.8**.
- v3 acceptance **re-measures POC-v2 open Q8** (80-sheep full-field drive).

## Still open

- Nothing — spec reviewed and planned 2026-07-13. Next: `/sheep implement POC-v3`.
