"""Assemble the generated painter poses and generated three-color tag into a 24 s loop.

This script only keys, scales, and composites imagegen artwork. It does not draw
new sprite art. Each exported frame is 256x128, played at 2 fps.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_dev/graffiti_npc"
POSES = SOURCE / "artist_processed"
OUT = ROOT / "assets/sprites/npc-graffiti-artist"
OUT.mkdir(parents=True, exist_ok=True)

raw = Image.open(SOURCE / "tag_layers_raw.png").convert("RGB")
assert raw.size == (1024, 1536)


def layer(row: int) -> Image.Image:
    cell = raw.crop((0, row * 512, 1024, (row + 1) * 512))
    pixels = []
    for r, g, b in cell.getdata():
        background = r > 220 and b > 200 and g < 60
        color = (
            (g > 100 and b > 150 and r < 100) if row == 0 else
            (r < 220 and b > 100 and g < 100) if row == 1 else
            (r > 150 and g > 70 and b < 120)
        )
        pixels.append((r, g, b, 255 if color and not background else 0))
    keyed = Image.new("RGBA", cell.size)
    keyed.putdata(pixels)
    return keyed.resize((96, 48), Image.Resampling.NEAREST)


layers = [layer(i) for i in range(3)]
for name, img in zip(("cyan", "violet", "amber"), layers):
    img.save(OUT / f"tag_{name}.png")

poses = [Image.open(POSES / f"shoot-{i}.png").convert("RGBA") for i in range(1, 9)]
assert all(p.size == (128, 128) for p in poses)


def progress(frame: int) -> tuple[float, float, float]:
    # Four beats: prepare, cyan, violet, amber; then inspect the completed wall.
    if frame < 4:
        return 0, 0, 0
    if frame < 16:
        return (frame - 3) / 12, 0, 0
    if frame < 18:
        return 1, 0, 0
    if frame < 32:
        return 1, (frame - 17) / 14, 0
    if frame < 34:
        return 1, 1, 0
    if frame < 42:
        return 1, 1, (frame - 33) / 8
    return 1, 1, 1


def pose(frame: int) -> int:
    if frame < 4:
        return (0, 1, 1, 2)[frame]
    if frame < 16:
        return 2 + (frame % 2)
    if frame < 18:
        return 4
    if frame < 32:
        return 5 if frame % 4 != 0 else 4
    if frame < 34:
        return 4
    if frame < 42:
        return 6 if frame % 4 != 0 else 7
    return 7 if frame < 46 else 0


frames = []
for index in range(48):
    canvas = Image.new("RGBA", (256, 128))
    for paint, amount in zip(layers, progress(index)):
        width = round(paint.width * min(1, max(0, amount)))
        if width:
            canvas.alpha_composite(paint.crop((0, 0, width, paint.height)), (140, 25))
    canvas.alpha_composite(poses[pose(index)], (18, 0))
    canvas.save(OUT / f"{index:02d}.png")
    frames.append(canvas)

frames[0].save(
    OUT / "preview.gif", save_all=True, append_images=frames[1:],
    duration=500, loop=0, disposal=2,
)

# One compact visual acceptance sheet for 0, 6, 12, 18, and 23 seconds.
preview = Image.new("RGBA", (256 * 5, 128))
for i, second in enumerate((0, 6, 12, 18, 23)):
    preview.alpha_composite(frames[second * 2], (i * 256, 0))
preview.save(SOURCE / "milestones.png")
print("Built 48 transparent frames at 2 fps (24 seconds)")
