# Scoring rework (SC12–SC24)

**Status:** implemented 2026-11-17 (owner `file://` eyeball pending) — built from the owner's interview answers; Q90, Q96, Q97 answered by the owner the same day; the other questions were built on their bolded defaults; acceptance measured PASS ([log](#acceptance-log--2026-11-17)); values **retuned the same day** from measured driven runs, owner-approved ([retune](#retune--2026-11-17)).

[POC-v14 scoring](../POC-v14/scoring.md) pays 100 or 200 per sheep with a multiplier capped at ×5 and small flat bonuses, so every win lands in a narrow band and nothing can go wrong. This spec keeps the count-up total and replaces most of what feeds it: three tiers per sheep, a condition that drains when sheep are handled roughly, an uncapped chain fed by quality, three strikes that end the run, end bonuses that multiply, and four jackpots.

## Goals

1. A scramble, a decent run and an excellent run of the same course differ by orders of magnitude, not by a third.
2. The player can see value being lost while they are rough, and a run can fail.
3. A run has moments worth chasing, and they are announced when they happen.
4. A run that is not won still scores differently according to how far it got.
5. One implementation in `web/lib/sheep-sim.js` serves all three pages.

## Non-goals

- Drive-gate multiplier, new specials, side objectives — [field-objectives.md](./field-objectives.md).
- What the HUD and the end card show — [verdict-and-hud.md](./verdict-and-hud.md).
- Saved history and collection — [records.md](./records.md).
- Retuning flock or dog behavior. Sound.

## Semantic rules (what it must look like)

SC1 (the total never decreases) and SC7 (a pop per event), SC8 (the card counts up) and SC11 (assault points) stand. **SC2–SC6, SC9 and SC10 are replaced** by the rules below.

### SC — scoring (continued)

- **SC12 — three tiers.** A sheep through the pen gate scores by how it came in: **RUSHED 50** if it trots, bolts or is worked up; **CALM 200** if it walks in unstressed; **PERFECT 500** if it walks in with next to no stress. Each sheep scores once.
- **SC13 — condition.** Every sheep carries a **condition** that starts at 100 %. It **drains quickly while the sheep is panicking**, **slowly while it is trotting**, and **recovers slowly while it is left calm**. A sheep that goes down has no condition left. What a sheep pays at the gate is **its tier times its condition**, so a sheep that was chased across the field and then walked in calm pays less than one that was never upset.
- **SC14 — flock value.** The sum of what the sheep still in the pasture could pay if each walked in perfect at its present condition is the **flock value**. It is on screen all the time, it visibly falls while sheep are being upset and creeps back when they are left alone.
- **SC15 — the chain.** A sheep that crosses within the window of the one before it continues a **chain**. A PERFECT crossing raises the chain by **two**, a CALM one by **one**, and a RUSHED one **keeps the chain alive without raising it**. There is **no cap**. The window is **1.5 s** at the start and **tightens to 0.4 s as the chain grows**. Each crossing's points are multiplied by the chain value. When the window lapses, or on a strike, the chain drops back to ×1.
- **SC16 — three strikes.** A run has three strikes. **A sheep run hard into the fence is a strike. Every fifth sheep that breaks into a panic is a strike. A sheep going down is a strike**, and on the assault page that includes **a sheep lost to a mortar** (owner Q96). A strike is announced, ends the chain, and shows as a mark on screen. **The third strike ends the run on the spot** (a bust): the points earned so far are kept and the run is not won.
- **SC17 — time is a tie-breaker.** Par stays on screen. Finishing under par adds a **small flat bonus per second**, added after all multipliers; finishing over par costs nothing. Time decides nothing else.
- **SC18 — end bonuses multiply.** On a won run the points earned in play are **multiplied** by each of: **full flock ×1.5**, **clean run ×1.5** (no strikes), **all calm ×2** (no sheep penned RUSHED), and a multiplier **for each award** earned. They multiply together, and the card shows each as its own line.
- **SC19 — awards with rarity.** Each named award has a rarity, and rarer awards multiply more: **common ×1.05, rare ×1.1, legendary ×1.25**.

  | Award | Rarity | Earned when |
  |---|---|---|
  | **Quiet Hand** | common | won with few commands for the flock size |
  | **Straight as a Die** | common | the flock spent at least 80 % of the run on the ideal line |
  | **Photo Finish** | common | won within 3 s either side of par |
  | **Gatekeeper** | common | every drive gate on the course was cleared by the whole flock |
  | **Not a Hair Out of Place** | rare | no sheep was penned RUSHED and no strike was taken |
  | **Never Sat** | rare | won without once using a lie-down command |
  | **Steady Away** | rare | won using only the easy (half-speed) flanks and walk-on |
  | **Full Purse** | rare | the flock value never fell below 90 % of its starting value |
  | **Sunday Stroll** | legendary | every sheep was penned PERFECT |
  | **Nobody Ran** | legendary | no sheep ever broke into a trot |
  | **Not a Word Wasted** | legendary | won with no more commands than half the Quiet Hand allowance |

  One Stream is gone as an award: it is the whole-flock jackpot (SC22).

