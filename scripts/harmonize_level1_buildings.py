"""Make Level 1-only facade variants using the warehouse's muted wall palette.

Original Builder sprites remain untouched. Bright signage, windows and lamps retain
their colors; only dark, cool masonry is shifted toward the warehouse/streetlamp
blue-violet family. Re-running this script produces identical PNGs.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/objects/night-city-buildings"
PACKS = {
    "apartment_complex": ("left", "wall_bay", "front_bay", "right"),
    "garrys_electronics": ("left", "wall_bay", "front_bay", "right"),
    "tire_shop": ("front_bay", "right"),
    "library": ("left", "wall_bay", "front_bay", "right"),
}

for pack, names in PACKS.items():
    target = BASE / pack / "level1_palette"
    target.mkdir(exist_ok=True)
    for name in names:
        image = Image.open(BASE / pack / f"{name}.png").convert("RGBA")
        pixels = []
        for r, g, b, a in image.get_flattened_data():
            if a and 18 <= b < 135 and b > r * 1.28 and b > g * 1.13 and g < 100:
                # Keep texture and luminance differences while matching the
                # warehouse wall's approximately 21:22:45 channel balance.
                target_r = int(b * 0.46)
                target_g = int(b * 0.48)
                target_b = int(b * 0.88)
                r = round(r * 0.25 + target_r * 0.75)
                g = round(g * 0.25 + target_g * 0.75)
                b = round(b * 0.25 + target_b * 0.75)
            pixels.append((r, g, b, a))
        image.putdata(pixels)
        image.save(target / f"{name}.png", optimize=True)
        print(target.relative_to(ROOT) / f"{name}.png")
