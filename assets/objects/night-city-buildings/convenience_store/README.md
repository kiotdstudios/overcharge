# night-city-buildings/convenience_store

Modular convenience store, same panel-size convention and style reference as
`assets/objects/night-city-buildings/warehouse/` (same family - the two share
the `building` tag and both show under the Builder's "Buildings" quick filter).

## Scale (32px tile grid, matches warehouse exactly - 4 panels, 640px total)
- `store_left.png` — 192x256px / 6x8 tiles — plain end-cap wall
- `store_wall_bay.png` — 160x256px / 5x8 tiles — plain wall segment
- `store_front_bay.png` — 160x256px / 5x8 tiles — glass display window, "24/7 MART" neon sign
  (stacked two lines), OPEN sign, door — the storefront identity panel
- `store_right.png` — 128x256px / 4x8 tiles — plain end-cap wall

Placed left-to-right (`left`, `wall_bay`, `front_bay`, `right`) the panels
line up edge-to-edge into one 640x256px / 20x8 tile storefront, matching the
warehouse's 192/160/160/128 width scheme exactly. `preview_stitched.png`
shows all 4 panels side by side (QA only, not a game asset).

All panels are PLAIN — no baked-in cameras, vending machines, antennas,
pipes, posters, or any other decoration. Those are separate placeable props
in `assets/objects/night-city-props/` the user drops in himself. The only
panel with anything beyond bare wall is `front_bay`, and only because the
storefront window/sign/door IS the structural identity that panel exists
for — standing rule, applies to every lvl-1 building family.

## Style source
Same approach as the warehouse: PixelLab `create_image_pro_flash`, each panel
using a cropped/downscaled copy of `assets/objects/night-city-props/
vending-machine/00.png` as the `style_image` reference.

## Rebuild history (2026-10-02)

**Pass 1** regenerated all 5 (then-existing) panels against the
`vending-machine/00.png` style_image after the original batch drifted
off-palette panel-to-panel (different base material/color temperature per
panel — dark navy metal, lighter gray brick, cyan glass, dark brick again —
read as unrelated buildings bolted together) and the front_bay's MART sign
had drifted toward magenta, off the Night City Props palette.

**Pass 2** (this one) corrected two more misses caught after Pass 1 shipped:
cameras were still baked into `store_left`/`store_right` (should be plain —
cameras are a separate placeable prop), vending machines were still baked
into `store_vending_bay` (should be plain), and the sign only rendered
"MART" with "24/7" cropped off. Fixed by: stripping every panel to bare wall
except `front_bay`, stacking "24/7" and "MART" on two separate neon-sign
lines so both fit without cropping, and consolidating `store_vending_bay`
+ `store_blank_wall` (both now identical — plain walls) into one
`store_wall_bay`, dropping the panel count from 5 to 4 to match the
warehouse's convention. `trim` values recomputed from the new art's actual
content bounding boxes.

Per standing rule: all lvl-1 assets must match the Night City Props color
palette (`assets/objects/night-city-props/`), confirmed via per-asset
palette extraction (vending-machine, streetlight, neon-sign, fuse-box,
security-camera) — deep indigo/near-black base (`#03010c`-`#232450`) with
cyan/lavender glow accents (`#72bdce`, `#868fc8`, `#5e8baa`), no magenta/pink.

## Status
Wired into `assets/ASSET_MANIFEST.json` as 4 placeable decoration items,
tagged `building` (same tag-driven "Buildings" filter as the warehouse - no
separate filter needed). Not yet placed in any level JSON.
