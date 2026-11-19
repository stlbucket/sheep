# Plan — the sheepdog game as a Reddit daily game

Written 2026-11-18. Goal: a Devvit Web app, running in a public demo post, submitted to Reddit's Game of the Day Hackathon before **Tuesday 8 December 2026, 6:00 pm Pacific** (20 days out), aimed at **Best Daily Game ($15,000)**, entered as a new game and not flagged as a port (owner, Q2). The contest facts are in [contest.md](contest.md) and the platform facts in [platform-notes.md](platform-notes.md); this document does not repeat their sources. Everything here is a plan: no code, scaffold or install has been done. The owner answered the open questions on 2026-11-18; the answers are recorded in [section 14](#14-decisions-owner-2026-11-18) and the plan below is written on them. Name: **One Dude and His Dog** (the game, the app and the top rank; owner 2026-11-18).

## 1. The pitch

Two sheepdog trials a day, in one post. **The Trial**: a small flock, a few numbered gates, a pen, about a minute. **The Gather**: a scattered flock on an open pasture with trees, rocks and the odd bull, to be brought together and penned. Every player gets the same two fields. You work one dog with whistle commands, the sheep behave like sheep, and you get **one scored run at each per day**; after that it is practice. Your score, rank and the day's best run (replayable, command for command) go on that game's board in the day's post.

Why this can score well: it is not on the organisers' list of ideas they are tired of; the flock simulation is the product of sixteen prototype versions, which no entry started on 11 November can match; and a seeded, deterministic course is exactly the "daily map" the brief describes.

Why it could score badly if ported as-is: the prototype pages look like a tuning tool (levers, debug overlays, a lil-gui panel), they ask a phone to rotate to landscape, the game has a real learning curve, and an 80-sheep pasture takes minutes and busts a third of the time even for the demo handler. The plan is mostly about fixing those four things.

## 2. What becomes the Reddit game

| Existing page | Role on Reddit | Why |
|---|---|---|
| `web/3d-competition.html` (4–6 ordered gates, 8 sheep, pen shut until the gates are cleared) | **Daily game 1, "The Trial"** | Bite-sized (the demo handler finishes in 50–85 s and won 20 of 20 measured courses), legible goal (numbers on the gates), cheap to replay on a server, and the 3D view is the visual identity |
| `web/3d.html` pasture (30–80 sheep, obstacles, and from POC-v17 bulls) | **Daily game 2, "The Gather"** (owner Q1: two daily games, one of each). Flock size varies by day; bulls appear as the sim draws them (Q10) | The original game. Longer and harder than the Trial, so it needs its own par, its own board and a flock range that a phone and the server replay can carry (section 5) |
| `web/2d.html` | Not shipped. Stays the tuning bench | Debug tool by design |
| `web/3d-assault.html` (wolf mortar teams) | Not shipped | Off-theme for a calm daily; a possible post-contest event |
| Wave mode, random courses, levers, capture, `obstacles` slider | Not shipped to players | "Remove clutter or secondary actions during active play" |
| Demo mode (`AutoHandler` in `web/lib/sheep-auto.js`) | Kept, repurposed as the tutorial's "watch him work" and the ghost in onboarding | It already only issues pad commands, so what it shows is what a player can do |

Daily course size and time are tunable from data once the port runs: the target is a first-day player finishing in under three minutes and a practised player in about one.

## 3. Player flow

