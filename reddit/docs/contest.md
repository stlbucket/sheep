# Reddit's Game of the Day Hackathon — what the contest asks for

Read on 2026-11-18 from the Devpost overview page, the full rules page, the resources page and the updates page. `WebFetch` was refused by devpost.com (HTTP 403), so the pages were downloaded with plain `curl` and read as text; quotes below are copied from that text. The Updates tab had no announcements yet. The Discussions tab and the project gallery were not read.

Sources: [overview](https://redditgameofday2026.devpost.com/) · [rules](https://redditgameofday2026.devpost.com/rules) · [resources](https://redditgameofday2026.devpost.com/resources) · [schedule](https://redditgameofday2026.devpost.com/details/dates) · [updates](https://redditgameofday2026.devpost.com/updates)

## Dates

| Period | Begins | Ends |
|---|---|---|
| Submission (and feedback survey) | Wed 11 Nov 2026, 12:00 pm Pacific | **Tue 8 Dec 2026, 6:00 pm Pacific** |
| Judging | Wed 9 Dec 2026, 12:00 am Pacific | Wed 16 Dec 2026, 6:00 pm Pacific |
| Winners announced | On or around Thu 17 Dec 2026, 3:00 pm Pacific | |

From today (Wed 18 Nov) that is 20 days. After the deadline the submission cannot be changed, and the game must stay playable, free and unrestricted, until judging ends on 16 Dec.

## Prizes

| Prize | Amount | Winners |
|---|---|---|
| Best Daily Game | $15,000 | 1 |
| Best Ported Daily Game | $6,000 | 1 |
| Honorable Mentions | $1,000 | 10 |
| Devvit Helper Award (helping others on Discord and r/Devvit) | $500 | 6 |
| Feedback Award (developer survey) | $200 | 5 |

"A project can only win one (1) prize." The helper and feedback prizes go to individuals, not projects, so they can be won on top of a project prize.

**Best Ported Daily Game** is the category this project fits: "This subcategory is for the best daily game that leverages a developer's existing IP or is ported from another platform. Note you must own the original app/IP to qualify for this category. Make sure to note your game is a port when you submit your project." The prize table lists every prize as open to "All Eligible Submissions", so flagging the port does not appear to take the entry out of the running for Best Daily Game, but the rules do not say so in as many words (see open question Q2 in [plan.md](plan.md)).

## The brief

"The challenge: create a new daily game for the users of Reddit using our Developer Platform." Games "must be built on Devvit Web and be compliant with our Devvit Rules."

"What counts as a 'Daily Game': Apps built around a bite-sized daily experience that offers enough variety and replayability to keep players coming back and wanting more. Games should be easy to get the hang of, have a satisfying daily loop, and seamlessly integrated into Reddit's ecosystem. Think: daily challenges, puzzles, prompts, or maps. Bonus points for layering in Reddit features like Devvit journeys, flair, comments, snoovatars, streaks, etc to make the experience feel both native and sticky."

Named examples of existing daily games: r/hotandcold, r/colorpuzzlegame, r/syllo, r/pocketgrids.

## Judging criteria (equally weighted, quoted)

Stage one is pass / fail: the project "reasonably fits the theme and reasonably applies the required APIs/SDKs". Stage two scores four criteria, equally weighted. Ties are broken in the order listed.

| Criterion | Text |
|---|---|
| Delightful UX | "Experiences should be built with exciting layouts and themes. While apps do not need to be perfect, it should be easy and fun to uncover what the app has to offer." |
| Polish | "Your submission should be as close to publishable as possible and compliant with Devvit Rules. Judges should be able to understand everything we need to know by interacting with example posts. The closer to launch quality, the higher the score here." |
| Reddit-y | "Reddit is all about community and embracing topics people care about, no matter how weird. We want apps to have their own identity, be community-minded, and bring something fresh to the platform. The best apps will bring a community together." |
| Daily Content | "Does your app create recurring content, challenges, and intrigue? While content does not have to strictly be *daily*, it should make smart use of fresh content." |

## What the organisers say makes a daily game stand out (quoted headings, summarised bodies)

| Heading | What they ask for |
|---|---|
| Intuitive Onboarding | Meaningful play quickly, few setup screens, contextual hints "rather than overwhelming wall-of-text instructions" |
| Visual Craft | A clear visual identity, accessible contrast, legible text, uncluttered controls, responsive feedback; no "unstyled generic components" |
| Calibrated Daily Content | Fresh, bite-sized daily value; "legible, fair, and solvable with a well-calibrated difficulty curve" |
| Focused Gameplay | Start screen shows the essentials ("game name, description, date, attribution, stats"); no clutter or secondary actions during play |
| Clear End States & Re-engagement Loops | One clear result card with a meaningful next step: "stats, streaks, a place to comment, or a subreddit subscription prompt"; not several end screens |
| Journey Event Instrumentation | Devvit Journeys events "to reliably track users through game loops for proper analytics, leaderboard tracking, and streak verification" |

## What they say they are not looking for

| Heading | Meaning for us |
|---|---|
| AI Slop | "Fit the UI in the viewport, give your app a unique identity, make it accessible" — the debug-tool look of the prototype pages must go |
| On the nose Reddit theming | Reddit-y is community and spirit, not Snoo and karma jokes; no need to theme the pasture around Reddit |
| Common Ideas | Space shooters, clones, simple platformers, trivia score worse; a sheepdog trial is not on that list, which is an advantage |
| Games not on Reddit | "You simply cannot place in this hackathon if your game isn't running on Reddit. If you're porting something over, don't wait until the last minute to get the game running on our systems." |

## What to submit

| Item | Required | Notes |
|---|---|---|
| Devpost registration and submission form | Yes | Text description of features and functionality; say it is a port and how it was significantly updated during the submission period |
| App listing link | Yes | `developers.reddit.com/apps/{app-name}`, created when the app is first uploaded |
| Demo post | Yes | Link to the test subreddit and to a post running the game; subreddit public, or install `dr-admin-approve` so admins can join; "a public subreddit with less than 200 members" |
| `README.md` in the app's root | Yes | "a detailed README.md in the root directory of your app that describes the game and how to play" |
| Demo video | Optional | Under one minute, shows the game on the device it was built for, public on YouTube / Vimeo / Facebook Video / Youku |
| Public repository link | Optional | |
| Developer feedback survey | Optional | Needed only for the Feedback Award |

"Judging will score your game based on the demo link, so make sure to make the experience as self explanatory as possible." Judges "are not required to test the Project and may choose to judge based solely on the text description, images, and video", so the description and the video matter too.

**Do not publish.** "Please do not submit your app for publishing… Once uploaded to Devvit, the app can remain private to qualify for the hackathon. This means you should be uploading and playtesting your app, not publishing it."

## Eligibility and other rules that touch us

| Rule | Effect |
|---|---|
| Age of majority, most countries; individuals, teams or organisations | Owner enters as an individual |
| "New & Existing: Projects must be either newly created by the Entrant or, if the Entrant's Project existed prior to the Hackathon Submission Period, must have significantly updated after the start of the Hackathon Submission Period. Entrants should explain how their Project was significantly updated" | The prototype predates 11 Nov. The Devvit port, the daily course, leaderboards and onboarding are the significant update; the description must say so |
| Past Reddit hackathon winners are not eligible | Does not apply |
| Original work; own or license every asset | No third-party art or sound without a licence; three.js is MIT |
| Multiple submissions allowed if substantially different | One entry planned |
| English materials | Yes |
| Devvit Rules and Developer Terms apply | See [platform-notes.md](platform-notes.md) |

## Not verified

- Whether a port-flagged entry can also win Best Daily Game (the prize table suggests yes; not stated outright).
- Whether Devvit Journeys events are recorded for an unpublished hackathon app (the Journeys docs say events only flow after app review; the contest tells entrants not to submit for review). Ask on the hackathon Discord.
- Anything posted in the Discussions tab or on Discord after 18 Nov.
