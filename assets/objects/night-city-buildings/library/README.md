# Bry's Library facade

Four placeable, non-colliding facade panels, left to right: `left.png` (192×256), `wall_bay.png` (160×256), `front_bay.png` (160×256), and `right.png` (128×256). Together they form a 640×256 building with a bare roof, varied lit window interiors, planters, a trash can and bike racks. The wall palette follows the Night City warehouse's muted blue-violet steel, while the BRY'S LIBRARY sign remains part of the entrance panel. The powered BOOKS wall sign is a separate Builder object in `night-city-props/book-sign`.

`source.png` is the generated master. Run `scripts/build_library_panels.py` to regenerate the panels and `preview_stitched.png`. The panels have no baked sidewalk or rooftop floor tile; place them on the game's existing tiles. This pack does not modify Level 1.
