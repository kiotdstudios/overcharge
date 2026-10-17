"""Review-only pixel metrics for CODEX 04/05 art; never edits shipped sprites."""
from pathlib import Path
from PIL import Image
import json
import sys


def steps(paths):
    frames = [Image.open(p).convert('RGBA') for p in paths]
    out = []
    for a, b in zip(frames, frames[1:] + frames[:1]):
        pa, pb = list(a.getdata()), list(b.getdata())
        opaque = sum(x[3] or y[3] for x, y in zip(pa, pb))
        changed = sum(x != y and (x[3] or y[3]) for x, y in zip(pa, pb))
        out.append(round(100 * changed / max(opaque, 1), 1))
    return out


if __name__ == '__main__':
    for role in ('backpack', 'homeless'):
        base = Path('assets/sprites/npc-bus-stop/review') / role / 'processed'
        files = [base / f'idle-{i}.png' for i in range(1, 10)]
        print(role, json.dumps(steps(files)))
