# KIRO ORDER — ORCHA 08

**From:** Kiro, Technical Director
**Re:** two measured facts you need for O5.2, which covers the generator as well as the gate
**Not new scope.** O5.2 was already yours; this is the generator's geometry so you do not have to derive it.

---

## 1. Your ORCHA 07 delivery is ratified. 669/0 accepted.

`labelStack()` owning all label geometry with the flip-below rule, mutation-verified at **exactly the
positions I predicted** (9 violations at `y=0`, `h=64`, zero after revert) — that is the standard.

The detail I want to single out is the **second** assertion: proving the flip path is actually
exercised (`flips=3`). A sweep of 126 rects that never enters the interesting branch would pass
forever while testing nothing. You guarded the guard against going vacuous. That is the third time
this weekend that instinct has caught something real, and it is now the thing I trust most in your work.

### You were right to reject your own basename guard
Your first guard was a source-text scan for `/^frame_/`, it failed on your own suite, and **you
correctly diagnosed the failure as a false positive** — lines 86–157 check frame *index* inside a
single known pack, where only that object's art can appear. Frame number is not pack identity.

You then narrowed the guard to the actual hazard: `PowerGate` is the only object that can draw from
two packs (gate art normally, fence art under `style:"fence"`), which is precisely where the bug lived.
Proving 34 collisions exist *and* that every PowerGate art path is pack-qualified is a better guard
than the one I asked for.

Leaving the rejected approach documented with its reason is exactly right. A rejected design with no
recorded reason gets reinstated by the next person.

**Ruling: your narrowing stands. Do not broaden it back.** The general "no basename anywhere" guard I
ordered in ORCHA 05 §2 is **superseded** by your scoped version — I was ordering a guard against a
class when only one member of that class can actually be ambiguous.

---

## 2. Generator geometry — measured, so you do not re-derive it

Chief's report was *"text in general need to change its sitting on top of the art asset **same for
generator**."* The source draws a 64×64 sprite over a **28×28 hitbox**, so it has the same
sprite-larger-than-hitbox mismatch the gate had.

```
runtime: dX = cx - 32,  dY = (y + h) - 62,  drawn 64x64,  hitbox 28x28
```

### Finding A — the bottom is fine. Do not "fix" it.
Bottom padding is **1px on all 9 frames**, uniform. With `dY = (y + h) - 62`, the last content row
lands at `dY + 62 = y + h` — **exactly flush with the hitbox bottom.** The `-62` is deliberate,
correct compensation. Leave it alone.

**Correction to my own work:** my first pass reported this as a 1px float. That was an off-by-one in
my script — I used `dY + 64` as the canvas bottom instead of `dY + 63`. Wrong, and I nearly handed you
a phantom defect. **Fourth false positive of mine this weekend**, all the same shape: a narrow check
producing a confident wrong conclusion. If my ad-hoc arithmetic ever disagrees with the suite, the
suite wins.

### Finding B — the generator's content TOP varies 6px across the animation
This is the one that matters for O5.2:

```
frame:    000  001  002  003  004  005  006  007  008
topPad:     7    7    6    3    2    1    4    5    7
botPad:     1    1    1    1    1    1    1    1    1
```

The electricity arcs upward, so the artwork's top edge moves between rows 1 and 7 while the bottom
stays fixed. **This is real animation, not misalignment** — it is consistent and directional, which is
the test I gave you for the gate, and here it passes as intent.

**Consequence:** if you anchor `[SPACE] CHARGE` to the generator's *per-frame content top*, the prompt
will **bounce 6px at 8fps**. Chief would report that as new jitter, and it would be caused by fixing
the overlap.

**Ruling: anchor labels for the source to a STABLE reference** — the sprite canvas top (`dY`), or the
minimum `topPad` across the pack treated as a constant. Never the live per-frame content top. This is
standing ruling §6.2 in its original form: uniform canvas, not per-frame bbox. The gate needed a
constant offset because its padding was uniform; the generator needs one because its padding is *not*.

### Finding C — `frame_000` IS a real frame here
For the generator, `frame_000.png` is **byte-unique**, not a duplicate of any sibling. So the source
legitimately animates `000..008`.

**Do not apply the fence/switch/gate rule here.** Those packs had `frame_000` byte-identical to their
rest pose; this one does not. Skipping it would drop a real frame. Verify per-pack by hash rather than
assuming the convention — the convention exists because three packs share a quirk, not because it is
universal.

---

## 3. Remaining, and then stop
- **O5.2** labels clear the drawn sprite for **gate and generator**, with the flip-below rule from
  ORCHA 07 and the stable-anchor rule from Finding B. The prompt lives in `drawWorldPrompts` — correct,
  and it must stay inside the camera transform (§6.7); `drawHUD` runs after `ctx.restore()`, where
  world coordinates are offset by exactly `camX`.
- **O5.4** shorted switch renders `switch_off.png`, anchored from content bounds so it does not jump
  ~5px at the moment it settles (`switch_off` has topPad 6, `switch_destroyed` has 1).
- One commit, nothing red, **669 / 0** is now the floor.
- Then **O4** completability. **O2 stays deferred.**

Both things you said you cannot verify — whether the flipped-below case looks acceptable, and whether
the restored 30px width reads well — are correctly Chief's to judge, and I have told him both are
coming. Do not attempt to settle them in code.

— Kiro, Technical Director
