# KIRO ORDER — AKI 06

**From:** Kiro, Technical Director
**To:** Aki
**Source:** Chief's playtest / authoring session — *"i dont see the wall switch or fence in the builder either, should have the electrical filter too"*
**Priority:** This is a playtest-surfaced Builder defect, which is exactly what standby was for. It blocks Chief authoring the fence puzzle into new levels.

---

## First: part of this is my fault, not yours

When I gated your A4 I moved **six** entries out of the palette array into
`_runtime_state_sprites[]` — `wall_switch_off`, `wall_switch_on`, `wall_switch_destroyed`,
`wall_switch_burn_anim`, `fence_dead`, `fence_live_anim`.

The rule I was applying was right: *"Chief must never be able to place a dead fence."*
**My application of it was too broad.** I swept out `wall_switch_off/on` and `fence_live_anim`,
which represent the **device**, alongside the genuinely unplaceable end-states. Net effect: the
electrical category dropped from 8 entries to 2, and the wall switch and fence vanished from the
Builder entirely.

The distinction I should have drawn, and which now governs:

| Kind | In palette? | Examples |
|---|---|---|
| **Placeable device** | **YES — exactly one entry each** | Gate, Wall Switch, Electric Fence, Source, Crate |
| **Runtime state / animation** | **NO** | `switch_destroyed`, `fence_dead`, `wall_switch_burn_anim`, `gate_electric_dead` |

One entry per device, mirroring the existing ONE-gate-entry rule. A dead fence still must never be
placeable.

---

## A7.1 — Add the two devices back to the palette

Restore **one** entry each, `category: "electrical"`, so the electrical filter shows them:

- **Wall Switch** — art `switch_off.png` (the unpowered state is the right palette thumbnail:
  it reads as "not yet activated", which is what a freshly placed switch is)
- **Electric Fence** — art `frame_001.png` (the live loop's first real frame; **not**
  `fence_dead.png`, which would advertise a broken fence, and **not** `frame_000.png`, which is
  the rest pose)

Leave the four true state sprites in `_runtime_state_sprites[]`. Do not move them back.

Remember all three manifests must agree — `ASSET_MANIFEST.json`, `PURPLE_CITY_INDEX.json`,
`asset_index.json`. The disk-index is merged as a fallback, so a half-pruned set behaves
unpredictably.

---

## A7.2 — Add spawn buttons, because the style field is undiscoverable

This is the deeper problem. Right now, to place a wall switch Chief must:

1. click `+ Switch`, 2. select it, 3. know a `style` field exists, 4. set it to `"wall"`.

Nothing in the UI tells him step 3. Same for the fence: `+ Gate`, then `style: "fence"` plus
`blockOnly`. **A mechanic he can only reach by knowing an inspector field is effectively missing.**
That is the concrete form of the gap Orcha flagged — six systems built, none reachable in content.

Add to SPAWN OBJECTS, alongside the existing nine buttons:

- **`+ Wall Switch`** — spawns a switch with `style: "wall"` preset
- **`+ Fence`** — spawns a gate with `style: "fence"` and `blockOnly: true` preset

Match the existing pattern exactly: the buttons live in `editor.html` and wire through the
`['spawn-<id>', '<kind>']` table in `editor/main.js`. Keep `+ Switch` and `+ Gate` as they are —
plain versions stay available.

**Defaults matter.** A fence spawned with the wrong dimensions will not tile correctly. Level 2's
working barrier is `w:32, h:128` with `required:1, blockOnly:true`, and the fence art is 64×64
tiled over the hitbox — so 32×128 tiles it exactly 2× vertically. Use that as the default and
say so in your report.

The wall switch's real hitbox is 22×22 with 56×56 art. Do not change the hitbox.

---

## A7.3 — Confirm they actually RENDER once placed

Your A2 added the Builder draw branches and I gated them, so the code is there. But Chief says he
does not see them, and I want that closed properly rather than assumed.

Verify by observation, in the Builder, not by reading the code:
1. Place a wall switch via the new button → the `switch_off.png`/`switch_on.png` art draws, not the
   old schematic box.
2. Place a fence → the tiled fence art draws over the hitbox.
3. Open **Level 2** — `SW1` and `BARRIER` already carry `style:"wall"` / `style:"fence"` on the live
   line, so they must render as the real art today. If they do not, that is a live bug in A2 and I
   need to know.

If A2's branches only fire under a condition Chief's levels do not meet, say so plainly. A branch
that never executes is the same defect class as a vacuous assertion.

---

## Verification

```
node _dev/parity_regression.mjs      # 350/0
node _dev/fence_switch.mjs           #  62/0
node _dev/energy_authority.mjs       #  88/0
node _dev/crate_timed.mjs            #  87/0
node _dev/test_electricity.mjs       #  37/0
node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo> <FRESH-PORT>
```

**624 / 0 floor. Boot smoke mandatory** — your lane is barely covered by the suites, and a parse
error once killed the entire Builder while they read 322/0.

Additionally:
- **Prove the palette count changed** — electrical should go 2 → 4. State the number you observed.
- **Prove a dead fence is still NOT placeable.** That was the point of the original A4 rule and it
  must survive this change. I will check it independently.
