# Level archive

These are exact snapshots of campaign level JSON before major layout replacements. Files here are not listed in `src_scroll/levels/levels.json` and are not loaded by the game.

- `level1-2026-09-30-before-high-low.json`: Level 1 from `agent/orcha-gameplay` commit `7463589`, before the high/low route became the active level. Its SHA-256 is `C3EF1448FF5E875D12FADABE476A41309931339667A192DF1A258D592B7E2F4C`.

To restore an archived layout, copy the chosen JSON to `src_scroll/levels/level1.json` in a clean checkout, run the Level 1 route tests, then commit and publish that deliberate replacement. Preserve any newer Builder edits first; the archive does not capture edits that were never saved to Git.
