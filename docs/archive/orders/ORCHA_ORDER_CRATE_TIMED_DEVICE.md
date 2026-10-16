# ORCHA — ORDER: CONDUCTIVE CRATE + TIMED DEVICE (MVP systems)

**From:** Kiro (Technical Chief) · **Authority:** Chief approved, 2026-09-12
**Branch:** `agent/orcha-dev` (rebase/merge from current `agent/orcha-gameplay` FIRST —
it moved: SPACE_CHARGE, asset purges, cache fixes). Kiro QA-gates the merge.

## Why

GDD §12 MVP requires: gate ✓, switch ✓, **movable conductive object ✗**, **one
timed device ✗**. These are the last two engine systems missing from the MVP
vertical slice. GDD levels 4–5 (Carry Current / Power and Position) and §6
puzzle vocabulary (Conductive Crates, Temporary Circuits, Timed Power) depend
on them.

## System 1 — Conductive Crate

A pushable box that participates in circuits.

- **Movement:** player pushes it by walking into it (no carry, no grab button —
  simplest thing that works). Gravity applies; it rests on tiles/platforms.
  Blocks the player and enemies like a solid.
- **Conductive:** while the crate touches a source, gate, or switch, it can act
  as a circuit bridge — design the minimal version: a crate parked against a
  device counts as "contact"; SPACE-charging INTO the crate passes energy to a
  device it touches. Document exactly what v1 supports; do not build
  magnetization or multi-crate chains (GDD lists them as later ideas).
- **Energy rules:** all transfer through the Order 004 authority
  (`spendEnergy`/`receive`), conservation invariant intact.
- **Schema:** new `crates: [{ id, x, y, w?, h? }]` array in level JSON —
  document in `docs/LEVEL_SCHEMA.md`. Serialization must round-trip (parity
  harness will get a fixture check from Kiro at gate time).

## System 2 — Timed Device (Temporary Circuit)

A device that stays powered only briefly — GDD "Timed Power" / Level 7 seed.

- **Behavior:** charge it like a gate (SPACE hold, `required` units). Once
  full, it activates for `duration` seconds, then drains to empty and its
  effects revert. Countdown must be visible (pulse/flicker as time runs out —
  simple render state, no new art dependencies).
- **v1 effect target:** a gate that stays open only while the timer runs
  (`timed: true, duration: <seconds>` on the gate object) — this reuses the
  existing gate rendering/blocking and needs no new art. A timed PLATFORM can
  come later; do not build it now.
- **Schema:** `timed` + `duration` optional gate fields, documented in
  `docs/LEVEL_SCHEMA.md`. Non-timed gates completely unaffected.

## Constraints

- Energy movement only through the Order 004 authority. Conservation suite
  must stay green.
- No editor work in this order (Aki gets a follow-up for palette/spawn
  buttons); BUT your schema must be loadable: a hand-authored test level JSON
  with a crate + timed gate must boot and play.
- Tests: extend `_dev/` with crate-push, crate-bridge, timed-activate/expire,
  and conservation-through-crate cases. All suites end 0 failed. Include a
  headless boot of your hand-authored test level.
- No projectiles, no new enemies, no polarity/frequency — out of scope.

## Handoff

ORDER CRATE_TIMED: COMPLETE / BLOCKED · schema docs updated · tests with
counts · ORCHA_STATUS.md · full SHA · pushed to `agent/orcha-dev` · HOLD for
Kiro QA gate.
