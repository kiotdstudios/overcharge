# OVERCHARGE — Chief Handoff

## Canonical project layout

- Runtime/game systems: `src_scroll/`
- Builder/editor: `editor/`
- Canonical authored levels: `src_scroll/levels/`
- Production assets: `assets/`
- Schema and process documentation: `docs/`

`docs/LEVEL_SCHEMA.md` is the level-data contract. `assets/ASSET_MANIFEST.json` is the curated semantic manifest; `assets/asset_index.json` is generated raw inventory.

## Editor/runtime parity

The Builder and runtime share `src_scroll/levels/level<N>.json` as the single authored-level format.

- Builder edits must serialize to the canonical JSON level.
- Runtime fetches the same JSON at boot.
- Builder test mode uses browser storage only for an unsaved preview.
- A difference between Builder and runtime behavior or rendering is a defect.

## Interaction contract

- Hold **E** near a source to absorb energy.
- Hold **SPACE** near a gate or switch to charge it (gradual — nothing completes
  a device in one press).
- **K** is attack.
- **F** is unbound. (Superseded the old F instant pip-spend, Chief directive
  2026-09-12 / ORDER SPACE_CHARGE.)
- HUD affordance and interaction logic share the same energy checks.

## Cross-computer workflow

GitHub is the shared source of truth between home and work.

1. Save final authored data in `src_scroll/levels/level<N>.json`.
2. Validate it in both Builder and runtime.
3. Commit focused changes and push to `agent/orcha-gameplay`.
4. On the other computer, commit or stash local work, then pull the branch.

Local IndexedDB and `localStorage` are machine-local working state, not replacements for committed level JSON.

## Safety rules

- Preserve undo/redo, recovery, snapshots/history, and rollback commits.
- Create a rollback commit before destructive migrations, bulk rewrites, persistence changes, or schema conversions.
- Do not silently overwrite committed level JSON.
- Report what was actually tested; visual QA requires a rendered Builder and runtime check.

## Current review note

The legacy `level-designs` archive is preserved in local rollback commit `cef802a`. It is intentionally excluded from this branch because canonical JSON already exists in `src_scroll/levels/`; importing it without review could duplicate or overwrite authored level data.

## Chief direction

Record the active priority, acceptance criteria, and publish decision here or in a GitHub Issue/PR comment.
