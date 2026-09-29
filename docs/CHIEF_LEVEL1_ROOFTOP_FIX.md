# Level 1 lower rooftop collision

## Final direction confirmed by Chief

Chief explicitly chose: "Walk along the lower roof with the building as background." Converted 102 cells at columns 49-65, rows 10-15 from solid terrain into existing background decorations, preserving original tile art, transforms and position. Lower rooftop row 16 stays solid. Moved the exit gate onto that lower walking surface (feet y=512), preserving its charge cost and progression barrier. Global terrain collision remains consistent on both axes.

Verification: real Player/Level simulation crosses the full background section on the lower rooftop, checks all background cells have no collision, preserves all art paths, and verifies closed/open exit behavior: 281 passed. Spawn suite 9 passed. Browser QA used an isolated server with only the test spawn overridden: walked past the former building edge, observed player feet on the visible lower rooftop in front of the building; proof saved to outputs/level1-background-route.png outside the repo. The real spawn was not changed.

Aki: both machines use the public Pages URLs, so a stale local branch alone cannot explain the reported divergence. Preserve unsaved edits; reconcile this new level JSON before a full-level SAVE. Earlier instructions to restore a wall or make facade terrain pass-through are superseded by the approved background-art authoring approach.

## Correction after Chief's second playtest

The initial pass-through fix below was wrong and is superseded. Chief's screenshot showed the player inside building fill with no visible rooftop beneath. Solid facade tiles were ignored horizontally but remained solid vertically, creating invisible interior floors. Restored tile (49,15) to 27 and removed facade pass-through in Level.tileBlocksX. All terrain now blocks both axes; decorative backgrounds must be authored separately. Game and Builder module graphs are versioned together.

Updated tests: 76 rooftop/side-entry checks pass across purple and blue tiles; player spawn 9 pass; drone 14 pass; level2_fork 45 pass / the same 2 pre-existing Level 5 failures. No rendered browser verification claimed. Do NOT apply the earlier instruction to change (49,15) to 34. Lower path meets a solid tall building; any intended route from the bottom to its roof needs authored climbable platforms, not pass-through collision.

## Superseded initial attempt (historical evidence only)

Chief reported being unable to walk right at the bottom of the gap beside the tall exit building. Reproduced using the real Player and Level physics: tile at zero-based column 49, row 15 (world x=1568, y=480) was ID 27, a structural wall that always blocks horizontal movement. Floor below at row 16 is walkable; the wall occupied the player's body row.

Changed only that cell to ID 34, an existing purple building facade that permits horizontal traversal when supported by a floor. No global wall collision rules changed. Upper walls remain solid; the rise at column 66 and the exit's intentional full-column barrier are unchanged.

Verification: `_dev/level1_lower_rooftop.mjs` 7 passed (both directions, floor support, original-wall reproduction, upper-wall preservation); player spawn suite 9 passed. Existing level2_fork suite 45 passed / 2 pre-existing failures in Level 5; Level 2 closed/open chest-pocket reachability passes. No browser visual QA claimed.

For Aki and Chief's laptop edits: preserve unsaved changes. If the laptop's level snapshot predates this correction, replace tile (49,15) from 27 to 34 in that snapshot before publishing it; otherwise a full-level SAVE could restore the blocked wall. Do not reload over unsaved level work.
