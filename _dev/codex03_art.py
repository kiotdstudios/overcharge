"""Deterministic crop, chroma cleanup, sizing and review sheets for CODEX 03 art."""
from collections import Counter, deque
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / '_dev/codex03_raw'
SOURCES = {
    'apartment': 'apartment_tenant.png',
    'hot': 'exec-6b3741cc-f44a-4e2a-89f1-6c894f8ca2f9.png',
    'relieved': 'exec-76c187db-4e5c-4577-a79a-3c5ca37e7a21.png',
    'pip': 'pip_v2.png',
    'capacitor': 'exec-65cccbcd-f390-48d7-bc78-47145d5ae04e.png',
    'idle': 'exec-cf3ca223-6c63-4f58-9570-9dbdec6d62a9.png',
    'glow': 'exec-cd02a3ea-89fa-45cf-bf76-75cff55de1d4.png',
    'spin': 'exec-a4adc085-c725-4768-a3ff-2fee3a514bd9.png',
    'icon': 'exec-2bc0e3fe-02c3-4b9f-a04c-034680edc30a.png',
    'ladder': 'ladder.png',
    'plate': 'wall_plate.png',
}
OUT = {
    'apartment': ROOT / 'assets/objects/night-city-buildings/apartment_codex03_review',
    'npc': ROOT / 'assets/sprites/npc-window-woman-codex03-review',
    'pip': ROOT / 'assets/objects/pip-pickup-codex03-review',
    'capacitor': ROOT / 'assets/objects/capacity-upgrade/codex03-review',
    'ladder': ROOT / 'assets/objects/night-city-props/ladder_review',
    'plate': ROOT / 'assets/objects/night-city-props/wall-plate-switch-review',
}


def load(name):
    return Image.open(RAW / SOURCES[name]).convert('RGBA')


def chroma(im):
    """Flood-fill only connected magenta background; every kept pixel is opaque."""
    im = im.copy()
    px = im.load()
    w, h = im.size
    bg = lambda p: p[0] > 165 and p[2] > 125 and p[1] < 130 and p[0] > p[1] * 1.7 and p[2] > p[1] * 1.5
    q = deque()
    seen = bytearray(w * h)
    for x in range(w):
        if bg(px[x, 0]): q.append((x, 0))
        if bg(px[x, h - 1]): q.append((x, h - 1))
    for y in range(h):
        if bg(px[0, y]): q.append((0, y))
        if bg(px[w - 1, y]): q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        k = y * w + x
        if seen[k] or not bg(px[x, y]): continue
        seen[k] = 1
        px[x, y] = (0, 0, 0, 0)
        if x: q.append((x - 1, y))
        if x + 1 < w: q.append((x + 1, y))
        if y: q.append((x, y - 1))
        if y + 1 < h: q.append((x, y + 1))
    # Generated sheets can leave isolated magenta flecks just inside a dark
    # outline. They are background, not designed purple material.
    for y in range(h):
        for x in range(w):
            if bg(px[x, y]): px[x, y] = (0, 0, 0, 0)
    return im


