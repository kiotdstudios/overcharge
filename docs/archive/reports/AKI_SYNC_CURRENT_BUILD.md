# Aki: synchronize laptop Builder with Chief's current build

Chief reports laptop game/editor differs from PC and explicitly authorizes ongoing agent coordination. This is the current priority before more level edits are published.

## Verified at handoff

- Canonical live branch: agent/orcha-gameplay, latest observed 62f6c413e55b94a72f136fb32ecd0d4f20b95b76 (level1 save from Builder).
- origin/agent/aki-editor: 9268eacbf9585e561d2111fa2e860873e66eb695.
- git rev-list --left-right --count origin/agent/aki-editor...origin/agent/orcha-gameplay returns 19 / 44. Aki has unique work; do not reset, overwrite, or discard it.
- Shared latest JS module version: e55957bb56043288 in both game and Builder HTML.
- Current collision fix: solid building tiles block both axes. Earlier pass-through fix 42ba1aa was superseded by 0047d9f and subsequent merge/build fixes. Do not restore pass-through.
- Latest laptop SAVE hardening ecc3a27 is integrated in live via 5e9a9c4. Browser SAVE targets agent/orcha-gameplay. SSH credentials on Chief PC do not provision laptop credentials.

## Required laptop work

1. Export/snapshot Chief's unsaved level before refreshing, restarting a server or updating checkout. Preserve dirty files separately. Do not load repository JSON over unsaved changes.
2. Identify exact browser URL, server process, served checkout, branch and HEAD. Report them; do not infer from terminal cwd. localhost/127.0.0.1 on each laptop are different machines and can serve different trees.
3. Fetch production and merge origin/agent/orcha-gameplay into Aki's development branch while preserving the 19 unique commits and dirty work. Resolve conflicts by final behavior, not accepting all of either branch. Regenerate module URLs with node scripts/version_editor.mjs after resolving JS changes.
4. Restart/repoint the laptop server to the intended checkout, then reopen Builder after exporting unsaved edits. Verify HTML and actual requested module URLs match that checkout. Check branch/SHA UI metadata; buildinfo is stale until regenerated and is not sufficient proof by itself.
5. Verify loaded LEVEL source separately from editor CODE. Default/fetched level, selected folder file, restored recovery and Builder TEST preview are different sources. If using a folder clone, pull its production branch first; if using recovery/test state, compare the preserved level before replacing or publishing it. Never claim refresh automatically synchronizes a selected folder or recovered level.
6. For a shared editing baseline use https://kiotdstudios.github.io/overcharge/editor.html and the canonical gameplay branch level JSON, with no unintended folder/recovery override. This supplies the same deployed code to both laptops; browser unsaved edits remain local. Confirm runtime game from https://kiotdstudios.github.io/overcharge/index.html without ?test=1 when checking published changes.
7. Compare level1 JSON content/checksum from canonical branch, Pages, and laptop loaded source. Current solid tile (49,15) is 27; generators src_3 deleted. Compare the whole JSON, not only these sentinel values. Report differences before applying local edits.
8. Reapply/export/import Chief's preserved edits deliberately against the updated baseline. Test SAVE, verify returned commit belongs to gameplay and Pages deploys it, then reopen on both machines. Do not silently replace another laptop's edits.

## Report back through Git

Commit a docs/AKI_SYNC_REPORT.md with laptop URL, served path, branch and SHA, module version, loaded-level source/checksum, tests and remaining divergence. Preserve secrets. Chief is polling updates every ten minutes.
