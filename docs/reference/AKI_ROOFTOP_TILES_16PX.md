# Aki task: nine 16×16 rooftop ground tiles

Requested by Chief on October 9, 2026.

## Reference and goal

Open and inspect this PixelLab gallery asset first:

`gallery:14d5a0bb-443c-5417-b90e-2e91600bd0a9`

Create **nine separate 16×16 pixel PNG tiles** that Chief can combine to replicate the current ground/rooftop tiles in OVERCHARGE. Compare the gallery reference with the current rooftop ground art in the latest game/Builder before creating the set. Preserve the reference's materials and details while matching the current rooftop palette, pixel scale and surface treatment. This handoff does not claim the gallery asset has already been inspected.

## Tile set

Use a connected 3×3 terrain set:

| Top left corner | Repeatable top surface | Top right corner |
| --- | --- | --- |
| Repeatable left wall | Repeatable wall fill | Repeatable right wall |
| Bottom left corner | Repeatable bottom edge | Bottom right corner |

Export exactly these nine usable tiles:

1. `roof_top_left.png`
2. `roof_top_center.png`
3. `roof_top_right.png`
4. `roof_middle_left.png`
5. `roof_middle_center.png`
6. `roof_middle_right.png`
7. `roof_bottom_left.png`
8. `roof_bottom_center.png`
9. `roof_bottom_right.png`

Every PNG must be exactly **16×16 pixels**, with crisp pixel edges, no padding, no baked lighting halo outside the tile, and no background outside the terrain silhouette. Keep interior terrain opaque. The top row must read clearly as the walkable rooftop surface; the wall and bottom pieces should complete the same structure.

## Quality checks

- Repeat the top-center and bottom-center tiles horizontally and the middle-left/right tiles vertically without visible seams.
- Repeat the center fill in both directions without obvious discontinuities.
- Assemble several differently sized rooftops, not just one 3×3 block, and inspect at native size and nearest-neighbour enlargement.
- Compare the assembled roofs alongside the current game rooftop tiles. Match their appearance rather than inventing a different building style.
- Verify all nine file dimensions and PNG transparency. Keep the tiles at 16×16; do not substitute larger images displayed at that size.

## Desktop delivery

Put the nine individual PNGs in a new folder named:

`OVERCHARGE_Rooftop_Tiles_16px`

on **Chief/dielp's Desktop**. Resolve the actual Windows Desktop location, including any OneDrive redirection. If working on Aki's other laptop, placing it only on that laptop's Desktop does not satisfy this delivery: transfer it to Chief's computer or clearly report that transfer remains pending.

Also include a small assembled `preview.png` and a `README.md` identifying the gallery reference, tile arrangement and export dimensions. Keep the preview separate from the nine production tiles.

This task is asset creation and desktop delivery. Do not replace current tiles, alter collision, change saved levels or activate the set in the live Builder as part of this order. Report the exact delivered folder path and any unresolved mismatch with the reference.
