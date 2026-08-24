# Phase 1 — Easy replaces stand (I1–I4, E2/E3 amended, D3 superseded)

## ▶ Invocation
**Trigger:** "run phase 1" / next unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phase 0 ticked.
**Do:** implement Tasks in `sheep-poc.html` + `sheep-defaults.json.js`, run
Verify, tick P1 in `plan.md`, **STOP, and report**. **Constraints:** plan.md
Global invariants.

## Goal
The `stand` command/state is removed and `easy` takes its slot everywhere:
a slow forward drive (walk-on's trailing logic at `dogVMax × easySpeedFrac`,
forward eye, E1 gap governor), the E2 auto-conversion target, and the E3
impulse source. Lie-down is the only posture. The flank still hands off to
**walk-on** in this phase (P2 re-aims it at easy).

## Tasks
- **§0 schema (`Dog`):** `easySpeedFrac` float, default **0.33**, 0.1–0.8 ·
  0.01, unit `× dogVMax`, description ≈ "Easy's top speed as a fraction of
  walk-on's — a slow move forward, about a third (I2)". `standBlock` →
  `exposed: false`, description prefixed "SUPERSEDED (POC-v6 P1: stand
  replaced by easy; lie-down is the only posture). Kept for reference."
  `stallDwell`/`shove*` descriptions: "stand" → "easy". `lieDownIntensity`
  description: "while lying down" (drop "/ standing").
- **§0 levers:** Presence row drops `standBlock`; Standoff row gains
  `easySpeedFrac: [0.4, 0.33, 0.25]` (Q35); `LEVER_NOT_LEVERED.superseded`
  gains `standBlock`. Boot line must still read `… · OK`.
- **§1 `setCommand`:** the impulse branch tests `d.command === 'easy'`.
- **§1 `stepDog`:** split the `lie_down`/`stand` case: `lie_down` keeps the
  posture body (target = self, `lieDownIntensity`, face GCM) **without** the
  impulse block. New `case 'easy'` shares walk-on's body — factor the
  front-hemisphere survey + E1 gap controller + trailing target into a
  helper (`driveStep(dt, isEasy)`), with: in walk-on the E2 stall → `d.command
  = 'easy'`; in easy no stall conversion, but the E3 envelope
  (`impulseFactor` hold/decay + smart return → `walk_on`) runs there. Speed:
  the arrive-seek `vmax` is `p.dogVMax * (d.command === 'easy' ?
  p.easySpeedFrac : 1)`.
- **§1 `flee`:** `block` = `lieDownBlock` for `lie_down` else 0 (no `stand`
  branch); the normal-eye branch multiplies by `(d.impulseFactor || 1)` so
  an easy impulse scales the drive eye (Q32).
- **§2 HUD:** nothing to rename (prints `d.command`); `debug.state` label
  unchanged.
- **§3:** pad button `data-cmd="easy"` (label already *Easy*, kbd A); CSS
  selector `[data-cmd="easy"]`; `HOTKEYS.a = 'easy'`; comments "auto-stand"
  → "auto-easy".
- **Defaults file:** add `easySpeedFrac: 0.33` (keep `standBlock` — a
  superseded key still round-trips like `R_orbit`).
- Mirrors: copy to root `index.html` / `sheep-defaults.json.js`.

## Verify (measured, headless)
- **I1 / acceptance 4:** `grep -n "'stand'"` in §1/§3 → none (comments
  aside); `setCommand('stand')` lands in the `that_ll_do` default arm; over
  the E2 jam rig + a scripted gate session `dog.command` never equals
  `'stand'`.
- **I2 / acceptance 5:** seed 1337, flock settled, dog placed 300 px behind
  the flock on the gate axis: issue `easy` → mean speed over the closing
  ticks (gap > `driveTrailGap` + 15) = **0.33 × 110 ≈ 36 px/s ± 10 %**; the
  same geometry under `walk_on` ≈ 110 px/s.
- **I3 / acceptance 6:** continue the easy approach onto the crowd: min
  front gap ≥ `driveTrailGap` − 5 = 35 px; target hard-holds at the gap.
- **I4 / acceptance 7:** v3's manufactured jam (80 sheep, 12 px mouth):
  `walk_on` → `easy` after `stallDwell`, strip value = `easy`; tap walk-on
  from easy → `impulse.name 'shove'`, `impulseFactor` 1.5 for 0.8 s then
  decays; with the crowd moving, smart return lands `walk_on`.
- **Flee profile:** a sheep 50 px dead ahead of an easy dog feels the drive
  eye (`stress` = `smoothstep·(ambient+(1−ambient)·cos^k)·1`), ×1.5 during a
  shove; a lying dog's wall (`lieDownBlock`) is unchanged (D1 numbers = v5).
- **Regressions:** idle 10 s digest = v5; come-by at 1337 still hands off to
  `walk_on` at v5's tick/carry (P2 changes that, not P1); E1 min gap 38–39
  px; F1 0.000°; `[levers] anchor n/n exact · OK` with `easySpeedFrac`
  levered and `standBlock` not-levered.

## Done when
- [ ] `easy` end to end; `stand` gone from §1/§3; `easySpeedFrac` schema +
      defaults + lever row; `standBlock` superseded.
- [ ] I2/I3/I4 + flee-profile checks measured; regressions hold; boot
      assertion OK.
- [ ] Mirrors copied; zero console errors (static) — owner's eyeball.

## Gotchas
- `d.impulseFactor` is reset to 1 at the top of `stepDog` every tick — the
  envelope must run **inside** the easy case each tick or the shove is a
  one-frame blip.
- Keep `d.driveDist` untouched on a walk-on ↔ easy flip (same reason v3
  only resets it on reposition commands) — otherwise each E2 conversion
  kicks the dog back to `R_drive`.
- The smart-return survey uses `d.facing` — set facing **before** it runs.
- `easySpeedFrac` at 0.33 × `dogVMax` 110 = 36 px/s is **below** sheep
  `vMax` 90: an easy dog cannot head a bolting sheep; that is the rule (I2),
  not a bug — note it in the report.
