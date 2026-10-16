# Aki traversal QA delivery — AKI_15

2026-09-30. Delivers `docs/KIRO_ORDER_AKI_15.md` / `docs/AKI_NEXT_TASK_TRAVERSAL_QA.md`.

## Branch / commit

- Branch: `agent/aki-editor`
- Based on `agent/orcha-gameplay` at `f805eef` (merged clean, no conflicts, fast-forward — no divergent local commits existed at merge time)
- This delivery's own commit SHA: see the commit this file ships in (`git log -1` on `agent/aki-editor`)
- **Not pushed to `agent/orcha-gameplay`.** Pushed to `origin/agent/aki-editor` only, for Chief's selective review per the order's instruction ("Report your commit and branch when ready for Chief's selective review").

## Changed files

- `_dev/fixtures/traversal-qa.json` — new, isolated fixture. **Not added to `levels.json` or any campaign level list.** Does not touch `level1.json` or any other campaign level.
- `_dev/traversal_qa_fixture.mjs` — new headless automated-check suite (same pattern as `_dev/facade_routes.mjs` / `_dev/checkpoint.mjs`: real `Level` + real `Player`, no browser).
- `docs/AKI_TRAVERSAL_QA_DELIVERY.md` — this file.

No Builder/runtime source code changed, so no module-version regeneration was needed.

## Measured movement limits used (cited, not guessed)

