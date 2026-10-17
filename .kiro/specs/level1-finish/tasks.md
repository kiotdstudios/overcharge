# Implementation Plan: Level 1 Finish

## Overview

This plan finishes Level 1 ("NEON RISE") on branch `agent/orcha-gameplay`, base commit `86bcc78`. The language is JavaScript (ES modules, Node 24 for tools, plain browser modules for the game). There is no root `package.json`, so every check is a plain `node` command. All commands run from the repo root `C:\Users\diepowel\Documents\GitHub\overcharge` unless a task says otherwise.

The order follows the design's Dependencies and Ordering section:

1. Step 0: protected-file hashes, harness import fix, shared modules, Beat_Scan, Timed_Run, Route_Prover, Diff_Check and the edit tool, each with self-tests.
2. Timed_Run and Route_Prover on the unchanged real file.
3. Chief-decision gates (signpost art, Beat kind O1, CP2 position O2, timing shortfall O4).
4. Placements under the written order, then the Gate_Glow runtime change.
5. Movement retune, then ambience and reactions with the off-switch registry, then music wiring.
6. Clean-up, final full run, Chief's sign-off record.

### Conventions used by every task

- **Proof** names the exact command that shows the task is done. Automatic suites print `RESULTS: N passed, M failed` and must end with `0 failed`. CLI tools use exit code 0 (held), 1 (a real finding for Chief), 2 (the tool itself failed).
- **WAITING tasks** depend on something outside Kiro (Chief's approvals or decisions, Orcha's copy, the music file, the arrow art decision, the environment). They are labelled `[WAITING: <owner>]` in the title. When the input is missing at run time, the runner SKIPS the task: record `BLOCKED (<owner>)` in the Status_Report, leave the box unchecked, and continue. A skip is never a failure. No non-WAITING task depends on a WAITING task for its own completion.
- **Level-file guard** applies to every task marked `LEVEL-FILE EDIT`. Such a task: is covered by the written order of Chief (2026-10-17) for the four Named_Changes only (Beat, Second_Checkpoint, Signpost, Copy_Swap); edits `src_scroll/levels/level1.json` by text-level splice through `level1_edit.mjs` (never `JSON.stringify` of the whole file, never a Builder save, never `facade_routes.mjs --apply`); runs `node _dev/tools/level1_finish/diff_check.mjs` afterwards; and appends a log entry to `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md` (date, order, ids and coordinates, what stayed unchanged, test used, undo steps, backup path and SHA-256). Any needed fix outside the four Named_Changes is reported to Chief and not made.
- **Staging**: stage files by name only (`git add -- <path> <path>`), run `node _dev/tools/level1_finish/protected_files.mjs verify` first, and check `git diff --cached --name-only`. Never stage `assets/fixtures/hero-mechanics.json` or `assets.zip`. Never use `git add -A`, `git add .` or `git commit -a`.
- **Status_Report** blocks are appended to `KIRO_STATUS.md` in the format of the design (item, requirement, result, command, numbers, open). Appends are append-only; when several tasks in one wave append, the runner writes them in task-number order after the wave.
- Temporary files go to `$env:TEMP` with the prefix `l1f_` and are deleted in task 11.7.

## Tasks

