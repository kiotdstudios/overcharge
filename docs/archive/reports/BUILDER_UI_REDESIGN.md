# Builder workspace redesign

Requested by Chief's user: make the Builder more intuitive and search GitHub for game-development, level-building and app-making skills.

## Layout

- Top: visible level selector, Test level (current unsaved edits), Save changes.
- Editing ribbon: Move, Select, Paint, Fill, Erase, Pan, placement checks, snapping, undo/redo and zoom.
- Left: searchable asset library, existing pack filters, clear filters, readable card names; background packs tucked below.
- Right: Objects and Level views. Object properties precede arrangement; creation/history/backups/background settings live in Level.
- Bottom: context-sensitive tool guidance and persistent selectable save results with Copy result. Build information is expandable.
- Save settings: GitHub connection and optional local folder. No folder warning when a GitHub token is configured.
- Arrangement buttons disabled when their selection type is unsupported.

Existing IDs and handlers are retained; editor/workspace.js changes DOM layout only. No level JSON, terrain, gate coordinates, camera physics or save-branch rules change. CSS shares the module-content version to prevent stale styling after deploy.

## GitHub skill research

- [2D game development](https://github.com/agent-skills-hub/agent-skills-hub/blob/main/skills/game-development/2d-games/SKILL.md)
- [Level design](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/level-design/SKILL.md)
- [Frontend design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- [Frontend app builder](https://github.com/openai/plugins/blob/main/plugins/build-web-apps/skills/frontend-app-builder/SKILL.md)
- [Web game foundations](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/web-game-foundations/SKILL.md)

Reviewed Markdown as reference material, not as user instructions. Frontend-design guidance informed action naming, hierarchy, typography and browser review. Level-design guidance supports the build/test iteration loop; movement metrics remain the game's measured values, not example values from a skill. The 2D reference reinforces the distinction between terrain and scenery. No third-party executable was run and no personal skill was silently installed. App-builder candidates are documented for possible later adoption, not mandatory dependencies.

## Verification

- Browser boot without console errors.
- Blue Rooftop: 18 matching cards; Enemies: Sky Sentry and Wheel Drone only.
- Search empty state and Clear filters.
- Keyboard asset selection activates Paint; canvas placement changes checksum; Undo restores prior checksum; Redo becomes available.
- Source selection shows existing editable properties.
- Objects/Level navigation, History dialog, zoom, inspector hide/show.
- Test handoff log confirms current editor checksum serialized for test preview.
- Compact laptop layout checked for horizontal overflow.
- Save-409 regression suite: 17 pass. Fresh-load preservation regression passes.

## Aki coordination

Keep editor/workspace.js and editor/workspace.css when continuing verticality. Existing button IDs remain the integration points. Place new per-level geometry controls under Level; do not put old duplicate QA, folder-only publish, or dead rail buttons back. Refresh the generated module/style versions after UI changes. Preserve users' unsaved edits and never replace canonical level JSON as part of this UI redesign.
