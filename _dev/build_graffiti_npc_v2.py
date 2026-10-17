"""Rig the generated graffiti painter into a smooth 24-second pixel-art loop.

Only generated pixels are transformed: a fixed body, a shoulder-pivoted arm,
and the existing three generated tag layers. No interpolation or blur is used.
Run with --publish after reviewing the contact/GIF in v2_review.
"""

from pathlib import Path
from PIL import Image
from math import cos, sin, pi
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_dev/graffiti_npc"
REVIEW = SOURCE / "v2_review"
OUT = ROOT / "assets/sprites/npc-graffiti-artist" if "--publish" in sys.argv else REVIEW
OUT.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)

FPS, SECONDS = 12, 24
COUNT = FPS * SECONDS
PAINTER = Image.open(SOURCE / "artist_processed/shoot-3.png").convert("RGBA")
assert PAINTER.size == (128, 128)
PIX = PAINTER.load()


def arm_pixel(x, y):
    return (43 <= x < 74 and 47 <= y < 62) or (52 <= x < 74 and 39 <= y < 47)


BODY = PAINTER.copy()
body = BODY.load()
ARM = Image.new("RGBA", (128, 128))
arm = ARM.load()
MIST = Image.new("RGBA", (128, 128))
mist = MIST.load()
for y in range(128):
    for x in range(128):
        if arm_pixel(x, y):
            arm[x, y] = PIX[x, y]
            body[x, y] = (0, 0, 0, 0)
        elif x >= 74 and y < 63:
            # Keep the generated spray separate so it follows the nozzle.
            if PIX[x, y][3] and PIX[x, y][2] > PIX[x, y][0] * 1.5:
                mist[x, y] = PIX[x, y]
            body[x, y] = (0, 0, 0, 0)


def ease(v):
    v = max(0, min(1, v))
    return v * v * (3 - 2 * v)


def phase(t):
    if t < 2:
        return None, 0, 35 - 35 * ease(t / 2)
    if t < 8:
        return 0, (t - 2) / 6, 18 * sin(2 * pi * (t - 2) / 3)
    if t < 9:
        return None, 0, 35 * sin(pi * ease(t - 8))
    if t < 16:
        return 1, (t - 9) / 7, 20 * sin(2 * pi * (t - 9) / 3.5)
    if t < 17:
        return None, 0, 35 * sin(pi * ease(t - 16))
    if t < 21:
        return 2, (t - 17) / 4, 16 * sin(2 * pi * (t - 17) / 2)
    if t < 23:
        return None, 0, 35 * ease((t - 21) / 2)
    return None, 0, 35


raw = Image.open(SOURCE / "tag_layers_raw.png").convert("RGB")
assert raw.size == (1024, 1536)
tag_layers = []
for index in range(3):
    cell = raw.crop((0, index * 512, 1024, (index + 1) * 512))
    pixels = []
    for r, g, b in cell.getdata():
        ok = (
            (g > 100 and b > 150 and r < 100) if index == 0 else
            (r < 220 and b > 100 and g < 100) if index == 1 else
            (r > 150 and g > 70 and b < 120)
        )
        pixels.append((r, g, b, 255 if ok else 0))
    keyed = Image.new("RGBA", cell.size)
    keyed.putdata(pixels)
    tag_layers.append(keyed.resize((96, 48), Image.Resampling.NEAREST))


def rotated(image, degrees):
    result = Image.new("RGBA", (128, 128))
    output = result.load()
    source = image.load()
    theta = degrees * pi / 180
    ct, st = cos(theta), sin(theta)
    for y in range(15, 90):
        for x in range(22, 113):
            dx, dy = x - 43, y - 51
            sx = round(43 + dx * ct + dy * st)
            sy = round(51 - dx * st + dy * ct)
            if 0 <= sx < 128 and 0 <= sy < 128:
                output[x, y] = source[sx, sy]
    return result


def tint_arm(color_index):
    if color_index == 0:
        return ARM
    tinted = ARM.copy()
    pixels = []
    for r, g, b, a in tinted.getdata():
        if a and g > 100 and b > 120 and r < 100:
            pixels.append((min(255, int(b * .9)), int(g * .5), b, a) if color_index == 1
                          else (min(255, b + 50), min(255, int(g * .9) + 25), int(b * .28), a))
        else:
            pixels.append((r, g, b, a))
    tinted.putdata(pixels)
    return tinted


ARMS = [tint_arm(i) for i in range(3)]


frames = []
step_changes = []
for index in range(COUNT):
    t = index / FPS
    current, amount, angle = phase(t)
    canvas = Image.new("RGBA", (256, 128))
    # Complete earlier colors persist; the active color grows smoothly.
    for color, layer in enumerate(tag_layers):
        progress = 1 if current is not None and color < current else (amount if color == current else 0)
        if current is None:
            progress = (1 if t >= (8, 16, 21)[color] else 0)
        width = round(layer.width * progress)
        if width:
            painted = layer.crop((0, 0, width, layer.height))
            if t >= 23:
                fade = max(0, 24 - t)
                painted.putalpha(painted.getchannel("A").point(lambda a: round(a * fade)))
            canvas.alpha_composite(painted, (140, 25))
    figure = BODY.copy()
    can_color = current if current is not None else (0 if t < 8 else 1 if t < 16 else 2)
    figure.alpha_composite(rotated(ARMS[can_color], angle))
    canvas.alpha_composite(figure, (18, 0))
    if current is not None:
        # Reuse generated spray pixels, shifted with the arm and colored by phase.
        nozzle_y = round(50 + 27 * sin(angle * pi / 180))
        spray = MIST.copy()
        if current:
            recolored = []
            for r, g, b, a in spray.getdata():
                if current == 1:
                    recolored.append((min(255, int(b * .9)), int(g * .5), min(255, b), a))
                else:
                    recolored.append((min(255, b + 50), min(255, int(g * .9) + 25), int(b * .28), a))
            spray.putdata(recolored)
        # A small cyclic translation gives airborne specks some wind without
        # changing the silhouette or inventing new marks.
        canvas.alpha_composite(spray, (18 + round(2 * sin(t * 7)), nozzle_y - 50))
    canvas.save(OUT / f"{index:03d}.png")
    frames.append(canvas)

frames[0].save(REVIEW / "preview.gif", save_all=True, append_images=frames[1:],
               duration=round(1000 / FPS), loop=0, disposal=2, optimize=False)
contact = Image.new("RGBA", (256 * 8, 128), (7, 10, 24, 255))
for i, second in enumerate((0, 3, 6, 8, 10, 16, 19, 23)):
    contact.alpha_composite(frames[second * FPS], (256 * i, 0))
contact.save(REVIEW / "contact.png")

for a, b in zip(frames, frames[1:] + frames[:1]):
    aa, bb = list(a.getdata()), list(b.getdata())
    area = sum(bool(x[3] or y[3]) for x, y in zip(aa, bb))
    changed = sum(x != y and bool(x[3] or y[3]) for x, y in zip(aa, bb))
    step_changes.append(round(100 * changed / max(1, area), 1))
metrics = {"frames": COUNT, "fps": FPS, "seconds": SECONDS,
           "max_step_pct": max(step_changes), "seam_pct": step_changes[-1],
           "steps_pct": step_changes}
(REVIEW / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
print(f"Built {COUNT} frames at {FPS} fps, max step {max(step_changes)}%, seam {step_changes[-1]}%")
