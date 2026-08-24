# POC-v4 · Feature: Dog Commands & Influence v3 — Semantic Rules

**Status:** **implemented 2026-08-21** — F1 and C7 measured PASS at the P2
gate (acceptance log below); still a **living rules list**. Q12's hands-on
read (return-transit drift) is the owner's, with the measured data logged.

Continues the dog rules from
[`../POC-v3/dog-behavior.md`](../POC-v3/dog-behavior.md)
(groups **C/D/E** live there; this spec keeps the lettering — **C continued**,
new group **F**). Observable behavior only; mechanism ideas stay in Design
notes. Source brainstorm:
[`../../brainstorming/force-model.md`](../../brainstorming/force-model.md)
→ "Post-POC-v3 refinements" (R1/R2, 2026-07-14).

This is a fnb side-project — **no fnb DB/GraphQL/backend**. Rules must be
implementable inside §1 SIM driven by §0 `params`/`SETTINGS`.

---

## Semantic rules

### C. Flanking commands — come-by / away (continued from POC-v3)

- **C7.** *(amends C6's handoff point; the flank stays finite)* The dog does
  **NOT** convert to walk-on at the spot opposite the target: he carries the
  flank **~90° further** around the flock past that spot, and only then
  transitions on his own into the walk-on drive — strip highlight follows,
  same actual-state convention as C6/E2. He still **never** completes a
  second lap. *(Owner, 2026-07-14, from hands-on play.)* ***Superseded
  2026-08-22 by POC-v6 C8/C9*** — the flank now ends **at** the gate line
  and hands off to *easy*; `flankOvershootDeg` stays as a dial (default 0).
  See [`../POC-v6/dog-behavior.md`](../POC-v6/dog-behavior.md).

*(room to grow)*

### F. Spawn & reset posture

- **F1.** At sim start and on every reset, the dog **faces the flock**: the
  body and eye-cone arc read as watching the sheep from the **very first
  frame** — never staring at a fence or empty field. *(Owner, 2026-07-14.)*

*(room to grow)*

---

## Design notes (light — planning will refine the "how")

- **F1 is one initialization, not a behavior change.** Facing is already
  *derived* everywhere (eye-on-flock —
  [`threat-model.md`](../../brainstorming/threat-model.md)); spawn is the one
  hardcoded spot (`facing: 0`, due east). Initialize toward the flock GCM at
  spawn/reset. No pressure consequence — the heeled dog exerts none
  (`heelIntensity 0`, POC-v2) — this is pure legibility.
- **C7 rotates the C6 handoff station, nothing else.** Keep the existing C6
  test (0.5 s arm delay, on-station proximity, `flankHandoffDeg` tolerance
  cone) but aim it at `goal→GCM extended + sign · overshoot` instead of the
  balance point itself. After conversion, the walk-on trail-gap governor (E1)
  walks the dog back behind the flock from ~90° off-axis — whether his
  side-on pressure during that return transit shoves the flock off-line is
  the thing hands-on tuning must judge (Q12).
- Rationale candidates for why balance-point handoff felt early (verify
  hands-on): the ±tolerance cone lets the dog convert up to 30° *short* of
  balance; the last quarter of the flock edge is never swept by the passing
  45° eye (Strömbom *collect* cut short); overshoot-then-trail-back
  approaches from the side-rear instead of stopping dead astern.

## Tunables likely involved

Existing: `flankHandoffDeg` (tolerance cone, unchanged), `flankStandoff`,
`flankConeDeg`, `R_drive` (walk-on return target).
Likely **new** (name TBD in planning): flank overshoot angle — slider, start
**90°**, `0` restores POC-v3 behavior (working name `flankOvershootDeg`).
F1 needs **no tunable** (initialization only).

---

## Open questions (parked — for the owner; defaults in **bold**)

Numbering continues from POC-v3's dog spec (…Q10).

11. ~~**C7 interpretation:**~~ **Resolved** (owner, 2026-07-14, planned on
    the default) → the handoff *station* moves 90° past the balance point in
    the flank direction, as the overshoot slider (start **90°**, 0 = v3);
    not an extra-sweep requirement.
12. **Return-transit pressure** — plan proceeds on the default (**no special
    case first**; the E1 trail-gap governor is trusted): while the dog trails
    back behind the flock after the late handoff, does his side-on eye need
    damping to keep the flock on-line? P1/P2 log the measured lateral drift;
    the owner judges hands-on.

---

## Acceptance (for the rules so far)

**F1:** load the page fresh (several seeds) and on each reset: before any
command, the dog's triangle and eye-cone arc point **toward the flock**, not
due east or at a fence. Falsified by any seed where the t=0 dog faces away.

**C7:** rerun POC-v3's C6 acceptance scenario (single come-by with the flock
between dog and gate): the dog **passes** the point opposite the gate without
converting, carries the flank **~90° more** of sweep, then drops into walk-on
**without another command** — strip highlight follows, no second lap ever.
With the overshoot slider at **0**, the POC-v3 balance-point handoff returns
exactly.

