# POC-v6 Build — Master Plan & Runner

Sixth iteration, one feature — **Dog Commands & Influence v4**
([dog-behavior.md](./dog-behavior.md)): the flank tracks the herd perimeter
to the gate line and hands off to *easy* (**C8/C9**); *easy* replaces
*stand* as a slow forward drive at ~1/3 walk-on speed (**I1–I4**); E2/E3
re-routed to easy; D3 and C7 superseded.

Planned **2026-08-22** on the owner's `/goal` directive, with **Q31–Q36 on
their bolded defaults** (perimeter = hull shape at `flankStandoff`; easy =
drive eye at full intensity; `flankOvershootDeg` kept, default 0, Sweep row
`[0, 0, 60]`; `debug.dogTrack` on; `easySpeedFrac` owned by Standoff;
easy-from-anywhere heads for the trailing spot).

**Why this order:** the perimeter lands first as pure geometry with a parity
check against the §2 hull (nothing behavioral moves yet); *easy* lands
second so the flank has something to hand off to; the flank path + handoff
rewrite lands third on top of both; acceptance runs last over the whole
thing and re-snapshots the defaults.

---

## ▶ Invocation — how to run this plan

**Trigger:** `/sheep implement POC-v6`, "run the v6 plan", "run phase N".

1. Find the **first unchecked phase** below (or the requested one; its
   prerequisite must be ticked).
2. Follow that phase file exactly — implement its Tasks in
   `.claude/sheep/poc/sheep-poc.html` (+ `sheep-defaults.json.js` where a
   schema entry changes), run its Verify. **Measurement convention (owner
   rule, see memory): no webserver.** Measure headless in Node on the
   §0+§1 slice cut at the section markers with lil-gui stubbed (the v4/v5
   method — rebuild the scratchpad harness, it is per-session; follow
   `reseed()` with `setCommand('that_ll_do')` as the page does), fast-forward
   with `sim.step()` loops, metrics per rule ID; anything only observable on
   the page is a static check + the owner's `file://` eyeball.
3. On acceptance: tick the phase here, **STOP, and report** (what was built,
   how to eyeball it from `file://`). ("Run all phases" → continue, reporting
   at each gate; halt on any Verify failure.)
4. After the last phase: run the Definition of done, move `spec/POC-v6/` →
   `implemented/POC-v6/`, mark the feature `implemented`. **Never commit —
   report and stop; git is the owner's.**

**Target files:** `.claude/sheep/poc/sheep-poc.html`,
`.claude/sheep/poc/sheep-defaults.json.js` (+ the root `index.html` /
`sheep-defaults.json.js` mirrors, copied at the end of every phase).

## Global invariants (every phase)

- One HTML file + one defaults file (pure JSON literal in a single
  `const SHEEP_DEFAULTS =`); plain `<script>`; runs from `file://`; lil-gui
  UMD via CDN. **No fnb DB/GraphQL/backend.**
- New tunables enter as **`SETTINGS` schema entries** and are claimed by a
  lever or `LEVER_NOT_LEVERED` — `assertLevers()` at boot is the gate, and
  the **0.5 anchor stays exact** (any profile row whose middle column
  changes is a data edit re-asserted at boot).
- **§1 SIM stays DOM-free and lever-unaware**; the hull moves *into* §1,
  never the canvas; fixed `dt = 1/60` with accumulator.
- **Determinism:** `(seed, params, [commands])` reproduces a run.
- **Regression anchor:** `randomSeedOnLoad: false` + `spawnLayout:
  beside-gate` + `spawnGateClear: 0` + seed 1337/42 is the v4/v5 scenario
  every measurement below reuses. Idle (no command) runs must stay
  **byte-identical** to v5 through P0–P2 — the dog does nothing at heel, so
  nothing in this version may move an idle sheep.
- **POC-v2 A/B, v3 C1–C5/D1/D2/E1/G/H, v4 F1 must not regress.** D3 and C7
  are superseded *by spec*, not broken by accident — the phase that retires
  each one says so.
- **Command-strip highlight = the dog's actual state** (v3 Q5 convention).
- Every phase leaves the page runnable, zero console errors.

## Section map (of `sheep-poc.html`)

