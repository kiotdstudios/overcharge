# Light cable

Order AKI_26 Part 2 item 5. The lit cable that climbs the skyline from the plaza
pylon to the tower, shown as a line of ordinary decorations
(`docs/LEVEL_DESIGN_V2.md` 4.3a).

| File | Size | Role |
|---|---|---|
| `cable_straight_h.png` | 32 x 32 | horizontal run, tiles left/right |
| `cable_straight_v.png` | 32 x 32 | vertical run, tiles top/bottom |
| `cable_corner.png` | 32 x 32 | enters the left edge, leaves the top edge |

**These are tiles, so they deliberately have no transparent border**: the art
bleeds to the tiling edges, which is what lets a run join. The other two assets in
this batch are free-standing props and do keep their border.

The order asks for "a tileable straight run and a corner". The vertical straight is
the third file because the cable's whole job in 4.3a is to climb, and a horizontal
tile plus a corner cannot climb on their own. The other three corner orientations
are 90 degree rotations of `cable_corner.png` and are not shipped as separate files
unless Chief wants them.

## How the seams are guaranteed

The generated master is an extreme close-up, 28 px of cable, so its cross-section
is resampled to 12 px for a 32 px tile and snapped to the locked palette once --
both the straight and the corner read that one list, so they cannot diverge by a
dither tone. Every column of the straight is that same cross-section, so column 0
equals column 31 exactly. The vertical tile is an exact 90 degree transpose of it.
The corner is a 45 degree mitre about the pivot: each pixel takes its stripe from
which side of the diagonal it falls on, which routes every stripe around the bend
and keeps the stack order, instead of a union of two arms crossing each other.
The glow radius is kept at 1.5 px so no blur tail can reach a tile edge.

QA asserts all four joins are pixel-identical and `qa_tiling_proof.png` shows a
four-tile run turning a corner into a four-tile climb.

## Provenance

PixelLab Pro Flash (`create_image_pro_flash`), palette-locked with a `style_image`
cut from existing `night-city-props` art rather than a text-only palette prompt --
per `docs/BUILDING_FAMILY_ASSET_SPEC.md` section 3, text-only palette prompting
drifts and the image reference is what holds it. The generated master is kept in
`source/`. Rebuild with `python _dev/aki26_part2_pylon_cable_beacon.py`.

## Not done

**Not registered in any manifest, and not placed in any level.** Order AKI_26
requires Chief to review each image before it is registered. `assets/manifest.json`,
`assets/ASSET_MANIFEST.json`, the editor code and every level JSON are untouched.
No in-game screenshot: these are not placeable until they are registered.
