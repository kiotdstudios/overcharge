# KIRO ORDER: CODEX 05 (a plain, colour-matched building kit; the tenant as a small figure; a long smooth fan)

> **STATUS (2026-10-17): CLOSED by Kiro.** Codex's review set (docs/reports/CODEX_04_05_REVIEW.md) failed both tasks on his own report. Kiro finished Task 1 (assets/objects/night-city-buildings/apartment_plain/) and Task 2 (assets/sprites/npc-window-tenant-v3/, a new character) and registered both. Codex does not need to redo them. Placement in Level 1 waits for Chief's written order.

**From:** Kiro, Technical Director | **To:** Codex | **Authority:** Chief, 2026-10-16 (round 16 answers)
**Read first:** `docs/orders/KIRO_ORDER_CODEX_04.md` PART 0 (the rules you already have: no switch, keep the ladder, **run the current game and capture real screenshots, never composites**) and `docs/design/GAME_DESIGN_V2.md`. Before you draw anything, check out the live line (`agent/orcha-gameplay`), serve the repo, and play Level 1 up the ladders to the apartment roof. That is the scene your art goes into.
**Status:** work order, nothing started. This **replaces tasks 1 and 2 of CODEX 03** (the tenant and the apartment). Do not edit `src_scroll/levels/*.json`: Chief and Kiro place things.

## What Chief said (all of it, so you do not have to guess)
- "she should appear on the **left panel top floor window**"; "the **big window is gone**".
- "**codex needs to generate plain buildings** so I can add my own ladders and other objects to spice up the design; if he needs to redo the art that's fine."
- "**each window shouldn't look the same** unless it's blinds covering the window, with some looking like a light is on behind it and some dark/empty."
- "**the AC unit should go on the roof**" (Kiro and Chief place it; not your job).
- "she's larger than any other NPC; she needs to **fit inside the windows**. **She should move and not the whole window**; her whole window moves back and forth."
- "fan animation needs to be **smooth and fluid**"; earlier: "needs to last **at least 16 seconds**, slow and sexy" (read this as: slow, languid, unhurried, tasteful; she is a tired tenant in a tank top in a heatwave, nothing explicit).
- Kiro's question to Chief "does the building colour match?" and Kiro's answer is below (it does not).

## Task 1. A plain building kit, colour matched to the street (art)
Today's apartment (`assets/objects/night-city-buildings/apartment_tenant/`) has a fire escape with a ladder, a painted AC box, drain pipes and a fuse box **baked into the art**. Chief wants to place those himself, so the new kit has **none of them**.
- **Panels:** `160 x 256` each (the same grid as the other building families) plus a `192 x 256` left end and a `128 x 256` right end that finish the building with a plain vertical trim. A flat roof edge on top (parapet) so panels stack and the building can sit under a roof tile. **Plain brick wall, window frames, sills, lintels, a parapet and nothing else.** No ladders, fire escapes, pipes, AC units, signs, boxes, cables or props.
- **Variety, by window state.** Make **at least 8 panel variants** with **1 or 2 windows each**, mixing exactly these window states so that no two neighbouring windows look alike:
  1. **blinds down, light on behind them** (warm amber glow through the slats),
  2. **blinds down, dark** (slats, no glow),
  3. **empty and dark** (open or bare glass, black interior, no blinds).
  Also give every panel its own brick wear, stain and trim pattern, so a row of panels does not read as one panel repeated.
- **The tenant window:** one panel variant has a window with **no blinds and a warm lit interior, empty**, reading as an open window a person leans out of. Its **glass opening is 56 wide x 64 tall**, sill included in the art, with the **sill top at a clean horizontal line** (Kiro places the tenant so her bottom edge sits on that line). Tell Kiro the exact pixel box of the opening and of the sill line in your report.
- **Colour (the numbers Kiro measured, 2026-10-16).** Chief's question was "does the building colour match?". **It does not.** The hue is right but the building is **greyer and darker** than the street wall behind it:

| Art | Mean RGB (opaque pixels) | Blue-dominant | Mean hue |
|---|---|---|---|
| Street backdrop wall (`filler_wall`) | **(27, 31, 69)** | 100% | 236 |
| Warehouse | (28, 37, 71) | 99% | 231 |
| Current tenant wall bay (rejected) | (31, 33, 44) | 94% | 238 |
| Current tenant left panel (rejected) | (39, 40, 47) | 88% | 233 |

  In the game the apartment reads brown-grey against a blue-violet wall. **Target for the brick and wall surfaces (windows excluded): mean RGB within 8 of (27, 31, 69), 95% or more blue-dominant, mean hue 230 to 242, and the stains and mortar in the same teal and violet family as `filler_wall`.** Warm colour **only** in lit windows (under 8% of opaque pixels). Sample the actual palette from `assets/objects/night-city-buildings/filler_wall/` and the rooftop tiles in Level 1 rather than choosing colours by eye. The roof edge and parapet must match the rooftop tile Chief uses (tile 43, with the purple neon edge).