| Step | Where | What the player sees |
|---|---|---|
| 1. Feed | Inline post, `tall` height, taps only | Splash card: game name, "Trial #23 · Wed 18 Nov", a still of today's field, the player's streak, and **two cards, The Trial and The Gather**, each showing either a **Play** button (scored run not yet used) or the player's score and a **Practice** button, plus today's leader and a small **Leaderboard** link. No scrolling, loads in under a second (no three.js on this screen) |
| 2. Play | Expanded mode (full screen on mobile) | The pasture, the full command pad (owner Q5: all nine pad buttons plus that'll do) sized for thumbs, the score block, a mute button. Nothing else. First-time players get the guided first run (section 8) |
| 3. Result | Same screen, one card | Score, rank, stars, time, place on today's board, streak, and four separate buttons: **Practice** (or **Play the other trial** if its scored run is unused), **Watch the best run**, **Comment my score**, **Join the community**. Never merged actions |
| 4. Board | Entry point `leaderboard`, also from the splash | A tab per game (Trial, Gather) and a combined one; today, this week, all time; the player's own row pinned; tap a row to watch that run |

## 4. Architecture

Planned project (a new folder, created from the Devvit Three.js template; see Q3 for where it lives):

| Path | Contents |
|---|---|
| `src/shared/sim/` | `sheep-sim.js`, `sheep-defaults.json.js`, `sheep-auto.js` — the same DOM-free code that is in `web/lib/` today, built from one source so the browser and the server run identical physics |
| `src/shared/daily.ts` | Day number ↔ UTC date ↔ seed; the course preset (params that define a daily or weekly course); the run-log format |
| `src/client/splash.html` + `splash.ts` | Inline first screen (entry point `default`) |
| `src/client/game.html` + `game.ts` | The trial (entry points `game` and `_direct_launch`); the three.js renderer lifted from `web/3d-competition.html`, the pad from `sheep-pad-ui.js`, the score block and result card from `sheep-score-ui.js` |
| `src/client/leaderboard.html` + `leaderboard.ts` | The boards |
| `src/server/index.ts` | Endpoints below |
| `devvit.json` | Entry points, `permissions` (redis, reddit incl. `asUser` for comments, realtime if used, journeys), one scheduler task, menu items, install trigger |
| `README.md` | Player-facing description and how to play (required by the rules and by the contest) |

### Server endpoints

| Endpoint | Caller | Does |
|---|---|---|
| `GET /api/init` | splash, game | Day number, and for each of the two games its seed, course preset and whether the player's scored run is unused, in progress or spent; the player's name / avatar / streak / best for today, today's top three, whether they are logged in |
| `POST /api/start` | game, at the first command of a scored run | Marks the player's one scored attempt at `{ day, game }` as spent (owner Q4). Refused if already spent; the client then runs as practice |
| `POST /api/checkpoint` | game, every few seconds and on `visibilitychange` | Stores the command log so far, so a run abandoned or closed mid-way still scores as it stood (owner: "counts as it stands") |
| `POST /api/run` | game, at the result card | Receives `{ day, game, simVersion, commands: [[tick, verb, opts]…], ticks, claimed: { total, penned, time } }`; validates (below); writes boards and streak if this is the player's scored run, otherwise returns the practice result only; returns rank and place |
| `GET /api/board?game=trial|gather|both&scope=day|week|all&day=N` | leaderboard, result card | Top N plus the caller's row |
| `GET /api/replay?day=N&game=…&user=…` | game ("watch the best run") | The stored command log for that run |
| `POST /api/comment` | result card button | Posts the score as the user, as a reply to the day's stickied comment |
| `POST /api/subscribe` | result card button | Subscribes the user to the subreddit |
| `POST /internal/scheduler/daily` | scheduler, cron | Creates the day's post, stickies the score thread comment, closes yesterday's board, awards flair |
| `POST /internal/on-install` | install trigger | Creates the first post so a fresh install is never empty |
| `POST /internal/menu/new-trial` | moderator menu | Manual "post today's trial now" (for the demo subreddit and for recovery) |

### Redis keys (per subreddit installation)

| Key | Type | Holds |
|---|---|---|
| `day:{N}:meta` | hash | postId, sticky comment id, `simVersion`, and per game its seed and preset (flock size for the Gather) |
| `day:{N}:{game}:board` | sorted set | member userId, score = points (ties broken by time, encoded in the fraction) |
| `day:{N}:{game}:run:{userId}` | string (JSON) | The scored run: state (`started`, `finished`, `abandoned`), its command log (checkpointed while it runs) and summary, capped in size; lets anyone replay it |
| `week:{isoWeek}:board` | sorted set | Sum of each player's scored runs that week, both games |
| `all:board` | sorted set | Lifetime points |
| `user:{userId}` | hash | username, rank title, lifetime trials, perfect runs, best streak |
| `streak:{game}:{userId}:{year}` | bitfield | One bit per day (the docs' recommended pattern); the day comes from the post, never the device clock |
| `user:{userId}:collection` | hash | Special sheep and awards earned (today's `sheep.collection` in `localStorage`) |

Old `day:{N}:*:run:*` keys expire after a few weeks so the 100 MB unpublished limit is never in sight (a command log is a few hundred bytes).

## 5. The daily course

| Decision | Plan |
|---|---|
| One pair of courses for everyone | Day number N = whole UTC days since launch day. Each game's seed = a fixed hash of N and the game. The server owns it and writes it into the post's `postData` (`{ day, trial: { seed }, gather: { seed, sheep } }`), so the client needs no clock. Today's `dailySeed()` in `sheep-score-ui.js` uses the device's local date; that is replaced |
| Variety | The seed already picks the gate count (4–6), the path, the pen side and the flock's start. Add a small **daily modifier** drawn from the seed and shown on the splash, for example "bellwether day", "black sheep in the flock", "stiff flock", so days differ in feel, not only layout. On the Gather the seed also draws the trees, rocks and **0–3 bulls exactly as the sim does (owner Q10)**, and the splash says so ("two bulls in the field today") |
| Gather flock size | **Varies by day** (owner): the day's seed picks it from a range. Range **30–80 (owner Q13)**, the prototype's full scale; the size is on the splash card. The top of that range is beyond what a single server request can replay (section 6), so Spike D is now about how to verify a big flock, not whether to allow one |
| Difficulty curve | A weekly rhythm: gentle Monday (4 gates, calm flock) rising to Saturday (6 gates plus a modifier); the Gather's flock size follows the same rhythm. Each candidate seed is test-driven by `AutoHandler` at build time or in the daily job; a seed the handler cannot finish inside a time budget is skipped for the next one, so every day is provably solvable ("legible, fair, and solvable") |
| The post | **One post a day carrying both games** (owner). The scheduler creates "Day #N — Wed 18 Nov" once a day at **about 13:00 UTC (owner Q8)**, stickies the app's "Scores for Day #N" comment, and (as moderator) pins the post. Old posts stay playable as an archive but score only on their own day's board and never count toward a streak |
| Attempts | **One scored run per game per day, then practice (owner Q4).** The attempt is spent at the first command; a run abandoned or closed mid-way **counts as it stands** (owner), which is why the command log is checkpointed to the server while the run is live. Practice runs are unlimited, unscored and never touch a board or a streak. The guided first run (section 8) always comes before a new player's first scored run |

## 6. Leaderboards and anti-cheat

| Board | Scope | Reset |
|---|---|---|
| Today, per game | Points on that day's Trial and on that day's Gather: two boards, plus a combined one, shown in the post, the splash and the result card | New post each day |
| This week | Sum of scored runs in both games, Monday to Sunday | Weekly; top three get a week-long flair |
| All time | Lifetime points and longest streak | Never |
| Per subreddit | Every board is per subreddit automatically, because Redis is siloed per installation | — |
| Cross-subreddit "global" | **Cut.** Needs an external service and HTTP-fetch approval, terms of service and a privacy policy | — |

Anti-cheat rests on something few entries will have: the game is a deterministic, DOM-free simulation, so **the server replays every submitted run**.

| Layer | What it checks | Cost |
|---|---|---|
| 1. Shape | Day is today's (or the post's own day), `simVersion` matches, the command log is sorted, verbs and options are those the full pad can send, tick count is within a hard cap, payload is small | Trivial |
| 2. Replay | Build the sim from the server's seed and preset, step it `ticks` times applying each command at its tick, read `score()`; the server's total is what goes on the board, the client's claim is only compared | 8 sheep × about 5,000 ticks: well under a second in node (the test suite steps 40 sheep × 2,400 ticks × 3 seeds in seconds). **The Gather is the expensive one**: cost grows roughly with the square of the flock (80 sheep cost about 2.5 ms a tick), so an 80-sheep run of four minutes (14,400 ticks) is about 36 s of replay, **over the 30 s request limit**. With the range fixed at 30–80 (owner Q13) the Gather needs one of these, chosen by Spike D: replay in slices across several requests or a scheduler job, with the score shown as "pending" until it lands; a faster neighbour search in the sim that leaves the golden replay intact; a hard cap on run length tied to par; or, failing those, fallback bounds (layer 3) for flocks above a measured size |
| 3. Fallback bounds | If replay is unavailable or disagrees because of a floating-point difference between the player's browser and the server (see risks), accept the run only if its score is at or below the course's reference maximum and its time is at or above a floor, and mark it "unverified" (shown without a tick on the board, never eligible for first place) | Trivial |
| 4. One attempt | `/api/start` is the only way to open a scored run and can succeed once per user per game per day; a `/api/run` without a matching open attempt is practice | Trivial |

What the client must add for this: a command recorder (tick number, verb, options at each `sim.setCommand`), which does not exist today (the sim only counts commands), and a `simVersion` string. The existing golden-replay test (`SC-18` in `test/sim.test.js`) is the proof that the same seed and commands give the same run.

The stored command log is also a feature: **Watch the best run** plays the top handler's run back in the player's own client. That is community content generated by play, with no moderation burden because a command log cannot contain anything but whistles.

## 7. Challenges and Reddit features

| Feature | Plan | Tier |
|---|---|---|
| Daily post by scheduler | Section 5 | Must |
| Daily board, replay-verified | Section 6 | Must |
| Streaks | **A separate streak for each game (owner Q14)**: bit-per-day per game in Redis, both shown on splash and result card; "trial complete" (flock penned, no bust) is what counts, not score | Must |
| Comment my score | Separate button; posts as the user under the day's stickied comment, in a compact spoiler-free line (rank, stars, time, streak), with an optional typed message that makes it top-level instead | Must |
| Join the community | Separate subscribe button on the result card, shown only to non-members | Must |
| Devvit Journeys | `App.Ready` when the pasture is interactive; `Journey.Start` on Play; `Journey.Progress` at each gate cleared (gates cleared ÷ gates + pen); `Journey.Interaction` for mute / help / replay watched; `Journey.End` with `complete`, `win`, `score` | Must (instrumented even if events are dropped before review) |
| Rank flair | The existing score ranks (Farmhand → Drover → Shepherd → Head Shepherd → Champion → One Dude and His Dog) set as user flair in the game's subreddit from lifetime results; weekly podium flair | Should |
| Watch the best run | Replay from the stored command log | Should |
| Snoovatar on the board | Avatar beside names on the board. The handler figure is the dude (owner Q11); a snoovatar handler is dropped | Should |
| Beat this run | From any board row: play today's course with that run's dog as a faint ghost | Stretch |
| Weekly board | Section 6 | Should |
| Collection | Special sheep (golden ewe, lamb, ram, black sheep, bellwether, yearling) and awards seen, kept per user in Redis | Should (the code exists) |
| Logged-out play | Both games are playable logged out as practice; the result card says "log in to put this on the board"; the run is held in `sessionStorage` and submitted after login if the platform returns to the post | Should |
| Realtime | A live "u/x just took first" toast on open clients | Stretch |
| Community-made courses (mods or players pick a seed and modifier for a "guest trial") | After the contest | Later |
| Push notifications, payments, cross-subreddit board, assault mode | Cut (gated beta, review risk, external service, off-theme) | Cut |

## 8. Onboarding

The judges will open the demo post cold, probably on a phone, and decide in the first thirty seconds. The game's learning curve is its biggest risk, so onboarding is treated as a feature of the same weight as the leaderboard.

| Element | Plan |
|---|---|
| First run is guided, not explained | Trial #0, a fixed two-gate course with four sheep, runs before the player's first daily. Three prompts, one at a time, each waiting for the player to do the thing: "Hold **Walk on** — the dog pushes the sheep away from him" → "They are drifting left. Tap **Away** — he circles to the other side" → "**Lie down** to let them settle through the gate". No text wall. Skippable, and never shown again (stored in Redis) |
| The pad teaches itself | Each button carries a tiny arc or arrow icon showing what the dog will do; the dog's intended path is drawn faintly on the grass while a flank is running |
| Watch him work | A "show me" button in the help sheet hands the dog to `AutoHandler` for ten seconds with its one-line reason shown ("gathering the stragglers"), then hands back. A run it touched is not scored (already the rule today) |
| Fail softly | Three panic strikes ends a run today. On the daily, a bust still gives a score and a result card with a one-line cause ("the dog was too close for too long") and Practice. Because a bust on the scored run cannot be retried, the guided first run and unlimited practice before pressing the scored Play matter more than they did |
| Plain words | Player-facing text says "circle left / circle right" beside the traditional "come by / away" so the vocabulary is charm, not a barrier |

## 9. Migration work from `web/`

| Area | Today | Work |
|---|---|---|
| Module loading | Plain `<script src>` globals plus an inline module importing three.js from a CDN; built to open from `file://` | Vite bundle. three.js from npm, bundled. No CDN, no inline script. The `web/` pages keep working from `file://` unchanged |
| One sim source | `web/lib/sheep-sim.js` is 270 KB of plain script that assigns globals; the tests load it in a `vm` context | Add a thin module wrapper (or a build step that appends exports) so the same file is imported by the Devvit client and server without forking it. Decide in Phase 0; the rule is **one copy of the physics** (Q3) |
| Tuning UI | lil-gui panels, levers, capture, overlays, `obstacles` slider | Not included in the Reddit client at all. Params are frozen into a course preset in `src/shared/daily.ts` |
| Storage | `localStorage` keys for bests, history, band bests, collection, demo-used | Server (Redis) is the source of truth; `localStorage` only caches |
| Daily seed | Device local date | Server day number in `postData` |
| Layout | Landscape pasture (1120 × 720 field), side column, a "rotate your phone" overlay in portrait | **Portrait-first**: camera turned so the field's long axis runs up the screen, pad in the bottom third in thumb reach, score block on top. Landscape and desktop keep a side pad. Must fit the viewport with no scrolling on a 360 × 640 phone |
| Camera | OrbitControls drag / pinch / wheel | Fixed framing that follows the flock; at most a two-position toggle. Free orbit fights the page on mobile and is a secondary action |
| Input | Arrow keys and a 3 × 3 pad with held buttons and variants (easy flanks, left / right down) | **The full pad on touch (owner Q5)**: the 3 × 3 pad plus that'll do, with the easy flanks and angled downs. The cost is button size on a 360 px wide phone, so the pad layout is settled on a real phone in Phase 1; keyboard stays on desktop |
| Score UI | `sheep-score-ui.js` builds badge, pops, tally card, history, collection, daily / waves buttons | Keep the score block, pops and tally logic; restyle; replace the card's buttons with the four result actions; drop waves / history panels |
| Visual identity | Functional prototype styling | One palette, one display typeface (bundled, licensed), custom buttons, a title mark, a splash illustration rendered from the game itself. No default-looking controls anywhere |
| Sound | None | A handful of original or properly licensed sounds (whistle per command, bleats, gate clack), off until the first tap, with a mute button and `visibilitychange` muting, as the inline rules require. **Committed work, not a stretch item (owner Q9)**: audio must be original or clearly licensed, sourced by 30 Nov |
| Performance | 80 sheep cost about 2.5 ms a tick in node; fine on desktop | 8 sheep is trivial; the Gather's 30–80 are the real test (80 sheep is the prototype's desktop default and has not been run on a phone). Budget the three.js scene for low-end phones: cap pixel ratio, simple materials, no shadows on mobile. Splash must not load three.js |
| Tests | `npm test` (sim) and `npm run test:pages` (headless Chrome on `web/`) | Keep both untouched. Add server-side replay tests: recorded command logs must reproduce their scores; a tampered log must be rejected |

## 10. Judging criteria → work

| Criterion | What earns it here |
|---|---|
| Delightful UX | Portrait-first pasture that fits the viewport; the guided first run; thumb-sized pad with self-explaining icons; the score pops and tally that already exist; one result card; watch-the-best-run |
| Polish | Zero debug UI; splash under a second; works on iOS Safari, Android Chrome, desktop; logged-out path; a fresh install creates its own first post; a real README; mute button; no console errors; replay-verified scores so the board cannot be embarrassed by a fake score during judging week |
| Reddit-y | A daily thread where handlers compare runs; rank flair that means something in the subreddit; scores commented by the players themselves; the day's best run watchable by everyone; an unusual subject with its own voice (trial vocabulary, a dry shepherd's one-liner on each result card). No Snoo or karma theming |
| Daily Content | Scheduled daily post from a server-owned seed; a weekly difficulty rhythm; daily modifiers; streaks; two different games every day; weekly board; every seed pre-checked as solvable |
| "Stand out" list | Onboarding → section 8 · Visual craft → section 9 · Calibrated daily content → section 5 · Focused gameplay → sections 3 and 9 · Clear end state → section 3 · Journeys → section 7 |

