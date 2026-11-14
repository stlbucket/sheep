# Obstacles v1 — tree stands and large rocks (O1–O7)

**Status:** implemented 2026-11-14 (owner note, built without gates; `file://` eyeball pending). A new behavior list — it sits beside [POC-v9 flock-behavior](../POC-v9/flock-behavior.md) and [POC-v9 dog-behavior](../POC-v9/dog-behavior.md) rather than extending either, because it constrains the course, the flock and the dog at once.

Until now the pasture was bare grass inside a fence. Now a course may carry a few **stands of trees** and **large rocks**. They are solid: nothing walks through one. A flock driven at one flows round it and readily comes out the far side as two groups, and a sheep standing behind one is out of the dog's sight.

## Semantic rules (what it must look like)

### O — obstacles

- **O1 — what and where.** A course may contain **small stands of trees** and **large rocks**. They are laid out the way the herd is: in **groups of 1–3** that clump into one bigger stand or rock pile, the groups scattered over the field **a clear lane apart**. No obstacle crosses the fence, sits in the **gate mouth or its approach**, or on the handler's post, and **no sheep ever starts inside one**.
- **O2 — how many.** The number of obstacle groups is **random per course**, drawn from a wide range. **Most courses land in the lowest 10 % of that range** (often one or two groups, sometimes none), a few in the middle, and a **very occasional outlier** fills the field. The same seed always draws the same obstacles.
- **O3 — solid.** **Neither a sheep nor the dog is ever inside an obstacle**, however hard the flock is pressed against it.
- **O4 — the flock goes round, and parts.** A moving group that meets an obstacle **seeks a path around it** rather than piling up against it: each sheep goes round on the side it is already on, so a group that meets one squarely **splits into two groups fairly easily** — and both halves get past.
- **O5 — cover.** An obstacle **between the dog and a sheep hides that sheep from him**: it does not feel his pressure until he comes round. A sheep at the very rim of a stand eases in and out of cover rather than flickering.
- **O6 — the dog goes round.** The dog **runs round** obstacles on the way to wherever his command sends him, and **does not dither** in the notch between two members of a clump. A recall across a stand costs him a short detour, not a stall.
- **O7 — the slider.** Every version (2D, 3D, 3D-assault) carries an **`obstacles` slider beside the dog pad**. It is an **exact count** of obstacle groups, and courses are **random until it is touched** (owner Q65): a page loads drawing each course's count by O2 and the slider merely shows what this course drew (`2 · random`); once moved, **every course gets exactly that many** and the readout is the bare number. Releasing it re-lays the course. At **0** there are no obstacles and the course is exactly what the same seed gave before obstacles existed.
- **O8 — the Clutter lever.** The 2D Levers panel has a **Pasture · Clutter** lever (owner Q67): at **0** the pasture is bare, at **0.5** it is the shipped default, toward **1** there are **more** obstacles, **bigger** ones, and **tighter lanes** between them.
- **O9 — rocks shield a blast.** In the assault version a **large rock between a mortar blast and a sheep protects that sheep** from it entirely; a **stand of trees does not** (owner Q66).

*(room to grow)*

## Force-model mapping (the how — force-model.md conventions)

All of it is in `web/lib/sheep-sim.js` (§0 + §1, DOM-free); the pages only draw.

