'use strict'
// ============================================================================
// lib/sheep-score-ui.js — the count-up score's FACE (POC-v14). [throwaway — DOM]
//   Shared by every page, so the three of them cannot drift apart:
//     · the score badge over the stage (points, live stream multiplier, par / wave clock)
//     · the pops — a floating label where each scoring event happened (SC7)
//     · the tally card that counts up line by line when the run ends (SC8–SC10)
//     · saved bests per exact course, in localStorage (RM1–RM3)
//     · the `daily` and `waves` buttons beside the dog pad (RM4, RM5)
//   The sim (lib/sheep-sim.js) owns every number: this file only READS
//   sim.score() and drains sim.scoreEvents. Needs lib/sheep-sim.js and
//   lib/sheep-gui.js first (params, SETTINGS, getParam, HOOKS, guis) and the
//   page's #card element. A page calls, once `sim` exists:
//     ScoreUI.init({ page, stage, project, setSeed, newCourse, restart })
//       page      — 'pasture-2d' | 'pasture-3d' | 'assault-3d' (part of the best-score key)
//       badge     — where the badge sits if not top-centre: 'left' (the 2D canvas draws its stress meter in the centre) or 'low' (under the 3D pages' camera bar)
//       stage     — the positioned element the badge / pops / card sit in
//       project   — (x, y) in sim px → { x, y } in stage px, or null when off-view
//       setSeed   — (seed) re-lay that course (the page's own action)
//       newCourse — () a fresh random course · restart — () replay this one
//   then ScoreUI.frame(sim) every frame, and prints ScoreUI.hud(sim) in its HUD.
// ============================================================================
const ScoreUI = (() => {
  const CSS = `
  #score-badge { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); z-index: 6; pointer-events: none;
    display: flex; align-items: baseline; gap: 10px; padding: 4px 14px 5px; border-radius: 6px; white-space: nowrap;
    background: rgba(16, 20, 24, 0.78); border: 1px solid #37424c; color: #e6edf3; font: 600 13px/1.2 ui-monospace, Menlo, monospace; }
  #score-badge.left { left: 64px; transform: none; }
  #score-badge.low { top: 44px; }
  #score-badge .pts { font-size: 24px; font-weight: 700; color: #7fd79a; min-width: 3ch; text-align: right; }
  #score-badge .mult { font-size: 16px; color: #ffd24a; min-width: 2.2ch; visibility: hidden; }
  #score-badge .mult.live { visibility: visible; }
  #score-badge .mult.bump { animation: su-bump 0.25s ease-out; }
  #score-badge .sub { font-size: 12px; font-weight: 400; color: #9fb0c0; }
  #score-badge .sub.over, #score-badge .sub.low { color: #e08a8a; }
  #score-badge .best { font-size: 11px; font-weight: 400; color: #7b8894; }
  @keyframes su-bump { from { transform: scale(1.7); } to { transform: scale(1); } }
  #score-pops { position: absolute; inset: 0; z-index: 6; overflow: hidden; pointer-events: none; }
  #score-pops .pop { position: absolute; left: 0; top: 0; white-space: nowrap; will-change: transform, opacity;
    font: 700 15px/1 ui-monospace, Menlo, monospace; color: #ffffff; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.9); }
  #score-pops .pop.m2 { color: #ffe9a6; font-size: 17px; }
  #score-pops .pop.m3 { color: #ffd24a; font-size: 19px; }
  #score-pops .pop.m4 { color: #ffb02e; font-size: 22px; }
  #score-pops .pop.gate { color: #9fd0ff; }
  #score-pops .pop.wolf { color: #ff9a8a; }
  #score-pops .pop.big { color: #7fd79a; font-size: 20px; letter-spacing: 0.04em; }
  #card.score-card { min-width: 340px; z-index: 8; user-select: none; }
  #card.score-card .stars { font-size: 26px; letter-spacing: 6px; color: #3a4650; margin: 2px 0 0; }
  #card.score-card .stars b { color: #ffd24a; font-weight: 400; }
  #card.score-card .stars.wave { font-size: 14px; letter-spacing: 0; color: #9fb0c0; }
  #card.score-card .big { margin-bottom: 8px; }
  #card.score-card .row { opacity: 0; transition: opacity 0.15s; }
  #card.score-card .row.on { opacity: 1; }
  #card.score-card .row span:last-child { color: #7fd79a; font-variant-numeric: tabular-nums; }
  #card.score-card .awards { margin-top: 8px; font-size: 12px; color: #ffd24a; opacity: 0; transition: opacity 0.3s; }
  #card.score-card .best { margin-top: 8px; font-size: 12px; color: #9fb0c0; opacity: 0; transition: opacity 0.3s; }
  #card.score-card .best.new { color: #7fd79a; font-weight: 700; }
  #card.score-card.done .awards, #card.score-card.done .best { opacity: 1; }
  #controls .aux button.mode.active { background: #2f5d3a; border-color: #4c8a5e; color: #eafaef; }
  `
  const fmt = (n) => Math.round(n).toLocaleString('en-US')
  const clock = (s) => { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const now = () => performance.now() / 1000

  // ---- bests (RM1–RM3) ------------------------------------------------------
  // One localStorage entry holding { courseKey: { total, stars, wave, date } }.
  // Every access is guarded: a browser that refuses storage just shows no best.
  const STORE = 'sheep.best.v1'
  // settings that pick WHICH course is played (they are part of the key or drawn from the seed) — everything else must be at its load-time default for a best to count (owner Q87)
  const EXEMPT = new Set(['goal', 'seed', 'randomSeedOnLoad', 'sheepCount', 'mode', 'obstacleFreq', 'obstacleRandom', 'spawnLayout'])
  const snap = (e) => JSON.stringify(getParam(e.key))
  const DEFAULTS = {}
  for (const e of SETTINGS) if (!e.key.startsWith('debug.') && !EXEMPT.has(e.key)) DEFAULTS[e.key] = snap(e)
  function tuned() {
    for (const e of SETTINGS) if (e.key in DEFAULTS && snap(e) !== DEFAULTS[e.key]) return true
    return false
  }
  function readBests() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {} } catch (err) { return null } }
  function writeBests(b) { try { localStorage.setItem(STORE, JSON.stringify(b)); return true } catch (err) { return false } }
  function courseKey(sim) {
    const flock = params.mode === 'waves' ? params.waveSheepStart : sim.sheep.length
    return [S.page, params.mode, sim.seed, sim.layout0, flock, sim.obstacleGroups0].join('|')
  }
  function bestFor(sim) { const b = readBests(); return b ? b[courseKey(sim)] || null : null }

  // ---- daily seed (RM4) -----------------------------------------------------
  function dailySeed() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() } // local date (owner Q88)
  const DAILY_KEYS = ['sheepCount', 'obstacleRandom', 'obstacleFreq', 'spawnLayout']
  function syncGui(keys) {
    if (typeof guis === 'undefined') return
    for (const r of guis.roots) for (const c of r.controllersRecursive()) if (c._setting && keys.includes(c._setting.key)) c.updateDisplay()
  }
  function enterDaily() {
    if (!S.saved) { S.saved = {}; for (const k of DAILY_KEYS) S.saved[k] = params[k] }
    const seed = dailySeed(), rnd = makePRNG((seed ^ 0x6d2b79f5) >>> 0)
    params.mode = 'daily'
    params.sheepCount = 20 + 10 * Math.floor(rnd() * 5)   // the day's flock size, drawn from the date: 20–60
    params.obstacleRandom = true; params.spawnLayout = 'random' // …as are its obstacles and layout
    S.lastMode = 'daily'
    syncGui(DAILY_KEYS.concat('mode'))
    S.opts.setSeed(seed)
  }
  function leaveDaily() {
    if (S.saved) { for (const k of DAILY_KEYS) params[k] = S.saved[k]; S.saved = null }
    if (params.mode === 'daily') params.mode = 'course'
    S.lastMode = params.mode
    syncGui(DAILY_KEYS.concat('mode'))
  }
  function setMode(mode) {
    if (mode === params.mode) mode = 'course'           // the buttons toggle
    if (mode === 'daily') return enterDaily()
    const wasDaily = params.mode === 'daily'
    leaveDaily()
    params.mode = mode; S.lastMode = mode
    syncGui(['mode'])
    if (wasDaily) S.opts.newCourse(); else S.opts.setSeed(params.seed)
  }

  // ---- state ----------------------------------------------------------------
  const S = { opts: null, page: 'page', run: null, pops: [], bonusAt: 0, slot: 0, smallAt: 0, smallSlot: 0, card: null, anim: null, lastMode: null, saved: null, lastMult: 1 }
  let badge, ptsEl, multEl, subEl, bestEl, popLayer, btnDaily, btnWaves

  function init(opts) {
    S.opts = opts; S.page = opts.page || 'page'; S.lastMode = params.mode
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st)
    badge = document.createElement('div'); badge.id = 'score-badge'
    if (opts.badge) badge.className = opts.badge
    badge.innerHTML = '<span class="pts">0</span><span class="mult">×1</span><span class="sub"></span><span class="best"></span>'
    popLayer = document.createElement('div'); popLayer.id = 'score-pops'
    opts.stage.appendChild(popLayer); opts.stage.appendChild(badge)
    ptsEl = badge.querySelector('.pts'); multEl = badge.querySelector('.mult'); subEl = badge.querySelector('.sub'); bestEl = badge.querySelector('.best')
    S.card = document.getElementById('card')
    S.card.classList.add('score-card')
    S.card.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-card]')
      if (!b) return skip()                               // a click anywhere on the card skips the count-up
      if (b.dataset.card === 'again') { if (params.mode === 'daily') setMode('course'); else opts.newCourse() }
      else if (b.dataset.card === 'replay') opts.restart()
      else S.card.style.display = 'none'                  // dismiss: look at the field (the card does not pop back up)
    })
    window.addEventListener('keydown', () => { if (S.anim && !S.anim.done) skip() }, true)
    const aux = document.querySelector('#controls .aux')
    if (aux) {
      const mk = (label, title, mode) => {
        const b = document.createElement('button'); b.className = 'mode'; b.textContent = label; b.title = title
        b.addEventListener('click', () => { setMode(mode); b.blur() })
        aux.appendChild(b); return b
      }
      btnDaily = mk('daily ☀', 'today\'s course — the same one all day, with its own best score. Click again to go back to random courses', 'daily')
      btnWaves = mk('waves ∞', 'wave mode — a countdown clock, a little time for every sheep penned, and a new larger flock each time the pen fills. Click again to leave', 'waves')
    }
  }

  // ---- pops (SC7) -----------------------------------------------------------
  function addPop(ev) {
    const el = document.createElement('div')
    const big = ev.kind !== 'pen' && !(ev.kind === 'gate' && ev.label[0] === '+')
    el.className = 'pop' + (big ? ' big' : '') + (ev.kind === 'gate' ? ' gate' : '') + (ev.kind === 'wolf' ? ' wolf' : '') + (ev.mult > 1 ? ' m' + Math.min(4, ev.mult) : '')
    el.textContent = ev.label
    el.style.opacity = '0'
    popLayer.appendChild(el)
    const t = now()
    let start = t, oy = 0
    if (big) {                                            // end-of-run bonuses arrive in one tick → read them one after another, stacked
      if (t > S.bonusAt + 1.5) S.slot = 0
      start = Math.max(t, S.bonusAt); S.bonusAt = start + 0.3
      oy = 24 * S.slot++
    }
    else {                                                // several sheep through in the same moment → fan the labels up instead of piling them
      if (t > S.smallAt + 0.3) S.smallSlot = 0
      S.smallAt = t; oy = 17 * (S.smallSlot++ % 6)
    }
    S.pops.push({ el, x: ev.x, y: ev.y, start, oy, life: big ? 2.6 : 1.3, rise: big ? 26 : 44, dx: big ? 0 : (Math.random() - 0.5) * 30 })
    if (S.pops.length > 60) { const old = S.pops.shift(); old.el.remove() }
  }
  function stepPops() {
    const t = now()
    for (let i = S.pops.length - 1; i >= 0; i--) {
      const p = S.pops[i], u = (t - p.start) / p.life
      if (u >= 1) { p.el.remove(); S.pops.splice(i, 1); continue }
      if (u < 0) continue
      const at = S.opts.project(p.x, p.y)
      if (!at) { p.el.style.opacity = '0'; continue }
      const e = 1 - (1 - u) * (1 - u)
      p.el.style.opacity = String(u < 0.7 ? 1 : (1 - u) / 0.3)
      p.el.style.transform = `translate(-50%, -50%) translate(${(at.x + p.dx).toFixed(1)}px, ${(at.y - 14 - p.oy - p.rise * e).toFixed(1)}px) scale(${(u < 0.12 ? 0.6 + u / 0.12 * 0.5 : 1.1 - Math.min(0.1, (u - 0.12))).toFixed(3)})`
    }
  }

  // ---- tally card (SC8–SC10, RM1) --------------------------------------------
  function showCard(sim) {
    const sc = sim.score(), waves = sc.mode === 'waves'
    const lostAny = sim.sheep.some((s) => s.lost), allLost = sim.sheep.length > 0 && sim.sheep.every((s) => s.lost)
    const title = waves ? 'Time! ⏱' : sc.won ? (lostAny ? 'Survivors penned 🐑' : 'Penned! 🐑') : allLost ? 'Flock lost 🐺' : 'Run finished'
    // best: compare, then save (only an untuned run may set one — owner Q87)
    let bestHtml = '', bestClass = 'best'
    const isTuned = tuned(), bests = readBests()
    if (bests) {
      const key = courseKey(sim), old = bests[key]
      const what = sc.mode === 'daily' ? 'daily best' : 'best'
      if (isTuned) bestHtml = (old ? `${what} ${fmt(old.total)} · ` : '') + 'tuned — not saved'
      else if (!old || sc.total > old.total) {
        if (sc.total > 0) {
          bests[key] = { total: sc.total, stars: sc.stars, wave: sc.wave, date: new Date().toISOString().slice(0, 10) }
          const saved = writeBests(bests)
          bestHtml = saved ? (old ? `New best! (was ${fmt(old.total)})` : 'New best!') : ''
          if (saved) bestClass += ' new'
        }
      } else bestHtml = `${what} ${fmt(old.total)}`
    }
    const stars = waves ? `<div class="stars wave">${sc.wave} wave${sc.wave === 1 ? '' : 's'} cleared</div>`
      : `<div class="stars">${[1, 2, 3].map((i) => (i <= sc.stars ? '<b>★</b>' : '☆')).join('')}</div>`
    const flock = waves ? `${sc.raw.crossings} penned` : `penned ${sc.penned}/${sim.sheep.length}`
    const par = waves ? '' : ` · par ${sc.par.toFixed(0)}s`
    S.card.innerHTML =
      `<h2>${title}</h2>` + stars +
      `<div class="big">0</div>` +
      sc.lines.map((l) => `<div class="row"><span>${esc(l.label)}</span><span>+0</span></div>`).join('') +
      `<div class="awards">${sc.awards.length ? '🏅 ' + sc.awards.map(esc).join(' · ') : ''}</div>` +
      `<div class="${bestClass}">${esc(bestHtml)}</div>` +
      `<div class="foot">${flock} · time ${sc.raw.t.toFixed(0)}s${par} · ${sc.raw.commands} commands${sc.raw.injuries ? ` · ${sc.raw.injuries} ${lostAny ? 'lost' : 'injured'}` : ''}</div>` +
      `<div class="actions"><button data-card="dismiss" title="close this card and look at the field">dismiss</button>` +
      `<button data-card="replay" title="play this same course again (R)">replay</button>` +
      `<button data-card="again" class="primary" title="draw a brand-new random course — new gate, flock, layout and obstacles">play again</button></div>`
    S.card.classList.remove('done')
    S.card.style.display = 'block'
    S.anim = { lines: sc.lines, total: sc.total, rows: Array.from(S.card.querySelectorAll('.row')), big: S.card.querySelector('.big'), t0: now(), per: 0.55, done: false }
    if (!S.anim.rows.length) skip()
  }
  function stepCard() {
    const a = S.anim
    if (!a || a.done) return
    const t = now() - a.t0
    let sum = 0
    a.lines.forEach((l, i) => {
      const u = Math.max(0, Math.min(1, (t - i * a.per) / (a.per * 0.8)))
      if (u > 0) a.rows[i].classList.add('on')
      const v = Math.round(l.points * u)
      a.rows[i].lastChild.textContent = '+' + fmt(v)
      sum += v
    })
    a.big.textContent = fmt(sum)
    if (t >= a.lines.length * a.per) skip()
  }
  function skip() {
    const a = S.anim
    if (!a || a.done) return
    a.done = true
    a.lines.forEach((l, i) => { a.rows[i].classList.add('on'); a.rows[i].lastChild.textContent = '+' + fmt(l.points) })
    a.big.textContent = fmt(a.total)
    S.card.classList.add('done')
  }
  function hide() {
    if (S.card) S.card.style.display = 'none'
    S.anim = null
  }

  // ---- per frame ------------------------------------------------------------
  function frame(sim) {
    if (!S.opts) return
    // mode bookkeeping: `daily` means "today's seed" — picked from the dropdown it is entered properly; a typed / drawn seed leaves it
    if (params.mode !== S.lastMode) {
      if (params.mode === 'daily') enterDaily()
      else { const was = S.lastMode; leaveDaily(); if (was === 'daily' && sim.seed === dailySeed()) S.opts.newCourse() }
    } else if (params.mode === 'daily' && sim.seed !== dailySeed()) {
      leaveDaily(); HOOKS.respawn(); sim.setCommand('that_ll_do')
    }
    if (btnDaily) { btnDaily.classList.toggle('active', params.mode === 'daily'); btnWaves.classList.toggle('active', params.mode === 'waves') }
    if (sim.run !== S.run) {                               // a new run (reseed / reset): clear the board
      S.run = sim.run; S.shown = false; S.bonusAt = 0; S.slot = 0; S.lastMult = 1
      for (const p of S.pops) p.el.remove()
      S.pops.length = 0
      sim.layout0 = sim.layout; sim.obstacleGroups0 = sim.obstacleGroups // what the course STARTED as — a wave re-lays both, the best-score key must not move
      S.best = bestFor(sim)
      hide()
    }
    while (sim.scoreEvents.length) addPop(sim.scoreEvents.shift())
    stepPops()
    const sc = sim.score()
    ptsEl.textContent = fmt(sc.total)
    multEl.textContent = '×' + sc.combo
    multEl.classList.toggle('live', sc.combo > 1)
    if (sc.combo > S.lastMult) { multEl.classList.remove('bump'); void multEl.offsetWidth; multEl.classList.add('bump') }
    S.lastMult = sc.combo
    if (sc.mode === 'waves') {
      subEl.textContent = `⏱ ${clock(sc.clock)} · wave ${sc.wave + 1}`
      subEl.className = 'sub' + (sc.clock < 15 ? ' low' : '')
    } else {
      subEl.textContent = sc.parLeft >= 0 ? `par ${clock(sc.parLeft)}` : `over ${clock(-sc.parLeft)}`
      subEl.className = 'sub' + (sc.parLeft < 0 ? ' over' : '')
    }
    bestEl.textContent = S.best ? `${sc.mode === 'daily' ? 'daily best' : 'best'} ${fmt(S.best.total)}` : sc.mode === 'daily' ? 'daily ' + sim.seed : ''
    if (sim.run.finished && !S.shown) { S.shown = true; showCard(sim); S.best = bestFor(sim) }
    stepCard()
  }

  // the HUD's score line(s) — plain text for the debug box
  function hud(sim) {
    const sc = sim.score()
    const t = sc.mode === 'waves' ? `clock ${clock(sc.clock)}  wave ${sc.wave + 1}` : `time ${sc.raw.t.toFixed(0)}s  ${sc.parLeft >= 0 ? 'par −' + clock(sc.parLeft) : 'over +' + clock(-sc.parLeft)}`
    return `${t}\nscore ${fmt(sc.total)}${sc.combo > 1 ? '  ×' + sc.combo : ''}${S.best ? '  best ' + fmt(S.best.total) : ''}`
  }

  return { init, frame, hud, hide, skip, setMode, dailySeed, tuned, courseKey, bestFor, STORE }
})()