## 11. Schedule (back from Tue 8 Dec, 6:00 pm Pacific)

| Phase | Dates | Work | Exit test |
|---|---|---|---|
| 0. Stand-up and spikes | Wed 18 – Fri 20 Nov | Register on Devpost and at developers.reddit.com; create the demo subreddit; scaffold from the Three.js template; add the Devvit MCP server; get an empty post playtesting. **Spike A:** the sim imported unmodified into client and server. **Spike B:** record a run on an iPhone and an Android phone, replay it in node, compare scores (the float-determinism question). **Spike C:** does the mobile app's expanded mode rotate. **Spike D:** Gather cost by flock size (frame time on a mid-range phone, replay time in node) | A post on Reddit renders a cube; the four spike answers are written down |
| 1. The trial runs on Reddit | Sat 21 – Wed 25 Nov | Bundle the competition page's renderer and the full pad; strip all tuning UI; portrait layout; fixed camera; splash entry point; expanded mode on Play | A stranger can play today's course in a Reddit post on a phone, in portrait, with no scrolling |
| 2. Daily loop and board | Thu 26 – Sun 29 Nov | Day number and seed on the server; scheduler post + install trigger + menu action; `/api/start`, `/api/checkpoint` and `/api/run` with replay validation; one scored run then practice; today's boards; streaks; result card; **the Gather added as the second daily on the same renderer**; sound sourced | **Minimum shippable cut reached** (below). From here on a post goes up every day so the subreddit has history by judging |
| 3. Onboarding and Reddit features | Mon 30 Nov – Thu 3 Dec | Guided first run; comment-my-score; subscribe; Journeys events; rank flair; watch-the-best-run; logged-out path; daily modifiers and the weekly rhythm; solvability check | A first-time tester pens the flock on the first daily without being told anything |
| 4. Polish | Fri 4 – Sun 6 Dec | Visual identity pass, sound mixed in, weekly board; device matrix (iOS app, Android app, mobile web, desktop, logged out, non-moderator account); performance; README; one-minute video; Devpost text | Checklist in section 13 is green |
| 5. Freeze and submit | Mon 7 Dec | `npx devvit upload` the final version; fresh demo post; submit on Devpost a day early | Submitted |
| Buffer | Tue 8 Dec until 6:00 pm Pacific | Fixes only | — |
| Judging week | 9 – 16 Dec | Keep the daily post running; watch logs; no risky changes | The game is up every day |

