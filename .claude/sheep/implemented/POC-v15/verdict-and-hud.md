# Verdict and HUD (VH1–VH9)

**Status:** implemented 2026-11-17 (owner `file://` eyeball pending) — built from the owner's interview answers; Q104 answered by the owner the same day; Q103, Q105, Q106 built on their bolded defaults; acceptance measured PASS ([log](#acceptance-log--2026-11-17)). Depends on [scoring.md](./scoring.md) and [field-objectives.md](./field-objectives.md).

Today the score is a small badge at the top centre of the stage, pops are one size, and the end card shows a total and up to three stars. The owner asked for the **running total prominent in the upper left**, a **chain meter**, **strikes and flock value**, **bigger tiered pops**, and an end card that gives a **named rank**, a **category breakdown** and a **percentage**.

## Goals

1. At any moment in a run the player can read: the score, the multiplier and how long it has left, the strikes taken, and what the flock is still worth.
2. Each crossing shows its tier, and jackpots and strikes cannot be missed.
3. The end card says how good the run was in words, where it was weak, and how it compares with a fixed reference for that course.
4. One shared implementation in `web/lib/sheep-score-ui.js` for all three pages.

## Non-goals

- A pace-against-best readout (not chosen).
- Sound.
- Changing what the 2D page's debug overlays show.

## Semantic rules (what it must look like)

### VH — verdict and HUD

- **VH1 — score, upper left.** The running point total is the **largest text on the stage**, in the **upper-left corner**, on all three pages. On the 3D pages the camera buttons sit directly below it.
- **VH2 — chain meter.** Beside the score, the current multiplier (`×7`) with a **bar that empties as the chain's window runs out** and refills on each crossing. At ×1 with no chain live the meter is dim. During a frenzy the meter changes colour and shows the frenzy time.
- **VH3 — strikes and flock value.** Under the score: **three strike marks**, filled as strikes are taken, and the **flock value** as a number that is visibly red while it is falling.
- **VH4 — tiered pops.** Each crossing's pop is sized and coloured by tier: **grey RUSHED, green CALM, gold PERFECT**, larger for the better tiers, and shows the multiplier.
- **VH5 — banners.** Jackpots (PERFECT FILE, ONE GO, FRENZY, the last sheep), a cleared drive gate, a side objective met or lost, and every strike show a **large banner across the centre of the stage** for a moment. The third strike's banner reads as the end of the run.
- **VH6 — side objectives on screen.** The course's side objectives are shown in a banner when the run starts and then listed small under the HUD, each marked met or lost as it happens.
- **VH7 — rank.** The end card's headline is a **named rank** in place of stars:

  | Rank | Percent of the reference run |
  |---|---|
  | Lost Tourist | below 1 % |
  | Farmhand | 1 % |
  | Drover | 5 % |
  | Shepherd | 15 % |
  | Head Shepherd | 40 % |
  | Trial Champion | 100 % |
  | One Man and His Dog | 1,000 % |

  The steps are roughly geometric because the scores are: by the projection in [scoring.md](./scoring.md) a scramble is about 0.3 % of the reference, a decent run about 17 % and an excellent one over 1,000 %.

  A bust can rank no higher than Farmhand. The card shows the rank, the points still needed for the next one, and **BUST** in place of the title when the run ended on strikes.

- **VH8 — percent.** The card shows the total as a **percentage of the course's reference run** (VH7's scale). The reference is computed for that exact course, so a 15-sheep course and an 80-sheep course compare fairly.
- **VH9 — category grades.** The card shows four small grades, **A to F**, so the player can see which part of the handling was weak:

  | Category | What it reads |
  |---|---|
  | **Calm** | the tiers of the penned sheep and the flock value kept |
  | **Flow** | how much of the flock went through in its longest chain |
  | **Control** | commands used against the allowance, and time on the ideal line |
  | **Safety** | strikes taken and panics caused |

