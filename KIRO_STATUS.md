# KIRO Status History

## Order #1 — Parity Regression Harness

- **Date/time:** 2026-09-06T13:34:54-04:00
- **Assignment:** Build automated regression coverage for the Builder → JSON → save/load → runtime gameplay contract without redesigning gameplay or modifying active Builder behavior.
- **Work completed:** Created an isolated `agent/kiro-parity` worktree from the `agent/orcha-gameplay` baseline and added a Node-based parity harness. The harness exercises JSON round trips, flat row-major tiles, tile-art values, player/object coordinate conventions, runtime constructor projection, persistence key contracts, local-play key contracts, and validation of committed canonical levels.
- **Files changed:**
  - `_dev/parity_regression.mjs`
  - `KIRO_STATUS.md`
- **Tests added/run:**
  - `node _dev/parity_regression.mjs` — **63 passed, 0 failed**.
  - `node _dev/test_electricity.mjs` — existing suite completed with **37 passed, 0 failed** in its printed summary.
- **PASS/FAIL results:** PASS for the implemented Node-level parity checks and the existing electricity checks.
- **Defects discovered:**
  - The assignment wording calls values `2–9` reserved, but the current runtime and `docs/LEVEL_SCHEMA.md` define tile value `2` as a supported one-way platform and reserve `3–9`. The harness preserves the current runtime/schema contract and rejects `3–9`; this needs Chief/TD wording confirmation.
  - Bundled/directory/IndexedDB level loading remains more weakly validated than upload/recovery paths. Malformed object payloads, duplicate IDs, out-of-range coordinates, and broken links are not comprehensively rejected before runtime construction. This is documented only; no Builder behavior was changed.
- **Technical decisions:**
  - Used a standalone `.mjs` test runner with Node built-ins and no added dependency.
  - Mocked `Image` only so production runtime constructors can be instantiated under Node; no rendering assertions are claimed.
  - Tested current mixed anchors rather than normalizing them: player/source/gate/switch are top-left, checkpoint x is center and y is ground level, decorations retain render geometry while `snap` is Builder-only metadata.
  - Kept editor code untouched. The harness is isolated under `_dev/` in Kiro's dedicated worktree.
- **Known limitations:**
  - No rendered Builder or browser runtime visual QA was performed.
  - Runtime loader helpers are private and boot a browser loop, so the harness tests shared data/constructor contracts rather than executing the full browser boot sequence.
  - IndexedDB/localStorage browser precedence is checked through stable keys and source contracts, not a live browser storage integration run.
- **Chief/TD decisions required:** Confirm whether the permanent tile policy should describe `2` as supported one-way or reserve all values `2–9`; assign any future strict load-time validation work to the Builder owner before changing editor behavior.
- **Harness commit SHA:** `b466843ba80e0cd1c98e8b1478001ff7e81a8235`
- **Push status:** YES — pushed with this status record to `agent/kiro-parity`.
- **Recommended next step:** Chief/TD reviews the tile-value wording and assigns a browser-level Builder/runtime visual smoke lane if end-to-end rendered proof is required.
