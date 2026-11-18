'use strict'
// ============================================================================
// lib/sheep-sim.js — the herding game's PHYSICS: §0 PARAMS + §1 SIM.
//   Shared by every page (2d.html, 3d.html, 3d-assault.html). DOM-free: no
//   document / window / canvas / lil-gui — it also loads in plain node.
//   A classic script, not an ES module (a local module can't be imported from
//   file://): its top-level names — SETTINGS, params, LEVERS, FlockSim, vec2,
//   makePRNG … — are globals the page's own scripts use directly.
//   Load order: sheep-defaults.json.js → lib/sheep-sim.js → lib/sheep-gui.js.
// ============================================================================
// ============================================================================
// §0 PARAMS — the single `params` object (SALVAGE ARTIFACT — ports as data)
//   All tunables live here and are bound to lil-gui as phases introduce them.
// ============================================================================
// The SETTINGS schema (POC-v2): single source of truth for every tunable.
// `params` defaults and every lil-gui folder/controller are GENERATED from it.
// §1 SIM still receives only the resolved plain `params` object — the schema
// itself is dev tooling and does not port to Godot.
// Entry fields: key category label type default [min max step] unit description
//   exposed (has a slider?) · export (in the P7 JSON? default true) · onChange (HOOKS name)
//   type 'enum' (POC-v5): `options` = list of strings, `default` one of them — a dropdown; a JSON string in the defaults file
const SETTINGS = [
  // Stage
  { key: 'canvasW', category: 'Stage', label: 'canvas width', type: 'int', default: 1120, min: 600, max: 1600, step: 10, unit: 'px', description: 'Field width. Exposed since POC-v5 (Q14) so Pasture · Scale can exist; changing it resizes the canvas and respawns the course.', exposed: true, onChange: 'respawn' },
  { key: 'canvasH', category: 'Stage', label: 'canvas height', type: 'int', default: 720, min: 400, max: 1000, step: 10, unit: 'px', description: 'Field height. Exposed since POC-v5 (Q14); changing it resizes the canvas and respawns the course.', exposed: true, onChange: 'respawn' },
  { key: 'fenceInset', category: 'Stage', label: 'fence inset', type: 'int', default: 56, min: 20, max: 80, step: 1, unit: 'px', description: 'Play-area border margin inside the canvas — also the pen apron outside the perimeter gate (widened 20→56 in POC-v3 P6 so penned sheep have somewhere to stand).', exposed: true, onChange: 'respawn' },
  { key: 'L', category: 'Stage', label: 'body length', type: 'int', default: 12, unit: 'px', description: 'One sheep body-length; the unit most radii derive from.', exposed: false },

  // Sheep
  { key: 'sheepCount', category: 'Sheep', label: 'herd size', type: 'int', default: 80, min: 1, max: 150, step: 1, unit: '—', description: 'Number of sheep; changing it respawns the herd.', exposed: true, onChange: 'respawn' },
  { key: 'vMax', category: 'Sheep', label: 'max speed', type: 'float', default: 90, min: 20, max: 240, step: 5, unit: 'px/s', description: 'Top sheep speed.', exposed: true },
  { key: 'walkSpeed', category: 'Sheep', label: 'walk speed', type: 'float', default: 60, min: 20, max: 240, step: 5, unit: 'px/s', description: 'Top speed of an alert sheep that is neither trotting nor panicking — the WALK (owner 2026-11-16: 60). Never above `max speed`, which stays the base for the trot and panic paces. The dog\'s walk-on and easy speeds are fractions of this, so he still walks at sheep pace.', exposed: true },
  { key: 'grazeSpeed', category: 'Sheep', label: 'graze speed', type: 'float', default: 15, min: 0, max: 60, step: 1, unit: 'px/s', description: 'Gentle wander cruising speed when undisturbed.', exposed: true },
  { key: 'damping', category: 'Sheep', label: 'damping', type: 'float', default: 0.9, min: 0.5, max: 0.99, step: 0.01, unit: '—', description: 'Velocity retained per tick (drag).', exposed: true },
  { key: 'wanderTurn', category: 'Sheep', label: 'wander turn rate', type: 'float', default: 1.5, min: 0, max: 4, step: 0.1, unit: 'rad/s', description: 'How fast graze heading random-walks.', exposed: false },

  // Idle (POC-v2 flock-behavior: the unpressured field — rules A1–A6)
  { key: 'clusterSizeMin', category: 'Idle', label: 'group size min', type: 'int', default: 1, min: 1, max: 8, step: 1, unit: '—', description: 'Smallest spawn group — FIXED at 1 since POC-v3 P8 (H1: singleton sheep are legal idle groups). Kept as documentation.', exposed: false },
  { key: 'clusterSizeMax', category: 'Idle', label: 'max group size', type: 'int', default: 10, min: 1, max: 20, step: 1, unit: '—', description: 'The H1 slider: at-rest group sizes draw uniformly from 1 to this. Changing it respawns the herd.', exposed: true, onChange: 'respawn' },
  { key: 'clusterSpread', category: 'Idle', label: 'group spread', type: 'float', default: 24, min: 6, max: 60, step: 1, unit: 'px', description: 'Jitter of members around their group seed (~2 body-lengths).', exposed: true, onChange: 'respawn' },
  { key: 'clusterMinGap', category: 'Idle', label: 'group min gap', type: 'float', default: 120, min: 40, max: 300, step: 5, unit: 'px', description: 'Minimum distance between spawn-group seeds (best-effort).', exposed: true, onChange: 'respawn' },
  { key: 'wandererFrac', category: 'Idle', label: 'wanderer fraction', type: 'float', default: 0.12, min: 0, max: 0.5, step: 0.01, unit: '—', description: 'Share of sheep that slowly drift instead of grazing in place.', exposed: true, onChange: 'respawn' },
  { key: 'idleSpeedCap', category: 'Idle', label: 'idle speed cap', type: 'float', default: 25, min: 0, max: 90, step: 1, unit: 'px/s', description: 'Hard speed limit on unpressured sheep — keeps the idle field calm.', exposed: true },
  { key: 'grazeStepEvery', category: 'Idle', label: 'graze step every', type: 'float', default: 4, min: 0.5, max: 12, step: 0.5, unit: 's', description: 'Mean time between a grazing sheep\'s shuffle-steps.', exposed: true },
  { key: 'grazeStepLen', category: 'Idle', label: 'graze step length', type: 'float', default: 12, min: 0, max: 48, step: 1, unit: 'px', description: 'How far one shuffle-step carries (~1 body-length).', exposed: true },
  { key: 'idleCohRadius', category: 'Idle', label: 'idle cohesion radius', type: 'float', default: 60, min: 20, max: 160, step: 5, unit: 'px', description: 'Group-membership range: used to re-derive idle groups after pressure (idle cohesion itself is same-group only).', exposed: true },
  { key: 'dogAvoidRadius', category: 'Idle', label: 'dog avoid radius', type: 'float', default: 45, min: 0, max: 120, step: 5, unit: 'px', description: 'Idle sheep drift away from a stood-down dog inside this range — a soft keep-out, not flight (A8).', exposed: true },
  { key: 'w_avoid', category: 'Idle', label: 'dog avoid weight', type: 'float', default: 0.4, min: 0, max: 2, step: 0.05, unit: '—', description: 'Strength of the idle keep-out drift around a stood-down dog.', exposed: true },
  { key: 'calmDelay', category: 'Idle', label: 'calm delay', type: 'float', default: 3, min: 0, max: 20, step: 0.5, unit: 's', description: 'Continuous zero-threat time before an alert sheep settles back to idle (B1/B2 hysteresis).', exposed: true },
  { key: 'crowdTolerance', category: 'Idle', label: 'crowd tolerance', type: 'int', default: 2, min: 0, max: 10, step: 1, unit: '—', description: 'Idle sheep drift off when more than this many strangers stand within the idle cohesion radius — paces the B2 re-scatter.', exposed: true },

  // Boids
  { key: 'r_sep', category: 'Boids', label: 'separation radius', type: 'float', default: 18, min: 4, max: 60, step: 1, unit: 'px', description: 'Distance below which sheep push apart.', exposed: true },
  { key: 'minSep', category: 'Boids', label: 'min-separation clamp', type: 'float', default: 4, min: 1, max: 20, step: 1, unit: 'px', description: 'Floor on separation distance so the (inverse-linear) close-range repulsion cannot explode.', exposed: true },
  { key: 'cohN', category: 'Boids', label: 'cohesion neighbors', type: 'int', default: 10, min: 1, max: 20, step: 1, unit: '—', description: 'How many nearest neighbors define the local center (topological).', exposed: true },
  { key: 'cohScale', category: 'Boids', label: 'cohesion scale', type: 'float', default: 100, min: 10, max: 160, step: 5, unit: 'px', description: 'Spring range easing a sheep toward its local center of mass.', exposed: true },
  { key: 'r_align', category: 'Boids', label: 'alignment radius', type: 'float', default: 36, min: 6, max: 120, step: 1, unit: 'px', description: 'Range over which sheep match heading.', exposed: true },
  { key: 'w_sep', category: 'Boids', label: 'separation weight', type: 'float', default: 1.5, min: 0, max: 4, step: 0.1, unit: '—', description: 'Strength of the push-apart force.', exposed: true },
  { key: 'w_coh', category: 'Boids', label: 'cohesion weight', type: 'float', default: 1.0, min: 0, max: 4, step: 0.1, unit: '—', description: 'Strength of the pull-together force.', exposed: true },
  { key: 'w_align', category: 'Boids', label: 'alignment weight', type: 'float', default: 0.3, min: 0, max: 2, step: 0.05, unit: '—', description: 'Strength of heading-matching (weak — sheep are not starlings).', exposed: true },
  { key: 'w_graze', category: 'Boids', label: 'graze weight', type: 'float', default: 0.3, min: 0, max: 2, step: 0.05, unit: '—', description: 'Strength of the idle wander force.', exposed: true },
  { key: 'accelScale', category: 'Boids', label: 'accel scale', type: 'float', default: 250, min: 0, max: 800, step: 10, unit: 'px/s²', description: 'Global responsiveness: accel per unit steering force.', exposed: true },

  // Flee / Eye
  { key: 'dogVMax', category: 'Flee / Eye', label: 'dog max speed', type: 'float', default: 110, min: 40, max: 300, step: 5, unit: 'px/s', description: 'Top dog speed (≈1.2× sheep — lowered from 135 and exposed, POC-v3 P5/Q8).', exposed: true },
  { key: 'R_flee', category: 'Flee / Eye', label: 'flee radius', type: 'float', default: 120, min: 40, max: 300, step: 5, unit: 'px', description: 'Distance within which the dog scares sheep.', exposed: true },
  { key: 'w_flee', category: 'Flee / Eye', label: 'flee weight', type: 'float', default: 2.0, min: 0, max: 5, step: 0.1, unit: '—', description: 'Strength of the run-from-dog force.', exposed: true },
  { key: 'ambient', category: 'Flee / Eye', label: 'eye ambient floor', type: 'float', default: 0.2, min: 0, max: 1, step: 0.05, unit: '—', description: '1 = pure radius threat, 0 = pure gaze-cone threat.', exposed: true },
  { key: 'coneK', category: 'Flee / Eye', label: 'eye cone tightness', type: 'float', default: 2, min: 0.5, max: 8, step: 0.5, unit: '—', description: 'How focused the dog\'s "eye" cone is (cos^k).', exposed: true },
  { key: 'driveConeExt', category: 'Flee / Eye', label: 'drive cone extension', type: 'float', default: 0.5, min: 0, max: 1.5, step: 0.05, unit: '× R_flee', description: 'Walk-on pushes the EYE CONE (the directional term) out by this extra fraction of R_flee — 0.5 = 50 % further (owner 2026-08-22, POC-v7 E5). Easy got its own `easy cone extension` in POC-v9 (E6). The ambient floor keeps R_flee; 0 = the v6 eye.', exposed: true },

  // Dog
  { key: 'R_orbit', category: 'Dog', label: 'orbit radius', type: 'float', default: 160, min: 60, max: 300, step: 5, unit: 'px', description: 'SUPERSEDED (POC-v3 P0: flanking replaced the fixed orbit). Kept for reference.', exposed: false },
  { key: 'omega', category: 'Dog', label: 'orbit speed', type: 'float', default: 1.2, min: 0.2, max: 3, step: 0.1, unit: 'rad/s', description: 'SUPERSEDED (POC-v3 P0: flanking replaced the fixed orbit). Kept for reference.', exposed: false },
  { key: 'flankStandoff', category: 'Dog', label: 'flank standoff', type: 'float', default: 140, min: 60, max: 300, step: 5, unit: 'px', description: 'SUPERSEDED (owner touch-up 2026-08-22: the flanking dog tracks the herd perimeter line itself — `perimeter margin` — not a wide offset of it; the fence-seek reach it also set is `fence seek reach` now). Kept for reference.', exposed: false },
  { key: 'perimeterMargin', category: 'Dog', label: 'perimeter margin', type: 'float', default: 56, min: 12, max: 96, step: 2, unit: 'px', description: 'How far the HERD PERIMETER LINE sits outside the outermost sheep (the convex hull offset by this; shipped at 36 px = 3 sheep-lengths; 44 since the owner note of 2026-11-16 "back the dog off a few pixels"; 56 since 2026-11-18, same note again — measured: 50 changed nothing, 56 halved panics on easy runs). It is both the dotted outline drawn round the flock and the line the flanking dog tracks (C8 — owner 2026-08-22: "track along the current herd boundary"). Was the Debug-only `outline margin` until then.', exposed: true },
  { key: 'fenceSeekReach', category: 'Dog', label: 'fence seek reach', type: 'float', default: 72, min: 20, max: 300, step: 4, unit: 'px', description: 'Within this distance of a field boundary the flank point is pulled toward it so the dog slots between sheep and fence (C2). Was hard-wired to 2 × flank standoff (= 280) until the 2026-08-22 touch-up; now 2 × perimeter margin — at 280 the pull dragged the point off the boundary line (measured 72 px median at seed 1337).', exposed: true },
  { key: 'flankConeDeg', category: 'Dog', label: 'flank eye angle', type: 'float', default: 45, min: 20, max: 70, step: 1, unit: '—', description: 'Degrees the flanking dog\'s eye is held off his line of travel, toward the flock (C3).', exposed: true },
  { key: 'flankAdvance', category: 'Dog', label: 'flank advance rate', type: 'float', default: 1.0, min: 0.2, max: 3, step: 0.1, unit: 'rad/s', description: 'How fast the flank point works around the flock edge.', exposed: true },
  { key: 'fenceSeekBias', category: 'Dog', label: 'fence seek bias', type: 'float', default: 0.6, min: 0, max: 1, step: 0.05, unit: '—', description: 'How strongly the flank path hugs a nearby field boundary — the dog slots between sheep and fence (C2).', exposed: true },
  { key: 'fenceSeekRamp', category: 'Dog', label: 'fence seek ramp', type: 'float', default: 0.5, min: 0, max: 1, step: 0.05, unit: '—', description: 'Fraction of `fence seek reach` over which the pull fades in, so the flank target does not jump as the point crosses the reach (POC-v6 touch-up). 0 = hard step (v3–v6.0 behavior).', exposed: true },
  { key: 'parkFade', category: 'Dog', label: 'park fade', type: 'float', default: 0.5, min: 0, max: 2, step: 0.05, unit: 's', description: 'Once the flank point parks on the gate line (C8) its fence-seek pull fades out over this long instead of dropping in one tick — the dog settles onto the line rather than twitching to it (POC-v6 touch-up, Q37). 0 = instant.', exposed: true },
  { key: 'flankHandoffDeg', category: 'Dog', label: 'flank handoff angle', type: 'float', default: 30, min: 10, max: 90, step: 1, unit: '—', description: 'How far PAST the gate line (the gate\'s tangent to the herd perimeter on the flank\'s exit side — owner 2026-08-22; was the goal→flock line extended) the on-station check may still catch the dog and hand the flank off to easy (C8 reach bound, POC-v6). v3/v4\'s ± tolerance cone became one-sided: he never converts short of the line.', exposed: true },
  { key: 'flankOvershootDeg', category: 'Dog', label: 'flank overshoot', type: 'float', default: 0, min: 0, max: 180, step: 5, unit: '—', description: 'C8 (POC-v6): the flank ends AT the gate line; this carries the handoff station past it in the flank direction for a wider sweep (v4\'s C7 behavior at 90). 0 = hand off on the line.', exposed: true },
  { key: 'flankCornerFrom', category: 'Dog', label: 'flank corner-first from', type: 'float', default: 0, min: 0, max: 300, step: 4, unit: 'px', description: 'C10 (POC-v8, owner 2026-08-23): a flank issued while the dog is further than this OUTSIDE the herd perimeter line runs first to the FIRST CORNER of the outline he would meet in the flank direction (come-by: next corner clockwise of his bearing; away: counter-clockwise) and only then starts to sweep — he does not cut in toward the nearest bit of the line. At the shipped 0 (owner Q46) EVERY flank from outside the line opens corner-first; on or inside the line he picks it up where he stands. Raise it to restore the v7 cut-in for near starts.', exposed: true },
  { key: 'R_drive', category: 'Dog', label: 'drive standoff', type: 'float', default: 140, min: 80, max: 260, step: 5, unit: 'px', description: 'Walk-on standoff behind the flock.', exposed: true },
  { key: 'driveShrink', category: 'Dog', label: 'drive shrink rate', type: 'float', default: 10, min: 0, max: 40, step: 1, unit: 'px/s', description: 'SUPERSEDED (POC-v3 P2: the trail-gap governor replaced creep-forever). Kept for reference.', exposed: false },
  { key: 'driveTrailGap', category: 'Dog', label: 'drive trail gap', type: 'float', default: 60, min: 20, max: 160, step: 5, unit: 'px', description: 'Walk-on never closes on the nearest driven sheep past this gap — the dog trails, he doesn\'t catch (E1). Must sit inside the threat range that actually mobilizes sheep (guard G1: at most R_flee/2). 40 → 60 by the owner 2026-11-16: he was pushing up into the pack.', exposed: true },
  { key: 'driveCloseRate', category: 'Dog', label: 'drive close rate', type: 'float', default: 25, min: 5, max: 80, step: 1, unit: 'px/s', description: 'E1 gap governor: how fast the driving dog\'s trailing distance shrinks toward the flock while the ahead-gap is ample. Was a magic 25 inside §1 until Q38 (2026-08-22); in EASY it is scaled by `easy speed` so the creep reads at ⅓ pace from the gate line too.', exposed: true },
  { key: 'driveBackoffRate', category: 'Dog', label: 'drive back-off rate', type: 'float', default: 40, min: 5, max: 120, step: 1, unit: 'px/s', description: 'E1 gap governor: how fast the trailing distance grows back when the ahead-gap tightens below `drive trail gap`. Was a magic 40 inside §1 until Q38 (2026-08-22); scaled by `easy speed` in EASY like the close rate.', exposed: true },
  { key: 'stallSpeed', category: 'Dog', label: 'stall speed', type: 'float', default: 8, min: 2, max: 30, step: 1, unit: 'px/s', description: 'Goal-ward flock speed below which a pressured drive counts as stalled.', exposed: true },
  { key: 'stallDwell', category: 'Dog', label: 'stall dwell', type: 'float', default: 1.5, min: 0, max: 5, step: 0.25, unit: 's', description: 'How long a pressured stall must hold before walk-on auto-converts to easy (E2; easy replaced stand in POC-v6).', exposed: true },
  { key: 'shoveMult', category: 'Dog', label: 'shove strength', type: 'float', default: 1.5, min: 1, max: 3, step: 0.1, unit: '—', description: 'Impulse multiplier of a plain walk-on tap from easy (E3 default flavor) — scales the drive eye.', exposed: true },
  { key: 'shoveDur', category: 'Dog', label: 'shove duration', type: 'float', default: 0.8, min: 0.1, max: 3, step: 0.1, unit: 's', description: 'How long the shove holds before decaying.', exposed: true },
  { key: 'shoveDecay', category: 'Dog', label: 'shove decay', type: 'float', default: 0.5, min: 0.1, max: 2, step: 0.1, unit: 's', description: 'Shove fade-back time to the plain drive eye.', exposed: true },
  { key: 'barkMult', category: 'Dog', label: 'bark strength', type: 'float', default: 2.0, min: 1, max: 4, step: 0.1, unit: '—', description: 'Impulse multiplier of Shift+walk-on — punchier, riskier (E3).', exposed: true },
  { key: 'barkDur', category: 'Dog', label: 'bark duration', type: 'float', default: 0.4, min: 0.1, max: 3, step: 0.1, unit: 's', description: 'How long the bark holds.', exposed: true },
  { key: 'barkDecay', category: 'Dog', label: 'bark decay', type: 'float', default: 0.3, min: 0.1, max: 2, step: 0.1, unit: 's', description: 'Bark fade-back time.', exposed: true },
  { key: 'leanMult', category: 'Dog', label: 'lean strength', type: 'float', default: 1.2, min: 1, max: 2, step: 0.05, unit: '—', description: 'Impulse multiplier of Alt+walk-on — a calm lean-in (E3).', exposed: true },
  { key: 'leanDur', category: 'Dog', label: 'lean duration', type: 'float', default: 1.5, min: 0.1, max: 4, step: 0.1, unit: 's', description: 'How long the lean holds.', exposed: true },
  { key: 'leanDecay', category: 'Dog', label: 'lean decay', type: 'float', default: 0.5, min: 0.1, max: 2, step: 0.1, unit: 's', description: 'Lean fade-back time.', exposed: true },
  { key: 'R_driveMin', category: 'Dog', label: 'drive standoff floor', type: 'float', default: 55, min: 40, max: 160, step: 5, unit: 'px', description: 'Closest walk-on gets before stopping (do not walk into the blob).', exposed: true },
  { key: 'lieDownIntensity', category: 'Dog', label: 'lie-down intensity', type: 'float', default: 0.3, min: 0, max: 1, step: 0.05, unit: '—', description: 'Ambient (out-of-cone) dog pressure while lying down.', exposed: true },
  { key: 'lieDownBlock', category: 'Dog', label: 'lie-down block', type: 'float', default: 1.4, min: 0, max: 3, step: 0.1, unit: '—', description: 'In-cone threat multiplier of a lying dog — the covered arc reads as a wall (D1).', exposed: true },
  { key: 'walkOnSpeedFrac', category: 'Dog', label: 'walk-on speed', type: 'float', default: 0.85, min: 0.5, max: 1.6, step: 0.05, unit: '× vMax', description: 'Walk-on\'s top speed as a fraction of the SHEEP\'s vMax — the drive goes at the flock\'s own pace (owner 2026-08-22, POC-v7 E4; was dogVMax). Flanks and the recall still run at `dog max speed`.', exposed: true },
  { key: 'easySpeedFrac', category: 'Dog', label: 'easy speed', type: 'float', default: 0.5, min: 0.1, max: 0.8, step: 0.01, unit: '× vMax', description: 'Easy\'s top speed as a fraction of the SHEEP\'s vMax — half the flock\'s pace (owner 2026-08-22, POC-v7 I2 amended; was 0.33 × dogVMax). Same trailing target and gap governor as walk-on.', exposed: true },
  { key: 'postureConeK', category: 'Dog', label: 'posture cone tightness', type: 'float', default: 4, min: 1, max: 8, step: 0.5, unit: '—', description: 'SUPERSEDED (POC-v9 D3: the lie-down beam\'s width is `lie-down cone angle`, in degrees, now). Kept for reference.', exposed: false },
  { key: 'postureRange', category: 'Dog', label: 'posture range', type: 'float', default: 0.6, min: 0.2, max: 1, step: 0.05, unit: '—', description: 'Posture threat reach as a fraction of R_flee — fierce close-in wall, faint at driving distance (keeps lie-down\'s gate relief).', exposed: true },
  { key: 'easyConeDeg', category: 'Dog', label: 'easy cone angle', type: 'float', default: 45, min: 10, max: 120, step: 1, unit: '°', description: 'EASY\'s intense-pressure cone FULL width, measured at the half-strength contour (the wedge §2 draws). POC-v9 E6 shipped the owner\'s 30°; retuned to 45° the same day (owner Q56): at 30° a stalled pile at the mouth never restarts (seed 42 penned 0/80 vs v8\'s 40), at 45° + the E3 tap rhythm it matches v8. Still half of walk-on\'s ~90°. Converted to a cos^k exponent in §1 (coneKFromDeg).', exposed: true },
  { key: 'easyConeExt', category: 'Dog', label: 'easy cone extension', type: 'float', default: 0.3, min: 0, max: 1.5, step: 0.05, unit: '× R_flee', description: 'EASY\'s cone reach beyond the normal eye: R_flee × (1 + this). Owner 2026-08-24 (E6): +30 % from normal. Replaces `drive cone extension` for easy — walk-on keeps driveConeExt (+50 %). The ambient floor keeps R_flee.', exposed: true },
  { key: 'lieConeDeg', category: 'Dog', label: 'lie-down cone angle', type: 'float', default: 40, min: 10, max: 120, step: 1, unit: '°', description: 'Lie-down\'s intense-pressure cone (the D1 block beam) FULL width at half strength. Owner 2026-08-24 (POC-v9 D3): 40° — was set by `posture cone tightness` (cos⁴ ≈ 65°), now superseded.', exposed: true },
  { key: 'lieConeExt', category: 'Dog', label: 'lie-down cone extension', type: 'float', default: 0.15, min: 0, max: 1.5, step: 0.05, unit: '× R_flee', description: 'Lie-down\'s block-beam reach beyond the normal eye: R_flee × (1 + this). Owner 2026-08-24 (D3): +15 % from normal. The ambient FLANKS keep `posture range` × R_flee, so off-beam gate relief survives.', exposed: true },
  { key: 'flankEasySpeedFrac', category: 'Dog', label: 'easy flank speed', type: 'float', default: 0.5, min: 0.1, max: 1, step: 0.05, unit: '× dogVMax', description: 'Come-easy / away-easy (POC-v10 C11, owner 2026-08-24): the gentle flank\'s top speed as a fraction of `dog max speed` — half by default. Same sweep geometry, corner-first start (C10), gate-line park (C8) and easy handoff (C9) as come-by/away; the flank-point advance cap scales with it so the point cannot outrun the slowed dog.', exposed: true },
  { key: 'downConeOffsetDeg', category: 'Dog', label: 'down cone offset', type: 'float', default: 30, min: 0, max: 90, step: 5, unit: '°', description: 'Left-down / right-down (POC-v10 D4, owner 2026-08-24): how far the lie-down block beam swings to the dog\'s OWN left or right of his facing (bird\'s-eye, y-down canvas: left = facing − offset). Width, reach and the postureRange ambient flanks are plain lie-down\'s.', exposed: true },
  { key: 'heelIntensity', category: 'Dog', label: 'heel intensity', type: 'float', default: 0, min: 0, max: 1, step: 0.05, unit: '—', description: 'Dog pressure while stood down at the owner\'s side — 0 = an idle dog exerts none (A7).', exposed: true },
  { key: 'goal', category: 'Dog', label: 'goal / pen center', type: 'point', default: { x: 970, y: 360 }, min: { x: 0, y: 0 }, max: { x: 1120, y: 720 }, step: 5, unit: 'px', description: 'Where the flock is being driven. DERIVED since POC-v3 P6: set to the pen center outside the perimeter gate on every reseed (and excluded from param export — it is course state, not a tunable).', exposed: false, export: false },

  // Gate + Crush
  { key: 'fenceX', category: 'Gate + Crush', label: 'fence x', type: 'int', default: 820, min: 600, max: 1000, step: 5, unit: 'px', description: 'SUPERSEDED (POC-v3 P6: the interior fence retired; the gate moved to the perimeter). Kept for reference.', exposed: false },
  { key: 'gateY', category: 'Gate + Crush', label: 'gate center y', type: 'int', default: 360, min: 20, max: 700, step: 5, unit: 'px', description: 'SUPERSEDED (POC-v3 P6: gate position is a seeded perimeter draw). Kept for reference.', exposed: false },
  { key: 'gateWidth', category: 'Gate + Crush', label: 'gate width', type: 'int', default: 42, min: 12, max: 60, step: 1, unit: 'px', description: 'Gate opening size (default tuned up from 30 during P5).', exposed: true },
  { key: 'gateCornerMargin', category: 'Gate + Crush', label: 'gate corner margin', type: 'int', default: 80, min: 40, max: 200, step: 5, unit: 'px', description: 'Minimum distance of the gate mouth from any field corner (F1).', exposed: true, onChange: 'respawn' },
  { key: 'spawnGateOffset', category: 'Gate + Crush', label: 'spawn gate offset', type: 'float', default: 200, min: 60, max: 500, step: 10, unit: 'px', description: 'beside-gate archetype only: how far along the fence (to the seeded side) the spawn region sits from the gate (F2).', exposed: true, onChange: 'respawn' },
  { key: 'spawnDepth', category: 'Gate + Crush', label: 'spawn depth', type: 'float', default: 140, min: 60, max: 300, step: 10, unit: 'px', description: 'beside-gate archetype only: how far the spawn region reaches into the field from the fence (F2).', exposed: true, onChange: 'respawn' },
  { key: 'gateApproachR', category: 'Gate + Crush', label: 'gate approach radius', type: 'float', default: 60, min: 20, max: 160, step: 5, unit: 'px', description: 'Commitment zone around the gate mouth: a non-idle sheep inside it moving gateward commits and carries on through (G1).', exposed: true },
  { key: 'w_through', category: 'Gate + Crush', label: 'through bias', type: 'float', default: 2.0, min: 0, max: 5, step: 0.1, unit: '—', description: 'Strength of the gateward commitment bias — must beat the gate posts\' repulsion and crowd back-push (G1).', exposed: true },
  { key: 'gateAttractR', category: 'Gate + Crush', label: 'gate attraction radius', type: 'float', default: 100, min: 0, max: 240, step: 5, unit: 'px', description: 'Within this distance of the mouth a sheep is DRAWN toward the gate (POC-v7 G2). Shipped at ⅔ of `flee radius` (80, owner 2026-08-22); widened to 100 by the owner 2026-11-16 ("a little further"). Sheep in close proximity to a drawn sheep are drawn after it (G3) — the column. 0 = off.', exposed: true },
  { key: 'w_gateAttract', category: 'Gate + Crush', label: 'gate attraction weight', type: 'float', default: 1.2, min: 0, max: 4, step: 0.1, unit: '—', description: 'Strength of the gate draw (G2/G3). Sits under `flee weight` so the dog can still pull a sheep off the mouth.', exposed: true },
  { key: 'gateFollowR', category: 'Gate + Crush', label: 'gate follow radius', type: 'float', default: 30, min: 10, max: 80, step: 2, unit: 'px', description: '"Close proximity" for the column (G3): a sheep this near one being drawn to the gate is drawn after IT — files in behind rather than heading for the mouth on its own line.', exposed: true },
  { key: 'gateFollowDecay', category: 'Gate + Crush', label: 'gate follow decay', type: 'float', default: 0.6, min: 0, max: 1, step: 0.05, unit: '—', description: 'Pull kept per hop down the column (G3): the 2nd sheep feels 0.6, the 3rd 0.36 … so the draw dies out a few body-lengths back instead of dragging the whole flock.', exposed: true },
  // POC-v13 (owner 2026-11-16) — G5: the draw area grows a cone toward a trotting line's leaders.
  { key: 'gateConeGrow', category: 'Gate + Crush', label: 'gate cone growth', type: 'float', default: 60, min: 0, max: 300, step: 5, unit: 'px/s', description: 'G5: while trot leaders are heading gate-ward, the gate\'s draw area grows a cone along the axis from the mouth toward them at this rate; it shrinks back at the same rate once there are none. It never grows past the leaders. 0 = off.', exposed: true },
  { key: 'gateConeDeg', category: 'Gate + Crush', label: 'gate cone width', type: 'float', default: 50, min: 10, max: 180, step: 5, unit: '°', description: 'G5: full width of the cone. Full extra reach inside the middle half, feathering to none at the edge.', exposed: true },
  { key: 'gateConeMax', category: 'Gate + Crush', label: 'gate cone reach', type: 'float', default: 220, min: 0, max: 600, step: 10, unit: 'px', description: 'G5: the most the cone adds to `gate attraction radius` along its axis. Only non-grazing sheep feel the extra reach.', exposed: true },
  { key: 'w_fence', category: 'Gate + Crush', label: 'fence weight', type: 'float', default: 1.5, min: 0, max: 4, step: 0.1, unit: '—', description: 'Strength of fence repulsion (perimeter walls, gapped at the gate mouth).', exposed: true },
  { key: 'r_fence', category: 'Gate + Crush', label: 'fence range', type: 'float', default: 30, min: 10, max: 80, step: 1, unit: 'px', description: 'Distance at which the fence pushes sheep.', exposed: true },
  { key: 'spawnMinX', category: 'Gate + Crush', label: 'spawn region min x', type: 'int', default: 220, min: 20, max: 800, step: 5, unit: 'px', description: 'SUPERSEDED (POC-v3 P6: spawn is anchored near the gate). Kept for reference.', exposed: false },
  { key: 'spawnMaxX', category: 'Gate + Crush', label: 'spawn region max x', type: 'int', default: 700, min: 20, max: 800, step: 5, unit: 'px', description: 'SUPERSEDED (POC-v3 P6: spawn is anchored near the gate). Kept for reference.', exposed: false },
  { key: 'crushRadius', category: 'Gate + Crush', label: 'crush radius', type: 'float', default: 40, min: 20, max: 80, step: 1, unit: 'px', description: 'Gate-mouth neighborhood used to measure crush.', exposed: true },
  { key: 'crushThreshold', category: 'Gate + Crush', label: 'crush threshold', type: 'float', default: 1.5, min: 0.5, max: 8, step: 0.1, unit: '—', description: 'Density×pressure above which sustained crush injures (calibrated P5).', exposed: true },
  { key: 'crushSustain', category: 'Gate + Crush', label: 'crush sustain', type: 'float', default: 0.8, min: 0, max: 3, step: 0.1, unit: 's', description: 'Seconds over threshold before an injury event fires.', exposed: false },

  // Obstacles (owner 2026-11-14): stands of trees / large rocks in the field. Everything but the three force dials respawns.
  { key: 'obstacleFreq', category: 'Obstacles', label: 'obstacle count', type: 'int', default: 2, min: 0, max: 60, step: 1, unit: 'groups', description: 'EXACTLY how many obstacle groups (a small stand of trees or a few large rocks) every course gets — used while `random count` is off (owner Q65, 2026-11-14). This is what the `obstacles` slider beside the dog pad sets; touching that slider also switches `random count` off. 0 = no obstacles (and a course identical to the pre-obstacle sim). Best-effort on a crowded field.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleRandom', category: 'Obstacles', label: 'random count', type: 'boolean', default: true, unit: '—', description: 'On (how a page loads): each course DRAWS its obstacle-group count from 0..`random range top`, heavily skewed low. Off: every course gets exactly `obstacle count`. Moving the `obstacles` slider switches this off; tick it again to go back to random courses.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleRangeMax', category: 'Obstacles', label: 'random range top', type: 'int', default: 24, min: 0, max: 60, step: 1, unit: 'groups', description: 'While `random count` is on: the top of the range a course draws its obstacle-group count from. The draw is heavily skewed — most courses land in the lowest 10 % of the range, a few in the middle, a very occasional outlier near the top.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleLowShare', category: 'Obstacles', label: 'low-end share', type: 'float', default: 0.85, min: 0, max: 1, step: 0.05, unit: '—', description: 'Fraction of courses whose obstacle count is drawn from the lowest 10 % of the range. The rest draw 10 % + 90 % · u³ of it — mostly low-middle, rarely near the top.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleGroupMax', category: 'Obstacles', label: 'max group size', type: 'int', default: 3, min: 1, max: 6, step: 1, unit: '—', description: 'Obstacles per group draw uniformly 1..this (the herd\'s spawn-group idea): the members of a group overlap into one clump — a bigger stand, a rock pile.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleRadiusMin', category: 'Obstacles', label: 'radius min', type: 'float', default: 20, min: 8, max: 80, step: 1, unit: 'px', description: 'Smallest tree-stand radius. Rocks are `rock scale` of the drawn radius.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleRadiusMax', category: 'Obstacles', label: 'radius max', type: 'float', default: 46, min: 8, max: 120, step: 1, unit: 'px', description: 'Largest tree-stand radius.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleRockFrac', category: 'Obstacles', label: 'rock share', type: 'float', default: 0.4, min: 0, max: 1, step: 0.05, unit: '—', description: 'Chance a group is large rocks rather than a stand of trees.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleRockScale', category: 'Obstacles', label: 'rock scale', type: 'float', default: 0.6, min: 0.2, max: 1, step: 0.05, unit: '—', description: 'A rock\'s radius as a fraction of the stand radius drawn for it.', exposed: true, onChange: 'respawn' },
  { key: 'obstacleMinGap', category: 'Obstacles', label: 'group min gap', type: 'float', default: 60, min: 20, max: 300, step: 5, unit: 'px', description: 'Minimum EDGE-TO-EDGE distance between obstacles of different groups, and from an obstacle to the fence (best-effort) — always leaves a lane the flock can use.', exposed: true, onChange: 'respawn' },
  { key: 'w_obstacle', category: 'Obstacles', label: 'obstacle weight', type: 'float', default: 2, min: 0, max: 6, step: 0.1, unit: '—', description: 'Strength of a sheep\'s steering round an obstacle (sidestep + push-off). The obstacle itself is solid whatever this is.', exposed: true },
  { key: 'obstacleLook', category: 'Obstacles', label: 'look-ahead', type: 'float', default: 70, min: 10, max: 200, step: 5, unit: 'px', description: 'How far short of an obstacle\'s edge a moving sheep starts to sidestep it — to whichever side of its centre it is already on, which is what parts a group in two.', exposed: true },
  { key: 'r_obstacle', category: 'Obstacles', label: 'obstacle range', type: 'float', default: 22, min: 4, max: 80, step: 1, unit: 'px', description: 'Distance from an obstacle\'s edge at which it pushes sheep straight off (the fence-range idea), and the clearance a sheep aims to pass it by.', exposed: true },
  { key: 'obstacleCover', category: 'Obstacles', label: 'cover', type: 'float', default: 1, min: 0, max: 1, step: 0.05, unit: '—', description: 'How much of the dog\'s pressure an obstacle takes off a sheep it stands between (line of sight dog → sheep crosses the stand / rock). 1 = a sheep behind cover does not feel him at all, so he has to come round; 0 = he works straight through obstacles. Fades in over the first `cover edge` px of overlap so a sheep at the rim does not flicker.', exposed: true },
  { key: 'obstacleCoverEdge', category: 'Obstacles', label: 'cover edge', type: 'float', default: 8, min: 1, max: 40, step: 1, unit: 'px', description: 'How deep the dog → sheep sight line must cut into an obstacle before its cover is complete (soft rim).', exposed: true },
  { key: 'obstacleSplit', category: 'Obstacles', label: 'split ease', type: 'float', default: 0.8, min: 0, max: 1, step: 0.05, unit: '—', description: 'How much of its cohesion a sheep drops while it is working round an obstacle. 1 = the two halves of a parted group ignore each other until they are past; 0 = cohesion fights the split and the group squeezes round one side.', exposed: true },

  // Spawn (POC-v5: layout archetypes — F5–F8). Everything here respawns.
  { key: 'spawnLayout', category: 'Spawn', label: 'spawn layout', type: 'enum', options: ['random', 'beside-gate', 'whole-pasture', 'weighted'], default: 'random', unit: '—', description: 'F5: which starting picture the flock is laid out in. `random` draws one of the three archetypes per course (equal thirds, seeded); the others force one — for tuning and verify. Forcing consumes no PRNG draw, so forced beside-gate reproduces POC-v4 courses exactly.', exposed: true, onChange: 'respawn' },
  { key: 'spawnGateClear', category: 'Spawn', label: 'gate clearance', type: 'float', default: 120, min: 0, max: 300, step: 5, unit: 'px', description: 'F8: no spawn-group seed within this distance (+ group spread, for member jitter) of the gate mouth, whatever the archetype — a run never starts with sheep in the mouth or already committed. 0 = off.', exposed: true, onChange: 'respawn' },
  { key: 'holeCountMin', category: 'Spawn', label: 'holes min', type: 'int', default: 2, min: 0, max: 8, step: 1, unit: '—', description: 'F6 (whole-pasture archetype): fewest empty patches drawn per course.', exposed: true, onChange: 'respawn' },
  { key: 'holeCountMax', category: 'Spawn', label: 'holes max', type: 'int', default: 5, min: 0, max: 8, step: 1, unit: '—', description: 'F6 (whole-pasture archetype): most empty patches drawn per course.', exposed: true, onChange: 'respawn' },
  { key: 'holeRadiusMin', category: 'Spawn', label: 'hole radius min', type: 'float', default: 70, min: 20, max: 400, step: 5, unit: 'px', description: 'F6: smallest disc radius composing an empty patch.', exposed: true, onChange: 'respawn' },
  { key: 'holeRadiusMax', category: 'Spawn', label: 'hole radius max', type: 'float', default: 180, min: 20, max: 400, step: 5, unit: 'px', description: 'F6: largest disc radius composing an empty patch.', exposed: true, onChange: 'respawn' },
  { key: 'holeLobes', category: 'Spawn', label: 'hole lobes', type: 'int', default: 3, min: 1, max: 5, step: 1, unit: '—', description: 'F6: max overlapping discs per empty patch — the union is what makes a patch irregular. 1 = round holes.', exposed: true, onChange: 'respawn' },
  { key: 'focusShare', category: 'Spawn', label: 'focus share', type: 'float', default: 0.75, min: 0.3, max: 1, step: 0.05, unit: '—', description: 'F7 (weighted archetype): fraction of the flock laid out inside the core disc around the focus; the rest is a sparse tail elsewhere.', exposed: true, onChange: 'respawn' },
  { key: 'focusRadius', category: 'Spawn', label: 'focus radius', type: 'float', default: 150, min: 60, max: 400, step: 10, unit: 'px', description: 'F7: core disc radius at 80 sheep — scales with √(sheepCount/80) so 20 and 150 sheep both read as concentrated.', exposed: true, onChange: 'respawn' },
  { key: 'focusGapScale', category: 'Spawn', label: 'focus gap scale', type: 'float', default: 0.5, min: 0.2, max: 1, step: 0.05, unit: '—', description: 'F7: clusterMinGap multiplier inside the core — crowded but still many small groups, not one blob.', exposed: true, onChange: 'respawn' },

  // Boldness
  { key: 'boldMean', category: 'Boldness', label: 'boldness mean', type: 'float', default: 0.3, min: 0, max: 1, step: 0.05, unit: '—', description: 'Center of the per-sheep boldness draw (gaussian, clamped 0–1). Was a magic number until POC-v3 P4.', exposed: true, onChange: 'respawn' },
  { key: 'boldSd', category: 'Boldness', label: 'boldness spread', type: 'float', default: 0.22, min: 0, max: 0.5, step: 0.01, unit: '—', description: 'Spread of the boldness draw. Default 0.22 puts ~0–2 sheep per 80 above the dart threshold (D2\'s top tail); the old hard-coded 0.1 made boldness > 0.8 a 5σ event — darts could never happen.', exposed: true, onChange: 'respawn' },
  { key: 'boldnessTheta', category: 'Boldness', label: 'boldness hold', type: 'float', default: 0.5, min: 0, max: 1.5, step: 0.05, unit: '—', description: 'Sheep ignores the dog while threat < boldness·θ.', exposed: true },
  { key: 'panicThreshold', category: 'Boldness', label: 'panic threshold', type: 'float', default: 0.7, min: 0.2, max: 1, step: 0.05, unit: '—', description: 'Threat above this triggers a panic sprint (enables bolting).', exposed: true },
  { key: 'panicMult', category: 'Boldness', label: 'panic multiplier', type: 'float', default: 1.4, min: 1, max: 2.5, step: 0.1, unit: '—', description: 'vMax multiplier while panicking.', exposed: true },
  { key: 'protestProb', category: 'Boldness', label: 'protest chance', type: 'float', default: 0.6, min: 0, max: 1, step: 0.05, unit: '—', description: 'Per-second chance a brave sheep protests just below threshold.', exposed: false },
  { key: 'protestDur', category: 'Boldness', label: 'protest duration', type: 'float', default: 0.3, min: 0, max: 1, step: 0.05, unit: 's', description: 'How long a protest stamp lasts.', exposed: false },
  { key: 'dartBoldness', category: 'Boldness', label: 'dart boldness', type: 'float', default: 0.8, min: 0.5, max: 1, step: 0.05, unit: '—', description: 'Boldness above which a sheep may dart around a lying dog (D2 — the rare top tail).', exposed: true },

  // Trot (POC-v9 flock-behavior T1–T3, owner 2026-08-24: a big pressured
  // group moving one way can break into a following trot — leads first,
  // the rest filing in behind; it dies back off once the dog is escaped)
  { key: 'trotGroupMin', category: 'Trot', label: 'trot group size', type: 'int', default: 12, min: 5, max: 80, step: 1, unit: '—', description: 'T1: a moving pressured cluster must be LARGER than this (owner: "over 20") before the trot can trigger.', exposed: true },
  { key: 'trotAlignMin', category: 'Trot', label: 'trot alignment', type: 'float', default: 0.5, min: 0, max: 1, step: 0.05, unit: '—', description: 'T1: velocity order parameter (|Σv| / Σ|v|) the cluster must exceed to read as "moving in the same direction". Loosened 0.7 → 0.5 by the owner (Q54, 2026-08-24): a somewhat ragged drive can still break into a trot.', exposed: true },
  { key: 'trotMoveSpeed', category: 'Trot', label: 'trot move floor', type: 'float', default: 10, min: 5, max: 60, step: 1, unit: 'px/s', description: 'T1: mean cluster speed floor — a standing group cannot trot off. 20 → 10 (2026-11-16): a group under a steady walk-on only averages about 8 px/s.', exposed: true },
  { key: 'trotTriggerProb', category: 'Trot', label: 'trot trigger chance', type: 'float', default: 0.2, min: 0, max: 1, step: 0.05, unit: '/s', description: 'T1: per-second chance an eligible group\'s LEAD sheep break into a trot (owner 2026-08-24: 20 %).', exposed: true },
  { key: 'trotBoltProb', category: 'Trot', label: 'trot bolt chance', type: 'float', default: 0.05, min: 0, max: 1, step: 0.01, unit: '—', description: 'T2: chance, rolled once at trigger time, that the WHOLE group bolts into the trot at once instead of the leads only (owner: 5 %).', exposed: true },
  { key: 'trotLeadCount', category: 'Trot', label: 'trot leads', type: 'int', default: 5, min: 1, max: 10, step: 1, unit: '—', description: 'T1: how many frontmost sheep (along the group\'s mean heading) lead the trot off.', exposed: true },
  { key: 'trotFollowR', category: 'Trot', label: 'trot follow radius', type: 'float', default: 56, min: 10, max: 120, step: 2, unit: 'px', description: 'T2: a sheep this close to a trotting flock-mate is pulled into the trot behind IT — files into the column (one hop per tick, like the G3 gate column).', exposed: true },
  { key: 'trotSpeedMult', category: 'Trot', label: 'trot pace', type: 'float', default: 1.05, min: 1, max: 2, step: 0.05, unit: '× vMax', description: 'FULL trot pace (× `max speed`) — since POC-v13 only a whole-group bolt (T2) runs at it; every other trot is the `slow trot speed`. Below panic (1.4).', exposed: true },
  { key: 'w_trot', category: 'Trot', label: 'trot weight', type: 'float', default: 2, min: 0, max: 4, step: 0.05, unit: '—', description: 'Strength of the trot drive (leads: along the locked column heading; followers: after their lead).', exposed: true },
  { key: 'trotDecayMin', category: 'Trot', label: 'trot decay floor', type: 'float', default: 0.35, min: 0, max: 1, step: 0.01, unit: '/s', description: 'T3: per-second chance of dropping back to normal the moment the dog\'s pressure is escaped (owner: shipped at 5 %, raised to 20 % the same day)…', exposed: true },
  { key: 'trotDecayMax', category: 'Trot', label: 'trot decay ceiling', type: 'float', default: 0.9, min: 0, max: 1, step: 0.05, unit: '/s', description: 'T3: …growing to this while the escape lasts (owner: 90 %). Any felt pressure resets the ramp.', exposed: true },
  { key: 'trotDecayRamp', category: 'Trot', label: 'trot decay ramp', type: 'float', default: 3, min: 1, max: 20, step: 0.5, unit: 's', description: 'T3: seconds of pressure-free trotting over which the decay chance ramps floor → ceiling. (The owner gave 20 % → 90 %; the ramp TIME is parked — default 5 s.)', exposed: true },
  { key: 'trotFenceStop', category: 'Trot', label: 'trot fence stop', type: 'float', default: 36, min: 0, max: 120, step: 2, unit: 'px', description: 'T3 (owner 2026-08-24): a trotting sheep APPROACHING a fence within this distance — default 3 body-lengths — drops the trot outright (100 %), pressure or not. The gate mouth is exempt, so a column may trot through the gate. 0 = off.', exposed: true },
  { key: 'trotReverseDeg', category: 'Trot', label: 'trot reverse cone', type: 'float', default: 120, min: 30, max: 240, step: 5, unit: '°', description: 'T4 (owner 2026-08-24): full width of the forward cone in which a FELT dog (stress > 0) counts as "in front" of a trotting sheep — it reverses and trots the other way; a follower cuts loose and leads the turn itself. After the flip the dog is behind, so it cannot flip-flop.', exposed: true },
  // POC-v13 (owner 2026-11-16) — T5 turn trigger, T6 trot time limit + rest, T7 wind-down.
  { key: 'trotSlowSpeed', category: 'Trot', label: 'slow trot speed', type: 'float', default: 80, min: 20, max: 240, step: 5, unit: 'px/s', description: 'The SLOW TROT (owner 2026-11-16: 80) — the pace of every ordinary trot: the one that develops under a walk-on (T1/T9) and the one at the dog\'s turn (T5). Never below `walk speed` nor above the full `trot pace`, which only a whole-group bolt (T2) reaches.', exposed: true },
  { key: 'trotDriveDelay', category: 'Trot', label: 'trot drive delay', type: 'float', default: 3, min: 0, max: 15, step: 0.5, unit: 's', description: 'T9 (owner 2026-11-16): the dog must have been on walk-on / easy this long before a driven group\'s leaders can break into the slow trot ("a walk on for a few seconds"). The T5 turn trigger does not wait for it.', exposed: true },
  { key: 'trotPressMin', category: 'Trot', label: 'trot pressure level', type: 'float', default: 0.1, min: 0, max: 1, step: 0.01, unit: '—', description: 'T1/T5: how much dog threat a sheep must feel to count as PRESSED for starting a trot. Above the faint fringe of his eye, so a group he is merely near cannot trot off.', exposed: true },
  { key: 'trotPressFrac', category: 'Trot', label: 'trot pressed share', type: 'float', default: 0.15, min: 0, max: 1, step: 0.05, unit: '—', description: 'T1/T5: share of a group that must be pressed (see `trot pressure level`) before it can break into a trot — the dog has to be working THIS group, not brushing one sheep of it.', exposed: true },
  { key: 'trotTurnWindow', category: 'Trot', label: 'trot turn window', type: 'float', default: 1.5, min: 0, max: 5, step: 0.1, unit: 's', description: 'T5: for this long after the dog ends or reverses a live flank sweep (stops, lies down, turns back, goes to walk-on / easy), a collected group he is pressing can break into a trot AWAY from him — standing or not. 0 = off.', exposed: true },
  { key: 'trotTurnProb', category: 'Trot', label: 'trot turn chance', type: 'float', default: 0.9, min: 0, max: 1, step: 0.05, unit: '/s', description: 'T5: per-second chance, during the turn window, that a pressed group larger than `trot group size` streams off at a trot. Skips the move-floor and alignment tests — a bunched, standing group qualifies.', exposed: true },
  { key: 'trotMaxDur', category: 'Trot', label: 'trot time limit', type: 'float', default: 4, min: 0, max: 20, step: 0.5, unit: 's', description: 'T6: a sheep trots at most this long, pressure or not, then eases down to a walk (T7). At the default pace 4 s is about a third of the field. 0 = no limit (the v9 behavior).', exposed: true },
  { key: 'trotRest', category: 'Trot', label: 'trot rest', type: 'float', default: 6, min: 0, max: 30, step: 0.5, unit: 's', description: 'T6: after dropping out of a trot (time limit, decay or fence) a sheep cannot be recruited or lead again for this long — stops a tight column re-recruiting its own drop-outs.', exposed: true },
  { key: 'trotWindDown', category: 'Trot', label: 'trot wind-down', type: 'float', default: 3, min: 0, max: 10, step: 0.5, unit: 's', description: 'T7: an unpressured sheep leaving the trot keeps walking on its line while its pace eases from trot to a stand over this long; `calm delay` later it is grazing. Felt pressure or a fence cancels it. 0 = drops straight out.', exposed: true },

  // Scoring — COUNT-UP (POC-v14), reworked in POC-v15 (owner interview 2026-11-17): three tiers × a sheep's
  // condition, an uncapped quality-fed chain, three strikes, end bonuses that MULTIPLY, four jackpots, and a
  // verdict (rank, percent of a reference run, category grades). Points are still EVENTS and the total never
  // drops; see .claude/sheep/implemented/POC-v15/scoring.md + verdict-and-hud.md.
  { key: 'penPoints', category: 'Scoring', label: 'RUSHED sheep', type: 'int', default: 50, min: 0, max: 1000, step: 10, unit: 'pts', description: "SC12: a sheep that trots, bolts or is worked up through the pen gate.", exposed: true },
  { key: 'penCalmPoints', category: 'Scoring', label: 'CALM sheep', type: 'int', default: 200, min: 0, max: 2000, step: 10, unit: 'pts', description: "SC12: a sheep that WALKS through with stress below `calm stress`.", exposed: true },
  { key: 'penPerfectPoints', category: 'Scoring', label: 'PERFECT sheep', type: 'int', default: 500, min: 0, max: 5000, step: 10, unit: 'pts', description: "SC12: a sheep that walks through with stress below `perfect stress`. Also the per-sheep basis of the flock value (SC14).", exposed: true },
  { key: 'penCalmStress', category: 'Scoring', label: 'calm stress', type: 'float', default: 0.15, min: 0, max: 1, step: 0.05, unit: '—', description: "SC12: a walking sheep is CALM while its stress is below this.", exposed: true },
  { key: 'penPerfectStress', category: 'Scoring', label: 'perfect stress', type: 'float', default: 0.03, min: 0, max: 1, step: 0.01, unit: '—', description: "SC12: a walking sheep is PERFECT while its stress is below this.", exposed: true },
  { key: 'penStressMemory', category: 'Scoring', label: 'stress memory', type: 'float', default: 3, min: 0, max: 20, step: 0.5, unit: 's', description: "SC12: a sheep's tier is read from its stress SMOOTHED over about this long (or its stress this instant, whichever is higher) — the dog is usually out of reach by the gate, so the instant value alone would call nearly every walker PERFECT. 0 = the instant value only.", exposed: true },
  { key: 'condPanicDrain', category: 'Scoring', label: 'condition drain, panic', type: 'float', default: 0.1, min: 0, max: 1, step: 0.01, unit: '/s', description: "SC13: condition a sheep loses per second while panicking.", exposed: true },
  { key: 'condTrotDrain', category: 'Scoring', label: 'condition drain, trot', type: 'float', default: 0.02, min: 0, max: 1, step: 0.005, unit: '/s', description: "SC13: condition a sheep loses per second while trotting.", exposed: true },
  { key: 'condRecover', category: 'Scoring', label: 'condition recovery', type: 'float', default: 0.01, min: 0, max: 1, step: 0.005, unit: '/s', description: "SC13: condition a sheep regains per second while grazing (idle).", exposed: true },
  { key: 'condFloor', category: 'Scoring', label: 'condition floor', type: 'float', default: 0.2, min: 0, max: 1, step: 0.05, unit: '—', description: "SC13: lowest condition a standing sheep can reach.", exposed: true },
  { key: 'comboWindow', category: 'Scoring', label: 'chain window', type: 'float', default: 1.5, min: 0, max: 10, step: 0.1, unit: 's', description: "SC15: longest gap between two crossings that keeps the chain alive, at ×1.", exposed: true },
  { key: 'comboWindowMin', category: 'Scoring', label: 'chain window (long chain)', type: 'float', default: 0.4, min: 0, max: 10, step: 0.1, unit: 's', description: "SC15: the window once the chain has reached `chain tighten at`.", exposed: true },
  { key: 'comboTightenAt', category: 'Scoring', label: 'chain tighten at', type: 'int', default: 30, min: 2, max: 100, step: 1, unit: '×', description: "SC15: chain value at which the window has shrunk to its minimum.", exposed: true },
  { key: 'strikeMax', category: 'Scoring', label: 'strikes', type: 'int', default: 3, min: 0, max: 10, step: 1, unit: '—', description: "SC16: strikes that end the run (0 = a run cannot bust).", exposed: true },
  { key: 'strikePanics', category: 'Scoring', label: 'panics per strike', type: 'int', default: 5, min: 0, max: 200, step: 1, unit: '—', description: "SC16: every this-many panics is a strike (0 = panics never strike).", exposed: true },
  { key: 'panicRearm', category: 'Scoring', label: 'panic re-arm', type: 'float', default: 5, min: 0, max: 60, step: 0.5, unit: 's', description: "SC16: shortest gap before the same sheep's next panic or fence slam counts again.", exposed: true },
  { key: 'fenceSlamSpeed', category: 'Scoring', label: 'fence slam speed', type: 'float', default: 100, min: 20, max: 300, step: 5, unit: 'px/s', description: "SC16 (owner Q96): a sheep reaching the fence with more than this speed INTO it is a slam — a strike.", exposed: true },
  { key: 'strikeCooldown', category: 'Scoring', label: 'strike cooldown', type: 'float', default: 3, min: 0, max: 30, step: 0.5, unit: 's', description: "SC16: one incident, one strike — a second strike inside this long of the last is not counted.", exposed: true },
  { key: 'parBase', category: 'Scoring', label: 'par base', type: 'float', default: 45, min: 0, max: 300, step: 5, unit: 's', description: "SC17: par time before the per-sheep allowance.", exposed: true },
  { key: 'parPerSheep', category: 'Scoring', label: 'par per sheep', type: 'float', default: 3, min: 0, max: 10, step: 0.5, unit: 's', description: "SC17: par time added per sheep.", exposed: true },
  { key: 'parPointsPerSec', category: 'Scoring', label: 'time bonus rate', type: 'int', default: 10, min: 0, max: 500, step: 5, unit: 'pts/s', description: "SC17: flat points per whole second under par on a won run, added AFTER the multipliers — a tie-breaker.", exposed: true },
  { key: 'multFullFlock', category: 'Scoring', label: 'full flock ×', type: 'float', default: 1.5, min: 1, max: 10, step: 0.1, unit: '×', description: "SC18: end multiplier for penning the whole flock (scaled by the share penned on an unfinished run, SC20).", exposed: true },
  { key: 'multClean', category: 'Scoring', label: 'clean run ×', type: 'float', default: 1.5, min: 1, max: 10, step: 0.1, unit: '×', description: "SC18: end multiplier for a won run with no strikes.", exposed: true },
  { key: 'multAllCalm', category: 'Scoring', label: 'all calm ×', type: 'float', default: 2, min: 1, max: 10, step: 0.1, unit: '×', description: "SC18: end multiplier when no sheep was penned RUSHED.", exposed: true },
  { key: 'multAwardCommon', category: 'Scoring', label: 'common award ×', type: 'float', default: 1.05, min: 1, max: 10, step: 0.05, unit: '×', description: "SC19: end multiplier per common award.", exposed: true },
  { key: 'multAwardRare', category: 'Scoring', label: 'rare award ×', type: 'float', default: 1.1, min: 1, max: 10, step: 0.05, unit: '×', description: "SC19: end multiplier per rare award.", exposed: true },
  { key: 'multAwardLegendary', category: 'Scoring', label: 'legendary award ×', type: 'float', default: 1.25, min: 1, max: 10, step: 0.05, unit: '×', description: "SC19: end multiplier per legendary award.", exposed: true },
  { key: 'multOneGo', category: 'Scoring', label: 'one go ×', type: 'float', default: 1.5, min: 1, max: 20, step: 0.5, unit: '×', description: "SC22: end multiplier for penning the whole flock in a single unbroken chain.", exposed: true },
  { key: 'perfectFileMin', category: 'Scoring', label: 'perfect file length', type: 'int', default: 20, min: 2, max: 500, step: 1, unit: '—', description: "SC21: crossings in one chain, none RUSHED, that make a PERFECT FILE — the chain's points are paid again when it ends.", exposed: true },
  { key: 'frenzyEvery', category: 'Scoring', label: 'frenzy every', type: 'int', default: 25, min: 0, max: 100, step: 1, unit: '×', description: "SC23: each time the chain passes a multiple of this a frenzy opens (0 = never).", exposed: true },
  { key: 'frenzySecs', category: 'Scoring', label: 'frenzy length', type: 'float', default: 4, min: 0, max: 60, step: 0.5, unit: 's', description: "SC23: how long a frenzy lasts when it opens.", exposed: true },
  { key: 'frenzyExtend', category: 'Scoring', label: 'frenzy extension', type: 'float', default: 0.5, min: 0, max: 10, step: 0.1, unit: 's', description: "SC23: time each crossing during a frenzy adds to it.", exposed: true },
  { key: 'frenzyMax', category: 'Scoring', label: 'frenzy cap', type: 'float', default: 6, min: 0, max: 120, step: 0.5, unit: 's', description: "SC23: most time a frenzy can hold.", exposed: true },
  { key: 'finisherPoints', category: 'Scoring', label: 'last-sheep bonus', type: 'int', default: 500, min: 0, max: 10000, step: 50, unit: 'pts', description: "SC24: bonus for the crossing that fills the pen, times the multiplier at that moment — full if PERFECT, half if CALM, none if RUSHED.", exposed: true },
  { key: 'quietHandBase', category: 'Scoring', label: 'quiet hand base', type: 'float', default: 6, min: 0, max: 60, step: 1, unit: 'cmds', description: "SC19 Quiet Hand: command allowance before the per-sheep part.", exposed: true },
  { key: 'quietHandPerSheep', category: 'Scoring', label: 'quiet hand per sheep', type: 'float', default: 0.5, min: 0, max: 5, step: 0.1, unit: 'cmds', description: "SC19 Quiet Hand: extra commands allowed per sheep.", exposed: true },
  { key: 'lineOnDist', category: 'Scoring', label: 'on-line distance', type: 'float', default: 60, min: 10, max: 300, step: 5, unit: 'px', description: "SC19 Straight as a Die: the flock centre counts as ON the ideal line within this distance of it.", exposed: true },
  { key: 'lineAwardShare', category: 'Scoring', label: 'line award share', type: 'float', default: 0.8, min: 0, max: 1, step: 0.05, unit: '—', description: "SC19 Straight as a Die: share of the run the flock must spend on the line.", exposed: true },
  { key: 'photoFinishSecs', category: 'Scoring', label: 'photo finish window', type: 'float', default: 3, min: 0, max: 30, step: 0.5, unit: 's', description: "SC19 Photo Finish: won within this many seconds either side of par.", exposed: true },
  { key: 'fullPurseShare', category: 'Scoring', label: 'full purse share', type: 'float', default: 0.9, min: 0, max: 1, step: 0.05, unit: '—', description: "SC19 Full Purse: the flock's mean condition never fell below this.", exposed: true },
  { key: 'wolfPoints', category: 'Scoring', label: 'wolf points', type: 'int', default: 300, min: 0, max: 5000, step: 50, unit: 'pts', description: "SC11 (assault): points per wolf routed or killed.", exposed: true },
  { key: 'rankFarmhand', category: 'Scoring', label: 'rank: Farmhand', type: 'float', default: 0.01, min: 0, max: 100, step: 0.01, unit: '× ref', description: "VH7: share of the reference run at which the rank begins (below it: Lost Tourist).", exposed: true },
  { key: 'rankDrover', category: 'Scoring', label: 'rank: Drover', type: 'float', default: 0.05, min: 0, max: 100, step: 0.01, unit: '× ref', description: "VH7: share of the reference run at which the rank begins.", exposed: true },
  { key: 'rankShepherd', category: 'Scoring', label: 'rank: Shepherd', type: 'float', default: 0.15, min: 0, max: 100, step: 0.01, unit: '× ref', description: "VH7: share of the reference run at which the rank begins.", exposed: true },
  { key: 'rankHeadShepherd', category: 'Scoring', label: 'rank: Head Shepherd', type: 'float', default: 0.4, min: 0, max: 100, step: 0.01, unit: '× ref', description: "VH7: share of the reference run at which the rank begins.", exposed: true },
  { key: 'rankChampion', category: 'Scoring', label: 'rank: Trial Champion', type: 'float', default: 1, min: 0, max: 100, step: 0.05, unit: '× ref', description: "VH7: share of the reference run at which the rank begins.", exposed: true },
  { key: 'rankOneMan', category: 'Scoring', label: 'rank: One Man and His Dog', type: 'float', default: 10, min: 0, max: 1000, step: 0.5, unit: '× ref', description: "VH7: share of the reference run at which the rank begins.", exposed: true },
  { key: 'gradeA', category: 'Scoring', label: 'grade A from', type: 'float', default: 0.9, min: 0, max: 1, step: 0.01, unit: '—', description: "VH9: category value (0–1) at which the grade is A.", exposed: true },
  { key: 'gradeStep', category: 'Scoring', label: 'grade step', type: 'float', default: 0.18, min: 0.01, max: 1, step: 0.01, unit: '—', description: "VH9: each lower grade (B, C, D, E) begins this much further down; below E is F.", exposed: true },
  { key: 'gradeCalmCredit', category: 'Scoring', label: 'calm grade credit', type: 'float', default: 0.8, min: 0, max: 1, step: 0.05, unit: '—', description: "VH9 Calm: what a CALM sheep counts for beside a PERFECT one (1) and a RUSHED one (0).", exposed: true },
  { key: 'safetyPanicCost', category: 'Scoring', label: 'safety cost per panic', type: 'float', default: 0.02, min: 0, max: 1, step: 0.005, unit: '—', description: "VH9 Safety: lost per panic, on top of a third per strike.", exposed: true },
  { key: 'lineNorm', category: 'Scoring', label: 'line norm', type: 'float', default: 150, min: 20, max: 400, step: 5, unit: 'px', description: 'Path deviation that counts as "fully off-line".', exposed: false },
  { key: 'T_straggle', category: 'Scoring', label: 'straggle time', type: 'float', default: 3.0, min: 0, max: 6, step: 0.5, unit: 's', description: 'Seconds outside the blob before a sheep counts as a straggler.', exposed: true },
  { key: 'splitMinSize', category: 'Scoring', label: 'split min size', type: 'int', default: 3, min: 2, max: 8, step: 1, unit: '—', description: 'Min cluster size to count as a real sub-flock.', exposed: true },
  { key: 'clusterDist', category: 'Scoring', label: 'cluster link dist', type: 'float', default: 70, min: 20, max: 160, step: 5, unit: 'px', description: 'Link distance for cluster/split detection.', exposed: false },

  // Objectives (POC-v14 field-objectives.md): optional drive gates in the pasture + special sheep.
  { key: 'driveGateMax', category: 'Objectives', label: 'drive gates (max)', type: 'int', default: 2, min: 0, max: 4, step: 1, unit: '—', description: 'FO1: most drive gates a course can draw (0 = none). None in wave mode.', exposed: true, onChange: 'respawn' },
  { key: 'driveGateChance', category: 'Objectives', label: 'drive gate chance', type: 'float', default: 0.5, min: 0, max: 1, step: 0.05, unit: '—', description: 'FO1: chance each possible drive gate is present on a course.', exposed: true, onChange: 'respawn' },
  { key: 'driveGateWidth', category: 'Objectives', label: 'drive gate gap', type: 'float', default: 90, min: 40, max: 200, step: 5, unit: 'px', description: 'FO1: gap between the two hurdle panels.', exposed: true, onChange: 'respawn' },
  { key: 'driveGatePanel', category: 'Objectives', label: 'drive gate panel', type: 'float', default: 50, min: 20, max: 120, step: 5, unit: 'px', description: 'FO1/FO3: length of each solid hurdle panel.', exposed: true, onChange: 'respawn' },
  { key: 'driveGatePoints', category: 'Objectives', label: 'drive gate points', type: 'int', default: 50, min: 0, max: 1000, step: 10, unit: 'pts', description: "FO2: points per sheep through the gap (once per sheep per gate, either way).", exposed: true },
  { key: 'driveGateMult', category: 'Objectives', label: 'drive gate multiplier', type: 'float', default: 1, min: 0, max: 10, step: 0.5, unit: '×', description: "FO7 (POC-v15): when every sheep still being worked has been through a gate, the multiplier on every later crossing rises by this for the rest of the run.", exposed: true },
  // Competition course (owner 2026-11-18): a clean field — no obstacles — with 4–6 drive gates on a REQUIRED path, taken in order, then the pen.
  { key: 'course', category: 'Objectives', label: 'course', type: 'enum', options: ['pasture', 'competition'], default: 'pasture', unit: '—', description: 'CC1: `pasture` = the open course (obstacles OR optional drive gates, never both) · `competition` = a clean field with numbered drive gates the whole flock must take in order before the pen opens. Set by the page, not a dial. No competition course in wave mode.', exposed: false, onChange: 'respawn' },
  { key: 'compGatesMin', category: 'Objectives', label: 'competition gates (min)', type: 'int', default: 4, min: 1, max: 8, step: 1, unit: '—', description: 'CC2: fewest gates on a competition course.', exposed: true, onChange: 'respawn' },
  { key: 'compGatesMax', category: 'Objectives', label: 'competition gates (max)', type: 'int', default: 6, min: 1, max: 8, step: 1, unit: '—', description: 'CC2: most gates on a competition course.', exposed: true, onChange: 'respawn' },
  { key: 'compLegMin', category: 'Objectives', label: 'competition leg (min)', type: 'float', default: 190, min: 120, max: 400, step: 10, unit: 'px', description: 'CC2: shortest leg of the required path (start → gate → gate → pen).', exposed: true, onChange: 'respawn' },
  { key: 'compTurnMax', category: 'Objectives', label: 'competition turn (max)', type: 'float', default: 100, min: 30, max: 170, step: 5, unit: '°', description: 'CC2: sharpest turn the required path may make at a gate.', exposed: true, onChange: 'respawn' },
  { key: 'specials', category: 'Objectives', label: 'special sheep', type: 'boolean', default: true, unit: '—', description: 'FO4–FO6: whether a course may carry a golden ewe, a lamb with its mother and a stubborn ram (each rolls independently, at most one of each).', exposed: true, onChange: 'respawn' },
  { key: 'goldenChance', category: 'Objectives', label: 'golden ewe chance', type: 'float', default: 0.35, min: 0, max: 1, step: 0.05, unit: '—', description: 'FO4: chance a course has a golden ewe.', exposed: true, onChange: 'respawn' },
  { key: 'goldenMult', category: 'Objectives', label: 'golden ewe worth', type: 'float', default: 5, min: 1, max: 20, step: 0.5, unit: '×', description: 'FO4: her worth as a multiple of an ordinary sheep (stacks with calm and the stream multiplier, owner Q81).', exposed: true },
  { key: 'lambChance', category: 'Objectives', label: 'lamb chance', type: 'float', default: 0.35, min: 0, max: 1, step: 0.05, unit: '—', description: 'FO5: chance a course has a lamb and its mother.', exposed: true, onChange: 'respawn' },
  { key: 'lambMult', category: 'Objectives', label: 'lamb worth', type: 'float', default: 3, min: 1, max: 20, step: 0.5, unit: '×', description: 'FO5: the lamb\'s worth when it goes through right behind its mother (within the stream window).', exposed: true },
  { key: 'lambFollow', category: 'Objectives', label: 'lamb follow', type: 'float', default: 1.5, min: 0, max: 6, step: 0.1, unit: '—', description: 'FO5: strength of the lamb\'s pull toward its mother (toward the gate once she is penned).', exposed: true },
  { key: 'ramChance', category: 'Objectives', label: 'ram chance', type: 'float', default: 0.25, min: 0, max: 1, step: 0.05, unit: '—', description: 'FO6: chance a course has a stubborn ram.', exposed: true, onChange: 'respawn' },
  { key: 'ramMult', category: 'Objectives', label: 'ram worth', type: 'float', default: 3, min: 1, max: 20, step: 0.5, unit: '×', description: 'FO6: the ram\'s worth as a multiple of an ordinary sheep.', exposed: true },
  { key: 'ramFleeScale', category: 'Objectives', label: 'ram flee scale', type: 'float', default: 0.6, min: 0, max: 1, step: 0.05, unit: '—', description: 'FO6: how much of the dog\'s pressure the ram feels.', exposed: true },
  { key: 'ramSpeedScale', category: 'Objectives', label: 'ram speed scale', type: 'float', default: 0.85, min: 0.3, max: 1, step: 0.05, unit: '—', description: 'FO6: the ram\'s top speed as a fraction of a sheep\'s.', exposed: true },
  { key: 'ramStandDist', category: 'Objectives', label: 'ram stand distance', type: 'float', default: 60, min: 0, max: 200, step: 5, unit: 'px', description: 'FO6 (owner Q84): an advancing dog inside this distance makes the ram stop and face him.', exposed: true },
  { key: 'ramStandRelease', category: 'Objectives', label: 'ram release distance', type: 'float', default: 110, min: 0, max: 300, step: 5, unit: 'px', description: 'FO6: the ram gives way again once the dog is beyond this distance.', exposed: true },
  { key: 'ramStandWait', category: 'Objectives', label: 'ram stand wait', type: 'float', default: 2, min: 0, max: 10, step: 0.5, unit: 's', description: 'FO6: a dog lying down this long also makes a standing ram give way (and he will not stand again for as long).', exposed: true },
  { key: 'ramYieldWait', category: 'Objectives', label: 'ram yield wait', type: 'float', default: 1, min: 0, max: 10, step: 0.25, unit: 's', description: 'FO6 (owner 2026-11-18): a dog on a direct walk-on facing a standing ram for this long makes him turn and trot off.', exposed: true },
  { key: 'ramYieldDur', category: 'Objectives', label: 'ram yield trot', type: 'float', default: 3, min: 0, max: 10, step: 0.5, unit: 's', description: 'FO6 (owner 2026-11-18): how long the ram slow-trots away from the dog once he yields (pace = `slow trot speed`); he will not stand again until `ram stand wait` after that.', exposed: true },
  { key: 'blackChance', category: 'Objectives', label: 'black sheep chance', type: 'float', default: 0.3, min: 0, max: 1, step: 0.05, unit: '—', description: "FO8: chance a course has a black sheep.", exposed: true, onChange: 'respawn' },
  { key: 'blackMult', category: 'Objectives', label: 'black sheep worth', type: 'float', default: 2, min: 1, max: 20, step: 0.5, unit: '×', description: "FO8: her worth as a multiple of an ordinary sheep.", exposed: true },
  { key: 'blackThreatScale', category: 'Objectives', label: 'black sheep nerves', type: 'float', default: 1.5, min: 1, max: 4, step: 0.1, unit: '×', description: "FO8: how much more of the dog's pressure she feels — she startles sooner.", exposed: true },
  { key: 'blackSpookRadius', category: 'Objectives', label: 'black sheep spook radius', type: 'float', default: 70, min: 0, max: 300, step: 5, unit: 'px', description: "FO8: while she panics, sheep inside this distance of her are spooked too.", exposed: true },
  { key: 'blackSpookThreat', category: 'Objectives', label: 'black sheep spook', type: 'float', default: 0.6, min: 0, max: 2, step: 0.05, unit: '—', description: "FO8: threat a sheep right beside her takes while she panics (fades to 0 at the radius).", exposed: true },
  { key: 'bellChance', category: 'Objectives', label: 'bellwether chance', type: 'float', default: 0.3, min: 0, max: 1, step: 0.05, unit: '—', description: "FO9: chance a course has a bellwether.", exposed: true, onChange: 'respawn' },
  { key: 'bellMult', category: 'Objectives', label: 'bellwether worth', type: 'float', default: 3, min: 1, max: 20, step: 0.5, unit: '×', description: "FO9: her worth when she is the FIRST sheep through the pen gate.", exposed: true },
  { key: 'bellRadius', category: 'Objectives', label: 'bellwether reach', type: 'float', default: 120, min: 0, max: 400, step: 5, unit: 'px', description: "FO9: alert sheep inside this distance of her follow her.", exposed: true },
  { key: 'bellWeight', category: 'Objectives', label: 'bellwether pull', type: 'float', default: 4, min: 0, max: 20, step: 0.5, unit: '—', description: "FO9: how many ordinary neighbours she counts for in a nearby sheep's cohesion and alignment.", exposed: true },
  { key: 'yearlingChance', category: 'Objectives', label: 'yearling chance', type: 'float', default: 0.3, min: 0, max: 1, step: 0.05, unit: '—', description: "FO10: chance a course has a skittish yearling.", exposed: true, onChange: 'respawn' },
  { key: 'yearlingMult', category: 'Objectives', label: 'yearling worth', type: 'float', default: 3, min: 1, max: 20, step: 0.5, unit: '×', description: "FO10: her worth when penned CALM or PERFECT.", exposed: true },
  { key: 'yearlingFlightScale', category: 'Objectives', label: 'yearling flight distance', type: 'float', default: 1.6, min: 1, max: 4, step: 0.1, unit: '×', description: "FO10: her flee radius as a multiple of the flock's.", exposed: true },
  { key: 'yearlingSize', category: 'Objectives', label: 'yearling size', type: 'float', default: 0.8, min: 0.3, max: 1.5, step: 0.05, unit: '×', description: "FO10: her drawn size beside an ordinary sheep.", exposed: true },
  { key: 'sideObjectiveCount', category: 'Objectives', label: 'side objectives', type: 'int', default: 2, min: 0, max: 4, step: 1, unit: '—', description: "FO11: side objectives a course states (0 = none). None in wave mode.", exposed: true, onChange: 'respawn' },
  { key: 'multSideObjective', category: 'Objectives', label: 'side objective ×', type: 'float', default: 1.25, min: 1, max: 10, step: 0.1, unit: '×', description: "FO11: end multiplier per side objective met on a won run.", exposed: true },

  // Modes (POC-v14 replay-modes.md): course / daily are the same game with a different best-score key; waves is the arcade clock.
  { key: 'mode', category: 'Modes', label: 'mode', type: 'enum', options: ['course', 'daily', 'waves'], default: 'course', unit: '—', description: 'RM4/RM5: `course` = one flock against par · `daily` = the same, on the seed for today\'s date · `waves` = a countdown clock, a little time per sheep penned, and a new larger flock every time the pen fills.', exposed: true, onChange: 'respawn' },
  { key: 'waveClock', category: 'Modes', label: 'wave clock', type: 'float', default: 90, min: 10, max: 600, step: 5, unit: 's', description: 'RM5: starting time on the wave-mode clock.', exposed: true, onChange: 'respawn' },
  { key: 'waveSecsPerSheep', category: 'Modes', label: 'wave time per sheep', type: 'float', default: 3, min: 0, max: 30, step: 0.5, unit: 's', description: 'RM5: time added per sheep penned.', exposed: true },
  { key: 'waveClockMax', category: 'Modes', label: 'wave clock cap', type: 'float', default: 120, min: 10, max: 900, step: 5, unit: 's', description: 'RM5: most time the clock can hold.', exposed: true },
  { key: 'waveSheepStart', category: 'Modes', label: 'wave first flock', type: 'int', default: 8, min: 1, max: 150, step: 1, unit: '—', description: 'RM5: flock size of the first wave (the `herd size` slider is ignored in wave mode).', exposed: true, onChange: 'respawn' },
  { key: 'waveGrowth', category: 'Modes', label: 'wave growth', type: 'int', default: 2, min: 0, max: 20, step: 1, unit: '—', description: 'RM5 (owner Q89): extra sheep each wave.', exposed: true },
  { key: 'waveSheepMax', category: 'Modes', label: 'wave flock cap', type: 'int', default: 40, min: 1, max: 150, step: 1, unit: '—', description: 'RM5: largest flock a wave can reach.', exposed: true },
  { key: 'historyMax', category: 'Modes', label: 'history length', type: 'int', default: 20, min: 0, max: 200, step: 1, unit: 'runs', description: "RC1: finished runs kept in the saved history.", exposed: true },
  { key: 'bandSmallMax', category: 'Modes', label: 'small flock up to', type: 'int', default: 30, min: 1, max: 150, step: 1, unit: 'sheep', description: "RC2: largest flock that counts as SMALL for the saved bests.", exposed: true },
  { key: 'bandMediumMax', category: 'Modes', label: 'medium flock up to', type: 'int', default: 80, min: 1, max: 150, step: 1, unit: 'sheep', description: "RC2: largest flock that counts as MEDIUM (larger is LARGE).", exposed: true },

  // Debug (render toggles — never exported)
  { key: 'debug.eye', category: 'Debug', label: 'flee cone + R_flee', type: 'boolean', default: true, unit: '—', description: 'Draw the dog\'s gaze cone and flee radius.', exposed: true, export: false },
  { key: 'debug.velocity', category: 'Debug', label: 'velocity vectors', type: 'boolean', default: false, unit: '—', description: 'Draw per-sheep velocity arrows.', exposed: true, export: false },
  { key: 'debug.neighbors', category: 'Debug', label: 'neighbor links', type: 'boolean', default: false, unit: '—', description: 'Draw alignment-neighbor links.', exposed: true, export: false },
  { key: 'debug.gcm', category: 'Debug', label: 'flock GCM', type: 'boolean', default: false, unit: '—', description: 'Draw the flock\'s center of mass.', exposed: true, export: false },
  { key: 'debug.dogTarget', category: 'Debug', label: 'dog target', type: 'boolean', default: false, unit: '—', description: 'Draw the dog\'s current steering target.', exposed: true, export: false },
  { key: 'debug.gateZone', category: 'Debug', label: 'gate approach zone', type: 'boolean', default: false, unit: '—', description: 'Draw the G1 commitment zone around the gate mouth.', exposed: true, export: false },
  { key: 'debug.gateAttract', category: 'Debug', label: 'gate attraction area', type: 'boolean', default: true, unit: '—', description: 'POC-v9 V1: light-blue transparent overlay of the gate\'s draw area (G2 `gate attraction radius`; the inner disc is full pull, inside half the radius) — the gate\'s counterpart of the dog\'s presence overlay.', exposed: true, export: false },
  { key: 'debug.spawnHoles', category: 'Debug', label: 'spawn holes / focus', type: 'boolean', default: false, unit: '—', description: 'POC-v5: outline the whole-pasture archetype\'s empty patches (F6) and the weighted archetype\'s core disc (F7) as drawn at spawn.', exposed: true, export: false },
  { key: 'debug.state', category: 'Debug', label: 'collect / drive', type: 'boolean', default: false, unit: '—', description: 'Label the dog\'s current collect/drive state.', exposed: true, export: false },
  { key: 'debug.flockOutline', category: 'Debug', label: 'flock outline', type: 'boolean', default: true, unit: '—', description: 'Dotted outline around the working flock — the HERD PERIMETER LINE: its convex hull offset outward by `perimeter margin` (Dog). Since the 2026-08-22 touch-up this is the line the flanking dog tracks.', exposed: true, export: false },
  { key: 'debug.outlineMarkers', category: 'Debug', label: 'outline markers', type: 'boolean', default: true, unit: '—', description: 'Number the outline\'s corners and side midpoints, 1 = nearest the gate, then clockwise.', exposed: true, export: false },
  { key: 'debug.dogTrack', category: 'Debug', label: 'dog flank track', type: 'boolean', default: true, unit: '—', description: 'POC-v6 C8: highlights the herd perimeter line (hull + `perimeter margin`) in the dog\'s colour while he flanks — since the 2026-08-22 touch-up it IS his track, so the dashes sit on the dotted outline.', exposed: true, export: false },

  // Sim (structural — read-only, except the F4 seed pair)
  { key: 'randomSeedOnLoad', category: 'Sim', label: 'random seed on load', type: 'boolean', default: true, unit: '—', description: 'F4 (POC-v5): draw a fresh PRNG seed on every page load, so each load is a new course. Off = boot with the pinned `seed` below (tuning / regression). Boot-time only.', exposed: true },
  { key: 'seed', category: 'Sim', label: 'PRNG seed', type: 'int', default: 1337, unit: '—', description: 'Seed of the current course. Same seed → same gate, same spawn layout, sheep for sheep (F1/F4). Type a seed to re-lay that course; Reset run replays it, Reseed → new flock draws a new one. Exported so a pasted defaults file reproduces the course when `random seed on load` is off.', exposed: true, onChange: 'respawn' },
  { key: 'dt', category: 'Sim', label: 'fixed timestep', type: 'float', default: 1 / 60, unit: 's', description: 'Fixed simulation step (1/60 s).', exposed: false },
  { key: 'maxFrameDelta', category: 'Sim', label: 'max frame delta', type: 'float', default: 0.25, unit: 's', description: 'Clamp on real elapsed time to prevent spiral-of-death.', exposed: false },
]