- **SC20 — partial credit.** A run that ends without the whole flock penned (a bust, or the player ending it early) still gets an end multiplier: the full-flock ×1.5 is **scaled by the share of the flock that was penned**, and all calm ×2 still applies if at least half the flock was penned and none of them RUSHED. Clean run and awards need a won run.
- **SC21 — PERFECT FILE.** A chain of **twenty or more crossings with no RUSHED sheep in it** is a perfect file. When that chain ends, **everything it earned is paid again**, with a banner.
- **SC22 — ONE GO.** Penning the **entire flock in a single unbroken chain** multiplies the run by **×1.5** at the end, with a banner when the last sheep crosses.
- **SC23 — FRENZY.** Each time the chain passes a **multiple of twenty-five** (×25, ×50, …) a short **frenzy** opens in which **every crossing pays double**. Each crossing during a frenzy extends it a little, up to a limit; a strike ends it.
- **SC24 — the last sheep.** The crossing that fills the pen pays a **closing bonus scaled by the chain value at that moment**: full if that sheep is PERFECT, half if CALM, nothing if RUSHED.

*(room to grow)*

## Force-model mapping (the how)

All in `web/lib/sheep-sim.js` §0 + §1, DOM-free. Scoring still draws no random numbers.

- **Tier (SC12):** at the crossing, `rushed = s.trot || s.panic || s.stress >= penCalmStress`; else `perfect = s.stress < penPerfectStress`; else calm.
- **Condition (SC13):** `s.cond` in `[condFloor, 1]`, updated each step for sheep not yet through: `−condPanicDrain·dt` while `s.panic`, `−condTrotDrain·dt` while `s.trot`, `+condRecover·dt` while idle (not alert). A down sheep has `cond = 0`. Payout base = `tierPoints × s.cond × kind multiplier`.
- **Flock value (SC14):** `Σ penPerfectPoints × s.cond × kind multiplier` over sheep that are neither through nor down; `run.valueStart` is its value at spawn and `run.valueMin` its lowest point (Full Purse).
- **Chain (SC15):** `run.combo` keeps its name. First crossing of a chain is ×1; a later crossing inside the window adds 2, 1 or 0 by tier and resets `comboT`. Window `= lerp(comboWindow, comboWindowMin, clamp((combo − 1) / (comboTightenAt − 1), 0, 1))`. Multiplier applied to a crossing `= combo + run.gateMult` ([FO7](./field-objectives.md)). `comboMax` is removed.
- **Strikes (SC16):** `run.strikes`, `run.panics`. A panic counts on the step a sheep's `panic` flag goes from false to true, at most once per sheep per `panicRearm` seconds. A **fence slam** is a sheep reaching the perimeter fence with a speed into it above `fenceSlamSpeed`, at most once per sheep per `panicRearm` seconds; nothing detects this today, so it is a new test in the fence-clamp path that reads the sheep's velocity and writes nothing back. `strike(reason, x, y)` pushes a `strike` score event, breaks the chain, ends any frenzy, and on the third calls `finishRun()` with `run.bust = true`.
- **Time (SC17):** `floor(max(0, par − run.t)) × parPointsPerSec`, added after the multipliers on a won run.
- **End multipliers (SC18–SC20, SC22):** `run.playPoints` is everything paid during play. At the end the sim computes the list `[{ key, label, mult }]`, their product `run.endMult`, and adds `playPoints × (endMult − 1)` to the total through `award('mult', …)` so the total still only climbs and the card can show each multiplier as a line.
- **Perfect file (SC21):** per chain, `chain.n` (crossings), `chain.rushed` (count) and `chain.points`. On chain end with `n >= perfectFileMin && rushed === 0`, `award('file', chain.points, …)`.
- **Frenzy (SC23):** `run.frenzyT` seconds remaining. Opens at `frenzySecs` whenever `floor(combo / frenzyEvery)` rises; each crossing while live doubles that crossing's points and adds `frenzyExtend`, capped at `frenzyMax`.
- **Last sheep (SC24):** on the crossing that fills the pen, `award('finisher', finisherPoints × mult × (1 | 0.5 | 0), …)`.
- **`score()`** gains `tier counts { rushed, calm, perfect }`, `flockValue`, `valueStart`, `strikes`, `bust`, `comboWindowNow`, `comboT`, `frenzyT`, `endMults`, `playPoints`, and drops `stars`. The fields the verdict needs are in [verdict-and-hud.md](./verdict-and-hud.md).
- **Wave mode:** tiers, condition, the chain, frenzy and perfect file apply. Strikes carry across waves and the third ends the session. The full-flock, clean and all-calm multipliers apply to each wave's own play points when its pen fills (Q98).
- **Assault:** a sheep lost to a mortar **is a strike** (owner Q96) and its condition leaves the flock value. It still takes no points off the total (SC1), but SC11's "costs nothing" no longer holds: three mortar kills bust the run.

