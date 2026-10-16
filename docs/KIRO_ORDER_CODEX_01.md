# KIRO ORDER: CODEX 01 (Level 1 runtime features)

**From:** Kiro, Technical Director | **To:** Codex | **Authority:** Chief (decisions recorded in `docs/GAME_DESIGN_V2.md` section 13 and `docs/LEVEL_DESIGN_V2.md` section 9)
**Branch:** work on your own branch, push to `agent/orcha-gameplay` as `AGENTS.md` describes. Never force-push.
**Status:** work order, nothing started.

## Read first (in this order, about 20 minutes)
1. `docs/GAME_DESIGN_V2.md` sections 3 (energy), 4 (player), 5 (devices), 6 (combat), 8 (interface) and 13 (decision ledger).
2. `docs/LEVEL_DESIGN_V2.md` sections 1.1, 4.3a, 4.5, 8 (work list) and Appendix A.
3. `docs/LEVEL_SCHEMA.md` for the level data format.
4. `_dev/pip_gate_spend.mjs` (53 passing assertions about pips and gates) and `_dev/support/headless.mjs`.
Where those two V2 docs and an older document disagree, the V2 docs win. Tags in them mean: CONFIRMED (Chief
decided), BUILT (verified in code), RECOMMENDED (Kiro's proposal, adopt unless you find a flaw and say why),
OPEN (do not build until Chief answers).

## Hard rules
- **Chief owns `src_scroll/levels/*.json`.** Do not edit level files. Add any new level fields in a backward
  compatible way (an old level must behave exactly as before).
- **Every exit costs 8** and every level must be completable from zero carried charge. There is **no fixed
  charge total per level**; Chief sets it.
- Run `node scripts/version_editor.mjs` before committing any Builder JavaScript (see `AGENTS.md`).
- Do not touch `ui.js` objective strings except where a task below says so (`levelOneObjective` and
  `_drawLevelOneObjective` are duplicated; change both together).
- Known pre-existing failures, so you can tell yours from mine (updated 2026-10-14 after Kiro fixed the
  stale provers): `level2_fork` 2 (a genuine finding: Level 5's fence can be jumped over; Level 5 is paused and
  not yours to fix) and `npc_dialogue` 3 (both smoke workers say "New line"; Chief's Builder data).
  `npc_geometry` and `order23_taskb_acceptance` crash before reporting and were already crashing.
  Total at the time of writing: **2709 passed, 5 failed**, across 60 suites. Do not "fix" these by loosening
  assertions.
- Kiro added `src_scroll/juice.js` and `src_scroll/audio.js` (feedback and sound) and four lines of hooks in
  `main.js`. They only listen. Keep those hooks when you merge `main.js`. `?juice=off` and `?audio=off` switch
  them off for playtests.
- Prefer small commits, one per task. Report each as `Task N: PASS/FAIL, SHA, tests`.

## Phase A: the energy rules (do these first; Aki's Builder work depends on them)

### A1. Two-way charged objects (CONFIRMED round 5)
Every energy source (lamp, fuse box, sign, camera, vending machine, generator, HVAC, prop) can be absorbed
from **and** charged. Charge the player gives is held by the object until absorbed back. See GAME_DESIGN_V2 3.5.
- **Data contract (agreed with Aki's order):** `charge` stays the object's **capacity**. A new optional boolean
  **`uncharged`** (default `false`) makes it start at 0. An old level with only `charge: N` is unchanged.
  `ElectricalSource` today sets `max = charge` and `drained = (charge === 0)`; split capacity from starting
  charge so an `uncharged` object has `max = N`, `charge = 0`, `drained = true`.
- Add `ElectricalSource.receive(amount)`: adds up to capacity, clears `drained`, restarts the light, fan and
  animation, returns the amount accepted (match `MovingPlatform.receive`). Nothing is created or lost.
- Let the SPACE charge path in `player.js` (`_updateDischarge` and `_updateContext`) target any source in range
  that has room, using the existing `needed` cap and `spendEnergy`. Gates, switches, chests and crates keep
  priority where they apply; decide and document the tie-break when a source and a gate are both in range.
- Checkpoint snapshot and restore must include each source's charge (they already do for `charge` and
  `drained`; verify the new fields).
- **Test (new file `_dev/two_way_objects.mjs`):** conservation (absorb all, give it all back, totals equal);
  an `uncharged` object starts dark, can be charged, and lights; cannot be overfilled; a checkpoint rewind
  restores a half-charged object; an old level JSON still loads with identical behaviour.

> **SUPERSEDED 2026-10-15 by `KIRO_ORDER_CODEX_02.md`.** Chief ruled that a pip always banks at 10, so the
> "per-player maxCharge" and the capacity pickup below are **on hold**; the 10-unit bar, whole-pip Q and the new
> charge-speed rule are in CODEX 02. Do not build the capacity pickup.

### A5. (ON HOLD) Charge capacity system and the Capacitor Module (round 10; superseded)
Chief reversed the 25-unit bar. **The player starts with 10 charge and a full bar is one pip** (the first
iteration's rule). A collectible raises the bar. See GAME_DESIGN_V2 sections 3.1, 3.2 and 3.8.
- **Replace the global `MAX_CHARGE` with a per-player `maxCharge`** (start 10, hard maximum 30, both in
  `constants.js` as `START_CHARGE` and `CAPACITY_CAP`). Everything that reads `MAX_CHARGE` (player, `energy-hud.js`,
  the pip rule, tests) reads the player's value. Checkpoint snapshots must include it.
- **A pip is one full bar at the current `maxCharge`** (RECOMMENDED reading, confirm with Chief's answer to
  question A in GAME_DESIGN_V2 section 13 before finishing). Filling the bar banks a pip and resets, as in v0.3.
- **The pickup:** a new entity `CapacityPickup` (level data type `capacity-upgrade`, fields `x`, `y`,
  `amount` default 4). Touch collects it; it raises `maxCharge` by `amount` (up to the cap), fills the new
  space, and is permanent: it stays collected after a checkpoint rewind and carries to the next level. Art:
  `assets/objects/capacity-upgrade/` (48 x 48, 8 frames, delivered by Kiro). Draw it with a gentle bob and a
  glow; the pickup burst, shake and sound come from `juice.js` / `audio.js` (emit a `capacity-up` event and Kiro
  will wire the sound).
- **Tests:** a scratch run of `pip_gate_spend.mjs` with `MAX_CHARGE = 10` passes 39 of 53; the 14 failures are
  the 25-based numbers. Rewrite them for a 10 bar (GAME_DESIGN_V2 3.2 has the new table), and add: capacity
  grows, the pip grows with it, the pickup is permanent across a rewind, the cap holds, and old levels load.
- **HUD:** show `charge / maxCharge` and 10 segments at the start. Kiro is doing the red, yellow, cyan bar
  colours in `energy-hud.js` (same file, small change); merge carefully.

### A2. Q uses a pip (CONFIRMED round 4)
Q, near a payable gate or switch, with at least one banked pip, opens it at once: the pip pays the price (8
for an exit) and the remainder returns to the bar (with a 10 bar a pip leaves 2; Chief has not yet said whether the whole pip
should be spent instead, GAME_DESIGN_V2 section 13 question C). With no pip, or away from
a device, **Q does nothing** (no tell, no cost). Q is unbound today (verified). SPACE-hold charging stays
gradual. Update the comment "No button may complete a gate in one press" in `player.js` to describe the new rule.
Update `_dev/pip_gate_spend.mjs` with Q cases (open instantly, remainder to bar, no pip does nothing, bar cannot
hold the remainder).

### A3. Charge-speed scaling (CONFIRMED mechanic; formula OPEN, see GAME_DESIGN_V2 3.3)
Kiro found that the first iteration already scaled the **discharge** rate with the bar:
`max(0.5, DISCHARGE_RATE * charge / MAX_CHARGE)`. Implement behind one function with two modes so Chief can
choose in play: **(O)** that original proportional rule, and **(M)** `rate * (1 + fill)`, where `fill` is the
bar divided by the player's `maxCharge` (A5): 3 units/s empty, 6 at a full bar. **Default: O for charging a
gate or object, M for absorbing** (applying O to absorbing makes the first lamp take about 6 s). Apply to every
target. Put the formula in one
exported function in `constants.js` or `electricity.js` so it can be tuned. Update `energy_authority` and
`pip_gate_spend` expectations deliberately and list each changed number in your report. Do not change the
lift's ride speed.

### A4. Chest at the pip cap (CONFIRMED round 4)
Today a full-reserve chest refuses and the paid charge is lost (see GAME_DESIGN_V2 3.7; `Chest.complete()`
zeroes `charged` in `Chest.tryOpen()`, `entities.js` around line 1238). Night City variant chests pay into the
bar, not the reserve; leave those as they are. New rule for the pip chest: the player pays as normal and the chest opens. If the reserve has room, the pip
goes in as today. If the reserve is full, show **"CHARGE FULL"** and drop the pip as a **pickup object** next
to the chest. The pickup waits indefinitely (not the 6-second life of `ChargePickup`), is collected when the
player has a free pip slot and touches it, survives a checkpoint rewind, and is lost when the level ends.
Placeholder visual: reuse the pip HUD icon until Aki delivers pickup art. Add tests to `chest.mjs`.

## Phase B: movement and combat access

### B1. Duck and drop-through (CONFIRMED round 7)
Hold **Down/S** to duck: no walking while ducked (momentum may carry a slide), a **shorter hitbox**
(`PLAYER_H` is 30; propose a duck height and justify it with the enemy test numbers), standing up needs
clearance. **Down + jump** drops through a one-way platform (replaces the plain Down press at `player.js`
around line 562). Down on a ladder still climbs down first. Expose a `duck` animation state that falls back to
`idle` until the art exists. Update `drone_sensing` and `drone_weapons` expectations only where aim height
changes, and say so. Re-run `docs/agent-training/player_metrics_harness.mjs` and put the before and after
numbers in your report (Appendix A of LEVEL_DESIGN_V2 has the "before").
**Do not** build double jump in this order. It is gated (Chief: after the tutorial levels, about Level 5).

### B2. Per-level ability list (CONFIRMED round 2)
Add an optional `abilities` object to level data (for example `{ bolt: false, melee: false }`). If absent, all
abilities stay on, so existing levels are unchanged. When `bolt` or `melee` is off: the keys do nothing, and
the K/L entries leave the prompts and the dev bar. Level 1 will turn both off (Chief sets it in the Builder).

### B3. Fail-state fix (RECOMMENDED, GAME_DESIGN_V2 3.7)
`Level.isFailState` returns false whenever `usableEnergy > 0`, so a player holding 7.75 against an 8 exit is
stuck and nothing says so. Make it count: the player's usable energy, every absorbable source's remaining
charge, and **charge stored in charged objects the player can still reach** (see A1). When the total cannot pay
the cheapest remaining mandatory spend, `main.js` already moves to `STATES.GAME_OVER` ("DISCHARGED", around
line 266) when `isFailState` is true, so the fix is the **detection**. That screen already restores the last
checkpoint with **R** (`main.js`, the GAME_OVER state), so a new respawn key is probably not needed; add one only if
Chief asks. The probe
`_kiro_tools/failstate_probe.mjs` is on Kiro's machine, not in the repo; the case is: absorb all the charge,
spend it on bolts until 7.75 remains against an 8 exit (16 bolts leaves 8, a 17th leaves 7.75).

## Phase C: world and interface

### C1. Path-based moving platforms (CONFIRMED round 3)
`MovingPlatform` (`entities.js`) takes `x1`/`x2` and moves only on x. Add an optional **`path`**: an array of
`{x, y}` waypoints (at least 2) and **`pathMode`**: `"pingpong"` (default) or `"loop"`. If `path` is absent the
platform behaves exactly as today. Motion follows the path at `speed`. Expose `vx` **and `vy`** each frame.
`player._resolvePlatforms` currently carries a rider with `pl.vx * dt` only; add `vy`. A rider on a rising
platform must stay on it; one on a falling platform must not hover; a platform that meets a ceiling stops
(no crushing). Keep the charge rule: it runs only while holding its full charge and any absorbed charge brakes it
at once. Snapshot and restore must include the path position and direction. Tests: rise, fall, loop, ping-pong,
rider carry both axes, drained mid-ride, checkpoint rewind, old `x1`/`x2` level unchanged. Also teach
`completability` about movers or document that it cannot (do not hide the gap).

### C2. "Charge gate to open." label (CONFIRMED round 2)
A world-space text label above every **exit gate**, shown while the gate is in view and not yet open, in the
existing prompt style. It does not replace or edit the objective card. It must not collide with the existing
`[SPACE] CHARGE` and `POWER REQUIRED` prompts (they live in `ui.js` around lines 446 to 521).

### C3. Per-level objective system (CONFIRMED round 5)
The objective card is Level 1 only (`levelOneObjective` returns null elsewhere). Generalise it: objective
stages defined per level (in level data or a registry), each with a title, a task line and a done-condition,
keeping Level 1's two stages and the entrance animation behaviour exactly as built. The Level 3 bolt stage will
be written later; leave an example stage in a test fixture only. `_dev/level1_objective.mjs` must still pass.

### C4. Reactive NPC dialogue (CONFIRMED round 4)
`npc.js` NPC lines are fixed. Add optional **`dialogue.poweredLines`** (same line shape as `lines`) and
**`dialogue.linkedObjectId`** (the id of a charged object). While the linked object holds charge (not
drained), the NPC uses `poweredLines`; otherwise `lines`. Must rewind on checkpoint restore. Old NPCs are
unchanged. Test it with the AC unit case: complaining before, thankful after.

### C5. Events for Kiro's juice module
Expose a tiny event emitter on the player (for example `player.events.on(name, fn)`) firing at least:
`jumped`, `landed` (with fall speed), `absorb-start`, `absorb-end`, `charge-start`, `charge-end`, `ducked`,
`laddered`, `hurt`. Fire only; no behaviour change. I will write the listeners in new files, so I stay out of
`player.js`. Add a test that the events fire once per action.

## Report format (per phase)
`CODEX 01 PHASE <A|B|C>`: for each task `PASS/FAIL`, commit SHA, files changed, tests added, the full suite
total versus the baseline above, and anything you deliberately did not do. End with the exact build URL or SHA
Chief should test. Then HOLD for Kiro's review. Do not merge to the live line.

## Do not
Edit level files. Build double jump, music, art or story. Loosen a failing assertion. Change an exit cost.
Remove the sprint after-images or any existing effect.
