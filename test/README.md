# Tests

Two suites, both plain node scripts with no dependencies. Neither starts a web server.

| Suite | Command | What it covers | Time |
|---|---|---|---|
| Sim | `npm test` | `web/lib/sheep-sim.js` and `web/lib/assault-sim.js` loaded in a bare `vm` context: tiers, condition, the chain, strikes, end multipliers, awards, jackpots, drive gates, special sheep, side objectives, ranks and grades, wave mode, an exact replay of the flock and dog physics, the competition course, obstacles-or-gates, and the demo handler winning fixed courses | about 1 min |
| Pages | `npm run test:pages` | `web/2d.html`, `web/3d.html` and `web/3d-assault.html` in headless Chrome from `file://`: the upper-left score block, chain meter, strikes, tiered pops, banners, end card, saved bests, run history, band bests, collection, daily seed, wave mode, drive-gate and special-sheep rendering, phone landscape, zero console errors; then demo mode on `2d.html`, `3d.html` and `web/3d-competition.html`, the competition course, and no drive gates on the 3D pastures | about 5 min |
| Both | `npm run test:all` | sim, then pages | |

Each check prints `PASS` or `FAIL` with the measured value, and the process exits 1 if any check fails. The criteria behind the check ids are in `.claude/sheep/implemented/POC-v15/` (SC, FO, VH, RC) and `.claude/sheep/implemented/POC-v14/` (RM, and the drive-gate `G-` and special-sheep `K-` checks carried forward), and `.claude/sheep/implemented/POC-v16/` (CC, EX, DM).

## Sim suite

- Sheep are penned by the harness, so no check depends on a scripted dog winning a course: `pen` sets a sheep's state and calls the sim's scoring entry directly (fully controlled), `cross` teleports it just outside the gate mouth and steps once (through the real gate path).
- `SC-18` compares a 40-second driven run on three seeds against `golden-replay.json`, a hash of every sheep and dog position recorded when POC-v14 shipped. It fails on any change to flock or dog physics, intended or not, and is what shows that scoring never moves a sheep.
- After an intended physics change, re-record the fixture with `node test/sim.test.js --update` and review the diff. The fixture also records the node version, because a different JavaScript engine could in principle round a `Math.sin` differently.

## Page suite

- Needs node 22 or newer (global `WebSocket` and `fetch`), Google Chrome, and network access, since lil-gui and three.js load from a CDN.
- Run one page with `node test/pages.test.js 2d.html` (also `3d.html`, `3d-assault.html`, `3d-competition.html`).
- Use another browser binary with `CHROME=/path/to/chrome node test/pages.test.js`.
- Screenshots are written to `test/shots/`, which is git-ignored.
- It uses a throwaway browser profile in the system temp folder, so it never touches your own saved bests.
