> ## STATUS: REJECTED REVIEW DRAFT — DO NOT REGISTER, DO NOT USE
> Rejected by review on 2026-10-15 for **seam drift**: the parapet/slab bands
> land at different heights on every panel (y 3-25 for the cap, y 90-182 for
> the slab bands), so the four panels do not snap into one continuous building
> and the family fails snap-piece acceptance. The two PixelLab generation tries
> allowed by order AKI_26 are spent, so this is **FAIL**, not PASS. Post-hoc
> band stretching is forbidden (spec section 4); a fix needs a band-aligned
> regeneration or an inpaint pass under a new order. These files are kept only
> as review evidence.

# night-city-buildings/apartment_hint

Modular apartment-block facade family — the hint building for the AC secret
(`docs/KIRO_ORDER_AKI_26.md` Part 2 item 1). Built fresh from
`docs/BUILDING_FAMILY_ASSET_SPEC.md` with the warehouse family as the only
reference example.

## Scale (32px tile grid, 4 panels, 640px total — spec section 1)
- `left.png` — 192x256px / 6x8 tiles — plain brick end-cap, corner pilaster on the left edge
- `wall_bay.png` — 160x256px / 5x8 tiles — plain brick wall segment
- `front_bay.png` — 160x256px / 5x8 tiles — the identity panel: ONE open window opening
- `right.png` — 128x256px / 4x8 tiles — plain brick end-cap, corner pilaster on the right edge

Placed left-to-right in that order the panels fill one 640x256px / 20x8 tile
front. All four are full-bleed and fully opaque (alpha 255 everywhere, bbox =
full canvas), matching the newer `tire_shop` convention rather than
warehouse's transparent-inset panels.

## Identity feature
`front_bay.png` carries the single structural feature this family exists for:
an open window opening cut through the brick, steel frame + concrete sill, a
dark room interior with one cool-cyan light strip. Measured interior opening
**60 x 86 px** (x 29-88, y 79-164) — just under 2 x 3 tiles, large enough for
the Part 2 item 2 window NPC to lean out of. Nobody is drawn in the window.

## Plain-panel + empty-roof rule (spec section 2)
`left`, `wall_bay` and `right` are bare brick: no windows, doors, cameras,
antennas, pipes, vending machines, posters, graffiti, signage or text. Every
panel's roofline is a plain flat parapet cap with nothing on it — no AC units,
tanks, vents, aerials or railings. Verified by eyeball at 2x per panel.

## Style source (spec section 3)
PixelLab `create_image_pro_flash`, custom canvas sizes (beta).
- Pass 1 style_image: `assets/objects/night-city-props/vending-machine/00.png`,
  cropped to its content bbox and downscaled to 120x168 so it fits every panel
  canvas, on an opaque `#03010c` field.
- Pass 2 style_image (shipped art): a 110x100 plain-brick crop taken from the
  pass-1 window panel, so material, outline weight, shading and palette all
  come from one locked-correct source for all four panels.

## Verification (spec section 5, PixelLab inspection checklist)
- Edge-pixel check: border 2px mean vs interior mean per panel —
  left 19/25/62 vs 22/30/69, wall_bay 15/22/60 vs 19/30/73, front_bay
  21/31/73 vs 22/33/72, right 17/27/65 vs 20/33/74. No bright ring, no
  vignette/padding artifact on any panel.
- Alpha: min = max = 255 on all four (opaque fill, as intended).
- Palette: magenta/pink pixels (hue 270-345 deg, sat > 0.18) = **0.000%** on
  every panel; warm pixels (hue < 60 or > 330, sat > 0.25) = **0.000%**.
- Colour grade vs warehouse benchmark: family mean RGB 21/31/72 vs warehouse
  stitched 28/37/71 — same cool blue-cyan temperature and brightness band.
  `preview_qa_vs_warehouse.png` is the side-by-side eyeball (apartment on top).
- `preview_stitched.png` / `preview_contact_sheet.png` are QA references only, not game
  assets.

## Known rough edge (flagged, NOT fixed — 2 generation tries used, per order)
The horizontal concrete floor-slab bands do not line up panel-to-panel, so the
stitched 640px run reads as four related wall segments rather than one
continuous building:

| panel | parapet cap y | slab band y |
|---|---|---|
| left | 21-25 | 112-114 |
| wall_bay | 3-6 | 90-96, 176-182 |
| front_bay | 4-9 | 166-169 |
| right | 14-22 | 132-134 |

`wall_bay`'s top band also sits at the very top edge instead of reading as a
parapet cap like `left`/`right`, and its bands are the brightest cyan of the
four. Same failure class as warehouse's documented roofline drift (each panel
generated independently). Fixing it properly needs a band-aligned regeneration
or an inpaint pass, not a post-hoc stretch (spec section 4 forbids that).

## Status
**NOT registered.** `assets/ASSET_MANIFEST.json` and `manifest.json` are
untouched and no level JSON was modified — Chief reviews the art before
manifest registration (order 26 acceptance line: "shown to Chief before
registering"). Rejected review evidence was committed on agent/aki-order26; it remains unregistered and unplaced, and this draft must not be used.
