# POC-v3 Build — Master Plan & Runner

Third iteration: **Dog Commands & Influence v2** — flanking come-by/away,
blocking lie-down + new stand command, trailing walk-on with auto-stand and
pulsed impulses. Spec: [dog-behavior.md](./dog-behavior.md) (rules C/D/E, all
open questions resolved 2026-07-13). Also closes (or re-opens with data)
POC-v2's **open Q8**: the 80-sheep full-field drive.

---

## ▶ Invocation — how to run this plan

**Trigger:** `/sheep implement POC-v3`, "run the v3 plan", "run phase N".

1. Find the **first unchecked phase** below (or the requested one; its
   prerequisite must be ticked).
2. Follow that phase file exactly — implement its Tasks in
   `.claude/sheep/poc/sheep-poc.html`, run its Verify (measured, per the
   `/sheep verify` playbook — serve over localhost HTTP, fast-forward with
   `sim.step()` loops, metrics per rule ID).
3. On acceptance: tick the phase here, **STOP, and report**. Wait for
   go-ahead. ("Run all phases" → continue, reporting at each gate; halt on
   any Verify failure.)
4. After the last phase: run the Definition of done, move `spec/POC-v3/` →
   `implemented/POC-v3/`, mark the feature `implemented`.

**Target file:** `.claude/sheep/poc/sheep-poc.html`.

## Global invariants (every phase)

Same as POC-v2's plan, plus:

- New tunables enter as **`SETTINGS` schema entries** (they get sliders,
  tooltips, and ⓘ-grid rows for free). Superseded params (`R_orbit`, `omega`,
  `driveShrink`) stay in the schema as `exposed:false` documentation until P4
  decides their fate.
- **§1 SIM stays DOM-free**; the command strip and modifier keys are §3.
- **POC-v2's A/B rules must not regress** — every phase spot-checks the idle
  field (A1/A4/A5 quick metrics) and B1/B2 still hold.
- **Command-strip highlight = the dog's actual state** (locked Q5): §3's
  `issue()` display becomes state-driven, fed by §1.

## Phases

| # | File | Goal | Proves |
|---|---|---|---|
| 0 | [phase-0-flanking.md](./phase-0-flanking.md) | come-by/away = moment-by-moment flanking (fence-seek, 45° eye) | C1–C5 |
| 1 | [phase-1-postures.md](./phase-1-postures.md) | blocking lie-down + new stand command (6th button) | D1–D3 |
| 2 | [phase-2-trailing-drive.md](./phase-2-trailing-drive.md) | walk-on never catches up; stall → auto-stand (strip follows) | E1–E2 |
| 3 | [phase-3-impulse.md](./phase-3-impulse.md) | pulsed walk-on: shove / bark / lean via modifiers | E3 |
| 4 | [phase-4-acceptance.md](./phase-4-acceptance.md) | full C/D/E acceptance + **Q8 re-measure** + docs/params sync | version DoD |

## Progress tracker

- [x] Phase 0 — Flanking come-by/away (2026-07-13; C1–C5 measured: no-circle sd 36, fence-hugging track, eye ≈45°, inward push +31 px/s, reversal min gap 37 px after radius-smoothing + clearance-floor fix; idle + v1 spot-checks clean)
- [x] Phase 1 — Blocking postures + stand (2026-07-13; profile probe: stand 0.942 > lie 0.609 front wall, flanks 0.025, zero reach @90 px [postureRange keeps gate relief]; stand = 6th command w/ hotkey A. Behavioral gate-traffic counts deferred to P4; off-gate deadlock watch-item logged)
- [x] Phase 2 — Trailing drive + auto-stand (2026-07-13; E1: min gap 51 ≥ 40 over 400 s; E2: gate jam → stand at 5.5 s on schedule, re-arm works, zero false stands; strip is state-driven. As-built: gap controller + front-hemisphere filter + EMA stall detector [4 iterations — see phase file]; off-gate leak finding logged)
- [x] Phase 3 — Impulse flavors (2026-07-13; envelopes match schema [shove 1.5/0.8/0.5, bark 2.0/0.4/0.3, lean 1.2/1.5/0.5], no stacking, Shift/Alt modifiers wired, gate rhythm cycles tap→pulse→re-stand ×5. As-built: motion-aware smart return [distance-only dead-locked re-entry to walk-on])
- [ ] Phase 4 — Acceptance & sync

## Definition of done (whole version)

1. **C/D/E acceptance passes, measured** (dog-behavior.md → Acceptance), at
   two seeds where statistical.
2. **Q8 re-measured**: the 80-sheep full-field gather-and-drive completes with
   reasonable effort using the new commands — Q8 closes in
   `implemented/POC-v2/flock-behavior.md`, or stays open with fresh data.
3. POC-v2's A1–A8/B1–B2 spot-checks unregressed; v1 milestones read at 20 sheep.
4. Docs synced (Appendix A, force-model dog-steering table, brainstorming
   README command table) + dated params snapshot saved.
5. Zero console errors from `file://`.
