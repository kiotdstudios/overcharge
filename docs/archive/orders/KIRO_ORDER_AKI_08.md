# KIRO ORDER — AKI 08

**From:** Kiro, Technical Director
**Gate result:** A11 + A8 **PASS and MERGED** (`c234b63`). parity 386/0, boot smoke clean.
One merge conflict resolved: we both added `docs/OVERCHARGE_LEVEL_BREAKDOWN.md`. **Mine was kept** — it
carries 5 recorded overrides beneath the verbatim text. Do not re-add yours.

Three items from Chief's Builder session. All three are yours.

---

## A12 — Drone patrol range must MOVE WITH THE DRONE

Chief: *"if i move the drone the path should go with it."*

`patrolLeft` and `patrolRight` are stored as **absolute world X**, so dragging the drone leaves the
patrol range behind. In his screenshot the dashed patrol line sits far to the left of the drone it
belongs to. That is not cosmetic — the drone will fly to coordinates the author no longer intends.

**Fix:** when a drone is dragged, translate `patrolLeft` and `patrolRight` by the same delta as `x`.

Requirements:
- Applies to single drags **and group drags** (group drags stay rigid via LCM delta snap — the patrol
  range must take the same delta, not be re-derived).
- **Clamp to the level bounds** after translating. A patrol range pushed past `cols * 32` sends the drone
  off authored terrain — on Level 3 that means out over the 62% void.
- If the drone is dragged such that the range would invert (`patrolLeft > patrolRight`), keep the
  ordering rather than silently swapping.
- Undo must restore all three values together.
- **Do not change the schema.** Absolute coordinates are correct in the file; only the drag needs to
  maintain them.

Assert it: drag a drone by a known delta, confirm `x`, `patrolLeft`, `patrolRight` all moved by that
delta. Mutation-test by reverting the translation and confirming the assertion fires.

---

## A13 — The drone belongs in the asset bank

Chief: *"aki needs to add the player and the drone to the assest bank."*

You added the **player** (A11) — good, and the Purple City filter fix on top of it was right. **The drone
is still missing.**

- One palette entry, `+ Drone` already exists as a spawn button, so this is the **asset bank** entry to
  match how the player now works.
- Real drone art, correct `boundingRect` — the drone hitbox is **40×36**; do not let the box disagree
  with the sprite the way the checkpoint's did.
- Sensible default patrol range on spawn, relative to where it is placed, so A12's invariant holds from
  creation.
- **State/animation frames stay OUT of the palette** — the drone has 9 shooting frames and an idle set.
  One placeable entry only, same rule as the gate and fence.

---

## A14 — Identify the boxes under the platform tiles

Chief: *"idk what those boxes are under the platform tiles."*

In his screenshot there are pale outlined rectangles sitting beneath the purple platform runs. **Find out
what is drawing them before changing anything** — my strong suspicion is one of:

1. **Dangling decoration references.** Level 2 and 3 still contain `decorations[].src` entries pointing at
   PNGs I deleted in the asset purge (`archive tag asset-archive-purple-city-v1`). The runtime skips a
   failed image silently (`level.js:203`), but **the Builder may be drawing a placeholder box** where the
   art fails to load. Level 3 has 6 such entries, Level 2 had 30 before Chief deleted most.
2. Selection or bounding-box outlines drawn for objects that should not show one.
3. A tile-grid or collision overlay left visible.

**Report which it is before you fix it.** If it is (1), the right fix is for the Builder to either draw
nothing for an unresolvable decoration, or draw something clearly labelled as missing art — **not** an
anonymous box. An anonymous box is worse than nothing because Chief cannot tell it from real content.

Do **not** strip the dangling references from the level JSON. I left them deliberately so restoring from
the archive tag brings the decorations back; Chief said he wants some later.

---

## Priority
**A12 first** — it actively corrupts authoring intent every time Chief moves a drone, and he is placing
drones now. Then **A14** (he cannot read his own level), then **A13**.

Still blocked, unchanged: **A9** chest (needs Orcha's schema), **A10** vertical (needs Orcha's runtime).

Push when green. Boot smoke every time.

— Kiro, Technical Director
