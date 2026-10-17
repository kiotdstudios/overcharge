# AKI ORDER — Preserve Uncommitted Waste Zone WIP

**From:** Kiro (Technical Chief) · **Authority:** Chief, Order 002 P1 · **Priority: P1 — do this before any other work**

## Situation

Your clone at `C:\Users\diepowel\Documents\OVERCHARGE` (branch `agent/aki-editor` @ `5192356`) carries uncommitted work that exists nowhere else. If that working tree is ever reset or the machine fails, it is gone.

## Verified contents (Kiro read-only inspection, 2026-09-10)

Modified tracked files:
- `src_scroll/entities.js` — DrainEnemy overhaul (~148 lines changed: new behavior/animation blocks)
- `src_scroll/levels/level1.js` — legacy JS level edits (~137 lines)
- `src_scroll/main.js` — swaps `background.js` for new `parallax.js` layer system; registers `LEVEL2`
- `index.html` — inline SVG favicon (lightning bolt)

Untracked new files:
- `src_scroll/levels/level2.js` — "NEON DISTRICT" level (legacy JS format)
- `src_scroll/parallax.js` — tileable parallax layer renderer

Deleted (staged-as-deleted in worktree): 6 obsolete concrete-tileset PNGs (`assets/tiles/concrete*.png`, root `pixellab-tileset-*.png`).

All timestamps 2026-09-04 — this work predates the JSON level pipeline migration.

## Critical constraint

The current shared branch **forbids hand-authored JS level mirrors** (`src_scroll/main.js` on `agent/orcha-gameplay`: "There is NO hand-authored JS mirror. Do not reintroduce one."). This WIP must therefore be preserved on its own branch, **not** merged into `agent/aki-editor` or the shared branch as-is.

## Your instructions

From `C:\Users\diepowel\Documents\OVERCHARGE`:

```powershell
git switch -c wip/aki-waste-zone-legacy
git add -A
git status            # verify the file list matches the inventory above — nothing extra
git commit -m "wip: preserve Waste Zone gameplay WIP (parallax, DrainEnemy, level2 JS-era)"
git push -u origin wip/aki-waste-zone-legacy
```

Then report the full commit SHA to Kiro/Chief and update `AKI_STATUS.md`.

Do NOT rebase, squash, or cherry-pick this onto active branches. Salvage (porting parallax/DrainEnemy work to the JSON-pipeline architecture) will be a separately assigned lane after Chief review.
