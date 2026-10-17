# AKI ORDER 024 — Fix Streetlamp Woman NPC Scale and Grounding

**Chief directive:** HIGH PRIORITY visual bug. **Owner:** Aki, sole active developer. **Target:** Level 1, streetlamp woman NPC (Order 021/022). **Evidence:** Chief's gameplay screenshot dated 2026-10-12 shows the woman roughly several times taller than the player and floating over the platform.

## Required result
The adult streetlamp woman must render at **roughly player-character height**, with a small believable difference for heels and hairstyle, standing **on** the platform rather than floating. She should read as an NPC in the same game world, not an enormous foreground cutout. Preserve her original high-resolution sprite PNG frames; fix displayed world-space dimensions, anchor, and transparent-padding treatment.

## Diagnose before editing
1. Inspect the actual `npc_streetlamp_woman` and `npc_streetlamp_woman_greeting` manifest entries (236×236 source frames) and the renderer in `src_scroll/npc.js`, `src_scroll/deco-anim.js`, and Builder `editor/renderer.js`. Compare with the authoritative player world-space height from `src_scroll/hero-render.js` and the hero's actual gameplay render dimensions.
2. Inspect the alpha bounding boxes of **all 18 PNG frames** (9 idle, 9 greeting) to find the occupied figure size and actual foot contact point. **Do not assume the 236px canvas is the body height**; transparent margins may be large. Find a stable animation-wide foot anchor so the character does not bounce as frames change.
3. Verify NPC coordinate convention in `docs/LEVEL_SCHEMA.md`: feet-anchor `(x,y)`. Check the actual Level 1 platform top at the woman's X coordinate, and correct the saved NPC Y only if the data is wrong; do not apply a magic visual offset that breaks future placements.
4. Check whether Builder preview uses different scaling from gameplay and whether the greeting animation changes sprite dimensions or anchor.

## Implement
- Render the **visible figure** at a target height close to the player's visible height (suggest **0.95–1.15× hero visible height**; final size must be judged at native gameplay zoom). Scale uniformly; preserve original source files, transparency, and crisp pixel-art filtering (nearest-neighbor, no smoothing).
- Use a single **documented** display-scale or target-height convention for this asset and all its animations. Do not independently guess width/height per frame; no squash/stretch, no size jumps between idle and greeting.
- Align the bottom of the shoes/boots to the exact sidewalk/platform top in world coordinates. Her feet must remain planted during idle, wave, and hair motions unless an intentional foot-lift animation occurs. Fix draw origin/alpha bounds consistently rather than altering collision or platform geometry.
- Ensure the streetlamp's light cone is visually above/around the character and that the woman does not obscure major traversal cues, the player, HUD, or the checkpoint. Preserve the intended lamp placement and proximity dialogue.
- **Builder parity:** NPC placement thumbnail/ghost, selection bounds, click hit testing, transform handles, and speech-bubble anchor must use the **displayed** scaled figure dimensions, not the raw 236×236 source canvas. At 100% and 235% Builder zoom, preview size and ground contact should agree with gameplay.
- If the renderer currently draws all NPCs at raw frame dimensions, fix the reusable NPC rendering contract (world-space scale + feet anchor) rather than a one-off Level 1 hack. Do not accidentally shrink warehouse mechanics or other decorations.
- Preserve asset quality and all 18 PNGs, animation timing, NPC proximity radius, dialogue data, and Level 1 charge/gate economy.

## Mandatory QA
1. Screenshot in gameplay **at the same scene** with player and streetlamp woman in view: woman approximately human/player scale and shoes touching platform.
2. Screenshot in Builder at 100% and 235% zoom: NPC rendered/selected with correctly sized bounding box and feet anchor.
3. Watch both idle and greeting animations for at least 20 seconds; no jitter, floating, stretching, or changes in displayed height.
4. Walk/jump past her, enter dialogue range, and confirm speech bubble follows her **scaled head position** and clamps to viewport without covering HUD.
5. Spawn a second NPC instance at a different location and verify same sizing/placement rules; reload saved JSON and confirm no scale regression.
6. Run focused NPC tests plus project regression suite; report passes, pre-existing failures, changed paths, branch, and commit SHA.

## Delivery and approval
**EDIT → TEST → COMMIT → PUSH → STATUS → REVIEW.** Aki owns renderer, asset metadata, Builder, and runtime fixes end-to-end. Push all changes and give Chief screenshot evidence and exact tested URL/build SHA. Do not force-push or merge to canonical without Chief approval. No claim of completed fix based solely on source changes.
