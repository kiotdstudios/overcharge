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

## P2 — Editor support for crate + timed device

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

## P3 — Editor doc + palette truth pass

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

**Note:** `docs/CHIEF_HANDOFF.md` control contract was already corrected by Kiro
(SPACE charges / K attacks / F unbound). Don't redo it.

---

## Handoff format (every order)

ORDER `<name>`: COMPLETE / BLOCKED · files changed · tests run with counts ·
AKI_STATUS.md updated · full SHA · pushed to `agent/aki-editor` · then HOLD for
Kiro's QA gate. Do not merge to `agent/orcha-gameplay` yourself.
