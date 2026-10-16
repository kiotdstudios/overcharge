# CODEX 03 — revised tenant order review

The round-14 order in `docs/KIRO_ORDER_CODEX_03.md` supersedes the hatch/hidden-room brief. This branch removes that obsolete code. Nothing here is registered in `ASSET_MANIFEST.json` or placed in a level. Scene images are composites for review, not live gameplay captures.

| Task | Status | Tries | Evidence |
|---|---|---:|---|
| 1 Window tenant | PASS for art review: six hot/fanning frames, six relief frames, 176×176 transparent. | 1 each | `assets/sprites/npc-window-woman-codex03-review/` |
| 2 Four-panel apartment | PASS for art review: 192+160+160+128 by 256, upper open window, blank AC mount wall below, recessed switch area. Blue 74.3%, warm 6.2%, purple 4.1%. | 3 including revision | `assets/objects/night-city-buildings/apartment_codex03_review/tiling_proof.png`, `family_comparison.png` |
| 3 Wall plate | PASS in synthetic engine test: 16×24 OFF/ON and three flip frames; `style:'plate'` retains 16×24 hitbox and checkpoint rewind. Parity rule checks wall placement 40–56 px above walkway. | 1 | `assets/objects/night-city-props/wall-plate-switch-review/contact_dark_light.png`; `_dev/codex03_tenant.mjs` |
| 4 Dropped pip | PASS for art review: four 24×24 poses from the approved HUD pip. Generated attempts read as blobs at 1× and were discarded. | 2 generated attempts, then HUD-derived | `assets/objects/pip-pickup-codex03-review/idle/contact_dark_light.png` |
| 5 Capacitor | PASS for art review: graphite/amber canister, 48×48 item, idle 6/glow 4/spin 8, icon 24×24. | 1 per sheet | `assets/objects/capacity-upgrade/codex03-review/contact_dark_light.png` |
| 6 Tenant reaction | PASS in synthetic test: linked source selects `poweredLines`, plays relief once and holds, rewinds with checkpoint. | 1 | `src_scroll/npc.js`; `_dev/codex03_tenant.mjs` |
| 7 AC power | PASS in synthetic test: uncharged HVAC capacity 3 stays off until linked plate costs 2 charge or it is filled directly. Fan, hum, cool-air particles activate. | 1 | `src_scroll/electricity.js`; `_dev/codex03_tenant.mjs` |
| 8 Achievements | PASS in test: GOOD NEIGHBOR persistence, queued 3-second toast, three-note sound, storage fallback, off switch. | 1 | `src_scroll/achievements.js`; `_dev/codex03_tenant.mjs` |
| 9 Ladder | PASS for art review: transparent 128×605 graphite/rust ladder, readable at 32×192, open ends. Original unchanged. | 1 | `assets/objects/night-city-props/ladder_review/old_new_game_size.png`, `game_05_1x.png` |

Each art folder has dark/light 4× contact sheets and 1×/3× game-scene composites. `_dev/codex03_art_audit.json` reports zero size, border, opacity or palette failures; `_dev/codex03_art.py` reproduces them. Engine checks: `_dev/codex03_tenant.mjs` PASS, `_dev/fence_switch.mjs` PASS, `_dev/energy_authority.mjs` PASS, `_dev/test_electricity.mjs` PASS, `_dev/parity_regression.mjs` 627/0. The tenant uses a synthetic level because Aki has not placed the AC, plate and NPC in Level 1. Live placement and final dialogue remain with Chief/Aki. HOLD for art review; do not merge to live yet.
