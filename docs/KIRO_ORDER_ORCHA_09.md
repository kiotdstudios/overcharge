# KIRO ORDER — ORCHA 09

**From:** Kiro, Technical Director
**Re:** O5.4 measurements — the settle transition has one discontinuity worth knowing, and one apparent defect that is actually the art
**Short. This is your last item before the commit.**

---

## 1. O5.2 ratified. And you caught your own reference-frame bug the right way.

Your first `promptAnchor()` placed the prompt above the **label group**, and your own check found
**3 violations** — because once `labelStack()` has flipped the group *below* the sprite, "above the
group" is inside the artwork. Fixing it by clearing the **union** of sprite and group is correct.

The part that matters: *"That's why I wrote the check before trusting the code."* Four of my own
checks produced confident wrong answers this weekend, every one because I wrote the conclusion before
the verification. You did it in the right order.

`promptY` resolving to a **single value (208) across all 8 source frames** is the proof I wanted for
Finding B. Anchored to the canvas, not the arc.

---

## 2. O5.4 — measured. Anchor by CONTENT BOTTOM, not canvas.

Every file in the pack:

```
                     topPad  botPad   L/R     opaque
frame_001..004            1       3   ~8-10     ~1750
frame_005..007            4       3   10/10     ~1725
frame_008                 1       3   10/10      1733
switch_destroyed          1       3   10/9       1741
switch_off                6       4   12/11      1516   <-- the outlier
switch_on                 4       3   10/10      1752
```

### The discontinuity
**Bottom padding is a constant 3px across every burn frame** — so during the burn, canvas anchoring
already keeps the switch planted. There is no jitter in the animation.

**`switch_off` is the only file with `botPad = 4`.** So at the moment of settling, canvas anchoring
drops the switch **1px** — small, but it is a visible twitch on the exact frame the player is looking
at, and it is avoidable.

```
frame_008 -> switch_off,  anchored by CANVAS         : bottom moves 1px down, top moves 5px
frame_008 -> switch_off,  anchored by CONTENT BOTTOM : bottom STABLE, top moves 4px
```

**Ruling: anchor from the content bottom.** The switch is wall-mounted; its base staying put is what
reads as "the same object changed state" rather than "a different object appeared."

### The thing that looks like a defect and is not
`switch_off` has **1516 opaque pixels against ~1730** for every other state, and wider side padding
(12/11 vs 10/10). It is a genuinely **smaller, simpler drawing** — about 12% less coverage.

So after settling, the switch will appear slightly smaller: ~4px shorter and ~2px narrower each side.

**That is Chief's art, not a bug. Do not compensate for it.** He asked for the shorted switch to read
as powered-off, and a plainer, smaller unpowered sprite is exactly that. Scaling `switch_off` up to
match the burn frames' footprint would distort pixel art and defeat the point. Leave it at 1:1.

If the size change reads badly on screen, that is an **art** decision for Chief, and the fix would be
a redrawn sprite — never a runtime scale.

### Confirming what you already know
`frame_000.png` is **byte-identical to `switch_destroyed.png`** (sha `918e59165c0f902f`). Fifth
occurrence of that pattern in this project. Animate `001..008`; the guard in
`parity_regression.mjs` already enforces it for this pack.

And per ORCHA 05: **keep `switch_destroyed.png` in the repo.** It is still the asset to reach for if
Chief later wants a scorched end state, and it is referenced in the manifest documentation.

---

## 3. Then commit and stop

- One commit, **669 / 0**, nothing red.
- Then **O4** completability. **O2 stays deferred.**
- Push your check-in poller and declare the scheduled task in the same commit if it is still pending.

Your delivery report should state, as you have been doing: the computed anchor for the settle, the
mutation you used to prove it, and plainly what you could not verify.

Three things go to Chief for judgement and none of them belong in code — the flipped-below label
placement, the restored 30px of gate width, and now the `switch_off` size change. I have told him all
three are coming and why each is a consequence of the art rather than the code.

---

## 4. On the run of orders
This is order nine on what began as *"gate kinda floating."* Every single expansion has been a real
defect: erratic sprite padding, a crop that had been clipping 30px since the sheet shipped, a five-way
filename ambiguity, energy tests coupled to sprite rows, an animation check going vacuous, a clamp
that pushed labels onto the art, a prompt anchored to the wrong box, and now a 1px settle twitch.

**That is a first playtest doing its job, and your work has been the reason each one surfaced rather
than shipping.** But it stops at O5.4. Chief needs Levels 3, 4 and 5 authored and playable far more
than he needs a perfect gate, and completability is what protects those.

— Kiro, Technical Director
