# ac-unit — AKI_26 Part 2, item 3 (AC unit recolour)

A third colourway of the rooftop AC unit, for the AC secret. Chief's spec: *"same
size, same frames, same fan animation, new colourway — look and act the exact same"*,
and **keep the existing one too** (nothing in `assets/tilesets/purple_rooftop/props/`
was modified or deleted).

**NOT REGISTERED.** `assets/ASSET_MANIFEST.json` is untouched, no level JSON uses it,
and `src_scroll/source-visuals.js` still points at `hvac_a.png`. Chief reviews
`_qa/contact_sheet.png` first.

## Contents

| File | Size | Drop-in replacement for |
|---|---|---|
| `hvac_d.png` | 33x26 | `assets/tilesets/purple_rooftop/props/hvac_a.png` |
| `hvac_fan_d.png` | 17x26 | `assets/tilesets/purple_rooftop/props/hvac_fan_a.png` |
| `_qa/contact_sheet.png` | — | off / on at 4 fan phases, new vs original |
| `_qa/compare_8x.png` | — | original vs new at 8x, pixel comparison |

`_qa/` holds review images only — the shippable asset is the two PNGs.

## How it was made — and why not with PixelLab

`hvac_b.png` is already a recolour of `hvac_a.png`, and measuring it showed exactly
how the pack was built: a **pure hue rotation of +40.4 degrees**, with saturation,
value and the alpha mask untouched (max dV 0.0000, max dS 0.0000, alpha byte-identical).

So `hvac_d` was produced the same way rather than regenerated: a **-34 degree hue
rotation** of `hvac_a`, S and V preserved per pixel. A generated asset cannot
reproduce an exact pixel geometry, and this item's whole requirement is that the
geometry does not move. No PixelLab generations were spent on this item.

New hue range **189.0-223.5 degrees** — teal/steel-blue, inside the Night City Props
accent band measured off `vending-machine` (191-208) and `charge-platform` (204-224),
and clearly distinct from both `hvac_a` (navy, 223.5-258) and `hvac_b` (purple).

## QA

| Check | Result |
|---|---|
| Dimensions | 33x26 and 17x26 — identical to the originals — PASS |
| Alpha mask | byte-identical to `hvac_a` / `hvac_fan_a` (858 / 442 opaque px) — PASS |
| Alpha bbox | identical — PASS |
| Shape / shading | max dV 0.0000, max dS 0.0000 vs original: only hue moved — PASS |
| Fan hub contact | grilles at source (6,6) and (6,19) unchanged — the hardcoded spoke pivots `(dX+12,dY+12)` / `(dX+12,dY+38)` of the 66x52 draw box still land dead-centre — PASS |
| LED + socket regions | alpha identical at `(dX+54,dY+8)` 4x4 and `(dX+48,dY+33)` 10x10, so the code-drawn LED and socket are not occluded — PASS |
| Magenta / pink | 0 pixels in sat>0.12, hue 285-350 — PASS |
| Vignette / framing | border-to-interior luminance ratio 2.4x on BOTH the original and the recolour — inherited casing rim, no new ring — PASS |
| Transparent 1px border | **FAIL — pending Chief/Kiro waiver** (see below) |

## Transparent-border guard: FAIL, waiver requested

The guard wants a 1 px transparent margin. This asset cannot have one, and the
conflict is being reported rather than worked around:

`hvac_a.png` is a full-bleed box prop — its art fills the canvas and **all 118 border
pixels are opaque at alpha 255**. There is no original margin to preserve. A margin
could only be bought two ways, and both break this item's harder requirement:

1. grow the canvas to 35x28 — breaks "same size";
2. inset the art by 1 px — breaks "exact same pixel alpha/shape", **and breaks the
   fan**, because `drawHvac()` rotates the spokes at hardcoded coordinates of a 66x52
   draw box, so an inset slides both grilles off their pivots.

`hvac_d` therefore stays 33x26 with an alpha mask byte-identical to `hvac_a`. The
guard is a sprite rule; this is a full-bleed prop, the same class as the `hvac_a/b/c`
it sits beside. Marked **FAIL pending waiver**, not quietly passed.

## Fan behaviour

The fan is not in the art. `src_scroll/source-visuals.js drawHvac()` draws the body
PNG into a 66x52 box and then draws the spokes, LED and service socket procedurally,
with `_fanSpeed` / `_fanPhase` driven by `src_scroll/electricity.js` (speed ramps
toward 1 when charged, 0 when drained). Because the recolour moves no geometry, the
same code produces the same motion — off = still, on = spinning. `_qa/contact_sheet.png`
proves it: the sheet renders both colourways through a faithful replica of
`drawHvac()`, OFF plus four fan phases.

Spoke, LED and socket colours stay as the code's own literals (`#8b9faa` / `#8fffe0`
etc.) — recolouring those is a code change, which this order did not ask for.

## Proposed manifest block (DO NOT APPLY until Chief approves)

```json
{
  "id": "env_rt_prop_hvac_d",
  "path": "assets/objects/night-city-props/ac-unit/hvac_d.png",
  "category": "decoration",
  "tags": ["hvac", "night_city_props", "prop", "rooftop", "decoration", "ac_secret"],
  "frame_width": 33,
  "frame_height": 26,
  "frame_count": 1,
  "fps": null,
  "directions": null,
  "loop": false,
  "notes": "AC unit, teal colourway. 33x26px. Pure -34deg hue rotation of hvac_a.png: identical geometry and alpha mask, so drawHvac()'s procedural fan, LED and socket align unchanged. Fan motion is code-driven (_fanSpeed/_fanPhase), not baked."
}
```