- [ ] 1. Step 0: protected files, harness path, shared modules and tools
  - [ ] 1.1 Create `protected_files.mjs` and record the protected-file hashes
    - Create `_dev/tools/level1_finish/protected_files.mjs` with `record` and `verify` (hashes of `assets/fixtures/hero-mechanics.json` and `assets.zip`, `git diff --cached --name-only`, `git diff --name-only 86bcc78..HEAD`).
    - `record` writes `C:\Users\diepowel\Documents\_kiro_tools\protected_hashes.json` (outside the repo). Expected start values: hero-mechanics `E7C886E0872186692F0785AD6DF17B8CC294BFD18EFD71BE9B59C23DC0BA8969`, assets.zip `CDED206BFC792EB51D47126CDADAE241E4F6B521A8FDC71398444D8DF430DA52`. If a value differs, record the real value and note the difference in the Status_Report.
    - Leave the uncommitted modification of `hero-mechanics.json` in the working copy as found.
    - Proof: `node _dev/tools/level1_finish/protected_files.mjs record` then `node _dev/tools/level1_finish/protected_files.mjs verify` (exit 0).
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [ ] 1.2 Fix the movement harness import depth
    - In `docs/reference/agent-training/player_metrics_harness.mjs` change `../../_dev/...` to `../../../_dev/...` and `../../src_scroll/...` to `../../../src_scroll/...`. Tooling-only change; no other line changes.
    - The output must equal the Appendix A.1 "Before" column (walk 75.00, sprint 127.50, jump 99.17 px, apex 27 frames, airtime 56 frames, gap 1/3 tiles, ledge 3 tiles, terminal 700, 66 frames).
    - Proof: `node docs/reference/agent-training/player_metrics_harness.mjs` runs without an import error and prints the "Before" values.
    - _Requirements: 6.1, 6.7_

  - [ ] 1.3 Create the shared modules `prng.mjs` and `level_facts.mjs`
    - `_dev/support/prng.mjs`: `mulberry32`, `int`, `pick`, `forAll(name, n = 200, gen, check)` printing the failing seed.
    - `_dev/support/level_facts.mjs`: `readLevelFacts(def)` and `placedCharge(facts)` (sources with name, NPCs, checkpoints, gate, ladders, surfaces, `strip`, `lowStreet`), derived from tile data, no hard-coded coordinates.
    - Proof: `node -e "import('./_dev/support/level_facts.mjs').then(m=>{const f=m.readLevelFacts(JSON.parse(require('fs').readFileSync('src_scroll/levels/level1.json','utf8')));console.log(m.placedCharge(f),f.gate.required,f.checkpoints.length,f.npcs.length)})"` prints `11 8 1 7`.
    - _Requirements: 2.11, 10.11_

  - [ ] 1.4 Create `state_graph.mjs`
    - `_dev/support/state_graph.mjs`: copy-and-extend of the `reach.mjs` method (`reach.mjs` stays unchanged). Frame order `player.update(dt, level)` then `Input.update()`.
    - `exploreGraph(def, { start, actions: 'walk'|'all', maxStates, ladders })` returning nodes, edges and parents; real ladder actions in both directions; jump actions hold the jump key until the apex; a mid-air start is rejected; exceeding `maxStates` exits 2 `STATE_CAP`.
    - Proof: `node -e "import('./_dev/support/state_graph.mjs').then(m=>{const g=m.exploreGraph(JSON.parse(require('fs').readFileSync('src_scroll/levels/level1.json','utf8')),{actions:'all',maxStates:40000,ladders:true});console.log(g.nodes.size)})"` prints a node count below 40000 with no error.
    - _Requirements: 2.1, 2.3, 2.7_

  - [ ] 1.5 Create `walker.mjs`
    - `_dev/support/walker.mjs`: `createWalker(def, { hz: 60 })` with `plan(legs)` and `run(keyScript)`; leg kinds walk, hop, climb, absorb, spend, dwell, wait; prefix-replay takeoff search (0 to 24 px before the edge); final replay on fresh `Level`/`Player`; walking speed only (no `ShiftLeft`); `FELL_IN_PIT at x` and `TIMEOUT` (600 s) map to exit 2.
    - Proof: `node -e "import('./_dev/support/walker.mjs').then(m=>console.log(typeof m.createWalker))"` prints `function`; behaviour is proved by task 1.10.
    - _Requirements: 1.5_

  - [ ] 1.6 Implement Beat_Scan
    - `_dev/tools/level1_finish/beat_scan.mjs [--level <path>] [--max-gap 600] [--strict] [--json <file>]`.
    - Beats from data: source, NPC (trigger radius), checkpoint (trigger zone), gate, signpost decoration, spawn; distance measured along x on the planned main route; default reading counts checkpoints, `--strict` does not. Prints the sorted beat list, every gap and the largest.
    - Proof: `node _dev/tools/level1_finish/beat_scan.mjs` and `node _dev/tools/level1_finish/beat_scan.mjs --strict` both print the largest gap (816 px on the base file, commuter x 2320 to gate x 3136) and exit 1 on the unchanged level.
    - _Requirements: 3.1, 3.3_

  - [ ] 1.7 Write the Beat_Scan self-test suite
    - `_dev/level1_finish_beat_scan.mjs`: synthetic beat lists (gap exactly 600 passes, 601 fails), spawn and gate as end points, checkpoints counted by default and ignored under `--strict`, the off-route tenant and AC excluded, base-file largest gap 816. Prints `RESULTS: N passed, M failed`.
    - Proof: `node _dev/level1_finish_beat_scan.mjs` ends with `0 failed`.
    - _Requirements: 3.1, 3.3_

  - [ ] 1.8 Write property test for the beat gap scan
    - **Property 7: Beat gap scan**
    - For any beat x positions between spawn and gate, the scan passes if and only if the largest gap is at most 600, and adding a beat never increases the largest gap. Append to `_dev/level1_finish_beat_scan.mjs`, at least 200 iterations, tag `Feature: level1-finish, Property 7`.
    - Proof: `node _dev/level1_finish_beat_scan.mjs` ends with `0 failed`.
    - **Validates: Requirements 3.1**

  - [ ] 1.9 Implement Timed_Run
    - `_dev/tools/level1_finish/timed_run.mjs [--level <path>] [--plan main|opening|both] [--spend-target tenant|lamp1] [--no-read] [--json <file>] [--compare <before.json>]`, with exported `evaluate` and `formatSeconds(frames) = Math.round(frames / 6) / 10`.
    - `opening` plan: spawn, lamp 1 (absorb), ladders, AC (spend). `main` plan: sources in increasing x until the charge sum is at least the gate cost, low street excluded, then the gate; includes absorb time, NPC dialogue dwell and the gate hold. Exit 0 when first absorb < 60, first spend < 60 and exit 90.0 to 120.0 inclusive; 1 with `SHORTFALL n s` or `EXCESS n s`; 2 when a leg fails.
    - Makes no level edit.
    - Proof: `node _dev/tools/level1_finish/timed_run.mjs --json "$env:TEMP\l1f_timed_probe.json"` prints the three figures to 0.1 s and the verdict (exit 1 is allowed here; see task 3.1).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

  - [ ] 1.10 Write the Timed_Run self-test suite
    - `_dev/level1_finish_timed_run.mjs`: walker on a synthetic flat level (75 px/s steady speed, deterministic replay, no `ShiftLeft`), absorb and spend detectors on a one-lamp level, `evaluate` thresholds (90.0 and 120.0 inclusive, 59.9 and 60.0 for the first two), exit-code mapping 0/1/2. It does not assert the real route time, so an open O4 never turns the suite red.
    - Proof: `node _dev/level1_finish_timed_run.mjs` ends with `0 failed`.
    - _Requirements: 1.1, 1.5, 1.8_

  - [ ] 1.11 Write property test for the Timed_Run verdict
    - **Property 1: Timed_Run verdict**
    - For any triple (first absorb, first spend, exit seconds), `evaluate` passes if and only if absorb < 60, spend < 60 and exit in 90.0 to 120.0 inclusive; exit code 0 exactly when it passes; `formatSeconds` equals frames / 60 rounded to 0.1. Append to `_dev/level1_finish_timed_run.mjs`.
    - Proof: `node _dev/level1_finish_timed_run.mjs` ends with `0 failed`.
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.8**

  - [ ]* 1.12 Write property test for walker speed and determinism
    - **Property 2: Walker uses walking speed and is deterministic**
    - For any generated route plan on a synthetic level the key script has no `ShiftLeft`, steady speed on flat ground is 75 px/s, and replay on fresh objects gives an identical trace. Append to `_dev/level1_finish_timed_run.mjs`.
    - Proof: `node _dev/level1_finish_timed_run.mjs` ends with `0 failed`.
    - **Validates: Requirements 1.5**

  - [ ] 1.13 Implement the Route_Prover script
    - `_dev/tools/level1_finish/route_prover.mjs [--level <path>] [--json <file>]`, using `exploreGraph`.
    - Reports: required traversals against the Movement_Envelope (shaft, +64 px pillar, +32 px roof step, 64 px gap onto the strip, 160 px drop); charge from zero on the main route against the gate cost; low street reconnection by reverse search from strip nodes; Soft_Lock mirroring `Level.isFailState`; what the low street does today (reachable Charged_Objects, rejoin x, y); two-way reachability of the five Charged_Objects and the gate over symmetric edges; failures named `FAIL two-way: <label> <id> (x,y)`; Charge_Figures `LAMP 3, LAMP 3, LAMP 3, VEND 2, HVAC capacity 4 (starts 0)`. A summary line is printed for the Status_Report. No level edit.
    - Proof: `node _dev/tools/level1_finish/route_prover.mjs --json "$env:TEMP\l1f_prover_probe.json"` prints every section above (exit 1 on a real finding is allowed; see task 3.2).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

  - [ ] 1.14 Write the Route_Prover self-test suite
    - `_dev/level1_finish_prover.mjs`: synthetic levels with a gap of N tiles and a ledge of M tiles (verdict equals the envelope), a dead-end pocket, a one-way drop that is not two-way, a ladder that is two-way, a mid-air start rejected, `STATE_CAP` exit 2 rather than "unreachable".
    - Proof: `node _dev/level1_finish_prover.mjs` ends with `0 failed`.
    - _Requirements: 2.1, 2.3, 2.4, 2.7, 2.8_

  - [ ]* 1.15 Write property test for main-route charge from zero
    - **Property 3: Main-route charge from zero**
    - Collected charge equals the sum of on-route source charges; ok if and only if that sum is at least the gate cost; reported Charge_Figures equal the level data. Append to `_dev/level1_finish_prover.mjs`.
    - Proof: `node _dev/level1_finish_prover.mjs` ends with `0 failed`.
    - **Validates: Requirements 2.2, 2.11**

  - [ ]* 1.16 Write property test for traversal verdicts
    - **Property 4: Traversal verdicts match the envelope**
    - For any gap of N tiles and ledge of M tiles on a flat synthetic level, the walking verdict equals "N is at most the envelope gap" and "M is at most the envelope ledge height". Append to `_dev/level1_finish_prover.mjs`.
    - Proof: `node _dev/level1_finish_prover.mjs` ends with `0 failed`.
    - **Validates: Requirements 2.1**

  - [ ]* 1.17 Write property test for low-street reconnection and Soft_Lock
    - **Property 5: Low street reconnects and has no Soft_Lock**
    - Reconnection ok if and only if every low-street node has a directed path to a strip node; a Soft_Lock is a node that cannot reach the exit and cannot reach a respawn. Append to `_dev/level1_finish_prover.mjs`.
    - Proof: `node _dev/level1_finish_prover.mjs` ends with `0 failed`.
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 1.18 Write property test for two-way reachability
    - **Property 6: Two-way reachability is connectivity over symmetric edges**
    - `twoWayReachable(a, b)` equals reachability over edges whose reverse also exists; a one-way edge never joins two nodes; every failing object is named with id or label and both coordinates. Append to `_dev/level1_finish_prover.mjs`.
    - Proof: `node _dev/level1_finish_prover.mjs` ends with `0 failed`.
    - **Validates: Requirements 2.7, 2.8**

  - [ ] 1.19 Implement Diff_Check
    - `_dev/tools/level1_finish/diff_check.mjs [--file <path>] [--base 86bcc78] [--json <file>]`.
    - Base text via `execFileSync('git', ['show', '86bcc78:src_scroll/levels/level1.json'])` (argument array, no shell); missing git or commit exits 2 `BASE_MISSING`. Normalise CRLF to LF for comparison only; report EOL (LF, CRLF, MIXED) and final newline; MIXED is an error, a changed dominant style is a warning.
    - Fails on any change to `tiles`, `tileRotations`, `tileFlips`, `playerStart`, `sources`, `gates`, `switches`, `platforms`, `enemies`, `backgroundOffsets`, `name`, `number`, `cols`, `background`, the top-level key set, or any existing decoration, NPC, checkpoint or gate other than a dialogue `text` value. Allows at most one added `CP2`, one Signpost, one Beat (classified by position; a Beat with source fields is `BEAT_IS_SOURCE`). Economy invariants: placed charge 11, gate cost 8, lamps 3/3/3, vending machine 2, AC capacity 4 and `uncharged`. Forbids `relay-pylon|beacon-top|light-cable` in decoration `src`. Reports text changes by NPC id, line id, old and new text.
    - Proof: `node _dev/tools/level1_finish/diff_check.mjs` exits 0 on the unchanged real file and prints zero additions and zero text changes.
    - _Requirements: 3.2, 4.9, 5.2, 5.3, 5.7, 10.6, 10.11, 11.2, 11.3, 11.4, 11.11_

  - [ ] 1.20 Write the Diff_Check self-test suite
    - `_dev/level1_finish_diff_check.mjs`: mutates a copy of the base in memory. Cases: untouched file passes; each forbidden field change fails with its path; a second Beat, second Signpost, non-`CP2` checkpoint or source-like Beat fails; vending machine reverted from 2 to 4 fails the economy check; CRLF working copy passes; mixed endings fail; missing base gives exit 2.
    - Proof: `node _dev/level1_finish_diff_check.mjs` ends with `0 failed`.
    - _Requirements: 11.2, 11.3, 11.4, 11.11_

  - [ ] 1.21 Write property test that Diff_Check rejects every disallowed change
    - **Property 15: Diff_Check rejects every disallowed change**
    - For any single mutation of a protected field, or of any key of an existing decoration, NPC, checkpoint or gate other than a dialogue `text` value, or any extra Beat, Signpost, checkpoint or charge source, Diff_Check reports at least one violation naming the path and exits non-zero. Append to `_dev/level1_finish_diff_check.mjs`.
    - Proof: `node _dev/level1_finish_diff_check.mjs` ends with `0 failed`.
    - **Validates: Requirements 11.1, 11.3, 11.4**

  - [ ] 1.22 Write property test that Diff_Check accepts exactly the allowed edits
    - **Property 16: Diff_Check accepts exactly the allowed edits and keeps the economy**
    - For any combination of at most one `CP2`, one Signpost, one Beat and any number of dialogue `text` changes (quotes, backslashes, unicode), Diff_Check passes, reports exactly those categories and counts, and the economy reads 11, 8, 3/3/3, 2, 4. Append to `_dev/level1_finish_diff_check.mjs`.
    - Proof: `node _dev/level1_finish_diff_check.mjs` ends with `0 failed`.
    - **Validates: Requirements 3.2, 5.2, 5.7, 10.11, 11.2**

  - [ ] 1.23 Implement the text-level edit tool
    - `_dev/tools/level1_finish/level1_edit.mjs --script <edits.json> [--out <candidate>] [--apply] [--revert <backup>]` with ops `appendToArray`, `insertIntoArray`, `setText` (addressed by owner id and line id, never by index).
    - String-aware span scanner; refuses mixed endings (`EOL_MIXED`); splices only the new span in the file's own line ending and final-newline state; checks `JSON.parse`, byte identity outside the splice, and runs Diff_Check on the result. `--out` writes a temp candidate only. `--apply` copies the original to `C:\Users\diepowel\Documents\_kiro_tools\level1_backups\<UTC>_<op>.json`, prints its SHA-256, and writes atomically (temp file in the same folder, then rename). `--revert` checks the backup hash before restoring the bytes.
    - Includes the placement predicates used by the tasks below: Beat anchor `2536 <= x <= 2920` on a solid main-route span; `CP2` with `x >= CP1.x + 600`, `x < gate.x`, on a main-route ground span; `insideSpawnView`.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_noop.json" --out "$env:TEMP\l1f_noop_out.json"` with `{"ops":[]}` writes a candidate byte-identical to the input and exits 0.
    - _Requirements: 3.3, 3.5, 4.2, 5.2, 11.5, 11.8_

  - [ ] 1.24 Write the edit-tool self-test suite
    - `_dev/level1_finish_edit.mjs`: append to an array, empty array special case, `setText` by ids with escaped characters, LF and CRLF preserved, final-newline state unchanged, `EOL_MIXED` refused, backup then revert gives an identical SHA-256, nothing written to the repo path when `--out` is used.
    - Proof: `node _dev/level1_finish_edit.mjs` ends with `0 failed`.
    - _Requirements: 11.5, 11.8_

  - [ ] 1.25 Write property test that a surgical edit preserves everything outside the edit
    - **Property 17: Surgical edit preserves everything outside the edit**
    - For any allowed edit script and either line-ending style, the result with the inserted or replaced spans removed or restored equals the original byte for byte, every line break uses the original style, the final-newline state is unchanged, and the result parses. Append to `_dev/level1_finish_edit.mjs`.
    - Proof: `node _dev/level1_finish_edit.mjs` ends with `0 failed`.
    - **Validates: Requirements 11.5**

  - [ ]* 1.26 Write property test that restore is exact
    - **Property 18: Restore is exact**
    - For any allowed edit applied with a backup, reverting returns a file whose SHA-256 equals the hash recorded before the edit. Append to `_dev/level1_finish_edit.mjs`.
    - Proof: `node _dev/level1_finish_edit.mjs` ends with `0 failed`.
    - **Validates: Requirements 11.8**

  - [ ]* 1.27 Write property test for placeholder detection
    - **Property 14: Placeholder detection**
    - `isPlaceholder` is true for empty, whitespace-only and "New line" in any case with any surrounding whitespace, false otherwise; edit-tool output from non-placeholder input never contains a placeholder `text`. Append to `_dev/level1_finish_edit.mjs`.
    - Proof: `node _dev/level1_finish_edit.mjs` ends with `0 failed`.
    - **Validates: Requirements 3.4, 5.3**

  - [ ] 1.28 Stage the Step 0 files by name
    - Stage only: `_dev/support/prng.mjs`, `_dev/support/level_facts.mjs`, `_dev/support/state_graph.mjs`, `_dev/support/walker.mjs`, the six files in `_dev/tools/level1_finish/` created so far, the five `_dev/level1_finish_*.mjs` suites created so far, and `docs/reference/agent-training/player_metrics_harness.mjs`. Commit only when the session's instructions allow it.
    - Proof: `node _dev/tools/level1_finish/protected_files.mjs verify` (exit 0), then `git diff --cached --name-only` lists exactly the files above and neither protected file.
    - _Requirements: 12.2, 12.3_

