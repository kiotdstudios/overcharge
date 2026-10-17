# night_city_wall: 9-tile wall set

Status: CONCEPT / proposal. Not registered in `ASSET_MANIFEST.json`. Not used by any level. `level1.json` is untouched.

## What this is
A flush, repeatable wall tileset built from the exact pixels of the `filler_wall_01..04` panels
(`assets/objects/night-city-buildings/filler_wall/`). Tiles are 32 x 32, fully opaque.

The original panels were generated in PixelLab (`create_image_pro_flash`) and those generations
are not retrievable. The repo PNGs are the only copy, so the tiles are cropped from them.
No new colours are introduced.

## Layout (same as the reference grass block)

```
 wall_tl   wall_t   wall_tr
 wall_l    wall_c   wall_r
 wall_bl   wall_b   wall_br
```

Extras:
- `wall_c_alt1..4`: plain centre variants that mate with `wall_c` on all four sides. Mix them in.
- `overlays/`: transparent-edged stains and glows (`stain_teal_1..3`, `glow_purple_1..2`).
  Draw these on top of the plain wall wherever a spot needs character. They are 32 x 32 with a soft edge.
- `previews/`: assembled wall, the same wall with overlays, repeat tests, the old panels for comparison.

## How the wall is built
- Top row: `wall_tl`, `wall_t` (repeat), `wall_tr`. Roof cap is 12 px, then brick.
- Middle: `wall_l`, `wall_c` (repeat, mix alts), `wall_r`.
- Bottom row: `wall_bl`, `wall_b` (repeat), `wall_br`. Base cap is 8 px.
- Width is any number of tiles, height is any number of tiles (minimum 2 rows).
- Placed on a 32 px grid there are no gaps and no overlap. The old 128 px panels had 14 px of
  transparent margin on each side, which is why the Level 1 walls were not flush.

## Differences from the old panels (on purpose)
- The body is only the 96 px of brick (x16..111 of the source). The 2 px cap overhang on each side is dropped so the cap is flush with the brick.
- Stains were removed from the plain tiles (they are what made the repeat obvious). The stain pixels are
  replaced with brick pixels from the same row of the same panel. Stains live in `overlays/`.
- Seams are closed with Bayer ordered dithering between pixels that already exist in the art.
- Mortar lines of `wall_l`, `wall_r`, `wall_t` and `wall_b` are chosen to line up with `wall_c`.

## Rebuild
Generator: `_dev/tools/walltiles/` (`walltiles_lib.js`, `walltiles_build.mjs`). Needs the Playwright package installed where Node can resolve it (it is not a repo dependency). The copy in the repo is the same code that produced these tiles, with paths made relative; it has not been re-run from inside the repo.
