# KIRO ORDER: CODEX 04 (read the CODEX 03 review verdict, then longer idle cycles for the two bus stop NPCs)

## PART 0. Verdict on your CODEX 03 branch (`codex/order03`), 2026-10-16. READ THIS FIRST.
Chief reviewed your handoff. Kiro took the parts that are wanted and **did not merge the rest**. Do not merge `codex/order03` and do not rebase your next work on it as is.

**Wanted and now on the live line (Kiro integrated them, you do not need to redo them):**
- The four-panel tenant apartment art (registered as `building_nc_tenant_left / _wall / _front / _right`, folder `assets/objects/night-city-buildings/apartment_tenant/`).
- The window tenant NPC art, hot and relieved clips (`npc_window_tenant`, `npc_window_tenant_relieved`, folder `assets/sprites/npc-window-tenant/`), her reaction to a linked object (`poweredAssetId`, `linkedObjectId`, `poweredLines`, `Level.isPowered`), the achievements system (`src_scroll/achievements.js`, GOOD NEIGHBOR toast and sound) and the AC hum and cool-air particles.
- Aki's Builder work (Uncharged checkbox, reactive NPC fields) is merged too, so the tenant can be placed and edited in the Builder.
- All of it is **placed in Level 1** for Chief to test: building on the upper walkway, the tenant in the big window, an ordinary HVAC unit under her window.

**REJECTED by Chief. Delete from your branch and never bring back:**
1. **The wall switch.** Chief: "codex wired AC unit to a wall switch i dont want that at all. AC unit should work how it's been working as a night city prop powered object." The AC is **an ordinary charged HVAC prop**: charge it with Space and it is on (fan, hum, particles, tenant relieved); zap the charge back out with E and it is off (the tenant is hot again; the achievement stays). **No switch of any kind is used for the AC and no new switch style is wanted anywhere.** Remove from your branch: `style: 'plate'` in `Switch` (`electricity.js`), the plate art (`assets/objects/night-city-props/wall-plate-switch-review/`), the `_flipT` and `_switchOn` fields, `requiresFullPower`, `Level.isPowered`'s switch lookup, the plate cases in `_dev/parity_regression.mjs`, and `_dev/codex03_tenant.mjs`'s plate test. (Kiro checked: none of it is in the Builder or on the live line.)
2. **The new ladder.** Chief: the colour does not work either, and **the ladder already in the game stays.** Task 9 is cancelled. Do not touch `assets/objects/night-city-props/ladder/ladder.png`. Delete `ladder_review/`.
3. **The "full power" AC rule** (`requiresFullPower`: the AC only counted as on at full charge). Gone; the standard rule applies (on while it holds any charge).

**How you got this wrong, and the new rule:** Chief saw your review composites and they show an **older iteration of the game** (old hero portrait and HUD, old ladder, old pylon-less street). You built against screenshots, not the running game. **From now on, run the CURRENT game before you design or show anything.** Check out the live line (`agent/orcha-gameplay`), serve it (any static server on the repo root, open `index.html`), play Level 1 to the part you are working on, and take your screenshots from that. Every review image must be a **real capture of the current build**, not a composite. If your branch does not contain the latest live line, rebase or merge it first. Say in your report which commit you captured from.

**What is still yours:** the pip pickup art and the Capacitor Module art from CODEX 03 (not yet reviewed by Chief), then Part 1 below. Re-shoot the pip and capacitor screenshots from the current game.

## PART 1. Longer idle cycles for the two bus stop NPCs

**From:** Kiro, Technical Director | **To:** Codex | **Authority:** Chief, 2026-10-16 (round 15): "add that to codex 4, need longer animation cycles for those 2 npcs"
**Order of work:** after the art tasks of `KIRO_ORDER_CODEX_03.md`; independent of `KIRO_ORDER_CODEX_02.md` (the bar and charge rules), so it can be done before or after it.
**Branch:** your own branch, push as `AGENTS.md` describes. Never force-push. Do not merge to the live line.
**Status:** work order, nothing started.

## What Chief asked, and what Kiro found
Chief: "are bus stop npc moving? I thought I gave them an idle animation." They do have one, and it is wired, but it reads as almost still:
- Manifest ids `npc_bus_stop_homeless` ("Bus stop - unhoused man") and `npc_bus_stop_backpack` ("Bus stop - backpack commuter"),
  art in `assets/sprites/npc-bus-stop/homeless-idle/00..04.png` and `backpack-idle/00..04.png`, 128 x 128 frames, **5 frames at 3 fps, looping**:
  a cycle of only **1.7 seconds**.
- Kiro measured the frames (share of pixels that change from one frame to the next, loop order 0, 1, 2, 3, 4, 0):

