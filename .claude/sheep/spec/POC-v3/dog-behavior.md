# POC-v3 · Feature: Dog Commands & Influence v2 — Semantic Rules

**Status:** reviewed 2026-07-13 — all seven open questions resolved by owner
(Q1 direction: tradition kept, come-by = CW); **living rules list**.
Ready to plan.

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

## Tunables likely involved

Existing: `R_orbit`→(superseded), `omega`→(superseded), `R_drive`,
`R_driveMin`, `driveShrink`→(superseded), `lieDownIntensity`, `ambient`,
`coneK`, `boldnessTheta`, `panicThreshold`.
Likely **new** (names TBD in planning): flank standoff, flank cone angle
(slider, start 45° — Q3), fence-seek bias, flank advance rate, lie-down block
strength / cone tightness, stand block strength / cone tightness, dart
boldness threshold (~0.8 — Q4), drive trail gap, stall threshold, and the
three impulse shapes (strength + duration + decay each — Q6).

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

---

## Acceptance (for the C/D/E rules so far)

**C — flanking:** issue come-by on the scattered 80-sheep field: the dog does
NOT trace a circle around the GCM; he makes for the fence side beyond the
nearest sheep and works around the flock edge, eye held ~45° off his line of
travel toward the flock; passed sheep push inward, not straight away. Reverse
with away mid-field: he keeps a flanking standoff without needing a fence.

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
