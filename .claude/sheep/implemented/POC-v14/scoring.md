# Count-up scoring (SC1–SC11)

**Status:** implemented 2026-11-16 (owner `file://` eyeball pending) — Q75–Q80 answered by the owner the same day; acceptance measured PASS ([log](#acceptance-log--2026-11-16)).

The shipped score is `100 − Σ penalties` ([POC-v1 phase 6](../POC-v1/phase-6-scoring.md), [failure-and-scoring.md](../../brainstorming/failure-and-scoring.md)): it drains every second and nothing the player does adds to it. This spec replaces it with a score that **starts at 0 and only goes up**. Each of the four old penalty axes comes back as a reward for the same skill: calm becomes a per-sheep bonus, cohesion becomes a combo for streaming the flock through the gate, time becomes a bonus for beating par, and line becomes an award.

## Goals

1. The score is 0 at the start of a run and never decreases.
2. Every sheep through the gate visibly adds points at the moment it happens.
3. Good stockmanship (calm sheep, a tight flock, a brisk clean run) scores more than a scramble that pens the same sheep.
4. The end card is a payoff: it counts up line by line into a total with stars and named awards.
5. One scoring implementation in `web/lib/sheep-sim.js` serves the 2D, 3D and 3D-assault pages.

## Non-goals

- Drive gates and special sheep — [field-objectives.md](./field-objectives.md).
- Saved bests, daily seed, wave mode — [replay-modes.md](./replay-modes.md).
- Sound. The pops and the tally are visual only in this version.
- Retuning flock or dog behavior to make scores easier or harder.

## Semantic rules (what it must look like)

### SC — scoring

- **SC1 — counts up.** The HUD score reads **0** when a run starts and **only ever increases**. No event, however bad, takes points away.
- **SC2 — a point per sheep.** Each sheep that crosses the gate into the pen adds **100 points** the moment it crosses, and each sheep scores **once**.
- **SC3 — calm sheep are worth double.** A sheep that **walks** through the gate, unstressed and not trotting, scores **200** instead of 100. A sheep that trots or bolts through scores 100.
- **SC4 — stream combo.** A sheep that crosses **within a short window of the sheep before it** raises a multiplier by one step (×2, ×3 … up to a cap), and its own points are multiplied. When the window lapses with no sheep crossing, the multiplier **drops back to ×1**. A flock that pours through in one stream scores far more than the same flock penned in dribs and drabs.
- **SC5 — full flock, clean run.** Penning **every** sheep adds a **full-flock bonus**. Doing it with **no injured sheep** adds a **clean-run bonus** on top. An injured (down) sheep never scores and nothing is subtracted for it, but the injury **ends the combo on the spot**: the multiplier drops to ×1 (owner Q76).
- **SC6 — par clock.** Each course has a **par time** that grows with the flock size. The HUD shows the time left to par counting down, then the time over par. On a won run, **time left under par converts to bonus points**. A run that finishes over par, or is ended early, gets no time bonus and loses nothing.
- **SC7 — pops.** Each scoring event shows a brief floating label where it happened (`+200`, `+200 ×3`, `FULL FLOCK +1000`), on all three pages. The HUD shows the running score and, while one is live, the current multiplier.
- **SC8 — tally card.** When the run ends, the card **counts up one line at a time**: sheep penned, calm bonus, stream bonus, full flock, clean run, time bonus, awards, then the **total**. A click or key press skips the animation to the final card.
- **SC9 — stars.** The card shows **one to three stars**: one for penning the whole flock, a second for doing it under par, a third for doing it under par with no injuries and at least 80 % of the sheep penned calm. A run that does not pen the whole flock shows no stars but still shows its points.
- **SC10 — named awards.** The card lists any awards earned, each worth a small fixed bonus:

  | Award | Earned when |
  |---|---|
  | **Not a Hair Out of Place** | every sheep was penned calm |
  | **One Stream** | the whole flock went through in a single unbroken combo |
  | **Quiet Hand** | the run was won with few commands for the flock size |
  | **Straight as a Die** | the flock spent at least 80 % of the run on the ideal line |
  | **Photo Finish** | the run was won within 3 s either side of par |

- **SC11 — assault points.** On the 3D-assault page, penned survivors score exactly as above, each **wolf routed adds points** when it is routed, and "full flock" means every sheep **still alive**. A sheep lost to a mortar costs nothing; it just never scores.

*(room to grow)*

## Force-model mapping (the how)

All of it is in `web/lib/sheep-sim.js` §0 + §1, DOM-free; the pages only draw.

- **Events, not integrals.** `updateScore(dt)` stops accumulating penalties. Points are added in the code path that sets `s.through`, plus one-off bonuses when the run is won. `sim.points` holds the running total.
- **Calm test (SC3):** at the crossing, `s.stress < penCalmStress` and `!s.trot`.
- **Combo (SC4):** `run.combo` (multiplier, starts at 1) and `run.comboT` (seconds since the last crossing). A crossing with `comboT <= comboWindow` increments `combo` up to `comboMax`; `comboT` passing `comboWindow` resets it to 1, and so does any sheep going down (the injury path sets `combo = 1`). `run.comboBest` and `run.comboUnbroken` feed the card and the One Stream award.
- **Par (SC6):** `par = parBase + parPerSheep × sheepCount`. Time bonus on a win = `floor(max(0, par − run.t)) × parPointsPerSec`.
- **Event queue (SC7):** the sim pushes `{ kind, points, mult, x, y, label }` onto `sim.scoreEvents`; each page drains the queue every frame and draws the pops in its own style. The sim never touches the DOM.
- **Kept as statistics:** `run.lineDev`, `run.strag`, `run.split` and `run.stress` still accumulate, because Straight as a Die and the card's small-print stats read them. They no longer subtract anything.
- **Command count (Quiet Hand):** `run.commands` increments in `setCommand` when the command actually changes. The award threshold is `quietHandBase + quietHandPerSheep × sheepCount`.
- **`score()`** returns `{ total, lines: [{ key, label, points }], stars, awards, penned, calmPenned, comboBest, par, won, finished, raw }`. The three pages' card and HUD code switch to this shape; the old `time / line / cohesion / calm` fields go away.
- **Assault (SC11):** `web/lib/assault-sim.js` calls a small `sim.award(kind, points, x, y)` when a wolf is routed, so wolf points travel through the same total and event queue.

## Tunables

Category **Scoring**. The four penalty weights (`w_time`, `w_line`, `w_cohesion`, `w_calm`) and `injuryWeight` are **removed**, including from `web/sheep-defaults.json.js` and any lever that owns them. `lineNorm`, `T_straggle`, `splitMinSize` and `clusterDist` stay.

| Key | Default | What it does |
|---|---|---|
| `penPoints` | 100 | Points for a sheep through the gate |
| `penCalmPoints` | 200 | Points when that sheep is calm |
| `penCalmStress` | 0.3 | Stress below which a crossing counts as calm |
| `comboWindow` | 2.5 s | Longest gap between crossings that keeps the combo alive |
| `comboMax` | 5 | Highest multiplier |
| `fullFlockBonus` | 1000 | Bonus for penning every sheep |
| `cleanRunBonus` | 500 | Extra when no sheep was injured |
| `parBase` | 45 s | Par time before the per-sheep allowance |
| `parPerSheep` | 3 s | Par time added per sheep |
| `parPointsPerSec` | 20 | Bonus points per whole second under par |
| `awardPoints` | 300 | Bonus per named award |
| `quietHandBase` / `quietHandPerSheep` | 6 / 0.5 | Command allowance for Quiet Hand |
| `lineAwardShare` | 0.8 | Share of the run on the line for Straight as a Die |
| `wolfPoints` | 300 | Assault: points per wolf routed |

## Constraints

- **§1 stays DOM-free** (invariant 3): pops and the card animation live in each page's §2; the sim only exposes `points`, `scoreEvents` and `score()`.
- **No magic numbers** (invariant 4): every value above is a `SETTINGS` entry with a lil-gui binding.
- **One copy of the physics** (invariant 2): no page computes points itself.
- **Every change leaves all three pages runnable** from `file://` with zero console errors (invariant 5).
- Scoring draws no random numbers, so a seed's course and flock behavior are unchanged.

## Acceptance criteria

1. A fresh run on each page shows score 0, and over a full headless run the total never decreases between steps.
2. Penning one stressed sheep alone adds exactly `penPoints`; penning one calm sheep alone adds exactly `penCalmPoints`.
3. Three calm sheep crossing inside the window score 200, 400, 600 (×1, ×2, ×3); a fourth crossing after the window lapses scores 200.
4. The multiplier never exceeds `comboMax`.
5. A won run's total equals the sum of the card's lines, and the full-flock line is present only when every sheep is penned.
6. A run with one injured sheep shows no clean-run line and no third star, and its total is not reduced by the injury; a sheep going down while the multiplier is ×3 puts it back to ×1.
7. A run won 20 s under par shows a time bonus of 400; a run won over par shows none.
8. The HUD par read-out counts down to zero and then counts up as "over".
9. Every scoring event produces one pop at the right place on the 2D, 3D and 3D-assault pages.
10. The end card counts up line by line and a click skips to the final state.
11. Each of the five awards can be earned and is absent when its condition is not met (headless check per award).
12. On the assault page a routed wolf adds `wolfPoints` and a sheep lost to a mortar changes nothing.
13. `w_time`, `w_line`, `w_cohesion`, `w_calm` and `injuryWeight` appear nowhere under `web/`.
14. `web/lib/sheep-sim.js` and `web/lib/assault-sim.js` still load in plain node.

## Q75–Q80 — asked and answered by the owner, 2026-11-16

- **Q75 — point scale:** **100 per sheep, 200 calm.** Every other value is scaled to match (full flock 1000, clean run 500, awards and wolves 300, 20 per second under par).
- **Q76 — injuries:** nothing is subtracted, and **an injury ends the combo** (multiplier back to ×1).
- **Q77 — par time:** the formula `45 s + 3 s × sheep`, to be tuned in a later `/sheep tune` pass.
- **Q78 — stars:** feat-based, as in SC9.
- **Q79 — awards:** the five in SC10.
- **Q80 — assault:** wolves score (`wolfPoints`); survivors score as on the other pages; no under-fire bonus.

## Open questions

Nothing parked. All point values are proposals until a `/sheep tune` pass.

## Built differently from the draft

- **A down sheep no longer holds the run open.** The pen is full when every sheep still on its feet is in it. SC5 and SC9 both need a won run with an injury, which the old "all sheep penned" rule made impossible.
- **Crush injuries are still switched off in the sim** (they were before this version), so in the plain game nothing injures a sheep today. The injury rule (combo ends, no clean-run bonus, no third star) is built and tested through `injureAtGate()`, and will apply as soon as injuries are switched back on. A mortar kill on the assault page does not end the combo (SC11: it costs nothing).
- **Time bonus key** is `parPointsPerSec` (20 per whole second under par), not seconds per point.
- **Three extra keys:** `lineOnDist` (60 px, what "on the ideal line" means), `photoFinishSecs` (3), `starCalmShare` (0.8).
- **The Strictness lever** kept its place and now owns `penCalmStress`, `comboWindow`, `parBase` and `parPerSheep`, since the four penalty weights it used to own are gone.
- **Wolves** pay `wolfPoints` when a wolf is shot and for each live wolf in a team at the moment that team breaks. A team that comes back can be routed again and pays again.
- **One shared UI file**, `web/lib/sheep-score-ui.js`, holds the score badge over the stage, the pops and the tally card for all three pages; pops are placed through a per-page `project(x, y)`.
- **The card** also offers `replay` (same course) beside `dismiss` and `play again`.

## Acceptance log — 2026-11-16

Headless node (`sheep-sim.js` + `assault-sim.js` in `vm`, 34 checks) and headless Chrome on `file://` (54 checks across the three pages, zero console errors). Sheep were pushed through the gate by the harness; no check depends on a scripted dog winning a course.

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | starts at 0, never decreases | 90 s driven run, 5 400 steps, monotonic; all three pages show 0 on a fresh run | PASS |
| 2 | stressed 100, calm 200 | 100 / 200 | PASS |
| 3 | 200, 400, 600 then 200 after a lapse | 200, 400, 600, 200 | PASS |
| 4 | multiplier capped | `comboMax` 2 → 200, 400, 400, 400, 400 | PASS |
| 5 | total = sum of lines; full-flock line only on a full pen | 7 900 = Σ 7 900; partial run has no flock line | PASS |
| 6 | injury: no clean line, no third star, no reduction | total unchanged, multiplier ×3 → ×1, 2 stars, run still won | PASS |
| 7 | 20 s under par → 400; over par → none | 400 / 0 | PASS |
| 8 | par read-out counts down then over | 63.00 → 61.00 → −4.0; badge shows `par` then `over` | PASS |
| 9 | a pop per event on all three pages | 3 crossings → 3 pops, placed, on 2D / 3D / assault | PASS |
| 10 | card counts up; click skips | counting at 0.5 s, final total = sim total after a click, on all three pages | PASS |
| 11 | each award on and off | all five | PASS |
| 12 | assault: wolf adds, lost sheep changes nothing | +300 / 0; survivors still win | PASS |
| 13 | old keys gone from `web/` | none found | PASS |
| 14 | libs load in plain node | yes; lever assertions 100/100 | PASS |
