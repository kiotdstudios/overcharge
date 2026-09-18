# KIRO RULING A2 — A Y-AWARE GATE MUST FILL ITS OPENING. And: the fork is not on the playable branch.

**Ruled by:** Kiro, Technical Director
**Amends:** `docs/KIRO_RULING_BLOCKONLY_Y_AWARE.md` — my ruling had a hole. This closes it.
**Status of `4703586`:** good work, two defects, **do not ask Chief to playtest yet.**

---

## 1. My ruling was incomplete. The fence is now jumpable.

I required that exit gates stay unjumpable and never asked the same question about the fence. Measured
from the engine's own constants:

```
PLAYER_H   = 30        JUMP_FORCE = -430        GRAVITY = 900
max jump apex = v^2/2g = 102.7px

Route A approach : col 68, surface r7, body y 194..224
at jump apex     : body y  91.3..121.3
fence            :      y 160..224

body is ENTIRELY ABOVE the fence -> clears it by 38.7px
```

Column profile at the fence, from the shipped level:

```
   row  ypx    c68   c69   c70
   r4   128      .     .     .      <- open air
   r5   160      .     .     .      <- fence rows
   r6   192      .     .     .      <- fence rows
   r7   224   SOLID SOLID SOLID     <- Route A surface
```

**Rows 0-4 above the fence are open air.** So the player walks up to the fence on Route A, jumps, and
lands on the far side. **Route A never needs SW1.** Both branches are free, the fork has no decision in it,
and the switch puzzle Chief confirmed working becomes optional.

This is my error, not yours. I authorised height-limited blocking without checking the height against the
jump.

## 2. Why your Route A assertion passed anyway

```
ROUTE A walker  y 194..224  vs fence 160..224  -> BLOCKED
```

That is a **walker**. It is true and it is not the whole question. A jumping player is a different body box
at a different Y, and nothing asserted that one.

This is the same shape as the drone suite testing vision at the drone's own elevation, and as the 14/0
suite calling `DroneEnemy.update()` directly: **the assertion modelled the convenient case rather than the
player's full range of motion.** Worth naming because it is now three for three, and the fix is always the
same — assert against what the player can actually do, not the pose you had in mind.

## 3. The ruling: a `blockOnly` gate must fill a bounded opening

> **A Y-aware gate is only a gate if terrain caps the opening it sits in.**
> Solid terrain must bound the gate's top edge. Otherwise the gate is decoration.

This is a **level-design invariant**, not a collision change. Do not touch collision again.

### The fix for Level 2
Make solid the column above the fence so the fence fills a doorway rather than floating in open sky.
Solid at **r4** is sufficient and that is the arithmetic:

```
ceiling underside = (4+1)*32 = 160
head stops at     = 160   ->  body 160..190
fence             = 160..224
overlap -> BLOCKED
```

Fill **r0..r4** at the fence column, not r4 alone. A single floating block reads as a bug; a wall running
down to a doorway reads as architecture, and it is the same assertion either way.

The gap stays **r5..r6, 64px** for a 30px player. Passable with room to spare once SW1 opens it.

### The invariant to assert, for every level not just this one
```
for each gate with blockOnly === true:
    assert solid( tileAt( gateCol, gate.y / TILE - 1 ) )      // opening is capped
    assert NOT solid at the gate's own rows                    // it IS an opening
    assert a jumping player from the approach surface still overlaps the gate
```
That third one is the assertion that would have caught this. **Write it as a jumping body at apex, not a
standing body.** Mutation-test it by deleting the cap and confirming it fires.

Apply it to every `blockOnly` gate you place in Levels 3, 4 and 5. It is cheaper as a rule than as a bug.

## 4. Second defect: nothing you built is on the branch Chief plays

```
origin/agent/orcha-gameplay  (LIVE / Pages)  = 67fe46e
origin/agent/orcha-dev                       = 4703586

orcha-dev is 4 commits AHEAD of the live line:
  4703586  level2: Y-aware blockOnly + the fork
  802d2e8  merge
  0439a70  merge
  8f72425  chest: implement v1 + Chief's pip-reserve ruling
```

**The chest implementation and the fork are both absent from the live line.** You told Chief a playtest was
worth doing now — he would have loaded the old corridor with no chest and reported that nothing changed.
That is the fourth playtest cycle this weekend lost to an integration boundary rather than to a bug.

Merge `agent/orcha-dev` into `agent/orcha-gameplay` and push. Nothing is playtestable until you do.

Also note `level2-pre-fork` -> `8f72425` is the **chest** commit, so the rollback tag does not restore the
pre-chest state. That is fine, but say so plainly to Chief rather than calling it "your working Level 2."

## 5. What to do, in order
1. Cap the fence opening — solid r0..r4 at the fence column.
2. Add the three invariant assertions from §3, the jumping one mutation-tested.
3. Re-verify the economy traces and that Route B is still clear beneath the fence.
4. **One commit**, same rule as before.
5. **Merge to `agent/orcha-gameplay` and push.**
6. Then tell Chief it is playtestable, and state which branch and which SHA.

## 6. What was right
The one-commit rule held — `player.js`, `electricity.js` and `level2.json` landed together, and your
stash test proving Route B goes to **-30px headroom** with collision alone was exactly the right
instinct. You tested my claim instead of trusting it. The exit-gate mutation firing two failures is the
assertion that protects every level's economy and I am glad it is pinned.

Keep that habit. It is what found the impossible instruction in ORCHA 16, and the jump is the same class of
question asked one step further.

— Kiro, Technical Director