// Resolve a (possibly dotted) key against an object → [holder, finalProp].
function settingTarget(obj, key, create) {
  const path = key.split('.')
  for (let i = 0; i < path.length - 1; i++) {
    if (create && !(path[i] in obj)) obj[path[i]] = {}
    obj = obj[path[i]]
  }
  return [obj, path[path.length - 1]]
}

// The plain `params` object §1 consumes — reduced from the schema, with each
// default OVERRIDDEN by `sheep-defaults.json.js` (SHEEP_DEFAULTS) when the key
// is present there (P9/Q2). Missing file → schema defaults; unknown keys in
// the file → one console warning (typo guard). Overrides land before `sim` is
// constructed, so no hook replay is needed.
function buildParams(settings) {
  const o = typeof SHEEP_DEFAULTS !== 'undefined' ? SHEEP_DEFAULTS : {}
  if (typeof SHEEP_DEFAULTS === 'undefined')
    console.warn('[sheep-poc] sheep-defaults.json.js missing — using schema defaults')
  const known = new Set(settings.map((e) => e.key))
  const unknown = Object.keys(o).filter((k) => !known.has(k) && k !== 'levers') // `levers` = lever positions (UI state, POC-v5 Q17)
  if (unknown.length)
    console.warn('[sheep-poc] sheep-defaults.json.js: unknown keys ignored: ' + unknown.join(', '))
  const p = {}
  for (const e of settings) {
    const [holder, prop] = settingTarget(p, e.key, true)
    let v = e.key in o ? o[e.key] : e.default
    if (e.type === 'enum' && !e.options.includes(v)) {
      console.warn('[sheep-poc] sheep-defaults.json.js: ' + e.key + ' = ' + JSON.stringify(v) + ' is not one of ' + e.options.join('/') + ' — using ' + e.default)
      v = e.default
    }
    holder[prop] = e.type === 'point' ? { ...v } : v
  }
  return p
}
const params = buildParams(SETTINGS)

