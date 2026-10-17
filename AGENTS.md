# OVERCHARGE agent guidance
## Read first (every agent, every session)
- **The game design is one file: `docs/design/GAME_DESIGN_V2.md`; the levels are `docs/design/LEVEL_DESIGN_V2.md`.** Nothing else is a design document. The root README, anything in `docs/archive/`, and any PDF are old and wrong. `docs/README.md` is the index.
- **Your work order is the highest-numbered file for your name in `docs/orders/`** (for example `KIRO_ORDER_CODEX_04.md`). Do not follow anything in `docs/archive/`. If an order and the design document disagree, stop and ask Kiro.
- **Run the current game before you show or design anything.** Check out `agent/orcha-gameplay` (or rebase onto it), serve the repo root, play Level 1, and capture real screenshots from that build. Never composite images and never reuse screenshots from an older iteration.
- **Level files are Chief's.** Edit `src_scroll/levels/*.json` only with a written order that names the file; log it in `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.
- Moved a file and cannot find it? `docs/MOVED.md` maps every old path to its new one.

## Publishing and verification
- Before geometry fixes, establish the intended playable route and test that outcome, not merely the selected collision rule. A passing collision test does not prove a level route is usable. For cross-machine differences, obtain actual browser URLs and loaded-level sources before attributing them to local Git branches.
- Before committing Builder JavaScript changes, run `node scripts/version_editor.mjs` (also runs through `scripts/build_info.mjs`). Commit the generated `editor.html` import map so entry and dependency URLs change together. Do not use an unversioned build-info import as the cache-busting bootstrap.
- `PUBLISH_OVERCHARGE.bat` publishes committed code from the Codex worktree; it does not save or commit Builder edits in another clone. Check the selected save folder, branch, working-tree changes, and remote commit before claiming a level was published.
- On Windows, use PowerShell literal paths and command-specific `safe.directory` when required. Account changes between `CodexSandboxOnline` and `CodexSandboxOffline` require rechecking credential access; do not repeat a Git authentication path that has already crashed.
- In Chief's checkout, publish with `git push origin HEAD:agent/orcha-gameplay`. The repo config supplies a scoped SSH deploy key through `core.sshCommand` and an SSH `pushurl`; an explicit HTTPS URL or `GIT_SSH_COMMAND` override bypasses that working setup.

## GitHub document-only work
- Fetch the exact target file and applicable `AGENTS.md` files first; if directory discovery is needed, output only filtered paths rather than the full API payload. Check whether the requested new file already exists before choosing create versus update.

## Session retro
- After finishing a unit of work, offer: "Run /retro? (records this session's friction)".
- Offer it before clearing context or starting a new session. Run it when requested.
- Procedure: `.agents/skills/retro/SKILL.md`. Project records live in `retro/`.
- Keep the retrospective short and grounded in this session's evidence.
