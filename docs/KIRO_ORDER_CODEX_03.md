# KIRO ORDER: CODEX 03 (redo four pieces of art, then two small engine links)

**From:** Kiro, Technical Director | **To:** Codex | **Authority:** Chief's review of 2026-10-16
**Priority:** this order comes **before** `KIRO_ORDER_CODEX_02.md`. Chief is waiting to see the art in the game.
**Branch:** your own branch, push as `AGENTS.md` describes. Never force-push. Do not merge to the live line.
**Status:** work order, nothing started.

## Why this is yours
Chief reviewed the art that Aki and Kiro made and failed four pieces. His words are quoted below. He thinks you
may do better on art than Aki did, so these four are yours. **Aki keeps the Builder and Level 1 construction.**
Orcha and Aki both had trouble with PixelLab output, so the checks below are mandatory and strict.

## What Chief said (2026-10-16)
| Piece | Chief's verdict |
|---|---|
| Apartment building | "very blue, no real resemblance to Night City props" |
| Window NPC, complaining | "looks like she is sucking on her finger or breathing on her hand, not fanning herself because she's hot" |
| Window NPC, relieved | "when the AC is fixed it also doesn't look like she is happy; her animation needs to change completely" |
| Pip pickup (dropped pip) | "looks like a blob" |
| Capacitor Module | "not bad, but I want it to look exactly like number 3" on his concept sheet |
| Relay pylon | "decent". Kiro has already placed it in Level 1. Do not redo it. |

## Reference material
- **Capacitor Module concept sheet:** Chief supplies the file at `docs/reference/capacity_upgrade_concept_sheet.png`.
  **If it is not there when you start, stop that task and ask Chief for it.** (Kiro cannot copy a chat attachment
  into the repo.) What the sheet shows, as Kiro reads it, is under task 4.
- Existing Night City building art: `assets/objects/night-city-buildings/` (families `abandoned_apartment`,
  `apartment_complex`, `convenience_store`, `garrys_electronics`, `gatehouse`, `library`, `tire_shop`, `warehouse`).
- Existing prop palette art: `assets/objects/night-city-props/`.
- Aki's rejected drafts, to see what NOT to repeat: branch `agent/aki-order26`, folders
  `assets/objects/night-city-buildings/apartment_hint/`, `assets/sprites/npc-window-woman/`, `assets/objects/pip-pickup/`.
- Kiro's rejected Capacitor Module: `assets/objects/capacity-upgrade/`.
- The HUD pip icon, which the dropped pip must match in design: `assets/objects/pip/charged.png`.

## Mandatory art checks (every piece, before you show it)
1. Correct size, listed per task. 2. Fully transparent border (tiles and full-bleed facades excepted, say so).
3. No semi-transparent pixels unless the existing art in that folder has them. 4. A contact sheet of every frame at
4x or more, on a dark and a light ground. 5. **Look at it as Chief will:** at 1x and 3x inside a real screenshot of the
game, next to the hero. 6. Stop after **two** weak tries on one piece and report what failed; do not ship weak art.
7. Do **not** register anything in `ASSET_MANIFEST.json` or place it in a level until Chief approves it. Put review
files in the asset folder and write a one-page review note.
Aki's `_dev/aki26_part2_art_audit.py` (on her branch) is a working example of an automated border/palette check.

## Art tasks

### 1. Window NPC: two animations, both new (176 x 176, 6 frames each, transparent)
She leans on the sill of an open apartment window. Same character and outfit as Aki's draft (dark tank top, hair up)
is fine; the **poses are what failed.**
- **Complaining (loops):** she is **too hot.** Read it from across the street: **one hand fans her face fast and flat**
  (or a folded paper fan), her head tilts back a little, eyes squeezed or squinting, mouth open and panting or
  grimacing, a **sweat drop** or two, a shirt tug at the collar in some frames. The fanning hand must move **in front
  of the face as a sweeping arc**, not touch the mouth or fingers. If you can read "she is eating her finger", it
  failed.
- **Relieved (plays once, then holds the last frame):** the AC has just come on. **Clearly happy:** eyes close, a
  big breath out, **a real smile**, shoulders drop, one hand to the chest ("thank God"), then a relaxed lean on
  the sill. Hair or collar lifts as if in a cool breeze. If you can read "tired" or "neutral", it failed.
- Her lines (for context only): before, "It's an oven in here"; after, "Oh, thank God. It's back on."

