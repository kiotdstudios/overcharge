"""Cut the four Level 1 gatehouse panels from the authored facade."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-buildings/gatehouse"
PARTS = (
    ("left.png", 0, 192),
    ("portal.png", 192, 352),
    ("service.png", 352, 512),
    ("right.png", 512, 640),
)


def main() -> None:
    raw = Image.open(DEST / "source.png").convert("RGBA")
    art = raw.crop(raw.getbbox())
    height = round(art.height * 640 / art.width)
    if height > 256:
        raise ValueError("Gatehouse art exceeds the eight-tile panel height")
    art = art.resize((640, height), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (640, 256))
    # A dark recess is essential: the gameplay gate fades away after opening.
    # Keep the portal dark instead of revealing older rooftop decorations behind it.
    for y in range(109, 256):
        for x in range(244, 329):
            canvas.putpixel((x, y), (3, 4, 15, 255))
    canvas.alpha_composite(art, (0, 256 - height))
    for name, x0, x1 in PARTS:
        canvas.crop((x0, 0, x1, 256)).save(DEST / name, optimize=True)
    canvas.save(DEST / "preview.png", optimize=True)


if __name__ == "__main__":
    main()