### Minimum shippable cut (end of Phase 2, 29 Nov)

The entry is submittable if only this exists: the daily Trial in portrait and desktop, a splash screen, a scheduled daily post, a replay-verified daily leaderboard with one scored run then practice, streaks, a single result card, a short guided first run, and the README. The Gather is due in the same phase; if it slips it lands in Phase 3 ahead of the Should items, because two daily games is an owner decision, not a stretch. Everything in Phases 3–4 raises the score but none of it is needed to qualify.

### Cut order if a phase slips

Realtime toast → ghost "beat this run" → weekly board → collection → watch-the-best-run → flair. Never cut: onboarding, portrait layout, the daily post, the verified board, both daily games, sound (owner decisions).

## 12. Risks

| Risk | Likelihood | Effect | Mitigation |
|---|---|---|---|
| Floating-point differences between a phone's JavaScript engine and the server make an honest run replay to a different score | Medium (the sim uses `Math.sin`, `Math.atan2`, `Math.hypot`, which engines may round differently; the test README already notes this) | Honest scores rejected | Spike B in Phase 0. If it diverges: fallback bounds (section 6, layer 3), or replace the handful of transcendental calls with deterministic versions in a way that leaves the golden replay intact on desktop |
| Portrait layout makes the field too small to read | Medium | Poor UX on the judges' phones | The Trial has only 8 sheep; the Gather's scattered flock is the hard case, so it is checked on a phone at the top of its range; follow-camera framing; decide in Phase 1 with a real phone, before anything else is built on it |
| The game is too hard for a first-time player | High if untreated | Judges bounce in the first minute | Guided first run, soft fail, gentle Monday courses, solvability check; test with three people who have never seen it by 3 Dec |
| The sim file does not bundle cleanly (globals, 270 KB, `const` at top level) | Medium | Lost days in Phase 0–1 | Spike A first; fallback is a generated module copy checked by the golden replay |
| Journeys events do not record for an unpublished app | High | The "Journey Event Instrumentation" bullet is only visible in code | Instrument anyway, say so in the README and the Devpost text, ask on Discord whether hackathon apps are allowlisted |
| `runAs: 'USER'` comments post as the app account during playtest | Certain for non-owner accounts on an unapproved version | Comment feature looks wrong to judges | Word the stickied thread so an app-authored score line still reads well ("u/name: Shepherd · ★★ · 1:12") and note the platform behaviour in the README |
| Demo subreddit must be public and under 200 members, with posts appearing daily through judging | Low | Disqualification or an empty-looking subreddit | Create it in Phase 0; install `dr-admin-approve` if kept private; watch the scheduler logs daily |
| Working on the bulls and other prototype features in parallel changes the sim under the port | Medium | Replays recorded on one version fail on the next | **The owner keeps building prototype features in parallel (Q12)**, so there is no freeze. Instead: every day's meta pins the `simVersion` its courses were made and scored with; the Reddit build takes a named snapshot of the sim, and a new snapshot only ever starts with a new day; old days replay on the snapshot they were played on or are marked unreplayable |
| One scored run a day is unforgiving | Medium | A new player busts their only scored run and does not come back; judges may read it as harsh | Guided first run before the first scored run; the splash offers Practice before Play; a bust still posts a score; watch the first-week completion rate and revisit |
| A closed app never sends its run | Medium | "Counts as it stands" cannot be honoured without the log | Checkpoints every few seconds and on `visibilitychange`; an attempt with no checkpoint at all scores as started-and-abandoned with zero |
| The Gather at 30–80 sheep: replay over the request limit, phone frame rate, and a bust rate that is already high (the demo handler bust 7 of 20 measured 80-sheep pastures) on a one-run-a-day game | High | Unverified scores, a slow game on the judges' phones, or a daily most players fail | Spike D in Phase 0 on a real phone and in node; the verification options in section 6; the weekly rhythm keeps most days in the lower half of the range; the solvability check rejects seeds the handler cannot finish |
| The handler is styled "vaguely like the Big Lebowski" (owner) and the name plays on the BBC programme "One Man and His Dog" | Low while it stays a nod (not legal advice) | A judge or rights holder reading it as someone else's character | Keep it generic: bathrobe, shades, long hair, beard, sandals. No film name, logo, quotes, music or actor likeness anywhere in the app, the listing or the video |
| Two daily games double the surface to polish | High | Both are half-finished | The Trial is finished first and alone satisfies the minimum cut; the Gather reuses its renderer, pad, result card and endpoints |
| Three weeks is short for one person | High | Unfinished polish | The minimum cut lands on day 11 of 20; the cut order above is agreed in advance |
| "Significantly updated" rule for a pre-existing project | Low | Eligibility question | The port, daily loop, boards, onboarding and portrait UI are all new after 11 Nov; describe them plainly in the submission |

