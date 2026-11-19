// Headless sim suite — scoring (SC), field objectives (FO), verdict (VH), wave mode (RM).
//   node test/sim.test.js            run every check (exit 1 on any failure)
//   node test/sim.test.js --update   re-record test/golden-replay.json (only after an INTENDED change to flock / dog physics)
// Loads web/sheep/lib/sheep-sim.js and web/sheep/lib/assault-sim.js in a bare `vm` context: no DOM, no browser.
// Two ways of penning a sheep, so no check depends on a scripted dog winning a course:
//   pen(sim, s, tier)  — POC-v15 checks: set the sheep's state, mark it through and call onPenned (fully controlled)
//   cross(sim, i)      — POC-v14 checks: teleport it just outside the gate mouth and step once (through the real gate path)
// Criteria: .claude/sheep/implemented/POC-v15/{scoring,field-objectives,verdict-and-hud}.md (SC 1–19, FO 1–8, VH 7/8/10)
//           .claude/sheep/implemented/POC-v14/{field-objectives,replay-modes}.md (the G-, K- and RM- checks carried forward)
//           .claude/sheep/implemented/POC-v16/competition-and-demo.md (CC competition course, EX obstacles-or-gates, DM demo handler)
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto')
const WEB = path.join(__dirname, '..', 'web', 'sheep')
const GOLDEN = path.join(__dirname, 'golden-replay.json')
const UPDATE = process.argv.includes('--update')
function load(dir, defaultsDir, withAssault) {
  const ctx = { console: { log() {}, warn() {}, error: (...a) => console.error('[ctx error]', ...a) } }
  vm.createContext(ctx)
  vm.runInContext(fs.readFileSync(path.join(defaultsDir, 'sheep-defaults.json.js'), 'utf8') + ';globalThis.SHEEP_DEFAULTS=SHEEP_DEFAULTS', ctx)
  vm.runInContext(fs.readFileSync(path.join(dir, 'sheep-sim.js'), 'utf8') + ';Object.assign(globalThis,{FlockSim,SETTINGS,buildParams,assertLevers,AWARDS,SIDE_OBJECTIVES,RANKS});globalThis.Sim=FlockSim', ctx)
  vm.runInContext(fs.readFileSync(path.join(dir, 'sheep-auto.js'), 'utf8') + ';Object.assign(globalThis,{AutoHandler})', ctx)
  if (withAssault) vm.runInContext(fs.readFileSync(path.join(dir, 'assault-sim.js'), 'utf8') + ';Object.assign(globalThis,{assault,assaultReset,assaultStep,explode,wolfAward,teamFlee,BLAST})', ctx)
  return ctx
}
const N = load(path.join(WEB, 'lib'), WEB, true), c = N
const DT = 1 / 60
const results = []
const ok = (id, name, pass, detail) => { results.push({ id, name, pass: !!pass, detail: detail === undefined ? '' : String(detail) }) }

// =====================================================================================
// POC-v15 — scoring.md (SC), field-objectives.md (FO), verdict-and-hud.md (VH)
// =====================================================================================
// A controlled course: no specials, no drive gates, no side objectives unless asked.
function mk(over) {
  const p = c.buildParams(c.SETTINGS)
  Object.assign(p, { seed: 42, randomSeedOnLoad: false, sheepCount: 30, specials: false, driveGateMax: 0, sideObjectiveCount: 0, mode: 'course', obstacleRandom: false, obstacleFreq: 0, bullMax: 0 }, over || {})
  const sim = new c.Sim(p)
  sim.step(DT)
  return sim
}
const set = (s, o) => Object.assign(s, { stress: 0, stressAvg: 0, trot: false, panic: false, idle: false }, o)
const TIER = { perfect: { stress: 0.01 }, calm: { stress: 0.1 }, rushed: { trot: true } }
function pen(sim, s, tier) { set(s, TIER[tier] || tier); s.through = true; const b = sim.points; sim.onPenned(s); return sim.points - b }
function wait(sim, secs) { for (let i = 0, n = Math.round(secs / DT); i < n; i++) sim.updateScore(DT) }
const free = (sim) => sim.sheep.filter((s) => !s.through && !s.down)
const quiet = (sim) => { for (const s of sim.sheep) set(s, {}) }

