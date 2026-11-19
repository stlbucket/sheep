// ============================================================================
// sheep-auto.js — the DEMO HANDLER (owner 2026-11-18). DOM-free, like sheep-sim.js.
//
//   An auto-handler that works the dog to the pen the way a player would: it only
//   ever calls sim.setCommand() with the same verbs + opts the pad sends, so the
//   pad's live highlight, the command count, Quiet Hand and every other rule see
//   an ordinary run. It reads the sim, it never moves a sheep or the dog itself.
//
//   NOT the "textbook run": that figure is a closed-form reference score
//   (FlockSim.referenceScore — every sheep penned calm in one chain), there is no
//   stored path behind it. This is a competent handler, not a perfect one.
//
//   Use:  const auto = new AutoHandler()
//         auto.step(sim, dt)   // once per sim tick, BEFORE sim.step(dt)
//         auto.reset()         // on a new course / a restart
//         auto.say             // one short line: what he is doing and why
//
//   The plan, top to bottom (first match wins), re-read every `think` seconds:
//     1 nothing left to work          → that'll do
//     2 a flank is running            → let it run; once he is square behind a gathered flock, cut it into the drive
//     3 the flock is strung out       → gather: flank round the back of it, to and fro, until it is one bunch
//     4 the dog is off the drive line → flank round to it, the short way (never across their front).
//                                       Walk-on is slower than a moving flock, so it cannot steer — the
//                                       little flanks are the steering, as they are for a real handler.
//     5 sheep are panicking           → lie down a moment
//     6 at the open pen               → easy
//     7 otherwise                     → walk on
//   "Behind" is always measured against sim.aim() — the pen, or on a competition
//   course the next gate — so the same plan runs both kinds of course.
// ============================================================================
const AUTO_DEFAULTS = {
  think: 0.05,        // s between decisions
  minHold: 0.6,       // s a command stands before the next one
  steerDeg: 22,       // dog further than this off the "behind" bearing → flank back onto the drive line
  steerDegFar: 34,    //   … the tolerance far from the objective (steerFar px and beyond); it narrows to steerDeg at steerNear
  steerNear: 140,
  steerFar: 420,
  cutDeg: 6,          // a steering flank is cut into the drive once he is this close to "behind"
  tightMin: 70,       // px — a flock is never asked to be tighter than this radius …
  tightK: 0.9,        //   … or than tightK × r_sep × √n (a bunch of n sheep)
  gatherOn: 2.4,      // spread (furthest sheep from the centre) above gatherOn × tight → gather
  gatherOff: 1.6,     //   … until it is back under gatherOff × tight
  noGatherFromPen: 200, // no gathering once the flock centre is this close to an open pen — the mouth does it
  flankTimeout: 40,   // s — a flank that never parks is abandoned
  panicMin: 1,        // this many sheep panicking at once → lie down
  panicDown: 2,       // s lying down after a panic …
  panicRest: 5,       //   … and at most once in this long
  easyFromPen: 240,   // flock centre within this of the open pen → easy (calm crossings pay)
  releaseFromPen: 130, // flock centre within this of the open pen → stop pressing and let them file in
  penCmd: 'lie_down', //   … with this command ('lie_down' | 'that_ll_do'; 'easy' = never release)
  penStall: 4,        // s with no sheep crossing before he presses again …
  penPress: 2,        //   … for this long
}

class AutoHandler {
  constructor(opts) { this.o = Object.assign({}, AUTO_DEFAULTS, opts || {}); this.reset() }

  reset() {
    this.thinkT = 0      // countdown to the next decision
    this.heldT = 1e9     // seconds since this plan's last command
    this.downT = 0       // seconds left of a lie-down
    this.restT = 0       // seconds until the next lie-down may be called
    this.gather = false  // gathering a strung-out flock (hysteresis)
    this.pennedSeen = -1 // sheep penned when the pen file was last seen to move
    this.stallT = 0      // seconds since a sheep last crossed (while releasing at the pen)
    this.pressT = 0      // seconds left of a press at the pen
    this.say = ''
    this.issued = 0
  }

  // the pad's own vocabulary: verb + opts (a repeat of the live command is a no-op here, not a re-issue)
  issue(sim, verb, opts, say) {
    const d = sim.dog
    this.say = say
    const same = d.command === verb && !!d.flankEasy === !!(opts && opts.easy) && (d.lieSide || 0) === ((opts && opts.side) || 0)
    if (same) return
    sim.setCommand(verb, opts || {})
    this.heldT = 0
    this.issued++
  }

  step(sim, dt) {
    this.heldT += dt
    this.thinkT -= dt
    if (this.downT > 0) this.downT -= dt
    if (this.restT > 0) this.restT -= dt
    this.stallT += dt
    if (this.pressT > 0) this.pressT -= dt
    if (this.thinkT > 0) return
    this.thinkT = this.o.think
    this.decide(sim)
  }

