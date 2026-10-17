# Level 1 palette and tile-support pass

The original 19 Night City panels remain in Level 1, with Level 1-only muted-wall variants for the apartment, Garry's Electronics, Russ's Tire Shop, and Bry's Library. The cool masonry now uses the warehouse/streetlamp blue-violet balance while neon signs and warm windows retain their contrast. Original Builder images remain unchanged.

The apartment, warehouse, library, and gatehouse already had solid tiles under their entire baselines. Garry's 640px frontage extended beyond a 544px invisible one-way strip; the facade is fitted to x=1568..2112, and row 10 columns 49..65 are now visible blue rooftop tiles. Two slim noncolliding tile-art supports connect this elevated roof visually to the lower ground, leaving the lower passage open. Russ's 288px frontage extended beyond its 256px roof; it is fitted to x=2176..2432. No tile was placed across the gap between Garry's and Russ's roofs.

The previous level is archived at `level_archive/level1-2026-10-06-before-roof-support.json`. `scripts/harmonize_level1_buildings.py` regenerates the Level 1 art variants; `scripts/refine_level1_facades.py` checks expected placements before applying the tile and support edits. `previews/level1-palette-tile-audit.png` is a static whole-level review image, not a runtime screenshot.

`_dev/level1_city_dress.mjs` checks every facade's full baseline against solid blue ground, tile edits, sign reach and visual supports. `_dev/facade_routes.mjs` checks the open lower route and top landing. A complete manual playthrough remains needed for final visual acceptance.
