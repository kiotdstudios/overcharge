# KIRO ORDER — ORCHA 18

**From:** Kiro, Technical Director
**Supersedes the sequencing in:** ORCHA 15, ORCHA 16 §4, ORCHA 17
**Chief's scope ruling:** *"goal for the weekend is to make 3 solid levels though we are almost done with 3
so i say lets get 4 done"* → **target is four levels. Level 5 is cut.**

---

## 1. RULING A3 — a gated region must be proven by REACHABILITY, not by local geometry

Chief: *"it created the fork but i can just jump backwards and get the chest."* He is right, and **the hole is
mine again.** RULING A2 told you to assert *"the tile above the gate is solid."* That is a **local** check. The
actual requirement is global:

> **A gated reward must be unreachable from spawn while the gate is closed, and reachable once it opens.**
> Prove it by walking the level. A local geometry check cannot answer a reachability question.

A2 closed the vertical bypass and left the horizontal one wide open. Same class of error as before, one level
up: I asserted a property *near the gate* instead of the property that actually matters.

### What the terrain shows

```
  col    67  68  69  70  71  72  73  74  75  76  77  78  79
  r3      .   .  ##   .   .   .   .   .   .   .   .   .   .
  r4      .   .  ##   .   .   .   .   .   .   .   .   .   .
  r5      .   .  FF   .   .   .   .   .   .   .   .   .   .
  r6      .   .  FF   .  CH   .   .   .   .   .   .   .   .
  r7     ##  ##  ##  ##  ##  ##   .   .   .   .   .   .   .
  r8      .   .   .   .   .   .   .   .   .   .   .   .   .
  r9      .   .   .   .   .   .   .   .  ##  ##  ##  ##  ##
  r10    ##  ##  ##  ##  ##  ##   .   .  ##  ##  ##  ##  ##
```

`FF` = fence (col 69, r5-r6, capped at r3-r4). `CH` = chest (col 71, r6), standing on the r7 platform.

**The chest sits on the RIGHT of the fence, and the right side is open.** The bypass:
1. Take Route B along the r10 floor, under the fence. The fence is not crossed.
2. Continue right, cross the r73-r74 pit, land on the r9 ledge.
3. Jump back up-left onto the r7 platform, which runs cols 67-72 with **nothing sealing its right edge**.
4. Walk left to the chest. SW1 was never paid.

The pocket has a floor, a left wall and a ceiling. It has **no right wall**, and no ceiling over cols 70-71.

### The fix
Seal the pocket so **the fence is its only door**. That needs, at minimum, a right wall at **col 72, r5-r6**
and a ceiling over **cols 70-71 at r4**. Compute the exact tiles yourself against the real engine and confirm
the pocket is still comfortable to stand in and the chest still reads from the approach — a sealed box the
player cannot see into is a different problem.

Route B must remain fully passable. **Do not solve this by removing the lower route** — that deletes the fork.

### The assertion that actually catches this
Reachability from spawn, both gate states, through the real collision and movement code:

```
gate CLOSED  ->  chest NOT reachable from spawn
gate OPEN    ->  chest reachable from spawn
Route B      ->  still completable end to end with the gate closed
```

Use the `completability` closure walk. **Do not hand-roll a grid flood-fill for this** — I wrote one while
investigating and it reported the chest unreachable even with the fence open, which is plainly false since
Chief just collected it. A movement model that is not the engine will lie to you in both directions. Walk it
with the real player physics.

Mutation-test it: delete the new right wall and confirm the closed-gate assertion fires.

**Apply the same proof to every gated reward in Levels 3 and 4 before you call either done.**

## 2. The drone: Chief is seeing unstarted work, not regressions

Chief: *"lvl 3 drone still shoots through the ground and teleports back to original spawn location."*

**Both are correct and neither is a regression.** Verified in `entities.js`:
- `visionY: 340` unchanged, and the sight check at **line 520-521 is a plain box test with no `tileAt`
  sampling** — there is no line-of-sight code at all, so it sees through floors exactly as reported.
- There is a `_deaggroT` tell and no return-to-patrol movement anywhere, so de-aggro still snaps home.

These are **O10 and O12 from ORCHA 15**, ordered and not yet built. You sequenced them after the fork, which
was correct. Chief is simply testing ahead of the queue. Nothing to diagnose — build them.

**They are now higher priority than they were, because Level 4 also has a drone** (*"A drone patrols the
traversal stretch"*). Build the behaviour once, correctly, and both levels inherit it. Do not place a drone in
Level 4 before O10-O12 are done or you will tune the same enemy twice.

## 3. Level 3 is not almost done. Chief believes it is.

He said *"we are almost done with 3."* It plays, so that is a fair impression from the outside. The measured
state says otherwise, and he needs the real number to plan against:

```
terrain      : 38 of 100 cols built — 62% void past the ground
exit gate    : sits BEHIND the player spawn
checkpoints  : 0
drone        : placed, but its behaviour (O10, O11, O12) is unbuilt
```

Level 3's entire teaching goal is *getting hit scatters your charge, go reclaim it*. With the drone unable to
reliably see or chase the player, **the level cannot teach its lesson yet.** This is the largest single piece
of work on the board — larger than Level 4, which at least starts from a clean sheet.

I am telling Chief this directly. Do not soften it in your report either.

## 4. Order of work

| # | Task | Why here |
|---|---|---|
| 1 | **Chest pocket seal + reachability proof** (§1) | Smallest fix, and Chief has a live bug in a level he is playing right now |
| 2 | **Drone O10 + O11 + O12**, one coherent piece | Blocks both Level 3 and Level 4; build once |
| 3 | **Level 3 finished** — terrain, exit ahead of spawn, checkpoints, drone patrol at player elevation | The 62% void is the biggest gap in the game |
| 4 | **Level 4 — CARRY CURRENT** | New content, needs the drone from step 2 |
| 5 | Pip meter pulse (ORCHA 17) | Unchanged, still last |

**Level 5 is cut.** Do not start it. Do not add Levels 4 or 5 to `levels.json` until Chief has played them —
that rule stands and is what made Level 3 a published stub.

### Level 4 spec, from Chief's breakdown
- Generators **clustered at one end**, exit at the **far end**, nothing to recharge in between.
- A drone patrols the traversal stretch.
- **Total generator charge must EXCEED the exit cost.** The breakdown is explicit that an exact-solution
  level with an enemy is an unfair softlock. This is also your own `enemies.length > 0` margin guard — it
  applies here by design, not as an edge case.
- Exit cost **8**, per the standing override that supersedes the breakdown's 6.
- Checkpoints required. A hit mid-carry must mean *go back and refill*, not *restart the level*.

## 5. Reporting
Suites green, boot smoke on a fresh port, and **merge to `agent/orcha-gameplay`** — state the branch and SHA
so Chief knows what he is loading. The chest fix is worth its own commit and push the moment it is green;
do not hold it behind the drone work. Chief is playing Level 2 now.

— Kiro, Technical Director
