"""Verify the placed graffiti NPC's timing, color order, and ground anchor."""

import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "assets/ASSET_MANIFEST.json").read_text(encoding="utf-8"))
level = json.loads((root / "src_scroll/levels/level1.json").read_text(encoding="utf-8"))
asset = next(a for a in manifest["assets"] if a["id"] == "npc_graffiti_artist")
npc = next(n for n in level["npcs"] if n["id"] == "npc_graffiti_artist_01")
directory = root / "assets/sprites/npc-graffiti-artist"

assert manifest["count"] == len(manifest["assets"])
assert asset["frame_count"] == 288 and asset["fps"] == 12 and asset["loop"] is True
assert asset["frame_count"] / asset["fps"] == 24
assert npc["assetId"] == asset["id"] and npc["facing"] == "right"
assert npc["patrol"]["rangePx"] == 0
assert npc["x"] == 1000 and npc["y"] == 480
assert level["tiles"][15 * level["cols"] + npc["x"] // 32] != 0
# The scaled painted strip lands on the filler wall at x=1034..1162.
anchor_x = (asset["trim"]["x"] + asset["trim"]["w"] / 2) * asset["frame_width"] * npc["scale"]
paint_left = npc["x"] + 140 * npc["scale"] - anchor_x
paint_right = npc["x"] + 236 * npc["scale"] - anchor_x
assert 1034 <= paint_left < paint_right <= 1162


def color_counts(index):
    image = Image.open(directory / f"{index:03d}.png").convert("RGBA")
    assert image.size == (256, 128)
    # The mural occupies the right-hand strip; the painter stays to its left.
    pixels = list(image.crop((140, 25, 236, 73)).getdata())
    return (
        sum(a and g > 120 and b > 140 and r < 110 for r, g, b, a in pixels),
        sum(a and r < 220 and b > 100 and g < 100 for r, g, b, a in pixels),
        sum(a and r > 150 and g > 70 and b < 120 for r, g, b, a in pixels),
    )


assert color_counts(0) == (0, 0, 0)
assert color_counts(6 * 12)[0] > 50 and color_counts(6 * 12)[1:] == (0, 0)
assert color_counts(13 * 12)[0] > 50 and color_counts(13 * 12)[1] > 50 and color_counts(13 * 12)[2] == 0
assert all(count > 20 for count in color_counts(19 * 12))
assert all(count > 20 for count in color_counts(22 * 12))

# The authored visible-foot anchor is 116 source pixels, the feet in all poses.
trim = asset["trim"]
assert round((trim["y"] + trim["h"]) * asset["frame_height"]) == 116
assert all((directory / f"{frame:03d}.png").is_file() for frame in range(288))
assert all(Image.open(directory / f"{frame:03d}.png").convert("RGBA").getbbox()[3] == 116 for frame in range(288))
# The painter itself has no render-swap pop, including the loop seam. The tag
# deliberately fades during the last second, so compare the actor crop.
body = [Image.open(directory / f"{frame:03d}.png").convert("RGBA").crop((18, 0, 95, 128)) for frame in range(288)]
steps = []
for a, b in zip(body, body[1:] + body[:1]):
    aa, bb = list(a.getdata()), list(b.getdata())
    area = sum(bool(x[3] or y[3]) for x, y in zip(aa, bb))
    changed = sum(x != y and bool(x[3] or y[3]) for x, y in zip(aa, bb))
    steps.append(100 * changed / max(1, area))
assert max(steps) < 25, max(steps)
assert steps[-1] <= max(steps[:-1]), steps[-1]
print(f"PASS: grounded 24-second NPC loop paints cyan, violet, amber; body max step {max(steps):.1f}%, seam {steps[-1]:.1f}%")