| Frame step | Unhoused man | Backpack commuter |
|---|---|---|
| 0 to 1 | **98.7%** | **99.1%** |
| 1 to 2 | 5.7% | 4.5% |
| 2 to 3 | 11.0% | 2.8% |
| 3 to 4 | 11.5% | 16.1% |
| 4 to 0 | **98.2%** | **99.0%** |

  So frames 1 to 4 are a 1 to 2 px breath, and **frame 0 is a different render of the figure**, so the loop visibly **pops** at the seam (0 to 1 and 4 to 0).
  A person standing at the stop sees a flicker every 1.7 s and no real life. Chief wants **longer cycles**.
- Where they are placed (do not touch the level): `npc_bus_stop_homeless_01` at x 2230, `npc_bus_stop_backpack_01` at x 2320 in `level1.json`, facing right, no patrol, no dialogue.

## Required result, for both NPCs
1. **A long cycle:** the animation must not visibly repeat in under **8 seconds**.
2. **At least three distinct beats** in that time, each readable at game size (the NPC is drawn 60 px tall):
   - **Backpack commuter** (phone, bag): thumb scrolls the phone; looks up the street toward where the bus comes from, then back down; shifts weight foot to foot;
     adjusts the backpack strap; a quick glance at the phone time or a small impatient sigh. Keep him facing right.
   - **Unhoused man** (long coat, scarf, bedroll): slow breath with the coat lifting; pulls the scarf up or tucks his chin; rubs or blows on his hands for warmth;
     glances down the street and back; shifts his feet. Keep it quiet and dignified, not comic.
3. **No pop at the seam.** The last frame must lead into the first without a jump. **Measure it** with the same method as the table above and report the table for
   the new art. Pass if no frame-to-frame step changes more than **35% of the opaque pixels** (a stride or an arm swing may approach it, a render change must not),
   and the loop seam is no larger than the largest step inside the cycle.
4. **Same figure:** same character, outfit, palette and scale as the current frames (use frame 1 to 4 of the current set as the model; frame 0 is the odd one out, do not copy it).
   128 x 128, transparent, fully transparent border, **feet planted** (`footYByFrame` 123 on every frame unless a deliberate step changes it, and then list it per frame),
   and the same `trim` box so the NPC does not slide or resize when the loop restarts. No semi-transparent pixels unless the current frames have them.
5. **Visible motion:** at least a third of the frames differ from the neutral pose by **8% or more** of the opaque pixels, so the motion reads at 1x and 3x.

## Two ways to build it (you choose, report which)
- **A. One long loop.** For example 24 to 48 frames at 6 to 8 fps (a 6 to 10 s cycle). `frame_count`, `fps` and `loop` in the manifest entry change; nothing in the engine changes.
  Simple and fully supported. The NPC engine also supports a `frameOrder` list (`npc.js`), so you may draw fewer distinct poses and sequence them to lengthen the cycle.
- **B. A short breathing loop plus occasional one-shot beats,** the pattern the smoke-break workers already use (`npc.js` `ambient`: idle loop, then a one-shot action,
  then a fresh randomized dwell, seeded per NPC). This makes the timing less mechanical. Today `ambient` supports exactly one one-shot (`smokeAssetId`). If you choose B,
  extend it **backward compatibly** to a list (for example `ambient.actionAssetIds`), picking one at random each time from the seeded generator, keep `smokeAssetId` working
  unchanged, and add tests (the two smoke workers still behave identically; the list picks all actions over many cycles; two NPCs with different seeds never sync).
Kiro's preference is B for the commuter (phone checks feel random) and A is fine for the quiet unhoused man. Either way the **minimum is the long, popless cycle** above.

## Process
1. Put the new frames in **`assets/sprites/npc-bus-stop/review/`** (do not overwrite the current frames yet), with: a contact sheet at 4x on a dark and a light ground, the
   frame-step table, an animated GIF at game speed, and a screenshot at 1x and 3x next to the hero at the bus stop.
2. **Do not register in `ASSET_MANIFEST.json` or swap the live files until Chief approves.** When he does, replace the files and the manifest entries in one commit, keep the
   `id`s (`npc_bus_stop_homeless`, `npc_bus_stop_backpack`) so `level1.json` does not change, and keep a rollback note.
3. Stop after **two** weak tries on one NPC and report what failed. Do not ship weak art.
4. Run the full suite (`node _dev/run_all.mjs`). The baseline right now is 2801 passed and 7 failed (`level2_fork` 2, `npc_dialogue` 4, `prop_sources` 1, plus two suites that crash); a new failure is a stop sign.
   Add a test that reads the manifest and checks both NPCs' `frame_count / fps` is at least 8 seconds (or that the ambient list is set), and that every frame file exists.

## Report
Report as `CODEX 04`: PASS/FAIL per NPC, A or B and why, commit SHA, files, the frame-step tables (old and new), the sheets and GIFs (paths), tries per NPC, and what you did not do. Then HOLD.

## Do not
Touch `level1.json` or any level file. Change the NPCs' ids, size, position, facing or dialogue. Redraw the smoke workers or the streetlamp woman. Register unapproved art.
