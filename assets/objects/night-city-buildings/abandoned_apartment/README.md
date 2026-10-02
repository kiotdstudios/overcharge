# night-city-buildings/abandoned_apartment

Modular abandoned apartment building: a weathered downtown apartment above a
derelict storefront. Same family as `warehouse/` and `convenience_store/` -
shares the `building` tag and shows under the Builder's "Buildings" quick
filter.

## Scale (32px tile grid, matches warehouse/convenience_store)
Two rows of panels, each 160x256px / 5x8 tiles. Stack a `top` panel directly
above a `bot` panel of your choice to build one 160x512px / 5x16 tile
building face; place faces side by side to vary the street.

- `abandoned_top1.png`–`abandoned_top4.png` — top floor, boarded/broken apartment
  windows, varied grime/damage per variant
- `abandoned_bot1.png`–`abandoned_bot4.png` — ground floor, boarded-up/derelict
  storefront, varied signage/damage per variant

Mix-and-match any top with any bot (4x4 = 16 possible faces from 8 panels).
`preview_stitched.png` shows all 4 tops in a row above all 4 bots in a row
(QA only, not a game asset — not meant to represent an actual stacking).

## Style source
PixelLab `create_image_pro_flash`, each panel using a cropped/downscaled copy
of `assets/objects/night-city-props/vending-machine/00.png` as the
`style_image` reference (same style source as warehouse/convenience_store,
keeps the whole building family visually consistent).

## Status
Wired into `assets/ASSET_MANIFEST.json` as 8 placeable decoration items,
tagged `building`. Not yet placed in any level JSON.