`§0 PARAMS` (SETTINGS schema, `LEVERS`, `LEVER_NOT_LEVERED`, `assertLevers`,
`buildParams`, `PANELS`, `buildGui`, HOOKS) · `§1 SIM` (DOM-free; `FlockSim`:
`reseed`/`placeGate`/`spawn`, `computeGCM`, `setCommand`, `stepDog`, `flee`,
`fenceForce`, flock forces — **hull + perimeter radius land here**) ·
`§2 RENDER` (`render`, `drawFlockOutline`/`drawOutlineMarkers`, debug
overlays, `drawDog`, HUD) · `§3 INPUT` (command pad, `HOTKEYS`, `issue`,
inspector, levers panel) · `§4 BOOTSTRAP` (`new FlockSim`, `exportParams`,
Tools, frame loop).

## Phases

| # | File | Goal | Proves |
|---|---|---|---|
| 0 | [phase-0-perimeter.md](./phase-0-perimeter.md) | `convexHull` + `sim.hull` + `perimeterRadius(θ, offset)` in §1; §2 outline draws from `sim.hull`; `debug.dogTrack` overlay | acceptance 8 (outline parity); the geometry the flank will use, measured |
| 1 | [phase-1-easy.md](./phase-1-easy.md) | `easy` command replaces `stand` end to end (§0 `easySpeedFrac`, §1 state machine + impulse + flee, §3 pad/hotkey/CSS, HUD); `standBlock` superseded | I1–I4, amended E2/E3 (acceptance 4–7) |
| 2 | [phase-2-perimeter-flank.md](./phase-2-perimeter-flank.md) | flank point from `perimeterRadius`; signed reach-the-line handoff → `easy`; `flankOvershootDeg` default 0 + Sweep row re-anchored | C8, C9 (acceptance 1–3) |
| 3 | [phase-3-acceptance.md](./phase-3-acceptance.md) | **runs LAST** — full acceptance 1–10 at the anchor, regressions, docs sync, `params-2026-08-22-v6.json`, mirrors | the version's Definition of done |

## Progress tracker

- [x] Phase 0 — Perimeter in §1 (2026-08-22; headless, whole script under
  the DOM/lil-gui stub. `convexHull` moved to §1, `sim.hull` computed per
  step after the GCM, `distToHull` + `perimeterRadius(θ, offset)` (24-step
  bisection); §2 outline draws from `sim.hull`; `debug.dogTrack` overlay.
  Measured: hull parity vs the v5 §2 hull **6/6** (seeds 1337/42/7 at t=0
  and 10 s), track points at `flankStandoff` sit **140.00 px** from the
  nearest sheep on all 72 bearings, offset-0 points on the hull boundary
  (0.000 px), lone sheep → r ≡ 140; idle 10 s digests and come-by/away
  handoff tick + carry **identical to v5** at both seeds (5d37c842 /
  94f7f6c0; 1439/+60.4°, 1640/−85.8°, 1170/+60.3°, 1062/−60.3°). §1 has
  zero DOM refs; boot line `anchor 88/88 · 37 not-levered = 125 keys · OK`)
- [x] Phase 1 — Easy replaces stand (2026-08-22; headless. `easy` end to
  end: §0 `easySpeedFrac` 0.33 (Dog; Standoff lever `[0.4, 0.33, 0.25]`),
  `standBlock` superseded (hidden, not-levered); §1 `COMMANDS` whitelist
  (`setCommand('stand')` → recall), walk-on/easy share one drive body with
  E2 → easy and the E3 envelope + smart return living in easy, lie-down
  alone keeps the posture wall, `flee()` scales the drive eye by the
  impulse; §3 pad `data-cmd="easy"`, hotkey A. Measured (seed 1337):
  **I2** easy closes at **36.3 px/s** (= 0.33 × 110) vs walk-on 110.0;
  **I3** min front gap 40.2 / 39.1 px (≥ 35); **I4** 2 px-mouth jam rig:
  walk-on → **easy at 7.5 s** (v5: stand at 7.5 s — same tick), shove
  ×1.50 hold → 1.28 @ 1.0 s → 1.00 @ 1.5 s, smart return → walk-on at
  1.28 s in both builds; flee @ 50 px ahead: lie-down 0.326 (= v5), easy
  0.624 (= walk-on), easy+shove 0.936; idle digests = v5 at 1337/42;
  come-by still hands to walk-on at v5's tick/carry (P2 changes that);
  E1 38.6–38.9 px; F1 0.000° ×3 seeds; boot `anchor 88/88 · 38
  not-levered = 126 keys · OK`)