---

## Acceptance log — P2 gate, 2026-08-21 (seeds 1337 & 42 unless noted)

Measured **headless in Node**, per the owner's no-webserver rule: the §0+§1
slice of `sheep-poc.html` extracted by its section markers (invariant #3 is
what makes that possible), an inert stub for §0's lil-gui wiring, driven at
`dt = 1/60` through `sim.step()`. Scenario: 0.5 s of idle, then the command,
at shipped defaults (`flankOvershootDeg` 90, `flankHandoffDeg` 30).

**F1 — PASS.** Seven seeds (1337 / 42 / 7 / 99 / 2026 / 555 / 8888), boot
**and** in-place reseed → 14 init-path measurements, facing-vs-GCM **0.000°**
every time. After 120 ticks at heel the error is **0.000–0.003°** (facing
tracks the GCM's drift) at `heelIntensity 0` — the watching eye stays
pressure-free, so A7 is intact.

**C7 — PASS.** The dog sits **armed and on-station inside the OLD balance
cone without converting** — the thing v3 could not do — and hands off past it:

| seed · command | armed in old cone (ticks) | carry past balance | sweep | → state |
|---|---|---|---|---|
| 1337 · come-by | 185 / 369 (3.1 s) | **+60.4°** | 257° | walk_on |
| 1337 · away | 198 / 380 (3.3 s) | **+85.8°** | 252° | walk_on |
| 42 · come-by | 197 / 320 (3.3 s) | **+60.3°** | 267° | walk_on |
| 42 · away | 124 / 304 (2.1 s) | **+60.3°** | 223° | walk_on |

Every carry is inside the ±`flankHandoffDeg` (30°) tolerance of the 90°
station; every sweep is far short of a second lap (360° + overshoot); the
state flips to `walk_on` with **no player input**, so the strip follows (Q5).
Carries cluster at ≈ +60° because the handoff fires at the station cone's
**near edge** — effective carry ≈ `overshoot − handoffTol` (the same edge
effect that let v3 convert up to 30° *short* of balance).

**⚠ Owner decision, not a tuning footnote:** the *phase* passes as written
(within ±30° of the 90° station), but the *rule* C7 says "~90° further" and
the dog ships carrying **~60°** on 3 of 4 runs. Whether 60° reads as "another
90°" in play is the owner's hands-on call; if not, it is a defaults change
(`flankOvershootDeg` ~120, or `flankHandoffDeg` ~15), not a code change —
and it should be settled **before** POC-v5 freezes the shipped defaults into
the lever model's 0.5 anchor.

**Overshoot 0 → v3 parity — PASS.** Same seeds: come-by converts at
**+5.0° / +9.4°** past balance with sweeps **201° / 215°** — seed 1337
reproduces v3 P4's measured 201° exactly; away converts at **−29.8°** (the
tolerance-edge firing v3 also showed, cf. its −15.6°). The param safety net
agrees: `params-2026-08-21-v4.json` differs from `params-2026-07-13-v3.json`
by **exactly one key** (`flankOvershootDeg`), nothing else drifted.

