# POC-v6 · Feature: Dog Commands & Influence v4 — Perimeter Flank + Easy

**Status:** **implemented 2026-08-22** — all four phases of
[`plan.md`](./plan.md) ticked, acceptance 1–10 measured at the P3 gate (log
below); still a **living rules list**. Written 2026-08-22 from the owner's
`/goal` notes; Q31–Q37 taken on their bolded defaults, owner review pending; **Q38** parked by the tune pass.

Continues the dog rules from
[`../POC-v3/dog-behavior.md`](../POC-v3/dog-behavior.md)
(groups **C/D/E**) and
[`../POC-v4/dog-behavior.md`](../POC-v4/dog-behavior.md)
(**C7**, **F**). Lettering continues: **C continued** (C8, C9), new group
**I** (*easy*); **G/H** are taken by
[`course-and-flock.md`](../POC-v3/course-and-flock.md).
Observable behavior only; mechanism ideas stay in Design notes. The owner's
notes, verbatim:

> come by and away behavior adjustments:
> - for either of these, the dog should track along the outside of the herd
>   perimeter line in the appropriate direction until they reach the line
>   that most points toward the gate
> - upon reaching this point, they should transition into an 'easy' posture
> - easy should replace stand altogether, and is a slow move forward, about
>   1/3 the speed of a walk on

This is a fnb side-project — **no fnb DB/GraphQL/backend**. Rules must be
implementable inside §1 SIM driven by §0 `params`/`SETTINGS`.

---

## Summary

Two linked changes to how a flank ends and what the dog does next:

1. **The flank follows the herd's perimeter.** Since POC-v3 the flank point
   has worked around a *sector-max radius* of the flock (a smoothed circle
   that bulges where sheep are far out). The owner wants the dog to **track
   the outside of the herd perimeter line** — the dotted outline that
   [`control-layout.md`](../POC-v5/control-layout.md) already draws around the
   flock's convex hull — so a long, rectangular, or lopsided flock gets a
   long, rectangular, or lopsided flank, and the dog visibly *follows the
   shape*. The flank ends the moment the dog **reaches the gate line** — the
   spot on the perimeter from which the flock lies straight between him and
   the gate (the POC-v3 C6 balance point). POC-v4's C7 overshoot ("carry
   ~90° further, then walk-on") is superseded: the dog does not run past
   the line, and what he converts into is no longer walk-on.
