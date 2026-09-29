# Overcharge hero v3

Redesign of the current hero: young Black male, swept short locs, dark streetwear jacket and cargo pants, purple panels/high-tops and cyan electrical gloves. Created using built-in imagegen with the new idle sheet as the identity reference for every state. Exact prompts are in prompts.json.

## Deliverables
16 states, eight frames per state, east and west exports: **256 individual PNGs and 32 sheets**. Ladder directions are back-view art and intentionally identical between east/west folders. Other west frames are horizontal mirrors, not separately drawn left-side costume views.

| State | FPS | Playback |
|---|---:|---|
| Idle | 6 | Loop |
| Walk | 10 | Loop; game adjusts to movement speed |
| Run | 14 | Loop |
| Jump | 10 | One shot in preview; game selects airborne poses by velocity |
| Ledge climb / mantle | 10 | One shot |
| Death / down | 9 | One shot, holds down pose |
| Hurt | 16 | One shot |
| Stunned | 8 | Loop |
| Energy strike | 18 | One shot |
| Wall slide | 8 | Loop |
| Grapple | 10 | One shot, holds suspended pose |
| Ladder up | 10 | Loop, back view |
| Ladder down | 8 | Loop, back view |
| Absorb | 10 | Loop |
| Discharge | 10 | Loop |

## Preview
From this folder run `python -m http.server 8772 --bind 127.0.0.1`, then visit http://127.0.0.1:8772/preview.html . Select any state and facing. One-shot animations hold their last frame; Replay restarts them. The preview includes a game-scale sample and all eight frames. System reduced-motion preference pauses playback.

## Export geometry
- Uniform 512 × 512 frame canvases; 2048 × 1024 sheets, four columns by two rows.
- Ground reference anchor [256,496]. Suggested game display size 80 × 80; feet at rounded display row 78.
- Source generator actually returned 1774 × 887 sheets. Those originals are included, unchanged.
- Extraction applies binary alpha, a shared 32-color navy/purple/cyan/skin palette, and padding/whole-pixel placement. No source scaling. The death sheet's nonuniform row split is measured separately. Grounded poses are aligned to a common baseline; airborne and traversal poses keep their authored vertical variation.
- Generated pixel-style art, not hand-placed native 80px sprites. Inspect nearest-neighbor game-scale rendering before final art lock. Some pose/volume drift and locally clipped electrical effects remain in the generated source; long grapple rope and discharge beams should be drawn separately by the engine.

## Integration already performed in the local v2 game
`assets/sprites/hero-v3/` contains the frame folders. `src_scroll/sprites.js` re-exports the new `hero-sprites.js` animator. Player rendering is 80px with the existing foot anchor; the HUD portrait uses the new idle face. Idle/walk/run/jump/absorb/discharge now use the new hero. Attack and damage/stun signals select the new visual states. Physics, collision dimensions, damage and energy rules are unchanged. Original sprite folders remain intact.

The animator supports death, but the opening prototype immediately restores its checkpoint on death; it does not yet wait to show the full collapse. Ledge climb, wall slide, grapple and ladder animations are ready as assets, but those mechanics have NOT been added. Do not infer wall sliding from ordinary wall collision. Future mechanics should pass `status.traversal` explicitly, or call `setState` and advance the selected animator. Attachments/rope endpoints and mantle root motion need authoring against the real level geometry.

The game passes an optional status object after the existing update arguments: `{dead, hurt, stunned, attacking, traversal}`. Visual priority is death → hurt → stunned → explicit traversal → strike → absorb → discharge → jump → run/walk/idle. One-shot strike continues after the short hit effect ends. Direction switches preserve the same animation phase. Missing frames fall back to a loaded idle frame.

## Next-agent files
- `integration/hero-sprites.js`: reusable animator; paths expect assets/sprites/hero-v3/<state>/<east|west>/frame_NNN.png.
- `integration/hero_animation.mjs`: animator regression tests (adjust import path when running outside the game).
- `legacy-sprites.js`: previous animator for rollback with original art.
- `manifest.json`: geometry, timing, loops and visible bounds.
- `validation.json`, `palette.json`: measured output data.
- `originals/`: source sheets; `frames/` and `sheets/`: deliverable PNGs.
- `build_pack.py`: local reproducible export script; requires Pillow/NumPy and original generation paths. Update SRC/FILES for another machine.

The player pack is not a full game. Game checks at delivery: 1,569 passed across 23 suites, including 52 animator and 8 projectile integration checks.

## Revision 3.1 — motion and K projectile
Walk/run sheets were regenerated to reduce the repeated high-knee poses, and horizontal face alignment stabilizes the gait. The run head anchor stays fixed; walk feet share a baseline. Movement sprites preload and preserve phase between walking/running and left/right turns. Both gaits advance with movement speed (walk: speed/11 fps, run: speed/14 fps).

A new eight-frame projectile-cast state runs at 20 fps, starting with palm release and holding its recovery through the existing short hit-effect timer. Player._attackKind distinguishes ranged K shots from near-enemy melee. Status.projectile selects the cast state; the existing melee state remains separate. The bolt renderer in integration/projectile-vfx.js draws animated cyan core, violet tail and sparks along the existing velocity; projectile collision, speed and damage remain unchanged. Its integration point is ElectricBolt.draw(ctx) → drawProjectile(ctx,this).

The 3.1 prompts are in motion-fix-prompts.json. Existing v3 ZIP remains an earlier snapshot. Current frame folders and game use revision 3.1.

## Targeted frame-3 correction (after 3.1 ZIP)
The individual walk frame_003.png files supersede the earlier sheet cell and ZIP: a corrected passing pose keeps the near leg straight while the far leg swings forward. This source is 1254px square and must be drawn into the nominal 512px frame; the game and preview scale it at draw time. The whole gait remains under review. Do not rebuild/export from the older sheets without this override. Projectile origin now uses integration/hero-attachments.js (cast hand socket), and Player._updateAttack uses it for the actual bolt spawn. Existing ZIPs are historical snapshots.
