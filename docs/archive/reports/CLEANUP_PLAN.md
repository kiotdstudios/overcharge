# Repository Cleanup Plan (Order 002 P4 — PROPOSED, awaiting Chief approval)

No REMOVE action has been executed. Archive-before-delete policy applies.

## KEEP ACTIVE (required by Builder/runtime/tests/workflow)

`index.html`, `editor.html`, `src_scroll/**`, `editor/**`, `src_scroll/levels/level1.json` + `level2.json`, `_dev/parity_regression.mjs`, `_dev/test_electricity.mjs`, `scripts/build_info.mjs`, `scripts/build_manifest.mjs`, `start.bat`, `PUBLISH_LEVELS.bat`, `docs/**`, `assets/ASSET_MANIFEST.json`, `assets/PURPLE_CITY_INDEX.json`, `assets/asset_index.json` (generated, tolerated), sprite folders `idle_2.0 / walking / jumping / running / charge_anim / discharge / drone / generator 1`, `assets/objects/*` (PNGs), `assets/tilesets/purple_city/**` (Purple City = sole active environmental pack), `assets/backgrounds/mid_city.png` (manifest-referenced), `assets/sprites/drain_enemy/` (manifest-referenced), status files.

## ARCHIVE / QUARANTINE (one reviewed commit each; keep history)

| Item | Reason |
|---|---|
| `src/**` + `index_classic.html` + `assets/sprites/idle/` + `assets/sprites/charge/` | Legacy prototype unit; only entry is quarantined `index_classic.html?keep=1` |
| `Static_Shock_Puzzle_Platformer_GDD_v1.pdf` | Historical GDD; move out of publicly served root |
| `Vibe Coding - PixelLab.pdf` | Tooling tutorial, unrelated to runtime |
| Raw GIF folders: `assets/sprites/Charge Animation/`, `running animation/`, `helicopter drone/` | Source exports; runtime uses extracted PNG frames |
| `assets/purple city.zip` | Source zip already extracted; keep copy in `Documents\Archived` |

**License hold:** `Purple city assetpack by Svor.pdf` stays in the repo until its license/attribution terms are read; if it carries attribution requirements it moves to `docs/` or `assets/`, never out of the repo.

## REMOVE (proposed only — Chief approval required before execution)

| Item | Proof of safety |
|---|---|
| `src_scroll/levels/level1_prev_backup.json` | Zero references; original preserved at rollback commit `00ba0ea` |
| `scripts/convert_levels.mjs` | One-shot migration; its input files no longer exist; would fail if run |
| `assets/objects/gate_electric_spritesheet.json` | No code reference; sheet layout is hard-coded in `electricity.js` |
| QA artifacts: `assets/tilesets/purple_city/waste/_qa/`, `_contact_sheet_batch1.png`, `_contact_sheet_batch2.png` | Art-review strips, unreferenced by manifests/code |

## Documentation fixes (assign to owners)

- `README.md` Architecture section still documents legacy `src/` layout — rewrite for `src_scroll/` + `editor/` + JSON pipeline (front page of the public repo).
- `editor/README.md` claims `asset_index.json` is fetched by main.js — stale; actual source is `ASSET_MANIFEST.json`.
- `KIRO_STATUS.md` contains duplicated Order #2 / Order #4 blocks (append defect) — dedupe without erasing content.
