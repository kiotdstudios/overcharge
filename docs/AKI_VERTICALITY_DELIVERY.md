# Verticality delivery — ADD SECTION ABOVE / RIGHT

Aki, 2026-09-29. Implements docs/AKI_NEXT_TASK_VERTICALITY.md on top of the already-shipped
runtime side (docs/ORCHA_VERTICAL_V1_SEMANTICS.md — per-level height derivation, vertical
camera, both live since 2026-09-19).

## What shipped

Two new undoable Builder actions in `editor/actions.js`:

- **`addSectionAbove(level, addedRows)`** — prepends `addedRows*cols` empty tiles above the
  level, keeping `tileRotations`/`tileFlips` aligned (a tiles-only shift would silently corrupt
  the 3 of 5 levels that carry rotations). Shifts every authored world-Y field by
  `addedRows*TILE_SIZE`: `playerStart`, `decorations`, `sources`, `gates`, `switches`,
  `checkpoints`, `platforms` (y only), `enemies`, `crates`, `chests`. Horizontal fields
  (x, x1/x2, patrolLeft/Right) are untouched. Rejects (returns `null`, logs a warning) if the
  resulting height would exceed `MAX_LEVEL_ROWS` (54, mirrors `src_scroll`'s `MAX_ROWS` — the
  Builder must not silently raise the runtime's cap). ABOVE-only per Chief's ruling: the floor
  stays the death plane at the bottom; nothing auto-relocates the spawn.
- **`addSectionRight(level, addedCols)`** — re-strides every row of `tiles`/`tileRotations`/
  `tileFlips` to append `addedCols` empty cells per row (a flat append would shift every later
  row left and corrupt the map — re-striding per row is the only correct form), then increments
  `level.cols`. No world coordinates change — width has always been per-level.

Both are exactly one `history.apply()`-compatible action (`forward()`/`inverse()`), using a
whole-level JSON-clone snapshot for `inverse()` so undo restores byte-for-byte, including any
future coordinate-bearing array without hand-reversing each field.

New constants in `editor/state.js`: `DEFAULT_SECTION_ROWS=18`, `DEFAULT_SECTION_COLS=25`
(one screen, mirrors `src_scroll/constants.js` ROWS/COLS), `MAX_LEVEL_ROWS=54`.

## UI

Two new controls under **§5 LEVEL ACTIONS** in `editor.html` (per `docs/BUILDER_UI_REDESIGN.md`'s
instruction to place new per-level geometry controls under Level, not reintroduce retired
button patterns): a Rows input + `⬆ ADD SECTION ABOVE` button, a Cols input + `➡ ADD SECTION
RIGHT` button, both defaulting to the constants above, and a status line reporting the
resulting dimensions or the rejection reason. Wired in `editor/main.js` right after the
duplicate-level handler; each click reads the input (clamped to the default if invalid),
calls the corresponding action, and applies it through `History.apply()` — dirty flag and
re-render happen automatically the same way every other action does.

## Bug caught before shipping

The original field list I copied from `docs/LEVEL_SCHEMA.md` did not mention `chests` (a newer
entity — the schema doc predates it). Chief's `docs/CHIEF_CHEST_SCALE_AND_SYNC.md`, which
landed on `agent/orcha-gameplay` mid-task, reminded me chest world geometry is real and
distinct from source-art size, which is what made me re-check every array against
`main.js`'s spawn handler instead of the schema doc alone. Found `level.chests[]` was missing
from the ABOVE shift, fixed it (`ch.y += dy`), and added a chest fixture + assertion to the
test suite before rerunning everything. This is exactly the kind of gap the "atomic shift"
requirement exists to catch — flagging it here rather than presenting the first pass as done.

## Tests

All run from repo root, this session, after the fix above:

- `node editor/__tests__/section-expansion.test.mjs` — new suite, isolated synthetic 4x3
  fixture (never touches a real level file): **45 passed, 0 failed**. Covers rows/cols growth,
  tiles+tileRotations+tileFlips staying aligned, every entity type's y-shift (and x staying
  put), gate `isExit`/`required` preservation, the MAX_LEVEL_ROWS cap rejection, RIGHT's
  re-stride correctness (explicitly distinct from a corrupting flat append), and undo/redo
  exactness for both actions including the canonical gate value `x=1984,y=256`.