// ---------------- scoring.md 1: never decreases (incl. a bust, every jackpot)
{
  const sim = mk({ sheepCount: 40 })
  quiet(sim)
  let last = 0, mono = true, steps = 0
  const tick = (n) => { for (let i = 0; i < n; i++) { sim.updateScore(DT); steps++; if (sim.points < last) mono = false; last = sim.points } }
  for (let i = 0; i < 25; i++) { pen(sim, free(sim)[0], i % 7 === 3 ? 'calm' : 'perfect'); if (sim.points < last) mono = false; last = sim.points; tick(20) }
  tick(400) // chain lapses → perfect file
  for (let k = 0; k < 3; k++) { sim.strike('test', 0, 0); if (sim.points < last) mono = false; last = sim.points; tick(240) }
  ok('SC-1', 'total never decreases (jackpots + a bust)', mono && sim.run.bust && sim.run.finished, `${steps} steps, bust=${sim.run.bust}, total=${sim.points}, jackpots=${sim.run.jackpots}`)
}
// ---------------- 2: tiers
{
  const a = mk(), b = mk(), d = mk()
  quiet(a); quiet(b); quiet(d)
  const w = mk(); quiet(w)
  ok('SC-2', 'one sheep alone: 50 trotting / 200 at stress 0.1 / 500 at 0.01; walking at 0.2 is RUSHED (50)',
    pen(a, a.sheep[0], { trot: true }) === 50 && pen(b, b.sheep[0], { stress: 0.1 }) === 200 && pen(d, d.sheep[0], { stress: 0.01 }) === 500 && pen(w, w.sheep[0], { stress: 0.2 }) === 50,
    [a.points, b.points, d.points].join(' / '))
}
// ---------------- 3: condition
{
  const sim = mk(); quiet(sim)
  const s = sim.sheep[0]
  s.panic = true; s.wasPanic = true
  wait(sim, 3); s.panic = false
  const cond = s.cond, got = pen(sim, s, 'perfect')
  const sim2 = mk(); quiet(sim2); const t = sim2.sheep[0]; t.panic = true; t.wasPanic = true; wait(sim2, 20)
  ok('SC-3', '3 s of panic → ~70 % condition, PERFECT pays 500 × cond; floor holds', Math.abs(cond - 0.7) < 0.01 && got === Math.round(500 * cond) && Math.abs(t.cond - sim2.p.condFloor) < 1e-9,
    `cond ${cond.toFixed(3)}, paid ${got}, floor ${t.cond.toFixed(2)}`)
}
// ---------------- 4: flock value
{
  const sim = mk(); quiet(sim); wait(sim, 0.1)
  const v0 = sim.run.value, expect = sim.sheep.reduce((a, s) => a + 500 * s.cond, 0)
  for (const s of sim.sheep.slice(0, 10)) { s.panic = true; s.wasPanic = true }
  wait(sim, 2); const v1 = sim.run.value, dr = sim.run.draining
  for (const s of sim.sheep) set(s, { idle: true })
  wait(sim, 5); const v2 = sim.run.value
  ok('SC-4', 'flock value = sum; falls under panic; rises grazing', Math.abs(v0 - expect) < 1e-6 && v1 < v0 && dr && v2 > v1 && !sim.run.draining, `${v0} → ${v1.toFixed(0)} → ${v2.toFixed(0)}`)
}
// ---------------- 5: chain steps, no cap
{
  const sim = mk(); quiet(sim)
  const seq = ['perfect', 'perfect', 'calm', 'rushed', 'calm'], got = []
  for (const t of seq) { pen(sim, free(sim)[0], t); got.push(sim.run.combo); wait(sim, 0.2) }
  const b = mk({ sheepCount: 40, frenzyEvery: 0 }); quiet(b)
  for (let i = 0; i < 30; i++) { pen(b, free(b)[0], 'calm'); wait(b, 0.1) }
  ok('SC-5', 'P,P,C,R,C → ×1,×3,×4,×4,×5; 30 calm crossings reach ×30', got.join(',') === '1,3,4,4,5' && b.run.combo === 30, got.join(',') + ' · ×' + b.run.combo)
}
// ---------------- 6: window tightening
{
  const sim = mk(); quiet(sim)
  pen(sim, free(sim)[0], 'calm'); const w1 = sim.comboWindowNow()
  pen(sim, free(sim)[0], 'calm'); wait(sim, 1); const keeps = sim.run.comboLive
  const b = mk({ sheepCount: 40, frenzyEvery: 0 }); quiet(b)
  for (let i = 0; i < 35; i++) { pen(b, free(b)[0], 'calm'); wait(b, 0.05) }
  const w35 = b.comboWindowNow(); wait(b, 1)
  ok('SC-6', 'window 1.5 s at ×1, 0.4 s at ×30+; a 1 s gap keeps ×2, breaks ×35', Math.abs(w1 - 1.5) < 1e-9 && Math.abs(w35 - 0.4) < 1e-9 && keeps && !b.run.comboLive, `w1 ${w1}, w35 ${w35}, ×2 alive ${keeps}, ×35 alive ${b.run.comboLive}`)
}
// ---------------- 7: strike sources
{
  const sim = mk(); quiet(sim)
  pen(sim, free(sim)[0], 'calm'); pen(sim, free(sim)[0], 'calm'); pen(sim, free(sim)[0], 'calm')
  const f = free(sim)
  for (let i = 0; i < 4; i++) f[i].panic = true
  wait(sim, 0.1); const after4 = sim.run.strikes
  f[4].panic = true; wait(sim, 0.1)
  const afterPanics = sim.run.strikes, comboAfter = sim.run.comboLive ? sim.run.combo : 1
  const ev = sim.scoreEvents.filter((e) => e.kind === 'strike').length
  quiet(sim); wait(sim, 4)
  { const v = free(sim)[0]; v.pos = { x: sim.gate.x, y: sim.gate.y } }
  sim.injureAtGate(); const afterInjury = sim.run.strikes
  // fence slam: a sheep carried into the fence at speed vs walking into it
  const b = mk(); quiet(b)
  const r = b.playRect(), w = b.sheep[0], q = b.sheep[1]
  w.pos = { x: r.x0 + 0.2, y: (r.y0 + r.y1) / 2 + 200 }; w.vel = { x: -40, y: 0 }
  const iw = b.sheep.indexOf(w); b.integrate(iw, DT); const walk = b.run.strikes
  q.pos = { x: r.x0 + 0.5, y: (r.y0 + r.y1) / 2 - 200 }; q.vel = { x: -160, y: 0 }; q.panic = true
  // integrate recomputes the velocity (damping, caps): drive the clamp path directly with a known speed
  const before = b.run.strikes
  { const s2 = q; s2.pos.x = r.x0 - 1; let into = Math.max(0, 160); if (into > b.p.fenceSlamSpeed) b.fenceSlam(s2) }
  ok('SC-7', '5 panics = 1 strike; downed sheep = 1 strike; fence slam = 1 strike, a walk-in = none; chain reset; one event each',
    after4 === 0 && afterPanics === 1 && comboAfter === 1 && ev === 1 && afterInjury === 2 && walk === 0 && b.run.strikes === before + 1,
    `panics ${after4}→${afterPanics}, combo ×${comboAfter}, events ${ev}, injury → ${afterInjury}, walk-in ${walk}, slam ${b.run.strikes}`)
}
// fence slam through the real integrate path (the clamp reads velocity before zeroing it)
{
  const b = mk({ fenceSlamSpeed: 20 }); quiet(b)
  const r = b.playRect(), q = b.sheep[0], i = 0
  let slammed = false
  for (let n = 0; n < 5 && !slammed; n++) {
    q.pos = { x: r.x0 + 0.3, y: (r.y0 + r.y1) / 2 + 150 }; q.vel = { x: -88, y: 0 }; q.idle = false
    b.integrate(i, DT); slammed = b.run.slams > 0
  }
  ok('SC-7b', 'fence slam detected inside integrate()', slammed, `slams ${b.run.slams}, strikes ${b.run.strikes}`)
}
// ---------------- 8: bust
{
  const sim = mk(); quiet(sim)
  for (let i = 0; i < 6; i++) pen(sim, free(sim)[0], 'rushed')
  wait(sim, 4)
  sim.strike('a', 0, 0); wait(sim, 4); sim.strike('b', 0, 0); wait(sim, 4)
  const before = sim.points, evs = sim.scoreEvents.length
  sim.strike('c', 0, 0)
  const sc = sim.score(), keys = sc.endMults.map((m) => m.key).join(',')
  ok('SC-8', 'third strike busts; the strike itself takes nothing; no clean / award multiplier', sim.run.bust && sim.run.finished && !sim.run.won && sim.points >= before && !/clean|award/.test(keys), `bust ${sim.run.bust}, ${before} → ${sim.points}, mults [${keys}]`)
  // 12b: bust with 6 of 30 penned → ×1.1
  ok('SC-12b', 'bust with 6/30 penned (rushed) → end multiplier 1.1', Math.abs(sc.endMult - 1.1) < 1e-9, sc.endMult)
}
// helper: win a course by penning everyone
function winAll(sim, tier, gap) { let i = 0; for (const s of free(sim)) { pen(sim, s, typeof tier === 'function' ? tier(i++) : tier); if (gap) wait(sim, gap) } sim.updateScore(DT) }
// ---------------- 9 + 10: time bonus after the multipliers; ×4.5
{
  const off = { frenzyEvery: 0, perfectFileMin: 9999, finisherPoints: 0, multOneGo: 1, multAwardCommon: 1, multAwardRare: 1, multAwardLegendary: 1 }
  const sim = mk(off); quiet(sim)
  sim.run.t = sim.par() - 20.5
  winAll(sim, 'calm')
  const sc = sim.score(), time = sim.tally.time || 0
  const over = mk(off); quiet(over); over.run.t = over.par() + 5; winAll(over, 'calm')
  ok('SC-9', '20 s under par → +200 added after the multipliers; over par → none', time === 200 && !(over.tally.time > 0) && sim.points === Math.round(sc.playPoints * sc.endMult) + 200, `time ${time}, over ${over.tally.time || 0}`)
  ok('SC-10', 'won, strike-free, all-calm, no awards → ×4.5; total = play × 4.5 + time', Math.abs(sc.endMult - 4.5) < 1e-9 && sim.points === Math.round(sc.playPoints * 4.5) + time, `×${sc.endMult}, play ${sc.playPoints}, total ${sim.points}`)
  const sum = sc.lines.reduce((a, l) => a + l.points, 0)
  ok('SC-10b', 'card lines sum to the total', sum === sc.total, `${sum} = ${sc.total}`)
}
// ---------------- 11: awards on / off with rarity
{
  const P0 = c.buildParams(c.SETTINGS)
  const mult = { common: P0.multAwardCommon, rare: P0.multAwardRare, legendary: P0.multAwardLegendary }
  const run = (prep, tier, gap) => { const sim = mk({ driveGateMax: 0 }); quiet(sim); sim.run.t = 5; prep && prep(sim); winAll(sim, tier || 'calm', gap); return sim }
  const has = (sim, n) => sim.run.awards.includes(n)
  const cases = {
    'Quiet Hand': [(s) => { s.run.commands = 3 }, (s) => { s.run.commands = 99 }],
    'Straight as a Die': [(s) => { s.run.onLine = s.run.t }, (s) => { s.run.onLine = 0 }],
    'Photo Finish': [(s) => { s.run.t = s.par() - 1 }, (s) => { s.run.t = 5 }],
    'Gatekeeper': [(s) => { s.driveGates = [{ done: true, passed: new Set(), sides: new Map() }] }, (s) => { s.driveGates = [{ done: false, passed: new Set(), sides: new Map(), x: -999, y: -999, nx: 1, ny: 0, tx: 0, ty: 1, half: 1 }] }],
    'Not a Hair Out of Place': [null, (s) => { s.run.strikes = 1 }],
    'Never Sat': [null, (s) => { s.run.lieDowns = 1 }],
    'Steady Away': [null, (s) => { s.run.fullFlanks = 2 }],
    'Full Purse': [null, (s) => { s.run.condMin = 0.5 }],
    'Nobody Ran': [null, (s) => { s.run.trotEver = true }],
    'Not a Word Wasted': [(s) => { s.run.commands = 2 }, (s) => { s.run.commands = 15 }],
  }
  const bad = []
  for (const [name, [on, off]] of Object.entries(cases)) {
    const a = run(on), b = run(off)
    const rar = c.AWARDS.find((x) => x.name === name).rarity
    const entry = a.run.awardList.find((x) => x.name === name)
    if (!has(a, name) || has(b, name) || !entry || entry.mult !== mult[rar]) bad.push(name)
  }
  const ss = run(null, 'perfect'), ns = run(null, 'calm')
  if (!has(ss, 'Sunday Stroll') || has(ns, 'Sunday Stroll')) bad.push('Sunday Stroll')
  const rushedRun = run(null, (i) => (i === 3 ? 'rushed' : 'calm'))
  if (has(rushedRun, 'Not a Hair Out of Place')) bad.push('NaHOoP(rushed)')
  ok('SC-11', 'each of the 11 awards on and off, multiplier by rarity', bad.length === 0 && c.AWARDS.length === 11, bad.length ? 'failed: ' + bad.join(', ') : '11 / 11')
}
// ---------------- 12: partial credit
{
  const sim = mk(); quiet(sim)
  for (let i = 0; i < 15; i++) pen(sim, free(sim)[0], 'calm')
  sim.finishRun()
  ok('SC-12', 'ended early, 15/30 penned none RUSHED → (1 + 0.5×0.5) × 2 = 2.5', Math.abs(sim.run.endMult - 2.5) < 1e-9 && !sim.run.won, sim.run.endMult)
}
// ---------------- 13: perfect file
{
  const a = mk({ frenzyEvery: 0 }); quiet(a)
  let chainPts = 0
  for (let i = 0; i < 20; i++) { chainPts += pen(a, free(a)[0], 'calm'); wait(a, 0.1) }
  const before = a.points; wait(a, 3)
  const b = mk({ frenzyEvery: 0 }); quiet(b)
  for (let i = 0; i < 20; i++) { pen(b, free(b)[0], i === 4 ? 'rushed' : 'calm'); wait(b, 0.1) }
  const bb = b.points; wait(b, 3)
  ok('SC-13', '20 non-RUSHED crossings pay the chain again at its end; one RUSHED in it → nothing', a.points - before === chainPts && b.points === bb, `chain ${chainPts}, paid again ${a.points - before}; with a rushed sheep +${b.points - bb}`)
}
// ---------------- 14: one go
{
  const a = mk({ sheepCount: 12 }); quiet(a); winAll(a, 'calm', 0.1)
  const b = mk({ sheepCount: 12 }); quiet(b)
  let i = 0; for (const s of free(b)) { pen(b, s, 'calm'); wait(b, i++ === 5 ? 4 : 0.1) } b.updateScore(DT)
  const k = (s) => s.run.endMults.some((m) => m.key === 'onego' && m.mult === 1.5)
  ok('SC-14', 'whole flock in one chain → ×1.5; one lapse removes it', k(a) && !k(b) && a.run.won && b.run.won, `one chain ${k(a)}, with a lapse ${k(b)}`)
}
// ---------------- 15: frenzy
{
  const sim = mk({ sheepCount: 60 }); quiet(sim)
  const paid = []
  for (let i = 0; i < 27; i++) { paid.push(pen(sim, free(sim)[0], 'calm')); wait(sim, 0.05) }
  // crossing 25 (×25) opens it; crossing 26 pays double: 200 × 26 × 2
  const opened = sim.run.frenzyT > 0, c10 = paid[24], c11 = paid[25]
  const t0 = sim.run.frenzyT; pen(sim, free(sim)[0], 'calm'); const ext = sim.run.frenzyT - t0
  for (let i = 0; i < 30; i++) pen(sim, free(sim)[0], 'calm')
  const capped = sim.run.frenzyT <= sim.p.frenzyMax + 1e-9
  sim.strike('x', 0, 0)
  ok('SC-15', '×25 opens a frenzy; inside it crossings pay double and extend it; capped; a strike ends it',
    opened && c10 === 5000 && c11 === 10400 && Math.abs(ext - 0.5) < 1e-9 && capped && sim.run.frenzyT === 0, `×25 paid ${c10}, ×26 paid ${c11}, extend ${ext.toFixed(2)}, capped ${capped}, after strike ${sim.run.frenzyT}`)
}
// ---------------- 16: last sheep
{
  const f = (tier) => { const sim = mk({ sheepCount: 5, frenzyEvery: 0 }); quiet(sim); const all = free(sim); for (let i = 0; i < 4; i++) pen(sim, all[i], 'calm'); pen(sim, all[4], tier); return [sim.tally.finisher || 0, sim.run.combo + sim.run.gateMult] }
  const [fp, mp] = f('perfect'), [fc, mc] = f('calm'), [fr] = f('rushed')
  ok('SC-16', 'the crossing that fills the pen: 500 × mult if PERFECT, half if CALM, none if RUSHED', fp === 500 * mp && fc === 250 * mc && fr === 0, `perfect ${fp} (×${mp}), calm ${fc} (×${mc}), rushed ${fr}`)
}
// ---------------- 17: removed keys
{
  const dead = ['comboMax', 'fullFlockBonus', 'cleanRunBonus', 'awardPoints', 'starCalmShare', 'driveGateBonus']
  const files = ['lib/sheep-sim.js', 'lib/assault-sim.js', 'lib/sheep-gui.js', 'lib/sheep-score-ui.js', 'sheep-defaults.json.js', '2d.html', '3d.html', '3d-assault.html']
  const hits = []
  for (const f of files) { const t = fs.readFileSync(path.join(WEB, f), 'utf8'); for (const k of dead) if (t.includes(k)) hits.push(f + ':' + k) }
  ok('SC-17', 'removed keys appear nowhere under web/sheep/sheep/', hits.length === 0, hits.join(' ') || 'none found')
}
// ---------------- FO-2: gate multiplier
{
  const sim = mk({ sheepCount: 6 }); quiet(sim)
  const dg = { x: 300, y: 300, nx: 1, ny: 0, tx: 0, ty: 1, half: 45, done: false, passed: new Set(), sides: new Map() }
  const dg2 = Object.assign({}, dg, { x: 500, passed: new Set(), sides: new Map() })
  sim.driveGates = [dg, dg2]
  const through = (g) => { for (const s of free(sim)) { s.pos = { x: g.x - 5, y: g.y } } sim.updateDriveGates(); for (const s of free(sim)) { s.pos = { x: g.x + 5, y: g.y } } sim.updateDriveGates() }
  const m0 = sim.score().mult; through(dg); const m1 = sim.score().mult
  const p1 = pen(sim, free(sim)[0], 'calm'); wait(sim, 4)
  through(dg2); const m2 = sim.score().mult
  const p2 = pen(sim, free(sim)[0], 'calm')
  ok('FO-2', 'one cleared gate → next crossing ×2 (not ×1); a second → ×3; per-sheep gate points still paid', m0 === 1 && m1 === 2 && m2 === 3 && p1 === 400 && p2 === 600 && sim.tally.gate === 50 * (6 + 5), `mult ${m0}→${m1}→${m2}, crossings ${p1}, ${p2}, gate points ${sim.tally.gate}`)
}
// ---------------- FO-4: black sheep
{
  const sim = mk({ sheepCount: 20 })
  for (const s of sim.sheep) s.pos = { x: 900, y: 600 }
  const b = sim.sheep[0], near = sim.sheep[1], far = sim.sheep[2]
  b.kind = 'black'; b.pos = { x: 400, y: 300 }; near.pos = { x: 430, y: 300 }; far.pos = { x: 400, y: 450 }
  sim.dog.pos = { x: 100, y: 100 } // out of everyone's reach
  sim.blackPanic = { x: b.pos.x, y: b.pos.y }
  sim.flee(1, DT); sim.flee(2, DT)
  const sn = near.stress, sf = far.stress
  const a = mk(), d = mk(); quiet(a); quiet(d); a.sheep[0].kind = 'black'
  const pb = pen(a, a.sheep[0], 'calm'), pe = pen(d, d.sheep[0], 'calm')
  // she startles sooner: same dog distance, more threat
  const e = mk({ sheepCount: 20 }); for (const s of e.sheep) s.pos = { x: 900, y: 600 }
  e.sheep[0].pos = { x: 400, y: 300 }; e.sheep[1].pos = { x: 400, y: 300 }; e.sheep[0].kind = 'black'; e.dog.pos = { x: 340, y: 300 }; e.dog.facing = 0; e.dog.command = 'walk_on'; e.dog.intensity = 1
  e.flee(0, DT); e.flee(1, DT)
  ok('FO-4', 'a panicking black sheep raises stress inside her radius only; she feels more of the dog; pays ×2', sn > 0.2 && sf === 0 && pb === 2 * pe && e.sheep[0].stress > e.sheep[1].stress * 1.4, `near ${sn.toFixed(2)}, far ${sf}, pays ${pb} vs ${pe}, threat ${e.sheep[0].stress.toFixed(2)} vs ${e.sheep[1].stress.toFixed(2)}`)
}
// ---------------- FO-5: bellwether
{
  const drift = (kind) => {
    const sim = mk({ sheepCount: 7 })
    for (const s of sim.sheep) { s.pos = { x: 1000, y: 650 }; s.through = true; s.committed = false }
    const lead = sim.sheep[0], f = sim.sheep.slice(1, 7)
    for (const s of [lead, ...f]) s.through = false
    lead.pos = { x: 380, y: 360 }; lead.kind = kind; sim.bellIdx = kind === 'bell' ? 0 : -1
    f.forEach((s, i) => { s.pos = { x: 440 + (i % 3) * 14, y: 340 + Math.floor(i / 3) * 20 }; s.idle = false; s.vel = { x: 0, y: 0 } })
    sim.dog.pos = { x: 60, y: 60 }
    const x0 = f.reduce((a, s) => a + s.pos.x, 0) / f.length
    for (let i = 0; i < 180; i++) {
      lead.pos.x -= 40 * DT; lead.vel = { x: -40, y: 0 }
      for (const s of f) { s.idle = false; s.calmT = 0 }
      for (const s of f) sim.integrate(sim.sheep.indexOf(s), DT)
    }
    return x0 - f.reduce((a, s) => a + s.pos.x, 0) / f.length // how far they went HER way (−x)
  }
  const withBell = drift('bell'), plain = drift('ewe')
  const a = mk(), b = mk(); quiet(a); quiet(b); a.sheep[0].kind = 'bell'; b.sheep[3].kind = 'bell'
  const first = pen(a, a.sheep[0], 'calm'); pen(b, b.sheep[0], 'calm'); wait(b, 4); const later = pen(b, b.sheep[3], 'calm')
  ok('FO-5', 'sheep near a moving bellwether follow her more than an ordinary ewe; ×3 first through, ×1 otherwise', withBell > plain + 5 && first === 600 && later === 200, `followed ${withBell.toFixed(1)} px vs ${plain.toFixed(1)} px in 3 s; pays ${first} first, ${later} later`)
}
// ---------------- FO-6: yearling
{
  const sim = mk({ sheepCount: 20 }); for (const s of sim.sheep) s.pos = { x: 900, y: 600 }
  const y = sim.sheep[0], e = sim.sheep[1]
  y.kind = 'yearling'; y.pos = { x: 400, y: 300 }; e.pos = { x: 400, y: 300 }
  sim.dog.pos = { x: 250, y: 300 }; sim.dog.facing = 0; sim.dog.command = 'that_ll_do'; sim.dog.intensity = 1 // 150 px: outside R_flee 120, inside 192
  sim.flee(0, DT); sim.flee(1, DT)
  const a = mk(), b = mk(); quiet(a); quiet(b); a.sheep[0].kind = 'yearling'; b.sheep[0].kind = 'yearling'
  const pc = pen(a, a.sheep[0], 'calm'), pr = pen(b, b.sheep[0], 'rushed')
  ok('FO-6', 'the yearling feels the dog from further than an ordinary sheep; ×3 CALM, ×1 RUSHED', y.stress > 0 && e.stress === 0 && pc === 600 && pr === 50, `at 150 px: yearling ${y.stress.toFixed(3)}, ewe ${e.stress}; pays ${pc} calm, ${pr} rushed`)
}
// ---------------- FO-7: side objectives eligibility + count
{
  let bad = 0, counts = {}, seen = new Set()
  for (let seed = 1; seed <= 300; seed++) {
    const p = c.buildParams(c.SETTINGS); Object.assign(p, { seed, randomSeedOnLoad: false, sheepCount: 30 })
    const sim = new c.Sim(p)
    const has = (k) => sim.sheep.some((s) => s.kind === k)
    const ids = sim.sideObjectives.map((o) => o.id)
    ids.forEach((i) => seen.add(i))
    if (ids.length !== 2 || new Set(ids).size !== 2) bad++
    if (ids.includes('last_golden') && !has('golden')) bad++
    if (ids.includes('lead_bell') && !has('bell')) bad++
    if (ids.includes('gates') && !sim.driveGates.length) bad++
  }
  const w = mk({ mode: 'waves', sideObjectiveCount: 2 })
  ok('FO-7', '300 seeds: exactly 2 objectives, never an impossible one, all 8 kinds occur; none in wave mode', bad === 0 && seen.size === 8 && w.sideObjectives.length === 0, `violations ${bad}, kinds seen ${seen.size}/8, wave mode ${w.sideObjectives.length}`)
}
// ---------------- FO-8: each side objective met / lost, ×1.5 only when met
{
  const withObj = (id) => { const sim = mk({ sheepCount: 8 }); quiet(sim); const o = c.SIDE_OBJECTIVES.find((x) => x.id === id); sim.sideObjectives = [{ id, label: o.label, hint: o.hint, state: 'open' }]; return sim }
  const st = (sim) => sim.sideObjectives[0].state
  const mult = (sim) => sim.run.endMults.some((m) => m.key === 'objective' && m.mult === 1.25)
  const bad = []
  const check = (id, metRun, lostRun) => { const a = withObj(id); metRun(a); const b = withObj(id); lostRun(b); if (st(a) !== 'met' || !mult(a) || st(b) !== 'lost' || mult(b)) bad.push(`${id}(${st(a)}/${st(b)})`) }
  check('no_rush', (s) => winAll(s, 'calm', 3), (s) => winAll(s, (i) => (i === 2 ? 'rushed' : 'calm'), 3))
  check('spotless', (s) => winAll(s, 'calm', 3), (s) => { s.strike('x', 0, 0); winAll(s, 'calm', 3) })
  check('on_feet', (s) => winAll(s, 'calm', 3), (s) => { s.setCommand('lie_down'); winAll(s, 'calm', 3) })
  check('few_words', (s) => winAll(s, 'calm', 3), (s) => { for (let i = 0; i < 12; i++) s.setCommand(i % 2 ? 'come_by' : 'away'); winAll(s, 'calm', 3) })
  check('long_file', (s) => winAll(s, 'calm', 0.1), (s) => winAll(s, 'calm', 4))
  check('gates', (s) => { s.driveGates = [{ done: true }]; s.setObjective('gates', 'met'); winAll(s, 'calm', 3) }, (s) => { s.driveGates = [{ done: false, x: -999, y: -999, nx: 1, ny: 0, tx: 0, ty: 1, half: 1, passed: new Set(), sides: new Map() }]; winAll(s, 'calm', 3) })
  check('last_golden', (s) => { const f = free(s); f[7].kind = 'golden'; winAll(s, 'calm', 3) }, (s) => { const f = free(s); f[2].kind = 'golden'; winAll(s, 'calm', 3) })
  check('lead_bell', (s) => { const f = free(s); f[0].kind = 'bell'; winAll(s, 'calm', 3) }, (s) => { const f = free(s); f[3].kind = 'bell'; winAll(s, 'calm', 3) })
  // flips at the right moment: no_rush is lost on the rushed crossing itself, with one event
  const m = withObj('no_rush'); pen(m, free(m)[0], 'calm'); const s1 = st(m); pen(m, free(m)[0], 'rushed'); const s2 = st(m), evs = m.scoreEvents.filter((e) => e.kind === 'objective').length
  ok('FO-8', 'each of the 8 side objectives can be met and lost; ×1.25 only when met; flips when it happens', bad.length === 0 && s1 === 'open' && s2 === 'lost' && evs === 1, bad.length ? 'failed: ' + bad.join(' ') : `8 / 8; no_rush ${s1} → ${s2} with ${evs} event`)
}
// ---------------- VH-7: reference = a scripted reference run (jackpots off)
{
  const off = { frenzyEvery: 0, perfectFileMin: 9999, finisherPoints: 0, multOneGo: 1, multAwardCommon: 1, multAwardRare: 1, multAwardLegendary: 1, parPointsPerSec: 0 }
  const sim = mk(off); quiet(sim); const ref = sim.run.reference
  winAll(sim, 'calm', 0.05)
  ok('VH-7', 'reference score = total of a scripted reference run (every sheep CALM, full condition, one chain; jackpots off)', sim.points === ref && sim.run.won, `reference ${ref}, scripted run ${sim.points}`)
}
// ---------------- VH-8: ranks
{
  const at = (f, bust) => { const sim = mk(); sim.points = Math.round(sim.run.reference * f); sim.run.bust = !!bust; return sim.rank() }
  const names = [0.005, 0.10, 0.70, 1.0, 6.0].map((f) => at(f).name)
  const b = at(0.70, true), nx = at(0.10)
  ok('VH-8', '0.5 % / 10 % / 70 % / 100 % / 600 % → ranks (One Dude and His Dog from 1,000 %); a bust at 70 % → Farmhand; next rank and points given',
    names.join('|') === 'Lost Tourist|Drover|Head Shepherd|Trial Champion|Trial Champion' && at(12).name === 'One Dude and His Dog' && b.name === 'Farmhand' && nx.next.name === 'Shepherd' && nx.next.points > 0, names.join(' · ') + ` · bust → ${b.name} · next ${nx.next.name} in ${nx.next.points}`)
}
// ---------------- VH-10: category grades move the right way
{
  const base = () => { const s = mk(); quiet(s); s.run.t = 60; s.run.onLine = 50; s.run.commands = 10; return s }
  const a = base(); winAll(a, 'calm', 0.1); const A = a.categories()
  const b = base(); winAll(b, (i) => (i % 2 ? 'rushed' : 'calm'), 0.1); const B = b.categories()
  const d = base(); winAll(d, 'calm', 4); const D = d.categories()
  const e = base(); e.run.commands = 80; winAll(e, 'calm', 0.1); const E = e.categories()
  const f = base(); f.strike('x', 0, 0); winAll(f, 'calm', 0.1); const F = f.categories()
  ok('VH-10', 'more RUSHED lowers Calm; shorter chains lower Flow; more commands lower Control; a strike lowers Safety',
    B.calm.value < A.calm.value && D.flow.value < A.flow.value && E.control.value < A.control.value && F.safety.value < A.safety.value,
    `calm ${A.calm.grade}→${B.calm.grade}, flow ${A.flow.grade}→${D.flow.grade}, control ${A.control.grade}→${E.control.grade}, safety ${A.safety.grade}→${F.safety.grade}`)
}
// ---------------- waves: strikes carry, multipliers per wave, total monotonic
{
  const sim = mk({ mode: 'waves', specials: false }); quiet(sim)
  const n0 = sim.sheep.length
  for (const s of free(sim)) pen(sim, s, 'calm')
  const before = sim.points; sim.updateScore(DT)
  const paid = sim.points - before
  sim.strike('x', 0, 0)
  ok('WAVE', 'a filled wave pays its multipliers on its own points, the next flock is larger, strikes carry', paid > 0 && sim.run.wave === 1 && sim.sheep.length > n0 && sim.run.strikes === 1 && sim.rank() === null, `wave bonus +${paid}, flock ${n0} → ${sim.sheep.length}, strikes ${sim.run.strikes}`)
}

