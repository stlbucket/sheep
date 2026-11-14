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
  { id: 'panel-meta', title: 'Course & Meta', categories: ['Stage', 'Gate + Crush', 'Spawn', 'Scoring', 'Debug', 'Sim'], collapsed: true },
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
