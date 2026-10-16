# KIRO ORDER: AKI 28 (rebuild the vertical draft from the current Level 1)

**From:** Kiro, Technical Director | **To:** Aki | **Authority:** Chief, 2026-10-16
**Branch:** a new branch from the live line (`agent/orcha-gameplay`, commit after "Tenant sequence placed in Level 1"). Never force-push. Do not merge to the live line yourself.
**Status:** work order, nothing started.

## What happened
Your AKI 26 Part 1 Builder work and your AKI 27 tasks 1 to 3 are **merged into the live line** (Kiro reviewed the merge, no conflicts, the suite agrees).
Then Chief moved Level 1 on, so your draft `src_scroll/levels/level1_vertical.json` no longer matches it:
- The three lamps are now **3 charge each** (not 4). Fuse box is 4 and AC is 4 in the charge table.
- The ladder and an upper walkway are in Level 1, and the **tenant sequence is placed on that walkway**: a four-panel apartment (x 96 to 735), the window tenant (`NPC_TENANT`), and an ordinary HVAC unit (`AC_TENANT`, capacity 4, placed uncharged) with no switch.
- Chief is about to add a **24/7 market with a vending machine (2 charge)** where the streetlamp woman walks, and **one more charged prop**.
Because of that, `_dev/aki27_draft.mjs` is **disabled in `_dev/run_all.mjs`** with a "STALE" reason (it asserted the old lamps, total 12). You re-enable it when you finish.

## Task 1: rebuild the draft from the current level1.json
Start again from **today's** `src_scroll/levels/level1.json` (not from your old draft) and redo the vertical layout in `docs/design/LEVEL_DESIGN_V2.md` section 4.3a on top of it. Keep:
- the lamps at 3, the exit at 8, the street, the NPCs and every decoration Chief placed;
- the tenant sequence exactly as placed (building, tenant, AC under her window). It is the "second level above the spawn" Chief described; your vertical build should lead the player up the ladder to it, then onward and up toward the exit;
- the pylon, with the lit cable you drew running from it toward the exit.
Do not add charged objects of your own (Chief is adding the market vending machine and one more prop himself). **Every route must finish from zero charge** with whatever is in the level: use `OVERCHARGE_Level1_Charge_Economy.html` (Desktop) and run `_dev/completability.mjs` and `_dev/reach.mjs`; report the numbers and any route that cannot finish.
Update `_dev/aki27_draft.mjs` to the new facts and take it **out of the skip list** in `_dev/run_all.mjs`.

## Task 2: the Builder shows the tenant sequence correctly
Open Level 1 in the Builder and check: the four apartment panels, the window tenant (its inspector shows the Linked object and the Powered lines fields), the HVAC unit (with the Uncharged checkbox ticked) and the new asset palette entries all behave. Anything that does not (wrong snap, wrong preview size, a missing "Powered clip" display) is yours to fix; list it in the report.

## Do not
Edit `level1.json` (Chief owns it). Register the old rejected art. Add a wall switch of any kind (Chief ruled it out). Change the AC's behaviour (it is an ordinary charged prop).

Report as `AKI 28 TASK <1|2>`: SHA, files, tests, screenshots **from the running current game** (not composites). Then HOLD.
