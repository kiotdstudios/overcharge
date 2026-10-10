"""Build stable powered/absorbing/drained frames for the independent book sign."""

from math import atan2, pi
from pathlib import Path
from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-props/book-sign"
SIZE = (160, 96)


def base_frame() -> Image.Image:
    raw = Image.open(DEST / "source.png").convert("RGBA")
    visible = raw.getchannel("A").point(lambda v: 255 if v >= 32 else 0).getbbox()
    if visible is None:
        raise ValueError("Empty book-sign source art")
    art = raw.crop(visible)
    art.thumbnail((154, 90), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", SIZE)
    canvas.alpha_composite(art, ((160 - art.width) // 2, (96 - art.height) // 2))
    return canvas


def frame(base: Image.Image, index: int) -> Image.Image:
    if index >= 6:
        dim = ImageEnhance.Color(base.convert("RGB")).enhance(0.35)
        dim = ImageEnhance.Brightness(dim).enhance(0.34)
        out = dim.convert("RGBA")
        out.putalpha(base.getchannel("A"))
        return out
    out = base.copy()
    if index == 1:
        return ImageEnhance.Brightness(out).enhance(0.78)
    if index >= 2:
        pixels = out.load()
        for y in range(96):
            for x in range(160):
                r, g, b, a = pixels[x, y]
                if a < 80 or max(r, g, b) < 115:
                    continue
                phase = (atan2(y - 48, x - 80) + pi) / (2 * pi)
                sweep = (phase - (index - 2) * 0.23) % 1.0
                if sweep < 0.40:
                    # A bright violet-white surge travels across the neon tubes.
                    pixels[x, y] = (min(255, int(r * 0.5 + 150)),
                                    min(255, int(g * 0.7 + 65)),
                                    min(255, int(b * 0.6 + 100)), a)
                elif index % 2:
                    pixels[x, y] = (int(r * 0.82), int(g * 0.82), int(b * 0.82), a)
    return out


def main() -> None:
    base = base_frame()
    for index in range(8):
        frame(base, index).save(DEST / f"{index:02}.png", optimize=True)
    sheet = Image.new("RGBA", (160 * 4, 96 * 2), (8, 8, 25, 255))
    for index in range(8):
        sheet.alpha_composite(Image.open(DEST / f"{index:02}.png"),
                              ((index % 4) * 160, (index // 4) * 96))
    sheet.save(DEST / "preview.png", optimize=True)


if __name__ == "__main__":
    main()
