# Phase 6 — Perimeter Gate & Near-Gate Spawn

## ▶ Invocation
**Trigger:** "run phase 6" / reaching P6 from [`plan.md`](./plan.md).
**Prerequisite:** Phase 5 complete.
**Do:** implement Tasks, run Verify, tick P6 in `plan.md`, **STOP, and report**.

## Goal
The course is rebuilt: the interior fence retires, the **gate sits at a
random seeded spot on the perimeter**, and the flock **spawns near the gate,
off to one side** — a run now reads as working the flock around the field
and back through the gate. Rules **F1–F3**
([course-and-flock.md](./course-and-flock.md)), built on the parked defaults
of Q3 (pen outside the gate), Q5 (re-randomize on reseed), Q6 (interior
fence removed).

## Tasks
- **§0 (schema):**
  - Supersede `fenceX`, `gateY`, `spawnMinX`, `spawnMaxX` → `exposed:false`
    documentation rows (P4-extension decides their fate), and `goal` becomes
    **derived** (gate center) rather than an independent point.
  - New (`Gate + Crush`): `gateCornerMargin` (min distance of the gate mouth
    from any corner, default **80 px**), `spawnGateOffset` (spawn-region
    center's distance along the fence from the gate, default **200 px** —
    Q4), `spawnDepth` (how far the spawn region reaches into the field,
    default **120 px**).
- **§1:**
  - **Gate placement:** a seeded draw of a point on the perimeter rectangle
    (respecting `gateCornerMargin`), re-drawn on `reseed()` only (Q5). Same
    seed → same gate. Expose `sim.gate` (center + outward normal + side).
  - **Fence force:** the perimeter repulsion gaps across the `gateWidth`
    mouth; the old interior-fence force and right-side pen retire (Q6).
  - **Through & pen:** crossing the gate mouth outward = penned (v1
    `through` semantics); penned sheep settle in a small pen zone just
    outside the fence at the gate (Q3), excluded from boids/threat.
  - **Spawn anchor:** cluster-seed region (POC-v2 P2 seeding unchanged)
    anchored `spawnGateOffset` along the fence to a **seeded random side**
    of the gate, `spawnDepth` deep — near the gate, off to one side, never
    straddling the mouth (F2).
  - **Derived geometry:** crush neighborhood (`crushRadius`) and the scoring
    ideal line (spawn-region center → gate center; minimal update, full
    scoring rework deferred per Q4) both take the gate position as data.
- **§2:** draw the perimeter gate gap + outside pen wherever they land;
  remove the interior fence/pen rendering.

## Verify
- **F1:** reseed ~6 times: the gate lands at different perimeter spots on
  **more than one side** of the field; never within `gateCornerMargin` of a
  corner; same seed twice → identical gate.
- **F2:** each reseed, the flock spawns clustered **near the gate, offset to
  one side**, never straddling the mouth and never across the field
  (measure: spawn GCM within `spawnGateOffset`±spread of the gate along the
  fence, zero sheep inside the mouth zone at t=0).
- **F3 (read):** eyeball one run: driving straight from spawn through the
  gate reads degenerate/unrewarding; the natural line goes out and around.
- **No regression:** idle A1/A4–A6 metrics on the new spawn (scattered
  groups still read); a gather→drive→pen run completes at 20 sheep against
  the new gate (v1 milestone re-read); crush still measures at the mouth;
  zero console errors from `file://`.

## Done when
- [ ] Seeded perimeter gate + outside pen; interior fence fully retired.
- [ ] Spawn anchored near-gate-one-side; F1/F2 measured over ≥6 reseeds.
- [ ] Crush + scoring line follow the gate; v1-style run completes; zero
      console errors.

## Gotchas
- **Everything that assumed "pen = right side" must take the gate as data**:
  fence force, `through` test, crush center, scoring line, render. Grep for
  `fenceX`/`gateY`/`goal` uses before starting.
- The gate can land on any of four sides — write the mouth/crossing test in
  the gate's local frame (center + normal), not with x/y special cases.
- Spawn side must be **seeded** (F acceptance replays a seed) — don't use
  `Math.random()` anywhere in placement.
- `heelIntensity`/dog spawn: the dog + owner post must also relocate
  relative to the new spawn or A7/A8 checks will false-fail.
