# Phase 8 — acceptance

**▶ Invocation:** after phase 7. No new features.

**Goal:** Every acceptance criterion in the four specs is measured and logged, and the projected spread is replaced by measured scores.

## Tasks

- Run the headless node suites and the headless Chrome page checks; drive three scripted runs of one course (scramble, decent, excellent) and record their totals, percents and ranks in scoring.md in place of the projection; append an acceptance log to each spec; update the README; move the folder to `implemented/POC-v15/`.

## Verify

All criteria PASS or are reported as failures with what was observed.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** Never mark a criterion passed because the code should produce it. If the measured spread is far from the projection, report it and leave the values alone — that is a `/sheep tune` decision for the owner.
