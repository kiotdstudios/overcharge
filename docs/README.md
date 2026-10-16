# OVERCHARGE docs: start here

**The game design is ONE document: [`design/GAME_DESIGN_V2.md`](design/GAME_DESIGN_V2.md).** The levels are specified in
[`design/LEVEL_DESIGN_V2.md`](design/LEVEL_DESIGN_V2.md). Nothing else in this repository is a game design document.
If you found a different "GDD", a "level breakdown", a README description of the levels, or a PDF, it is old (see `archive/`) and wrong.

## Where things live

| Folder | What is in it | Read it? |
|---|---|---|
| [`design/`](design/) | The source of truth: `GAME_DESIGN_V2.md` (the game), `LEVEL_DESIGN_V2.md` (the levels), the story canon, the Level 1 roadmap PDF | **Yes. Always first.** |
| [`orders/`](orders/) | The work orders that are **active now**, one file per order (`KIRO_ORDER_<AGENT>_<NN>.md`), plus standing rules (`KIRO_STANDING_*.md`) | **Yes, your own latest order.** Higher number = newer. |
| [`rulings/`](rulings/) | Decisions by Chief or Kiro that still bind the code (exit costs 8, chest and pip reserve, fence and crate semantics) | When your work touches that system |
| [`reference/`](reference/) | Technical specs and how-tos: `LEVEL_SCHEMA.md`, building asset spec, git governance, testing guide, movement metrics, mockups, vendor PDFs | When you need the detail |
| [`archive/`](archive/) | Everything finished or replaced: old orders (`orders/`), old reports and findings (`reports/`), the v1 design document | **No.** History only. If it disagrees with `design/`, `design/` wins. |

Status logs stay at the repository root and are appended to: `KIRO_STATUS.md`, `AKI_STATUS.md`, `ORCHA_STATUS.md`.
Other roots: `src_scroll/` is the live game, `editor/` is the Builder, `assets/` holds art and `ASSET_MANIFEST.json`, `_dev/` holds the tests
(`node _dev/run_all.mjs`). `src/` and `index_classic.html` are an obsolete prototype; ignore them.

## Rules for every agent

1. **Read `design/GAME_DESIGN_V2.md` before designing or building anything.** Where it marks a point CONFIRMED, Chief decided it. RECOMMENDED means Kiro suggests it and nobody has approved it yet. OPEN means undecided. Do not build OPEN or RECOMMENDED items without an order.
2. **Do not read `archive/` to learn what the game is.** Do not follow an old order. Only the file in `orders/` with your name and the highest number is your work.
3. **Run the current game before you show anything.** Check out `agent/orcha-gameplay`, serve the repo root, play Level 1, and take screenshots from that build. Never composite screenshots, never reuse old ones.
4. `src_scroll/levels/*.json` belong to Chief. Edit one only with a written order that names the file, and log it in `orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.
5. New orders go in `orders/`. When an order is finished and reviewed, Kiro moves it to `archive/orders/`.
6. If a path in an old comment or note no longer exists, look it up in [`MOVED.md`](MOVED.md).

## Current orders (updated by Kiro)
See [`orders/README.md`](orders/README.md).
