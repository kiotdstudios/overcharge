# night-city-buildings/convenience_store

Modular convenience store, same panel-size convention and style reference as
`assets/objects/night-city-buildings/warehouse/` (same family - the two share
the `building` tag and both show under the Builder's "Buildings" quick filter).

## Scale (32px tile grid, matches warehouse exactly)
- `store_left.png` — 192x256px / 6x8 tiles — end-cap wall, fencing, trash, graffiti, antenna
- `store_vending_bay.png` — 160x256px / 5x8 tiles — three vending machines against the wall
  (direct callback to `assets/objects/night-city-props/vending-machine/`)
- `store_front_bay.png` — 160x256px / 5x8 tiles — glass display window, "MART" neon sign, OPEN sign, door
- `store_right.png` — 128x256px / 4x8 tiles — end-cap wall, camera, billboard/poster, water tank sliver
- `store_blank_wall.png` — 160x256px / 5x8 tiles — plain wall variant, no vending machines, swap-in
  alternative to `store_vending_bay.png` for a less busy storefront run

Placed left-to-right (`left`, `vending_bay` or `blank_wall`, `front_bay`, `right`)
the panels line up edge-to-edge into one 640x256px / 20x8 tile storefront.
`preview_stitched.png` shows all 5 panels side by side (QA only, not a game asset).

## Style source
Same approach as the warehouse: PixelLab `create_image_pro_flash`, each panel
using a cropped/downscaled copy of `assets/objects/night-city-props/
vending-machine/00.png` as the `style_image` reference.

## Status
Wired into `assets/ASSET_MANIFEST.json` as 5 placeable decoration items,
tagged `building` (same tag-driven "Buildings" filter as the warehouse - no
separate filter needed). Not yet placed in any level JSON.
