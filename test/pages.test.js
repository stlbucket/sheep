// Page suite — drives web/2d.html, web/3d.html and web/3d-assault.html in headless Chrome straight from file://
// (no web server), over the DevTools websocket. Needs node 22+ (global WebSocket / fetch), Google Chrome, and
// network access (lil-gui and three.js load from a CDN).
//   node test/pages.test.js              all three pages (about 2 minutes)
//   node test/pages.test.js 2d.html      one page
//   CHROME=/path/to/chrome node test/pages.test.js    a different Chrome binary
// Screenshots land in test/shots/ (git-ignored). Exit code 1 on any failure.
// Criteria: .claude/sheep/implemented/POC-v15/{verdict-and-hud,records,field-objectives}.md (VH, RC, FO) and POC-v14/replay-modes.md (RM)
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), url = require('url')
const WEB = url.pathToFileURL(path.join(__dirname, '..', 'web')).href + '/'
const PORT = 9347, SHOTS = path.join(__dirname, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'sheep-chrome-'))
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + prof, '--enable-unsafe-swiftshader',
  '--window-size=1500,900', '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (page, id, name, pass, detail) => { results.push({ page, id, name, pass: !!pass, detail: detail === undefined ? '' : String(detail) }) }

async function connect() {
  for (let i = 0; i < 60; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const t = l.find((x) => x.type === 'page'); if (t) return t.webSocketDebuggerUrl } catch (e) {}
    await sleep(250)
  }
  throw new Error('chrome did not start')
}
function session(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pend = new Map(), errors = []
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return }
    if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text))
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('ERR ' + d.params.args.map((a) => a.value || a.description).join(' '))
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push('LOG ' + d.params.entry.text + ' ' + (d.params.entry.url || ''))
  }
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.result.exceptionDetails) throw new Error('eval failed: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '\n  in: ' + expr.slice(0, 200))
    return r.result.result.value
  }
  return { ws, send, ev, errors, open: new Promise((r) => { ws.onopen = r }) }
}

// page-side helpers (work on all three pages: sim is a global on each)
const HELP = `
window.__t = {
  cross(i) { const s = sim.sheep[i], g = sim.gate; s.pos = { x: g.x + g.nx * 3, y: g.y + g.ny * 3 }; s.vel = { x: g.nx * 30, y: g.ny * 30 } },
  crossAll() { for (let i = 0; i < sim.sheep.length; i++) if (!sim.sheep[i].through && !sim.sheep[i].down) this.cross(i) },
  // pen sheep i at a chosen tier, straight through the sim's scoring entry (the sim should be paused)
  pen(i, tier) { const s = sim.sheep[i]; Object.assign(s, { stress: tier === 'calm' ? 0.1 : 0, stressAvg: 0, trot: tier === 'rushed', panic: false }); s.through = true; sim.onPenned(s) },
  pause(on) { const b = document.getElementById('pause-btn'); if (b.textContent.startsWith('resume') !== on) b.click() },
  setSeed(v) { const el = document.getElementById('seed-input'); el.value = v; el.dispatchEvent(new Event('change')) },
  setHerd(v) { const el = document.getElementById('herd-size'); el.value = v; el.dispatchEvent(new Event('change')) },
  card() { const c = document.getElementById('card'), t = (q) => (c.querySelector(q) ? c.querySelector(q).textContent : ''); return { shown: c.style.display === 'block', done: c.classList.contains('done'), big: t('.big'), best: t('.best'), title: t('h2'), rank: t('.rank'), pct: t('.pct'), awards: t('.awards'), rows: c.querySelectorAll('.row.line').length, mrows: c.querySelectorAll('.row.mrow').length, grades: Array.from(c.querySelectorAll('.grades b')).map((b) => b.textContent).join(''), text: c.textContent } },
  hud() { return document.getElementById('score-hud').textContent },
  pts() { return document.querySelector('#score-hud .pts').textContent },
  banner() { const b = document.getElementById('score-banner'); return { text: b.textContent, on: parseFloat(b.style.opacity || '0') > 0.5, cls: b.className } },
  panel() { const p = document.getElementById('score-panel'); return { shown: p.style.display === 'block', rows: p.querySelectorAll('tr').length - 1, items: p.querySelectorAll('.item').length, none: p.querySelectorAll('.item.none').length, top: p.querySelectorAll('tr.top').length, tuned: p.querySelectorAll('tr.tuned').length, text: p.textContent } },
  modeBtn(label) { return Array.from(document.querySelectorAll('#controls .aux button.mode')).find((b) => b.textContent.startsWith(label)) },
  fmt(n) { return Math.round(n).toLocaleString('en-US') },
  wait(ms) { return new Promise((r) => setTimeout(r, ms)) },
}; true`
const shot = (s, file, name) => s.send('Page.captureScreenshot', { format: 'png' }).then((r) => fs.writeFileSync(path.join(SHOTS, file.replace('.html', '') + '-' + name + '.png'), Buffer.from(r.result.data, 'base64')))

