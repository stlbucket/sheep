'use strict'
// ============================================================================
// lib/assault-sim.js — the wolf-mortar assault's PHYSICS (§A, sim half).
//   Used by 3d-assault.html. DOM-free and three-free: no document / window /
//   meshes — it also loads in plain node. A classic script (see sheep-sim.js
//   for why); needs lib/sheep-sim.js first (makePRNG, smoothstep, FlockSim).
//
//   After ASSAULT.delay seconds of run time, ASSAULT.teams two-wolf teams run
//   in from far out, round the fence, set a mortar up outside it (never on the
//   gate side) and lob a round every 60/ASSAULT.rate seconds at a random loose
//   sheep, with a scatter set by ASSAULT.accuracy. Where a round lands:
//     within BLAST.kill   → the sheep is killed (the sim's `down`, +1 injury)
//     within BLAST.stun   → knocked flat for BLAST.stunFor seconds
//     within BLAST.panic  → bolts away from the blast for BLAST.panicFor seconds
//   Penned sheep are safe. This is the one place outside FlockSim that WRITES
//   sim state; it does so after each sim.step — call assaultStep(sim, dt) —
//   on its own PRNG, so the sim's random stream is untouched until a blast
//   actually moves a sheep.
//
//   Globals: ASSAULT (the four owner-facing settings) · BLAST (tuning
//   constants) · assault (live state) · ASSAULT_ENV (what a page plugs in) ·
//   assaultStep · assaultReset · teamAt.
// ============================================================================
const ASSAULT = { delay: 30, teams: 1, rate: 6, accuracy: 0.2 }   // the four owner-facing settings ("Wolf assault" section)
const BLAST = { kill: 11, stun: 42, panic: 120, stunFor: 6, panicFor: 4.5, flight: 2.6, apex: 240, standoff: 46, runSpeed: 120, farBoost: 3.5, setup: 3 }  // farBoost: extra pace while still far out (× runSpeed)

// What the page (the view) plugs in. Every entry is optional — left null the
// assault still runs, headless, with wolves coming straight out from their side.
const ASSAULT_ENV = {
  // -- world queries the run-in route is planned from
  viewAngle: null,     // () → angle (rad, sim plane) the teams should come in along — the camera's background — or null for "no preference"
  groundHeight: null,  // (x, y) → terrain height at a sim point; only used to find the hill crest a team starts behind
  bounds: null,        // () → { x0, x1, y0, y1 } of everything drawn round the field (paddock…) the run-in must skirt, or null
  // -- notifications, so a view can keep its meshes in step
  onReset: null,       // ()            a fresh, wolf-free run — drop everything
  onTeamAdded: null,   // (team)
  onTeamRemoved: null, // (team)
  onFire: null,        // (team, shell) a round has left the tube
  onLand: null,        // (shell)       …and has come down (onBlast follows)
  onBlast: null,       // (x, y)
}
const assaultEmit = (name, ...args) => { if (ASSAULT_ENV[name]) ASSAULT_ENV[name](...args) }

const assault = {
  t: 0, run: null, rng: makePRNG(1), sides: [], teams: [], shells: [],
  stunned: new Map(), panicked: new Map(), killed: new WeakSet(), dead: 0, rounds: 0,
}

const assaultMix = (a, b, t) => (1 - t) * a + t * b