- [ ] 2. Checkpoint - Step 0 complete
  - Run `node _dev/level1_finish_beat_scan.mjs`, `node _dev/level1_finish_timed_run.mjs`, `node _dev/level1_finish_prover.mjs`, `node _dev/level1_finish_diff_check.mjs`, `node _dev/level1_finish_edit.mjs`. Ensure all tests pass. If one fails, record the failure and its cause in the Status_Report and continue; do not ask the owner anything here.

- [ ] 3. Timed run and route prover on the unchanged real file
  - [ ] 3.1 Run the Timed_Run on the real file and keep the "before" figures
    - No level edit. Exit 1 here is a finding (O4, likely a shortfall), not a task failure; record first absorb, first spend, exit time, `exitWithOptionalS`, the shortfall or excess, and which "first spend" reading was used (O9).
    - Proof: `node _dev/tools/level1_finish/timed_run.mjs --json "$env:TEMP\l1f_timed_before.json"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 13.2_

  - [ ] 3.2 Run the Route_Prover on the real file
    - No level edit. Record traversal verdicts and margins, charge from zero, low-street reconnection and rejoin point, Soft_Lock result, two-way result per Charged_Object, Charge_Figures. Any failing object or dead end is reported to Chief with id and x, y (exit 1 is a finding).
    - Proof: `node _dev/tools/level1_finish/route_prover.mjs --json "$env:TEMP\l1f_prover_before.json"`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.11, 13.2_

  - [ ] 3.3 Run Beat_Scan and Diff_Check on the unchanged real file
    - Beat_Scan in both readings; the largest gap is expected to be 816 px. Diff_Check must pass with nothing added, proving the base state.
    - Proof: `node _dev/tools/level1_finish/beat_scan.mjs --json "$env:TEMP\l1f_beats_before.json"`; `node _dev/tools/level1_finish/beat_scan.mjs --strict`; `node _dev/tools/level1_finish/diff_check.mjs` (exit 0).
    - _Requirements: 3.1, 11.2, 13.2_

  - [ ] 3.4 Record the Step 1 and Step 2 results in the Status_Report
    - Append one block per item (Timed_Run, Route_Prover, Beat_Scan baseline) with command, numbers, result and open points. Mark the timing shortfall "open for Chief" when the exit time is outside 90.0 to 120.0 s. Make no level edit.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - (Timed run|Route prover|Beat scan)'` returns three matches dated today.
    - _Requirements: 1.6, 2.8, 2.9, 13.3, 13.4_

- [ ] 4. Checkpoint - Baseline measured
  - Ensure all tests pass. If one fails, record the failure and its cause in the Status_Report and continue; do not ask the owner anything here.

- [ ] 5. Chief-decision gates
  - [ ] 5.1 Implement and run the art audit for the exit signpost
    - `_dev/tools/level1_finish/asset_audit.mjs`: searches `assets/ASSET_MANIFEST.json` and file names under `assets/` for arrow, chevron, direction, pointer, signpost, billboard, marquee; lists the neon-sign, plug-sign, book-sign, tire-sign candidates; prints "no arrow art" and exits 0 when none reads as an east arrow; prints "needs a human look" for any candidate found later.
    - Expected today: no registered art reads as an east-pointing arrow (O3). Report this to Chief with the candidates. Create no art and place no Signpost.
    - Proof: `node _dev/tools/level1_finish/asset_audit.mjs` prints `no arrow art` and exits 0.
    - _Requirements: 4.3, 4.8_

  - [ ] 5.2 Write the decision pack for Chief in the Status_Report
    - One entry listing, with numbers from tasks 3.1 to 3.3 and 5.1: O1 Beat kind (wordless NPC recommended, because it does not wait on Orcha), O2 `CP2` candidate range (`x >= 2424`, y read from the surface, final x after the prover), O3 the art audit result and the options (accept a shop sign, commission one arrow sprite, defer), O4 the timing shortfall or excess, O9 which "first spend" counts, O10 whether a checkpoint counts as a Beat. State what each decision unblocks. Ask nothing in this phase; the pack is the report.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - decisions'` returns a match dated today.
    - _Requirements: 1.6, 3.8, 4.8, 13.4_

  - [ ] 5.3 [WAITING: Chief] Record Chief's decision on the exit signpost art (O3)
    - Skip rule: if no decision is recorded, mark `BLOCKED (Chief)` and continue; the Signpost tasks 6.12 to 6.14 are skipped, the Gate_Glow still ships.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - decision - signpost art'` returns a match containing Chief's words.
    - _Requirements: 4.3, 4.8_

  - [ ] 5.4 [WAITING: Chief] Record Chief's decision on the Beat kind (O1)
    - Skip rule: if no decision is recorded, tasks 6.2 to 6.4 are skipped. A Beat with a line of dialogue also needs Orcha's text (R3.4); a wordless NPC or a decoration does not.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - decision - beat kind'` returns a match containing Chief's words.
    - _Requirements: 3.2, 3.4_

  - [ ] 5.5 [WAITING: Chief] Record Chief's decision on the checkpoint position (O2)
    - Uses the prover result from task 3.2. If the fork answer changes the best position, record the reason. Skip rule: if no decision is recorded, tasks 6.5 to 6.7 are skipped.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - decision - checkpoint position'` returns a match containing Chief's words.
    - _Requirements: 3.5, 3.8_

  - [ ] 5.6 [WAITING: Chief] Record Chief's decision on the timing shortfall (O4)
    - Chief decides what happens when the measured main-route time is outside 90.0 to 120.0 s. No level edit beyond the four Named_Changes is made without a further written order. Skip rule: the shortfall stays "open for Chief" in the final Status_Report.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - decision - timing'` returns a match containing Chief's words.
    - _Requirements: 1.6, 11.10_

