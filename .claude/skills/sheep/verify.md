# /sheep verify — browser acceptance check of the PoC

Drive `.claude/sheep/poc/sheep-poc.html` in a real browser and evaluate it
against acceptance criteria. Prefer **measured** checks over screenshot
eyeballing; use screenshots to confirm the qualitative read and to show the
owner.

## What to verify

- `verify <VERSION>` → every **Acceptance** section in that version's specs,
  plus the current phase's **Verify** steps if a plan is mid-flight.
- `verify A1 A4 …` → just those rule IDs from the behavior spec.
- Bare `verify` → the newest version in `spec/`, else the PoC's own definition
  of done.

Build an explicit checklist of criteria (with rule IDs) **before** opening the
browser, and decide for each one how it will be measured.

## Setup

1. Load the browser tools first — they are deferred:
   `ToolSearch "select:mcp__MCP_DOCKER__browser_navigate,mcp__MCP_DOCKER__browser_evaluate,mcp__MCP_DOCKER__browser_take_screenshot,mcp__MCP_DOCKER__browser_console_messages,mcp__MCP_DOCKER__browser_click"`.
2. Navigate to `file:///Users/…/.claude/sheep/poc/sheep-poc.html` (absolute
   path). Note: lil-gui comes from a CDN, so no-internet = GUI missing; the
   sim itself must still run — a GUI-only failure is not a sim failure.
3. Check `browser_console_messages` immediately: **zero console errors** is a
   standing invariant, fail fast on any.

## Measuring — read the sim, don't squint at pixels

The PoC is one plain `<script>`, so sim state (`params`, the sheep array, dog,
score) is reachable from `browser_evaluate` — check what the top-level names
actually are in §1/§4 first. Turn each criterion into a number:

- **Sample over time**: evaluate a snapshot (positions, velocities), wait
  (`browser_wait_for` or a timed `browser_evaluate` sampler), snapshot again.
  E.g. idle-calm A-rules: sample at t=0 and t=10s.
- Useful derived metrics:
  - *mostly still* → fraction of sheep with `|v| < grazeSpeed`
  - *no global convergence* → mean distance-to-GCM not shrinking over the window
  - *k loose groups of 2–5* → single-linkage clustering of positions with link
    distance ≈ `clusterDist`; report cluster count + size histogram
  - *groups spatially separated* → min inter-cluster centroid distance
  - *compaction under pressure* → flock radius before vs. after dog approach
- Drive commands via the real UI (`browser_click` on the command buttons /
  hotkeys) rather than poking sim internals — verify tests the game, not the
  math library. Poking `params` is fine (that's what sliders do).
- Determinism: if a `seed` param exists, note the seed used so runs are
  reproducible; reseed for a second sample when a criterion is statistical.

## Reporting

Report a table: **criterion (rule ID) | measured value | threshold | pass/fail**,
plus 1–2 screenshots for the qualitative reads. For failures, state what was
observed vs. expected in behavior terms; suggested param/mechanism causes go in
a separate "leads" note (fixing is `/sheep tune` or implement work — do not
silently change the sim during verify). Never mark a criterion pass because the
code "should" produce it — only because it was observed.
