# KIRO ORDER — AKI 10

**From:** Kiro, Technical Director
**A9 IS UNBLOCKED. Start now.** The chest schema is ratified, merged and on the live line at `1f49435`.

---

## 1. You have been parked a long stretch. That is over.

Chief has ratified the chest, Orcha has installed the art, and it is merged. **A9 is your queue and
nothing in it waits on anyone.**

Read `docs/ORCHA_CHEST_V1_SEMANTICS.md` and `assets/objects/chest/GEOMETRY.md` — both on the live line.
**Treat GEOMETRY.md as the contract and do not re-measure**, exactly as Orcha did for the gate pack.

## 2. The schema — this is all of it

```
{ id, x, y, cost, reward }
```

Chief's ratified values: **cost 2, reward 10** (a full pip; `MAX_CHARGE = 10`, so no conversion). A level
with no `chests` entry behaves exactly as today.

## 3. Art — installed, measured, uniform
```
assets/objects/chest/closed.png                 closed
assets/objects/chest/opening/frame_000..008     vibrate, plays ONCE
assets/objects/chest/open_empty.png             final state
```
Sequence is `closed → opening → open_empty` and **never loops back**.

**Two things you must get right:**
- **Bottom padding is a uniform 12px across all 11 files.** One constant grounds every frame. Anchor from
  the content bottom, not the canvas.
- **`frame_000` IS a real frame in this pack.** Hash-verified different from `closed.png`. This is the
  **second pack where the convention breaks** — the generator was the first. Do **not** skip it the way
  you correctly skip it for fence, switch and gate. **Verify per pack by hash, never by convention.**

## 4. A9 scope
- **`+ Chest` spawn button**, following the existing `['spawn-<id>', '<kind>']` pattern in `editor/main.js`.
- **One palette entry**, `closed.png` as the thumbnail — the state a freshly placed chest is in.
- **State frames stay OUT of the palette.** `open_empty` and the 9 opening frames are runtime states.
  Chief must never be able to place an already-opened chest. Same rule that kept the dead fence out.
- **Inspector fields** for `cost` and `reward`, defaulting to 2 and 10.
- **`boundingRect` matching the drawn sprite**, not a guessed box. The checkpoint defect Chief reported
  twice was a 56×56 sprite under a 22×22 box.
- **Draw the chest in the Builder** using the installed art, anchored from content bottom.

## 5. Verification
- Suites green, **boot smoke with a fresh port** — mandatory in your lane.
- **Prove `open_empty` and the opening frames are NOT placeable.** I will check this independently; it is
  the same rule I had to correct you on once already.
- Spawn a chest and confirm it lands with `cost: 2`, `reward: 10`, grid-aligned on X and grounded on Y.
- Report in `AKI_STATUS.md`, **same commit as the work**. That has slipped twice; it is the thing that
  stops me reconstructing your work from diffs and mis-reading it.

## 6. Also yours, unchanged
- **A10 vertical expansion** — still blocked on Orcha's runtime accepting variable height. Not started.
- **Level 2 still has 2 dangling decoration refs.** Chief has not ruled on removing them; leave them. Your
  missing-art label already makes them legible rather than anonymous boxes.

## 7. Work the queue
Per `docs/KIRO_STANDING_WORK_THE_QUEUE.md`: finish A9, push it green, and only stop at a genuine block.
Do not report a plan and wait.

— Kiro, Technical Director
