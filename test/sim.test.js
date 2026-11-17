// Headless sim suite — scoring (SC), field objectives (FO), wave mode (RM).
//   node test/sim.test.js            run every check (exit 1 on any failure)
//   node test/sim.test.js --update   re-record test/golden-replay.json (only after an INTENDED change to flock / dog physics)
// Loads web/lib/sheep-sim.js and web/lib/assault-sim.js in a bare `vm` context: no DOM, no browser.
// Sheep are pushed through the pen gate by the harness (`cross`), so no check depends on a scripted dog winning a course.
// Criteria: .claude/sheep/implemented/POC-v14/{scoring,field-objectives,replay-modes}.md
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto')
const WEB = path.join(__dirname, '..', 'web')
const GOLDEN = path.join(__dirname, 'golden-replay.json')
const UPDATE = process.argv.includes('--update')
function load(dir, defaultsDir, withAssault) {
  const ctx = { console: { log() {}, warn() {}, error: (...a) => console.error('[ctx error]', ...a) } }
  vm.createContext(ctx)
  vm.runInContext(fs.readFileSync(path.join(defaultsDir, 'sheep-defaults.json.js'), 'utf8') + ';globalThis.SHEEP_DEFAULTS=SHEEP_DEFAULTS', ctx)
  vm.runInContext(fs.readFileSync(path.join(dir, 'sheep-sim.js'), 'utf8') + ';Object.assign(globalThis,{FlockSim,SETTINGS,buildParams,assertLevers})', ctx)
  if (withAssault) vm.runInContext(fs.readFileSync(path.join(dir, 'assault-sim.js'), 'utf8') + ';Object.assign(globalThis,{assault,assaultReset,assaultStep,explode,wolfAward,teamFlee,BLAST})', ctx)
  return ctx
}
const N = load(path.join(WEB, 'lib'), WEB, true)
const DT = 1 / 60
const results = []
const ok = (id, name, pass, detail) => { results.push({ id, name, pass: !!pass, detail }); }
function mk(ctx, over = {}) {
  const p = ctx.buildParams(ctx.SETTINGS)
  Object.assign(p, { obstacleRandom: false, obstacleFreq: 0, driveGateMax: 0, specials: false }, over)
  return new ctx.FlockSim(p)
}
const steps = (sim, secs) => { for (let i = 0; i < Math.round(secs / DT); i++) sim.step(DT) }
// push sheep i out through the pen gate on the next step
function cross(sim, i) {
  const s = sim.sheep[i], g = sim.gate
  s.pos = { x: g.x + g.nx * 3, y: g.y + g.ny * 3 }; s.vel = { x: g.nx * 30, y: g.ny * 30 }
  const before = sim.points
  sim.step(DT)
  return { through: s.through, gained: sim.points - before }
}
const lastEv = (sim) => sim.scoreEvents[sim.scoreEvents.length - 1]

