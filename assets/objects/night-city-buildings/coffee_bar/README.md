# night-city-buildings/coffee_bar

Modular coffee bar storefront, same panel-size convention and style approach as
`assets/objects/night-city-buildings/warehouse/` (same family — shares the
`building` tag and shows under the Builder's "Buildings" quick filter).

## Scale (32px tile grid, matches warehouse exactly — 4 panels, 640px total)
- `left.png` — 192x256px / 6x8 tiles — plain end-cap wall
- `wall_bay.png` — 160x256px / 5x8 tiles — plain wall segment
- `front_bay.png` — 160x256px / 5x8 tiles — glass display window showing the
  warm-lit interior (counter, pendant light, coffee cup), door, and a "COFFEE BAR"
  neon sign stacked on two lines — the storefront identity panel
- `right.png` — 128x256px / 4x8 tiles — plain end-cap wall

Placed left-to-right (`left`, `wall_bay`, `front_bay`, `right`) the panels line up
edge-to-edge into one 640x256px / 20x8 tile storefront, matching the warehouse's
192/160/160/128 width scheme exactly. `preview_stitched.png` shows all 4 panels
side by side (QA only, not a game asset).

All panels are PLAIN — no baked-in cameras, antennas, pipes, posters, or any other
decoration. Those are separate placeable props in `assets/objects/night-city-props/`
the user drops in himself. The only panel with anything beyond bare wall is
`front_bay`, and only because the storefront window/sign/door IS the structural
identity that panel exists for — standing rule, applies to every lvl-1 building
family (`docs/BUILDING_FAMILY_ASSET_SPEC.md`).

## Style source

Generated via PixelLab `create_image_pro_flash`, each panel using a cropped/
downscaled copy of `assets/objects/night-city-props/vending-machine/00.png` as the
`style_image` reference, locking material/outline/palette to the actual Night City
Props asset. Palette confirmed against the project's standing lvl-1 rule: deep
indigo/near-black base (`#03010c`-`#232450`), cyan/lavender/steel-blue accents only
(`#72bdce`, `#868fc8`, `#5e8baa`, `#3d3d6d`), no magenta/pink anywhere.

All 4 panels generated in one pass against the same style reference and material
brief, so height/roofline/material stay consistent panel-to-panel without a
separate normalization step (`docs/BUILDING_FAMILY_ASSET_SPEC.md` section 4).

**Reference example for this family: WAREHOUSE only** — per standing instruction,
the convenience-store (MART) family is not used as a reference or model for any
building-family work, including this one.

## Status

Wired into `assets/ASSET_MANIFEST.json` as 4 placeable decoration items, tagged
`building` (same tag-driven "Buildings" filter as the warehouse — no separate
filter needed). Not yet placed in any level JSON.
