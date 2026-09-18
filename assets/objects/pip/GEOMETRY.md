# pip/ sprite geometry — MEASURED, do not re-derive

Chief's capacitor-core art, installed as the pip (banked-charge) UI.
Source: `miniature_supercharged_electrical_capacitor_core_a.zip`.

| File | Canvas | Content box | Padding L/R/T/B | opaque | mean RGB |
|---|---|---|---|---|---|
| `uncharged.png` | **344x192** | 25..81 x 4..60 | 25 / **262** / 4 / **131** | 2677 | `[61,79,81]` |
| `charged.png` | 83x83 | 13..69 x **0..69** | 13 / 13 / **0** / 13 | 2684 | `[73,141,134]` |
| `element.png` | 65x65 | 4..60 x 4..60 | 4 / 4 / 4 / 4 | 2677 | `[61,79,81]` |

---

## 1. DO NOT USE `uncharged.png` — it is a contact sheet, not a sprite

344x192 with **262px of empty space to the right and 131px below.** The artwork sits in the top-left
corner only. Drawing this file draws a tiny sprite in the corner of a mostly-empty rectangle.

**`element.png` IS the uncharged sprite.** Identical `opaque` count (2677) and identical mean RGB
`[61,79,81]` to the content inside `uncharged.png`, cropped to a usable 65x65. Use `element.png` for the
empty state.

`uncharged.png` is kept only as the source of record. **Never draw it.**

## 2. The two states are DIFFERENT SIZES — anchor from content, not canvas

```
element.png (uncharged) : canvas 65x65   content 57 x 57   bottom pad 4
charged.png             : canvas 83x83   content 57 x 70   bottom pad 13, TOP pad 0
```

Same content **width** (57) but the charged sprite is **13px taller** and touches the very top of its
canvas (`top pad 0`) — it has a glow or arc extending upward.

**Consequence:** centring by canvas, or aligning by top edge, makes the pip **jump 13px the instant it
charges.** This is the identical trap as `switch_off` being the only file in its pack with `botPad 4`,
which produced a 1px twitch at settle.

**Anchor from the content bottom.** The pip's base stays fixed and the charge glow grows upward, which is
what "charged" should look like.

## 3. States are clearly distinct — colour is safe to trust HERE
Mean RGB distance **82 of 441** — `[61,79,81]` grey-teal versus `[73,141,134]` bright teal. Readable.

Worth noting because it is the **exception**: `fence_dead` measured *brighter* than the live fence frames,
and `switch_destroyed` was the *greenest* sprite in its pack. Colour has been an unreliable state signal
twice in this project. It happens to work here — but state still comes from the state machine, never from
sampling pixels.

## 4. There are NO animation frames. The pulse is procedural.
Static sprites only. Chief: *"there should be a charged sprite that needs to pulse."*

So oscillate **alpha and/or scale** on `charged.png` over time. Precedent exists — the one-way platform at
`render.js:43-57` is drawn entirely procedurally with no PNG.

**Do NOT fake a pulse by alternating `charged.png` and `element.png`.** Those are two different **states**
(banked versus empty). Flickering between them reads as a pip appearing and vanishing, not as one charged
pip breathing.

## 5. State mapping
- `element.png` — an **empty** pip slot. Static.
- `charged.png` — a **banked** pip. **This one pulses.**
- `uncharged.png` — source of record only. Never drawn.
