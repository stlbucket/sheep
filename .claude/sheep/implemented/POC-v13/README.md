# POC-v13 — Spec Index

Thirteenth iteration of the sheep PoC. Started and **shipped 2026-11-16** from three owner notes on how the flock should feel: **stream away at a slow trot when the dog stops or turns at the end of a flank**, **a trot that winds down to a walk and then grazing instead of crossing the field**, and **a gate draw that reaches a little further and grows a cone toward a trotting line's leaders**. Predecessor [POC-v12](../POC-v12/README.md) shipped 2026-11-14.

Built straight from the notes — no plan phases; one spec, headless acceptance on rules T5–T8 and G5 plus a headless-Chrome `file://` load of all three pages (zero console errors). **10 new keys** (7 in `Trot`, 3 in `Gate + Crush`) and **11 changed defaults**. The owner's `file://` eyeball is **pending**.

## Features

| Feature | Spec | Status |
|---|---|---|
| Trot turn trigger (T5), trot time limit + rest (T6), wind-down walk (T7), trot only in a worked group (T8), gate cone (G5), retuned defaults | [flock-behavior.md](./flock-behavior.md) | **implemented** 2026-11-16 — acceptance measured PASS ([log](./flock-behavior.md#acceptance-log--2026-11-16)) |

## Locked decisions (this version)

From the owner's notes (2026-11-16), taken as given:

- A sizable collected group **streams away from the dog at a slow trot** when he stops or reverses near the turn of an away / come-by, with **stragglers following**.
- A trot **slows to a walk and then to grazing after some time**; a fence still stops it; sheep **do not run all the way across the field**.
- The gate's attraction **extends a little further in general**, and with a directed line of trotting sheep it **grows conically on the axis toward the leaders**.

## Still open

Four questions parked with bolded defaults — [Q71–Q74](./flock-behavior.md#open-questions-parked--default-in-bold). All new keys sit in the `parked` not-levered list until a `/sheep tune` pass.
