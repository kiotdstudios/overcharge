# Garry's Electronics facade

Four seamless placeable panels, left to right: `left.png` (144x256), `wall_bay.png` (144x256), `front_bay.png` (176x256), `right.png` (176x256). Together they form a 640x256 facade. All windows and entrance glass are frosted; there is no readable shop interior or repeated product list on the left.

The permanent GARRY'S ELECTRONICS lettering is baked into the front bay. The orange plug is deliberately absent from the facade: place the separate powered `night-city-props/plug-sign` over the logo using the Builder. The four panels are visual dressing only, with no collision or floor tiles. This pack does not place anything in Level 1.

`source.png` is the generated master. Run `python scripts/build_garrys_electronics.py` to regenerate the four panels and `preview_stitched.png`.
