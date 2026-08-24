# Phase 3 — Acceptance & sync (runs LAST)

## ▶ Invocation
**Trigger:** "run phase 3" / last unchecked in [`plan.md`](./plan.md).
**Prerequisite:** Phases 0–2 ticked.
**Do:** measure, sync docs, snapshot params, tick P3, run the Definition of
done, move `spec/POC-v6/` → `implemented/POC-v6/`, **STOP, and report**.
**Never commit.**

## Goal
Every acceptance criterion in [dog-behavior.md](./dog-behavior.md) measured
in one pass on the finished build, regressions re-checked, docs and the
defaults snapshot synced.

## Tasks
- **Measure** acceptance 1–10 at seeds 1337 & 42 on the regression anchor
  (forced `beside-gate`, `spawnGateClear 0`, `randomSeedOnLoad` off, levers
  0.5) + the elongated-flock shape log. Fill the spec's **Acceptance log**
  with a table per criterion (measured | threshold | pass/fail).
- **Regressions** (acceptance 9): A1/A4 idle still-frac + dist-GCM, B1/B2,
  C3 eye, D1 lie-down crossings on the v4 jam rig, E1 min gap, F1 facing
  over 7 seeds, G1, H1; idle digest = v5.
- **Static:** §1 zero DOM refs; `Math.random` only in §3/§4; defaults file
  a pure JSON literal, every key known to the schema; `'stand'` grep-clean
  in §1/§3 outside historical comments; `[levers] … OK` (anchor n/n).
- **Docs sync** (DoD 4): v3 `dog-behavior.md` D3 + E2/E3 and v4 C7 get a
  one-line "superseded/amended by POC-v6" note (never renumber);
  `implemented/POC-v5/control-layout.md` Q-A (Easy is now its own command) and Q-B (hull
  moved to §1) resolved; `brainstorming/README.md` open-question entry +
  `force-model.md` "Post-POC-v5 refinements" section; `CONTEXT.md`
  vocabulary (Command, State, Posture, Balance point, Handoff, Impulse; add
  Easy, Perimeter); this README's feature status → `implemented`; v5 README
  carried-forward list notes Q12 is moot.
- **Snapshot:** `poc/params-2026-08-22-v6.json` in the defaults-file
  format (exported key set); diff vs `params-2026-08-21-v5.json` should be
  exactly `easySpeedFrac` (new) + `flankOvershootDeg` (90 → 0).
- **Mirrors:** root `index.html` / `sheep-defaults.json.js` byte-identical.
- Move the folder to `implemented/POC-v6/`; update memory notes.

## Verify
The acceptance table, the regression table, the static list, the snapshot
diff, and `cmp` on both mirrors — all in the report. Anything not measured
is named as pending (the owner's `file://` console line).

## Done when
- [ ] Acceptance 1–10 logged in the spec with numbers.
- [ ] Regressions logged; static checks clean; snapshot + mirrors written.
- [ ] Docs synced per DoD 4; folder moved; report delivered.

## Gotchas
- The headless harness boots the **whole** script under a DOM/lil-gui stub
  (v5 P6 pattern) so the lever layer and `assertLevers` run — the §0+§1
  slice alone would skip the anchor check.
- `reseed()` keeps `dog.command`; follow it with `setCommand('that_ll_do')`.
- Do not "fix" anything during this phase — a failed criterion halts the
  plan and is reported, not patched.