*(room to grow)*

## Force-model mapping (the how)

- **Reference run (VH7, VH8):** `sim.referenceScore()` is closed-form and DOM-free: every sheep on the course penned CALM at 100 % condition in one chain, with its kind multiplier where the kind pays unconditionally, flock full, no strikes, all calm, **no jackpots, no drive gates, no awards, no side objectives**. `percent = total / referenceScore`. It is fixed at spawn and stored in `run.reference`.
- **Rank:** `sim.rank()` returns `{ index, name, percent, next: { name, points } }` from the `rankBands` list; a bust clamps the index to 1.
- **Categories (VH9):** `sim.categories()` returns four values in `[0, 1]`, mapped to letters by the shared `gradeBands`:
  - calm = mean tier value of penned sheep ÷ `penPerfectPoints`, averaged with `valueMin ÷ valueStart`;
  - flow = longest chain's crossings ÷ flock size;
  - control = mean of `clamp(allowance ÷ commands, 0, 1)` and the share of the run on the line;
  - safety = `1 − strikes ÷ strikeMax`, less a small amount per panic.
- **`score()`** carries `rank`, `percent`, `reference`, `categories` and the HUD fields listed in [scoring.md](./scoring.md).
- **UI lib:** `ScoreUI` gains the top-left HUD block (score, chain meter, strikes, flock value, objective list), tiered pop classes, a banner queue (one banner at a time, the rest wait), and the new card. It reads only `sim.score()` and drains `sim.scoreEvents`; event kinds now include `strike`, `file`, `frenzy`, `finisher`, `onego`, `gate`, `objective`.
- **Pages:** the 3D pages move `#cam-bar` below the HUD block; the 2D page's score moves from the top centre to the top left. The closed-drawer pad (top right) and the stress meter (bottom right) are untouched.

## Tunables

Category **Scoring**.

| Key | Default | What it does |
|---|---|---|
| `rankBands` | 0.01, 0.05, 0.15, 0.40, 1.00, 10.00 | Percent of the reference at which each rank above the lowest begins |
| `gradeBands` | 0.2, 0.4, 0.6, 0.8, 0.95 | Category value at which E, D, C, B, A begin |
| `safetyPanicCost` | 0.02 | Safety lost per panic |

Banner and pop timings are presentation constants in the UI lib, not sim parameters.

## Constraints

- **§1 stays DOM-free**: rank, percent and categories are computed in the sim and only drawn by the lib.
- **One UI implementation** shared by the three pages; a page supplies only its stage element and its `project(x, y)`.
- The HUD must not cover the pen gate or the handler in the 2D page's default view, and must stay readable in phone landscape.
- Zero console errors on all three pages from `file://`.

## Acceptance criteria

1. On each page the score is in the upper-left corner of the stage and is the largest text on it; on the 3D pages the camera buttons are below it and still work.
2. The chain meter shows the sim's multiplier, its bar reaches empty at the moment the chain lapses, and it refills on a crossing.
3. Strike marks equal `run.strikes`; the flock value shown equals the sim's and is styled as falling while it falls.
4. A RUSHED, a CALM and a PERFECT crossing produce three visibly different pops (class, colour, size).
5. Each of: a strike, PERFECT FILE, FRENZY, ONE GO, the last sheep, a cleared gate, a side objective met, produces exactly one banner; two at once show one after the other.
6. The side objectives appear in the start banner and in the list, and each flips to met or lost when the sim says so.
7. With the jackpots switched off by their settings, a headless run scripted to do exactly the reference (every sheep CALM at full condition in one chain) totals the course's reference score to within rounding.
8. A total at 0.5 %, 10 %, 70 %, 100 % and 1,200 % of the reference gives Lost Tourist, Drover, Head Shepherd, Trial Champion and One Man and His Dog; a bust at 70 % gives Farmhand and the card says BUST.
9. The card shows the percent, the rank, the points to the next rank, four category grades and each end multiplier as its own line, and its final total equals `sim.score().total`.
10. Each category grade moves in the right direction: more RUSHED sheep lowers Calm, shorter chains lower Flow, more commands lower Control, each strike lowers Safety.
11. No star appears anywhere under `web/`.
12. In phone landscape the HUD block is readable and does not overlap the pad.

