'use strict'
// ============================================================================
// lib/sheep-score-ui.js — the score's FACE (POC-v14, reworked POC-v15). [throwaway — DOM]
//   Shared by every page, so the three of them cannot drift apart:
//     · the HUD block in the stage's UPPER LEFT (VH1–VH3, VH6): the running total, the chain
//       meter with its window bar, the strike marks, the flock value, par / wave clock, the
//       course's side objectives
//     · the pops — a floating label where each scoring event happened, sized and coloured by
//       tier (VH4) — and the BANNERS across the stage for jackpots, strikes, cleared drive
//       gates and side objectives (VH5)
//     · the end card: rank, percent of the reference run, the count-up, each end multiplier,
//       four category grades, awards (VH7–VH9)
//     · records in localStorage: bests per exact course (RM1–RM3), the run history (RC1),
//       bests per flock-size band (RC2), the award / challenge collection (RC3)
//     · the `daily` and `waves` buttons beside the dog pad (RM4, RM5)
//   The sim (lib/sheep-sim.js) owns every number: this file only READS
//   sim.score() and drains sim.scoreEvents. Needs lib/sheep-sim.js and
//   lib/sheep-gui.js first (params, SETTINGS, getParam, HOOKS, guis, AWARDS,
//   JACKPOTS, SIDE_OBJECTIVES, SPECIAL_KINDS) and the page's #card element.
//   A page calls, once `sim` exists:
//     ScoreUI.init({ page, stage, project, setSeed, newCourse, restart, below })
//       page      — 'pasture-2d' | 'pasture-3d' | 'assault-3d' (part of every storage key)
//       stage     — the positioned element the HUD / pops / banners / card sit in
//       project   — (x, y) in sim px → { x, y } in stage px, or null when off-view
//       setSeed   — (seed) re-lay that course (the page's own action)
//       newCourse — () a fresh random course · restart — () replay this one
//       below     — optional element kept directly UNDER the HUD block (the 3D pages' camera bar)
//   then ScoreUI.frame(sim) every frame, and prints ScoreUI.hud(sim) in its HUD.
// ============================================================================
const ScoreUI = (() => {
  const CSS = `
  #score-hud { position: absolute; top: 8px; left: 8px; z-index: 6; pointer-events: none; min-width: 190px; max-width: 46%;
    padding: 6px 12px 8px; background: none; border: none; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 4px rgba(0, 0, 0, 0.6); /* no card (owner 2026-11-18: as on the phone) */
    color: #fff; font: 600 13px/1.25 ui-monospace, Menlo, monospace; }
  #score-hud .top { display: flex; align-items: baseline; gap: 12px; white-space: nowrap; }
  #score-hud .pts { font-size: 40px; font-weight: 800; line-height: 1; color: #7fd79a; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
  #score-hud .mult { font-size: 24px; font-weight: 800; color: #5d6a75; }
  #score-hud .mult.live { color: #ffd24a; }
  #score-hud .mult.frenzy { color: #ff7a3c; text-shadow: 0 0 10px rgba(255, 122, 60, 0.7); }
  #score-hud .mult.bump { animation: su-bump 0.25s ease-out; }
  #score-hud .frz { font-size: 12px; color: #ff7a3c; display: none; }
  #score-hud .frz.on { display: inline; }
  #score-hud .bar { height: 5px; margin: 5px 0 6px; background: rgba(255, 255, 255, 0.10); border-radius: 3px; overflow: hidden; }
  #score-hud .bar i { display: block; height: 100%; width: 0; background: #ffd24a; border-radius: 3px; }
  #score-hud .bar.frenzy i { background: #ff7a3c; }
  #score-hud .mid { display: flex; align-items: center; gap: 12px; white-space: nowrap; }
  #score-hud .strikes b { display: inline-block; width: 15px; height: 15px; margin-right: 4px; border-radius: 3px; border: 1px solid #55616c;
    color: transparent; font-size: 12px; line-height: 14px; text-align: center; font-weight: 800; }
  #score-hud .strikes b.on { background: #b3352b; border-color: #e0695d; color: #fff; }
  #score-hud .value { font-weight: 600; color: #cdd6df; }
  #score-hud .value small { font-size: 11px; font-weight: 400; color: #7b8894; margin-right: 4px; }
  #score-hud .value.falling { color: #ff6b5e; }
  #score-hud .sub { margin-top: 4px; font-size: 12px; font-weight: 400; color: #9fb0c0; white-space: nowrap; }
  #score-hud .sub .over, #score-hud .sub .low { color: #e08a8a; }
  #score-hud .sub .best { color: #7b8894; margin-left: 8px; }
  #score-hud .objs { margin: 5px 0 0; padding: 4px 0 0; list-style: none; border-top: 1px solid #2c353d; font-size: 12px; font-weight: 400; color: #cdd6df; }
  #score-hud .objs:empty { display: none; }
  /* no card behind the block → the greys go light so they read on grass (the phone rules, at full size) */
  #score-hud .mult { color: #cdd6df; }
  #score-hud .bar { background: rgba(0, 0, 0, 0.35); }
  #score-hud .strikes b { border-color: rgba(255, 255, 255, 0.7); }
  #score-hud .value, #score-hud .sub, #score-hud .objs, #score-hud .value small, #score-hud .sub .best { color: #fff; }
  #score-hud .objs { border-top: none; padding-top: 0; }
  #score-hud .objs li.met { color: #7fd79a; }
  #score-hud .objs li.lost { color: #6d7781; text-decoration: line-through; }
  @keyframes su-bump { from { transform: scale(1.7); } to { transform: scale(1); } }
  #score-pops { position: absolute; inset: 0; z-index: 6; overflow: hidden; pointer-events: none; }
  #score-pops .pop { position: absolute; left: 0; top: 0; white-space: nowrap; will-change: transform, opacity;
    font: 700 15px/1 ui-monospace, Menlo, monospace; color: #ffffff; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.9); }
  #score-pops .pop.rushed { color: #aab3bb; font-size: 13px; }
  #score-pops .pop.calm { color: #8be0a4; font-size: 18px; }
  #score-pops .pop.perfect { color: #ffd24a; font-size: 24px; }
  #score-pops .pop.frenzy { text-shadow: 0 0 8px rgba(255, 122, 60, 0.95), 0 1px 3px rgba(0, 0, 0, 0.9); }
  #score-pops .pop.gate { color: #9fd0ff; }
  #score-pops .pop.wolf { color: #ff9a8a; }
  #score-pops .pop.big { color: #7fd79a; font-size: 20px; letter-spacing: 0.04em; }
  /* per-sheep scores (owner 2026-11-18): not over the field — a short column under the HUD block, newest on top, sliding down and fading */
  #score-feed { position: absolute; left: 12px; top: 100%; margin: 2px 0 0; white-space: nowrap; }
  #score-feed div { height: 16px; font: 700 12px/16px ui-monospace, Menlo, monospace; color: #fff; animation: su-feed 2.4s linear forwards; }
  #score-feed .rushed { color: #aab3bb; font-size: 11px; }
  #score-feed .calm { color: #8be0a4; font-size: 13px; }
  #score-feed .perfect { color: #ffd24a; font-size: 15px; }
  #score-feed .frenzy { text-shadow: 0 0 8px rgba(255, 122, 60, 0.95), 0 1px 3px rgba(0, 0, 0, 0.9); }
  #score-feed .gate { color: #9fd0ff; }
  @keyframes su-feed { 0%, 45% { opacity: 1; } 100% { opacity: 0; } }
  #score-banner { position: absolute; left: 50%; top: max(27%, 150px); /* clear of the command flash under the 3D pages' camera row (lib/sheep-pad-ui.js) */ z-index: 7; pointer-events: none; transform: translate(-50%, -50%);
    padding: 10px 26px; border-radius: 8px; white-space: nowrap; text-align: center; opacity: 0;
    font: 800 30px/1.15 ui-monospace, Menlo, monospace; letter-spacing: 0.03em; color: #ffd24a;
    background: rgba(16, 20, 24, 0.86); border: 2px solid #ffd24a; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5); }
  #score-banner small { display: block; margin-top: 4px; font-size: 13px; font-weight: 400; letter-spacing: 0; color: #cdd6df; }
  #score-banner.strike { color: #ff6b5e; border-color: #ff6b5e; }
  #score-banner.bust { color: #fff; background: rgba(150, 30, 24, 0.94); border-color: #ff6b5e; font-size: 38px; }
  #score-banner.gate { color: #9fd0ff; border-color: #9fd0ff; }
  #score-banner.objective { font-size: 20px; color: #7fd79a; border-color: #4c8a5e; }
  #score-banner.objective.lost { color: #aab3bb; border-color: #55616c; }
  #score-banner.start { font-size: 16px; font-weight: 600; color: #e6edf3; border-color: #55616c; white-space: normal; max-width: 80%; }
  #score-banner.start b { color: #ffd24a; }
  #card.score-card { min-width: 380px; max-height: 92%; overflow-y: auto; z-index: 8; user-select: none; }
  #card.score-card .rank { font-size: 26px; font-weight: 800; color: #ffd24a; margin: 2px 0 0; letter-spacing: 0.01em; }
  #card.score-card .rank.bust { color: #ff6b5e; }
  #card.score-card .rank.wave { font-size: 14px; font-weight: 400; color: #9fb0c0; }
  #card.score-card .pct { font-size: 12px; color: #9fb0c0; margin: 2px 0 6px; }
  #card.score-card .pct b { color: #e6edf3; }
  #card.score-card .big { margin-bottom: 8px; }
  #card.score-card .row { opacity: 0; transition: opacity 0.15s; }
  #card.score-card .row.on { opacity: 1; }
  #card.score-card .row span:last-child { color: #7fd79a; font-variant-numeric: tabular-nums; }
  #card.score-card .row.mrow { border-top: none; padding: 1px 0 1px 16px; font-size: 12px; color: #9fb0c0; }
  #card.score-card .row.mrow span:last-child { color: #ffd24a; }
  #card.score-card .grades { display: flex; gap: 6px; margin-top: 10px; opacity: 0; transition: opacity 0.3s; }
  #card.score-card .grades div { flex: 1; text-align: center; padding: 5px 0 6px; border: 1px solid #2c353d; border-radius: 4px; font-size: 11px; color: #9fb0c0; }
  #card.score-card .grades b { display: block; font-size: 22px; line-height: 1.1; color: #e6edf3; }
  #card.score-card .grades b.gA { color: #7fd79a; } #card.score-card .grades b.gB { color: #b6dd8a; } #card.score-card .grades b.gC { color: #ffd24a; }
  #card.score-card .grades b.gD { color: #ffb02e; } #card.score-card .grades b.gE { color: #ff8a5c; } #card.score-card .grades b.gF { color: #ff6b5e; }
  #card.score-card .awards { margin-top: 8px; font-size: 12px; color: #cdd6df; opacity: 0; transition: opacity 0.3s; line-height: 1.6; }
  #card.score-card .awards .rare { color: #9fd0ff; } #card.score-card .awards .legendary { color: #ffd24a; font-weight: 700; }
  #card.score-card .awards .new { color: #7fd79a; font-weight: 700; }
  #card.score-card .best { margin-top: 8px; font-size: 12px; color: #9fb0c0; opacity: 0; transition: opacity 0.3s; }
  #card.score-card .best.new { color: #7fd79a; font-weight: 700; }
  #card.score-card.done .awards, #card.score-card.done .best, #card.score-card.done .grades { opacity: 1; }
  #card.score-card .actions { flex-wrap: wrap; }
  #controls .aux button.mode.active { background: #2f5d3a; border-color: #4c8a5e; color: #eafaef; }
  #score-panel { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9; width: min(640px, 92%); max-height: 88%;
    overflow-y: auto; padding: 16px 20px; box-sizing: border-box; background: rgba(16, 20, 24, 0.98); border: 1px solid #3a4650; border-radius: 8px;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6); color: #cdd6df; font: 12px/1.45 ui-monospace, Menlo, monospace; }
  #score-panel h2 { margin: 0 0 10px; font-size: 16px; color: #e6edf3; display: flex; justify-content: space-between; align-items: center; }
  #score-panel h2 button { font: inherit; font-size: 12px; color: #cdd6df; background: #232b32; border: 1px solid #37424c; border-radius: 999px; padding: 3px 10px; cursor: pointer; }
  #score-panel h3 { margin: 12px 0 4px; font-size: 11px; font-weight: 400; color: #7b8894; text-transform: uppercase; letter-spacing: 0.08em; }
  #score-panel table { width: 100%; border-collapse: collapse; }
  #score-panel th { text-align: left; font-weight: 400; color: #7b8894; padding: 2px 6px 4px 0; }
  #score-panel td { padding: 3px 6px 3px 0; border-top: 1px solid #232b32; white-space: nowrap; }
  #score-panel td.num, #score-panel th.num { text-align: right; font-variant-numeric: tabular-nums; }
  #score-panel tr.top td { color: #7fd79a; }
  #score-panel tr.tuned td { color: #6d7781; }
  #score-panel .items { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 4px 12px; }
  #score-panel .item { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
  #score-panel .item.none { color: #4f5962; }
  #score-panel .item .rare { color: #9fd0ff; } #score-panel .item .legendary { color: #ffd24a; }
  #score-panel .item.none .rare, #score-panel .item.none .legendary { color: #4f5962; }
  #score-panel .empty { color: #7b8894; padding: 8px 0; }
  @media (pointer: coarse) and (max-height: 600px) {
    #score-hud { padding: 0; min-width: 110px; font-size: 10px; background: none; border: none; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 4px rgba(0, 0, 0, 0.6); }
    #score-hud .pts { font-size: 20px; } #score-hud .mult { font-size: 14px; color: #cdd6df; }
    #score-hud .bar { height: 3px; margin: 3px 0 4px; background: rgba(0, 0, 0, 0.35); }
    #score-hud .strikes b { width: 11px; height: 11px; font-size: 9px; line-height: 10px; margin-right: 3px; border-color: rgba(255, 255, 255, 0.7); }
    #score-hud .value, #score-hud .sub, #score-hud .objs, #score-hud .value small, #score-hud .sub .best { color: #fff; }
    #score-hud .sub, #score-hud .objs { font-size: 9px; margin-top: 2px; }
    #score-hud .objs { border-top: none; padding-top: 0; }
    /* end card on a phone: almost the whole stage, two columns (verdict left, the bonus lines right, run facts + buttons along the bottom) — nothing to scroll */
    #card.score-card { top: 5px; right: 5px; bottom: 5px; left: 5px; transform: none; min-width: 0; max-height: none; padding: 8px 14px; box-sizing: border-box; }
    #card.score-card .sc-grid { display: grid; height: 100%; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: "head lines" "tail lines" "bottom bottom"; column-gap: 18px; }
    #card.score-card .sc-head { grid-area: head; } #card.score-card .sc-tail { grid-area: tail; min-height: 0; overflow: hidden; }
    #card.score-card .sc-lines { grid-area: lines; min-height: 0; overflow-y: auto; align-self: center; max-height: 100%; }
    #card.score-card .sc-bottom { grid-area: bottom; display: flex; align-items: center; gap: 14px; margin-top: 6px; }
    #card.score-card .actions { flex: 0 0 auto; margin-top: 0; flex-wrap: nowrap; gap: 5px; }
    #card.score-card .actions button { padding: 3px 8px; font-size: 10px; white-space: nowrap; }
    #card.score-card h2 { font-size: 13px; margin: 0; }
    #card.score-card .rank { font-size: 18px; margin: 0; } #card.score-card .rank.wave { font-size: 11px; }
    #card.score-card .pct { font-size: 10px; margin: 1px 0 2px; }
    #card.score-card .big { font-size: 28px; line-height: 1.05; margin-bottom: 0; }
    #card.score-card .row { font-size: 10px; line-height: 1.25; padding: 1px 0; gap: 12px; }
    #card.score-card .row.mrow { font-size: 9px; padding: 0 0 0 12px; }
    #card.score-card .grades { margin-top: 5px; gap: 4px; } #card.score-card .grades div { padding: 2px 0 3px; font-size: 9px; } #card.score-card .grades b { font-size: 15px; }
    #card.score-card .awards { margin-top: 4px; font-size: 10px; line-height: 1.35; }
    #card.score-card .best { margin-top: 3px; font-size: 10px; } #card.score-card .foot { flex: 1 1 0; min-width: 0; margin-top: 0; font-size: 9px; line-height: 1.3; }
    #score-banner { font-size: 20px; padding: 6px 14px; } #score-banner.bust { font-size: 24px; }
  }
  `
  const fmt = (n) => Math.round(n).toLocaleString('en-US')
  const clock = (s) => { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const now = () => performance.now() / 1000
  const pct = (f) => { const v = f * 100; return (v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(0) : v.toFixed(1)) + ' %' }
  const today = () => new Date().toISOString().slice(0, 10)

  // ---- storage (RM1–RM3, RC1–RC4) --------------------------------------------
  // Every access is guarded: a browser that refuses storage just shows nothing saved.
  const STORE = 'sheep.best.v1'
  const readJSON = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v === null || typeof v !== 'object' ? fallback : v } catch (err) { return null } }
  const writeJSON = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); return true } catch (err) { return false } }
  // settings that pick WHICH course is played (they are part of the key or drawn from the seed) — everything else must be at its load-time default for a best to count (owner Q87)
  const EXEMPT = new Set(['goal', 'seed', 'randomSeedOnLoad', 'sheepCount', 'mode', 'obstacleFreq', 'obstacleRandom', 'spawnLayout'])
  const snap = (e) => JSON.stringify(getParam(e.key))
  const DEFAULTS = {}
  for (const e of SETTINGS) if (!e.key.startsWith('debug.') && !EXEMPT.has(e.key)) DEFAULTS[e.key] = snap(e)
  function tuned() {
    for (const e of SETTINGS) if (e.key in DEFAULTS && snap(e) !== DEFAULTS[e.key]) return true
    return false
  }
  function readBests() { return readJSON(STORE, {}) }
  function writeBests(b) { return writeJSON(STORE, b) }
  function courseKey(sim) {
    const flock = params.mode === 'waves' ? params.waveSheepStart : sim.sheep.length
    return [S.page, params.mode, sim.seed, sim.layout0, flock, sim.obstacleGroups0].join('|')
  }
  function bestFor(sim) { const b = readBests(); return b ? b[courseKey(sim)] || null : null }

  // RC1–RC3: one entry each per page, versioned (`v`) so a later shape change discards instead of misreading.
  const K = { history: () => 'sheep.history.v1.' + S.page, band: () => 'sheep.bandBest.v1.' + S.page, collection: () => 'sheep.collection.v1.' + S.page }
  const readHistory = () => { const h = readJSON(K.history(), { v: 1, runs: [] }); return h && h.v === 1 && Array.isArray(h.runs) ? h.runs : h === null ? null : [] }
  const readBand = () => { const b = readJSON(K.band(), { v: 1, best: {} }); return b && b.v === 1 && b.best ? b.best : b === null ? null : {} }
  const readCollection = () => { const c = readJSON(K.collection(), { v: 1, n: {} }); return c && c.v === 1 && c.n ? c.n : c === null ? null : {} }
  const bandOf = (n) => (n <= params.bandSmallMax ? 'small' : n <= params.bandMediumMax ? 'medium' : 'large')
  const flockOf = (sim) => (params.mode === 'waves' ? params.waveSheepStart : sim.sheep.length)

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
  const S = { opts: null, page: 'page', run: null, pops: [], flashes: new Map(), feedNew: 0, bonusAt: 0, slot: 0, smallAt: 0, smallSlot: 0, card: null, anim: null, lastMode: null, saved: null, lastMult: 1,
    banners: [], banner: null, bannerLog: [], hudH: -1, objSig: '', record: null } // bannerLog: the text of every banner shown, newest last (read by the page tests)
  let feedEl, hudEl, ptsEl, multEl, frzEl, barEl, barFill, strikesEl, valueEl, subEl, objsEl, popLayer, bannerEl, panelEl, btnDaily, btnWaves

  function init(opts) {
    S.opts = opts; S.page = opts.page || 'page'; S.lastMode = params.mode
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st)
    hudEl = document.createElement('div'); hudEl.id = 'score-hud'
    hudEl.innerHTML = '<div class="top"><span class="pts">0</span><span class="mult">×1</span><span class="frz"></span></div>' +
      '<div class="bar"><i></i></div>' +
      '<div class="mid"><span class="strikes"></span><span class="value"></span></div>' +
      '<div class="sub"></div><ul class="objs"></ul>'
    popLayer = document.createElement('div'); popLayer.id = 'score-pops'
    feedEl = document.createElement('div'); feedEl.id = 'score-feed'; hudEl.appendChild(feedEl)
    bannerEl = document.createElement('div'); bannerEl.id = 'score-banner'
    panelEl = document.createElement('div'); panelEl.id = 'score-panel'
    opts.stage.appendChild(popLayer); opts.stage.appendChild(hudEl); opts.stage.appendChild(bannerEl); opts.stage.appendChild(panelEl)
    const q = (sel) => hudEl.querySelector(sel)
    ptsEl = q('.pts'); multEl = q('.mult'); frzEl = q('.frz'); barEl = q('.bar'); barFill = q('.bar i'); strikesEl = q('.strikes'); valueEl = q('.value'); subEl = q('.sub'); objsEl = q('.objs')
    S.card = document.getElementById('card')
    S.card.classList.add('score-card')
    S.card.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-card]')
      if (!b) return skip()                               // a click anywhere on the card skips the count-up
      const what = b.dataset.card
      if (what === 'again') { if (params.mode === 'daily') setMode('course'); else opts.newCourse() }
      else if (what === 'replay') opts.restart()
      else if (what === 'history') showHistory()
      else if (what === 'collection') showCollection()
      else { S.card.style.display = 'none'; closed(true) } // dismiss: look at the field (the card does not pop back up — the `scoring` button brings it back)
    })
    panelEl.addEventListener('click', (ev) => { if (ev.target.closest('button[data-panel="close"]')) closePanel() })
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && panelEl.style.display === 'block') { closePanel(); return }
      if (S.anim && !S.anim.done) skip()
    }, true)
    const aux = document.querySelector('#center-stack .aux, #controls .aux') // 3D pages: the centre stack's middle row; 2D: the row under the pad
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

  // ---- pops (SC7, VH4) ------------------------------------------------------
  const FEED_ROWS = 8, FLASH_SECS = 0.9, FLASH_OUT = { r: 0, g: 0, b: 0, k: 0 }
  const FLASH_RGB = { rushed: [150, 160, 170], calm: [70, 220, 120], perfect: [255, 200, 40], gate: [90, 170, 255] } // a shade stronger than the text colours: they have to show on white wool
  const BANNER_KINDS = new Set(['strike', 'file', 'finisher', 'onego', 'objective']) // no centre banner for a frenzy (owner 2026-11-18): the meter and its timer turn orange, the crossings still pay double
  function addPop(ev, sim) {
    const el = document.createElement('div')
    const big = ev.kind !== 'pen' && !(ev.kind === 'gate' && ev.label[0] === '+')
    el.className = 'pop' + (big ? ' big' : '') + (ev.kind === 'gate' ? ' gate' : '') + (ev.kind === 'wolf' ? ' wolf' : '') + (ev.tier ? ' ' + ev.tier : '') + (ev.frenzy ? ' frenzy' : '')
    el.textContent = ev.label
    const t = now()
    if (!big) {                                           // one sheep's score: flash the sheep, list the number in the column
      const tier = ev.kind === 'gate' ? 'gate' : ev.tier || 'calm'
      const s = sim.sheep[ev.i]
      if (s) S.flashes.set(s, { rgb: FLASH_RGB[tier] || FLASH_RGB.calm, start: t })
      el.className = tier + (ev.frenzy ? ' frenzy' : '')
      el.addEventListener('animationend', () => el.remove())
      feedEl.prepend(el)
      while (feedEl.children.length > FEED_ROWS) feedEl.lastChild.remove()
      S.feedNew++
      return
    }
    el.style.opacity = '0'
    popLayer.appendChild(el)
    let start = t, oy = 0
    if (big) {                                            // end-of-run bonuses arrive in one tick → read them one after another, stacked
      if (t > S.bonusAt + 1.5) S.slot = 0
      start = Math.max(t, S.bonusAt); S.bonusAt = start + 0.3
      oy = 24 * S.slot++
    }
    S.pops.push({ el, x: ev.x, y: ev.y, start, oy, life: big ? 2.6 : ev.tier === 'perfect' ? 1.7 : 1.3, rise: big ? 26 : 44, dx: big ? 0 : (Math.random() - 0.5) * 30 })
    if (S.pops.length > 60) { const old = S.pops.shift(); old.el.remove() }
  }
  // the column slides: rows that arrived this frame push the rest down, eased rather than jumped
  function stepFeed() {
    if (!S.feedNew) return
    const n = Math.min(S.feedNew, FEED_ROWS); S.feedNew = 0
    feedEl.style.transition = 'none'; feedEl.style.transform = `translateY(${-16 * n}px)`
    void feedEl.offsetHeight
    feedEl.style.transition = 'transform 0.22s ease-out'; feedEl.style.transform = 'translateY(0)'
  }
  // a sheep that has just scored blinks in its score's colour: null, or { r, g, b (0–255), k (0–1 blend) } for the page's sheep painter
  function flash(s) {
    const f = S.flashes.get(s)
    if (!f) return null
    const u = (now() - f.start) / FLASH_SECS
    if (u >= 1) { S.flashes.delete(s); return null }
    FLASH_OUT.r = f.rgb[0]; FLASH_OUT.g = f.rgb[1]; FLASH_OUT.b = f.rgb[2]
    FLASH_OUT.k = (1 - u) * (0.6 + 0.4 * Math.cos(u * Math.PI * 6))
    return FLASH_OUT
  }
  function stepPops() {
    const t = now()
    stepFeed()
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

  // ---- banners (VH5, VH6) ---------------------------------------------------
  // One at a time across the stage; the rest wait their turn. Strikes, jackpots and cleared gates are URGENT:
  // they go ahead of any waiting side-objective / start banner and cut one of those short if it is showing.
  function banner(cls, html, life, urgent) {
    const b = { cls, html, life: life || 1.7, urgent: !!urgent }
    if (urgent) {
      let i = 0
      while (i < S.banners.length && S.banners[i].urgent) i++
      S.banners.splice(i, 0, b)
      if (S.banner && !S.banner.urgent) S.banner = null
    } else S.banners.push(b)
    if (S.banners.length > 8) S.banners.length = 8
  }
  function eventBanner(ev, sim) {
    if (ev.kind === 'gate') { if (ev.cleared) banner('gate', esc(ev.label), 1.7, true); return }
    if (!BANNER_KINDS.has(ev.kind)) return
    if (ev.kind === 'objective') { if (!sim.run.finished) banner('objective' + (ev.state === 'lost' ? ' lost' : ''), esc(ev.label), 1.3); return } // at the end the card lists them
    if (ev.kind === 'strike') {
      const why = { panic: 'the flock is panicking', slam: 'a sheep hit the fence', injury: 'a sheep is down', mortar: 'a sheep lost to a shell' }[ev.reason] || ''
      banner(ev.bust ? 'strike bust' : 'strike', (ev.bust ? 'BUST' : esc(ev.label)) + (why ? `<small>${ev.bust ? 'third strike — ' : ''}${why}</small>` : ''), ev.bust ? 2.6 : 1.7, true)
      return
    }
    banner('jackpot', esc(ev.label), sim.run.finished ? 1.1 : 1.7, true)
  }
  function stepBanner() {
    const t = now()
    if (!S.banner && S.banners.length) {
      const b = S.banners.shift()
      S.banner = { t0: t, life: b.life, urgent: b.urgent }
      bannerEl.className = b.cls; bannerEl.innerHTML = b.html
      S.bannerLog.push(bannerEl.textContent); if (S.bannerLog.length > 60) S.bannerLog.shift()
    }
    const b = S.banner
    if (!b) { if (bannerEl.style.opacity !== '0') bannerEl.style.opacity = '0'; return }
    const u = (t - b.t0) / b.life
    if (u >= 1) { S.banner = null; bannerEl.style.opacity = '0'; return }
    bannerEl.style.opacity = String(u < 0.08 ? u / 0.08 : u > 0.8 ? (1 - u) / 0.2 : 1)
    bannerEl.style.transform = `translate(-50%, -50%) scale(${(u < 0.1 ? 1.25 - u * 2.5 : 1).toFixed(3)})`
  }

  // ---- records (RC1–RC4) ----------------------------------------------------
  // Written once, when the card first shows. Returns what the card says about them.
  function record(sim, sc, isTuned) {
    const out = { firsts: [], band: '', bandNew: false }
    const waves = sc.mode === 'waves', n = flockOf(sim), band = bandOf(n)
    const earned = [].concat(sc.awards, sc.jackpots, sc.objectives.filter((o) => o.state === 'met').map((o) => o.id), Array.from(new Set(sc.specials)))
    // history: every finished run, tuned ones marked (RC1, RC4)
    const hist = readHistory()
    if (hist) {
      hist.unshift({ t: Date.now(), date: today(), mode: sc.mode, sheep: n, total: sc.total, percent: sc.percent, rank: waves ? `${sc.wave} waves` : sc.bust ? 'Bust' : sc.rank ? sc.rank.name : '',
        grades: Object.fromEntries(Object.entries(sc.categories).map(([k, v]) => [k, v.grade])), bust: sc.bust, won: sc.won, tuned: isTuned, earned })
      hist.length = Math.min(hist.length, Math.max(0, Math.round(params.historyMax)))
      writeJSON(K.history(), { v: 1, runs: hist })
    }
    if (isTuned) return out
    // band best: by percent of the reference (waves have none → by points) (RC2)
    const bands = readBand()
    if (bands) {
      const key = sc.mode + ':' + band, old = bands[key], val = waves ? sc.total : sc.percent || 0, was = old ? (waves ? old.total : old.percent) : -1
      const show = (v) => (waves ? fmt(v) : pct(v))
      if (val > was && sc.total > 0) {
        bands[key] = { percent: sc.percent, total: sc.total, rank: sc.rank ? sc.rank.name : '', date: today() }
        if (writeJSON(K.band(), { v: 1, best: bands })) { out.bandNew = true; out.band = `New ${band}-flock best: ${show(val)}` + (old ? ` (was ${show(was)})` : '') }
      } else if (old) out.band = `${band}-flock best ${show(was)}`
    }
    // collection: how many times each thing has been earned (RC3)
    const col = readCollection()
    if (col) {
      for (const id of earned) { if (!col[id]) out.firsts.push(id); col[id] = (col[id] || 0) + 1 }
      if (earned.length) writeJSON(K.collection(), { v: 1, n: col })
    }
    return out
  }
  const LABELS = () => {
    const m = {}
    for (const a of AWARDS) m[a.name] = a.name
    for (const j of JACKPOTS) m[j.id] = j.label
    for (const o of SIDE_OBJECTIVES) m[o.id] = o.label
    for (const k of SPECIAL_KINDS) m[k.id] = k.label
    return m
  }
  function openPanel(title, body) {
    panelEl.innerHTML = `<h2><span>${esc(title)}</span><button data-panel="close" title="close (Esc)">close</button></h2>` + body
    panelEl.style.display = 'block'
  }
  function closePanel() { panelEl.style.display = 'none' }
  function showHistory() {
    const runs = readHistory()
    if (!runs || !runs.length) return openPanel('Run history', `<div class="empty">${runs ? 'No finished runs yet.' : 'This browser is not saving anything, so there is no history.'}</div>`)
    let top = -1, best = -1
    runs.forEach((r, i) => { if (!r.tuned && typeof r.percent === 'number' && r.percent > best) { best = r.percent; top = i } })
    const g = (r) => ['calm', 'flow', 'control', 'safety'].map((k) => (r.grades && r.grades[k]) || '–').join(' ')
    openPanel(`Run history — last ${runs.length}`,
      '<table><tr><th>date</th><th>mode</th><th class="num">sheep</th><th class="num">total</th><th class="num">percent</th><th>rank</th><th title="calm · flow · control · safety">C F C S</th></tr>' +
      runs.map((r, i) => `<tr class="${i === top ? 'top' : ''}${r.tuned ? ' tuned' : ''}"><td>${esc(r.date)}</td><td>${esc(r.mode)}${r.tuned ? ' · tuned' : ''}</td><td class="num">${r.sheep}</td><td class="num">${fmt(r.total)}</td>` +
        `<td class="num">${typeof r.percent === 'number' ? pct(r.percent) : '–'}</td><td>${esc(r.rank || '')}${i === top ? ' ◀ best' : ''}</td><td>${g(r)}</td></tr>`).join('') + '</table>')
  }
  function showCollection() {
    const col = readCollection() || {}
    const item = (id, label, cls) => `<div class="item${col[id] ? '' : ' none'}"><span class="${cls || ''}">${esc(label)}</span><span>${col[id] ? '×' + col[id] : '—'}</span></div>`
    const sec = (title, items) => `<h3>${title}</h3><div class="items">${items.join('')}</div>`
    openPanel('Collection',
      sec('Awards', AWARDS.map((a) => item(a.name, a.name, a.rarity === 'common' ? '' : a.rarity))) +
      sec('Jackpots', JACKPOTS.map((j) => item(j.id, j.label))) +
      sec('Side objectives', SIDE_OBJECTIVES.map((o) => item(o.id, o.label))) +
      sec('Special sheep penned', SPECIAL_KINDS.map((k) => item(k.id, k.label))))
  }

  // ---- end card (SC8, VH7–VH9, RM1, RC) ---------------------------------------
  function showCard(sim) {
    const sc = sim.score(), waves = sc.mode === 'waves'
    const lostAny = sim.sheep.some((s) => s.lost), allLost = sim.sheep.length > 0 && sim.sheep.every((s) => s.lost)
    const title = waves ? 'Time! ⏱' : sc.bust ? 'Three strikes' : sc.won ? (lostAny ? 'Survivors penned 🐑' : 'Penned! 🐑') : allLost ? 'Flock lost 🐺' : 'Run finished'
    // best for this exact course: compare, then save (only an untuned run may set one — owner Q87)
    let bestHtml = '', bestClass = 'best'
    const isTuned = tuned(), isDemo = S.demoRun === sim.run, bests = readBests() // a run the demo handler touched is never saved (lib/sheep-demo-ui.js)
    if (isDemo) bestHtml = 'demo run — not saved'
    else if (bests) {
      const key = courseKey(sim), old = bests[key]
      const what = sc.mode === 'daily' ? 'daily best' : 'course best'
      if (isTuned) bestHtml = (old ? `${what} ${fmt(old.total)} · ` : '') + 'tuned — not saved'
      else if (!old || sc.total > old.total) {
        if (sc.total > 0) {
          bests[key] = { total: sc.total, rank: sc.rank ? sc.rank.name : '', wave: sc.wave, date: today() }
          const saved = writeBests(bests)
          bestHtml = saved ? (old ? `New ${what}! (was ${fmt(old.total)})` : '') : ''
          if (saved && old) bestClass += ' new'
        }
      } else bestHtml = `${what} ${fmt(old.total)}`
    }
    const rec = isDemo ? { firsts: [], band: '', bandNew: false } : record(sim, sc, isTuned); S.record = rec
    if (rec.bandNew) bestClass = 'best new'
    const labels = LABELS()
    const rankHtml = waves ? `<div class="rank wave">${sc.wave} wave${sc.wave === 1 ? '' : 's'} cleared${sc.bust ? ' · three strikes' : ''}</div>`
      : `<div class="rank${sc.bust ? ' bust' : ''}">${sc.bust ? 'BUST' : esc(sc.rank ? sc.rank.name : '')}</div>` +
        `<div class="pct"><b>${sc.percent === null ? '' : pct(sc.percent)}</b> of a textbook run${sc.bust ? ' · ranked ' + esc(sc.rank.name) : ''}${sc.rank && sc.rank.next ? ` · ${fmt(sc.rank.next.points)} to ${esc(sc.rank.next.name)}` : ''}</div>`
    const rows = sc.lines.map((l) => `<div class="row line"><span>${esc(l.label)}</span><span>+0</span></div>` +
      (l.key === 'mult' && !waves ? sc.endMults.map((m) => `<div class="row mrow"><span>${esc(m.label)}</span><span>×${+m.mult.toFixed(2)}</span></div>`).join('') : '')).join('')
    const cat = sc.categories
    const grades = waves ? '' : '<div class="grades">' + [['calm', 'Calm'], ['flow', 'Flow'], ['control', 'Control'], ['safety', 'Safety']]
      .map(([k, n]) => `<div title="${n}: ${(cat[k].value * 100).toFixed(0)} / 100"><b class="g${cat[k].grade}">${cat[k].grade}</b>${n}</div>`).join('') + '</div>'
    const awards = sc.awardList.map((a) => `<span class="${a.rarity}">${esc(a.name)}</span>`).join(' · ')
    const objs = sc.objectives.length ? sc.objectives.map((o) => (o.state === 'met' ? '✓ ' : '✗ ') + esc(o.label)).join(' · ') : ''
    const firsts = rec.firsts.length ? `<div class="new">NEW in your collection: ${rec.firsts.map((id) => esc(labels[id] || id)).join(' · ')}</div>` : ''
    const flock = waves ? `${sc.raw.crossings} penned` : `penned ${sc.penned}/${sim.sheep.length}`
    const par = waves ? '' : ` · par ${sc.par.toFixed(0)}s`
    S.card.innerHTML =
      `<div class="sc-grid"><div class="sc-head"><h2>${title}</h2>` + rankHtml +
      `<div class="big">0</div></div><div class="sc-lines">` + rows + `</div><div class="sc-tail">` + grades +
      `<div class="awards">${awards ? '🏅 ' + awards : ''}${awards && objs ? '<br>' : ''}${objs}${firsts}</div>` +
      `<div class="${bestClass}">${[bestHtml, rec.band].filter(Boolean).map(esc).join(' · ')}</div>` +
      `</div><div class="sc-bottom"><div class="foot">${flock} · time ${sc.raw.t.toFixed(0)}s${par} · ${sc.raw.commands} commands · ${sc.strikes} strike${sc.strikes === 1 ? '' : 's'} · ${sc.panics} panics${sc.raw.injuries ? ` · ${sc.raw.injuries} ${lostAny ? 'lost' : 'injured'}` : ''}</div>` +
      `<div class="actions"><button data-card="history" title="your last runs">history</button><button data-card="collection" title="awards, jackpots, side objectives and special sheep you have earned">collection</button>` +
      `<button data-card="dismiss" title="close this card and look at the field">dismiss</button>` +
      `<button data-card="replay" title="play this same course again (R)">replay</button>` +
      `<button data-card="again" class="primary" title="draw a brand-new random course — new gate, flock, layout and obstacles">play again</button></div></div></div>`
    S.card.classList.remove('done')
    S.card.style.display = 'block'
    closed(false)
    S.anim = { lines: sc.lines, total: sc.total, rows: Array.from(S.card.querySelectorAll('.row.line')), mrows: Array.from(S.card.querySelectorAll('.row.mrow')),
      multAt: sc.lines.findIndex((l) => l.key === 'mult'), big: S.card.querySelector('.big'), t0: now(), per: 0.5, done: false }
    if (!S.anim.rows.length) skip()
  }
  function stepCard() {
    const a = S.anim
    if (!a || a.done) return
    const t = now() - a.t0
    let sum = 0
    a.lines.forEach((l, i) => {
      const u = Math.max(0, Math.min(1, (t - i * a.per) / (a.per * 0.8)))
      if (u > 0) { a.rows[i].classList.add('on'); if (i === a.multAt) for (const m of a.mrows) m.classList.add('on') }
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
    for (const m of a.mrows) m.classList.add('on')
    a.big.textContent = fmt(a.total)
    S.card.classList.add('done')
  }
  // the end card was dismissed with the run still finished: the page shows a `scoring` button (lib/sheep-pad-ui.js) while this class is on
  function closed(on) { document.body.classList.toggle('score-closed', !!on) }
  function reopen() {
    if (!S.card || !S.shown || !S.card.innerHTML) return
    skip()
    S.card.style.display = 'block'
    closed(false)
  }
  function hide() {
    closed(false)
    if (S.card) S.card.style.display = 'none'
    if (panelEl) closePanel()
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
      S.run = sim.run; S.shown = false; closed(false); S.bonusAt = 0; S.slot = 0; S.lastMult = 1
      for (const p of S.pops) p.el.remove()
      S.pops.length = 0; S.flashes.clear(); feedEl.textContent = ''; S.feedNew = 0; S.banners.length = 0; S.banner = null; S.objSig = ''
      sim.layout0 = sim.layout; sim.obstacleGroups0 = sim.obstacleGroups // what the course STARTED as — a wave re-lays both, the best-score key must not move
      S.best = bestFor(sim)
      hide()
      if (sim.sideObjectives.length) // VH6: the course states its side objectives as it starts
        banner('start', 'Side objectives<small>' + sim.sideObjectives.map((o) => `<b>${esc(o.label)}</b> — ${esc(o.hint)}`).join('<br>') + '</small>', 4.5)
    }
    while (sim.scoreEvents.length) { const ev = sim.scoreEvents.shift(); if (ev.points > 0) addPop(ev, sim); eventBanner(ev, sim) }
    stepPops(); stepBanner()
    const sc = sim.score()
    ptsEl.textContent = fmt(sc.total)
    multEl.textContent = '×' + sc.mult
    multEl.classList.toggle('live', sc.comboLive || sc.mult > 1)
    multEl.classList.toggle('frenzy', sc.frenzyT > 0)
    if (sc.mult > S.lastMult) { multEl.classList.remove('bump'); void multEl.offsetWidth; multEl.classList.add('bump') }
    S.lastMult = sc.mult
    frzEl.classList.toggle('on', sc.frenzyT > 0)
    if (sc.frenzyT > 0) frzEl.textContent = 'FRENZY ' + sc.frenzyT.toFixed(1) + 's'
    barEl.classList.toggle('frenzy', sc.frenzyT > 0)
    barFill.style.width = (sc.windowLeft * 100).toFixed(1) + '%'
    let marks = ''
    for (let i = 0; i < sc.strikeMax; i++) marks += `<b class="${i < sc.strikes ? 'on' : ''}">✕</b>`
    if (strikesEl.dataset.sig !== sc.strikes + '/' + sc.strikeMax) { strikesEl.dataset.sig = sc.strikes + '/' + sc.strikeMax; strikesEl.innerHTML = marks }
    valueEl.innerHTML = `<small>flock</small>${fmt(sc.flockValue)}`
    valueEl.classList.toggle('falling', sc.draining)
    const bestTxt = S.best ? `${sc.mode === 'daily' ? 'daily best' : 'best'} ${fmt(S.best.total)}` : sc.mode === 'daily' ? 'daily ' + sim.seed : ''
    subEl.innerHTML = (sc.mode === 'waves' ? `<span class="${sc.clock < 15 ? 'low' : ''}">⏱ ${clock(sc.clock)} · wave ${sc.wave + 1}</span>`
      : sc.parLeft >= 0 ? `par ${clock(sc.parLeft)}` : `<span class="over">over ${clock(-sc.parLeft)}</span>`) + (bestTxt ? `<span class="best">${esc(bestTxt)}</span>` : '')
    const sig = sc.objectives.map((o) => o.id + o.state).join('|')
    if (sig !== S.objSig) { S.objSig = sig; objsEl.innerHTML = sc.objectives.map((o) => `<li class="${o.state}" title="${esc(o.hint)}">${o.state === 'met' ? '✓' : o.state === 'lost' ? '✗' : '◻'} ${esc(o.label)}</li>`).join('') }
    if (S.opts.below) {                                    // VH1: the 3D pages' camera bar sits directly under the HUD block
      const h = hudEl.offsetHeight
      if (h !== S.hudH) { S.hudH = h; S.opts.below.style.top = (8 + h + 6) + 'px' }
    }
    if (sim.run.finished && !S.shown) { S.shown = true; showCard(sim); S.best = bestFor(sim) }
    stepCard()
  }

  // the HUD's score line(s) — plain text for the debug box
  function hud(sim) {
    const sc = sim.score()
    const t = sc.mode === 'waves' ? `clock ${clock(sc.clock)}  wave ${sc.wave + 1}` : `time ${sc.raw.t.toFixed(0)}s  ${sc.parLeft >= 0 ? 'par −' + clock(sc.parLeft) : 'over +' + clock(-sc.parLeft)}`
    return `${t}\nscore ${fmt(sc.total)}  ×${sc.mult}  strikes ${sc.strikes}/${sc.strikeMax}  panics ${sc.panics}${S.best ? '  best ' + fmt(S.best.total) : ''}`
  }

  function demoRun(sim) { S.demoRun = sim.run } // the demo handler issued commands in this run
  return { init, frame, flash, hud, demoRun, hide, reopen, skip, setMode, dailySeed, tuned, courseKey, bestFor, STORE, readHistory, readBand, readCollection, bandOf, showHistory, showCollection, closePanel, keys: K, bannerLog: () => S.bannerLog.slice() }
})()
