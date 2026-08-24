# Phase 3 — offset downs (D4) + sync + snapshot

**▶ Invocation:** `/sheep implement POC-v10 phase 3` · prerequisite: phase 2 ·
last phase — ends with the version's Definition of done.

**Goal:** Left Down / Right Down buttons (+ ⌥←/⌥→) are lie-down with the block
beam `downConeOffsetDeg` to the dog's own left/right
([command-variants.md](./command-variants.md) D4, criteria 2 & 9–11).

## Tasks

- **§0:** `downConeOffsetDeg` (Dog, 30, 0–90°) + parked.
- **§1:** dog state `lieSide` (−1/0/+1 from `opts.side`, lie-down only);
  `flee()` measures `cosT` against `eyeDir = facing + lieSide × offset`.
- **§2:** drawEye wedge centers on the same `eyeDir`; HUD `cmd` tags
  `·easy` / `·left` / `·right`.
- **§3:** Left/Right Down buttons (bottom row), ⌥←/⌥→ chords, capture ⎘
  emits `flankEasy`/`lieSide` when set.
- **Sync:** both new keys into `poc/sheep-defaults.json.js`; copy
  `sheep-poc.html` → root `index.html` and the defaults file → root; write
  `poc/params-2026-08-24-v10.json`.

## Verify

Harness: pose the dog, probe `flee()` with a sheep placed on rays around him:
left-down max threat near facing−30°, ≈0 at facing+30°; right mirrors; plain
lie-down centered. Boot ownership assertion OK (156 keys), zero errors.

**Done when:** [ ] beam swing measured both sides · [ ] plain lie-down
regression clean · [ ] defaults + root synced · [ ] snapshot written ·
[ ] Definition of done run.

**Gotchas:** the dog's LEFT is facing **minus** the offset on the y-down
canvas (bird's-eye); `lieSide` must default to 0 in the dog literal or every
`flee()` call NaNs on `undefined × deg`.
