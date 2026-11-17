# Phase 4 — objectives (render)

**▶ Invocation:** after phase 3. The three pages only.

**Goal:** Drive gates and the three special kinds are visible and distinct everywhere.

## Tasks

- **2d.html:** draw panels, the gap line and a done state; golden, lamb and ram sheep get their own colour and size.
- **3d.html / 3d-assault.html:** hurdle panels in `rebuildCourse` (keyed on `sim.courseRev`), skip `hurdle` discs in the tree/rock loops, tint and scale special sheep in `updateSheep`.

## Verify

Headless Chrome screenshots of a seed with a gate and all three specials on each page; zero console errors.

## Done when

- [x] Verify passes and all three pages load with zero console errors.

**Gotchas:** The 3D render code is duplicated between the two 3D pages — make the same edit in both.
