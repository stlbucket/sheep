# Phase 3 — Walk-on Impulses (shove / bark / lean)

## ▶ Invocation
**Trigger:** "run phase 3" / reaching P3 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 2 complete.
**Do:** implement Tasks, run Verify, tick P3 in `plan.md`, **STOP, and report**.

## Goal
Walk-on issued **while the dog is standing** fires a brief pressure impulse
then returns rapidly to stand — with three flavors: plain tap = **shove**,
modifier keys = **bark** / **lean** (Q6). Rule **E3** — the gate-working
rhythm.

## Tasks
- **§0 (schema, `Dog` category):** nine impulse entries —
  `shoveMult 1.5 / shoveDur 0.8 s / shoveDecay 0.5 s`,
  `barkMult 2.0 / barkDur 0.4 s / barkDecay 0.3 s`,
  `leanMult 1.2 / leanDur 1.5 s / leanDecay 0.5 s` (sensible ranges, all
  exposed — calibrate at the gate like `crushThreshold` was).
- **§1:** impulse envelope on the dog: `walk_on` received while
  `d.command === 'stand'` → don't leave stand; instead start an impulse
  `{ mult, dur, decay }`: intensity = posture ambient × `mult` (and the
  posture cone strength likewise) for `dur`, then linear decay over `decay`
  back to the stand profile. Impulses are re-triggerable (a new tap restarts
  the envelope). A walk-on when **not** standing behaves as P2's normal drive.
- **§3:** modifier keys select the flavor at issue time — plain **W** =
  shove, **Shift+W** = bark, **Alt+W** = lean (buttons: click / shift-click /
  alt-click on Walk On). The chosen flavor is passed to §1 via
  `setCommand('walk_on', { impulse: 'bark' })`-style payload — §1 owns the
  envelope, §3 only names the flavor.
- **§2 (small):** HUD shows the active impulse flavor while one is running
  (tuning needs to see it).

## Verify (measured)
- Stand at a jammed gate; tap walk-on: the dog's effective intensity traces
  the envelope (sample per tick: rise ≈ `shoveMult`, hold `shoveDur`, decay
  `shoveDecay`), front sheep gain forward velocity, some cross; dog is back
  at stand profile after the decay with `command === 'stand'`.
- The three flavors are **distinct in trace and effect**: bark's peak >
  shove's > lean's; lean's total impulse-time longest; bark visibly riskier
  (stress/panic spike near the gate).
- Rapid re-taps restart the envelope (no stacking beyond the mult).
- POC-v2 spot-check: A-rules idle metrics unchanged; no impulse path from
  heel (that'll-do first — a heel dog given walk-on just… drives, per v1).

## Done when
- [ ] Envelope + three flavors + modifier input wired; HUD shows the flavor.
- [ ] Measured traces match the schema shapes; gate rhythm works
      (stand → tap → trickle → stand).
- [ ] Zero console errors; §1 DOM-free (flavor named via setCommand payload).

## Gotchas
- `setCommand` grows an options argument — keep the old single-arg calls
  working (buttons, hotkeys, restartRun's `that_ll_do`).
- Impulse must scale the **posture profile**, not raw v1 intensity — else a
  bark from stand is weaker than plain walking (standBlock 2.2 × ambient).
- Shift/Alt browser quirks: use `ev.shiftKey`/`ev.altKey` on keydown, and
  `preventDefault` Alt so the browser menu doesn't steal focus.
