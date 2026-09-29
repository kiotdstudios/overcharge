# OVERCHARGE agent guidance

## Publishing and verification
- Before geometry fixes, establish the intended playable route and test that outcome, not merely the selected collision rule. A passing collision test does not prove a level route is usable. For cross-machine differences, obtain actual browser URLs and loaded-level sources before attributing them to local Git branches.
- Before committing Builder JavaScript changes, run `node scripts/version_editor.mjs` (also runs through `scripts/build_info.mjs`). Commit the generated `editor.html` import map so entry and dependency URLs change together. Do not use an unversioned build-info import as the cache-busting bootstrap.
- `PUBLISH_OVERCHARGE.bat` publishes committed code from the Codex worktree; it does not save or commit Builder edits in another clone. Check the selected save folder, branch, working-tree changes, and remote commit before claiming a level was published.
- On Windows, use PowerShell literal paths and command-specific `safe.directory` when required. Account changes between `CodexSandboxOnline` and `CodexSandboxOffline` require rechecking credential access; do not repeat a Git authentication path that has already crashed.

## Session retro
- After finishing a unit of work, offer: "Run /retro? (records this session's friction)".
- Offer it before clearing context or starting a new session. Run it when requested.
- Procedure: `.agents/skills/retro/SKILL.md`. Project records live in `retro/`.
- Keep the retrospective short and grounded in this session's evidence.
