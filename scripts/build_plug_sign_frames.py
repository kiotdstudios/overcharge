"""Build powered, absorbing and drained frames for the independent plug sign."""

from pathlib import Path
from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-props/plug-sign"
SIZE = (64, 96)


def base_frame() -> Image.Image:
    raw = Image.open(DEST / "source.png").convert("RGBA")
    bbox = raw.getchannel("A").point(lambda value: 255 if value >= 32 else 0).getbbox()
    if bbox is None:
        raise ValueError("Empty plug-sign source")
    art = raw.crop(bbox)
    art.thumbnail((58, 90), Image.Resampling.NEAREST)
    frame = Image.new("RGBA", SIZE)
    frame.alpha_composite(art, ((SIZE[0] - art.width) // 2, (SIZE[1] - art.height) // 2))
    return frame


def make_frame(base: Image.Image, index: int) -> Image.Image:
    if index >= 6:
        rgb = ImageEnhance.Color(base.convert("RGB")).enhance(0.3)
        rgb = ImageEnhance.Brightness(rgb).enhance(0.28)
        out = rgb.convert("RGBA")
        out.putalpha(base.getchannel("A"))
        return out
    out = base.copy()
    if index == 1:
        return ImageEnhance.Brightness(out).enhance(0.82)
    if index >= 2:
        pixels = out.load()
        for y in range(SIZE[1]):
            for x in range(SIZE[0]):
                r, g, b, a = pixels[x, y]
                if a < 80 or max(r, g, b) < 120:
                    continue
                if ((x + y * 2 - (index - 2) * 18) % 64) < 24:
                    pixels[x, y] = (min(255, int(r * 0.55 + 115)),
                                    min(255, int(g * 0.7 + 100)),
                                    min(255, int(b * 0.7 + 150)), a)
                elif index % 2:
                    pixels[x, y] = (int(r * 0.76), int(g * 0.76), int(b * 0.76), a)
    return out


def main() -> None:
    base = base_frame()
    sheet = Image.new("RGBA", (SIZE[0] * 4, SIZE[1] * 2), (8, 8, 25, 255))
    for index in range(8):
        frame = make_frame(base, index)
        frame.save(DEST / f"{index:02}.png", optimize=True)
        sheet.alpha_composite(frame, ((index % 4) * SIZE[0], (index // 4) * SIZE[1]))
    sheet.save(DEST / "preview.png", optimize=True)


if __name__ == "__main__":
    main()
