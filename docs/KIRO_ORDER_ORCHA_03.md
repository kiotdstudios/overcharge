# KIRO ORDER — ORCHA 03

**From:** Kiro, Technical Director
**To:** Orcha
**Source:** Chief's Level 1 playtest — the first human run of this game since the economy, grounding, art and tileset changes.
**Priority:** **This order comes BEFORE O4 (completability).** Playtest findings from Chief outrank anything I inferred.

---

## Status from Chief

**Level 1 passes.** *"ive tested lvl 1 everything works as it should."* He is on Level 2 now.

Four visual defects came out of that run. All four are in your lane (`src_scroll/**`). All four
are measured below — do not re-derive them, and do not eyeball them.

---

## O5.1 — The gate JITTERS 13px vertically. It is not simply floating.

Chief called it *"kinda floating"*. I measured every frame of the sheet and it is worse than that.

Bottom padding (transparent rows below the artwork) per frame, in the cropped 64×128 slice the
runtime actually draws:

```
row 0  DORMANT :   0   --  --  --  --  --  --  --  --
row 1  IDLE    :   0   12  12  13  13   0  13  13  13     <-- note frame 5
row 2  CHARGING:   0   13  13  13  13  13  13  13  13
gate_electric_dead.png : 12
gate_closed.png        :  0
```

The hitbox is **flush with the ground — I verified gap = 0 on all three levels**, so placement is
correct and this is purely the sprite. `dY = (this.y + this.h) - spriteH` bottom-aligns the
*canvas*, and the canvas has inconsistent padding, so the gate rises 13px whenever an animated
frame is on screen.

**The IDLE loop is the giveaway.** It runs `0 → 12 → 12 → 13 → 13 → 0 → 13 → 13 → 13`. Frame 5
snapping back to flush mid-loop means this is **not a designed lift** — a deliberate animation
would not pop back for one frame and then leave again. It is inconsistent art, and on screen it
reads as a gate that hovers and twitches.

### Ruling — and note it is a deliberate exception, so read it carefully
**Normalise the gate's vertical baseline per frame.** Compute each frame's lowest opaque row once
at load, cache it, and offset the draw so the artwork's bottom — not the canvas bottom — lands on
`this.y + this.h`.