// ============================================================================
// Tuning levers (POC-v5 P4) — §0 DATA + PURE FUNCTIONS. A lever is a named
// 0–1 dial that writes a family of raw params along a hand-authored curve
// (`[at0, at0.5, at1]`, piecewise-linear through the anchor). The 0.5 column
// IS the shipped default — copied from sheep-defaults.json.js, never invented;
// `assertLevers()` refuses to boot quietly if that stops being true.
// Stamp-and-release: a lever writes its params once and records the stamp; a
// raw param hand-edited afterwards simply wins and the lever reads (modified).
// §1 SIM never sees any of this — it still receives the plain `params` object.
// Source: brainstorming/lever-model.md (2026-08-18) · spec/POC-v5/tuning-levers.md
// ============================================================================
const LEVERS = [
  // ---- dog-behavior ----
  { key: 'dogPresence', domain: 'dog-behavior', label: 'Presence', blurb: 'How much threat he radiates at all.',
    ends: { 0: 'a dog the sheep barely mind', 1: 'a dog that empties the field' },
    params: { R_flee: [70, 120, 200], ambient: [0.05, 0.2, 0.45], coneK: [4, 2, 1.2], driveConeExt: [0.25, 0.5, 0.8], lieDownBlock: [0.8, 1.4, 2.2],
      lieDownIntensity: [0.15, 0.3, 0.55], postureRange: [0.4, 0.6, 0.85], dogAvoidRadius: [25, 45, 80] } },
  { key: 'dogStandoff', domain: 'dog-behavior', label: 'Standoff', blurb: 'How much room he gives the flock.',
    ends: { 0: 'works right on top of them, quick and darty', 1: 'works from a long way off, steady and unhurried' },
    params: { dogVMax: [150, 110, 95], walkOnSpeedFrac: [1.05, 0.85, 0.7], easySpeedFrac: [0.6, 0.5, 0.4], perimeterMargin: [28, 56, 84], fenceSeekReach: [48, 72, 120], R_drive: [95, 140, 220], R_driveMin: [42, 55, 90], driveTrailGap: [35, 60, 90] } },
  { key: 'dogSweep', domain: 'dog-behavior', label: 'Sweep', blurb: 'The shape of his flank.',
    ends: { 0: 'tight and economical', 1: 'a big, deliberate, wide sweep' },
    params: { flankConeDeg: [30, 45, 62], flankAdvance: [1.8, 1, 0.5], flankOvershootDeg: [0, 0, 60], flankHandoffDeg: [45, 30, 15], fenceSeekBias: [0.25, 0.6, 0.9] } },
  { key: 'dogTouch', domain: 'dog-behavior', label: 'Touch', blurb: 'The character of his hands at the gate.',
    ends: { 0: 'soft, patient, long presses', 1: 'sharp, punchy, insistent' },
    params: { shoveMult: [1.2, 1.5, 2], shoveDur: [1.2, 0.8, 0.5], shoveDecay: [0.9, 0.5, 0.3], barkMult: [1.6, 2, 2.8], barkDur: [0.7, 0.4, 0.25], barkDecay: [0.5, 0.3, 0.2],
      leanMult: [1.1, 1.2, 1.45], leanDur: [2.2, 1.5, 1], leanDecay: [0.8, 0.5, 0.35], stallSpeed: [4, 8, 14], stallDwell: [2.5, 1.5, 0.8] } },
  // ---- sheep-behavior ----
  { key: 'sheepNerve', domain: 'sheep-behavior', label: 'Nerve', blurb: 'How readily they react to threat they can feel.',
    ends: { 0: 'stoic, hard to move', 1: 'hair-trigger' },
    params: { boldMean: [0.55, 0.3, 0.12], boldnessTheta: [0.85, 0.5, 0.25], panicThreshold: [0.9, 0.7, 0.4], panicMult: [1.2, 1.4, 2], w_flee: [1.1, 2, 3.2], w_avoid: [0.15, 0.4, 0.8], vMax: [70, 90, 115] } },
  { key: 'sheepCohesion', domain: 'sheep-behavior', label: 'Cohesion', blurb: 'Jelly stiffness. Above ~0.75 expect rule A4 (no global blob) to break — a different game, not a defect.',
    ends: { 0: 'loose scatter with no flock body', 1: 'one tight blob that moves as a unit' },
    params: { w_coh: [0.4, 1, 2], cohN: [5, 10, 16], cohScale: [55, 100, 140], w_sep: [2.2, 1.5, 1], r_sep: [26, 18, 12], minSep: [6, 4, 3], w_align: [0.08, 0.3, 0.5], r_align: [22, 36, 55] } },
  { key: 'sheepRestlessness', domain: 'sheep-behavior', label: 'Restlessness', blurb: 'How fast a gathered flock comes undone — the time-pressure lever (B2).',
    ends: { 0: 'statues; a gather stays gathered', 1: 'never settles; every gather dissolves behind you' },
    params: { grazeSpeed: [6, 15, 30], idleSpeedCap: [10, 25, 45], grazeStepEvery: [9, 4, 1.5], grazeStepLen: [5, 12, 24], wandererFrac: [0.03, 0.12, 0.3],
      calmDelay: [12, 3, 1.5], crowdTolerance: [6, 2, 0], w_graze: [0.12, 0.3, 0.6], wanderTurn: [0.6, 1.5, 3], idleCohRadius: [90, 60, 40] } },
  { key: 'sheepCharacter', domain: 'sheep-behavior', label: 'Character', blurb: 'How much individuals differ from the average.',
    ends: { 0: 'eighty identical sheep', 1: 'a flock full of individuals, oddballs guaranteed' },
    params: { boldSd: [0.04, 0.22, 0.38], dartBoldness: [0.95, 0.8, 0.62], protestProb: [0.2, 0.6, 0.95], protestDur: [0.12, 0.3, 0.55] } },
  // ---- pasture-builder (respawn on move, Q15) ----
  { key: 'pastureScale', domain: 'pasture-builder', label: 'Scale', blurb: 'How big a job is this. Radii do NOT rescale (Q13) — a bigger field is a harder job.', respawn: true,
    ends: { 0: 'a nursery pen with a handful of sheep', 1: 'a wide open trial field with a full flock' },
    params: { canvasW: [800, 1120, 1500], canvasH: [520, 720, 960], fenceInset: [40, 56, 80], sheepCount: [18, 80, 150], w_fence: [1.7, 1.5, 1.3], r_fence: [34, 30, 26] } },
  { key: 'pastureGate', domain: 'pasture-builder', label: 'Gate', blurb: 'How punishing the mouth is.', respawn: true,
    ends: { 0: 'a barn door', 1: 'a needle' },
    params: { gateWidth: [60, 42, 24], gateCornerMargin: [160, 80, 45], gateApproachR: [100, 60, 30], w_through: [3.2, 2, 1.1], crushRadius: [30, 40, 55],
      gateAttractR: [140, 100, 60], w_gateAttract: [1.8, 1.2, 0.7], gateFollowR: [40, 30, 22], gateFollowDecay: [0.75, 0.6, 0.45] } },
  { key: 'pastureApproach', domain: 'pasture-builder', label: 'Approach', blurb: 'How far the course makes you work. Owns the POC-v5 spawn-archetype params at their anchor (Q27) — it does not bias WHICH archetype is drawn.', respawn: true,
    ends: { 0: 'spawn on the gate\'s doorstep in tidy lumps', 1: 'spawn far along the fence, scattered wide' },
    params: { spawnGateOffset: [90, 200, 420], spawnDepth: [80, 140, 250], clusterSpread: [12, 24, 45], clusterMinGap: [60, 120, 240], clusterSizeMax: [16, 10, 4],
      // POC-v5 spawn layouts (F6–F8): anchor-only profiles until a /sheep tune pass authors endpoints
      spawnGateClear: [120, 120, 120], holeCountMin: [2, 2, 2], holeCountMax: [5, 5, 5], holeRadiusMin: [70, 70, 70], holeRadiusMax: [180, 180, 180],
      holeLobes: [3, 3, 3], focusShare: [0.75, 0.75, 0.75], focusRadius: [150, 150, 150], focusGapScale: [0.5, 0.5, 0.5] } },
  { key: 'pastureClutter', domain: 'pasture-builder', label: 'Clutter', blurb: 'How much stands in the way (owner Q67, 2026-11-14): how many stands / rocks, how big, and how tight the lanes between them. Moves both the exact count and the top of the random range, so it works in either mode.', respawn: true,
    ends: { 0: 'bare grass, nothing to go round', 1: 'a wooded, rocky pasture with tight lanes' },
    params: { obstacleFreq: [0, 2, 12], obstacleRangeMax: [0, 24, 60], obstacleGroupMax: [1, 3, 5], obstacleRadiusMin: [14, 20, 30], obstacleRadiusMax: [30, 46, 70], obstacleMinGap: [90, 60, 36] } },
  { key: 'pastureStrictness', domain: 'pasture-builder', label: 'Strictness', blurb: 'How much the course asks for before it pays (POC-v14: re-pointed from the old penalty weights at the count-up bonuses) — how calm is calm, how tight is a stream, how generous is par.', respawn: false,
    ends: { 0: 'generous — bonuses come easily', 1: 'championship trial — every bonus is earned' },
    params: { penCalmStress: [0.3, 0.15, 0.08], penPerfectStress: [0.06, 0.03, 0.015], comboWindow: [2.5, 1.5, 1], comboWindowMin: [0.7, 0.4, 0.25], parBase: [70, 45, 30], parPerSheep: [5, 3, 2] } }, // stress + window anchors retuned 2026-11-17 from measured driven runs
]
const LEVER_DOMAINS = [
  { key: 'dog-behavior', title: 'Dog' }, { key: 'sheep-behavior', title: 'Sheep' }, { key: 'pasture-builder', title: 'Pasture' },
]
// POC-v15 scoring vocabulary (pure data — the sim decides, the pages only draw).
// SC19: named awards and their rarity · VH7: shepherd ranks, lowest first ·
// FO11: the side-objective pool (`needs` = what the course must have).
const AWARDS = [
  { name: 'Quiet Hand', rarity: 'common' }, { name: 'Straight as a Die', rarity: 'common' }, { name: 'Photo Finish', rarity: 'common' }, { name: 'Gatekeeper', rarity: 'common' },
  { name: 'Not a Hair Out of Place', rarity: 'rare' }, { name: 'Never Sat', rarity: 'rare' }, { name: 'Steady Away', rarity: 'rare' }, { name: 'Full Purse', rarity: 'rare' },
  { name: 'Sunday Stroll', rarity: 'legendary' }, { name: 'Nobody Ran', rarity: 'legendary' }, { name: 'Not a Word Wasted', rarity: 'legendary' },
]
const RANKS = ['Lost Tourist', 'Farmhand', 'Drover', 'Shepherd', 'Head Shepherd', 'Trial Champion', 'One Man and His Dog']
const RANK_KEYS = ['rankFarmhand', 'rankDrover', 'rankShepherd', 'rankHeadShepherd', 'rankChampion', 'rankOneMan']
const JACKPOTS = [
  { id: 'file', label: 'Perfect file' }, { id: 'onego', label: 'One go' }, { id: 'frenzy', label: 'Frenzy' }, { id: 'finisher', label: 'Last sheep' },
]
const SPECIAL_KINDS = [
  { id: 'golden', label: 'Golden ewe' }, { id: 'lamb', label: 'Lamb' }, { id: 'ram', label: 'Stubborn ram' },
  { id: 'black', label: 'Black sheep' }, { id: 'bell', label: 'Bellwether' }, { id: 'yearling', label: 'Skittish yearling' },
]
const SIDE_OBJECTIVES = [
  { id: 'last_golden', needs: 'golden', label: 'Save the best for last', hint: 'pen the golden ewe last' },
  { id: 'lead_bell', needs: 'bell', label: 'Lead them in', hint: 'pen the bellwether first' },
  { id: 'gates', needs: 'gate', label: 'Through the gates', hint: 'take the whole flock through every drive gate' },
  { id: 'no_rush', label: 'No rush', hint: 'pen no sheep RUSHED' },
  { id: 'long_file', label: 'Long file', hint: 'one chain of at least half the flock' },
  { id: 'few_words', label: 'Few words', hint: 'win within the Quiet Hand command allowance' },
  { id: 'on_feet', label: 'On your feet', hint: 'win without a lie-down' },
  { id: 'spotless', label: 'Spotless', hint: 'win with no strikes' },
]
const SIDE_OBJECTIVES_AT_WIN = new Set(['no_rush', 'few_words', 'on_feet', 'spotless']) // still open at a win → met

// Everything a lever does NOT own, with the reason — the ownership assertion
// requires levered ∪ not-levered === SETTINGS exactly (no key unclaimed).
const LEVER_NOT_LEVERED = {
  superseded: ['fenceX', 'gateY', 'spawnMinX', 'spawnMaxX', 'R_orbit', 'omega', 'driveShrink', 'flankStandoff', 'postureConeK'], // (standBlock was removed outright in POC-v6 — nothing referenced it)
  derived: ['goal', 'clusterSizeMin', 'heelIntensity'], // heelIntensity fixed at 0 by rule A7
  substrate: ['L', 'damping', 'accelScale', 'dt', 'maxFrameDelta', 'fenceSeekRamp', 'parkFade', 'driveCloseRate', 'driveBackoffRate', 'flankCornerFrom'], // smoothing widths / rule thresholds, not feel dials (flankCornerFrom: owner Q46 — 0, always corner-first)
  draws: ['seed', 'randomSeedOnLoad', 'spawnLayout'], // a draw, not a dial (F4/F5)
  judging: ['lineNorm', 'T_straggle', 'splitMinSize', 'clusterDist', 'crushThreshold', 'crushSustain'], // the parked fourth domain
  parked: ['easyConeDeg', 'easyConeExt', 'lieConeDeg', 'lieConeExt', 'trotGroupMin', 'trotAlignMin', 'trotMoveSpeed', 'trotTriggerProb', 'trotBoltProb', 'trotLeadCount', 'trotFollowR', 'trotSpeedMult', 'w_trot', 'trotDecayMin', 'trotDecayMax', 'trotDecayRamp', 'trotFenceStop', 'trotReverseDeg', 'flankEasySpeedFrac', 'downConeOffsetDeg',
    'walkSpeed', 'trotSlowSpeed', 'trotDriveDelay', 'trotPressMin', 'trotPressFrac', 'trotTurnWindow', 'trotTurnProb', 'trotMaxDur', 'trotRest', 'trotWindDown', 'gateConeGrow', 'gateConeDeg', 'gateConeMax'], // POC-v9 + v10 (owner 2026-08-24) — anchored at their defaults until a /sheep tune pass authors lever endpoints
  obstacles: ['obstacleRandom', 'obstacleLowShare', 'obstacleRockFrac', 'obstacleRockScale', 'w_obstacle', 'obstacleLook', 'r_obstacle', 'obstacleSplit', 'obstacleCover', 'obstacleCoverEdge'], // owner 2026-11-14 — a mode switch, the shape of the draw, and the feel dials; count / size / gaps belong to Pasture · Clutter (Q67)
  scoring: ['penPoints', 'penCalmPoints', 'penPerfectPoints', 'penStressMemory', 'condPanicDrain', 'condTrotDrain', 'condRecover', 'condFloor', 'comboTightenAt', 'strikeMax', 'strikePanics', 'panicRearm', 'fenceSlamSpeed', 'strikeCooldown', 'parPointsPerSec',
    'multFullFlock', 'multClean', 'multAllCalm', 'multAwardCommon', 'multAwardRare', 'multAwardLegendary', 'multOneGo', 'perfectFileMin', 'frenzyEvery', 'frenzySecs', 'frenzyExtend', 'frenzyMax', 'finisherPoints',
    'quietHandBase', 'quietHandPerSheep', 'lineOnDist', 'lineAwardShare', 'photoFinishSecs', 'fullPurseShare', 'wolfPoints', 'rankFarmhand', 'rankDrover', 'rankShepherd', 'rankHeadShepherd', 'rankChampion', 'rankOneMan',
    'gradeA', 'gradeStep', 'gradeCalmCredit', 'safetyPanicCost'], // POC-v14 / v15 point values, rates and verdict bands — proposals until a /sheep tune pass (the bonus THRESHOLDS belong to Pasture · Strictness)
  objectives: ['course', 'compGatesMin', 'compGatesMax', 'compLegMin', 'compTurnMax', 'driveGateMax', 'driveGateChance', 'driveGateWidth', 'driveGatePanel', 'driveGatePoints', 'driveGateMult', 'specials', 'goldenChance', 'goldenMult', 'lambChance', 'lambMult', 'lambFollow', 'ramChance', 'ramMult', 'ramFleeScale', 'ramSpeedScale', 'ramStandDist', 'ramStandRelease', 'ramStandWait', 'ramYieldWait', 'ramYieldDur',
    'blackChance', 'blackMult', 'blackThreatScale', 'blackSpookRadius', 'blackSpookThreat', 'bellChance', 'bellMult', 'bellRadius', 'bellWeight', 'yearlingChance', 'yearlingMult', 'yearlingFlightScale', 'yearlingSize', 'sideObjectiveCount', 'multSideObjective'], // POC-v14 field objectives + POC-v15 (FO7–FO11)
  modes: ['mode', 'waveClock', 'waveSecsPerSheep', 'waveClockMax', 'waveSheepStart', 'waveGrowth', 'waveSheepMax', 'historyMax', 'bandSmallMax', 'bandMediumMax'], // POC-v14 replay modes + POC-v15 records — a mode switch and the arcade clock
  // plus every `debug.*` render toggle
}
const SETTING_BY_KEY = Object.fromEntries(SETTINGS.map((e) => [e.key, e]))
const LEVER_BY_KEY = Object.fromEntries(LEVERS.map((L) => [L.key, L]))
const LEVER_OWNER = {} // raw param key → lever key
for (const L of LEVERS) for (const pk of Object.keys(L.params)) LEVER_OWNER[pk] = L.key