- [ ] 6. Placements under the written order
  - [ ] 6.1 Create or recover the screenshot harness (outside the repo)
    - Locate `$env:KIRO_TOOLS` or `C:\Users\diepowel\Documents\_kiro_tools`; check `node_modules\playwright` exists and Chromium resolves. If the script is missing, create `shot_level1_candidate.mjs` from `builder_check.mjs` with `--repo`, `--level`, `--out`, `--view "name:startX:startY[:waitMs]"`, `--viewport` and `--builder`; it writes the candidate to `localStorage['overcharge.testLevel']` and opens `index.html?test=1`, so the repo level file is never touched. If playwright or Chromium is missing, install inside that folder (inbound download, medium risk, state it in the Status_Report). Nothing from that folder is copied into the repo.
    - If still impossible: record `BLOCKED (environment)`, provide the candidate file and the localStorage snippet for Chief, and continue.
    - Proof: `node "C:\Users\diepowel\Documents\_kiro_tools\shot_level1_candidate.mjs" --repo "C:\Users\diepowel\Documents\GitHub\overcharge" --level src_scroll\levels\level1.json --out "$env:TEMP\l1f_shots_base" --view "spawn:32:578:1500"` writes a PNG and exits 0.
    - _Requirements: 11.7_

  - [ ] 6.2 [WAITING: Chief] Beat: build the candidate and run all checks (candidate only)
    - Waits on the Beat kind (task 5.4) and, for a line of dialogue, Orcha's text. Writes a temp candidate only; the repo file is untouched. Anchor `2536 <= x <= 2920` on a solid main-route span, a non-source entry, both gaps at most 600 px.
    - Run on the candidate with `--level`: Diff_Check (`--file`), Route_Prover, Beat_Scan (default and `--strict`), Timed_Run. Take a screenshot of the placement area at 1x.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_beat.json" --out "$env:TEMP\l1f_candidate_beat.json"`; `node _dev/tools/level1_finish/diff_check.mjs --file "$env:TEMP\l1f_candidate_beat.json"`; `node _dev/tools/level1_finish/beat_scan.mjs --level "$env:TEMP\l1f_candidate_beat.json" --strict`; `node _dev/tools/level1_finish/route_prover.mjs --level "$env:TEMP\l1f_candidate_beat.json"` (all exit 0).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 11.7_

  - [ ] 6.3 [WAITING: Chief] Beat: show Chief the placement and wait for the Approval_Record
    - Present the coordinates, `git diff --no-index --ignore-cr-at-eol` of base against candidate, the screenshot and the check results. Keep the Beat only after an Approval_Record line (change, coordinates, Chief's words, date) exists in `KIRO_STATUS.md`. If Chief refuses, no apply happens and the repo file stays as it is. Skip rule: record `awaiting Chief` and continue.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Approval_Record.*Beat'` returns a match with Chief's words.
    - _Requirements: 11.7, 11.8_

  - [ ] 6.4 [WAITING: Chief] LEVEL-FILE EDIT: apply the approved Beat, log it, re-run the checks
    - Covered by the written order (Named_Change (a) only). Text-level edit with `level1_edit.mjs --apply` (backup outside the repo, SHA-256 printed, atomic write). Then Diff_Check, Route_Prover, Beat_Scan, Timed_Run and the suites that read the real file. Log in `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_beat.json" --apply`; `node _dev/tools/level1_finish/diff_check.mjs`; `node _dev/tools/level1_finish/beat_scan.mjs --strict`; `node _dev/tools/level1_finish/route_prover.mjs` (all exit 0).
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 2.10, 11.1, 11.5, 11.9_

  - [ ] 6.5 [WAITING: Chief] Second_Checkpoint: build the candidate `CP2` and run all checks (candidate only)
    - Waits on the position decision (task 5.5) and on task 6.4 so the candidate builds on the current file. Entry `{ "id": "CP2", "x": <x>, "y": <ground>, "label": "CP" }` with `x >= 1824 + 600`, `x < 3136`, on a main-route ground span. `CP1` unchanged. Same checks and screenshot as task 6.2.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_cp2.json" --out "$env:TEMP\l1f_candidate_cp2.json"`; `node _dev/tools/level1_finish/diff_check.mjs --file "$env:TEMP\l1f_candidate_cp2.json"`; `node _dev/tools/level1_finish/route_prover.mjs --level "$env:TEMP\l1f_candidate_cp2.json"` (all exit 0).
    - _Requirements: 3.5, 3.7, 3.8, 11.7_

  - [ ] 6.6 [WAITING: Chief] Second_Checkpoint: show Chief the placement and wait for the Approval_Record
    - Same procedure as task 6.3 for `CP2`; record the reason for the chosen x in the Status_Report. Skip rule: record `awaiting Chief` and continue.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Approval_Record.*CP2'` returns a match with Chief's words.
    - _Requirements: 3.8, 11.7, 11.8_

  - [ ] 6.7 [WAITING: Chief] LEVEL-FILE EDIT: apply the approved `CP2`, log it, re-run the checks
    - Covered by the written order (Named_Change (b) only). Text-level edit, `--apply`, then Diff_Check, Route_Prover, Beat_Scan, Timed_Run. Log in `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_cp2.json" --apply`; `node _dev/tools/level1_finish/diff_check.mjs`; `node _dev/tools/level1_finish/route_prover.mjs` (all exit 0).
    - _Requirements: 3.5, 3.7, 2.10, 11.1, 11.5, 11.9_

  - [ ] 6.8 Write the checkpoint restore test (works on a synthetic `CP2`, no level edit)
    - `_dev/level1_finish_checkpoint.mjs`: build a `Level` and `Player` from an in-memory copy of the level with a `CP2` added, activate it with `tryActivate`, take the snapshot pair exactly as `main.js` does, change the energy state, restore, and compare charge and pips. Also a source-text guard that `main.js` still iterates `level.checkpoints` for activation. Never writes the repo level file.
    - Proof: `node _dev/level1_finish_checkpoint.mjs` ends with `0 failed`.
    - _Requirements: 3.6_

  - [ ]* 6.9 Write property test for checkpoint snapshot restore
    - **Property 9: Checkpoint snapshot restores energy**
    - For any charge in [0, 25] and banked pips in [0, 5] at activation, restoring after any later energy change gives back exactly that charge and those pips. Append to `_dev/level1_finish_checkpoint.mjs`.
    - Proof: `node _dev/level1_finish_checkpoint.mjs` ends with `0 failed`.
    - **Validates: Requirements 3.6**

  - [ ]* 6.10 Write property test for Beat and `CP2` placement predicates
    - **Property 8: Beat and second checkpoint placement predicates**
    - The Beat predicate accepts if and only if `2536 <= x <= 2920`, the position is on a solid main-route span and both non-checkpoint gaps are at most 600; the `CP2` predicate accepts if and only if `x >= CP1.x + 600`, `x < gate.x` and the point is the ground of a main-route span. Append to `_dev/level1_finish_edit.mjs`.
    - Proof: `node _dev/level1_finish_edit.mjs` ends with `0 failed`.
    - **Validates: Requirements 3.3, 3.5**

  - [ ]* 6.11 Write property test for the Signpost spawn-view rule
    - **Property 10: Signpost inside the spawn view**
    - `insideSpawnView` is true if and only if all four corners lie in x 0 to 800 and y from `camY + UI_TOP_INSET` to `camY + 578`, with `camY` from `camYForSpawn`. Append to `_dev/level1_finish_edit.mjs`.
    - Proof: `node _dev/level1_finish_edit.mjs` ends with `0 failed`.
    - **Validates: Requirements 4.2**

  - [ ] 6.12 [WAITING: Chief] Signpost: build the candidate and run all checks (candidate only)
    - Waits on the art decision (task 5.3) and on task 6.7. Uses registered art that Chief approved; the decoration lies wholly in the spawn view; no relay-pylon, cable or beacon art; `flipX: true` on west-pointing art if that is what Chief chose. Same checks as task 6.2, plus screenshots of the spawn view. If no art is chosen, nothing is built.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_signpost.json" --out "$env:TEMP\l1f_candidate_signpost.json"`; `node _dev/tools/level1_finish/diff_check.mjs --file "$env:TEMP\l1f_candidate_signpost.json"` (exit 0).
    - _Requirements: 4.1, 4.2, 4.3, 4.9, 11.7_

  - [ ] 6.13 [WAITING: Chief] Signpost: show Chief the placement and wait for the Approval_Record
    - Same procedure as task 6.3 for the Signpost, with the spawn-view screenshot. Skip rule: record `awaiting Chief` and continue.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Approval_Record.*Signpost'` returns a match with Chief's words.
    - _Requirements: 11.7, 11.8_

  - [ ] 6.14 [WAITING: Chief] LEVEL-FILE EDIT: apply the approved Signpost, log it, re-run the checks
    - Covered by the written order (Named_Change (c) only). Text-level edit, `--apply`, then Diff_Check, Route_Prover, Beat_Scan, Timed_Run. Log in `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_signpost.json" --apply`; `node _dev/tools/level1_finish/diff_check.mjs` (exit 0).
    - _Requirements: 4.1, 4.9, 2.10, 11.1, 11.5, 11.9_

  - [ ] 6.15 [WAITING: Orcha] Copy_Swap: build the candidate from Orcha's final text (candidate only)
    - Waits on Orcha's delivery (O5) and on task 6.14. `setText` operations by NPC id and line id for the 12 base dialogue lines (`npc_smoke_break_worker_a` L1 to L3, `npc_smoke_break_worker_b` L1 to L3, `NPC_STREETLAMP_01` L2 to L5, `NPC_TENANT` L1 and `poweredLines` P1) and any Beat line. Skip rule: until Orcha delivers, leave the existing text unchanged and list the Copy_Swap as an open dependency.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_copy.json" --out "$env:TEMP\l1f_candidate_copy.json"`; `node _dev/tools/level1_finish/diff_check.mjs --file "$env:TEMP\l1f_candidate_copy.json"` reports `text` fields only changed (exit 0).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_

  - [ ] 6.16 [WAITING: Chief] Copy_Swap: show Chief the before and after text table and wait for the Approval_Record
    - Skip rule: record `awaiting Chief` and continue.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Approval_Record.*Copy_Swap'` returns a match with Chief's words.
    - _Requirements: 5.5, 11.7, 11.8_

  - [ ] 6.17 [WAITING: Chief] LEVEL-FILE EDIT: apply the approved Copy_Swap, log it, re-run the checks
    - Covered by the written order (Named_Change (d) only). `setText` text-level edits, `--apply`, then Diff_Check. Log in `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.
    - Proof: `node _dev/tools/level1_finish/level1_edit.mjs --script "$env:TEMP\l1f_edit_copy.json" --apply`; `node _dev/tools/level1_finish/diff_check.mjs` (exit 0, text changes only); `Select-String -Path src_scroll\levels\level1.json -Pattern '"text": "(New line)?"'` returns nothing.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 11.1, 11.5, 11.9_

  - [ ] 6.18 [WAITING: Orcha] Hint copy in `ui.js` (O8)
    - If Orcha's copy includes the hint text ("Try absorbing power from a street lamp", in `src_scroll/ui.js`), change only that string. This is a code edit outside the level-file order; Diff_Check cannot see it, so list the lines separately in the Status_Report. Skip rule: until delivered, leave `ui.js` unchanged.
    - Proof: `Select-String -Path src_scroll\ui.js -Pattern 'Try absorbing power'` shows the final text, and `node _dev/run_all.mjs` still ends with `0 failed`.
    - _Requirements: 5.4, 5.6_

- [ ] 7. Gate glow runtime change
  - [ ] 7.1 Create `fx-prefs.js` and `exit-glow.js`
    - `src_scroll/fx-prefs.js`: `setFxPrefs({ juiceOff, reducedMotion })`, `motionAllowed()`.
    - `src_scroll/exit-glow.js`: frozen `GLOW = { range: 1200, near: 100, far: 0.2, peak: 1.0, pulseAmp: 0.15, pulseHz: 0.8 }`, `exitGlowStrength(dx)` (0 beyond range and for NaN, 0.2 at 1200, 1.0 at or below 100), `drawExitGlow(ctx, gate, strength, t, motionAllowed)` (purple `#cc44ff` radial gradient, radius `120 + 280 * strength`, constant alpha when motion is not allowed).
    - Proof: `node -e "import('./src_scroll/exit-glow.js').then(m=>console.log(m.exitGlowStrength(1200),m.exitGlowStrength(100),m.exitGlowStrength(1201)))"` prints `0.2 1 0`.
    - _Requirements: 4.4, 4.7_

  - [ ] 7.2 Wire the glow into `PowerGate` and `main.js`
    - `src_scroll/electricity.js`: `PowerGate.update(dt, player)` stores `_glowDx`; `PowerGate.draw` calls `drawExitGlow` first, only when `this.isExit && !this.open`. `src_scroll/main.js`: call `setFxPrefs` once at boot with the existing `?juice=off` and reduced-motion values. No write to `required`, `charged`, `open`, `x`, `y`, `w`, `h`; no collision change; no "Charge gate to open." label.
    - Proof: `node _dev/run_all.mjs` still ends with `0 failed` for the existing suites (full proof in tasks 7.3 to 7.5).
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.10_

  - [ ] 7.3 Write the Gate_Glow example tests
    - `_dev/level1_finish_glow.mjs`: guard that `Charge gate to open` appears nowhere in `src_scroll/`, `_dev/` or `editor/` (outside the guard itself); a recording context draws the exit gate and asserts no `fillText` with that string; the glow draws only for `gate_1`; `bodyClearAt` still skips exit gates; the real file holds no `relay-pylon|beacon-top|light-cable` decoration.
    - Proof: `node _dev/level1_finish_glow.mjs` ends with `0 failed`.
    - _Requirements: 4.5, 4.6, 4.9, 4.10_

  - [ ] 7.4 Write property test for glow strength
    - **Property 11: Gate glow strength grows toward the gate**
    - For d1 < d2 in [100, 1200], `exitGlowStrength(d1) >= exitGlowStrength(d2)`; above 1200 the strength is 0; `exitGlowStrength(100) >= 2 * exitGlowStrength(1200)`. Append to `_dev/level1_finish_glow.mjs`.
    - Proof: `node _dev/level1_finish_glow.mjs` ends with `0 failed`.
    - **Validates: Requirements 4.4**

  - [ ] 7.5 Write property test that the glow touches exit gates only and changes nothing
    - **Property 12: Gate glow applies to exit gates only and changes nothing**
    - Drawn strength is above 0 only when `isExit` is true and the gate is closed; `required`, `charged`, `open`, `x`, `y`, `w`, `h` are identical before and after any number of update and draw calls; the exit gate is not in the solid set for body collision. Append to `_dev/level1_finish_glow.mjs`.
    - Proof: `node _dev/level1_finish_glow.mjs` ends with `0 failed`.
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 7.6 Write property test that the glow is steady when motion is off
    - **Property 13: Gate glow is steady when motion is off**
    - For any two times and any distance, with reduced motion or `?juice=off` the drawn alpha is equal at both times. Append to `_dev/level1_finish_glow.mjs`.
    - Proof: `node _dev/level1_finish_glow.mjs` ends with `0 failed`.
    - **Validates: Requirements 4.7**

  - [ ] 7.7 [WAITING: environment] Capture glow screenshots for Chief
    - Needs the screenshot harness from task 6.1. Player at 1200, 600 and 100 px from the gate, through the test path. Skip rule: if the harness is `BLOCKED (environment)`, record it and continue.
    - Proof: `node "C:\Users\diepowel\Documents\_kiro_tools\shot_level1_candidate.mjs" --repo "C:\Users\diepowel\Documents\GitHub\overcharge" --level src_scroll\levels\level1.json --out "$env:TEMP\l1f_shots_glow" --view "far:1936:578:1500" --view "mid:2536:578:1500" --view "near:3036:578:1500"` writes three PNGs and exits 0.
    - _Requirements: 4.4, 11.7_

- [ ] 8. Movement retune
  - [ ] 8.1 Write `movement_metrics.mjs`, the baseline fixture and the rollback record
    - `_dev/tools/level1_finish/movement_metrics.mjs [--table] [--write-doc] [--check-baseline]`: runs the harness as a child process, parses the 17 metrics, prints the Appendix A.1 table with Before and After, `--write-doc` regenerates only a block between `<!-- BEGIN GENERATED -->` and `<!-- END GENERATED -->` in `docs/reference/PLAYER_MOVEMENT_METRICS.md`, `--check-baseline` prints per-metric differences against the fixture.
    - Create `_dev/fixtures/movement_baseline.json` (17 metrics, commit hash, neutral tuning) and `docs/reference/MOVEMENT_RETUNE_ROLLBACK.md` (what it is, the one-line rollback, the check command).
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --check-baseline` prints a difference of 0.00 on each metric and exits 0.
    - _Requirements: 6.1, 6.7, 6.9_

  - [ ]* 8.2 Write property test for the metrics table round trip
    - **Property 21: Metrics table round trip**
    - For any metrics object with the 17 baseline fields, parsing the rendered table gives an equal object. Append to `_dev/level1_finish_retune.mjs`.
    - Proof: `node _dev/level1_finish_retune.mjs` ends with `0 failed`.
    - **Validates: Requirements 6.7**

  - [ ] 8.3 Fix the harness tap-to-hold jump
    - In `docs/reference/agent-training/player_metrics_harness.mjs`, `measureJump` holds the jump key until the apex instead of a one-frame tap, so a later jump cut does not shrink the measured height. `reach.mjs` is left alone; add a one-line note that it taps. With neutral tuning the Before column must stay identical.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --check-baseline` still prints 0.00 on each metric and exits 0.
    - _Requirements: 6.3, 6.5_

  - [ ] 8.4 Add the neutral tuning knobs behind `NEUTRAL_TUNING`
    - `src_scroll/constants.js`: frozen `NEUTRAL_TUNING = { jumpCutMult: 1, fallGravityMult: 1, walkRampFrames: 0, lookAheadPx: 0 }`, `LEVEL1_TUNING = { ...NEUTRAL_TUNING }`, `MOVEMENT_TUNING = LEVEL1_TUNING`. `src_scroll/player.js`: jump cut on release while rising, fall gravity multiplier when `vy > 0`, walk ramp. `src_scroll/camera.js` and `src_scroll/main.js`: look-ahead. Each new branch is skipped entirely at its neutral value so the floating-point operations match today. Existing constants (`JUMP_FORCE -430`, gravity 900, terminal 700) are not edited. Behaviour is unchanged at this point.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --check-baseline` exits 0 with 0.00 on each metric, and `node _dev/run_all.mjs` still ends with `0 failed`.
    - _Requirements: 6.3, 6.4, 6.9_

  - [ ] 8.5 Write the retune example tests
    - `_dev/level1_finish_retune.mjs`: neutral tuning is bit-identical to a pre-change replay of a fixed key script; a tap and a hold of the jump key give the same jump under neutral tuning; the fixture matches the Appendix A.1 numbers (75.00, 127.50, 99.17, 27, 56, 1, 3, 3, 700, 66); `MOVEMENT_TUNING` points at an object whose four knobs are neutral until a knob step changes it.
    - Proof: `node _dev/level1_finish_retune.mjs` ends with `0 failed`.
    - _Requirements: 6.3, 6.9_

  - [ ] 8.6 Write property test for the retune gate
    - **Property 19: Retune gate rejects any loss of jump height**
    - For any pair of full-hold jump heights (before, after) the gate accepts if and only if after is not below before to two decimals; any accepted tuning measures 99.17 px in the harness. Append to `_dev/level1_finish_retune.mjs`.
    - Proof: `node _dev/level1_finish_retune.mjs` ends with `0 failed`.
    - **Validates: Requirements 6.3, 6.5**

  - [ ] 8.7 Write property test for the one-step rollback
    - **Property 20: Rollback restores the baseline**
    - For any tuning values, switching `MOVEMENT_TUNING` to `NEUTRAL_TUNING` makes the harness output equal the fixture with a difference of 0.00 on every metric; with neutral tuning a tap and a hold give the same jump. Append to `_dev/level1_finish_retune.mjs`.
    - Proof: `node _dev/level1_finish_retune.mjs` ends with `0 failed`.
    - **Validates: Requirements 6.9**

  - [ ] 8.8 Write `suite_diff.mjs`
    - `_dev/tools/level1_finish/suite_diff.mjs <before.txt> <after.txt>`: parses two saved `run_all.mjs` outputs and lists every suite whose passed or failed count or status changed, and every suite present in only one output.
    - Proof: `node _dev/run_all.mjs | Tee-Object "$env:TEMP\l1f_runall_a.txt"` then `node _dev/tools/level1_finish/suite_diff.mjs "$env:TEMP\l1f_runall_a.txt" "$env:TEMP\l1f_runall_a.txt"` prints no differences and exits 0.
    - _Requirements: 6.8_

  - [ ]* 8.9 Write property test for the suite diff
    - **Property 22: Suite diff reports exactly the changes**
    - For any two run summaries `suiteDiff` lists a suite if and only if its entry differs, and lists suites present in only one summary. Append to `_dev/level1_finish_retune.mjs`.
    - Proof: `node _dev/level1_finish_retune.mjs` ends with `0 failed`.
    - **Validates: Requirements 6.8**

  - [ ] 8.10 Stage the rollback record, fixture, metrics tool and harness fixes by name
    - Stage only: `docs/reference/MOVEMENT_RETUNE_ROLLBACK.md`, `_dev/fixtures/movement_baseline.json`, `_dev/tools/level1_finish/movement_metrics.mjs`, `_dev/tools/level1_finish/suite_diff.mjs`, `docs/reference/agent-training/player_metrics_harness.mjs`, `_dev/level1_finish_retune.mjs`, `src_scroll/constants.js`, `src_scroll/player.js`, `src_scroll/camera.js`. The rollback record must be committed before any knob changes (commit only when the session's instructions allow it).
    - Proof: `node _dev/tools/level1_finish/protected_files.mjs verify` (exit 0), then `git diff --cached --name-only` lists exactly the files above and neither protected file.
    - _Requirements: 6.1, 12.2, 12.3_

  - [ ] 8.11 [WAITING: Chief] Retune knob 1: jump cut
    - Waits on the approved Beat, `CP2` and Signpost (tasks 6.4, 6.7, 6.14 applied; R6.2). Skip rule: if any is missing, record `BLOCKED (Chief approvals)`, leave `LEVEL1_TUNING` neutral and continue.
    - First save the "before" run: `node _dev/run_all.mjs | Tee-Object "$env:TEMP\l1f_runall_before.txt"`. Set only `jumpCutMult` in `LEVEL1_TUNING`; run the metrics, the prover and the suite; append a row to the retune log in `docs/reference/MOVEMENT_RETUNE_ROLLBACK.md` (knob, value, changed metrics, prover verdict). Reject the change if jump height is not 99.17 px.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --table` (jump height 99.17); `node _dev/tools/level1_finish/route_prover.mjs` (exit 0); `node _dev/run_all.mjs` (`0 failed`).
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 8.12 [WAITING: Chief] Retune knob 2: fall multiplier
    - Same procedure as task 8.11 for `fallGravityMult` only, one knob at a time. Skip rule as in task 8.11.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --table` (jump height 99.17); `node _dev/tools/level1_finish/route_prover.mjs` (exit 0); `node _dev/run_all.mjs` (`0 failed`).
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ] 8.13 [WAITING: Chief] Retune knob 3: walk ramp
    - Same procedure for `walkRampFrames` only; top speed stays 75 px/s. Skip rule as in task 8.11.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --table` (walk 75.00, jump height 99.17); `node _dev/tools/level1_finish/route_prover.mjs` (exit 0); `node _dev/run_all.mjs` (`0 failed`).
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ] 8.14 [WAITING: Chief] Retune knob 4: look-ahead
    - Same procedure for `lookAheadPx` only. Skip rule as in task 8.11.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --table` (jump height 99.17); `node _dev/tools/level1_finish/route_prover.mjs` (exit 0); `node _dev/run_all.mjs` (`0 failed`).
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ] 8.15 [WAITING: Chief] Fill the Appendix A.1 "After" column and regenerate the metrics document
    - Edit the "After" column of Appendix A.1 in `docs/design/LEVEL_DESIGN_V2.md` from `--table` output, and regenerate the marked block of `docs/reference/PLAYER_MOVEMENT_METRICS.md`. Skip rule: if no knob was applied, the After column equals the Before column and the document is regenerated from the neutral state.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --write-doc` then `git diff --stat -- docs/reference/PLAYER_MOVEMENT_METRICS.md docs/design/LEVEL_DESIGN_V2.md` shows only those two files.
    - _Requirements: 6.7_

  - [ ] 8.16 [WAITING: Chief] Shared-controller check on Levels 2 to 6
    - Compare `l1f_runall_before.txt` with a fresh run via `suite_diff.mjs`, ignoring suites added by this feature; run the prover on `level2.json` to `level6.json` before and after and list verdict differences. Report to Chief; edit nothing in Levels 2 to 6.
    - Proof: `node _dev/run_all.mjs | Tee-Object "$env:TEMP\l1f_runall_after.txt"`; `node _dev/tools/level1_finish/suite_diff.mjs "$env:TEMP\l1f_runall_before.txt" "$env:TEMP\l1f_runall_after.txt"`; `git status --short src_scroll/levels` lists no change to `level2.json` to `level6.json`.
    - _Requirements: 6.8_

  - [ ] 8.17 [WAITING: Chief] Rollback drill
    - Point `MOVEMENT_TUNING` at `NEUTRAL_TUNING`, run the baseline check, then restore the chosen tuning. One-line change each way.
    - Proof: `node _dev/tools/level1_finish/movement_metrics.mjs --check-baseline` prints 0.00 on each metric while rolled back (exit 0).
    - _Requirements: 6.9_

  - [ ] 8.18 [WAITING: Chief] Repeat the Timed_Run after the retune
    - Proof: `node _dev/tools/level1_finish/timed_run.mjs --compare "$env:TEMP\l1f_timed_before.json" --json "$env:TEMP\l1f_timed_after_retune.json"` prints before and after side by side.
    - _Requirements: 1.7, 6.10_

