"""Cut Garry's Electronics into four seamless, grid-aligned facade panels."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-buildings/garrys_electronics"
PARTS = (("left.png", 0, 144), ("wall_bay.png", 144, 288),
         ("front_bay.png", 288, 464), ("right.png", 464, 640))


def main() -> None:
    raw = Image.open(DEST / "source.png").convert("RGBA")
    bbox = raw.getchannel("A").point(lambda value: 255 if value >= 32 else 0).getbbox()
    if bbox is None:
        raise ValueError("Empty Garry's Electronics source")
    art = raw.crop(bbox)
    height = round(art.height * 640 / art.width)
    if height > 256:
        raise ValueError("Storefront exceeds eight-tile panel height")
    art = art.resize((640, height), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (640, 256))
    canvas.alpha_composite(art, (0, 256 - height))
    for name, x0, x1 in PARTS:
        canvas.crop((x0, 0, x1, 256)).save(DEST / name, optimize=True)
    canvas.save(DEST / "preview_stitched.png", optimize=True)


if __name__ == "__main__":
    main()
