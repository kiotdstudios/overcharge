# OVERCHARGE — Level Breakdown
What each level is and what it teaches

---

## Level 1 — NEON RISE
**Status:** Built and live

**What it is:** Linear left-to-right run. Two generators sit in the level, both
carrying 4 units of charge. The exit gate needs exactly 8 to open. No enemies,
no obstacles besides the terrain, one checkpoint midway.

**What it teaches:** The core loop from scratch. Move, jump, touch a generator
to absorb its charge, reach the exit. The exact-solution math (4+4=8) means the
player has to hit both generators — there's no margin to skip one. It's the
game explaining itself without saying a word: glowing thing fills your meter,
door opens when the meter is full.

**New mechanic introduced:** Absorbing charge. Exit gates.

---

## Level 2 — SPLIT DECISION
**Status:** Built and live

**What it is:** Two generators again (4 charge and 6 charge), but now there's a
locked barrier mid-level blocking the upper route. A switch earlier in the
level opens it — but the switch costs 2 charge to activate. The exit gate needs
6 to open.

**What it teaches:** Charge is a resource you spend, not just collect. To
proceed you have to choose: burn 2 charge on the switch to unlock the path, or
find another route. The name "Split Decision" is literal — there's a fork and
your charge budget decides which way you go. First time the player has to think
about whether to spend or save.

**New mechanics introduced:** Switches. Charge-as-currency. Barrier gates
(block-only, don't count toward the exit). Resource tradeoffs.

---

## Level 3 — DON'T GET HIT
**Status:** Design brief written, not built yet

**What it is:** Same basic structure as Level 1 but with a drone enemy
patrolling a corridor the player must cross. Two generators, exit needs 6.
Getting hit scatters your charge on the floor as pickups you can run back and
grab.

**What it teaches:** Getting hit is a setback, not death. The level is
intentionally designed so most players get hit on the first crossing — the
scattered charge lands on open floor nearby, not in a pit, so recovery is
obvious and immediate. The lesson: "I lost progress but I can get it back."
Introduces the punishment/recovery loop before the game starts requiring clean
play.

**New mechanic introduced:** Drone enemies. Scatter-and-recover. Charge loss
as a design element rather than a failure state.

---

## Level 4 — CARRY CURRENT
**Status:** Design brief written, not built yet

**What it is:** Generators clustered at one end of the level, exit gate at the
far end with nothing in between to recharge. A drone patrols the traversal
stretch. The player has to physically carry charge across the level.

**What it teaches:** Charge is cargo. Getting hit mid-carry means going back,
refilling, and trying again — applying the Level 3 lesson under actual pressure.
The level also enforces surplus: total generator charge exceeds the exit cost,
because an enemy-hit level where exact-solution math is a softlock would be
unfair. The design demands clean execution, not perfection.

**New mechanic introduced:** Charge as cargo across distance. Consequences of
a hit mattering strategically, not just mechanically.

---

## Level 5 — POWER AND POSITION
**Status:** Design brief written, not built yet. Depends on the conductive
crate system (Orcha building it).

**What it is:** A switch the player can't directly reach. A conductive crate
nearby that can be pushed into contact with the switch, completing the circuit
from a distance. The switch opens a route back to something earlier in the
level. Exit gate is last.

**What it teaches:** Where things sit matters. Pushing the crate into position
turns an unreachable device reachable — the puzzle is spatial, not just "do I
have enough charge." The deliberate backtrack after opening the switch is the
"aha" moment: you changed the level by moving an object. Must have a checkpoint
because a wrong-pushed crate is otherwise unrecoverable (no reset-crate button
in v1).

**New mechanic introduced:** Conductive crates. Charge-through-contact.
Environmental puzzle solving (position as solution, not just movement).

---

## Notes

- Levels 1–2 are the tutorial arc: understand charge, understand spending it.
- Levels 3–4 are the pressure arc: learn loss, then apply it.
- Level 5 is the first true puzzle: spatial reasoning, not just execution.
- No level has both enemies AND crates yet — that's future territory.

---

## RECORDED OVERRIDES (Kiro)

Transcribed VERBATIM from Chief's Desktop copy. Overrides below, not edited inline.

**1. All exit gates cost 8.** Chief's ruling, see docs/CHIEF_RULING_EXIT_COST_8.md. Levels 2, 3 and 4 above read 6 � superseded. Levels 1, 2, 3 as shipped are all at 8 already.

**2. Level 2 needs a real fork + chest.** Chief: change the route, add a chest behind the fence. Economy FROZEN (A1=4, E1=6, SW1=2, EXIT=8, margin 0). See docs/KIRO_HANDOFF_MASTER.md section 3.

**3. Level 3 is a published stub**, not 'not built yet' � terrain stops at x=1184, exit behind the spawn, no enemies, no checkpoints.

**4. Level 5's crate system is BUILT and merged** (CRATE_TIMED), not pending. Checkpoint requirement above still stands.

**5. Margin 0 is acceptable EXCEPT where enemies.length > 0.** Levels 3 and 4 have enemies, so both require positive margin � Level 4's note about surplus is therefore law, and Orcha's conditional guard enforces it.