- [ ] 9. Ambience and charged-object reactions with the off-switch registry
  - [ ] 9.1 Create the fake audio context support module
    - `_dev/support/fake_audio.mjs`: a copy of the fake context in `audio_bus.mjs` recording created nodes, started sources and active loops.
    - Proof: `node -e "import('./_dev/support/fake_audio.mjs').then(m=>console.log(Object.keys(m).length>0))"` prints `true`.
    - _Requirements: 7.5, 8.4_

  - [ ] 9.2 Create the effect registry and the effects list command
    - `src_scroll/effect-registry.js`: `LEVEL1_EFFECTS` exactly as in the design (sounds, loops, bed, music, footstep, particle effects, pulses, street litter, each with its switches). `_dev/tools/level1_finish/effects_list.mjs` prints the table, and lists `hurt`, `chest-open` and `relay-click` as "not used by Level 1".
    - Proof: `node _dev/tools/level1_finish/effects_list.mjs` prints one row per registry id and exits 0.
    - _Requirements: 7.8_

  - [ ] 9.3 Add the reaction registry and the charge-receive state
    - `src_scroll/reactions.js`: `REACTIONS` (lamp-swell, vend-lit, hvac-on) and `reactionFor(source)`. `src_scroll/electricity.js`: `receive(amount)` sets `_chargedT = 0.4` when `accepted > 0`, `update(dt)` decays it, `reactionState()` returns `{ id, charged, flash, level }`; draining clears `_chargedT`. No change to charge, position or physics.
    - Proof: `node -e "import('./src_scroll/reactions.js').then(m=>console.log(typeof m.reactionFor))"` prints `function`; behaviour is proved by tasks 9.7 to 9.10.
    - _Requirements: 7.2, 7.3, 7.4, 7.9_

  - [ ] 9.4 Add the charged ring, the `source-charge` event and the new sounds
    - `src_scroll/source-visuals.js`: charged branch in `drawSourceReaction` (expanding cyan ring; steady low-alpha fading ring when `!motionAllowed()`). `src_scroll/juice.js`: `observe` fires `emit('source-charge', { id, fill })` and a small upward burst on a non-absorb charge rise; `clear()` keeps a checkpoint restore from looking like a charge event. `src_scroll/audio.js`: sounds `source-charge` (rising triangle blip following `fill`) and `ac-on`.
    - Proof: `node _dev/run_all.mjs` still ends with `0 failed` for the existing suites.
    - _Requirements: 7.2, 7.4, 7.6, 7.7_

  - [ ] 9.5 Add the street ambience bed
    - `src_scroll/audio.js`: `BEDS = { street }` (looped shared noise buffer, low-passed near 380 Hz, slow gain LFO, on an `ambience` bus of gain about 0.25), `startBed(name)`, `stopBed(name)`, guarded by readiness; `setEnabled(false)` stops every bed and loop first. `src_scroll/main.js`: start `street` once while `state === PLAYING`, `level.number === 1` and audio is unlocked; stop it in every other state.
    - Proof: `node _dev/run_all.mjs` still ends with `0 failed`; behaviour is proved by task 9.11.
    - _Requirements: 7.1, 7.5_

  - [ ] 9.6 Add the off switches to `footsteps.js` and `street-litter.js`
    - `src_scroll/footsteps.js`: `setFootstepsEnabled(bool)`; `src_scroll/street-litter.js`: `enabled` flag that stops update and draw. `src_scroll/main.js`: pass `_fxParams.get('audio') !== 'off'` to footsteps, and set the litter flag from `motionAllowed()` and the juice flag.
    - Proof: `node _dev/level1_finish_effects.mjs` ends with `0 failed` once task 9.11 exists (before this task it must name `sfx.footstep` and `vis.street-litter`).
    - _Requirements: 7.5, 7.6, 7.7, 7.8_

  - [ ] 9.7 Write the reaction example tests
    - `_dev/level1_finish_reactions.mjs`: every source in the real `level1.json` has `reactionFor(source)`; the failure message names the object (`NO REACTION: LAMP@933,451`); each of the three lamps, the vending machine and the AC changes `reactionState()` or triggers `source-charge`/`ac-on` when charged; Level 1 holds no charged sign, so there is no R7.11 check.
    - Proof: `node _dev/level1_finish_reactions.mjs` ends with `0 failed`.
    - _Requirements: 7.4, 7.10, 7.11_

  - [ ] 9.8 Write property test for the 15-frame reaction
    - **Property 23: Charged-object reaction starts within 15 frames**
    - For each of the five Charged_Objects and any accepted charge amount, frames from `receive` to `reactionState().flash` and to the sound event are at most 15, and charge, position and `max` are unchanged. Append to `_dev/level1_finish_reactions.mjs`.
    - Proof: `node _dev/level1_finish_reactions.mjs` ends with `0 failed`.
    - **Validates: Requirements 7.2, 7.4**

  - [ ] 9.9 Write property test that draining returns the reaction to rest
    - **Property 24: Draining returns the reaction to rest**
    - For any accepted charge amount, charge then full drain returns `reactionState()` to its value before the charge. Append to `_dev/level1_finish_reactions.mjs`.
    - Proof: `node _dev/level1_finish_reactions.mjs` ends with `0 failed`.
    - **Validates: Requirements 7.3**

  - [ ] 9.10 Write property test that a missing reaction is named
    - **Property 25: Missing reaction is named**
    - For any source whose art has no entry in `REACTIONS`, the coverage check fails and its message contains the id, or the label with both coordinates. Append to `_dev/level1_finish_reactions.mjs`.
    - Proof: `node _dev/level1_finish_reactions.mjs` ends with `0 failed`.
    - **Validates: Requirements 7.10**

  - [ ] 9.11 Write the effects suite with one driver per registry entry
    - `_dev/level1_finish_effects.mjs`: registry ids equal driver ids; every sound Level 1 triggers is in the registry; for each id and each declared switch, turn it on, drive the trigger and measure (fake-context node count, `soundsPlayed`, `particleCount`, `shakeAmplitude`, `hitStopRemaining`, constant alpha at two times). Also: the street bed starts while Level 1 plays with audio enabled (R7.1). A registry id with no driver, or output while off, fails and names the id.
    - Proof: `node _dev/level1_finish_effects.mjs` ends with `0 failed`.
    - _Requirements: 7.1, 7.8_

  - [ ] 9.12 Write property test that every registry entry has a working off switch
    - **Property 29: Every registry entry has a working off switch**
    - For any entry in `LEVEL1_EFFECTS` and any switch it declares, turning that switch on and driving the trigger produces zero nodes, zero particles, zero shake, or a constant alpha; registry ids equal driver ids. Append to `_dev/level1_finish_effects.mjs`.
    - Proof: `node _dev/level1_finish_effects.mjs` ends with `0 failed`.
    - **Validates: Requirements 7.8**

  - [ ] 9.13 Write property test that disabled audio creates nothing
    - **Property 26: Disabled audio creates nothing**
    - For any sequence of `play`, `setLoop`, `startBed` and `startMusic` calls under `setEnabled(false)`, the fake context records zero created nodes, zero started sources and `activeLoops` is empty. Append to `_dev/level1_finish_effects.mjs`. The `startMusic` part is exercised once task 10.1 exists.
    - Proof: `node _dev/level1_finish_effects.mjs` ends with `0 failed`.
    - **Validates: Requirements 7.5, 8.4**

  - [ ]* 9.14 Write property test for juice off and reduced motion
    - **Property 27: Juice off and reduced motion remove motion effects**
    - With `enabled: false`, particle count, shake amplitude and hit-stop stay 0 for any juice call sequence; with reduced motion, shake and hit-stop stay 0 and the charged-ring alpha is equal at any two times. Append to `_dev/level1_finish_effects.mjs`.
    - Proof: `node _dev/level1_finish_effects.mjs` ends with `0 failed`.
    - **Validates: Requirements 7.6, 7.7**

  - [ ]* 9.15 Write property test that effects do not change the simulation
    - **Property 28: Effects do not change the simulation**
    - For any key script on the real level, player positions, player energy and every source's charge are identical with all effects enabled and all disabled. Append to `_dev/level1_finish_effects.mjs`.
    - Proof: `node _dev/level1_finish_effects.mjs` ends with `0 failed`.
    - **Validates: Requirements 7.9**