async function runPage(s, file, opts = {}) {
  const P = file, is3d = file !== '2d.html'
  const errs0 = s.errors.length
  await s.send('Page.navigate', { url: WEB + file })
  await sleep(opts.wait || 3500)
  await s.ev(HELP)
  const booted = await s.ev(`typeof ScoreUI === 'object' && typeof sim === 'object' && !!document.getElementById('score-hud')`)
  ok(P, 'load', 'page loads; score lib, sim and HUD present', booted)

  // ---- VH1: the score is the largest text on the stage, in its upper-left corner; the camera bar sits under it and still works
  await s.ev(`__t.setHerd(10); __t.setSeed(4242); true`)
  await sleep(500)
  const v1 = await s.ev(`(() => { const hud = document.getElementById('score-hud'), st = hud.parentElement.getBoundingClientRect(), r = hud.getBoundingClientRect()
    const size = parseFloat(getComputedStyle(hud.querySelector('.pts')).fontSize)
    let biggest = 0; for (const el of hud.parentElement.querySelectorAll('*')) { if (el.closest('#card') || el.closest('#score-panel') || el.closest('#score-banner') || el.closest('#rotate-overlay')) continue; if (el.classList.contains('pts')) continue; if (el.childNodes.length && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim()) && el.getClientRects().length) biggest = Math.max(biggest, parseFloat(getComputedStyle(el).fontSize)) }
    const cam = document.getElementById('cam-bar'), cr = cam ? cam.getBoundingClientRect() : null
    let camWorks = null; if (cam) { const b = cam.querySelector('[data-cam="top"]'); b.click(); camWorks = b.classList.contains('active'); cam.querySelector('[data-cam="orbit"]').click() }
    return { left: r.left - st.left, top: r.top - st.top, size, biggest, pts: sim.score().total, shown: __t.pts(), n: sim.sheep.length, camBelow: cr ? cr.top >= r.bottom : null, camLeft: cr ? cr.left - st.left : null, camWorks } })()`)
  ok(P, 'VH-1', 'fresh run shows 0; the score is in the upper-left corner and is the largest text on the stage' + (is3d ? '; the camera buttons sit below it and still work' : ''),
    v1.pts === 0 && v1.shown === '0' && v1.n === 10 && v1.left < 20 && v1.top < 20 && v1.size > v1.biggest && (!is3d || (v1.camBelow && v1.camWorks && v1.camLeft < 20)), JSON.stringify(v1))

  // ---- VH6: side objectives in the start banner and in the list; each flips when the sim says so
  const o1 = await s.ev(`(() => ({ n: sim.sideObjectives.length, li: document.querySelectorAll('#score-hud .objs li').length, banner: __t.banner(), first: sim.sideObjectives[0].id }))()`)
  await s.ev(`sim.setObjective(sim.sideObjectives[0].id, 'lost'); true`); await sleep(200)
  const o2 = await s.ev(`({ cls: document.querySelector('#score-hud .objs li').className })`)
  ok(P, 'VH-6', 'the side objectives are announced when the run starts and listed in the HUD; one flips to lost when the sim says so', o1.n === 2 && o1.li === 2 && /Side objectives/.test(o1.banner.text) && o1.banner.on && o2.cls === 'lost', `${o1.n} objectives, ${o1.li} listed, banner "${o1.banner.text.slice(0, 40)}…", then ${o2.cls}`)
  await shot(s, file, 'start')

  // ---- VH4: three tiers → three visibly different pops; VH2: the chain meter
  await s.ev(`__t.setSeed(4242); true`); await sleep(400)
  await s.ev(`__t.pause(true); __t.pen(0, 'rushed'); __t.pen(1, 'calm'); __t.pen(2, 'perfect'); true`)
  await sleep(350)
  const p1 = await s.ev(`(() => { const pops = Array.from(document.querySelectorAll('#score-pops .pop')), f = (c) => { const e = pops.find((x) => x.classList.contains(c)); return e ? { size: parseFloat(getComputedStyle(e).fontSize), color: getComputedStyle(e).color } : null }
    const sc = sim.score(); return { pops: pops.length, r: f('rushed'), c: f('calm'), p: f('perfect'), placed: pops.filter((e) => e.style.transform.includes('translate')).length, pts: sc.total, shown: __t.pts(), mult: document.querySelector('#score-hud .mult').textContent, want: '×' + sc.mult, bar: parseFloat(document.querySelector('#score-hud .bar i').style.width), left: sc.windowLeft, hud: document.getElementById('hud').textContent } })()`)
  ok(P, 'VH-4', 'a RUSHED, a CALM and a PERFECT crossing give three different pops (colour and size); the HUD shows the running score',
    p1.pops === 3 && p1.r && p1.c && p1.p && p1.r.size < p1.c.size && p1.c.size < p1.p.size && new Set([p1.r.color, p1.c.color, p1.p.color]).size === 3 && p1.placed >= 1 && p1.pts > 0 && p1.shown === p1.pts.toLocaleString('en-US') && /score /.test(p1.hud),
    `pops ${p1.pops}: ${p1.r && p1.r.size}/${p1.c && p1.c.size}/${p1.p && p1.p.size} px, score ${p1.shown}`)
  await shot(s, file, 'pops')
  await s.ev(`__t.pause(false); true`)
  await sleep(600)
  const m1 = await s.ev(`({ bar: parseFloat(document.querySelector('#score-hud .bar i').style.width), live: sim.run.comboLive })`)
  await sleep(1800)
  const m2 = await s.ev(`({ bar: parseFloat(document.querySelector('#score-hud .bar i').style.width), live: sim.run.comboLive, mult: document.querySelector('#score-hud .mult').textContent })`)
  ok(P, 'VH-2', 'the chain meter shows the sim multiplier; its bar runs down and is empty when the chain lapses',
    p1.mult === p1.want && p1.bar > 90 && m1.live && m1.bar < p1.bar && m1.bar > 5 && !m2.live && m2.bar === 0 && m2.mult === '×1', `meter ${p1.mult} (sim ${p1.want}); bar ${p1.bar} % → ${m1.bar} % → ${m2.bar} %, lapsed ${!m2.live}`)

  // ---- VH3 + VH5: strikes, flock value, banners one after the other
  const s0 = await s.ev(`({ marks: document.querySelectorAll('#score-hud .strikes b').length, on: document.querySelectorAll('#score-hud .strikes b.on').length, value: document.querySelector('#score-hud .value').textContent, want: 'flock' + __t.fmt(sim.score().flockValue) })`)
  await s.ev(`__t.pause(true); sim.strike('panic', sim.gate.x, sim.gate.y); sim.note('gate', 'DRIVE GATE — multiplier +1', sim.gate.x, sim.gate.y, { cleared: true }); sim.run.draining = true; true`)
  await sleep(400)
  const s1 = await s.ev(`({ on: document.querySelectorAll('#score-hud .strikes b.on').length, sim: sim.run.strikes, banner: __t.banner(), falling: document.querySelector('#score-hud .value').classList.contains('falling') })`)
  await sleep(1900)
  const s2 = await s.ev(`({ banner: __t.banner() })`)
  await s.ev(`sim.run.draining = false; true`); await sleep(150)
  const s3 = await s.ev(`({ falling: document.querySelector('#score-hud .value').classList.contains('falling') })`)
  ok(P, 'VH-3', 'three strike marks, filled as strikes are taken; the flock value equals the sim and is styled as falling while it falls',
    s0.marks === 3 && s0.on === 0 && s0.value === s0.want && s1.on === 1 && s1.sim === 1 && s1.falling && !s3.falling, `marks ${s0.on}→${s1.on} of ${s0.marks}, value "${s0.value}", falling ${s1.falling}→${s3.falling}`)
  ok(P, 'VH-5', 'a strike and a cleared gate each get a banner; two at once show one after the other', s1.banner.on && /STRIKE 1/.test(s1.banner.text) && s2.banner.on && /DRIVE GATE/.test(s2.banner.text), `"${s1.banner.text}" then "${s2.banner.text}"`)
  await s.ev(`__t.pause(false); true`)

  // ---- VH5: every jackpot and a side objective met get exactly one banner each
  await s.ev(`__t.setHerd(30); __t.setSeed(4250); true`); await sleep(500)
  const j1 = await s.ev(`(async () => { __t.pause(true); const n0 = ScoreUI.bannerLog().length
    sim.sideObjectives = [{ id: 'on_feet', label: 'On your feet', hint: 'win without a lie-down', state: 'open' }, { id: 'long_file', label: 'Long file', hint: '', state: 'open' }]
    for (let i = 0; i < 15; i++) __t.pen(i, 'calm')           // half the flock in one chain → Long file is met mid-run
    await __t.wait(150)                                        // (the sim is paused, so the chain's window does not run down)
    for (let i = 15; i < sim.sheep.length; i++) __t.pen(i, 'calm')
    sim.updateScore(1 / 60); __t.pause(false)
    await __t.wait(9000)
    const log = ScoreUI.bannerLog().slice(n0), count = (re) => log.filter((t) => re.test(t)).length
    return { frenzy: count(/^FRENZY/), last: count(/^LAST SHEEP/), onego: count(/^ONE GO/), file: count(/^PERFECT FILE/), met: count(/^✓ Long file/), jackpots: sim.score().jackpots.join(), won: sim.run.won, log: log.map((t) => t.slice(0, 14)).join(' | ') } })()`)
  ok(P, 'VH-5b', 'FRENZY, the last sheep, ONE GO, PERFECT FILE and a side objective met each produce exactly one banner', j1.won && j1.frenzy === 1 && j1.last === 1 && j1.onego === 1 && j1.file === 1 && j1.met === 1, `${j1.log}`)
  await s.ev(`document.getElementById('card').click(); true`); await sleep(100)
  const j2 = await s.ev(`({ col: ScoreUI.readCollection(), sc: sim.score() })`)
  ok(P, 'RC-5b', 'a side objective met and the jackpots are counted in the collection', j2.col.on_feet === 1 && j2.col.long_file === 1 && j2.col.onego === 1 && j2.col.file === 1, JSON.stringify(j2.col).slice(0, 160))
  await s.ev(`(() => { try { localStorage.clear() } catch (e) {} return true })()`)
  await s.ev(`__t.setHerd(10); true`); await sleep(200)

  // ---- the card: rank, percent, multipliers, grades; RC: band best, history, collection
  await s.ev(`__t.setSeed(4242); true`); await sleep(400)
  await s.ev(`__t.crossAll(); true`)
  await sleep(500)
  const c1 = await s.ev(`({ card: __t.card(), sc: sim.score() })`)
  ok(P, 'SC-8a', 'the card appears when the run ends and is still counting up', c1.card.shown && !c1.card.done && c1.sc.finished && c1.sc.won, `shown ${c1.card.shown}, done ${c1.card.done}, big ${c1.card.big}`)
  await s.ev(`document.getElementById('card').click(); true`)
  await sleep(150)
  const c2 = await s.ev(`({ card: __t.card(), sc: sim.score(), want: __t.fmt(sim.score().total), hist: ScoreUI.readHistory(), band: ScoreUI.readBand(), col: ScoreUI.readCollection() })`)
  ok(P, 'VH-9', 'the final card: total = sim total; rank, percent, points to the next rank, four grades, each end multiplier its own line; no stars',
    c2.card.done && c2.card.big === c2.want && c2.card.rows === c2.sc.lines.length && c2.card.mrows === c2.sc.endMults.length && c2.card.mrows >= 3 && c2.card.rank === c2.sc.rank.name && /% of a textbook run/.test(c2.card.pct) && (!c2.sc.rank.next || c2.card.pct.includes(' to ' + c2.sc.rank.next.name)) && c2.card.grades.length === 4 && !/[★☆]/.test(c2.card.text),
    `total ${c2.card.big}, rank "${c2.card.rank}", "${c2.card.pct}", grades ${c2.card.grades}, ${c2.card.mrows} multipliers, awards ${c2.sc.awards.join('/')}`)
  await shot(s, file, 'card')
  const total1 = c2.sc.total, earned1 = c2.sc.awards.concat(c2.sc.jackpots, Array.from(new Set(c2.sc.specials)))
  ok(P, 'RC-1a', 'the finished run is in the history with total, percent, rank and four grades', c2.hist.length === 1 && c2.hist[0].total === total1 && typeof c2.hist[0].percent === 'number' && c2.hist[0].rank === c2.sc.rank.name && Object.keys(c2.hist[0].grades).length === 4, JSON.stringify(c2.hist[0]).slice(0, 160))
  ok(P, 'RC-3a', 'a 10-sheep course sets only the small band best, and the card says so', Object.keys(c2.band).join() === 'course:small' && /New small-flock best/.test(c2.card.best), `bands ${Object.keys(c2.band).join()}; card "${c2.card.best}"`)
  ok(P, 'RC-5', 'each award, jackpot and special sheep earned is counted once in the collection and flagged NEW on the card', earned1.length > 0 && earned1.every((id) => c2.col[id] === 1) && /NEW in your collection/.test(c2.card.awards), `earned ${earned1.join(', ')}`)
  await s.ev(`document.querySelector('#card button[data-card="collection"]').click(); true`); await sleep(150)
  const pc = await s.ev(`__t.panel()`)
  ok(P, 'RC-6', 'the collection panel always lists every award, jackpot, side objective and special (29), unearned ones greyed out', pc.shown && pc.items === 29 && pc.none > 0 && pc.none < 29, `${pc.items} items, ${pc.none} greyed`)
  await shot(s, file, 'collection')
  await s.ev(`document.querySelector('#score-panel button').click(); true`)

  // ---- RM1/RM2: course best saved, survives reload, a lower total leaves it; RC-3: a worse percent leaves the band best
  await s.send('Page.navigate', { url: WEB + file })
  await sleep(opts.wait || 3500)
  await s.ev(HELP)
  await s.ev(`__t.setHerd(10); __t.setSeed(4242); true`)
  await sleep(400)
  const r1 = await s.ev(`({ hudBlock: __t.hud(), hud: document.getElementById('hud').textContent })`)
  ok(P, 'RM-1b', 'the course best survives a reload and shows under the running score', r1.hudBlock.includes('best ' + total1.toLocaleString('en-US')) && r1.hud.includes('best'), r1.hudBlock.slice(0, 60))
  // a worse run: three sheep penned RUSHED, then the run is ended early
  await s.ev(`__t.pause(true); __t.pen(0, 'rushed'); __t.pen(1, 'rushed'); __t.pen(2, 'rushed'); sim.finishRun(); __t.pause(false); sim.run.finished`)
  await sleep(400)
  await s.ev(`document.getElementById('card').click(); true`)
  await sleep(100)
  const r2 = await s.ev(`({ card: __t.card(), total: sim.score().total, stored: JSON.parse(localStorage.getItem(ScoreUI.STORE))[ScoreUI.courseKey(sim)].total, hist: ScoreUI.readHistory(), band: ScoreUI.readBand() })`)
  ok(P, 'RM-2', 'a lower second total leaves the saved course best and the band best unchanged; the card shows both', r2.total < total1 && r2.stored === total1 && r2.band['course:small'].total === total1 && !/New/.test(r2.card.best) && r2.card.best.includes(total1.toLocaleString('en-US')) && /small-flock best/.test(r2.card.best), `second ${r2.total} < ${total1}; card "${r2.card.best}"`)
  await s.ev(`document.querySelector('#card button[data-card="history"]').click(); true`); await sleep(150)
  const ph = await s.ev(`__t.panel()`)
  ok(P, 'RC-1b', 'history: two runs, newest first, the best by percent marked', r2.hist.length === 2 && r2.hist[0].total === r2.total && r2.hist[1].total === total1 && ph.shown && ph.rows === 2 && ph.top === 1 && /◀ best/.test(ph.text), `${ph.rows} rows, ${ph.top} marked`)
  await shot(s, file, 'history')
  await s.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true`); await sleep(100)
  const ph2 = await s.ev(`__t.panel().shown`)
  // tuned run: in the history marked tuned, no best, no collection (Q87 / RC4)
  const colBefore = await s.ev(`JSON.stringify(ScoreUI.readCollection())`)
  await s.ev(`params.penPoints = 1000; __t.setSeed(4243); true`)
  await sleep(300)
  await s.ev(`__t.crossAll(); true`); await sleep(500)
  await s.ev(`document.getElementById('card').click(); true`); await sleep(100)
  const r3 = await s.ev(`({ best: __t.card().best, stored: (ScoreUI.courseKey(sim) in JSON.parse(localStorage.getItem(ScoreUI.STORE))) ? 1 : 0, hist: ScoreUI.readHistory(), band: ScoreUI.readBand(), col: JSON.stringify(ScoreUI.readCollection()) })`)
  await s.ev(`params.penPoints = 50; true`)
  ok(P, 'RC-7', 'a tuned run shows "tuned — not saved", is in the history marked tuned, and changes neither a best nor the collection; Esc closes a panel',
    /tuned — not saved/.test(r3.best) && r3.stored === 0 && r3.hist.length === 3 && r3.hist[0].tuned === true && r3.band['course:small'].total === total1 && r3.col === colBefore && !ph2, `"${r3.best}", history ${r3.hist.length} (tuned ${r3.hist[0].tuned})`)
  // the history is capped
  await s.ev(`params.historyMax = 3; __t.setSeed(4244); true`); await sleep(300)
  await s.ev(`__t.crossAll(); true`); await sleep(500)
  const r4 = await s.ev(`({ n: ScoreUI.readHistory().length, oldest: ScoreUI.readHistory().slice(-1)[0].total })`)
  await s.ev(`params.historyMax = 20; true`)
  ok(P, 'RC-1c', 'the history keeps only the newest runs (cap 3 → the oldest is dropped)', r4.n === 3 && r4.oldest !== total1, `length ${r4.n}`)

  // ---- RM4 daily
  await s.ev(`__t.modeBtn('daily').click(); true`); await sleep(400)
  const d1 = await s.ev(`({ mode: params.mode, seed: sim.seed, want: ScoreUI.dailySeed(), pos: [sim.gate.x, sim.gate.y, sim.layout, sim.sheep.length, sim.sheep.map((q) => q.kind[0]).join(''), sim.obstacles.map((o) => o.x.toFixed(1)).join()].join('|'), key: ScoreUI.courseKey(sim), active: __t.modeBtn('daily').classList.contains('active'), n: sim.sheep.length })`)
  await s.ev(`__t.modeBtn('daily').click(); true`); await sleep(400)
  const d2 = await s.ev(`({ mode: params.mode, seed: sim.seed, n: sim.sheep.length })`)
  await s.ev(`__t.modeBtn('daily').click(); true`); await sleep(400)
  const d3 = await s.ev(`({ mode: params.mode, seed: sim.seed, pos: [sim.gate.x, sim.gate.y, sim.layout, sim.sheep.length, sim.sheep.map((q) => q.kind[0]).join(''), sim.obstacles.map((o) => o.x.toFixed(1)).join()].join('|') })`)
  ok(P, 'RM-4', 'daily pressed twice on the same date gives the identical course; leaving restores the herd', d1.mode === 'daily' && d1.seed === d1.want && d1.active && d2.mode === 'course' && d2.seed !== d1.seed && d2.n === 10 && d3.pos === d1.pos, `seed ${d1.seed}/${d1.want}, flock ${d1.n}, active ${d1.active}, left → ${d2.mode}/${d2.n}/${d2.seed}, same ${d3.pos === d1.pos}, d3 ${d3.mode}/${d3.seed}`)
  const k2 = await s.ev(`(async () => { __t.setSeed(${0} + ScoreUI.dailySeed() + 1); await new Promise((r) => setTimeout(r, 300)); const a = params.mode; __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); const dk = ScoreUI.courseKey(sim); return { a, dk } })()`)
  ok(P, 'RM-5', 'a typed seed leaves daily mode; the daily best key carries the mode', k2.a === 'course' && k2.dk.includes('|daily|'), JSON.stringify(k2))
  const d4 = await s.ev(`(async () => { __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); const RealDate = Date; window.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(2031, 4, 9) } }; __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); const out = { seed: sim.seed, pos: [sim.gate.x, sim.gate.y, sim.layout, sim.sheep.length, sim.sheep.map((q) => q.kind[0]).join(''), sim.obstacles.map((o) => o.x.toFixed(1)).join()].join('|') }; window.Date = RealDate; __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); return out })()`)
  ok(P, 'RM-4b', 'another system date gives a different daily course', d4.seed === 20310509 && d4.pos !== d1.pos, `seed ${d4.seed}`)

  // ---- RM5 waves in the page
  await s.ev(`__t.setHerd(10); __t.setSeed(777); true`); await sleep(300)
  await s.ev(`__t.modeBtn('waves').click(); true`); await sleep(500)
  const w1 = await s.ev(`({ mode: params.mode, n: sim.sheep.length, hud: __t.hud(), gates: sim.driveGates.length, objs: sim.sideObjectives.length })`)
  await s.ev(`__t.crossAll(); true`); await sleep(700)
  const w2 = await s.ev(`({ wave: sim.run.wave, n: sim.sheep.length, pts: sim.score().total, fin: sim.run.finished })`)
  await shot(s, file, 'wave2')
  await s.ev(`sim.run.clock = 0.05; true`); await sleep(500)
  await s.ev(`document.getElementById('card').click(); true`); await sleep(100)
  const w3 = await s.ev(`({ card: __t.card(), total: __t.fmt(sim.score().total), band: Object.keys(ScoreUI.readBand()).sort().join() })`)
  ok(P, 'RM-wave', 'waves button: 8 sheep, clock in the HUD, no side objectives; full pen → wave 2 with 10 sheep, score kept; clock zero → card with waves cleared; waves keep their own band best',
    w1.mode === 'waves' && w1.n === 8 && w1.hud.includes('⏱') && w1.gates === 0 && w1.objs === 0 && w2.wave === 1 && w2.n === 10 && w2.pts > 0 && !w2.fin && w3.card.shown && /1 wave cleared/.test(w3.card.text) && w3.card.big === w3.total && w3.band.includes('waves:small') && w3.band.includes('course:small'),
    `start ${w1.n}, then wave ${w2.wave + 1} with ${w2.n}, ${w2.pts} pts, card "${w3.card.title}", bands ${w3.band}`)
  await s.ev(`__t.modeBtn('waves').click(); true`); await sleep(400)
  const w4 = await s.ev(`({ mode: params.mode, n: sim.sheep.length })`)
  ok(P, 'RM-wave-off', 'leaving wave mode returns to the course with the slider herd', w4.mode === 'course' && w4.n === 10, JSON.stringify(w4))

  // ---- FO render: a seed with a gate and all six specials
  const fo = await s.ev(`(async () => { for (const k of ['driveGateChance', 'goldenChance', 'lambChance', 'ramChance', 'blackChance', 'bellChance', 'yearlingChance']) params[k] = 1; __t.setHerd(40); __t.setSeed(31); await new Promise((r) => setTimeout(r, 900)); const out = { gates: sim.driveGates.length, kinds: sim.sheep.filter((q) => q.kind !== 'ewe').map((q) => q.kind).sort().join(',') }; return out })()`)
  await shot(s, file, 'objectives')
  ok(P, 'FO-9', 'a course with drive gates and all six specials renders', fo.gates >= 1 && fo.kinds === 'bell,black,golden,lamb,ram,yearling', JSON.stringify(fo))
  // the whole flock through a gate → per-sheep points, the gate cleared, the multiplier up, a banner
  await s.ev(`(() => { const d = sim.driveGates[0]; sim.sheep.forEach((q, i) => { q.pos = { x: d.x - d.nx * (12 + (i % 5) * 2), y: d.y - d.ny * (12 + (i % 5) * 2) } }); return true })()`)
  await sleep(200)
  await s.ev(`(() => { const d = sim.driveGates[0]; sim.sheep.forEach((q, i) => { q.pos = { x: d.x + d.nx * (12 + (i % 5) * 2), y: d.y + d.ny * (12 + (i % 5) * 2) } }); return true })()`)
  await sleep(600)
  const fg = await s.ev(`({ done: sim.driveGates[0].done, gatePts: sim.score().lines.find((l) => l.key === 'gate'), gateMult: sim.run.gateMult, meter: document.querySelector('#score-hud .mult').textContent, banners: __t.banner() })`)
  await shot(s, file, 'gate-done')
  ok(P, 'FO-2p', 'whole flock through a drive gate in the page: 40 × 50, the gate cleared, the meter reads ×2', fg.done && fg.gatePts && fg.gatePts.points === 2000 && fg.gateMult === 1 && fg.meter === '×2', JSON.stringify(fg).slice(0, 200))
  await sleep(300)
  const errs = s.errors.slice(errs0)
  ok(P, 'errors', 'zero console errors across the whole session', errs.length === 0, errs.slice(0, 4).join(' | '))
}

async function runThrowing(s, file) {
  const P = file + ' (storage throws)'
  const errs0 = s.errors.length
  const r = await s.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError') } })` })
  await s.send('Page.navigate', { url: WEB + file })
  await sleep(3500)
  await s.ev(HELP)
  await s.ev(`__t.setHerd(10); __t.setSeed(4242); true`); await sleep(300)
  await s.ev(`__t.crossAll(); true`); await sleep(500)
  await s.ev(`document.getElementById('card').click(); true`); await sleep(100)
  const c = await s.ev(`({ card: __t.card(), hud: __t.hud(), total: __t.fmt(sim.score().total) })`)
  await s.ev(`document.querySelector('#card button[data-card="history"]').click(); true`); await sleep(120)
  const h = await s.ev(`__t.panel()`)
  await s.ev(`document.querySelector('#card button[data-card="collection"]').click(); true`); await sleep(120)
  const k = await s.ev(`__t.panel()`)
  const errs = s.errors.slice(errs0)
  ok(P, 'RC-8', 'storage that throws: page plays, card totals, no best shown, both panels open empty, zero console errors', c.card.shown && c.card.big === c.total && c.card.best === '' && !/best/.test(c.hud) && h.shown && h.rows <= 0 && k.shown && k.items === 29 && k.none === 29 && errs.length === 0, `best "${c.card.best}", history rows ${h.rows}, collection greyed ${k.none}/29, errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
  await s.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: r.result.identifier })
}

// VH-12: phone landscape — the HUD shrinks and stays clear of the pad
async function runPhone(s, file) {
  const P = file + ' (phone landscape)'
  const errs0 = s.errors.length
  await s.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true })
  await s.send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await s.send('Page.navigate', { url: WEB + file })
  await sleep(5000)
  const v = await s.ev(`(() => { const hud = document.getElementById('score-hud').getBoundingClientRect(), pad = document.getElementById('side').getBoundingClientRect(), cam = document.getElementById('cam-bar')
    const cr = cam ? cam.getBoundingClientRect() : null
    return { coarse: matchMedia('(pointer: coarse) and (max-height: 600px)').matches, size: parseFloat(getComputedStyle(document.querySelector('#score-hud .pts')).fontSize), hudRight: hud.right, hudBottom: hud.bottom, padLeft: pad.left, h: innerHeight, camTop: cr ? cr.top : null } })()`)
  await shot(s, file, 'phone')
  const errs = s.errors.slice(errs0)
  ok(P, 'VH-12', 'phone landscape: the HUD is smaller, readable, and does not overlap the pad', v.coarse && v.size >= 20 && v.size < 40 && v.hudRight < v.padLeft && v.hudBottom < v.h && errs.length === 0, JSON.stringify(v))
  await s.send('Emulation.clearDeviceMetricsOverride'); await s.send('Emulation.setTouchEmulationEnabled', { enabled: false })
}

;(async () => {
  let code = 1
  try {
    const s = session(await connect())
    await s.open
    await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Log.enable')
    const only = process.argv[2]
    if (only && !['2d.html', '3d.html', '3d-assault.html'].includes(only)) throw new Error('unknown page ' + only)
    for (const f of ['2d.html', '3d.html', '3d-assault.html']) {
      if (only && only !== f) continue
      try { await runPage(s, f, { wait: f === '2d.html' ? 2500 : 5000 }) } catch (e) { ok(f, 'crash', 'test run completed', false, e.message) }
      try { await runThrowing(s, f) } catch (e) { ok(f, 'crash-throw', 'storage-throws run completed', false, e.message) }
      if (f !== '2d.html') { try { await runPhone(s, f) } catch (e) { ok(f, 'crash-phone', 'phone-landscape run completed', false, e.message) } }
      await s.ev(`(() => { try { localStorage.clear() } catch (e) {} return true })()`).catch(() => {})
    }
    let fails = 0
    for (const r of results) { if (!r.pass) fails++; console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.page.padEnd(16)} ${r.id.padEnd(12)} ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`) }
    console.log(`\n${results.length - fails}/${results.length} passed`)
    code = fails ? 1 : 0
  } catch (e) { console.error('HARNESS', e) }
  chrome.kill()
  await sleep(300)
  try { fs.rmSync(prof, { recursive: true, force: true }) } catch (e) {}
  process.exit(code)
})()
