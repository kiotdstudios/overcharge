"""Extract the eight image-generated review panels and audit wall color."""
from pathlib import Path
from PIL import Image
import json

SRC = Path(r'C:\Users\dielp\.codex\generated_images\01a0e577-63e3-7af1-845f-a644ac02ad5d\exec-5bfe16e6-000a-464e-933e-50d8d4c40a16.png')
OUT = Path('assets/objects/night-city-buildings/apartment_plain_review')
OUT.mkdir(parents=True, exist_ok=True)
raw = Image.open(SRC).convert('RGBA')
cols = [(18, 291), (308, 582), (599, 873), (890, 1164)]
rows = [(30, 647), (680, 1300)]
records = []
for n in range(8):
    x0, x1 = cols[n % 4]
    y0, y1 = rows[n // 4]
    panel = raw.crop((x0, y0, x1, y1)).resize((160, 256), Image.Resampling.NEAREST)
    px = panel.load()
    for y in range(256):
        for x in range(160):
            r, g, b, a = px[x, y]
            if r > 180 and b > 135 and r > g * 1.6:
                px[x, y] = (0, 0, 0, 0)
    name = f'wall_{n+1:02d}.png'
    panel.save(OUT / name)
    wall = [rgb for y in range(256) for x in range(160)
            if y > 112 for rgb in [px[x, y]] if rgb[3] > 0]
    mean = tuple(round(sum(c[i] for c in wall) / len(wall), 1) for i in range(3))
    blue = round(100 * sum(c[2] > c[0] and c[2] > c[1] for c in wall) / len(wall), 1)
    records.append({'panel': name, 'wall_mean_rgb': mean, 'blue_dominant_pct': blue})
(OUT / 'palette_audit.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
preview = Image.new('RGBA', (160 * 4, 256 * 2))
for n in range(8):
    preview.alpha_composite(Image.open(OUT / f'wall_{n+1:02d}.png'), ((n % 4) * 160, (n // 4) * 256))
preview.save(OUT / 'contact.png')
# End caps are generated separately to keep their outside trim independent.
ends = Image.open(r'C:\Users\dielp\.codex\generated_images\01a0e577-63e3-7af1-845f-a644ac02ad5d\exec-ebed5406-8922-4cee-a2c1-a60b851edd5e.png').convert('RGBA')
for name, box, size in [
    ('left_end.png', (48, 18, 650, 1100), (192, 256)),
    ('right_end.png', (751, 18, 1354, 1100), (128, 256)),
]:
    panel = ends.crop(box).resize(size, Image.Resampling.NEAREST)
    panel.save(OUT / name)
print(json.dumps(records, indent=2))
