"""Render a quick Level 1 gate-area art check without changing the level."""

import json
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LEVEL = json.loads((ROOT / "src_scroll/levels/level1.json").read_text())
LEFT, TOP, WIDTH, HEIGHT = 1900, 80, 800, 420
canvas = Image.new("RGBA", (WIDTH, HEIGHT), (3, 4, 15, 255))

for dec in LEVEL["decorations"]:
    x, y = dec.get("x", -9999), dec.get("y", -9999)
    w, h = dec.get("w", 0), dec.get("h", 0)
    if x + w <= LEFT or x >= LEFT + WIDTH or y + h <= TOP or y >= TOP + HEIGHT:
        continue
    path = ROOT / dec.get("src", "")
    if not path.is_file():
        continue
    art = Image.open(path).convert("RGBA").resize((w, h), Image.Resampling.NEAREST)
    if dec.get("flipX"):
        art = art.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    canvas.alpha_composite(art, (x - LEFT, y - TOP))

# Show the roof platform at its actual y, so the housing's base can be checked.
for y in range(384 - TOP, HEIGHT):
    for x in range(2144 - LEFT, 2432 - LEFT):
        canvas.putpixel((x, y), (14, 16, 38, 255))
for x in range(2144 - LEFT, 2432 - LEFT):
    for y in range(384 - TOP, 389 - TOP):
        canvas.putpixel((x, y), (122, 61, 201, 255))

gate = LEVEL["gates"][0]
art = Image.open(ROOT / "assets/objects/gate/rest.png").convert("RGBA")
art = art.crop((17, 10, 111, 115))
canvas.alpha_composite(art, (gate["x"] + gate["w"] // 2 - 47 - LEFT,
                             gate["y"] + gate["h"] - 105 - TOP))
canvas.save(ROOT / "assets/objects/night-city-buildings/gatehouse/level1_context_preview.png")
