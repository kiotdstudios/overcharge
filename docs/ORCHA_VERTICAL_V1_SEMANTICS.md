# ORCHA VERTICAL V1 SEMANTICS

**Owner:** Orcha (runtime)
**Ordered by:** Kiro, KIRO_HANDOFF_MASTER.md L182, held pending Chief's ruling
**Status:** AWAITING CHIEF RULING on 6 numbered decisions
**Blocks:** AKI A10 (Builder vertical expansion)

Sequencing is non-negotiable per Kiro: the runtime must accept variable height BEFORE the
Builder can create it, or the Builder writes levels the game cannot load and Chief loses
work to corrupt files.

---

## THE ONE FACT THAT DECIDES THE SIZE OF THIS JOB

**There is no vertical camera. None.** The runtime has `camX` only:

```
main.js:295   ctx.translate(-Math.round(camX), 0);
                                              ^ Y is hardcoded zero
```

`ROWS * TILE` = 576px against a 578px viewport, so a level is **exactly one screen tall**
and always has been. Vertical scrolling has never existed in this game.

That splits A10 into two jobs of very different size, and Chief should know which he is
asking for before Aki starts:

| Ask | Runtime cost | Risk |
|---|---|---|
| Levels SHORTER than 18 rows | ~4 lines. `level.js:53` already treats below-map as void. | Near zero |
| Levels TALLER than 18 rows | Build a vertical camera: follow/clamp, bounds, respawn, parallax Y, and every screen-space vs world-space call site re-checked. | Real. This is the actual blocker. |

A10's `+ ADD ROWS ABOVE / BELOW` implies taller. **So A10 needs the camera, and the
camera is mine, not Aki's.**

---

## MEASURED GROUND TRUTH

**No level declares height.** There is no `rows` field in any of the five. Height is
already derived as `tiles.length / cols`, and all five derive to exactly 18.

**The editor is already per-level.** `editor/state.js` `levelRows()` does that same
derivation. The Builder's data model is ALREADY variable-height; only the runtime uses a
global constant.

**The runtime ROWS surface is 3 lines, not the 18 a grep suggests.** Every other hit in
`electricity.js` is spritesheet rows or fence tiling, unrelated:

```
level.js:17    this.pxH = ROWS * TILE;
level.js:53    if (ty >= ROWS) return 0;
level.js:258   for (let ty = 0; ty < ROWS; ty++)
```

**`player.js` imports ROWS and never uses it.** Dead import, safe to drop.

**`tileRotations` exists on level1, level3, level4 and NOT on level2, level5.** Any
top-insert that shifts tiles and objects but forgets rotations corrupts three of five
levels, and it is invisible until Chief sees it in game.

---

## DECISIONS FOR CHIEF

Each has my recommendation and the measured reason. Overrule freely.

### 1. Is height per-level in the JSON, or does global ROWS just increase for everyone?

**Recommend: PER-LEVEL, derived, no new JSON field.**

It is already the de-facto model: the editor derives it and no level declares it. Making
the runtime derive the same way matches the Builder exactly and needs **zero schema change
and zero level migration**. Raising global ROWS instead forces every level to the same
height and re-opens the 2026-09-12 shift-everything-down exercise.

### 2. When rows are added at the top, does the shift apply to objects, tiles AND tileRotations together?

**Recommend: ALL THREE, atomically, or reject the edit.**

Not a preference. Three of five levels carry `tileRotations`; shifting tiles without them
silently rotates the wrong cells. Kiro flagged the asymmetry as "the whole difficulty" and
he is right: adding at the BOTTOM shifts nothing, adding at the TOP shifts every `y` by
`rows * 32`.

### 3. Does camY follow the player continuously, or snap between vertical screens?

**Recommend: CONTINUOUS follow with a deadzone, clamped to level bounds.**

Continuous matches the existing horizontal feel, since `camX` is a clamped continuous
follow, so vertical will not read as a different game. Snapping is cheaper to write but
every snap hides the ground you are falling toward, which is hostile in a game with fall
damage and precise gate charging. Deadzone so small hops do not pan the screen.

**This is the question with real cost attached. Answer it and I can scope the camera.**

### 4. What happens when a level is SHORTER than the viewport, letterbox or clamp?

**Recommend: CLAMP, which is the current free behaviour.**

`level.js:53` already returns void below the map, so a short level works today with the
camera pinned at `y=0`. Letterboxing means new UI chrome and a second render path for no
gameplay gain.

### 5. Do the five existing levels get migrated, or stay at 18 rows via a default?

**Recommend: NO MIGRATION.** If height is derived per decision 1, all five already derive
to 18 and keep working untouched. Migration risk is zero because there is no migration.

### 6. What is the maximum height?

**Recommend: a hard cap. I suggest 54 rows (3 screens, 1728px).**

Kiro's concern is correct that unbounded lets Chief author a level nobody can navigate. I
would rather ship a cap we raise on request than discover the ceiling through a broken
level. **54 is a guess at what plays well, not a measurement, and I would rather Chief
pick the number.**

---

## WHAT I WILL DO ONCE RULED

1. Derive rows per-level in the runtime, drop the dead `player.js` import, and add parity
   guards asserting a non-18-row level loads, collides and renders correctly. Cheap.
2. Build the vertical camera to the decision-3 shape, with deadzone and clamp under test,
   plus respawn and parallax-Y correctness.
3. Only then does A10 unblock, per Kiro's sequencing.

**I will not start the camera before decision 3 is ruled.** Kiro's instruction was that
this needs a ratified plan rather than an implementation sprint, and guessing the camera
feel then rebuilding it is exactly the waste he was guarding against.

---

## HONEST NOTE ON WHY THIS IS LATE

This doc was ordered as O8 and parked on HOLD for Chief's ruling. Kiro then went on
vacation and I did not resurface it, so the hold outlived its reason and A10 sat blocked
on a document nobody was writing. Chief had to ask whether I was tracking it. That is a
tracking failure on my side, not a technical blocker.