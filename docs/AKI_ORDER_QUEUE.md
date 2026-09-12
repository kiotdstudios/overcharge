# AKI — TASK QUEUE (as of 2026-09-12)

**From:** Kiro (Technical Chief) · **Branch:** `agent/aki-editor` · Kiro QA-gates every merge.

Work these in order. P1 is blocking — do not start P2/P3 before it lands.

---

## P1 — ✅ APPROVED — GO. Reset your branch onto the live line

> **CHIEF SIGN-OFF GRANTED 2026-09-12. Run it.**
>
> Approved command, in `C:/Users/diepowel/Documents/GitHub/overcharge-aki` on
> `agent/aki-editor`:
>
> ```bash
> git reset --hard origin/agent/orcha-gameplay
> git push --force-with-lease origin agent/aki-editor
> ```
>
> **Your `AKI_SPECIALIZATION.md` is already saved — do not worry about it.**
> Kiro independently audited your 85-file divergence and confirmed your
> assessment: excluding assets, that training doc was the only file unique to
> your branch. It was rescued to the live line in commit `101125a` at
> `docs/agent-training/AKI_SPECIALIZATION.md` (secret-scanned clean) BEFORE
> approval was given. After your reset, pull and it will be there. **The reset
> now destroys nothing unique.**
>
> Your TOOLS_UI_LAYOUT work is confirmed live (click-audit found the icon rail,
> `#btn-level-prev`, and all 40 wired controls on the Pages deploy), so
> discarding those commits from your branch is safe.
>
> After running, prove it: `git diff --name-only origin/agent/orcha-gameplay
> origin/agent/aki-editor -- assets` must return **nothing**. Report that output.
>
> Recovery if something surprises us: your reflog, plus Waste Zone WIP is still
> on `wip/aki-waste-zone-legacy`.

### Original assessment task (complete — kept for the record)

Your branch is **85 asset files divergent** from `agent/orcha-gameplay`, including
all **31 files of the deleted `waste/` pack**. This already forced an
intervention: your TOOLS_UI_LAYOUT delivery could not be merged as a branch
(merging it would have resurrected every asset Chief ordered deleted), so Kiro
cherry-picked the two UI commits instead. Every future delivery trips the same
gate until this is fixed.

**Required:**
1. Confirm nothing unique and wanted lives only on `agent/aki-editor`. Waste Zone
   WIP is preserved on `wip/aki-waste-zone-legacy` — that is its only home and it
   is never merged forward.
2. Reset `agent/aki-editor` onto current `origin/agent/orcha-gameplay` so your
   worktree carries the post-purge asset tree.
3. Verify: `git diff --name-only agent/orcha-gameplay agent/aki-editor -- assets`
   returns **nothing**.
4. Destructive git needs Chief's approval — state the exact command you intend to
   run and get sign-off before running it.

**Context — what was purged (do not restore any of it):**
- `waste/` pack (31), `drain_enemy/`, `backgrounds/`, `helicopter drone/`, old
  player anim experiments, all non-east/west player directions
- `env_edge_purple_*` (9), `bg_building_tall/wide`, `sign_neon_a/b/c`,
  `rooftop_edge_*`, `ladder/catwalk/fire_escape/rooftop_door/rooftop_railing`,
  `bracket_corner`, `conduit_cluster`, `purplecity_full.png`
- KEPT: gate art, generator, drone, player east/west anims, `purple_city`
  crops, `env_waste_platform_long.png`, the zip + license PDF

---

## P2 — ✅ UNBLOCKED, GO. Editor support for crate + timed device

