# Tests

Two suites, both plain node scripts with no dependencies. Neither starts a web server.

| Suite | Command | What it covers | Time |
|---|---|---|---|
| Sim | `npm test` | `web/lib/sheep-sim.js` and `web/lib/assault-sim.js` loaded in a bare `vm` context: count-up scoring, drive gates, special sheep, wave mode, and an exact replay of the flock and dog physics | about 20 s |
| Pages | `npm run test:pages` | `web/2d.html`, `web/3d.html` and `web/3d-assault.html` in headless Chrome from `file://`: score badge, pops, tally card, saved bests, daily seed, wave mode, drive-gate and special-sheep rendering, zero console errors | about 2 min |
| Both | `npm run test:all` | sim, then pages | |

Each check prints `PASS` or `FAIL` with the measured value, and the process exits 1 if any check fails. The criteria behind the check ids (SC, FO, RM) are in `.claude/sheep/implemented/POC-v14/`.

## Sim suite

- Sheep are pushed through the pen gate by the harness (`cross`), so no check depends on a scripted dog winning a course.
- `FO-1` compares a 40-second driven run on three seeds against `golden-replay.json`, a hash of every sheep and dog position. It fails on any change to flock or dog physics, intended or not.
- After an intended physics change, re-record the fixture with `node test/sim.test.js --update` and review the diff. The fixture also records the node version, because a different JavaScript engine could in principle round a `Math.sin` differently.

## Page suite

- Needs node 22 or newer (global `WebSocket` and `fetch`), Google Chrome, and network access, since lil-gui and three.js load from a CDN.
- Run one page with `node test/pages.test.js 2d.html`.
- Use another browser binary with `CHROME=/path/to/chrome node test/pages.test.js`.
- Screenshots are written to `test/shots/`, which is git-ignored.
- It uses a throwaway browser profile in the system temp folder, so it never touches your own saved bests.
