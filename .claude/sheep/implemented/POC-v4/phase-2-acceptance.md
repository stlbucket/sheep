# Phase 2 — Acceptance & Sync (runs LAST)

## ▶ Invocation
**Trigger:** "run phase 2" / last unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phases 0–1 ticked.
**Do:** run the measured acceptance + docs sync below, tick P2 in `plan.md`,
then run the version Definition of done (move `spec/POC-v4/` →
`implemented/POC-v4/`, statuses → `implemented`). **STOP, and report.**
**Constraints:** plan.md Global invariants.

## Goal
The whole version holds together: **F1/C7** pass their spec acceptance,
nothing from v2/v3 regressed, docs and defaults reflect what shipped. This
phase writes code only to fix what its own measurements catch.

## Tasks
- **Acceptance, measured** (per [dog-behavior.md](./dog-behavior.md) →
  Acceptance):
  - **F1** at ≥5 seeds + resets (facing→GCM ≈ 0° at t=0).
  - **C7** at two seeds: passes balance without converting, converts at
    balance+90° within tolerance, no second lap, strip follows; overshoot 0
    → v3 parity on the same seed.
- **Regression spot-checks:** POC-v3 C (no orbit, eye ≈45°, inward push),
  D (posture arc holds at a jam), E (E1 min gap ≥ trail−5 over a full drive,
  E2 jam auto-stand); POC-v2 A1/A4 idle metrics + B1/B2.
- **Q12 report:** peak lateral GCM displacement during return transit,
  logged in the spec's acceptance log for the owner's read.
- **Docs sync:**
  - `dog-behavior.md`: status → implemented, acceptance log appended.
  - `brainstorming/force-model.md`: R1/R2 marked implemented (pointer to the
    spec); `brainstorming/README.md`: the flank-overshoot open question
    ~~struck~~ **Resolved** → station rotation, `flankOvershootDeg` slider;
    the command-table Come by/Away row updated to "hands off ~90° past the
    balance point".
  - Settings Appendix A (v2 `settings-inspector.md` appendix, as v3 P4 did):
    delta row for `flankOvershootDeg`.
- **Params snapshot:** dated `poc/params-YYYY-MM-DD-v4.json` in the
  `sheep-defaults.json.js` format.

## Verify (measured)
The Tasks *are* the measurements; the phase passes when every acceptance
item above is measured-green and both docs and defaults match the shipped
schema. Zero console errors from `file://` (HTML + defaults file only).

## Done when
- [x] F1 + C7 acceptance measured and logged (two seeds where statistical).
- [x] v2/v3 spot-checks unregressed; Q12 data logged for the owner.
- [x] Docs + Appendix A + params snapshot synced; static `file://` invariants
  clean (parse, external refs, defaults keys, root mirrors) — the **live**
  console check is the owner's eyeball, per the no-webserver rule.

## As-built notes (2026-08-21)
- Measured **headless in Node** (§0+§1 slice, inert lil-gui stub), the same
  harness P1 used — the owner's no-webserver rule stands, so nothing was
  served over HTTP and no browser was driven.
- The **jam scenario is a state poke**: 80 sheep placed packed 90 px inside a
  12 px mouth with the dog 150 px behind, so E2/D have a jam in seconds
  instead of the minutes Q8 says a scripted drive needs. Same convention v3
  P4 used for its manufactured jam.
- Full acceptance numbers live in
  [`dog-behavior.md`](./dog-behavior.md) → *Acceptance log — P2 gate*.

## Gotchas
- Overshoot-0 parity is the safety net for the whole version — if it drifts
  from the v3 P4 numbers, something beyond the station rotation changed;
  stop and find it before shipping.
- v3's logged follow-ups (stale `dog.target` one-tick leak, walk-on parking
  with `fwdN 0`, `crushThreshold` re-calibration) are **not** in this
  version's scope — carry them forward in the README, don't fix drive-by.
