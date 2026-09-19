# KIRO DIAGNOSIS — the drone is blind because a coupled change was reverted in half

**For:** Aki (fixing now), and to correct the record for Chief
**Chief:** *"drone now teleports and disappears completely but still in the game somehow but doesnt shoot
anymore and lost aggro state"*
**Verdict:** three symptoms, three causes — and the headline one **is** Orcha's.

---

## CORRECTION (issued minutes after the first version of this document)

The first version of this file said *"neither cause is a mistake in Orcha's O10"* and *"on this defect:
nothing."* **That was wrong, and it was wrong on the symptom Chief cared most about.** I had the diff in
front of me and read the vision numbers while missing two deleted lines directly above them.

O10's CFG rewrite **removed `CHASE_MULT: 1.35` and `LEASH: 160` and never replaced them:**

```
-    CHASE_MULT: 1.35,   // chase speed = speed * this
-    LEASH: 160,         // may chase this far PAST its patrol bounds, then stops
+    visionX: 64,
+    visionY: 96,
+    FIRE_ARC: 120,
```

Both are dereferenced on the chase path:
```js
const leashL = this.patrolLeft - C.LEASH;                                  // NaN
this.x = Math.max(leashL, Math.min(leashR - this.w,
                  this.x + dir * this.speed * C.CHASE_MULT * dt));         // NaN
```

So **the moment the drone aggroed, its x became `NaN`** — not drawn, not hittable, still in
`level.enemies`, still updating. That is precisely *"disappears completely but still in the game somehow."*

Aki found it and fixed it in `d67508b`. Chief's irritation was **correctly aimed**; my first pass defended
work that had a real defect in it. The rest of this document stands, with §5 rewritten.

---

## 1. Traced, not guessed

```
sha      droneY  visionX visionY  subject
bce9730    456       64      96   O10: drone LOS + narrow vision, drone moved to player elevation
8c729b6    200       64      96   fix: restore level3 drone_1 y=200 (Orcha moved to y=456, reverting)
```

O10 was **one coupled change with two halves**:
- narrow the sight box to `visionX 64` / `visionY 96` — Chief: *"it should only notice me if im on the same
  horizontal axis as me and x tiles away ... lets say 2 tiles"*
- move the Level 3 drone from `y=200` down to `y=456`, so it patrols **at player elevation**

Those halves only work together. A 96px vertical sight box on a drone 285px above the player is a drone that
can never see anything. Orcha said as much when he took the order: *"a 2-tile same-axis sensor means a drone
at y=200 can never notice a player at y=482, so the drone has to patrol at your elevation."*

`8c729b6` reverted the level-data half and kept the code half. Result:

```
player path centre   y ~497   (ground row r16, y=512, PLAYER_H 30)
drone centre         y  212   (y=200 + h/2)
vertical gap         285px    vs visionY 96   ->  CANNOT EVER SEE
```

**That is the whole explanation for "doesn't shoot" and "lost aggro state."** The drone is working
correctly; it is looking through a 96px window at something 285px away.

## 2. The teleport is a separate, still-unbuilt item

`src_scroll/entities.js:497-498`, the de-aggro branch:

```js
} else {
  this.x += this.vx * dt;
  if (this.x < this.patrolLeft)           { this.x = this.patrolLeft;           this.vx =  this.speed; }
  if (this.x + this.w > this.patrolRight) { this.x = this.patrolRight - this.w; this.vx = -this.speed; }
}
```

The drone may chase up to `LEASH = 160` **past** its patrol bounds. The instant it loses sight, `this.x` is
outside those bounds, so this clamp snaps it back **up to 160px in a single frame**. That is the teleport
Chief reported twice.

**"Disappears completely but still in the game" is the same bug.** Level 3's patrol is `x 400..600`. When the
player runs right and the drone de-aggros, it is clamped back into 400..600 while the camera stays on the
player — off-screen, still in `level.enemies`, still updating. Nothing vanished.

This is **O12**, ordered in ORCHA 15 and never implemented. Not a regression — outstanding work.

## 3. The fix

**Level 3 drone y.** Restore `y=456`, or any value that keeps the drone's centre within `visionY` of the
player's path:

```
drone centre = y + 12          player path centre = 497
need |497 - (y+12)| < 96   ->  y between 390 and 580
Orcha's 456 gives a 29px gap. Comfortable.
```
Level 4's drones are already right — `y=270` against a player path at `y~337`, a 55px gap, inside the 96px
window. Whoever placed those got the coupling correct.

**The teleport (O12).** Replace the instant clamp with a return that moves at most `speed * dt` per frame,
and assert exactly that: no frame may move the drone further than `speed * dt`. That assertion catches every
teleport, including ones nobody thought of.

## 4. My standing rule caused the revert, and I am amending it

`8c729b6`'s message — *"Orcha moved to y=456, reverting"* — reads as somebody enforcing
`KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`, which I published hours earlier and which says flatly that agents
do not write level files. Moving a drone **is** writing a level file. So the rule, as written, told an agent
to undo a correct change.

I wrote that rule to stop Chief's terrain being silently reverted. It did stop that. It also had an edge I
did not think through, and this is the cost.

### AMENDMENT — two clauses, effective now

**4a. Enemy placement is coupled to enemy tuning.** When an order changes sensing or behaviour constants
that depend on where an enemy sits, moving that enemy is **part of that order** and is permitted. It must
land in the **same commit** as the constants — the same one-commit rule as the Y-aware collision and the
Level 2 terrain. Chief's tiles, spawn, generators, gates, switches, chests and checkpoints remain his alone.

**4b. Never revert half of a coupled change.** If a commit changes code and data together, revert both or
neither. Reverting one half leaves a state that was never designed, tested, or intended — and it will look
like a fresh bug in whichever half you kept. If a coupled change looks wrong, **raise it**; do not unpick it.

