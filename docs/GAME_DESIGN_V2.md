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

### 3.1 Units and the meter (BUILT, verified in `src_scroll/player.js` 201 to 355)
- Charge is counted in units. One lamp holds 4. An exit gate costs 8.
- **The bar holds 25 units** (`MAX_CHARGE`). When the bar fills it **banks a pip** and resets to 0, and
  any overflow carries into the new bar. **CONFIRMED:** 25 charge fills one pip.
- The reserve holds **up to 5 pips** (`MAX_BANKED_PIPS`). Usable energy is `bar + 25 x pips`, a maximum
  of 150. At the cap the bar stays at 25 and further energy is refused (a source gets it back).
- Absorbing and discharging both move **3 units per second**. A lamp's 4 units take about 1.3 s. A gate's
  8 units take about 2.7 s. A whole pip takes about 8.3 s to absorb.
- All gains and losses go through one authority in `player.js`. Nothing else may assign `charge` or
  `bankedPips`.

### 3.2 How pips and an ordinary 8-charge gate interact (BUILT, TESTED)
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

### 3.3 "Pips can automatically open gates" (CONFIRMED intent, partly BUILT, OPEN)
- **CONFIRMED.** Pips can automatically open gates. Special pathways and chests are possible later uses.
- **BUILT.** Pips are *drawn on automatically*: the player never manages them, and a pip feeds the bar
  mid-charge without any pause.
- **BUILT, and contrary to a literal reading.** **Nothing opens a gate without the player holding SPACE**,
  in range, standing on the ground. Tested: five pips, no SPACE, five seconds beside the gate: the gate
  stays closed and the energy is untouched.
