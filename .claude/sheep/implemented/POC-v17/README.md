# POC-v17 — Spec Index

Started and shipped 2026-11-18 from one owner note: an additional obstacle type, 0–3 large black bulls wandering any given field, which the sheep treat as a rock with a little wider berth and which the dog does not affect. In all four pages (2D, 3D, 3D-assault; the 3D competition page carries the code but its clean field never has a bull).

Spec, plan and build were done in one run at the owner's choice. Eight new keys in the `Obstacles` category. The owner's `file://` eyeball is **pending**.

## Features

| Feature | Spec | Status |
|---|---|---|
| Bulls — a wandering obstacle (B1–B6) | [bulls.md](./bulls.md) | **implemented** 2026-11-18 — acceptance measured PASS ([log](./bulls.md#acceptance-log--2026-11-18)) · [plan](./plan.md) |

## Locked decisions (this version)

From the owner's note (2026-11-18), taken as given:

- **0–3** bulls "might be" on **any given field**.
- They are **large** and **black**, and they **wander**.
- Sheep **react as if it is a rock, with a little wider berth**.
- The bull **does its own thing** and **is not affected by the dog**.

## Still open

Q111–Q117 in [bulls.md](./bulls.md#open-questions-parked--default-in-bold), each built on its bolded default: how often bulls appear, whether a bull hides sheep from the dog, bulls on the competition course, drive gates on a field with bulls, bulls and mortar blasts, a quick control beside the pad, and whether a bull should ever do more than wander.

## Test results at ship

| Suite | Command | Result |
|---|---|---|
| Sim | `npm test` | 77/77 (6 new `B-` checks) |
| Pages | `npm run test:pages` | 127/127 (new `B-p1`, `B-p2`, `errors-bulls` on all four pages) |

Screenshots with every bull slot filled are written to `test/shots/*-bulls.png` by the page suite.
