# City drones integration — 2026-09-28

Chief requested replacement of the flying drone, addition of the grounded drone,
and visible/placeable Builder entries with an ENEMIES filter.

## Implementation

- Source: Chief-supplied `Overcharge-Enemy-Drones-v1.zip`, version 1.0. Its two
  enemy modules and eighteen city-drone PNGs were integrated. Dependency snapshots
  were treated as reference material; the live player/energy implementation was
  not replaced.
- `drone` remains a supported authored alias for `sky-sentry`, so all existing
  flying enemies become Sky Sentries without a level-file migration. New Builder
  placements author `sky-sentry` and `wheel-drone`.
- Sky Sentry retains the live flying enemy's tuned sensing, chase, return and
  warning behavior. Its new weapon locks aim, warns for 0.55 seconds, and fires
  for 0.24 seconds. Cover stops the laser; killing the sentry cancels it.
- Wheel Drone patrols on terrain, turns at walls/edges/closed gates/crates, winds
  up for 0.5 seconds and fires three plasma shots 0.18 seconds apart. Recovery is
  1.5 seconds. Both enemies have 2 HP and drop two units of charge.
- The curated asset manifest keeps stable `drone_enemy` as the Sky Sentry entry
  and adds `wheel_drone`. Animation frames/source sheets are not palette entries.
- Builder category label and shortcut: ENEMIES. Search uses readable names.
  Click-place and drag/drop route through gameplay creation and undo history.
  Floating/grounded anchors, sprite size and selection bounds match the runtime.
- Level checkpoints include detached weapon state, so repeat restores cannot
  mutate the saved laser or plasma objects.

## Verified baseline and results

Integration began at `17445afb6526d53b66fcd5995b7a29d9772e546b`, with a clean
isolated worktree. Chief's dirty `design/overcharge-v2` playground was preserved.

Baseline `node _dev/run_all.mjs`: **2004 passed / 51 failed** across 23 suites,
plus the existing `save_publish` crash under Node 24.19.0. Existing failures:
`parity_regression` 49, `level2_fork` 2.

After integration: **2071 passed / 51 failed** across 26 suites, with the same
save/publish crash and no additional failures. Focused suites:

- `city_drones`: 14/0.
- `drone_weapons`: 13/0.
- `enemy_builder`: 36/0 (palette, frame dimensions, JSON dispatch, legacy alias,
  collider parity, drag anchors, undo/redo and repeat plasma restore).
- `drone_sensing`: 163/0. Weapon-observation assertion now accepts an active
  laser in addition to legacy blasts; the warning and hit assertions remain.
- `prop_sources`: 86/0. Expected visible palette total is 55 after adding Wheel.
- `energy_authority`: 88/0; `test_electricity`: 37/0; module parse: 112/0.

## Browser QA

On the integrated local server, the real Builder showed two loaded thumbnails
under ENEMIES. Clicking Sky Sentry and clicking the canvas authored a selected
`sky-sentry`; dragging Wheel Drone from the bank authored a grounded
`wheel-drone`, not a decoration. One Undo removed the wheel enemy, and Redo
restored it. TEST LIVE rendered both supplied sprites at the authored anchors;
the preview visibly showed the red laser and plasma attacks.

QA enemies existed only in temporary preview state. Published level layouts
retain their authored enemy counts; Wheel Drone is available for Chief to place.

## Remaining limits

The inherited 51 regression failures and Node save/publish harness crash remain
separate maintenance work. Chief should playtest enemy size, laser timing and
plasma pressure in his chosen encounter layouts. Browser checks establish
rendering/placement integration, not a complete encounter-balance sign-off.
