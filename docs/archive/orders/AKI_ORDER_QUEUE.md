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
| ~~**Checkpoint**~~ | ✅ **DONE BY KIRO** — do not redo | `assets/objects/checkpoint_flag/frame_000..008.png` |
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

---

## P5 SCOPE CHANGE — checkpoint is DONE, do not redo it

**Kiro implemented the checkpoint case directly (2026-09-12).** Chief reported the
"CP" box twice and was blocked from seeing his own level, so it was not left to
wait. `editor/renderer.js _drawCheckpoints` now draws
`checkpoint_flag/frame_000.png` (the dark/resting frame — the "GAME SAVED" frames
only mean something once a player triggers it), with the CP box retained as the
loading fallback and the id label kept on top.

**Use it as the reference implementation for the rest of P5.** It demonstrates
exactly what the order asks for:
- anchors **copied from the runtime, not re-derived** — the `CP_*` constants in
  `editor/renderer.js` mirror `src_scroll/entities.js` line for line, with a
  comment saying why (if the two disagree, Chief authors to a lie)
- `getImage()` + `img.complete && img.naturalWidth > 0`, schematic as fallback
- `imageSmoothingEnabled = false`
- authoring info (id label) drawn ON TOP of the art
- scaled by `state.camera.zoom`

**Your remaining P5 scope:** drone/enemies, crate, platform, playerStart. Switch
stays schematic (no art exists — that is P6a).

Verified: the real editor render path now draws `generator 1/frame_000.png`,
`objects/gate_closed.png` and `checkpoint_flag/frame_000.png`, zero page errors.

---

## P5 — ✅ QA GATE PASSED, MERGED TO LIVE — but read this before your next merge

**Verdict:** your P5 work is merged and live (`origin/agent/aki-editor` `b6df5ea` is
an ancestor of `agent/orcha-gameplay`). Live HEAD is now `2503c0c`; **you are 3
behind — sync before starting P6a.**

**All six object types verified drawing REAL art, by observation not by report.**
I patched `CanvasRenderingContext2D.prototype.drawImage` before boot and swept the
camera across two levels. Platforms and drones exist in NO committed level, so
rather than assume those worked I injected one of each. Confirmed drawing:
`generator 1/frame_000.png`, `gate_closed.png`, `checkpoint_flag/frame_000.png`,
`crate_conductive.png`, `drone/idle/frame_000.png`, `idle_2.0/east/frame_000.png`.
Zero page errors. Good work — the pattern was followed correctly in all four of
your cases.

### ⚠ Your merge shipped a defect that killed the whole Builder

Not the `spriteY` line you flagged. Worse, and unreported:

```text
EDITOR PAGE ERROR: Identifier 'CP_SRC' has already been declared
BOOT_SMOKE_FAILED   →  EDITOR dropdown: []   EDITOR level loaded: loading...
```

Your conflict resolution left **two module-scope `CP_*` declaration blocks** — yours
at the top of `renderer.js` and mine near `_drawCheckpoints`. A duplicate `const`
at module scope is a **parse error**, so `editor/renderer.js` never loaded at all.
The Builder was not degraded, it was **dead**.

**Why your 322/0 was true and meaningless here:** the `_dev` suites never import
`editor/renderer.js`. They cannot see an editor parse error. **The boot smoke your
P5 gate criteria explicitly required catches it in one run.** For any editor work,
green unit suites prove nothing — boot smoke is the only thing that loads the
module. Run it before every editor handoff:

```bash
node C:/Users/diepowel/Documents/_kiro_tools/boot_smoke.mjs <repo> <port>
```

**On the `spriteY` line you flagged as "his code, his call":** it was real, but it
was **not my code** — my live version has `spriteY` only in `_drawSources` and
`_drawGates`. Your resolution spliced a label line from your own checkpoint
implementation into my fallback branch, where `spriteY` is undeclared. And it was
**not low-probability**: that fallback runs whenever the art has not loaded, i.e.
every cold-cache first paint. Credit for spotting it — the diagnosis just needed
correcting.

Both are fixed on live (`ffc0eee`). **Do not re-add a second `CP_*` block when you
sync.** One declaration only, at the top of the file with the other anchor
constants.

### Also changed on live since your branch — do not undo it

