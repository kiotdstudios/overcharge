"""Derive stable powered/absorbing/drained frames from the tire-sign master art."""

from pathlib import Path
from math import atan2, pi
from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-props/tire-sign"


def master_frame() -> Image.Image:
    raw = Image.open(DEST / "source.png").convert("RGBA")
    # Crop the actual bracket and tire, leaving the model's stray edge pixels out.
    art = raw.crop((130, 175, 1170, 1100))
    art.thumbnail((122, 116), Image.Resampling.NEAREST)
    frame = Image.new("RGBA", (128, 128))
    frame.alpha_composite(art, (3, (128 - art.height) // 2))
    return frame


def glow_layer(frame: Image.Image, strength: float, violet: bool = False) -> Image.Image:
    pixels = frame.load()
    mask = Image.new("L", frame.size)
    m = mask.load()
    for y in range(128):
        for x in range(128):
            r, g, b, a = pixels[x, y]
            if a > 50 and b > 130 and (g > 110 or r > 105):
                m[x, y] = int(a * min(1.0, strength))
    halo = Image.new("RGBA", frame.size, (153, 118, 250, 0) if violet else (46, 226, 255, 0))
    halo.putalpha(mask.filter(ImageFilter.GaussianBlur(2)))
    return halo


def make_frame(base: Image.Image, index: int) -> Image.Image:
    # Every state retains the same tire and bracket silhouette and the same root.
    if index == 6 or index == 7:
        rgb = ImageEnhance.Color(base.convert("RGB")).enhance(0.38)
        rgb = ImageEnhance.Brightness(rgb).enhance(0.42)
        out = rgb.convert("RGBA")
        out.putalpha(base.getchannel("A"))
        return out

    out = base.copy()
    if index in (1, 3, 5):
        out = ImageEnhance.Brightness(out).enhance(0.88 if index == 1 else 1.08)
    if index in (1, 2, 3, 4, 5):
        # A bright arc travels around the tire. Absorption turns that arc violet.
        rgba = out.load()
        for y in range(128):
            for x in range(128):
                r, g, b, a = rgba[x, y]
                if a > 80 and b > 125 and g > 100 and b > r * 1.3:
                    phase = (atan2(y - 66, x - 78) + pi) / (2 * pi)
                    band = (phase - index * 0.23) % 1.0
                    if index == 1:
                        boost = 1.32 if band < 0.28 else 0.84
                        rgba[x, y] = (min(255, int(r * boost)), min(255, int(g * boost)),
                                      min(255, int(b * boost)), a)
                    elif band < 0.48:
                        rgba[x, y] = (min(255, int(r * 0.25 + 205 * 0.75)),
                                      int(g * 0.25 + 72 * 0.75),
                                      min(255, int(b * 0.25 + 255 * 0.75)), a)
    halo = glow_layer(out, (0.25, 0.35, 0.45, 0.75, 0.52, 0.9)[index], index >= 2)
    halo.alpha_composite(out)
    return halo


def main() -> None:
    base = master_frame()
    for index in range(8):
        make_frame(base, index).save(DEST / f"{index:02}.png", optimize=True)


if __name__ == "__main__":
    main()
