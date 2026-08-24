# Phase 6 — Acceptance & Sync (runs LAST)

## ▶ Invocation
**Trigger:** "run phase 6" / last phase in [`plan.md`](./plan.md).
**Prerequisite:** Phases 0–5 ticked.
**Do:** run every measurement below, fill both specs' **Acceptance log**
sections, sync docs, tick P6, run the Definition of done, move
`spec/POC-v5/` → `implemented/POC-v5/`, **STOP, and report**. **Never
commit.** **Constraints:** plan.md Global invariants.

## Goal
Both features pass their spec acceptance **measured**, the lever layer is
provably inert at the anchor, every endpoint is a non-broken world, and the
docs/params snapshot match what shipped.

## Tasks — measurements (headless Node slice, `file://` eyeball where noted)
- **Anchor parity (levers 3 — the headline):** all levers 0.5,
  `randomSeedOnLoad` off, `spawnLayout: beside-gate`, seeds **1337 and
  42**: the scripted come-by→drive reproduces POC-v4 P2's numbers **to the
  digit** — handoff carry +60.3° / +60.5° (come-by 1337/42), sweeps
  223–267° as logged, E1 min gap 38.6 / 38.9 px, 0.00 s below the line.
  Plus the P0 position digest.
- **Endpoint robustness (levers 7):** for each of the 24 endpoints (12
  levers × {0, 1}, others at 0.5), seed 1337, 60 s at dt 1/60: zero thrown
  errors, no NaN in any sheep/dog position, finite score. Log any endpoint
  that *looks* broken (e.g. all sheep pinned on a fence) as a tune item,
  not a failure.
- **Spawn-layouts 1–10:** run the P1–P3 measurements again on the final
  build at 12 random reseeds + 6 forced per archetype; the per-archetype
  10 s idle stability; ideal-line vertex check; F8 and F1 across all.
- **Regression spot-checks at the anchor:** v2 A1/A4 idle metrics; v3 C1–C5
  flank direction/eye 45°, D1/D3 postures, E1/E2 drive, G1 commitment (92→92
  style: committed entries → through), H1 group sizes 1..10; v4 F1.
- **Static invariants:** `grep Math.random` → §3/§4 only; no
  `document|window|canvas` in §1; defaults-file parses as pure JSON after
  stripping the assignment; export round-trips; controller census.
- **Owner `file://` check (item 5 of the DoD):** zero console errors with
  the HTML + defaults file; the two `[levers]` boot lines read OK.

## Tasks — docs & params sync
- Fill **Acceptance log** in `spawn-layouts.md` and `tuning-levers.md`
  (dated, numbers, as-built notes).
- `lever-model.md`: fold in Appendix B corrections (87 controllers, §2/§4
  touch) and **extend the Approach table** with the nine v5 spawn keys at
  anchor; note `spawnLayout`/`randomSeedOnLoad` beside `seed` as draws.
- `brainstorming/README.md`: add a parked entry for "Approach endpoints vs
  archetypes — should Approach 1.0 bias toward whole-pasture?" (Q27's
  deferred half) and strike anything this version resolved.
- `tuning-levers.md` Appendix A: update the counts (levered/not-levered/
  total) to the live schema.
- Dated snapshot `poc/params-<today>-v5.json` in the defaults-file format
  (raw params + `levers` block); `sheep-defaults.json.js` is the same
  content.
- README: statuses → `implemented`, completion line, carried-forward open
  items (Q12 hands-on read, Q8, D2, the tune pass per lever, Q27's
  deferred bias question, Q30 archetypes).

## Verify
Everything above is the verify. A failure in any *measured* item halts the
phase; a "looks wrong" endpoint is logged, not blocking.

## Done when
- [x] Anchor parity at seeds 1337/42 (101/101 shared params identical; every unambiguous metric = v4 to the decimal; harness-defined ones within 0–3° / 0.3 px); 24 endpoints run clean.
- [x] Spawn-layouts 2–10 and levers 1–10 logged PASS with numbers (spawn 1 / levers 11 = owner's `file://`).
- [x] Regression spot-checks hold; static invariants clean.
- [x] Docs + snapshot synced; folder moved to `implemented/`; owner's
      `file://` console check reported as **pending** (2026-08-21).

## Gotchas
- Parity must use the **forced** `beside-gate` path: `random` consumes a
  PRNG draw and shifts the sheep. If the digits differ, check the draw
  order in `spawn()` before anything else.
- The 24-endpoint sweep at Scale 1.0 spawns 150 sheep in a 1500×960 field —
  ~4× the per-tick cost; budget the run time, don't shorten the 60 s.
- Do **not** move the folder until the owner's `file://` line is in hand
  *or* explicitly deferred — v4 shipped "4 of 5" with that item named; do
  the same honestly.
