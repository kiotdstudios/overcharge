# Aki: laptop sync verification, then hero/traversal work

User request, 2026-09-29: continue authorized work while they are away; they will playtest at work. Finish your current verticality task first. Read this request now and reply to the sync questions; character/mechanics integration follows your current delivery.

## Reply required: did the laptop receive the necessary sync changes?

Your `AKI_VERTICALITY_PRECHECK.md` correctly says you have not inspected the live browser. Branch containment and passing SAVE tests do not prove the laptop's open tab uses the deployed editor.

Please write `docs/AKI_LAPTOP_SYNC_REPLY.md` answering:

1. Did you integrate the latest shared gameplay line without overwriting your current work? Give full local/remote SHAs and dirty-file inventory. The Builder redesign is on gameplay after `56ee313`; retain `editor/workspace.js`, its stylesheet, and the generated import map.
2. Open the actual Pages game and editor on the laptop (not localhost). Record full URLs, loaded editor/main module version, stylesheet version, and the network-fetched level JSON checksum. The deployed redesign's module/style version was `e01f95cf5920adaa` when published; later changes legitimately replace it. Chief independently verified deployment and a live Pages browser boot with that matching module and stylesheet, no console errors, and level1 checksum `58F67A50`.
3. Verify SAVE reads and writes `agent/orcha-gameplay`, not `main` or your feature branch. Do not expose the token. If testing a save, use a disposable QA level or a backup, never replace the user's current level with a stale copy.
4. Compare both live URLs' fetched level1 JSON to the same canonical branch file, then verify the game actually uses that source. TEST mode intentionally uses local unsaved editor data and is not cross-computer sync evidence. Preserve/export unsaved drafts before navigating or reloading an existing editing tab.
5. If you cannot inspect the browser on that laptop, state the limitation and the remaining user action explicitly. Do not claim two-PC verification complete.

Chief's current evidence: public Pages serves the new workspace; browser functional checks pass locally; the later Builder save `0d2f981` landed directly on gameplay. This is progress, not proof of what the other laptop currently displays.

## Next asset set found and staged for both agents

The tested pack is now available in this repository at `assets/sprites/hero-v3/`: 16 animation states, eight frames per state and direction, 256 PNGs. The user confirmed `overcharge-v2/assets/sprites/hero-v3` as the authoritative tested source. All 256 staged frames were verified byte-identical to that folder, and its latest manifest was copied. The related export pack is `overcharge-player-v3`. It is staged only: the production renderer still uses the previous character until the integration is tested.

States: idle, walk, run, jump, ledge-climb, death, hurt, stunned, energy-strike, projectile-cast, wall-slide, grapple, ladder-up, ladder-down, absorb, discharge. Review the pack manifest and `integration-audit.json` before activation.

**Important audit finding:** 254 frames are 512×512; `walk/east/frame_003.png` and its west counterpart are 1254×1254 in both the source pack and tested playground. The README's uniform-size claim is stale. Resolve per-frame visual bounds, feet alignment and visible scale before using these frames in the main game. Preserve originals; do not silently stretch/crop or substitute an unrelated pose. Suggested 80px display and [256,496] anchor are reference values to verify, not permission to alter player collision dimensions.

## Ordered integration after verticality

1. Chief/runtime: port the tested hero animator and attack attachments selectively; preserve current movement, hitboxes, energy rules, enemies, gate contact/charge logic and level data. Review actual playground changes rather than copying its entire player.js over the shared branch. Verify idle, walk/run, airborne states, hurt/stun, absorption/discharge, energy-strike and projectile-cast against real runtime events. Animation availability does not mean the mechanic exists.
2. Aki/Builder: update the player-spawn preview and add clear Player and Traversal asset groups alongside existing roof/Electric/Enemies groups. Give ladders and supported climb markers real placeable objects with saved geometry and editable properties. Runtime animation states belong in a character preview/test surface, not as duplicate static player decorations.
3. Runtime traversal: add ladder ascent/descent and ledge climbing with explicit traversal states and real geometry. Define entry, upward/downward controls, endpoint exit, jump-off, interruption and death/respawn cleanup. Up/W conflicts with existing jump, so ladder activation must depend on a ladder overlap rather than changing the global jump binding. Down/S descent must work. Ledge climbing must check free landing/head space and never pass through solids or teleport to unrelated rooftops. Do not infer climbing merely from wall collision.
4. Combat: connect existing attack inputs to their respective new animations and effects; verify damage, projectile emission point, cooldown, facing and energy consumption remain consistent. Do not invent charged attack rules from a sprite's name. Add a Combat filter for genuinely placeable combat test objects when supported; label animation-only previews separately.
5. QA fixture: make a separate reproducible mechanics test level with spawn, ascending/descending ladder, safe climbable ledge, blocked-headroom case and attack targets. It should be loadable in Builder and TEST on both computers. Do not rearrange the user's level1 or gate to build this fixture. Report controls and exact playtest steps for when the user reaches work.

## Delivery and coordination

Reply with current task status and sync verification first. After your verticality delivery, report each integrated feature and any missing mechanic honestly in `docs/AKI_HERO_TRAVERSAL_DELIVERY.md`, including pushed SHA, deployment evidence, fixtures, tests and browser screenshots. Regenerate module/style versions with every UI/runtime change. Do not merge the whole divergent Aki branch without reviewing the actual diff. Preserve snapshots, save results, filters and all unsaved user data.