- Spawn each new button and confirm the object lands with the correct `style` and dimensions.

---

## Context you should have

- **Chief's Level 1 playtest passed** — *"everything works as it should."* Your A6 divergence
  banner and save warnings were in use for that session and held.
- **The gate art was re-cut by Chief** and I installed it at `assets/objects/gate/` with measured
  geometry in `assets/objects/gate/GEOMETRY.md`. **Orcha is wiring the runtime side.** Once that
  lands, the Builder's gate rendering may need to match the new content bounds (94×105 inside a
  128×128 canvas, 13px bottom padding) — **wait for his change to be gated, then I will tell you
  if the Builder diverges.** Do not pre-empt it.
- **Tile IDs 14 and 15 were removed** (`env_rt_tile_dark_a/b`) — near-identical near-black fills.
  Palette is 12 tiles. Do not re-add them; IDs 16–23 keep their numbers.

## Protocol
- Push to `agent/aki-editor`, report in `AKI_STATUS.md` at the repo root, same commit.
- `editor/**` and `assets/**` only.
- **No GO needed.** This order is your authorisation — do not ask me or Chief to confirm it.

— Kiro, Technical Director


---
---

# ADDENDUM — Level 2 playtest findings

**Chief's verdict: *"other than that level 2 works."*** The fence puzzle you and Orcha built is
playable. That is the first time a mechanic of this project has been confirmed working by a human.

Three findings came out of that session. **Two I have already fixed in level data** (committed at
`94baad7`) — they are listed so you understand what changed and do not re-fix them. **One is yours.**

## FIXED BY ME — fence was rendering as two stacked units

`rows = Math.ceil(g.h / FENCE_CANVAS)` = `ceil(128 / 64)` = **2**, so a 128-tall barrier tiled the
64×64 art twice. Because the fence art has distinct top and bottom caps, tiling can never read as
one continuous fence — it reads as two fences stacked.

Fixed in level data rather than code: `BARRIER` is now `y=224, h=64` (bottom edge unchanged at 288),
so it tiles exactly **1×**. Gameplay is unaffected — `blocksHorizontal()` deliberately ignores Y, so
a `blockOnly` barrier's hitbox height is purely visual.

**Your tiling code is not wrong and should not change.** It correctly mirrors the PowerGate
convention, and it is right for a genuinely tall barrier. Keep it.

**Design limitation now on the record:** the fence art is **not seamlessly tileable** — it has caps,
so any hitbox taller than 64 will always look like stacked units. If Chief later wants a
floor-to-ceiling fence, that needs either seamless art or a capped-top/tiled-middle/capped-bottom
scheme. That is an art decision for Chief, not something either of us should invent.

## FIXED BY ME — label read "FENCE · BARRIER"

Your renderer already prints just `FENCE` when the label *is* `"FENCE"`, so this was level data, not
a code defect. Renamed the label `BARRIER` → `FENCE`. The gate **id** stays `BARRIER` because
`SW1.linkedId` points at it — verified intact after the change.

Nothing for you here. Your conditional was written correctly.

## A7.4 — YOURS: the switch has a dark line through it

Chief: *"switch has a wierd line going through it."* His screenshot is **the Builder**, so this is
`editor/renderer.js`, not the runtime.

It is almost certainly the **charge fill bar drawn across the sprite**. Your A1 report says
*"Charge bar rendered at 0% fill"* — at 0% the fill is invisible but the bar's dark background is
not, and it appears to be landing over the switch art rather than clear of it.

For reference, the runtime puts it **above** the sprite: `sbY = dY - 8` where
`dY = (y + h) - WALL_SW_CANVAS`. If the Builder derives its bar position from the 22×22 **hitbox**
instead of the 56×56 **sprite**, it will land in the middle of the artwork — the identical mistake
that put `[SPACE] CHARGE` across the gate in the runtime.

### Required
- Position the bar clear of the **sprite's drawn bounds**, not the hitbox. Match the runtime's
  placement so the Builder and the game agree.
- **Do not draw the dark background at 0% fill.** There is precedent: an unconditional background
  on the gate previously read as a stray purple tile and was removed for exactly this reason. Draw
  the background only when there is fill to show, or when the object is selected.
- Keep the bar itself — Chief approved it as the progress feedback. This is placement only.

### Verification
- **Screenshot the Builder** with a wall switch placed and confirm no line crosses the art.
- Confirm the bar still appears once charge is present.
- Confirm the Builder and runtime place it in the same spot — divergence here is what makes Chief
  author blind.

## Priority for this order
1. **A7.4** — the switch line. Chief is looking at it right now.
2. **A7.2** — `+ Wall Switch` and `+ Fence` spawn buttons. He cannot place these devices at all.
3. **A7.1** — palette entries so the electrical filter shows them.
4. **A7.3** — confirm they render once placed.

Note that A7.2's fence default should now be **`w:32, h:64`** with `blockOnly:true`, matching the
corrected Level 2 barrier — one fence unit, not two.

— Kiro, Technical Director
