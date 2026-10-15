# Beacon top

Order AKI_26 Part 2 item 6. The lit crown for the gatehouse roof at h+19, the far
end of the powered line the plaza pylon and the cable point at
(`docs/LEVEL_DESIGN_V2.md` 4.3a and 4.4 option A).

`beacon_top.png` -- 128 x 96 px, 4 x 3 tiles on the 32 px grid. It sits on the
gatehouse roof, whose panels are 640 px wide in total, so the crown covers roughly
a fifth of the roofline. Free-standing decoration, so it keeps a fully transparent
2 px border and the art is bottom-aligned so it seats on the roof.

A dark steel plinth, a ribbed crown band, five upright prongs of rising height, and
a glowing cyan lamp core. "Same colour as the cable" is the order's wording and is
checked numerically: the lit core's hue is within 0.010 of `light-cable`'s core hue.

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
