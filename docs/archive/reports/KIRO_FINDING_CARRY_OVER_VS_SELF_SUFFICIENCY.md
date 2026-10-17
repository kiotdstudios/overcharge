# KIRO FINDING — carry-over is real, but Level 3 cannot DEPEND on it

**Raised by:** Chief — *"my logic was if you get the chest at lvl 2 then u have a whole pip so you should be
good for lvl 3 i just need to add a checkpoint to lvl 2 after u get the chest"*
**Status:** needs Chief's ruling. Level 3 is uncompletable as saved.

---

## 1. Chief is right about the mechanism

Pips and bar charge **do** survive a level change in the shipped build. Verified in code, not assumed:

```js
// main.js:144-151
function loadLevel(idx, carryCharge = false) {
  const savedCharge = carryCharge && player ? player.charge : 0;
  const savedPips   = carryCharge && player ? player.bankedPips : 0;
  ...
  player = new Player(level.playerStart.x, level.playerStart.y);
  if (carryCharge) player.setEnergyState(savedCharge, savedPips);
```
`advanceLevel()` calls `loadLevel(idx, true)`, so walking through an exit gate carries both numbers
forward through the energy authority. A new `Player` is built every level, but those two values are
explicitly copied across. The design instinct was correct.

His checkpoint plan is also correct: respawn restores energy **as of the last checkpoint**, so a checkpoint
placed after the chest means dying does not cost the pip. Level 2 currently has **zero** checkpoints.

## 2. But it only works on ONE branch of the fork

Traced from the shipped level files:

```
LEVEL 2   A1=4  E1=6   SW1=2   chest cost 2 / reward 1 pip   EXIT=8
LEVEL 3   src_2=5 only (src_1 and src_3 deleted)             EXIT=8   1 enemy   0 checkpoints

ROUTE A   bar 6 + 1 pip = 16 usable, pay 8  ->  carries 8
ROUTE B   bar 10, no pip = 10 usable, pay 8 ->  carries 2

ROUTE A   8 carried + 5 = 13  vs exit 8  ->  OK, margin 5
ROUTE B   2 carried + 5 =  7  vs exit 8  ->  SOFTLOCK, short by 1
FRESH     0 carried + 5 =  5  vs exit 8  ->  SOFTLOCK, short by 3
```

**Route B softlocks on Level 3 by exactly one charge.** The player made a legitimate choice on Level 2 —
the choice the fork exists to offer — and gets stranded a level later with nothing explaining why. That
turns the fork from a decision into a trap, and it is the same failure shape as the secretly impassable
branch that ORCHA 16 was written to avoid.

Three more paths arrive at zero: a **page refresh**, a **direct `?level=3` link**, and **returning to the
title screen** (`startGame()` calls `loadLevel(0)` with no carry).

## 3. RULING — every level must be completable from ZERO carried charge

> **Carry-over is a cushion, never a prerequisite.**
> Each level must be clearable on its own sources alone, with positive margin when it contains an enemy.
> Arriving rich is a reward for playing well; it must never be the difference between solvable and stuck.

Reasons, in order of weight:
1. **Route B softlocks.** Any carry-dependency makes one branch of the fork mandatory, which deletes the fork.
2. **Refresh and direct links start empty.** There is no persistence — `_snap` and `currentLevelIdx` are
   plain module variables and a refresh returns to the title at zero.
3. **Level 3 has an enemy.** Getting hit scatters charge, which is the level's entire lesson. That needs
   slack, and OVERRIDE 5 already forbids margin 0 when `enemies.length > 0`.
4. **Levels stay independently testable.** Chief tests by jumping straight to a level. A level that only
   works after a specific route through the previous one cannot be tested that way, and every playtest
   cycle gets slower.

**This is why `completability` assumes zero carry-over.** The prover and the design assumption disagree, and
the prover is right: it is a worst-case check, and the worst case is a real player on Route B after a refresh.

## 4. What Level 3 needs
Restore enough generator charge that Level 3 clears on its own with positive margin. Before Chief's edit it
was 3 sources x 5 = 15 against an exit of 8, margin 7 — healthy for a level where a hit scatters charge.
The chest pip then does what Chief wanted: it makes the drone level **comfortable** rather than possible.

## 5. Testing note that will otherwise waste Chief's time
On **localhost the carry cannot be observed through the exit gate.** In dev mode `LEVEL_DEFS` is a
single-element array (`main.js:578`), so `advanceLevel()`'s `(idx + 1) % length` is always 0 — finishing
Level 2 reloads Level 2, pip intact. And the `[` / `]` dev switcher calls `loadLevel(0)` with **no carry
flag** (`main.js:483`), which zeroes charge and pips.

So testing the hand-off locally shows the pip vanishing, and the carry code is fine. **Verify carry-over on
the published Pages build, not on localhost.**

— Kiro, Technical Director
