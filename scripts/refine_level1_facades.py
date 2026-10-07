"""Fit the city facades to actual Level 1 roof tiles and use muted wall art.

Only the known October 6 facade placements and Russ tire sign may be changed.
The script refuses a newer edit to those items and leaves gameplay geometry alone.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "src_scroll/levels/level1.json"
level = json.loads(PATH.read_text(encoding="utf-8"))
base = "assets/objects/night-city-buildings/"

new_garry = [(1568, 122), (1690, 122), (1812, 150), (1962, 150)]
old_garry = [(1504, 144), (1648, 144), (1792, 176), (1968, 176)]
garry = [d for d in level["decorations"] if d.get("src", "").startswith(base + "garrys_electronics/")]
garry.sort(key=lambda d: d["x"])
if [(d["x"], d["w"]) for d in garry] not in (old_garry, new_garry):
    raise SystemExit("Refusing to overwrite newer Garry facade placement")
for d, (x, w) in zip(garry, new_garry):
    d["x"], d["w"] = x, w

tire = [d for d in level["decorations"] if d.get("src", "").startswith(base + "tire_shop/")]
tire.sort(key=lambda d: d["x"])
if len(tire) != 2 or [(d["x"], d["w"]) for d in tire] not in (
        [(2144, 160), (2304, 128)], [(2176, 160), (2336, 96)]):
    raise SystemExit("Refusing to overwrite newer tire facade placement")
for d, (x, w) in zip(tire, [(2176, 160), (2336, 96)]):
    d["x"], d["w"], d["y"] = x, w, 128

for d in level["decorations"]:
    src = d.get("src", "")
    if not src.startswith(base):
        continue
    pack = src[len(base):].split("/")[0]
    if pack not in ("apartment_complex", "garrys_electronics", "tire_shop", "library"):
        continue
    name = Path(src).name
    expected = {base + pack + "/" + name,
                base + pack + "/level1_palette/" + name}
    if src not in expected:
        raise SystemExit(f"Refusing to overwrite newer facade art: {src}")
    d["src"] = base + pack + "/level1_palette/" + name

signs = [s for s in level["sources"] if s.get("id") == "src_russ_tire"]
if len(signs) != 1 or signs[0]["y"] not in (350, 382):
    raise SystemExit("Refusing to overwrite newer tire sign placement")
signs[0]["y"] = 350

# The original Garry roof was 17 invisible one-way bars (ID 2). Replace only
# that known strip with visible blue rooftop ground. It remains one tile deep,
# so the existing lower passage at y=352..480 stays open beneath it.
for col in range(49, 66):
    index = 10 * level["cols"] + col
    expected = 42 if col == 49 else 44 if col == 65 else 43
    if level["tiles"][index] not in (2, expected):
        raise SystemExit(f"Refusing to overwrite newer roof tile at column {col}")
    level["tiles"][index] = expected

# Slim visual posts tie the elevated shop roof into the lower rooftop. They
# are decorations, not collision: the 480px-wide lower passage stays playable.
support_src = "assets/tilesets/blue_rooftop/tiles/bt_bldg_r03_c01.png"
supports = [{"src": support_src, "x": x, "y": y, "w": 32, "h": 32,
             "snap": 1, "family": "nc_roof_support"}
            for x in (1568, 2080) for y in range(352, 512, 32)]
existing = [d for d in level["decorations"] if d.get("family") == "nc_roof_support"]
if existing and existing != supports:
    raise SystemExit("Refusing to overwrite newer roof support art")
if not existing:
    level["decorations"].extend(supports)

PATH.write_text(json.dumps(level, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Level 1 facades refined; 17 one-way bars now visible rooftop ground")
