# Phase 4 — Acceptance & Sync (incl. Q8 re-measure)

## ▶ Invocation
**Trigger:** "run phase 4" / reaching P4 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 3 complete.
**Do:** run the acceptance below, sync docs, tick P4, **STOP, and report**.
On full pass: move `spec/POC-v3/` → `implemented/POC-v3/`, feature status →
`implemented`.

## Goal
Prove the version end-to-end — including whether the new commands close
POC-v2's **open Q8** — and leave every doc telling the truth. No new features.

## Tasks
1. **C/D/E acceptance, measured** (dog-behavior.md → Acceptance), two seeds
   for the statistical ones: flank path/eye-angle/push-inward (C), arc
   crossing-rate ordering + dart count (D), trail-gap minimum, auto-stand
   latency + strip sync, impulse traces ×3 flavors (E).
2. **Q8 re-measure:** the POC-v2 scenario — 80 sheep, scattered field, full
   gather-and-drive to the pen using only the command strip (flank sweeps,
   trailing drive, pulsed gate work). Record total time, commands issued,
   penned count. **Q8 closes** if it completes with reasonable effort; either
   way, log the result in `implemented/POC-v2/flock-behavior.md` (update open
   Q8 with the measured outcome).
3. **Regressions:** POC-v2 A1–A8/B1–B2 quick metrics; v1 milestones at 20
   sheep; zero console errors.
4. **Docs sync:** Appendix A (`implemented/POC-v2/settings-inspector.md`) gains
   the new Dog params (+`R_orbit`/`omega`/`driveShrink` marked superseded);
   `brainstorming/force-model.md` dog-steering table gets a superseded-by-v3
   note (flanking/postures/impulse); `brainstorming/README.md` command table
   updated (stand added, come-by description → flanking); record the C/D/E
   acceptance log in dog-behavior.md beside the rules.
5. **Params snapshot** → `poc/params-<date>-v3.json`.

## Verify
This phase *is* verification: every plan.md Definition-of-done line measured
true.

## Done when
- [ ] C/D/E measured pass ×2 seeds; acceptance log written.
- [ ] Q8 outcome measured and recorded (closed or re-opened with data).
- [ ] v2/v1 regressions pass; docs synced; snapshot saved; no console errors.

## Gotchas
- A criterion failing here → reopen the responsible phase (untick in
  plan.md), fix there, re-run. No sim patches inside this phase.
- Q8's "reasonable effort" is ultimately the owner's call — report the
  measured run (time/commands/penned) and let the owner judge the feel before
  declaring Q8 closed.
