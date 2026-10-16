# KIRO ORDER: CODEX 02 (the 10-unit bar and the new charge rules)

**From:** Kiro, Technical Director | **To:** Codex | **Authority:** Chief, round 11 (2026-10-15)
**Follows:** `KIRO_ORDER_CODEX_01.md` Phases A and B (built; thank you). **Status:** work order, nothing started.
**Branch:** your own branch, push as `AGENTS.md` describes. Never force-push. Do not merge to the live line.

## Chief's new rulings (read `docs/GAME_DESIGN_V2.md` sections 3.1, 3.3, 3.8, 3.9 and 13 round 11)
1. The bar is **10 units** and **a pip always banks at 10.** (Reverses the 25-unit bar of 2026-10-09.)
2. **Q spends the whole pip,** at a gate or switch only for now. A boss special attack is a later concept.
3. **Charge is slow when the bar is empty and speeds up as it fills,** for absorbing and for charging.
4. **Each powered object has its own charge, scaled to its power.** The table is in section 3.9.
5. In Level 1, absorbing the three 4-charge lamps must end with **1 banked pip and 2 charge.**
6. The **Capacitor Module** (capacity item) is **ON HOLD**: Chief has not decided what it raises. Do not build
   `CapacityPickup` or a per-player `maxCharge`. Ignore task A5 in CODEX 01.

## Tasks, in order

### 1. The 10-unit bar
- `MAX_CHARGE = 10` in `constants.js`. Everything reads it (player, `energy-hud.js`, tests). The bar tops out at 10:
  reaching 10 banks a pip and resets (the first-iteration rule), with the overflow carried into the new bar.
  `MAX_BANKED_PIPS` stays 5. Usable energy is `bar + 10 x pips`, at most 60.
- The HUD label reads `n / 10`. The cost marker for a device (GAME_DESIGN_V2 8.3) sits at 80% for an 8 exit.
- **Tests:** a scratch run of `pip_gate_spend.mjs` with `MAX_CHARGE = 10` passes 39 of 53 and the 14 failures are
  the literal 25-based numbers. Rewrite them with the new table in GAME_DESIGN_V2 3.2 (a pip pays one 8-gate;
  two pips pay two and leave 4). Update `energy_authority` and any other test that hard-codes 25 or 150, and
  list every number you changed in your report.
- **Add a Level 1 test** that drives the real `Player` and the real `level1.json` and absorbs all three lamps:
  the result must be **1 banked pip and 2 in the bar** (12 = 10 + 2).

### 2. Q spends the whole pip
In `_updatePipSpend` (`player.js`) remove `this.giveEnergy(pip - needed)`. The pip is consumed, the gate or switch
receives what it needs, and nothing returns to the bar (a 10-unit pip on an 8 exit wastes 2). Keep Q a no-op with
no pip. Give the spend function a `purpose` argument (`'device'` only for now) so a later special attack can reuse
it. Update the Q tests: instant open, whole pip consumed, no refund, no pip does nothing.

### 3. Charge speed: slow when empty
Replace `chargeTransferRate` (`constants.js`, currently `1 + held / MAX_CHARGE`, 3 to 6 units/s) with:
`rate = BASE_RATE x (RATE_FLOOR + (1 - RATE_FLOOR) x fill)`, where `fill = bar / MAX_CHARGE`, `BASE_RATE = 3`,
`RATE_FLOOR = 0.4`. That is **1.2 units/s empty to 3 units/s full.** Export both constants so Chief can tune them.
Apply to absorbing **and** charging, every target. `held` is the bar only, not pips.
- **Verify by measurement and put the numbers in your report:** from an empty bar the first 4-unit lamp should
  take about **2.6 s**; absorbing all three lamps to reach 1 pip + 2 charge should take about **6.5 s**. (Kiro
  calculated these. If yours differ, say why.)
- Update `energy_authority` and the two-way tests for the new rate. Keep the conservation test: nothing is created
  or lost by a transfer.

### 4. The charge table in one place
Add `CHARGE_TABLE` to `constants.js` (kind name to default charge), exactly as in GAME_DESIGN_V2 3.9:
security camera 1; vending machine 2; fuse box 2; small neon sign 2; ATM 2; shutter motor 2; charge platform 2;
AC or HVAC unit 3; streetlight 4; large neon sign or billboard 4; generator 8; substation or transformer 10.
Add `MAX_OBJECT_CHARGE = 10`. Clamp any source whose authored `charge` exceeds 10? **No:** existing levels keep
their authored numbers; log a warning instead. The Builder (Aki's order) imports this table for its defaults. Add a
test that every value is between 1 and 10 and that Level 1's lamps are 4.

### 5. Report
Report as `CODEX 02`: per task PASS/FAIL, commit SHA, files, tests changed (with the old and new expectation for
each), the full-suite totals against **2779 passed, 7 failed** (the live line today; the 7 are `level2_fork` 2,
`npc_dialogue` 4 and `prop_sources` 1, none yours, plus two suites that crash before reporting), and the measured
timings from task 3. Then HOLD for Kiro's review.

## Still open from CODEX 01 (not part of this order)
Phase C is not reported: path-based platforms, the "Charge gate to open." label, per-level objectives, reactive NPC
lines and player events. Say in your report which of those you have started.

## Do not
Edit level files. Build the capacity pickup. Change an exit cost (8). Loosen an assertion to make it pass.
