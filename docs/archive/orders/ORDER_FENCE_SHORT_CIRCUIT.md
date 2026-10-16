# ORDER — POWERED FENCE + SHORT-CIRCUIT WALL SWITCH (Level 2 path gate)

**From:** Kiro (Technical Chief) · **Authority:** Chief directive, 2026-09-12
**Art:** Chief-supplied, already installed and committed (see inventory below).
**Split:** Orcha = runtime state machine · Aki = manifest + editor. **Read the
semantics section before writing code — this INVERTS the existing switch.**

## Chief's words

> "for level 2 i've been working on getting the art for the FENCE that is powered
> by a wall switch that needs to be short circuited by charging it; unlocking the
> path to get to the actual next level gate"

## Art inventory (installed, committed, do not re-import)

> ⚠ **CORRECTION (2026-09-12): the two tables below are WRONG in three ways.**
> See `docs/KIRO_RULING_FENCE_V1.md` — Orcha caught them and I verified:
> 1. **`frame_000` is the REST POSE, byte-identical to the dead/destroyed art in
>    BOTH packs. Animate from `frame_001`.** Animating from 000 flashes a live
>    fence's passable-looking dead art one frame in nine.
> 2. **Bboxes are NOT constant** — fence has 2 distinct boxes, switch has 6 (the
>    2px spread on frames 001-003 IS the vibration). Anchor from the uniform
>    canvas, never per-frame bbox.
> 3. **Luma cannot signal state** — `fence_dead` (50.4) is BRIGHTER than live
>    frames 001 (22.7) and 008 (22.0). Motion is the signal.
>
> My error came from sampling only even frames and generalising. The ruling doc is
> authoritative where it conflicts with this file.

`assets/objects/wall_switch/` — **56×56**, all frames share bbox ~10,1..46,52
| file | reads as |
|---|---|
| `switch_off.png` | grey panel, dark icon — unpowered |
| `switch_on.png` | grey panel, **green glowing** icon — powered, feeding the fence |
| `switch_destroyed.png` | green icon + burn marks, rust, sparks — **short-circuited** |
| `frame_000..008.png` | 9-frame vibrate/arc/burn animation (the destruction) |

`assets/objects/fence/` — **64×64**, all frames share bbox 1,10..62,59
| file | reads as |
|---|---|
| `fence_dead.png` | dark slack wires — **unpowered, passable** |
| `frame_000..008.png` | 9-frame electricity travelling along the wires (mean luma pulses 50 → 108 → 22), i.e. **live and blocking** |

`metadata.json` kept in each folder for provenance (same convention as
`gate_electric_dead.json`).

## SEMANTICS — this is the inverse of the existing switch

The shipped `Switch` starts **off** and turns **on** when charged, and a
`blockOnly` gate starts **closed** and **opens** when its linked switch fires.

Chief's fence is the same *mechanism* with **inverted presentation**:

```text
START:  wall switch = ON (green, powering the fence)
        fence       = LIVE (sparking animation), BLOCKS the player
ACTION: player charges the wall switch  ->  it OVERLOADS
        switch plays the 9-frame destroy animation -> switch_destroyed.png
        fence goes DEAD (dark) -> path opens to the real exit gate
```

So charging does not "switch something on" — it **destroys** the thing that was
holding the fence up. Mechanically this still maps onto the existing
`Switch.required` + `blockOnly` gate pair, which is why **no new energy path is
needed**. What is new is the visual state machine and the authoring flag.

## ORCHA — runtime

1. **Schema, additive and default-off.** Proposed:
   - switch gains `style: "wall"` (optional) → renders the wall_switch art and
     uses destroyed-on-fire semantics instead of lit-on-fire.
   - `blockOnly` gate gains `style: "fence"` (optional) → renders fence art:
     animated frames while blocking, `fence_dead.png` once open.
   - Absent `style` = **byte-identical behaviour to today**. Level 1/2/3 must be
     unaffected until Chief authors the flag.
2. **State machine.** Switch: `on` (idle, `switch_on.png`) → charging → on
   completion play frames 000-008 **once** → settle permanently on
   `switch_destroyed.png`. It must NOT loop the destroy animation and must NOT
   revert. Fence: loop frames while the linked gate is closed; on open, stop and
   draw `fence_dead.png`.
3. **Compose with dormancy.** A `style:"fence"` gate is `blockOnly`, and
   `blockOnly` is already **exempt from `isDormant`** (`electricity.js:184`) —
   confirm that still holds and that a fence never renders the dead-gate art.
4. All energy through the Order 004 authority. Conservation suite stays green.
5. **Anchoring:** both packs are consistently registered (switch bbox
   10,1..46,52 in 56×56; fence bbox 1,10..62,59 in 64×64). Derive draw offsets
   from those measured boxes, and give the editor the SAME numbers — WYSIWYG rule.
6. Tests: switch destroys once and stays destroyed, fence blocks while live and
   passes when dead, a styleless switch/gate behaves exactly as before,
   conservation unaffected, schema round-trips. Hand-author a `99_` testbed kept
   out of `levels.json`.

**Propose semantics in a doc and HOLD for ratification before implementing** —
same process as CRATE_TIMED, which caught a guaranteed crash on paper.

## AKI — art + editor (after Orcha's schema lands)

1. Register both packs in `ASSET_MANIFEST.json` with accurate ids/categories/tags.
   These are **runtime state sprites**, so follow the `gate_electric_dead.png`
   precedent: they do **not** go in the art palette, and the palette must still
   show exactly ONE gate entry.
2. Inspector: `style` dropdown on switches (`default` / `wall`) and on blockOnly
   gates (`default` / `fence`).
3. Editor rendering: draw `switch_on.png` and the fence's live frame (or a static
   representative frame) so Chief sees what he is placing. Add/adjust
   `boundingRect` entries so the selection box wraps the new sprites — a 56×56
   switch under a 22×22 box is the exact defect Chief reported on the checkpoint.

## Level 2 note

Level 2 already has the working pair: `SW1` (required 2, linked to `BARRIER`) and
`BARRIER` (`blockOnly`). Once `style` exists, Chief can flip those two to
`wall`/`fence` and the level becomes the intended fence puzzle **with no layout
change**. Exit is `EXIT` at **required 8** (Chief's all-exits-cost-8 ruling).
Budget: 10 energy available, 2 (switch) + 8 (exit) = 10. **Margin 0** — solvable
because Level 2 has no enemies and no waste path, but do not add a third cost.
