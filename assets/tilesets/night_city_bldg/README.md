# night_city_bldg tileset

**Not part of the modular warehouse/storefront building system** (`assets/objects/night-city-buildings/`).
This is a separate, earlier set of flat 16x16 abstract wall-panel tiles - keep
these two asset families apart; do not tag or group them together.

16x16 building-wall tiles generated with PixelLab `create_tiles_pro`, styled from the
existing `assets/objects/night-city-props/` palette (same dark-base/cyan/violet/amber
hex values already catalogued in `docs/OVERCHARGE_Electric_City_Palette.html`), matching
the simple flat-tile convention used by `purple_city/tiles/` and `purple_rooftop/tiles/`.

## tiles/ (curated, 6 picks)
- `nc_bldg_wall_a.png`, `nc_bldg_wall_b.png` — plain dark riveted panel variants
- `nc_bldg_wall_cyan.png` — panel with thin cyan neon seam
- `nc_bldg_wall_violet.png` — panel with violet-pink trim edges (works as a column/end-cap piece)
- `nc_bldg_wall_amber.png` — panel with small amber warning light
- `nc_bldg_cap_cyan.png` — top-edge/roof-cap panel with cyan trim line

## raw/
All 16 generated variants, unfiltered, for picking more variants later.

## Status
Not yet wired into `assets/ASSET_MANIFEST.json`, `manifest.json`, or any level JSON —
raw assets only. Say the word if you want these registered and placed in a level.

Generated via: `create_tiles_pro` (tile_id `207c1034-c51e-4138-99f7-dd348b85a371`), tile_size 16, view "side".