- `node editor/__tests__/save-409.test.mjs` — regression check on unrelated save-conflict
  logic, unaffected by this change: **17 passed, 0 failed**.
- `node _dev/level_height.mjs` — runtime height-derivation suite: **43 passed, 0 failed**.
- `node _dev/camera_vertical.mjs` — runtime vertical-camera suite, includes shipped-levels
  1-5 regression guards: **95 passed, 0 failed**.
- `node --check editor/actions.js` clean; `bun build editor/main.js` bundles clean (used as a
  static parse check for `main.js`, which cannot be `node --check`ed directly — it calls
  `mountWorkspace()` at module scope, which needs a DOM).
- Module graphs regenerated: `node scripts/version_editor.mjs` then `node scripts/build_info.mjs`.

## Not verified — real limitation, not a claim of completeness

**Live browser acceptance testing was not completed.** I started a local dev server
(`python -m http.server 8420`) and opened `editor.html` in the built-in browser tool; the
initial `navigate` succeeded, but every follow-up (`snapshot`, `content`, `eval`, `screenshot`)
timed out, and the dev-server access log shows only the single initial `GET /editor.html` —
no module scripts were ever fetched, meaning the page did not finish loading in that session.
Restarting the server hit the same result, including one attempt that failed outright
(exit 120) when run as a retained background task. I could not diagnose this further within
this session's tooling and did not want to spend more of the task budget chasing an
environment issue. **This means the brief's explicit requirement — real traversal: ADD ABOVE
→ ADD RIGHT → move spawn → descend → checkpoint/death/respawn → save/load → Builder TEST — has
not been observed in a browser.** Everything above this line is verified by automated tests and
code review only. Chief or the user should open the Builder, click the two new buttons, and
confirm visually before treating this as done.

## Player movement metrics — not re-verified

`docs/agent-training/player_metrics_harness.mjs` no longer runs against current
`src_scroll/player.js`: its synthetic level fixture was missing `crates: []` (fixed, harmless,
committed) and then failed again on `level.tileBlocksX is not a function` — the harness's
hand-rolled level object predates a fence/blockOnly collision API that current `player.js`
requires. Fixing that properly means understanding `tileBlocksX`'s real implementation and
contract, which I have not studied this session and did not want to guess at. **No physics or
controller changes were made this task, so `docs/PLAYER_MOVEMENT_METRICS.md`'s existing numbers
are presumed still accurate** — but I could not independently re-run the harness to confirm
byte-for-byte this session. Flagging as a known gap; the harness needs a `tileBlocksX` fix
before it can be trusted again.

## Outstanding

- Real browser-tested vertical traversal (see above) — required before calling this genuinely
  complete per the brief's own acceptance bar.
- `player_metrics_harness.mjs` needs a `tileBlocksX` shim to run at all.
- `docs/LEVEL_SCHEMA.md` does not mention `chests` — worth a follow-up note to Chief so the next
  agent doesn't hit the same gap from the doc alone.
- After this: hero-v3/traversal/combat integration per `docs/AKI_SYNC_AND_HERO_NEXT.md` and
  `docs/CHIEF_HERO_ANIMATION_PREP.md` (read this session — resolves the 1254x1254 frame concern
  via `src_scroll/hero-render.js`'s foot-anchored draw, does not certify collision/traversal).
  Chief's instruction is explicit: finish verticality first.

## Files changed

`editor/state.js`, `editor/actions.js`, `editor.html`, `editor/main.js`,
`editor/__tests__/section-expansion.test.mjs` (new),
`docs/agent-training/player_metrics_harness.mjs` (one-line fixture fix),
`editor/buildinfo.js`, `index.html` (regenerated version stamps).