- [ ] 10. Music wiring
  - [ ] 10.1 Add music configuration and the music bus
    - `src_scroll/music-config.js`: `LEVEL_MUSIC = Object.freeze({ 1: null })`. `src_scroll/audio.js`: a `music` bus (gain 0.4) beside the `sfx` bus (gain 1), `setMusicGain(g)` clamped to `min(g, sfxGain)`, `startMusic(url)` with injectable `opts.musicLoader`, `loop = true`, started once; a failed load resolves quietly; `stopMusic()`; `setEnabled(false)` stops music first and `startMusic` is a no-op while disabled. `src_scroll/main.js`: start music when `state === PLAYING`, audio is unlocked (first input) and `LEVEL_MUSIC[level.number]` is set. With `null` there is no fetch.
    - Proof: `node _dev/run_all.mjs` still ends with `0 failed`; behaviour is proved by tasks 10.2 to 10.4.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 10.2 Write the music example tests
    - `_dev/level1_finish_music.mjs` with `fake_audio.mjs`: loop flag set, start happens after `unlock`, silent with `null`, silent when the loader rejects, silent when disabled, a checkpoint respawn does not restart music.
    - Proof: `node _dev/level1_finish_music.mjs` ends with `0 failed`.
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [ ] 10.3 Write property test for the music gain bound
    - **Property 30: Music gain never exceeds the effects gain**
    - For any requested gain in [0, 2] the applied music gain is at most the effects bus gain, and the value reported to the Status_Report equals the applied value. Append to `_dev/level1_finish_music.mjs`.
    - Proof: `node _dev/level1_finish_music.mjs` ends with `0 failed`.
    - **Validates: Requirements 8.3**

  - [ ] 10.4 Write property test that a missing music file is silent
    - **Property 31: No music file means silence without error**
    - For a `null` config, a rejecting loader, or an undecodable buffer, starting Level 1 creates no music source, makes no fetch when the config is `null`, and raises no `console.error`. Append to `_dev/level1_finish_music.mjs`.
    - Proof: `node _dev/level1_finish_music.mjs` ends with `0 failed`.
    - **Validates: Requirements 8.5**

  - [ ] 10.5 [WAITING: Chief] Wire the music file when it arrives
    - Waits on Chief's file (O6, format and name open). Set the one value in `src_scroll/music-config.js` to the file name, add the file by name only (never touch `assets.zip`), and record file path, format, music gain and effects gain in the Status_Report. Skip rule: until the file exists, Level 1 plays silent and the sign-off is not blocked.
    - Proof: `node _dev/level1_finish_music.mjs` ends with `0 failed`; `node _dev/tools/level1_finish/protected_files.mjs verify` (exit 0, `assets.zip` hash unchanged).
    - _Requirements: 8.1, 8.3, 8.6, 8.7, 12.1_

