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

## Verify (measured 2026-07-13 — PASS)
- **Envelope traces** sampled per tick match the schema exactly: shove
  1.5×/0.8 s hold/0.5 s linear decay; bark 2.0×/0.4 s/0.3 s; lean
  1.2×/1.5 s/0.5 s. Peaks ordered bark > shove > lean; lean longest.
- **Re-taps restart, never stack** (max factor 1.5 after a mid-envelope re-tap).
- **Gate rhythm end-to-end** (12 px gate — narrower than a sheep): jam →
  auto-stand at 5.9 s (4 penned) → 5 taps, every one fired from a genuine
  re-stand, +1 through the near-impassable bottleneck, pressure cycling
  visibly, ending in walk-on via the smart return.
- **Modifiers:** Shift+W from stand fires a *bark* impulse, dog stays
  standing; buttons accept shift/alt-click via the same path.
- Zero console errors.

## As-built addition (2026-07-13)
- **Motion-aware smart return:** at envelope end the dog resumes `walk_on` if
  the crowd ahead is *moving* goal-ward (the shove worked — keep them
  walking) or gone; he stays standing only while the jam persists. A pure
  distance test dead-locked the drive: with any crowd near, walk-on could
  never be re-entered from stand at all.

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