- **Proof, mandatory:** (a) an audit table like the one above for every panel, (b) a **real screenshot of the current game** with your panels placed next to the filler wall and the rooftop, at 1x and 2x, (c) a tiling proof of the panels side by side in several random orders (seams invisible, window rows aligned). If the blue-dominant or RGB target fails, fix it before you show it. Two weak tries on one panel, then stop and report.
- **Deliver** to `assets/objects/night-city-buildings/apartment_plain/` (review folder first, `apartment_plain_review/`; **do not register in `ASSET_MANIFEST.json` and do not touch the level until Chief approves**).

## Task 2. The tenant as a small figure inside the window (art)
- **Woman only. No window frame, no sill, no wall.** The building's own window is the window; she is a sprite that stands in it. Bottom edge of the sprite = the sill top line of Task 1's tenant window.
- **Scale:** the same pixel density as the other NPCs. A full-body NPC is **60 px tall** (check `npc_bus_stop_*` in the manifest, `displayHeightPx 60`). She is drawn from the **head to just below the shoulders and forearms resting on the sill** (about the upper half of a person), and she must fit **inside the 56 x 64 opening with margin**: at most about 44 wide x 52 tall of visible pixels. Canvas 64 x 64, fully transparent border. Chief's rule: she is **never larger than the other NPCs**.
- Same character as the current tenant (dark hair up, black tank top, tan skin). Same palette family as the street NPCs (look at them in the running game).
- **Three clips, all with the figure's position fixed so nothing but the body parts moves:**
  1. **hot / fanning (loop):** a **slow, languid** fan. Long eased sweeps of one arm with a paper fan in front of her face and neck, a tired lean of the head, a slow breath, a loose strand of hair stirring. **One loop is at least 16 seconds** before it repeats. **Smooth and fluid:** at least **12 frames per second during the fan sweeps**, with in-betweens and easing; no popping at the loop seam (measure it the way CODEX 04 Part 1 does: no frame-to-frame step above 35% of opaque pixels, and the seam no bigger than the largest inner step). If 16 s at 12 fps is too many unique frames (192), draw fewer unique frames and sequence them with the manifest's `frameOrder` list (the NPC runtime already supports it), or build a **layered rig** (torso and head, upper arm, forearm and hand, fan, hair strands as separate pixel layers) and render the frames by script with pixel snapping; tell Kiro which you chose and why.
  2. **relieved (plays once, then holds):** the AC has just come on. A slow breath out, eyes closing, a **real smile**, shoulders dropping, the fan lowered, a cool breeze lifting loose hair. About **4 to 6 seconds**, smooth. Ends on a relaxed pose that is also fine to look at for minutes.
  3. **relaxed idle (loop):** after the relief clip, a gentle breathing loop (about 2 to 3 seconds) so she is not frozen. (If she is hot again the game goes back to clip 1.)
- **Manifest shape** (to register after approval): `npc_window_tenant` (clip 1, `frame_count`, `fps`, `loop: true`, `displayHeightPx` so that her visible height is about 50 px, `trim`, `footYByFrame` the bottom edge on every frame), `npc_window_tenant_relieved` (clip 2, `loop: false`) and `npc_window_tenant_idle` (clip 3). Kiro wires clip 3 into `npc.js` after the relief clip (small engine change, Kiro's job).
- **Proof, mandatory:** the frame-step table (like CODEX 04), a contact sheet at 4x on dark and light, an animated GIF at game speed, and a **real screenshot of the current game** with her standing in Task 1's tenant window, next to the hero and a bus-stop NPC to show scale, at 1x and 3x. Deliver to `assets/sprites/npc-window-tenant-v2/` (review first; no manifest, no level).

## Task 3. Report
Report as `CODEX 05`: per task PASS/FAIL, commit SHA, the commit of the live line you captured screenshots from, the audit tables, the exact pixel box of the tenant window and its sill line, how many frames and which method for the 16 s loop, tries per piece, and what you did not do. Then HOLD.

## Do not
Touch level files or `ASSET_MANIFEST.json` before approval. Bake ladders, fire escapes, pipes, AC units or any prop into a building panel. Draw her window frame into her sprite. Make her larger than the 60 px NPCs. Add a switch of any kind. Composite screenshots.
