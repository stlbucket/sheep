# POC-v3 Build — Master Plan & Runner

Third iteration: **Dog Commands & Influence v2** — flanking come-by/away,
blocking lie-down + new stand command, trailing walk-on with auto-stand and
pulsed impulses. Spec: [dog-behavior.md](./dog-behavior.md) (rules C/D/E, all
open questions resolved 2026-07-13). Also closes (or re-opens with data)
POC-v2's **open Q8**: the 80-sheep full-field drive.

**Extended 2026-07-13** (after P0–P3 shipped, from hands-on play): phases
5–9 cover dog-behavior **C6** + the `dogVMax` slider, and the new
[course-and-flock.md](./course-and-flock.md) spec (**F/G/H** — perimeter
gate, near-gate spawn, gate commitment, 1–n groups, panel split, defaults
file). **Phase 4 (acceptance) now runs LAST**, after P9, with its scope
extended to the full rule set.

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
| 5 | [phase-5-pace-and-handoff.md](./phase-5-pace-and-handoff.md) | `dogVMax` slider (135→110) + flank auto-converts to drive opposite the target | C6 |
| 6 | [phase-6-perimeter-gate.md](./phase-6-perimeter-gate.md) | seeded perimeter gate + pen outside; spawn near-gate-one-side; interior fence retires | F1–F3 |
| 7 | [phase-7-gate-commitment.md](./phase-7-gate-commitment.md) | sheep moving gateward near the gate commit and go through | G1 |
| 8 | [phase-8-group-sizes.md](./phase-8-group-sizes.md) | idle groups sized 1–n; n slider default 10, max 20 | H1 |
| 9 | [phase-9-panels-and-defaults.md](./phase-9-panels-and-defaults.md) | sheep-left / dog-right / meta-collapsed panels + `sheep-defaults.json.js` | UI + Q1/Q2 |
| 4 | [phase-4-acceptance.md](./phase-4-acceptance.md) | **runs LAST** — full C/D/E **+ F/G/H + C6 + UI** acceptance, **Q8 re-measure**, docs/params sync | version DoD |

## Progress tracker

