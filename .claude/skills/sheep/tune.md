# /sheep tune — parameter tuning sessions

Find better values for the §0 `params` tunables, with the docs kept honest
afterward. "The PoC's job is to find the fun" — tuning is a first-class
activity, not a side effect.

## Ground rules

- **Tuning changes values, never mechanisms.** If no slider position produces
  the desired behavior, that's a force-model/spec problem — stop and say so
  (route to `/sheep rule` or `/sheep spec`), don't bend the sim mid-session.
- **One family at a time.** Vary one param (or one tightly-coupled pair, e.g.
  `w_coh`+`cohScale`), observe, record, then move on. No shotgun changes.
- Param names, ranges, and meanings come from **Appendix A of
  `spec/POC-v2/settings-inspector.md`** — the settings inventory. Consult it
  before touching anything unfamiliar.

## Session loop

1. **State the target** in behavior terms, ideally as rule IDs ("A4/A5: idle
   groups must stop coalescing") or a milestone feel ("come-by sweep should
   collect stragglers without panicking the blob").
2. **Baseline**: run the relevant [verify.md](verify.md) checks / metrics
   before changing anything, at a noted `seed`. No baseline → no tuning.
3. **Iterate** in the browser (setup per verify.md): set values via
   `browser_evaluate` on `params` (exactly what the sliders do — respect
   `onChange` hooks like `sheepCount`→respawn by re-triggering them, or use
   the GUI/reseed button), re-measure, keep a running log:
   `param: old → new | metric before → after | feel note`.
4. **Bracket, then bisect**: find a clearly-too-low and clearly-too-high value
   first; the interesting reading is *where behavior changes*, not just the
   final number.
5. **Adopt or revert.** A candidate value must not regress previously-passing
   acceptance checks — spot-check one or two neighboring criteria before
   adopting.

## Sync the docs (the part that must not be skipped)

When a tuned value is adopted:

1. **§0 `params` default** in `sheep-poc.html` (and its lil-gui range if the
   good value sat outside the old slider bounds).
2. **Appendix A inventory** (`settings-inspector.md`): default + range columns.
3. **POC constants table** (`implemented/POC-v1/README.md` → Starting
   constants) if the param appears there.
4. **`brainstorming/force-model.md` tuning table** if the *starting guess or
   its rationale* changed in body-length terms.
5. Export the params JSON (the P7 export button) and save the snapshot to
   `.claude/sheep/poc/params-<date>-<what>.json` as the session artifact.

Report at the end: target, adopted changes (old → new, with the why in one
line each), rejected experiments worth remembering, and which docs were
updated.
