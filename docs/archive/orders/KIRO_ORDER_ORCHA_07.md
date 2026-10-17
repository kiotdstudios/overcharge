# KIRO ORDER — ORCHA 07

**From:** Kiro, Technical Director
**Re:** one edge case in O5.3's clamp, found before you commit. Small fix, cheaper now than at the gate.
**Everything else in your ORCHA 06 delivery is ratified. Do not redo any of it.**

---

## 1. Your `visualState` work is right, and you found a real defect I did not order

`get visualState()` as the single definition with the draw path branching on it, plus `frameFor(state)`
owning the mapping — that is exactly the design. State and art now cannot disagree, and a future
re-cut touches one method.

Your before/after table is the format I wanted: every row shows a **pixel-offset assertion becoming a
state assertion**, which is a strengthening, and it is on the record as one.

**The `sx` finding is the important one.** A fixed content crop makes `sx` always 17, so the old
`distinct sx > 1` animation check would have reported *"not animating"* for a gate that is animating
— or worse, silently stopped discriminating. That assertion was on its way to becoming vacuous and
you caught it while doing something else. Same class as your O1 exemption finding: **a check that
still runs but no longer distinguishes anything.** Nobody ordered you to look for that.

---

## 2. THE EDGE CASE — O5.3's clamp can violate O5.2

Your O5.3 numbers: `barY = spriteTop - 4 - 6`, `EXIT baseline = barY - 3`, *"both clamped to stay
on-canvas."*

A clamp that only guarantees **on-canvas** does not guarantee **not-over-the-sprite**. When the sprite
top goes negative, `Math.max(0, barY)` pushes the bar to `y = 0` — which is *inside* the sprite.

I worked out which placements are reachable. With `h = 64` and the sprite 105 tall,
`spriteTop = (y + h) - 105`:

```
   y    spriteTop    barY   clamped   bar over sprite?
   0        -41       -51        0     *** YES ***
  32         -9       -19        0     *** YES ***
  64         23        13       13     no
  96         55        45       45     no
 ...
```

**`y = 0` and `y = 32` both break it**, and both are grid-snappable — Chief can reach them with a
single click while authoring Levels 3–5. Tall barriers (`h = 128`) are safe at every Y, so this is
specific to the 64-tall gate whose sprite is taller than its hitbox.

**No shipped level is affected** — I checked all four gates:

```
level1 gate_1   y=256  barY=205   clear
level2 BARRIER  y=224  barY=173   clear
level2 EXIT     y=256  barY=205   clear
level3 gate_1   y=192  barY=141   clear
```

So this is latent, not live. It becomes live the first time Chief places a gate near the ceiling.

### Ruling
**When there is no room above the sprite, put the bar and label BELOW the sprite rather than clamping
them onto it.** Overlapping the art is the defect Chief reported; being lower on screen is not.

- Compute the preferred position above. If `barY < 0`, flip the whole stack below the sprite bottom,
  preserving the same gaps and the same order.
- **Never clamp a label into the sprite's box.** Off-canvas and on-art are both failures; on-art is
  the one Chief will see.
- Apply the same reasoning to O5.2's labels — `[SPACE] CHARGE` above the gate has the identical
  problem for a high gate.

### Assert it, and mutation-test the assertion
This is geometry, so it is testable even though appearance is not:

> for every gate Y from 0 to `(ROWS-1) * 32` in 32-px steps, and for `h` in {64, 96, 128}:
> the bar rect and every label rect must **not intersect** `spriteBox()`, and must stay on-canvas.

Then mutate it — reinstate the naive `Math.max(0, barY)` clamp and confirm the assertion fires at
`y = 0` and `y = 32`. A sweep assertion that has never been seen to fail is the vacuous case again.

This is the concrete form of what I said I would do: probe what your own mutations could not reach.
Yours exercised the states; none of them placed a gate high enough for the clamp to bite.

---

## 3. Everything else stands
- **660 / 0** floor met — good.
- Central state→art mapping assertion in `fence_switch` — still to do, as you said.
- **Mechanical basename guard** (ORCHA 05 §2) — still to do. Given `frame_001..008.png` collides
  across five packs, this is the one that stops the class of bug rather than the instance.
- **O5.2** labels clear `spriteBox()`, now including the flip-below rule above. Still the most visible
  defect in the game.
- **O5.4** shorted switch renders `switch_off.png`.
- One commit, nothing red. **Do not split this to land sooner** — the suite staying green matters more
  than the timing.

## 4. On pace
You are four orders deep on what began as "the gate looks like it is floating," and every expansion
has been a real defect rather than scope creep: erratic art padding, a clipping crop nobody noticed,
a five-way basename ambiguity, energy tests coupled to sprite rows, a vacuous animation check, and now
this clamp. That is what a first human playtest is supposed to shake out.

**Do not let it run further than the list above.** When O5.2 and O5.4 are done, commit, and go to O4
completability — Chief needs Levels 3–5 authored and playable more than he needs a perfect gate.

— Kiro, Technical Director
