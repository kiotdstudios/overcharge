"""Assemble generated key poses into quiet, seam-safe review loops.

Only copies pixels from generated poses; the ordered mask limits a beat to
its moving body region so static clothing does not shimmer between renders.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path('assets/sprites/npc-bus-stop/review')
BEATS = {
    'backpack': [
        (1, (70, 31, 119, 82)),   # thumb/phone
        (3, (39, 6, 94, 57)),     # look up
        (5, (32, 26, 108, 83)),   # strap
        (6, (38, 72, 99, 125)),   # weight and sigh
    ],
    'homeless': [
        (1, (33, 27, 102, 86)),   # coat/breath
        (3, (42, 9, 103, 69)),    # scarf
        (5, (47, 37, 119, 90)),   # hands
        (6, (40, 7, 102, 58)),    # street glance
    ],
}
LEVELS = [0, .25, .5, .75, 1, 1, 1, 1, .75, .5, .25, 0]


def hash01(x, y):
    return ((x * 73 + y * 151 + x * y * 17) % 251) / 251


def make(role):
    folder = ROOT / role
    source = folder / 'processed'
    shift_y = -1 if role == 'backpack' else 2
    def align(img):
        aligned = Image.new('RGBA', (128, 128))
        aligned.alpha_composite(img.convert('RGBA'), (0, shift_y))
        # Match the shipped bus-stop sprites' hard pixel edges.
        pixels = list(aligned.getdata())
        aligned.putdata([(r, g, b, 255 if a >= 128 else 0) for r, g, b, a in pixels])
        return aligned
    base = align(Image.open(source / 'idle-1.png'))
    frames = []
    for pose_idx, region in BEATS[role]:
        target = align(Image.open(source / f'idle-{pose_idx + 1}.png'))
        x0, y0, x1, y1 = region
        for level in LEVELS:
            frame = base.copy()
            out = frame.load()
            b = base.load()
            t = target.load()
            for y in range(y0, y1):
                for x in range(x0, x1):
                    if hash01(x, y) < level:
                        out[x, y] = t[x, y]
                    else:
                        out[x, y] = b[x, y]
            frames.append(frame)
    dest = folder / 'loop'
    dest.mkdir(exist_ok=True)
    for i, frame in enumerate(frames):
        frame.save(dest / f'{i:02d}.png')
    frames[0].save(folder / 'neutral.png')
    frames[0].save(folder / 'rollback-reference.png')
    frames[0].save(folder / 'preview-1x.png')
    frames[0].resize((384, 384), Image.Resampling.NEAREST).save(folder / 'preview-3x.png')
    frames[0].save(folder / 'animation.gif', save_all=True, append_images=frames[1:],
                   duration=167, loop=0, disposal=2, optimize=False)
    # Nine representative poses per ground; enlarged fourfold for art review.
    picks = [0, 4, 6, 12, 16, 24, 28, 36, 40]
    for ground, color in [('dark', (7, 10, 24, 255)), ('light', (208, 214, 221, 255))]:
        sheet = Image.new('RGBA', (128 * 3 * 4, 128 * 3 * 4), color)
        for n, idx in enumerate(picks):
            enlarged = frames[idx].resize((512, 512), Image.Resampling.NEAREST)
            sheet.alpha_composite(enlarged, ((n % 3) * 512, (n // 3) * 512))
        sheet.save(folder / f'contact-{ground}-4x.png')
    steps = []
    for a, b in zip(frames, frames[1:] + frames[:1]):
        pa, pb = list(a.getdata()), list(b.getdata())
        area = sum(bool(x[3] or y[3]) for x, y in zip(pa, pb))
        changed = sum(x != y and bool(x[3] or y[3]) for x, y in zip(pa, pb))
        steps.append(round(100 * changed / max(1, area), 1))
    payload = {'role': role, 'frames': len(frames), 'fps': 6, 'duration_s': 8,
               'frame_step_pct': steps, 'max_step_pct': max(steps),
               'seam_pct': steps[-1], 'neutral_difference_ge_8pct': None}
    bp = list(base.getdata())
    neutral = []
    for frame in frames:
        fp = list(frame.getdata())
        area = sum(bool(x[3] or y[3]) for x, y in zip(bp, fp))
        changed = sum(x != y and bool(x[3] or y[3]) for x, y in zip(bp, fp))
        neutral.append(round(100 * changed / max(1, area), 1))
    payload['neutral_difference_ge_8pct'] = sum(x >= 8 for x in neutral)
    payload['neutral_difference_pct'] = neutral
    (folder / 'metrics.json').write_text(json.dumps(payload, indent=2), encoding='utf-8')
    print(role, 'max step', max(steps), 'seam', steps[-1], '>=8%', payload['neutral_difference_ge_8pct'])


for role in BEATS:
    make(role)