## Tunables

Category **Scoring**. **Removed:** `penCalmPoints` (renamed), `comboMax`, `fullFlockBonus`, `cleanRunBonus`, `awardPoints`, `starCalmShare`.

| Key | Default | What it does |
|---|---|---|
| `penPoints` | 50 | RUSHED tier (was 100) |
| `penCalmPoints` | 200 | CALM tier |
| `penPerfectPoints` | 500 | PERFECT tier |
| `penCalmStress` | 0.15 | Stress below which a walking sheep is CALM |
| `penPerfectStress` | 0.03 | Stress below which a walking sheep is PERFECT |
| `penStressMemory` | 3 s | How long the stress a tier reads is smoothed over |
| `condPanicDrain` | 0.10 /s | Condition lost per second while panicking |
| `condTrotDrain` | 0.02 /s | Condition lost per second while trotting |
| `condRecover` | 0.01 /s | Condition regained per second while idle |
| `condFloor` | 0.2 | Lowest condition a standing sheep can reach |
| `comboWindow` | 1.5 s | Chain window at ×1 |
| `comboWindowMin` | 0.4 s | Chain window once the chain is long |
| `comboTightenAt` | 30 | Chain value at which the window reaches its minimum |
| `strikeMax` | 3 | Strikes that end the run |
| `strikePanics` | 5 | Panics per strike |
| `panicRearm` | 5 s | Shortest gap before the same sheep's next panic or fence slam counts again |
| `fenceSlamSpeed` | 100 px/s | Speed into the fence above which a sheep reaching it is a slam |
| `strikeCooldown` | 3 s | A second strike inside this long of the last is not counted |
| `parPointsPerSec` | 10 | Flat points per second under par (was 20) |
| `multFullFlock` | 1.5 | End multiplier, whole flock penned |
| `multClean` | 1.5 | End multiplier, no strikes |
| `multAllCalm` | 2 | End multiplier, no RUSHED sheep |
| `multAwardCommon` / `Rare` / `Legendary` | 1.05 / 1.1 / 1.25 | End multiplier per award |
| `multOneGo` | 1.5 | End multiplier, whole flock in one chain |
| `perfectFileMin` | 20 | Crossings in a chain for PERFECT FILE |
| `frenzyEvery` | 25 | Chain step that opens a frenzy |
| `frenzySecs` / `frenzyExtend` / `frenzyMax` | 4 / 0.5 / 6 s | Frenzy length, extension per crossing, cap |
| `finisherPoints` | 500 | Last-sheep bonus before the chain multiplier |
| `fullPurseShare` | 0.9 | Full Purse threshold |

