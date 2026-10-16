"""Crop the reviewed QuickMart concept into the Night City four-panel format."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/objects/night-city-buildings/quickmart_review'
SOURCE = Image.open(OUT / 'source.png').convert('RGBA')
SCENE = Image.open(ROOT / 'assets/progress/level1-middle.png').convert('RGBA')

# These cuts follow the generated facade's structural columns rather than
# slicing through a window or the QUIK MART sign.
BOUNDS = [59, 518, 1024, 1450, 1920]
NAMES = ['left', 'display_bay', 'entrance_bay', 'right']
WIDTHS = [192, 160, 160, 128]
TOP, BOTTOM = 165, 712

panels = []
for i, name in enumerate(NAMES):
    image = SOURCE.crop((BOUNDS[i], TOP, BOUNDS[i + 1], BOTTOM))
    # Every edge and interior remains from the same continuous original.
    image = image.resize((WIDTHS[i], 256), Image.Resampling.NEAREST)
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            if r > 175 and b > 135 and g < 125 and r > g * 1.6 and b > g * 1.4:
                pixels[x, y] = (0, 0, 0, 0)
            else:
                pixels[x, y] = (r, g, b, 255)
    image.save(OUT / f'{name}.png')
    panels.append(image)

stitched = Image.new('RGBA', (640, 256))
cursor = 0
for image in panels:
    stitched.alpha_composite(image, (cursor, 0))
    cursor += image.width
stitched.save(OUT / 'tiling_proof.png')

backgrounds = ['#121522', '#e4e0da']
contact = Image.new('RGB', (4 * 192 * 4 + 5 * 12, 2 * (256 * 4 + 12) + 12), '#121522')
for row, bg in enumerate(backgrounds):
    for i, image in enumerate(panels):
        cell = Image.new('RGBA', image.size, bg)
        cell.alpha_composite(image)
        x = 12 + i * (192 * 4 + 12)
        y = 12 + row * (256 * 4 + 12)
        contact.paste(cell.resize((image.width * 4, 256 * 4), Image.Resampling.NEAREST).convert('RGB'), (x, y))
contact.save(OUT / 'contact_dark_light.png')

scene = SCENE.copy()
scene.alpha_composite(stitched, (280, 184))  # preview only; no level data changed
hero = Image.open(ROOT / 'assets/sprites/hero-v3/idle/east/frame_000.png').convert('RGBA')
hero = hero.crop(hero.getbbox()).resize((48, 76), Image.Resampling.NEAREST)
scene.alpha_composite(hero, (626, 363))
scene.convert('RGB').save(OUT / 'game_mockup_1x.png')
scene.crop((260, 170, 940, 490)).resize((1360, 640), Image.Resampling.NEAREST).convert('RGB').save(OUT / 'game_mockup_2x.png')

compare = Image.new('RGBA', (660, 560), '#101424')
old = Image.open(ROOT / 'assets/objects/night-city-buildings/convenience_store/preview_stitched.png').convert('RGBA')
old.thumbnail((640, 256), Image.Resampling.NEAREST)
compare.alpha_composite(old, (10, 16))
compare.alpha_composite(stitched, (10, 288))
compare.convert('RGB').save(OUT / 'night_city_comparison.png')

pixels = [(r, g, b) for r, g, b, a in stitched.getdata() if a]
blue = sum(b > r * 1.12 and b > g * 1.06 for r, g, b in pixels) / len(pixels)
warm = sum(r > g * 1.25 and g > b * 1.3 for r, g, b in pixels) / len(pixels)
audit = {
    'panel_sizes': {name: list(panel.size) for name, panel in zip(NAMES, panels)},
    'stitched_size': list(stitched.size),
    'blue_dominant_share': round(blue, 3),
    'warm_accent_share': round(warm, 3),
    'semi_transparent_pixels': sum(0 < a < 255 for *_, a in stitched.getdata()),
    'seam_positions_px': [192, 352, 512],
}
(OUT / 'audit.json').write_text(json.dumps(audit, indent=2))
print(json.dumps(audit, indent=2))