`level_guard.mjs` stays as it is. It is doing its job: it flags level-file changes so they are *deliberate*.
The failure here was not the guard firing, it was the rule giving the wrong answer once it fired.

## 5. What went wrong, attributed accurately

**Orcha's, and it is the serious one.** Rewriting the CFG block dropped `CHASE_MULT` and `LEASH`, two
constants the chase path multiplies and clamps with. The result was a `NaN` position on first aggro — an
entity that exists and cannot be seen. A suite at **769/0** did not catch it, because nothing asserted that
the drone's position stays finite after aggro. That is the real lesson here, and it is the same shape as
`e.update(dt, this)` passing two arguments to a three-argument function: **the failure was in the wiring
between a config block and the code that reads it, and no assertion crossed that boundary.**

New required assertion, for any entity with a CFG block:
```
after aggro, and after de-aggro, assert Number.isFinite(e.x) && Number.isFinite(e.y)
```
Mutation-test it by deleting one CFG key and confirming it fires. A dropped constant must never again be
discoverable only by a human noticing an enemy vanished.

**Reverting half the coupled change**, which produced the blind drone at a 285px gap. Well-intentioned,
caused by my rule, amended in §4.

**Mine.** I cleared Orcha in the first version of this document while the deleted constants were visible in a
diff I had already read. Chief was told the wrong thing about who broke what, which is worse than saying
nothing.

## 6. Where live stands now, and the end state I recommend

`d67508b` restored the CFG and got the drone working — but it restored **all** of O10's constants, which
means **`_hasLineOfSight` is gone from live.** Verified: `_hasLineOfSight` is undefined and `_sees` no longer
receives `level`. So Chief's *"notices me through the floor - big no no"* is **back**.

The fix restored function by discarding the feature.

**Recommended end state — and it needs no level-file change at all:**
- **Keep `visionX 240 / visionY 340 / FIRE_ARC 300`.** Restored and working.
- **Put `_hasLineOfSight` back.** This is the part Chief actually asked for.
- **Keep `CHASE_MULT 1.35` and `LEASH 160`.** Obviously.
- **Leave the Level 3 drone at `y=200`.** 285px gap against `visionY 340` is in range.
- Build **O12**: replace the instant patrol clamp with a return capped at `speed * dt`.

The insight that dissolves the whole placement argument: **a wide sight box is safe once terrain blocks it.**
`visionY 340` was only ever a problem because it saw *through the floor*. With line of sight doing that job,
the drone does not need to be moved to player elevation, `visionX` does not need to shrink to 2 tiles, and
nobody needs to touch Chief's level file. The two halves were only coupled because the sight box was being
used to do a job that line of sight does properly.

— Kiro, Technical Director

---

## 7. `drone_sensing` is now 40/10 and it is RIGHT — the code regressed, not the suite

The suite still asserts O10's design. Live reverted that design. Every failure is the guard working:

```
x FIRE_ARC >= visionY, so anything it can SEE it can SHOOT — FIRE_ARC 300 >= visionY 340
x visionX is narrow, per Chief's "2 tiles" — 240px = 7.5 tiles
x level4: a drone at the OLD y=200 cannot see the grounded player — separation 119px,
      and terrain is between them                                    (x3, one per drone)
x level4: the drone body never overlaps terrain along its patrol      (x2)
x level3: LEVEL.update wires a player through and the drone ALERTS — sequence: patrol
x level3: no blast before the telegraph elapsed
x level3: and a blast actually connects with the grounded player — 0 stun(s) landed
```

Two of these are **live defects Chief will feel**, not bookkeeping:

**`FIRE_ARC 300 < visionY 340`.** The drone can see 340px but only shoot 300px, so in a 40px band it
alerts, chases and fires nothing. Orcha's own comment warns about exactly this — *"the reverse shipped once
and the drone fired nothing"* — and restoring the old numbers restored the old bug with it.

**The three Level 4 failures prove the floor is see-through again.** That assertion says a drone at y=200
*must not* see a player 119px below when terrain sits between them. It passes only when line of sight
exists. It is failing, which is the suite reporting Chief's *"notices me through the floor - big no no"* in
assertion form.

## 8. The fix list, in order

1. **Restore `_hasLineOfSight`** and pass `level` into `_sees`. This is the piece Chief actually asked for
   and the only one that makes a wide sight box legitimate.
2. **`FIRE_ARC` must be `>= visionY`.** With `visionY 340`, set `FIRE_ARC 340`. Keep the assertion that
   pins the relationship — do not just match the numbers by hand.
3. **Keep `CHASE_MULT 1.35` and `LEASH 160`.** Add the finite-position assertion from §5 so a dropped
   constant can never again present as a vanishing enemy.
4. **Leave the Level 3 drone at `y=200`.** 285px against `visionY 340` is in range, and with line of sight
   the floor does the blocking. No level file needs touching, which retires the conflict in §4 entirely.
5. **`visionX` is Chief's dial.** He said 2 tiles; 64px means the drone must nearly touch him to react.
   240px is 7.5 tiles. With line of sight restored, anything in between is safe. **Ask him for a number
   rather than picking one** — he said *"will test and see how that feels"*, and that is a feel question.
6. **Fix the Level 4 patrol overlap.** Two assertions say a drone body crosses terrain along its patrol.
   That is placement, so it is Chief's to approve — report the columns and let him adjust.
7. **O12 — the teleport.** Replace the instant patrol clamp with a return capped at `speed * dt`, and
   assert no frame moves the drone further than that.

Items 1-3 and 7 are code and yours. Items 4-6 touch placement or feel and are Chief's.

— Kiro, Technical Director
