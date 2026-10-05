"""Rebuild the four Night City apartment facade panels from the approved raw art."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-buildings/apartment_complex"
SOURCE = DEST / "source.png"
PANELS = (
    ("left.png", 0, 192),
    ("wall_bay.png", 192, 352),
    ("front_bay.png", 352, 512),
    ("right.png", 512, 640),
)


def main() -> None:
    raw = Image.open(SOURCE).convert("RGBA")
    bbox = raw.getbbox()
    if bbox is None:
        raise ValueError("Source art is empty")
    art = raw.crop(bbox)
    width = 640
    height = round(art.height * width / art.width)
    if height > 256:
        raise ValueError("Source facade is too tall for the 8-tile panel")
    art = art.resize((width, height), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (640, 256))
    canvas.alpha_composite(art, (0, 256 - height))
    for name, x0, x1 in PANELS:
        canvas.crop((x0, 0, x1, 256)).save(DEST / name, optimize=True)
    canvas.save(DEST / "preview.png", optimize=True)


if __name__ == "__main__":
    main()
