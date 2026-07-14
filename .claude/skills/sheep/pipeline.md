# /sheep pipeline — brainstorm · spec · plan · implement · status

The lifecycle: **brainstorm → spec → plan → implement**. Each stage produces
files the next stage consumes. POC-v1 (`implemented/POC-v1/`) is the reference
implementation of every format below — when in doubt, match it.

---

## `/sheep brainstorm <notes>`

Capture design discussion into `.claude/sheep/brainstorming/`.

1. Decide whether the notes extend an existing deep-dive doc or need a new
   `<topic>.md`. Prefer extending; one doc per design axis (force model, threat
   model, scoring, …).
2. Write the design reasoning, not just conclusions — these docs record *why*.
3. Update `brainstorming/README.md`:
   - Add new docs to the **Deep dives** list with a one-line hook.
   - Maintain **Open design questions (parked)**: add new open questions;
     when one is resolved, ~~strike it through~~ with `**Resolved** → <answer>;
     see <doc>` (existing entries show the pattern).
4. Brainstorming is pre-spec: no acceptance criteria here, no plan phases.

## `/sheep spec <VERSION> <notes>`

Write or extend feature specs in `.claude/sheep/spec/<VERSION>/`.

1. Create the folder + `README.md` index if new. The index has: a **Features**
   table (Feature | Spec | Status), **Locked decisions (this version)**, and
   **Still open**. Statuses: `draft` → `agreed` → `planned` → `implemented`.
2. One file per feature (`<feature-name>.md`). A spec contains, in this order
   (see `settings-inspector.md` for the full-dress version):
   - **Status** line (draft/agreed + what review is pending)
   - One-paragraph summary of the change and why
   - **Goals** (numbered) and **Non-goals** for this version
   - The design itself (schema/shape/rules — whatever the feature is)
   - **Constraints** — restate which global invariants bite here
   - **Acceptance criteria** — numbered, checkable on the running page
   - **Open questions (parked — default in bold)** — never silently decide
     an owner-level question; park it with your recommended default bolded
   - Appendix inventory tables when the feature touches many items
3. Cross-link related brainstorming docs and other specs with relative links.
4. Re-running `spec` on an existing version **adds/extends features** in that
   folder — update the README table, don't fork a new version.
5. Behavior-rule features (like `flock-behavior.md`) follow [rules.md](rules.md).

## `/sheep plan <VERSION>`

Turn agreed specs into a phased build plan, **in the same `spec/<VERSION>/`
folder** (the whole folder moves to `implemented/` when done).

1. Precondition: specs exist and the owner has reviewed them (statuses `agreed`,
   or the owner explicitly says plan anyway). If a spec has unresolved open
   questions that block phasing, surface them first.
2. Produce:
   - **`plan.md`** — the runner. Must contain: an **▶ Invocation** block (how to
     trigger, the one-phase-per-go rule, "run all phases" escape hatch), the
     **Global invariants**, the file **section map**, a **Phases table**
     (# | file | goal | proves), a **Progress tracker** (checkboxes), and a
     **Definition of done** for the version.
   - **`phase-N-<slug>.md`** per phase, each independently invocable, with:
     **▶ Invocation** (trigger, prerequisite phase, do/constraints), **Goal**,
     **Tasks** organized **by §-section** of the PoC file, **Verify** (observable
     checks on the running page), **Done when** (checkboxes), **Gotchas**.
3. Phase sizing: each phase leaves the page runnable and proves one observable
   thing. Prefer 4–8 phases; a phase that can't state a Verify step is two
   phases or none.
4. Update the version README: feature statuses → `planned`, link plan.md.

## `/sheep implement <VERSION> [phase N | all]`

Execute the plan — this is the runner behavior `plan.md` describes.

1. Open `spec/<VERSION>/plan.md` (or `implemented/<VERSION>/plan.md` for
   touch-ups). Find the **first unchecked phase** in the Progress tracker, or
   the explicitly requested phase.
2. Follow that phase file exactly: implement its Tasks in
   `.claude/sheep/poc/sheep-poc.html`, keeping every global invariant.
3. Run its **Verify** steps. Use [verify.md](verify.md) (real browser) for any
   check phrased as observable on-page behavior — don't just eyeball the code.
4. On pass: tick the phase in the Progress tracker, **STOP, and report** what
   was built + how to eyeball it. **Do not start the next phase** unless the
   invocation said `all` — and even then, report at each gate and halt on any
   Verify failure.
5. When the last phase ticks: run the version's Definition of done, move
   `spec/<VERSION>/` → `implemented/<VERSION>/`, set feature statuses to
   `implemented`, and note any follow-ups for the next version.

## `/sheep status`

Read-only report. Scan `.claude/sheep/` and summarize: versions in `spec/` and
`implemented/`, each feature's status from the version READMEs, plan progress
(checked/total phases), and the parked open questions awaiting the owner.