**Q12 — data logged, not gated** (owner's hands-on call). Peak lateral GCM
displacement off the flock's handoff→goal line over the first 20 s of drive:
**16.0 / 23.1 / 32.1 / 43.6 px** at overshoot 90 vs **10.4 / 22.1 / 23.4 /
23.8 px** at 0, against a flock mean radius ≈ 185 px. The overshoot costs at
most ~20 px of extra drift — the locked "no special case first" default looks
safe, and the E1 governor holds the gap throughout (below).

**Regressions — all hold.**

| Rule | Measured | Reference |
|---|---|---|
| C1 no orbit | dog radius-from-GCM **sd 69.7–107.4 px** over the flank | v3: 113 / 45 px (fixed orbit ≈ 0) |
| C3 eye | mean **44.9–45.0°** off travel | 45° slider |
| C inward push | **+13.2 / +12.1 px/s** toward the GCM (4.0k / 9.8k stressed in-reach samples); **identical at overshoot 0** → untouched by C7 | v3: +19.5 / +17.6 (different sampling) |
| C4/C5 reversal | away issued 4 s into a come-by is **pure CCW** at 4 seeds: 148 / 190 / 142 / 309° CCW vs 0 / 0 / 0 / 15° CW. Issued at 8 s (dog already at the fence), seed 1337 read **37° CCW vs 27° CW** — mixed; probably bearing-from-a-moving-GCM while the dog sits at 15 px from the wall, but **not verified** | v3: 166° CCW vs 1° CW |
| E1 trail gap | min front-hemisphere gap **38.6 / 38.9 px** over the full drive, **0.00 s** below the 35 px (gap−5) line | v3: 47 / 40 px |
| E2 auto-stand | manufactured jam (80 sheep, 12 px mouth): walk_on → stand at **7.6 s / 16.8 s**, nearest driven sheep 53 / 57 px, strip follows | v3: t ≈ 23 s, 59 px |
| D1/D3 wall | flock jammed against the posture 120 s: **55 / 15** sheep visited the covered arc, **crossings 4 (lie) / 2 (stand)** at seed 1337 and **0 / 0** at seed 42. **Not comparable to v3** — a different jam rig (state-poked 9-wide rows at a 12 px mouth; v3's exact setup is not recorded). The no-regression claim for D rests on the **diff**, which does not touch posture code, not on this measurement | v3: 12–14 visited, 0 crossed |
| A1/A4 idle | still-frac **1.00 → 1.00** over 30 s; mean dist-GCM 185.4 → 187.1 and 139.9 → 134.8 px | v3/v4-P0: 185 → 187 |
| B1/B2 | 45 s of pressure drops the idle count **80 → 60 / 71**; 120 s of calm after *that'll do* re-scatters, dist-GCM **174 → 198 / 142 → 175 px** | qualitative in v2 |

D's crossings are consistent with D1 (crossing under *backpressure from the
flock* is permitted, and a jam at a 12 px mouth is that), and the leak
ordering (lie-down 4 > stand 2) matches lie < stand — but with one seed and a
fresh rig this is a **hint, not a measurement** of the ordering.

**⚠ Watch item — not reproduced, not cleared.** P1's `away @ 90` E1
transit dip (27.6 px vs the 35 px line) did **not** reproduce under P2's
scenario: min front gap over the same 20 s return transit is **37.0–38.9 px**
on both seeds and both commands. The scenarios differ — P1 commanded **from
spawn**, P2 after **0.5 s of idle** — so the dip is scenario-dependent, and a
command issued the instant the run starts may still produce it. Owner's
hands-on read.

**File:// invariants (static, since the sim ran headless).** §0–§4 parse
clean; the only external references are the lil-gui CDN and
`sheep-defaults.json.js`; the defaults file is a single
`const SHEEP_DEFAULTS =` with 101 keys, **none unknown** to the schema (so the
typo-guard warning cannot fire); the root `index.html` /
`sheep-defaults.json.js` mirrors are byte-identical to `poc/`. The live
console check on a double-clicked `file://` page is the **owner's eyeball**,
per the no-webserver rule.

**Carried forward to v5** (not in v4's scope): v3's `setCommand` stale
`dog.target` one-tick leak, walk-on parking with `fwdN 0`, `crushThreshold`
re-calibration post-G1, POC-v2 Q8 (80-sheep gather ceiling — a 90 s scripted
come-by→drive still pens 0 of 80 here), D2 dart sighting, and Q12's hands-on
verdict.
