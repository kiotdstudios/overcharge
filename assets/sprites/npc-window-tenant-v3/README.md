# npc-window-tenant-v3

The tenant for the Level 1 apartment (CODEX 05 Task 2, finished by Kiro on 2026-10-17). Chief's brief: a cute young African American woman with curly hair. She is an adult woman in her twenties, drawn from the head to just below the shoulders with her forearms resting on the sill, a black tank top, a hoop earring and a paper fan.

Replaces the old 176 x 176 art in `npc-window-tenant/` (kept on disk for rollback; nothing points at it any more).

## Clips (all 128 x 128, transparent, one fixed figure position)
| Folder | Frames | Rate | Length | Plays |
|---|---|---|---|---|
| `hot/` (`npc_window_tenant`) | 208 | 12 fps | 17.3 s | loops while the AC is off |
| `relieved/` (`npc_window_tenant_relieved`) | 41 | 10 fps | 4.1 s | once, when the AC turns on; ends on the relaxed pose |
| `idle/` (`npc_window_tenant_idle`) | 24 | 8 fps | 3.0 s | loops after the relieved clip while the AC stays on |

Hot cycle: four slow fan sweeps ("fans her face", "fans her neck and sighs", then both again in reverse) with a one second rest on the key pose between them. Zap the AC and she goes back to the hot loop.

## Size and placement
- `displayHeightPx` 46: she is 46 px tall in the game (the street NPCs are 60 px), her widest pose (hair, fan) is 51.8 px, inside the 56 px window glass.
- Place the NPC at the **bottom-centre of the visible figure** on the sill top line of the tenant window. For `left_end_tenant_window` placed at panel (1, 126): NPC x 102, y 234. (Sill top line is panel y 108; glass centre is panel x 101.5.)
- She faces right.

## How it was made
1. One key pose (PixelLab `create_image_pro_flash`, 128 x 128, 6 generations; style reference: a street NPC) and one relaxed pose (`edit_image_pro_flash`, 6).
2. Clips by PixelLab `animate_image_pixminimax` from the key pose, pinned to end where they started so they chain: hot sweeps A and C (6 each), relieved (6), idle (3).
3. `_dev/tools/tenant_art/tenant_build.mjs` assembles them: uses the exact key pose as each clip's entry frame, drops the model's re-rendered last frame, holds the previous frame for any frame with a colour cast, removes loose specks (wind lines, flying curls), writes frames and `metrics.json`.

## Frame checks (`metrics.json`, `_dev/tenant_art_v3.mjs`)
- Hot: largest step 43.6% of opaque pixels, 4 steps above 35%, loop seam 0%.
- Relieved: largest step 54.9%, 7 steps above 35%, all in two runs of four steady steps where the pale fan crosses the frame (no isolated spike, no colour or position jump).
- Idle: largest step 32.1%, loop seam 2.7%.

## Not done
- The hot cycle repeats content: it is two unique sweeps (A, C) and their reverses. Other sweeps were generated and not used: a neck-fanning clip with a red colour cast (frames mostly unusable), a wipe-the-brow clip whose first frame jumps 62% from the key pose, a head-turn clip that painted a night sky and plant behind her, and a regenerated neck-fanning clip (PixelLab job 9007bf12, gallery asset 168d1cf8) that is clean but moves faster (11 steps above 35% when added). It is the first thing to try if Chief wants more variety.
- Relieved clip: 7 steps are above the order's 35% line (see above). Tween frames would fix that if you want it stricter.