// ---- lifecycle ---------------------------------------------------------------
function assaultReset(sim) {
  const a = assault
  a.teams.length = a.shells.length = 0
  a.stunned.clear(); a.panicked.clear(); a.killed = new WeakSet()
  a.t = 0; a.dead = 0; a.rounds = 0; a.run = sim.run
  a.rng = makePRNG((sim.p.seed ^ 0x77a55a17) >>> 0)
  a.sides = [0, 1, 2, 3].filter((s) => s !== sim.gate.side)           // never set up beside the paddock
  for (let i = a.sides.length - 1; i > 0; i--) { const j = Math.floor(a.rng() * (i + 1)); [a.sides[i], a.sides[j]] = [a.sides[j], a.sides[i]] }
  assaultEmit('onReset')
}
function makeTeam(sim, k) {
  const a = assault, r = sim.playRect(), side = a.sides[k % a.sides.length]
  const f = [0.5, 0.22, 0.78][Math.floor(k / a.sides.length) % 3] + (a.rng() - 0.5) * 0.12
  const n = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }][side]                // out of the field
  const edge = side === 0 ? { x: assaultMix(r.x0, r.x1, f), y: r.y0 } : side === 1 ? { x: r.x1, y: assaultMix(r.y0, r.y1, f) }
             : side === 2 ? { x: assaultMix(r.x0, r.x1, f), y: r.y1 } : { x: r.x0, y: assaultMix(r.y0, r.y1, f) }
  const tx = -n.y, ty = n.x
  const st = { x: edge.x + n.x * BLAST.standoff, y: edge.y + n.y * BLAST.standoff }
  // start out of sight behind the hill crest in the view's background (no view / looking straight down → straight out from the fence)
  const c = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }
  const view = ASSAULT_ENV.viewAngle ? ASSAULT_ENV.viewAngle() : null
  const ang = (view !== null && view !== undefined ? view : Math.atan2(n.y, n.x)) + (a.rng() - 0.5) * 0.7
  const ux = Math.cos(ang), uy = Math.sin(ang)
  let crest = 4600, top = 0
  if (ASSAULT_ENV.groundHeight) for (let d = 2600; d <= 6400; d += 60) { const h = ASSAULT_ENV.groundHeight(c.x + ux * d, c.y + uy * d); if (h > top) { top = h; crest = d } }
  const start = { x: c.x + ux * (crest + 320), y: c.y + uy * (crest + 320) }
  // …then round the fence (and the paddock) to the mortar spot
  const g = BLAST.standoff - 2, cb = (ASSAULT_ENV.bounds && ASSAULT_ENV.bounds()) || r
  const box = { x0: Math.min(cb.x0, r.x0) - g, x1: Math.max(cb.x1, r.x1) + g, y0: Math.min(cb.y0, r.y0) - g, y1: Math.max(cb.y1, r.y1) + g }
  if (side === 0) box.y0 = st.y + 2; else if (side === 1) box.x1 = st.x - 2; else if (side === 2) box.y1 = st.y - 2; else box.x0 = st.x + 2
  const path = routeAround(start, st, box)
  let runLen = 0
  path.forEach((p, i) => { if (i) runLen += Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y); p.s = runLen })
  const A = path[path.length - 2], endDir = { x: (st.x - A.x) / (runLen - A.s), y: (st.y - A.y) / (runLen - A.s) }
  return {
    st, path, runLen, tx, ty, inx: -n.x, iny: -n.y,                    // st: the mortar spot · (tx, ty): along the fence · (inx, iny): into the field
    flip: -endDir.y * tx + endDir.x * ty < 0 ? -1 : 1,                 // which wolf runs on which flank, so they don't cross on arrival
    speed: BLAST.runSpeed,
    state: 'run', prog: 0, timer: 0,                                   // run → setup → fire
  }
}
// does the segment p→q pass through the inside of the box?
function segHitsBox(p, q, b) {
  let t0 = 0, t1 = 1
  for (const [d, lo, hi] of [[q.x - p.x, b.x0 - p.x, b.x1 - p.x], [q.y - p.y, b.y0 - p.y, b.y1 - p.y]]) {
    if (Math.abs(d) < 1e-9) { if (lo >= 0 || hi <= 0) return false; continue }
    const u = lo / d, v = hi / d
    t0 = Math.max(t0, Math.min(u, v)); t1 = Math.min(t1, Math.max(u, v))
  }
  return t1 - t0 > 1e-6
}
// shortest way from → to that stays outside the box, cutting its corners with a little room
function routeAround(from, to, box) {
  const m = 30, N = [from, { x: box.x0 - m, y: box.y0 - m }, { x: box.x1 + m, y: box.y0 - m }, { x: box.x1 + m, y: box.y1 + m }, { x: box.x0 - m, y: box.y1 + m }, to]
  const dist = N.map((_, i) => i ? Infinity : 0), prev = N.map(() => -1)
  for (let pass = 0; pass < N.length; pass++) for (let i = 0; i < N.length; i++) for (let j = 1; j < N.length; j++) {
    if (i === j || dist[i] === Infinity || segHitsBox(N[i], N[j], box)) continue
    const d = dist[i] + Math.hypot(N[j].x - N[i].x, N[j].y - N[i].y)
    if (d < dist[j] - 1e-6) { dist[j] = d; prev[j] = i }
  }
  if (dist[N.length - 1] === Infinity) return [{ ...from }, { ...to }]
  const out = []
  for (let i = N.length - 1; i >= 0; i = prev[i]) out.unshift({ x: N[i].x, y: N[i].y })
  return out
}
// where the team is along its run-in, and which way it is heading
function teamAt(T) {
  const P = T.path
  let i = 1
  while (i < P.length - 1 && T.prog > P[i].s) i++
  const A = P[i - 1], B = P[i], L = B.s - A.s || 1, u = (T.prog - A.s) / L
  return { x: assaultMix(A.x, B.x, u), y: assaultMix(A.y, B.y, u), dx: (B.x - A.x) / L, dy: (B.y - A.y) / L }
}