  decide(sim) {
    const o = this.o, p = sim.p, d = sim.dog, run = sim.run, RAD = Math.PI / 180
    const act = sim.sheep.filter((s) => !s.through && !s.down)
    // 1 — nothing left to work
    if (run.finished || !act.length) return this.issue(sim, 'that_ll_do', null, 'pen is full — that\'ll do')

    const g = sim.computeGCM(), G = sim.gate
    const ang = (a, b) => { let x = (a - b) % (Math.PI * 2); if (x > Math.PI) x -= Math.PI * 2; if (x < -Math.PI) x += Math.PI * 2; return x }
    const gate = sim.nextGate ? sim.nextGate() : null               // competition: the gate to take next
    const aim = sim.aim ? sim.aim() : p.goal
    const what = gate ? 'gate ' + gate.order : 'the pen'
    const behind = Math.atan2(g.y - aim.y, g.x - aim.x)             // bearing (from the flock centre) of the spot a driving dog works from
    const dogB = Math.atan2(d.pos.y - g.y, d.pos.x - g.x)
    const off = ang(dogB, behind)                                    // + = clockwise of "behind"
    const offAbs = Math.abs(off)
    const penDist = gate ? Infinity : Math.hypot(g.x - G.x, g.y - G.y)
    const objDist = gate ? Math.hypot(g.x - gate.x, g.y - gate.y) : penDist
    const flanking = d.command === 'come_by' || d.command === 'away'
    const name = (sign) => (sign > 0 ? 'come by' : 'away')

    // how strung out are they? (furthest sheep from the centre, against the radius of a bunch this size)
    let far = 0, farLat = 0, panics = 0
    const ax = Math.cos(behind), ay = Math.sin(behind)
    for (const s of act) {
      const dx = s.pos.x - g.x, dy = s.pos.y - g.y, r = Math.hypot(dx, dy)
      if (r > far) { far = r; farLat = dx * -ay + dy * ax }           // + = clockwise side
      if (s.panic) panics++
    }
    const tight = Math.max(o.tightMin, o.tightK * p.r_sep * Math.sqrt(act.length))
    // "at the pen" means the WHOLE working flock is: a centre that merely averages out over the mouth
    // (two bunches either side of it along the fence) still wants gathering
    const atPen = (reach) => penDist < reach && far < reach * 1.25
    this.gather = !atPen(o.noGatherFromPen) && far > (this.gather ? o.gatherOff : o.gatherOn) * tight

    const drive = () => {
      // at the open pen: once the flock is in the mouth's draw, take the pressure off and let them file in;
      // if the file dries up with sheep still out, press again for a moment
      if (atPen(o.releaseFromPen) && o.penCmd !== 'easy') {
        const penned = sim.sheep.length - act.length
        if (penned !== this.pennedSeen) { this.pennedSeen = penned; this.stallT = 0 }
        if (this.pressT > 0) return this.issue(sim, 'easy', null, 'the file has stopped — easy, press them on')
        if (this.stallT > o.penStall) { this.pressT = o.penPress; this.stallT = 0; return this.issue(sim, 'easy', null, 'the file has stopped — easy, press them on') }
        return this.issue(sim, o.penCmd, null, 'they are filing in — ' + (o.penCmd === 'lie_down' ? 'lie down' : 'that\'ll do') + ', let them walk')
      }
      if (atPen(o.easyFromPen)) return this.issue(sim, 'easy', null, 'at the pen — easy')
      // from easy, walk-on is the E3 shove (the sim resumes walk-on by itself if the shove got them moving) — the same tap a player gives
      if (d.command === 'easy') {
        if (d.impulse) { this.say = 'shove — get them moving'; return }
        sim.setCommand('walk_on'); this.heldT = 0; this.issued++; this.say = 'behind them — walk on to ' + what
        return
      }
      return this.issue(sim, 'walk_on', null, 'behind them — walk on to ' + what)
    }

    // 5 (checked first: it interrupts a flank) — panic: take the pressure off for a moment
    if (this.downT > 0) return this.issue(sim, 'lie_down', null, 'they are panicking — lie down')
    if (panics >= o.panicMin && this.restT <= 0 && !atPen(o.releaseFromPen)) { this.downT = o.panicDown; this.restT = o.panicDown + o.panicRest; return this.issue(sim, 'lie_down', null, 'they are panicking — lie down') }

    // 2 — a flank is running: it ends itself on the gate line (C9) …
    if (flanking && d.flankT < o.flankTimeout) {
      const sign = d.command === 'come_by' ? 1 : -1
      // … unless he is already square behind one bunch (or has just swept past square): cut it there
      if (!this.gather && !d.flankWaypoint && d.flankT > 0.3 && (offAbs < o.cutDeg * RAD || (sign * off > 0 && offAbs < 0.6))) return drive()
      this.say = name(sign) + (this.gather ? ' — gathering them' : ' — onto the line for ' + what)
      return
    }
    if (this.heldT < o.minHold) return

    // the short way round to "behind" — it never crosses the front of the flock
    const toBehind = offAbs > 2.9 ? (this.sweep(sim, 1, dogB, ang) <= this.sweep(sim, -1, dogB, ang) ? 1 : -1) : off > 0 ? -1 : 1
    const flank = (sign, say) => this.issue(sim, sign > 0 ? 'come_by' : 'away', null, say)

    // 3 — strung out: gather. From one end of the back he sweeps to the other; from behind, toward the far sheep.
    if (this.gather) {
      const sign = offAbs > 0.45 ? toBehind : farLat >= 0 ? 1 : -1
      return flank(sign, 'strung out — ' + name(sign) + ' to gather them')
    }
    // 4 — off the drive line: steer with a flank (tighter the nearer the objective)
    const u = Math.max(0, Math.min(1, (objDist - o.steerNear) / Math.max(1, o.steerFar - o.steerNear)))
    if (offAbs > (o.steerDeg + (o.steerDegFar - o.steerDeg) * u) * RAD) return flank(toBehind, 'off the line — ' + name(toBehind) + ' for ' + what)

    // 6 / 7 — drive
    return drive()
  }

  // how far round (radians) a flank of this sign has to go to reach its own station
  sweep(sim, sign, dogB, ang) {
    if (!sim.hull.length) return 0
    let pr = sign * ang(sim.gateLineBearing(sign, sim.p.perimeterMargin), dogB)
    if (pr < 0) pr += Math.PI * 2
    return pr
  }
}
