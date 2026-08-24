# The Force Model

The heart of the game. Sheep are **boids** with an added **flee** force from
dogs; dogs are **steering agents** whose target is set by the player's command.
Everything you described — compaction, splitting, stragglers, protests, bolting,
gate bottlenecks — is *emergent* from the rules below, not scripted.

All math is 2D `Vector2`. Integrate manually (don't hand sheep to a physics
engine — it will fight the steering and won't scale).

---

## Per-tick loop (fixed timestep `dt`)

For each sheep `i` with position `p_i`, velocity `v_i`:

1. Gather neighbors (topological: the `n` nearest; and/or metric: within a radius).
2. Accumulate acceleration `a_i = Σ_k w_k · F_k` (each `F_k` a steering vector).
3. `v_i ← clampLen((v_i + a_i·dt) · damping, v_max)`
4. `p_i ← p_i + v_i·dt`
5. Update facing = `normalize(v_i)`; pick anim by `|v_i|`.

Dogs run their own steering (see **Dog steering** below) in the same loop.

---

## The forces on a sheep

### 1. Separation — internal pressure, and why the blob can split
Repulsion from close neighbors, blowing up at short range so sheep never overlap:

```
F_sep = Σ_{j : |p_i−p_j| < r_sep}  (p_i − p_j) / |p_i − p_j|²
```

Inverse-square makes it a soft wall. This is what pushes back against
compaction and, under bad pressure, drives a **split**.

### 2. Cohesion — compaction, and re-forming
Attraction to the local center of mass of the `n` nearest neighbors
(**topological** — robust as density changes, which it constantly does here):

```
c_i   = mean(p_j) over the n nearest j        // n ≈ 10
F_coh = normalize(c_i − p_i)
```

### 3. Alignment — flow (keep this weak for sheep)
Steer toward neighbors' average heading. Sheep align *far* less than birds, so a
low weight:

```
F_align = normalize( mean(v_j) over j within r_align )
```

### 4. Flee — the crux (predator pressure / "eye")
For each dog `d` within `R_flee` of the sheep:

```
dir  = normalize(p_i − p_d)
dist = |p_i − p_d|
g    = falloff(dist)                 // 0 at edge → 1 at contact
T    = g · eyeFactor(d, i) · dogIntensity(d)
F_flee += dir · T
```

- **`falloff(dist)`** — a tunable "wall." Start with `smoothstep(R_flee, 0, dist)`
  or clamped `(R_flee/dist − 1)`. This controls how sharply pressure ramps as the
  dog closes.
- **`eyeFactor`** — models the stare-down (directional "eye"). Use the
  **ambient-cone hybrid**:
  `eyeFactor = ambient + (1 − ambient)·max(0, cos θ)^k`, where `θ` is the angle
  between the dog's facing and the direction to the sheep. `ambient` slides from
  `1.0` (pure radius, facing irrelevant) to `0.0` (pure cone); start `~0.2`,
  `k ≈ 2`. Full rationale, facing derivation, and multi-dog implications in
  [`threat-model.md`](./threat-model.md).
- **`dogIntensity`** — `1` normally, dropped (≈`0.3`) on **lie down** so pressure
  eases at bottlenecks.

### 5. Boldness gate — "brave sheep protest, then back down or bolt"
Each sheep carries `boldness b_i ∈ [0,1]` (randomized at spawn). Let
`T_total = Σ` threats from all dogs:

- `T_total < b_i·θ_hold` → sheep ignores the dog and grazes.
- Just below threshold → small chance of a **protest**: a brief step *toward* the
  dog (a stamp) before fleeing.
- Otherwise → flee normally. When `T_total` is high, a **panic multiplier** on
  `v_max` gives the sprint.

**Bolting past the dog** needs no special case: when a fleeing sheep's `F_flee`
points through a gap in the dog's coverage, it accelerates into the hole. The
panic multiplier just makes it dramatic — and, as you said, forces a come-by/away
to reset.

### 6. Grazing / wander (undisturbed behavior)
When no dog is near: a smoothed random walk + a weak pull toward good grass /
field center, at low speed. (Strömbom uses ~0.05 probability of moving per tick
while grazing.) Low weight.

**Superseded by the POC-v2 idle state** (spec:
`spec/POC-v2/flock-behavior.md`, rules A1–A8/B1–B2). As implemented, each sheep
runs an **idle ⇄ alert** state machine: threat flips it to alert instantly
(full boid behavior below); `calmDelay` seconds of zero threat settle it back
to idle, re-deriving its **group** from whoever settled nearby (size-capped
2–5). While **idle**:
- **cohesion is same-group only** (unbounded range — stragglers walk home;
  radius-gating orphans them, and any cross-group cohesion merges groups
  irreversibly and coalesces the field);
- **no alignment** — its normalized output turns any standing group's
  micro-drift into a perpetual ~`0.15·w_align·accelScale` glide (measured);
- **grazers** stand with occasional step-and-re-settle, **wanderers** (~12%)
  drift, all hard-capped at `idleSpeedCap`;
- **crowd dispersal** paces the post-release re-scatter: more than
  `crowdTolerance` strangers within `idleCohRadius` → drift away from the
  local crowd (no timers — they go stale);
- an **idle dog at heel exerts no pressure** (`heelIntensity 0`) and idle
  sheep softly avoid it (`dogAvoidRadius`/`w_avoid`) without flight.

### 7. Fence / boundary
Repulsion from the nearest wall within `r_fence` (inverse distance) plus a hard
position clamp at the boundary.

### 8. Inertia / damping
Velocity carries over; a `damping ≈ 0.9` factor per tick models friction. An
optional heading-inertia term (blend new accel with previous heading) mirrors
Strömbom's `h` term and smooths jitter.

---

## Grounding in Strömbom et al. 2014 (starting reference values)

Their discrete, heading-based shepherd model produces exactly this behavior with
a single shepherd. Published parameters (units = body-lengths / steps — adapt to
your world scale and `dt`):

| Symbol | Meaning | Value |
|---|---|---|
| `r_a` | agent–agent repulsion distance | `2` |
| `ρ_a` | strength of agent repulsion | `2` |
| `c`   | strength of attraction to local CoM | `1.05` |
| `R_s` | shepherd detection distance (sheep react within) | `65` |
| `ρ_s` | strength of repulsion from shepherd | `1` |
| `h`   | heading inertia | `0.5` |
| `e`   | angular noise | `0.3` |
| `δ`   | sheep step per tick | `1` |
| `δ_s` | shepherd step per tick | `1.5` (faster than sheep) |
| graze | prob. of moving while grazing | `0.05` |
| `f(N)`| "is the flock cohesive?" radius threshold | `r_a · N^(2/3)` |

`f(N)` is the trick behind **collect vs drive**: if every sheep is within
`f(N)` of the global center of mass (GCM), the flock is cohesive → *drive*;
otherwise → *collect* the furthest outlier first.

---

## Emergent behaviors → mechanism (design ↔ physics)

| You described | Comes from |
|---|---|
| **Compaction** | Dog pressure on the near side → inward flee → local density rises → cohesion + all-sides shrinking outpaces separation. Come-by's *moving* pressure point walks the whole blob across the field. |
| **Blob splits under bad pressure** | Pressure into the *middle* (or two dogs pinching) → flee vectors point opposite ways → two separate CoMs → cohesion splits the blob. This is "too much pressure at the wrong point." |
| **Stragglers collected** | The come-by/away arc passes *behind* outliers; their flee shoves them toward the mass; they rejoin once inside cohesion range. (= Strömbom **collect**.) |
| **Walk-on drives the herd** | Dog sits behind the blob on the blob→goal axis and creeps; steady low pressure moves the whole blob forward. (= Strömbom **drive**.) |
| **Gate bottleneck / accidents** | Many sheep + a narrow goal → separation vs forward pressure → pile-up; **lie down** cuts `dogIntensity` so the front trickles through. Overpressure here is a natural **failure/injury** hook. |
| **Protest, then back down or bolt** | The boldness gate + panic sprint + gaps in dog coverage. |

---

## Dog steering (command → target → seek)

> **⚠ Superseded by POC-v3** (2026-07-13,
> [dog-behavior](../implemented/POC-v3/dog-behavior.md) rules C/D/E):
> come-by/away are now moment-by-moment **flanking** around the flock edge
> (fence-seeking, 45° held eye, finite — auto-handoff to walk-on opposite the
> goal, C6), walk-on is a **trailing drive** (gap governor, never catches up,
> auto-stand on stall, pulsed impulses from stand), and **stand** joined as a
> 6th command (lie-down/stand = escalation pair of blocking postures). The
> table below is the POC-v1 model, kept for history.

The dog is a seek/arrive steering agent with obstacle avoidance. The **player's
command sets its target/behavior** — the player never touches a sheep.

Let `GCM` = flock centroid, `goal` = target pen.

| Command | Dog target / behavior |
|---|---|
| **Come by** | A point on an orbit circle of radius `R_orbit` around `GCM`; angle advances **clockwise** at rate `ω`. Keep standoff ≥ `R_orbit` so the dog stays *outside* the blob. Arrive-slow near the point. |
| **Away** | Same, **counter-clockwise**. |
| **Walk on** | A point on the line `GCM → goal`, at distance `R_drive` *behind* `GCM` (opposite the goal); `R_drive` shrinks slowly → creep in. Dog faces the herd. |
| **Lie down** | Target = current position (stop). `dogIntensity ↓`. Hold facing toward `GCM`. |
| **That'll do** | Target = owner position. Flee still applies en route until the dog exits `R_flee`. |

Multi-dog: each dog has its own command/target; saying a **dog's name** just
selects which dog the next command applies to.

**The whole game in one line:**
`player button → dog command → dog target → dog steering → dog position+facing → sheep flee → flock motion.`

### Post-POC-v3 refinements (owner, hands-on, 2026-07-14) — **both implemented in POC-v4**

Two observations against the shipped v3 dog — both now shipped as
[POC-v4](../implemented/POC-v4/dog-behavior.md) rules **F1** (R1) and **C7**
(R2), measured PASS at its P2 gate on 2026-08-21. They amend
[`dog-behavior.md`](../implemented/POC-v3/dog-behavior.md):

**R1 — the dog should start facing the sheep.** The dog spawns with
`facing: 0` (due east) regardless of where the flock is. Everywhere else
facing is *derived* (eye-on-flock by default —
[`threat-model.md`](./threat-model.md)); spawn is the one hardcoded spot.
The triangle and the eye-cone arc both render along `facing`, so the very
first frame shows a dog staring at nothing. No pressure consequence — at
spawn he idles at heel with `heelIntensity 0` (POC-v2) — this is pure
legibility, but it is the player's first read of "the dog watches the
sheep." Fix: initialize facing toward the flock GCM at spawn/reset. Should
land as a spawn-state rule alongside C1–C6.

**R2 — come-by/away should carry another ~90° before the walk-on handoff
(C6 amendment).** v3's C6 converts flank → drive as soon as the dog is on
station *opposite the target* — bearing from the GCM within
`flankHandoffDeg` (default 30°) of the goal→GCM line extended. Hands-on,
the flank reads as breaking off too soon; the owner wants the dog to keep
flanking **another 90°** past today's handoff point before settling into
the drive.

Why the early handoff can feel wrong (candidate reasoning — verify hands-on):

- The conversion window is a ±30° *cone*, so the dog can convert up to 30°
  **short of** true balance; add GCM drift during the flank and he may never
  visibly get "behind the sheep" before the strip flips to walk-on.
- Converting exactly at balance means the last quarter of the flock edge was
  never swept — outliers on that side are left for the drive to plow past
  instead of being tucked in by the passing 45° eye (the Strömbom *collect*
  is cut short).
- A quarter-turn of overshoot ends the flank with the dog wrapping *past*
  the pressure point and then trailing back in under the walk-on gap
  governor (E1) — an approach from the side-rear rather than a hard
  stop-and-push from dead astern.

**As shipped (POC-v4 P0/P1):** R1 became **F1** — `faceFlock()` derives the
dog's facing from the flock GCM at construction and after every reseed, and
the at-heel branch of `that'll do` keeps watching the flock (its per-tick
disengage facing would otherwise overwrite any spawn-only assignment); the
heeled eye is pressure-free at `heelIntensity 0`, so A7 holds. R2 became
**C7** — the `flankOvershootDeg` slider below, default 90°. One wrinkle worth
knowing when tuning: the handoff fires at the **near edge** of the station's
tolerance cone, so the effective carry ≈ `flankOvershootDeg −
flankHandoffDeg` (≈ 60° at defaults).

Mechanism sketch (as implemented): rotate the C6 handoff station by a new tunable
`flankOvershootDeg` (slider, start **90°**; `0` restores v3) further in the
flank direction — handoff fires when the dog's bearing from the GCM is
within `flankHandoffDeg` of `goal→GCM extended + sign · flankOvershootDeg`.
After conversion the walk-on trail governor walks him back behind the flock;
whether his side-on pressure during that return transit shoves the flock
off-line is exactly what hands-on tuning has to judge. Interpretation
question parked in the [README](./README.md#open-design-questions-parked).

### Post-POC-v5 refinements (owner, 2026-08-22) — **implemented in POC-v6**

**R3 — the flank follows the herd perimeter, to the gate line.** *(R3a,
Q38, 2026-08-22: the E1 governor's close / back-off rates are
`driveCloseRate` 25 / `driveBackoffRate` 40 px/s — no magic numbers left in
the drive — and easy scales both by `easySpeedFrac`, so the ⅓ pace holds
from the gate line, where the dog is already on the ring and the governor,
not `dogVMax`, paces him.)* The flank
point no longer rides a sector-max circle: it is the convex hull of the
working flock (now a §1 concept, `sim.hull`) offset outward by
`flankStandoff` — **since the owner's same-day touch-up 3, by
`perimeterMargin` (36 px): the dog runs the dotted outline itself,
`flankStandoff` is superseded, the fence-seek reach is `fenceSeekReach`
(72), and the `3·dt` ring-radius ease is gone (it cut 10–15 px inside a
36 px line)** — sampled by bearing from the GCM (`perimeterRadius(θ, r)` —
a bisection on distance-to-hull along the ray, which is monotone for a
convex set). Everything else in the flank loop (bearing advance, linear-speed
cap, fence-seek, field clamp, the 45° eye) is unchanged. The handoff is no
longer a ± cone: once the flank point's progress past the **gate line**
(`goal→GCM extended + sign · flankOvershootDeg`, default **0** now) lands in
`[0, flankHandoffDeg]` the point **parks** there (follows the station
forward, never backward; fence-seek off while parked), and the dog converts
**on arrival** (< 25 px, after the 0.5 s arm delay). Measured: v4's ± cone
fired at −29.6° (30° short) on every run; parked arrival lands at
+1.6…−13.5° of the live line with no laps.

*Touch-up:* the fence-seek pull now fades in over the outer `fenceSeekRamp`
(0.5) of its reach instead of switching on at the edge — the step had the
flank target jumping 160 px in a tick; and once the point parks on the gate
line the pull fades out over `parkFade` (0.5 s) instead of dropping at once
(43 px snap → 2 px).

**R4 — easy replaces stand.** `easy` is walk-on's trailing drive (same E1
gap governor, same forward eye) with top speed `dogVMax × easySpeedFrac`
(0.33). It is what the flank hands off to, what a stalled walk-on drops into
(E2), and what the E3 impulse fires from — the impulse now scales the drive
eye's `intensity` instead of a posture profile. Lie-down keeps the posture
wall alone; `standBlock` is superseded. Rationale: the owner wants the dog
between taps to be *inching forward*, not standing; "stand" as a firmer wall
never earned a distinct read in play.

---

## Tuning table (starting guesses — the PoC's job is to find the fun)

| Param | Start | Note |
|---|---|---|
| `r_sep` | 1.5 × bodyLen | high weight |
| cohesion `n` | 10 nearest | topological |
| `w_coh` | ~1 | medium |
| `r_align` | 3 × bodyLen | |
| `w_align` | ~0.2 | sheep align weakly |
| `R_flee` | 8–12 × bodyLen | high weight; `smoothstep` falloff |
| eye half-angle | ~60°, `k≈2` | if using the gaze cone |
| `boldness b_i` | ~N(0.3, 0.1) clamped | per-sheep variation |
| sheep `v_max` | — | dog `v_max` ≈ 1.5× sheep |
| `damping` | 0.9 | |
| `dt` | fixed 1/60 | |

None of these are sacred — bind them to sliders in the PoC and dial for feel.

---

## Integration & performance notes

- **Fixed-timestep accumulator** so physics is framerate-independent.
- **Neighbor lookup**: brute-force O(n²) is fine to ~50 agents; use a **spatial
  hash grid** (cell ≈ largest interaction radius) for 150+.
- Topological neighbors = partial sort for the `n` smallest distances.
- Everything is `Vector2`. No physics bodies — you own the integration.