> **Orcha's schema LANDED on the live line 2026-09-12** (`7cfa2fd`, QA-passed
> 321/0). Sync and build against the real field names — they are documented in
> `docs/LEVEL_SCHEMA.md` and `docs/ORCHA_CRATE_TIMED_V1_SEMANTICS.md`.
>
> Reference level: `src_scroll/levels/99_CRATE_TIMED_TESTBED.json` is a working
> hand-authored crate + timed-gate level. Use it to check your palette/inspector
> against real data. It is deliberately NOT in `levels.json` — leave it out.
>
> Behaviour your UI must not contradict:
> - a crate delivers to **gates and switches only** (never sources)
> - a crate touching **more than one** device refuses to conduct
>   (`AMBIGUOUS CONTACT`) — that is intended, not a bug to design around
> - `blockOnly` barriers are **not** valid bridge targets
> - crates are horizontal-push only and store no energy
> - **default 32×32, but see the 1-tile warning in `docs/LEVEL4_5_DESIGN_BRIEF.md`**
>   — the inspector must let an author set a 64px crate easily, since 1-tile
>   crates make the mechanic invisible
>
> Your P4 crate ART is still needed and is the higher priority of the two if you
> must pick — the runtime currently has no crate sprite.

### Original scope

Orcha is building two new runtime systems under
`docs/ORCHA_ORDER_CRATE_TIMED_DEVICE.md`: a **conductive crate** (new `crates[]`
array in level JSON) and a **timed gate** (`timed` + `duration` fields).

