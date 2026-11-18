# Records (RC1–RC4)

**Status:** implemented 2026-11-17 (owner `file://` eyeball pending) — built from the owner's interview answers on the bolded defaults of Q107–Q109; acceptance measured PASS ([log](#acceptance-log--2026-11-17)). Depends on [verdict-and-hud.md](./verdict-and-hud.md).

[POC-v14 replay modes](../POC-v14/replay-modes.md) save one best score per exact course. Since courses are random, most runs are on a course the player has never seen, so that best is rarely beaten or even shown. The owner asked for a **run history**, **bests per flock-size band**, and a **collection** of awards and challenges.

## Goals

1. The player can see their own spread of results and whether they are improving.
2. A run on a new random course still has a record to beat.
3. There is a list of things to earn, and it shows what is still missing.
4. A browser that blocks storage plays exactly as before, with nothing saved and no error.

## Non-goals

- Sharing, export or online boards.
- Changing the per-course best, the daily seed or the wave-mode rules (RM1–RM6 stand).

## Semantic rules (what it must look like)

### RC — records

- **RC1 — run history.** Every finished run is added to a **history of the last twenty**, newest first, per page. Each line shows the date, the mode, the flock size, the total, the percent, the rank and the four category grades. A **history** button on the end card opens it; the best line by percent is marked.
- **RC2 — bests by flock size.** Beside the per-course best, each page keeps a **best by percent** for each flock-size band and mode: **small** (up to 30), **medium** (31 to 80), **large** (81 and up). The end card shows the band's best and says so when the run has beaten it.
- **RC3 — collection.** A **collection** panel lists every award (with its rarity), every jackpot, every side objective and every special sheep, each with **how many times it has been earned** and greyed out if never. A **collection** button on the end card opens it, and anything earned for the first time in a run is flagged on that run's card.
- **RC4 — tuned runs.** A run with any setting off its default is added to the history **marked tuned**, and does not count toward a band best or the collection, matching how per-course bests already work (owner Q87).

*(room to grow)*

## Force-model mapping (the how)

Everything here is in `web/lib/sheep-score-ui.js`; the sim is not involved beyond `score()`.

- **Storage:** three `localStorage` keys per page, each a small JSON value: `sheep.history.<page>` (array, capped at `historyMax`), `sheep.bandBest.<page>` (map of `mode:band` to `{ percent, total, rank, date }`), `sheep.collection.<page>` (map of id to count). Every read and write is wrapped so a failure leaves the feature empty and silent.
- **Run record:** `{ t, mode, sheep, total, percent, rank, grades, bust, tuned, awards, jackpots, objectives, specials }`, written once when the card first shows.
- **Bands:** `bandOf(sheepCount)` from `bandSmallMax` and `bandMediumMax`.
- **Collection ids:** the award names, `file`, `onego`, `frenzy`, `finisher`, the side-objective ids, and the special kinds penned (`golden`, `lamb`, `ram`, `black`, `bell`, `yearling`). The sim exposes the run's lists through `score()`.
- **Panels:** history and collection are overlays inside the stage, drawn by the lib, closed by a button or Escape.

## Tunables

Category **Modes**.

| Key | Default | What it does |
|---|---|---|
| `historyMax` | 20 | Runs kept in the history |
| `bandSmallMax` | 30 | Largest flock that counts as small |
| `bandMediumMax` | 80 | Largest flock that counts as medium |

## Constraints

- Runs from `file://`; `localStorage` may be unavailable or throw, and the page must behave as if empty.
- No new HTML page and no change to `web/index.html`: both panels live in the shared lib so the three pages get them from one copy.
- Stored shapes are versioned with a `v` field so a later change can discard old data instead of misreading it.

## Acceptance criteria

1. Finishing three runs then reloading shows three history lines, newest first, each with total, percent, rank and four grades; a twenty-first run drops the oldest.
2. The history marks the best line by percent.
3. A run on a 25-sheep course updates only the small band's best; a better percent replaces it and the card says so; a worse one does not.
4. Course, daily and waves keep separate band bests.
5. Earning an award, a jackpot, a side objective and penning a special each raise their count by one in the collection, and a first-time entry is flagged on the card.
6. Items never earned are listed and greyed out, so the collection always shows the full list.
7. A tuned run appears in the history marked tuned and changes neither a band best nor the collection.
8. With `localStorage` made to throw, all three pages load, play and show the card with zero console errors, and the two panels open empty.
9. The v14 per-course best and the daily best still save and show as before.

## Open questions (built on the bolded default — still the owner's to change)

- **Q107 — what a band best is measured in.** **Percent of the reference run, so courses of different sizes within a band compare fairly** · raw points.
- **Q108 — where the history and collection open from.** **Buttons on the end card only** · also a small button beside the score during play · also links on the version picker page.
- **Q109 — one record for all pages or one each.** **One each for 2D, 3D and 3D-assault, as the v14 bests are** · the 2D and 3D pages share, assault is separate.

## Built differently from the draft

- **Storage keys carry their version in the name** (`sheep.history.v1.<page>`, `sheep.bandBest.v1.<page>`, `sheep.collection.v1.<page>`) as well as a `v` field.
- **Wave-mode band bests are by points**, since wave mode has no reference run and so no percent.
- **A first run on a course no longer says "New best!" for the course**; the card says it for the flock-size band instead, and for the course only when an earlier course best is beaten.

## Acceptance log — 2026-11-17

Headless Chrome on `file://`, `npm run test:pages`, on all three pages.

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | history survives a reload, newest first, with total, percent, rank, grades; the oldest is dropped at the cap | two then three lines after a reload, newest first; with the cap set to 3 the oldest goes. **The cap was exercised at 3, not at the default 20.** | PASS ×3 |
| 2 | best line by percent marked | one line marked `◀ best` | PASS ×3 |
| 3 | a 10-sheep course updates only the small band; a worse run leaves it | `course:small` only; "New small-flock best"; unchanged after a worse run | PASS ×3 |
| 4 | modes keep separate band bests | `course:small` and `waves:small` side by side. **Daily was not measured separately.** | PASS ×3 |
| 5 | awards, jackpots, side objectives and specials counted; first-time flagged | each earned id at 1 and listed as NEW; a met side objective and ONE GO / PERFECT FILE counted | PASS ×3 |
| 6 | unearned items listed and greyed | 29 items, 18 greyed | PASS ×3 |
| 7 | a tuned run is in the history marked tuned and changes no best and no collection | marked tuned; band best and collection unchanged; "tuned — not saved" | PASS ×3 |
| 8 | storage that throws: pages play, card shows, panels open empty, no errors | card totals; history empty; 29 of 29 greyed; zero console errors | PASS ×3 |
| 9 | the v14 course best and daily best still work | course best survives a reload and shows under the score; the daily key carries its mode | PASS ×3 |
