# docs/archive: DEAD. Superseded design, orders and reports. Do not read to learn the game.

Since round 15c this folder also holds **every finished order** (`orders/`) and **every old report, finding and handoff** (`reports/`). The old paths are in [`../MOVED.md`](../MOVED.md).

These files are **kept unchanged** as history. They are no longer the source of truth.
The current design lives in:

- [`docs/GAME_DESIGN_V2.md`](../design/GAME_DESIGN_V2.md): the game
- [`docs/LEVEL_DESIGN_V2.md`](../design/LEVEL_DESIGN_V2.md): the levels, with Level 1 specified in full

Do not edit anything in this folder. If something here is wrong or stale, correct it in the V2
documents and say so there. Each file below was moved with `git mv` and verified byte-for-byte
identical before and after (SHA-256 prefixes in the table).

## What was archived

| Archived file | Former path | What it was | Superseded by |
|---|---|---|---|
| `SUPERSEDED_Static_Shock_Puzzle_Platformer_GDD_v1.pdf` (renamed in round 15c so nobody mistakes it for the GDD) | `/Static_Shock_Puzzle_Platformer_GDD_v1.pdf` | Original game design document, v1.0 (titled "STATIC SHOCK") | `GAME_DESIGN_V2.md` |
| `OVERCHARGE_LEVEL_BREAKDOWN.md` | `docs/OVERCHARGE_LEVEL_BREAKDOWN.md` | Level-by-level teaching plan for Levels 1 to 5, plus the recorded overrides | `LEVEL_DESIGN_V2.md` |
| `LEVEL3_DESIGN_BRIEF.md` | `docs/LEVEL3_DESIGN_BRIEF.md` | Builder brief for Level 3 | `LEVEL_DESIGN_V2.md` (roster) |
| `LEVEL4_5_DESIGN_BRIEF.md` | `docs/LEVEL4_5_DESIGN_BRIEF.md` | Builder brief for Levels 4 and 5 | `LEVEL_DESIGN_V2.md` (roster) |
| `LEVEL5_DESIGN_BRIEF.md` | `docs/LEVEL5_DESIGN_BRIEF.md` | Builder brief for the crate level | `LEVEL_DESIGN_V2.md` (roster) |
| `KIRO_WORLD_BUILD_PLAN_LEVEL1.md` | `docs/KIRO_WORLD_BUILD_PLAN_LEVEL1.md` | First Level 1 world-building analysis and plan | `LEVEL_DESIGN_V2.md` section 3 onward |
| `LEVEL1_HIGH_LOW_ROUTE_PREVIEW.md` | `docs/LEVEL1_HIGH_LOW_ROUTE_PREVIEW.md` | Description of the earlier Level 1 high/low route | `LEVEL_DESIGN_V2.md` section 4 |

SHA-256 prefixes at the time of the move: GDD `3b7cd73dec5d32ba`, breakdown `07a985b665fb16d5`,
Level 3 brief `5a6ee0865a834a72`, Level 4/5 brief `9c5d9d557b442846`, Level 5 brief
`f2357a4eb47a80a3`, world-build plan `67c7a6c8a0948ed4`, route preview `d096183700a11d45`.

## Links that still point at the old paths

Orders and status records are **active and unchanged**, so some of them still link to the former
paths above. That is deliberate. Use the table to find the file. Known links:

- `OVERCHARGE_LEVEL_BREAKDOWN.md`: `docs/CHIEF_RULING_EXIT_COST_8.md`, `docs/KIRO_HANDOFF_MASTER.md`,
  `docs/KIRO_ORDER_AKI_08.md`, `docs/KIRO_ORDER_ORCHA_11.md`, `docs/KIRO_ORDER_ORCHA_13.md`
- `LEVEL3_DESIGN_BRIEF.md`: `KIRO_STATUS.md`, `ORCHA_STATUS.md`, `docs/KIRO_ORDER_ORCHA_02.md`,
  `docs/WEEKEND_PUSH_BRIEF.md`
- `LEVEL4_5_DESIGN_BRIEF.md`: `KIRO_STATUS.md`, `docs/AKI_ORDER_QUEUE.md`, `docs/KIRO_ORDER_SHIP_3DAY.md`,
  `docs/KIRO_RULING_CRATE_TIMED_V1.md`, `docs/WEEKEND_PUSH_BRIEF.md`
- `KIRO_WORLD_BUILD_PLAN_LEVEL1.md`: `AKI_STATUS.md`, `docs/KIRO_ORDER_AKI_15.md`
- `Static_Shock_Puzzle_Platformer_GDD_v1.pdf`: `docs/CLEANUP_PLAN.md`

No code, test or script reads any archived file by path (checked across `src_scroll`, `editor`, `_dev`,
`scripts`, `_kiro`, `.kiro`, `.agents`, `.claude` and every HTML, JSON and batch file).

## What was deliberately NOT archived

Technical references, work orders, status records and rulings stay active. In particular:

- **Rulings** (`CHIEF_RULING_*`, `KIRO_RULING_*`, `CHIEF_EXIT_EXPLORATION_RULE.md`,
  `KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`): binding decisions, cited from code comments.
  `LEVEL_DESIGN_V2.md` restates the ones that still hold.
- **`KIRO_FINDING_CARRY_OVER_VS_SELF_SUFFICIENCY.md`**: a ruling in all but name ("every level must be
  completable from zero carried charge"). Still law.
- **`PLAYER_MOVEMENT_METRICS.md`**: a technical reference. It is stale on several numbers (see
  `LEVEL_DESIGN_V2.md` appendix) and gets regenerated when the controller is retuned.
- **`LEVEL_SCHEMA.md`**: read by a test. Must stay in `docs/`.
- **Orders** (`KIRO_ORDER_*`, `ORCHA_ORDER_*`, ...) and **status records** (`KIRO_STATUS.md`,
  `AKI_STATUS.md`, `ORCHA_STATUS.md`, deliveries, findings): history of what was asked and done.
- **Asset specs and art notes** (`BUILDING_FAMILY_ASSET_SPEC.md`, `CHIEF_NEON_RISE_DRESSING.md`,
  `docs/concepts/`): art direction, not game design.
