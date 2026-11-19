# Devvit Web — platform notes

What was learned about Reddit's Developer Platform on 2026-11-18, limited to what shapes the [plan](plan.md). `WebFetch` could not reach developers.reddit.com, so the facts below come from the docs' own machine-readable export, `https://developers.reddit.com/docs/llms-full.txt` (downloaded with `curl`, docs version 0.15), plus the AI guide and the Devvit Rules page fetched the same way. Each row names the docs page it came from; all pages live under `https://developers.reddit.com/docs/`.

## AI tooling

| Thing | Detail | Source |
|---|---|---|
| Devvit MCP server | `@devvit/mcp`, run with `npx`. Two tools: `devvit_search` (hybrid search over the docs) and `devvit_logs` (experimental: pulls an app's logs for a subreddit) | [guides/ai](https://developers.reddit.com/docs/guides/ai#mcp) |
| `llms.txt` | Short index for pasting into a chat | [docs/llms.txt](https://developers.reddit.com/docs/llms.txt) |
| `llms-full.txt` | The whole docs in one file (about 676 KB); the guide recommends it for learning and planning, not for coding sessions | [docs/llms-full.txt](https://developers.reddit.com/docs/llms-full.txt) |
| Templates | React, Phaser, Three.js, Hello World starters at `developers.reddit.com/new`; the Three.js one ships Vite and Devvit preinstalled | [examples/template-library](https://developers.reddit.com/docs/examples/template-library) |

To add the MCP server to Claude Code (the docs' own command), run this from the project directory:

- Add the Devvit MCP server. Expected result: Claude Code reports the `devvit` server was added, and a new session can answer "search the Devvit docs for redis".

```
claude mcp add devvit -- npx -y @devvit/mcp
```

## What a Devvit Web app is

| Piece | What it is | Source |
|---|---|---|
| `src/client` | An ordinary web app (HTML / CSS / JS) shown in a webview inside a Reddit post | [quickstart](https://developers.reddit.com/docs/quickstart) |
| `src/server` | A Node-compatible, serverless HTTP server (templates use Express); endpoints the client calls with `fetch('/api/...')` | [devvit_web_overview](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview) |
| `src/shared` | Code and types used by both | quickstart |
| `devvit.json` | App name (3–20 chars, lowercase, letters / digits / hyphens), post entry points, permissions, scheduler tasks, triggers, menu items | [devvit_web_configuration](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration) |
| Build | Vite with the Devvit plugin; build-only (`vite build --watch`), no dev server or hot reload, because playtest uploads the build to Reddit | guides/tools/vite |
| Requirements | Node 24.18.0 or newer; a Reddit account connected at developers.reddit.com | quickstart |

## Hard limits and prohibitions

| Limit | Value | Consequence for this game | Source |
|---|---|---|---|
| Client network access | "You can't have any external requests other than the app's webview domain… locked down… via CSP" | **three.js cannot load from a CDN.** It must be bundled into the client. lil-gui (also CDN-loaded today) is dropped rather than bundled | devvit_web_overview, Limitations |
| `localStorage` | "The iframe URL changes with each app version, so localStorage data is lost when you publish an update" | Bests, history, collection and streaks move to Redis; `localStorage` is only a same-version cache | devvit_web_overview |
| Server request | 30 s per request, 4 MB request, 10 MB response, no streaming or websockets | A server-side replay of a run must finish well inside 30 s | devvit_web_overview |
| Server packages | No `fs`, no native packages | The sim is already DOM-free and dependency-free; fine | devvit_web_overview |
| Redis | 100 MB per installation while unpublished (5 GB once published), 5 MB per request, no pipelining; data is siloed per subreddit installation | One subreddit = one leaderboard. A cross-subreddit board needs an external service through HTTP fetch | capabilities/server/redis |
| Post data | 2 KB of JSON per post, readable by the client without a server call | Holds the day number, the course seed and the course kind | capabilities/server/post-data |
| Scheduler | Cron tasks declared in `devvit.json`, endpoint path must match `/internal/.+`; up to 10 recurring jobs per installation | One daily job is plenty | capabilities/server/scheduler |
| Realtime | 1 MB per message, 100 messages per second per installation; server sends, clients subscribe | Optional live leaderboard ticks | capabilities/realtime |
| Inline post height | `regular` 320 px, `tall` 512 px; width about 288–880 px | The inline view is a splash card, not the game | guides/faq |
| Inline mode rules | Tap / click input only, no scroll traps, no zoom or pan interference, initial content under 1 s, Lighthouse above 80, no auto-expand, no sound without interaction plus a mute button | The pasture (drag camera, held buttons) must live in expanded mode | view_modes_entry_points |

## View modes, entry points, first screen

| Fact | Source |
|---|---|
| Every app loads **inline** in the feed first. **Expanded mode** (modal on web, full screen on mobile) opens only from a user action, by calling `requestExpandedMode(event, 'entryName')` from a click handler | view_modes_entry_points, guides/faq |
| Several entry points (for example `default` splash, `game`, `leaderboard`) are declared under `post.entrypoints` in `devvit.json`, each its own HTML file | view_modes_entry_points |
| A reserved `_direct_launch` entry point opens the game straight into expanded mode from the Daily Games, Featured, Play Again and Category surfaces (CLI 0.15.3 or newer preferred) | direct launch for games |
| Launch readiness for games: responsive on mobile and desktop, a custom first screen, no inline scrolling, a dedicated non-test subreddit, "immediately understandable to new users" | guides/launch/launch-guide |
| "Keep in mind that the majority of users are on mobile devices" | view_modes_entry_points |

## Identity, posts, comments, flair

| Capability | Detail | Source |
|---|---|---|
| Who is playing | `context.userId` on the server, present only when logged in; `reddit.getCurrentUsername()`; `reddit.getSnoovatarUrl(username)` for the avatar | guides/logged-out-users, guides/faq |
| Logged-out players | The guide asks that the core game be playable logged out, with leaderboards and saved progress reserved for logged-in users and a login prompt at the right moment | guides/logged-out-users |
| Creating posts | `reddit.submitCustomPost({ title, entry, postData })` from a scheduler endpoint, a menu action or an install trigger | guides/faq, creating_custom_post |
| Commenting a score | Only after an explicit button press, as the user (`runAs: 'USER'`, needs `permissions.reddit.asUser`), **as a reply to a single stickied comment** unless the player adds their own message. Never merged with "play again" | capabilities/server/userActions |
| Playtest caveat | During playtest or on an unapproved version, `runAs: 'USER'` posts as the app account for everyone except the app owner | guides/faq |
| Subscribe prompt | Allowed as its own separate button; apps cannot vote or follow | userActions |
| Flair | `reddit.setUserFlair()` on the app's subreddit; fetch the existing flair first to preserve it | guides/faq |
| Leaderboards | Redis sorted sets (`zAdd`, `zRange`, `zScore`, `zCard`, `zRem`); scheduler for resets; realtime for live updates | guides/faq, redis |
| Streaks | The docs' recommended pattern (from Syllo): one bit per day per user per year in Redis, set server-side on completion, the day taken from the post's UTC creation date and never the device clock | notifications / adding streaks |

## Analytics: Devvit Journeys

| Fact | Source |
|---|---|
| Client SDK `@devvit/analytics/client/reddit`; `permissions.journeys: true` in `devvit.json` | capabilities/analytics/devvit-journeys |
| Events: `App.Ready` (interactive), `Journey.Start` (an explicit "play" press, never a page view), `Journey.Progress` (`progress` 0–1), `Journey.Interaction` (`action`), `Journey.End` (`complete`, `game { win, score }`) | same |
| Fire on committed input (`mouseUp` / `touchEnd`), never on views or `touchStart`; no personal data in event fields | same |
| "Telemetry is restricted by a server-side allowlist. Your app will only emit journey events after it has been approved in the review process"; until then events are dropped with a message | same |

## Not usable for the contest build

| Feature | Why | Source |
|---|---|---|
| Push notifications | Gated beta aimed at "established, already-engaged games rather than brand-new launches" | notifications overview |
| Payments | Needs earn-program eligibility, terms of service and a privacy policy; adds review risk and nothing the judges asked for | earn-money/payments, devvit_rules |
| HTTP fetch to outside domains | Server-only, per-domain approval, requires terms and privacy policy | capabilities/http-fetch, devvit_rules |

## Develop, upload, publish

| Step | Command | What it does | Source |
|---|---|---|---|
| Scaffold | wizard at `developers.reddit.com/new` | Creates the project and a private dev subreddit | quickstart |
| Playtest | `npm run dev` (runs `devvit playtest`) | Uploads the build, prints `https://www.reddit.com/r/<app>_dev/?playtest=<app>`; backend calls only work on Reddit, never locally | quickstart, guides/tools/playtest |
| Alternate subreddit | `devvit playtest r/<name>` | Subreddit must have fewer than 200 subscribers | playtest |
| Upload | `npx devvit upload` | A private installable build; creates the app listing page. **This is what the contest wants** | guides/faq |
| Publish | `npx devvit publish` | Submits for app review (about a week for a new app). **Not for the contest** | launch-guide, devvit_rules |

## Devvit Rules that bite

| Rule | Source |
|---|---|
| A descriptive `README.md` in the app root, written for non-developers; a template or vague README is rejected | [devvit_rules](https://developers.reddit.com/docs/devvit_rules) |
| "Do not merge gameplay actions with posting, commenting, or subscribing — each action must remain a separate, clear choice" | devvit_rules |
| Honour deletions: remove stored user content when the user deletes it on Reddit | devvit_rules, redis |
| No gambling or other regulated-industry mechanics | devvit_rules |

## Not verified

- Whether the Reddit mobile apps let an expanded webview rotate to landscape. The docs only say expanded mode is full screen on mobile; the plan assumes portrait must work.
- The client asset size limit for an upload (no number found in the docs export). The game is about 0.5 MB of our own script plus three.js, so this is unlikely to matter.
- Whether inline `<script>` blocks are permitted by the webview CSP. The docs' own preview example uses an external `preview.js`; the plan bundles everything into files and uses no inline script.
- Whether Journeys events are live for unpublished hackathon apps (see [contest.md](contest.md)).
- The docs for `@devvit/test` (a local test harness with Redis and scheduler support) were listed but not read in detail.