- **An obstacle** is a solid disc `{x, y, r, kind, group, seed}` in `sim.obstacles`. `kind` is `trees` or `rocks`, chosen per group (`obstacleRockFrac`); a rock's radius is `obstacleRockScale` of the stand radius drawn for it. What fills the disc — the crowns of a stand, the boulders of a rock — is `obstacleItems(o)`, a pure function seeded per obstacle, so the 2D canvas and both three.js pages draw the same stand.
- **Count** (`placeObstacles`): with `obstacleRandom` on (the load default), `groups = round(obstacleRangeMax × f)` where `f = 0.1·u` with probability `obstacleLowShare` (0.85), else `0.1 + 0.9·u³`. With it off, exactly `obstacleFreq` groups. The slider (wired once, in `web/lib/sheep-gui.js`) writes `obstacleFreq` and switches `obstacleRandom` off; ticking `random count` in the Obstacles folder goes back.
- **Lever**: `pastureClutter` (respawns) owns `obstacleFreq` [0, 2, 12], `obstacleRangeMax` [0, 24, 60], `obstacleGroupMax` [1, 3, 5], `obstacleRadiusMin` [14, 20, 30], `obstacleRadiusMax` [30, 46, 70] and `obstacleMinGap` [90, 60, 36] — count in both modes, size, gaps. The endpoints are proposals, like every lever's.
- **Blast shield** (`explode` in `web/lib/assault-sim.js`): a sheep is skipped when the blast→sheep line cuts a `rocks` obstacle.
- **Layout**: per group, a size of 1..`obstacleGroupMax`; the first member is rejection-sampled over the field (60 tries), later members are placed against an earlier one, **overlapping it by 10–40 % of the smaller radius** (12 tries). A candidate must keep `obstacleMinGap` edge-to-edge from the fence and from other groups, stay `max(spawnGateClear, gateAttractR, 100)` off the gate and 50 px off the handler's post. Best-effort: a crowded field just gets fewer.
- **PRNG discipline**: obstacles draw from their **own** stream derived from the seed, never `this.rng`. So a seed's gate, home post and spawn side do not move with any obstacle setting, and `obstacleFreq` 0 replays the pre-obstacle course draw for draw.
- **Spawn**: group seeds are rejected inside an obstacle (+ half the member jitter); a member jittered into one is moved to its edge. With no obstacles neither path rejects or moves anything.
- **Sheep steering** (`obstacleForce`, weight `w_obstacle`): (1) within `r_obstacle` of an edge the obstacle pushes straight off, fence-style; (2) a **moving** sheep whose heading would carry it into an obstacle inside `obstacleLook` gets a force perpendicular to its heading, **away from the obstacle's centre** — a dead-centre sheep is sent by index parity. The sidestep is what produces the two streams.
- **Splitting** — the force also returns `a` (0–1, how hard the sheep is working round something) and `integrate` scales that sheep's cohesion by `1 − a · obstacleSplit`. Without it cohesion pulls the two streams back across the obstacle and the group stalls in front of it (measured below).
- **Solid** (`pushOut`): after integration a sheep (and the dog) inside a disc is moved to its edge and loses the into-the-obstacle part of its velocity — the fence clamp's idea on a circle. Two passes settle a point between two overlapping members.
- **Cover** (`coverBetween`, in `flee`): the deepest cut the dog→sheep sight line makes into any obstacle, eased over `obstacleCoverEdge` px, scales the threat by `1 − obstacleCover · cover` before stress, panic and the boldness gate read it.
- **Dog** (`dogDetour`, in `stepDog`): a target that falls inside an obstacle moves to its edge; the heading to the target bends to the tangent of the nearest obstacle blocking the way, re-tested up to four times so a clump is skirted as one shape. The side he goes round is chosen once and **held** (`dog.avoidSide`) until the way is clear.

## Tunables

All new, category **Obstacles** (Course & Meta panel). Count, size and gaps belong to the **Pasture · Clutter** lever; the rest are not levered (`LEVER_NOT_LEVERED.obstacles`).

| Key | Default | What it does |
|---|---|---|
| `obstacleFreq` | 2 groups (0–60) | Exact count while `random count` is off — **the slider** |
| `obstacleRandom` | on | On = each course draws its count; the slider switches it off |
| `obstacleRangeMax` | 24 groups (0–60) | Top of the range the random draw uses |
| `obstacleLowShare` | 0.85 | Share of courses drawn from the lowest 10 % of the range |
| `obstacleGroupMax` | 3 | Obstacles per group, 1..this |
| `obstacleRadiusMin` / `obstacleRadiusMax` | 20 / 46 px | Stand radius range |
| `obstacleRockFrac` | 0.4 | Chance a group is rocks |
| `obstacleRockScale` | 0.6 | Rock radius as a fraction of the drawn stand radius |
| `obstacleMinGap` | 60 px | Edge-to-edge lane between groups and to the fence |
| `w_obstacle` | 2 | Strength of a sheep's steering round an obstacle |
| `obstacleLook` | 70 px | How far short of an edge a moving sheep starts to sidestep |
| `r_obstacle` | 22 px | Push-off range and the clearance a sheep aims to pass by |
| `obstacleSplit` | 0.8 | Cohesion a sheep drops while working round an obstacle |
| `obstacleCover` | 1 | How much of the dog's pressure cover removes (0 = he works through obstacles) |
| `obstacleCoverEdge` | 8 px | Soft rim of the cover |

## Constraints

- §1 stays DOM-free; the pages read `sim.obstacles` and call `obstacleItems`, nothing else.
- Obstacle draws never touch the main PRNG stream (see above) — `obstacleFreq` 0 must stay a bit-for-bit replay.
- The 3D pages rebuild the course on every reseed (the gate object changes), which is what picks the new obstacles up; no separate signature is kept.

## Q65–Q70 — asked and answered by the owner, 2026-11-14

Shipped first on bolded defaults, then walked with the owner the same day. Three overturned, three kept.

