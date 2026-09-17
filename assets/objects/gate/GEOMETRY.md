# gate/ sprite geometry — MEASURED, do not re-derive

Chief's cleaned art, installed 2026-09-17.

| Property | Value |
|---|---|
| canvas | 128 x 128 |
| content columns | 17 .. 110  (94 wide) |
| content rows | 10 .. 114  (105 tall) |
| padding | left 17, right 17, top 10, **bottom 13** |
| uniformity | **identical on all 18 animation frames + rest + dead** |

## Why this matters
The previous spritesheet had ERRATIC bottom padding — `0,12,12,13,13,0,13,13,13` on the idle
row — which made the gate hover AND twitch once per loop. Chief re-cut the art and the padding
is now uniform, so a **single constant offset** grounds every frame. Uniform-canvas anchoring
(standing ruling 6.2) still applies; no per-frame exception is needed.

## frame_000 is ABSENT ON PURPOSE
In the source pack `animations/idle/frame_000.png` and `animations/charging/frame_000.png`
are **byte-identical to the rest pose** (sha256 verified). They are the rest pose, not frame 1.
Only `frame_001..008` were installed, and `rest.png` holds that shared pose. Do not add a
`frame_000.png` here — its absence is what prevents the animation from starting on a still
frame, a mistake that has been made three times in this project.

## Files
- `rest.png`  — neutral/base gate (was frame_000)
- `dead.png`  — dormant/spent gate
- `idle/frame_001..008.png`     — holds some charge
- `charging/frame_001..008.png` — actively being charged