- [x] Phase 2 — Perimeter flank + easy handoff (2026-08-22; headless.
  Flank point = `perimeterRadius(flankAngle, flankStandoff)`; the point
  **parks on the gate line** (progress past the station ∈ [0,
  `flankHandoffDeg`] → pinned; no advance while parked; follows the station
  forward only; fence-seek off for a parked point, field clamp kept) and
  the dog converts to **easy** on arrival (< 25 px, 0.5 s arm);
  `flankOvershootDeg` 90 → 0, Sweep row `[0, 0, 60]`. Three as-built
  findings drove that shape: (a) the v4 ± cone fired every run at **−29.6°**
  (30° short); (b) a one-sided window still lapped seed 42 *away* — the dog
  crossed the line 80–170 px from a fence-clamped target; (c) a parked
  point that kept advancing was never reached. Measured at 1337/42,
  come-by/away: handoff **+1.6 / −4.7 / +3.7 / −13.5°** vs the live line
  (−13.5 = field clamp on a wall-side flock), sweeps 148–208°, **0 laps**;
  overshoot 90 still carries (−3.9 / −4.2° vs line+90, sweeps 283/291°).
  **C8 shape** (fence-seek isolated at bias 0): away runs **97 / 98 %** of
  on-station ticks within ±25 px of `flankStandoff` (v5: 11 / 65 %);
  come-by runs are field-clamped 582–618 ticks on a wall-side flock in
  both builds (p50 43–82 px, v5 48–75); mid-field stretched flock p50
  **137 / 140 px** (v5 159 / 196), 66–73 % within ±25 (v5 16–28). C3 eye
  44.9–45.1°, C1 sd 56–112 px, E1 min gap after handoff 46.6–65.1 px, idle
  digests = v5, F1 0.000°; reversal at 4 s: 1337 pure CCW 63°, 42 CCW 152°
  vs CW 31° — the CW part is C2's fence-seek switching off at `reach`
  (target jumps 133 px; pre-existing, v4 logged the same), follow-up)
- [x] Phase 3 — Acceptance & sync (2026-08-22; headless, whole script
  under the DOM/lil-gui stub, POC-v5 loaded side by side. Acceptance 1–10
  **PASS** — table in the spec's acceptance log; regressions A1/A4 (= v5 to
  the decimal), C3, C1, E1, F1 × 7, lie-down flee probe (= v5), G1/Q8,
  H1, levers boot line OK; static: §1 DOM-free, `Math.random` ×2 outside
  §1, `'stand'` only in a comment, defaults file = export (114 keys, 0
  unknown); snapshot `params-2026-08-22-v6.json` = v5 + exactly two keys;
  mirrors `cmp`-identical. Docs synced per DoD 4 (v3 D3/E2/E3 + v4 C7
  superseded notes, control-layout Q-A/Q-B, brainstorming README,
  force-model R3/R4, CONTEXT.md vocabulary, v5 README Q12 moot). Owner's
  `file://` eyeball pending — DoD 4 of 5, named honestly)

**Touch-ups after P3 (owner-directed, 2026-08-22):** `fenceSeekRamp`, `parkFade` — see
the [README](./README.md#touch-up-owner-directed-2026-08-22-after-the-p3-gate).
Re-measured handoffs, reversal, E1, idle digests; snapshot re-exported.

## Definition of done (whole version)

1. **Acceptance 1–10 pass, measured** (dog-behavior.md → Acceptance
   criteria), at seeds 1337 & 42 on the regression anchor.
2. **No regressions** at the anchor: v2 A/B idle metrics, v3 C1–C5 / D1 /
   E1 / G1 spot-checks, v4 F1 facing; idle runs byte-identical to v5.
3. **`'stand'` is gone** from the command set: pad, hotkeys, `setCommand`,
   `stepDog`, `flee`, HUD — grep-clean outside historical comments.
4. **Docs synced:** spec acceptance log filled; POC-v3/v4 specs get a
   one-line "superseded by v6" note on D3 and C7; `control-layout.md` Q-A /
   Q-B resolved; `brainstorming/README.md` + `force-model.md` carry the
   perimeter-flank / easy decision; `CONTEXT.md` vocabulary (Command, State,
   Posture, Handoff, Impulse, + Easy, Perimeter) updated; dated snapshot
   `poc/params-2026-08-22-v6.json`; `sheep-defaults.json.js` carries
   `easySpeedFrac` and `flankOvershootDeg: 0`; root mirrors byte-identical.
5. **Zero console errors from `file://`** and the `[levers] … OK` boot line
   — the owner's eyeball; everything static is checked before asking.
