# OVERCHARGE: Game Design V2

**Status:** Draft 1 for Chief's review. Written after commit `5ad4f1b` (2026-10-13).
**Supersedes:** `docs/archive/Static_Shock_Puzzle_Platformer_GDD_v1.pdf` (kept unchanged as history).
**Companion:** [`LEVEL_DESIGN_V2.md`](LEVEL_DESIGN_V2.md): the levels, and Level 1 specified in full.
**Scope right now:** finish Level 1 completely. Levels 2 to 6 are paused (see Level Design V2).

---

## 0. How to read this document

Every statement carries one of these tags. They exist so a recommendation can never be mistaken for a
decision, and so a wish can never be mistaken for a feature.

| Tag | Meaning | Who can change it |
|---|---|---|
| **CONFIRMED** | Chief decided it. Law until Chief changes it. | Chief only |
| **CARRIED** | Taken from GDD v1 and not contradicted by anything Chief has since decided. | Chief |
| **BUILT** | True of the shipped code today. Verified by reading it, and where noted by running a test. | Code changes |
| **RECOMMENDED** | Kiro's proposal. Not a decision. | Chief approves or rejects |
| **CONCEPT** | An idea Chief asked to evaluate or investigate. Not built, not decided. | Chief |
| **OPEN** | A question that needs Chief's answer before work can proceed. | Chief |

Where this document and an archived document disagree, this document wins. Where this document and a
Chief ruling in `docs/` disagree, the ruling wins and this document is wrong: report it.

Rulings that remain binding and are restated here (they still live in their own files):
`CHIEF_RULING_EXIT_COST_8.md`, `CHIEF_RULING_CHEST_PIP_RESERVE.md`, `CHIEF_EXIT_EXPLORATION_RULE.md`,
`KIRO_FINDING_CARRY_OVER_VS_SELF_SUFFICIENCY.md`, `KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`.

---

## 1. Identity

- **CONFIRMED.** The game is **OVERCHARGE**. v1's working title "STATIC SHOCK" is retired.
- **CARRIED.** Genre: 2D side-scrolling puzzle platformer with light action. One core fantasy:
  electricity is your health, your resource, your weapon, and the key to every level.
- **CARRIED.** Visual target: high-detail pixel art at 64 or 128 pixel character scale. The hero
  (`hero-v3`, restyled as `hero-v6`) is natively 128 pixels. This target is met.
- **CARRIED.** v1 noted that its Static Shock concept was an existing DC character. The name has now
  changed and the hero art is an original design, but nothing in this document is a legal clearance.
  Chief should confirm before any public release that the characters and world are original.

### Design pillars (CARRIED, unchanged)
1. **Electricity is everything.** Charge is progression, puzzle currency, combat power and survivability.
2. **Puzzle first.** Enemies exist to disrupt routing, timing and resource decisions, not to make a brawler.
3. **Backtracking with purpose.** The whole stage is one interconnected puzzle. Later discoveries change
   what earlier sections allow.
4. **One clear finish line.** Every level ends at a gate that must be powered.
5. **Complexity over grind.** Later levels get harder by combining rules, never by demanding more of
   the same pickup.

### The tutorial arc (CONFIRMED, new in V2)
**Level 1 is a rich exploration tutorial** where players experiment and discover the mechanics
themselves. It must put the player through a meaningful **absorb, carry, spend** loop **within the
first minute**. See Level Design V2 for how.

---

## 2. Core loop

**CARRIED**, with the tutorial emphasis above:

1. Find the powered exit and see what it needs.
2. **Absorb** electricity from the environment into the charge meter.
3. **Carry** it, with the cost of being hit as the pressure.
4. **Spend** it: open routes, move things, light things, power the exit.
5. Recover what you lose when you can. Never lose everything permanently.
6. Power the exit and finish.

---

## 3. The energy system

