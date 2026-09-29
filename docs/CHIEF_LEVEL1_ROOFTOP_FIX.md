# Level 1 lower rooftop collision

Chief reported being unable to walk right at the bottom of the gap beside the tall exit building. Reproduced using the real Player and Level physics: tile at zero-based column 49, row 15 (world x=1568, y=480) was ID 27, a structural wall that always blocks horizontal movement. Floor below at row 16 is walkable; the wall occupied the player's body row.

Changed only that cell to ID 34, an existing purple building facade that permits horizontal traversal when supported by a floor. No global wall collision rules changed. Upper walls remain solid; the rise at column 66 and the exit's intentional full-column barrier are unchanged.

Verification: `_dev/level1_lower_rooftop.mjs` 7 passed (both directions, floor support, original-wall reproduction, upper-wall preservation); player spawn suite 9 passed. Existing level2_fork suite 45 passed / 2 pre-existing failures in Level 5; Level 2 closed/open chest-pocket reachability passes. No browser visual QA claimed.

For Aki and Chief's laptop edits: preserve unsaved changes. If the laptop's level snapshot predates this correction, replace tile (49,15) from 27 to 34 in that snapshot before publishing it; otherwise a full-level SAVE could restore the blocked wall. Do not reload over unsaved level work.
