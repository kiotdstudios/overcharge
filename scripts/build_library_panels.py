"""Cut the four clean library facade panels from the generated master art."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-buildings/library"
PARTS = (
    ("left.png", 0, 192),
    ("wall_bay.png", 192, 352),
    ("front_bay.png", 352, 512),
    ("right.png", 512, 640),
)


def main() -> None:
    raw = Image.open(DEST / "source.png").convert("RGBA")
    visible = raw.getchannel("A").point(lambda v: 255 if v >= 32 else 0).getbbox()
    if visible is None:
        raise ValueError("Empty library source art")
    art = raw.crop(visible)
    height = round(art.height * 640 / art.width)
    if height > 256:
        raise ValueError("Library art exceeds eight-tile panel height")
    art = art.resize((640, height), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (640, 256))
    canvas.alpha_composite(art, (0, 256 - height))
    for name, x0, x1 in PARTS:
        canvas.crop((x0, 0, x1, 256)).save(DEST / name, optimize=True)
    canvas.save(DEST / "preview_stitched.png", optimize=True)


if __name__ == "__main__":
    main()
