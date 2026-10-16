# Finding: root cause of "browser still saving to main"

## Verified deployed code is correct

- `https://kiotdstudios.github.io/overcharge/editor/persistence.js` (live, fetched directly): `_GH_BRANCH = 'agent/orcha-gameplay'` at line 708. GET uses `?ref=${_GH_BRANCH}` cache-busted, PUT body sets `branch: _GH_BRANCH`. This is the SAVE-409 hardened version from `ecc3a27`/gameplay.
- `https://kiotdstudios.github.io/overcharge/editor.html` (live, fetched directly): importmap correctly points `./editor/persistence.js` to a versioned URL `?v=a695b184ae7077ef`, matching the current gameplay HEAD's module version.
- **The repo/Pages content is not the bug.**

## Root cause: GitHub Pages Cache-Control on editor.html itself

`curl -I https://kiotdstudios.github.io/overcharge/editor.html` returns:

```
Cache-Control: max-age=600
```

GitHub Pages serves `editor.html` (the document itself, not just the versioned JS modules) with a 10-minute browser cache. A normal reload (F5, or reopening the tab / typing the URL again) within that 10-minute window can be served entirely from the browser's local HTTP cache with **zero network request** — no ETag revalidation happens inside max-age. If a browser loaded editor.html any time before the SAVE-409/branch fix deployed, it can keep re-serving that pre-fix HTML (with its old, unversioned or main-targeting importmap) for up to 10 minutes after each load, silently, with no visual difference and no console error.

This matches the doc's own observation exactly: deployed `persistence.js` is correct, but "the Builder used for this SAVE is still running a main-targeted handler."

## Required action (must happen at the browser, not in the repo)

A hard refresh (Ctrl+Shift+R / Cmd+Shift+R) or a cache-busted URL (`editor.html?_=<timestamp>`) is required to force the browser to bypass its HTTP cache and fetch the current document. A plain reload or new-tab navigation is not sufficient inside the 10-minute window.

To verify success: open DevTools Network tab before reloading, hard-refresh, and confirm:
1. `editor.html` request shows `200` (not `(disk cache)` / `(memory cache)`).
2. `persistence.js?v=...` query matches the current module version (`a695b184ae7077ef` as of this report).
3. After a SAVE, the success toast explicitly reads "Saved to agent/orcha-gameplay".

## Data safety

Chief's commit `6c0eaa0` ("level1: recover Chief blue tile edits saved to main") already reconciled the blue-tile edits that landed on `main` back into `agent/orcha-gameplay` without merging main's whole level over gameplay's background/gate work. No further data recovery action identified as pending from this finding.

## Recommendation to prevent recurrence

Consider adding `Cache-Control: no-cache` (or a short max-age with must-revalidate) via a `_headers`-equivalent for GitHub Pages, or append a build-time cache-busting query to `editor.html`'s own URL where it's linked from, so a normal reload always revalidates the document itself, not just the module scripts inside it. Flagged as a candidate for `retro/backlog.md` rather than actioned here, since it changes deployment behavior outside this task's scope (Aki's lane is `editor/**`, `assets/**`, `src_scroll/render.js` — Pages cache headers are a repo-hosting-level config, not an app file).
