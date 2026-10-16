# QuickMart — four-panel Night City review asset

This QuickMart adapts the supplied real storefront photo to the existing Night City building/prop palette. The sign says **QUIK MART** as in the photo. The October 16 `OVERCHARGE_Level1_Roadmap.pdf` is the current Level 1 breakdown: it retains the street as the ground floor and adds a vertical route, but does not specify a QuickMart location. Chief chose the rooftop platform with the streetlamp woman. The four panels are registered in the Builder and placed behind her in Level 1.

Panel order: `left.png` (192×256), `display_bay.png` (160×256), `entrance_bay.png` (160×256), `right.png` (128×256). Together they are 640×256; `tiling_proof.png` verifies seam alignment. The facade has no floor/rooftop tile and no baked-in camera, pipe, vending machine, ladder, or NPC. Window interiors are intentionally different. The storefront lettering and glass doors are structural identity; any charged shutter remains a separate gameplay object.

`game_mockup_1x.png` and `game_mockup_2x.png` show scale next to the hero; they are composites, not Level 1 placement. `night_city_comparison.png` shows the existing convenience-store family alongside QuickMart. `audit.json` confirms panel sizes, seams, and opaque/transparency pixels. `_dev/quickmart_panels.py` reproduces exports from `source.png`.

Generated with the built-in image tool from the supplied storefront photograph plus the existing convenience-store, warehouse, and streetlight art. Prompt emphasis: straight-on crisp pixel facade; exact QUIK MART sign; four structural bays; aligned roof and base; near-black/graphite/indigo materials, restrained cyan edge light, amber interiors; no ground tile or separate props.

**Status: placed in Level 1.** The 640 px source facade is displayed at 544 px wide and 218 px high, from x=1568 to 2112 with its base at y=320. The four panels remain independently selectable in the Builder; the source review files remain here.
