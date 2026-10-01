# Issues found during work

Defects noticed and not fixed in the session that found them. One bullet each:
`YYYY-MM-DD · file/command · what is wrong · how it was found`. Delete when fixed.

- 2026-09-28 · shared Pages Builder across laptops · Chief confirmed both use the same live URLs but see different editor/level state. Aki's stale branch alone does not explain shared Pages behavior. Actual browser loaded module URLs and level sources/recovery/folder state still need comparison without discarding unsaved edits.
- 2026-09-28 · editor/main.js commit/push command · assumes Documents/GitHub/overcharge and pushes the named local agent/orcha-gameplay branch rather than HEAD. User's clone was on main at 17445af with no saved changes; the generated command was mistaken for evidence that level1 had been committed. Publish preflight must verify the actual save target and branch.
- 2026-09-28 · baseline automated checks · 51 pre-existing failures (49 parity_regression, 2 level2_fork) and a save_publish crash under Node 24.19 remain unresolved. Enemy integration introduced no new failures; the baseline is still not green.
- 2026-10-01 - GitHub publishing from Chief Codex checkout - HTTPS Git Credential Manager waited without completing, HTTPS schannel had no credentials, SSH failed host-key verification, and the GitHub connector returned 403 on blob/file writes. Three local pipe/filter-order commits could not reach agent/orcha-gameplay; restore an authenticated push path before claiming them live or delivered to Aki.
