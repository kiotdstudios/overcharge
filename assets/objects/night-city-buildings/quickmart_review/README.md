# QuickMart — four-panel Night City review asset

The updated `docs/GAME_DESIGN_V2.md` and `docs/LEVEL_DESIGN_V2.md` call for a distinct market-street zone in Level 1. This QuickMart adapts the supplied real storefront photo to that zone while following the existing Night City building/prop palette. The sign says **QUIK MART** as in the photo.

Panel order: `left.png` (192×256), `display_bay.png` (160×256), `entrance_bay.png` (160×256), `right.png` (128×256). Together they are 640×256; `tiling_proof.png` verifies seam alignment. The facade has no floor/rooftop tile and no baked-in camera, pipe, vending machine, ladder, or NPC. Window interiors are intentionally different. The storefront lettering and glass doors are structural identity; the market shutter interaction described in Level Design V2 remains a separate future object.

`game_mockup_1x.png` and `game_mockup_2x.png` show scale next to the hero; they are composites, not Level 1 placement. `night_city_comparison.png` shows the existing convenience-store family alongside QuickMart. `audit.json` confirms panel sizes, seams, and opaque/transparency pixels. `_dev/quickmart_panels.py` reproduces exports from `source.png`.

Generated with the built-in image tool from the supplied storefront photograph plus the existing convenience-store, warehouse, and streetlight art. Prompt emphasis: straight-on crisp pixel facade; exact QUIK MART sign; four structural bays; aligned roof and base; near-black/graphite/indigo materials, restrained cyan edge light, amber interiors; no ground tile or separate props.

**Status: review design.** Not registered in the Builder manifest or placed in Level 1 yet.