## Q104 — asked and answered by the owner, 2026-11-17

- **Q104 — what 100 % means:** **a textbook run** — every sheep calm in one chain, flock full, no strikes, no jackpots counted. Better runs read above 100 %.

## Open questions (built on the bolded default — still the owner's to change)

- **Q103 — where the camera buttons go on the 3D pages.** **Directly below the score block, upper left** · along the bottom left · into the settings drawer.
- **Q105 — the rank names and steps.** **The seven names and thresholds in VH7** · fewer ranks (five) · different names (list them).
- **Q106 — the 2D page.** **It gets the same upper-left HUD and banners as the 3D pages** · it keeps its present top-centre badge and gets only the new card.

## Built differently from the draft

- **Strikes, jackpots and cleared gates jump the banner queue.** They go ahead of a waiting side-objective or start banner and cut one short if it is showing. Found in testing: a strike was waiting behind the 4.5 s start banner.
- **Side-objective banners are not shown once the run has ended**; the card lists them instead.
- **`rankBands` and `gradeBands` became scalar keys** (see [scoring.md](./scoring.md)).
- **The history marks its best line with `◀ best`**, not a star, so criterion 11 holds everywhere under `web/`.
- **The rank thresholds did not fit the scores as first built**: a finished driven run landed between 780 % and 9,800 %, so 26 of 33 were in the top rank. The [retune](./scoring.md#retune--2026-11-17) brought the scores down and moved the top rank to 1,000 %; finished runs now spread from Farmhand to One Man and His Dog.

## Acceptance log — 2026-11-17

Headless Chrome on `file://`, `npm run test:pages` (89 checks across the three pages, all pass, zero console errors); criteria 7, 8, 10 and 11 in headless node.

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | score upper left, the largest text on the stage; camera buttons below it and working | 9 px from the corner, 40 px against 24 px for the next largest; camera bar below and switching views | PASS ×3 |
| 2 | chain meter = sim multiplier; bar empty when the chain lapses | ×4 = ×4; bar 100 % → 46 % → 0 % | PASS ×3 |
| 3 | strike marks = strikes; flock value = sim, styled falling while it falls | 0 → 1 of 3; equal; red on, then off | PASS ×3 |
| 4 | three tiers, three different pops | 13 / 18 / 24 px in three colours | PASS ×3 |
| 5 | one banner each; two at once show one after the other | STRIKE then DRIVE GATE; FRENZY, LAST SHEEP, PERFECT FILE, ONE GO and a side objective met, once each | PASS ×3 |
| 6 | side objectives in the start banner and the list; each flips | banner shown, two listed, one flips to lost | PASS ×3 |
| 7 | reference = a scripted reference run | 418,500 = 418,500 | PASS |
| 8 | ranks at 0.5, 10, 70, 100, 1,200 %; a bust at 70 % | Lost Tourist, Drover, Head Shepherd, Trial Champion, One Man and His Dog (600 % is still Trial Champion); bust → Farmhand | PASS |
| 9 | card: percent, rank, points to next, four grades, each multiplier a line, total = sim | all present; totals equal | PASS ×3 |
| 10 | each grade moves the right way | Calm A → C, Flow A → F, Control A → C, Safety A → C | PASS |
| 11 | no star anywhere under `web/` | no star glyph and no `stars` field | PASS |
| 12 | phone landscape: HUD readable, clear of the pad | 26 px score; HUD ends at 185 px, pad starts at 598 px (3D pages; the 2D page was not measured in phone landscape) | PASS ×2 |
