# night-city-buildings/tire_shop

Modular "RUSS'S TIRE SHOP" auto-repair storefront, same 4-panel/640px convention
as `assets/objects/night-city-buildings/warehouse/` (same family — shares the
`building` tag and shows under the Builder's "Buildings" quick filter).

## Scale (32px tile grid — 4 panels, 640px total)
- `left.png` — 192x256px / 6x8 tiles — plain brick end-cap wall, city skyline backdrop
- `wall_bay.png` — 160x256px / 5x8 tiles — chain-link fence, "GRIP CITY" banner,
  a "NEW / USED / REPAIR / CUSTOM / BALANCE" sign post, street lamp
- `front_bay.png` — 160x256px / 5x8 tiles — the storefront identity panel: hanging
  magenta/cyan neon sign reading "RUSS'S TIRE SHOP" above an open roll-up garage
  door with a car parked inside, rooftop pipes/tank
- `right.png` — 128x256px / 4x8 tiles — "24 HR" magenta neon badge, street lamp,
  brick/stone pillar wall

Placed left-to-right (`left`, `wall_bay`, `front_bay`, `right`) the panels line up
edge-to-edge into one 640x256px / 20x8 tile storefront, matching the warehouse's
192/160/160/128 width scheme.

## Standing-rule exceptions for this family (direct Chief correction, 2026-10-03)

This family intentionally breaks from two rules that otherwise apply to every
other lvl-1 building family:

1. **Brick/stone wall material, not corrugated sheet metal.** Chief explicitly
   rejected the warehouse/coffee_bar/store corrugated-ribbed-metal look ("looks
   like a shipping container wall exterior") and asked for real brick/stone
   masonry instead, cropped directly from his reference screenshot. **This is now
   the new default wall material for every future building family** going
   forward — not just this one.
2. **Reference image followed closely, not mood-only.** Chief supplied a "NEON
   TIRES" garage screenshot and asked for "an exact replica... just change the
   name." Per `docs/BUILDING_FAMILY_ASSET_SPEC.md` section 6, a reference
   normally governs mood/composition only, never palette or layout — that rule
   was overridden here on explicit instruction. All composition elements from
   the reference were kept (fence banner, signpost, roll-up door + car, rooftop
   pipes/tank, 24 HR badge, magenta/cyan neon palette including magenta/pink,
   which the standing Night City Props palette otherwise forbids). The ONLY
   change from the reference is the business name: "NEON TIRES" → "RUSS'S TIRE
   SHOP" on the main sign. "GRIP CITY" and the "NEW/USED/REPAIR/CUSTOM/BALANCE"
   signpost are unrelated to the shop's own name and were kept as-is.

The plain-panel rule (section 2) still applies in spirit — `left.png` and
`right.png` carry only the brick wall + one small identity badge each (skyline
backdrop, 24 HR sign), no extra props — but `wall_bay.png` is not fully plain by
design, since the fence/banner/signpost are composition elements carried over
from the reference, not optional placeable props.

## Style source

Generated via PixelLab `create_image_pro_flash`, each panel using a cropped/
downscaled region of the Chief-supplied reference screenshot itself as the
`style_image` (not a Night City Props crop, unlike every other family) — brick
wall texture for `left`, the fence/banner/signpost region for `wall_bay`, the
main sign/door/car region for `front_bay`, the 24 HR badge/pillar region for
`right`. Generated with `no_background: false` (background removal erased the
whole `front_bay` image on first attempt — opaque generation + a border
flood-fill alpha pass was used instead to isolate content cleanly).

**Reference example for building-family *structure* (panel count/widths):
WAREHOUSE.** The *reference-image/palette/material* approach for this specific
family came from Chief's own screenshot and correction, not from WAREHOUSE or any
other existing family.

## Status

Wired into `assets/ASSET_MANIFEST.json` as 4 placeable decoration items
(`building_nc_tire_left`, `building_nc_tire_wall_bay`, `building_nc_tire_front_bay`,
`building_nc_tire_right`), tagged `building` (same tag-driven "Buildings" filter
as warehouse/coffee_bar/store — no separate filter needed). Not yet placed in any
level JSON.
