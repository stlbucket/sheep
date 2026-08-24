# POC-v6 — Spec Index

Feature specs for the sixth iteration of the sheep PoC. Add more by running
`/sheep spec POC-v6 <notes>` (or `/sheep rule <notes>` for behavior rules).

Pipeline: **spec → plan → implement**. Started **2026-08-22** from the
owner's `/goal` notes on come-by / away and the new *easy* posture.
Predecessor [POC-v5](../POC-v5/README.md) shipped
2026-08-21 (tuning surface; its carried-forward list is reproduced below).

**Completed 2026-08-22** — all four phases ticked ([`plan.md`](./plan.md)),
acceptance 1–10 measured PASS headless against the POC-v5 build side by
side; the owner's `file://` console eyeball is **pending** (as v4/v5
shipped). Snapshot [`poc/params-2026-08-22-v6.json`](../../poc/params-2026-08-22-v6.json)
differs from v5's by exactly two keys (four after the two touch-ups below, minus `standBlock`).

**This is a behavior version** — the first since POC-v4. It changes the
dog's flank path, the flank's end point, and what he does after it; it
removes the *stand* posture. The levers' 0.5 anchor must stay exact through
it (two data edits, asserted at boot).

## Features

| Feature | Spec | Status |
|---|---|---|
| Dog Commands & Influence v4 — flank tracks the herd perimeter to the gate line (C8), hands off to *easy* (C9); *easy* replaces *stand*: a slow forward drive at ~1/3 walk-on speed (I1–I4); E2/E3 re-routed to easy; D3 superseded | [dog-behavior.md](./dog-behavior.md) | **implemented** 2026-08-22 — acceptance 1–10 measured PASS ([log](./dog-behavior.md#acceptance-log--p3-gate-2026-08-22-seeds-1337--42-regression-anchor)); Q31–Q37 on bolded defaults, owner review pending |

## Locked decisions (this version)

From the owner's notes (2026-08-22), taken as given:

- **Come-by / away track the outside of the herd perimeter line** in their
  direction (CW / CCW) — the flock outline, not a circle around the GCM.
- **The flank ends at the gate line** — the perimeter point that points the
  flock at the gate; the C7 overshoot is superseded.
- **At that point the dog goes to *easy*** on his own.
- ***Easy* replaces *stand* altogether** — a slow move forward at about
  **one third of walk-on speed**.

## Still open

Owner review, all with bolded defaults in
[the spec](./dog-behavior.md#open-questions-parked--for-the-owner-defaults-in-bold):

- ~~**Q31** perimeter = hull shape at `flankStandoff`, outline stays a render aid (**yes**)~~ **overturned by the owner 2026-08-22** → the dog tracks the outline itself (touch-up 3 below)
- **Q32** easy's threat profile (**drive eye, full intensity; posture wall is lie-down-only**)
- **Q33** keep `flankOvershootDeg` (**yes, default 0; Sweep row `[0, 0, 60]`**)
- **Q34** draw the dog's track while flanking (**yes, `debug.dogTrack` on**)
- **Q35** lever owner of `easySpeedFrac` (**Standoff `[0.4, 0.33, 0.25]`**; `standBlock` → superseded)
- **Q36** easy issued from anywhere (**heads for the trailing spot at easy pace, like walk-on**)
- **Q37** (added in P2) parked flank point ignores fence-seek (**yes**; field clamp kept)
- ~~**Q38** (tune pass) easy's ⅓ pace is masked after a handoff by E1's hard-coded 25 px/s close rate — scale the governor by `easySpeedFrac` in easy? (**yes, spec-level; owner's call**)~~ **shipped 2026-08-22** (touch-up 4 below)

## Touch-up (owner-directed, 2026-08-22, after the P3 gate)

**Fence-seek ramp.** C2's fence pull used to switch on as a hard step at
`reach = 2 × flankStandoff`, which made the flank target jump **160 px** in
one tick as the point crossed it (the seed-42 reversal read CCW 152° vs
**CW 31°** for that reason — v4 had logged the same "mixed" wobble). New
tunable **`fenceSeekRamp`** (Dog, **0.5**, 0–1 · 0.05; `substrate`, not
levered): the pull fades in over the outer half of the reach via
`smoothstep`; 0 restores the step. Measured: seed-42 reversal **CCW 152° vs
CW 1°**, max target jump/tick **15–37 px** (was 160); seed 1337 still shows
an **80 px** jump — that is the Q37 snap when a parked point drops its fence
bias, by design, not the reach step. Handoffs unchanged (all → easy, carries
−2.1 / −4.5 / +1.5 / −13.2°), E1 48–58 px, idle digests = v5, boot
`anchor 88/88 · 39 not-levered = 127 keys · OK`.

**Park fade** (second touch-up, same day). When the flank point parked, its
fence pull dropped to zero in one tick — the target snapped **43 px** (1337
come-by) / **15 px** (42 away) on the parking tick. New tunable
**`parkFade`** (Dog, **0.5 s**, 0–2 · 0.05; `substrate`): the pull fades
out over that window after parking; 0 = instant. Measured: parking-tick
snap **2 px** on all four runs, no in-flank target move above 4 px/tick
(the ordinary advance); handoffs → easy at −1.7 / −5.0 / +3.8 / −14.3°, E1
50.6–61.5 px, idle digests = v5, boot `anchor 88/88 · 40 not-levered = 128
keys · OK`. (An earlier note blamed an 80 px jump at seed 1337 on this
snap — that figure was the command-entry tick, target moving from the
owner's post to the first flank point, and is benign.) Snapshot re-exported
(now v5 + four keys).

**Perimeter track** (third touch-up, owner-directed: "for come by and away,
the dog should track along the current herd boundary — not the new one that
is so far off set"). Q31's default is overturned: the flank point rides the
**dotted outline itself**. The outline margin is promoted from
`debug.outlineLengths` (3 sheep-lengths, render-only) to a sim tunable
**`perimeterMargin`** (Dog, **36 px**, 12–96 · 2; Standoff `[24, 36, 60]`),
§1 and §2 both read it; **`flankStandoff`** (140) is superseded (hidden,
`LEVER_NOT_LEVERED.superseded`, key kept in the defaults file like
`R_orbit`); the fence-seek reach it set is its own tunable
**`fenceSeekReach`** (Dog, **72 px** = 2 × margin, 20–300 · 4; Standoff
`[48, 72, 120]`) — at the old 280 the C2 pull dragged the point 72 px off
the line (seed 1337 come-by). The `3·dt` ring-radius ease is removed (v3
legacy; on a 36 px margin it cut 10–15 px inside the line). Measured: flank
target on the line on **100 %** of unclamped ticks (bias 0), target move
≤ 5 px/tick, dog's own median distance to the hull **45–47 px** (he trails
the point by ~40–55 px), handoffs → easy at **−2.0 / −3.9 / −4.6 / −6.7°**
and **2–4 s sooner**; the edge sheep recoil inward — flock spread falls,
hull area never grows; idle / walk-on / easy digests **byte-identical**;
boot `anchor 89/89 · 89 levered + 39 not-levered = 128 keys · OK`;
snapshot + defaults carry the two keys (117). Full log in
[the spec](./dog-behavior.md#acceptance-log--p3-gate-2026-08-22-seeds-1337--42-regression-anchor)
(Addendum 3). *Owner read pending:* he is inside `R_flee` of the edge the
whole way — by rule now.

**Governor pace — Q38** (fourth touch-up, owner: "do all the things you
wanna do"). E1's hard-coded 25 / 40 px/s close / back-off rates are Dog
tunables **`driveCloseRate`** / **`driveBackoffRate`** (`substrate`, not
levered — anchor untouched), and **easy scales both by `easySpeedFrac`**,
so the creep reads at ⅓ pace from the gate line, where the tune pass found
it masked. Measured: governor close 140 → 55 px after a come-by handoff
**12.8 / 10.5 s** at ⅓ (1337 / 42) vs **5.7 / 4.3 s** walk-on (before:
3.4–5.9 s at every fraction); I3 gap ≥ 39.5 px; pure walk-on digests
byte-identical; E2's conversion tick unchanged. A second headless tune
pass the same day on the touch-up-3 dials (`perimeterMargin`,
`fenceSeekReach`) adopted nothing — both monotone, no knee; logged in
[`tune-2026-08-22.md`](./tune-2026-08-22.md) (part b). Boot `anchor 89/89
· 89 levered + 41 not-levered = 130 keys · OK`; snapshot + defaults at 119
keys.

**Cleanups (owner: "do all the rest of the things on your list").**
`standBlock` removed outright — schema entry, not-levered list and defaults
key (nothing referenced it; the v4/v5 snapshot files still carry the key
and would log the typo-guard warning if loaded as a defaults file). And the
v5 carried-forward one-liner: `reseed()` now ends with
`setCommand('that_ll_do')` when a dog exists, so a bare reseed starts the
new course at heel instead of inheriting the previous drive (the page and
the harness already did this explicitly; now §1 owns it). A `/sheep tune`
pass on easy + flank ran the same day —
[`tune-2026-08-22.md`](./tune-2026-08-22.md).

**Carried forward out of v6:** owner's `file://` check of v6 (zero console
errors, `[levers] … OK`, the flank visibly running ON the dotted outline and
the dog easing forward at the gate line); easy being slower than a bolting sheep (I2 by rule — hands-on
read).

**Carried forward from v5 (unchanged, not v6 scope unless the owner says so):**

- Owner's `file://` check of v5 (zero console errors, `[levers] … OK`, five
  reloads → five courses) — v6's acceptance phase re-asks the same thing.
- `/sheep tune` pass per lever — every endpoint is a proposal.
- POC-v5 Q27's deferred half (Approach biasing the archetype draw), Q30
  (more archetypes).
- `reseed()` leaves `dog.command` alone — one-liner candidate.
- POC-v4 Q12 (return-transit drift) — **moot if C8 ships on its default**:
  there is no overshoot transit any more at `flankOvershootDeg 0`.
- POC-v2 Q8 (80-sheep gather ceiling), POC-v3 D2 (a dart has never been
  observed), v3's logged follow-ups (stale `dog.target` on command entry,
  walk-on parking with `fwdN 0`, `crushThreshold` re-calibration post-G1),
  Judging as the parked fourth lever domain.
