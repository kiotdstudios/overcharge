"""Render a static, nearest-neighbor Level 1 facade and tile audit image."""

import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
level = json.loads((ROOT / "src_scroll/levels/level1.json").read_text(encoding="utf-8"))
canvas = Image.new("RGBA", (level["cols"] * 32, 576), (4, 5, 20, 255))

def draw(src, x, y, w, h):
    image = Image.open(ROOT / src).convert("RGBA")
    if image.size != (w, h):
        image = image.resize((w, h), Image.Resampling.NEAREST)
    canvas.alpha_composite(image, (int(x), int(y)))

for d in level["decorations"]:
    if "/night-city-buildings/" in d.get("src", "") or d.get("family") == "nc_roof_support":
        draw(d["src"], d["x"], d["y"], d["w"], d["h"])

tile_names = {
    42: "r02_c01", 43: "r02_c02", 44: "r02_c03",
    45: "r03_c01", 46: "r03_c02", 47: "r03_c03",
    48: "r03_c04", 49: "r03_c05", 50: "r03_c06",
    51: "r04_c01", 52: "r04_c02", 53: "r04_c03",
    54: "r04_c04", 55: "r04_c05", 56: "r04_c06",
    57: "r04_c11", 58: "r04_c12", 59: "r04_c13",
}
for i, value in enumerate(level["tiles"]):
    if value in tile_names:
        x = (i % level["cols"]) * 32
        y = (i // level["cols"]) * 32
        draw(f"assets/tilesets/blue_rooftop/tiles/bt_bldg_{tile_names[value]}.png", x, y, 32, 32)

for s in level["sources"]:
    if s.get("kind") == "prop" and s.get("sprite"):
        w, h = s["artW"], s["artH"]
        x = s["x"] + 14 - w // 2
        y = s["y"] + 28 - h
        draw(s["sprite"] + "00.png", x, y, w, h)

output = ROOT / "previews/level1-palette-tile-audit.png"
canvas.convert("RGB").save(output, optimize=True)
print(output)
