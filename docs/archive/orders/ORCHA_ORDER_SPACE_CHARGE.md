# ORCHA — ORDER: SPACE = CHARGE/ATTACK, KILL THE F INSTANT-FILL

**From:** Kiro (Technical Chief) · **Authority:** Chief directive, 2026-09-12
**Branch:** work on `agent/orcha-dev`, Kiro QA-gates the merge to `agent/orcha-gameplay`

## Chief's words (the spec)

> "hitting f auto completes the charge gate, i dont want that; plus i want to
> use spacebar to charge/attack — logic needs to be: space bar make electric
> projectile, near gate it charges the gate (dont need to make electric
> projectile now just telling you the logic)"

## What exists today (verified in code)

- `player.js _updatePipSpend()` — **F** near a device with a banked pip inserts
  one whole battery (10 energy) through `dev.receive()`. Level 1's exit gate
  needs 3 → one press = instant open. This is what Chief is rejecting.
- `player.js _updateDischarge()` — **hold E** near a gate/switch = gradual
  transfer at `DISCHARGE_RATE`, routed through `spendEnergy()` (demand-driven
  pip promotion when the bar dries). This mechanic is correct — only its
  binding moves.
- **SPACE** is currently attack-only near enemies and never touches energy.
- `player.js ~520/565` + `level.js ~62` — HUD prompts reference the F spend
  ("[F] SPEND PIP") and E discharge.

## Required behavior

1. **SPACE is the one charge/attack button.**
   - Near a gate/switch: **hold SPACE = gradual charge**, exactly the existing
     `_updateDischarge` mechanic (rate-based, `spendEnergy()` authority,
     `dev.receive()` path, capped by `needed`, never overcharges).
   - Near an enemy: SPACE remains attack. Both contexts coexist; if a gate and
     an enemy are both in range, design a sane priority and document it.
   - **Future (do NOT build now):** SPACE with no context = fire electric
     projectile. Structure the SPACE handler so the projectile case can slot in
     as a third branch later without rewiring charge/attack.

2. **Remove the F instant-fill binding.** No button may complete a gate in one
   press. The `spendPip()` authority function STAYS (the demand-driven
   `_pullReserve` promotion depends on the reserve path, and Order 004 ruling 3
   tests exercise it directly) — only the `KeyF` input path to it goes.

3. **E stays the absorb/interact button at sources.** Decide and document
   whether E ALSO still discharges (two bindings, one mechanic) or whether
   charging is SPACE-only — recommend SPACE-only so the controls stay teachable,
   but state the choice in your status entry.

4. **Prompts must match reality.** Every HUD prompt that says F-to-spend or
   E-to-discharge near a device must be updated to the SPACE wording. UI and
   gameplay must keep using the same affordability authority (`usableEnergy`).

## Constraints (non-negotiable)

- Every energy movement stays routed through the Order 004 authority
  (`spendEnergy` / `giveEnergy` / `receive`). No new drain arithmetic.
- Conservation invariant (§7) must keep passing untouched.
- Update `_dev/` tests that assert the old bindings; add coverage for
  SPACE-charges-gate. `node _dev/energy_authority.mjs` and
  `node _dev/test_electricity.mjs` must end 0 failed.
- `input.js` already captures `Space` — no listener changes expected.
- Do not build projectiles, new weapons, or new HUD art under this order.

## Handoff format

ORDER SPACE_CHARGE: COMPLETE / BLOCKED · tests listed with counts ·
ORCHA_STATUS.md updated · full SHA · pushed to `agent/orcha-dev` · then Kiro
runs the QA gate before anything reaches the live line.
