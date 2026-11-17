// Page suite — drives web/2d.html, web/3d.html and web/3d-assault.html in headless Chrome straight from file://
// (no web server), over the DevTools websocket. Needs node 22+ (global WebSocket / fetch), Google Chrome, and
// network access (lil-gui and three.js load from a CDN).
//   node test/pages.test.js              all three pages (about 2 minutes)
//   node test/pages.test.js 2d.html      one page
//   CHROME=/path/to/chrome node test/pages.test.js    a different Chrome binary
// Screenshots land in test/shots/ (git-ignored). Exit code 1 on any failure.
// Criteria: .claude/sheep/implemented/POC-v14/{scoring,field-objectives,replay-modes}.md
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
  setSeed(v) { const el = document.getElementById('seed-input'); el.value = v; el.dispatchEvent(new Event('change')) },
  setHerd(v) { const el = document.getElementById('herd-size'); el.value = v; el.dispatchEvent(new Event('change')) },
  card() { const c = document.getElementById('card'); return { shown: c.style.display === 'block', done: c.classList.contains('done'), big: c.querySelector('.big') ? c.querySelector('.big').textContent : '', best: c.querySelector('.best') ? c.querySelector('.best').textContent : '', title: c.querySelector('h2') ? c.querySelector('h2').textContent : '', stars: c.querySelectorAll('.stars b').length, rows: c.querySelectorAll('.row').length, text: c.textContent } },
  badge() { return document.getElementById('score-badge').textContent },
  modeBtn(label) { return Array.from(document.querySelectorAll('#controls .aux button.mode')).find((b) => b.textContent.startsWith(label)) },
  fmt(n) { return Math.round(n).toLocaleString('en-US') },
}; true`

async function runPage(s, file, opts = {}) {
  const P = file
  const errs0 = s.errors.length
  await s.send('Page.navigate', { url: WEB + file })
  await sleep(opts.wait || 3500)
  await s.ev(HELP)
  const booted = await s.ev(`typeof ScoreUI === 'object' && typeof sim === 'object' && !!document.getElementById('score-badge')`)
  ok(P, 'load', 'page loads; score lib, sim and badge present', booted)

  // ---- SC: badge, pops, card
  await s.ev(`__t.setHerd(10); __t.setSeed(4242); true`)
  await sleep(400)
  const b0 = await s.ev(`({ pts: sim.score().total, badge: __t.badge(), n: sim.sheep.length, mode: params.mode })`)
  ok(P, 'SC-1', 'fresh run shows score 0', b0.pts === 0 && b0.badge.startsWith('0') && b0.n === 10, JSON.stringify(b0))
  await s.ev(`__t.cross(0); __t.cross(1); __t.cross(2); true`)
  await sleep(350)
  const p1 = await s.ev(`({ pops: document.querySelectorAll('#score-pops .pop').length, pts: sim.score().total, badge: __t.badge(), hud: document.getElementById('hud').textContent, placed: Array.from(document.querySelectorAll('#score-pops .pop')).filter((e) => e.style.transform.includes('translate')).length })`)
  ok(P, 'SC-9', 'each crossing produces a pop; badge and HUD show the running score', p1.pops === 3 && p1.placed >= 1 && p1.pts > 0 && p1.badge.includes(p1.pts.toLocaleString('en-US')) && /score /.test(p1.hud), `pops ${p1.pops}, placed ${p1.placed}, pts ${p1.pts}, badge "${p1.badge}"`)
  await s.send('Page.captureScreenshot', { format: 'png' }).then((r) => fs.writeFileSync(path.join(SHOTS, file.replace('.html', '') + '-pops.png'), Buffer.from(r.result.data, 'base64')))
  await s.ev(`__t.crossAll(); true`)
  await sleep(500)
  const c1 = await s.ev(`({ card: __t.card(), sc: sim.score() })`)
  ok(P, 'SC-10a', 'the card appears when the run ends and is still counting up', c1.card.shown && !c1.card.done && c1.sc.finished && c1.sc.won, `shown ${c1.card.shown}, done ${c1.card.done}, big ${c1.card.big}`)
  await s.send('Page.captureScreenshot', { format: 'png' }).then((r) => fs.writeFileSync(path.join(SHOTS, file.replace('.html', '') + '-card-counting.png'), Buffer.from(r.result.data, 'base64')))
  await s.ev(`document.getElementById('card').click(); true`)
  await sleep(150)
  const c2 = await s.ev(`({ card: __t.card(), sc: sim.score(), want: __t.fmt(sim.score().total) })`)
  ok(P, 'SC-10b', 'a click skips to the final card; its total equals the sim total; rows = score lines', c2.card.done && c2.card.big === c2.want && c2.card.rows === c2.sc.lines.length && c2.card.stars === c2.sc.stars, `big ${c2.card.big} vs ${c2.want}, stars ${c2.card.stars}, awards ${c2.sc.awards.join('/')}`)
  await s.send('Page.captureScreenshot', { format: 'png' }).then((r) => fs.writeFileSync(path.join(SHOTS, file.replace('.html', '') + '-card.png'), Buffer.from(r.result.data, 'base64')))
  const total1 = c2.sc.total

  // ---- RM1/RM2: best saved, survives reload, lower total leaves it
  ok(P, 'RM-1a', 'first finished run on a course shows New best!', /New best!/.test(c2.card.best), c2.card.best)
  await s.send('Page.navigate', { url: WEB + file })
  await sleep(opts.wait || 3500)
  await s.ev(HELP)
  await s.ev(`__t.setHerd(10); __t.setSeed(4242); true`)
  await sleep(400)
  const r1 = await s.ev(`({ badge: __t.badge(), hud: document.getElementById('hud').textContent })`)
  ok(P, 'RM-1b', 'the best survives a reload and shows beside the running score', r1.badge.includes('best ' + total1.toLocaleString('en-US')) && r1.hud.includes('best'), r1.badge)
  // a worse run: one sheep at a time, far apart (no stream, no time bonus) — stepped in-page
  await s.ev(`(() => { for (let i = 0; i < sim.sheep.length; i++) { __t.cross(i); sim.step(1/60); for (let k = 0; k < 60 * 8 && !sim.run.finished; k++) sim.step(1/60) } return sim.run.finished })()`)
  await sleep(400)
  await s.ev(`document.getElementById('card').click(); true`)
  await sleep(100)
  const r2 = await s.ev(`({ card: __t.card(), total: sim.score().total, stored: JSON.parse(localStorage.getItem(ScoreUI.STORE))[ScoreUI.courseKey(sim)].total })`)
  ok(P, 'RM-2', 'a lower second total leaves the saved best unchanged', r2.total < total1 && r2.stored === total1 && !/New best/.test(r2.card.best) && r2.card.best.includes(total1.toLocaleString('en-US')), `second ${r2.total} < ${total1}; card "${r2.card.best}"`)
  // tuned run is not saved (Q87)
  await s.ev(`params.penPoints = 1000; __t.setSeed(4243); true`)
  await sleep(300)
  await s.ev(`__t.crossAll(); true`); await sleep(500)
  await s.ev(`document.getElementById('card').click(); true`); await sleep(100)
  const r3 = await s.ev(`({ best: __t.card().best, stored: (ScoreUI.courseKey(sim) in JSON.parse(localStorage.getItem(ScoreUI.STORE))) ? 1 : 0 })`)
  await s.ev(`params.penPoints = 100; true`)
  ok(P, 'RM-Q87', 'a run with a changed setting shows "tuned — not saved" and stores nothing', /tuned — not saved/.test(r3.best) && r3.stored === 0, `"${r3.best}", stored for this course: ${r3.stored}`)

  // ---- RM4 daily
  await s.ev(`__t.modeBtn('daily').click(); true`); await sleep(400)
  const d1 = await s.ev(`({ mode: params.mode, seed: sim.seed, want: ScoreUI.dailySeed(), pos: [sim.gate.x, sim.gate.y, sim.layout, sim.sheep.length, sim.sheep.map((q) => q.kind[0]).join(''), sim.obstacles.map((o) => o.x.toFixed(1)).join()].join('|'), key: ScoreUI.courseKey(sim), active: __t.modeBtn('daily').classList.contains('active'), n: sim.sheep.length })`)
  await s.ev(`__t.modeBtn('daily').click(); true`); await sleep(400)
  const d2 = await s.ev(`({ mode: params.mode, seed: sim.seed, n: sim.sheep.length })`)
  await s.ev(`__t.modeBtn('daily').click(); true`); await sleep(400)
  const d3 = await s.ev(`({ mode: params.mode, seed: sim.seed, pos: [sim.gate.x, sim.gate.y, sim.layout, sim.sheep.length, sim.sheep.map((q) => q.kind[0]).join(''), sim.obstacles.map((o) => o.x.toFixed(1)).join()].join('|') })`)
  ok(P, 'RM-4', 'daily pressed twice on the same date gives the identical course; leaving restores the herd', d1.mode === 'daily' && d1.seed === d1.want && d1.active && d2.mode === 'course' && d2.seed !== d1.seed && d2.n === 10 && d3.pos === d1.pos, `seed ${d1.seed}/${d1.want}, flock ${d1.n}, active ${d1.active}, left → ${d2.mode}/${d2.n}/${d2.seed}, same ${d3.pos === d1.pos}, d3 ${d3.mode}/${d3.seed}`)
  // typed seed = same number → course mode, separate key
  const k2 = await s.ev(`(async () => { __t.setSeed(${0} + ScoreUI.dailySeed() + 1); await new Promise((r) => setTimeout(r, 300)); const a = params.mode; __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); const dk = ScoreUI.courseKey(sim); return { a, dk } })()`)
  ok(P, 'RM-5', 'a typed seed leaves daily mode; the daily best key carries the mode', k2.a === 'course' && k2.dk.includes('|daily|'), JSON.stringify(k2))
  // a different date → a different course
  const d4 = await s.ev(`(async () => { __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); const RealDate = Date; window.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(2031, 4, 9) } }; __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); const out = { seed: sim.seed, pos: [sim.gate.x, sim.gate.y, sim.layout, sim.sheep.length, sim.sheep.map((q) => q.kind[0]).join(''), sim.obstacles.map((o) => o.x.toFixed(1)).join()].join('|') }; window.Date = RealDate; __t.modeBtn('daily').click(); await new Promise((r) => setTimeout(r, 300)); return out })()`)
  ok(P, 'RM-4b', 'another system date gives a different daily course', d4.seed === 20310509 && d4.pos !== d1.pos, `seed ${d4.seed}`)

  // ---- RM5 waves in the page
  await s.ev(`__t.setHerd(10); __t.setSeed(777); true`); await sleep(300)
  await s.ev(`__t.modeBtn('waves').click(); true`); await sleep(500)
  const w1 = await s.ev(`({ mode: params.mode, n: sim.sheep.length, badge: __t.badge(), gates: sim.driveGates.length })`)
  await s.ev(`__t.crossAll(); true`); await sleep(700)
  const w2 = await s.ev(`({ wave: sim.run.wave, n: sim.sheep.length, pts: sim.score().total, badge: __t.badge(), fin: sim.run.finished })`)
  await s.send('Page.captureScreenshot', { format: 'png' }).then((r) => fs.writeFileSync(path.join(SHOTS, file.replace('.html', '') + '-wave2.png'), Buffer.from(r.result.data, 'base64')))
  await s.ev(`sim.run.clock = 0.05; true`); await sleep(500)
  await s.ev(`document.getElementById('card').click(); true`); await sleep(100)
  const w3 = await s.ev(`({ card: __t.card(), total: __t.fmt(sim.score().total) })`)
  ok(P, 'RM-wave', 'waves button: 8 sheep, clock in the badge; full pen → wave 2 with 10 sheep, score kept; clock zero → card with waves cleared',
    w1.mode === 'waves' && w1.n === 8 && w1.badge.includes('⏱') && w1.gates === 0 && w2.wave === 1 && w2.n === 10 && w2.pts > 0 && !w2.fin && w3.card.shown && /1 wave cleared/.test(w3.card.text) && w3.card.big === w3.total,
    `start ${w1.n}, then wave ${w2.wave + 1} with ${w2.n}, ${w2.pts} pts, card "${w3.card.title}"`)
  await s.ev(`__t.modeBtn('waves').click(); true`); await sleep(400)
  const w4 = await s.ev(`({ mode: params.mode, n: sim.sheep.length })`)
  ok(P, 'RM-wave-off', 'leaving wave mode returns to the course with the slider herd', w4.mode === 'course' && w4.n === 10, JSON.stringify(w4))

  // ---- FO render: a seed with a gate and all three specials
  const fo = await s.ev(`(async () => { params.driveGateChance = 1; params.goldenChance = 1; params.lambChance = 1; params.ramChance = 1; __t.setHerd(40); __t.setSeed(31); await new Promise((r) => setTimeout(r, 900)); const out = { gates: sim.driveGates.length, kinds: sim.sheep.filter((q) => q.kind !== 'ewe').map((q) => q.kind).sort().join(',') }; return out })()`)
  await s.send('Page.captureScreenshot', { format: 'png' }).then((r) => fs.writeFileSync(path.join(SHOTS, file.replace('.html', '') + '-objectives.png'), Buffer.from(r.result.data, 'base64')))
  ok(P, 'FO-10', 'a course with drive gates and all three specials renders', fo.gates >= 1 && fo.kinds === 'golden,lamb,ram', JSON.stringify(fo))
  // drive a few sheep through a gate → pops + done state re-render
  await s.ev(`(() => { const d = sim.driveGates[0]; sim.sheep.forEach((q, i) => { q.pos = { x: d.x - d.nx * (12 + (i % 5) * 2), y: d.y - d.ny * (12 + (i % 5) * 2) } }); return true })()`)
  await sleep(200)
  await s.ev(`(() => { const d = sim.driveGates[0]; sim.sheep.forEach((q, i) => { q.pos = { x: d.x + d.nx * (12 + (i % 5) * 2), y: d.y + d.ny * (12 + (i % 5) * 2) } }); return true })()`)
  await sleep(600)
  const fg = await s.ev(`({ done: sim.driveGates[0].done, gatePts: sim.score().lines.find((l) => l.key === 'gate') })`)
  await s.send('Page.captureScreenshot', { format: 'png' }).then((r) => fs.writeFileSync(path.join(SHOTS, file.replace('.html', '') + '-gate-done.png'), Buffer.from(r.result.data, 'base64')))
  ok(P, 'FO-4p', 'whole flock through a drive gate in the page: gate done, 40×100 + 500', fg.done && fg.gatePts && fg.gatePts.points === 4500, JSON.stringify(fg))
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
  const c = await s.ev(`({ card: __t.card(), badge: __t.badge(), total: __t.fmt(sim.score().total) })`)
  const errs = s.errors.slice(errs0)
  ok(P, 'RM-3', 'storage that throws: page plays, card totals, no best shown, zero console errors', c.card.shown && c.card.big === c.total && c.card.best === '' && !/best/.test(c.badge) && errs.length === 0, `best "${c.card.best}", errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
  await s.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: r.result.identifier })
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
      await s.ev(`(() => { try { localStorage.removeItem('sheep.best.v1') } catch (e) {} return true })()`).catch(() => {})
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
