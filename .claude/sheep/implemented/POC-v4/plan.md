# POC-v4 Build — Master Plan & Runner

Fourth iteration: **Dog Commands & Influence v3** — the dog spawns facing the
flock (**F1**) and come-by/away carry **~90° past the balance point** before
the walk-on handoff (**C7**, amending POC-v3's C6). Spec:
[dog-behavior.md](./dog-behavior.md). Owner proceeded to plan 2026-07-14 with
**Q11/Q12 on their bolded defaults** (handoff *station* rotated by a new
overshoot slider, start 90°; no return-transit damping special case — P1
measures the transit instead).

Small version by design: two rules, three phases.

---

## ▶ Invocation — how to run this plan

**Trigger:** `/sheep implement POC-v4`, "run the v4 plan", "run phase N".

1. Find the **first unchecked phase** below (or the requested one; its
   prerequisite must be ticked).
2. Follow that phase file exactly — implement its Tasks in
   `.claude/sheep/poc/sheep-poc.html` (+ `sheep-defaults.json.js` where a
   schema entry changes), run its Verify (measured, per the `/sheep verify`
   playbook — serve over localhost HTTP, fast-forward with `sim.step()`
   loops, metrics per rule ID).
3. On acceptance: tick the phase here, **STOP, and report**. Wait for
   go-ahead. ("Run all phases" → continue, reporting at each gate; halt on
   any Verify failure.)
4. After the last phase: run the Definition of done, move `spec/POC-v4/` →
   `implemented/POC-v4/`, mark the feature `implemented`.

**Target file:** `.claude/sheep/poc/sheep-poc.html`.

## Global invariants (every phase)

Same as POC-v3's plan:

- One HTML file + one defaults file (`sheep-defaults.json.js`, pure JSON
  literal in a single `const SHEEP_DEFAULTS =`); plain `<script>`; runs from
  `file://`; lil-gui UMD via CDN.
- New tunables enter as **`SETTINGS` schema entries** (slider, tooltip,
  ⓘ-grid row for free).
- **§1 SIM stays DOM-free**; fixed `dt = 1/60` with accumulator.
- **POC-v2 A/B and POC-v3 C/D/E rules must not regress** — every phase
  spot-checks the idle field (A1/A4 quick metrics) and that flanking (C1–C5),
  postures (D1/D3), and the drive (E1–E2) still read right.
- **Command-strip highlight = the dog's actual state** (v3 Q5 convention).
- Every phase leaves the page runnable, zero console errors.

## Section map (of `sheep-poc.html`)

`§0 PARAMS` (SETTINGS schema + params) · `§1 SIM` (DOM-free; Sim class,
stepDog, flock forces) · `§2 RENDER` (canvas draw, debug overlays) ·
`§3 INPUT` (command strip, hotkeys, modifiers) · `§4 BOOTSTRAP` (loop, GUI
wiring, defaults-file load).

## Phases

| # | File | Goal | Proves |
|---|---|---|---|
| 0 | [phase-0-spawn-facing.md](./phase-0-spawn-facing.md) | dog spawns/resets facing the flock GCM | F1 |
| 1 | [phase-1-flank-overshoot.md](./phase-1-flank-overshoot.md) | C6 handoff station rotated `flankOvershootDeg` (90°) past balance; slider, 0 = v3 | C7 |
| 2 | [phase-2-acceptance.md](./phase-2-acceptance.md) | **runs LAST** — F1/C7 acceptance at two seeds, v2/v3 regression spot-checks, docs/params sync | version DoD |

## Progress tracker

- [x] Phase 0 — Spawn facing (F1) (2026-07-14; facing-vs-GCM 0.000° at boot
  + 5 reseeds [init path], 0.003° after 120 ticks at heel, heel intensity 0,
  idle A1/A4 flat [still 1.0, dist-GCM 186.5→187.6/10 s], console clean.
  As-built: at-heel branch of `that_ll_do` now faces the flock — the per-tick
  disengage facing overwrote any spawn-only init; en-route disengage kept)
- [x] Phase 1 — Flank overshoot (C7) (2026-07-14; measured headless in Node
  [§0+§1 slice, no webserver per owner], seeds 1337/42: dog crosses the old
  balance cone armed ~3 s without converting, hands off at +60.3°/+60.5°
  (come-by) / +83.9° (away) past balance — within ±30° of the 90° station —
  sweep 251–263°, no second lap; overshoot 0 → balance-cone conversion
  (+4.1°/−15.6°, v3 semantics); eye 45°, idle flat; Q12 lateral drift 7.6–28.4
  px vs 16–17.6 baseline. Notes: handoff fires at the station cone's NEAR
  edge → effective carry ≈ overshoot − tolerance; ⚠ E1 transit dip 27.6 px
  on away@90 logged as watch item for P2/owner)
- [x] Phase 2 — Acceptance & sync (2026-08-21; measured headless in Node per
  the no-webserver rule. F1 0.000° over 7 seeds × boot+reseed; C7 hands off at
  +60.3…+85.8° past balance after sitting armed in the OLD balance cone
  2.1–3.3 s, sweeps 223–267°, no second lap, strip follows; overshoot 0 →
  +5.0/+9.4° come-by with 201°/215° sweep (seed 1337 = v3's 201° exactly).
  v2/v3 spot-checks all hold — E1 min gap 38.6/38.9 px vs the 35 px line,
  0.00 s below; E2 jam auto-stand 7.6/16.8 s; postures 0–4 crossings under
  backpressure; idle still-frac 1.00, A4 flat. Q12 logged: 16–43.6 px peak
  lateral drift @90 vs 10.4–23.8 @0. P1's away@90 transit dip did not
  reproduce under P2's settled-start scenario (min 37.0 px) — scenario-
  dependent, NOT cleared. ⚠ Owner call pending: measured carry is ~60°, the
  C7 rule says ~90° (cone-edge effect). Docs + Appendix A.2 +
  `params-2026-08-21-v4.json` synced; `file://` console check is the owner's)

## Definition of done (whole version) — **4 of 5 met 2026-08-21**; item 5 (live `file://` console) awaits the owner's hands-on check

1. **F1/C7 acceptance passes, measured** (dog-behavior.md → Acceptance):
   F1 over ≥5 seeds + resets; C7 on the reversed come-by scenario at two
   seeds, including the **overshoot-0 → v3-parity** check.
2. **No regressions**: POC-v3 C/D/E spot-checks (no orbit, eye ≈45°, E1
   trail gap, E2 auto-stand) and POC-v2 A/B idle-field metrics hold.
3. **Q12 data logged**: flock lateral displacement off the goal line during
   the dog's return transit, reported for the owner's hands-on read (no
   threshold — the default is "no special case first").
4. Docs synced: brainstorming `force-model.md` R1/R2 marked implemented,
   README open-question entry resolved-struck, settings Appendix A delta for
   the new slider; dated params snapshot in the `sheep-defaults.json.js`
   format.
5. Zero console errors from `file://` (HTML + defaults file only).