- [ ] 11. Clean-up
  - [ ] 11.1 Remove the stale suite and add the manual list to `run_all.mjs`
    - Delete `_dev/aki27_draft.mjs` (`git rm -- _dev/aki27_draft.mjs`) and its `SKIP` entry in `_dev/run_all.mjs`. Add a `MANUAL` map (name, command, why manual) listing the Playwright suites already in `SKIP` and the new CLIs, and a `--manual` flag that runs them with `spawnSync` and prints each count.
    - Proof: `node _dev/run_all.mjs` output contains no `aki27_draft` line under `skipped:` and ends with `0 failed`.
    - _Requirements: 9.1, 10.4_

  - [ ] 11.2 Close `KIRO_ORDER_AKI_28.md`
    - Add a first-line header `CLOSED and OBSOLETE <date>: <reason>` (the draft suite was removed and the level changed since); keep the file.
    - Proof: `Select-String -Path docs\orders\KIRO_ORDER_AKI_28.md -Pattern '^CLOSED and OBSOLETE'` returns a match, and `Test-Path docs\orders\KIRO_ORDER_AKI_28.md` prints `True`.
    - _Requirements: 9.2_

  - [ ] 11.3 Fix the `LEVEL_DESIGN_V2.md` wording
    - Remove statements that `level_guard.mjs` exists or runs before pushes (section 7.1 item 17) and name the Diff_Check instead; tag the tower, lift, relay pylon, light cable, beacon and gatehouse headings (4.3a, 4.3b, 4.4 and the Appendix B rows) SUPERSEDED or REMOVED; restate Done_List items 5 (new Signpost), 6 (low street reconnects to the strip), 14 (Level 1 routes only) and 17 (full suite passing, Builder module version current, Chief signs off); describe the economy with the Charge_Figures (lamps 3, vending machine 2, AC capacity 4, exit 8, Placed_Charge 11). No Appendix A "After" edit in this task.
    - Proof: `Select-String -Path docs\design\LEVEL_DESIGN_V2.md -Pattern 'level_guard'` returns no claim that it exists or runs (only, at most, a note that it is replaced by the Diff_Check).
    - _Requirements: 9.3, 9.4, 9.5, 9.6_

  - [ ] 11.4 Fix `KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`
    - Replace the section 3 reference to `_kiro_tools\level_guard.mjs` with the Diff_Check command; describe the Charged_Object economy with the Charge_Figures. Keep every earlier log entry, including the ones added by tasks 6.4, 6.7, 6.14 and 6.17.
    - Proof: `Select-String -Path docs\orders\KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md -Pattern 'diff_check.mjs'` returns a match, and `Select-String -Pattern 'level_guard.mjs'` on the same file returns no claim that it exists.
    - _Requirements: 9.3, 9.6_

  - [ ] 11.5 Record the hint-copy note (O8) in the Status_Report
    - State that the hint text lives in `src_scroll/ui.js`, outside `level1.json`, that the written order covers the level file only, that Diff_Check cannot see it, and that any hint-copy change is listed separately. No code edit in this task.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'O8'` returns a match dated today.
    - _Requirements: 5.4, 5.6_

  - [ ] 11.6 Write the docs text-guard suite
    - `_dev/level1_finish_docs.mjs`: checks the strings and headings edited in tasks 11.2 to 11.4 (closed header, SUPERSEDED or REMOVED tags, Done_List items 5, 6, 14, 17, no `level_guard` claim, Charge_Figures). A text guard, not a behaviour test.
    - Proof: `node _dev/level1_finish_docs.mjs` ends with `0 failed`.
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 11.7 Delete temporary files and check the working tree
    - Delete every `$env:TEMP\l1f_*` file and folder (candidates, probe outputs, screenshots, run outputs). Keep the backups under `C:\Users\diepowel\Documents\_kiro_tools\level1_backups` (outside the repo). `git status` must show no untracked file other than the intended new files.
    - Proof: `Get-ChildItem $env:TEMP -Filter 'l1f_*'` returns nothing, and `git status --short` lists no unintended file and neither protected file staged.
    - _Requirements: 9.7_

- [ ] 12. Final run and sign-off
  - [ ] 12.1 Run the full suite
    - Record the passed and failed counts in the Status_Report. Any failure is attributed to its cause before sign-off.
    - Proof: `node _dev/run_all.mjs` ends with `0 failed`.
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 12.2 Run the manual suites
    - Record their counts in the Status_Report.
    - Proof: `node _dev/run_all.mjs --manual`
    - _Requirements: 10.4_

  - [ ] 12.3 Run the final CLI checks on the real file
    - The prover, Beat_Scan, Diff_Check and protected-file check must pass on the final state; the economy reads Placed_Charge 11, gate cost 8, lamps 3/3/3, vending machine 2, AC capacity 4; `git diff --name-only 86bcc78..HEAD` lists neither protected file. If a Beat, `CP2` or Signpost was skipped as WAITING, say so in the output record.
    - Proof: `node _dev/tools/level1_finish/diff_check.mjs`; `node _dev/tools/level1_finish/route_prover.mjs`; `node _dev/tools/level1_finish/beat_scan.mjs --strict`; `node _dev/tools/level1_finish/protected_files.mjs verify`; `git diff --name-only 86bcc78..HEAD` (the four commands exit 0, except that `beat_scan.mjs --strict` and `route_prover.mjs` may exit 1 when a WAITING placement was skipped, which is recorded as a finding and not as a failure; the last lists neither `assets/fixtures/hero-mechanics.json` nor `assets.zip`).
    - _Requirements: 2.10, 10.6, 10.11, 11.6, 12.1, 12.4_

  - [ ] 12.4 Run `version_editor.mjs` twice
    - The first run rewrites the module version in `editor.html`, `index.html` and `hero-lab.html`; the printed 16-hex value must differ from the value at `86bcc78`; the second run must change nothing further.
    - Proof: `node scripts/version_editor.mjs`; `git diff --stat -- editor.html index.html hero-lab.html > "$env:TEMP\l1f_ver1.txt"`; `node scripts/version_editor.mjs`; `git diff --stat -- editor.html index.html hero-lab.html > "$env:TEMP\l1f_ver2.txt"`; `Compare-Object (Get-Content "$env:TEMP\l1f_ver1.txt") (Get-Content "$env:TEMP\l1f_ver2.txt")` prints nothing.
    - _Requirements: 10.5_

  - [ ] 12.5 [WAITING: environment] Check that the Builder loads with no module error
    - Needs the screenshot harness from task 6.1. Skip rule: if it is `BLOCKED (environment)`, record that and continue.
    - Proof: `node "C:\Users\diepowel\Documents\_kiro_tools\shot_level1_candidate.mjs" --repo "C:\Users\diepowel\Documents\GitHub\overcharge" --builder` prints no page error and exits 0.
    - _Requirements: 10.5_

  - [ ] 12.6 [WAITING: Chief] Final Timed_Run with before and after figures side by side
    - Waits on the Beat, `CP2`, Signpost and Retune being applied or decided. Skip rule: if any is still open, report the figures for the current state and mark the list incomplete.
    - Proof: `node _dev/tools/level1_finish/timed_run.mjs --compare "$env:TEMP\l1f_timed_before.json"` prints before and after side by side.
    - _Requirements: 1.7, 6.10_

  - [ ] 12.7 Write the final Status_Report: revised Done_List and open dependencies
    - Pass or fail per Done_List item (17), and every open dependency with its owner (Orcha's copy, the Music_Track, Chief's approvals, the arrow art decision, the timing shortfall). Describe Level 1 as "not finished" until the sign-off is recorded. When only the Music_Track is open, state that Chief is asked to play Level 1.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - Done_List'` returns a match dated today.
    - _Requirements: 10.7, 10.8, 10.10_

  - [ ] 12.8 Stage the final files by name
    - Stage by name: the new and changed files of this feature (`src_scroll/` modules, `_dev/` suites and tools, the docs, `editor.html`, `index.html`, `hero-lab.html`). Never `assets/fixtures/hero-mechanics.json` or `assets.zip`. Commit only when the session's instructions allow it.
    - Proof: `node _dev/tools/level1_finish/protected_files.mjs verify` (exit 0), then `git diff --cached --name-only` lists neither protected file.
    - _Requirements: 12.2, 12.3, 12.4_

  - [ ] 12.9 [WAITING: Chief] Record Chief's sign-off
    - Waits on Chief playing Level 1. Record the sign-off, the date and Chief's words in the Status_Report. Skip rule: until recorded, Level 1 stays described as not finished.
    - Proof: `Select-String -Path KIRO_STATUS.md -Pattern 'Level 1 finish - sign-off'` returns a match containing Chief's words.
    - _Requirements: 10.9, 10.10_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass. If one fails, record the failure and its cause in the Status_Report and continue; do not ask the owner anything here.