// Piecewise-linear through the anchor; t = 0.5 returns the middle EXACTLY.
function resolveLever(t, [a, m, b]) {
  if (t === 0.5) return m
  return t < 0.5 ? a + (m - a) * (t / 0.5) : m + (b - m) * ((t - 0.5) / 0.5)
}
// The schema is authoritative for type, range and step: clamp into [min, max],
// ints round, floats snap to the step grid (mode: round | floor | ceil — the
// guards snap toward the safe side). Never widens a slider's range.
function coerceSetting(e, v, mode = 'round') {
  if (e.min !== undefined) v = Math.max(e.min, Math.min(e.max, v))
  const snap = mode === 'floor' ? Math.floor : mode === 'ceil' ? Math.ceil : Math.round
  if (e.type === 'int') return snap(v)
  if (e.step) {
    const base = e.min !== undefined ? e.min : 0
    v = +(base + snap((v - base) / e.step - (mode === 'round' ? 0 : 1e-9 * (mode === 'floor' ? -1 : 1))) * e.step).toFixed(6)
  }
  return v
}
const getParam = (key) => { const [h, p] = settingTarget(params, key, false); return h[p] }
const setParam = (key, v) => { const [h, p] = settingTarget(params, key, false); h[p] = v }

const leverState = { pos: {}, stamped: {}, limitedBy: {} }
for (const L of LEVERS) leverState.pos[L.key] = 0.5
// Q17: positions persist in the defaults file as UI state; raw params stay the
// truth. Loaded positions are stamped WITHOUT writing, so a position that
// disagrees with the file's raw values simply reads (modified) after boot.
function initLeverState(defaults) {
  const saved = defaults && typeof defaults.levers === 'object' ? defaults.levers : {}
  for (const L of LEVERS) {
    const t = +saved[L.key]
    leverState.pos[L.key] = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0.5
    for (const [pk, prof] of Object.entries(L.params)) leverState.stamped[pk] = coerceSetting(SETTING_BY_KEY[pk], resolveLever(leverState.pos[L.key], prof))
  }
  applyLeverGuards()
}
// Move a lever: write ITS params only (stamp), then re-run the guards.
// Returns the raw keys it touched (the UI refreshes those controllers).
function setLever(key, t) {
  const L = LEVER_BY_KEY[key]
  leverState.pos[key] = Math.max(0, Math.min(1, t))
  const touched = []
  for (const [pk, prof] of Object.entries(L.params)) {
    const v = coerceSetting(SETTING_BY_KEY[pk], resolveLever(leverState.pos[key], prof))
    setParam(pk, v); leverState.stamped[pk] = v; touched.push(pk)
  }
  return touched.concat(applyLeverGuards())
}
// A lever is (modified) when any param it owns differs from its stamp.
function leverModified(L) {
  return Object.keys(L.params).some((pk) => pk in leverState.stamped && getParam(pk) !== leverState.stamped[pk])
}
// Cross-lever guards, applied at resolve time (a hand-edit can always land
// underneath them). They read the LIVE value of the other side; the guarded
// param re-derives from its own profile when unmodified, else from its live
// (hand-edited) value — then clamps toward the safe side.
//   G1  driveTrailGap ≤ R_flee / 2      (Standoff limited by Presence)
//   G2  dogVMax ≥ vMax × 1.05           (Standoff limited by Nerve)
function applyLeverGuards() {
  leverState.limitedBy = {}
  const touched = []
  const guard = (pk, limit, mode, cmp, leverKey, byKey) => {
    const e = SETTING_BY_KEY[pk], L = LEVER_BY_KEY[leverKey]
    const cur = getParam(pk)
    const base = cur === leverState.stamped[pk] ? coerceSetting(e, resolveLever(leverState.pos[leverKey], L.params[pk])) : cur
    const want = cmp(base, limit) ? base : coerceSetting(e, limit, mode)
    if (want !== base) leverState.limitedBy[leverKey] = (leverState.limitedBy[leverKey] || []).concat(byKey)
    if (want !== cur) { setParam(pk, want); touched.push(pk) }
    if (cur === leverState.stamped[pk] || want !== cur) leverState.stamped[pk] = want
  }
  guard('driveTrailGap', getParam('R_flee') / 2, 'floor', (v, lim) => v <= lim, 'dogStandoff', 'dogPresence')
  guard('dogVMax', getParam('vMax') * 1.05, 'ceil', (v, lim) => v >= lim, 'dogStandoff', 'sheepNerve')
  return touched
}
// Boot assertions — one line each; a failure is a console.error, never silent.
// The anchor is checked against the SCHEMA default (the shipped default the
// profiles were copied from), not the loaded defaults file: a file exported
// with levers off 0.5 (Q17) legitimately carries non-anchor raw values, and
// those surface as (modified) lever names, not as boot errors.
function assertLevers() {
  const errs = [], owners = {}
  let n = 0, ok = 0
  for (const L of LEVERS) for (const [pk, prof] of Object.entries(L.params)) {
    n++
    const e = SETTING_BY_KEY[pk]
    if (!e) { errs.push(`${L.key}: unknown param ${pk}`); continue }
    if (owners[pk]) errs.push(`${pk} owned by both ${owners[pk]} and ${L.key}`)
    owners[pk] = L.key
    const v = coerceSetting(e, resolveLever(0.5, prof)), cur = e.default
    if (v === cur) ok++; else errs.push(`${L.key}.${pk}: anchor ${v} ≠ shipped (schema) default ${cur}`)
    for (const t of [0, 1]) { const w = resolveLever(t, prof); if (e.min !== undefined && (w < e.min || w > e.max)) errs.push(`${L.key}.${pk}: endpoint ${t} = ${w} outside schema [${e.min}, ${e.max}] (clamped)`) }
  }
  const notLev = new Set(Object.values(LEVER_NOT_LEVERED).flat())
  for (const k of notLev) if (!SETTING_BY_KEY[k]) errs.push(`not-levered list names unknown key ${k}`)
  for (const e of SETTINGS) {
    const isL = !!owners[e.key], isN = notLev.has(e.key) || e.key.startsWith('debug.')
    if (isL && isN) errs.push(`${e.key} is both levered and not-levered`)
    if (!isL && !isN) errs.push(`${e.key} unclaimed — add it to a lever or to LEVER_NOT_LEVERED`)
  }
  const levered = Object.keys(owners).length
  const line = `[levers] anchor ${ok}/${n} exact · ownership ${levered} levered + ${SETTINGS.length - levered} not-levered = ${SETTINGS.length} schema keys`
  if (errs.length) console.error(line + ' · FAILED\n  ' + errs.join('\n  '))
  else console.log(line + ' · OK')
  return errs
}
initLeverState(typeof SHEEP_DEFAULTS !== 'undefined' ? SHEEP_DEFAULTS : null)
assertLevers()

// ============================================================================
// §1 SIM  ◀── PURE, DOM-FREE — ports to Godot FlockSim 1:1.
//   NOTHING here may touch canvas / document / window / lil-gui.
//   Phase 0: vec2 helpers only.
// ============================================================================
const vec2 = {
  add:  (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub:  (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale:(a, s) => ({ x: a.x * s,   y: a.y * s   }),
  len:  (a)    => Math.hypot(a.x, a.y),
  norm: (a) => {
    const l = Math.hypot(a.x, a.y)
    return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }
  },
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
}

function clampLen(v, max) {
  const l = Math.hypot(v.x, v.y)
  if (l > max && l > 1e-9) return { x: (v.x / l) * max, y: (v.y / l) * max }
  return v
}

// Hermite smoothstep; returns 0 at e0 → 1 at e1 (params may be reversed).
function angleDiff(a, b) { // signed smallest difference a−b, wrapped to [−π, π]
  let d = (a - b) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}
function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// POC-v9 (E6/D3): a cone's FULL width in degrees — measured where the cos^k
// falloff crosses HALF strength, the same contour §2's drawEye draws — to
// the equivalent cos^k exponent: k = ln ½ / ln cos(width/2).
function coneKFromDeg(deg) {
  const c = Math.cos(Math.min(178, Math.max(1, deg)) / 2 * Math.PI / 180)
  return Math.log(0.5) / Math.log(Math.max(1e-6, c))
}

// Distance from point p to segment a→b (for path-deviation scoring).
function distToSeg(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  let t = len2 > 1e-9 ? ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby))
}

// Tiny seeded PRNG (mulberry32) — pure & reproducible so P7 reseed replays a run.
function makePRNG(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convex hull (Andrew's monotone chain) — POC-v6 P0: the herd PERIMETER is a
// sim concept now (the dog flanks along it, C8), so the hull lives here and §2
// only draws it. Pure math, DOM-free. — returns vertices in cross>0 order
// (algebraic CCW; collinear points dropped). 0/1/2-point inputs pass through.
function convexHull(pts) {
  if (pts.length < 3) return pts.slice()
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  lower.pop(); upper.pop()
  return lower.concat(upper)
}

// Distance from a point to the hull: 0 inside; else the nearest edge (1 vertex
// → point distance, 2 → segment). Hull order is the cross>0 chain above.
function distToHull(hull, pt) {
  const n = hull.length
  if (n === 0) return Infinity
  if (n === 1) return Math.hypot(pt.x - hull[0].x, pt.y - hull[0].y)
  const segDist = (a, b) => {
    const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((pt.x - a.x) * vx + (pt.y - a.y) * vy) / L2)) : 0
    return Math.hypot(pt.x - (a.x + t * vx), pt.y - (a.y + t * vy))
  }
  if (n === 2) return segDist(hull[0], hull[1])
  let inside = true, best = Infinity
  for (let i = 0; i < n; i++) {
    const a = hull[i], b = hull[(i + 1) % n]
    if ((b.x - a.x) * (pt.y - a.y) - (b.y - a.y) * (pt.x - a.x) < 0) inside = false // cross>0 order → inside is left
    best = Math.min(best, segDist(a, b))
  }
  return inside ? 0 : best
}

// What an obstacle LOOKS like, derived from its own seed — the trees of a stand
// or the boulders of a rock, as discs {x, y, r, tone} inside the obstacle's
// collision circle. Pure data (no DOM), so all three pages draw the same
// stand; the sim itself never reads it.
function obstacleItems(o) {
  if (o.kind === 'hurdle') return [] // a drive-gate panel disc (POC-v14) — pages draw the panels from sim.driveGates
  const rnd = makePRNG(o.seed), items = []
  if (o.kind === 'rocks') {
    items.push({ x: o.x, y: o.y, r: o.r * 0.95, tone: rnd() })
    const extra = Math.floor(rnd() * 3)
    for (let k = 0; k < extra; k++) {
      const a = rnd() * Math.PI * 2, r = o.r * (0.25 + rnd() * 0.2)
      items.push({ x: o.x + Math.cos(a) * (o.r - r), y: o.y + Math.sin(a) * (o.r - r), r, tone: rnd() })
    }
    return items
  }
  const n = Math.max(2, Math.min(9, Math.round((o.r / 14) * (o.r / 14) * 0.9)))
  for (let k = 0; k < n; k++) {
    const r = Math.min(o.r * 0.75, 9 + rnd() * 6)
    let best = null, bestD = -1
    for (let t = 0; t < 8; t++) { // best-of-8: spread the crowns over the stand
      const a = rnd() * Math.PI * 2, d = (o.r - r * 0.8) * Math.sqrt(rnd())
      const c = { x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d }
      const near = items.length ? Math.min(...items.map((q) => Math.hypot(q.x - c.x, q.y - c.y))) : Infinity
      if (near > bestD) { bestD = near; best = c }
    }
    items.push({ x: best.x, y: best.y, r, tone: rnd() })
  }
  return items
}

// The dog's command vocabulary (POC-v6: `easy` replaced `stand`). §3 issues
// these; anything else is treated as a recall. POC-v10: the C11/D4 variants
// are NOT new verbs — they ride setCommand's opts ({easy} on a flank,
// {side} on lie_down) into the dog-state fields flankEasy / lieSide.
const COMMANDS = new Set(['come_by', 'away', 'walk_on', 'easy', 'lie_down', 'that_ll_do'])

// FlockSim — owns all sheep state + integration. Pure: receives `params` as data,
// exposes `sheep`, `ticks`, `step(dt)`. No DOM, no rendering.
class FlockSim {
  constructor(params) {
    this.p = params
    this.ticks = 0
    this.sheep = []
    this.obstacles = []
    this.driveGates = []  // FO1 (POC-v14)
    this.courseRev = 0    // bumps whenever the course furniture is re-laid (pages rebuild on it)
    this.reseed(params.seed)
    // dog: a steering agent. `command` sets target/facing/intensity (P4); facing
    // is derived (eye on the flock's GCM), never manually steered. The home
    // post comes from placeGate (the handler stands by the gate, P6).
    const home = { ...this.home }
    this.gcm = { x: params.canvasW / 2, y: params.canvasH / 2 }
    this.hull = []        // convex hull of the working flock — the herd perimeter (POC-v6 P0)
    this.dog = {
      pos: { ...home }, vel: { x: 0, y: 0 }, facing: 0,
      command: 'that_ll_do', target: { ...home }, intensity: 1,
      owner: { ...home }, flankAngle: 0, flankR: 0, flankT: 0, flankParked: false, flankArmed: false, flankWaypoint: false, parkT: 0, handoff: null,
      driveDist: params.R_drive, stallT: 0, driveT: 0, fwdEMA: 0,
      impulse: null, impulseFactor: 1,
      flankEasy: false, lieSide: 0, // POC-v10 variants: C11 gentle flank / D4 offset down
      avoidSide: 0,                 // which way round the obstacle he is currently skirting (0 = clear)
    }
    this.faceFlock()      // F1: never spawn staring at a fence
    this.crush = 0        // live crush at the gate mouth (density × forward pressure)
    this.trotTurnT = 0    // T5 (POC-v13): seconds left of the turn window after the dog ends / reverses a sweep
    this.trotDogSweep = 0 //   sign of the dog's live flank sweep last tick (0 = not sweeping)
    this.gateCone = { len: 0, ang: 0 } // G5 (POC-v13): extra reach of the gate's draw along `ang` (from the mouth toward the trot leaders)
    this.crushTime = 0    // seconds sustained over threshold
    this.injuries = 0     // down-sheep count (welfare hit; scoring uses it in P6)
  }

  // Fresh count-up scoring state for a new run (called on reseed, via spawn).
  // POC-v14: `points` only ever grows; `tally` splits it into the card's
  // lines; `scoreEvents` is a queue the PAGES drain to draw their pops and
  // banners (the sim never reads it). POC-v15 adds the chain record, strikes,
  // condition statistics, jackpots, end multipliers and the side objectives.
  resetRun() {
    this.run = { t: 0, lineDev: 0, onLine: 0, strag: 0, split: 0, stress: 0, won: false, finished: false, bust: false,
      combo: 1, comboT: 0, comboLive: false, comboBest: 1, breaks: 0, crossings: 0, calmPenned: 0, commands: 0,
      chain: { n: 0, rushed: 0, points: 0 }, chains: 0, longest: 0, frenzyT: 0, frenzyStep: 0, gateMult: 0,
      tiers: { rushed: 0, calm: 0, perfect: 0 },
      strikes: 0, panics: 0, slams: 0, lastStrikeT: -1e9, lieDowns: 0, fullFlanks: 0, trotEver: false,
      value: 0, valueStart: 0, condMean: 1, condMin: 1, draining: false,
      awards: [], awardList: [], jackpots: [], endMults: [], endMult: 1, playPoints: 0, specials: [], reference: 0,
      wave: 0, waveInjuries: 0, waveStrikes: 0, waveRushed: 0, wavePoints: 0, clock: this.p.waveClock }
    this.points = 0
    this.tally = {}
    this.scoreEvents = []
    this.sideObjectives = []
  }

  tallyAdd(kind, points) { if (points) this.tally[kind] = (this.tally[kind] || 0) + points }

  pushEvent(ev) {
    this.scoreEvents.push(ev)
    if (this.scoreEvents.length > 256) this.scoreEvents.shift() // nobody draining (headless) → bounded
  }

  // Add points for something that happened at (x, y) — the one way points
  // enter the total apart from a pen crossing. Also used by lib/assault-sim.js.
  award(kind, points, x, y, label, i) { // i: the sheep that earned it, when one did (the pages flash it)
    points = Math.round(points)
    if (!(points > 0)) return
    this.points += points
    this.tallyAdd(kind, points)
    this.pushEvent({ kind, points, mult: 1, x, y, label: label || '+' + points, i: i === undefined ? -1 : i })
  }

  // An announcement with no points of its own (a strike, a frenzy opening, a
  // cleared drive gate, a side objective changing state) — the pages banner it.
  note(kind, label, x, y, extra) { this.pushEvent(Object.assign({ kind, points: 0, mult: 1, x, y, label }, extra || {})) }

  jackpot(name) { if (!this.run.jackpots.includes(name)) this.run.jackpots.push(name) }

  par() {
    let t = this.p.parBase + this.p.parPerSheep * this.sheep.length
    if (this.compPath) { // CC: plus the required path at half a walk
      const q = this.idealPath
      for (let i = 0; i + 1 < q.length; i++) t += Math.hypot(q[i + 1].x - q[i].x, q[i + 1].y - q[i].y) / Math.max(1, this.p.walkSpeed * 0.5)
    }
    return t
  }
  quietAllowance() { return this.p.quietHandBase + this.p.quietHandPerSheep * this.sheep.length }

  // What a sheep's kind is worth UNCONDITIONALLY (the conditional kinds — lamb,
  // bellwether, yearling — are settled at the crossing). Feeds the flock value
  // and the reference run.
  kindWorth(s) {
    const p = this.p
    return s.kind === 'golden' ? p.goldenMult : s.kind === 'ram' ? p.ramMult : s.kind === 'black' ? p.blackMult : 1
  }

  // SC14: what the sheep still in the pasture could pay, each walked in PERFECT at its present condition.
  flockValue() {
    let v = 0
    for (const s of this.sheep) if (!s.through && !s.down) v += this.p.penPerfectPoints * s.cond * this.kindWorth(s)
    return v
  }

  // SC15: the chain's window — comboWindow at ×1, tightening to comboWindowMin at comboTightenAt.
  comboWindowNow() {
    const p = this.p, at = Math.max(2, p.comboTightenAt)
    const u = Math.max(0, Math.min(1, (this.run.combo - 1) / (at - 1)))
    return p.comboWindow + (p.comboWindowMin - p.comboWindow) * u
  }

  // The chain is over (its window lapsed, a strike, or the run ended). SC21: a
  // chain of perfectFileMin+ crossings with no RUSHED sheep pays its points again.
  endChain(lapse) {
    const run = this.run, p = this.p, c = run.chain
    if (!run.comboLive) return
    run.comboLive = false; run.combo = 1; run.frenzyStep = 0
    if (lapse) run.breaks++
    run.chain = { n: 0, rushed: 0, points: 0 }
    if (c.n >= p.perfectFileMin && c.rushed === 0 && c.points > 0) {
      this.jackpot('file')
      this.award('file', c.points, this.gate.x, this.gate.y, 'PERFECT FILE +' + c.points)
    }
  }

  // SC16: a strike — announced, ends the chain and any frenzy, and the
  // strikeMax-th ends the run (a bust). One incident, one strike: a second
  // inside strikeCooldown of the last is not counted. Returns whether it counted.
  // Also called by lib/assault-sim.js (a mortar kill, owner Q96).
  strike(reason, x, y) {
    const p = this.p, run = this.run
    if (run.finished || run.t - run.lastStrikeT < p.strikeCooldown) return false
    run.lastStrikeT = run.t; run.strikes++
    this.endChain(true); run.frenzyT = 0
    this.setObjective('spotless', 'lost')
    const last = p.strikeMax > 0 && run.strikes >= p.strikeMax
    this.note('strike', last ? 'STRIKE ' + run.strikes + ' — BUST' : 'STRIKE ' + run.strikes, x, y, { reason, n: run.strikes, bust: last })
    if (last) { run.bust = true; this.finishRun() }
    return true
  }

  // SC16 (owner Q96): a sheep has reached the fence at speed.
  fenceSlam(s) {
    const run = this.run
    if (run.finished || run.t - s.slamAt < this.p.panicRearm) return
    s.slamAt = run.t; run.slams++
    this.strike('slam', s.pos.x, s.pos.y)
  }

  // FO11: a side objective changes state once, from 'open'.
  setObjective(id, state) {
    for (const o of this.sideObjectives) if (o.id === id && o.state === 'open') {
      o.state = state
      this.note('objective', (state === 'met' ? '✓ ' : '✗ ') + o.label, this.gate.x, this.gate.y, { id, state })
    }
  }

  // FO11: each course states sideObjectiveCount side objectives, drawn on
  // their own PRNG stream from those the course makes possible. None in waves.
  rollSideObjectives(seed) {
    this.sideObjectives = []
    const p = this.p, count = Math.round(p.sideObjectiveCount)
    if (p.mode === 'waves' || count <= 0 || this.sheep.length < 4) return
    const has = (k) => this.sheep.some((s) => s.kind === k)
    const pool = SIDE_OBJECTIVES.filter((o) => o.needs === 'golden' ? has('golden') : o.needs === 'bell' ? has('bell') : o.needs === 'gate' ? this.driveGates.length > 0 : true)
    const rnd = makePRNG((seed ^ 0x51ed270b) >>> 0)
    for (let i = 0; i < count && pool.length; i++) {
      const o = pool.splice(Math.floor(rnd() * pool.length) % pool.length, 1)[0]
      this.sideObjectives.push({ id: o.id, label: o.label, hint: o.hint, state: 'open' })
    }
  }

  // The course is laid (flock, drive gates, specials): fix what scoring measures the run against.
  startCourseScoring(seed) {
    const run = this.run
    run.reference = this.referenceScore()
    run.value = run.valueStart = this.flockValue()
    this.rollSideObjectives(seed)
  }

  // SC12–SC15, SC23, SC24 + FO4–FO10: a sheep has just crossed into the pen.
  onPenned(s) {
    const p = this.p, run = this.run, g = this.gate
    s.penT = run.t
    if (run.finished) return
    const felt = Math.max(s.stress, s.stressAvg) // how worked up it is: this instant, or lately (penStressMemory)
    const rushed = s.trot || s.panic || felt >= p.penCalmStress
    const tier = rushed ? 'rushed' : felt < p.penPerfectStress ? 'perfect' : 'calm'
    const base = tier === 'rushed' ? p.penPoints : tier === 'perfect' ? p.penPerfectPoints : p.penCalmPoints
    const first = run.crossings === 0
    // SC15: the chain — PERFECT +2, CALM +1, RUSHED holds; no cap
    if (run.comboLive) run.combo += tier === 'perfect' ? 2 : tier === 'calm' ? 1 : 0
    else { run.comboLive = true; run.combo = 1; run.chains++; run.chain = { n: 0, rushed: 0, points: 0 } }
    run.comboT = 0; run.crossings++
    if (run.combo > run.comboBest) run.comboBest = run.combo
    run.tiers[tier]++
    if (!rushed) run.calmPenned++
    // SC23: a live frenzy doubles this crossing and is extended by it; passing a multiple of frenzyEvery opens one
    const frenzy = run.frenzyT > 0
    if (frenzy) run.frenzyT = Math.min(p.frenzyMax, run.frenzyT + p.frenzyExtend)
    const fstep = p.frenzyEvery > 0 ? Math.floor(run.combo / p.frenzyEvery) : 0
    if (fstep > run.frenzyStep) {
      run.frenzyStep = fstep; run.frenzyT = Math.max(run.frenzyT, p.frenzySecs)
      this.jackpot('frenzy'); this.note('frenzy', 'FRENZY — crossings pay double', g.x, g.y)
    }
    let k = 1, tag = ''
    if (s.kind === 'golden') { k = p.goldenMult; tag = 'GOLDEN ' }
    else if (s.kind === 'ram') { k = p.ramMult; tag = 'RAM ' }
    else if (s.kind === 'black') { k = p.blackMult; tag = 'BLACK SHEEP ' }
    else if (s.kind === 'bell') { if (first) { k = p.bellMult; tag = 'BELLWETHER ' } }
    else if (s.kind === 'yearling') { if (!rushed) { k = p.yearlingMult; tag = 'YEARLING ' } }
    else if (s.kind === 'lamb') {
      const m = this.sheep[s.mother]
      if (m && m.through && run.t - m.penT <= p.comboWindow) { k = p.lambMult; tag = 'LAMB ' }
    }
    // SC13: tier × condition (owner Q90), then the kind, the multiplier and a frenzy
    const plain = Math.round(base * s.cond), worth = Math.round(base * s.cond * k)
    const mult = run.combo + run.gateMult, total = worth * mult * (frenzy ? 2 : 1)
    this.tallyAdd('pen', plain); this.tallyAdd('special', worth - plain)
    this.tallyAdd('stream', worth * (mult - 1)); this.tallyAdd('frenzy', total - worth * mult)
    this.points += total
    run.chain.n++; run.chain.points += total
    if (rushed) run.chain.rushed++
    if (run.chain.n > run.longest) run.longest = run.chain.n
    if (s.kind !== 'ewe') run.specials.push(s.kind)
    this.pushEvent({ kind: 'pen', tier, frenzy, points: total, mult, x: g.x, y: g.y, i: this.sheep.indexOf(s), label: tag + '+' + worth + (mult > 1 ? ' ×' + mult : '') + (frenzy ? ' ×2' : '') })
    if (p.mode === 'waves') run.clock = Math.min(p.waveClockMax, run.clock + p.waveSecsPerSheep) // RM5
    let penned = 0, down = 0
    for (const b of this.sheep) { if (b.through) penned++; else if (b.down) down++ }
    const full = penned >= this.sheep.length - down
    // FO11: side objectives that are settled at a crossing
    if (first) this.setObjective('lead_bell', s.kind === 'bell' ? 'met' : 'lost')
    if (s.kind === 'golden') this.setObjective('last_golden', full ? 'met' : 'lost')
    if (rushed) this.setObjective('no_rush', 'lost')
    if (run.chain.n >= Math.ceil(this.sheep.length / 2)) this.setObjective('long_file', 'met')
    // SC24: the crossing that fills the pen
    if (full) {
      const f = tier === 'perfect' ? 1 : tier === 'calm' ? 0.5 : 0
      const pts = Math.round(p.finisherPoints * mult * f)
      if (pts > 0) { this.jackpot('finisher'); this.award('finisher', pts, g.x, g.y, 'LAST SHEEP +' + pts) }
    }
  }

  // Working-flock centroid — drives all dog steering. Excludes penned (through)
  // and down sheep: since P6 the pen is OUTSIDE the field, and a centroid that
  // counted penned sheep dragged the dog to the gate once most were through —
  // he circled the pen instead of fetching the last stragglers (measured).
  computeGCM() {
    let cx = 0, cy = 0, n = 0
    for (const s of this.sheep) {
      if (s.through || s.down) continue
      cx += s.pos.x; cy += s.pos.y; n++
    }
    if (n === 0) return { x: this.p.canvasW / 2, y: this.p.canvasH / 2 }
    return { x: cx / n, y: cy / n }
  }

  // Herd perimeter (POC-v6 P0): convex hull of the SAME working set as the
  // GCM (not penned, not down) — so the GCM is always inside it and a ray
  // from the GCM leaves the offset hull exactly once.
  computeHull() {
    const pts = []
    for (const s of this.sheep) if (!s.through && !s.down) pts.push(s.pos)
    this.hull = convexHull(pts)
  }

  distToHull(pt) { return distToHull(this.hull, pt) }