### 3.1 Units, the bar and the pip slots (CONFIRMED round 12; code still on the old 25-unit bar)
- Charge is counted in units. One streetlight holds 4. An exit gate costs **8** (the ruling stays).
- **The bar holds 10.** **A pip is always 10.** When the bar reaches 10 and a pip slot is free, it banks a
  pip and resets to 0 (the first iteration's rule), carrying any overflow into the new bar.
- **Pip slots (CONFIRMED round 12).** The reserve has **slots**, and each slot holds one pip. **The player
  starts with ONE slot,** so the most they can hold at the start is **20: 10 in the bar and 1 banked pip.**
  Each **Capacitor Module adds one slot (10 more charge to hold):** 2 slots is 30, and so on up to the HUD's 5
  slots, a maximum of 60 (`MAX_BANKED_PIPS` becomes the ceiling, and the player's slot count is what grows).
- **When everything is full** (bar 10, every slot holding a pip), further absorbing is refused and the source
  keeps its charge (it is not lost).
- Usable energy is `bar + 10 x pips`.
- Absorbing and charging speed: see 3.3 (slow when the bar is empty, 3 units/s when full). A lamp's 4 units take
  about 2.6 s from an empty bar.
- All gains and losses go through one authority in `player.js`. Nothing else may assign `charge` or `bankedPips`.
- **Rejected on the way here (kept so nobody reopens them):** a pip that grows with the bar; a bar that grows
  while pips bank at 10 ("option F"); exits that cost 10; a whole-pip Q that wastes the change.
- **As built today (code still to change):** bar 25, pip 25, up to 5 slots from the start, usable up to 150. The
  change to the rules above is task 1 in `KIRO_ORDER_CODEX_02.md`. "25 charge fills one pip" (ledger item 6)
  is superseded.

### 3.2 How pips and an ordinary 8-charge gate interact (BUILT, TESTED)
**Round 10 note:** the table below was measured with the 25-unit bar. The rules are the same at a 10-unit
bar (a second table follows rule 8), but every number changes. I checked by running the real engine with
`MAX_CHARGE` set to 10 in a scratch copy: 39 of the 53 checks still pass, and the 14 that fail are the ones
with 25-based numbers written into them (expected, listed in `KIRO_ORDER_CODEX_01.md` task A5).

Verified by `_dev/pip_gate_spend.mjs` (53 checks), which drives the real `Player` and `Level` with the
SPACE key held. Every gate below costs 8.

| Start state (bar, pips) | Ends at (bar, pips) | What happened |
|---|---|---|
| 10, 0 | 2, 0 | The bar pays. |
| 24, 0 | 16, 0 | The bar pays. No pip is banked or touched. |
| 3, 1 | 20, 0 | The bar pays 3, the pip promotes into the bar mid-hold, the bar pays 5 more. No pause. |
| 0, 1 | 17, 0 | The pip is consumed. The other 17 stay in the **bar**. Nothing is wasted. |
| 0, 5 | 17, 4 | One pip is promoted, four remain. |
| 24, 5 | 16, 5 | The bar pays first. **All 5 pips untouched.** |

Rules these results establish:

1. **The bar is always spent before a pip.** A pip is only broken when the bar is empty.
2. **A pip is never spent whole.** It is promoted into the bar (bar becomes 25), and the gate drains only
   what it needs. The remainder stays as ordinary bar charge.
3. **That remainder does not re-bank on its own.** Idle for 5 seconds, it stays at 17. Only new energy
   pushing the bar past 25 banks a pip again (17 + 8 gives bar 0 and 1 pip).
4. **One pip pays three 8-charge gates** (bar 17, then 9, then 1), with 1 left over.
5. **Spending is conserved.** Across 28 start states the player always loses exactly 8, drift below 1e-12.
6. **Exit gates and plain gates are paid identically.**
7. **A gate keeps partial progress.** If the player runs dry at 5 of 8, the gate holds 5. It survives the
   player standing there, or walking 400 px away. Coming back with energy takes only the missing 3.
   (It does not survive death: a checkpoint restore rewinds it. Timed gates re-close on their timer.)
8. **A hit costs 1 unit and a bolt costs 0.25.** Both come from the same pool, so at bar 0 with 1 pip,
   either one breaks the pip into the bar (24 and 24.75 respectively).

**The same gate at a 10-unit bar (round 10, measured on the scratch copy except where marked):**

| Start state (bar, pips) | Ends at (bar, pips) | What happened |
|---|---|---|
| 9, 0 | 1, 0 | The bar pays (derived from rule 1). |
| 3, 1 | 5, 0 | The bar pays 3, the pip promotes into the bar (10), the bar pays 5 more. |
| 0, 1 | 2, 0 | The pip is consumed. The other 2 stay in the bar. |
| 0, 5 | 2, 4 | One pip is promoted, four remain. |
| 9, 5 | 1, 5 | The bar pays first. All 5 pips untouched (derived from rule 1). |

(Rows with several pips assume the player has that many slots. From round 12 the player starts with one.)

At a 10 bar: **one pip pays one 8-gate and leaves 2; two pips pay two gates and leave 4** (the old "one pip
pays three gates" no longer holds). A hit (1 unit) at bar 0 with 1 pip leaves bar 9, 0 pips; a bolt leaves 9.75.

### 3.3 Pips open gates instantly (CONFIRMED round 2, NOT BUILT; input OPEN)
- **CONFIRMED (round 2, supersedes the reading below).** **Using a pip opens a gate instantly, with no
  waiting to charge.** **CONFIRMED (round 3): the input is the Q key,** a separate action from SPACE.
  Double-tap SPACE was rejected: holding SPACE already means "charge", so the first tap of a double-tap
  would begin a charge and spend bar before the second tap lands. Q is unbound today (checked against the
  bindings table in section 4.1). **Q while near a payable gate or switch with at least one pip banked
  opens it at once.** **CONFIRMED (round 4): with no pip banked, Q does nothing.** No tell, no cost.
- **History (found round 10).** The first iteration already had this: pressing **F** near a gate or switch
  with a banked pip powered it at once (`_updatePipSpend` in the v0.3 `player.js`), and the device flashed
  white. The key is now Q. The original spent the **whole** pip on whatever the device still needed.
- **CONFIRMED (round 12): Q takes a banked pip, pays the gate's price (8), and the other 2 goes back to the
  bar.** Chief: "a pip pays the 8 and 2 returns to the bar." Anything that does not fit in the bar (the bar is
  full) is lost. Q needs a banked pip; it is not a way to spend loose bar charge. It is the instant version of
  holding SPACE, and a pip is the price of that speed. (This replaces round 11's whole-pip rule; Codex's Phase A
  already built it this way, so no code change is needed there.) The boss "special attack" idea is replaced by
  learnable moves that cost charge (section 3.10).
- **CONFIRMED (round 11 and 12): the free pip in Level 1 is fine.** Level 1 holds 12 charge (three lamps of 4,
  which Chief keeps). A player who absorbs all three ends with **1 banked pip and 2 charge in the bar.** That
  banks into the starting slot, so the player is then at 12 of a possible 20. Lamp 3 is the first pip lesson,
  and Q can pay the exit. **Chief's rule (round 12): design one level at a time. Only Level 1's economy
  matters now; ignore charge and pip problems in Levels 2 to 6 until they resume** (for example a pip carried
  into Level 2 blocking its chest).
- **CONFIRMED (round 11): charge is slow when the bar is empty and speeds up gradually; the more charge the
  player holds, the faster they absorb powered objects.** Chief wants the original idea, applied to **both**
  absorbing and charging. This settles the O-versus-M choice below in favour of the original shape.
  **RECOMMENDED numbers (to tune in play):** `rate = 3 x (0.4 + 0.6 x fill)`, with `fill = bar / 10`. That is
  **1.2 units/s on an empty bar rising to 3 units/s on a full one** (3 is today's flat speed, so nothing gets
  faster than it is now). I chose a floor of 0.4 because the original's floor of 0.5 units/s makes the very first
  lamp crawl. Calculated: from an empty bar, the first 4-unit lamp takes **about 2.6 s** (it takes 1.3 s today),
  and absorbing all three lamps to reach 1 pip plus 2 charge takes **about 6.5 s** (about 4 s today). Codex's
  Phase A built `1 + held / MAX_CHARGE` (3 up to 6 units/s), which speeds up past today's speed; it will be
  replaced. Held charge counts the bar only, not banked pips.
- **Charge-speed scaling: SUPERSEDED by the bullet above (history kept). CONFIRMED (round 3). History found round 10: Chief remembered it
  correctly and I was wrong.** In the first iteration the discharge rate was
  `max(0.5, DISCHARGE_RATE x charge / MAX_CHARGE)`: 3 units/s at a full bar, 1.5 at half, never below 0.5
  ("more charge = faster transfer"). Absorbing stayed flat at 3. My earlier note that it was "never in v1 or in
  code" is withdrawn. Today both rates are a flat 3 units/s.
  **Two options (OPEN):** **(O) the original:** rate proportional to the fill, slow when the bar is low.
  **(M) mine:** rate x `(1 + fill)`, where `fill` is bar / capacity: 3 units/s empty, 6 at a full bar.
  **BUILT by Codex in Phase A (2026-10-14): `chargeTransferRate(held) = 1 + held / MAX_CHARGE` for every transfer, which is option M for both.** The O-versus-M choice below is therefore a change request on top of working code. **RECOMMENDED: O for charging a gate, M for absorbing.** *Why:* applying O to absorbing makes the very
  first lamp sluggish. From an empty bar the rate sits at the 0.5 floor until some charge exists, so a
  4-unit lamp takes about 6 s instead of 1.3 s, which breaks the "first absorb at about 8 s" target. At a
  gate the player already holds charge, so O feels right there. Either way `fill` uses the current
  capacity, so it keeps working as capacity grows. *Original recommendation, kept for the record:* M for both.
  Because the rate depends on the bar, with a 10 bar a full bar is "one pip" of charge in hand. *Side effects to handle:* (1) Level 1 beats get about
  1.2x faster at mid-bar, so the timing table is re-run after it lands; (2) `energy_authority` and
  `pip_gate_spend` assert exact per-frame amounts and will need updated expectations; (3) the HUD should show
  the multiplier (a brighter bar), or players will not notice it; (4) a pip (25) should not count toward
  `held`, or a banked pip makes everything instant. **OPEN:** the curve (linear, stepped, or capped lower)
  and whether it also speeds the lift's ride, which RECOMMENDED says no.
- **CONFIRMED (earlier).** Special pathways and chests are possible later uses for pips.
- **Historical reading (superseded for gates, kept as the BUILT behaviour):** pips pay a gate automatically
  once SPACE is held.
- **CONFIRMED (earlier).** Pips can automatically open gates. Special pathways and chests are possible later uses.
- **BUILT.** Pips are *drawn on automatically*: the player never manages them, and a pip feeds the bar
  mid-charge without any pause.
- **BUILT, and contrary to a literal reading.** **Nothing opens a gate without the player holding SPACE**,
  in range, standing on the ground. Tested: five pips, no SPACE, five seconds beside the gate: the gate
  stays closed and the energy is untouched.
- **ANSWERED by round 2:** Chief wants an explicit, instant pip use (see top of this section). The code
  comment "No button may complete a gate in one press" (`player.js`) now conflicts with that intent and
  must be amended by whoever builds it. SPACE-hold charging stays gradual for ordinary charge.

### 3.4 Charge loss (CARRIED, BUILT)
Being hit stuns the player (0.75 s, with knockback) and scatters 1 unit as recoverable pickups. If
nothing can be spent, the player dies. Pickups last 6 seconds.

### 3.5 Giving charge to props (CONFIRMED direction, NOT BUILT)
- **CONFIRMED.** Players give charge to unpowered city objects as well as absorb it. Example: a vending
  machine that takes 3 charge.
- **CONFIRMED (recommendation).** Prefer **reclaimable** charge for introductory experiments.
- **BUILT today:** the only thing that can be charged *and* drained back is the **charge platform**
  (SPACE gives, E takes back). Lamps, fuse boxes, signs and vending machines **cannot be given charge**:
  `ElectricalSource` has no receive path. This is new engine work.
- **CONFIRMED (round 5): every charged object works both ways.** The player can **absorb from any of them
  and charge any of them.** This includes the existing lamps, fuse boxes, signs, cameras, HVAC units and
  generators, not only new props. So the "energy source" and the "charged object" are one thing with one
  rule; this section's earlier separation of sources and objects describes the old code, not the target.
- **CONFIRMED (round 5): the Builder places any of them charged or uncharged,** with a **toggle button**
  (charged / uncharged) on the object. **Engine fact that matters (`electricity.js`, `ElectricalSource`):**
  today an object's `max` is set equal to its starting `charge`, and `drained` is true whenever charge is 0.
  So an object authored at 0 charge is permanently dead and has **capacity 0**: "uncharged" cannot exist
  yet. The fix is to give each object **two numbers: capacity (`max`) and starting charge**, and have the
  toggle choose the starting charge (full capacity, or 0), plus a `receive(amount)` that adds charge, clears
  `drained`, restarts the fan, light and animation, and is capped at `max`.
- **Rules this creates (RECOMMENDED, for Chief to approve):**
  1. **Charge is conserved.** Every unit absorbed or given moves between the player and an object. Nothing is
     created or destroyed by a transfer. This needs a regression test (absorb all, give back, compare totals).
  2. **Level total (CONFIRMED round 9: there is no fixed total).** Charge available = the sum of the starting
     charge of everything placed *charged.* **Chief sets the amount for every level, Level 1 included.**
     The Builder places an object **charged by default, with an "Uncharged" checkbox** the author ticks when
     he wants it to start empty. The Builder should still show a live "level total" readout, not as a cap,
     but so the author can see the number and so a check can warn if the total cannot pay the exit.
  3. **A drained object can be recharged,** and shows as dark until it is.
  4. **Gates and switches are still charge-only** (the player cannot absorb from a gate). The charge platform
     already works both ways and is the model.
  5. **Charge-speed scaling (3.3) applies to every transfer,** both directions.
  6. **Checkpoints** must snapshot each object's charge, as they already do for sources and platforms.
- **Builder work (Aki's lane, NEW):** a Charged / Uncharged toggle on each object's inspector and in the
  palette, a capacity field, the level-total readout, and a fixed `LEVEL_SCHEMA.md` entry (`charge` currently
  means both capacity and start).
- **CONFIRMED (round 2):** a charged prop's charge **stays in the prop until the player takes it back.** If
  the player leaves through the exit gate first, it is **lost for good.** (This is option (a), not the
  return-on-leaving option.)
- **Consequence (derived):** an unreclaimed charged object is a permanent cost, so charged objects are not free against the spare.
  The total a player can leave behind in Level 1 must stay at or under the 4 spare units. Charged-object prompts
  should say "take it back" while the player is in range.
- **CONFIRMED (round 3 and 11): the more powerful the object, the more charge it holds.** Chief: "each powered
  object has a varying charge amount" (a vending machine 2, a generator 8, a streetlight about 3 or 4). Round 4's
  "separate cost system" is **replaced:** an object has **one number**, its charge, and it is both what the
  player gets when absorbing it fully and what it takes to charge it fully. The list of numbers is in
  **section 3.9 (the charge table).** The 4-unit spare is a design check, not a law.
- **The real stranding rule (derived, replaces my earlier "total must be 4 or less").** A player can only
  lose charge to an abandoned charged object by choosing to leave through the gate with it uncollected, and the gate
  costs 8 to open, so they cannot leave while short. The true risk is **a charged object the player cannot get back
  to**. So the rule is: *from the gate, every charged object remains reachable by two-way paths (ladders, stairs, the
  lift), never only by a one-way drop.* The 4-unit spare then only matters for permanent payoffs and mistakes.
- **RECOMMENDED semantics, for Chief to approve:**
  - *Reclaimable charged objects*: charge goes in, the prop reacts, and holding E drains it back out. Reclaimed, they
    cost nothing; left behind, they cost what was given.
  - *Permanent payoffs*: charge is consumed for a lasting reward. Their total cost in Level 1 should
    never exceed the 4 spare units, so a player who buys them all still has 8 for the exit.
  - Reclaiming returns the full amount given. No fee, no decay.
- **CONFIRMED (round 5): a vending machine never gives a pip.** A pip comes from only two places: **a
  chest, or absorbing enough charge to fill the bar** (the overflow banks a pip, as built). No prop dispenses
  one, because a machine that paid a pip for 3 charge would be a charge fountain.

### 3.6 The Level 1 economy (round 9 note: the 12 is a current value, not a law)
- **SUPERSEDED (round 9).** Earlier rounds recorded "Level 1 keeps 12 charge available" as CONFIRMED. Chief
  has since said **there is no fixed 12 for Level 1; any level has whatever charge he sets.** Everything
  below that quotes 12 describes Level 1 **as built today** (three lamps at 4) and the original design
  reasoning. It is not a constraint on the Builder. **What still holds:** every exit costs 8
  (`CHIEF_RULING_EXIT_COST_8`) and every level must be completable from zero carried charge, so the author's
  total must be able to pay the exit plus every mandatory spend. The Builder's level-total readout and the
  prover are where that is checked, not a hard-coded 12.
- **Formerly CONFIRMED.** Level 1 keeps **12 charge available and an exit that costs 8.**
- **CONFIRMED.** The extra 4 supports experimentation. It does **not** guarantee protection against
  unlimited projectile spending. At 0.25 per bolt, the 4 spare units are 16 bolts, and a player who
  spends them all and more can still run dry.
- **CARRIED + CONFIRMED rulings.** Every exit costs 8. Every level must be completable from zero carried
  charge (carry-over is a cushion, never a prerequisite). A level with enemies needs a positive margin.

### 3.7 Known energy defects found while writing this (BUILT, not fixed)
- **A refused chest keeps the energy it was paid.** When the reserve is full, a chest refuses to open and
  resets itself, but the 2 it charged is not given back. Code comments say "refund"; the code only zeroes
  the chest. Holding SPACE repeats it, so a player at the pip cap loses their whole bar. Then the bar is
  empty, a pip breaks, a slot frees, and the chest opens anyway (tested: bar 10 and 5 pips ends bar 23 and
  5 pips after 5 refusals, 10 charge destroyed). This contradicts `CHIEF_RULING_CHEST_PIP_RESERVE`
  ("the player can return"). **CONFIRMED (round 3): fix it, with a better design than a refund.**
  **Chief's design:** the chest must not take charge it cannot reward. When the reserve is full the chest
  shows **"CHARGE FULL"** and the **pip pops out as a world object** on or beside the chest. The player can
  **pick it up once they have room** (a free pip slot). It waits for them; **leaving the level forfeits it.**
  **CONFIRMED (round 4): the player still pays.** If the player chooses to open the chest, they pay the 2 as
  normal and the chest opens; only the *reward* is held back as a pickup because the reserve is full. That
  removes refusal entirely, so the bug cannot happen. **NEW WORK:** a pip pickup object with its own
  art (no pip-pickup art exists yet; the pip HUD icon is the only pip art), a "CHARGE FULL" tell, a
  pickup rule (needs a free slot, stays until taken, not time-limited like the 6-second charge pickups),
  and checkpoint rules (a pip pickup should survive a respawn, since it is not scattered loot). Not a
  Level 1 blocker, since Level 1 has no chest.
- **Level 1 can be left unwinnable without the game noticing.** `Level.isFailState` returns false whenever
  `usableEnergy > 0`. A player who absorbs all 12, then fires bolts (0.25 each) until 7.75 is left, holds
  energy but cannot pay the 8 exit. Measured: 16 bolts leaves exactly 8, a 17th leaves 7.75, and the game
  reports no fail state. The only recovery is the column 26 pit (the restore refills the lamps) or a
  reload; there is no in-play respawn key. **OPEN: fix it?** Recommended yes: treat "usable energy below the
  cost of the cheapest remaining mandatory spend, with no source left" as a fail state. Hiding the bolt in
  Level 1 (CONFIRMED round 2, section 6) removes the path that triggers it there, but the check is still
  worth having for later levels, and for charged objects left charged.
- Dormant code: `spendPip()` has no runtime caller, `_pipFlash` is never set above 0, and several
  comments still say `MAX_CHARGE = 10`.

### 3.8 The Capacitor Module: +1 pip slot (CONFIRMED round 12; art DONE; pickup later)
- **CONFIRMED.** The Capacitor Module (item #3 on Chief's concept sheet) adds **one pip slot**, so the player
  can hold **10 more charge**: 20 becomes 30, up to 5 slots and 60. Chief: "an additional 1 pip, or the ability
  to hold 10 more charge, so then a player can have a total of 30 max charge."
- **CONFIRMED: it appears later,** not in Level 1 (Level 1 uses up the starting slot) and not in the AC-secret
  room (scrapped in round 14; the tenant sequence gives an automatic achievement instead). Which level, and how it is earned, is decided
  when that level is designed. It must never be required to finish a level.
- **At most four modules** are needed (slots 2 to 5). The concept sheet's other eleven items stay available for
  other upgrades, for example stronger shots (section 3.10).
- **Art: DONE (round 10).** `assets/objects/capacity-upgrade/` (48 x 48 still, 9-frame idle). A review page is on
  Chief's Desktop. Chief wants to see it before deciding whether the triangle should stay steady or keep
  softening during the pulse. Not registered in the manifest, not placed anywhere.
- **Engine work: the pickup entity is NOT needed for Level 1** and waits. What Level 1 does need is the slot
  system itself (`pipSlots` starting at 1), which is in `KIRO_ORDER_CODEX_02.md`. When the pickup is built it adds
  one slot, plays the pickup burst and sound, shows the new pip icon lighting up, is permanent for the run and
  survives a checkpoint rewind.
- **HUD:** five pip icons are drawn; slots the player has not unlocked show as dim "locked" icons, unlocked empty
  slots show as empty, and banked pips show charged.
- **Lore:** the concept sheet's MIOR, Project Tempest and "MIOR drones" are official story canon
  (`docs/STORY_CANON_THE_MERIDIAN_INCIDENT.md`).

### 3.9 The charge table (CONFIRMED principle; numbers RECOMMENDED)
Chief: the more powerful the object, the more charge it has, and each powered object has its own amount. Every
object works both ways (section 3.5), so this one number is **its capacity, what absorbing it fully yields, and
what charging it fully costs.** Tiers are 1, 2, 3, 4, 8 and 10.

| Object | Charge | Tier | Notes |
|---|---|---|---|
| Security camera | 1 | tiny | a good first thing to charge |
| Vending machine | 2 | small | Chief's example |
| Fuse box | **4** | medium | **round 15: Chief raised it from 2 to 4** |
| Small shop neon sign | 2 | small | |
| ATM | 2 | small | |
| Roller shutter motor | 2 | small | |
| Charge platform (ferry, lift) | 2 | small | already built at 2 |
| AC / HVAC unit | **4** | medium | **round 15: raised from 3 to 4.** The tenant's AC in Level 1; it works both ways (on at full charge, off when zapped) |
| **Streetlight** | **3** | small | **round 15: Chief set it to 3.** Level 1's three lamps are now 3 in `level1.json`. Levels 2 to 6 keep their authored 4s until Chief says otherwise |
| Large neon sign, billboard | 4 | medium | already 4 in the editor |
| **Generator** | **8** | large | Chief's example |
| Substation or transformer | 10 | one pip | the largest an object may hold |

Rules:
1. **No object holds more than 10,** so one full bar (one pip) can always fill any object.
2. Where the editor and old levels disagree (generators are 4 or 5 today, HVAC 4, props 4), **existing levels
   keep their authored numbers**; the table sets the **defaults for newly placed objects** in the Builder, and
   Chief can edit any object's number.
3. An object placed charged adds its number to the level's available charge; the Builder's level total shows it.
4. New kinds get a tier from this list; Chief confirms. The table lives in one place in code (see
   `KIRO_ORDER_CODEX_02.md`) so the Builder and the game read the same numbers.
5. Reclaiming is always possible (two-way), so there is no "permanent cost"; the real constraint is the
   stranding rule in section 3.5 (every charged object must stay reachable by two-way paths).

### 3.10 Moves that cost charge (CONCEPT, later; not in Level 1)
Chief (round 12): instead of a special move that spends a whole pip, the player will **learn or upgrade the
projectile, or get new moves, each stronger and costing more charge to use.**
- **Today:** the bolt (L) costs 0.25 charge and its combat role starts in Level 3 (hidden in Level 1).
- **Shape (RECOMMENDED, not decided):** a few tiers of shot, each costing more (for example 0.25, 1, 2) and doing
  more; later moves unlocked by items (the Tesla Coil, Reactor Module or Tempest Fragment on the concept sheet
  fit), each with a visible charge cost on the HUD.
- **Things to design when we get there:** how the player earns charge back in a fight (enemies drop 2 each today),
  how the out-of-charge detection treats charge spent on offence (CODEX 01 B3), and where each upgrade appears.
- Nothing here is built or scheduled.

---

## 4. The player

### 4.1 Verbs and keys (BUILT)

| Verb | Key | Notes |
|---|---|---|
| Move | A / D, or arrows | 75 px/s. Instant: no walk ramp today. |
| Run | Shift + direction | x1.7 (127.5 px/s) with a 0.2 s ramp, a squash kick and after-images. |
| Jump | W or Up | Full height every time. 0.1 s coyote time, 0.1 s jump buffer. |
| Drop through | Down or S | Through one-way platforms only (a 0.25 s window). |
| Absorb | E (hold) | 3 units/s, radius 56 px. Drains the nearest source. |
| Charge / discharge | Space (hold) | 3 units/s, radius 50 px, **grounded only**. Gates, switches, chests, crates. |
| Melee | K | Free. Radius 65 px, 0.35 s cooldown. |
| Bolt | L | Costs 0.25. Aimed in 8 directions, 320 px/s. |
| Ladder | Up / Down at a ladder | 105 px/s. Needs a ladder decoration in the level. |
| Use a pip | **Q** (CONFIRMED round 3, NOT BUILT) | Opens a payable gate at once, no charging. See 3.3. |
| Ledge climb | Up + direction into a wall, airborne | A scripted 0.8 s climb onto ledges 6 to 48 px up. |
| Grapple | G (hold) | Pulls to the nearest anchor within 240 px at 180 px/s. See 4.3. |

**There is no crouch, no double jump, no wall slide or wall jump, no dash and no in-play respawn key.**
Falling off the level respawns automatically; death shows a game-over screen with R to retry.
Dev keys that are live in every build: `P` (+2 charge), `F2` (skip level), `[` and `]` (switch level).
**RECOMMENDED:** gate those behind the dev flag before release. A player can currently cheat by accident.

### 4.2 Movement numbers (BUILT, measured before any retune)
Measured with the real controller by `docs/agent-training/player_metrics_harness.mjs`:

| Metric | Value |
|---|---|
| Walk / sprint speed | 75 / 127.5 px/s |
| Walk acceleration | 1 frame (instant). Sprint ramps over 12 frames (0.2 s) |
| Deceleration (to rest) | walk 10 frames (0.17 s), sprint 12 frames (0.20 s). Frame-rate dependent |
| Jump height | 99.17 px (3.10 tiles) |
| Time to apex / airtime | 0.45 s / 0.93 s |
| Max gap cleared | walk 1 tile (32 px), sprint 3 tiles (96 px) |
| Max ledge reached | 3 tiles (96 px), walk or sprint |
| Terminal fall speed | 700 px/s |

The full table is in Level Design V2, Appendix A, so before and after the retune can be compared.
`docs/PLAYER_MOVEMENT_METRICS.md` is **stale** (it lists a 450 px screen and 14 rows; the game is 578 px
and 18 rows) and will be regenerated after the retune.

### 4.3 Movement retune (CONFIRMED authorized, NOT BUILT)
- **CONFIRMED.** Retuning is authorized, including **jump cut, faster falls, a short walk ramp and camera
  look-ahead.** Before/after measurements must be shown. Affected routes across **all six levels** must be
  re-verified. That verification **does not resume** design work on Levels 2 to 6.
- **RECOMMENDED starting points,** to be measured, not assumed:
  - *Jump cut*: releasing the key while rising cuts upward speed by about half. Minimum hop stays usable;
    the maximum height is unchanged, so no route gets harder.
  - *Faster falls*: a fall-gravity multiplier of roughly 1.4 to 1.6. **This shortens horizontal reach**
    (the falling half of the arc is shorter), so the 3-tile sprint gap must be re-measured. If it drops
    below 3, the "required gaps at most 2 tiles" design rule still holds but hard gaps may not.
  - *Walk ramp*: about 0.06 to 0.10 s. Re-measure gap reach for the same reason.
  - *Frame-rate independence*: make ground friction time-based. Today it is a per-frame multiplier, so
    stopping differs between 60 Hz and 144 Hz screens.
  - *Camera*: the X axis is hard-locked to the player today. Add a smoothed look-ahead in the facing
    direction. Leave the Y axis unsmoothed, because the death-plane logic in `camera.js` depends on it.

### 4.4 New movement abilities (CONFIRMED round 2 as real abilities; NOT BUILT)
- **CONFIRMED (round 2).** **Ducking and double jump are real abilities, so each needs animation art.**
- **CONFIRMED (round 2).** **Double jump is unlockable, at least for now.** It is not available from the
  first frame. **Round 4 (Chief, "maybe Level 5 or something after the tutorial levels"):** the unlock
  comes after the tutorial levels, probably around Level 5. Not final. **OPEN (later):** what unlocks it and
  whether the unlock persists across levels and saves. Nothing in Levels 1 to 4 may require it.
- **CONFIRMED (round 5): ducking does not unlock. It is a standard mechanic from the first frame, like
  walking, and its purpose is to dodge attacks.** Level 1 has no attacks (bolt and melee are hidden, no
  enemies), so ducking is there from the start but nothing needs it until Level 3.
- **What this implies (derived, not yet specified):** a duck needs a **shorter hitbox**, so a laser or
  projectile aimed at standing height misses. Sky Sentry lasers lock their aim, so the duck must happen
  during the 0.55 s warning. The **key is still being decided:** Down/S is already "drop through a one-way platform" while
  grounded (`player.js`), so ducking cannot also be a plain Down press.
  **Chief asked "how does Mario do it?"** In the Mario games, holding **Down** is the duck; the hero cannot
  walk while ducked (momentum can carry a slide) and the hitbox is shorter. Mario has no quick "drop through":
  in Super Mario Bros. 3 you can only fall through a white block by crouching on it for about five or six
  seconds ([Super Mario Wiki, White Block](https://www.mariowiki.com/White_Block_(platform))). So Mario
  offers the duck half of the answer, not the conflict half.
  **RECOMMENDED:** **hold Down/S = duck** (Mario-style: no walking while ducked, shorter hitbox), and
  **Down + jump = drop through** a one-way platform. That separates the two uses of one key without a
  timer. **Cost:** the existing drop-through (a plain Down press, taught nowhere today) changes, so Level 1's
  high strip and low street fork need the player to know it; the prompt or the NPC hint must say so. The
  ladder is unaffected, because Down on a ladder climbs down before this rule applies.
  **CONFIRMED (round 7): Chief accepted the recommendation** ("however Mario does it or your
  recommendation"): hold Down/S to duck, no walking while ducked, shorter hitbox; Down + jump drops through
  one-way platforms. **NOT BUILT.** Needs the duck hitbox, the changed drop-through input, a prompt or hint
  for the new drop input, duck animations, and updated `drone_sensing`/`drone_weapons` expectations. The enemy tests (`drone_sensing`,
  `drone_weapons`) assert aim heights and will need updated expectations.
- **RECOMMENDED:** because double jump is gated, the movement envelope that every level was proved against
  stays valid until the unlock, and no level may require it before the unlock exists. Ducking, if it only
  adds passages, does not shrink any existing route. Each ability needs the harness re-run (Appendix A).
- **Art work list:** duck (enter, hold, exit), double jump (second-jump flourish), and an unlock moment.

### 4.5 Traversal (BUILT, plus concepts)
- **BUILT:** ladders, ledge climbing and the grapple. The grapple is a **pull to a fixed point**: it has
  no swing, no momentum and no travel along a line. No level uses a ladder or an anchor yet.
- **CONCEPT, to investigate (CONFIRMED as "an additional concept to investigate"):** a **charged wire the
  player glides along.** Nothing like it exists. Questions to answer before building: does it consume
  charge, does it need a powered state, can the player drop off, what is its speed, and is it a one-way ride?
- **CONFIRMED (round 3): the platform does both, sideways (the "ferry") and up/down (the "lift"), and the
  author sets its path in the Builder.** Chief likes the name "ferry"; I keep both words: *ferry* = a
  sideways route, *lift* = an up/down route, *platform* = the object. **BUILT, so you can judge the gap
  (`entities.js` `MovingPlatform`):** the constructor takes `x1`, `x2` only, `update()` moves `x` between
  them, and `player._resolvePlatforms` carries a rider with `pl.x += pl.vx * dt` (horizontal only). The
  Builder places a platform with a default 96 px width and shows `x1`, `x2` and `speed` as **number boxes
  in the inspector**, with a dashed horizontal line on the canvas. There is **no way to draw a path.**
  `LEVEL_SCHEMA.md` already lists "vertical moving platforms" as unsupported.
  **RECOMMENDED design (NEW WORK, nothing built):**
  - **Data:** a `path` list of waypoints `[{x,y}, ...]` plus `mode` (`pingpong` or `loop`), keeping `x1`/`x2`
    working as a two-point horizontal shorthand so no existing level changes.
  - **Runtime:** replace the left/right bounce in `update()` with movement along path segments at `speed`,
    and expose `vx` **and `vy`** each frame. The rider carry in the player must add `vy` too, and a lift
    moving *up* must not let the player fall through; one moving *down* must not leave the player hovering.
  - **Charge rule (kept as built):** the platform runs only while it holds its full charge; taking any charge
    brakes it at once. Chief's persistence rule applies: charge stays in the platform until taken back.
  - **Builder:** a path tool: select a platform, click to add waypoints, drag to move them, a visible line
    with numbered dots, and a mode switch. The renderer's `_drawPlatforms` and the clipboard, selection and
    move code already treat a platform as one object, so the new tool is additive.
  - **Safety:** the prover and `completability` must understand a mover so a required lift is checked
    (a player at the top with the lift drained must still be able to come back down).
  - **Open sub-questions:** does a platform stop at each waypoint, how long, and can the player jump off in
    mid-air (RECOMMENDED yes, and no crushing: a platform that meets the ceiling simply stops).
- **CONFIRMED (round 2):** **ladders are in Level 1,** and the player traverses it vertically (see
  `LEVEL_DESIGN_V2`). The ladder already exists in the engine and needs a ladder decoration in the level.

---

## 5. Devices and world objects (BUILT)

| Object | What it does today |
|---|---|
| **Energy source** (lamp, fuse box, camera, generator, HVAC) | Absorbable with E. Visibly dims and goes dark when drained. **Cannot receive charge today;** CONFIRMED round 5 to become two-way (see 3.5). |
| **Exit gate** | Costs 8. Non-solid: the player may walk past it uncharged (`CHIEF_EXIT_EXPLORATION_RULE`), but the level only completes when it is open, charged and the player is in it. |
| **Barrier / fence** | A gate that is switch-only (the player cannot charge it). Y-aware. Opens when its linked switch fires. |
| **Switch** | Costs charge. Opens its linked barrier. A "wall" switch starts powered and shorts out when charged, slackening the fence. |
| **Timed gate** | Opens, counts down, re-closes. Not allowed as an exit. |
| **Chest** | Costs 2. Reward is 1 pip straight into the reserve (the bar is untouched). Night City variants (5, 10, 20) pay into the bar. Refused at the pip cap (see 3.7). |
| **Conductive crate** | A pushable wire: passes charge to exactly one touching gate or switch. Needs a checkpoint in the level. |
| **Charge platform** | A horizontal mover powered by charge, and the only reclaimable prop (SPACE gives, E drains). |
| **Checkpoint** | Snapshots the level, the bar and the pips. Respawn restores all three. |
| **Charge pickup** | Scattered by hits. 6 s lifetime. |

---

## 6. Enemies and combat

- **CARRIED.** Enemies are moving puzzle pieces and pressure systems.
- **BUILT.** Sky Sentry (hovering, laser), Wheel Drone (ground, burst fire), a patrol enemy and a drain
  enemy. All stun on contact and scatter 1 unit. Drones telegraph an alert for 0.55 s before attacking.
  Enemies have no knockback and no death effects.
- **CONFIRMED.** **The bolt's combat role is introduced in Level 3.** Level 1 may **foreshadow** a threat
  safely, for example a distant drone that cannot reach the player.
- **CONFIRMED (round 2):** **hide the bolt and melee in Level 1** to keep it simple. Hiding them removes
  the risk the "12 versus 8" buffer guarded against, and it also closes the unwinnable-state path in 3.7
  (the bolt was the only way to waste charge on purpose). Today L and K work from the first frame, so
  **hiding means disabling them for Level 1 and removing them from prompts and the dev bar.** Needs a
  per-level ability list (see `LEVEL_DESIGN_V2` section 8). **CONFIRMED (round 5): the objective card teaches the
  bolt in Level 3** (Chief: "use the objective to tell the player"). **Engine fact:** the card exists only
  for Level 1 (`levelOneObjective` returns null for every other level and its states are hard-coded). Level 3
  needs a **per-level objective system** (a list of stages per level, driven by level data or code), so that
  a Level 3 stage can say something like "Attack the drone with L". Wording is for the story/Level 3 work.

---

## 7. World, NPCs and atmosphere

- **CONFIRMED.** Add **substantially more city life.** NPCs get **customized dialogue;** some give
  hints, others are flavor.
- **CONFIRMED.** Atmosphere: pedestrians, possibly passing cars, window activity and other readable
  city events. **Remove stretches of empty walking** without overcrowding the playable route.
- **BUILT.** Three NPCs exist (two smoke-break workers and a streetlamp woman), with patrol, an
  idle/smoke state machine, proximity-triggered speech bubbles and per-NPC dialogue. Decorations can
  animate from the asset manifest. Rain, lightning, a train and windblown litter run in the background.
- **BUILT, a defect:** both smoke workers have dialogue enabled with the placeholder line `"New line"`.
- **NEW WORK (round 4), reactive NPC dialogue.** An NPC's lines are fixed today (`npc.js`: a `lines` array
  chosen sequentially or at random, triggered by proximity only). Chief wants a **window NPC whose lines change
  when a linked object is powered** (complaining about the heat, then thanking God it is back on). That needs
  a second line set plus a link to a charged object, switched when that object's state changes. It should be a
  general Builder field ("lines when powered"), not a one-off, so story NPCs elsewhere can react to the
  world. The state must rewind on checkpoint restore, like the other level state.
- **RECOMMENDED:** NPC dialogue gets a role tag in the Builder (`hint` or `flavor`) so hints can be
  audited. The rule for hint lines: they must describe an *observation* ("that lamp still hums"), never
  an instruction, so they teach without becoming text tutorials.

---

## 8. Teaching and the interface

### 8.1 Principles
- **CARRIED.** The environment should communicate most puzzle information. Context prompts appear only
  when needed. Devices show how much electricity they need.
- **CONFIRMED.** **Keep the Level 1 objective card.** The gate wording is **"Charge gate to open."**
- **RECOMMENDED:** pair the card with the world so it confirms rather than instructs. A player who has
  already absorbed from a lamp should see the card tick over, not be taught by it.

### 8.2 Strings to change (BUILT, for the implementer)
The Level 1 objective card strings are **duplicated in two places** in `src_scroll/ui.js`, so both must
change together: `levelOneObjective` (lines 26 and 29) and the renderer `_drawLevelOneObjective` (lines
70 and 71). Today stage 2 reads title **"POWER THE EXIT"** and task **"Absorb enough energy to exit gate"**.
`_dev/level1_objective.mjs` asserts the **titles**, so changing a title means updating that test too.
Gate prompts live at `ui.js` lines 446 (`[E] ABSORB`), 511 (`[SPACE] CHARGE`) and 518 to 521
(`POWER REQUIRED` / `ABSORB MORE ENERGY`).
- **CONFIRMED (round 2):** **"Charge gate to open." appears as text above exit gates in the world.** It is
  a new world label, not a replacement of an existing string. It should show once the gate is in view.
- **CONFIRMED (round 3):** the card's stage 2 stays as it is ("POWER THE EXIT", "Absorb enough energy to
  exit gate"). **Only the stage 1 task line changed**, from "Absorb power from street lamp" to **"Try
  absorbing power from a street lamp"** (the "..." in Chief's note was read as "a street lamp"; tell me if
  another ending was meant). **BUILT** in both copies in `src_scroll/ui.js` (the `levelOneObjective` return
  and the `_drawLevelOneObjective` renderer). `_dev/level1_objective.mjs` asserts titles only, so it still
  passes. The text is 38 characters, which fits the 10 px monospace card (about 40 characters wide).

### 8.3 Showing what a device costs (CARRIED, RECOMMENDED)
The bar is 25 wide and the exit costs 8, so the cost does not read at a glance. v1 asks for "clear
feedback showing how much electricity a device requires." **RECOMMENDED:** when the player is near a
device, draw a cost marker on the bar at 8 so it fills toward a visible line. With the 10-unit bar the
marker sits at 80%.

### 8.4 Charge bar colours: red, yellow, cyan (CONFIRMED round 10, NOT BUILT)
- **CONFIRMED.** Bring back the first iteration's bar colours: **red when low, yellow in the middle, cyan
  when high.** Chief: it is "a better distinction when spending charge and absorbing charge." The bar changes
  colour as it moves, so the player can read a spend or a gain at a glance.
- **Found in the history.** `constants.js` has carried `CHARGE_LOW: '#ff4444'`, `CHARGE_MED: '#ffcc00'` and
  `CHARGE_HIGH: '#44ddff'` since the first commit (`ddbf42a`, 2026-09-01). The original bar used them with
  steps at 30% and 60%: above 60% cyan, above 30% yellow, above 0 red. The current HUD (`energy-hud.js`,
  since 2026-09-25) replaced that with a cyan-to-violet blend, which is why the colours disappeared.
- **Spec:** red from 0 up to 30%, yellow above 30%, cyan above 60%, the same steps as the original. The
  banked pips stay violet, so the bar and the reserve read as two different things. A full bar is cyan for
  a moment before it banks a pip and resets, which is the "cyan when full" Chief remembers.
- **Not tied to the capacity change:** the steps use the fraction `charge / capacity`, so they work at 10,
  14 or 25.

---

## 9. Feel and juice

**CONFIRMED** only as far as the movement retune in 4.3. The rest is **RECOMMENDED** and not decided.

Today there is **no** screen shake, hit-stop, general particle system, landing feedback, jump or land
sound, or death/respawn transition. v1 section 9 required "tactile sound design: hums, crackles, capacitor
whines, power-down thumps, relay clicks, and escalating audio as the player approaches maximum charge."
So the feedback layer is a **v1 requirement that was never built**, not a stretch goal.

**BUILT (round 10, first pass):** `src_scroll/juice.js` (particles, screen shake, hit-stop) and
`src_scroll/audio.js` (a synthesised sound bus), wired into `main.js` with four small hooks. They only
listen to the game, never change it. Switches: `?juice=off` (visuals), `?audio=off` (sound), and
`prefers-reduced-motion` (no shake or hit-stop, fewer particles). Effects so far: dust on jump and landing
(scaled by fall speed, shake on long falls), spark streams while absorbing and charging, a burst, shake and
short hit-stop when a gate opens, checkpoint, chest and lamp-runs-dry bursts, and a hit reaction. Sounds so
far: jump, land, gate open, checkpoint, chest, lamp power-down, hurt, and two loops (absorb, charge) whose
pitch rises with the transfer rate. **Not yet:** ladder, lift, duck and double jump (their mechanics do not
exist), music, ambience under the rain, and the footstep still uses its own separate audio context.
**Not heard by a person yet:** the sounds are tested for structure (they start, stop, scale and never clip),
not for taste. Chief must listen and say what to change.

**RECOMMENDED order of work:** (1) movement retune, (2) a shared juice module for particles, shake and
hit-stop, (3) landing and jump feedback, (4) absorb, discharge and gate-open payoffs, (5) the audio bus.
Every effect must return to rest and must respect `prefers-reduced-motion`.

---

## 10. Audio

- **CARRIED.** Electricity should have tactile sound design (see section 9).
- **BUILT.** The only sound is a procedural footstep. There is no music, no mixer and no other effect.
- **CONFIRMED.** **Kiro creates the replacement music.** Level 1 music stays **pending Kiro's assets.**
  The earlier tracks and generator were removed on 2026-10-12 and are not to be restored.

---

## 11. Progression and structure

- **CARRIED.** Levels are discrete, with a powered exit. Early levels teach one concept at a time, mid
  levels combine two or three, late levels are multi-step logic.
- **CARRIED.** Optional mastery (bonus batteries, hidden routes, medals) is allowed and must never obscure
  the primary objective.
- **CONFIRMED.** Finish Level 1 completely first. **Pause development of the other levels.**
- The current roster, and where it has drifted from v1's roadmap, is in Level Design V2 section 2.

---

## 12. Success criteria

**CARRIED**, with additions marked:

- A new player understands within the first level that electricity is the central resource.
- Players can form a plan without constant text.
- Taking damage creates tension without forcing repetitive full-level resets.
- Backtracking produces "aha" moments, not unnecessary walking.
- *(Added, CONFIRMED by the tutorial brief)* **Within the first minute, a new player has absorbed, carried
  and spent charge at least once, on purpose.**
- *(Added, RECOMMENDED)* No stretch of the main route longer than about **8 seconds of walking** holds
  nothing to look at, hear or interact with.

---

## 13. Decision ledger

**Status sync, 2026-10-15 (after merging 18 commits from Codex and Chief):** Codex has built CODEX 01 Phases A and B. In the code now: Q spends a banked pip at a gate (`player.js`), two-way charged objects with the `uncharged` field and `ElectricalSource.receive()`, charge-speed scaling (M for both), the duck movement and ability controls, and an exit gate that shows opening for four seconds. Where this document still says "NOT BUILT" for those items, the code is ahead of the text. **Still not built:** the 10-unit bar (code says `MAX_CHARGE = 25`), capacity upgrades and the Capacitor Module pickup (task A5), path platforms, the chest pip pickup, and the reactive NPC lines. The story is now canon (Malik Carter, Meridian Industries, MIOR, Project Tempest).

### CONFIRMED by Chief (this revision)
1. OVERCHARGE is the final name.
2. Finish Level 1 completely; pause development of Levels 2 to 6.
3. Level 1 is a rich exploration tutorial with an absorb-carry-spend loop inside the first minute;
   90 to 120 seconds is the proposed main-route target, with longer exploration allowed.
4. Keep 12 charge available and the 8-charge exit. The extra 4 supports experimentation and is not a
   guarantee against unlimited projectile spending.
5. Players can give charge to unpowered props as well as absorb it.
6. 25 charge fills one pip. Pips can automatically open gates. Document and test the interaction (done).
7. Keep the objective card. Gate wording: "Charge gate to open."
8. Show the exit early. Keep an optional fork as an exploration reward.
9. Substantially more NPCs and city life, with customized dialogue.
10. The bolt's combat role starts in Level 3. Level 1 may foreshadow a threat safely.
11. Movement retuning is authorized, with before/after measurements and a six-level route check.
12. Ducking and double-jump animations go on the work list; that does not settle new abilities.
13. Kiro creates the replacement music; Level 1 music is pending.
14. Older design documents are archived unchanged; technical references, orders and status records stay.

### Evaluate or investigate (CONCEPT, not decided)
- Merging parts of Level 2 into Level 1 (an option to evaluate).
- Reclaimable charge for introductory experiments (recommended by Chief, not mandated).
- The powered moving platform as a route to the gate.
- A charged wire the player glides along.
- An AC unit or other special prop that reveals a hidden route, trophy or Easter egg when powered.
- Pips opening special pathways, and chests as later pip uses.
- Passing cars.

### RECOMMENDED by Kiro (awaiting Chief)
A dedicated pip key and 17-returns-to-bar in 3.3; reclaimable-object and permanent-payoff rules in 3.5; refund
on a refused chest in 3.7; gating dev keys in 4.1; the retune starting points in 4.3; the NPC `hint`/`flavor` tag in 7; the
card-versus-world pairing and string placement in 8; the bar cost marker in 8.3; the juice order in 9.

### CONFIRMED by Chief (round 9, 2026-09-06)
49. **There is no "Level 1 has only 12 charge."** Any level has whatever charge Chief sets in the Builder.
    Items 4 and 46 (and the "12 versus 8" reasoning in 3.6) are superseded as rules; they remain as a
    description of Level 1 as built. Exit cost 8 and "completable from zero" are untouched. (3.6)
50. **Builder: placing a charged object is charged by default, and an "Uncharged" checkbox starts it empty.**
    Chief ticks it only if and when he wants an empty one. This replaces my "new props default to uncharged"
    recommendation. (3.5)

### CONFIRMED by Chief (round 13, 2026-10-16: review of Aki's branch and Kiro's Capacitor Module)
68. **The relay pylon "looks decent".** Kiro placed it in Level 1 (plaza, x 576) so Chief can see it with everything else.
69. **Failed review, to be redone by Codex (`KIRO_ORDER_CODEX_03.md`):** the apartment ("very blue, no real resemblance to
    Night City props"); the window NPC's complaining animation ("looks like she is sucking on her finger or breathing on her
    hand, not fanning herself because she's hot") and relieved animation ("doesn't look like she is happy; needs to change
    completely"); the dropped pip pickup ("looks like a blob"); the Capacitor Module ("not bad, but I want it to look exactly
    like number 3").
70. **The Capacitor Module must match concept #3 exactly:** black and graphite gunmetal with amber glow and the pale MIOR triangle,
    not a cyan core. Chief provides the reference sheet at `docs/reference/capacity_upgrade_concept_sheet.png`.
71. ~~The hatch and secret room are implemented in Level 1 as a first working version.~~ **SCRAPPED in round 14** (see below).
    (Chief saw it and did not like it. Everything but the pylon has been removed from `level1.json`.)
72. **Aki reads the new game design document and the roadmap, then builds the vertical Level 1 as a separate draft file**
    (`KIRO_ORDER_AKI_27.md`). Codex redoes the failed art pieces first.

### CONFIRMED by Chief (round 14, 2026-10-16: review of the secret-room preview)
73. **The relay pylon "looks good," but Chief could not tell what it does.** Kiro's answer (RECOMMENDED, not yet confirmed): it is the
    start of a lit cable line that leads the player along the route to the exit. Until the cable pieces arrive it is scenery.
74. **The hidden room, hatch, fire escape, room tiles and room props are scrapped "for now."** The room walls did not match the current
    rooftop tiles and the fence looked crunched. All removed from Level 1.
75. **The achievement is awarded automatically** when the player provides AC power to the tenant. No room, no poster, no pickup. This needs a
    small achievements system (CODEX 03 task 8). Title and text are Orcha's; placeholder "GOOD NEIGHBOR".
76. **(Round 14; narrowed in round 14b, see item 81.) The power switch must be small and part of a wall panel**, sitting on the wall like a light switch at player height so the hero can use it.
    The old wall switch (56 x 56 art) was "too large." New `style: 'plate'` (CODEX 03 task 3).
77. **Generate a new 4-panel apartment building that fits this sequence** (window for the tenant, mount for the AC, a control plate area at
    player height, tiles matching the current rooftop tiles). Codex makes it (CODEX 03 task 2). Full flow in `LEVEL_DESIGN_V2` 4.3c.
78. **Chief's flow, in his words (round 14b):** "Above the spawn area is the second level (vertical area player can go to); until they get enough charge
    player can't do anything. The tenant in the window complains about the heat. The player powers on the AC unit (charged object, was off). AC fan spins
    and hums. She turns relieved, and GOOD NEIGHBOR is awarded automatically. On-screen achievement pops up." So the tenant scene is in the **upper area**
    reached by the **ladder**, and an empty-bar player can see it but not act.
79. **The ladder is put back** in Level 1 (x 128, street to y 288, with a one-way upper walkway). **Codex redraws the ladder in the Night City prop colours**
    (CODEX 03 task 9; same file `ladder.png`, 128 x 605, replaced only after Chief approves).
81. **The player charges the AC directly, like any other charged object. A switch is only for powering down a fence** (Chief, round 14b). So the AC has no switch,
    no wall panel is needed for it, and the small wall-plate switch (item 76) is now a fence-gate control only. The AC takes its full capacity of 3; the level's
    spare drops from 4 to 1 if the player does not take it back (the lamp total stays 12).
82. **Chief asked for a charge economy page on the Desktop:** `OVERCHARGE_Level1_Charge_Economy.html`, with the rules, the Level 1 ledger, computed routes, a playable
    simulator and the charge table. It reproduces the document's numbers (first lamp 2.6 s, three lamps 6.6 s, ending 1 pip + 2).
83. **Street litter must be the front-most object** (it draws over lamps, NPCs and the hero) **and must never sink into a rooftop tile** (Chief, round 14b). Done.
### CONFIRMED by Chief (round 15, 2026-10-16: new economy values)
84. **Charge table changes:** fuse box **4** (was 2), streetlight **3** (was 4), AC unit **4** (was 3). Section 3.9 is updated. Level 1's three lamps in
    `level1.json` are now **3** (Kiro edited the three values on this order; Levels 2 to 6 keep their authored numbers).
85. **A 24/7 market goes where the streetlamp woman walks, with a vending machine (2 charge) in it.** Chief places it. Level 1 holds 9 in the lamps; with the
    vending machine 11. Chief: "since we dropped street lamps to 3 will need to add one more prop to level 1". Kiro suggests the fuse box (4), giving 15.
86. **The AC works both ways.** (Round 15b: it is an ordinary charged prop, so it is on while it holds any charge and off when drained.) **The tenant gets hot again when it is off, but the achievement
    stays** ("she gets hot again but since player got achievement I guess he can move on and let her suffer"). Closes the open question in item F.
87. **Consequence Chief should see (derived):** with only the lamps and the vending machine (11), an AC left on strands the player at 7 (the exit needs 8). They can
    zap it back, so nobody is trapped, but the extra prop (total 12 or more) removes the trap. Also the **free pip is gone**: three lamps of 3 make 9, below one
    full 10 bar. The economy page (`OVERCHARGE_Level1_Charge_Economy.html` on the Desktop) shows every route.
88. **Codex 04 (new order):** longer animation cycles for the two bus stop NPCs (`KIRO_ORDER_CODEX_04.md`).
### CONFIRMED by Chief (round 15b, 2026-10-16: review of Codex's handoff)
89. **No wall switch for the AC, and no new switch style anywhere** ("i dont want that at all"). The AC works as an ordinary Night City charged prop: Space charges it, E zaps it, any charge turns it on.
90. **The ladder in the game stays** (Codex's recolour was rejected). CODEX 03 task 9 is cancelled.
91. **Codex must run the CURRENT game** and capture real screenshots from it; his review composites showed an older iteration. Written into `KIRO_ORDER_CODEX_04.md` PART 0.
92. **The apartment, the tenant and the AC are placed in Level 1 and available in the Builder** for testing: apartment panels and the window tenant are in the asset palette, Aki's reactive-NPC fields and the Uncharged checkbox are merged. (Consequence found: with the AC on at any charge, the tenant costs about 1 charge; open question on the economy page.)
80. **Card line restored.** Codex's Phase A merge had reverted the Level 1 stage 1 line to "Absorb power from street lamp";
    Kiro put "Try absorbing power from a street lamp" back in both places in `ui.js`.

### CONFIRMED by Chief (round 12, 2026-10-15)
62. **The bar holds 10 and a pip is 10. The player starts with ONE pip slot (20 held at most). Each Capacitor
    Module adds one slot (+10), up to 5 slots (60).** Replaces option F (a growing bar). (3.1, 3.8)
63. **Q takes a banked pip, pays the gate's 8, and the other 2 returns to the bar.** Supersedes item 57. (3.3)
64. **Exits stay at 8.** The "exits cost 10" idea is dropped, and Level 1's totals and fork are unchanged.
65. **Special moves become learnable projectile upgrades and new moves that cost more charge,** not a whole-pip
    special attack. Later. (3.10)
66. **The Capacitor Module appears later,** not in Level 1. (3.8)
67. **One level at a time: ignore the charge economy of Levels 2 to 6 for now and focus only on Level 1.** (3.3)

### CONFIRMED by Chief (round 11, 2026-10-15)
55. **A pip always banks at 10.** The bar tops out at 10. (3.1)
56. **Each powered object has its own charge, scaled to how powerful it is** (vending machine 2, generator 8, a
    streetlight 3 or 4; Level 1's lamps stay 4). Kiro writes the table. (3.9)
57. (SUPERSEDED by item 63) **Q spends the whole pip,** gate and switch only for now; a boss special attack is a later concept. (3.3)
58. **Charge is slow when empty and gets faster as the bar fills,** for absorbing and charging. (3.3)
59. **The free pip in Level 1 is fine:** three lamps of 4 give 1 pip and 2 charge. (3.3)
60. **The AC-secret room gives the poster / story piece / achievement,** not the Capacitor Module. (3.8)
61. **Kiro makes the review pages; Aki must commit her work for Chief's review.** (Aki's branch is pushed.)

### CONFIRMED by Chief (round 10, 2026-10-14)
51. **The player starts with 10 charge. A full bar (10) is one pip.** The 25-unit bar of 2026-10-09 is
    reversed; item 6 ("25 charge fills one pip") is superseded. (3.1)
52. **A collectible item raises the player's overall charge.** Item #3, the **Capacitor Module**, from Chief's
    concept sheet is the first. Kiro makes the art (done). (3.8)
53. **The charge bar returns to red, yellow, cyan** (low, middle, high), as in the first iteration. (8.4)
54. **Kiro found, and now states plainly, that the original game had faster transfer at higher charge** (for
    discharge) and an instant pip spend on F. (3.3)

### CONFIRMED by Chief (round 7, 2026-09-06)
48. **Duck input: hold Down/S to duck; Down + jump drops through a one-way platform** (Kiro's recommendation,
    Mario-style duck). (4.4)

### CONFIRMED by Chief (round 6, 2026-09-06)
46. **Level 1 stays as is.** The three existing lamps stay **charged** (4 each, 12 in total today).
    **Round 9 supersedes the rest:** there is no fixed 12 and no "default to uncharged"; see items 49 and 50.
47. **Charge-speed formula: Kiro's recommendation `1 + held / 25` is adopted, to be tuned in play.** (3.3)

### CONFIRMED by Chief (round 5, 2026-09-06)
40. **Every charged object works both ways:** the player can absorb from it and charge it. The Builder places
    any of them charged or uncharged, with a toggle button. (3.5)
41. **A pip comes only from a chest or from absorbing enough charge to fill the bar.** No prop gives one. (3.5)
42. **Ducking is a standard mechanic from the first frame, like walking, and is for dodging attacks.** It does
    not unlock. (4.4)
43. **The objective card teaches the bolt in Level 3.** (6)
44. **Cutscenes are skipped until the story is developed.**
45. The Level 1 stage 1 card line stays "Try absorbing power from a street lamp" (Chief did not object).

### CONFIRMED by Chief (round 4, 2026-09-06)
31. **Wording:** an object the player gives charge to is a **charged object** (or "charged asset"), never a
    "toy". The docs now use "charged object" throughout.
32. Charged objects have **their own cost system, separate from the source power system.** (3.5)
33. With no pip banked, **Q does nothing.** (3.3)
34. The chest still takes its payment when the player chooses to open it; the pip waits as a pickup if the
    reserve is full. (3.7)
35. Double jump unlocks after the tutorial levels, probably around Level 5. (4.4)
36. The story is Orcha's to write. The tone is **Static Shock inspired** (see `STORY_BIBLE_DRAFT.md`). The
    premise, hero name and city name are not decided; Chief will decide.
37. The hint for the AC-unit secret is a **window NPC** in an apartment building who complains about the
    heat; powering the AC unit changes what she says to thanks that it is back on. (`LEVEL_DESIGN_V2` 4.6)
38. The tower goes at the east end and the lift speed starts at 64 px/s, to be tuned in play. (`LEVEL_DESIGN_V2`)
39. Drained lamps do **not** relight at level end (the player cannot return to the level, so there is no one
    to see it).

### CONFIRMED by Chief (round 3, 2026-09-06)
23. Objective card: the stage 1 line now reads "Try absorbing power from a street lamp" (built); stage 2
    stays as it is. (8.2)
24. In-game collectible "achievable objects" for secrets: an Easter egg plus a story clue in Level 1, no
    separate achievement system yet. (`LEVEL_DESIGN_V2` 4.6)
25. Moving platforms do both sideways and up/down, and the author sets their paths in the Builder. (4.5)
26. A chest at the pip cap shows "CHARGE FULL" and drops the pip as a pickup the player collects once
    they have room; it is forfeited on leaving the level. Nothing is refused or lost. (3.7)
27. Pip use is the **Q** key. (3.3)
28. Charge speed scales with the charge held (new mechanic; formula RECOMMENDED). (3.3)
29. Prop prices follow size and power (generator ~10, vending machine 3); the 4-unit spare is a check, not a
    law. Kiro sets the numbers. (3.5)
30. Start the story bible now (`docs/STORY_BIBLE_DRAFT.md`). Level 1 is redrawn vertically (`LEVEL_DESIGN_V2`
    section 4.3).

### CONFIRMED by Chief (round 2, 2026-09-06)
15. Using a pip opens a gate **instantly**, through a separate input (new key or double-tap). (3.3)
16. A charged prop keeps its charge until reclaimed; leaving through the exit forfeits it. (3.5)
17. The charge platform also moves **vertically.** (4.5)
18. Level 1 gets **ladders** and vertical traversal. (4.5)
19. **"Charge gate to open."** is a text label above exit gates in the world. (8.2)
20. **Hide the bolt and melee in Level 1.** (6)
21. **Ducking and double jump are real abilities** needing art; double jump is **unlockable.** (4.4)
22. Level 2 stays separate from Level 1. Level 1 goes **vertical.** The exit is shown early with a **beacon
    decoration.** The foreshadow is told through **story** (an NPC line, a sign or graffiti), not a live
    enemy. NPC voice depends on the NPC: some are filler, some drive story. The game has no story yet, so
    one must be built. (see `LEVEL_DESIGN_V2`)

### OPEN questions (need Chief), round 12
A. **Emblem in the Capacitor Module's pulse:** steady or softening? Chief reviews the Desktop page first. (3.8)
B. **Charge table numbers** (3.9): confirm or edit, especially the AC unit (3) and the lift (2).
C. **Charge-speed floor:** is 40% (1.2 units/s empty, 3 full) the right feel? Tune in play. (3.3)
D. ~~Is the poster itself the achievement?~~ **Closed round 14:** no poster. The achievement is awarded automatically when the tenant is relieved, so a small achievements system (toast, sound, saved list) is needed (CODEX 03 task 8).
F. ~~Tenant sequence, two details~~ **Closed round 15** (AC is 4, works both ways, tenant hot again when it is off, achievement stays). New question G below.
G. **Which extra prop in Level 1, and on which route is the market?** A route that skips lamp 3 holds 6 from the lamps; the vending machine (2) makes it 8. (`LEVEL_DESIGN_V2` 4.3c)
E. **Locked pip icons:** show the locked slots dim (my pick), or hide them until unlocked? (3.8)

### OPEN questions (older)
1. Charge-speed formula: Chief adopted `1 + held / 25` (3 to 6 units/s) for now; **to be tuned in play.**
   (3.3) Closed until playtest.
(Duck key closed in round 7: hold Down to duck, Down + jump to drop through.)
(The stage 1 line "Try absorbing power from a street lamp" is kept as built: Chief did not object. Cutscenes
are skipped until the story exists.)

(Closed by round 4: Q with no pip does nothing; the chest still takes its payment and the pip waits as a
pickup; charged objects have their own cost system; double jump unlocks after the tutorial levels.)

(Closed by round 2: pip meaning (a) vs (b); platform vertical mode; hide the bolt; double jump and ducking as
abilities; which string "Charge gate to open." replaces.)
