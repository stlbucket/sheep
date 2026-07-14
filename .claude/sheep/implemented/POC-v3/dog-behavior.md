# POC-v3 · Feature: Dog Commands & Influence v2 — Semantic Rules

**Status:** **implemented 2026-07-13** — C/D/E measured at the P4 acceptance
gate (log below); still a **living rules list**. D2's dart event and POC-v2
Q8 await the owner's hands-on read.

Semantic rules for how the **dog** behaves per command and how its influence
cone reads to the flock — observable behavior, stated independently of the
steering math. Sibling to
[`../../implemented/POC-v2/flock-behavior.md`](../../implemented/POC-v2/flock-behavior.md)
(rule groups A/B live there; this spec continues the lettering with **C/D/E**).

This is a fnb side-project — **no fnb DB/GraphQL/backend**. Rules must be
implementable inside §1 SIM driven by §0 `params`/`SETTINGS`.

Related: current command steering lives in
[`../../brainstorming/force-model.md`](../../brainstorming/force-model.md)
(Dog steering table — this spec supersedes its come-by/away/walk-on rows);
threat cone model in [`../../brainstorming/threat-model.md`](../../brainstorming/threat-model.md).

---

## Setting changes

- **`dogVMax` gets a slider.** The dog's top speed exists (`dogVMax`, default
  135 px/s ≈ 1.5× sheep) but is **hidden** (`exposed: false`) — which is why
  the owner sees no obvious speed slider. Expose it, and **lower the default**:
  the dog currently reads as **too fast** (owner, 2026-07-13). New default
  parked as Q8.

## Semantic rules

### C. Flanking commands — come-by / away

