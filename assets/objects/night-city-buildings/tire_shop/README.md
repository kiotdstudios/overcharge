# night-city-buildings/tire_shop

Modular "RUSS'S TIRE SHOP" auto-repair storefront, same 4-panel/640px convention
as `assets/objects/night-city-buildings/warehouse/` (same family — shares the
`building` tag and shows under the Builder's "Buildings" quick filter).

## Scale (32px tile grid — 4 panels, 640px total)
- `left.png` — 192x256px / 6x8 tiles — plain brick end-cap wall, city skyline backdrop
- `wall_bay.png` — 160x256px / 5x8 tiles — chain-link fence, "GRIP CITY" banner,
  a "NEW / USED / REPAIR / CUSTOM / BALANCE" sign post, street lamp
- `front_bay.png` — 160x256px / 5x8 tiles — the storefront identity panel: hanging
  cyan neon sign reading "RUSS'S TIRE SHOP" above an open roll-up garage
  door with a car parked inside, rooftop pipes/tank
- `right.png` — 128x256px / 4x8 tiles — "24 HR" cyan neon badge, street lamp,
  brick/stone pillar wall

Placed left-to-right (`left`, `wall_bay`, `front_bay`, `right`) the panels line up
edge-to-edge into one 640x256px / 20x8 tile storefront, matching the warehouse's
192/160/160/128 width scheme.

## Standing-rule exceptions for this family (direct Chief correction, 2026-10-03)

This family intentionally breaks from one rule that otherwise applies to every
other lvl-1 building family:

1. **Brick/stone wall material, not corrugated sheet metal.** Chief explicitly
   rejected the warehouse/coffee_bar/store corrugated-ribbed-metal look ("looks
   like a shipping container wall exterior") and asked for real brick/stone
   masonry instead, cropped directly from his reference screenshot. **This is now
   the new default wall material for every future building family** going
   forward — not just this one.

**Reference-image rule, corrected 2026-10-03 (standing, applies to ALL mockup-driven
assets going forward, not just this one):** Chief supplied a "NEON TIRES" garage
screenshot and asked for the layout/composition replicated closely, name swapped
to "RUSS'S TIRE SHOP". The first build (v2/v3) kept the reference's own magenta/
pink neon colors on top of the exact layout — Chief corrected this: **replicate a
mockup's layout/composition/content exactly, but ALWAYS recolor it into the game's
own locked Night City Props palette** (deep indigo/near-black base, cyan/lavender/
steel-blue accents, no magenta/pink), regardless of what colors the mockup itself
uses. A reference image's layout and content govern; its own palette never does.

All composition elements from the reference were kept (fence banner, signpost,
roll-up door + car, rooftop pipes/tank, 24 HR badge) — only the business name
changed ("NEON TIRES" → "RUSS'S TIRE SHOP") and the neon color changed from the
reference's magenta/pink to the game's cyan/lavender palette. "GRIP CITY" and the
"NEW/USED/REPAIR/CUSTOM/BALANCE" signpost are unrelated to the shop's own name
and were kept as-is.

The plain-panel rule (section 2) still applies in spirit — `left.png` and
`right.png` carry only the brick wall + one small identity badge each (skyline
backdrop, 24 HR sign), no extra props — but `wall_bay.png` is not fully plain by
design, since the fence/banner/signpost are composition elements carried over
from the reference, not optional placeable props.

## Style source

Generated via PixelLab `create_image_pro_flash`, each panel using a cropped/
downscaled region of the Chief-supplied reference screenshot as the `style_image`
— brick wall texture for `left`, the fence/banner/signpost region for `wall_bay`,
the main sign/door/car region for `front_bay`, the 24 HR badge/pillar region for
`right`. **The reference crops themselves were recoloured first** (HSV hue-remap,
magenta/pink band → cyan/lavender band, saturation/value preserved) before being
used as `style_image` — a `style_image` region's own colors dominate PixelLab's
output even against explicit "no magenta/pink" text instruction, so the fix has
to happen in the source image, not just the prompt text. Generated with
`no_background: false` (background removal erased the whole `front_bay` image on
an earlier attempt — opaque generation + a border flood-fill alpha pass was used
instead to isolate content cleanly).

**Reference example for building-family *structure* (panel count/widths):
WAREHOUSE.** The *reference-image/material* approach for this specific family
came from Chief's own screenshot and correction, not from WAREHOUSE or any other
existing family — but the *palette* always comes from Night City Props, per the
corrected standing rule above.

## Status

Wired into `assets/ASSET_MANIFEST.json` as 4 placeable decoration items
(`building_nc_tire_left`, `building_nc_tire_wall_bay`, `building_nc_tire_front_bay`,
`building_nc_tire_right`), tagged `building` (same tag-driven "Buildings" filter
as warehouse/coffee_bar/store — no separate filter needed). Not yet placed in any
level JSON.
