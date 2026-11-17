# Replay modes (RM1–RM6)

**Status:** implemented 2026-11-16 (owner `file://` eyeball pending) — Q86–Q89 answered by the owner the same day; acceptance measured PASS ([log](#acceptance-log--2026-11-16)). Depends on [scoring.md](./scoring.md).

A count-up score is only worth chasing if there is something to beat. This spec adds three reasons to play again: a **saved best** per course, a **daily seed** that is the same for everyone that day, and an endless **wave mode** on an arcade clock where the score keeps climbing until time runs out.

## Goals

1. Finishing a run tells the player whether they beat their best on that course.
2. One click starts today's course, the same one all day.
3. Wave mode gives a run with no fixed ceiling on the score.
4. Nothing here needs a server; the pages still run from `file://`.

## Non-goals

- Online leaderboards or sharing scores between devices.
- Replays or ghosts of earlier runs.
- Accounts or names.

## Semantic rules (what it must look like)

### RM — replay modes

- **RM1 — saved best.** When a run ends, its total is compared with the **best total previously saved for that course on that page**. The card shows the old best, and shows **"New best!"** when it is beaten. The best survives closing and reopening the page.
- **RM2 — best in the HUD.** While playing a course that has a saved best, the HUD shows it beside the running score.
- **RM3 — storage never breaks the page.** If the browser refuses storage (private window, blocked site data), the game plays exactly as normal and simply shows no best.
- **RM4 — daily seed.** A **`daily`** button starts the course for today's date. Everyone who presses it on the same day gets the same course, and it has its own saved best, shown with the date.
- **RM5 — wave mode.** A **`waves`** mode replaces par with a **countdown clock**. Each sheep penned **adds a little time**. When the whole flock is penned the pen empties, a **new, slightly larger flock** appears in the pasture and the dog keeps working; the score carries on. The run ends when the clock reaches zero, and the card shows the waves cleared. Each wave **re-lays the obstacles** and **re-rolls the special sheep**; there are **no drive gates** in wave mode (owner Q85, Q89).
- **RM6 — wave scoring.** In wave mode the full-flock and clean-run bonuses are paid **per wave**, there is no time bonus, and stars are replaced by the wave count.

*(room to grow)*

## Force-model mapping (the how)

- **Bests** are page-side (§4), not in the sim: a small helper shared through `web/lib/sheep-gui.js` reads and writes one `localStorage` entry, `sheep.best.v1`, holding a map from a course key to `{ total, stars, date }`. Every access is wrapped in try/catch (RM3).
- **Course key:** page name + seed + layout + sheep count + mode (`course`, `daily`, `waves`). A best is written only when every setting equals its default; otherwise the card reads `tuned — not saved` (owner Q87).
- **Daily seed:** the player's **local** date `YYYYMMDD` as an integer becomes the seed; layout, sheep count and obstacle count are drawn from that seed and not from the sliders.
- **Wave mode** is a sim flag `p.mode = 'waves'`. `run.clock` starts at `waveClock`, drops by `dt`, gains `waveSecsPerSheep` per pen crossing and is capped at `waveClockMax`. On a full pen the sim calls a `nextWave()` that keeps `points`, clears the penned sheep, re-lays the flock with `sheepCount + waveGrowth × wave` and returns the dog to work without a reseed of the course walls and gate. `run.finished` is set when the clock hits zero.
- **PRNG:** each wave's flock draws from a stream derived from seed and wave number, so a seed's wave run is repeatable.

## Tunables

New category **Modes**.

| Key | Default | What it does |
|---|---|---|
| `mode` | `course` | `course`, `daily` or `waves` |
| `waveClock` | 90 s | Starting time in wave mode |
| `waveSecsPerSheep` | 3 s | Time added per sheep penned |
| `waveClockMax` | 120 s | Most time the clock can hold |
| `waveGrowth` | 2 | Extra sheep per wave |
| `waveSheepMax` | 40 | Largest flock a wave can reach |

## Constraints

- **§1 stays DOM-free:** the sim never touches `localStorage`; the pages pass nothing storage-related into it.
- **`file://`:** storage is per browser and per file origin, so a best is local to that machine and browser. The spec does not promise more.
- **No magic numbers**; every key gets a lil-gui binding.
- All three pages stay runnable from `file://` with zero console errors, including when storage throws.

## Acceptance criteria

1. Finishing a course twice with a higher second total shows "New best!" the second time and the new value after a page reload.
2. A lower second total leaves the saved best unchanged.
3. With `localStorage` stubbed to throw, all three pages load and play with zero console errors and no best shown.
4. `daily` pressed twice on the same date gives an identical course; changing the system date gives a different one.
5. A daily best is stored separately from the same seed typed in by hand.
6. In wave mode the clock counts down, each pen crossing adds `waveSecsPerSheep`, and the clock never exceeds `waveClockMax`.
7. Penning the whole flock in wave mode spawns the next wave with `waveGrowth` more sheep, keeps the score, leaves the gate and fence where they were, re-lays the obstacles and never places a drive gate.
8. The wave run ends at clock zero and the card shows total and waves cleared.
9. The same seed in wave mode lays out the same flocks wave for wave.
10. `mode` `course` with no saved best behaves exactly as [scoring.md](./scoring.md) describes.

## Q86–Q89 — asked and answered by the owner, 2026-11-16

- **Q86 — what a best is keyed on:** the **exact course** — page + seed + layout + sheep count + mode.
- **Q87 — runs with changed levers:** bests save **only at default settings**; a tuned run shows `tuned — not saved`.
- **Q88 — daily date:** the player's **local date**.
- **Q89 — wave growth:** **two more sheep each wave up to 40, obstacles re-laid each wave.**

## Open questions

Nothing parked. Clock values are proposals until a `/sheep tune` pass.

## Built differently from the draft

- **New key `waveSheepStart` (8).** Wave mode ignores the herd slider and starts at 8 sheep; growing "two per wave up to 40" from the default herd of 80 made no sense, and 80 sheep cannot be penned on a 90 s clock.
- **The best-score key also carries the obstacle count** the course started with, since the obstacles slider changes how hard a seed is.
- **"Default settings" excludes the course pickers:** seed, herd size, mode, obstacle count and spawn layout may differ without making a run "tuned".
- **The daily course draws its flock size (20–60) from the date** and uses random layout and obstacles; the herd and obstacle settings are restored on leaving daily mode. Typing a seed or pressing reseed leaves daily mode.
- **`daily ☀` and `waves ∞` buttons** sit beside reseed and pause on every page and toggle; the `mode` dropdown in the Modes folder does the same.
- **Bests live in `web/lib/sheep-score-ui.js`**, not `sheep-gui.js`.

## Acceptance log — 2026-11-16

Rows 1–5 and 10 were measured in headless Chrome on `file://` on each of the three pages; rows 6–9 in headless node, with the wave change also run in each page.

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | higher total → New best, survives reload | `New best!`, then `best 16,180` in the badge after a reload | PASS ×3 |
| 2 | lower total leaves the best | 8 840 < 16 180, stored value unchanged | PASS ×3 |
| 3 | storage throws → plays, no errors | card totals, no best shown, 0 console errors | PASS ×3 |
| 4 | daily twice = same course; other date differs | seed 20261116 both times; a stubbed date gave 20310509 and a different course | PASS ×3 |
| 5 | daily best separate from the typed seed | key carries `daily`; a typed seed drops to `course` | PASS ×3 |
| 6 | clock down, +3 s per crossing, capped | 90 → 85.00 → 87.98; never above 120 | PASS |
| 7 | next wave: +2 sheep, score kept, gate unmoved | 8 → 10, same gate object, obstacles re-laid, no drive gate | PASS |
| 8 | ends at zero, card shows waves | finished; `1 wave cleared`; no stars, no time bonus | PASS |
| 9 | same seed, same flocks | 3 waves identical | PASS |
| 10 | course mode unchanged with no best | herd from the slider, par clock | PASS |
| — | Q87 tuned run | `tuned — not saved`, nothing stored | PASS ×3 |
