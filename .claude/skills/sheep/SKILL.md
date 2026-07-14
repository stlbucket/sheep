---
name: sheep
description: Workflow manager for the sheepdog herding game prototype. Use for any lifecycle work on the game — capturing design brainstorms, writing feature specs, adding semantic flock-behavior rules, turning specs into phased build plans, implementing phases of the PoC, verifying the PoC against acceptance criteria in a browser, or tuning sim parameters. Triggers include "/sheep <subcommand>", "add a rule about how the flock…", "spec this feature", "plan POC-vN", "run the plan / run phase N", "does the sim match the rules?", "tune the flee force".
argument-hint: "<brainstorm|spec|plan|implement|rule|verify|tune|status> [version] [notes]"
---

# /sheep — sheepdog game workflow

Everything lives under `.claude/sheep/`. This skill routes a subcommand to its
playbook file **in this skill directory** — read that file before acting.

| Subcommand | What it does | Playbook |
|---|---|---|
| `brainstorm <notes>` | Capture/refine design discussion into `brainstorming/` | [pipeline.md](pipeline.md) |
| `spec <VERSION> <notes>` | Write or extend feature specs in `spec/<VERSION>/` | [pipeline.md](pipeline.md) |
| `plan <VERSION>` | Turn agreed specs into a phased build plan (runner + phase files) | [pipeline.md](pipeline.md) |
| `implement <VERSION> [phase N \| all]` | Execute the next unchecked phase of the plan | [pipeline.md](pipeline.md) |
| `rule <notes>` | Add semantic behavior rules to a living rules list | [rules.md](rules.md) |
| `verify [VERSION \| rule IDs]` | Drive the PoC in a real browser, check acceptance criteria | [verify.md](verify.md) |
| `tune <notes>` | Structured parameter-tuning session; sync docs afterward | [tune.md](tune.md) |
| `status` | Report pipeline state: versions, spec statuses, phase progress | [pipeline.md](pipeline.md) |

No subcommand match → ask which the user meant; don't guess a new workflow.

## Directory map

```
.claude/sheep/
├── brainstorming/        design rationale; README.md is the index + open questions
├── spec/<VERSION>/       feature specs + (after /sheep plan) plan.md + phase-N-*.md
├── implemented/<VERSION>/ finished versions (spec folder moves here when done)
└── poc/sheep-poc.html    the running prototype (single file)
```

Pipeline: **brainstorm → spec → plan → implement**, with `rule` feeding specs,
and `verify`/`tune` running against the PoC at any time.

## Global invariants (every subcommand obeys these)

1. **This is a design/sim side-project — no fnb DB/GraphQL/backend, ever.**
2. **The PoC is one HTML file, one plain `<script>`** (not `type=module`); runs
   from `file://` by double-click; lil-gui is the UMD build via CDN.
3. **Section convention is the module boundary:** `§0 PARAMS · §1 SIM · §2 RENDER
   · §3 INPUT · §4 BOOTSTRAP`. **§1 SIM stays DOM-free** — no `canvas`,
   `document`, `window`, or GUI wiring; it takes `params` as data and exposes
   state + `step(dt)`. §1 is the block that ports to Godot; protect it.
4. **All tunables live in §0 `params`** and get lil-gui bindings when introduced.
   No magic numbers inside the sim.
5. **Every change leaves the page runnable** — open it, see something, zero
   console errors.
6. Fixed timestep `dt = 1/60` with an accumulator, frame delta capped at 0.25 s.
7. **Semantic rules describe observable behavior, never force math.** The force
   model (`brainstorming/force-model.md`) is the *how*; rules are the *what it
   must look like*.
8. Docs use the house style already in the repo: markdown links between docs,
   tables for enumerable facts, **open questions parked with a bolded default**
   rather than silently deciding for the owner.

## Ending a run

Every subcommand ends its report the same way: if there is any question or
follow-up, present it as an **explicit choice** — **proceed** (name the concrete
next step(s)), **stop**, or **give further instruction** — using AskUserQuestion
when available (its "Other" covers further instruction). Never end on an
open-ended "want me to…?" prose question.
