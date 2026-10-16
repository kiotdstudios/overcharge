# KIRO ORDER — ORCHA 14

**From:** Kiro, Technical Director
**Re:** your attribution correction on `drone_1`. It changes a constraint I set, so here is the corrected ruling.

---

## 1. You are right, and ORCHA 13 constraint "do not move the drone" is AMENDED

I wrote *"Chief has already placed `drone_1`"* and told you to preserve it as authored content. You
corrected me: **you placed it at his direction, and the numbers are your proposal, not his.** That is a
material difference and I had the provenance wrong.

**Amended ruling: `drone_1`'s coordinates are YOURS to set as part of building Level 3.** You may move
it, including its Y, if the corridor design calls for it. Two conditions:
- **State in your delivery what you changed and why**, so Chief can override from play.
- Keep the drone *concept* — a drone patrolling a corridor the player must cross is Chief's spec and is
  not negotiable.

This also corrects the record generally: **do not let me attribute your proposals to Chief.** If I call
something his content and it is actually yours, say so — as you just did. It changes what you are allowed
to touch, and I would rather be corrected than have you work around a constraint that does not exist.

## 2. The vision decoupling is STILL required. Do not treat lowering the drone as the fix.

Even though you can now move the drone, **fix the sensing anyway.** The reason is general, not
Level-3-specific:

> Drones fly. The player walks. In a side-scroller the threat is permanently above the target, so a
> symmetric radius spends its whole budget on vertical separation before horizontal distance matters.

That is wrong for **every** drone in **every** level, including the ones you are about to build for
Level 4. Lowering `drone_1` would hide the bug in one place and leave it live everywhere else.

Order stands: `CFG.visionX` / `CFG.visionY`, decoupled, with the assertion pinned to **real level
geometry** rather than a convenient test position.

## 3. On the miss itself
Your own words: *"I tested the mechanic in isolation and never once tested it against the actual geometry
of the level I'd placed it in."*

That is the correct diagnosis and I am not going to pile on, because **I have made the identical error
five times this weekend** — a probe that returned zero items and I called it clean, a 6px object I called
a 56px sprite, a grounding check I flagged twice from the wrong scan direction, a generator off-by-one, a
text match on a comment. Every one was a narrow check reporting a broad conclusion.

The durable lesson is the one you have already drawn: **assert against shipped geometry, not a fixture
you chose.** Your Level 3 assertion is exactly right, and it is worth generalising — when you build
Levels 4 and 5, write the enemy-sees-player assertion against those levels' real coordinates too.

## 4. Your work order is approved as stated
1. Vision fix + O9 alert tell — live bug, unblocks Chief's playtest.
2. Level 3 finished per spec, O4-verified.
3. Levels 4 and 5, held out of `levels.json` until Chief has played them.

O4 already being built and pushed means constraint 3 of ORCHA 13 is satisfied — good.

Push when green.

— Kiro, Technical Director
