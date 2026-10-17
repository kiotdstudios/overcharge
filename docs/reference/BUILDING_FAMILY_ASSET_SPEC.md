# Building Family Asset Spec — OVERCHARGE lvl-1

**Status:** Standing spec. Refer any agent generating a new modular building family
(or regenerating an existing one) to this doc instead of re-deriving the rules.
**Established by:** warehouse family (first), convenience-store/MART family (two
rebuild passes, see history below). Applies to every `nc_building_wall`-tagged family.

---

## 1. Panel structure — 4 panels, 32px tile grid, 640px total width

| Panel | Size | Tiles | Content |
|---|---|---|---|
| left end-cap | 192×256px | 6×8 | plain wall only |
| wall bay | 160×256px | 5×8 | plain wall only |
| front/identity bay | 160×256px | 5×8 | the ONE structural feature this building exists for |
| right end-cap | 128×256px | 4×8 | plain wall only |

Placed left-to-right in that order, the 4 panels must line up edge-to-edge into one
seamless 640×256px / 20×8-tile front. Match this 192/160/160/128 width scheme exactly
— it is the standing convention across every building family so far (warehouse,
convenience store), not a one-off choice.

A family needs more than 4 panels only with explicit sign-off; otherwise reuse this
exact split so facades can be mixed and still read as the same building language.

## 2. Plain-panel rule (standing, non-negotiable)

No baked-in cameras, antennas, pipes, vending machines, posters, graffiti, or any
other prop on ANY panel — **including the rooftop.** Those all exist as separate
placeable items in `assets/objects/night-city-props/` and get dropped in by hand
later. The ONLY exception is the one identity feature the front/identity panel
exists for (e.g. the MART storefront window+sign+door, or the tire shop's hanging
sign) — nothing else, on any panel, including the end-caps and the roofline.

**Rooftop must generate empty** (bare wall-top/skyline only, no AC units, pipes,
tanks, antennas, vents, or cameras baked on). Warehouse's rooftop clutter predates
this clarification and is grandfathered, not a model to copy — every new or
regenerated panel going forward ships with an empty roof, full stop.

This rule was violated twice on the convenience-store family (cameras baked into the
end-caps, vending machines baked into a wall bay) and once on the tire shop's
front/identity panel (pipes + water tank baked onto the roof) — each cost (or will
cost) a regeneration pass. Check for it explicitly before shipping, roofline
included.

## 3. Color palette — Night City Props, locked via style_image

Deep indigo/near-black base (`#03010c`–`#232450`), cyan/lavender/steel-blue accents
only (`#72bdce`, `#868fc8`, `#5e8baa`, `#3d3d6d`). **No magenta or pink anywhere.**

Lock the palette with a `style_image`, not a text/hex-only prompt:
1. Take a real PNG from `assets/objects/night-city-props/` (e.g.
   `vending-machine/00.png`).
2. Crop it to its content bounding box.
3. Downscale it to fit inside the target panel's canvas (PixelLab requires the
   reference to fit inside the target).
4. Pass that cropped/downscaled image as `style_image` for every panel in the family.

Text-only palette prompting drifts off-palette panel-to-panel — a past batch
generated each panel against a different base material/color temperature (dark navy
metal, lighter gray brick, cyan glass, dark brick again) and read as unrelated
buildings bolted together. The image-reference lock is what fixed it.