- **OPEN (needs Chief):** did you mean (a) the current behaviour, where pips pay automatically once you
  start charging, or (b) a new behaviour where standing at a gate with enough stored energy opens it?
  - **RECOMMENDED: (a).** The codebase deliberately forbids one-press completion ("No button may complete
    a gate in one press"), and (b) would let a player drain a pip by accident just by walking past.
    If (b) is wanted, it should cost the gate's price (8), not a whole pip.

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
- **RECOMMENDED semantics, for Chief to approve:**
  - *Reclaimable toys*: charge goes in, the prop reacts, and holding E drains it back out. They can
    never strand the player, so they cost nothing against the 4 spare units.
  - *Permanent payoffs*: charge is consumed for a lasting reward. Their total cost in Level 1 should
    never exceed the 4 spare units, so a player who buys them all still has 8 for the exit.
  - Reclaiming returns the full amount given. No fee, no decay.
- **OPEN:** should a vending machine ever *dispense* something (a pip)? A pip is 25 charge, so a machine
  that pays one for 3 would be a charge fountain and break the economy.

### 3.6 The Level 1 economy (CONFIRMED)
- **CONFIRMED.** Level 1 keeps **12 charge available and an exit that costs 8.**
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
  ("the player can return"). **OPEN: fix it?** Recommended yes: refund on refusal. Not a Level 1 blocker,
  since Level 1 has no chest.
- **Level 1 can be left unwinnable without the game noticing.** `Level.isFailState` returns false whenever
  `usableEnergy > 0`. A player who absorbs all 12, then fires bolts (0.25 each) until 7.75 is left, holds
  energy but cannot pay the 8 exit. Measured: 16 bolts leaves exactly 8, a 17th leaves 7.75, and the game
  reports no fail state. The only recovery is the column 26 pit (the restore refills the lamps) or a
  reload; there is no in-play respawn key. **OPEN: fix it?** Recommended yes: treat "usable energy below the
  cost of the cheapest remaining mandatory spend, with no source left" as a fail state. It matters most if
  the bolt stays available in Level 1 (see the bolt question in section 13).
- Dormant code: `spendPip()` has no runtime caller, `_pipFlash` is never set above 0, and several
  comments still say `MAX_CHARGE = 10`.

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

### 4.4 New movement abilities (CONCEPT, deliberately unsettled)
- **CONFIRMED (work list).** Add **ducking** and **double-jump animations.**
- **CONFIRMED (boundary).** An animation request **does not settle a new ability.** Neither crouching nor
  double jumping exists as a mechanic, and nothing here promises either.
- **OPEN:** are ducking and double jump intended abilities, or animation art only (for example a flourish
  on a coyote jump)? Both would change the movement envelope that every level was proved against.

### 4.5 Traversal (BUILT, plus concepts)
- **BUILT:** ladders, ledge climbing and the grapple. The grapple is a **pull to a fixed point**: it has
  no swing, no momentum and no travel along a line. No level uses a ladder or an anchor yet.
- **CONCEPT, to investigate (CONFIRMED as "an additional concept to investigate"):** a **charged wire the
  player glides along.** Nothing like it exists. Questions to answer before building: does it consume
  charge, does it need a powered state, can the player drop off, what is its speed, and is it a one-way ride?
- **CONCEPT, to consider (CONFIRMED as "consider"):** use the **powered moving platform** to reach the
  exit gate. **Constraint found:** the platform is **horizontal only**; its height never changes. So it can
  carry the player *across* a gap or *along* a route to a gate, but it cannot lift them to a higher one.
  Either the gate is placed at the platform's height, or the platform needs a vertical mode (new work).

---

## 5. Devices and world objects (BUILT)

| Object | What it does today |
|---|---|
| **Energy source** (lamp, fuse box, camera, generator, HVAC) | Absorbable with E. Visibly dims and goes dark when drained. Cannot receive charge. |
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
- **OPEN:** the bolt (L) and melee (K) are usable from the first frame, with nothing to hit in Level 1.
  Should they be hidden from the prompts and the dev bar until Level 3? The bolt's charge cost is also
  what the "12 versus 8" buffer is guarding against, so hiding it removes the risk instead of buffering it.

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
- **OPEN:** does "Charge gate to open." replace the stage 2 *task line*, the stage 2 *title*, or the
  in-world `[SPACE] CHARGE` prompt? **RECOMMENDED:** replace the task line only, keep the title as the
  objective's name, so no existing test assertion has to change.

### 8.3 Showing what a device costs (CARRIED, RECOMMENDED)
The bar is 25 wide and the exit costs 8, so the cost does not read at a glance. v1 asks for "clear
feedback showing how much electricity a device requires." **RECOMMENDED:** when the player is near a
device, draw a cost marker on the bar at 8 so it fills toward a visible line.

---

## 9. Feel and juice

**CONFIRMED** only as far as the movement retune in 4.3. The rest is **RECOMMENDED** and not decided.

Today there is **no** screen shake, hit-stop, general particle system, landing feedback, jump or land
sound, or death/respawn transition. v1 section 9 required "tactile sound design: hums, crackles, capacitor
whines, power-down thumps, relay clicks, and escalating audio as the player approaches maximum charge."
So the feedback layer is a **v1 requirement that was never built**, not a stretch goal.

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
Pip meaning (a) in 3.3; reclaimable-toy and permanent-payoff rules in 3.5; refund on a refused chest in
3.7; gating dev keys in 4.1; the retune starting points in 4.3; the NPC `hint`/`flavor` tag in 7; the
card-versus-world pairing and string placement in 8; the bar cost marker in 8.3; the juice order in 9.

### OPEN questions (need Chief)
1. Pips: automatic payment once charging starts (current), or open-on-approach? (3.3)
2. Should a vending machine ever dispense a pip? (3.5)
3. Fix the refused-chest energy loss? (3.7)
4. Are ducking and double jump intended abilities, or animation only? (4.4)
5. Should the platform gain a vertical mode, or should the gate sit at its height? (4.5)
6. Hide the bolt and melee until Level 3? (6)
7. Which string does "Charge gate to open." replace? (8.2)