def fit(im, size, margin=2):
    box = im.getbbox()
    if not box: raise ValueError('empty sprite')
    im = im.crop(box)
    w, h = size
    scale = min((w - 2 * margin) / im.width, (h - 2 * margin) / im.height)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.Resampling.NEAREST)
    dst = Image.new('RGBA', size)
    dst.alpha_composite(im, ((w - im.width) // 2, (h - im.height) // 2))
    return dst


def sheet(name, cols, rows, target, folder, margin=2, npc_window=False):
    src = load(name)
    for idx in range(cols * rows):
        x = idx % cols
        y = idx // cols
        cell = src.crop((round(x * src.width / cols), round(y * src.height / rows),
                         round((x + 1) * src.width / cols), round((y + 1) * src.height / rows)))
        if npc_window:
            small = fit(chroma(cell), (112, 112), 1)
            image = Image.new('RGBA', target)
            image.alpha_composite(small, ((target[0] - 112) // 2, 35))
        else:
            image = fit(chroma(cell), target, margin)
        folder.mkdir(parents=True, exist_ok=True)
        image.save(folder / f'frame_{idx:03}.png')


def apartment():
    source = chroma(load('apartment'))
    target = OUT['apartment']
    target.mkdir(parents=True, exist_ok=True)
    # Seam positions are structural columns in the single generated facade.
    bounds = [58, 592, 1070, 1540, 1932]
    widths = [192, 160, 160, 128]
    names = ['left', 'wall_bay', 'front_bay', 'right']
    panels = []
    for i in range(4):
        piece = source.crop((bounds[i], 55, bounds[i + 1], 748))
        piece = piece.resize((widths[i], 256), Image.Resampling.NEAREST)
        piece.save(target / f'{names[i]}.png')
        panels.append(piece)
    stitched = Image.new('RGBA', (640, 256))
    x = 0
    for piece in panels:
        stitched.alpha_composite(piece, (x, 0))
        x += piece.width
    stitched.save(target / 'tiling_proof.png')


def ladder():
    source = chroma(load('ladder'))
    # Remove generated terminal collars; the uninterrupted middle repeats.
    source = source.crop((0, 155, source.width, source.height - 160))
    target = OUT['ladder']
    target.mkdir(parents=True, exist_ok=True)
    fit(source, (128, 605), 1).save(target / 'ladder.png')
    current = Image.open(ROOT / 'assets/objects/night-city-props/ladder/ladder.png').convert('RGBA')
    old = current.resize((32, 192), Image.Resampling.NEAREST)
    new = Image.open(target / 'ladder.png').resize((32, 192), Image.Resampling.NEAREST)
    compare = Image.new('RGBA', (96, 208), '#141727')
    compare.alpha_composite(old, (8, 8))
    compare.alpha_composite(new, (56, 8))
    compare.resize((384, 832), Image.Resampling.NEAREST).save(target / 'old_new_game_size.png')


def plate():
    source = load('plate')
    target = OUT['plate']
    target.mkdir(parents=True, exist_ok=True)
    names = ['off', 'flip/frame_000', 'flip/frame_001', 'flip/frame_002', 'on']
    for i, name in enumerate(names):
        x, y = i % 3, i // 3
        cell = source.crop((round(x * source.width / 3), round(y * source.height / 2),
                            round((x + 1) * source.width / 3), round((y + 1) * source.height / 2)))
        output = target / f'{name}.png'
        output.parent.mkdir(parents=True, exist_ok=True)
        fit(chroma(cell), (16, 24), 1).save(output)
    contact(target, [target / f'{name}.png' for name in names], 'contact_dark_light.png')


def pip_from_hud():
    # The generated pickup lost the lightning silhouette at 24 px. Reuse the
    # exact approved HUD pip shape and add a one-pixel bob/core pulse.
    source = Image.open(ROOT / 'assets/objects/pip/charged.png').convert('RGBA')
    icon = source.crop(source.getbbox())
    icon = icon.resize((20, 20), Image.Resampling.NEAREST)
    target = OUT['pip'] / 'idle'
    target.mkdir(parents=True, exist_ok=True)
    for i, y in enumerate((1, 2, 3, 2)):
        frame = Image.new('RGBA', (24, 24))
        frame.alpha_composite(icon, (2, y))
        if i in (1, 3):
            frame.putpixel((12, y + 10), (255, 238, 126, 255))
        frame.save(target / f'frame_{i:03}.png')


def contact(folder, paths, name, scale=4):
    images = [Image.open(p).convert('RGBA') for p in paths]
    columns = min(4, len(images))
    rows = (len(images) + columns - 1) // columns
    iw = max(im.width for im in images) * scale
    ih = max(im.height for im in images) * scale
    gap = 16
    out = Image.new('RGB', (columns * (iw + gap) + gap, rows * 2 * (ih + gap) + gap), '#171923')
    draw = ImageDraw.Draw(out)
    for i, im in enumerate(images):
        for background, block in [('#171923', 0), ('#e4e1dc', 1)]:
            x = gap + (i % columns) * (iw + gap)
            y = gap + (i // columns * 2 + block) * (ih + gap)
            tile = Image.new('RGBA', im.size, background)
            tile.alpha_composite(im)
            out.paste(tile.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST).convert('RGB'), (x, y))
            draw.text((x + 4, y + 3), f'{i:02}', fill='#fff' if block == 0 else '#111')
    out.save(folder / name)


def audit():
    records = {}
    expected = {'apartment': (4, {(192, 256), (160, 256), (128, 256)}),
                'npc': (12, {(176, 176)}), 'pip': (4, {(24, 24)}),
                'capacitor': (20, {(48, 48), (24, 24)}),
                'ladder': (1, {(128, 605)}), 'plate': (5, {(16, 24)})}
    for key, folder in OUT.items():
        files = sorted(p for p in folder.rglob('*.png') if p.name not in ('tiling_proof.png', 'old_new_game_size.png', 'family_comparison.png') and not p.name.startswith('contact_') and not p.name.startswith('game_'))
        bad = []
        for path in files:
            im = Image.open(path).convert('RGBA')
            if im.size not in expected[key][1]: bad.append(f'{path.name}: wrong size {im.size}')
            if key != 'apartment':
                a = im.getchannel('A')
                if any(a.getpixel((x, 0)) or a.getpixel((x, im.height - 1)) for x in range(im.width)) or any(a.getpixel((0, y)) or a.getpixel((im.width - 1, y)) for y in range(im.height)):
                    bad.append(f'{path.name}: border')
            if any(0 < a < 255 for a in im.getchannel('A').getdata()): bad.append(f'{path.name}: semitransparency')
            if key == 'pip':
                colors = Counter(p for p in im.getdata() if p[3])
                if len(colors) < 5: bad.append(f'{path.name}: fewer than five tones')
                if max(colors.values(), default=0) > sum(colors.values()) * 0.4:
                    bad.append(f'{path.name}: one tone dominates')
        if len(files) != expected[key][0]: bad.append(f'wrong frame count {len(files)}')
        records[key] = {'files': len(files), 'failures': bad}
    facade = Image.open(OUT['apartment'] / 'tiling_proof.png').convert('RGBA')
    pixels = [(r, g, b) for r, g, b, a in facade.getdata() if a]
    blue = sum(b > r * 1.12 and b > g * 1.06 for r, g, b in pixels) / len(pixels)
    warm = sum(r > g * 1.25 and g > b * 1.3 for r, g, b in pixels) / len(pixels)
    purple = sum(r > g * 1.1 and b > g * 1.1 and r > 45 and b > 45 for r, g, b in pixels) / len(pixels)
    records['apartment']['blue_share'] = round(blue, 4)
    records['apartment']['warm_share'] = round(warm, 4)
    records['apartment']['purple_share'] = round(purple, 4)
    if not 0.5 <= blue <= 0.8: records['apartment']['failures'].append('blue share outside 50-80%')
    if warm < 0.03 or purple < 0.01: records['apartment']['failures'].append('missing warm/purple accents')
    (ROOT / '_dev/codex03_art_audit.json').write_text(json.dumps(records, indent=2))
    print(json.dumps(records, indent=2))


def game_previews():
    scene = Image.open(ROOT / 'assets/progress/level1-middle.png').convert('RGBA')
    sample = [
        (OUT['apartment'], OUT['apartment'] / 'tiling_proof.png', (640, 256), (645, 184)),
        (OUT['npc'], OUT['npc'] / 'complaining/frame_003.png', (176, 176), (705, 263)),
        (OUT['npc'], OUT['npc'] / 'relieved/frame_003.png', (176, 176), (705, 263)),
        (OUT['pip'], OUT['pip'] / 'idle/frame_000.png', (24, 24), (665, 413)),
        (OUT['capacitor'], OUT['capacitor'] / 'item.png', (48, 48), (665, 392)),
        (OUT['ladder'], OUT['ladder'] / 'ladder.png', (128, 605), (700, 245)),
        (OUT['plate'], OUT['plate'] / 'off.png', (16, 24), (760, 395)),
    ]
    for i, (folder, path, size, position) in enumerate(sample):
        image = scene.copy()
        sprite = Image.open(path).convert('RGBA')
        assert sprite.size == size
        if folder == OUT['ladder']:
            sprite = sprite.resize((32, 192), Image.Resampling.NEAREST)
        image.alpha_composite(sprite, position)
        stem = f'game_{i:02}'
        image.convert('RGB').save(folder / f'{stem}_1x.png')
        # Nearest-neighbour 3x crop keeps the actual game pixel relationship.
        x0, y0, x1, y1 = 570, 240, 900, 480
        image.crop((x0, y0, x1, y1)).resize(((x1-x0)*3, (y1-y0)*3), Image.Resampling.NEAREST).convert('RGB').save(folder / f'{stem}_3x.png')


def family_comparison():
    target = OUT['apartment']
    refs = [
        ROOT / 'assets/objects/night-city-buildings/abandoned_apartment/preview_stitched.png',
        ROOT / 'assets/objects/night-city-buildings/apartment_complex/preview.png',
        target / 'tiling_proof.png',
    ]
    canvas = Image.new('RGBA', (660, 3 * 285), '#0b0e1b')
    draw = ImageDraw.Draw(canvas)
    for i, path in enumerate(refs):
        im = Image.open(path).convert('RGBA')
        im.thumbnail((640, 256), Image.Resampling.NEAREST)
        canvas.alpha_composite(im, (10, i * 285 + 23))
        draw.text((10, i * 285 + 5), ['ABANDONED APARTMENT', 'APARTMENT COMPLEX', 'CODEX 03 TENANT'][i], fill='#a9c9db')
    canvas.convert('RGB').save(target / 'family_comparison.png')


def main():
    apartment()
    ladder()
    plate()
    contact(OUT['ladder'], [OUT['ladder'] / 'ladder.png'], 'contact_dark_light.png')
    sheet('hot', 2, 3, (176, 176), OUT['npc'] / 'complaining', npc_window=True)
    sheet('relieved', 2, 3, (176, 176), OUT['npc'] / 'relieved', npc_window=True)
    pip_from_hud()
    fit(chroma(load('capacitor')), (48, 48), 2).save(ensure(OUT['capacitor']) / 'item.png')
    sheet('idle', 2, 3, (48, 48), OUT['capacitor'] / 'idle', margin=2)
    sheet('glow', 2, 2, (48, 48), OUT['capacitor'] / 'glow', margin=2)
    sheet('spin', 2, 4, (48, 48), OUT['capacitor'] / 'spin', margin=2)
    fit(chroma(load('icon')), (24, 24), 2).save(OUT['capacitor'] / 'icon.png')
    apartment_folder = OUT['apartment']
    contact(apartment_folder, [apartment_folder / f'{n}.png' for n in ('left', 'wall_bay', 'front_bay', 'right')], 'contact_dark_light.png')
    for folder in [OUT['npc'] / 'complaining', OUT['npc'] / 'relieved', OUT['pip'] / 'idle',
                   OUT['capacitor'] / 'idle', OUT['capacitor'] / 'glow', OUT['capacitor'] / 'spin']:
        contact(folder, sorted(folder.glob('frame_*.png')), 'contact_dark_light.png')
    contact(OUT['capacitor'], [OUT['capacitor'] / 'item.png', OUT['capacitor'] / 'icon.png'], 'contact_dark_light.png')
    game_previews()
    family_comparison()
    audit()


def ensure(path):
    path.mkdir(parents=True, exist_ok=True)
    return path


if __name__ == '__main__':
    main()
