# KIRO ORDER — ORCHA 17

**From:** Kiro, Technical Director
**Chief:** *"miniature_supercharged_electrical_capacitor_core_a in my downloads is the new pip UI someone needs to own it and use it there should be a charged sprite that needs to pulse"*
**Owner:** you. The pip meter is HUD, drawn in `src_scroll/**` — your lane, not Aki's.
**Priority: LAST.** Queue it behind the chest, the Level 2 fork, drone + Level 3, and Levels 4–5. It is polish on a mechanic that already works, and Chief's playable content outranks it.

---

## 1. Art is installed and measured. Read the contract, do not re-derive.

`assets/objects/pip/` with `GEOMETRY.md` beside it, same pattern as the gate and chest packs.

## 2. Two findings that will bite you if you skip the doc

**`uncharged.png` is a CONTACT SHEET, not a sprite.** 344x192 with the artwork only in the top-left
corner — 262px of dead space to the right, 131px below. Drawing it puts a small sprite in the corner of a
mostly-empty rectangle.

**`element.png` is the real uncharged sprite** — identical opaque count (2677) and identical mean RGB
`[61,79,81]` to that corner, cropped to a usable 65x65. Use `element.png` for the empty state and never
draw `uncharged.png`.

**The two states are different sizes:**
```
element.png (empty)  : canvas 65x65   content 57 x 57   bottom pad 4
charged.png (banked) : canvas 83x83   content 57 x 70   bottom pad 13, TOP pad 0
```
Same content width, but charged is **13px taller** and touches the top of its canvas — it has a glow
extending upward. **Centring by canvas makes the pip jump 13px the moment it charges.** Identical trap to
`switch_off` being the only file in its pack with `botPad 4`, which gave you the 1px settle twitch.

**Anchor from the content bottom.** The pip's base stays fixed and the glow grows upward, which is what
charging should look like.

## 3. The pulse is procedural — there are no frames
Static sprites only. Oscillate **alpha and/or scale** on `charged.png`. Precedent: the one-way platform at
`render.js:43-57` draws procedurally with no PNG.

**Do not fake the pulse by alternating `charged.png` and `element.png`.** Those are two different *states*
— banked versus empty. Alternating them reads as a pip blinking in and out of existence, not as one
charged pip breathing.

Put the pulse period and amplitude in a **single named dial**, as you did for `DroneEnemy.CFG` and
`GATE_DRAW_W`. Chief will tune the feel and I want one place to change.

## 4. Scope
- Replace the current pip rendering in the HUD with these sprites.
- **One slot per pip up to `MAX_BANKED_PIPS` (5).** Empty slots draw `element.png`, banked slots draw
  `charged.png` pulsing.
- **HUD is screen-space** — this belongs in `drawHUD`, *not* `drawWorldPrompts`. `drawHUD` runs after
  `ctx.restore()`, which is exactly right for a fixed meter. Do not put it inside the camera transform;
  ruling §6.7 is about *world-anchored* prompts and does not apply here.
- **Do not touch the energy authority.** This is rendering only. `bankedPips` stays owned by
  `player.js` and the four entry points, plus the reserve-direct one from
  `CHIEF_RULING_CHEST_PIP_RESERVE.md`.

## 5. Verification
- Assert **content-bottom alignment**: the base Y of a banked pip equals the base Y of an empty slot.
  Mutation-test it by centring on canvas instead and confirming the assertion fires — that is the 13px
  jump and it is the one defect here that geometry can catch.
- Assert slot count tracks `bankedPips` and never exceeds `MAX_BANKED_PIPS`.
- Suites green, boot smoke fresh port.
- **State plainly that the pulse rate and whether it reads well are Chief's to judge.** You cannot verify
  feel and should not claim to.

## 6. One thing worth knowing
Colour genuinely works as the state signal here — mean RGB distance **82 of 441** between the two states,
grey-teal versus bright teal. That is the exception rather than the rule: `fence_dead` measured *brighter*
than the live fence, and `switch_destroyed` was the *greenest* sprite in its pack. State still comes from
the state machine; this is just a note that the art happens to support the read.

— Kiro, Technical Director
