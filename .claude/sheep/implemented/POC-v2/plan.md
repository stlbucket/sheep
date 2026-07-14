# POC-v2 Build — Master Plan & Runner

Second iteration of the sheep PoC: the **settings inspector** (schema-driven
tunables + tooltips + ⓘ grids) and the **flock behavior rules** (idle state
A1–A8, pressure/calm transitions B1–B2). Specs: [README.md](./README.md) index →
[settings-inspector.md](./settings-inspector.md),
[flock-behavior.md](./flock-behavior.md). The baseline to beat is the
2026-07-13 verification table at the bottom of flock-behavior.md.

---

## ▶ Invocation — how to run this plan

**Trigger:** `/sheep implement POC-v2`, "run the v2 plan", "run phase N".

**Do this:**
1. Find the **first unchecked phase** in the Progress tracker below (or the
   explicitly requested phase; its prerequisite must be ticked).
2. Open that phase's file and follow its invocation exactly — implement its
   Tasks in the target file, run its Verify steps (browser checks per the
   `/sheep verify` playbook — measured, not eyeballed).
3. On acceptance: tick the phase here, **STOP, and report** what was built +
   how to eyeball it. **Wait for go-ahead before the next phase.**
4. "Run all phases" → repeat without pausing, still reporting at each gate;
   halt immediately on any Verify failure.
5. After the last phase: run the Definition of done, then move this whole
   folder `spec/POC-v2/` → `implemented/POC-v2/` and mark both features
   `implemented` in README.md.

**Target file:** `.claude/sheep/poc/sheep-poc.html` (the one file).

---

## Global invariants (every phase)

Same as POC-v1 (`implemented/POC-v1/plan.md`), restated:

- **One file, one plain `<script>`**; runs from `file://`; lil-gui **UMD** via CDN.
- **§1 SIM stays DOM-free** — the `SETTINGS` schema, generators, tooltips, and
  grid are §0/§2/§3 dev tooling; §1 only ever consumes the resolved plain
  `params` object.
- **All tunables live in the schema** (which generates `params` + gui). New
  idle/behavior params introduced by a phase are new `SETTINGS` entries — no
  magic numbers in the sim.
- **Every phase leaves the page runnable**, zero console errors.
- Fixed timestep `dt = 1/60`, accumulator, 0.25 s frame-delta cap.
- New-state rule: **idle behavior must not regress POC-v1's herding** — the six
  v1 milestones (compaction, sweep, drive, gate, scoring) must still read after
  every phase.

## File anatomy (unchanged)

```
§0 PARAMS      SETTINGS schema → generated params + lil-gui   [tunable data]
§1 SIM   ◀──   vec2 · neighbors · forces · dog · FlockSim · scoring  [PURE — ports to Godot]
§2 RENDER      draw + tooltips/grid DOM                        [throwaway]
§3 INPUT       buttons + hotkeys → command                     [throwaway]
§4 BOOTSTRAP   fixed-timestep loop, wire gui, kick off         [throwaway]
```

---

## Phases

| # | File | Goal | Proves |
|---|---|---|---|
| 0 | [phase-0-settings-schema.md](./phase-0-settings-schema.md) | `SETTINGS` schema generates `params` + gui; slider fixes | settings acceptance #1/#2/#5/#6 |
| 1 | [phase-1-inspector-ui.md](./phase-1-inspector-ui.md) | hover tooltips + per-folder ⓘ detail grid | settings acceptance #3/#4 |
| 2 | [phase-2-idle-spawn.md](./phase-2-idle-spawn.md) | scattered cluster spawn + graze/wanderer idle motion | A1 A2 A3 A5(size) A6 |
| 3 | [phase-3-idle-cohesion.md](./phase-3-idle-cohesion.md) | bounded/gated idle cohesion — groups hold apart | A4 A5(hold) |
| 4 | [phase-4-idle-dog.md](./phase-4-idle-dog.md) | dog stands down at heel; sheep softly avoid it | A7 A8 |
| 5 | [phase-5-calm-pressure.md](./phase-5-calm-pressure.md) | threat dissolves idle; sustained calm re-scatters | B1 B2 |
| 6 | [phase-6-acceptance.md](./phase-6-acceptance.md) | full measured A/B verify vs baseline + docs/params sync | the version's DoD |

---

## Progress tracker

- [x] Phase 0 — Settings schema (2026-07-13; verified in browser: schema-boot identical, hooks + export + slider fixes confirmed, 80 sheep @ 60 FPS)
- [x] Phase 1 — Inspector UI (2026-07-13; browser-verified: tooltips, 10 ⓘ grids w/ live values + no-slider tags, Esc/click-outside/✕ close, hotkeys swallowed while open)
- [x] Phase 2 — Idle spawn & graze (2026-07-13; t0: 25 clusters all 2–5 @seed 1337; isolated idle drive: grazers 6.7 px/10 s, wanderers 100% drifting; come-by regression OK. Verify scope corrected: with-cohesion stillness moved to P3's gate. spawnMaxX 500→700 for seed packing — doc-sync at P6)
- [x] Phase 3 — Idle cohesion bounds (2026-07-13; as-built: same-group unbounded idle cohesion [radius gating failed twice — see phase file]. A4: meanDistGCM 225→364 growing vs baseline 22; A5: 25/25 groups intact, radius ≤15; soak max cluster 36%. Gather-accumulation deliberately deferred to P5 re-grouping — feel-test there)
- [x] Phase 4 — Idle dog stand-down (2026-07-13; A7: grazers 7 px/10 s + GCM 1 px vs baseline 185 px, stress 0 at heel; A8: 2-min soak, no approach. As-built extras: idle alignment gate [killed the ~7.5 px/s glide — root cause of P3's chaining/edge-drift/self-pen] + grazers don't chase wanderers. A1–A6 now hold at defaults; ×2 seeds)
- [x] Phase 5 — Calm/pressure transitions (2026-07-13; idle⇄alert w/ calmDelay hysteresis: max 2 flips/sheep/10 s at the threat boundary. As-built: relaxTime replaced by crowdTolerance [crowd dispersal — timer version went stale]; released blob holds ~45 s then dissolves 27→19 by +105 s. Full gate run → P6)
- [x] Phase 6 — Acceptance & sync (2026-07-13; A1–A8 + B1–B2 measured PASS at seeds 1337 & 42 — logged in flock-behavior.md; v1 milestones pass at v1 scale [20 sheep: GCM 470→907, 9 penned, crush 1.42, card renders]; 80-sheep drive difficulty parked as open Q8; docs synced; params-2026-07-13-v2.json saved)

## Definition of done (whole version) — **met 2026-07-13**

1. ~~All 6 settings-inspector acceptance criteria hold.~~ ✅ (P0/P1, re-confirmed P6)
2. ~~`/sheep verify` passes **A1–A8** and **B1–B2**~~ ✅ measured at two seeds,
   every baseline row beaten — see the acceptance log in flock-behavior.md.
3. ~~POC-v1's six milestones still read~~ ✅ at v1 scale (20 sheep). At 80
   scattered sheep a full-field drive is deliberately long work — owner design
   question (flock-behavior open Q8).
4. ~~Params JSON export + dated snapshot~~ ✅ `poc/params-2026-07-13-v2.json`.
5. ~~Zero console errors~~ ✅ every phase gate.