- [x] Phase 0 — Flanking come-by/away (2026-07-13; C1–C5 measured: no-circle sd 36, fence-hugging track, eye ≈45°, inward push +31 px/s, reversal min gap 37 px after radius-smoothing + clearance-floor fix; idle + v1 spot-checks clean)
- [x] Phase 1 — Blocking postures + stand (2026-07-13; profile probe: stand 0.942 > lie 0.609 front wall, flanks 0.025, zero reach @90 px [postureRange keeps gate relief]; stand = 6th command w/ hotkey A. Behavioral gate-traffic counts deferred to P4; off-gate deadlock watch-item logged)
- [x] Phase 2 — Trailing drive + auto-stand (2026-07-13; E1: min gap 51 ≥ 40 over 400 s; E2: gate jam → stand at 5.5 s on schedule, re-arm works, zero false stands; strip is state-driven. As-built: gap controller + front-hemisphere filter + EMA stall detector [4 iterations — see phase file]; off-gate leak finding logged)
- [x] Phase 3 — Impulse flavors (2026-07-13; envelopes match schema [shove 1.5/0.8/0.5, bark 2.0/0.4/0.3, lean 1.2/1.5/0.5], no stacking, Shift/Alt modifiers wired, gate rhythm cycles tap→pulse→re-stand ×5. As-built: motion-aware smart return [distance-only dead-locked re-entry to walk-on])
- [x] Phase 5 — Dog pace & flank→drive handoff (2026-07-13; C6 measured: reversed come-by converts at 16.1 s / 153° sweep — no second lap, mid-field away 8.9 s CCW, arm-delay 0.55 s, eye 44.9°, zero re-flanks; `dogVMax` slider live at 110. As-built: flank advance cap [0.9·dogVMax/flankR — uncapped point lapped the dog forever at 80 scattered sheep, pre-existing P0 defect] + pen clamp on the flank point [dog was wall-pinned east of the fence 78% of a run; retires with P6]. Watch item for P4: E1 min gap 39 vs 40, momentary transit dip)
- [x] Phase 6 — Perimeter gate & near-gate spawn (2026-07-13; F1: 8 reseeds → gate on 3 sides, corner clearance ≥ 112 ≥ margin 80, same-seed identical; F2: spawn GCM on the seeded side every time [|along| 86–412 px], zero sheep in the mouth zone, zero across the field; F3 read: spawn sits beside the gate, course reads out-and-around; 20-sheep gather→drive→pen completes [seed 42: 84.3 s, 3 commands, 20/20, crush measured 3.57 peak, 0 injuries]; idle A1/A4–A6 flat over 30 s. As-built: computeGCM now excludes penned/down sheep — the pen moved OUTSIDE the field, and a centroid counting penned sheep dragged all dog steering to the gate once most were through [dog circled the pen instead of fetching stragglers, measured]. Watch item for P4/Q8: the LAST straggler often outlasts scripted play [19/20 at 450 s on both seeds with a naive driver] — split-flock walk-on parks 55 px behind a dissolved GCM with fwdN=0, so E2 never fires; expect P7 commitment + human re-flanking to cover it)
- [x] Phase 7 — Gate commitment (2026-07-13; G1 measured over 10 seeds: 92 committed zone-entries → 92 through, zero reversals-at-threshold, zero stranded — including pressure dropped at first commitment [dog parked, 30 s window]; no suction: 3 seeds × 60 s idle beside the gate [up to 18 sheep near the zone] → zero through, zero stale flags; idle A-metrics flat; zero console errors. As-built: commitment is STICKY per-sheep (`s.committed`, leash 1.5×gateApproachR) — a pure per-tick force left 6/10 sheep stalled mid-zone when the dog quit a jam [neighbor bumps / calm timer cut the condition]; idle sheep can't trip it, so no Q6 self-penning. Side effect logged for P4/tune: the funnel drains mouth jams so well that crush now peaks ~0.6–1.3 vs 3–3.9 pre-P7 with the same scripted drives — crush still registers but `crushThreshold` 1.5 needs re-calibration if injuries are re-enabled. Bonus: all five full-drive seeds now pen 20/20 ≤ 240 s — P6's last-straggler watch item is largely absorbed)
- [x] Phase 8 — Idle group sizes 1–n (2026-07-13; H1 at n=10 over 3 seeds: spawn groups span 1–10 with visible singletons, 15–18 groups at 80 sheep; sweep: n=20 → max sizes 13/18/14/15/17/20 over 6 seeds, n=1 → 80 singletons; A4 holds [mean dist-to-GCM 185→187 over 30 s, still-frac 1.0]; B2 holds — released blob dissolves 1→9 clusters, biggest-cluster share 1.0→0.68, spread 111→164 px over 6 min, slower than v2's 2–5 world as expected of the lumpier legal field; zero console errors. As-built: lone-remainder guard removed from the spawn table [singletons legal]; `clusterSizeMin` → exposed:false fixed at 1; enterIdle's re-derived group caps needed no change — they read clusterSizeMin/Max as data, and crowd-drift already counts strangers only)
- [x] Phase 9 — Panel split & defaults file (2026-07-13; three lil-gui roots in explicit containers: Sheep panel top-left [0–245 px], Dog top-right, Course & Meta below the dog panel and collapsed; controller census 84/84 vs schema; `sheep-defaults.json.js` created [schema-generated, export:false entries dropped, `goal` newly export:false — it is DERIVED course state]; round-trip measured: file edit dogVMax 110→87 → param 87 + slider 87 on reload; missing-file fallback: page boots on schema defaults with exactly one warning [plus the browser's own resource-404 line]; export button emits the full `const SHEEP_DEFAULTS =` statement, body parses as pure JSON; inspector tooltips flip to the field side and ⓘ grids walk all three roots [13/29/15 rows vs schema]; sim byte-identical pre/post refactor [100-step digest match at seed 1337]; file:// boot verified in headless host Chrome — zero console errors, HUD live, panels populated)
- [x] Phase 4 — Acceptance & sync (2026-07-13, ran LAST; C measured ×2 seeds [no-orbit sd 113/45, wall 15 px, eye 45.1°/44.9°, inward +19.5/+17.6 px/s, C6 handoff 201°/268° sweep, away = pure CCW]; D [0 arc crossings from 12–14 pressed visitors per posture; D2 recalibrated — boldness draw promoted to `boldMean`/`boldSd` schema tunables, sd 0.1→0.22 because >0.8 was a 5σ event and the owner-locked 0–2-per-80 tail could never exist; dart itself unobserved, parked for hands-on]; E [min gap 47/40 vs 40, zero dips, zero false stands, jam auto-stand @59 px + strip follows, impulse envelopes 1.5/0.8/0.48 · 2.0/0.4/0.28 · 1.2/1.5/0.47, no stacking]; **Q8 re-measured → STAYS OPEN**: 20 sheep pen in 28–45 s / 1–3 cmds, but 600 s scripted budgets at 80 end 7/80 & 3/80 — logged in POC-v2 flock-behavior Q8; v2 A1–A8/B1–B2 spot-checks pass [A7 stress 0 at heel, A2 shuffle 53/72 grazers, A3 wanderers 81 vs 13 px, B1 0 idle-while-stressed over 13k stressed ticks, A5 superseded by H1]; docs synced [Appendix A.1 deltas, force-model superseded note, brainstorming command table +stand/flanking, acceptance logs in both specs]; params snapshot `poc/params-2026-07-13-v3.json`; zero console errors incl. file:// headless-Chrome boot)

## Definition of done (whole version)

1. **C/D/E acceptance passes, measured** (dog-behavior.md → Acceptance,
   **including C6**), at two seeds where statistical.
2. **F/G/H + UI acceptance passes** (course-and-flock.md → Acceptance):
   seeded perimeter gate + near-gate spawn over ≥6 reseeds, zero threshold
   turn-backs, group sizes 1–n at n=1/10/20, three-panel GUI, defaults-file
   round-trip.
3. **Q8 re-measured**: the 80-sheep full-field gather-and-drive completes with
   reasonable effort using the new commands — Q8 closes in
   `implemented/POC-v2/flock-behavior.md`, or stays open with fresh data —
   **on the new perimeter-gate course**.
4. POC-v2's A1–A8/B1–B2 spot-checks unregressed (A5 as superseded by H1);
   v1 milestones read at 20 sheep against the perimeter gate.
5. Docs synced (Appendix A, force-model dog-steering table, brainstorming
   README command table) + dated params snapshot saved **in the
   `sheep-defaults.json.js` format**.
6. Zero console errors from `file://` (HTML + defaults file only —
   invariant #2 as amended).