Source: `docs/CHIEF_VERTICALITY_METRICS_UPDATE.md` (Chief's repaired real-Level harness) and direct reads of `src_scroll/constants.js` / `src_scroll/terrain-policy.js`:

| Metric | Value |
|---|---|
| TILE size | 32 px |
| Walk / sprint speed | 75 / 127.5 px/s |
| Jump rise (either gait) | 99.17 px (≈3.1 tiles) |
| Tested upward ledge landing | 96 px (3 tiles) |
| Conservative gap, walk / sprint | 32 / 96 px |
| Peak fall speed (drop fixture) | 700 px/s |

Caveats carried over from Chief's doc: gap results assume left-edge-reaches-target-floor with that harness's specific jump timing, not the mathematical max reach. The old `PLAYER_MOVEMENT_METRICS.md` 14-row baseline is stale and was **not** used.

## Fixture layout

Single wide level, 140 cols × 20 rows (pxW 4480, pxH 640), one row of ground (rows 17–19, tile `1`) running under all 6 stations, each separated by a full-height solid wall (2 cols) so stations are unambiguously isolated. `playerStart` is at the far left (station 1 entry).

### Station 1 — normal spawn/return, jump height, horizontal reach, head clearance (cols 0–23)
- 3-tile gap (cols 6–8, 96 px): confirmed walking alone cannot clear it; sprint+jump clears it. **Working.**
- 3-tile-high ledge (cols 11–14, row 14 → 96 px rise): reachable by a normal jump, matches the cited 96 px tested ledge-landing exactly. **Working.**
- Normal-headroom corridor (cols 16–20, ceiling at row 13 → 96 px clearance): confirmed unobstructed walk-through. **Working.**
- Return route: no one-way barriers anywhere in this station; fully two-way. **Working.**

### Station 2 — ladder (cols 26–41) — **BLOCKED, planned-only**
Direct code inspection (`editor/hero-lab.js`, `src_scroll/hero-sprites.js`, every file in `src_scroll/`) confirms `ladder-up` / `ladder-down` / `ledge-climb` exist **only as animation pose names**. There is no ladder entity, no climb-state in `player.js`, no collision rule anywhere that treats a ladder as climbable.
- Lower platform (cols 26–29, floor height) and upper platform (cols 34–37, row 8 → 288 px above the lower floor, far beyond the 99 px jump rise) exist as the two endpoints a ladder would connect.
- Open shaft between them (cols 30–33, full height, no tiles) is where a ladder would go. **No ladder decoration or tile was placed** — confirmed by test: walking into the shaft simply falls (gravity only), there is no climb/grab/interrupt behavior to test. **This station is correctly left non-functional and documented as the missing contract: a ladder entity type with climb-state input handling in `player.js` and a corresponding `tiles`/`decorations` convention. Do not substitute a decorative ladder.**

### Station 3 — reachable ledge + blocked-headroom counterpart (cols 44–65)
- Reachable ledge (cols 49–51, row 14 → 96 px, same jump as station 1): confirmed reachable. **Working** (plain jump-up onto a solid platform — this is ordinary jump physics, not a "ledge-climb" grab mechanic).
- Blocked-headroom counterpart (cols 57–58, same 96 px ledge height) is preceded by a low ceiling (cols 55–56, row 15, 32 px clearance — less than `PLAYER_H` 30 with margin for the jump arc). Confirmed: the ceiling prevents any upward jump arc, so the identical ledge height is unreachable from this approach. **Correctly blocks, as intended** — demonstrates free-space/head-clearance checks matter independently of ledge height.
- Note: a true "ledge-climb" (grab the edge of a wall mid-air and pull up) is a separate, **unsupported** mechanic from a plain jump onto a platform top; this fixture only exercises the latter, per the order's instruction not to treat climb animations as implemented.

### Station 4 — safe drop + checkpoint/death/respawn (cols 68–89)
- `Checkpoint` at `(2224, 544)` (`CP_S4`): confirmed activates via `Checkpoint.tryActivate()` when the player stands on it.
- Safe drop (cols 72–74, 32 px step down, one row): confirmed crossed without death.
- Death pit (cols 78–83, full-depth, no floor): confirmed the player's `y` crosses `level.pxH + 60` (= 700), the exact threshold `src_scroll/main.js` uses to call `_respawn()`. Respawn-to-checkpoint itself is `main.js` game-loop state (not exercised by the headless `Level`/`Player` pair, which has no game-loop); the headless check proves the trigger condition fires correctly for this geometry. **Working**, respawn wiring itself already covered by the existing `_dev/checkpoint.mjs` regression suite.

### Station 5 — raised facade: one-way landable top, open lower route, solid wall (cols 92–117)
Built using the exact tile semantics in `src_scroll/terrain-policy.js` (`tileAllowsLanding`: tile `2` only supports landing when the player's previous feet position was at or above the surface — i.e. landable from above, passable from below), copying the real pattern already shipped in `level1.json`'s rooftop (verified by reading it directly) and exercised by `_dev/facade_routes.mjs`.
- Open lower route (full station width at ground level): confirmed walkable, unobstructed.
- One-way roof (cols 100–109, row 14, tile `2` → 96 px above the lower route): confirmed reachable by jumping up from below.
- Separate genuinely solid wall (cols 113–114, tile `1`, full height): confirmed it blocks horizontal movement outright, distinct from the one-way tile.
All **working**, matching Chief's shipped facade mechanic — no new mechanic invented.

### Station 6 — combat target space (cols 120–139)
One `DrainEnemy` (fixture `type: "drain"`, confirmed via `src_scroll/level.js`'s dispatch `d.type === 'drain' → new DrainEnemy(d)`) on a patrol between cols 122–137. Present purely as a target for future attack/projectile checks; **no damage, energy or combat rule was changed or invented.**

## Automated checks (run this session, headless, no browser)

`node _dev/traversal_qa_fixture.mjs` — **19 passed, 0 failed**. Covers: fixture loads via the real `Level` constructor; station 1 gap/ledge/headroom; station 2's shaft-falls-instead-of-climbs behavior; station 3's reachable vs. blocked ledge; station 4's checkpoint/safe-drop/death-plane; station 5's open route/one-way landing/solid wall; station 6's enemy type.

`node _dev/run_all.mjs` — ran the full suite before and after adding these two files (compared via `git stash`): **identical 2222 passed / 85 failed across 35 suites both times.** The pre-existing failures (`chest_builder.mjs` and `drone_sensing.mjs` crashes, `level2_fork.mjs` crash, `module_parse.mjs` 30 failing, `parity_regression.mjs` 50 failing, `prop_sources.mjs` 3 failing, `completability.mjs` 2 failing) are unrelated to this delivery and present on the merged tree with or without these two new files. This fixture introduces zero regressions.

## Browser / Builder acceptance — NOT performed this session

Per the order's fallback instruction ("If browser tooling fails, deliver the fixture and precise manual steps with the limitation, rather than calling acceptance complete"): browser/dev-server tooling was unreliable earlier in this session, and no Builder-tab verification was attempted for this delivery. **The following manual steps are precise and ready for Chief (or Aki in a future session with working browser tooling) to run; none of this has been observed in a live browser yet:**

1. Open a disposable Builder tab (do not touch any tab with unsaved campaign work).
2. Import `_dev/fixtures/traversal-qa.json` (not a campaign level — use the Builder's load-from-file / paste-JSON path, not "load level").
3. Confirm on load: 140×20 grid, player spawn at far left, 6 visually distinct zones separated by solid-wall columns.
4. Run Builder TEST and record the actual loaded source (per the order: "record the actual loaded source").
5. In TEST mode, walk/sprint across each station per the descriptions above; confirm station 2's shaft only lets you fall (no climb); confirm station 3's blocked ledge is unreachable while the open one is reachable; confirm station 4's death pit respawns you at the checkpoint; confirm station 5's one-way roof/open route/solid wall behave as in the automated checks.
6. Save/export and reload the fixture (not over any campaign level) to confirm geometry and all supported object arrays (`checkpoints`, `enemies`) survive a round trip.
7. On a **copy** of this fixture, exercise Add Section Above / Add Section Right (`editor/actions.js`), verifying entity offsets, aligned rotation/flip arrays, undo/redo, spawn, descent and respawn, per the outstanding items in `docs/CHIEF_AKI_VERTICALITY_REVIEW.md`.
8. Never SAVE this fixture over `level1.json` or any other campaign level, and never overwrite another computer's unsaved Builder draft.

## Outstanding mechanics (explicitly not implemented here, per scope)

- **Ladder climb** (station 2): no entity, no physics, no input handling exists. Needs a new entity type + climb player-state before this station can be anything but a documented gap.
- **Ledge-climb grab** (station 3): same gap — the station only proves plain jump-onto-platform works, which is a different, already-supported mechanic.
- Hero-v3 gait activation and fractional-dimension Builder validation (`CHIEF_AKI_VERTICALITY_REVIEW.md` items #3) remain open and are out of scope for this fixture.

Chief: please run the manual Builder/TEST steps above and selectively integrate/deploy as you see fit.