// ---- sim-rate logic (call once after every sim.step) ---------------------------
const looseSheep = (sim) => sim.sheep.filter((s) => !s.down && !s.through)
function assaultStep(sim, dt) {
  const a = assault, p = sim.p
  if (sim.run !== a.run) assaultReset(sim)                             // reseed / reset / respawn → a fresh, wolf-free run
  a.t += dt
  const r = sim.playRect(), N = sim.sheep.length || 1
  let lift = 0

  // stunned: pinned where they fell
  for (const [s, e] of a.stunned) {
    e.left -= dt
    if (e.left <= 0 || s.down || s.through) { a.stunned.delete(s); continue }
    s.pos.x = e.x; s.pos.y = e.y; s.vel.x = 0; s.vel.y = 0
    s.idle = false; s.calmT = 0
    lift += Math.max(0, 0.7 - s.stress); s.stress = Math.max(s.stress, 0.7)
  }
  // panicked: bolt away from the blast at the sim's panic pace, easing out over the last 1.5 s
  for (const [s, e] of a.panicked) {
    e.left -= dt
    if (e.left <= 0 || s.down || s.through || a.stunned.has(s)) { a.panicked.delete(s); continue }
    const k = Math.min(1, e.left / 1.5) * e.power, top = p.vMax * p.panicMult, extra = p.vMax * (p.panicMult - 1) * k * dt
    s.vel.x += (e.dx * top - s.vel.x) * 0.3 * k; s.vel.y += (e.dy * top - s.vel.y) * 0.3 * k
    s.pos.x = Math.max(r.x0, Math.min(r.x1, s.pos.x + e.dx * extra))
    s.pos.y = Math.max(r.y0, Math.min(r.y1, s.pos.y + e.dy * extra))
    s.facing = Math.atan2(s.vel.y, s.vel.x)
    s.idle = false; s.calmT = 0
    const want = 0.45 + 0.55 * k
    lift += Math.max(0, want - s.stress); s.stress = Math.max(s.stress, want)
  }
  if (!sim.run.finished) sim.run.stress += lift / N * dt               // blast fear counts against Calm like dog pressure does

  // teams: arrive after the delay; the count follows the setting live
  const want = Math.round(ASSAULT.teams)
  while (a.teams.length < want && a.t >= ASSAULT.delay) { const T = makeTeam(sim, a.teams.length); a.teams.push(T); assaultEmit('onTeamAdded', T) }
  while (a.teams.length > want) assaultEmit('onTeamRemoved', a.teams.pop())
  const interval = 60 / Math.max(ASSAULT.rate, 0.1)
  const targets = sim.run.finished ? [] : looseSheep(sim)
  for (const T of a.teams) {
    if (T.state === 'run') {
      T.speed = BLAST.runSpeed * (1 + BLAST.farBoost * smoothstep(500, 2600, T.runLen - T.prog))   // flat out over the hills, easing to the old pace
      T.prog += T.speed * dt
      if (T.prog >= T.runLen) { T.prog = T.runLen; T.state = 'setup'; T.timer = BLAST.setup }
    } else if (T.state === 'setup') {
      T.timer -= dt
      if (T.timer <= 0) { T.state = 'fire'; T.timer = 0.8 + a.rng() * 1.5 }
    } else {
      T.timer = Math.min(T.timer, interval * 1.15) - dt                // a faster rate takes effect at once
      if (T.timer <= 0 && targets.length) { fireMortar(T, targets[Math.floor(a.rng() * targets.length)], r); T.timer = interval * (0.85 + 0.3 * a.rng()) }
    }
  }

  for (let i = a.shells.length - 1; i >= 0; i--) {
    const sh = a.shells[i]
    sh.t += dt
    if (sh.t < BLAST.flight) continue
    a.shells.splice(i, 1)
    assaultEmit('onLand', sh)
    explode(sim, sh.x1, sh.y1)
  }

  // the sim only ends a run when EVERY sheep is penned — with casualties, end it when the survivors are
  if (a.dead > 0 && !sim.run.finished && !a.shells.length && looseSheep(sim).length === 0) sim.finishRun()
}
function fireMortar(T, target, r) {
  const a = assault
  const sd = 6 + 150 * Math.pow(1 - Math.max(0, Math.min(1, ASSAULT.accuracy)), 1.5)   // scatter: 6 px (perfect) … 156 px (hopeless)
  const mag = sd * Math.sqrt(-2 * Math.log(1 - a.rng() * 0.999999)), ang = a.rng() * Math.PI * 2
  const x1 = Math.max(r.x0 + 4, Math.min(r.x1 - 4, target.pos.x + Math.cos(ang) * mag))
  const y1 = Math.max(r.y0 + 4, Math.min(r.y1 - 4, target.pos.y + Math.sin(ang) * mag))
  const sh = { x0: T.st.x + T.inx * 5, y0: T.st.y + T.iny * 5, x1, y1, t: 0 }   // lands at (x1, y1) once t reaches BLAST.flight
  a.shells.push(sh)
  a.rounds++
  assaultEmit('onFire', T, sh)
}
function explode(sim, x, y) {
  const a = assault
  for (const s of sim.sheep) {
    if (s.down || s.through) continue
    const dx = s.pos.x - x, dy = s.pos.y - y, d = Math.hypot(dx, dy)
    if (d <= BLAST.kill) {
      s.down = true; s.vel = { x: 0, y: 0 }; s.stress = 1; s.trot = false
      sim.injuries++; a.dead++; a.killed.add(s); a.stunned.delete(s); a.panicked.delete(s)
    } else if (d <= BLAST.stun) {
      a.stunned.set(s, { left: BLAST.stunFor, x: s.pos.x, y: s.pos.y }); a.panicked.delete(s)
    } else if (d <= BLAST.panic && !a.stunned.has(s)) {
      a.panicked.set(s, { left: BLAST.panicFor, dx: dx / d, dy: dy / d, power: 1 - 0.5 * (d - BLAST.stun) / (BLAST.panic - BLAST.stun) })
    }
  }
  assaultEmit('onBlast', x, y)
}
