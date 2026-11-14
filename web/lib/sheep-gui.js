'use strict'
// ============================================================================
// lib/sheep-gui.js — the raw-param lil-gui panels, generated from the SETTINGS
//   schema in lib/sheep-sim.js. [throwaway — dev tooling, does not port]
//   Shared by every page. Needs window.lil (lil-gui UMD) and the page's
//   #panel-sheep / #panel-dog / #panel-meta containers to exist already.
//   Defines the globals HOOKS and guis ({ roots, meta }).
// ============================================================================
// Named onChange side effects, looked up by SETTINGS[].onChange when the gui is
// generated. Hooks only fire on user interaction, by which time the page has created `sim`
// and `resizeCanvas` (both must be reachable by global name).
const HOOKS = { respawn: () => { resizeCanvas(); sim.reseed(params.seed) } } // resizeCanvas: §2 (canvasW/H may have changed — Pasture · Scale)


// Q1 panel map (P9): which schema categories live in which of the three GUI
// roots. Sheep-side left · dog-side right · Course & Meta collapsed below the
// dog panel. Data, not wiring — §1 never sees any of this.
const PANELS = [
  { id: 'panel-sheep', title: 'Sheep', categories: ['Sheep', 'Idle', 'Boids', 'Boldness', 'Trot'] },
  { id: 'panel-dog', title: 'Dog', categories: ['Dog', 'Flee / Eye'] },
  { id: 'panel-meta', title: 'Course & Meta', categories: ['Stage', 'Gate + Crush', 'Obstacles', 'Spawn', 'Scoring', 'Debug', 'Sim'], collapsed: true },
]

// lil-gui panels (UMD build → window.lil.GUI) — fully generated from SETTINGS,
// one root per PANELS entry (explicit containers; autoPlace would stack all
// three top-right). Folders appear in first-appearance order; only `exposed`
// entries get controllers (hidden-only categories still get a folder → the
// ⓘ grid host). Returns { roots, meta } — §3 walks all roots.
function buildGui(settings, params, hooks) {
  const catRoot = {}
  const roots = PANELS.map((pn) => {
    const g = new lil.GUI({ title: pn.title, container: document.getElementById(pn.id) })
    if (pn.collapsed) g.close()
    for (const c of pn.categories) catRoot[c] = g
    return g
  })
  const folders = {}
  for (const e of settings) {
    if (!folders[e.category]) {
      if (!catRoot[e.category]) console.warn('[sheep-poc] category not mapped to a panel: ' + e.category)
      folders[e.category] = (catRoot[e.category] || roots[roots.length - 1]).addFolder(e.category)
    }
    if (!e.exposed) continue
    const f = folders[e.category]
    const [holder, prop] = settingTarget(params, e.key, false)
    let ctrls
    if (e.type === 'boolean') ctrls = [f.add(holder, prop).name(e.label)]
    else if (e.type === 'enum') ctrls = [f.add(holder, prop, e.options).name(e.label)] // dropdown
    else if (e.type === 'point') ctrls = [
      f.add(holder[prop], 'x', e.min.x, e.max.x, e.step).name(e.label + ' x'),
      f.add(holder[prop], 'y', e.min.y, e.max.y, e.step).name(e.label + ' y'),
    ]
    else if (e.min === undefined) ctrls = [f.add(holder, prop).name(e.label)] // range-less number → plain field (F4 seed)
    else ctrls = [f.add(holder, prop, e.min, e.max, e.step).name(e.label)]
    for (const c of ctrls) c._setting = e // back-link for tooltips/grid (§3 inspector)
    // range-less fields fire onChange per keystroke — hook them on commit instead
    if (e.onChange) for (const c of ctrls) (e.type !== 'boolean' && e.min === undefined ? c.onFinishChange(hooks[e.onChange]) : c.onChange(hooks[e.onChange]))
  }
  return { roots, meta: roots[roots.length - 1] }
}
const guis = buildGui(SETTINGS, params, HOOKS)

// The `obstacles` slider beside the dog pad (every page). Owner Q65
// (2026-11-14): it is an EXACT COUNT of obstacle groups, and courses are
// RANDOM UNTIL IT IS TOUCHED — a page loads with `random count` on (each
// course draws its own number, usually very few), and the slider then just
// shows what this course drew ("2 · random"). Moving it writes
// params.obstacleFreq, switches params.obstacleRandom off and re-lays the
// course through HOOKS.respawn; from then on every course gets that many.
// (Back to random: tick `random count` in Course & Meta → Obstacles.)
// The SETTINGS entry stays the one source of min/max/step. Pages call
// syncObstacleSlider() from their per-frame HUD update, which also picks up
// changes made on the lil-gui / lever side.
const obstInput = document.getElementById('obst-freq')
const obstOut = document.getElementById('obst-freq-out')
function syncObstacleSlider() {
  if (!obstInput) return
  const live = typeof sim !== 'undefined' && sim
  const shown = String(params.obstacleRandom && live ? Math.min(sim.obstacleGroups, +obstInput.max) : params.obstacleFreq)
  const dragging = document.activeElement === obstInput && obstInput.value !== shown
  if (!dragging && obstInput.value !== shown) obstInput.value = shown
  const txt = dragging ? obstInput.value : shown + (params.obstacleRandom ? ' · random' : '')
  if (obstOut.textContent !== txt) obstOut.textContent = txt
}
if (obstInput) {
  const s = SETTINGS.find((e) => e.key === 'obstacleFreq')
  obstInput.min = s.min; obstInput.max = s.max; obstInput.step = s.step
  obstInput.value = params.obstacleFreq
  obstInput.addEventListener('input', () => { obstOut.textContent = obstInput.value })
  obstInput.addEventListener('change', () => {
    params.obstacleFreq = parseInt(obstInput.value, 10)
    params.obstacleRandom = false
    for (const r of guis.roots) for (const c of r.controllersRecursive()) if (c._setting && (c._setting.key === 'obstacleFreq' || c._setting.key === 'obstacleRandom')) c.updateDisplay()
    HOOKS.respawn()
    obstInput.blur()
    syncObstacleSlider()
  })
}
