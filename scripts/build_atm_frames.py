"""Build powered, absorbing and drained frames for the free-standing ATM prop.

Floor-standing like the vending machine (mount: None), not wall-mounted like the
signs. Base silhouette and screen stay fixed across all 8 frames; only the
screen's cyan glow changes brightness/saturation per state, same approach as
build_tire_sign_frames.py's glow_layer but keyed off this art's cyan screen
instead of a travelling arc (ATM has no ring geometry to sweep around).
"""

from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/objects/night-city-props/atm-machine"
SIZE = (128, 128)
BOTTOM_MARGIN = 12  # matches vending-machine's measured trim (~12px of canvas below the art)


def base_frame() -> Image.Image:
    raw = Image.open(DEST / "source.png").convert("RGBA")
    bbox = raw.getchannel("A").point(lambda v: 255 if v >= 32 else 0).getbbox()
    if bbox is None:
        raise ValueError("Empty ATM source")
    art = raw.crop(bbox)
    art.thumbnail((SIZE[0] - 8, SIZE[1] - BOTTOM_MARGIN - 4), Image.Resampling.NEAREST)
    frame = Image.new("RGBA", SIZE)
    x = (SIZE[0] - art.width) // 2
    y = SIZE[1] - BOTTOM_MARGIN - art.height
    frame.alpha_composite(art, (x, y))
    return frame


def screen_mask(frame: Image.Image) -> Image.Image:
    """Isolate the cyan screen glow (high blue+green, low-ish red) from the dark body."""
    pixels = frame.load()
    mask = Image.new("L", frame.size)
    m = mask.load()
    for y in range(frame.height):
        for x in range(frame.width):
            r, g, b, a = pixels[x, y]
            if a > 50 and b > 140 and g > 110 and b >= r:
                m[x, y] = a
    return mask


def make_frame(base: Image.Image, index: int) -> Image.Image:
    if index >= 6:
        # Drained: screen goes dark and the whole unit desaturates, same as the
        # other props' dead state.
        rgb = ImageEnhance.Color(base.convert("RGB")).enhance(0.3)
        rgb = ImageEnhance.Brightness(rgb).enhance(0.3)
        out = rgb.convert("RGBA")
        out.putalpha(base.getchannel("A"))
        return out

    out = base.copy()
    mask = screen_mask(base)
    if index == 1:
        # Powered idle, second frame: a gentle dim/bright flicker on the screen only.
        bright = ImageEnhance.Brightness(out).enhance(0.86)
        out = Image.composite(bright, out, mask)
        return out
    if index >= 2:
        # Absorbing: screen pulses brighter and more saturated, cycling 2..5.
        pulse = 0.7 + 0.3 * ((index - 2) % 4) / 3
        bright = ImageEnhance.Brightness(out).enhance(1.15 + 0.25 * pulse)
        bright = ImageEnhance.Color(bright.convert("RGB")).enhance(1.0 + 0.4 * pulse).convert("RGBA")
        bright.putalpha(out.getchannel("A"))
        halo = Image.new("RGBA", out.size, (70, 220, 255, 0))
        halo.putalpha(mask.filter(ImageFilter.GaussianBlur(2)).point(lambda v: int(v * 0.5 * pulse)))
        out = Image.composite(bright, out, mask)
        halo.alpha_composite(out)
        return halo
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