**Cross-family visual consistency (standing, confirmed 2026-10-03):** every
building family must read as the same game world when placed side by side —
same overall brightness/value range and cool blue-cyan color temperature as the
warehouse family (the visual benchmark), even when wall *material* differs
(e.g. tire shop's brick vs. warehouse's corrugated metal — material choice per
family is fine, color grade is not). A family-specific accent light (e.g. the
tire shop's warm orange garage-interior glow) is allowed only as a small,
localized identity accent — it must not pull the panel's overall base-wall
color grade warmer/darker than the locked palette in a way that reads as a
mismatched, unrelated building next to warehouse. Verification step 5 below
must include an eyeball check against warehouse specifically, not just the
hex-range sample.

## 4. Height consistency — generate it right the first time, do not patch after

Every panel's actual art content should land at a consistent height when generated,
not be fixed afterward by stretching or duplicating existing art.

**Rejected approach (do not repeat):** normalizing panel heights post-generation by
scanning each panel for a flat texture row and duplicating it N times to pad the
shortfall, then cropping surplus padding. This technically worked and passed visual
QA, but Chief rejected it outright: *"wants new art, not stretched art."* Full
revert, see `65eb341` in git history.

**Correct approach:** generate each panel at the target content height from the
start (same `style_image` discipline as palette), or generate dedicated tileable
filler/transition strips per family if a height mismatch surfaces after the fact.
Keep bottom edges aligned (consistent `bottom_pad`, canvas height 256px throughout)
regardless of content height — that part (`bottom_pad=15`) is already standing and
correct, kept through the stretch-revert.

## 5. Verification before shipping

- Render all 4 panels side-by-side as `preview_stitched.png` (QA reference only,
  not a game asset itself) and eyeball the roofline/seams for drift.
- **Place the new family's stitched preview next to warehouse's and eyeball the two
  side by side** — overall brightness, color temperature, and rooftop (must be
  empty) all need to read as the same world. Don't rely on the hex-range sample
  alone; a panel can sample "in range" per-pixel and still look like a different
  building next to warehouse (this is exactly how tire shop shipped once already).
- Recompute `trim` bounding boxes in `assets/ASSET_MANIFEST.json` from the actual new
  content — don't carry over stale values from a prior generation.
- Sample pixels against the Night City Props hex ranges above (don't just trust the
  prompt did what it asked — PixelLab framing/vignette artifacts are a known failure
  mode, see `how.md`'s PixelLab inspection checklist).
- Run `node _dev/run_all.mjs` and confirm the total matches the current baseline —
  no new regressions.

## 6. Reference images — mood only, never layout authority

A reference screenshot (mood board, a different game's building, a Chief-supplied
image) may be handed along with a generation request. It governs atmosphere only —
general composition cues like 'glass window shows the interior' or 'sign hangs above
the door' are fine to borrow. It does **not** govern palette (section 3 is law — a
reference in the wrong palette gets its colors overridden, not copied) and it does
**not** govern exact layout, panel proportions, prop placement, or sign geometry.
This spec (sections 1-5) is law for every building family; a reference image is
never grounds to deviate from it. If a reference and this spec conflict, this spec
wins, every time, no exception.

## 7. Deliverables

- The 4 (or N, with sign-off) PNGs under `assets/objects/night-city-buildings/<family>/`.
- Updated `assets/ASSET_MANIFEST.json` entries: `frame_width`/`frame_height`, `trim`,
  `notes`, and the `family`/`building` tags matching the existing convention so the
  set shows under the Builder's Buildings quick filter.
- A `README.md` in the asset folder documenting scale, style source, and any known
  rough edges — follow the format already in
  `assets/objects/night-city-buildings/convenience_store/README.md` and
  `.../warehouse/README.md`.

---

## History

- **Warehouse family** — first implementation of the 4-panel / 192-160-160-128
  convention. Known rough edge: roofline drifts a few px panel-to-panel at the
  open-bay/closed-bay seam (each panel generated independently, not as one
  continuous image) — flagged, not fixed, informed the height-consistency rule above.
- **Convenience-store (MART) family, pass 1** — regenerated all 5 (then-existing)
  panels against the Night City Props `style_image` after palette drift. Fixed the
  sign's magenta drift.
- **Convenience-store (MART) family, pass 2** — stripped baked cameras/vending
  machines that had survived pass 1, fixed the "24/7 MART" sign cropping to "MART"
  only, consolidated two now-identical plain-wall panels into one, dropping the count
  from 5 to 4 to match the warehouse convention.
- **Height-uniformity attempt + revert** — see section 4. Normalizing all 21
  `nc_building_wall` panels to one content height by duplicating texture rows was
  built, tested (2341/87, no regression), and still reverted because Chief wants new
  art, not patched art. New-generation filler/transition pieces are the correct
  follow-up, not yet built as of this doc.
- **Tire shop family, color-grade correction (2026-10-03)** — shipped version read
  as a different, darker/warmer building next to warehouse despite sampling inside
  the locked hex ranges, and its front/identity panel had pipes + a water tank baked
  onto the roof. Material (brick) is a deliberate, confirmed-standing choice and
  stays — only the color grade and rooftop prop-baking need correcting. Prompted
  sections 2, 3, and 5 above to be made explicit about rooftop-empty and
  cross-family visual consistency, since neither was spelled out before this.
