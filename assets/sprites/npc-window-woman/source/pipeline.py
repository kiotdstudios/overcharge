"""AKI_26 Part 2 item 2 — window NPC post-process.
Deterministic, re-runnable: raw PixelLab frames -> shipped frames.
  1. drop the pinned duplicate / transition frame
  2. restore the windowsill contact row where the animator broke it
  3. remove detached pixel islands (animator sparkle)
  4. lock every pixel onto the Night City character palette
"""
from PIL import Image
import colorsys, os

# Night City character subset. Sampled from assets/sprites/npc-smoke-break/worker-a,
# npc-streetlamp-woman, night-city-props/{fuse-box,vending-machine}; magenta/pink band
# (sat>0.18, hue 285-350) excluded, the two quantiser strays hue-corrected to 238, and the
# prop-glow accents (mint LED 143,255,224 / cyan 113,179,194) and near-white cream
# (187,186,156) left OUT - they were capturing the animator's white highlights.
PALETTE = [(7,4,3),(13,12,7),(4,2,13),(16,20,19),(27,15,7),(29,27,23),(12,13,32),(9,7,34),
  (17,18,47),(21,22,50),(30,7,62),(65,23,27),(29,29,67),(52,55,84),(94,30,26),(96,59,48),
  (102,43,21),(91,95,106),(137,55,19),(141,58,30),(149,71,30),(170,76,30),(180,87,36),
  (194,93,37),(197,134,84),(198,114,59),(206,104,42),(223,117,48),
  (33,33,43),(16,17,43),(55,103,146),(48,50,102)]

def _lab(c):
    def f(u):
        u /= 255.0
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    r, g, b = [f(x) for x in c]
    X = r*.4124 + g*.3576 + b*.1805; Y = r*.2126 + g*.7152 + b*.0722; Z = r*.0193 + g*.1192 + b*.9505
    def g_(t): return t ** (1/3) if t > 0.008856 else 7.787 * t + 16/116
    fx, fy, fz = g_(X/.95047), g_(Y), g_(Z/1.08883)
    return (116*fy - 16, 500*(fx - fy), 200*(fy - fz))

_PL = [_lab(c) for c in PALETTE]; _cache = {}
def snap(c):
    if c in _cache: return _cache[c]
    l = _lab(c)
    i = min(range(len(PALETTE)), key=lambda k: sum((l[j]-_PL[k][j])**2 for j in range(3)))
    _cache[c] = PALETTE[i]; return PALETTE[i]

def kill_islands(im, max_size=10):
    px = im.load(); w, h = im.size
    op = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0}
    seen = set(); killed = 0
    for seed in list(op):
        if seed in seen: continue
        stack = [seed]; comp = []; seen.add(seed)
        while stack:
            x, y = stack.pop(); comp.append((x, y))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q in op and q not in seen:
                        seen.add(q); stack.append(q)
        if len(comp) <= max_size:
            for x, y in comp: px[x, y] = (0, 0, 0, 0)
            killed += len(comp)
    return killed

JOBS = {'complaining': [('complain', i) for i in range(6)],    # raw 06 = pinned dup of 00
        'relieved':    [('relieved', i) for i in range(1, 5)]}  # raw 00 = complaining base
SHIFT_Y = {('relieved', 4): -7}   # sill contact row 165 -> 158, matching every other frame

def run(out_root):
    log = []
    for state, frames in JOBS.items():
        os.makedirs(f'{out_root}/{state}', exist_ok=True)
        for oi, (src, i) in enumerate(frames):
            im = Image.open(f'raw_{src}_{i:02d}.png').convert('RGBA')
            dy = SHIFT_Y.get((src, i), 0)
            if dy:
                o = Image.new('RGBA', im.size, (0, 0, 0, 0)); o.paste(im, (0, dy)); im = o
            killed = kill_islands(im)
            px = im.load(); changed = 0
            for y in range(im.height):
                for x in range(im.width):
                    p = px[x, y]
                    if p[3] == 0:
                        px[x, y] = (0, 0, 0, 0); continue
                    s = snap(p[:3])
                    if s != p[:3]: changed += 1
                    px[x, y] = (s[0], s[1], s[2], 255)
            im.save(f'{out_root}/{state}/{oi:02d}.png')
            log.append((state, oi, f'raw_{src}_{i:02d}', dy, killed, changed))
    return log

if __name__ == '__main__':
    import sys
    for row in run(sys.argv[1]):
        print(row)
