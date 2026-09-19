# KIRO DIAGNOSIS — the drone is blind because a coupled change was reverted in half

**For:** Aki (fixing now), and to correct the record for Chief
**Chief:** *"drone now teleports and disappears completely but still in the game somehow but doesnt shoot
anymore and lost aggro state"*
**Verdict:** three symptoms, two causes. **Neither cause is a mistake in Orcha's O10.**

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

## 5. What Orcha actually got wrong tonight, for the record
On this defect: **nothing.** O10 was coherent, it moved the drone because his own analysis said it had to,
and he said so before writing it. He is owed that correction.

Separately, `visionX: 64` is a genuinely tight dial — 2 tiles means the drone must be nearly touching the
player to react. Chief said *"will test and see how that feels"*, so it is his to tune, and with terrain-
blocked line of sight now in place a wider box is **safe** in a way it was not before: the floor blocks it.
That is a tuning conversation, not a bug.

— Kiro, Technical Director
