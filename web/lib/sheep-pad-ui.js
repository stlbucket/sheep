// ============================================================================
// sheep-pad-ui.js — the dog pad's look, shared by every page (owner 2026-11-18).
//
//   1 The pad button for the command the dog is ON is filled solid green — in
//     regular play and in demo mode alike (the pages already toggle `.active`
//     on it every frame; this is only the paint, in one place for all pages).
//   2 Every command GIVEN — a pad button, a key, or the demo handler — flashes
//     its name in the space under the secondary buttons: below the camera row
//     on the 3D pages, below the reseed / pause row on the 2D page.
//
//   3 A MAIN MENU button back to index.html on every version, made like the
//     reseed-row buttons and level with that row: on the 3D pages it floats
//     halfway between the scoring block (upper left) and the secondary buttons
//     (top centre); on the 2D page, whose reseed row is under the pad, it is the
//     first button of that row.
//
//   A page calls, once `sim` exists:   PadUI.init(sim)
//   A command that is not a sim verb (the assault page's battle stations) calls
//   PadUI.flash('BATTLE STATIONS') itself.
// ============================================================================
const PadUI = (() => {
  let el = null
  const CSS = `
    #controls button[data-cmd].active:not([data-cmd="battle_stations"]),
    body.drawer-closed #controls button[data-cmd].active:not([data-cmd="battle_stations"]) {
      background: #1fa64a; border-color: #8df0ad; color: #fff; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.45); }
    #controls button[data-cmd].active:not([data-cmd="battle_stations"]) kbd { opacity: 0.85; color: #eafff0; border-color: rgba(255, 255, 255, 0.5); }
    #cmd-flash { height: 46px; line-height: 46px; text-align: center; font: 800 38px/46px system-ui, sans-serif; letter-spacing: 0.08em; color: #8df0ad;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.85); white-space: nowrap; pointer-events: none; opacity: 0; }
    #controls #cmd-flash { width: 100%; font-size: 30px; }
    #cmd-flash.go { animation: cmd-flash 2.6s ease-out forwards; }
    @keyframes cmd-flash { 0% { opacity: 0; transform: scale(1.35); } 6% { opacity: 1; transform: scale(1); } 45% { opacity: 1; } 100% { opacity: 0; } }
    #menu-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer; white-space: nowrap; }
    #stage > #menu-btn { position: absolute; z-index: 5; transform: translateX(-50%); height: var(--cs-h, 24px); padding: 0 10px; min-width: var(--cs-w, 68px);
      font: inherit; font-size: 12px; color: #cdd6df; background: rgba(16, 20, 24, 0.72); border: 1px solid #37424c; border-radius: 999px; }
    #stage > #menu-btn:hover { background: rgba(44, 53, 61, 0.85); }
    #controls .aux #menu-btn { padding: 3px 8px; font: inherit; font-size: 12px; color: #cdd6df; background: #232b32; border: 1px solid #37424c; border-radius: 999px; }
    #controls .aux #menu-btn:hover { background: #2c363f; }
    @media (pointer: coarse) and (max-height: 600px) { #stage > #menu-btn { font-size: 9px; padding: 0 6px; background: rgba(20, 26, 31, 0.42); } #controls .aux #menu-btn { font-size: 11px; } }
    @media (pointer: coarse) and (max-height: 600px) { #cmd-flash { height: 28px; font-size: 22px; line-height: 28px; } }`

  // the name of what was just asked for — the pad's own words for the verb + entry opts
  function label(sim, cmd, opts) {
    const o = opts || {}
    if (cmd === 'walk_on' && sim.dog.command === 'easy') return { bark: 'BARK', lean: 'LEAN' }[o.impulse] || 'SHOVE' // E3: walk-on from easy is an impulse
    if (cmd === 'come_by') return o.easy ? 'COME EASY' : 'COME BY'
    if (cmd === 'away') return o.easy ? 'AWAY EASY' : 'AWAY'
    if (cmd === 'lie_down') return o.side < 0 ? 'LEFT DOWN' : o.side > 0 ? 'RIGHT DOWN' : 'LIE DOWN'
    return { walk_on: 'WALK ON', easy: 'EASY', that_ll_do: "THAT'LL DO" }[cmd] || "THAT'LL DO" // an unknown verb is a recall in the sim
  }

  function flash(text) {
    if (!el) return
    el.textContent = text
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go') // restart the animation
  }

  // 3D: level with the reseed row, halfway between the scoring block's own (minimum) width and the left end of the secondary buttons.
  // The block's width is read when the page is laid out (a fresh score) or resized, never per frame, and is at least its
  // minimum width — so the button does not creep sideways as the score grows.
  function placeMenu(menu) {
    const stage = document.getElementById('stage'), hud = document.getElementById('score-hud')
    const row = document.querySelector('#center-stack .aux'), wide = document.getElementById('cam-bar') || row
    if (!stage || !row) return
    const s = stage.getBoundingClientRect(), r = row.getBoundingClientRect(), w = wide.getBoundingClientRect()
    const ox = s.left + stage.clientLeft, oy = s.top + stage.clientTop // absolute children sit in the stage's padding box
    let edge = 8
    if (hud) {
      const cs = getComputedStyle(hud), min = hud.offsetLeft + (parseFloat(cs.minWidth) || 0) + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
      edge = Math.max(min, Math.min(hud.getBoundingClientRect().right - ox, min + 40)) // the live width only up to a little past the minimum
    }
    menu.style.left = ((edge + (w.left - ox)) / 2).toFixed(1) + 'px'
    menu.style.top = (r.top - oy).toFixed(1) + 'px'
  }
  function addMenu() {
    const menu = document.createElement('a'); menu.id = 'menu-btn'; menu.href = 'index.html'; menu.textContent = 'main menu'
    menu.title = 'back to the main menu — pick a version'
    const stage = document.getElementById('stage'), aux2d = document.querySelector('#controls .aux')
    if (stage && document.getElementById('center-stack')) {
      stage.appendChild(menu)
      const place = () => placeMenu(menu)
      place(); requestAnimationFrame(place); setTimeout(place, 400) // again once the score block and the mode buttons have laid out
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(place).observe(stage)
      window.addEventListener('resize', place)
    } else if (aux2d) aux2d.insertBefore(menu, aux2d.firstChild)
  }

  function init(sim) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st)
    addMenu()
    el = document.createElement('div'); el.id = 'cmd-flash'
    const stack = document.getElementById('center-stack'), aux = document.querySelector('#controls .aux')
    if (stack) stack.appendChild(el)                 // 3D: under the camera row
    else if (aux) aux.insertAdjacentElement('afterend', el) // 2D: under the reseed / pause row
    else document.body.appendChild(el)
    // every command reaches the dog through sim.setCommand — the player's and the demo handler's alike
    const set0 = sim.setCommand.bind(sim)
    sim.setCommand = (cmd, opts) => {
      const quiet = cmd === 'that_ll_do' && sim.run.t < 0.05 // the recall a new course / a reset starts with is nobody's command
      if (!quiet) flash(label(sim, cmd, opts))
      return set0(cmd, opts)
    }
  }

  return { init, flash }
})()
