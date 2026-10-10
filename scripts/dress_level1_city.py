"""Author Level 1's noncolliding Night City facades and independent power signs.

The archived pre-dress JSON is the source of truth for all gameplay geometry.
Run from the repository root. This script is idempotent for the authored items.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVEL = ROOT / "src_scroll/levels/level1.json"
ARCHIVE = ROOT / "level_archive/level1-2026-10-06-before-city-dress.json"

if not ARCHIVE.exists():
    raise SystemExit("Refusing to dress Level 1 without its archived rollback copy")

level = json.loads(LEVEL.read_text(encoding="utf-8"))
before = json.loads(ARCHIVE.read_text(encoding="utf-8"))
for key in ("cols", "tiles", "tileRotations", "tileFlips", "playerStart", "gates", "checkpoints", "platforms", "enemies", "switches"):
    if level.get(key) != before.get(key):
        raise SystemExit(f"Refusing to change a newer Level 1 gameplay edit: {key}")

buildings = "assets/objects/night-city-buildings/"
signs = "assets/objects/night-city-props/"
decorations = [d for d in before["decorations"] if not d.get("src", "").startswith(buildings)]

def panel(pack, filename, x, y, w):
    src = f"{buildings}{pack}/{filename}.png"
    if not (ROOT / src).is_file():
        raise FileNotFoundError(src)
    decorations.append({"src": src, "x": x, "y": y, "w": w, "h": 256,
                        "snap": 1, "family": "nc_building_wall"})

def row(pack, files, widths, x, y):
    for filename, width in zip(files, widths):
        panel(pack, filename, x, y, width)
        x += width

# All bottoms meet the authored roof tile top. The 32px rise between the
# warehouse and the central one-way roof reads as a stepped skyline.
row("apartment_complex", ("left", "wall_bay", "front_bay", "right"),
    (192, 160, 160, 128), 0, 224)                         # floor y=480
row("warehouse", ("warehouse_left", "warehouse_open_bay", "warehouse_closed_bay", "warehouse_right"),
    (192, 160, 160, 128), 864, 96)                       # roof y=352
row("garrys_electronics", ("left", "wall_bay", "front_bay", "right"),
    (144, 144, 176, 176), 1504, 64)                     # one-way roof y=320
row("tire_shop", ("front_bay", "right"), (160, 128),
    2144, 128)                                           # short raised roof y=384
row("library", ("left", "wall_bay", "front_bay", "right"),
    (192, 160, 160, 128), 2432, 224)                    # floor y=480
panel("gatehouse", "portal", 3072, 224, 160)             # level edge clips 32px

def sign(id, sprite, art_x, art_y, art_w, art_h, label):
    # Source hitbox is 28x28. Its art is bottom aligned and centered on it.
    src = f"{signs}{sprite}/"
    for frame in range(8):
        path = ROOT / f"{src}{frame:02}.png"
        if not path.is_file():
            raise FileNotFoundError(path)
    return {"id": id, "x": art_x + art_w // 2 - 14,
            "y": art_y + art_h - 28, "label": label, "charge": 4,
            "kind": "prop", "sprite": src, "frames": 8,
            "artW": art_w, "artH": art_h, "mount": "wall"}

sources = [s for s in before["sources"] if s.get("id") not in
           {"src_garrys_plug", "src_russ_tire", "src_brys_books"}]
sources.extend((
    sign("src_garrys_plug", "plug-sign", 1935, 180, 64, 96, "PLUG"),
    sign("src_russ_tire", "tire-sign", 2280, 250, 128, 128, "TIRE"),
    sign("src_brys_books", "book-sign", 2450, 350, 160, 96, "BOOKS"),
))

if level["decorations"] not in (before["decorations"], decorations):
    raise SystemExit("Refusing to overwrite newer Level 1 decoration edits")
if level["sources"] not in (before["sources"], sources):
    raise SystemExit("Refusing to overwrite newer Level 1 source edits")
level["decorations"] = decorations
level["sources"] = sources
LEVEL.write_text(json.dumps(level, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Level 1 dressed: {len(decorations)} decorations, {len(sources)} sources; gameplay geometry unchanged")
