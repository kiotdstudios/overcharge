# night-city-buildings/warehouse

Modular warehouse building, generated per `docs/KIRO_...` style brief (dropped as a
message.txt attachment, not a committed doc) requesting a scale-exact, representational
industrial warehouse to sit alongside `assets/objects/night-city-props/`.

## Scale (per brief, 32px tile grid)
- `warehouse_left.png` — 192x256px / 6x8 tiles — end-cap wall, camera, conduit, signage, graffiti
- `warehouse_open_bay.png` — 160x256px / 5x8 tiles — roll-up door open, forklift/crates interior visible
- `warehouse_closed_bay.png` — 160x256px / 5x8 tiles — roll-up door shut, "02" stencil, bollards
- `warehouse_right.png` — 128x256px / 4x8 tiles — end-cap wall, employee door, trash can, fencing

Placed left-to-right in that order the panels line up edge-to-edge into one
640x256px / 20x8 tile warehouse front. `preview_stitched.png` is that assembled
reference (not a game asset, QA only).

## Style source
Generated via PixelLab `create_image_pro_flash`, each panel using a cropped/
downscaled copy of `assets/objects/night-city-props/vending-machine/00.png` as
the `style_image` reference (bbox-cropped to content, downscaled to fit each
panel's canvas — PixelLab requires the reference to fit inside the target
canvas). This locks material/outline/palette to the actual Night City Props
asset rather than the broader Electric City Palette doc, per explicit
instruction to use Night City Props (not Purple City) as the sole reference.

## Status
Wired into `assets/ASSET_MANIFEST.json` as 4 placeable decoration items, tag
`building` (new tag-driven quick filter, same pattern as AKI_19's `pipe` tag).
Not yet placed in any level JSON — available in the Builder's asset bank only.

## Known rough edge
Roofline height drifts a few px panel-to-panel at the open-bay/closed-bay seam
(each panel generated independently, not as one continuous image). Flagged to
Chief; a tile-tight fix would need an inpaint/edit pass aligning the skylines,
not attempted here.
