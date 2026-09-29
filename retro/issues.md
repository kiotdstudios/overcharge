# Issues found during work

Defects noticed and not fixed in the session that found them. One bullet each:
`YYYY-MM-DD · file/command · what is wrong · how it was found`. Delete when fixed.

- 2026-09-28 · GitHub connector / Git credential manager · connector writes returned 403 "Resource not accessible by integration"; sandbox HTTPS push attempts produced three git-remote-https crash popups. SSH deploy-key public key prepared, but user approval and a successful write test are still pending. No working agent write path has been verified.
- 2026-09-28 · editor/main.js commit/push command · assumes Documents/GitHub/overcharge and pushes the named local agent/orcha-gameplay branch rather than HEAD. User's clone was on main at 17445af with no saved changes; the generated command was mistaken for evidence that level1 had been committed. Publish preflight must verify the actual save target and branch.
- 2026-09-28 · baseline automated checks · 51 pre-existing failures (49 parity_regression, 2 level2_fork) and a save_publish crash under Node 24.19 remain unresolved. Enemy integration introduced no new failures; the baseline is still not green.