## 13. Submission checklist

| # | Item | Done when |
|---|---|---|
| 1 | Registered for the hackathon on Devpost | Owner's account shows the hackathon |
| 2 | App uploaded (not published) | `developers.reddit.com/apps/{app-name}` opens |
| 3 | Demo subreddit public, under 200 members | Opens in a private browser window |
| 4 | Demo post running the final build, pinned | Plays logged out and logged in, on phone and desktop |
| 5 | At least a week of daily posts with real scores | Boards are not empty when a judge arrives |
| 6 | `README.md` in the app root | Describes the game and how to play, for a non-developer |
| 7 | Devpost text description | Features, the Reddit features used, and what was built during the submission period. Entered as a new game, not flagged as a port (owner Q2); the rules still require a pre-existing project to say how it was significantly updated after 11 November, so the description states plainly that the flock simulation predates the contest |
| 8 | Video under one minute, public | Shows feed → play → result → board on a phone |
| 9 | Public repository link (optional) | Owner to decide later (Q7) |
| 10 | Developer feedback survey (optional, $200 award) | Submitted with specific, actionable notes gathered during the port |
| 11 | Scheduler confirmed to run unattended through 16 Dec | Three consecutive automatic posts observed |
| 12 | Final check against the Devvit Rules | No merged actions, mute button, no inline scroll, no external requests |

