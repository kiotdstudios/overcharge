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

Everything above this line is **transcribed verbatim** from Chief's Desktop copy and must not be
edited. Where a later ruling changed the design, it is recorded here rather than silently corrected —
a verbatim spec plus a recorded override stays traceable; a quietly edited spec does not.

**1. ALL EXIT GATES COST 8.** Chief's ruling — see `docs/CHIEF_RULING_EXIT_COST_8.md`. Levels 2, 3 and
4 above say the exit needs **6**; that is **superseded**. Levels 1, 2 and 3 as shipped are already at 8.
Any new exit gate is created with `required: 8`. `blockOnly` barriers are not exits and never count
toward it.

**2. LEVEL 2 NEEDS A REAL FORK, PLUS A CHEST.** Chief: *"i need to change the route; and have a chest
that you can open behind the fence to actually teach the lesson."* As built there is **no fork** — it is
a corridor with a fence, so the switch is a toll, not a choice. **Economy is FROZEN:** `A1=4`, `E1=6`,
`SW1=2`, `EXIT=8`, margin 0. At margin 0 a chest that *costs* charge makes the level unsolvable, so the
chest must be free to open and reward charge. Full spec in `docs/KIRO_HANDOFF_MASTER.md` §3. Orcha files
`ORCHA_CHEST_V1_SEMANTICS.md` and **holds for Chief**.

**3. LEVEL 3 IS A PUBLISHED STUB**, not "not built yet". It is in `levels.json`, so players reach it.
Terrain stops at x=1184 with 62% of the level empty, the exit gate sits at x=32 *behind* the spawn at
x=64, and it has **zero enemies and zero checkpoints** — so it cannot currently teach the lesson above.
Chief's call: finish it or cut it from the manifest.

**4. LEVEL 5'S CRATE SYSTEM IS BUILT AND MERGED** (`CRATE_TIMED`), not pending. The checkpoint
requirement in the Level 5 spec still stands and is important — a wrongly-pushed crate is otherwise
unrecoverable.

**5. MARGIN 0 IS ACCEPTABLE, EXCEPT WHERE `enemies.length > 0`.** Levels 3 and 4 both have enemies, so
both **require positive margin** — one hit on an exact-solution level is a softlock. Level 4's note that
generator charge must exceed the exit cost is therefore law, not a preference, and Orcha's conditional
margin guard already enforces it automatically.

### Build order implied by the arc
Levels 1–2 tutorial (charge, then spending it) · Levels 3–4 pressure (learn loss, then apply it) ·
Level 5 first true spatial puzzle. **No level has both enemies AND crates** — keep it that way for v1.