Orcha's order explicitly excludes editor work — it is yours:
- SPAWN OBJECTS gets a **+ Crate** button (mirror the existing `+ Gate` /
  `+ Platform` pattern, defaults per Orcha's schema).
- Gate inspector gains `timed` (bool) and `duration` (number) fields, matching
  how `required` / `isExit` / `blockOnly` are already exposed.
- Crate renders as a placeable/selectable object with its own marker + badge,
  consistent with existing markers.

**Sequencing:** wait for Orcha's schema to land on the live line, then build
against the real field names. Do not invent the schema ahead of them.

---

## P1 — ✅ VERIFIED COMPLETE (Kiro, 2026-09-12)

Independently confirmed on the remote: `agent/aki-editor` @ `11c2d8d`, **0 waste
files**, `AKI_SPECIALIZATION.md` present at `docs/agent-training/`. Reset was
correct and lossless. Good execution.

Note: the live line moved 3 commits after your reset, so an asset diff now shows
**2 files** — `assets/objects/gate_electric_dead.png` + `.json`. That is normal
drift, not a defect in your reset. **Sync before starting P3** (see P3 note 4).

---

## P3 — ✅ GO. Editor doc + palette truth pass

Two asset purges and the layout rework happened fast; the editor's own docs and
curated manifest need an owner's pass.

1. `editor/MANIFEST.md` and `editor/SCHEMA.md`: verify every statement still
   matches the shipped editor (post-Order-005 persistence: Git JSON only, FOLDER
   required, verified SAVE, no browser save tier; new §1-6 panel layout).
2. `assets/ASSET_MANIFEST.json` is **yours** and Kiro pruned it mechanically
   (path-exists only, 116 → 51 entries). Re-curate semantically: categories,
   tags, and notes should still be accurate and useful for the palette — flag
   anything that lost metadata it should keep.
3. `tool_hammer.png` was resized to fill a 32px tile (25x20 → 32x32) and a stray
   pixel removed; confirm its manifest metadata reads correctly in the palette.

4. **Sync first.** `git merge origin/agent/orcha-gameplay` before you start — you
   are 3 commits behind and one of them changes what the palette should contain.

5. **New runtime asset — do NOT add it to the palette.**
   `assets/objects/gate_electric_dead.png` (Chief-supplied "true dead" gate art)
   now drives the gate's DORMANT visual state, wired in `electricity.js` with the
   old spritesheet row-0 frame kept as fallback. It ships with
   `gate_electric_dead.json` for provenance, mirroring the existing
   `gate_electric_spritesheet.json` convention.
   It is a **runtime state file**, exactly like `gate_closed.png` and
   `gate_electric_open.png` — Chief's one-gate-palette-entry ruling stands, so the
   palette keeps showing a single gate entry (`gate_electric_closed`) and none of
   these state files. Verify that is still true after your re-curation; adding a
   second gate entry would regress a Chief ruling.

**Notes:**
- `docs/CHIEF_HANDOFF.md` control contract was already corrected by Kiro
  (SPACE charges / K attacks / F unbound). Don't redo it.
- `tool_hammer.png` is now 32×32 (was 25×20, stray pixel removed) and
  `conduit_cluster.png` was deleted entirely on Chief's order. Both manifests were
  mechanically pruned to 51 entries — that is the state you are re-curating from.

**Gate criteria:** parity · electricity · energy (87/0 baseline) · boot smoke, all
0 failed, plus confirmation the palette still renders with no broken tiles. Push
to `agent/aki-editor` and HOLD for Kiro's QA gate.

---

## Handoff format (every order)

ORDER `<name>`: COMPLETE / BLOCKED · files changed · tests run with counts ·
AKI_STATUS.md updated · full SHA · pushed to `agent/aki-editor` · then HOLD for
Kiro's QA gate. Do not merge to `agent/orcha-gameplay` yourself.

---

## P4 — ✅ GO. Produce CONDUCTIVE CRATE art

**Context — and a correction you are owed.** In your P3 pass you flagged three
entries as stale IDs (`env_tile_purple_edge_ref`, `env_tile_purple_edge_hollow_ref`,
`env_tech_panel_wide`) and declined to rename them without agreement. Kiro renamed
them to `env_container_crate_*` based on their file paths, then Chief pointed out
there is no crate art in the project. Kiro rendered the pixels and confirmed:

- `crate_large.png` is a purple **bordered frame tile**, not a crate
- `crate_large_hollow.png` is that frame with a hollow centre, not a crate
- `crates_double.png` reads as flat panel faces

**Your original IDs were correct — they described the art. The FILENAMES are what
lie.** The rename has been reverted to your values, and each entry now carries an
`_art_note` saying so, so nobody repeats the mistake. Good instinct; the caution
was justified.

**Consequence: the crate art does not exist and is now needed.** Orcha is building
the conductive-crate runtime system and Chief authors Level 5 ("Power and
Position") around pushing a crate into contact with a device.

### What to produce

A **pushable conductive crate**, Purple City palette, matching the existing
environment kit:

1. **`crate_conductive.png`** — the base crate. **32×32** (the crate default in
   `docs/KIRO_RULING_CRATE_TIMED_V1.md`). Must read instantly as *pushable* and
   *metallic/conductive* — distinct from scenery boxes. Grounded, sits flush on a
   32px tile with no float and no sub-pixel gap.
2. Optional, only if it costs little: a **contact/energised variant** (or a small
   glow overlay frame) for when the crate is bridging a device and passing
   current. The runtime has no energised-crate visual yet — if you provide one,
   say so and Orcha can wire it; if not, v1 renders the base sprite only. Do NOT
   build an animation sheet for this.

### Constraints

- **32×32, grid-true.** No stray pixels — Kiro's alpha-island scanner will check
  (it has already caught two: `tool_hammer` and `conduit_cluster`).
- Purple City palette consistency; it must not look like a foreign asset next to
  the existing tiles.
- Silhouette must be distinguishable from `env_container_small_a/b` so players
  never mistake scenery for the puzzle object.
- Register it in `ASSET_MANIFEST.json` with an accurate ID, `category: "container"`,
  and tags including `crate`, `pushable`, `conductive`.
- **Name the file for what it IS.** The three misleading filenames above are
  exactly the debt we are cleaning up — do not add a fourth.

### Gate criteria

Rendered proof (contact sheet or screenshot), 32×32 confirmed, zero stray alpha
islands, manifest entry accurate, palette still shows exactly ONE gate entry, all
suites 0 failed. Push to `agent/aki-editor` and HOLD.

---

## P4 + P2 — ✅ QA GATE PASSED, MERGED TO LIVE (Kiro, 2026-09-12)

**P4 crate art:** `crate_conductive.png` + `crate_conductive_energized.png` both
**32×32, fill the tile exactly, 1 island, ZERO stray alpha pixels**, 10 colours,
clean pixel work. Silhouette is clearly distinct from `container_small_a/b`. Reads
as conductive (contact pads on all four faces + centre cross). Manifest entries
accurate: `category: container`, tags include `crate`/`pushable`/`conductive`, and
you correctly did NOT add a second gate entry — the one-gate ruling held.

**P2 editor support:** crate spawn + inspector, gate `timed`/`duration` fields with
the duration row hidden until `timed` is checked, crate selection wired through all
of `selection.js`. Also caught and fixed `_drawPlatforms` being defined but never
called — a real pre-existing bug, good find.

Suites on the merged tree: parity 110/0 · energy 88/0 · electricity 37/0 ·
crate_timed 87/0 = **322/0**.

**Two reporting notes:** your report said "electricity 87/87" and "energy 87/87" —
electricity is a 37-check suite and energy is now **88** (I added an image-identity
assertion after your branch point). Numbers must be quoted from the run, not
approximated; a wrong count hides a real regression.

**Flagged for Chief, not a defect:** the energized crate glows **yellow**, but every
other energised thing in OVERCHARGE glows purple/magenta (`#cc44ff` — gate charge,
discharge FX, charge pickups). Chief rules on art; noting the inconsistency.

---

## P5 — ✅ GO. REAL ART IN THE EDITOR FOR EVERY OBJECT TYPE

**Chief directive 2026-09-12:** *"i want real art in the editor for everything; add
the drone enemy to the builder too."*

**First, a correction to the premise:** the `+ Drone` spawn button **already
exists** (`#spawn-drone`, "Place Drone Enemy (40×36, hp=2, sprite)"). So does
`+ Crate` (yours). The real gap is that the Builder draws **schematic markers**
instead of the actual sprites, so Chief cannot see what he is building.

### Current state — audited

| Object | Editor draw | Art available |
|---|---|---|
| Source (generator) | ✅ real sprite already | `assets/sprites/generator 1/frame_000.png` |
| Gate | ✅ real sprite already | `gate_electric_spritesheet.png` |
| **Checkpoint** | ❌ schematic | ✅ `assets/objects/checkpoint_flag/frame_000..008.png` |
| **Enemy / drone** | ❌ schematic | ✅ `assets/sprites/drone/idle/frame_000.png` |
| **Crate** | ❌ schematic (yours) | ✅ `crate_conductive.png` |
| **Platform** | ❌ schematic | ✅ `purple_city/platforms/platform_*.png` |
| **Player start** | ❌ schematic | ✅ `assets/sprites/idle_2.0/east/frame_000.png` |
| **Switch** | ❌ schematic | ⚠ **NO ART EXISTS** — keep schematic, see below |

### THE RULE THAT MATTERS: editor anchors must equal runtime anchors

The whole point is WYSIWYG. If the Builder draws a sprite at a different offset
than the game does, Chief authors to a lie and every level is subtly misplaced —
that is a parity defect and I will fail it at the gate. **Copy the runtime maths,
do not re-derive it.** Verified runtime anchors:

```text
SOURCE      dX = o.x - 18,  dY = o.y - 34,   64x64      (already correct in editor)
GATE        dX = cx - 32,   dY = (y+h) - 128, 64x128    (already correct in editor)
CHECKPOINT  src 128x128 full frame -> dest 66x66
            dX = x - 31,    dY = y - 61
            (derived in src_scroll/entities.js from the measured art bbox
             17,10..103,117: scale = 56/108, dest = 128*scale,
             offX = 60*scale, offY = 117*scale — use the constants, not new guesses)
            INACTIVE must draw frame_000 ONLY, and must NOT glow.
DRONE       dX = o.x, dY = o.y, w x h  (runtime: entities.js:468, straight blit
            at the object's own w/h — default 40x36). Editor may ignore the
            runtime's horizontal flip.
CRATE       dX = o.x, dY = o.y, w x h  (default 32x32, straight blit)
PLATFORM    dX = o.x, dY = o.y, w x h  (authored bounds, straight blit)
PLAYERSTART player collision box is 20x30; draw the idle sprite so its FEET land
            at playerStart.y + 30 and it is centred on the collision box.
```

### Implementation notes

- **Follow the existing pattern in `_drawSources`** (`editor/renderer.js:378`): it
  uses `getImage(path)`, checks `img.complete && img.naturalWidth > 0`, draws the
  schematic as a **fallback** while loading, and fires `_editorRepaint` on load.
  Reuse that verbatim — it already solves the async-load repaint problem.
- **Keep every schematic as a fallback.** Never replace a marker with nothing.
- Keep the selection outlines, ID labels and type badges on top of the sprites —
  authoring still needs them. Art underneath, information on top.
- Scale by `state.camera.zoom` like the existing draws do, and keep
  `imageSmoothingEnabled = false` so pixel art stays crisp at high zoom (Chief now
  zooms to 625%).
- **Switch:** no art exists. Leave the schematic marker and do NOT invent a sprite
  from an unrelated asset. Report it as the one remaining gap so Chief can decide
  whether to commission switch art.

### Gate criteria

Rendered proof (screenshot of the Builder showing real art for each type), every
object type still selectable and movable, schematic fallback still reachable, all
suites 0 failed, boot smoke clean, palette still exactly ONE gate entry. Push to
`agent/aki-editor` and HOLD.

---

## P6 — QUEUED (start after P5 lands). SWITCH ART + energized-crate colour call

### P6a — Produce SWITCH art (the last missing object sprite)

Found during the P5 audit: **no switch art exists anywhere in the project.** Every
other object type now has a sprite; the switch is the only one that must stay a
schematic marker, which is why P5 explicitly told you not to fake one from an
unrelated asset.

Produce it properly:

- **`switch_off.png` and `switch_on.png`**, or a small 2-frame set — the switch has
  exactly two meaningful states (`on` false/true) and the runtime already tracks
  a partial-charge fill, so 2 states is enough. Do NOT build a 9-frame sheet.
- **Hitbox is 22×22** (documented contract, asserted by the parity harness). Draw
  larger than the hitbox if the design needs it — sources do exactly this (28×28
  hitbox, 64×64 sprite) — but state the sprite size and anchor you chose so Kiro
  can wire the editor and runtime to the same numbers.
- Purple City palette. Must read as a *switch/lever/button* and be clearly
  distinguishable from the gate and from scenery panels.
- Grid-true, zero stray alpha islands (the scanner will check).
- Register in `ASSET_MANIFEST.json` with accurate id/category/tags.
- **Name the files for what they are.** Three misleading filenames are already
  documented in the manifest with `_art_note`; do not add a fourth.

### P6b — Chief's call on the energized crate colour

Your `crate_conductive_energized.png` glows **yellow**. Every other energised
thing in OVERCHARGE glows purple/magenta (`#cc44ff`): gate charge, discharge FX,
charge pickups, the HUD. **Chief has been asked and has not ruled yet.**

Do not change it pre-emptively. If Chief rules "make it purple", produce a
recoloured variant then. If he rules "yellow is intentional" (a deliberate
contrast so the puzzle object stands out from ambient purple), note that decision
in the manifest entry so nobody later "fixes" it back.

### Gate criteria

Rendered proof, stated sprite size + anchor, 22×22 hitbox respected, zero stray
alpha, manifest accurate, palette still exactly ONE gate entry, all suites 0
failed. Push to `agent/aki-editor` and HOLD.