## Notes

- Tasks marked with `*` are optional (extra property tests beyond the required checks) and can be skipped for a faster MVP.
- Tasks labelled `[WAITING: <owner>]` wait on something outside Kiro. The runner skips them and records `BLOCKED (<owner>)`; they never fail the run and never block a non-WAITING task.
- Tasks marked `LEVEL-FILE EDIT` follow the Level-file guard in the Overview: written order, four Named_Changes only, text-level edit, Diff_Check afterwards, log in `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.
- Each task names the requirement numbers it satisfies and the exact command that proves it.
- Property tests validate universal correctness properties; unit and example tests validate specific cases and real-file facts.
- Facts verified when this plan was written: the working repo is `C:\Users\diepowel\Documents\GitHub\overcharge`; `KIRO_STATUS.md`, the standing-orders log, `LEVEL_DESIGN_V2.md`, `_dev/run_all.mjs`, `_dev/aki27_draft.mjs`, `src_scroll/ui.js`, `PLAYER_MOVEMENT_METRICS.md`, `_dev/tools` and `_dev/fixtures` exist.
- This phase wrote the plan only. No code or level file was edited.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5", "1.19"] },
    { "id": 2, "tasks": ["1.6", "1.9", "1.13", "1.20", "1.23"] },
    { "id": 3, "tasks": ["1.7", "1.10", "1.14", "1.21", "1.24"] },
    { "id": 4, "tasks": ["1.8", "1.11", "1.15", "1.22", "1.25"] },
    { "id": 5, "tasks": ["1.12", "1.16", "1.26"] },
    { "id": 6, "tasks": ["1.17", "1.27"] },
    { "id": 7, "tasks": ["1.18"] },
    { "id": 8, "tasks": ["1.28"] },
    { "id": 9, "tasks": ["3.1", "3.2", "3.3", "5.1", "6.1"] },
    { "id": 10, "tasks": ["3.4"] },
    { "id": 11, "tasks": ["5.2"] },
    { "id": 12, "tasks": ["5.3", "5.4", "5.5", "5.6", "6.8"] },
    { "id": 13, "tasks": ["6.2", "6.9", "6.10", "7.1", "8.1", "9.1", "9.2"] },
    { "id": 14, "tasks": ["6.3", "6.11", "7.2", "8.3"] },
    { "id": 15, "tasks": ["6.4", "7.3", "8.4", "9.3"] },
    { "id": 16, "tasks": ["6.5", "7.4", "8.5", "8.8", "9.4"] },
    { "id": 17, "tasks": ["6.6", "7.5", "8.6", "9.5", "9.7"] },
    { "id": 18, "tasks": ["6.7", "7.6", "8.7", "9.6", "9.8"] },
    { "id": 19, "tasks": ["6.12", "7.7", "8.2", "9.9", "9.11", "10.1"] },
    { "id": 20, "tasks": ["6.13", "8.9", "9.10", "9.12", "10.2"] },
    { "id": 21, "tasks": ["6.14", "8.10", "9.13", "10.3"] },
    { "id": 22, "tasks": ["6.15", "6.18", "8.11", "9.14", "10.4"] },
    { "id": 23, "tasks": ["6.16", "8.12", "9.15", "10.5", "11.1", "11.2", "11.5"] },
    { "id": 24, "tasks": ["6.17", "8.13", "11.3"] },
    { "id": 25, "tasks": ["8.14", "11.4"] },
    { "id": 26, "tasks": ["8.15"] },
    { "id": 27, "tasks": ["8.16", "11.6"] },
    { "id": 28, "tasks": ["8.17"] },
    { "id": 29, "tasks": ["8.18"] },
    { "id": 30, "tasks": ["11.7"] },
    { "id": 31, "tasks": ["12.1"] },
    { "id": 32, "tasks": ["12.2", "12.3"] },
    { "id": 33, "tasks": ["12.4"] },
    { "id": 34, "tasks": ["12.5"] },
    { "id": 35, "tasks": ["12.6"] },
    { "id": 36, "tasks": ["12.7"] },
    { "id": 37, "tasks": ["12.8"] },
    { "id": 38, "tasks": ["12.9"] }
  ]
}
```
