"""Build fixed-position tenant review clips from generated pixel-art key poses."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path('assets/sprites/npc-window-tenant-v2/review')


def clean(img):
    img = img.convert('RGBA')
    data = list(img.getdata())
    img.putdata([(r, g, b, 255 if a >= 128 else 0) for r, g, b, a in data])
    # The source model made the hands slightly wide. Keep the full figure below
    # the 44px window-safe width while retaining the same fixed sill baseline.
    small = img.resize((57, 57), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (64, 64))
    canvas.alpha_composite(small, (3, 6))
    return canvas


def blend_pixels(a, b, frac):
    aa, bb = list(a.getdata()), list(b.getdata())
    out = a.copy()
    pixels = []
    for i, (x, y) in enumerate(zip(aa, bb)):
        px = i % 64
        py = i // 64
        threshold = ((px * 73 + py * 151 + px * py * 17) % 251) / 251
        pixels.append(y if threshold < frac else x)
    out.putdata(pixels)
    return out


def build(name, count, path, steps_per_transition, fps, loop):
    folder = ROOT / name
    keys = [clean(Image.open(folder / 'processed' / f'idle-{i}.png')) for i in range(1, count + 1)]
    indices = path + ([path[0]] if loop else [])
    frames = []
    for i in range(len(indices)-1):
        a, b = keys[indices[i]], keys[indices[i+1]]
        for j in range(steps_per_transition):
            # A held endpoint and eased rise: keeps a slow fanning rhythm.
            t = j / steps_per_transition
            t = t * t * (3 - 2 * t)
            frames.append(blend_pixels(a, b, t))
    if not loop:
        frames.append(keys[indices[-1]])
    dest = folder / 'clip'
    dest.mkdir(exist_ok=True)
    for i, img in enumerate(frames):
        img.save(dest / f'{i:03d}.png')
    frames[0].save(folder / 'animation.gif', save_all=True, append_images=frames[1:],
                   duration=round(1000 / fps), loop=0 if loop else 1,
                   disposal=2, optimize=False)
    picks = [round(i*(len(frames)-1)/8) for i in range(9)]
    for ground, color in [('dark', (7, 10, 24, 255)), ('light', (215, 220, 227, 255))]:
        sheet = Image.new('RGBA', (64*3*4, 64*3*4), color)
        for n, idx in enumerate(picks):
            sheet.alpha_composite(frames[idx].resize((256,256), Image.Resampling.NEAREST),
                                  ((n%3)*256, (n//3)*256))
        sheet.save(folder / f'contact-{ground}-4x.png')
    steps = []
    pairs = list(zip(frames, frames[1:] + (frames[:1] if loop else [])))
    for a,b in pairs:
        pa,pb = list(a.getdata()), list(b.getdata())
        area = sum(bool(x[3] or y[3]) for x,y in zip(pa,pb))
        steps.append(round(100*sum(x!=y and bool(x[3] or y[3]) for x,y in zip(pa,pb))/max(1,area),1))
    boxes = [f.getchannel('A').getbbox() for f in frames]
    heights = [b[3]-b[1] for b in boxes]
    widths = [b[2]-b[0] for b in boxes]
    report = {'frames':len(frames),'fps':fps,'duration_s':round(len(frames)/fps,2),
              'max_step_pct':max(steps),'seam_pct':steps[-1] if loop else None,
              'visible_width_max':max(widths),'visible_height_max':max(heights),
              'footYByFrame':sorted(set(b[3] for b in boxes)),
              'step_pct':steps}
    (folder/'metrics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(name, {k:v for k,v in report.items() if k!='step_pct'})


build('hot',9,list(range(9)),24,12,True)
build('relieved',6,list(range(6)),12,12,False)
build('relaxed',4,[0,1,2,3],10,12,True)