  // Radius of the offset perimeter (hull ⊕ disc(offset)) along bearing θ
  // from the GCM: the t at which distToHull(GCM + t·û) = offset. Distance to
  // a convex set is nondecreasing along an outward ray from an interior
  // point, so a bisection finds it. Empty flock → the offset itself.
  perimeterRadius(theta, offset) {
    if (this.hull.length === 0) return offset
    const g = this.gcm, ux = Math.cos(theta), uy = Math.sin(theta)
    let far = 0
    for (const v of this.hull) far = Math.max(far, Math.hypot(v.x - g.x, v.y - g.y))
    let lo = 0, hi = far + offset + 1
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (distToHull(this.hull, { x: g.x + ux * mid, y: g.y + uy * mid }) < offset) lo = mid; else hi = mid
    }
    return (lo + hi) / 2
  }

  // The perimeter's NUMBERED POINTS (POC-v8, moved here from §2 so the sim
  // can steer by them): each rounded corner's apex + each straight side's
  // midpoint of the offset hull, in clockwise order (cross>0 hull order is
  // visually clockwise on the y-down canvas), each with its outward normal
  // and kind. §2 draws and numbers exactly this list (1 = nearest the gate),
  // the capture snapshot pastes it, and C10 picks a flank's first corner
  // from it. A lone sheep gets four compass points (all 'corner').
  perimeterMarkers(offset) {
    const hull = this.hull, m = offset, markers = []
    if (hull.length === 0) return markers
    if (hull.length === 1) {
      const c = hull[0]
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 2
        markers.push({ x: c.x + m * Math.cos(a), y: c.y + m * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a), kind: 'compass' })
      }
      return markers
    }
    const n = hull.length
    const normalAngle = (a, b) => Math.atan2(-(b.x - a.x), b.y - a.y) // (dy, -dx) for cross>0 order
    for (let i = 0; i < n; i++) {
      const prev = hull[(i - 1 + n) % n], v = hull[i], next = hull[(i + 1) % n]
      let a0 = normalAngle(prev, v), a1 = normalAngle(v, next)
      if (a1 < a0) a1 += Math.PI * 2            // turn is always a left turn (≤ 180°)
      const am = (a0 + a1) / 2                   // corner apex (mid-arc)
      markers.push({ x: v.x + m * Math.cos(am), y: v.y + m * Math.sin(am), nx: Math.cos(am), ny: Math.sin(am), kind: 'corner' })
      const nx = Math.cos(a1), ny = Math.sin(a1) // side midpoint, pushed out along the edge normal
      markers.push({ x: (v.x + next.x) / 2 + m * nx, y: (v.y + next.y) / 2 + m * ny, nx, ny, kind: 'side' })
    }
    return markers
  }

  // C10 (POC-v8, owner 2026-08-23): the bearing (from the GCM) of the FIRST
  // CORNER of the perimeter the dog would meet going round in the flank
  // direction from his own bearing — the smallest positive progress
  // (sign × angle) from `from` over the corner apexes. Side midpoints are
  // not corners. null when the perimeter has no corners (no flock).
  firstCornerBearing(sign, from, offset) {
    const g = this.gcm
    let best = null, bestRel = Infinity
    for (const mk of this.perimeterMarkers(offset)) {
      if (mk.kind === 'side') continue
      const b = Math.atan2(mk.y - g.y, mk.x - g.x)
      const rel = sign * angleDiff(b, from)
      if (rel > 1e-3 && rel < bestRel) { bestRel = rel; best = b }
    }
    return best
  }

  // THE GATE LINE (owner 2026-08-22, amends C8): the line from the GATE
  // tangent to the herd perimeter (hull ⊕ disc(offset)) on the flank's EXIT
  // side — the last point of the sweep from which the WHOLE flock still
  // lies between the dog and the gate. Past it he would be on the gate side,
  // pushing sheep away from the mouth. CW (come-by, sign +1) exits at the
  // clockwise-most silhouette point as seen from the gate; CCW (away) at the
  // counter-clockwise-most. Returns the bearing of that point from the GCM.
  // (Was: the goal→GCM line extended — which on a wide flock ended the flank
  // at the bottom of the herd instead of round at its far edge.)
  // Exact on the rounded hull: the silhouette of a convex rounded polygon
  // from an outside point is always a corner disc, so it is the extreme over
  // vertex discs of (direction to the vertex ± the disc's half-angle).
  // Degenerate (gate inside the offset hull / no flock) → the old line.
  gateLineBearing(sign, offset) {
    const g = this.gcm, p = this.p
    const goal = this.aim(), G = goal === p.goal ? this.gate : goal // CC6: the line is drawn from the current objective
    const fallback = Math.atan2(g.y - goal.y, g.x - goal.x)
    if (this.hull.length === 0) return fallback
    const ref = Math.atan2(g.y - G.y, g.x - G.x)
    let bestRel = -Infinity, best = null
    for (const v of this.hull) {
      const dx = v.x - G.x, dy = v.y - G.y, D = Math.hypot(dx, dy)
      if (D <= offset) return fallback
      const phi = Math.atan2(dy, dx), alpha = Math.asin(offset / D)
      const ang = phi + sign * alpha
      const rel = sign * angleDiff(ang, ref)
      if (rel > bestRel) {
        bestRel = rel
        const L = Math.sqrt(D * D - offset * offset)
        best = { x: G.x + L * Math.cos(ang), y: G.y + L * Math.sin(ang) }
      }
    }
    return Math.atan2(best.y - g.y, best.x - g.x)
  }

  // F1 (POC-v4): at spawn and on every reseed the dog watches the flock from
  // the very first frame — facing is derived here too, never left at a
  // hardcoded angle.
  faceFlock() {
    const g0 = this.computeGCM()
    this.dog.facing = Math.atan2(g0.y - this.dog.pos.y, g0.x - this.dog.pos.x)
  }

  // Strömbom f(N): the flock is cohesive (→ drive) when every sheep is within
  // r_sep·N^(2/3) of the GCM; otherwise collect the outliers first.
  isCohesive() {
    const p = this.p
    const active = this.sheep.filter((s) => !s.down && !s.through)
    if (!active.length) return true
    const fN = p.r_sep * Math.pow(active.length, 2 / 3)
    for (const s of active) if (vec2.dist(s.pos, this.gcm) > fN) return false
    return true
  }

  // Player input calls this (via §3) — sets only the command + per-command entry
  // state, so §1 owns the whole player→command→target→steering chain.
  setCommand(cmd, opts = {}) {
    const d = this.dog, g = this.gcm, p = this.p
    if (!COMMANDS.has(cmd)) cmd = 'that_ll_do'  // unknown verb (e.g. the retired 'stand') → recall, never a phantom state
    // E3: walk-on while EASY = a pressure IMPULSE, not a command change —
    // the dog fires a brief envelope and stays in easy (POC-v6 I4; was
    // stand). Flavor named by the caller (§3 modifiers): shove / bark / lean.
    if (cmd === 'walk_on' && d.command === 'easy') {
      const f = opts.impulse || 'shove'
      const K = { shove: ['shoveMult', 'shoveDur', 'shoveDecay'],
                  bark: ['barkMult', 'barkDur', 'barkDecay'],
                  lean: ['leanMult', 'leanDur', 'leanDecay'] }[f] || []
      d.impulse = { name: f, mult: p[K[0]], dur: p[K[1]], decay: p[K[2]], t: 0 }
      this.countCommand(cmd) // SC19 Quiet Hand: an impulse is a command too
      return
    }
    const was = d.command + '|' + d.flankEasy + '|' + d.lieSide
    d.impulse = null
    // POC-v10 (owner 2026-08-24): the C11/D4 variants ride the entry opts —
    // never new verbs. Every other command clears them.
    d.flankEasy = (cmd === 'come_by' || cmd === 'away') && !!opts.easy
    d.lieSide = cmd === 'lie_down' ? Math.sign(opts.side || 0) : 0
    if (cmd === 'come_by' || cmd === 'away') {    // start the flank from current bearing
      const sign = cmd === 'come_by' ? 1 : -1
      d.flankAngle = Math.atan2(d.pos.y - g.y, d.pos.x - g.x)
      d.flankR = Math.hypot(d.pos.x - g.x, d.pos.y - g.y) // seed ring at the dog's radius
      d.flankT = 0; d.flankParked = false; d.flankArmed = false; d.parkT = 0; d.handoff = null // fresh flank → fresh C8 gate-line watch
      // C10 (POC-v8, owner 2026-08-23): a dog NOT close to the herd perimeter
      // — further than flankCornerFrom outside the dotted line; 0 since Q46,
      // i.e. ANY dog outside the line — does not cut
      // in to the nearest bit of it; his first waypoint is the FIRST CORNER
      // of the outline he would meet in the flank direction, and the point
      // holds there until he arrives (stepDog), then the sweep begins. A dog
      // already on or near the line (or inside it) picks the line up where
      // he stands, as before.
      d.flankWaypoint = false
      if (this.hull.length && this.distToHull(d.pos) > p.perimeterMargin + p.flankCornerFrom) {
        const corner = this.firstCornerBearing(sign, d.flankAngle, p.perimeterMargin)
        if (corner !== null) {
          d.flankAngle = corner; d.flankWaypoint = true
          // aim at the corner NOW: stepDog tests "on the point" against
          // d.target before it recomputes it, and the stale heel target
          // would read as arrived and release the hold on the first tick
          const rr = this.perimeterRadius(corner, p.perimeterMargin)
          d.target = { x: g.x + rr * Math.cos(corner), y: g.y + rr * Math.sin(corner) }
        }
      }
    }
    // Reset the walk-on standoff only on a *reposition* command — so it stays
    // crept-in through a lie-down ↔ walk-on rhythm (otherwise each walk-on
    // re-entry kicks the dog back out to arm's length and kills the drive).
    if (cmd === 'come_by' || cmd === 'away' || cmd === 'that_ll_do')
      d.driveDist = this.p.R_drive
    d.stallT = 0; d.driveT = 0 // fresh command → fresh stall watch + spool-up (E2)
    d.fwdEMA = this.p.stallSpeed * 3 // seeded optimistic so spool-up can't false-trip
    d.command = cmd
    if (was !== cmd + '|' + d.flankEasy + '|' + d.lieSide) { // SC19 Quiet Hand — repeats of the live command are free
      this.countCommand(cmd)
      if (cmd === 'lie_down') { this.run.lieDowns++; this.setObjective('on_feet', 'lost') }                 // Never Sat
      if ((cmd === 'come_by' || cmd === 'away') && !d.flankEasy) this.run.fullFlanks++                       // Steady Away
    }
  }

  countCommand() {
    const run = this.run
    run.commands++
    if (run.commands > this.quietAllowance()) this.setObjective('few_words', 'lost')
  }

  // Capture ⎘ (owner 2026-08-22; shared by all three pages since 2026-11-18): a
  // JSON-able snapshot of the live game state — gate, numbered perimeter
  // markers (1 = nearest the gate, then clockwise), dog, sheep. Dog angles are
  // degrees, bird's-eye, 0 = +x (east), positive = clockwise on the y-down
  // field. Everything is rounded to whole px / degrees to keep the paste short.
  captureState() {
    const sim = this, d = sim.dog, g = sim.gcm, gt = sim.gate, p = sim.p
    const r1 = (v) => Math.round(v), deg = (a) => r1(((a * 180 / Math.PI) % 360 + 360) % 360)
    const pt = (o) => ({ x: r1(o.x), y: r1(o.y) })
    const bearing = (o) => deg(Math.atan2(o.y - g.y, o.x - g.x))
    const raw = sim.perimeterMarkers(p.perimeterMargin)
    let start = 0, sd = Infinity // marker #1 = the one nearest the gate (as numbered on the 2D canvas)
    raw.forEach((mk, k) => { const dd = (mk.x - gt.x) ** 2 + (mk.y - gt.y) ** 2; if (dd < sd) { sd = dd; start = k } })
    const markers = raw.map((_, k) => {
      const mk = raw[(start + k) % raw.length]
      return { n: k + 1, kind: mk.kind, x: r1(mk.x), y: r1(mk.y), bearing: bearing(mk) }
    })
    const nearestMarker = (o) => {
      if (!markers.length) return null
      let best = null, bd = Infinity
      for (const mk of markers) { const dd = Math.hypot(mk.x - o.x, mk.y - o.y); if (dd < bd) { bd = dd; best = mk } }
      return { n: best.n, dist: r1(bd) }
    }
    const playRect = sim.playRect()
    const act = sim.sheep.filter((s) => !s.down && !s.through)
    const flanking = d.command === 'come_by' || d.command === 'away'
    const lineCW = sim.gateLineBearing(1, p.perimeterMargin), lineCCW = sim.gateLineBearing(-1, p.perimeterMargin)
    const linePt = (a) => { const r = sim.perimeterRadius(a, p.perimeterMargin); return { x: g.x + r * Math.cos(a), y: g.y + r * Math.sin(a) } }
    const lineInfo = (a) => ({ bearing: deg(a), ...pt(linePt(a)), nearestMarker: nearestMarker(linePt(a)) })
    const station = deg((flanking && d.command === 'away' ? lineCCW : lineCW) + (flanking && d.command === 'away' ? -1 : 1) * p.flankOvershootDeg * Math.PI / 180)
    const out = {
      capturedAt: new Date().toISOString(),
      course: { seed: p.seed, layout: sim.layout, sheepCount: sim.sheep.length, active: act.length, penned: sim.sheep.length - act.length - sim.sheep.filter((s) => s.down).length, down: sim.sheep.filter((s) => s.down).length },
      field: { play: { x0: r1(playRect.x0), y0: r1(playRect.y0), x1: r1(playRect.x1), y1: r1(playRect.y1) }, canvas: { w: p.canvasW, h: p.canvasH } },
      gate: { ...pt(gt), side: ['N', 'E', 'S', 'W'][gt.side], out: { x: gt.nx, y: gt.ny }, width: p.gateWidth, goal: pt(p.goal), bearingFromGCM: bearing(gt), nearestMarker: nearestMarker(gt) },
      // where a flank ENDS: the gate's tangent to the perimeter on each side (come-by parks at CW, away at CCW)
      gateLine: { comeBy: lineInfo(lineCW), away: lineInfo(lineCCW) },
      flock: { gcm: pt(g), cohesive: sim.isCohesive(), hull: sim.hull.map(pt), perimeterMargin: p.perimeterMargin },
      markers,
      dog: {
        command: d.command, pos: pt(d.pos), vel: pt(d.vel), speed: r1(Math.hypot(d.vel.x, d.vel.y)),
        facingDeg: deg(d.facing), bearingFromGCM: bearing(d.pos), distFromGCM: r1(Math.hypot(d.pos.x - g.x, d.pos.y - g.y)),
        target: pt(d.target), targetBearing: bearing(d.target), targetNearestMarker: nearestMarker(d.target),
        nearestMarker: nearestMarker(d.pos), distOutsideHull: sim.hull.length ? r1(sim.distToHull(d.pos)) : null, // = perimeterMargin when he is ON the dotted line
        intensity: +d.intensity.toFixed(2),
        impulse: d.impulse ? d.impulse.name : null,
        ...(d.flankEasy ? { flankEasy: true } : {}), ...(d.lieSide ? { lieSide: d.lieSide } : {}), // POC-v10 variants
        flank: flanking ? {
          dir: d.command === 'come_by' ? 'CW' : 'CCW', angleDeg: deg(d.flankAngle), radius: r1(d.flankR),
          stationDeg: station, parked: d.flankParked, t: +d.flankT.toFixed(2), parkT: +d.parkT.toFixed(2),
          cornerFirst: d.flankWaypoint, // C10: still running to the first corner (the point holds there)
        } : null,
        drive: (d.command === 'walk_on' || d.command === 'easy') ? { driveDist: r1(d.driveDist), driveT: +d.driveT.toFixed(2), stallT: +d.stallT.toFixed(2) } : null,
        handoff: d.handoff ? pt(d.handoff) : null,
        owner: pt(d.owner),
      },
      sheep: sim.sheep.map((s, i) => ({ i, ...pt(s.pos), g: s.group, state: s.through ? 'penned' : s.down ? 'down' : s.idle ? 'idle' : 'alert', ...(s.gatePull > 0 ? { gatePull: +s.gatePull.toFixed(2), lead: s.gateLead } : {}), ...(s.trot ? { trot: 1, trotLead: s.trotLead } : {}), ...(s.kind && s.kind !== 'ewe' ? { kind: s.kind } : {}), ...(s.stand ? { stand: 1, standFace: +s.standFace.toFixed(2) } : {}), ...(s.yieldT > 0 ? { yieldT: +s.yieldT.toFixed(2) } : {}), ...(s.stress > 0 ? { stress: +s.stress.toFixed(2) } : {}) })),
      run: { t: +sim.run.t.toFixed(1), crush: +sim.crush.toFixed(1), injuries: sim.injuries },
    }
    return out
  }

  playRect() {
    const p = this.p
    return {
      x0: p.fenceInset, y0: p.fenceInset,
      x1: p.canvasW - p.fenceInset, y1: p.canvasH - p.fenceInset,
    }
  }

  // standard-normal via Box–Muller off the seeded stream
  gauss(mean, sd) {
    const u = 1 - this.rng(), v = this.rng()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  // (re)seed the PRNG, place the course, and respawn the whole herd —
  // deterministic given seed (same seed → same gate, same spawn side).
  reseed(seed) {
    this.seed = seed >>> 0
    this.rng = makePRNG(this.seed)
    this.placeGate()
    this.aimPt = null                 // CC6: where the dog is working toward (competition; see aim())
    this.compPath = null              // CC2: the competition course's required path (null on a pasture course)
    if (this.isCompetition()) { this.obstacles = []; this.obstacleGroups = 0; this.planCompetition(this.seed) } // CC1: a clean field
    else this.placeObstacles(this.seed)
    this.spawn(this.p.mode === 'waves' ? this.p.waveSheepStart : undefined) // RM5: wave mode starts small
    // POC-v14: drive gates and special sheep come AFTER the flock and draw from
    // their own streams, so a seed's gate, obstacles and flock are exactly
    // what they were before either existed.
    this.placeDriveGates(this.seed)
    this.assignSpecials(this.seed)
    this.startCourseScoring(this.seed) // POC-v15: reference run, flock value, side objectives
    this.courseRev++
    if (this.dog) {
      this.dog.avoidSide = 0
      this.faceFlock()             // F1 — after spawn(): the NEW herd's GCM
      this.setCommand('that_ll_do') // a new course starts at heel — a bare reseed() used to
    }                               // inherit the previous drive (bit the v5 P6 harness)
    this.run.commands = 0           // …and that recall is not the player's
    this.blackPanic = null          // FO8: where a panicking black sheep stands (last tick), or null
  }

  // FO1–FO3 (POC-v14): optional DRIVE GATES — a pair of short hurdle panels
  // with a gap between them, standing in open pasture. Each possible gate is
  // present with driveGateChance; a present one is rejection-sampled clear of
  // the fence, the pen gate's approach, the handler's post, every obstacle,
  // every sheep's starting spot and the other gates. The panels join the
  // solid set as rows of small `hurdle` discs, so pushOut / obstacleForce /
  // dogDetour handle them with no new steering code (they give no cover —
  // coverBetween skips them). Own PRNG stream; none in wave mode (owner Q85).
  placeDriveGates(seed) {
    const p = this.p, r = this.playRect(), gt = this.gate
    this.driveGates = []
    if (this.compPath) return this.buildCompetitionGates()
    // owner 2026-11-18: a course has obstacles OR drive gates, never both
    const max = p.mode === 'waves' || this.obstacles.length ? 0 : Math.max(0, Math.round(p.driveGateMax))
    if (!max) return
    const rnd = makePRNG((seed ^ 0x51ed270b) >>> 0)
    const half = p.driveGateWidth / 2, span = half + p.driveGatePanel
    const inset = span + p.r_obstacle + p.L
    const w = r.x1 - r.x0 - 2 * inset, h = r.y1 - r.y0 - 2 * inset
    if (w <= 0 || h <= 0) return
    const gateClear = Math.max(p.spawnGateClear, p.gateAttractR, 100) + span
    for (let k = 0; k < max; k++) {
      if (rnd() >= p.driveGateChance) continue
      for (let tries = 0; tries < 60; tries++) {
        const x = r.x0 + inset + rnd() * w, y = r.y0 + inset + rnd() * h, ang = rnd() * Math.PI
        const tx = Math.cos(ang), ty = Math.sin(ang)
        const e0 = { x: x - tx * span, y: y - ty * span }, e1 = { x: x + tx * span, y: y + ty * span }
        const a0 = { x: x - tx * half, y: y - ty * half }, a1 = { x: x + tx * half, y: y + ty * half }
        if (Math.hypot(x - gt.x, y - gt.y) < gateClear) continue
        if (Math.hypot(x - this.home.x, y - this.home.y) < 50 + span) continue
        if (this.obstacles.some((o) => distToSeg(o, e0, e1) < o.r + p.r_obstacle + p.L)) continue
        if (this.driveGates.some((d) => Math.hypot(d.x - x, d.y - y) < 2 * span + p.clusterMinGap / 2)) continue
        if (this.sheep.some((s) => distToSeg(s.pos, e0, a0) < p.L * 1.5 || distToSeg(s.pos, a1, e1) < p.L * 1.5)) continue
        this.driveGates.push({ x, y, angle: ang, tx, ty, nx: -ty, ny: tx, half, e0, a0, a1, e1, done: false, passed: new Set(), sides: new Map() })
        break
      }
    }
    this.addHurdles()
  }

  // The panels join the solid set as rows of small `hurdle` discs (FO3).
  addHurdles() {
    const p = this.p
    const hr = p.L / 3 // panel disc radius — a hurdle is about a third of a sheep thick
    this.driveGates.forEach((d, gi) => {
      for (const [from, to] of [[d.a0, d.e0], [d.a1, d.e1]]) {
        const n = Math.max(2, Math.ceil(p.driveGatePanel / (2 * hr)) + 1)
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1)
          this.obstacles.push({ x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u, r: hr, kind: 'hurdle', group: -1 - gi, seed: 0 })
        }
      }
    })
  }

  // ---- Competition course (CC1–CC6, owner 2026-11-18) ------------------------
  // CC1: a clean field (no obstacles, no special sheep) carrying only drive gates.
  // CC2: 4–6 of them on a REQUIRED PATH: start → gate 1 → … → gate N → the pen.
  // CC3: the gates are taken IN ORDER and in the path's direction — only the
  //      current gate counts a crossing, and it is cleared when every sheep still
  //      being worked has been through it.
  // CC4: the pen is SHUT until the last gate is cleared (the mouth is fence).
  // CC5: the flock starts as one small group at the head of the path.
  // CC6: the dog works toward the CURRENT objective — the next gate, then the
  //      pen — so walk-on / easy drive at it and a flank ends on its line.
  isCompetition() { return this.p.course === 'competition' && this.p.mode !== 'waves' }

  // The gate the flock must take next (null: none left, or not a competition course).
  nextGate() {
    if (!this.compPath) return null
    for (const d of this.driveGates) if (!d.done) return d
    return null
  }

  penOpen() { return !this.compPath || !this.nextGate() }

  // CC6: the point the dog is working the flock toward. On a pasture course —
  // and once the gates are done — the pen centre, exactly as before. For a gate
  // it is one of two points (updateAim, once a tick):
  //   · THROUGH: the gate's centre, sliding out along the way through as the
  //     flock centre arrives, so the drive line never flips while the tail is
  //     still coming through;
  //   · the APPROACH: a spot square in front of the gate — while the flock
  //     stands wide of the gate's line of approach, or after a MISS (the sheep
  //     that still owe the gate are past its line, wide of the gap), so they
  //     are brought round to the front of it instead of pushed at a panel.
  aim() {
    if (!this.compPath) return this.p.goal
    if (!this.aimPt) this.updateAim()
    return this.aimPt
  }

  updateAim() {
    const d = this.nextGate()
    if (!d) { this.aimPt = this.p.goal; return }
    const g = this.computeGCM()
    let ux = 0, uy = 0, un = 0
    for (const s of this.sheep) if (!s.through && !s.down && !d.passed.has(s)) { ux += s.pos.x; uy += s.pos.y; un++ }
    let missed = false
    if (un) {
      ux = ux / un - d.x; uy = uy / un - d.y
      missed = ux * d.nx + uy * d.ny > (d.approach ? -20 : 10) && Math.abs(ux * d.tx + uy * d.ty) > d.half
    }
    const rx = d.x - g.x, ry = d.y - g.y, rd = Math.hypot(rx, ry)
    const a = -(rx * d.nx + ry * d.ny)                               // flock centre's progress through the gate (− = still short of it)
    const cos = rd > 1e-6 ? (rx * d.nx + ry * d.ny) / rd : 1         // 1 = dead in front of the gate, on its line
    const wide = a < -30 && cos < (d.approach ? 0.8 : 0.55)
    d.approach = missed || wide
    if (d.approach) { this.aimPt = { x: d.x - d.nx * 120, y: d.y - d.ny * 120 }; return }
    const k = Math.max(a + 120, 20)
    this.aimPt = { x: d.x + d.nx * k, y: d.y + d.ny * k }
  }

  // CC2: lay the required path. Own PRNG stream, so the pen gate and the
  // handler's post of a seed are what they are on the pasture course. Whole
  // paths are rejection-sampled (legs long enough, no hairpins, clear of the
  // fence, the pen's approach and each other); if none fits, the gate count
  // drops by one and it tries again.
  planCompetition(seed) {
    const p = this.p, r = this.playRect(), gt = this.gate
    const rnd = makePRNG((seed ^ 0x7c3a91d5) >>> 0)
    const lo = Math.max(1, Math.round(Math.min(p.compGatesMin, p.compGatesMax))), hi = Math.max(lo, Math.round(Math.max(p.compGatesMin, p.compGatesMax)))
    let count = lo + Math.floor(rnd() * (hi - lo + 1))
    const half = p.driveGateWidth / 2, span = half + p.driveGatePanel
    const inset = span + p.L * 2
    const w = r.x1 - r.x0 - 2 * inset, h = r.y1 - r.y0 - 2 * inset
    const mouth = { x: gt.x, y: gt.y }
    const penClear = Math.max(p.spawnGateClear, p.gateAttractR, 100) + span
    const maxTurn = p.compTurnMax * Math.PI / 180
    const turn = (a, b, c) => Math.abs(angleDiff(Math.atan2(c.y - b.y, c.x - b.x), Math.atan2(b.y - a.y, b.x - a.x)))
    const segHit = (a, b, c, d) => { // do segments ab and cd cross?
      const o = (u, v, t) => Math.sign((v.x - u.x) * (t.y - u.y) - (v.y - u.y) * (t.x - u.x))
      return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b)
    }
    const tryPath = (n, legMin) => {
      const pts = [] // [start, gate 1 … gate n]
      for (let i = 0; i <= n; i++) {
        let got = null
        for (let t = 0; t < 40 && !got; t++) {
          const c = { x: r.x0 + inset + rnd() * w, y: r.y0 + inset + rnd() * h }
          if (Math.hypot(c.x - mouth.x, c.y - mouth.y) < penClear) continue
          if (Math.hypot(c.x - this.home.x, c.y - this.home.y) < 60 + span) continue
          if (i === 0 && Math.hypot(c.x - mouth.x, c.y - mouth.y) < Math.min(w, h)) continue // the flock starts well away from the pen
          if (pts.some((q) => Math.hypot(q.x - c.x, q.y - c.y) < legMin)) continue
          if (i >= 2 && turn(pts[i - 2], pts[i - 1], c) > maxTurn) continue
          let cross = false
          for (let k = 0; k + 2 < i && !cross; k++) cross = segHit(pts[k], pts[k + 1], pts[i - 1], c)
          // the new leg must not run through an earlier gate's panels, nor an earlier leg through this one's
          for (let k = 1; k < i - 1 && !cross; k++) cross = distToSeg(pts[k], pts[i - 1], c) < span + 30
          for (let k = 0; k + 2 < i && !cross; k++) cross = distToSeg(c, pts[k], pts[k + 1]) < span + 30
          if (cross) continue
          got = c
        }
        if (!got) return null
        pts.push(got)
      }
      // the last leg, into the pen: long enough, no hairpin, clear of the other gates and legs
      const last = pts[n]
      if (Math.hypot(last.x - mouth.x, last.y - mouth.y) < legMin) return null
      if (n >= 1 && turn(pts[n - 1], last, mouth) > maxTurn) return null
      for (let k = 1; k < n; k++) if (distToSeg(pts[k], last, mouth) < span + 30) return null
      for (let k = 0; k + 1 < n; k++) if (segHit(pts[k], pts[k + 1], last, mouth)) return null
      return pts
    }
    let pts = null, legMin = p.compLegMin
    for (let round = 0; round < 12 && !pts; round++) {
      for (let t = 0; t < 600 && !pts; t++) pts = tryPath(count, legMin)
      if (!pts) { if (count > lo) count--; else legMin *= 0.9 }
    }
    if (!pts) { // never seen in practice — a straight run across the field to the pen
      pts = []
      const far = { x: r.x0 + r.x1 - gt.x, y: r.y0 + r.y1 - gt.y } // the mouth, mirrored through the field centre
      const cx = Math.max(r.x0 + inset, Math.min(r.x1 - inset, far.x)), cy = Math.max(r.y0 + inset, Math.min(r.y1 - inset, far.y))
      for (let i = 0; i <= count; i++) { const u = i / (count + 1); pts.push({ x: cx + (mouth.x - cx) * u, y: cy + (mouth.y - cy) * u }) }
    }
    this.compPath = { start: pts[0], gates: pts.slice(1) }
  }

  // CC2 / CC3: stand the gates on the planned path — each one square to the leg
  // that arrives at it, numbered in order.
  buildCompetitionGates() {
    const p = this.p, gt = this.gate, cp = this.compPath
    const half = p.driveGateWidth / 2, span = half + p.driveGatePanel
    const pts = [cp.start].concat(cp.gates, [{ x: gt.x, y: gt.y }])
    for (let i = 1; i < pts.length - 1; i++) {
      const nrm = vec2.norm(vec2.sub(pts[i], pts[i - 1])) // square to the leg IN: the flock walks straight through, then turns
      const x = pts[i].x, y = pts[i].y, tx = -nrm.y, ty = nrm.x
      this.driveGates.push({ x, y, angle: Math.atan2(ty, tx), tx, ty, nx: nrm.x, ny: nrm.y, half, order: i,
        e0: { x: x - tx * span, y: y - ty * span }, a0: { x: x - tx * half, y: y - ty * half }, a1: { x: x + tx * half, y: y + ty * half }, e1: { x: x + tx * span, y: y + ty * span },
        done: false, approach: false, passed: new Set(), sides: new Map() })
    }
    this.idealPath = pts.concat([{ x: p.goal.x, y: p.goal.y }]) // the scoring line IS the required path
    this.addHurdles()
  }

  // FO2: a sheep that crosses the gap segment (either way, owner Q82) scores
  // once per gate; when every sheep still being worked has been through the
  // same gate it is cleared: the multiplier rises for the rest of the run (FO7).
  updateDriveGates() {
    const p = this.p
    const cur = this.compPath ? this.nextGate() : null
    for (const dg of this.driveGates) {
      if (dg.done) continue
      const live = !this.compPath || dg === cur // CC3: only the current gate counts on a competition course
      let scored = false
      for (const s of this.sheep) {
        if (s.through || s.down) continue
        const rx = s.pos.x - dg.x, ry = s.pos.y - dg.y
        const side = rx * dg.nx + ry * dg.ny, along = rx * dg.tx + ry * dg.ty
        const prev = dg.sides.get(s)
        dg.sides.set(s, side)
        if (prev === undefined || dg.passed.has(s)) continue
        if (!live) continue
        if ((this.compPath ? prev < 0 && side >= 0 : (prev < 0) !== (side < 0)) && Math.abs(along) < dg.half) { // CC3: one way only
          dg.passed.add(s); scored = true
          this.award('gate', p.driveGatePoints, s.pos.x, s.pos.y, undefined, this.sheep.indexOf(s))
        }
      }
      if (!scored) continue
      let all = true, working = 0
      for (const s of this.sheep) if (!s.through && !s.down) { working++; if (!dg.passed.has(s)) { all = false; break } }
      if (all && working > 0) { // FO7 (POC-v15): a cleared gate feeds the multiplier for the rest of the run
        dg.done = true; this.run.gateMult += p.driveGateMult
        const left = this.driveGates.filter((g) => !g.done).length
        this.note('gate', this.compPath ? `GATE ${dg.order} of ${this.driveGates.length} — ` + (left ? 'multiplier +' + p.driveGateMult : 'the pen is open') : 'DRIVE GATE — multiplier +' + p.driveGateMult, dg.x, dg.y, { cleared: true })
        if (this.driveGates.every((g) => g.done)) this.setObjective('gates', 'met')
      }
    }
  }

  // FO4–FO6 (POC-v14): special sheep. Each kind rolls independently (owner
  // Q83), at most one of each, on its own PRNG stream — three fixed draws for
  // the rolls, then the picks. The lamb is stood beside its mother and joins
  // her group. With `specials` off every sheep is a plain 'ewe'.
  assignSpecials(seed) {
    const p = this.p, n = this.sheep.length
    for (const s of this.sheep) { s.kind = 'ewe'; s.mother = -1 }
    this.bellIdx = -1
    if (!p.specials || n < 4 || this.compPath) return // CC1: a competition flock is plain ewes
    const rnd = makePRNG((seed ^ 0x2545f491) >>> 0)
    const golden = rnd() < p.goldenChance, ram = rnd() < p.ramChance, lamb = rnd() < p.lambChance
    const taken = new Set()
    const pick = () => {
      for (let t = 0; t < 40; t++) { const i = Math.floor(rnd() * n) % n; if (!taken.has(i)) { taken.add(i); return i } }
      return -1
    }
    if (golden) { const i = pick(); if (i >= 0) this.sheep[i].kind = 'golden' }
    if (ram) { const i = pick(); if (i >= 0) this.sheep[i].kind = 'ram' }
    if (lamb) {
      const m = pick(), l = pick()
      if (m >= 0 && l >= 0) {
        const mum = this.sheep[m], s = this.sheep[l], r = this.playRect(), a = rnd() * Math.PI * 2
        s.kind = 'lamb'; s.mother = m; s.group = mum.group; s.wanderer = false; mum.wanderer = false
        s.pos = { x: Math.max(r.x0, Math.min(r.x1, mum.pos.x + Math.cos(a) * p.L)), y: Math.max(r.y0, Math.min(r.y1, mum.pos.y + Math.sin(a) * p.L)) }
        this.pushOut(s.pos, 3)
      }
    }
    // FO8–FO10 (POC-v15): black sheep, bellwether, skittish yearling — drawn
    // strictly AFTER every v14 draw, so a seed keeps its golden ewe, ram and lamb.
    const black = rnd() < p.blackChance, bell = rnd() < p.bellChance, yearling = rnd() < p.yearlingChance
    if (black) { const i = pick(); if (i >= 0) this.sheep[i].kind = 'black' }
    if (bell) { const i = pick(); if (i >= 0) { this.sheep[i].kind = 'bell'; this.bellIdx = i } }
    if (yearling) { const i = pick(); if (i >= 0) this.sheep[i].kind = 'yearling' }
  }

  // RM5 (POC-v14): the pen has filled in wave mode — empty it, keep the score,
  // the gate and the fence, and lay a new, larger flock (and fresh obstacles
  // and specials, owner Q85 / Q89) from a stream derived from seed + wave, so
  // a seed's wave run is repeatable. The dog carries on where he stands.
  nextWave() {
    const p = this.p, run = this.run
    run.wave++
    const ws = (this.seed ^ Math.imul(run.wave, 0x85ebca6b)) >>> 0
    this.rng = makePRNG(ws)
    this.placeObstacles(ws)
    this.driveGates = []
    const n = Math.min(Math.max(p.waveSheepStart, p.waveSheepMax), p.waveSheepStart + p.waveGrowth * run.wave)
    this.spawn(n, true)
    this.assignSpecials(ws)
    run.waveInjuries = this.injuries; run.waveStrikes = run.strikes; run.waveRushed = run.tiers.rushed; run.wavePoints = this.points
    this.blackPanic = null
    this.dog.avoidSide = 0
    this.courseRev++
  }

  // P6 (F1): the gate lives on the PERIMETER at a seeded random spot. Sides:
  // 0 N, 1 E, 2 S, 3 W; (nx,ny) points OUT of the field, (tx,ty) runs along
  // the wall. The drive goal (pen center outside the mouth), the spawn side,
  // and the owner's post (handler stands by the gate, spawn-opposite side)
  // all derive from it — nothing else may assume a fixed course.
  placeGate() {
    const p = this.p, r = this.playRect()
    const side = Math.floor(this.rng() * 4) % 4
    const horiz = side === 0 || side === 2
    const len = horiz ? r.x1 - r.x0 : r.y1 - r.y0
    const m = Math.min(p.gateCornerMargin, (len - p.gateWidth) / 2)
    const t = m + this.rng() * (len - 2 * m)
    const g = side === 0 ? { x: r.x0 + t, y: r.y0, nx: 0, ny: -1 }
            : side === 1 ? { x: r.x1, y: r.y0 + t, nx: 1, ny: 0 }
            : side === 2 ? { x: r.x0 + t, y: r.y1, nx: 0, ny: 1 }
            :              { x: r.x0, y: r.y0 + t, nx: -1, ny: 0 }
    g.side = side
    g.tx = -g.ny; g.ty = g.nx
    this.gate = g
    const penOut = Math.min(28, Math.max(10, p.fenceInset * 0.5))
    p.goal.x = g.x + g.nx * penOut
    p.goal.y = g.y + g.ny * penOut
    this.spawnSide = this.rng() < 0.5 ? -1 : 1   // F2: which side the flock starts
    this.home = {
      x: g.x - g.tx * this.spawnSide * 90 - g.nx * 40,
      y: g.y - g.ty * this.spawnSide * 90 - g.ny * 40,
    }
    if (this.dog) {                              // respawn mid-session → fresh course
      this.dog.owner = { ...this.home }
      this.dog.pos = { ...this.home }
      this.dog.vel = { x: 0, y: 0 }
    }
  }

  // Obstacles (owner 2026-11-14): small stands of trees / large rocks in the
  // field. Laid out the way the herd is — GROUPS of 1..obstacleGroupMax,
  // group seeds rejection-sampled a minimum gap apart, members clumped round
  // their seed (here overlapping, so a group reads as one bigger stand or a
  // rock pile). Each obstacle is a solid disc {x, y, r, kind, group, seed}.
  //
  // How MANY groups: exactly obstacleFreq — or, with obstacleRandom on (the
  // load default), a draw from 0..obstacleRangeMax, heavily skewed low:
  // obstacleLowShare of courses land in the lowest 10 % of the range, the
  // rest at 10 % + 90 % · u³ — mostly low-middle, a very occasional outlier.
  //
  // PRNG-stream discipline: obstacles draw from their OWN stream (derived
  // from the seed), never `this.rng` — so the gate, home post and spawn side
  // of a seed do not move with the obstacle settings, and a course with no
  // obstacles replays the pre-obstacle course sheep for sheep.
  placeObstacles(seed) {
    const p = this.p, r = this.playRect(), gt = this.gate
    const rnd = makePRNG((seed ^ 0x9e3779b9) >>> 0)
    this.obstacles = []
    let groups = Math.max(0, Math.round(p.obstacleFreq))  // exact count (Q65) …
    if (p.obstacleRandom) {                                // … unless the course draws it
      const top = Math.max(0, Math.round(p.obstacleRangeMax))
      const low = rnd() < p.obstacleLowShare, u = rnd()
      groups = Math.round(top * (low ? 0.1 * u : 0.1 + 0.9 * u * u * u))
    }
    this.obstacleGroups = groups
    const rMin = Math.min(p.obstacleRadiusMin, p.obstacleRadiusMax), rMax = Math.max(p.obstacleRadiusMin, p.obstacleRadiusMax)
    const gap = p.obstacleMinGap
    const gateClear = Math.max(p.spawnGateClear, p.gateAttractR, 100)
    // a disc may sit here: inside the fence with a lane to spare, off the gate
    // mouth and its approach, off the handler's post, a gap from other groups
    const fits = (c, group) => {
      if (c.x - c.r < r.x0 + gap || c.x + c.r > r.x1 - gap || c.y - c.r < r.y0 + gap || c.y + c.r > r.y1 - gap) return false
      if (Math.hypot(c.x - gt.x, c.y - gt.y) < gateClear + c.r) return false
      if (Math.hypot(c.x - this.home.x, c.y - this.home.y) < 50 + c.r) return false
      for (const o of this.obstacles) if (o.group !== group && Math.hypot(c.x - o.x, c.y - o.y) < c.r + o.r + gap) return false
      return true
    }
    for (let g = 0; g < groups; g++) {
      const kind = rnd() < p.obstacleRockFrac ? 'rocks' : 'trees'
      const size = 1 + Math.floor(rnd() * Math.max(1, p.obstacleGroupMax))
      const radius = () => (rMin + rnd() * (rMax - rMin)) * (kind === 'rocks' ? p.obstacleRockScale : 1)
      const members = []
      for (let m = 0; m < size; m++) {
        let placed = null
        for (let t = 0; t < (m === 0 ? 60 : 12) && !placed; t++) {
          const rad = radius()
          let c
          if (m === 0) c = { x: r.x0 + rnd() * (r.x1 - r.x0), y: r.y0 + rnd() * (r.y1 - r.y0), r: rad }
          else { // clumped onto an earlier member, overlapping it by 10–40 % of the smaller radius
            const b = members[Math.floor(rnd() * members.length)], a = rnd() * Math.PI * 2
            const d = b.r + rad - Math.min(b.r, rad) * (0.1 + rnd() * 0.3)
            c = { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, r: rad }
          }
          if (fits(c, g)) placed = c
        }
        if (!placed) { if (m === 0) break; else continue } // best-effort: a crowded field just gets fewer
        const o = { x: placed.x, y: placed.y, r: placed.r, kind, group: g, seed: Math.floor(rnd() * 4294967296) }
        members.push(o); this.obstacles.push(o)
      }
    }
  }

  // Solid obstacles: move `pos` out of every disc (+pad) it is inside and,
  // if a velocity is given, drop its into-the-obstacle component (the fence
  // clamp's idea, on a circle). Two passes settle a point between two
  // overlapping members of a clump. Returns true if anything moved.
  pushOut(pos, pad, vel) {
    let moved = false
    for (let pass = 0; pass < 2; pass++) {
      for (const o of this.obstacles) {
        let dx = pos.x - o.x, dy = pos.y - o.y, d = Math.hypot(dx, dy)
        const R = o.r + pad
        if (d >= R) continue
        if (d < 1e-6) { dx = 1; dy = 0; d = 1 }
        const nx = dx / d, ny = dy / d
        pos.x = o.x + nx * R; pos.y = o.y + ny * R
        if (vel) { const vn = vel.x * nx + vel.y * ny; if (vn < 0) { vel.x -= nx * vn; vel.y -= ny * vn } }
        moved = true
      }
    }
    return moved
  }

  // A sheep's way round obstacles. Two parts, both unit-scale like the other
  // forces: (1) within r_obstacle of an edge the obstacle pushes straight off
  // (the fence's shape); (2) a MOVING sheep whose heading would carry it into
  // an obstacle inside obstacleLook sidesteps — to whichever side of the
  // obstacle's centre it already is, so the two halves of a group peel off
  // opposite ways (a dead-centre sheep is sent by index parity). Returns the
  // force plus `a` (0–1, how hard it is working round something), which
  // integrate() uses to relax cohesion — that is what lets the group part.
  obstacleForce(i) {
    const s = this.sheep[i], p = this.p
    let fx = 0, fy = 0, a = 0
    if (!this.obstacles.length) return { x: 0, y: 0, a: 0 }
    const sp = Math.hypot(s.vel.x, s.vel.y)
    const hx = sp > 1 ? s.vel.x / sp : 0, hy = sp > 1 ? s.vel.y / sp : 0
    for (const o of this.obstacles) {
      const rx = o.x - s.pos.x, ry = o.y - s.pos.y
      const d = Math.hypot(rx, ry), edge = d - o.r
      if (edge > Math.max(p.obstacleLook, p.r_obstacle)) continue
      if (edge < p.r_obstacle && d > 1e-4) {
        const k = smoothstep(p.r_obstacle, 0, Math.max(0, edge))
        fx -= (rx / d) * k; fy -= (ry / d) * k
        if (k > a) a = k
      }
      if (sp <= 1 || edge > p.obstacleLook) continue
      const along = rx * hx + ry * hy
      if (along <= 0) continue                    // behind it / already past
      const cross = hx * ry - hy * rx             // > 0: the centre lies to the +angle side of the heading
      const reach = o.r + p.r_obstacle, lat = Math.abs(cross)
      if (lat >= reach) continue                  // the heading already clears it
      const side = cross > 1e-3 ? 1 : cross < -1e-3 ? -1 : (i % 2 ? 1 : -1)
      const k = smoothstep(p.obstacleLook, 0, Math.max(0, edge)) * (1 - 0.5 * lat / reach)
      fx += hy * side * k; fy -= hx * side * k    // perpendicular to the heading, away from the centre
      if (k > a) a = k
    }
    return { x: fx, y: fy, a }
  }

  // How hidden `b` is from `a` (0 = clear sight, 1 = fully behind cover): the
  // deepest cut the a→b sight line makes into any obstacle, eased in over
  // obstacleCoverEdge px so a sheep at the rim of a stand does not flicker.
  coverBetween(a, b) {
    let cover = 0
    for (const o of this.obstacles) {
      if (o.kind === 'hurdle') continue // a drive-gate panel hides nothing (FO3)
      const depth = o.r - distToSeg(o, a, b)
      if (depth <= 0) continue
      const c = smoothstep(0, this.p.obstacleCoverEdge, depth)
      if (c > cover) { cover = c; if (cover >= 1) break }
    }
    return cover
  }

  // The dog's way round obstacles: bend the heading `dir` (unit) to the
  // tangent of the nearest obstacle blocking the next `reach` px, re-testing
  // so a clump of overlapping discs is skirted as one shape. The side he
  // goes round is chosen once and HELD (dog.avoidSide) until the way is
  // clear, so he never dithers in the notch between two members.
  dogDetour(pos, dir, reach) {
    const d = this.dog, pad = this.p.L
    let side = d.avoidSide, out = dir, blocked = false
    for (let pass = 0; pass < 4; pass++) {
      let best = null, bestHit = Infinity
      for (const o of this.obstacles) {
        const rx = o.x - pos.x, ry = o.y - pos.y, R = o.r + pad
        const along = rx * out.x + ry * out.y
        if (along <= 0) continue
        const cross = out.x * ry - out.y * rx
        if (Math.abs(cross) >= R) continue
        const hit = along - Math.sqrt(R * R - cross * cross) // distance to where the path enters the disc
        if (hit > reach || hit >= bestHit) continue
        bestHit = hit; best = { rx, ry, R, cross }
      }
      if (!best) break
      blocked = true
      if (!side) side = best.cross >= 0 ? -1 : 1
      const dist = Math.hypot(best.rx, best.ry)
      const ang = Math.atan2(best.ry, best.rx) + side * (Math.asin(Math.min(1, best.R / Math.max(dist, 1e-6))) + 0.04)
      out = { x: Math.cos(ang), y: Math.sin(ang) }
    }
    d.avoidSide = blocked ? side : 0
    return out
  }

  // Spawn pipeline (POC-v5 P1, F5–F8): `pickLayout` → one ARCHETYPE SAMPLER
  // (where group seeds may go) → the shared machinery that has not changed
  // since POC-v2/v3: group sizes 1..clusterSizeMax (H1), ≥ clusterMinGap
  // rejection sampling, members jittered clusterSpread around their seed,
  // wandererFrac drift. F8 gate clearance is applied to every sampler.
  //
  // PRNG-stream discipline: a FORCED spawnLayout consumes NO draw; `random`
  // consumes exactly one, after placeGate() and before the group sizes. So a
  // seed's gate / home / dog never move when the archetype changes, and
  // forced beside-gate reproduces a POC-v4 course (see spawnGateClear note).
  pickLayout() {
    const p = this.p
    if (p.spawnLayout !== 'random') return p.spawnLayout
    return ['beside-gate', 'whole-pasture', 'weighted'][Math.floor(this.rng() * 3) % 3]
  }

  // beside-gate (POC-v3 F2, verbatim): a region anchored NEAR THE GATE, off to
  // the seeded side. Gate-local frame: along the fence (one side only — never
  // straddle the mouth) × into the field. `grow` widens the box away from the
  // gate and deeper as min-gap sampling fails, so a small flock huddles by the
  // gate while a big one trails off along the fence.
  sampleBesideGate(grow) {
    const p = this.p, r = this.playRect(), gt = this.gate, sideSign = this.spawnSide
    const clampv = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    const along = sideSign * (60 + this.rng() * (270 + 450 * grow))
    const depth = 30 + this.rng() * p.spawnDepth * (1 + grow)
    return {
      x: clampv(gt.x + gt.tx * along - gt.nx * depth, r.x0 + 30, r.x1 - 30),
      y: clampv(gt.y + gt.ty * along - gt.ny * depth, r.y0 + 30, r.y1 - 30),
    }
  }

  // Archetype sampler for `layout`: `sample(grow, groupIndex)` yields a
  // candidate group seed; `ok(c)` is the archetype's own rejection (holes —
  // none for beside-gate); `start()` returns the ideal-path start vertex
  // (null = initial GCM, F3 amended). Building a sampler may consume PRNG
  // draws (holes, focus) — only the chosen archetype's sampler is built.
  makeSampler(layout) {
    const p = this.p, r = this.playRect(), gt = this.gate
    const clampv = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    this.holes = []   // F6 discs {x, y, r, hole} — render/debug only
    this.focus = null // F7 core {x, y, r} — render/debug only
    const uniformField = () => ({ // anywhere in the field, 30 px in from the fence
      x: r.x0 + 30 + this.rng() * (r.x1 - r.x0 - 60),
      y: r.y0 + 30 + this.rng() * (r.y1 - r.y0 - 60),
    })
    if (layout === 'whole-pasture') {
      // F6: k irregular empty patches, each the union of 1..holeLobes discs —
      // lobe i+1 is centered inside lobe i, so a patch is one connected blob.
      // Patches may overlap the fence (a bare corner is a legitimate hole).
      const k = p.holeCountMin + Math.floor(this.rng() * (Math.max(p.holeCountMin, p.holeCountMax) - p.holeCountMin + 1))
      const rr = () => p.holeRadiusMin + this.rng() * Math.max(0, p.holeRadiusMax - p.holeRadiusMin)
      for (let h = 0; h < k; h++) {
        const lobes = 1 + Math.floor(this.rng() * p.holeLobes)
        let c = { x: r.x0 + this.rng() * (r.x1 - r.x0), y: r.y0 + this.rng() * (r.y1 - r.y0), r: rr(), hole: h }
        this.holes.push(c)
        for (let l = 1; l < lobes; l++) {
          const ang = this.rng() * Math.PI * 2, dist = this.rng() * c.r
          c = { x: c.x + Math.cos(ang) * dist, y: c.y + Math.sin(ang) * dist, r: rr(), hole: h }
          this.holes.push(c)
        }
      }
      const holes = this.holes, pad = p.clusterSpread // members jitter → keep seeds a spread outside
      return {
        sample: () => uniformField(),
        ok: (c) => holes.every((d) => Math.hypot(c.x - d.x, c.y - d.y) >= d.r + pad),
        start: () => null,
      }
    }
    if (layout === 'weighted') {
      // F7: a focus anywhere in the field (outside the gate clearance, core
      // fully inside the fence), a CORE of the leading spawn groups packed at
      // a reduced min gap inside radius R, and a sparse TAIL of the remaining
      // groups at least R + clusterMinGap away from the focus.
      const R = p.focusRadius * Math.sqrt(p.sheepCount / 80)
      const inset = Math.min(R / 2, (r.x1 - r.x0) / 4, (r.y1 - r.y0) / 4)
      const keepOut = (p.spawnGateClear > 0 ? p.spawnGateClear : 0) + R / 2
      let f = null
      for (let t = 0; t < 50; t++) {
        const c = { x: r.x0 + inset + this.rng() * (r.x1 - r.x0 - 2 * inset), y: r.y0 + inset + this.rng() * (r.y1 - r.y0 - 2 * inset) }
        if (!f) f = c
        if (Math.hypot(c.x - gt.x, c.y - gt.y) >= keepOut) { f = c; break }
      }
      this.focus = { x: f.x, y: f.y, r: R }
      let coreGroups = 0
      return {
        bind: (sizes) => { // the leading groups until their members reach focusShare·n are the core
          let sum = 0; coreGroups = 0
          for (const sz of sizes) { if (sum >= p.focusShare * p.sheepCount) break; sum += sz; coreGroups++ }
        },
        sample: (grow, g) => {
          if (g < coreGroups) {
            const ang = this.rng() * Math.PI * 2, dist = R * Math.sqrt(this.rng())
            return { x: f.x + Math.cos(ang) * dist, y: f.y + Math.sin(ang) * dist }
          }
          return uniformField()
        },
        ok: (c, g) => g < coreGroups || Math.hypot(c.x - f.x, c.y - f.y) >= R + p.clusterMinGap,
        gap: (g) => (g < coreGroups ? p.clusterMinGap * p.focusGapScale : p.clusterMinGap),
        start: () => null,
      }
    }
    // beside-gate: the POC-v3 near-gate region
    const alongC = this.spawnSide * p.spawnGateOffset
    return {
      sample: (grow) => this.sampleBesideGate(grow),
      ok: () => true,
      start: () => ({ // spawn-region center (POC-v3 scoring line axis)
        x: clampv(gt.x + gt.tx * alongC - gt.nx * (30 + p.spawnDepth / 2), r.x0 + 30, r.x1 - 30),
        y: clampv(gt.y + gt.ty * alongC - gt.ny * (30 + p.spawnDepth / 2), r.y0 + 30, r.y1 - 30),
      }),
    }
  }

  spawn(count, keepRun) {
    const r = this.playRect()
    const p = this.p, n = count === undefined ? p.sheepCount : Math.max(1, Math.round(count))
    const gt = this.gate
    const comp = this.compPath
    this.layout = comp ? 'competition' : this.pickLayout()
    const sampler = comp ? { sample: () => ({ x: comp.start.x, y: comp.start.y }), ok: () => true, start: () => ({ x: comp.start.x, y: comp.start.y }) } : this.makeSampler(this.layout)
    if (comp) { this.holes = []; this.focus = null }
    // F8: shared clearance — no group seed within spawnGateClear (+ the member
    // jitter radius) of the gate mouth, any archetype. 0 disables.
    const clearR = p.spawnGateClear > 0 ? p.spawnGateClear + p.clusterSpread : 0
    const clearGate = (c) => clearR === 0 || Math.hypot(c.x - gt.x, c.y - gt.y) >= clearR
    // …and no group seed inside (or a member-jitter short of) an obstacle. With
    // no obstacles this rejects nothing, so the draws are the old ones exactly.
    const clear = (c) => clearGate(c) && this.obstacles.every((o) => Math.hypot(c.x - o.x, c.y - o.y) >= o.r + p.clusterSpread * 0.5)
    // H1 (P8): group sizes draw uniformly 1..clusterSizeMax — singletons are
    // legal idle groups, so no lone-remainder guard. Group COUNT still derives
    // from sheepCount (draw until the herd is exhausted).
    const sizes = []
    if (comp) sizes.push(n) // CC5: one group
    else for (let left = n; left > 0;) {
      const s = 1 + Math.floor(this.rng() * Math.min(p.clusterSizeMax, left))
      sizes.push(s); left -= s
    }
    if (sampler.bind) sampler.bind(sizes) // archetypes that split the group list (F7 core/tail)
    const seeds = []
    for (let g = 0; g < sizes.length; g++) {
      const gap = sampler.gap ? sampler.gap(g) : p.clusterMinGap
      let best = null, bestD = -1, last = null
      // 150 ACCEPTED tries along the archetype's growth curve (v2/v3 count —
      // with nothing rejected this is the POC-v4 loop draw for draw); tries
      // rejected by clearance/holes don't count, under a hard cap.
      for (let a = 0, tries = 0; a < 150 && tries < 600; tries++) {
        const c = sampler.sample(a / 150, g)
        last = c
        if (!clear(c) || !sampler.ok(c, g)) continue // F8 / archetype rejection: never a fallback candidate
        a++
        const d = seeds.length ? Math.min(...seeds.map((q) => Math.hypot(q.x - c.x, q.y - c.y))) : Infinity
        if (d >= gap) { best = c; break }
        if (d > bestD) { bestD = d; best = c } // fall back to the most-isolated ACCEPTABLE try
      }
      seeds.push(best || last) // degenerate: nothing acceptable in 600 tries (field nearly all excluded)
    }
    this.sheep = []
    for (let g = 0; g < sizes.length; g++) {
      for (let m = 0; m < sizes[g]; m++) this.spawnSheep(seeds[g], g, p, r)
    }
    // ideal path (line axis): start → gate mouth → pen center. Start is the
    // archetype's own vertex (beside-gate: spawn-region center) or, when the
    // archetype has no region, the initial flock centroid (F3 amended).
    const start = sampler.start() || this.computeGCM()
    this.idealPath = [start, { x: gt.x, y: gt.y }, { x: p.goal.x, y: p.goal.y }]
    this.nextGroup = sizes.length // fresh ids for groups re-derived after pressure (B2)
    this.groupCap = {} // per-group target size for re-derived groups (spawn groups default to clusterSizeMax)
    this.crush = 0; this.crushTime = 0
    this.trotTurnT = 0; this.trotDogSweep = 0; this.gateCone = { len: 0, ang: 0 }
    if (!keepRun) { this.injuries = 0; this.resetRun() } // a new wave (RM5) keeps the run and its score
  }

  // B2: an alert sheep settles back to idle — join the nearest already-idle
  // group within idleCohRadius that still has ROOM (each re-derived group draws
  // a target size from clusterSizeMin..Max), else found a new group. A settled
  // blob therefore holds many small interleaved groups; the crowd-dispersal
  // drive (see update()) then pulls them apart into the loose scattered field.
  enterIdle(i) {
    const s = this.sheep[i], p = this.p
    const size = {}
    for (const b of this.sheep) if (b.idle && !b.wanderer && !b.down) size[b.group] = (size[b.group] || 0) + 1
    let adopt = null, best = p.idleCohRadius
    for (let j = 0; j < this.sheep.length; j++) {
      if (j === i) continue
      const b = this.sheep[j]
      if (!b.idle || b.wanderer || b.down) continue
      if ((size[b.group] || 0) >= (this.groupCap[b.group] ?? p.clusterSizeMax)) continue
      const d = vec2.dist(s.pos, b.pos)
      if (d < best) { best = d; adopt = b }
    }
    if (adopt) {
      s.group = adopt.group
    } else {
      s.group = this.nextGroup++
      this.groupCap[s.group] = p.clusterSizeMin +
        Math.floor(this.rng() * (p.clusterSizeMax - p.clusterSizeMin + 1))
    }
    s.wanderer = this.rng() < p.wandererFrac
    s.grazeTimer = this.rng() * p.grazeStepEvery
    s.stepTime = 0
    s.idle = true
  }

  spawnSheep(seed, group, p, r) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    const boldness = clamp(this.gauss(p.boldMean, p.boldSd), 0, 1)
    // uniform disc jitter — bounded (≤ clusterSpread), so adjacent groups can't
    // chain into one cluster the way gaussian tails would
    const jAng = this.rng() * Math.PI * 2, jRad = p.clusterSpread * Math.sqrt(this.rng())
    const pos = {
      x: clamp(seed.x + Math.cos(jAng) * jRad, r.x0, r.x1),
      y: clamp(seed.y + Math.sin(jAng) * jRad, r.y0, r.y1),
    }
    this.pushOut(pos, 3) // a member jittered into a stand / rock stands beside it instead
    this.sheep.push({
      pos,
      vel: { x: 0, y: 0 },
      group,                              // spawn-group id — idle cohesion is same-group only (A5)
      wanderer: this.rng() < p.wandererFrac, // A3: the drifting minority
      grazeTimer: this.rng() * p.grazeStepEvery, // until the next shuffle-step
      stepTime: 0,                        // remaining duration of the current step
      idle: true,                         // idle ⇄ alert state (B1/B2)
      calmT: 0,                           // continuous zero-threat time while alert
        heading: this.rng() * Math.PI * 2, // wander heading (graze)
        facing: this.rng() * Math.PI * 2,  // stable render angle when near-still
        boldness,                          // per-sheep flightiness gate
        stress: 0,                         // incoming threat this tick
        down: false,                       // injured → frozen obstacle
        protest: 0,                        // protest-stamp timer (s)
        panic: false,                      // panic sprint this tick
        fleeFwd: 0,                        // forward (+goal) flee push, for crush
        fwdPush: 0,                        // net forward push (crowd + dog), for crush
        stragTime: 0,                      // time spent outside the main blob (s)
        through: false,                    // passed the gate → commits forward, never turns back
        throughDir: null,                  // locked into-pen heading once through
        committed: false,                  // G1: inside the approach zone with momentum → carries on out
        gatePull: 0,                       // G2/G3: how hard the gate draws this sheep (last tick, 0–1)
        gatePullNext: 0,                   //   …this tick's value, committed at the end of step()
        gateLead: -1,                      // G3: index of the sheep it files in behind (−1 = drawn directly)
        trot: false,                       // T1/T2 (POC-v9): trotting in a column this moment
        trotLead: -1,                      //   follower files behind this sheep (−1 = a lead)
        trotHeading: 0,                    //   lead's locked column heading (rad)
        trotFreeT: 0,                      // T3: continuous pressure-free time while trotting (s)
        trotT: 0,                          // T6 (POC-v13): time in the current trot (s)
        trotFast: false,                   // POC-v13: full trot pace (a T2 bolt) rather than the slow trot
        trotGroup: 0,                      // T2 (POC-v13): id of the triggered group it belonged to — followers join only within it
        trotRest: 0,                       // T6: seconds before it may trot again
        trotEase: 0,                       // T7: seconds left of the wind-down walk
        trotEaseDir: 0,                    //   …along this heading (rad)
        kind: 'ewe',                       // POC-v14 FO4–FO6: 'ewe' | 'golden' | 'lamb' | 'ram' (assignSpecials)
        mother: -1,                        //   lamb: index of its ewe
        stand: false,                      //   ram: standing his ground, facing the dog (owner Q84)
        standLie: 0,                       //   …how long the dog has been lying down in front of him (s)
        standCool: 0,                      //   …seconds before he may stand again
        standFace: 0,                      //   …how long a walk-on dog has faced him down (s)
        yieldT: 0,                         //   …seconds left of his slow trot away after yielding
        penT: 0,                           // run time at which it crossed into the pen
        lost: false,                       // killed by the assault — out of the flock (SC11)
        stressAvg: 0,                      // POC-v15 SC12: stress smoothed over penStressMemory — what its tier is read from
        cond: 1,                           // POC-v15 SC13: condition 0–1 — drains under panic / trot, recovers grazing; scales its payout
        wasPanic: false,                   //   panic flag last tick (a panic is counted on its onset)
        panicAt: -1e9,                     //   run time of its last counted panic
        slamAt: -1e9,                      //   run time of its last counted fence slam
    })
  }

  // Neighbor query — single swappable function. Brute-force O(n²); returns
  // [{ j, d }] for every other sheep, nearest-first. Replace with a spatial hash
  // later (150+ agents) without touching the force code below.
  neighborsOf(i) {
    const a = this.sheep[i]
    const out = []
    for (let j = 0; j < this.sheep.length; j++) {
      if (j === i) continue
      out.push({ j, d: vec2.dist(a.pos, this.sheep[j].pos) })
    }
    out.sort((x, y) => x.d - y.d)
    return out
  }

  // Separation: Σ (p_i − p_j)/max(d,minSep)²  over neighbors within r_sep.
  // The minSep clamp stops the inverse-square term exploding on near-overlap.
  separation(i, nbrs) {
    const a = this.sheep[i], p = this.p
    let fx = 0, fy = 0
    for (const n of nbrs) {
      if (n.d >= p.r_sep) break            // sorted → the rest are farther
      const b = this.sheep[n.j]
      const mag = 1 / Math.max(n.d, p.minSep) // inverse-linear, capped at 1/minSep
      let ux, uy
      if (n.d > 1e-4) {                    // unit direction away from neighbor
        ux = (a.pos.x - b.pos.x) / n.d
        uy = (a.pos.y - b.pos.y) / n.d
      } else {                             // exact overlap → deterministic nudge
        const ang = (i + 1) * 2.399963 + n.j
        ux = Math.cos(ang); uy = Math.sin(ang)
      }
      fx += ux * mag; fy += uy * mag
    }
    return { x: fx, y: fy }
  }

  // Cohesion: toward the mean position of the cohN nearest (topological —
  // robust as density changes, which it constantly does here). Spring-scaled by
  // cohScale so it's full-strength for far stragglers but eases near the local
  // CoM → the group settles at a loose spacing instead of crushing to a pack.
  cohesion(i, nbrs) {
    const p = this.p
    const a = this.sheep[i]
    // Idle gating (POC-v2 A4/A5): an unpressured sheep only feels cohesion from
    // its OWN group (any distance — a straggler slowly walks home instead of
    // being orphaned), and a wandering one feels none. Groups therefore neither
    // reach for each other nor glue when they brush past — cross-group merging
    // would be irreversible and coalesce the field. Alert sheep keep full
    // topological cohesion — herding is unchanged. idleCohRadius is the group-
    // membership range for enterIdle()'s re-derivation, not a force cutoff.
    // (Gated by the B1/B2 idle state, updated later this tick — 1-tick lag is fine.)
    let cand = nbrs
    if (a.idle) {
      if (a.wanderer) return { x: 0, y: 0 }
      // …and grazers don't chase their group's wanderer (A3: it wanders OFF —
      // the group stays put rather than being towed behind its own CoM).
      cand = nbrs.filter((n) => {
        const b = this.sheep[n.j]
        return b.group === a.group && !b.wanderer
      })
    }
    const k = Math.min(p.cohN, cand.length)
    const bw = a.idle ? null : this.bellFor(i) // FO9: an alert sheep near the bellwether goes where she goes
    if (k === 0 && !bw) return { x: 0, y: 0 }
    let cx = 0, cy = 0, w = k
    for (let t = 0; t < k; t++) {
      const b = this.sheep[cand[t].j]
      cx += b.pos.x; cy += b.pos.y
    }
    if (bw) { cx += bw.pos.x * p.bellWeight; cy += bw.pos.y * p.bellWeight; w += p.bellWeight }
    if (!(w > 0)) return { x: 0, y: 0 }
    const to = { x: cx / w - a.pos.x, y: cy / w - a.pos.y }
    const d = vec2.len(to)
    if (d < 1e-6) return { x: 0, y: 0 }
    const mag = Math.min(d / p.cohScale, 1)   // proportional within cohScale, capped
    return vec2.scale(to, mag / d)            // = unit(to) · mag
  }

  // Alignment: toward the mean heading of neighbors within r_align (kept weak).
  // Idle-gated (POC-v2 A1/A2): the output is a NORMALIZED heading, so for a
  // standing group any micro-drift self-reinforces into a perpetual ~7 px/s
  // glide — measured, not hypothetical. Unpressured sheep don't align;
  // threatened sheep keep it (herding flow unchanged).
  alignment(i, nbrs) {
    const p = this.p
    if (this.sheep[i].idle) return { x: 0, y: 0 }
    let vx = 0, vy = 0, c = 0
    for (const n of nbrs) {
      if (n.d >= p.r_align) break
      const b = this.sheep[n.j]
      vx += b.vel.x; vy += b.vel.y; c++
    }
    const bw = this.bellFor(i) // FO9
    if (bw) { vx += bw.vel.x * p.bellWeight; vy += bw.vel.y * p.bellWeight; c += p.bellWeight }
    if (!(c > 0)) return { x: 0, y: 0 }
    return vec2.norm({ x: vx, y: vy })
  }

  // FO9: the bellwether, if this sheep is within her reach (and is not her).
  bellFor(i) {
    const j = this.bellIdx
    if (!(j >= 0) || j === i) return null
    const b = this.sheep[j], p = this.p
    if (!b || b.kind !== 'bell' || b.through || b.down || !(p.bellWeight > 0)) return null
    return vec2.dist(this.sheep[i].pos, b.pos) < p.bellRadius ? b : null
  }

  // FO8: the spook a panicking black sheep puts on this one — { x, y } unit away from her, t = threat — or null.
  spookOn(a) {
    const b = this.blackPanic, p = this.p
    if (!b || a.kind === 'black') return null
    const dx = a.pos.x - b.x, dy = a.pos.y - b.y, d = Math.hypot(dx, dy)
    if (d >= p.blackSpookRadius || d < 1e-6) return null
    return { x: dx / d, y: dy / d, t: p.blackSpookThreat * (1 - d / p.blackSpookRadius) }
  }

  // Dog steering: command → target + facing + intensity, then arrive-seek toward
  // the target at dogVMax. Facing is DERIVED (eye on GCM) — no manual head control.
  stepDog(dt) {
    const p = this.p, d = this.dog, g = this.gcm
    const faceGCM = Math.atan2(g.y - d.pos.y, g.x - d.pos.x)
    d.intensity = 1                              // default; lie_down lowers it
    d.impulseFactor = 1                          // default; an easy impulse (E3) raises it

    switch (d.command) {
      // Flanking (POC-v3 C1–C5, POC-v6 C8): not a fixed orbit — the flank
      // point rides the HERD PERIMETER LINE (convex hull + perimeterMargin —
      // the dotted outline itself, owner 2026-08-22; was +flankStandoff), clamped
      // into the field and biased toward a nearby boundary so the dog slots
      // between sheep and fence. come_by = clockwise, away = counter-clockwise
      // (bird's-eye; canvas y-down makes +angle = CW).
      case 'come_by':
      case 'away': {
        const sign = d.command === 'come_by' ? 1 : -1
        const act = this.sheep.filter((s) => !s.down && !s.through)
        if (!act.length) { d.target = { x: d.owner.x, y: d.owner.y }; d.facing = faceGCM; break }
        // advance the flank bearing — full pace when on station, slower while
        // still running to it (or the point outruns the dog). The advance is
        // capped so the point's LINEAR speed stays inside what the dog can
        // track: at 80 scattered sheep the ring is ~500 px, where 1 rad/s is
        // 185 px/s — an uncapped point laps the dog forever and he oscillates
        // on one side of the flock instead of circling (P5 as-built fix; the
        // cap also keeps the flank honest when the dogVMax slider is lowered).
        const onPoint = vec2.dist(d.pos, d.target) < 60
        // C10 (POC-v8): a corner-first start HOLDS the point on that corner
        // (it still rides the perimeter as the flock moves) until the dog
        // reaches it; only then does the sweep advance.
        if (d.flankWaypoint && onPoint) d.flankWaypoint = false
        const near = d.flankWaypoint ? 0 : onPoint ? 1 : 0.35
        // C11 (POC-v10): a gentle flank runs at flankEasySpeedFrac × dogVMax;
        // the advance cap tracks the slowed dog so the point cannot lap him.
        const flankV = d.flankEasy ? p.dogVMax * p.flankEasySpeedFrac : p.dogVMax
        const advCap = 0.9 * flankV / Math.max(1, d.flankR || 1)
        if (!d.flankParked) d.flankAngle += sign * Math.min(p.flankAdvance, advCap) * near * dt
        // C8 (POC-v6): the flank point PARKS ON THE GATE LINE — since the
        // owner's 2026-08-22 amendment the GATE'S TANGENT to the perimeter on
        // the flank's exit side (gateLineBearing: the far silhouette edge of
        // the flock as seen from the gate — he sweeps the whole back of the
        // herd; was the goal→GCM line, v3's balance point), carried
        // flankOvershootDeg further for a wider sweep (v4's C7, now
        // default 0). Once the point's progress past the station lands in
        // [0, flankHandoffDeg] it is pinned to the station (which keeps
        // moving with the GCM) and the dog runs to it; the handoff below
        // fires on arrival. A point that is already far PAST the line keeps
        // going round (the rule is "until he reaches the line", not "snap
        // back"); v4's park-at-once for a point already within the bound at
        // command time is gone (see flankArmed below). A
        // parked point follows the station forward as the GCM moves but is
        // NEVER moved against the flank direction (C1/C5: a come-by only
        // ever runs clockwise, an away counter-clockwise).
        d.flankT += dt
        const line = this.gateLineBearing(sign, p.perimeterMargin)
        const station = line + sign * p.flankOvershootDeg * Math.PI / 180
        const ptProg = sign * angleDiff(d.flankAngle, station)
        // Owner 2026-08-22: the park test ARMS only once the point has been
        // in the flock's shadow (behind the exit line, progress < 0). A dog
        // starting on the gate side — at heel, or just past a finished
        // sweep — is within flankHandoffDeg "past" the tangent without ever
        // having gone round, and v4's park-at-once convenience converted him
        // on the spot (measured: seeds 1337 come-by / 1403 away, 0° sweep).
        // A come-by from the gate side now runs the whole perimeter.
        if (ptProg < 0) d.flankArmed = true
        if (!d.flankParked && d.flankArmed && ptProg >= 0 && ptProg <= p.flankHandoffDeg * Math.PI / 180) d.flankParked = true
        if (d.flankParked && ptProg < 0) d.flankAngle = station
        if (d.flankParked) d.parkT += dt
        // C8 (POC-v6): the flank point rides the HERD PERIMETER LINE — the
        // hull offset by perimeterMargin, i.e. the dotted outline — at the
        // flank bearing, so the track follows the flock's shape (replaces
        // v3's sector-max circle). Owner touch-up 2026-08-22: the dog tracks
        // the CURRENT boundary, not a 140 px (flankStandoff) offset of it.
        const rr = this.perimeterRadius(d.flankAngle, p.perimeterMargin)
        // No radius smoothing since the 2026-08-22 touch-up: v3's sector-max
        // circle stepped between sectors, so the ring radius was eased over
        // ~1/3 s — but the offset hull is continuous in θ, and on a 36 px
        // margin that ease cut 10–15 px (46 max) INSIDE the line as the
        // bearing swept a non-round flock. Measured: direct assignment puts
        // the point on the line on 100 % of unclamped ticks and moves it
        // ≤ 5 px/tick (the ease: 7–22 px). A fresh flank still seeds flankR
        // at the dog's own radius in setCommand for the advance cap above.
        d.flankR = rr
        let px = g.x + d.flankR * Math.cos(d.flankAngle)
        let py = g.y + d.flankR * Math.sin(d.flankAngle)
        // clearance floor: the flank point never sits closer than ~0.6×margin
        // to any sheep — extend the radius outward until clear (a safety net
        // only since C8: the offset hull already guarantees the full margin
        // once flankR has converged)
        const clear = p.perimeterMargin * 0.6
        let minD = Infinity
        for (const s of act) minD = Math.min(minD, Math.hypot(px - s.pos.x, py - s.pos.y))
        if (minD < clear) {
          d.flankR += clear - minD
          px = g.x + d.flankR * Math.cos(d.flankAngle)
          py = g.y + d.flankR * Math.sin(d.flankAngle)
        }
        // fence seek (C2): near a boundary, pull the flank point toward it so
        // the dog passes between sheep and fence; then clamp into the field.
        // Not once the point is PARKED on the gate line (C8): the pull would
        // drag the station up to ~25° off the line (measured at defaults),
        // and "reaches the line" means the line — the clamp still applies.
        // Two smoothings (v6 touch-ups): the pull FADES IN over the outer
        // fenceSeekRamp of the reach (the old on/off step at `reach` made the
        // flank target jump ~160 px in a tick on a seed-42 reversal), and
        // once parked it FADES OUT over parkFade seconds (the instant drop
        // snapped the target ~80 px on a wall-side flock). 0 restores either
        // step.
        const r = this.playRect(), m = 15
        const reach = p.fenceSeekReach
        const parked = !d.flankParked ? 1 : p.parkFade > 0 ? 1 - smoothstep(0, p.parkFade, d.parkT) : 0
        const pull = (dist) => dist >= reach || parked <= 0 ? 0
          : parked * p.fenceSeekBias * (p.fenceSeekRamp > 0 ? smoothstep(reach, reach * (1 - p.fenceSeekRamp), dist) : 1)
        const wx = pull(Math.min(px - r.x0, r.x1 - px))
        if (wx > 0) {
          const wallX = px - r.x0 < r.x1 - px ? r.x0 + m : r.x1 - m
          px += (wallX - px) * wx
        }
        const wy = pull(Math.min(py - r.y0, r.y1 - py))
        if (wy > 0) {
          const wallY = py - r.y0 < r.y1 - py ? r.y0 + m : r.y1 - m
          py += (wallY - py) * wy
        }
        d.target = {
          x: Math.max(r.x0 + m, Math.min(r.x1 - m, px)),
          y: Math.max(r.y0 + m, Math.min(r.y1 - m, py)),
        }
        // C9 (POC-v6): a flank is FINITE — once the point is parked on the
        // gate line and the dog has ARRIVED at it (not merely swept through
        // a ± cone, which is how v3/v4 converted up to 30° short), he drops
        // into EASY by himself. Fence contact is the usual geometry there,
        // not the condition (Q10); the 0.5 s arm-delay keeps a come-by
        // issued from an already-on-station spot from converting before it
        // reads as a command at all.
        if (d.flankParked && d.flankT > 0.5 && vec2.dist(d.pos, d.target) < 25) {
          d.handoff = { x: d.pos.x, y: d.pos.y }
          d.command = 'easy'                      // C9: strip follows (state-driven)
          d.flankEasy = false                     // C11: the gentle flank ends like any flank
          d.driveT = 0; d.stallT = 0; d.fwdEMA = p.stallSpeed * 3
          d.facing = faceGCM
          break
        }
        // the eye (C3): held flankConeDeg off the line of travel, toward the
        // flock side (sign of the flank direction); face the flock when slow
        const speed = vec2.len(d.vel)
        d.facing = speed > 20
          ? Math.atan2(d.vel.y, d.vel.x) + sign * (p.flankConeDeg * Math.PI / 180)
          : faceGCM
        break
      }
      case 'walk_on':                            // trail behind GCM, opposite the goal
      case 'easy': {                             // the same drive at easySpeedFrac × pace (POC-v6 I2)
        const easy = d.command === 'easy'
        d.facing = faceGCM                        // aimed forward drive
        // Survey the sheep he is DRIVING (his front hemisphere) — stragglers
        // beside/behind must not freeze him.
        const fx = Math.cos(d.facing), fy = Math.sin(d.facing)
        const goal = this.aim() // CC6: the pen centre, or the next gate of a competition course
        let nearest = Infinity, fwdSum = 0, fwdN = 0, movingAhead = false
        d.driveT += dt
        for (const s of this.sheep) {
          if (s.down || s.through) continue       // penned sheep aren't "ahead"
          const dx = s.pos.x - d.pos.x, dy = s.pos.y - d.pos.y
          const dd = Math.hypot(dx, dy)
          if (dd > 1e-6 && (dx * fx + dy * fy) / dd < 0.3) continue // not ahead
          if (dd < nearest) nearest = dd
          if (dd < p.R_flee * (1 + p.driveConeExt)) { // in the pressure arc (E5: the drive eye reaches further)
            const toGoal = vec2.norm(vec2.sub(goal, s.pos))
            const fwd = s.vel.x * toGoal.x + s.vel.y * toGoal.y
            fwdSum += fwd; fwdN++
            if (fwd >= p.stallSpeed) movingAhead = true
          }
        }
        // E1 gap controller: CLOSE on the flock while the ahead-gap is ample,
        // back off when it tightens — the dog presses but never catches.
        // (Replaces driveShrink's blind creep with feedback on the actual gap.)
        // Easy shares it (I3): a creeping dog that arrives at the gap and holds.
        // Q38 (2026-08-22): the governor's rates are tunables now, and EASY
        // scales them by easySpeedFrac — after a handoff the dog is already
        // on the ring, so the close rate, not dogVMax, paces his approach,
        // and at the old fixed 25 px/s easy and walk-on closed at the same
        // speed from the gate line (tune pass, Family 1).
        const pace = easy ? p.easySpeedFrac / p.walkOnSpeedFrac : 1 // easy : walk-on speed ratio
        if (nearest > p.driveTrailGap + 15) d.driveDist = Math.max(p.R_driveMin, d.driveDist - p.driveCloseRate * pace * dt)
        else if (nearest < p.driveTrailGap) d.driveDist = Math.min(p.R_drive, d.driveDist + p.driveBackoffRate * pace * dt)
        const away = vec2.norm(vec2.sub(g, goal)) // GCM-side away from goal
        d.target = { x: g.x + away.x * d.driveDist, y: g.y + away.y * d.driveDist }
        if (nearest < p.driveTrailGap) d.target = { x: d.pos.x, y: d.pos.y } // hard hold at the gap
        const fwdMean = fwdN ? fwdSum / fwdN : 0
        d.fwdEMA += (fwdMean - d.fwdEMA) * Math.min(1, dt / 1.5)
        if (!easy) {
          // E2: the dog is AT his gap pressing a crowd whose smoothed mass
          // motion has died (EMA of arc-mean goal-ward speed: jitter cancels in
          // the mean, the EMA — seeded high on command — bridges spool-up lulls)
          // → auto-convert to EASY (POC-v6 I4; was stand).
          if (d.driveT > 4 && fwdN >= 3 && nearest <= p.driveTrailGap + 20 &&
              d.fwdEMA < p.stallSpeed) {
            d.stallT += dt
            if (d.stallT >= p.stallDwell) { d.command = 'easy'; d.stallT = 0 }
          } else d.stallT = 0
        } else if (d.impulse) {
          // E3 impulse envelope (fired from easy since POC-v6): hold at mult
          // for dur, decay linearly back to 1 — scales the drive eye (Q32).
          const im = d.impulse
          im.t += dt
          if (im.t < im.dur) d.impulseFactor = im.mult
          else if (im.t < im.dur + im.decay)
            d.impulseFactor = im.mult + (1 - im.mult) * (im.t - im.dur) / im.decay
          else {
            d.impulse = null
            // Smart return: resume walk-on if the shove WORKED (crowd ahead
            // is moving, or gone) — stay easy only while the jam persists.
            if (nearest > p.driveTrailGap + 30 || movingAhead) {
              d.command = 'walk_on'
              d.driveT = 0; d.stallT = 0; d.fwdEMA = p.stallSpeed * 3
            }
          }
        }
        break
      }
      case 'lie_down': {                         // stop; the posture profile in
        d.target = { x: d.pos.x, y: d.pos.y }     // flee() makes the cone a wall (D1)
        d.intensity = p.lieDownIntensity          // HUD/ambient; cone strength via lieDownBlock
        d.facing = faceGCM
        break
      }
      case 'that_ll_do':                         // return to owner, eye off the herd
      default: {
        d.target = { x: d.owner.x, y: d.owner.y }
        const home = vec2.dist(d.pos, d.owner) < 12
        // En route the eye stays OFF the herd (disengage → flock relaxes,
        // and en-route intensity is live). At heel he stands down (A7,
        // heelIntensity) but WATCHES the flock — F1: pressure-free eye.
        d.facing = home ? faceGCM
                        : Math.atan2(d.pos.y - g.y, d.pos.x - g.x)
        if (home) d.intensity = p.heelIntensity
        break
      }
    }
    d.atHeel = d.command === 'that_ll_do' && vec2.dist(d.pos, d.owner) < 12

    // Obstacles: a target that falls inside a stand / rock moves to its edge,
    // and the heading below bends round whatever blocks the way there.
    if (this.obstacles.length) this.pushOut(d.target, p.L + 2)
    // arrive-seek: slow within arriveR so the orbit doesn't jitter / overshoot
    const to = vec2.sub(d.target, d.pos)
    const dist = vec2.len(to)
    const arriveR = 40
    // E4/I2 (POC-v7): the drive is paced off the SHEEP — walk-on at
    // walkOnSpeedFrac × vMax (= the flock's pace), easy at easySpeedFrac × vMax
    // (half). Flanks and the recall keep dogVMax.
    const walk = Math.min(p.walkSpeed, p.vMax) // the sheep's walk — he drives at their pace (POC-v13)
    const vmax = d.command === 'walk_on' ? walk * p.walkOnSpeedFrac
               : d.command === 'easy'    ? walk * p.easySpeedFrac
               : d.flankEasy && (d.command === 'come_by' || d.command === 'away') ? p.dogVMax * p.flankEasySpeedFrac // C11 (POC-v10)
               : p.dogVMax
    const speed = dist < arriveR ? vmax * (dist / arriveR) : vmax
    const dir = dist > 0.5 && this.obstacles.length ? this.dogDetour(d.pos, vec2.norm(to), dist) : vec2.norm(to)
    d.vel = dist > 0.5 ? vec2.scale(dir, Math.min(speed, dist / dt))
                       : { x: 0, y: 0 }
    d.pos = vec2.add(d.pos, vec2.scale(d.vel, dt))
    if (this.obstacles.length) this.pushOut(d.pos, p.L * 0.5, d.vel) // solid for the dog too
    const r = this.playRect()             // the dog stays in the field (no pen exit)
    d.pos.x = Math.max(r.x0, Math.min(r.x1, d.pos.x))
    d.pos.y = Math.max(r.y0, Math.min(r.y1, d.pos.y))
  }

  // Perimeter fence repulsion (P6 — replaces the interior fence): each of the
  // four walls pushes inward within r_fence, EXCEPT across the gate mouth,
  // which stays free so approaching sheep funnel into the opening.
  fenceForce(pos) {
    const p = this.p, r = this.playRect(), g = this.gate
    const half = p.gateWidth / 2, open = this.penOpen()
    const alongGate = Math.abs((pos.x - g.x) * g.tx + (pos.y - g.y) * g.ty)
    const walls = [
      { d: pos.y - r.y0, nx: 0, ny: 1, gate: g.side === 0 },
      { d: r.x1 - pos.x, nx: -1, ny: 0, gate: g.side === 1 },
      { d: r.y1 - pos.y, nx: 0, ny: -1, gate: g.side === 2 },
      { d: pos.x - r.x0, nx: 1, ny: 0, gate: g.side === 3 },
    ]
    let fx = 0, fy = 0
    for (const w of walls) {
      if (w.d > p.r_fence) continue
      if (w.gate && alongGate < half && open) continue   // aperture → free (CC4: not while the pen is shut)
      const s = smoothstep(p.r_fence, 0, Math.max(0, w.d))
      fx += w.nx * s; fy += w.ny * s
    }
    return { x: fx, y: fy }
  }

  // Ambient-cone flee + boldness gate. Records `stress` (incoming threat T),
  // `fleeFwd` (forward push toward the goal, for the crush metric), and `panic`.
  //   T = smoothstep(R_flee,0,dist) · [ambient + (1−ambient)·max(0,cosθ)^coneK] · intensity
  // Boldness: below boldness·θ a sheep ignores the dog (and may protest); high T
  // trips a panic sprint (bolting through gaps). Returns the flee force.
  flee(i, dt) {
    const p = this.p, a = this.sheep[i], d = this.dog
    a.fleeFwd = 0; a.panic = false
    const to = { x: a.pos.x - d.pos.x, y: a.pos.y - d.pos.y } // dog → sheep
    const dist = vec2.len(to)
    // E5 (POC-v7) / E6 (POC-v9): while DRIVING the eye cone reaches further —
    // walk-on by driveConeExt (+50 %), easy by its own easyConeExt (+30 %,
    // owner 2026-08-24) — and EASY's cone NARROWS to easyConeDeg (30° full
    // width at half strength; walk-on keeps coneK ≈ 90°). The ambient floor
    // keeps R_flee in every mode.
    const easy = d.command === 'easy'
    const driving = d.command === 'walk_on' || easy
    const lying = d.command === 'lie_down'
    const Rf = p.R_flee * (a.kind === 'yearling' ? p.yearlingFlightScale : 1) // FO10: she moves off from much further away
    const Rc = Rf * (driving ? 1 + (easy ? p.easyConeExt : p.driveConeExt) : 1)
    // D3 (POC-v9): lie-down's block BEAM reaches lieConeExt beyond the normal
    // eye (+15 %) at lieConeDeg width (40°); the ambient FLANKS keep the short
    // postureRange reach, so off-beam gate relief survives.
    const Rp = Rf * p.postureRange, Rb = Rf * (1 + p.lieConeExt)
    const reach = lying ? Math.max(Rp, Rb) : Rc
    // FO6 (owner Q84): the stubborn ram. An advancing dog inside ramStandDist
    // makes him stop and face the dog; he gives way once the dog is beyond
    // ramStandRelease, or has lain down for ramStandWait (after which he will
    // not stand again for as long). Owner 2026-11-18: a DIRECT walk-on held on
    // him for ramYieldWait also breaks the challenge — he turns and slow-trots
    // away from the dog for ramYieldDur (walk-on stops short of the flock, so
    // without this a challenged ram never moved again).
    if (a.kind === 'ram') {
      if (a.standCool > 0) a.standCool -= dt
      if (a.stand) {
        a.standLie = lying ? a.standLie + dt : 0
        a.standFace = d.command === 'walk_on' ? a.standFace + dt : 0
        if (dist > p.ramStandRelease) a.stand = false
        else if (a.standLie >= p.ramStandWait) { a.stand = false; a.standCool = p.ramStandWait }
        else if (a.standFace >= p.ramYieldWait) { a.stand = false; a.yieldT = p.ramYieldDur; a.standCool = p.ramYieldDur + p.ramStandWait }
      } else if (dist < p.ramStandDist && dist > 1e-6 && a.standCool <= 0 &&
                 (d.vel.x * to.x + d.vel.y * to.y) / dist > p.stallSpeed) { a.stand = true; a.standLie = 0; a.standFace = 0 }
      if (a.yieldT > 0) {                     // yielding: straight away from the dog, whatever he feels
        a.yieldT -= dt
        if (a.protest > 0) a.protest -= dt
        a.stress = Math.max(a.stress, p.trotPressMin)
        return dist > 1e-6 ? { x: 2 * to.x / dist, y: 2 * to.y / dist } : { x: 0, y: 0 } // ×2: enough push to reach the slow trot
      }
    }
    const sp = this.blackPanic ? this.spookOn(a) : null // FO8: spooked by a panicking black sheep
    if (dist >= reach || dist < 1e-6) {
      if (a.protest > 0) a.protest -= dt
      if (sp) { a.stress = sp.t; if (sp.t > p.panicThreshold) a.panic = true; return { x: sp.x * sp.t, y: sp.y * sp.t } }
      a.stress = 0; return { x: 0, y: 0 }
    }
    const dir = { x: to.x / dist, y: to.y / dist }            // flee away from dog
    // D4 (POC-v10): an offset down swings the whole directional term — the eye
    // axis is facing + lieSide × downConeOffsetDeg (lieSide is 0 off lie-down).
    const eyeDir = d.facing + d.lieSide * p.downConeOffsetDeg * Math.PI / 180
    const cosT = Math.max(0, dir.x * Math.cos(eyeDir) + dir.y * Math.sin(eyeDir))
    // Posture profile (POC-v3 D1, reshaped POC-v9 D3): a lying dog is a WALL,
    // not a pusher — a fierce NARROW beam (lieConeDeg wide, reaching Rb) with
    // faint SHORT ambient flanks (postureRange — darting space, gate relief).
    // (Stand shared this profile until POC-v6 retired it for easy.)
    const block = lying ? p.lieDownBlock : 0
    let T
    if (block > 0) {
      const gp = dist < Rp ? smoothstep(Rp, 0, dist) : 0      // flanks fade out at postureRange
      const gb = smoothstep(Rb, 0, dist)                      // beam fades out at its extended reach
      T = gp * p.ambient * p.lieDownIntensity + gb * Math.pow(cosT, coneKFromDeg(p.lieConeDeg)) * block
    } else {
      const gA = smoothstep(Rf, 0, dist)                      // ambient floor: 1 at contact → 0 at R_flee
      const gC = smoothstep(Rc, 0, dist)                      // eye cone: 1 at contact → 0 at the (extended) reach
      const kEye = easy ? coneKFromDeg(p.easyConeDeg) : p.coneK // E6: easy's tight cone
      const eye = p.ambient * gA + (1 - p.ambient) * gC * Math.pow(cosT, kEye) // = g·eye of v6 when Rc = R_flee
      T = eye * d.intensity * (d.impulseFactor || 1)          // E3 from easy scales the drive eye (POC-v6 Q32)
    }
    // Cover: a stand / rock between the dog and this sheep hides it from him —
    // the pressure fades by how deep the sight line cuts into the obstacle.
    if (T > 0 && p.obstacleCover > 0 && this.obstacles.length) T *= 1 - p.obstacleCover * this.coverBetween(d.pos, a.pos)
    if (a.kind === 'ram') T *= p.ramFleeScale // FO6: he feels less of the dog
    else if (a.kind === 'black') T *= p.blackThreatScale // FO8: she feels more of him
    if (sp) T += sp.t
    a.stress = T
    if (a.stand) return { x: 0, y: 0 }        //   …and standing, yields nothing
    const hold = a.boldness * p.boldnessTheta

    if (a.protest > 0) {                    // active protest → brief stamp toward dog
      a.protest -= dt
      return vec2.scale(dir, -0.5 * T)
    }
    if (T < hold) {                         // brave enough to ignore → graze
      if (T > 0.6 * hold && this.rng() < p.protestProb * dt) a.protest = p.protestDur
      return { x: 0, y: 0 }
    }
    if (T > p.panicThreshold) a.panic = true // panic sprint → can bolt through a gap
    const f = vec2.scale(dir, T)
    // goal-ward component feeds crush (P6: projected on the live goal
    // direction — the gate can be on any side now, not just +x)
    const tg = vec2.norm(vec2.sub(p.goal, a.pos))
    a.fleeFwd = Math.max(0, f.x * tg.x + f.y * tg.y)
    return f
  }

  integrate(i, dt) {
    const s = this.sheep[i], p = this.p
    if (s.down) { s.vel = { x: 0, y: 0 }; s.gatePullNext = 0; return } // injured → frozen obstacle

    // Once out the perimeter gate a sheep commits forward and never turns back
    // (P6 — the v1 `through` mechanic in the gate's frame): it fans into the
    // pen apron just outside the fence and settles there, out of the sim.
    if (s.through) {
      s.fwdPush = 0; s.stress = 0; s.gatePullNext = 0
      const g = this.gate
      if (!s.throughDir) {
        const fan = (this.rng() - 0.5) * 0.9   // spread the pen, don't queue on a line
        s.throughDir = vec2.norm({ x: g.nx + g.tx * fan, y: g.ny + g.ty * fan })
      }
      s.vel = vec2.scale(s.throughDir, p.vMax * 0.6)
      s.pos = vec2.add(s.pos, vec2.scale(s.vel, dt))
      const out = (s.pos.x - g.x) * g.nx + (s.pos.y - g.y) * g.ny
      const lim = p.fenceInset - 8             // settle inside the canvas apron
      if (out > lim) {
        s.pos.x -= g.nx * (out - lim); s.pos.y -= g.ny * (out - lim)
        s.vel = { x: 0, y: 0 }
      }
      s.pos.x = Math.max(4, Math.min(p.canvasW - 4, s.pos.x))
      s.pos.y = Math.max(4, Math.min(p.canvasH - 4, s.pos.y))
      if (vec2.len(s.vel) > 2) s.facing = Math.atan2(s.vel.y, s.vel.x)
      return
    }
    const nbrs = this.neighborsOf(i)   // one query, shared by all forces

    const fSep = this.separation(i, nbrs)
    const fCoh = this.cohesion(i, nbrs)
    const fAli = this.alignment(i, nbrs)
    const fFlee = this.flee(i, dt)
    const fFen = this.fenceForce(s.pos)
    const fObs = this.obstacleForce(i) // round the stands / rocks; .a relaxes cohesion below
    // Commitment funnel (P7 — G1): a WORKED sheep (not idle; the B1/B2
    // hysteresis keeps it alert ~calmDelay after pressure drops, which covers
    // the last body-lengths with no dog) inside gateApproachR with real
    // gateward speed (stallSpeed is the momentum floor) COMMITS: it gains a
    // bias toward/through the mouth that outweighs the posts' repulsion and
    // crowd back-push. Commitment is STICKY until the sheep is through — a
    // per-tick force stalled sheep mid-zone whenever a neighbor bump or the
    // calm timer cut the condition (measured: 6/10 lingered at the threshold
    // after the dog quit a jam). The leash (1.5×R) is the escape hatch: shoved
    // well clear → uncommitted, so the dog can still pull sheep off the mouth
    // and idle grazers are never sucked in (they can't trip it — idle sheep
    // don't commit).
    // Gate attraction (POC-v7 — G2/G3): within gateAttractR of the mouth a
    // sheep is DRAWN to it, whatever the dog is doing; a sheep in close
    // proximity (gateFollowR) to one being drawn is drawn after IT, at
    // gateFollowDecay of its pull — and so on down the line, so the flock
    // files through in a column instead of pressing the posts as a wall.
    // Followers steer at their lead, not the mouth (that is what makes the
    // column); the lead is read from LAST tick's pull (one hop per tick,
    // index-order-free). The draw counts as arousal for the idle machine
    // below — a drawn sheep does not graze its way through the gate.
    let fGate = { x: 0, y: 0 }
    {
      const gt = this.gate
      const gdist = vec2.dist(s.pos, gt)
      // G5 (POC-v13): inside the cone toward the trot leaders the draw reaches
      // further (updateGateCone owns len/ang). Grazing sheep never feel the
      // extra reach — a far-off column must not hoover up bystanders.
      let reach = p.gateAttractR
      const cone = this.gateCone
      if (cone.len > 0 && !s.idle && gdist > 1e-6) {
        const half = p.gateConeDeg / 2 * Math.PI / 180
        const cosT = ((s.pos.x - gt.x) * Math.cos(cone.ang) + (s.pos.y - gt.y) * Math.sin(cone.ang)) / gdist
        reach += cone.len * smoothstep(Math.cos(half), Math.cos(half * 0.5), cosT)
      }
      let pull = p.gateAttractR > 0 && this.penOpen() ? smoothstep(reach, p.gateAttractR * 0.5, gdist) : 0 // CC4: a shut pen draws nobody
      let lead = -1
      if (pull < 1 && p.gateFollowR > 0 && p.gateFollowDecay > 0) {
        for (const n of nbrs) {
          if (n.d >= p.gateFollowR) break  // sorted → the rest are farther
          const b = this.sheep[n.j]
          if (b.down || b.through) continue
          const hp = b.gatePull * p.gateFollowDecay
          if (hp > pull) { pull = hp; lead = n.j }
        }
      }
      if (pull < 0.02) { pull = 0; lead = -1 }  // the column dies out (~0.6^8) rather than tailing off forever
      s.gatePullNext = pull; s.gateLead = lead
      if (pull > 0) {
        const at = lead >= 0 ? this.sheep[lead].pos : { x: gt.x + gt.nx * 8, y: gt.y + gt.ny * 8 }
        const to = vec2.sub(at, s.pos)
        if (vec2.len(to) > 1e-4) fGate = vec2.scale(vec2.norm(to), pull)
      }
    }
    let fThrough = { x: 0, y: 0 }
    {
      const gt = this.gate
      const gdist = vec2.dist(s.pos, gt)
      if (!this.penOpen()) s.committed = false
      else if (!s.committed && !s.idle && gdist < p.gateApproachR) {
        const outSpeed = s.vel.x * gt.nx + s.vel.y * gt.ny
        if (outSpeed > p.stallSpeed) s.committed = true
      }
      if (s.committed) {
        if (gdist > p.gateApproachR * 1.5) s.committed = false
        else fThrough = vec2.norm({ x: gt.x + gt.nx * 8 - s.pos.x, y: gt.y + gt.ny * 8 - s.pos.y })
      }
    }
    // goal-ward push from the crowd behind + the dog — spikes when a sheep is
    // jammed against the pile at the gate. Feeds the crush metric. (P6:
    // projected on the live goal direction, not +x.)
    const tGoal = vec2.norm(vec2.sub(p.goal, s.pos))
    s.fwdPush = Math.max(0, (fSep.x + fFlee.x) * tGoal.x + (fSep.y + fFlee.y) * tGoal.y)

    // idle ⇄ alert state machine (POC-v2 B1/B2). Threat dissolves idle
    // instantly; idle only resumes after calmDelay of continuous zero threat
    // (hysteresis — no flicker at the threat boundary), re-deriving the
    // sheep's group from whoever settled nearby.
    // FO5 (POC-v14): a lamb is drawn to its mother — and, once she is penned,
    // to the gate after her. Out of reach of her it is alert, not grazing.
    let fLamb = { x: 0, y: 0 }
    if (s.kind === 'lamb' && s.mother >= 0 && this.sheep[s.mother] && !this.sheep[s.mother].down) {
      const mum = this.sheep[s.mother], gt = this.gate
      const at = mum.through ? { x: gt.x + gt.nx * 8, y: gt.y + gt.ny * 8 } : mum.pos
      const to = vec2.sub(at, s.pos), dm = vec2.len(to)
      const gap = mum.through ? 0 : p.r_sep
      if (dm > gap + 1e-4) fLamb = vec2.scale(vec2.norm(to), smoothstep(gap, gap + p.idleCohRadius, dm))
    }
    const lambFar = vec2.len(fLamb) > 0.5
    if (s.stress > 0 || s.gatePullNext > 0 || s.trot || s.trotEase > 0 || lambFar || s.stand || s.yieldT > 0) { // threat, the gate's draw (G2), a trot (T2), a lamb after its mother or a standing ram keeps a sheep alert
      s.idle = false
      s.calmT = 0
    } else if (!s.idle) {
      s.calmT += dt
      if (s.calmT >= p.calmDelay) this.enterIdle(i)
    }
    const idle = s.idle

    // Idle drive (POC-v2 A1–A3, B2). Grazers stand still with occasional
    // shuffle-steps — unless CROWDED (more than crowdTolerance strangers within
    // idleCohRadius), in which case they drift away from the local crowd until
    // the neighborhood thins: this is what re-scatters a released blob into
    // loose groups, with no timers to go stale. Wanderers drift; alert sheep
    // keep the original restless wander. The graze force steers toward
    // `grazeTarget` speed (0 = active braking), normalized by vMax.
    let grazeTarget
    if (!idle) {
      s.heading += (this.rng() - 0.5) * 2 * p.wanderTurn * dt
      grazeTarget = p.grazeSpeed
    } else if (s.wanderer) {
      s.heading += (this.rng() - 0.5) * 2 * p.wanderTurn * 0.3 * dt // lazy drift, holds direction
      grazeTarget = p.grazeSpeed
    } else {
      let cx = 0, cy = 0, crowd = 0
      for (const n of nbrs) {
        if (n.d >= p.idleCohRadius) break // sorted → the rest are farther
        const b = this.sheep[n.j]
        if (b.group !== s.group) { cx += b.pos.x; cy += b.pos.y; crowd++ }
      }
      if (crowd > p.crowdTolerance) { // B2: too many strangers → find some space
        s.heading = Math.atan2(s.pos.y - cy / crowd, s.pos.x - cx / crowd)
        grazeTarget = p.grazeSpeed
      } else {
        s.grazeTimer -= dt
        if (s.grazeTimer <= 0) { // shuffle-step: new direction, brief move, re-settle
          s.heading = this.rng() * Math.PI * 2
          s.stepTime = p.grazeStepLen / Math.max(1, p.grazeSpeed)
          s.grazeTimer = p.grazeStepEvery * (0.5 + this.rng())
        }
        if (s.stepTime > 0) { s.stepTime -= dt; grazeTarget = p.grazeSpeed } else grazeTarget = 0
      }
    }
    const gdir = { x: Math.cos(s.heading), y: Math.sin(s.heading) }
    const fGrz = vec2.scale(vec2.sub(vec2.scale(gdir, grazeTarget), s.vel), 1 / p.vMax)

    // A8: soft keep-out around a stood-down dog — idle sheep drift away from it.
    // Not the flee force: no stress, no panic, no speed change; idle motion only.
    let fAvoid = { x: 0, y: 0 }
    if (idle && this.dog.atHeel) {
      const adx = s.pos.x - this.dog.pos.x, ady = s.pos.y - this.dog.pos.y
      const ad = Math.hypot(adx, ady)
      if (ad < p.dogAvoidRadius && ad > 1e-4) {
        const m = 1 - ad / p.dogAvoidRadius        // 1 at contact → 0 at radius
        fAvoid = { x: (adx / ad) * m, y: (ady / ad) * m }
      }
    }

    // Trot drive (POC-v9 T2): a lead presses on along the locked column
    // heading, a follower files after its lead — steered toward trot pace
    // (trotSpeedMult × vMax), the same steer-to-velocity shape as graze.
    let fTrot = { x: 0, y: 0 }
    if (s.trot) {
      let tdir
      if (s.trotLead >= 0) {
        const tto = vec2.sub(this.sheep[s.trotLead].pos, s.pos)
        tdir = vec2.len(tto) > 1e-4 ? vec2.norm(tto) : { x: 0, y: 0 }
      } else {
        // G5: a lead the gate is drawing re-locks its column heading to where
        // it is actually going, so the line bends into the mouth, not past it
        if (s.gatePullNext > 0 && vec2.len(s.vel) > 2) s.trotHeading = Math.atan2(s.vel.y, s.vel.x)
        tdir = { x: Math.cos(s.trotHeading), y: Math.sin(s.trotHeading) }
      }
      fTrot = vec2.scale(vec2.sub(vec2.scale(tdir, this.trotPace(s)), s.vel), 1 / p.vMax)
    } else if (s.trotEase > 0) {
      // T7 wind-down (POC-v13): out of the trot and unpressured, it walks on
      // along its line while the pace eases from trot to a stand; calmDelay
      // later it grazes. Felt pressure hands it straight back to the flee.
      if (s.stress > 0 || p.trotWindDown <= 0) s.trotEase = 0
      else {
        const u = Math.min(1, s.trotEase / p.trotWindDown)
        const tdir = { x: Math.cos(s.trotEaseDir), y: Math.sin(s.trotEaseDir) }
        fTrot = vec2.scale(vec2.sub(vec2.scale(tdir, this.trotPace(s) * u), s.vel), 1 / p.vMax)
        s.trotEase = Math.max(0, s.trotEase - dt)
      }
    }

    // accel = accelScale · (w_sep·F_sep + w_coh·F_coh + w_align·F_align + w_graze·F_graze)
    // All forces share one global scale → tuning stays intuitive.
    // (P3 adds flee, P7 fence — summed here.)
    let accel = { x: 0, y: 0 }
    accel = vec2.add(accel, vec2.scale(fSep, p.w_sep))
    accel = vec2.add(accel, vec2.scale(fCoh, p.w_coh * (1 - fObs.a * p.obstacleSplit))) // a sheep working round an obstacle lets go of the group → it parts in two
    accel = vec2.add(accel, vec2.scale(fAli, p.w_align))
    accel = vec2.add(accel, vec2.scale(fGrz, p.w_graze))
    accel = vec2.add(accel, vec2.scale(fAvoid, p.w_avoid))
    accel = vec2.add(accel, vec2.scale(fFlee, p.w_flee))
    accel = vec2.add(accel, vec2.scale(fFen, p.w_fence))
    accel = vec2.add(accel, vec2.scale(fObs, p.w_obstacle))
    accel = vec2.add(accel, vec2.scale(fThrough, p.w_through))
    accel = vec2.add(accel, vec2.scale(fGate, p.w_gateAttract))
    accel = vec2.add(accel, vec2.scale(fTrot, p.w_trot))
    accel = vec2.add(accel, vec2.scale(fLamb, p.lambFollow))
    accel = vec2.scale(accel, p.accelScale)
    if (s.stand) accel = { x: 0, y: 0 } // FO6: a standing ram is rooted (damping stops him)

    // integrate: v ← clampLen((v + a·dt)·damping, vMax) ; p ← p + v·dt
    // panicking sheep get a higher speed cap so they can bolt; idle sheep are
    // hard-capped low so the unpressured field stays calm (A1).
    // Gaits (POC-v13, owner 2026-11-16): walk ≤ walkSpeed · slow trot · full trot · panic sprint
    let vmax = s.panic ? p.vMax * p.panicMult : Math.min(p.walkSpeed, p.vMax)
    if (s.trot) vmax = Math.max(vmax, this.trotPace(s)) // a trot outruns the walk cap (still below panic)
    if (idle) vmax = Math.min(vmax, p.idleSpeedCap)
    if (s.kind === 'ram') vmax *= p.ramSpeedScale // FO6
    if (s.yieldT > 0) vmax = Math.max(vmax, p.trotSlowSpeed) // …but a yielding ram leaves at the slow trot
    s.vel = clampLen(vec2.scale(vec2.add(s.vel, vec2.scale(accel, dt)), p.damping), vmax)
    s.pos = vec2.add(s.pos, vec2.scale(s.vel, dt))
    if (this.obstacles.length) this.pushOut(s.pos, 2, s.vel) // obstacles are solid

    // hard boundary clamp + zero the outward velocity component — EXCEPT
    // outward through the gate mouth (P6): a sheep carried past the wall line
    // inside the gate span has left the field and is `through`.
    const r = this.playRect(), gt = this.gate
    const alongGate = Math.abs((s.pos.x - gt.x) * gt.tx + (s.pos.y - gt.y) * gt.ty)
    const outGate = (s.pos.x - gt.x) * gt.nx + (s.pos.y - gt.y) * gt.ny
    if (alongGate < p.gateWidth / 2 && outGate > 0 && this.penOpen()) {
      s.through = true
      this.onPenned(s) // POC-v14: the count-up score is paid here
    } else {
      let into = 0 // speed INTO the fence at the moment of contact (SC16 fence slam) — read only, the clamp is unchanged
      if (s.pos.x < r.x0) { into = Math.max(into, -s.vel.x); s.pos.x = r.x0; if (s.vel.x < 0) s.vel.x = 0 }
      if (s.pos.x > r.x1) { into = Math.max(into, s.vel.x); s.pos.x = r.x1; if (s.vel.x > 0) s.vel.x = 0 }
      if (s.pos.y < r.y0) { into = Math.max(into, -s.vel.y); s.pos.y = r.y0; if (s.vel.y < 0) s.vel.y = 0 }
      if (s.pos.y > r.y1) { into = Math.max(into, s.vel.y); s.pos.y = r.y1; if (s.vel.y > 0) s.vel.y = 0 }
      if (into > p.fenceSlamSpeed) this.fenceSlam(s)
    }

    // stable facing: track heading only when actually moving (no flicker at rest)
    if (s.stand) s.facing = Math.atan2(this.dog.pos.y - s.pos.y, this.dog.pos.x - s.pos.x) // FO6: he faces the dog
    else if (vec2.len(s.vel) > 2) s.facing = Math.atan2(s.vel.y, s.vel.x)
  }

  // Trot (POC-v9 flock-behavior T1–T3, owner 2026-08-24). T1: a cluster of
  // MORE than trotGroupMin sheep, moving the same way (velocity order
  // parameter ≥ trotAlignMin, mean speed ≥ trotMoveSpeed) under current dog
  // pressure (some member stressed), has a trotTriggerProb per-second chance
  // that its LEAD sheep — the trotLeadCount frontmost along the group heading
  // — break into a trot. T2: flock-mates within trotFollowR of a trotting
  // sheep are pulled in behind IT (one hop per tick, like the G3 gate column)
  // — the flock files after the leads; at trigger time there is a
  // trotBoltProb chance the WHOLE group bolts at once instead. T3: while the
  // dog's pressure is felt the trot holds; once ESCAPED (stress 0) each
  // trotting sheep's per-second chance of dropping back to normal ramps from
  // trotDecayMin to trotDecayMax over trotDecayRamp seconds. All rolls are on
  // the seeded stream; nothing rolls while no group is eligible and nobody
  // trots, so pre-trot runs replay draw for draw.
  // Pace of this sheep's trot (POC-v13): the slow trot unless it is in a
  // whole-group bolt (T2), which runs at the full trot pace.
  trotPace(s) {
    const p = this.p, full = p.vMax * p.trotSpeedMult
    return s.trotFast ? full : Math.min(full, Math.max(p.trotSlowSpeed, Math.min(p.walkSpeed, p.vMax)))
  }

  updateTrot(dt) {
    const p = this.p
    const roll = (perSec) => this.rng() < 1 - Math.pow(1 - Math.min(1, perSec), dt)
    // housekeeping: penned/injured sheep leave the trot; a follower whose
    // lead dropped out carries on as a lead on its own current heading
    for (const s of this.sheep) {
      if (s.trot && (s.down || s.through)) { s.trot = false; s.trotLead = -1; s.trotFreeT = 0; s.trotT = 0 }
      if (!s.trot && s.trotRest > 0) s.trotRest = Math.max(0, s.trotRest - dt) // T6 rest runs down
    }
    // T5 (POC-v13, owner 2026-11-16): the moment the dog ENDS or REVERSES a
    // live flank sweep — parks, lies down, turns back, goes to walk-on / easy
    // — opens a short window in which the group he is pressing may stream
    // off at a trot, away from him (a recall to heel does not count).
    const dg0 = this.dog
    const fsign = dg0.command === 'come_by' ? 1 : dg0.command === 'away' ? -1 : 0
    const sweep = fsign !== 0 && !dg0.flankParked ? fsign : 0
    if (this.trotDogSweep !== 0 && sweep !== this.trotDogSweep && dg0.command !== 'that_ll_do')
      this.trotTurnT = p.trotTurnWindow
    this.trotDogSweep = sweep
    const turning = this.trotTurnT > 0 && p.trotTurnProb > 0
    // T9 (owner 2026-11-16): the T1 trot DEVELOPS under a drive — only once
    // he has been on walk-on / easy for trotDriveDelay seconds.
    this.trotDriveT = dg0.command === 'walk_on' || dg0.command === 'easy' ? (this.trotDriveT || 0) + dt : 0
    if (this.trotTurnT > 0) this.trotTurnT = Math.max(0, this.trotTurnT - dt)
    for (const s of this.sheep) {
      if (!s.trot || s.trotLead < 0) continue
      if (!this.sheep[s.trotLead].trot) {
        s.trotLead = -1
        s.trotHeading = vec2.len(s.vel) > 2 ? Math.atan2(s.vel.y, s.vel.x) : s.facing
      }
    }
    const active = []
    for (let i = 0; i < this.sheep.length; i++)
      if (!this.sheep[i].down && !this.sheep[i].through) active.push(i)
    // T1 trigger — over the same union-find clusters scoring uses
    if ((p.trotTriggerProb > 0 || turning) && active.length > p.trotGroupMin) {
      const { labels } = this.clusterLabels(active)
      const groups = new Map() // label → member indices
      for (const i of active) {
        const l = labels.get(i)
        if (!groups.has(l)) groups.set(l, [])
        groups.get(l).push(i)
      }
      for (const members of groups.values()) {
        if (members.length <= p.trotGroupMin) continue          // "over 20" — strictly more
        let vx = 0, vy = 0, sp = 0, cx = 0, cy = 0, fresh = 0, felt = 0, going = false
        for (const i of members) {
          const s = this.sheep[i]
          vx += s.vel.x; vy += s.vel.y; sp += vec2.len(s.vel)
          cx += s.pos.x; cy += s.pos.y
          if (s.stress > 0 && s.stress >= p.trotPressMin) felt++ // really pressed, not the faint fringe of his eye
          if (s.trot) going = true
          if (!(s.trotRest > 0)) fresh++
        }
        // POC-v13 (owner 2026-11-16): the dog must be WORKING this group — a
        // real share of it pressed. One sheep on the edge of his eye used to
        // be enough, and a group across the field could trot off.
        if (going || felt < Math.max(1, Math.ceil(p.trotPressFrac * members.length))) continue // already going / not pressed
        if (fresh * 2 < members.length) continue                // T6: most of them are still resting from the last trot
        const mag = Math.hypot(vx, vy)
        const flowing = mag / members.length >= p.trotMoveSpeed && sp > 1e-6 && mag / sp >= p.trotAlignMin
        let h
        if (turning) {
          // T5: away from the dog — a bunched, standing group qualifies. If it
          // is already flowing roughly away, split the difference with its line.
          let ax = cx / members.length - dg0.pos.x, ay = cy / members.length - dg0.pos.y
          const al = Math.hypot(ax, ay)
          if (al < 1e-6) continue
          ax /= al; ay /= al
          if (flowing && vx * ax + vy * ay > 0) { ax += vx / mag; ay += vy / mag }
          if (!roll(p.trotTurnProb)) continue
          h = Math.atan2(ay, ax)
        } else {
          if (!flowing || p.trotTriggerProb <= 0) continue      // T1: not really moving / not one direction
          if (this.trotDriveT < p.trotDriveDelay) continue      // T9: no sustained walk-on behind them
          if (!roll(p.trotTriggerProb)) continue
          h = Math.atan2(vy, vx)
        }
        // triggered: the frontmost trotLeadCount along the group heading lead off
        const ux = Math.cos(h), uy = Math.sin(h)
        // T9: the leaders are FRONT AND CENTRE — furthest forward along the
        // heading, marked down by how far out to the side of the group they are
        const mx = cx / members.length, my = cy / members.length
        const lead = (i) => {
          const dx = this.sheep[i].pos.x - mx, dy = this.sheep[i].pos.y - my
          return dx * ux + dy * uy - Math.abs(dy * ux - dx * uy)
        }
        const byFront = members.filter((i) => !(this.sheep[i].trotRest > 0)).sort((i, j) => lead(j) - lead(i))
        const bolt = this.rng() < p.trotBoltProb                // T2: the whole flock goes at once
        const gid = this.trotSeq = (this.trotSeq || 0) + 1
        for (const i of members) this.sheep[i].trotGroup = gid  // only THESE sheep may file in behind
        const n = bolt ? byFront.length : Math.min(p.trotLeadCount, byFront.length)
        for (let k = 0; k < n; k++) {
          const s = this.sheep[byFront[k]]
          s.trot = true; s.trotLead = -1; s.trotHeading = h; s.trotFreeT = 0; s.trotT = 0; s.trotEase = 0; s.trotFast = bolt
        }
      }
    }
    // T2 spread — a sheep close to a trotting one files in behind IT. Reads a
    // snapshot of who already trots, so recruitment is index-order-free.
    const wasTrot = []
    for (const i of active) if (this.sheep[i].trot) wasTrot.push(i)
    if (wasTrot.length && p.trotFollowR > 0) {
      for (const i of active) {
        const s = this.sheep[i]
        if (s.trot || s.trotRest > 0) continue                  // T6: a rested-out sheep is not re-recruited
        let lead = -1, best = p.trotFollowR
        if (s.idle || !s.trotGroup) continue                    // POC-v13: a grazing sheep is never swept into a trot…
        for (const j of wasTrot) {
          if (this.sheep[j].trotGroup !== s.trotGroup) continue  // …nor one from another group (no chaining across the field)
          const dd = vec2.dist(s.pos, this.sheep[j].pos)
          if (dd < best) { best = dd; lead = j }
        }
        if (lead >= 0) { s.trot = true; s.trotLead = lead; s.trotFreeT = 0; s.trotT = 0; s.trotEase = 0; s.trotFast = this.sheep[lead].trotFast }
      }
    }
    // T4 (owner 2026-08-24): a trotting sheep stays REACTIVE to the dog —
    // when the dog is FELT (stress > 0) and stands IN FRONT of its line
    // (within the trotReverseDeg forward cone of its trot direction), it
    // reverses and trots the other way. A follower cuts loose and leads the
    // turn itself; the rest of the column follows its leads round. After the
    // flip the dog is behind, so there is no flip-flop.
    if (p.trotReverseDeg > 0) {
      const dg = this.dog
      const cosLim = Math.cos(p.trotReverseDeg / 2 * Math.PI / 180)
      for (const s of this.sheep) {
        if (!s.trot || s.down || s.through || s.stress <= 0) continue
        const h = s.trotLead >= 0
          ? Math.atan2(this.sheep[s.trotLead].pos.y - s.pos.y, this.sheep[s.trotLead].pos.x - s.pos.x)
          : s.trotHeading
        const dx = dg.pos.x - s.pos.x, dy = dg.pos.y - s.pos.y
        const dd = Math.hypot(dx, dy)
        if (dd < 1e-6) continue
        if ((dx * Math.cos(h) + dy * Math.sin(h)) / dd >= cosLim) {
          s.trotHeading = h + Math.PI
          s.trotLead = -1                      // it leads the turn itself
        }
      }
    }
    // T3 decay. FIRST the fence: a trotting sheep APPROACHING a wall within
    // trotFenceStop (~3 body-lengths) drops the trot outright — 100 %,
    // pressure or not (owner 2026-08-24); it never runs itself into the
    // fence at a trot. The gate mouth is exempt (same aperture as
    // fenceForce) so a column can still trot THROUGH the gate. Then the
    // random decay — only once the dog's pressure is ESCAPED.
    // POC-v13 (owner 2026-11-16) — T6: a trot also has a TIME LIMIT
    // (trotMaxDur), pressure or not, and every drop-out rests (trotRest)
    // before it can trot again. T7: a drop-out that is not at a fence eases
    // down through a walk (trotWindDown) instead of stopping dead.
    const endTrot = (s, ease) => {
      s.trot = false; s.trotLead = -1; s.trotFreeT = 0; s.trotT = 0
      s.trotRest = p.trotRest
      s.trotEase = ease ? p.trotWindDown : 0
      s.trotEaseDir = vec2.len(s.vel) > 2 ? Math.atan2(s.vel.y, s.vel.x) : s.facing
    }
    for (const s of this.sheep) {
      if (!s.trot) {
        if (s.trotEase > 0 && p.trotFenceStop > 0 && this.trotAtFence(s)) s.trotEase = 0 // the walk stops at a fence too
        continue
      }
      if (p.trotFenceStop > 0 && this.trotAtFence(s)) { endTrot(s, false); continue }
      s.trotT += dt
      if (p.trotMaxDur > 0 && s.trotT >= p.trotMaxDur) { endTrot(s, true); continue }
      if (s.stress > 0) { s.trotFreeT = 0; continue }
      s.trotFreeT += dt
      const u = p.trotDecayRamp > 0 ? Math.min(1, s.trotFreeT / p.trotDecayRamp) : 1
      if (roll(p.trotDecayMin + (p.trotDecayMax - p.trotDecayMin) * u)) endTrot(s, true)
    }
  }

  // G5 (POC-v13, owner 2026-11-16): while a trotting line's LEADERS are
  // heading gate-ward, the gate's draw area grows a cone along the axis from
  // the mouth toward them (gateConeGrow px/s, up to gateConeMax, never past
  // the leaders); with none it shrinks back at the same rate. integrate()
  // widens the G2 reach inside the cone; the pages draw it.
  updateGateCone(dt) {
    const p = this.p, gt = this.gate, c = this.gateCone
    let cx = 0, cy = 0, n = 0
    for (const s of this.sheep) {
      if (!s.trot || s.trotLead >= 0 || s.down || s.through) continue
      if (s.vel.x * (gt.x - s.pos.x) + s.vel.y * (gt.y - s.pos.y) <= 0) continue // heading away from the gate
      cx += s.pos.x; cy += s.pos.y; n++
    }
    const step = p.gateConeGrow * dt
    if (n > 0 && step > 0 && p.gateConeMax > 0 && p.gateAttractR > 0) {
      const ax = cx / n - gt.x, ay = cy / n - gt.y
      c.ang = Math.atan2(ay, ax)
      c.len = Math.min(c.len + step, p.gateConeMax, Math.max(0, Math.hypot(ax, ay) - p.gateAttractR * 0.5))
    } else c.len = step > 0 ? Math.max(0, c.len - step) : 0
  }

  // T3 (owner 2026-08-24): is this trotting sheep APPROACHING a wall within
  // trotFenceStop? Same wall + gate-aperture geometry as fenceForce; "approaching"
  // = a real velocity component toward that wall (parallel running is fine).
  trotAtFence(s) {
    const p = this.p, r = this.playRect(), g = this.gate
    const half = p.gateWidth / 2
    const alongGate = Math.abs((s.pos.x - g.x) * g.tx + (s.pos.y - g.y) * g.ty)
    const walls = [ // (vx, vy) points AT the wall
      { d: s.pos.y - r.y0, vx: 0, vy: -1, gate: g.side === 0 },
      { d: r.x1 - s.pos.x, vx: 1, vy: 0, gate: g.side === 1 },
      { d: r.y1 - s.pos.y, vx: 0, vy: 1, gate: g.side === 2 },
      { d: s.pos.x - r.x0, vx: -1, vy: 0, gate: g.side === 3 },
    ]
    for (const w of walls) {
      if (w.d > p.trotFenceStop) continue
      if (w.gate && alongGate < half) continue           // mouth → trot on through
      if (s.vel.x * w.vx + s.vel.y * w.vy > 1) return true
    }
    return false
  }

  // Crush at the gate mouth: local density × forward pressure. Sustained crush
  // over threshold injures a sheep. Lie-down (low intensity → low flee → low
  // fleeFwd) and a dissipating pile both drop crush, so lie-down relieves it.
  updateCrush(dt) {
    const p = this.p, mx = this.gate.x, my = this.gate.y
    let count = 0, sumFwd = 0
    for (const s of this.sheep) {
      if (s.down) continue
      if (Math.hypot(s.pos.x - mx, s.pos.y - my) < p.crushRadius) {
        count++; sumFwd += s.fwdPush
      }
    }
    const forwardPressure = count > 0 ? sumFwd / count : 0
    this.crush = count * forwardPressure
    if (this.crush > p.crushThreshold) this.crushTime += dt
    else this.crushTime = Math.max(0, this.crushTime - dt * 2) // relief decays fast
    // Injuries disabled for now: crush still reads as gate pressure (indicator +
    // stress stay), but sustained crush no longer downs a sheep.
    // if (this.crushTime >= p.crushSustain) { this.injureAtGate(); this.crushTime = 0 }
  }

  // Down the most-central sheep at the mouth (big welfare hit; becomes an obstacle).
  injureAtGate() {
    const p = this.p, mx = this.gate.x, my = this.gate.y
    let best = -1, bestD = p.crushRadius
    for (let i = 0; i < this.sheep.length; i++) {
      const s = this.sheep[i]; if (s.down) continue
      const d = Math.hypot(s.pos.x - mx, s.pos.y - my)
      if (d < bestD) { bestD = d; best = i }
    }
    if (best >= 0) {
      const s = this.sheep[best]
      s.down = true; s.vel = { x: 0, y: 0 }; s.stress = 1; s.cond = 0; this.injuries++
      this.strike('injury', s.pos.x, s.pos.y) // SC16: a sheep going down is a strike
    }
  }

  // Cluster a subset of the flock via union-find (link sheep within clusterDist).
  // One cheap O(m²) pass; returns labels (sheep-index → root), cluster sizes, and
  // the main-blob label. `indices` defaults to the whole flock.
  clusterLabels(indices) {
    const idx = indices || this.sheep.map((_, i) => i)
    const m = idx.length, d2 = this.p.clusterDist * this.p.clusterDist
    const parent = Array.from({ length: m }, (_, k) => k)
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] } return x }
    for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) {
      const s1 = this.sheep[idx[a]], s2 = this.sheep[idx[b]]
      const dx = s1.pos.x - s2.pos.x, dy = s1.pos.y - s2.pos.y
      if (dx * dx + dy * dy <= d2) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb }
    }
    const labels = new Map(), sizes = new Map()
    for (let a = 0; a < m; a++) { const r = find(a); labels.set(idx[a], r); sizes.set(r, (sizes.get(r) || 0) + 1) }
    let mainLabel = -1, mainSize = -1
    for (const [k, v] of sizes) if (v > mainSize) { mainSize = v; mainLabel = k }
    return { labels, sizes, mainLabel }
  }

  distToPath(pt) {
    let best = Infinity
    for (let i = 0; i < this.idealPath.length - 1; i++)
      best = Math.min(best, distToSeg(pt, this.idealPath[i], this.idealPath[i + 1]))
    return best
  }

  // Per-tick scoring bookkeeping (POC-v14 count-up). Points themselves are
  // paid by events (onPenned / award); this keeps the run clock, the
  // statistics the awards read, the stream window, the drive gates, the wave
  // clock, and notices the end of the run (or of a wave).
  updateScore(dt) {
    const p = this.p, run = this.run
    if (run.finished) return
    run.t += dt
    const dev = this.distToPath(this.gcm)
    run.lineDev += Math.min(dev / p.lineNorm, 1) * dt        // line: 0..1/s off-path (a statistic now)
    if (dev <= p.lineOnDist) run.onLine += dt                // SC10 Straight as a Die

    // SC15: the chain lapses when no sheep has crossed for its (tightening) window; SC23: a frenzy runs down
    if (run.comboLive) {
      run.comboT += dt
      if (run.comboT > this.comboWindowNow()) this.endChain(true)
    }
    if (run.frenzyT > 0) run.frenzyT = Math.max(0, run.frenzyT - dt)

    // cohesion is judged over the flock still being worked — exclude penned
    // (succeeded) and down (already penalized) so spanning the gate isn't a "split"
    const active = []
    for (let i = 0; i < this.sheep.length; i++) {
      const s = this.sheep[i]
      if (!s.down && !s.through) active.push(i); else s.stragTime = 0
    }
    if (active.length >= 2) {
      const { labels, sizes, mainLabel } = this.clusterLabels(active)
      let big = 0
      for (const [, v] of sizes) if (v >= p.splitMinSize) big++
      if (big >= 2) run.split += dt                        // cohesion: split
      let stragglers = 0
      for (const i of active) {
        const s = this.sheep[i]
        if (labels.get(i) !== mainLabel) {
          s.stragTime += dt
          if (s.stragTime > p.T_straggle) stragglers++
        } else s.stragTime = 0
      }
      run.strag += (stragglers / active.length) * dt       // cohesion: straggler fraction
    }

    // SC13 / SC14 / SC16: condition, flock value and panic onsets — one pass over the flock.
    // Condition is READ by scoring only; nothing here changes how a sheep moves.
    let sum = 0, cs = 0, val = 0, delta = 0, hit = null
    for (const s of this.sheep) {
      sum += s.stress
      if (s.down) s.cond = 0
      else if (!s.through) {
        s.stressAvg = p.penStressMemory > 0 ? s.stressAvg + (s.stress - s.stressAvg) * Math.min(1, dt / p.penStressMemory) : s.stress
        const c0 = s.cond
        if (s.panic) s.cond -= p.condPanicDrain * dt
        else if (s.trot) s.cond -= p.condTrotDrain * dt
        else if (s.idle) s.cond += p.condRecover * dt
        s.cond = Math.max(Math.min(c0, p.condFloor), Math.min(1, s.cond))
        delta += s.cond - c0
        if (s.trot) run.trotEver = true
        if (s.panic && !s.wasPanic && run.t - s.panicAt >= p.panicRearm) {
          s.panicAt = run.t; run.panics++
          if (p.strikePanics > 0 && run.panics % p.strikePanics === 0) hit = s
        }
        s.wasPanic = s.panic
        val += p.penPerfectPoints * s.cond * this.kindWorth(s)
      }
      cs += s.cond
    }
    const n = this.sheep.length
    run.stress += n ? (sum / n) * dt : 0 // calm: mean-stress integral
    run.value = val
    run.condMean = n ? cs / n : 1
    if (run.condMean < run.condMin) run.condMin = run.condMean
    run.draining = delta < -1e-9
    if (hit) { this.strike('panic', hit.pos.x, hit.pos.y); if (run.finished) return }

    if (this.driveGates.length) this.updateDriveGates()    // FO2 / FO7

    // The pen is full when every sheep still on its feet is in it: an injured
    // (down) sheep — or one lost to the assault (SC11) — never scores, and no
    // longer holds the run open.
    let penned = 0, down = 0
    for (const s of this.sheep) { if (s.through) penned++; else if (s.down) down++ }
    const full = n > 0 && penned >= n - down
    if (p.mode === 'waves') {                              // RM5 / RM6
      if (full) {
        if (penned > 0) this.payWave()
        this.nextWave()
      }
      run.clock -= dt
      if (run.clock <= 0) { run.clock = 0; this.finishRun() }
      return
    }
    if (full) { run.won = penned > 0; this.finish(penned) }
  }

  // RM5 + SC18 (owner-default Q98): a wave's pen has filled — its own play points take the end multipliers.
  payWave() {
    const p = this.p, run = this.run, g = this.gate
    let m = p.multFullFlock
    if (run.strikes === run.waveStrikes) m *= p.multClean
    if (run.tiers.rushed === run.waveRushed) m *= p.multAllCalm
    this.award('mult', (this.points - run.wavePoints) * (m - 1), g.x, g.y, 'WAVE ×' + (+m.toFixed(2)))
  }

  // The player (or a bust, or the wave clock) ends the run without a full pen.
  finishRun() {
    if (this.run.finished) return
    let penned = 0
    for (const s of this.sheep) if (s.through) penned++
    this.finish(penned)
  }

  // The run is over — won (run.won set by the caller) or not. Close the chain
  // (its PERFECT FILE must be paid before anything multiplies), settle awards
  // and side objectives, then pay the end multipliers (SC18–SC20, SC22) and,
  // on a win, the small time bonus (SC17).
  finish(penned) {
    const p = this.p, run = this.run, g = this.gate
    if (run.finished) return
    const oneGo = run.won && penned >= 2 && run.chains === 1 && run.breaks === 0 && run.comboLive && run.chain.n === penned
    this.endChain(false)
    run.finished = true
    if (p.mode === 'waves') { run.playPoints = this.points; return }
    if (run.won) {
      const give = (name) => {
        const a = AWARDS.find((x) => x.name === name)
        const mult = a.rarity === 'legendary' ? p.multAwardLegendary : a.rarity === 'rare' ? p.multAwardRare : p.multAwardCommon
        run.awards.push(name); run.awardList.push({ name, rarity: a.rarity, mult })
      }
      const par = this.par(), allow = this.quietAllowance()
      if (run.commands <= allow) give('Quiet Hand')
      if (run.t > 0 && run.onLine / run.t >= p.lineAwardShare) give('Straight as a Die')
      if (Math.abs(par - run.t) <= p.photoFinishSecs) give('Photo Finish')
      if (this.driveGates.length > 0 && this.driveGates.every((d) => d.done)) give('Gatekeeper')
      if (run.tiers.rushed === 0 && run.strikes === 0) give('Not a Hair Out of Place')
      if (run.lieDowns === 0) give('Never Sat')
      if (run.fullFlanks === 0) give('Steady Away')
      if (run.condMin >= p.fullPurseShare) give('Full Purse')
      if (run.tiers.perfect === penned) give('Sunday Stroll')
      if (!run.trotEver && run.panics === 0) give('Nobody Ran')
      if (run.commands <= allow / 2) give('Not a Word Wasted')
      if (oneGo) { this.jackpot('onego'); this.note('onego', 'ONE GO — the whole flock in one chain', g.x, g.y) }
    }
    for (const o of this.sideObjectives.slice())
      if (o.state === 'open') this.setObjective(o.id, run.won && SIDE_OBJECTIVES_AT_WIN.has(o.id) ? 'met' : 'lost')
    run.playPoints = this.points
    run.endMults = this.endMultipliers(penned, oneGo)
    run.endMult = run.endMults.reduce((m, e) => m * e.mult, 1)
    this.award('mult', run.playPoints * (run.endMult - 1), g.x, g.y, 'RUN ×' + (+run.endMult.toFixed(2)))
    if (run.won) {
      const under = Math.floor(Math.max(0, this.par() - run.t))
      this.award('time', under * p.parPointsPerSec, g.x, g.y, 'UNDER PAR +' + Math.round(under * p.parPointsPerSec))
    }
  }

  // SC18–SC20, SC22, FO11: the multipliers a finished run has earned, each its own card line.
  endMultipliers(penned, oneGo) {
    const p = this.p, run = this.run, n = this.sheep.length, list = []
    const add = (key, label, mult) => { if (mult > 0 && Math.abs(mult - 1) > 1e-9) list.push({ key, label, mult }) }
    if (run.won) add('flock', 'Full flock', p.multFullFlock)
    else if (penned > 0 && n > 0) add('flock', `Part of the flock (${penned}/${n})`, 1 + (p.multFullFlock - 1) * penned / n) // SC20
    if (run.won && run.strikes === 0) add('clean', 'Clean run', p.multClean)
    if (penned > 0 && run.tiers.rushed === 0 && (run.won || penned >= n / 2)) add('calm', 'All calm', p.multAllCalm)
    if (run.won) {
      if (oneGo) add('onego', 'One go', p.multOneGo)
      for (const a of run.awardList) add('award', a.name, a.mult)
      for (const o of this.sideObjectives) if (o.state === 'met') add('objective', o.label, p.multSideObjective)
    }
    return list
  }

  // VH7 / VH8 (owner Q104): the REFERENCE run this course is measured against —
  // every sheep penned CALM at full condition in one chain, flock full, no
  // strikes; no jackpots, drive gates, awards or side objectives. Closed form.
  referenceScore() {
    const p = this.p, n = this.sheep.length
    if (p.mode === 'waves' || n === 0) return 0
    let k = 0
    for (const s of this.sheep) k += this.kindWorth(s)
    const G = this.compPath ? this.driveGates.length : 0 // CC: the required gates are part of a textbook run — their points, and their multiplier on every crossing
    return Math.round((p.penCalmPoints * (k / n) * (n * (n + 1) / 2 + n * G * p.driveGateMult) + n * G * p.driveGatePoints) * p.multFullFlock * p.multClean * p.multAllCalm)
  }

  // VH7: the named rank for the run so far. A bust ranks no higher than Farmhand. null where there is no reference (waves).
  rank() {
    const p = this.p, run = this.run
    if (!(run.reference > 0)) return null
    const pct = this.points / run.reference, thr = [0].concat(RANK_KEYS.map((k) => p[k]))
    let i = 0
    for (let j = 1; j < thr.length; j++) if (pct >= thr[j]) i = j
    if (run.bust) i = Math.min(i, 1)
    const next = !run.bust && i + 1 < thr.length ? { name: RANKS[i + 1], points: Math.max(0, Math.ceil(thr[i + 1] * run.reference - this.points)) } : null
    return { index: i, name: RANKS[i], percent: pct, next }
  }

  grade(v) {
    const p = this.p, L = ['A', 'B', 'C', 'D', 'E']
    for (let i = 0; i < L.length; i++) if (v >= p.gradeA - p.gradeStep * i) return L[i]
    return 'F'
  }

  // VH9: four category values in 0–1 with their letter grades.
  categories() {
    const p = this.p, run = this.run, n = this.sheep.length, c = run.crossings
    const tier = c ? (run.tiers.perfect + p.gradeCalmCredit * run.tiers.calm) / c : 0
    const calm = c ? (tier + run.condMin) / 2 : run.condMin * 0.5
    const flow = n ? Math.min(1, run.longest / n) : 0
    const cmd = run.commands > 0 ? Math.min(1, this.quietAllowance() / run.commands) : 1
    const control = (cmd + (run.t > 0 ? run.onLine / run.t : 0)) / 2
    const safety = Math.max(0, 1 - (p.strikeMax > 0 ? run.strikes / p.strikeMax : 0) - p.safetyPanicCost * run.panics)
    const out = {}
    for (const [k, v] of [['calm', calm], ['flow', flow], ['control', control], ['safety', safety]]) out[k] = { value: v, grade: this.grade(v) }
    return out
  }

  // The score read-out (pure). `lines` sum to `total`.
  score() {
    const p = this.p, run = this.run, t = this.tally, waves = p.mode === 'waves'
    let penned = 0
    for (const s of this.sheep) if (s.through) penned++
    const par = this.par(), T = run.tiers
    const L = (key, label) => ({ key, label, points: t[key] || 0 })
    const lines = [
      L('pen', `Sheep penned (${T.perfect} perfect · ${T.calm} calm · ${T.rushed} rushed)`),
      L('special', 'Special sheep'),
      L('stream', `Chain (best ×${run.comboBest})`),
      L('frenzy', 'Frenzy'),
      L('gate', 'Drive gates'),
      L('wolf', 'Wolves routed'),
      L('file', 'Perfect file'),
      L('finisher', 'Last sheep'),
      L('mult', waves ? `Wave multipliers (${run.wave} wave${run.wave === 1 ? '' : 's'})` : `Run multiplier ×${+run.endMult.toFixed(2)}`),
      L('time', `Time bonus (${Math.floor(Math.max(0, par - run.t))}s under par)`),
    ].filter((l) => l.points > 0 || l.key === 'pen')
    const rank = this.rank(), win = run.comboLive ? this.comboWindowNow() : 0
    return {
      total: this.points, lines, awards: run.awards.slice(), awardList: run.awardList.slice(),
      penned, calmPenned: run.calmPenned, tiers: { rushed: T.rushed, calm: T.calm, perfect: T.perfect },
      combo: run.comboLive ? run.combo : 1, comboLive: run.comboLive, comboBest: run.comboBest, longest: run.longest,
      mult: (run.comboLive ? run.combo : 1) + run.gateMult, gateMult: run.gateMult,
      comboT: run.comboT, comboWindowNow: win, windowLeft: run.comboLive && win > 0 ? Math.max(0, 1 - run.comboT / win) : 0,
      frenzyT: run.frenzyT, strikes: run.strikes, strikeMax: Math.round(p.strikeMax), panics: run.panics, bust: run.bust,
      flockValue: run.value, valueStart: run.valueStart, condMean: run.condMean, condMin: run.condMin, draining: run.draining,
      playPoints: run.playPoints, endMults: run.endMults.slice(), endMult: run.endMult, jackpots: run.jackpots.slice(),
      objectives: this.sideObjectives.map((o) => ({ id: o.id, label: o.label, hint: o.hint, state: o.state })), specials: run.specials.slice(),
      reference: run.reference, percent: rank ? rank.percent : null, rank, categories: this.categories(),
      par, parLeft: par - run.t, mode: p.mode, wave: run.wave, clock: run.clock,
      won: run.won, finished: run.finished,
      raw: { t: run.t, lineDev: run.lineDev, onLine: run.onLine, strag: run.strag, split: run.split, stress: run.stress, injuries: this.injuries, commands: run.commands, crossings: run.crossings, slams: run.slams },
    }
  }

  step(dt) {
    this.gcm = this.computeGCM()       // flock centroid → dog steering
    this.computeHull()                 // herd perimeter (same set) → flank track (C8)
    if (this.compPath) this.updateAim() // CC6: the dog's current objective (next gate / pen)
    this.stepDog(dt)                   // dog moves first → sheep react to it
    this.updateTrot(dt)                // T1–T7 trot state (POC-v9, v13) → integrate reads it
    this.updateGateCone(dt)            // G5 gate cone (POC-v13) → integrate + overlays read it
    for (let i = 0; i < this.sheep.length; i++) this.integrate(i, dt)
    for (const s of this.sheep) s.gatePull = s.gatePullNext // G3 column reads last tick's pull
    this.blackPanic = null             // FO8: a panicking black sheep spooks her neighbours NEXT tick
    for (const s of this.sheep) if (s.kind === 'black' && s.panic && !s.through && !s.down) { this.blackPanic = { x: s.pos.x, y: s.pos.y }; break }
    this.updateCrush(dt)               // gate crush → injury
    this.updateScore(dt)               // count-up scoring bookkeeping (POC-v14)
    this.ticks++
  }
}
