# Phase 4 — Idle Dog Stand-Down

## ▶ Invocation
**Trigger:** "run phase 4" / reaching P4 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 3 complete.
**Do:** implement Tasks, run Verify, tick P4 in `plan.md`, **STOP, and report**.

## Goal
An off-duty dog stops being a herding force: no pressure at heel (**A7** — the
baseline's corner-creep cause), and sheep politely keep their distance without
fleeing (**A8**). See the A7 design note in
[flock-behavior.md](./flock-behavior.md).

## Tasks
- **§0 (`Dog` category):** `heelIntensity 0` (0–1·0.05, exposed — analogous to
  `lieDownIntensity`); **`Idle` category:** `dogAvoidRadius 45` px (~4 L,
  exposed 0–120·5), `w_avoid 0.4` (0–2·0.05, exposed).
- **§1 (A7):** introduce an explicit **`heel` dog state**: active at spawn
  (before any command) and after *that'll do* completes (dog reached the owner).
  While at heel, `dog.intensity = heelIntensity` → with the default 0, the flee
  force contributes nothing. Any command leaves heel and restores intensity 1.
- **§1 (A8):** idle sheep get a **soft avoidance** steering: within
  `dogAvoidRadius` of a heel-state dog, bias graze steps / wander direction
  away from the dog, weighted `w_avoid`. It is not the flee force: no stress,
  no panic, no speed change, and it only steers idle motion.

## Verify (measured 2026-07-13 — the baseline A1 scenario rerun; PASS ×2 seeds)
- Grazers displaced **6.9–7.7 px mean / 10 s** (100% < 3 L; baseline ~185 px);
  GCM moved **1 px** (< 2 L) — no corner-creep (A7). Max stress 0 at heel.
- 2-min soak: no sheep came within 105 px of the heel dog; zero stress (A8).
- Command cycle: `walk_on` → intensity 1 + 27 stressed within 3 s;
  `that_ll_do` → home → intensity 0, atHeel true.
- 30 s idle field is **identical to t=0** (25 clusters, max 5, spread 225);
  180 s ≈ unchanged (24 clusters, spread 226, penned 0). A1–A6 hold at
  defaults with the dog present.
- Regression: 21 stressed under come-by; walk-on drives GCM forward.

## As-built additions (found during verification)
1. **Idle alignment gate** (in `alignment()`): `F_align` is a *normalized*
   heading, so a standing group's micro-drift self-reinforces into a perpetual
   ~7.5 px/s glide (measured: constant 7.7 px/s with zero shuffle-steps; the
   math: v_eq = 0.15 · w_align · accelScale). Unpressured sheep don't align.
   This one gate also eliminated P3's observed chaining, edge-drift, and
   idle self-penning — all were glide symptoms. (Corrects P3's note that
   alignment needed no gating.)
2. **Grazers don't chase their group's wanderer** — wanderers are excluded as
   idle-cohesion targets, else the group is towed behind its own CoM (A3).

## Done when
- [ ] Heel state wired at spawn + after that'll-do; commands exit it.
- [ ] A7 metrics beat the baseline row; A8 avoidance visible and panic-free.
- [ ] No console errors; §1 DOM-free.

## Gotchas
- Heel must be a **dog state**, not a hack on the sheep side — multi-dog later
  needs per-dog intensity.
- *That'll do* en-route is not heel: the dog still pressures sheep it passes
  until it reaches the owner (that's existing, correct behavior — keep it).
- A8 applies to **idle** sheep only; threatened sheep already have flee.
