# Phase 6 — Acceptance & Sync

## ▶ Invocation
**Trigger:** "run phase 6" / reaching P6 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 5 complete.
**Do:** run the measured acceptance below, sync docs, tick P6 in `plan.md`,
**STOP, and report**. On full pass, execute the plan's completion step (move
folder to `implemented/`, statuses → `implemented`).

## Goal
Prove POC-v2's definition of done end-to-end and leave the docs telling the
truth. No new features — a verification and bookkeeping phase.

## Tasks
1. **Full `/sheep verify`** (per the verify playbook, measured):
   - **A1–A8** at seed, 80 sheep, dog untouched: cluster count/sizes (A5/A6),
     stillness fractions over 30 s (A1–A3), GCM/convergence trend (A4), zero
     idle-dog drift + avoidance (A7/A8).
   - **B1–B2**: gather → that'll do → re-scatter metrics.
   - Run each statistical check at a second seed.
   - **Settings acceptance 1–6** spot-check (schema-generated boot, tooltips,
     grids, hooks, filtered export).
   - **POC-v1 milestone regression:** one full run through the gate — compact,
     sweep, drive, lie-down at gate, scoring card.
2. **Record results** in `flock-behavior.md` as a second verification log
   entry (same table format as the 2026-07-13 baseline, side by side with it).
3. **Docs sync** (per the tune playbook's list): any defaults/ranges that
   moved during P2–P5 tuning → Appendix A + POC-v1 constants table +
   force-model tuning table (if rationale changed).
4. **Export params JSON** → save as `.claude/sheep/poc/params-<date>-v2.json`.

## Verify
The whole phase *is* verification. It passes when every plan.md
**Definition of done** line is measured true.

## Done when
- [ ] A1–A8 + B1–B2 pass, measured, at two seeds; results logged in the spec.
- [ ] Settings acceptance 1–6 confirmed; v1 milestones regression-free.
- [ ] Docs synced; dated params snapshot saved; zero console errors.

## Gotchas
- If a criterion fails here, do **not** patch the sim inside this phase — 
  reopen the responsible phase (untick it in plan.md), fix there, re-run.
- The baseline table stays in the spec untouched — the new log sits beside it
  as the after-picture.
