---
name: overcharge-level-design
description: "Level design craft for OVERCHARGE, derived from what Chief actually approved and rejected. Use when authoring, editing, reviewing, or repairing any level in src_scroll/levels - terrain, tile grammar, generator and exit economy, checkpoints, enemy placement, gated rewards, and forks. Also use before placing an enemy or a chest, or when a level fails completability or tile_grammar."
---

# OVERCHARGE — level design craft

Every rule here comes from a level Chief **played and judged**, not from general game design. Where a rule
exists because something shipped broken, the failure is named. That matters: the reasoning is what transfers
to a new level, not the specific numbers.

**Chief owns level files.** This skill makes you a competent reviewer and repairer of levels, and a good
author when ordered to build one. It does not make level content your decision. Run
`node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs <repo>` before any push.

---

## 1. The reference levels

**Level 1 NEON RISE is the visual standard.** 61/61 top tiles carry a purple edge. When unsure how terrain
should look, open `level1.json` and match it. **Level 3 matches it at 74/74** — those two define correct.

Before changing anything about how a level looks, check your intended rule against Level 1. I once asserted
"a purple edge must never have rock above it," ran it, and it failed on Level 1 with 31 instances. The
reference defines correct; an aesthetic guess does not.

## 2. Tile grammar — assert it, do not eyeball it

Purple City (`src_scroll/render.js:9-13`): **10 `tile_dark_a`** and **11 `tile_dark_b`** are FILL ONLY.
**12 `tile_purple_a`** and **13 `tile_purple_b`** are TOP EDGES. Rooftop: 16/17/18 fill, 19/20/21 edges.

> A **top tile** — solid with no solid directly above — must carry a purple edge.

Run `node _dev/tile_grammar.mjs`. It also pins Level 1 so the reference cannot drift.

**Why Levels 2 and 4 are 0/102 and 0/67:** `state.selectedTile` defaulted to `1`, the legacy generic solid,
so any paint without an explicit selection wrote a placeholder. Whole levels got built from it and nobody
noticed, because ID 1 renders as *something*. Fixed in AKI 12 — but the lesson is that a wrong default
produces confidently wrong output at scale.

## 3. Economy — every level must be completable from ZERO carried charge

```
MAX_CHARGE 10   MAX_BANKED_PIPS 5   all exit gates cost 8 (supersedes the PDF's 6)
```

Charge and pips **do** carry between levels (`main.js:144-151`, `loadLevel(idx, true)`). **Never depend on
it.** Three paths arrive empty: a refresh, a direct link, and returning to the title. A fourth arrives poor:
the branch of a fork that skipped the optional reward.

Chief's reasonable-sounding plan was "get the chest on Level 2 and you're fine for Level 3." Traced: Route A
carried 8, **Route B carried 2 and softlocked Level 3 by exactly one charge.** A legitimate player choice
became a dead end a level later with nothing explaining why.

> Carry-over is a **cushion**, never a **prerequisite**.

`_dev/completability.mjs` models zero carry-over deliberately. It is not being pessimistic; it is modelling
a real player.

**Margin rule:** `margin = total generator charge − total mandatory cost`. Margin 0 is acceptable **only
when the level has no enemies**. With an enemy, a hit scatters charge and margin 0 is a guaranteed softlock
(OVERRIDE 5). Level 1 sits at margin 0 with zero enemies and Chief passed it. Level 3 at margin 0 **with a
drone** is a defect.

## 4. Checkpoints
A level whose failure state costs meaningful progress needs one. Respawn restores energy **as of the last
checkpoint** — so a pip banked after it is lost on death, and charge spent after it is refunded.

Place one after any expensive irreversible purchase. Chief's instinct here was right: *"i just need to add a
checkpoint to lvl 2 after u get the chest."* A level with an enemy and **zero** checkpoints, as Level 3 is
now, makes every mistake cost the whole level.

## 5. Gated rewards — prove unreachability by WALKING, not by geometry

This one took three attempts and every intermediate answer looked right.

1. First the fence blocked X-only, so it sealed **both** branches of a fork floor to ceiling. A gated side
   route was impossible.
2. Made `blockOnly` gates Y-aware. Chief jumped over it — apex is **102.7px** (`JUMP_FORCE -430`,
   `GRAVITY 900`) against a 64px fence.
3. Capped the opening with terrain above. Chief walked the lower route, climbed back up on the **right**,
   and took the chest without ever paying the switch.

> **A gated reward must be unreachable from spawn while the gate is closed, and reachable once it opens.**
> Prove it by walking the level with real physics. A local geometry check cannot answer a reachability
> question.

Any check "near the gate" will pass while the region is open from somewhere else. I wrote a grid flood-fill
to shortcut this and it reported the chest unreachable *with the gate open* — a movement model that is not
the engine lies in both directions. Use the `completability` closure walk.

## 6. Enemy placement is coupled to enemy tuning
A drone's sight box and its position are one design. `visionY 96` on a drone 285px above the player is a
drone that can never see anything — that shipped, and it looked like a broken enemy rather than a
misplacement.

**Line of sight changes the economics of this.** With `_hasLineOfSight` sampling terrain, a wide sight box is
safe, because the floor does the blocking. Narrow boxes were only ever a workaround for seeing through walls.
So prefer generous vision plus real occlusion over tight vision plus careful placement.

`FIRE_ARC` must be **>= visionY**, or the drone alerts, chases and fires nothing in the gap. That mismatch
shipped twice.

If an order changes sensing constants that depend on placement, the placement moves **in the same commit** —
and never revert half of a coupled change.

## 7. Structural checks that have each caught a real defect
- **Exit must not sit behind spawn.** Level 3 shipped with the exit at col 1 and spawn at col 2.
- **Declared width must be backed by terrain.** Level 3 declares 100 columns and builds 38 — the player
  runs off the authored world into void. A level can pass every other check while being unfinished;
  automation cannot detect "unfinished," which is why this assertion exists.
- **Content must not sit past where terrain ends.**
- **Grid:** TILE 32, ROWS 18, no `camY`. X snaps to grid, Y grounds to the surface — **never assert
  `y % 32 === 0`.** Solidity is `v === 1 || v >= 10`, a numeric range, not registry membership.

## 8. Teaching order — what each level is for
1 charge basics · 2 spend to unlock, and a real choice · 3 getting hit scatters charge, go reclaim it ·
4 carry charge across distance under pressure · 5 position as the solution (crates).

A level must be able to **teach its lesson**. Level 3 with an enemy that cannot see the player teaches
nothing. Level 4's surplus over the exit cost is required *because* it is a carry level with an enemy — the
design demands clean execution, not perfection.

Keep the arc honest: **no level should have both enemies and crates in v1.**

## 9. Before calling a level done
```
node _dev/completability.mjs     # completable from zero, exit ahead of spawn, terrain backs the width
node _dev/tile_grammar.mjs       # top tiles carry a purple edge
node _dev/drone_sensing.mjs      # if it has an enemy
node C:\Users\diepowel\Documents\_kiro_tools\level_guard.mjs <repo>
```
Then state plainly what you could **not** verify. Suites cannot judge whether a fork reads at speed, whether
a reward feels worth a detour, or whether a climb is comfortable. Those are Chief's, and every defect that
mattered came from him playing — not from any assertion.
