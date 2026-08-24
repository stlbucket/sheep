# Phase 1 — arrow remap + 3×3 pad

**▶ Invocation:** `/sheep implement POC-v10 phase 1` · prerequisite: none ·
do only this phase; keep every global invariant.

**Goal:** the six existing commands move to ←→↑↓ / ⇧↑ / ⏎, the letters retire,
and the pad regroups so Come By / Walk On / Away share the top row
([input-remap.md](./input-remap.md) I5/U1, criteria 1 & 3–5 for the six).

## Tasks

- **§2 (CSS):** pad grid → the Q60 3×3 areas (`comeby walk away` on top);
  widen command columns to fit the longer variant labels (116 px).
- **(HTML):** reorder the six buttons to grid order; `<kbd>` glyphs → ← ↑ → ↓
  ⇧↑ ⏎.
- **§3:** `HOTKEYS` → per-`ev.key` `{plain, shift, alt}` map (ArrowLeft/Up/
  Right/Down, Enter); resolution alt → shift → plain with plain fallback;
  `preventDefault()` on handled keys; F/R/H and the INPUT-guard unchanged;
  `flavorOf` now applies to button clicks only.

## Verify

Extracted-script `node --check`; headless boot (Proxy stub) zero errors;
static: HOTKEYS has no letter command keys, grid-areas match Q60.

**Done when:** [ ] arrows/⏎ issue the six commands · [ ] QWEASD dead ·
[ ] pad renders 3 rows · [ ] page boots clean.

**Gotchas:** ⏎ on a focused button double-fires without `preventDefault`;
`ev.key` for arrows is case-sensitive (`ArrowLeft`), keep the F/R/H check on
the lowercased key.