// ---------------- SC ----------------
{ // SC-1 starts at 0, monotonic over a driven run
  const sim = mk(N, { seed: 11, sheepCount: 30 })
  let mono = sim.points === 0, prev = 0
  const cmds = ['away', 'walk_on', 'come_by', 'walk_on', 'lie_down', 'walk_on']
  for (let k = 0; k < 60 * 90; k++) {
    if (k % 300 === 0) sim.setCommand(cmds[(k / 300) % cmds.length])
    if (k === 1800) for (let i = 0; i < 5; i++) cross(sim, i)
    sim.step(DT)
    if (sim.points < prev) mono = false
    prev = sim.points
  }
  ok('SC-1', 'score starts at 0 and never decreases over a 90 s run', mono && sim.points > 0, `final ${sim.points}`)
}
{ // SC-2
  const a = mk(N, { seed: 5, sheepCount: 10, penCalmStress: 0 })
  const r1 = cross(a, 0)
  const b = mk(N, { seed: 5, sheepCount: 10 })
  const r2 = cross(b, 0)
  ok('SC-2', 'stressed pen = penPoints (100), calm pen = penCalmPoints (200)', r1.through && r1.gained === 100 && r2.gained === 200, `${r1.gained} / ${r2.gained}`)
}
{ // SC-3 combo 200,400,600 then 200
  const s = mk(N, { seed: 5, sheepCount: 10 })
  const g = []
  g.push(cross(s, 0).gained); steps(s, 1); g.push(cross(s, 1).gained); steps(s, 1); g.push(cross(s, 2).gained)
  steps(s, 3); g.push(cross(s, 3).gained)
  ok('SC-3', 'three calm crossings in the window score 200, 400, 600; a late fourth 200', g.join() === '200,400,600,200', g.join())
}
{ // SC-4 cap
  const s = mk(N, { seed: 5, sheepCount: 10, comboMax: 2 })
  const g = []
  for (let i = 0; i < 5; i++) { g.push(cross(s, i).gained); steps(s, 0.5) }
  ok('SC-4', 'multiplier never exceeds comboMax (2)', g.join() === '200,400,400,400,400', g.join())
}
function winRun(over, tweak) {
  const s = mk(N, { seed: 7, sheepCount: 6, ...over })
  for (let i = 0; i < 6; i++) { if (i === 5 && tweak) tweak(s); cross(s, i); if (i < 5) steps(s, 0.5) }
  return s
}
{ // SC-5 total = sum of lines; flock line only when all penned
  const s = winRun({})
  const sc = s.score(), sum = sc.lines.reduce((n, l) => n + l.points, 0)
  const part = mk(N, { seed: 7, sheepCount: 6 }); cross(part, 0); part.finishRun()
  const psc = part.score()
  ok('SC-5', 'won total = sum of card lines; full-flock line only when every sheep is penned',
    sc.won && sum === sc.total && sc.lines.some((l) => l.key === 'flock') && !psc.lines.some((l) => l.key === 'flock') && psc.lines.reduce((n, l) => n + l.points, 0) === psc.total,
    `total ${sc.total} = Σ ${sum}; partial ${psc.total}`)
}
{ // SC-6 injury: no clean line, no 3rd star, no reduction, combo reset
  const s = mk(N, { seed: 7, sheepCount: 6 })
  cross(s, 0); steps(s, 0.5); cross(s, 1); steps(s, 0.5); const third = cross(s, 2).gained
  const g = s.gate
  s.sheep[5].pos = { x: g.x - g.nx * 5, y: g.y - g.ny * 5 }
  const before = s.points
  s.injureAtGate()
  const after = s.points, comboAfter = s.score().combo
  const next = cross(s, 3).gained
  steps(s, 0.3); cross(s, 4)
  const sc = s.score()
  ok('SC-6', 'injury: total not reduced, combo back to ×1, no clean-run line, no third star, run still wins',
    third === 600 && after === before && comboAfter === 1 && next === 200 && sc.won && !sc.lines.some((l) => l.key === 'clean') && sc.stars < 3 && s.injuries === 1,
    `third ${third}, next ${next}, stars ${sc.stars}, won ${sc.won}`)
}
{ // SC-7 time bonus
  const s = winRun({}, (sim) => { sim.run.t = sim.par() - 20.5 })
  const over = winRun({}, (sim) => { sim.run.t = sim.par() + 5 })
  const tb = (x) => (x.score().lines.find((l) => l.key === 'time') || { points: 0 }).points
  ok('SC-7', '20 s under par pays 400; over par pays nothing', tb(s) === 400 && tb(over) === 0 && over.score().stars === 1, `${tb(s)} / ${tb(over)}`)
}
{ // SC-8 par read-out
  const s = mk(N, { seed: 7, sheepCount: 6 })
  const a = s.score().parLeft; steps(s, 2); const b = s.score().parLeft
  s.run.t = s.par() + 4
  ok('SC-8', 'parLeft counts down and goes negative past par', Math.abs(a - b - 2) < 0.05 && s.score().parLeft < 0 && Math.abs(a - 63) < 0.01, `${a.toFixed(2)} → ${b.toFixed(2)} → ${s.score().parLeft.toFixed(1)}`)
}
{ // SC-11 awards on / off
  const has = (s, n) => s.score().awards.includes(n)
  const calm = winRun({}), stressed = winRun({ penCalmStress: 0 })
  const A1 = has(calm, 'Not a Hair Out of Place') && !has(stressed, 'Not a Hair Out of Place')
  const broken = mk(N, { seed: 7, sheepCount: 6 }); for (let i = 0; i < 6; i++) { cross(broken, i); if (i < 5) steps(broken, i === 2 ? 4 : 0.5) }
  const A2 = has(calm, 'One Stream') && !has(broken, 'One Stream')
  const loud = winRun({}, (sim) => { sim.run.commands = 40 })
  const A3 = has(calm, 'Quiet Hand') && !has(loud, 'Quiet Hand')
  const onl = winRun({}, (sim) => { sim.run.onLine = sim.run.t }), offl = winRun({}, (sim) => { sim.run.onLine = 0 })
  const A4 = has(onl, 'Straight as a Die') && !has(offl, 'Straight as a Die')
  const photo = winRun({}, (sim) => { sim.run.t = sim.par() - 1 })
  const A5 = has(photo, 'Photo Finish') && !has(calm, 'Photo Finish')
  const pts = calm.score().lines.find((l) => l.key === 'award').points === 300 * calm.score().awards.length
  ok('SC-11', 'each of the five awards is earned when met and absent when not; 300 each', A1 && A2 && A3 && A4 && A5 && pts, [A1, A2, A3, A4, A5, pts].join())
  // quiet hand counting: repeats free, reseed recall free
  const q = mk(N, { seed: 7, sheepCount: 6 })
  q.setCommand('that_ll_do'); q.setCommand('away'); q.setCommand('away'); q.setCommand('walk_on'); q.setCommand('easy'); q.setCommand('walk_on')
  ok('SC-11b', 'command count: repeats are free, an impulse counts', q.run.commands === 4, `commands ${q.run.commands}`)
  ok('SC-9', '3 stars: under par, clean, all calm; 2 stars when not calm', calm.score().stars === 3 && stressed.score().stars === 2, `${calm.score().stars} / ${stressed.score().stars}`)
}
{ // SC-12 assault
  const s = mk(N, { seed: 7, sheepCount: 6 })
  N.assaultReset(s)
  const b0 = s.points
  N.wolfAward(s, 10, 10)
  const b1 = s.points
  const v = s.sheep[0]
  N.explode(s, v.pos.x, v.pos.y)
  const b2 = s.points
  for (let i = 1; i < 6; i++) { if (!s.sheep[i].down) cross(s, i) }
  const sc = s.score()
  ok('SC-12', 'a routed wolf adds wolfPoints; a sheep lost to a mortar changes nothing; survivors still win', b1 - b0 === 300 && b2 === b1 && v.down && sc.won && sc.lines.some((l) => l.key === 'wolf'), `wolf +${b1 - b0}, kill ${b2 - b1}, won ${sc.won}`)
}
{ // SC-13 / 14
  const hit = []
  for (const f of ['lib/sheep-sim.js', 'lib/assault-sim.js', 'lib/sheep-gui.js', 'sheep-defaults.json.js', '2d.html', '3d.html', '3d-assault.html', 'index.html'].concat(fs.existsSync(path.join(WEB, 'lib/sheep-score-ui.js')) ? ['lib/sheep-score-ui.js'] : [])) {
    const txt = fs.readFileSync(path.join(WEB, f), 'utf8')
    for (const k of ['w_time', 'w_line', 'w_cohesion', 'w_calm', 'injuryWeight']) if (txt.includes(k)) hit.push(f + ':' + k)
  }
  ok('SC-13', 'old penalty keys appear nowhere under web/', hit.length === 0, hit.join(' ') || 'none')
  ok('SC-14', 'both sim libs load in plain node; lever assertions pass', N.assertLevers().length === 0, 'assertLevers → 0 errors')
}

