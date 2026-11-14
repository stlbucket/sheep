# POC-v12 — Spec Index

Twelfth iteration of the sheep PoC. Started and **shipped 2026-11-14** from one owner note: **obstacles in the field** — small stands of trees or large rocks, placed and grouped "sort of" like the starting herd, at a random frequency that heavily favors the low end of a wide range, which a group of sheep goes **around, splitting in two fairly easily** — in **all three versions** (2D, 3D, 3D-assault), with a **frequency slider readily available**. Predecessor [POC-v11](../POC-v11/README.md) shipped 2026-08-24; the `web/` refactor (one shared physics lib, three pages) landed in between.

Built straight from the note — no plan phases; one spec, headless acceptance on rules O1–O9 (all PASS) plus a headless-Chrome `file://` load of all three pages (zero console errors). **16 new keys** in a new `Obstacles` category and one new lever, **Pasture · Clutter**. The owner's `file://` eyeball is **pending**.

## Features

| Feature | Spec | Status |
|---|---|---|
| Obstacles v1 — tree stands / large rocks (O1–O9), `obstacles` slider on every page, Clutter lever, rock blast shield | [obstacles.md](./obstacles.md) | **implemented** 2026-11-14 — acceptance measured PASS ([log](./obstacles.md#acceptance-log--2026-11-14)) |

## Locked decisions (this version)

From the owner's note (2026-11-14), taken as given:

- Obstacles are **small stands of trees or large rocks**.
- They have **similar placement and grouping as the initial herd (sort of)**.
- **Frequency is random over a pretty wide range, heavily favoring the lowest 10 % of it, with very occasional outliers.**
- A group of sheep meeting an obstacle **seeks a path around it, splitting into two groups fairly easily**.
- The feature is in **all three versions**, with a **slider for frequency readily available**.

Asked after the first build, answered by the owner the same day:

- **Cover** — a stand or rock **blocks the dog's eye**: a sheep behind one does not feel him (rule O5).

- **Q65** — the slider is an **exact count**; courses are **random until it is touched**.
- **Q66** — in the assault, **only rocks shield** a sheep from a blast.
- **Q67** — a new **Pasture · Clutter** lever moves obstacle **count, size and gaps**.
- **Q68–Q70** — kept as built: straight scoring line, trot does not stop for obstacles, flank line unchanged.

Detail in [obstacles.md](./obstacles.md#q65q70--asked-and-answered-by-the-owner-2026-11-14).

## Still open

Nothing parked. The Clutter lever's endpoints are proposals until a `/sheep tune` pass, like every lever's.
