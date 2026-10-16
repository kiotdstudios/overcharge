# KIRO ORDER: CODEX 03 (redo the art, build the tenant sequence)

**From:** Kiro, Technical Director | **To:** Codex | **Authority:** Chief's reviews of 2026-10-16 (two rounds, the second replaces the hidden room)
**Priority:** this order comes **before** `KIRO_ORDER_CODEX_02.md`. Chief is waiting to see the art in the game.
**Branch:** your own branch, push as `AGENTS.md` describes. Never force-push. Do not merge to the live line.
**Status:** work order, REVISED 2026-10-16 (round 14). Nothing started.

## What changed in this revision (round 14)
Chief scrapped the hidden room, the hatch, the fire escape and the room props ("im not liking any of that we can scrap that for now").
Kiro has already removed them from `level1.json`. **Do not build any hatch art and do not build "open a barrier from a charged object".**
The sequence is now a **tenant**, in the **upper area above the spawn**, reached by the **ladder** at the start (Chief's flow: *"Above the spawn area is
the second level (vertical area the player can go to). Until they get enough charge the player can't do anything. The tenant in the window complains
about the heat. The player powers on the AC unit (a charged object that was off). The AC fan spins and hums. She turns relieved, and GOOD NEIGHBOR is
awarded automatically. An achievement pops up on screen."*). A person in an apartment window is too hot; the player powers the AC unit under her window **by charging it
directly, like any other charged object** (Chief, round 14b: *"switch is only meant for powering down a fence"*, so there is no switch on the AC); she is relieved; **the achievement is awarded automatically**
(no room, no poster). The ladder is already back in `level1.json`; its art needs a Night City redo (task 9).

## What Chief said (2026-10-16)
| Piece | Chief's verdict |
|---|---|
| Apartment building (round 1) | "very blue, no real resemblance to Night City props" |
| Apartment (round 2) | "those wall tiles covering the hidden whatever also dont match current rooftop tiles; and the fence is still crunched up". Applies to the new building too: **tiles must match the current rooftop tiles.** |
| Window NPC, complaining | "looks like she is sucking on her finger or breathing on her hand, not fanning herself because she's hot" |
| Window NPC, relieved | "doesn't look happy; needs to change completely" |
| Pip pickup (dropped pip) | "looks like a blob" |
| Capacitor Module | "not bad, but I want it to look exactly like number 3" on his concept sheet |
| Power switch | "too large and needs to be a apart of a wall pannel; switch needs to 'sit' on the wall almost like a light switch on a regular wall at player height so he can interact with it" |
| New building | "i suggest generating a 4 panel building like the ones we been doing but one that fits what we are trying to acheive" |
| Relay pylon | "decent". Placed in Level 1. Do not redo it. |

## Why this is yours
Chief thinks you may do better on art than Aki did, so these pieces are yours. **Aki keeps the Builder and Level 1 construction.**
Orcha and Aki both had trouble with PixelLab output, so the checks below are mandatory and strict.

## Reference material
- **Capacitor Module concept sheet:** Chief supplies the file at `docs/reference/capacity_upgrade_concept_sheet.png`.
  **If it is not there when you start, stop that task and ask Chief for it.** (Kiro cannot copy a chat attachment into the repo.)
- Existing Night City building art: `assets/objects/night-city-buildings/` (families `abandoned_apartment`, `apartment_complex`,
  `convenience_store`, `garrys_electronics`, `gatehouse`, `library`, `tire_shop`, `warehouse`).
- **The rooftop and wall tiles Chief means:** look at what Level 1 uses today (`src_scroll/levels/level1.json` tile values and
  `assets/tilesets/`). Your building's parapet, slab bands and wall texture must read as the same tiles.
- Existing prop palette art: `assets/objects/night-city-props/` (the AC unit is the existing HVAC prop; find it there, and read how
  `ElectricalSource` kind `hvac` draws it).
- Aki's rejected drafts, to see what NOT to repeat: branch `agent/aki-order26`, folders
  `assets/objects/night-city-buildings/apartment_hint/`, `assets/sprites/npc-window-woman/`, `assets/objects/pip-pickup/`.
- Kiro's rejected Capacitor Module: `assets/objects/capacity-upgrade/`.
- The HUD pip icon, which the dropped pip must match: `assets/objects/pip/charged.png`.

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
  of the face as a sweeping arc**, not touch the mouth or fingers. If you can read "she is eating her finger", it failed.
- **Relieved (plays once, then holds the last frame):** the AC has just come on. **Clearly happy:** eyes close, a
  big breath out, **a real smile**, shoulders drop, one hand to the chest ("thank God"), then a relaxed lean on
  the sill. Hair or collar lifts as if in a cool breeze. If you can read "tired" or "neutral", it failed.
- Her lines (placeholders, Orcha writes the final text): before, "It's an oven in here"; after, "Oh, thank God. It's back on."

### 2. NEW apartment building for the tenant sequence: four panels, Night City prop family
**Not Aki's old facade; a new building designed for this job.** Four panels that line up, around 192 + 160 + 160 + 128 px wide
and 256 px tall like the earlier set (Kiro's measured sizes, change only if the design needs it and tell Kiro). Required features:
- **A window opening with room for the tenant** (the window NPC from task 1) on an **upper floor**, with a dark interior and a
  **warm light** so she reads at night. Sill at a height the NPC art sits on cleanly.
- **A flat, empty stretch of wall directly below that window, with a ledge or mount for the AC unit** (the AC hangs on the wall
  under or beside her window; she is hot because it is dead). Nothing painted on that stretch that would clash with the AC.
- **Reach:** the player powers the AC by standing near it and holding the charge key, like any charged object (Chief, round 14b), so the AC mount must sit
  where the hero can reach it **from the upper walkway** (the AC's centre within about 56 px of a standable floor, at roughly hero chest height). The wall-panel
  and light-switch idea is dropped for the AC: Chief ruled switches are only for powering down fences.
- **Tiles match the current rooftop tiles** (Chief's round 2 complaint). Compare with Level 1's rooftops side by side.
- **Not too blue.** Kiro measured: existing families run from 43% (`abandoned_apartment`) to 86% (`garrys_electronics`) blue-dominant
  pixels, `filler_wall` 80%. Aki's old draft was 95%. What makes the real families read as Night City is **texture and accents**:
  brick and panel detail, **lit windows with warm amber or pink light, purple and teal accents, signage, pipes, stains, trim.**
  Target **50% to 80% blue-dominant**, a few percent **warm accent pixels**, and a **purple or magenta accent**.
- The four panels must **line up**: parapet, slab bands and window sill sit at the same heights on every panel.
  Include a tiling proof image and a **side-by-side with `abandoned_apartment` and `apartment_complex`.**
- Roof edge works as a platform top the same way the existing buildings do (read how `night-city-buildings` families are used in
  Level 1 so the player can stand on the roof).

### 3. Wall-plate switch for FENCES (art, then engine; not used for the AC)
Chief (round 14b): "switch is only meant for powering down a fence." The AC is charged directly. This task is still wanted because the old fence switch
was "too large": it must be **small, a light switch on a wall at player height.** It is the control for a **power gate / fence**, not for the tenant.
- **Art:** a small plate, **16 x 24 px sprite** (the hitbox stays close to the plate), with a **lever or rocker** that is clearly
  **OFF** (lever down, one dim red dot) and **ON** (lever up, a green or cyan dot, a small glow). 2 frames plus a 3-frame flip.
  No big frame. It sits on any wall panel, for example beside a fence gate (Level 2 uses the old wall style today).
- **Engine:** add a `style: 'plate'` to the Switch (Level 2 already has the wall style, 56 x 56 art / 22 x 22 hitbox: that is the
  too-large one). Plate style: small hitbox that fits the art, draws the plate art, shows the flip, and keeps the existing rules (costs its
  `required` charge, hold the use key to pay, rewinds on checkpoint). It is hung on a wall, so it is **not** required to rest on a floor tile:
  state this plainly and **fix the `parity_regression` rule** ("switches rest on a surface, y+22 = surface") so a plate switch only has to
  be inside a wall at its stated height. Test it. Old switches unchanged.

### 4. Pip pickup (the pip that drops beside a full chest)
- **Not a blob.** It must read as the **same object as the HUD pip icon** (`assets/objects/pip/charged.png`): a charged
  capsule or crystal with a clear outline, a bright core, a darker body and a rim light. Size **24 x 24**, 4 frames:
  a gentle bob of 1 to 2 px and a pulsing core.
- Check: at 1x next to the hero, a person recognises it as a pip without a label. Minimum 5 distinct tones; no single colour above 40% of opaque pixels.

### 5. Capacitor Module: match concept #3 exactly
Chief wants it **exactly like number 3** on his concept sheet ("03 | CAPACITOR MODULE: Industrial capacitor used in atmospheric
research"). Kiro's first version was a cyan-cored box with orange stripes; wrong design. As Kiro reads the sheet:
- **The large render:** a chunky rectangular canister in three-quarter view with **bevelled corners and a heavy riveted frame**, in
  **black and graphite gunmetal**. Faces carry **amber and gold glowing panels**: tall vertical amber light strips on the left face, an
  amber-lit panel on the right, and in the middle a **dark recessed panel with a pale grey triangular emblem** (the MIOR mark) and a
  small **amber warning-triangle plate**. Palette: black, graphite, brass, **amber glow** (about #ffb000 to #ffd24a). **No cyan core.**
- **The four small thumbnails (IDLE, PICKUP, SPIN, GLOW):** a **small upright capacitor can** (cylinder, grey end caps, amber glowing body).
  These are the in-game scale. Treat the large render as the design, the thumbnails as how it looks at pixel size.
- **Deliver:** `item.png` 48 x 48, `idle` 6 frames (soft amber pulse), `glow` 4 frames, `spin` 8 frames, and an `icon` 24 x 24 of the
  thumbnail can. Keep the emblem **steady** in every frame. Check side by side with the sheet; if it does not look like #3, it fails.

## Engine tasks (start while Chief reviews the art)

### 6. The tenant reacts to the AC (CODEX 01 task C4, now with a concrete use)
The window NPC gets two line sets: `lines` (complaining) and `poweredLines` (relieved), with `linkedObjectId` naming the AC source.
Rule: "powered" means **the AC has been switched on**. Build the check once: a helper on the level, e.g. `level.isPowered(id)`
that is true for a source whose charge has reached its capacity (and, for the tenant, stays relieved once it has happened). The NPC draws the complaining
animation until powered, then plays the relieved animation once and holds it, and says the `poweredLines`. State rewinds on checkpoint.
Build it for the **real Level 1 AC** once Aki places it (or in a test level), not as a one-off.

### 7. The AC turns on
The AC is an existing `ElectricalSource` of kind `hvac`, placed **uncharged** (`uncharged: true`), capacity 3. **The player charges it directly,
like any other charged object** (hold the charge key near it; `receive()` already exists from Codex Phase A). There is no switch. It is **on** when its
charge reaches its capacity (3), and **off** below that (a half-charged AC may flicker or sputter but the fan stays still). When it turns on it must **look and
sound on**: the fan spins, the unit hums (reuse an existing loop in `src_scroll/audio.js` or add `ac_hum`), a few cool-air particles drip from the vents
(`src_scroll/juice.js`). If the player takes the charge back (the AC is a two-way object), the fan stops; the tenant and the achievement do **not** reverse
(RECOMMENDED; Chief to confirm). Tests with the real Level 1 data: charging to 3 turns it on, 2.9 does not, charging a second time works, state rewinds on a checkpoint.

### 8. Achievements (new, small, CONFIRMED need)
There is **no achievement system in the code today.** Build the smallest one that works:
- `src_scroll/achievements.js`: a table `{id, title, text}`, `unlock(id)`, `has(id)`, and a persisted record (localStorage under one key;
  fall back quietly if storage is blocked). `?achievements=off` switch for tests.
- A **toast**: a slim banner at the top of the screen for about 3 seconds with a small icon placeholder, the title and the text, and a sound
  (add `achievement` to `audio.js`: a bright three-note rise). It must not pause the game or block input.
- First entry: id `good_neighbor`, title **"GOOD NEIGHBOR"** (placeholder, **Orcha writes the final title and text**), unlocked **automatically**
  the moment the tenant switches to relieved (task 6). No pickup, no room, no button.
- Expose the list for a later menu page; do not build the menu yet.
- Tests: unlock once only; persisted across a reload (in the test harness); toast queue handles two unlocks in a row; off switch.

### 9. Ladder in the Night City prop colours (art, new from Chief, 2026-10-16)
Chief: "ladder needs to be put back; but make codex make a ladder night city prop colored." Kiro put the ladder back in Level 1. The current
`assets/objects/night-city-props/ladder/ladder.png` (**128 x 605**) is a blue and purple frame with cyan glow panels and rounded caps; it does not
read as part of the Night City prop family. Redraw it:
- **Same file and same shape** so it drops in: a vertical ladder, **two rails and evenly spaced rungs**, transparent background, 128 x 605, with the
  rails centred so it still looks right when the Builder resizes it (Level 1 uses it at 32 px wide by 192 px tall, so check it at **that** size, not only full size).
- **Colours and material from the Night City props** (look at the street lamp, fuse box, pipes, vents and the building trim): rusty or painted steel, dark
  grey and brown metal, worn edges, a little warm rust and a few teal or magenta edge highlights if the neighbouring props have them. **No large
  cyan glow panels.** A small amber or teal accent at the top is fine.
- It must look right **stacked**: the top and bottom must not carry caps that look wrong when the ladder is placed twice in a row or resized.
- Rungs must stay readable at 32 x 192 (visible gaps, a clear lighter rung edge).
- Deliver for review in `assets/objects/night-city-props/ladder_review/` (the new file, a side-by-side with the old one, and a screenshot at game size
  next to the hero on the Level 1 upper walkway). **Do not overwrite `ladder.png` until Chief approves**; then swap it in the same commit as the approval note.
  Same checks as every other piece, stop after two weak tries.

## Report
Report as `CODEX 03`: per task PASS/FAIL, commit SHA, files, the contact sheets and in-game screenshots (paths), the automated check
results, and what you did not do. Say how many tries each piece took. Then HOLD for review.
Chief reviews the art piece by piece. **Do not place anything in a level; do not register art in the manifest until Chief approves it.**
Tasks 6 to 8 are engine work and need no approval to build, but use test levels only; Aki places the pieces in Level 1.

## Do not
Redo the relay pylon. Touch `src_scroll/levels/level1.json` or any other level file. Repeat Aki's rejected facade. Build hatch art.
Change the bar, pip or charge rules (that is CODEX 02, which follows this order).
