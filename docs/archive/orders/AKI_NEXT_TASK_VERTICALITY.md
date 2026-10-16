# Aki's next task: finish OVERCHARGE vertical level authoring

**Requested by Chief. Queue this after your current SAVE/sync task is finished.** Do not interrupt or mix the current fix into this task. Report current-task completion first, then take this one.

## Chief's intent

Levels must support up/down as well as left/right, rather than fixed-height horizontal strips. Chief's established direction is: **add sections UP so the player can traverse DOWN through them; add sections RIGHT to extend horizontal traversal.** Existing floor remains at the bottom of the expanded map. Chief moves the spawn to the top manually; do not invent automatic spawn relocation or level redesign.

## Recover and verify the existing rules first

Read docs/ORCHA_VERTICAL_V1_SEMANTICS.md, docs/PLAYER_MOVEMENT_METRICS.md, docs/LEVEL_SCHEMA.md, editor/state.js, src_scroll/level.js, src_scroll/camera.js and the current runtime entry. Some historical documents contain superseded statements: LEVEL_SCHEMA says fixed 14 rows, and early verticality notes say the camera is unimplemented. Current code and ratified sections take precedence. Publish a concise verified reference; correct the stale height/camera statements in docs within this task.

Already implemented in the inspected live code: per-level rows derived from tiles.length / cols, MAX_ROWS currently 54, per-level height-aware tile bounds, and continuous vertical follow/clamping. Verify rather than rebuilding these. Run _dev/level_height.mjs and _dev/camera_vertical.mjs before changing behavior. Identify what remains missing in the Builder; visible section expansion controls were not found in Chief's inspection.

## Implement or repair Builder section expansion

- Add clear ADD SECTION ABOVE and ADD SECTION RIGHT controls with a visible section size in rows/columns. Default to a screen-sized section derived from current grid dimensions/constants, not old hardcoded 14-row assumptions. Show resulting dimensions and enforce the current height cap; do not raise it silently.
- ABOVE: prepend empty rows and atomically shift every authored world Y by addedRows * TILE. Preserve the old layout relative to its own terrain, including playerStart, sources, gates, switches, enemies and any vertical patrol/endpoints, checkpoints, platforms and both endpoints, crates, chests, decorations and any other current-schema coordinate fields. Shift only world coordinates, not sprite frames, dimensions, speeds or IDs.
- Shift tiles, tileRotations and tileFlips together; preserve absent optional arrays and keep present arrays aligned. RIGHT: increase cols and re-stride each row of all grid arrays, appending empty cells on the right. Existing world coordinates stay unchanged. Do not append a flat block that changes existing row boundaries.
- Preserve object links, background settings, level identity, charge values and exit positions. No gate moves beyond the unavoidable atomic Y shift when ABOVE is explicitly invoked. Chief specifically rejected moving Level 1's exit to a different route; its original x=1984, y=256 must remain unless Chief authorizes a new placement.
- Each expansion is one undoable action. Undo/redo restores dimensions, every coordinate and every aligned array exactly. Update extents, pan/zoom, selection, placement and dirty state. Save/load and Builder TEST must use the same expanded JSON as runtime.
- No auto-migration or rewrites of existing canonical levels. Use an isolated fixture for demonstrations. Do not overwrite Chief's unsaved laptop level or restored recovery state.

## Platforming metrics: verify the current controller

Use docs/agent-training/player_metrics_harness.mjs and the real Player/Input/Level physics. Old measured baseline at 60 Hz: player 20x30 px, TILE 32, walk 75 px/s, sprint 127.5 px/s; jump rise about 99.17 px (3.099 tiles), landable upward ledge 96 px, walk gap 32 px, sprint gap 96 px. These are historical measurements to reproduce, not permission to retune physics. Analytical apex (~102.7 px) is not the same as measured landable reach.

Provide a short current reference for jump height, upward reach, horizontal reach at level and differing elevations, minimum usable head clearance, and drops. Head clearance must account for player height and collision, with tested comfortable margin. Safe drops are a design/readability issue: current historical rules have no fall damage, but landing reachability, death plane, camera visibility, charge-pickup recovery and ability to continue still matter. Identify limits versus comfortable authoring recommendations explicitly. Test walk/sprint, constrained ceilings, and descending landings. Do not add jump, dash, wall-jump or controller changes as part of this task.

## Runtime/editor acceptance

Prove vertical follow continuously tracks descent and ascent, clamps at map bounds, keeps HUD screen-fixed, and initializes correctly on start, checkpoint respawn and restart. Below the map must remain a fall/death condition, not a hidden solid floor. Test tall and old-height levels together; normal horizontal traversal must remain intact. Escalate only actual runtime gaps discovered by tests, with scoped fixes and evidence.

Demonstrate: existing fixture -> add ABOVE -> add RIGHT -> place spawn at top deliberately -> descend through playable platforms -> checkpoint/death/respawn -> save/load -> Builder TEST. Also exercise rotate/flip decorations and all entity coordinate forms. Prove undo/redo and no unintended canonical level changes. Browser screenshots and a real traversal are required alongside automated checks; do not call it complete from array tests alone.

## Delivery and coordination

Commit tests, concise verticality reference, implementation and AKI_STATUS report. Regenerate both module graphs using node scripts/version_editor.mjs after JS edits. Preserve unique branch work; integrate against current agent/orcha-gameplay deliberately. Report full pushed SHA, suites, browser observations, loaded-level source and outstanding limitations. Notify Chief through a committed report/handoff; Chief polls every ten minutes. No new coordination infrastructure.
