# AKI TASK REQUEST — Builder Save Overwrite Confirmation + Naming Convention

**From:** Kiro (Editor↔Runtime Parity & Regression Engineer)
**Requested by:** Chief
**Date:** 2026-09-10
**Priority:** High — active level-authoring workflow
**Ownership:** This is Builder/editor work in Aki's lane. Kiro documented it but made no editor changes.

---

## What Chief asked for

1. **Overwrite confirmation on save.** When saving a level whose canonical file already exists (same level number), the Builder must ask the user whether to overwrite before writing. Today it writes silently.
2. **Permanent level naming convention.** All levels are named `(number)_(NAME).json`, e.g. `1_NEON_RISE.json`. The Builder already produces this descriptive filename; keep it, and keep writing the canonical runtime mirror `level<N>.json` alongside it.

## Current behavior (verified in code)

`editor/persistence.js :: saveCurrentLevel()`:

- Preferred path opens the chosen save folder and calls
  `dir.getFileHandle(filename, { create: true })` then writes — **no existence check, no prompt**.
- It then also writes the canonical `level<N>.json` the same way — **also silent**.
- The IndexedDB mirror (`_mirrorSave`, key `num:<N>`) likewise replaces the prior record silently.

So a save for level 1 silently replaces both `1_NEON_RISE.json` and `level1.json` on disk.

## Requested change

In `saveCurrentLevel()`, before the first write of each target file in the save-folder path:

1. Check whether the file already exists (e.g. `dir.getFileHandle(filename)` without `{ create: true }`, treating `NotFoundError` as "does not exist").
2. If it exists **and belongs to the same level number being saved**, show a confirmation:
   - Suggested copy: `level1.json already exists (NEON RISE). Overwrite it?` with Overwrite / Cancel.
   - One prompt per save action is enough — do not prompt twice for the descriptive file and the canonical file; they are the same logical save.
3. On Cancel: abort the save, leave `state.dirty` true, return `{ ok: false, method: 'fsa-dir', message: 'Save cancelled — existing file kept.' }`. **Never fake success.**
4. On Overwrite: proceed exactly as today (descriptive file + canonical `level<N>.json` + IndexedDB mirror + snapshot-on-save).

Optional quality-of-life (Aki's call): a "don't ask again this session" checkbox, since repeated saves of the same level are the normal iteration loop. If added, the first save of a session must still prompt.

## Constraints

- Do **not** change the canonical filename contract. The runtime only loads `src_scroll/levels/level<N>.json`; the descriptive `N_NAME.json` is the human-facing variant.
- Do **not** prompt for brand-new files (nothing to overwrite).
- Do **not** break the fallback tiers (per-file picker already prompts natively; Blob download can't check — leave those as-is).
- Preserve undo/redo, snapshots, recovery, and the IndexedDB mirror behavior.
- Per project rules: no schema changes, no silent overwrite of committed level JSON, rollback commit before any persistence-behavior change.

## Acceptance criteria

1. Saving a level whose `level<N>.json` already exists in the chosen folder shows an overwrite confirmation.
2. Cancel leaves both files untouched and the editor still marked dirty.
3. Overwrite produces byte-identical results to today's save path.
4. Saving a level number with no existing file writes without any prompt.
5. `node _dev/parity_regression.mjs` still passes (63 checks) — the save output format must not change.

## Verification suggestions

- Manual: save Level 1 twice into a test folder; second save must prompt. Cancel, confirm file mtime unchanged.
- Manual: save a new Level 9; no prompt.
- Report actual rendered/browser behavior in AKI_STATUS.md per commit discipline.

---

*Contact Kiro (agent/kiro-parity) if the save-path behavior needs new parity regression coverage after the change.*
