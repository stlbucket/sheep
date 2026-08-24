# Flock Behavior v3 — the trot (T1–T3)

**Status:** implemented 2026-08-24 (owner note, built without gates; `file://`
eyeball pending). Extends [POC-v2 flock-behavior](../POC-v2/flock-behavior.md).

A big group that is already flowing one way under the dog can *break into a
trot*: the leaders pick up the pace, the rest string out behind them in a
column, and — rarely — the whole flock bolts off at once. The trot is
self-limiting: escape the dog's pressure and it dies back to normal within a
few seconds.

## Semantic rules (what it must look like)

- **T1 — trigger.** When a group of **more than 20** sheep is moving in the
  same direction under current dog pressure, there is a **20 % chance per
  second** that the **lead sheep** (the frontmost along the group's heading)
  move into a trot.
- **T2 — the column.** Once leads trot, others in the flock **follow in a
  column**: any sheep close to a trotting flock-mate is pulled in *behind
  it* (not toward the front), and so on down the line. At trigger time there
  is a **5 % chance the whole flock bolts** into the trot at once. A trot is
  visibly faster than the driven walk but is not a panic sprint.
- **T3 — decay.** While the dog's pressure is still felt, the trot holds.
  Once the pressure is **escaped**, each second carries an increasing chance
  — **20 % growing to 90 %** (owner amendment 2026-08-24; the note's original
  floor was 5 %) — that a trotting sheep drops back to normal behavior. And a
  trotting sheep **approaching a fence within a few sheep-lengths stops
  outright (100 %)**, pressure or not — it never runs itself into the fence
  at a trot; the gate mouth is the exception (a column may trot through).
- **T4 — reversal (owner amendment 2026-08-24).** A trotting group stays
  **reactive to the dog**: if the dog gets **in front** of a trotting sheep's
  line while its pressure is felt, the sheep reverses and trots the other
  way — a follower cuts loose and leads the turn itself, and the column
  swings round behind the reversed leads.

## Force-model mapping (the how — force-model.md conventions)

- **Group** = the scoring cluster: union-find at `clusterDist` (70 px) over
  active (not penned, not down) sheep. "Moving in the same direction" =
  velocity order parameter |Σv|/Σ|v| ≥ `trotAlignMin` (0.5 — shipped 0.7,
  loosened by the owner, Q54 2026-08-24) **and** mean speed ≥
  `trotMoveSpeed` (20 px/s). "Current dog pressure" = some member
  with `stress > 0`. "Over 20" is strict (`> trotGroupMin`).
- **Trigger** (`FlockSim.updateTrot`, called each `step()` between the dog
  and the sheep integration): per eligible group, one seeded roll per tick at
  the per-second → per-tick conversion `1 − (1−p)^dt`. On success the
  `trotLeadCount` (3) frontmost members along the group's mean heading get
  `trot = true` with the heading **locked** (`trotHeading`); one further roll
  decides the whole-group **bolt** (`trotBoltProb` 0.05). A group with a
  trotting member never re-rolls (it re-arms after full decay).
- **Column** — the G3 gate-column pattern reused: each tick, a non-trotting
  sheep within `trotFollowR` (40 px) of a trotting one joins with
  `trotLead = that sheep` — followers steer **at their lead**, leads along
  the locked heading; recruitment reads a start-of-tick snapshot, one hop per
  tick, so the file grows from the front back. Orphaned followers (lead
  decayed/penned) carry on as leads on their own heading.
- **Drive** (in `integrate`): steer-to-velocity force toward
  `trotSpeedMult` (1.15 — eased from 1.3 by the owner, 2026-08-24) × vMax along the lead/heading direction, weight
  `w_trot` (2); the speed cap is raised to `trotSpeedMult × vMax` (still
  under panic 1.6). A trot keeps the sheep **alert** (no idling mid-trot).
- **Decay**: per trotting sheep, `trotFreeT` accumulates only while
  `stress = 0` (any felt pressure resets it); the per-second drop chance
  ramps `trotDecayMin` (0.2 — raised from the note's 0.05 by the owner,
  2026-08-24) → `trotDecayMax` (0.9) linearly over `trotDecayRamp` (5 s).
- **Reversal** (`trotReverseDeg` 120): each tick, a trotting sheep with
  `stress > 0` whose felt dog lies within the ±60° forward cone of its trot
  direction (a follower's direction = toward its lead) flips
  `trotHeading` by 180° and becomes a lead (`trotLead` −1). After the flip
  the dog is behind it, so the test cannot flip-flop.
- **Fence stop** (`trotAtFence`): before the random decay, a trotting sheep
  within `trotFenceStop` (36 px = 3 body-lengths) of a wall **with a real
  velocity component toward it** drops the trot unconditionally — the same
  wall + gate-aperture geometry as `fenceForce`, so the mouth stays open to
  a trotting column. Parallel running along a fence does not trip it.
- **PRNG discipline**: all rolls are on the seeded stream, and nothing rolls
  while no group is eligible and nobody trots — a course that never arms the
  trot replays v8 draw for draw (measured on seeds 1337/1403).
- HUD gains a live `trot n` count; `capture ⎘` stamps `trot`/`trotLead` per
  sheep.

## Constraints

- §1 SIM stays DOM-free; `updateTrot` is pure state + seeded rolls.
- All fourteen tunables live in §0 (`Trot` folder on the Sheep panel), parked
  un-levered until a tune pass.
- No timers outside the state machine; fixed-dt safe (per-second rates are
  converted per tick).

## Acceptance criteria

1. A 25-sheep cluster, aligned and moving with a stressed member, triggers in
   ≈ 5 s on average (20 %/s); a group of ≤ 20, an unaligned, a stationary, or
   an unpressured group never triggers.
2. A non-bolt trigger starts **exactly** the 3 frontmost sheep along the
   heading; ~5 % of triggers take the whole group at once.
3. A sheep within 40 px of a trotting one joins with that sheep as its lead.
4. A trotting sheep under held pressure never decays; once pressure is
   escaped it decays with median drop time ~2 s (20 %→90 %), always < 60 s.
   A trotting sheep heading at a fence within 3 body-lengths stops outright;
   parallel to a fence, or out through the gate mouth, it keeps trotting.
5. Through the integrator a trot is clearly faster than the same sheep's
   plain motion.
5b. A trotting sheep whose felt dog is ahead of its line reverses on the
   next tick and does not flip back; a dog behind, or an unfelt dog ahead,
   changes nothing.
6. Seeds that never trot replay identically to v8.

## Acceptance log — 2026-08-24

Harness: scratchpad `harness.js` (Proxy stub), 25-sheep grid at 50 px spacing
(linked < `clusterDist`, no instant `trotFollowR` spread), vel (30, 0),
stress 0.2, dog at heel far away; 200 trigger trials, 100 decay trials.

| # | check | measured | verdict |
|---|---|---|---|
| 1 | trigger rate | mean 4.50 s over 200 trials (expected 5 s) | **PASS** |
| 2 | leads | 188/188 non-bolt triggers = exactly the 3 frontmost | **PASS** |
| 2 | bolt share | 12/200 = 6 % (expected 5 %) | **PASS** |
| 3 | column join | sheep placed 30 px behind a lead joins, `trotLead` set | **PASS** |
| 4 | pressure holds | 30 s at stress 0.3 — still trotting, `trotFreeT` 0 | **PASS** |
| 4 | escape decays | median 1.65 s, mean 1.77 s, max 5.3 s over 100 (floor 0.2) | **PASS** |
| 4 | fence stop | head-on at 14 px → stops · parallel at 14 px → keeps · out the mouth → keeps | **PASS** |
| 5 | pace | steady 63.3 px/s trotting vs 34.9 px/s plain (same pose; pace 1.15) | **PASS** |
| 5b | reversal | felt dog ahead → flips, stable after; dog behind / unfelt → holds | **PASS** |
| 6 | replay | seeds 1337/1403 come-by → 150 s drive tick-identical to v8 | **PASS** |