This is an **exception to standing ruling §6.2** ("anchor from the uniform canvas, never a
per-frame bbox"), and the exception is narrow:

- §6.2 exists because per-frame anchoring would flatten the **wall switch's 2px horizontal
  widening**, which *is* the designed vibration. That reasoning stands and is unchanged.
- The gate's variance is **13px, vertical, and erratic** (`0,12,12,13,13,0,13,13,13`). Erratic is
  the signature of a defect, not intent.

**Test for future cases:** if the per-frame variance is *consistent and directional*, it is
animation — preserve it. If it is *erratic*, it is misalignment — normalise it.

Do not apply this to the switch or the fence. Gate only. If normalising makes any gate state look
wrong, stop and report rather than widening the exception.

---

## O5.2 — Prompt and label text is drawn ON TOP of the artwork

From Chief: *"text in general need to change its sitting on top of the art asset same for
generator."* His screenshot shows `[SPACE] CHARGE` printed straight across the middle of the gate
sprite, and the same over the generator.

This is a legibility defect in the most important moment of the game — the instant the player is
told what button to press.

### Required
Adopt **one rule for every world-space label**, and apply it to the gate, the generator/source,
the switch, the checkpoint, and the crate:

> A label must never overlap the drawn sprite. Place it clear of the sprite's **drawn bounds**
> (the same normalised content bounds from O5.1), not clear of the hitbox.

Anchoring to the hitbox is what caused this: the sprite is 64×128 while the gate hitbox is 32×64,
so "just above the hitbox" lands in the middle of the art.

Applies to at least:
- `[SPACE] CHARGE` and every other input prompt
- `LIVE` / `SHORTED` / `LOCKED` state text
- `OPEN` / `EXIT` and other identity labels
- the source's own labels

Keep them inside the camera transform — `drawHUD` runs after `ctx.restore()`, so world
coordinates there are offset by exactly `camX` (standing ruling §6.7). Use `drawWorldPrompts`.

**Stacking:** where several labels apply to one object (Chief's shot shows `LIVE` above `OPEN`),
stack them in a defined order with fixed spacing so they never collide with each other either.

---

## O5.3 — Move the gate charge bar ABOVE the gate

Chief: *"the bar at the bottom the charge one put it above the gate."*

Currently `electricity.js` draws it at `barY = this.y + this.h + 4` — **4px below the hitbox
bottom, which is 4px below the ground surface.** I confirmed the numbers: on Level 1 the surface is
at y=320 and the bar renders at y=324–330, so it is drawn onto the floor. The `EXIT` label at
y=341 lands further into the ground.

Move both above the gate, clear of the normalised sprite top, and keep them gate-relative so they
follow the gate wherever it is placed. Same treatment for the `EXIT` label.

Preserve the existing behaviour that the bar's dark background only draws while charging — an
unconditional background previously read as a stray purple tile, and that fix should not regress.

---

## O5.4 — A fully shorted switch must read as POWERED OFF

Chief: *"once switch is completely shorted it should look like the powered off sprite."*

He is right, and the measurements explain why it currently does not:

| Sprite | mean RGB | reads as |
|---|---|---|
| `switch_off.png` | `[101,108,113]` | grey-blue — **powered off** |
| `switch_on.png` | `[97,116,107]` | green-tinted — live |
| `switch_destroyed.png` | `[90,108,87]` | **greenest of the three** — still live |

The settled end state is currently the *greenest* sprite in the set, so a dead switch looks
energised. That is the same trap as the fence, where `fence_dead` measured **brighter** than the
live frames: **colour is not a reliable state signal, so state must come from the state machine
and the chosen art must match the fiction.**

### Required
Once the burn completes and the destroy state latches, render **`switch_off.png`**.

Two details, both measured:
- **`topPad` differs** — `switch_off` has 6 rows of padding, `switch_destroyed` has 1. Swapping
  naively shifts the switch ~5px. Anchor from the **content bounds** so it does not jump at the
  moment of settling.
- **Do not change the state machine.** `_destroyT`, the `burnDone` latch and the single switch
  authority stay exactly as they are. This is a render-only art swap, same discipline as your
  original `style:"wall"` work.
- Keep `switch_destroyed.png` in the repo. If Chief later wants a scorched look it is the asset to
  reach for, and it is still referenced in the manifest documentation.

---

## Verification

```
node _dev/parity_regression.mjs      # 350/0 (14/15 tile removal dropped it from 362)
node _dev/fence_switch.mjs           #  62/0
node _dev/energy_authority.mjs       #  88/0
node _dev/crate_timed.mjs            #  87/0
node _dev/test_electricity.mjs       #  37/0
node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo> <FRESH-PORT>
```

**624 / 0 is the floor.** Fresh port every run.

This order is **visual**, and that is exactly where headless suites are weakest. Your own Q5 point
applies directly: rendered pixels are the thing you cannot verify by simulation. So:

- **Add assertions where you can**: that no label's box intersects the sprite's drawn bounds; that
  the bar's Y is above the sprite top; that every gate frame's normalised baseline lands on
  `y + h`; that the settled switch resolves to `switch_off.png`. Geometry is testable even when
  appearance is not.
- **Mutation-test them.** Put a label back over the sprite and confirm the assertion fires.
- **State plainly what you could not verify.** "Geometry asserted; appearance needs Chief's eye" is
  the honest report, and it is the one I want.
- Your `?dev=1` testbeds now matter — use them to see the switch settle rather than simulating it.

---

## After this

Then **O4** (completability proof) from `KIRO_ORDER_SHIP_3DAY.md`. Still valuable, still yours, but
Chief playing the game outranks it.

**O2 (grounded zone) remains deferred.** Level 6 is out of scope.

## Protocol
- Push to `agent/orcha-dev`. You are behind live — sync first.
- Report in `ORCHA_STATUS.md`, same commit as the work.
- Runtime only: `src_scroll/**` and `_dev/**`. If the Builder visibly diverges from the new gate
  baseline, **report it and I will order Aki** — do not edit `editor/**` yourself.
- Push your check-in poller and declare the scheduled task, as already ruled. You do not need to
  ask again.

— Kiro, Technical Director
