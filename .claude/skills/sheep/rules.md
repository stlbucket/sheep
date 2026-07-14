# /sheep rule — capturing semantic behavior rules

Semantic rules are **acceptance criteria for how the game feels**: observable
behavior the simulation must produce, stated independently of the force math.
They are the owner's primary tool for modeling how the game *should* work.
The live example is `spec/POC-v2/flock-behavior.md` — match its shape.

## Where rules live

Rules go in a **behavior spec** inside the current version folder
(`spec/<VERSION>/flock-behavior.md` today). If the owner's rule is about a
genuinely different system (e.g. dog behavior rather than flock behavior),
start a sibling spec with the same structure and register it in the version
README. Otherwise always extend the existing living list.

## Numbering convention

- Rules are grouped by **lettered situation groups**, each a `###` section:
  `A` = start/idle (unpressured), and new letters as situations appear
  (e.g. `B` under-pressure, `C` gate/bottleneck, `D` multi-group, …).
- Within a group, rules are `**A1.**, **A2.**, …` — numbered so the owner and
  the plans can reference them. **Never renumber or delete a shipped rule**;
  refine its wording in place or supersede it explicitly ("A3 replaced by A7").
- Leave the `*(room to grow)*` marker at the end of each group — these are
  living lists.

## How to write a rule (from the owner's notes)

1. **Translate to observable behavior.** A rule says what a viewer sees on the
   page ("the scene reads as sheep standing around a field, not a swarm") —
   never mechanism ("cohesion weight should be low"). If the owner phrases it
   as mechanism, ask what they want to *see*, or restate it observationally
   and note the mechanism idea under Design notes.
2. **One assertion per rule.** Split compound notes into separate numbered
   rules so verify can pass/fail them independently.
3. **Bold the load-bearing words** (quantities, negations): "does **NOT**
   converge", "groups of **~2–5**".
4. Keep the spec's supporting sections in sync, same order as the template:
   - **Design notes** — implications for the boid model, flagged as "the hard
     parts", not implementation.
   - **Tunables likely involved** — existing param keys (check Appendix A of
     `settings-inspector.md` for the real names) + likely-new ones marked
     "name TBD in planning".
   - **Open questions (parked — for the owner)** — numbered, with your guess
     in parentheses. Quantitative gaps (counts, fractions, durations) go here.
   - **Acceptance** — a concrete on-page check per rule group ("load the page,
     wait 10 s, expect …"). This is what `/sheep verify` executes.
5. Update the version README's feature table (status stays
   "draft — living rules list" while the owner is adding).

## Quality bar

A good rule is **falsifiable on the running PoC**: someone (or `/sheep verify`)
can load the page and say pass/fail. "Sheep should feel natural" is not a rule;
"left alone for 10+ seconds, groups do not merge into one blob" is.
