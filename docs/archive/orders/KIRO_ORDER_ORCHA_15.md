# KIRO ORDER — ORCHA 15

**From:** Kiro, Technical Director
**Source:** Chief's Level 3 playtest — the first one where the drone actually ran.
**Context:** the drone never sensed at all until `720320e`. `level.js` called `e.update(dt, this)` while
`DroneEnemy.update(dt, level, player)` needs three args, so `player` was `undefined` every frame. Your
sensing work was correct and could never execute. **Your 14/0 suite passed because it calls
`DroneEnemy.update()` directly; nothing asserted the LEVEL wires a player through.** That is the third
integration-vs-unit miss this weekend and I should have caught it at the gate, not you.

**Every assertion in this order must be driven through `Level.update(dt, player)`, not by calling the
class directly.** If it only passes at the class level it does not count.

---

## 1. O10 — Vision must be TERRAIN-BLOCKED and NARROW. My earlier ruling is reversed.

Chief: *"notices me through the floor - big no no; it should only notice me if im on the same horizontal
axis as me and x tiles away this enemy can see lets say 2 tiles (will test and see how that feels)."*

I twice ruled "leave terrain-awareness alone, don't build a raycast." **Chief has now seen it matter in
play, so that ruling is reversed.** He outranks it and he is right — a drone shooting through a floor
reads as broken, not as difficult.

### Required
1. **Line-of-sight check.** Step along the line from drone centre to player centre sampling
   `level.tileAt()`; if **any** sample is solid (`v === 1 || v >= 10`), the drone cannot see him. Step at
   ~8px — that is at most ~40 samples at this range and costs nothing. This is not a general raycast
   engine; it is one loop, scoped to drone sensing. Do not generalise it.
2. **Narrow the band.** Chief wants same-horizontal-axis detection at roughly **2 tiles = 64px**. Put
   both numbers in `CFG` as a single visible dial, because he said outright *"will test and see how that
   feels"* — expect to change them.
   - `visionY` must shrink hard. It is currently **340**, which is what lets it see through the floor
     from y=200 to y=482.
   - `visionX` is his "x tiles" — start at 64 and expect him to raise it.
3. **`FIRE_ARC` must shrink with `visionY`**, exactly as you reasoned last time. You already found that
   bug in reverse; do not reintroduce it by shrinking one and not the other. **Assert the relationship**
   rather than relying on picking matching constants.

### The consequence you must handle — read this before you tune
A same-axis sensor means **the drone at y=200 can never notice a player at y=482**. 282px of vertical
separation is not "same horizontal axis" under any tolerance worth having.

So one of two things has to be true, and **it is your call under ORCHA 14** since `drone_1`'s
coordinates are your proposal:
- the drone **patrols at the player's elevation**, in the corridor it is supposed to threaten, or
- the drone **descends** to engage once it notices by some other means.

**My recommendation: patrol at player elevation.** It is simpler, it matches "corridor the player must
cross" in Chief's spec, and it makes the 2-tile sensor meaningful. Set it when you build Level 3 and
state the number in your report.

---

## 2. O11 — It must actually CLOSE IN. Right now it holds station.

Chief: *"there also wasnt a chase it did notice me and i saw the exclamation but it stayed at a distance
cool for another enemy type but for this one it should try to get up close hover around; shoot a few then
move locations; shoot a few you know feel real."*

The alert tell **worked** — he saw the exclamation. The engagement did not.

He is describing a **hover-harass** pattern, not a charge:

```
NOTICE  -> alert tell (already working, keep the 0.55s telegraph)
CLOSE   -> approach to a hover distance, not to contact
HOVER   -> hold near the player, fire a short burst
REPOSITION -> break off to a new nearby position
HOVER   -> fire again
```

### Required
- **Close to a hover radius**, not to zero. Contact damage already exists via `tryContact`; ramming is a
  different enemy.
- **Burst fire, not a metronome.** He said *"shoot a few"* — a burst then a pause reads as intent; an
  even drip reads as a turret.
- **Reposition between bursts.** Pick a new offset near the player rather than sitting still. That single
  behaviour is most of what makes it "feel real".
- **Keep the leash.** Unleashed it follows him off the authored terrain — on Level 3 that means out over
  the void. You were right to add it.
- All distances and timings in the same `CFG` dial. He will tune them.

Do **not** add a new enemy type. He explicitly said hold-at-distance is *"cool for another enemy type"* —
note it as a future variant, build neither.

---

## 3. O12 — De-aggro must FLY back, not teleport

Chief: *"i ran to the far right edge once i was out of its range it teleported back to its original spot
rather than just flying back after losing agrression state."*

A snap is a hard visual break and it tells the player the drone is a state machine rather than a thing in
the world.

### Required
- On losing aggro, **travel** back to the patrol range at its normal speed, then resume patrolling.
- Give the return its own state so it reads differently from both patrol and chase — a distinct
  de-aggro tell was already in the O9 spec; this is where it belongs.
- **Assert there is no position discontinuity**: across the whole aggro → de-aggro → patrol cycle, no
  single frame may move the drone further than `speed * dt`. That assertion catches every teleport,
  including ones we have not thought of, and it is the kind that stays true as the behaviour changes.
- Mutation-test it by reinstating the snap and confirming it fires.

---

## 4. Verification — non-negotiable
- **Drive everything through `Level.update(dt, player)`.** The bug that wasted Chief's last two playtests
  was invisible to class-level tests.
- Add an assertion that **`level.js` passes a player to enemy `update()`**. That one line would have
  caught it, and nothing currently protects it from regressing.
- **Level 3's real geometry**, not a fixture — your own lesson, now twice proven.
- LOS asserted both ways: blocked by a floor between drone and player, clear when nothing is between.
- Suites stay green; boot smoke every time. Push when green.

## 5. Priority
This is now ahead of Levels 4 and 5. Level 3 is the level that exercises all of it, so **finish the drone
behaviour and Level 3 together** — the drone's patrol elevation is a Level 3 design decision and doing
them separately means doing the placement twice.

Chest semantics still wanted early — **Aki has been blocked for a long stretch now** and it is the only
thing that frees her.

— Kiro, Technical Director
