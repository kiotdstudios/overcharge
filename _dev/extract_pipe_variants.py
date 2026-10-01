"""Cut the three image-generated conduit variants into placeable transparent PNGs.

The source sheet is retained beside the output assets. Only cropping, alpha
cleanup, and nearest-neighbor resizing happen here; the art is not drawn in code.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/objects/night-city-props/pipes"

VARIANTS = {
    "pipe-short.png": ((458, 8, 1076, 252), (160, 64)),
    "pipe-elbow.png": ((294, 266, 1256, 603), (256, 96)),
    "pipe-branch.png": ((10, 612, 1525, 1008), (384, 104)),
}

for state, source_name, suffix in (
    ("lit", "source-pipe-variants.png", ""),
    ("unlit", "source-pipe-variants-unlit.png", "-unlit"),
):
    source = Image.open(OUT / source_name).convert("RGBA")
    for filename, (box, size) in VARIANTS.items():
        cut = source.crop(box)
        rgba = bytearray(cut.tobytes())
        for i in range(3, len(rgba), 4):
            if rgba[i] < 30:
                rgba[i] = 0
        cut = Image.frombytes("RGBA", cut.size, bytes(rgba))
        cut = cut.resize(size, Image.Resampling.NEAREST)
        output_name = filename.replace(".png", f"{suffix}.png")
        cut.save(OUT / output_name, optimize=True)
        print(f"{state} {output_name}: {size[0]}x{size[1]}")