- **C1.** Come-by does **NOT** put the dog on a circular orbit. He runs a
  **flanking path** around the flock, recalculated moment-by-moment, in the
  **clockwise** direction. *(Q1 resolved by owner 2026-07-13: traditional
  trial convention kept — come-bye = clockwise, bird's-eye — matching v1.)*
- **C2.** The dog seeks to flank **between the sheep and the fence**: in a
  fully distributed field he **heads for the closest fence**, starting to
  round up the **closest sheep**.
- **C3.** While flanking, the dog's **influence cone is held at ~45°** between
  his line of travel and the **perpendicular toward the flock**, calculated
  moment-by-moment — the sideways "eye" of a flanking dog, pushing sheep
  inward as he passes rather than straight ahead.
- **C4.** When the sheep are **far from any fence** (e.g. the dog gets an
  *away* while mid-field on a come-by), he keeps a **flanking distance** from
  the flock with the same 45° cone — fence-hugging is opportunistic, not a
  precondition for flanking.
- **C5.** **Away** is the same flanking behavior in the **counter-clockwise**
  direction.
- **C6.** A flank is **finite**: the dog circles the flock **only until** he
  reaches the fence at the spot from which pushing the flock heads it **back
  toward the target** (the gate) — there he **transitions on his own into a
  walk-on posture** and drives. Come-by/away ends in a drive, **NOT** an
  endless orbit; the command-strip highlight follows to walk-on (same
  actual-state convention as E2/Q5). *(Added 2026-07-13 from hands-on play,
  after P0–P3.)*

### D. Stationary pressure — lie-down / stand

- **D1.** **Lie-down's influence cone has more effect than today**: sheep do
  **not approach or cross** the covered arc unless **backpressure from the
  flock** pushes them through — the lying dog reads as a soft one-way gate.
- **D2.** **Super-adventurous sheep** (boldness > **~0.8** — the top tail,
  roughly 0–2 sheep per 80; Q4) may occasionally **dart around** a lying dog —
  rare, individual, dramatic.
- **D3.** **Stand** is a **new command**: like lie-down but with an even
  **stronger** cone effect — the firmer version of the same posture.
  Blocking strength reads as: lie-down < stand. *(Q2: joins the strip as the
  6th command, own button + hotkey — lie-down and stand coexist as an
  escalation pair.)*

### E. Walk-on — the drive

- **E1.** The dog **never catches up** to the sheep: while they move, he
  trails at a driving distance behind them.
- **E2.** If the sheep **stop due to backpressure** (pile-up at the gate,
  crowd ahead), the dog **naturally converts to a stand** — no player input;
  the **command-strip highlight follows** to stand (Q5): the strip shows the
  dog's actual state, and tapping walk-on from there is the E3 impulse.
- **E3.** An **additional walk-on command while auto-standing** delivers a
  **brief influence impulse** — a pulse of pressure — followed by a **rapid
  return to stand**. Pulsed walk-on is the gate-working rhythm. *(Q6: three
  impulse flavors — plain tap = **standard shove** (~1.5× for ~0.8 s, ~0.5 s
  decay, the default); **modifier keys** select the variants: a **bark**
  (~2× for ~0.4 s — punchier, riskier) and a **lean** (~1.2× for ~1.5 s —
  calmer, slower). All three shapes slider-tunable.)*

*(room to grow — owner is adding more rules here)*

---

## Design notes (light — planning will refine the "how")

- **C1/C2 is manual Strömbom "collect."** Flank target ≈ a point on the
  far side of the *nearest un-gathered sheep*, biased toward the fence line;
  advancing that target around the flock replaces the fixed `R_orbit`/`omega`
  orbit around the GCM. This (plus E-rules) is likely the real answer to
  POC-v2's **open Q8** (80-sheep drive stall).
- **C3 decouples facing from seek direction.** Today `facing` locks on the
  GCM; flanking needs `facing = travel heading ± 45°, rotated toward the
  flock` (sign by flank direction), recomputed per tick. The ambient-cone eye
  model is unchanged — only where it points.
- **D1/D3 are directional walls, not bigger radii.** "More cone effect" ≈
  intensity concentrated in the cone (higher `coneK`, lower `ambient`, higher
  in-cone strength) so the covered arc blocks hard while the flanks stay
  passable — which is exactly what D2's darting needs. Stand = same shape,
  higher strength.
- **D2 should stay emergent**: boldness gate + gap-seeking already produce
  bolting; tuning must keep a visible dart rate for the boldest sheep rather
  than suppressing it.
- **E1 wants a speed/standoff governor**, not pathing: cap the dog's approach
  so the gap to the nearest driven sheep never closes below a trail distance
  (`R_driveMin` exists; the governor replaces `driveShrink`'s creep-forever).
- **E2 stall detection**: flock-ahead forward speed ≈ 0 while backpressure
  (crush/fwdPush) > 0 → auto-transition `walk_on → stand`.
- **E3 impulse**: temporary intensity (and/or cone strength) boost with fast
  decay (~1 s), then stand. Repeatable — the player taps walk-on to meter
  pressure at the gate.
- **C6 is a handoff condition on the P0 flank loop**, not a new movement mode:
  each tick, test whether the dog's current spot is (a) fence-side of the
  flock and (b) roughly opposite the target through the flock (flock GCM
  between dog and target, within a tolerance angle). When both hold, exit
  flank → enter the existing walk-on state (P2 machinery: trail gap, stall,
  auto-stand all apply). The tolerance angle is the new tunable; too tight
  and the dog orbits past the handoff point forever, too loose and he cuts
  the flank short.

## Tunables likely involved

Existing: `R_orbit`→(superseded), `omega`→(superseded), `R_drive`,
`R_driveMin`, `driveShrink`→(superseded), `lieDownIntensity`, `ambient`,
`coneK`, `boldnessTheta`, `panicThreshold`.
Likely **new** (names TBD in planning): flank standoff, flank cone angle
(slider, start 45° — Q3), fence-seek bias, flank advance rate, lie-down block
strength / cone tightness, stand block strength / cone tightness, dart
boldness threshold (~0.8 — Q4), drive trail gap, stall threshold, and the
three impulse shapes (strength + duration + decay each — Q6).
Added 2026-07-13 (C6 + setting change): `dogVMax` (exists, hidden → becomes a
slider with a lower default — Q8), flank→drive handoff tolerance angle
(name TBD).

---

## Open questions (parked — for the owner; defaults in **bold**)

1. ~~**⚠ Direction assignment.**~~ **Resolved** (owner, 2026-07-13) →
   **tradition kept: come-by = clockwise, away = counter-clockwise**
   (bird's-eye), matching v1 and the brainstorming docs; the owner's original
   note was a frame slip. Folded into C1/C5.
2. ~~**Stand: 6th command or replacement?**~~ **Resolved** → **6th command**,
   own button + hotkey; lie-down/stand coexist as an escalation pair. → D3.
3. ~~**45° fixed or slider?**~~ **Resolved** → **slider**, start 45°. → tunables.
4. ~~**"Super-adventurous" threshold?**~~ **Resolved** → **boldness > ~0.8**. → D2.
5. ~~**Auto-stand visibility?**~~ **Resolved** → **yes**, the command strip
   follows the dog's actual state. → E2.
6. ~~**Impulse shape?**~~ **Resolved** → **standard shove by default
   (~1.5×/0.8 s), with modifier keys selecting a bark (~2×/0.4 s) or a lean
   (~1.2×/1.5 s)**; all tunable, calibrated at the gate. → E3.
7. ~~**Does v3 close POC-v2 open Q8?**~~ **Resolved** → **yes, re-measure**:
   v3 acceptance includes the measured 80-sheep full-field gather-and-drive;
   Q8 closes if it now works with reasonable effort.

### New (added 2026-07-13, with C6 / the `dogVMax` change)

8. **How slow should the dog be?** "Not so fast" needs a number. (Guess:
   default **135 → ~110 px/s** (~1.2× sheep `vMax` 90) — he must still be
   able to head a fleeing sheep, so staying above 1× matters; **tune
   hands-on** with the new slider.)
9. **C6 handoff tolerance:** how exactly "opposite the target" must the dog
   be before the flank converts to a drive? (Guess: within **~±30°** of the
   target–GCM line, exposed as a slider.)
10. **C6 with no fence nearby** (mid-field flock, C4 case): does the flank
    still convert once the dog is opposite the target, fence or not?
    (Guess: **yes** — "reaches the fence" is the usual case, but the real
    condition is *positioned to drive toward the target*; fence contact is
    not required.)

---

## Acceptance (for the C/D/E rules so far)

**C — flanking:** issue come-by on the scattered 80-sheep field: the dog does
NOT trace a circle around the GCM; he makes for the fence side beyond the
nearest sheep and works around the flock edge, eye held ~45° off his line of
travel toward the flock; passed sheep push inward, not straight away. Reverse
with away mid-field: he keeps a flanking standoff without needing a fence.
**C6:** issue a single come-by with the flock between dog and gate reversed:
the dog rounds the flock and, on reaching the far (fence) side opposite the
gate, drops into walk-on **without another command** — strip highlight shows
walk-on; he never completes a second lap.

**D — blocking:** park the dog lying between flock and gate: sheep visibly
refuse to cross the covered arc, squeezing through only under backpressure;
over a few minutes at least one high-boldness sheep darts around. Repeat with
stand: crossings under backpressure drop further.

**E — drive:** walk-on behind a moving group: the gap between dog and rear
sheep never closes below the trail distance. Jam the flock at the gate: the
dog auto-converts to stand (strip highlight follows). Tap walk-on: a visible
pressure pulse moves the front sheep through, then the dog is standing again;
modifier-tap variants read punchier (bark) and gentler (lean).

**Q8 closure (from POC-v2):** re-run the measured 80-sheep full-field
gather-and-drive with the new commands — it should now complete with
reasonable effort (flanking collect + trailing drive + pulsed gate work).

---

## Acceptance log — P4 gate, 2026-07-13 (perimeter-gate course, seeds 1337 & 42)

All measured in-browser per the `/sheep verify` playbook, at shipped defaults
(including the P4 boldness recalibration — see D2 note).

**C — flanking: PASS.** No orbit: dog-radius-from-GCM sd **113 / 45 px** over
the flank (a fixed orbit would be ~0). Fence-hugging: min wall distance
**15 px** (the seek clamp) on both seeds. Eye: mean **45.1° / 44.9°** off the
travel line vs the 45° slider (C3). Passed sheep push inward: mean velocity
toward GCM **+19.5 / +17.6 px/s** over 1.9k/6.6k stressed samples. Mid-field
away reversal: pure CCW (166° CCW vs 1° CW), min transit gap 48 px, no fence
needed (C4/C5). **C6:** come-by auto-converts to walk-on at **201° / 268°**
of sweep (18.3 s / 10.4 s) — no second lap, strip follows.

**D — postures: PASS with one item parked.** Behavioral wall (80 sheep
pressed against the posture at a jam, 180 s per posture): **12–14 sheep
visited the covered arc, 0 crossed** — for both lie and stand (D1). The
lie < stand ordering rests on P1's measured threat profile (front wall 0.609
vs 0.942, flanks 0.025). **D2 parked for hands-on:** the P4 gate found
boldness was drawn gauss(0.3, **0.1**) — boldness > 0.8 was a 5σ event, the
"0–2 per 80" top tail could never exist. Fixed by promoting the draw to
schema tunables (`boldMean` 0.3, `boldSd` **0.22** → measured census 1/0/1/0/0
per 80 across five seeds). The dart event itself was still not observed in
~13 min of automated posture scenarios (the bold sheep never came within
R_flee of the posturing dog) — it is rare-by-design; owner judges live.

**E — drive: PASS.** E1: min front-hemisphere gap **47 / 40 px** vs the 40 px
trail gap over full drives, **zero** time below gap−5 (P5's transit-dip watch
item resolved). E2: zero false auto-stands in open-field drives on both
seeds; a manufactured jam (80 sheep, 12 px mouth) auto-converted at t≈23 s
with the nearest driven sheep at 59 px, and the **command strip followed to
stand** (state-driven, Q5). E3 envelopes at the schema shapes: shove
**1.5×/0.80 s/0.48 s**, bark **2.0×/0.40 s/0.28 s**, lean
**1.2×/1.50 s/0.47 s**; double-tap does not stack (peak stays 2.0×).

**Q8: STAYS OPEN with data** — see the full entry in
[`flock-behavior.md`](../POC-v2/flock-behavior.md) open Q8: 20-sheep runs
complete in 28–45 s with 1–3 commands, but scripted 600 s budgets at 80 sheep
ended 7/80 and 3/80 — one dog cannot compact the full scattered field before
it relaxes. Owner's hands-on judgment pending.

**Follow-ups logged for v4:** `setCommand` leaves the previous command's
`dog.target` for one tick (butterfly nondeterminism between back-to-back
scripted runs); walk-on with no sheep in the front hemisphere parks silently
(`fwdN 0` starves E2) — a "regather" behavior or HUD hint may be wanted;
crush now peaks ~0.6–1.3 vs 3–3.9 pre-G1 (the funnel drains jams), so
`crushThreshold` 1.5 needs re-calibration if injuries are re-enabled.
