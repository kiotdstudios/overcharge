# night-city-buildings/filler_wall

Generic alley-gap filler wall panels: narrower (4x8 tile) bare-brick panels
meant to plug gaps between the wider building modules (warehouse,
convenience_store, abandoned_apartment) without introducing a new "building".
Shares the `building` tag and shows under the Builder's "Buildings" quick
filter, but tagged `filler_wall` to distinguish from an actual building face.

## Scale (32px tile grid)
Each panel is 128x256px / 4x8 tiles, same wall base (dark weathered brick,
grime, water stains, moody blue-purple lighting) with one small distinguishing
element:

- `filler_wall_01.png` — bare wall, grime only, no extra prop
- `filler_wall_02.png` — bare wall + trash can at the base
- `filler_wall_03.png` — bare wall + traffic cone at the base
- `filler_wall_04.png` - height-matched bare wall + graffiti tag, preserving older placed references
- `filler_wall_04_heightmatched.png` - Builder-selected version of that panel, with visible brickwork from y=46 to y=240 to match the warehouse base

`preview_stitched.png` predates the height adjustment and is for historical QA only.

## Style source
PixelLab `create_image_pro_flash`, each panel using a cropped/downscaled copy
of `assets/objects/night-city-props/vending-machine/00.png` as the
`style_image` reference (same style source as the rest of the building family).

## Status
Wired into `assets/ASSET_MANIFEST.json` as 4 placeable decoration items,
tagged `building` + `filler_wall`. Not yet placed in any level JSON.
The fourth manifest item points at `filler_wall_04_heightmatched.png`; the previous PNG is archived at `level_archive/assets/filler_wall_04-before-height-match.png`.
