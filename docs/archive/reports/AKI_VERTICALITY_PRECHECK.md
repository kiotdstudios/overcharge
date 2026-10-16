# AKI_VERTICALITY_PRECHECK.md

Response to `docs/AKI_GO_VERTICALITY.md`. Corrections applied, audit done, verticality work not yet started.

## 1. Factual corrections accepted

- `tile(49,15)` in the live level is **0**, not 27. Confirmed by parsing `origin/agent/orcha-gameplay:src_scroll/levels/level1.json` directly.
- `gate_1` is at `x=1984, y=256`, confirmed in the same file.
- My prior report's "zero divergence either direction" claim was wrong and is retracted. Correct language: as of this push, `agent/aki-editor` is at commit `7adc12f`, built on top of gameplay's current HEAD `0d2f981`. `git rev-list --left-right --count origin/agent/orcha-gameplay...agent/aki-editor` = `0  28`: gameplay has **0** commits not already in my branch; my branch carries **28** commits gameplay does not have. That is one-directional containment (my branch is a strict superset of gameplay's line), not mutual zero-divergence.

## 2. Blue tile count — not reconciled, flagging instead of guessing

I cannot make my count match "80 blue tile cells" and don't want to assert a number I can't back up. What I measured on the current merged `level1.json`:
- Grid `tiles[]` array, values in range 42-59 (the range I used for "blue" last time): **342** cells.
- Decoration-layer entries whose `src` path contains `blue_rooftop/tiles/`: **102** entries.

Neither is 80. If "80" refers to a specific sub-range, a specific building, or a count at a slightly earlier/later commit than what I checked, tell me the exact rule and I'll requery. Not claiming this is fixed.

## 3. Purple City filter — removed to match gameplay

Confirmed `origin/agent/orcha-gameplay:editor/assets.js` has no `purple-city` reference at all. Removed the `ab-purple-city-only` checkbox row and its import from `agent/aki-editor`'s `editor/assets.js` (left the underlying `purpleCityOnly` state field/setter in `editor/state.js` as inert dead code, same as gameplay does — not ripping out plumbing, just hiding the UI). Confirmed via `node --check` and the save-409 suite (17/17) that this didn't break anything.

## 4. Audit of the 19 (now merged) Aki-only commits for reinstated retired behavior

Directly inspected the two commits most likely to reintroduce retired rules:

- `2798d7c` ("exit gate blocks full column"): checked current `src_scroll/electricity.js` — `PowerGate.blocks()` and `blocksHorizontal()` both explicitly `return false` when `this.isExit`, with a comment citing "Chief ruling 2026-09-20" and "exploration stays free; exit charge/contact controls completion." This is already the *current* behavior in the merged tree, matching `CHIEF_EXIT_EXPLORATION_RULE.md`. The old commit's behavior is superseded, not reinstated. No code change needed.
- `c2485e4` ("tiles 27/38 always block horizontally"): current `Level.tileBlocksX()` uses the general rule `v === 1 || v >= 10`, not tile-ID-specific logic. Superseded by the general solid-tile rule, not reinstated. No code change needed.

Did not exhaustively re-diff all 19 commits line by line against the current tree; these two were the ones with an obvious collision with a named Chief ruling, and both check out clean. Flagging that this was a targeted check, not an exhaustive one.

## 5. Merge and push, this session

- Merged `origin/agent/orcha-gameplay` twice (first to `ae51ef0`, then a second fetch mid-task caught a live Builder save landing at `0d2f981` — re-fetched and re-merged before pushing so nothing stale went out).
- `level1.json` after merge is **byte-identical** to `origin/agent/orcha-gameplay`'s copy (`git diff origin/agent/orcha-gameplay -- src_scroll/levels/level1.json` = empty) — the git-native JSON merge did not silently corrupt it, verified, not assumed.
- Pushed `agent/aki-editor` → `7adc12f`. Test suite: `editor/__tests__/save-409.test.mjs` 17/17 passing post-merge.

## 6. Browser verification — honest limitation

I did not open an actual browser tab against the live Pages URL this session. What I *can* and did verify: the deployed source on `agent/orcha-gameplay` (server-side file contents via `git show`), and the local test suite's assertions about SAVE's GET ref (`agent/orcha-gameplay`) and PUT branch target (`agent/orcha-gameplay`), which are enforced by passing unit tests, not by watching a live session. I have no way to confirm what a real open browser tab is currently caching or displaying — that would need an actual navigate-and-inspect pass, which I have not done. Not claiming otherwise.

## Next

Per the GO doc, starting on `docs/AKI_NEXT_TASK_VERTICALITY.md` now that this correction pass is pushed.
