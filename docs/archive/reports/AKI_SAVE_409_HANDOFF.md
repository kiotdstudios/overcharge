# Aki: laptop Builder SAVE 409 handoff

Chief explicitly requested this handoff for the laptop where Aki is working.

## Report

SAVE returns: `GitHub push failed 409: src_scroll/levels/level1.json does not match 68fed78fd0e26ee538bbbcec2d4b799807103bd3`.

That blob SHA belongs to Chief's earlier deletion save c387fbe on main. Pages deploys agent/orcha-gameplay. This is a file-version conflict, not proof of a token permission failure. Cached SHA responses, mismatched GET/PUT branches, and overlapping saves must be checked; the exact laptop cause is not yet observed.

## Preserve Chief's edits first

Before refreshing, pulling code, or restarting the laptop server, export/download the current unsaved level and/or snapshot it. Do not replace the open level with repository data. Do not expose the PAT, paste it into this document, or transfer private SSH keys between machines.

## Current production fixes

- b61a5f7: generated editor.html import map versions all Builder modules; run node scripts/version_editor.mjs after JS changes.
- 0b231da: persistence.js sets _GH_BRANCH to agent/orcha-gameplay for both GET ref and PUT branch.
- 1878c6d: Chief's deletion of generator src_3 ported to gameplay level1; main save alone had not updated Pages.
- Chief desktop now has working repo-scoped SSH deploy-key push. This does not authenticate laptop git or the browser Contents API; browser SAVE still uses its PAT.

## Implement and verify on laptop

1. Inspect the actual served persistence.js and network requests, not just checked-out source. GET ref and PUT body.branch must both be agent/orcha-gameplay. URL-encode ref. The laptop must serve the updated editor.html and module graph; merely pulling without refreshing its server/page is insufficient.
2. Fetch file metadata with cache: 'no-store' and a unique request query value. Do not reuse a blob SHA from main, a previous SAVE, or localStorage. Use the newly returned file blob SHA in the PUT (not a commit SHA).
3. Serialize SAVE operations and disable SAVE during the entire request sequence, releasing in finally. Preserve dirty state on any failure. Do not clear edits made during an in-flight save: only clear dirty if current level and serialized data still match the saved snapshot.
4. Handle 409 explicitly: keep local edits and show a persistent conflict message. Fetch current remote metadata/content without cache to distinguish a stale metadata read from a competing file edit. Do not silently retry with a new SHA over someone else's changed level. Retry only if remote content is unchanged from the pre-write read, with a bounded attempt; otherwise require explicit conflict resolution/export/reload. A two-laptop edit workflow should track the loaded remote base to detect another laptop's changes before overwriting.
5. Test with mocked API calls: correct GET/PUT branch, fresh SHA per save, cached/mismatched SHA, double click, concurrent remote level change, network failure, and edits during a save. Verify local level remains intact after every failure and no automatic overwrite of another laptop's edits occurs.
6. Regenerate module versions; commit only intended changes, push gameplay, verify Pages deployment and a real laptop SAVE commit on gameplay. Confirm the saved level is still correct after reopening. Report the commit SHA and observed UI result to Chief.

Reference: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents (PUT requires the current file blob SHA; 409 is Conflict).
