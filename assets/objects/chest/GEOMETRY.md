# chest/ sprite geometry — MEASURED, do not re-derive

Chief's `metal box` pack from PixelLab, installed 2026-09-18 from `~/Downloads/metal_box/`.

| Property | Value |
|---|---|
| canvas | 128 x 128 |
| content box | left 12, right 12, **bottom 12**, top 12 |
| content size | 104 x 104 |
| uniformity | **botPad = 12 on all 11 files** — one constant grounds every frame |

## Files, and what each is for
```
closed.png              closed chest, at rest
opening/frame_000..008  the vibrate/open animation, plays ONCE while charging
open_empty.png          final resting state after the reward is taken
```

Chief's ruling (D9): *"use open and empty as last frame of the box after player charges to open it."*
So the sequence is `closed` -> `opening/000..008` -> `open_empty` and it never loops back.

## frame_000 IS A REAL FRAME HERE — verified by hash, not assumed
```
closed.png            sha 81E6F765FE8234CA
opening/frame_000.png sha AC606DD3FBA25D69   <- DIFFERENT
open_empty.png        sha DF2D10F9DAB1B230
```
`frame_000` is **not** byte-identical to `closed.png`, and all 9 animation frames are unique.
So this pack animates **000..008**, unlike the fence, wall_switch and gate packs where
`frame_000` is the rest pose. **Seventh pack checked; the convention has now failed twice.**
Always verify per pack by hash.

## One measured variance, harmless
`frame_008` has `top = 11` where every other file has `top = 12`. **Bottom padding is uniform at
12 across all 11 files**, and the chest is grounded from its content bottom, so this 1px top
difference never moves the sprite. Recorded so nobody "fixes" it.

## View mismatch — CHIEF'S CALL, not a defect
PixelLab generated this at `"view": "low top-down"` while OVERCHARGE is a side-scroller. It may
read fine as a crate-like object seen slightly from above, or it may look wrong beside the
side-view gate and switch art. **Only Chief can judge that.** If it reads wrong the fix is
regenerating the art at `side` view, never a runtime transform.