The Strictness lever keeps `penCalmStress`, `comboWindow`, `parBase`, `parPerSheep` and gains `penPerfectStress` and `comboWindowMin`.

## What scores look like — measured 2026-11-17, before the retune

These are the values as first built. The [retune](#retune--2026-11-17) below changed them; its section has the same measurements afterwards.

Headless, one 30-sheep course (seed 42, no drive gates, specials or side objectives), sheep penned by script at a set tier, condition and spacing. Handling statistics were set to ordinary values (30–60 commands, some lie-downs and full flanks, sheep trotted) except in the last row.

| Run | How it went | In play | End multiplier | Total | Percent | Rank |
|---|---|---|---|---|---|---|
| Scramble | all RUSHED at 60 % condition, 5 s apart, two strikes | 900 | ×1.65 | 1,485 | 0.4 % | Lost Tourist |
| Decent | all CALM at 90 %, six chains of five | 17,450 | ×5.94 | 104,723 | 25 % | Shepherd |
| Excellent | all CALM at 95 % in one chain | 340,000 | ×21.4 | 7,271,820 | 1,738 % | One Man and His Dog |
| Flawless | all PERFECT at 100 % in one chain, 8 commands, every award | 1,793,500 | ×114 | 205,032,143 | 48,992 % | One Man and His Dog |

That is about 4,900 to 1 between the scramble and the excellent run, and about 140,000 to 1 to the flawless one. The awards account for more of it than the draft projected: several are easy to hold together and they multiply each other.

**Driven runs.** A crude scripted handler (flank until the dog is behind the flock, then `easy`), 150 s limit, default settings, ten seeds each:

| Flock | Courses finished | Totals of finished runs | Percent of finished runs | Strikes |
|---|---|---|---|---|
| 40 sheep | 8 of 10 | 6.0 M to 79.5 M | 780 % to 9,800 % | 0 or 1 |
| 80 sheep | 3 of 10 | 37 M to 125 M | 1,250 % to 4,070 % | 0 or 1 |

Two things stand out and are **left as measured** for the owner's tune pass (Q97):

- **Once a flock starts through the gate it files through in one chain.** The gate's draw pulls the column in, so chains of ×40 to ×150 are normal for any run that gets the flock to the gate, the jackpots all fire, and a finished run lands far above 500 %. The top rank is where almost every finished run ends up; the real spread is between finishing and not finishing.
- **Most walkers arrive PERFECT.** 75 of 80 sheep in the best 80-sheep run. The dog is usually out of reach by the time a sheep crosses, even with the stress memory described below.

## Constraints

- **§1 stays DOM-free** (invariant 3): banners, meters and the card live in `web/lib/sheep-score-ui.js`; the sim only exposes state, `scoreEvents` and `score()`.
- **No magic numbers** (invariant 4): every value above is a `SETTINGS` entry claimed by a lever or `LEVER_NOT_LEVERED`.
- **One copy of the physics** (invariant 2).
- **Every phase leaves all three pages runnable** from `file://` with zero console errors (invariant 5).
- Scoring draws nothing from `this.rng`; a seed's course and flock behavior are unchanged. Condition is read by scoring only and never feeds back into a sheep's behavior.

## Acceptance criteria

1. Over a full headless run, including a bust, the total never decreases between steps.
2. One sheep alone at 100 % condition pays 50 trotting, 200 walking at stress 0.1, and 500 walking at stress 0.01.
3. A sheep held in panic for 3 s then penned PERFECT pays 500 × its condition, and its condition is about 70 %; condition never goes below `condFloor` for a standing sheep.
4. The flock value equals the sum over unpenned standing sheep, falls during a forced panic and rises again during idle time.
5. Chain values for crossings inside the window: PERFECT, PERFECT, CALM, RUSHED, CALM give ×1, ×3, ×4, ×4, ×5. Thirty crossings in the window pass ×5 without stopping.
6. The window in force is `comboWindow` at ×1 and `comboWindowMin` at `comboTightenAt` and beyond; a gap of 1 s keeps a ×2 chain and breaks a ×35 chain.
7. Five panic onsets give one strike; a downed sheep gives one strike; a sheep driven into the fence above `fenceSlamSpeed` gives one strike and a sheep walking into it gives none; on the assault page a mortar kill gives one strike. Each strike resets the chain to ×1 and emits one `strike` event.
8. The third strike ends the run with `bust` set, the total unchanged by the strike itself, and no clean-run or award multiplier.
9. A run won 20 s under par gains exactly 200 from time, added after the multipliers; over par gains none.
10. A won, strike-free, all-calm run with no awards has end multiplier 4.5, and the total equals play points × 4.5 plus the time bonus.
11. Each of the eleven awards can be earned and is absent when its condition is not met; its multiplier matches its rarity.
12. A run ended early with 15 of 30 penned, none RUSHED, has end multiplier (1 + 0.5 × 0.5) × 2 = 2.5; a bust with 6 of 30 penned has 1.1.
13. A chain of twenty non-RUSHED crossings pays its own points again when it ends; the same chain with one RUSHED sheep in it does not.
14. Penning the whole flock in one chain applies ×1.5; one lapse anywhere removes it.
15. Crossing ×25 opens a frenzy, crossings inside it pay double, each extends it, it never exceeds `frenzyMax`, and a strike ends it.
16. The crossing that fills the pen pays `finisherPoints × multiplier` if PERFECT, half if CALM, nothing if RUSHED.
17. `comboMax`, `fullFlockBonus`, `cleanRunBonus`, `awardPoints` and `starCalmShare` appear nowhere under `web/`.
18. The same seed spawns the same course and the sheep follow the same paths as in v14 for an identical command script (scoring does not touch behavior).
19. `web/lib/sheep-sim.js` and `web/lib/assault-sim.js` still load in plain node.

## Q90, Q96, Q97 — asked and answered by the owner, 2026-11-17

- **Q90 — how tiers and the draining value combine:** **tier × condition.** Each sheep has a condition from 0 to 100 % and pays its gate tier times that.
- **Q96 — what causes strikes:** **fence slams** and, on the assault page, **mortar kills**, in addition to the every-fifth-panic strike chosen in the interview. Crush injuries were not chosen and **stay switched off**; the downed-sheep strike is built and tested through `injureAtGate()` for when they return. *(Reading of the answer: the owner picked the two additions and not "panics only"; the panic strike is kept because it was part of the three-strikes choice. Say so if it should go.)*
- **Q97 — how wide the spread should be:** **keep everything multiplying and tune after playing.**

## Open questions (built on the bolded default — still the owner's to change)

- **Q110 — how much a fence slam costs.** **Each slam is a full strike** · slams count with panics toward the every-fifth strike · every second slam is a strike.

- **Q91 — how low can condition go.** **A floor of 20 %, so a badly handled sheep still pays something** · no floor (a sheep can become worthless) · a floor of 50 %.
- **Q92 — does condition recover.** **Yes, slowly, only while the sheep is idle** · never (damage is permanent) · quickly.
- **Q93 — what a RUSHED crossing does to the chain.** **Keeps it alive and resets the window, without raising it** · neither raises it nor resets the window · breaks the chain.
- **Q94 — what counts toward a panic strike.** **Every fifth panic over the run, counted across all sheep** · five sheep panicking at the same moment · every fifth different sheep to panic.
- **Q95 — does a strike cost anything beyond the chain.** **No: it ends the chain and any frenzy, and counts toward the bust** · each strike also removes the clean-run multiplier only (already true) and halves the flock value.
- **Q98 — wave mode.** **Strikes carry across waves; the end multipliers apply to each wave's own points when its pen fills** · strikes reset each wave · no multipliers in wave mode.

## Built differently from the draft

- **A sheep's tier reads its recent stress, not only its stress at the gate** (new key `penStressMemory`, 3 s). Measured: with the instant value alone nearly every walker was PERFECT, because the dog is out of reach by the gate. The tier uses the higher of the instant value and a 3 s smoothed one. It is still lenient; see the measured table above.
- **One incident, one strike** (new key `strikeCooldown`, 3 s). A second strike within 3 s of the last is not counted. Without it a panicked group reaching the fence, or one shell killing three sheep, would bust a run in a single moment. On the assault page a strike is therefore **per shell that kills**, not per sheep lost.
- **A fence slam needs a sheep at a full run** (`fenceSlamSpeed` 100 px/s, not the drafted 60). The slow trot is 80 px/s, so at 60 an ordinary trotting column touching the fence would have been a string of strikes. In ten driven 40-sheep runs and ten 80-sheep runs no slam occurred at all, so this strike is rare in practice.
- **Full Purse and the Calm grade read the flock's mean condition**, not the on-screen flock value. The flock value falls to zero as sheep are penned, so it cannot be the measure of how much was kept. The HUD's flock value turns red while condition is being lost, not when a sheep is penned.
- **Rank bands and grade bands are scalar keys** (`rankFarmhand` … `rankOneMan`; `gradeA`, `gradeStep`, `gradeCalmCredit`), because the settings schema has no list type.
- **`run.breaks` and the old One Stream award are gone**; ONE GO (SC22) is detected from the run having exactly one chain that never lapsed.
- **Wave mode:** each filled wave's own points take the full-flock, clean and all-calm multipliers; there is no rank, percent or side objective in wave mode because there is no reference run to measure against.
- **Card lines:** every end multiplier is listed under one `Run multiplier ×N` line, which carries the points they added together.

## Acceptance log — 2026-11-17

Headless node, `npm test` (`test/sim.test.js`, 58 checks, all pass). Re-run after the retune with the new values; the rows below show the retuned figures. Sheep are penned by the harness; no check depends on a scripted dog winning a course.

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | total never decreases, including a bust | 1,620 steps with frenzy, perfect file and three strikes; monotonic | PASS |
| 2 | 50 trotting / 200 at stress 0.1 / 500 at 0.01 | 50 / 200 / 500 (and walking at 0.2 pays 50), and 50 / 500 through the real gate path | PASS |
| 3 | 3 s of panic then PERFECT pays 500 × condition; floor holds | condition 0.700, paid 350; floor 0.20 after 20 s | PASS |
| 4 | flock value = sum; falls under panic; rises grazing | 15,000 → 14,000 → 14,250 | PASS |
| 5 | P, P, C, R, C → ×1, ×3, ×4, ×4, ×5; no stop at ×5 | 1, 3, 4, 4, 5; thirty calm crossings reach ×30 | PASS |
| 6 | window 1.5 s at ×1, 0.4 s from ×30; a 1 s gap keeps ×2 and breaks ×35 | 1.5 s, 0.4 s; kept, broken | PASS |
| 7 | five panics, a downed sheep, a fence slam, a mortar kill each give one strike; a walk-in gives none | 0 → 1 on the fifth panic; injury → 2; walk-in 0; slam 1 (also inside `integrate`); mortar 1 | PASS |
| 8 | third strike busts, takes nothing, no clean or award multiplier | bust, 300 → 330, multipliers: part flock only | PASS |
| 9 | 20 s under par adds exactly 200 after the multipliers; over par none | 200 / 0 | PASS |
| 10 | won, strike-free, all calm, no awards → ×4.5 | ×4.5; 93,000 × 4.5 + 200 = 418,700; card lines sum to the total | PASS |
| 11 | eleven awards on and off, multiplier by rarity | 11 of 11 | PASS |
| 12 | ended early with 15 of 30 calm → 2.5; bust with 6 of 30 → 1.1 | 2.5 / 1.1 | PASS |
| 13 | twenty non-RUSHED crossings pay the chain again; one RUSHED in it → nothing | 42,000 paid again; 0 | PASS |
| 14 | whole flock in one chain → ×1.5; one lapse removes it | present / absent | PASS |
| 15 | ×25 opens a frenzy; doubles; extends; capped; a strike ends it | ×25 paid 5,000, ×26 paid 10,400; +0.5 s; capped at 6 s; 0 after a strike | PASS |
| 16 | last sheep: 500 × multiplier PERFECT, half CALM, none RUSHED | 3,000 at ×6; 1,250 at ×5; 0 | PASS |
| 17 | removed keys nowhere under `web/` | none found | PASS |
| 18 | scoring does not touch behavior | three seeds × 40 s replay the positions recorded when POC-v14 shipped, exactly | PASS |
| 19 | both libs load in plain node | yes; lever assertions 0 errors | PASS |

## Retune — 2026-11-17

Proposed from measurement and approved by the owner the same day (Q97). Scoring never moves a sheep, so 64 driven runs were recorded once (four scripted handling styles; 40 and 80 sheep; 33 finished the course) and the scoring was replayed over them with candidate values. The replay reproduces the recorded totals exactly.

| Setting | Was | Now | Why |
|---|---|---|---|
| `penPerfectStress` | 0.10 | 0.03 | the typical walker arrives at about 0.02 under easy handling and 0.15 under walk-on |
| `penCalmStress` | 0.30 | 0.15 | rough handling now pens 38–50 % RUSHED |
| `comboWindow` → `comboWindowMin` at `comboTightenAt` | 2.5 s → 1.2 s at ×15 | 1.5 s → 0.4 s at ×30 | 97 % of crossings are under 0.5 s apart, so the old window never broke a chain |
| `frenzyEvery` / `frenzySecs` / `frenzyExtend` / `frenzyMax` | 10 / 6 / 1.5 / 12 | 25 / 4 / 0.5 / 6 | it was effectively permanent once a flock started through the gate |
| `perfectFileMin` | 10 | 20 | ten was automatic |
| `multOneGo` | 3 | 1.5 | the whole flock in one chain is the norm |
| `multAwardCommon` / `Rare` / `Legendary` | 1.1 / 1.2 / 1.5 | 1.05 / 1.1 / 1.25 | four to seven usually land together |
| `multSideObjective` | 1.5 | 1.25 | same stacking |
| `rankOneMan` | 5 | 10 | keeps the top rank for about one finished run in ten |

The Strictness lever's endpoints for the two stress thresholds and the two windows moved with their anchors.

**Finished runs by rank (33 of the 64):**

| Rank | Before | After |
|---|---|---|
| Lost Tourist | 0 | 0 |
| Farmhand | 0 | 1 |
| Drover | 1 | 1 |
| Shepherd | 0 | 7 |
| Head Shepherd | 0 | 6 |
| Trial Champion | 6 | 15 |
| One Man and His Dog | 26 | 3 |

Median total of a finished run 20,969,642 → 1,603,074; highest 496,587,573 → 41,758,336. Median percent by handling style: gentle 6,550 % → 474 %, easy 3,609 % → 390 %, rough 893 % → 52 %, walk-on 496 % → 28 %.

**The four scripted runs after the retune** (30 sheep; CALM sheep at stress 0.1, PERFECT at 0.01):

| Run | Total | Percent | Rank |
|---|---|---|---|
| Scramble | 1,418 | 0.3 % | Lost Tourist |
| Decent | 91,816 | 22 % | Shepherd |
| Excellent | 2,037,233 | 487 % | Trial Champion |
| Flawless | 35,337,698 | 8,444 % | One Man and His Dog |

**Not fixed by this retune:**

- **No run busted.** Across all 64 runs the most strikes taken was 1, before and after. The stakes rarely bite in ordinary play.
- **The handlers are scripts.** Four crude styles stand in for a player; the bands may need another pass after real play.
- **Totals are still in the millions**, because the uncapped chain grows with the flock.
