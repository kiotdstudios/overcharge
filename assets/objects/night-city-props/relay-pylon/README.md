# Relay pylon

Order AKI_26 Part 2 item 4. A tall relay pylon that reads at the start of Level 1,
with a lit top. It stands in the plaza at column 14 (`docs/LEVEL_DESIGN_V2.md` 4.3a)
and is the near end of the powered line that leads the eye up the skyline to the
gatehouse beacon.

`pylon.png` -- 96 x 256 px, 3 x 8 tiles on the 32 px grid. 256 px is PixelLab's
maximum canvas dimension, so the pylon is 8 tiles tall rather than a taller figure.
Free-standing decoration, so it keeps a fully transparent 2 px border and the art
is bottom-aligned inside the canvas.

Lattice tower with X bracing, two crossarms carrying insulators, a bolted base
plate, and a lit cyan lantern head on a short mast. The lit head is the same cyan
hue as `light-cable`'s core (QA measures this).

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
