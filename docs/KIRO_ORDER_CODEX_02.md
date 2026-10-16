# KIRO ORDER: CODEX 02 (the 10-unit bar, pip slots and the new charge rules)

**From:** Kiro, Technical Director | **To:** Codex | **Authority:** Chief, rounds 11 and 12 (2026-10-15)
**Follows:** `KIRO_ORDER_CODEX_01.md` Phases A and B (built; thank you). **Status:** work order, nothing started.
**Branch:** your own branch, push as `AGENTS.md` describes. Never force-push. Do not merge to the live line.
**Scope:** Level 1 only. Chief: design one level at a time; ignore the charge economy of Levels 2 to 6 for now.
(Existing levels must still load and behave. Do not edit level files.)

## Chief's rulings (read `docs/GAME_DESIGN_V2.md` sections 3.1, 3.3, 3.8, 3.9 and the round 12 ledger)
1. **The bar holds 10. A pip is always 10.** Reaching 10 with a free slot banks a pip and resets the bar.
2. **The player starts with ONE pip slot** (so at most 20 held: 10 bar + 1 pip). Each Capacitor Module, later,
   adds one slot (+10), up to 5 slots (60). Slots are a per-player number; `MAX_BANKED_PIPS = 5` becomes the ceiling.
3. **Exits stay at 8.** Q takes a banked pip, **pays the gate's price (8), and the other 2 returns to the bar**
   (anything the bar cannot hold is lost). This is what you already built; keep it.
4. **Charge is slow when the bar is empty and speeds up as it fills,** for absorbing and charging.
5. **Each powered object has its own charge,** from the table in section 3.9.
6. In Level 1 (round 15: **three 3-charge lamps**), absorbing the three lamps ends with **bar 9 and no pip**; adding the market vending machine (2) that Chief is placing ends with **1 banked pip and 1 in the bar**. The old "three 4-charge lamps = 1 pip + 2" no longer holds.
7. The Capacitor Module pickup is **later**; do not build it now. Ignore task A5 in CODEX 01.

## Tasks, in order

### 1. The 10-unit bar and pip slots
- `MAX_CHARGE = 10` in `constants.js`. Add `START_PIP_SLOTS = 1`. The player has `pipSlots` (start 1, never above
  `MAX_BANKED_PIPS`, which stays 5). Banking happens when the bar reaches 10 **and** `bankedPips < pipSlots`.
  If the bar is full and every slot holds a pip, further absorbing is **refused and the source keeps its charge.**
  Usable energy is `bar + 10 x pips`. `pipSlots` is included in checkpoint snapshots.
- **HUD (`energy-hud.js`):** the label reads `n / 10`. Draw all five pip icons: slots above `pipSlots` look
  locked and dim, free slots look empty, banked pips look charged. The device cost marker (GAME_DESIGN_V2 8.3)
  sits at 80% for an 8 exit. Kiro already made the bar red, yellow, cyan (`chargeColors`); do not change that.
- **Tests:** a scratch run of `pip_gate_spend.mjs` with `MAX_CHARGE = 10` passes 39 of 53; the 14 failures are
  the 25-based numbers. Rewrite them using the table in GAME_DESIGN_V2 3.2. Tests that start with several pips
  must set `pipSlots` to match. Update `energy_authority` and every other test that hard-codes 25, 150 or five
  free slots, and list each changed expectation in your report.
- **Add Level 1 tests** on the real `Player` and real `level1.json`: absorb all three lamps and the result is
  **bar 9, no pip**. With a fixture 2-charge vending machine added, the result is **1 banked pip and 1 in the bar**;
  keep absorbing one more fixture source until bar 10 and the single slot is full, and it is refused with the source unchanged.

### 2. Q: confirm the behaviour and test the edges
No change to the rule you built. Add tests for: a pip pays 8 and 2 returns to the bar; if the bar is already at
9 or 10 the part that does not fit is lost (bar ends at 10); no banked pip means Q does nothing; Q cannot be used
on an open gate, a barrier or a chest; the exit opens with the surge animation. Give the spend function a
`purpose` argument (`'device'` only for now) so learnable moves can reuse the pip logic later (section 3.10).

### 3. Charge speed: slow when empty
Replace `chargeTransferRate` (`constants.js`, currently `1 + held / MAX_CHARGE`, 3 to 6 units/s) with
`rate = BASE_RATE x (RATE_FLOOR + (1 - RATE_FLOOR) x fill)`, `fill = bar / MAX_CHARGE`, `BASE_RATE = 3`,
`RATE_FLOOR = 0.4`: **1.2 units/s empty to 3 units/s full.** Export both constants for tuning. Apply to absorbing
and charging, every target. Held charge means the bar only, not pips.
- **Verify by measurement and put the numbers in your report.** Kiro simulated these: from an empty bar the first
  3-unit lamp takes **2.08 s**; the three lamps take **4.78 s** (cumulative 2.08, 3.60, 4.78); a fourth source of 2
  (the vending machine) ends at 1 pip + 1 charge at **5.90 s**. (Kiro's model with the old 4-charge lamps gave 2.61 s and 6.55 s.)
  If yours differ, say why.
- Update `energy_authority` and the two-way tests. Keep the conservation test: a transfer creates or loses nothing.

### 4. The charge table in one place
Add `CHARGE_TABLE` to `constants.js` (kind to default charge), as in GAME_DESIGN_V2 3.9: security camera 1;
vending machine 2; small neon sign 2; ATM 2; shutter motor 2; charge platform 2; **streetlight 3; fuse box 4; AC or HVAC unit 4** (round 15);
large neon sign or billboard 4; generator 8; substation or transformer 10. Add
`MAX_OBJECT_CHARGE = 10`. Existing levels keep their authored numbers; if one is above 10, log a warning, do not
clamp. The Builder (Aki) imports the table. Test: every value is 1 to 10 and Level 1's lamps are 3 (round 15; Levels 2 to 6 keep their authored 4s).

### 5. Report
Report as `CODEX 02`: per task PASS/FAIL, commit SHA, files, tests changed (old and new expectation for each),
the suite totals against **2779 passed, 7 failed** on the live line today (`level2_fork` 2, `npc_dialogue` 4,
`prop_sources` 1, none yours, plus two suites that crash before reporting), and the timings from task 3.
Then HOLD for Kiro's review.

## Still open from CODEX 01 (not part of this order)
Phase C is not reported: path-based platforms, the "Charge gate to open." label, per-level objectives, reactive NPC
lines and player events. Say which you have started.

## Do not
Edit level files. Build the Capacitor Module pickup or a growing bar. Change an exit cost (8). Loosen an assertion
to make it pass. Rework Levels 2 to 6.
