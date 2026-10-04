# night-city-buildings/coffee_bar

Coffee bar storefront identity panel. Originally generated as a 4-panel
family matching the warehouse's 192/160/160/128 width scheme (`left`,
`wall_bay`, `front_bay`, `right`). The user removed `left`, `wall_bay`, and
`right` from PixelLab (metal-top/brick-bottom end-caps with "feet tile" studs
at the base) and asked to drop them from the Builder too (2026-10-04) —
**standing exception** to the 4-panel convention in
`docs/BUILDING_FAMILY_ASSET_SPEC.md` section 1, same class of logged
exception as prior per-family deviations.

## Current panel
- `front_bay.png` — 160x256px / 5x8 tiles — glass display window showing the
  warm-lit interior (counter, pendant light, coffee cup), door, and a "COFFEE BAR"
  neon sign stacked on two lines — the storefront identity panel. Placeable
  as a standalone wall segment; no left/right end-caps or plain wall bay exist
  for this family anymore.

## Style source

Generated via PixelLab `create_image_pro_flash`, using a cropped/downscaled
copy of `assets/objects/night-city-props/vending-machine/00.png` as the
`style_image` reference, locking material/outline/palette to the actual Night
City Props asset. Palette confirmed against the project's standing lvl-1
rule: deep indigo/near-black base (`#03010c`-`#232450`), cyan/lavender/steel-blue
accents only (`#72bdce`, `#868fc8`, `#5e8baa`, `#3d3d6d`), no magenta/pink
anywhere.

**Reference example for this family: WAREHOUSE only** — per standing
instruction, the convenience-store (MART) family is not used as a reference
or model for any building-family work, including this one.

## Status

Wired into `assets/ASSET_MANIFEST.json` as a single placeable decoration item
(`building_nc_coffee_front_bay`), tagged `building` (same tag-driven
"Buildings" filter as the warehouse — no separate filter needed). Not yet
placed in any level JSON.