// ---------------- FO ----------------
{ // FO-1 replay: with drive gates and specials off, the flock and dog physics must replay the recorded run exactly.
  // The golden file was recorded when POC-v14 shipped, from a build verified position-for-position against the pre-v14 sim.
  const digest = {}
  for (const seed of [3, 1337, 90210]) {
    const a = mk(N, { seed, sheepCount: 40, obstacleFreq: 3 })
    const cmds = ['away', 'walk_on', 'come_by', 'easy', 'lie_down', 'walk_on']
    for (let k = 0; k < 60 * 40; k++) {
      if (k % 240 === 0) a.setCommand(cmds[(k / 240) % 6])
      a.step(DT)
    }
    const state = a.sheep.map((q) => [q.pos.x, q.pos.y]).concat([[a.dog.pos.x, a.dog.pos.y]])
    digest[seed] = crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex')
  }
  if (UPDATE) { fs.writeFileSync(GOLDEN, JSON.stringify({ note: 'sha256 of sheep + dog positions after 40 s; see test/sim.test.js FO-1', node: process.version, digest }, null, 2) + '\n'); console.log('golden-replay.json re-recorded') }
  const gold = fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) : null
  const same = !!gold && Object.keys(digest).every((k) => gold.digest[k] === digest[k])
  ok('FO-1', 'gates 0 + specials off: 3 seeds × 40 s replay the recorded run exactly', same, gold ? (same ? 'matches golden-replay.json' : `differs from golden (recorded on node ${gold.node}, running ${process.version})`) : 'golden-replay.json missing — run with --update')
  // and with them ON the course layout (gate, obstacles, flock start) is unchanged
  let layout = true
  for (const seed of [3, 1337, 90210, 42]) {
    const a = mk(N, { seed, sheepCount: 40, obstacleFreq: 3, driveGateMax: 2, driveGateChance: 1, specials: true, lambChance: 0 }), b = mk(N, { seed, sheepCount: 40, obstacleFreq: 3 })
    if (a.gate.x !== b.gate.x || a.gate.y !== b.gate.y) layout = false
    for (let i = 0; i < 40; i++) if (a.sheep[i].pos.x !== b.sheep[i].pos.x || a.sheep[i].pos.y !== b.sheep[i].pos.y) layout = false
    const real = a.obstacles.filter((o) => o.kind !== 'hurdle')
    if (real.length !== b.obstacles.length || real.some((o, i) => o.x !== b.obstacles[i].x)) layout = false
  }
  ok('FO-1b', 'with gates + specials ON a seed still lays the same gate, obstacles and flock', layout, '')
}
{ // FO-2 placement over 200 seeds
  let bad = 0, gates = 0, seedsWith = 0
  for (let seed = 1; seed <= 200; seed++) {
    const s = mk(N, { seed, obstacleRandom: true, driveGateMax: 2, specials: true })
    const r = s.playRect(), g = s.gate
    if (s.driveGates.length) seedsWith++
    gates += s.driveGates.length
    const hs = s.obstacles.filter((o) => o.kind === 'hurdle'), real = s.obstacles.filter((o) => o.kind !== 'hurdle')
    for (const h of hs) {
      if (h.x - h.r < r.x0 || h.x + h.r > r.x1 || h.y - h.r < r.y0 || h.y + h.r > r.y1) bad++
      if (Math.hypot(h.x - g.x, h.y - g.y) < Math.max(s.p.spawnGateClear, s.p.gateAttractR, 100)) bad++
      if (real.some((o) => Math.hypot(o.x - h.x, o.y - h.y) < o.r + h.r)) bad++
      if (s.sheep.some((q) => Math.hypot(q.pos.x - h.x, q.pos.y - h.y) < h.r + 2)) bad++
    }
  }
  ok('FO-2', '200 seeds: no drive gate on the fence, an obstacle, the pen approach or a sheep', bad === 0 && gates > 0, `${gates} gates on ${seedsWith}/200 seeds, ${bad} violations`)
}
function gateSim(over) {
  for (let seed = 1; seed < 400; seed++) {
    const s = mk(N, { seed, sheepCount: 4, driveGateMax: 1, driveGateChance: 1, ...over })
    if (s.driveGates.length) return s
  }
}
const putAt = (s, i, dg, side) => { s.sheep[i].pos = { x: dg.x + dg.nx * side, y: dg.y + dg.ny * side }; s.sheep[i].vel = { x: 0, y: 0 } }
{ // FO-3 / FO-4
  const s = gateSim({}), dg = s.driveGates[0]
  for (let i = 0; i < 4; i++) putAt(s, i, dg, -14 - i * 3)
  s.step(DT)
  const p0 = s.points
  putAt(s, 0, dg, 14); s.step(DT); const g1 = s.points - p0
  putAt(s, 0, dg, -14); s.step(DT); putAt(s, 0, dg, 14); s.step(DT); const g2 = s.points - p0
  ok('FO-3', 'a sheep through the gap scores driveGatePoints once; again scores nothing', g1 === 100 && g2 === 100, `${g1} then ${g2}`)
  for (let i = 1; i < 4; i++) { putAt(s, i, dg, 14 + i * 3); s.step(DT) }
  const g3 = s.points - p0
  steps(s, 0.2)
  ok('FO-4', 'last working sheep through → driveGateBonus once, gate done', g3 === 400 + 500 && dg.done && s.points - p0 === g3, `gained ${g3}, done ${dg.done}`)
  const off = gateSim({}); const d2 = off.driveGates[0]
  off.sheep[0].pos = { x: d2.x + d2.tx * (d2.half + 20) - d2.nx * 14, y: d2.y + d2.ty * (d2.half + 20) - d2.ny * 14 }; off.step(DT)
  const q0 = off.points
  off.sheep[0].pos = { x: d2.x + d2.tx * (d2.half + 20) + d2.nx * 14, y: d2.y + d2.ty * (d2.half + 20) + d2.ny * 14 }; off.step(DT)
  ok('FO-3b', 'crossing the line OUTSIDE the gap scores nothing', off.points === q0, `${off.points - q0}`)
}
{ // FO-5 nothing inside a panel during a driven run
  let worst = Infinity, n = 0
  for (const seed of [2, 9, 14, 23, 31, 57]) {
    const s = mk(N, { seed, sheepCount: 40, driveGateMax: 2, driveGateChance: 1 })
    const hs = s.obstacles.filter((o) => o.kind === 'hurdle'); if (!hs.length) continue
    n++
    const cmds = ['away', 'walk_on', 'come_by', 'walk_on']
    for (let k = 0; k < 60 * 40; k++) {
      if (k % 300 === 0) s.setCommand(cmds[(k / 300) % 4])
      s.step(DT)
      for (const h of hs) {
        for (const q of s.sheep) { if (q.through) continue; const d = Math.hypot(q.pos.x - h.x, q.pos.y - h.y) - h.r; if (d < worst) worst = d }
        const d = Math.hypot(s.dog.pos.x - h.x, s.dog.pos.y - h.y) - h.r; if (d < worst) worst = d
      }
    }
  }
  ok('FO-5', 'no sheep or dog is ever inside a hurdle panel (40 s driven runs)', worst >= -1e-6 && n > 0, `closest edge distance ${worst.toFixed(2)} px over ${n} courses`)
}
function kindSim(kind, over) {
  for (let seed = 1; seed < 600; seed++) {
    const s = mk(N, { seed, sheepCount: 12, specials: true, ...over })
    if (s.sheep.some((q) => q.kind === kind)) return s
  }
}
{ // FO-6 golden
  const a = kindSim('golden', { penCalmStress: 0 }); const gi = a.sheep.findIndex((q) => q.kind === 'golden')
  const r1 = cross(a, gi).gained
  const b = kindSim('golden', {}); const gj = b.sheep.findIndex((q) => q.kind === 'golden'); const other = b.sheep.findIndex((q) => q.kind === 'ewe')
  cross(b, other); steps(b, 0.5); const r2 = cross(b, gj).gained
  ok('FO-6', 'golden ewe: stressed alone = 500; calm at ×2 = 2000', r1 === 500 && r2 === 2000, `${r1} / ${r2} (${lastEv(b).label})`)
}
{ // FO-7 / FO-8 lamb
  const s = kindSim('lamb', {}); const li = s.sheep.findIndex((q) => q.kind === 'lamb'), m = s.sheep[li].mother
  let far = 0
  for (let k = 0; k < 60 * 30; k++) { s.step(DT); far = Math.max(far, Math.hypot(s.sheep[li].pos.x - s.sheep[m].pos.x, s.sheep[li].pos.y - s.sheep[m].pos.y)) }
  ok('FO-7', 'lamb stays close to its mother over 30 s of grazing', far < s.p.idleCohRadius, `max distance ${far.toFixed(1)} px (limit ${s.p.idleCohRadius})`)
  const a = kindSim('lamb', { penCalmStress: 0 }); const la = a.sheep.findIndex((q) => q.kind === 'lamb')
  cross(a, a.sheep[la].mother); steps(a, 0.5); const r1 = cross(a, la).gained, lab = lastEv(a).label
  const b = kindSim('lamb', { penCalmStress: 0 }); const lb = b.sheep.findIndex((q) => q.kind === 'lamb')
  const r2 = cross(b, lb).gained
  ok('FO-8', 'lamb right behind its mother = 300 before the stream multiplier; alone = 100', r1 === 600 && /\+300 ×2/.test(lab) && r2 === 100, `${lab} → ${r1}; alone ${r2}`)
}
{ // FO-9 ram
  const s = kindSim('ram', {}); const ri = s.sheep.findIndex((q) => q.kind === 'ram'), ram = s.sheep[ri]
  const e = s.sheep.findIndex((q) => q.kind === 'ewe')
  // stress scale: same geometry, ram vs ewe
  const place = (i) => { s.sheep.forEach((q, j) => { if (j !== i) q.pos = { x: 100 + j * 3, y: 100 } }); s.sheep[i].pos = { x: 500, y: 400 }; s.dog.pos = { x: 500 - 90, y: 400 }; s.dog.facing = 0; s.dog.vel = { x: 0, y: 0 }; s.dog.command = 'walk_on'; s.dog.intensity = 1 }
  place(ri); s.flee(ri, DT); const sr = ram.stress
  place(e); s.flee(e, DT); const se = s.sheep[e].stress
  // stand: dog advancing inside ramStandDist
  place(ri); s.dog.pos = { x: 500 - 50, y: 400 }; s.dog.vel = { x: 60, y: 0 }; s.flee(ri, DT); const stood = ram.stand
  s.integrate(ri, DT); const facesDog = Math.abs(Math.abs(ram.facing) - Math.PI) < 0.05
  s.dog.pos = { x: 500 - 150, y: 400 }; s.flee(ri, DT); const released = !ram.stand
  // lie-down release
  s.dog.pos = { x: 500 - 50, y: 400 }; s.dog.vel = { x: 60, y: 0 }; s.dog.command = 'walk_on'; s.flee(ri, DT)
  s.dog.command = 'lie_down'; s.dog.vel = { x: 0, y: 0 }
  let t = 0; while (ram.stand && t < 5) { s.flee(ri, DT); t += DT }
  ok('FO-9', 'ram feels less pressure, stands and faces an advancing dog inside ramStandDist, gives way past ramStandRelease or after a lie-down',
    Math.abs(sr / se - 0.6) < 1e-6 && stood && facesDog && released && Math.abs(t - 2) < 0.05, `stress ${sr.toFixed(3)} vs ${se.toFixed(3)}; stood ${stood}; faces ${facesDog}; released ${released}; lie-down release after ${t.toFixed(2)} s`)
  const a = kindSim('ram', { penCalmStress: 0 }); const r = cross(a, a.sheep.findIndex((q) => q.kind === 'ram')).gained
  ok('FO-9b', 'ram is worth 3× (300 stressed)', r === 300, `${r}`)
  // frequency sanity over 400 seeds
  const c = { golden: 0, lamb: 0, ram: 0 }
  for (let seed = 1; seed <= 400; seed++) { const q = mk(N, { seed, sheepCount: 20, specials: true }); for (const k of Object.keys(c)) { const n = q.sheep.filter((x) => x.kind === k).length; if (n > 1) c[k] = NaN; c[k] += n } }
  ok('FO-Q83', 'each kind rolls independently, at most one of each (400 seeds)', Math.abs(c.golden / 400 - 0.35) < 0.08 && Math.abs(c.lamb / 400 - 0.35) < 0.08 && Math.abs(c.ram / 400 - 0.25) < 0.08, `golden ${(c.golden / 4).toFixed(0)} % · lamb ${(c.lamb / 4).toFixed(0)} % · ram ${(c.ram / 4).toFixed(0)} %`)
}