### 2. Apartment building: four panels in the Night City prop family
Same sizes as Aki's draft (left 192 x 256, wall bay 160 x 256, front bay with one window 160 x 256, right 128 x 256) so
they can replace it.
- **Kiro measured the real situation,** because "very blue" is not the whole answer. Share of blue-dominant pixels:
  existing families run from 43% (`abandoned_apartment`) to 86% (`garrys_electronics`), with `filler_wall` at 80%.
  **Aki's draft is 95%, bluer than every existing family,** and it is flat. What makes the real families read as
  Night City is **texture and accents**: brick and panel detail, **lit windows with warm amber or pink light,
  purple and teal neon accents, signage, pipes, stains and trim.** So: **target 50% to 80% blue-dominant**, at least a
  few percent **warm accent pixels** (lit window, lamp), plus a **purple or magenta accent** as in the neighbouring families.
- The four panels must **line up**: the parapet, slab bands and window sill sit at the same heights on every panel
  (the previous attempt drifted at the seams). Include a tiling proof image.
- The front bay has **one window opening** that an NPC can stand in (the window NPC from task 1), and the window shows a
  **dark interior with a warm light** so she reads at night.
- Compare side by side with `abandoned_apartment` and `apartment_complex`. It should look like it was drawn for the
  same city.

### 3. Pip pickup (the pip that drops beside a full chest)
- **Not a blob.** It must read as the **same object as the HUD pip icon** (`assets/objects/pip/charged.png`): a charged
  capsule or crystal with a clear outline, a bright core, a darker body and a rim light. Size **24 x 24** (16 x 16 was
  too small to read), 4 frames: a gentle bob of 1 to 2 px and a pulsing core.
- Check: at 1x in a game screenshot next to the hero, a person must recognise it as a pip without a label.
  Minimum 5 distinct tones; no single colour above 40% of the opaque pixels.

### 4. Capacitor Module: match concept #3 exactly
Chief wants it to look **exactly like number 3** on his concept sheet ("03 | CAPACITOR MODULE: Industrial capacitor
used in atmospheric research"). Kiro's first version was a cyan-cored box with orange stripes; that is the wrong
design. As Kiro reads the sheet:
- **The large render:** a chunky rectangular canister in three-quarter view with **bevelled corners and a heavy riveted
  frame**, in **black and graphite gunmetal**. The faces carry **amber and gold glowing panels**: tall vertical amber
  light strips on the left face, an amber-lit panel on the right, and in the middle a **dark recessed panel with a pale
  grey triangular emblem** (the MIOR mark) and a small **amber warning-triangle plate**. Palette: black, graphite,
  brass, **amber glow** (about #ffb000 to #ffd24a). **No cyan core.**
- **The four small thumbnails (IDLE, PICKUP, SPIN, GLOW):** a **small upright capacitor can** (a cylinder with grey
  end caps and an amber glowing body). These are the in-game scale. Treat the large render as the design, and the
  thumbnails as how it looks at pixel size.
- **Deliver:** `item.png` 48 x 48 (the box design, as close to the render as pixel art allows), `idle` 6 frames (soft amber
  pulse), `glow` 4 frames (bright pulse), `spin` 8 frames (a slow turn), and an `icon` 24 x 24 of the thumbnail can.
  Keep the emblem **steady** in every frame (Kiro's version softened it, which Chief has not approved).
- Check against the sheet side by side. If it does not look like #3, it fails.

## Engine tasks, after the art is approved or while Chief reviews
### 5. State-linked hatch art (CONFIRMED need)
Aki's `hatch_closed.png` and `hatch_open.png` (64 x 32, on her branch under `secret-room/`) cannot be used today: a
barrier gate always draws as the electric fence, and a decoration cannot change. Add to `PowerGate` an optional
`style: 'hatch'` with `closedSrc` and `openSrc`: it draws the closed art while shut and the open art once open, with the
same collision rules as a fence. Keep `style: 'fence'` unchanged. Test: draws the right art in both states; rewinds on
checkpoint; an old fence gate is unchanged. (Kiro placed the Level 1 secret door as a fence for now.)

### 6. Open a barrier from a charged object
Today only a Switch can open a barrier. Add an optional `openWhenSourceCharged: { id, min }` to a `blockOnly` barrier:
it opens when the named charged object holds at least `min` charge (for the AC, 3 means fully powered) and closes
again if it drops below. Then Chief's design works as drawn: **power the AC unit and the door opens.** The wall switch
Kiro placed (`SW_AC`) stays until this is built and tested. Test with the real Level 1 data. Also check this
against the reactive NPC dialogue task (CODEX 01 C4): the same "is this object powered" check serves both.

## Report
Report as `CODEX 03`: per task PASS/FAIL, commit SHA, files, the contact sheets and the in-game screenshots (paths),
the automated check results, and what you did not do. Say how many tries each piece took. Then HOLD for review.
Chief reviews the art piece by piece. **Do not place anything in a level; do not register in the manifest.**

## Do not
Redo the relay pylon. Touch level files. Repeat Aki's rejected facade. Change the bar, pip or charge rules (that is
CODEX 02, which follows this order).