- **Q65 — overturned.** The slider shipped as the top of the random range. Owner: it is an **exact count**, and courses stay **random until the slider is touched**. `obstacleFreq` became the exact count (default 2), the range top moved to the new `obstacleRangeMax` (24). → O7.
- **Q66 — overturned.** Shipped with mortars ignoring obstacles. Owner: **only rocks shield** a sheep from a blast; tree stands do not. Read as full protection (no kill, stun or panic) for a sheep whose line to the blast crosses a rock. → O9.
- **Q67 — overturned.** Shipped with no lever. Owner: a **new Pasture lever** moving **count, size and gaps**. → O8, `pastureClutter`.
- **Q68 — kept.** The scoring line still runs straight from the flock to the gate, through any obstacle in the way; a detour costs line score.
- **Q69 — kept.** A trotting column sidesteps an obstacle like any moving sheep and does not stop for it.
- **Q70 — kept.** The dog's flank line is still the flock's convex hull; where it crosses an obstacle the flank point is pushed to the obstacle's edge. Revisit if a flock wrapped round a big stand looks wrong in play.

## Acceptance criteria

Headless against `web/lib/sheep-sim.js` (plain node `vm`, shipped defaults), plus a page load.

- **O1** — over 2000 seeds: no sheep spawns inside an obstacle, no obstacle crosses the fence or sits within 100 px (+ its radius) of the gate.
- **O2** — over 2000 seeds at the default range: more than 80 % of courses draw from the lowest 10 % of the range, fewer than 10 % draw more than half of it, and at least one does.
- **O3** — 60 s of alternating flank and drive on a 12-group course: zero ticks with a sheep or the dog inside an obstacle.
- **O4** — 30 sheep driven squarely at one 40 px stand, as laid and mirrored: at least 6 pass on each side and all 30 get past.
- **O5** — a sheep 130 px from a driving dog reads zero stress behind a rock and non-zero in the open; with `obstacleCover` 0 the rock makes no difference.
- **O6** — a recall straight across a three-stand clump gets home in under twice the straight-line time, never inside an obstacle.
- **O7** — all three pages load from `file://` with zero console errors in random mode with the slider visible; moving it to 14 switches random off and the next courses all have 14 groups; at count 0 seed 42 replays sheep for sheep.
- **O8** — Clutter at 0 gives no obstacles over 300 random courses; at 1 the mean count and mean radius both exceed 0.5's; back at 0.5 the raw values are the schema defaults.
- **O9** — a sheep behind a rock is untouched by a blast that stuns a sheep in the open; behind a tree stand instead it is hit.

## Acceptance log — 2026-11-14

Two passes the same day: O1 and O3–O6 measured on the first build (before the Q65–Q67 answers; that code did not change), O2 and O7–O9 measured again after them.

Lever self-check on load after the answers: `anchor 100/100 exact · 100 levered + 74 not-levered = 174 schema keys · OK`.

| Rule | Result | Measured |
|---|---|---|
| O1 | PASS | 2000 seeds: 0 sheep spawned inside an obstacle, 0 obstacles across the fence, 0 inside the gate clearance |
| O2 | PASS | 2000 seeds, range top 24: **88.8 %** drew 0–2 groups, **3.9 %** drew more than 12, max 24 |
| O3 | PASS | seed 42, 12 groups (27 obstacles), 60 s: 0 ticks inside an obstacle, 0 NaN |
| O4 | PASS | as laid **12 north / 18 south**, mirrored **15 / 15**, 0 not past in both |
| O5 | PASS | stress **0.000** behind a rock, **0.151** in the open, 0.151 behind the rock with cover 0 |
| O6 | PASS | home in **4.7 s** across the clump (straight line 4.1 s), 0 ticks inside |
| O7 | PASS | 2D, 3D and 3D-assault: no console errors or warnings; load reads `2 · random`; slider to 14 → `random count` off and 14 groups on each of four courses; after 20 s of herding 0 sheep and no dog inside an obstacle; count 0 → seed 42 identical, gate identical with and without obstacles |
| O8 | PASS | Clutter 0 / 0.5 / 1 over 300 random courses: mean groups **0.00 / 1.88 / 4.79**, mean obstacles 0.00 / 3.60 / 11.41, mean radius – / 27.4 / 39.2 px; raw values back at defaults at 0.5 |
| O9 | PASS | sheep behind a rock: untouched; sheep in the open 35 px from the blast: hit; same sheep behind a tree stand: hit |

One contrast run, not a criterion: with `obstacleSplit` 0 the mirrored O4 drive stalled in front of the stand (7 past, 23 not) while the as-laid drive still passed 12 / 18 — cohesion pulling the two streams back together is what the dial removes.

The O4 dog is scripted (pressing from behind the lower-quartile sheep, going round the stand himself), not the game's command chain; the game's own dog is exercised by O3 and O6.