`editor/renderer.js` selection outlines **no longer hard-code their rects**. They
now call `Selection.boundingRect(kind, ref)` for every kind. The inline copies had
drifted from `selection.js` (which the old comment already called "the source of
truth"), and that drift is what made the checkpoint box render as a 22×22 dot at
the sign's base. Chief reported it directly.

Consequence: **selection boxes now wrap the visible sprite**, and fixing a box in
`boundingRect` updates both the outline and the click target. Same rule applied to
`source` (was 28×28 hitbox under 64×64 art) and `playerStart` (was 14×14 under your
92×92 sprite). If you touch selection geometry in P6a, change `boundingRect` only.

---

## P6a — ✅ GO. Switch art

Cleared to start. Scope, constraints and gate criteria are unchanged from the P6
section above. Sync first (you are 3 behind), and remember the switch is the last
object type still rendering as a schematic — once its art exists, wire it using the
same `getImage` + fallback pattern, and add its `boundingRect` entry so the box
wraps the new sprite rather than the 22×22 hitbox.

---

# P7 — ✅ GO. FENCE + WALL SWITCH in the Builder (and P6a is now on HOLD)

**Read this whole section before starting — one of your queued tasks is probably
unnecessary now, and I do not want you making art nobody will use.**

## ⚠ FIRST: sync. You are 27 commits behind.

A lot landed while you were away: map height **ROWS 14 → 18**, the fence/wall-switch
runtime, Level 3, selection boxes now derived from `boundingRect`, `SNAP_GAMEPLAY_DEFAULT`
16 → 32, and `style` dropdowns in the inspector.

**Your last merge shipped a defect that killed the entire Builder** — two
module-scope `CP_*` declaration blocks, a parse error, so `editor/renderer.js`
never loaded. Your unit suites passed because they never import the renderer.
**Run boot smoke before you hand anything over:**

```bash
node C:/Users/diepowel/Documents/_kiro_tools/boot_smoke.mjs <repo> <port>
```

Current live baseline: parity 177 · fence_switch 62 · energy 88 · crate_timed 87 ·
electricity 37 = **451/0**, boot smoke OK.

## Context — what already exists, so you do not rebuild it

Chief supplied two art packs. They are **installed, committed, and wired into the
RUNTIME** (Orcha, QA-passed):

- `assets/objects/wall_switch/` — 56×56 · `switch_off` · `switch_on` (green) ·
  `switch_destroyed` (burnt) · `frame_001..008` burn animation
- `assets/objects/fence/` — 64×64 · `fence_dead` · `frame_001..008` live electricity

**`frame_000` in BOTH packs is the REST POSE**, byte-identical to the dead/destroyed
file (sha256-verified). **Animate from `frame_001`.** The parity harness now guards
this mechanically — do not reintroduce 000 into a loop.

I already added the **authoring** path so Chief can test: `style` dropdowns on
switches (`wall`) and on blockOnly gates (`fence`). The dropdown is only offered on
a blockOnly gate, because the runtime warns-and-ignores a fence that is not.

## P7a — Draw the new art in the Builder (the actual gap)

Right now the Builder still draws the OLD schematic for styled objects, so Chief
authors blind — the real sprites only appear in-game.

- `style:"wall"` switch → draw `switch_on.png` (its resting, powering state).
- `style:"fence"` blockOnly gate → draw a representative **live** frame, or loop
  `frame_001..008`. Static is acceptable; do NOT animate from `frame_000`.
- Default (unstyled) switch and gate rendering must be **unchanged**.

**Anchors: copy them from `src_scroll/electricity.js`, do not re-derive.** Orcha
anchored both from the **uniform canvas**, never per-frame bbox — the switch's
frames 001-003 widen by 2px and *that is the vibration*; per-frame anchoring would
turn it into a jitter-free slide. Fence art tiles over the gate hitbox (Level 2's
32×128 barrier tiles the 64×64 art exactly 2× vertically).

If the Builder and the game disagree on placement, Chief authors to a lie. I will
fail that at the gate.

## P7b — `boundingRect` for the new sprites

Selection geometry now lives in **ONE place**: `selection.js::boundingRect`, and
`renderer.js` derives outlines from it. Change it there only.

A 56×56 wall switch under a 22×22 box is **the exact defect Chief reported on the
checkpoint** — the box sat at the sprite's base instead of around it. Do not repeat
it. Box wraps the visible sprite; the runtime hitbox is unchanged.

## P7c — Manifest registration

Register both packs in `ASSET_MANIFEST.json` with accurate ids/categories/tags.

**These are runtime STATE sprites**, so follow the `gate_electric_dead.png`
precedent: they do **not** enter the art palette, and the palette must still show
**exactly ONE gate entry**. Verify that after your pass — you have re-curated this
file before and the one-gate ruling has to survive.

## P6a switch art — ON HOLD, do not start

**Switch art now exists**, and I do not want you drawing more until Chief rules.

`switch_off.png` (dark icon) → `switch_on.png` (green icon) maps **exactly** onto the
DEFAULT switch's off→on semantics, and the wall style already uses
`switch_on` → `switch_destroyed`. One pack could cover both, with no new art.

The default switch currently draws **vector art** (glow rect + fill bar), confirmed
in `electricity.js`.

**The open question, which is Chief's to answer, not yours:** if a default switch
that is ON uses `switch_on.png`, it looks identical to a wall switch that has NOT yet
fired — two devices with different behaviour sharing one appearance. Context
disambiguates them (a wall switch sits beside a fence, a default switch beside a
barrier), but it is a real readability trade.

### ✅ RULED (Kiro, Technical Director authority, 2026-09-12)

Chief delegated this call. **Decision: P6a is CANCELLED. Do not produce switch art,
and do not restyle the default switch.**

Reasoning, so it can be reversed cleanly if play proves it wrong:

1. **The default switch has zero consumers.** Level 2 is the only level with a
   switch, and Chief is flipping `SW1` to `style:"wall"` — which means after that
   flip **no level contains a default-style switch at all**. Restyling it would be
   art and code for a device nothing currently uses.
2. **It already works.** The default switch draws a glow rect *plus a charge fill
   bar* that reads correctly. Replacing it means re-implementing that fill over
   sprite art — real regression risk on a working device, for no gameplay gain.
3. **The ambiguity I raised is benign on inspection.** The only collision is a
   *fired* default switch (green) versus an *unfired* wall switch (green). Those
   never compete for attention: a fired default switch is spent and inert, while an
   unfired wall switch is the live target. And the neighbouring object settles it —
   spent default switch sits beside an OPEN barrier, live wall switch beside a
   SPARKING fence.

**Revisit only when a level actually authors a default switch.** No speculative
work. If Chief plays it and wants switches visually unified, this reverses to "reuse
`switch_off`/`switch_on` for the default style" — one branch in `Switch.draw`.

## Gate criteria

Rendered proof (Builder screenshot showing fence + wall switch as real art),
selection boxes wrapping the new sprites, default styles visually unchanged, palette
still exactly ONE gate entry, **all five suites 0 failed**, and **boot smoke OK**.
Push to `agent/aki-editor` and HOLD.