2. **Easy replaces stand.** At the gate line the dog drops into **easy** —
   a *slow* forward drive at about **a third of walk-on speed**. *Easy* was
   already the label on the middle pad button (control-layout Q-A, a
   relabel of `stand`); it now becomes its own command and the stationary
   *stand* posture is **removed** from the game. Everything that used to
   route to stand (the pad button, hotkey **A**, E2's auto-conversion on a
   stalled drive, E3's impulse from a held position) now routes to easy.
   Lie-down stays as the one true posture.

The net read for the player: *come by* → the dog runs the outline clockwise
→ arrives opposite the gate → eases forward on the flock slowly → *walk on*
when they want real pace, *lie down* when they want a wall.

## Goals

1. The flank path hugs the flock outline's **shape**, not a circle (C8).
2. The flank ends **at** the gate line — never short of it, never a lap past
   it (C8; fixes the v4 cone-edge note where handoffs fired up to 30° short
   of the station).
3. Flank → **easy** with no player input; the strip follows (C9).
4. *Easy* = slow forward drive at ~1/3 walk-on speed, with the walk-on
   trail governor intact (I1–I3).
5. *Stand* is gone from the command set and from every automatic
   transition; the gate-working rhythm (E2/E3) lives on easy (I4).
6. The flock outline becomes a **sim concept** (§1), not a render aid — the
   resolution of control-layout's Q-B.

## Non-goals (this version)

- No change to lie-down (D1), the drive eye (E1), the impulse shapes (E3),
  the course, spawn, or levers beyond the ownership edits forced by the
  superseded params.
- No concave/split-aware perimeter: a split flock still has one convex
  outline (the 1-n group rules in course-and-flock.md are unchanged).
- No new tune pass on the Sweep/Standoff endpoints — they get the minimum
  edit that keeps the 0.5 anchor exact (Q35).

---

## Semantic rules

### C. Flanking commands — come-by / away (continued from POC-v3/v4)

- **C8.** *(supersedes **C7**; amends C6's path and handoff point)* While
  flanking, the dog **tracks along the outside of the herd perimeter
  line** — the outline drawn around the working flock — in the command's
  direction (**clockwise** for come-by, **counter-clockwise** for away,
  bird's-eye), following its **shape**: a long flock gets a long flank, a
  corner of the outline reads as a corner in his path. He keeps flanking
  **only until he reaches the gate line** — the point of the perimeter from
  which the flock's centre sits directly between him and the gate. He
  arrives **at** that line (not short of it by a tolerance) and does **NOT**
  carry past it. *(Owner, 2026-08-22.)*
  **Amended by the owner the same day (touch-up 3):** "the perimeter line"
  is the **current herd boundary** — the dotted outline drawn round the
  flock (`perimeterMargin`, 36 px outside the outermost sheep) — **not** a
  wider offset of it (the 140 px `flankStandoff` track, now superseded).
  The dog runs the outline itself; the faint `debug.dogTrack` dashes sit on
  it. He is inside `R_flee` of the edge sheep the whole way, by rule.
  **Amended again by the owner, 2026-08-22 (touch-up 5 — "the gate line"):**
  the line the flank ends at is **not** the goal→GCM line extended (the
  balance point) but the **gate's tangent to the herd perimeter on the
  flank's exit side** — the last point of the sweep from which the *whole*
  flock still lies between the dog and the gate; one step further and he is
  on the gate side, pushing sheep away from the mouth. On a wide flock this
  sends him round the **entire back of the herd** to its far silhouette
  edge (seed 1403, gate N: come-by from heel ends at outline marker **27**,
  the west corner — not at the bottom of the flock, ~12/13, where the old
  line fell). Come-by parks at the clockwise-most silhouette point seen
  from the gate, away at the counter-clockwise-most (`gateLineBearing`).
  With it, v4's *park-at-once* convenience (a point already within
  `flankHandoffDeg` past the line at command time converts on the spot) is
  **gone**: the heel post lies in the gate-facing arc, so a come-by from
  heel was converting with a 0° sweep (seeds 1337 come-by, 1403 away). The
  park test now arms only once the flank point has been behind the line
  (in the flock's shadow) — a flank issued from the gate side always runs
  the whole perimeter. Measured after the change (headless, from heel):
  1403 cb/aw, 1337 cb/aw, 42 cb/aw all convert on the live tangent,
  17–24 s sweeps, 0 laps.
- **C9.** On reaching the gate line the dog transitions **on his own into
  easy** (I-group) — not into walk-on. The command-strip highlight follows
  to *Easy* (v3 Q5 convention). He still **never** completes a second lap.

*(room to grow)*

### D. Stationary pressure — lie-down (amended)

- **D3 — superseded by I1.** The *stand* posture no longer exists; lie-down
  is the only posture, and D1/D2 are unchanged. *(The "lie-down < stand"
  escalation pair is withdrawn with it — see Q32 for where the firmer wall
  could return.)*

### E. Walk-on — the drive (amended)

- **E2 — amended:** a stalled walk-on now converts to **easy**, not stand.
  Everything else about E2 (stall detection, strip follows) stands.
- **E3 — amended:** the impulse (shove / bark / lean) fires from **easy**,
  not stand, and the smart return after the impulse goes easy → walk-on as
  before.

### I. Easy — the slow drive (new)

- **I1.** **Easy replaces stand altogether.** One command slot: the *Easy*
  pad button and hotkey **A** issue `easy`; there is **no** stationary stand
  state anywhere — not as a command, not as an automatic transition.
- **I2.** Easy is a **slow move forward**: from behind the flock (the
  gate-opposite side) the dog advances on the sheep at **about one third of
  walk-on speed**, eye forward on the flock like a drive. It reads as
  *creeping*, not *holding*. *(Q38, 2026-08-22: this holds from the gate
  line too — the E1 gap governor closes and backs off at a third of its
  walk-on rate while the dog is in easy.)*
- **I3.** Easy **never catches up** either: the walk-on trail gap (E1)
  applies, so against a jammed crowd the easy dog closes slowly to the gap
  and then holds there — a creeping dog that arrives at a wall, not a wall.
- **I4.** Easy is the resting state of the gate rhythm: a drive that stalls
  drops into easy (E2), a walk-on tap from easy is an impulse (E3), and a
  successful impulse resumes walk-on. Playing the gate feels the same as in
  v3 except that the dog between taps is **inching forward**, not standing.

*(room to grow)*

---

## Design notes (light — planning will refine the "how")

- **The perimeter is the §2 outline, moved into §1.** `convexHull()` is
  pure and DOM-free already; it moves into `FlockSim` (computed per step,
  exposed as `sim.hull`) and §2 draws from it — exactly the Q-B outcome
  control-layout.md parked ("if it becomes the dog's working perimeter, the
  hull moves into §1"). ~~The rendered dotted line keeps its `outlineLengths`
  offset as a render aid; the **dog's track** is the same hull offset by
  `flankStandoff` (Q34) and should be drawn too, faintly, while flanking,
  so the owner can see him follow it.~~ **Touch-up 3 (owner, 2026-08-22):**
  the outline margin is a sim param now (`perimeterMargin`, Dog, 36 px —
  was `debug.outlineLengths` × 12) and the dog's track **is** the outline:
  `perimeterRadius(θ, perimeterMargin)`. `flankStandoff` is superseded; the
  fence-seek reach it also set (2 ×) is its own tunable, `fenceSeekReach`
  (72 = 2 × margin — at the old 280 the C2 pull dragged the point 72 px off
  the line at seed 1337). The ring-radius ease (`3·dt`) is gone: built for
  v3's stepping sector-max circle, on a 36 px margin it cut 10–15 px (46
  max) *inside* the line; direct assignment puts the point on the line on
  100 % of unclamped ticks and moves it ≤ 5 px/tick (the ease: 7–22).
- **"Radius at bearing" is all the flank loop needs.** Today the flank point
  is `GCM + r(θ)·(cos θ, sin θ)` with `r` = sector-max sheep distance +
  standoff. Replace `r(θ)` with the distance along the ray from the GCM to
  the boundary of *hull ⊕ disc(standoff)* — a star-shaped set about the GCM,
  so the ray crosses it exactly once, and distance-to-hull is monotone along
  the ray, so a short bisection finds it. Everything around it (bearing
  advance, linear-speed cap, fence seek, field clamp, C3 eye) is unchanged.
  The clearance-floor loop becomes redundant (the offset hull *is* the
  clearance) but is harmless.
- **"Reaches the gate line" is a signed test.** v3/v4 fired the handoff
  anywhere inside a ±`flankHandoffDeg` cone around the station, which is
  why v4 measured carries 30° short. C8 fires when the dog's bearing has
  **crossed** the station in the flank direction: signed progress past the
  station in `[0, flankHandoffDeg]` — the tolerance now only bounds how far
  *past* the line he may be when the on-station check catches him. The arm
  delay (0.5 s) and on-station distance (< 60 px of the flank target) stay.
- **`flankOvershootDeg` defaults to 0** (C7 superseded, slider kept: the
  station is still `gate line + sign · overshoot`, so the dial can bring a
  carry back if play wants it — Q33). The Sweep lever's row for it is
  re-authored through the new anchor (Q35).
- **Easy is walk-on at a third of the pace, not a posture.** Same trailing
  target, same E1 gap controller, same forward eye (`faceGCM`), top speed
  `dogVMax × easySpeedFrac`. The posture profile (`standBlock`,
  `postureRange`, `postureConeK`) is lie-down-only from now on;
  `standBlock` is superseded (hidden, kept for reference like `R_orbit`).
  The E3 envelope now scales the drive eye's `intensity` rather than the
  posture profile (Q32).
- **Rename, don't alias.** `'stand'` disappears from `setCommand`, the
  state machine, `HOTKEYS`, the pad (`data-cmd`), the CSS grid area and the
  HUD. A `stand` in a defaults file or harness is simply an unknown command
  (falls to the `that_ll_do` default arm) — nothing to migrate because
  commands are never persisted.

## Tunables likely involved

Existing: ~~`flankStandoff` (now measured from the hull — the track offset)~~
**superseded by touch-up 3 → `perimeterMargin` 36 px (Dog, 12–96 · 2,
Standoff `[24, 36, 60]`) + `fenceSeekReach` 72 px (Dog, 20–300 · 4,
Standoff `[48, 72, 120]`); Q38 adds `driveCloseRate` 25 / `driveBackoffRate`
40 px/s (Dog, `substrate`)**,
`flankHandoffDeg` (now the *past-the-line* bound), `flankOvershootDeg`
(default **90 → 0**), `flankAdvance`, `fenceSeekBias`, `flankConeDeg`,
`dogVMax`, `R_drive`, `R_driveMin`, `driveTrailGap`, `stallSpeed`,
`stallDwell`, the nine impulse params, `debug.flockOutline`,
`debug.outlineLengths`, `debug.outlineMarkers`.
**New:** `easySpeedFrac` (Dog, **0.33**, 0.1–0.8 · 0.01 — I2) and a
`debug.dogTrack` render toggle (default **on**, not exported).
**Superseded:** `standBlock` (hidden; leaves the Presence lever);
`flankOvershootDeg` stays a slider but its Sweep row is re-anchored at 0.

---

## Constraints (global invariants that bite here)

- §1 stays DOM-free: the hull and the radius-at-bearing function live in §1
  as pure math; §2 only reads `sim.hull`.
- `easySpeedFrac` enters as a `SETTINGS` entry (slider, tooltip, ⓘ row,
  defaults key, export) and is claimed by a lever or `LEVER_NOT_LEVERED`, or
  `assertLevers()` fails at boot.
- The levers' 0.5 anchor stays exact: `flankOvershootDeg`'s Sweep row and
  `standBlock`'s removal from Presence are data edits checked by the boot
  assertion.
- Every phase leaves the page runnable from `file://`, zero console errors.

## Acceptance criteria (measured headless per the no-webserver rule; the
`file://` eyeball is the owner's)

1. **C8 shape** — come-by/away at seeds 1337 & 42 (forced `beside-gate`):
   over the on-station ticks of the flank **where neither the field clamp
   nor C2's fence-seek moves the point** (measured with `fenceSeekBias 0`,
   ticks at a fence excluded — on this 1008 × 608 field a 140 px standoff
   is inside fence reach almost everywhere), the dog's distance to the
   flock's convex hull stays within **±25 px of `flankStandoff`** on ≥ 90 %
   of ticks; on a mid-field elongated flock the median distance is within
   **±10 px** of the standoff where v5's circle was not; his bearing from
   the GCM advances **monotonically CW** (come-by) / **CCW** (away), net
   reversal < 10° during the flank itself. *(Amended 2026-08-22 in P2: the
   original "≥ 90 % at defaults" is unmeasurable with C2 shipped.)*
2. **C8 handoff** — the flank point **parks on the gate line** (its progress
   past the station at parking ∈ [0°, `flankHandoffDeg`]) and the dog
   converts **on arrival** (< 25 px of the parked point); his own bearing at
   conversion is within **±15° of the live line** on every run (the old
   −30° early firing is gone; the residual is the field clamp and the line
   moving with the GCM while he runs in), total sweep < 360°. *(Amended
   2026-08-22 in P2 — see Q37.)*
3. **C9** — at handoff `dog.command` reads `easy` with no input; the strip
   lights *Easy*.
4. **I1** — the string `'stand'` appears nowhere in §1/§3 command handling;
   pad button + hotkey A issue `easy`; a scripted run can never observe
   `dog.command === 'stand'`.
5. **I2** — while easy and closing (ahead-gap > `driveTrailGap` + 15) the
   dog's mean speed is **`easySpeedFrac` × `dogVMax` ± 10 %**; walk-on in
   the same geometry runs at `dogVMax`.
6. **I3** — over a full easy approach onto a jammed crowd the front gap
   never drops below `driveTrailGap` − 5 px.
7. **I4** — the v3 E2 jam rig converts walk-on → **easy** (not stand) after
   the stall dwell; a walk-on tap from easy fires the shove envelope and the
   smart return lands on walk-on when the crowd moves.
8. **Outline parity** — `sim.hull` equals the old §2 hull vertex-for-vertex
   on the same flock; the dotted outline looks identical.
9. **No regressions at the anchor** — A1/A4 idle, C3 eye ≈ 45°, D1 lie-down
   wall, E1 trail gap, F1 facing, G1, `[levers] … OK` boot line.
10. **Defaults & mirrors** — `sheep-defaults.json.js` carries
    `easySpeedFrac` and `flankOvershootDeg: 0`; root `index.html` /
    `sheep-defaults.json.js` mirrors byte-identical to `poc/`.

---

## Open questions (parked — for the owner; defaults in **bold**)

Numbering continues from POC-v5 (…Q30).

31. ~~**Hull vs. outline as "the perimeter line":** the drawn outline sits
    `outlineLengths` (3 sheep-lengths = 36 px) outside the hull. Does the
    dog track the *drawn line's* shape at his own standoff, or literally the
    line? **Default: the hull's shape, offset by `flankStandoff` (140 px)** —
    a dog 36 px off the outermost sheep is inside `R_flee` and would scatter
    the edge he is meant to gather; the outline stays a render aid. See Q34.~~
    **Overturned by the owner 2026-08-22** → *literally the line*: "the dog
    should track along the current herd boundary — not the new one that is
    so far off set". Shipped as touch-up 3 (see the
    [README](./README.md#touch-up-owner-directed-2026-08-22-after-the-p3-gate)).
    The scatter worry did not materialise at the anchor: the edge sheep
    recoil inward (mean flock spread *falls* 185 → 156–164 / 139 → 100–113
    px over the flank; hull area never grows), with 8–14 sheep inside
    `R_flee` of the dog at any moment — the flank now gathers as it goes.
    Hands-on read is the owner's.
32. **Easy's threat profile:** drive eye (same as walk-on) or the old stand
    posture wall carried along at creeping speed? **Default: the drive eye
    at full intensity** — easy *is* a slow walk-on; the posture machinery
    becomes lie-down-only, and the E3 envelope scales drive intensity
    instead. If the gate needs the firmer wall back, that is a `lieDownBlock`
    tune, not a third posture.
33. **Keep the overshoot dial?** **Default: yes, hidden in plain sight —
    `flankOvershootDeg` stays exposed with default 0**; the Sweep lever's
    row becomes `[0, 0, 60]` so the anchor holds and a wide sweep can still
    carry past the line.
34. **Draw the dog's track?** **Default: yes — `debug.dogTrack` (on), a
    faint dashed offset hull in the dog's colour, only while flanking.**
35. **Lever ownership of `easySpeedFrac`:** **Default: Standoff**
    (`[0.4, 0.33, 0.25]` — an unhurried dog eases slower; sits beside
    `dogVMax` in the same profile). `standBlock` leaves Presence for the
    superseded list.
37. **Parked point vs. fence-seek (added in P2):** once the flank point is
    parked on the gate line, C2's fence pull would drag it up to ~25° off
    the line (measured at defaults). **Default: a parked point ignores the
    fence-seek bias (the field clamp still applies)** — "reaches the line"
    means the line; the fence geometry is usually there anyway. ~~Related
    follow-up: the fence-seek switches off discontinuously at
    `2 × flankStandoff`, which makes the target jump (133 px at seed 42
    on a reversal) — a smoothstep on `reach` would cure the wobble.~~
    **Done 2026-08-22 (owner-directed touch-up)** → `fenceSeekRamp` 0.5;
    and the parked point's pull now fades over `parkFade` 0.5 s rather than
    dropping in a tick; see the
    [README](./README.md#touch-up-owner-directed-2026-08-22-after-the-p3-gate).
38. ~~**Easy's pace is masked by the E1 governor**~~ **Resolved 2026-08-22
    (owner: "do all the things") → (a) shipped, which implied (b):**
    `driveCloseRate` 25 / `driveBackoffRate` 40 px/s are Dog tunables
    (`substrate`, not levered) and easy scales both by `easySpeedFrac`.
    Measured (Addendum 4 below): from a come-by handoff the governor's
    close 140 → 55 px takes **12.8 / 10.5 s** at ⅓ pace (1337 / 42) vs
    **5.7 / 4.3 s** in walk-on; 17.0 / 17.1 s at 0.2, 5.9 / 5.8 at 1.0 —
    before, 3.4–5.9 s at every fraction. Walk-on's own path is
    byte-identical. Original finding, for the record: after a
    handoff the dog is already on the ring, and his approach is paced by
    `driveDist` shrinking at a hard-coded **25 px/s** inside `stepDog`, which
    even a 0.2 × `dogVMax` dog keeps up with — so from the gate line easy
    and walk-on close at the same pace at every `easySpeedFrac`. Two fixes,
    both mechanism (spec-level, not tune): **(a, default) scale the
    governor's close/back-off rates by `easySpeedFrac` while in easy**, so
    the creep reads at ⅓ pace everywhere; (b) expose the 25 / 40 px/s rates
    as `driveCloseRate` / `driveBackoffRate` tunables (they are magic numbers
    in §1 today, against invariant 4) and let easy use a fraction. (a)
    implies (b)'s cleanup. Owner's call — it changes how every drive closes.
36. **Easy from anywhere:** pressing A while the dog is mid-field or
    flanking — does he first go to the trailing position (as walk-on does)
    at easy pace, or hold where he is? **Default: same as walk-on — he
    heads for the trailing spot behind the flock, at easy pace.**

---

## Acceptance log — P3 gate, 2026-08-22 (seeds 1337 & 42, regression anchor)

Measured **headless in Node**, per the owner's no-webserver rule: the whole
`sheep-poc.html` script booted under a DOM / lil-gui stub (v5 P6 pattern,
so `assertLevers` runs), driven at `dt = 1/60` through `sim.step()`, the
POC-v5 build loaded side by side in the same harness as the reference.
Anchor: forced `beside-gate`, `spawnGateClear 0`, `randomSeedOnLoad` off,
levers 0.5; commands issued after 0.5 s of idle.

| # | Criterion | Measured | Threshold | Result |
|---|---|---|---|---|
| 1 | C8 shape — on-station distance to hull vs `flankStandoff` (fence-seek isolated, bias 0) | away runs **97 % / 98 %** within ±25 px (v5: 11 / 65 %); come-by runs field-clamped 582–618 of ~700 ticks on a wall-side flock in *both* builds (p50 43–82 px, v5 48–75); mid-field stretched flock p50 **137 / 140 px** (v5 159 / 196), 66–73 % within ±25 (v5 16–28); in-flank reversal 0.0–0.7° (< 10°) | ≥ 90 % where unclamped; median ±10 px mid-field | **PASS** |
| 2 | C8 handoff — point parks on the line, dog converts on arrival | bearing vs live line at conversion **+1.6 / −4.7 / +3.7 / −13.5°** (1337 cb/aw, 42 cb/aw); bias-0 runs −2.8 / −4.1 / −0.4 / −12.6°; sweeps 148–208°, **0 laps**; overshoot 90 → −3.9 / −4.2° vs line+90, sweeps 283 / 291° | within ±15°, sweep < 360° | **PASS** |
| 3 | C9 — converts to easy, no input | `dog.command === 'easy'` at the handoff tick on all 4 runs; E1 min front gap over the next 20 s **46.6–65.1 px** | easy; gap ≥ 35 | **PASS** |
| 4 | I1 — stand gone | `'stand'` in §1/§3: 1 occurrence, a comment; `setCommand('stand')` → `that_ll_do` (`COMMANDS` whitelist); pad `data-cmd="easy"`, `HOTKEYS.a = 'easy'`; no scripted run ever read `stand` | none reachable | **PASS** |
| 5 | I2 — easy speed | closing speed **36.3 px/s** (= 0.33 × 110) over 518 ticks; walk-on in the same geometry **110.0 px/s** | ±10 % | **PASS** |
| 6 | I3 — never catches up | min front gap during the easy approach **40.2 px**; walk-on 39.1 | ≥ 35 | **PASS** |
| 7 | I4 — gate rhythm on easy | 2 px-mouth jam rig: walk-on → **easy at 7.5 s** (v5: stand at 7.5 s, same tick); walk-on tap from easy → `shove`, factor 1.50 held, 1.28 @ 1.0 s, 1.00 @ 1.5 s; smart return → walk-on at 1.28 s (both builds) | converts to easy; envelope; return | **PASS** |
| 8 | Outline parity | `sim.hull` = v5 §2 hull vertex-for-vertex, **6/6** (3 seeds × t=0, 10 s); track points 140.00 px from the nearest sheep on 72 bearings; lone sheep r ≡ 140 | identical | **PASS** |
| 9 | No regressions at the anchor | idle 10 s digests **= v5** at 1337/42 through P0–P2; A1/A4 still 1.00→1.00, dist-GCM 185.4→187.1 / 139.9→134.8 (= v5); C3 eye 44.9–45.1°; C1 sd 56–112 px; E1 38.6–38.9 px pre-handoff; F1 **0.000°** × 7 seeds; lie-down flee @ 50 px 0.326 (= v5); G1/Q8: 0 of 80 penned in a 90 s scripted come-by→drive in both builds; H1 sizes 1–9 present; `[levers] anchor 88/88 exact · 88 levered + 38 not-levered = 126 keys · OK` | hold | **PASS** |
| 10 | Defaults & mirrors | `sheep-defaults.json.js` = the live export key for key (114 keys, 0 unknown); snapshot `params-2026-08-22-v6.json` differs from v5's by **exactly** `flankOvershootDeg 90→0` + `easySpeedFrac 0.33`; root `index.html` / `sheep-defaults.json.js` `cmp`-identical | as stated | **PASS** |

**Behavior differences vs v5 that are the spec, not regressions:** B1's
idle count after 45 s of a come-by is 69 / 57 (v5 60 / 71) and the D1 rig's
crossings 2 / 0 (v5 7 / 0) — the flank now ends in easy instead of a
walk-on drive, so the flock state the later probes start from differs; the
lie-down code path itself is identical (flee probe to the decimal).

**Three as-built findings (P2)** shaped the handoff as shipped: the v4 ±
cone fired at **−29.6°** (30° short of the line) on every anchor run; a
one-sided window still lapped seed 42 *away* because the dog crossed the
line 80–170 px from a fence-clamped target; and a "parked" point that kept
advancing was never reached — hence *park the point, stop advancing, arrive
within 25 px*. The fence-seek is switched off for a parked point (Q37): with
it on, the parked station sat up to 25° off the line.

**File:// invariants (static).** §0–§4 parse; §1's only `canvas` /
`document` / `window` mentions are comments; `Math.random` ×2, both in
§3/§4. The live console check on a double-clicked `file://` page is the
**owner's eyeball**, per the no-webserver rule — as v4 and v5 shipped.

**Addendum (touch-up, same day):** the fence-seek step is smoothed
(`fenceSeekRamp` 0.5): seed-42 reversal CCW 152° vs CW **1°** (was 31°),
max target jump/tick 15–37 px (was 160); handoffs → easy at −2.1 / −4.5 /
+1.5 / −13.2°; idle digests unchanged.

**Addendum 2 (touch-up, same day):** the parked point's fence pull now
fades out over `parkFade` 0.5 s: parking-tick target snap 43 / 15 px → **2
px**; no in-flank target move above 4 px/tick; handoffs → easy at −1.7 /
−5.0 / +3.8 / −14.3°.

**Addendum 3 (touch-up, same day — owner-directed):** the dog tracks the
**outline itself** (`perimeterMargin` 36 px; `flankStandoff` superseded;
`fenceSeekReach` 72; radius ease removed). Seeds 1337 & 42, come-by/away
from 0.5 s idle vs the pre-touch-up build: flank target on the line
(`distToHull(target)` = 36.0 px on **100 %** of unclamped ticks, bias 0;
72–100 % at bias 0.6), max target move **2–5 px/tick**; the dog himself
trails the point by 38–55 px so his own median distance to the hull is
**45–47 px** (seed-42 come-by 63: wall-side flock, 80 % of ticks
field-clamped in both builds); handoffs → easy at **−2.0 / −3.9 / −4.6 /
−6.7°** of the live line (was −1.7 / −5.0 / +3.8 / −14.3), **2–4 s sooner**
(10.4 / 8.2 / 7.9 / 6.2 s vs 14.2 / 12.4 / 11.9 / 10.2) on a shorter track,
sweeps 158–197°, 0 laps, net reversal 0°. Idle 10 s, walk-on + 10 s and
easy + 5 s digests at seeds 1337 / 42 / 7 **byte-identical** to the
previous build; `sim.hull` identical. Boot `[levers] anchor 89/89 exact ·
89 levered + 39 not-levered = 128 schema keys · OK`; defaults file and
snapshot carry `perimeterMargin 36` + `fenceSeekReach 72` (117 keys, 0
unknown); mirrors `cmp`-identical.

**Addendum 4 (Q38, same day — owner: "do all the things"):** E1's
governor rates are tunables (`driveCloseRate` 25, `driveBackoffRate` 40,
`substrate`) and easy scales them by `easySpeedFrac`. Rig: come-by from
0.5 s idle at 1337 / 42 → handoff → 20 s left in easy at `easySpeedFrac`
0.2 / 0.33 / 0.5 / 1.0, and walk-on issued at the handoff. Time for
`driveDist` to close 140 → `R_driveMin` 55: **17.0 / 12.8 / 11.5 / 5.9 s**
(1337) and **17.1 / 10.5 / 7.9 / 5.8 s** (42) vs walk-on **5.7 / 4.3 s** —
the pre-Q38 build read 3.4–5.9 s at every fraction. Min front gap over the
20 s **39.5–54.2 px** (≥ 35, I3) at every fraction; the far-from-spot
closing speed (acceptance 5) is unchanged at **36.3 vs 109.8 px/s**. Pure
walk-on (E2 disabled) 15 s digests **byte-identical** to the previous
build; with E2 on, the first divergent tick is the tick *after* the jammed
walk-on auto-converts to easy (7.07 s / 8.30 s, the same tick in both
builds — I4 holds). Boot `[levers] anchor 89/89 exact · 89 levered + 41
not-levered = 130 schema keys · OK`; defaults + snapshot carry both keys
(119). *Pre-existing, both builds, logged:* a walk-on issued at the handoff
on the beside-gate flock converts to easy within its first tick — the
jammed crowd trips E2 at once.

**Follow-ups logged (not v6):** an easy dog at 36 px/s is slower than a sheep's
`vMax` 90, so he cannot head a bolter — by rule (I2), worth a hands-on read;
the v5 list (owner's `file://` check, lever tune pass, Q8 gather ceiling,
D2 dart, Q27/Q30) carries on unchanged.