// ---------------- RM5 / RM6 ----------------
{
  const s = mk(N, { seed: 21, mode: 'waves', driveGateMax: 2, driveGateChance: 1, specials: true })
  const n0 = s.sheep.length, c0 = s.run.clock
  steps(s, 5); const c1 = s.run.clock
  const g = cross(s, 0); const c2 = s.run.clock
  ok('RM-6a', 'wave clock counts down and each pen crossing adds waveSecsPerSheep', n0 === 8 && c0 === 90 && Math.abs(c0 - c1 - 5) < 0.05 && Math.abs(c2 - c1 - 3 + DT) < 1e-6, `${c0} → ${c1.toFixed(2)} → ${c2.toFixed(2)}`)
  s.run.clock = 119.5; cross(s, 1)
  ok('RM-6b', 'clock never exceeds waveClockMax', s.run.clock <= 120, `${s.run.clock.toFixed(2)}`)
  const gate = s.gate, gx = gate.x, gy = gate.y
  for (let i = 2; i < n0; i++) cross(s, i)
  const pts = s.points
  ok('RM-7', 'full pen → next wave: +waveGrowth sheep, score kept, gate unmoved, obstacles re-laid, no drive gate',
    s.run.wave === 1 && s.sheep.length === 10 && s.sheep.every((q) => !q.through) && s.gate === gate && gate.x === gx && gate.y === gy && s.driveGates.length === 0 && !s.obstacles.some((o) => o.kind === 'hurdle') && pts > 0 && !s.run.finished,
    `wave ${s.run.wave}, flock ${s.sheep.length}, points ${pts}, flock/clean lines ${s.score().lines.filter((l) => l.key === 'flock' || l.key === 'clean').map((l) => l.points).join('/')}`)
  s.run.clock = 0.05; steps(s, 0.2)
  const sc = s.score()
  ok('RM-8', 'run ends at clock zero; score shows waves cleared, no stars, no time bonus', s.run.finished && sc.wave === 1 && sc.stars === 0 && !sc.lines.some((l) => l.key === 'time') && sc.total === pts, `finished ${s.run.finished}, wave ${sc.wave}`)
  // determinism
  const run = () => { const q = mk(N, { seed: 77, mode: 'waves', specials: true }); const out = []; for (let w = 0; w < 3; w++) { steps(q, 1); out.push(q.sheep.map((x) => x.pos.x.toFixed(3) + ',' + x.pos.y.toFixed(3) + x.kind).join(';')); const n = q.sheep.length; for (let i = 0; i < n; i++) cross(q, i) } return out.join('|') }
  ok('RM-9', 'same seed lays the same flocks wave for wave', run() === run(), '3 waves compared')
  const capped = mk(N, { seed: 3, mode: 'waves', waveSheepStart: 38, waveGrowth: 5 }); for (let w = 0; w < 2; w++) { const n = capped.sheep.length; for (let i = 0; i < n; i++) cross(capped, i) }
  ok('RM-7b', 'flock size is capped at waveSheepMax', capped.sheep.length === 40, `${capped.sheep.length}`)
  const c = mk(N, { seed: 7, sheepCount: 6 })
  ok('RM-10', 'mode `course` is unaffected (herd size from the slider, par clock)', c.sheep.length === 6 && c.score().mode === 'course', '')
}

let fails = 0
for (const r of results) { if (!r.pass) fails++; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(7)} ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`) }
console.log(`\n${results.length - fails}/${results.length} passed`)
process.exit(fails ? 1 : 0)