## 14. Decisions (owner, 2026-11-18)

| # | Question | Decision |
|---|---|---|
| Q1 | Which mode is the daily? | **Two daily games, one of each**: the competition course (The Trial) and the open pasture (The Gather) |
| Q1a | How do the two appear? | **One post a day carrying both games**, each with its own board |
| Q1b | Gather flock size | **Varies by day**, picked by the day's seed (working range 20–50, see below) |
| Q2 | Enter as a port? | **No. New game only** |
| Q3 | Where does the Devvit project live? | **Same repository, new top-level app folder, one copy of the physics** |
| Q4 | Attempts per day | **One scored run per game, then practice** |
| Q4a | An abandoned or closed run | **Counts as it stands** |
| Q5 | Command set | **The full pad** |
| Q6 | Name | ~~A Man and His Dog~~ → ~~One Man and His Dog~~ → **One Dude and His Dog** (see Q16) |
| Q7 | Public repository in the submission? | **Deferred** — the owner will decide later |
| Q8 | Daily post time | **About 13:00 UTC** |
| Q9 | Sound | **Yes, committed** |
| Q10 | Bulls on the daily pasture | **Yes, as the sim draws them** (0–3 from the day's seed) |
| Q11 | The handler figure | ~~The existing figure~~ → **A dude who looks vaguely like the Big Lebowski** (owner, later the same day): bathrobe, shades, long hair, beard, sandals. Built in the prototype's 3D pages already |
| Q12 | Keep building prototype features before 8 Dec? | **Yes, in parallel** (no sim freeze; versions are pinned per day instead) |

### Answered in a second round (owner, 2026-11-18)

| # | Question | Decision |
|---|---|---|
| Q13 | The Gather's flock range | **30–80 sheep** |
| Q14 | What keeps a streak alive? | **Separate streaks, one per game** |
| Q15 | App name | **Hyphenated form**; the first try is `one-dude-and-his-dog` (exactly the 20-character limit), then `onedudeandhisdog`. Availability and whether hyphens are allowed are not verified |
| Q16 | The top rank shares a BBC programme's title | ~~Rename the game to "One Man and His Dog"~~ → **the app and the top award are both "One Dude and His Dog"** (owner's final word, 2026-11-18). The rank is renamed in `web/lib/sheep-sim.js` |

### Still open

| # | Question | Options | Default |
|---|---|---|---|
| Q7 | Public repository in the submission? | Yes · no | Owner to decide; needed by 4 Dec for the Devpost text |
| Q17 | How a big Gather flock is verified | Sliced replay with a "pending" score · faster neighbour search · run-length cap · bounds only above a measured size | **Decided by Spike D** |

## 15. First three things to do

- Register for the hackathon and create the Reddit developer account and demo subreddit (owner; only the owner can do these).
- Add the Devvit MCP server to Claude Code so later sessions can search the docs. Expected result: the `devvit` server is listed and answers a docs search.

```
claude mcp add devvit -- npx -y @devvit/mcp
```

- Q1, Q2, Q3 and Q6 are answered (section 14), so Phase 0 can start. Q7 and Q17 can wait for the spikes.
