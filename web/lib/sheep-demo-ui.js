// ============================================================================
// sheep-demo-ui.js — DEMO MODE (owner 2026-11-18): the page half of lib/sheep-auto.js.
//
//   Adds a `demo ▶` button beside reseed (and the A key). While it is on, the
//   AutoHandler issues the dog's commands through sim.setCommand — exactly what
//   the pad sends — so the pad's own highlight follows him, and a line on the
//   stage says what he is doing and why. Any command from the player (a pad
//   button, an arrow key, ⏎) hands the dog straight back. Demo survives a
//   reseed / replay, so it can be left running course after course.
//   Until demo has been turned on once in this browser, the button pulses blue
//   every few seconds to draw the eye.
//   First visit (owner 2026-11-18): a welcome popup offers the demo or `maybe
//   later`. It is shown once and only once per browser. `maybe later` closes it,
//   pulses the demo button five times, then leaves it on its regular pulse.
//   A run the demo touched is never saved (ScoreUI.demoRun): no best, no
//   history, no collection.
//
//   A page calls, once `sim` exists:   DemoUI.init({ stage })
//   and in its fixed-step loop:        DemoUI.step(sim, dt); sim.step(dt)
// ============================================================================
const DemoUI = (() => {
  const auto = new AutoHandler()
  let on = false, btn = null, sayEl = null, run = null, pulse = 0, lastCmd = ''
  const CSS = `
    #demo-say { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 6; max-width: 92%; padding: 5px 12px; border-radius: 14px;
      background: rgba(20, 26, 31, 0.78); border: 1px solid #4c8a5e; color: #eafaef; font: 13px/1.3 system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      pointer-events: none; display: none; }
    #demo-say b { color: #7fd79a; letter-spacing: 0.06em; margin-right: 8px; }
    #demo-say .cmd { color: #ffd66b; font-weight: 600; margin-right: 8px; }
    #controls button[data-cmd].demo-pulse { box-shadow: 0 0 0 2px #ffd66b, 0 0 14px 2px rgba(255, 214, 107, 0.55); }
    /* never used demo in this browser → the button pulses blue every few seconds until it is tried once */
    #demo-btn.hint { animation: demo-hint 5s ease-in-out infinite; }
    @keyframes demo-hint {
      0%, 64%, 100% { box-shadow: 0 0 0 0 rgba(77, 163, 255, 0); border-color: #37424c; background-color: rgba(16, 20, 24, 0.72); color: #cdd6df; }
      72%, 88% { box-shadow: 0 0 0 3px rgba(77, 163, 255, 0.55), 0 0 16px 4px rgba(77, 163, 255, 0.75); border-color: #9fd0ff; background-color: #1f6fd0; color: #fff; }
      80% { box-shadow: 0 0 0 1px rgba(77, 163, 255, 0.3), 0 0 6px 1px rgba(77, 163, 255, 0.4); border-color: #6fb4ff; background-color: #1a56a0; color: #fff; }
    }
    /* "maybe later" on the welcome popup: five quick pulses, then back to the regular schedule above */
    #demo-btn.burst { animation: demo-burst 0.9s ease-in-out 5; }
    @keyframes demo-burst {
      0%, 100% { box-shadow: 0 0 0 0 rgba(77, 163, 255, 0); border-color: #37424c; background-color: rgba(16, 20, 24, 0.72); color: #cdd6df; }
      50% { box-shadow: 0 0 0 3px rgba(77, 163, 255, 0.55), 0 0 16px 4px rgba(77, 163, 255, 0.75); border-color: #9fd0ff; background-color: #1f6fd0; color: #fff; }
    }
    #welcome { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(8, 12, 15, 0.55); }
    #welcome .box { max-width: 420px; width: 100%; padding: 22px 22px 18px; border-radius: 16px; background: rgba(20, 26, 31, 0.96); border: 1px solid #4c8a5e;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); color: #eafaef; font: 15px/1.45 system-ui, sans-serif; text-align: center; }
    #welcome h2 { margin: 0 0 8px; font-size: 21px; font-weight: 700; color: #fff; }
    #welcome p { margin: 0 0 16px; color: #cdd6df; }
    #welcome .row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    #welcome button { font: 600 15px system-ui, sans-serif; padding: 10px 18px; border-radius: 22px; cursor: pointer; border: 1px solid #37424c; background: rgba(16, 20, 24, 0.72); color: #cdd6df; }
    #welcome button.go { background: #1f6fd0; border-color: #9fd0ff; color: #fff; }
    @media (max-height: 520px) { #welcome .box { padding: 12px 16px 12px; font-size: 13px; } #welcome h2 { font-size: 17px; margin-bottom: 4px; } #welcome p { margin-bottom: 10px; } #welcome button { padding: 7px 14px; font-size: 13px; } }
    @media (max-height: 520px) { #demo-say { font-size: 11px; bottom: 4px; padding: 3px 9px; } }`
  const NAMES = { come_by: 'COME BY', away: 'AWAY', walk_on: 'WALK ON', easy: 'EASY', lie_down: 'LIE DOWN', that_ll_do: "THAT'LL DO" }
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

  // has demo ever been turned on in this browser? (one flag for every page; storage may be missing or throw — then it only lasts the session)
  const USED = 'sheep.demoUsed.v1'
  let used = false
  try { used = localStorage.getItem(USED) === '1' } catch (e) {}
  function markUsed() {
    used = true
    try { localStorage.setItem(USED, '1') } catch (e) {}
    if (btn) btn.classList.remove('hint')
  }

  // the welcome popup: once and only once per browser. The flag is written before the popup goes up, and a browser
  // whose storage cannot remember it is never shown the popup at all (it would come back on every visit).
  const WELCOMED = 'sheep.welcomed.v1'
  function firstVisit() {
    try {
      if (localStorage.getItem(WELCOMED) === '1') return false
      localStorage.setItem(WELCOMED, '1')
      return localStorage.getItem(WELCOMED) === '1'
    } catch (e) { return false }
  }
  function burst() {                                           // five quick pulses, then the regular schedule (`hint`) carries on
    if (!btn) return
    btn.classList.add('burst')
    const done = () => btn.classList.remove('burst')
    btn.addEventListener('animationend', done, { once: true }); setTimeout(done, 5000)
  }
  function welcome() {
    if (!btn || !firstVisit()) return
    const pause = document.getElementById('pause-btn')
    const held = !!pause && /^pause/.test(pause.textContent)   // hold the course while the popup is up
    if (held) pause.click()
    const w = document.createElement('div'); w.id = 'welcome'
    w.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="welcome-h"><h2 id="welcome-h">Welcome to One Dude and His Dog</h2>
      <p>Whistle the dog round the flock and bring every sheep home to the pen. New here? Watch the dog work a course by himself first.</p>
      <div class="row"><button class="go" id="welcome-demo">watch the demo</button><button id="welcome-later">maybe later</button></div></div>`
    document.body.appendChild(w)
    const close = (demo) => {
      if (!w.parentNode) return
      w.remove(); window.removeEventListener('keydown', key, true)
      if (held && /^resume/.test(pause.textContent)) pause.click()
      if (demo) set(true); else burst()
    }
    const key = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(false) } }
    window.addEventListener('keydown', key, true)
    w.querySelector('#welcome-demo').addEventListener('click', () => close(true))
    w.querySelector('#welcome-later').addEventListener('click', () => close(false))
    w.querySelector('#welcome-demo').focus()
  }

  function set(v) {
    on = !!v
    if (on) { auto.reset(); if (!used) markUsed() }
    if (btn) { btn.classList.toggle('active', on); btn.textContent = on ? 'demo ■' : 'demo ▶' }
    if (sayEl) sayEl.style.display = on ? 'block' : 'none'
    if (!on) for (const b of document.querySelectorAll('#controls button.demo-pulse')) b.classList.remove('demo-pulse')
  }
  const toggle = () => set(!on)

  function init(opts) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st)
    sayEl = document.createElement('div'); sayEl.id = 'demo-say'
    ;(opts && opts.stage || document.body).appendChild(sayEl)
    const aux = document.querySelector('#center-stack .aux, #controls .aux')
    if (aux) {
      btn = document.createElement('button'); btn.id = 'demo-btn'; btn.textContent = 'demo ▶'
      btn.title = 'demo mode — the dog works the course by himself and the pad lights the command he is on. Any command of yours takes him back — A'
      btn.addEventListener('click', () => { toggle(); btn.blur() })
      if (!used) btn.classList.add('hint')
      aux.appendChild(btn)
    }
    welcome()
    // the player takes the dog back: a pad button, or one of the command keys (capture phase — before the page's own handlers)
    document.addEventListener('click', (ev) => { if (on && ev.isTrusted && ev.target.closest && ev.target.closest('#controls button[data-cmd]')) set(false) }, true)
    window.addEventListener('keydown', (ev) => {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return
      if (on && (ev.key.startsWith('Arrow') || ev.key === 'Enter')) return set(false)
      if (ev.key.toLowerCase() === 'a' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) toggle()
    }, true)
  }

  // once per sim tick, before sim.step
  function step(sim, dt) {
    if (!on) return
    if (sim.run !== run) { run = sim.run; auto.reset() }       // a new course / a replay: start the plan again
    if (typeof ScoreUI !== 'undefined' && ScoreUI.demoRun) ScoreUI.demoRun(sim)
    auto.step(sim, dt)
  }

  // once per rendered frame: the readout + a pulse on the pad button whenever the command changes
  function frame(sim) {
    if (!on || !sayEl) return
    const d = sim.dog
    const cmd = d.command + (d.flankEasy ? '_easy' : '')
    if (cmd !== lastCmd) { lastCmd = cmd; pulse = performance.now() + 450 }
    const lit = performance.now() < pulse
    for (const b of document.querySelectorAll('#controls button[data-cmd]')) b.classList.toggle('demo-pulse', lit && b.classList.contains('active'))
    const html = `<b>DEMO</b><span class="cmd">${NAMES[d.command] || d.command}</span>${esc(auto.say)}`
    if (sayEl.dataset.h !== html) { sayEl.dataset.h = html; sayEl.innerHTML = html }
  }

  return { init, step, frame, set, toggle, auto, get on() { return on } }
})()