// =====================================================================================
// Carried forward from POC-v14 — through the real gate path (cross), with POC-v15 values
// =====================================================================================
function mkc(ctx, over = {}) {
  const p = ctx.buildParams(ctx.SETTINGS)
  Object.assign(p, { obstacleRandom: false, obstacleFreq: 0, driveGateMax: 0, specials: false, sideObjectiveCount: 0, bullMax: 0 }, over) // bullMax 0: the POC-v17 bulls are asked for by the checks that want them
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
const lastPen = (sim) => sim.scoreEvents.filter((e) => e.kind === 'pen').pop()
{ // the real gate path pays the same tiers
  const a = mkc(N, { seed: 5, sheepCount: 10, penCalmStress: 0 }), b = mkc(N, { seed: 5, sheepCount: 10 })
  const r1 = cross(a, 0), r2 = cross(b, 0)
  ok('SC-2b', 'through the real gate: a worked-up sheep pays 50 (RUSHED), an untroubled one 500 (PERFECT)', r1.through && r1.gained === 50 && r2.gained === 500, `${r1.gained} / ${r2.gained}`)
  const s = mkc(N, { seed: 7, sheepCount: 6 })
  const p0 = s.score().parLeft; steps(s, 2); const p1 = s.score().parLeft
  s.run.t = s.par() + 4
  ok('SC-par', 'parLeft counts down and goes negative past par', Math.abs(p0 - p1 - 2) < 0.05 && s.score().parLeft < 0 && Math.abs(p0 - 63) < 0.01, `${p0.toFixed(2)} → ${p1.toFixed(2)} → ${s.score().parLeft.toFixed(1)}`)
  const q = mkc(N, { seed: 7, sheepCount: 6 })
  q.setCommand('that_ll_do'); q.setCommand('away'); q.setCommand('away'); q.setCommand('walk_on'); q.setCommand('easy'); q.setCommand('walk_on')
  ok('SC-cmd', 'command count: repeats are free, an impulse counts; a full flank and a lie-down are noted', q.run.commands === 4 && q.run.fullFlanks === 1 && q.run.lieDowns === 0, `commands ${q.run.commands}, full flanks ${q.run.fullFlanks}`)
}
{ // assault: wolves score; a mortar kill is a strike (owner Q96) and takes no points; survivors still win
  const s = mkc(N, { seed: 7, sheepCount: 6 })
  N.assaultReset(s)
  const b0 = s.points
  N.wolfAward(s, 10, 10)
  const b1 = s.points
  const v = s.sheep[0]
  N.explode(s, v.pos.x, v.pos.y)
  const b2 = s.points, strikes = s.run.strikes
  for (let i = 1; i < 6; i++) { if (!s.sheep[i].down) cross(s, i) }
  const sc = s.score()
  ok('SC-11a', 'assault: a routed wolf adds wolfPoints; a shell that kills is ONE strike and takes no points; survivors still win', b1 - b0 === 300 && b2 === b1 && v.down && v.cond === 0 && strikes === 1 && sc.won && sc.lines.some((l) => l.key === 'wolf') && !sc.endMults.some((m) => m.key === 'clean'), `wolf +${b1 - b0}, kill ${b2 - b1} pts, strikes ${strikes}, won ${sc.won}`)
}
{ // SC-19 + old keys
  const hit = []
  for (const f of ['lib/sheep-sim.js', 'lib/assault-sim.js', 'lib/sheep-gui.js', 'lib/sheep-score-ui.js', 'sheep-defaults.json.js', '2d.html', '3d.html', '3d-assault.html', 'index.html']) {
    const txt = fs.readFileSync(path.join(WEB, f), 'utf8')
    for (const k of ['w_time', 'w_line', 'w_cohesion', 'w_calm', 'injuryWeight']) if (txt.includes(k)) hit.push(f + ':' + k)
  }
  ok('SC-old', 'the pre-v14 penalty keys appear nowhere under web/sheep/sheep/', hit.length === 0, hit.join(' ') || 'none')
  const stars = []
  for (const f of ['lib/sheep-sim.js', 'lib/assault-sim.js', 'lib/sheep-gui.js', 'lib/sheep-score-ui.js', '2d.html', '3d.html', '3d-assault.html']) { const txt = fs.readFileSync(path.join(WEB, f), 'utf8'); if (/[★☆]|\.stars\b|\bstars:/.test(txt)) stars.push(f) }
  ok('VH-11', 'no score star (glyph or `stars` field) anywhere under web/sheep/sheep/', stars.length === 0, stars.join(' ') || 'none')
  ok('SC-19', 'both sim libs load in plain node; lever assertions pass', N.assertLevers().length === 0, 'assertLevers → 0 errors')
}
{ // FO-3: the new kinds at about their chance, never two of a kind, and the v14 specials on the same sheep as with the new kinds off
  let nb = 0, nl = 0, ny = 0, dup = 0, moved = 0
  for (let seed = 1; seed <= 400; seed++) {
    const o = mkc(N, { seed, sheepCount: 30, specials: true, blackChance: 0, bellChance: 0, yearlingChance: 0 }), n = mkc(N, { seed, sheepCount: 30, specials: true })
    const cnt = (k) => n.sheep.filter((s) => s.kind === k).length
    if (cnt('black')) nb++; if (cnt('bell')) nl++; if (cnt('yearling')) ny++
    for (const k of ['black', 'bell', 'yearling', 'golden', 'ram', 'lamb']) if (cnt(k) > 1) dup++
    for (let i = 0; i < o.sheep.length; i++) if (o.sheep[i].kind !== 'ewe' && n.sheep[i].kind !== o.sheep[i].kind) moved++
  }
  ok('FO-3', '400 seeds: each new kind at about its chance (0.3), never two of a kind, golden ewe / ram / lamb on the same sheep as before', dup === 0 && moved === 0 && [nb, nl, ny].every((x) => x > 90 && x < 150), `black ${(nb / 4).toFixed(0)} %, bellwether ${(nl / 4).toFixed(0)} %, yearling ${(ny / 4).toFixed(0)} %, duplicates ${dup}, moved ${moved}`)
}
{ // SC-18 / FO-1 replay: with drive gates, specials and side objectives off, the flock and dog physics must replay the recorded run exactly.
  // The golden file was recorded when POC-v14 shipped — POC-v15 scoring (condition, strikes, a bust) must not move a single sheep.
  const digest = {}
  for (const seed of [3, 1337, 90210]) {
    const a = mkc(N, { seed, sheepCount: 40, obstacleFreq: 3 })
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
  ok('SC-18', 'scoring does not touch behavior: 3 seeds × 40 s replay the run recorded at POC-v14 exactly', same, gold ? (same ? 'matches golden-replay.json' : `differs from golden (recorded on node ${gold.node}, running ${process.version})`) : 'golden-replay.json missing — run with --update')
  // and with them ON the course layout (gate, obstacles, flock start) is unchanged
  let layout = true
  for (const seed of [3, 1337, 90210, 42]) {
    const a = mkc(N, { seed, sheepCount: 40, obstacleFreq: 3, driveGateMax: 2, driveGateChance: 1, specials: true, lambChance: 0, sideObjectiveCount: 2 }), b = mkc(N, { seed, sheepCount: 40, obstacleFreq: 3 })
    if (a.gate.x !== b.gate.x || a.gate.y !== b.gate.y) layout = false
    for (let i = 0; i < 40; i++) if (a.sheep[i].pos.x !== b.sheep[i].pos.x || a.sheep[i].pos.y !== b.sheep[i].pos.y) layout = false
    const real = a.obstacles.filter((o) => o.kind !== 'hurdle')
    if (real.length !== b.obstacles.length || real.some((o, i) => o.x !== b.obstacles[i].x)) layout = false
  }
  ok('FO-1', 'with gates + specials + side objectives ON a seed still lays the same gate, obstacles and flock', layout, '')
}
{ // G-1 placement over 200 seeds
  let bad = 0, gates = 0, seedsWith = 0
  for (let seed = 1; seed <= 200; seed++) {
    const s = mkc(N, { seed, obstacleRandom: true, driveGateMax: 2, specials: true })
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
  ok('G-1', '200 seeds: no drive gate on the fence, an obstacle, the pen approach or a sheep', bad === 0 && gates > 0, `${gates} gates on ${seedsWith}/200 seeds, ${bad} violations`)
}
function gateSim(over) {
  for (let seed = 1; seed < 400; seed++) {
    const s = mkc(N, { seed, sheepCount: 4, driveGateMax: 1, driveGateChance: 1, ...over })
    if (s.driveGates.length) return s
  }
}
const putAt = (s, i, dg, side) => { s.sheep[i].pos = { x: dg.x + dg.nx * side, y: dg.y + dg.ny * side }; s.sheep[i].vel = { x: 0, y: 0 } }
{ // G-2 / G-3
  const s = gateSim({}), dg = s.driveGates[0]
  for (let i = 0; i < 4; i++) putAt(s, i, dg, -14 - i * 3)
  s.step(DT)
  const p0 = s.points
  putAt(s, 0, dg, 14); s.step(DT); const g1 = s.points - p0
  putAt(s, 0, dg, -14); s.step(DT); putAt(s, 0, dg, 14); s.step(DT); const g2 = s.points - p0
  ok('G-2', 'a sheep through the gap scores driveGatePoints (50) once; again scores nothing', g1 === 50 && g2 === 50, `${g1} then ${g2}`)
  for (let i = 1; i < 4; i++) { putAt(s, i, dg, 14 + i * 3); s.step(DT) }
  const g3 = s.points - p0
  steps(s, 0.2)
  ok('G-3', 'last working sheep through → gate cleared: multiplier +1 for the rest of the run, no flat bonus, announced once', g3 === 200 && dg.done && s.points - p0 === g3 && s.run.gateMult === 1 && s.score().mult === 2 && s.scoreEvents.filter((e) => e.kind === 'gate' && e.cleared).length === 1, `gained ${g3}, done ${dg.done}, multiplier ×${s.score().mult}`)
  const off = gateSim({}); const d2 = off.driveGates[0]
  off.sheep[0].pos = { x: d2.x + d2.tx * (d2.half + 20) - d2.nx * 14, y: d2.y + d2.ty * (d2.half + 20) - d2.ny * 14 }; off.step(DT)
  const q0 = off.points
  off.sheep[0].pos = { x: d2.x + d2.tx * (d2.half + 20) + d2.nx * 14, y: d2.y + d2.ty * (d2.half + 20) + d2.ny * 14 }; off.step(DT)
  ok('G-2b', 'crossing the line OUTSIDE the gap scores nothing', off.points === q0, `${off.points - q0}`)
}
{ // G-4 nothing inside a panel during a driven run
  let worst = Infinity, n = 0
  for (const seed of [2, 9, 14, 23, 31, 57]) {
    const s = mkc(N, { seed, sheepCount: 40, driveGateMax: 2, driveGateChance: 1 })
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
  ok('G-4', 'no sheep or dog is ever inside a hurdle panel (40 s driven runs)', worst >= -1e-6 && n > 0, `closest edge distance ${worst.toFixed(2)} px over ${n} courses`)
}
function kindSim(kind, over) {
  for (let seed = 1; seed < 600; seed++) {
    const s = mkc(N, { seed, sheepCount: 12, specials: true, ...over })
    if (s.sheep.some((q) => q.kind === kind)) return s
  }
}
{ // K-1 golden
  const a = kindSim('golden', { penCalmStress: 0 }); const gi = a.sheep.findIndex((q) => q.kind === 'golden')
  const r1 = cross(a, gi).gained
  const b = kindSim('golden', {}); const gj = b.sheep.findIndex((q) => q.kind === 'golden'); const other = b.sheep.findIndex((q) => q.kind === 'ewe')
  cross(b, other); steps(b, 0.5); const r2 = cross(b, gj).gained
  ok('K-1', 'golden ewe is worth ×5 and it stacks: RUSHED alone = 250; PERFECT second in a chain (×3) = 7500', r1 === 250 && r2 === 7500, `${r1} / ${r2} (${lastPen(b).label})`)
}
{ // K-2 / K-3 lamb
  const s = kindSim('lamb', {}); const li = s.sheep.findIndex((q) => q.kind === 'lamb'), m = s.sheep[li].mother
  let far = 0
  for (let k = 0; k < 60 * 30; k++) { s.step(DT); far = Math.max(far, Math.hypot(s.sheep[li].pos.x - s.sheep[m].pos.x, s.sheep[li].pos.y - s.sheep[m].pos.y)) }
  ok('K-2', 'lamb stays close to its mother over 30 s of grazing', far < s.p.idleCohRadius, `max distance ${far.toFixed(1)} px (limit ${s.p.idleCohRadius})`)
  const a = kindSim('lamb', { penCalmStress: 0 }); const la = a.sheep.findIndex((q) => q.kind === 'lamb')
  cross(a, a.sheep[la].mother); steps(a, 0.5); const r1 = cross(a, la).gained, lab = lastPen(a).label
  const b = kindSim('lamb', { penCalmStress: 0 }); const lb = b.sheep.findIndex((q) => q.kind === 'lamb')
  const r2 = cross(b, lb).gained
  ok('K-3', 'lamb right behind its mother is worth ×3 (RUSHED: 150); alone ×1 (50)', r1 === 150 && /LAMB \+150/.test(lab) && r2 === 50, `${lab} → ${r1}; alone ${r2}`)
}
{ // K-4 ram
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
  ok('K-4', 'ram feels less pressure, stands and faces an advancing dog inside ramStandDist, gives way past ramStandRelease or after a lie-down',
    Math.abs(sr / se - 0.6) < 1e-6 && stood && facesDog && released && Math.abs(t - 2) < 0.05, `stress ${sr.toFixed(3)} vs ${se.toFixed(3)}; stood ${stood}; faces ${facesDog}; released ${released}; lie-down release after ${t.toFixed(2)} s`)
  const a = kindSim('ram', { penCalmStress: 0 }); const r = cross(a, a.sheep.findIndex((q) => q.kind === 'ram')).gained
  ok('K-4b', 'ram is worth ×3 (RUSHED: 150)', r === 150, `${r}`)
  // K-4c (owner 2026-11-18): a direct walk-on held on a standing ram makes him slow-trot away
  const yieldRun = (cmd) => {
    place(ri); ram.vel = { x: 0, y: 0 }; ram.stand = false; ram.standCool = 0; ram.yieldT = 0
    s.dog.pos = { x: 500 - 50, y: 400 }; s.dog.vel = { x: 60, y: 0 }; s.dog.command = 'walk_on'; s.flee(ri, DT)
    s.dog.vel = { x: 0, y: 0 }; s.dog.command = cmd // he has stopped short, as walk-on does
    let tY = -1, peak = 0
    for (let k = 0; k < 60 * 4; k++) { s.integrate(ri, DT); if (tY < 0 && !ram.stand) tY = (k + 1) * DT; peak = Math.max(peak, Math.hypot(ram.vel.x, ram.vel.y)) }
    return { tY, peak, moved: ram.pos.x - 500, stand: ram.stand }
  }
  const yw = yieldRun('walk_on'), ye = yieldRun('easy')
  ok('K-4c', 'a walk-on held on a standing ram for ramYieldWait makes him slow-trot away from the dog; easy does not',
    Math.abs(yw.tY - s.p.ramYieldWait) < 0.05 && yw.moved > 100 && yw.peak > s.p.walkSpeed * s.p.ramSpeedScale && yw.peak <= s.p.trotSlowSpeed + 1e-6 && ye.stand && Math.abs(ye.moved) < 1,
    `yielded after ${yw.tY.toFixed(2)} s, moved ${yw.moved.toFixed(0)} px away in 4 s, peak ${yw.peak.toFixed(0)} px/s; easy: still standing ${ye.stand}, moved ${ye.moved.toFixed(1)} px`)
  // K-4d (owner 2026-11-18): heel nip — the dog dives at the standing ram, who then runs flat out from him; the dog keeps his command
  const nipRun = (nip) => {
    place(ri); ram.vel = { x: 0, y: 0 }; ram.stand = false; ram.standCool = 0; ram.yieldT = 0; ram.nipT = 0
    s.dog.pos = { x: 500 - 50, y: 400 }; s.dog.vel = { x: 60, y: 0 }; s.dog.command = 'walk_on'; s.flee(ri, DT)
    s.dog.vel = { x: 0, y: 0 }; s.dog.command = 'easy'; s.dog.nip = null
    const cmds = s.run.commands, said = nip ? s.heelNip() : null
    let peak = 0, tBite = -1
    for (let k = 0; k < 60 * 3; k++) {
      if (nip) s.stepDog(DT)
      s.integrate(ri, DT)
      if (tBite < 0 && ram.nipT > 0) tBite = (k + 1) * DT
      peak = Math.max(peak, Math.hypot(ram.vel.x, ram.vel.y))
    }
    return { said, tBite, peak, moved: ram.pos.x - 500, stand: ram.stand, cmd: s.dog.command, counted: s.run.commands - cmds, nip: s.dog.nip }
  }
  const n0 = nipRun(false), n1 = nipRun(true)
  place(ri); s.dog.pos = { x: 500 - s.p.heelNipReach - 20, y: 400 }; const far = s.heelNip()
  place(ri); ram.stand = false; s.dog.pos = { x: 500 - 40, y: 400 }; const calm = s.heelNip(), noBtn = s.nipTarget() // nobody standing him off
  ok('K-4d', 'heel nip: the dog dives at a standing ram and he runs flat out away; without it he never moves; the dog keeps his command; nothing in reach → no nip',
    n0.stand && Math.abs(n0.moved) < 1 && n1.said === true && n1.tBite > 0 && n1.tBite < 0.6 && !n1.stand && n1.moved > 120 && n1.peak > s.p.trotSlowSpeed && n1.cmd === 'easy' && n1.counted === 1 && n1.nip === null && far === false && calm === false && noBtn === -1,
    `no nip: standing ${n0.stand}, moved ${n0.moved.toFixed(1)} px; nip: bit after ${n1.tBite.toFixed(2)} s, moved ${n1.moved.toFixed(0)} px in 3 s, peak ${n1.peak.toFixed(0)} px/s, dog still on ${n1.cmd}; out of reach → ${far}; nobody standing → ${calm}`)
  // frequency sanity over 400 seeds
  const c = { golden: 0, lamb: 0, ram: 0 }
  for (let seed = 1; seed <= 400; seed++) { const q = mkc(N, { seed, sheepCount: 20, specials: true }); for (const k of Object.keys(c)) { const n = q.sheep.filter((x) => x.kind === k).length; if (n > 1) c[k] = NaN; c[k] += n } }
  ok('K-Q83', 'each v14 kind rolls independently, at most one of each (400 seeds)', Math.abs(c.golden / 400 - 0.35) < 0.08 && Math.abs(c.lamb / 400 - 0.35) < 0.08 && Math.abs(c.ram / 400 - 0.25) < 0.08, `golden ${(c.golden / 4).toFixed(0)} % · lamb ${(c.lamb / 4).toFixed(0)} % · ram ${(c.ram / 4).toFixed(0)} %`)
}

// ---------------- RM5 / RM6 ----------------
{
  const s = mkc(N, { seed: 21, mode: 'waves', driveGateMax: 2, driveGateChance: 1, specials: true })
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
    `wave ${s.run.wave}, flock ${s.sheep.length}, points ${pts}, wave multipliers +${(s.score().lines.find((l) => l.key === 'mult') || { points: 0 }).points}`)
  s.run.clock = 0.05; steps(s, 0.2)
  const sc = s.score()
  ok('RM-8', 'run ends at clock zero; score shows waves cleared, no rank, no time bonus', s.run.finished && sc.wave === 1 && sc.rank === null && sc.percent === null && !sc.lines.some((l) => l.key === 'time') && sc.total === pts, `finished ${s.run.finished}, wave ${sc.wave}`)
  // determinism
  const run = () => { const q = mkc(N, { seed: 77, mode: 'waves', specials: true }); const out = []; for (let w = 0; w < 3; w++) { steps(q, 1); out.push(q.sheep.map((x) => x.pos.x.toFixed(3) + ',' + x.pos.y.toFixed(3) + x.kind).join(';')); const n = q.sheep.length; for (let i = 0; i < n; i++) cross(q, i) } return out.join('|') }
  ok('RM-9', 'same seed lays the same flocks wave for wave', run() === run(), '3 waves compared')
  const capped = mkc(N, { seed: 3, mode: 'waves', waveSheepStart: 38, waveGrowth: 5 }); for (let w = 0; w < 2; w++) { const n = capped.sheep.length; for (let i = 0; i < n; i++) cross(capped, i) }
  ok('RM-7b', 'flock size is capped at waveSheepMax', capped.sheep.length === 40, `${capped.sheep.length}`)
  const c = mkc(N, { seed: 7, sheepCount: 6 })
  ok('RM-10', 'mode `course` is unaffected (herd size from the slider, par clock)', c.sheep.length === 6 && c.score().mode === 'course', '')
}

// =====================================================================================
// POC-v16 — competition course (CC), obstacles OR drive gates (EX), the demo handler (DM)
// =====================================================================================
const comp = (seed, over) => mkc(N, Object.assign({ seed, course: 'competition', sheepCount: 8, specials: true, obstacleRandom: true, driveGateMax: 2 }, over || {}))
{ // CC-1 / CC-2: what a competition course is made of
  let bad = 0, minLeg = Infinity, minIn = Infinity, crossings = 0
  const hist = {}
  for (let seed = 1; seed <= 300; seed++) {
    const q = comp(seed), n = q.driveGates.length, r = q.playRect(), pts = q.idealPath
    hist[n] = (hist[n] || 0) + 1
    if (n < 4 || n > 6 || q.obstacles.some((o) => o.kind !== 'hurdle') || q.sheep.length !== 8 || q.sheep.some((x) => x.kind !== 'ewe' || x.group !== 0) || q.layout !== 'competition') bad++
    if (q.driveGates.some((d, i) => d.order !== i + 1) || pts.length !== n + 3) bad++
    for (let i = 0; i + 2 < pts.length; i++) minLeg = Math.min(minLeg, Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y))
    for (const d of q.driveGates) for (const e of [d.e0, d.e1]) minIn = Math.min(minIn, e.x - r.x0, r.x1 - e.x, e.y - r.y0, r.y1 - e.y)
    const hit = (a, b, c, d) => { const o = (u, v, t) => Math.sign((v.x - u.x) * (t.y - u.y) - (v.y - u.y) * (t.x - u.x)); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) }
    for (let i = 0; i + 2 < pts.length; i++) for (let j = i + 2; j + 2 < pts.length; j++) if (hit(pts[i], pts[i + 1], pts[j], pts[j + 1])) crossings++
  }
  ok('CC-1', '300 competition courses: 4–6 gates numbered in order, no obstacles, one group of plain ewes', bad === 0 && hist[4] > 0 && hist[5] > 0 && hist[6] > 0, `gate counts ${JSON.stringify(hist)}, bad ${bad}`)
  ok('CC-2', 'the required path: every leg at least the minimum, no leg crosses another, every panel inside the fence', minLeg >= 189 && crossings === 0 && minIn > 0, `shortest leg ${minLeg.toFixed(0)} px, crossings ${crossings}, panel end to fence ${minIn.toFixed(0)} px`)
  const a = comp(41), b = comp(41), p0 = mkc(N, { seed: 41 })
  ok('CC-2b', 'same seed → same course; the pen gate is where the pasture course of that seed has it', JSON.stringify(a.idealPath) === JSON.stringify(b.idealPath) && a.gate.x === p0.gate.x && a.gate.y === p0.gate.y && a.gate.side === p0.gate.side, '')
}
{ // CC-3: in order, one way
  const q = comp(7); q.step(DT)
  const put = (d, k) => q.sheep.forEach((x, i) => { x.pos = { x: d.x + d.nx * k + d.tx * ((i % 4) - 1.5) * 6, y: d.y + d.ny * k + d.ty * ((i % 4) - 1.5) * 6 }; x.vel = { x: 0, y: 0 } })
  const through = (d, from, to) => { for (const g of q.driveGates) g.sides.clear(); put(d, from); q.updateDriveGates(); put(d, to); q.updateDriveGates() } // sides cleared: the teleport to the start side is not a crossing
  const g1 = q.driveGates[0], g2 = q.driveGates[1]
  through(g2, -14, 14)
  const early = g2.passed.size + g1.passed.size
  through(g1, 14, -14)
  const backwards = g1.passed.size
  const before = q.points
  through(g1, -14, 14)
  const first = { done: g1.done, pts: q.points - before, mult: q.run.gateMult, next: q.nextGate() === g2 }
  through(g2, -14, 14)
  ok('CC-3', 'gates count in order and one way only: gate 2 early = nothing, gate 1 backwards = nothing, gate 1 then gate 2 clear', early === 0 && backwards === 0 && first.done && first.pts === 8 * 50 && first.mult === 1 && first.next && g2.done && q.nextGate() === q.driveGates[2],
    `early ${early}, backwards ${backwards}, gate 1 ${JSON.stringify(first)}, gate 2 done ${g2.done}`)
}
{ // CC-4: the pen is shut until the last gate
  const q = comp(7); q.step(DT)
  cross(q, 0)
  const shut = { open: q.penOpen(), through: q.sheep[0].through, inField: q.sheep[0].pos.x >= q.playRect().x0 - 1e-6 && q.sheep[0].pos.x <= q.playRect().x1 + 1e-6 && q.sheep[0].pos.y >= q.playRect().y0 - 1e-6 && q.sheep[0].pos.y <= q.playRect().y1 + 1e-6 }
  for (const d of q.driveGates) d.done = true
  cross(q, 0)
  ok('CC-4', 'a sheep put out through the pen mouth is turned back while gates remain; once they are all cleared it is penned', !shut.open && !shut.through && shut.inField && q.penOpen() && q.sheep[0].through, JSON.stringify(shut))
}
{ // CC-6 / CC-7: the dog's objective, the reference and par
  const q = comp(7); q.step(DT)
  const g1 = q.driveGates[0], a = q.aim(), pas = mkc(N, { seed: 7 }); pas.step(DT)
  const nearGate = Math.hypot(a.x - g1.x, a.y - g1.y) <= 125
  for (const d of q.driveGates) d.done = true
  q.step(DT)
  const plain = mkc(N, { seed: 7, sheepCount: 8 })
  ok('CC-6', 'the dog works toward the next gate, then the pen; on a pasture course it is the pen centre as before', nearGate && q.aim() === q.p.goal && pas.aim() === pas.p.goal, `aim ${a.x.toFixed(0)},${a.y.toFixed(0)} vs gate 1 ${g1.x.toFixed(0)},${g1.y.toFixed(0)}`)
  const G = q.driveGates.length
  ok('CC-7', 'the reference run counts the gates (points + multiplier) and par adds the walk round the path', q.run.reference === Math.round((q.p.penCalmPoints * (36 + 8 * G * q.p.driveGateMult) + 8 * G * q.p.driveGatePoints) * q.p.multFullFlock * q.p.multClean * q.p.multAllCalm) && q.run.reference > plain.run.reference && q.par() > plain.par() + 30, `reference ${q.run.reference} (${G} gates), par ${q.par().toFixed(0)} s vs ${plain.par().toFixed(0)} s`)
  const w = comp(7, { mode: 'waves' })
  ok('CC-8', 'wave mode has no competition course', !w.compPath && w.driveGates.length === 0 && w.penOpen(), '')
}
{ // EX-1: a pasture course has obstacles OR drive gates, never both
  let both = 0, withGates = 0, withObst = 0
  for (let seed = 1; seed <= 400; seed++) {
    const q = mkc(N, { seed, obstacleRandom: true, driveGateMax: 2, driveGateChance: 0.5, sheepCount: 20 })
    const o = q.obstacles.some((x) => x.kind !== 'hurdle'), g = q.driveGates.length > 0
    if (o && g) both++
    if (o) withObst++
    if (g) withGates++
  }
  ok('EX-1', '400 pasture courses at the page settings: none has both obstacles and drive gates; both kinds still occur', both === 0 && withGates > 0 && withObst > 0, `both ${both}, with gates ${withGates}, with obstacles ${withObst}`)
}
{ // DM: the demo handler, through sim.setCommand only
  const runAuto = (q, secs) => {
    const auto = new N.AutoHandler(), order = [], verbs = new Set(), set0 = q.setCommand.bind(q)
    q.setCommand = (c, o) => { verbs.add(c); return set0(c, o) }
    const dog0 = q.dog
    let moved = 0
    for (let k = 0; k < secs * 60 && !q.run.finished; k++) {
      const before = q.sheep.map((x) => x.pos.x + x.pos.y).join(), dx = q.dog.pos.x, dy = q.dog.pos.y
      auto.step(q, DT)
      if (q.sheep.map((x) => x.pos.x + x.pos.y).join() !== before || q.dog.pos.x !== dx || q.dog.pos.y !== dy) moved++
      q.step(DT)
      for (const d of q.driveGates) if (d.done && !order.includes(d.order)) order.push(d.order)
    }
    return { sc: q.score(), order, verbs: Array.from(verbs).sort().join(','), moved, sameDog: q.dog === dog0 }
  }
  let won = 0, inOrder = 0, moved = 0, busts = 0
  const times = [], seeds = [1000, 1037, 1074, 1111, 1148, 1185]
  let verbs = ''
  for (const seed of seeds) {
    const q = comp(seed, { sideObjectiveCount: 2 }), n = q.driveGates.length, r = runAuto(q, 300)
    if (r.sc.won && r.sc.penned === 8) won++
    if (r.sc.bust) busts++
    if (r.order.length === n && r.order.every((v, i) => v === i + 1)) inOrder++
    moved += r.moved; times.push(r.sc.raw.t.toFixed(0)); verbs = r.verbs
  }
  ok('DM-1', 'the demo handler runs six competition courses: every gate in order, the whole flock penned, no bust', won === seeds.length && inOrder === seeds.length && busts === 0, `won ${won}/${seeds.length}, in order ${inOrder}, times ${times.join(' ')} s`)
  ok('DM-2', 'it only ever issues the pad\'s commands — it never moves the dog or a sheep itself', moved === 0 && verbs.split(',').every((v) => ['away', 'come_by', 'easy', 'lie_down', 'that_ll_do', 'walk_on'].includes(v)), `verbs ${verbs}, direct moves ${moved}`)
  let pw = 0
  const pt = []
  for (const seed of [1074, 1296, 1555]) { const r = runAuto(mkc(N, { seed, sheepCount: 30 }), 400); if (r.sc.won && r.sc.penned === 30) pw++; pt.push((r.sc.won ? 'won ' : r.sc.bust ? 'bust ' : 'open ') + r.sc.raw.t.toFixed(0) + ' s') }
  ok('DM-3', 'on a pasture course it gathers a scattered flock of 30 and pens it (three seeds)', pw === 3, pt.join(' · '))
  // POC-v17 (lives here for runAuto)
  { // B-6: a field with bulls is still workable
    let pw = 0
    const pt = []
    for (const seed of [1074, 1296, 1555]) { const r = runAuto(mkc(N, { seed, sheepCount: 30, bullMax: 3, bullChance: 1 }), 400); if (r.sc.won && r.sc.penned === 30) pw++; pt.push((r.sc.won ? 'won ' : r.sc.bust ? 'bust ' : 'open ') + r.sc.raw.t.toFixed(0) + ' s') }
    ok('B-6', 'the demo handler still pens a flock of 30 on fields with bulls on them (three seeds, every bull slot filled)', pw === 3, pt.join(' · '))
  }
}

// =====================================================================================
// POC-v17 — wandering bulls (B): .claude/sheep/implemented/POC-v17/bulls.md
// =====================================================================================
{
  const page = (seed, over) => mkc(N, Object.assign({ seed, sheepCount: 40, obstacleRandom: true, bullMax: 3 }, over || {})) // bulls at the page settings
  { // B-1: how many, and where they are put
    const hist = [0, 0, 0, 0]
    let bad = 0, moved = 0, comp = 0
    for (let seed = 1; seed <= 600; seed++) {
      const q = page(seed), p = q.p, r = q.playRect(), n = q.bulls.length
      if (n > 3) { bad++; continue }
      hist[n]++
      for (const b of q.bulls) {
        const m = b.r + p.r_obstacle + p.bullBerth
        if (b.kind !== 'bull' || b.x - m < r.x0 || b.x + m > r.x1 || b.y - m < r.y0 || b.y + m > r.y1) bad++
        if (Math.hypot(b.x - q.gate.x, b.y - q.gate.y) < 100 + b.r) bad++
        if (q.obstacles.some((o) => Math.hypot(o.x - b.x, o.y - b.y) < o.r + b.r)) bad++
        if (q.sheep.some((x) => Math.hypot(x.pos.x - b.x, x.pos.y - b.y) < m)) bad++
        if (q.bulls.some((o) => o !== b && Math.hypot(o.x - b.x, o.y - b.y) < o.r + b.r)) bad++
      }
      if (seed <= 200) {
        const z = page(seed, { bullMax: 0 })
        if (z.gate.x !== q.gate.x || z.gate.y !== q.gate.y || z.obstacles.length !== q.obstacles.length || z.obstacles.some((o, i) => o.x !== q.obstacles[i].x) || z.sheep.some((x, i) => x.pos.x !== q.sheep[i].pos.x || x.kind !== q.sheep[i].kind)) moved++
        if (mkc(N, { seed, course: 'competition', sheepCount: 8, bullMax: 3, bullChance: 1 }).bulls.length) comp++
      }
    }
    ok('B-1', '600 pastures at the page settings: 0–3 bulls, every count occurs, each clear of the fence lane, the pen approach, the obstacles, the flock and each other', bad === 0 && hist.every((h) => h > 0), `0/1/2/3 bulls on ${hist.join('/')} fields, ${bad} violations`)
    ok('B-2', 'bulls move nothing else: the same seed lays the same gate, obstacles and flock with or without them; a competition course never has one', moved === 0 && comp === 0, `${moved} of 200 courses moved, ${comp} competition courses with a bull`)
  }
  { // B-3: a rock with a wider berth
    const q = page(7, { sheepCount: 10, obstacleRandom: false, obstacleFreq: 0, bullMax: 0 }), p = q.p
    const sh = q.sheep[0], at = { x: sh.pos.x, y: sh.pos.y }
    const probe = (kind, edge, vel) => {
      const o = { x: at.x + 17 + edge, y: at.y, r: 17, kind, group: 0, seed: 1 }
      q.obstacles = kind === 'bull' ? [] : [o]; q.bulls = kind === 'bull' ? [o] : []
      sh.vel = vel || { x: 0, y: 0 }
      const f = q.obstacleForce(0); return Math.hypot(f.x, f.y)
    }
    const mid = p.r_obstacle + p.bullBerth / 2, far = p.obstacleLook + p.bullBerth / 2
    const rockNear = probe('rocks', mid), bullNear = probe('bull', mid)
    const rockFar = probe('rocks', far, { x: 40, y: 0 }), bullFar = probe('bull', far, { x: 40, y: 0 })
    const rockIn = probe('rocks', 10), bullIn = probe('bull', 10)
    const pos = { x: at.x + 17 + 5, y: at.y }; q.pushOut(pos, 2) // the bull is still the only solid
    ok('B-3', 'sheep treat a bull as a rock with a wider berth: he pushes off and is sidestepped from further out, harder at the same distance, and is solid', rockNear === 0 && bullNear > 0 && rockFar === 0 && bullFar > 0 && bullIn > rockIn && rockIn > 0 && Math.hypot(pos.x - (at.x + 17 + 10), pos.y - at.y) >= 17 + 2 - 1e-6,
      `push at ${mid} px: rock ${rockNear.toFixed(2)}, bull ${bullNear.toFixed(2)} · sidestep at ${far} px: rock ${rockFar.toFixed(2)}, bull ${bullFar.toFixed(2)} · at 10 px: rock ${rockIn.toFixed(2)}, bull ${bullIn.toFixed(2)}`)
  }
  { // B-4 / B-5: the bull does his own thing; the dog (and the flock) are not inputs
    let same = true, walked = 0, out = 0, inside = 0, n = 0, runs = 0
    for (const seed of [11, 23, 58, 104]) {
      const mkb = () => page(seed, { bullChance: 1, obstacleRandom: false, obstacleFreq: 4 })
      const a = mkb(), b = mkb(), p = a.p, r = a.playRect()
      const start = a.bulls.map((x) => ({ x: x.x, y: x.y }))
      const cmds = ['away', 'walk_on', 'come_by', 'easy', 'lie_down', 'walk_on']
      for (let k = 0; k < 60 * 90; k++) {
        if (k % 240 === 0) a.setCommand(cmds[(k / 240) % 6]) // a: the dog works the field · b: he stays at heel
        a.step(DT); b.step(DT)
        if (k % 6) continue
        for (const x of a.bulls) {
          const m = x.r + p.r_obstacle + p.bullBerth
          if (x.x - m < r.x0 - 1e-6 || x.x + m > r.x1 + 1e-6 || x.y - m < r.y0 - 1e-6 || x.y + m > r.y1 + 1e-6 || Math.hypot(x.x - a.gate.x, x.y - a.gate.y) < 100 + x.r) out++
          if (a.obstacles.some((o) => Math.hypot(o.x - x.x, o.y - x.y) < o.r + x.r - 1e-6)) out++
          for (const q of a.sheep) if (!q.through && !q.down && Math.hypot(q.pos.x - x.x, q.pos.y - x.y) < x.r) inside++
          if (Math.hypot(a.dog.pos.x - x.x, a.dog.pos.y - x.y) < x.r) inside++
        }
      }
      runs++; n += a.bulls.length
      if (a.bulls.length !== b.bulls.length || a.bulls.some((x, i) => x.x !== b.bulls[i].x || x.y !== b.bulls[i].y || x.heading !== b.bulls[i].heading)) same = false
      a.bulls.forEach((x, i) => { if (Math.hypot(x.x - start[i].x, x.y - start[i].y) > 20) walked++ })
    }
    ok('B-4', 'the dog does not affect a bull: 90 s with the dog working the field and 90 s with him at heel leave every bull in exactly the same place', same && n > 0, `${n} bulls over ${runs} seeds`)
    ok('B-5', 'bulls wander — and stay inside the fence lane, off the pen approach and out of the stands / rocks; no sheep or dog is ever inside one', walked >= n * 0.75 && out === 0 && inside === 0, `${walked}/${n} moved more than 20 px in 90 s, ${out} out of range, ${inside} overlaps`)
  }
}

let fails = 0
for (const r of results) { if (!r.pass) fails++; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(8)} ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`) }
console.log(`\n${results.length - fails}/${results.length} passed`)
process.exit(fails ? 1 : 0)
