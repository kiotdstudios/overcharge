# KIRO ORDER — AKI 12 — TILE GRAMMAR IN THE BUILDER

**From:** Kiro, Technical Director
**Chief:** *"env tile dark a is a regular ground tile, it cant be the top tile; top tile has purple edge
(env tile purple a or b) those top edge tiles need to be present when using a dark tile — check how lvl 1
looks vs what aki made on lvl 4"*

---

## 1. The rule, with the tile IDs

Purple City tileset, from `src_scroll/render.js:9-13`:

| ID | Name | Role |
|---|---|---|
| 10 | `tile_dark_a` | **FILL ONLY** — the regular ground tile |
| 11 | `tile_dark_b` | **FILL ONLY** |
| 12 | `tile_purple_a` | **TOP EDGE** |
| 13 | `tile_purple_b` | **TOP EDGE** |

> **A TOP tile — a solid tile with no solid tile directly above it — must be 12 or 13.**
> 10 and 11 are fill. They may sit anywhere *except* the top of a column.

Purple Rooftop follows the same shape: 16/17/18 are mid fill, 19/20/21 are the purple edges.

**Not part of the rule:** an edge tile with solid rock above it is fine. Level 1 has 31 of those and Level 3
has 10. I wrote an assertion forbidding it, watched it fail on Chief's own reference level, and deleted it.

## 2. Level 1 versus Level 4 — measured

```
level1  "NEON RISE"        10:dark_a=260  12:purple_a=82  13:purple_b=10  11:dark_b=1
                           top tiles 61/61 carry a purple edge          100%

level3  "DON'T GET HIT"    12:purple_a=70  10:dark_a=25  13:purple_b=14  11:dark_b=5
                           top tiles 74/74 carry a purple edge          100%

level4  "CARRY CURRENT"    1:legacy_solid=481
                           top tiles 0/67                                 0%

level2  "SPLIT DECISION"   1:legacy_solid=771  10:dark_a=19
                           top tiles 0/102                                0%
```

**The gap is bigger than missing edges.** Level 4 is built **entirely from tile ID 1**, the legacy generic
solid. It uses the Purple City tileset **not at all** — 481 tiles, every one of them id 1. There is no purple
edge variant for id 1, so the rule cannot be satisfied without retiling the level.

That is the visual difference Chief is seeing. Levels 1 and 3 are painted with the tileset; Level 4 is
painted with the old placeholder solid.

Level 2 has the same problem at 771 tiles, and it predates Level 4 — so this is **not** something Aki
introduced. It is the default that has been sitting in the Builder the whole time.

## 3. The actual root cause to fix
Find out **why the Builder paints id 1.** Most likely the default brush, the palette's first entry, or the
tile the generator emits. That default is why a level gets built entirely from a placeholder without anyone
choosing it. Fix the default and this stops recurring; fix only the levels and it happens again on Level 5.

Report what you find — I want the cause in writing, not just corrected levels.

## 4. Required — Builder behaviour

**4a. Auto-promote on paint.** When a painted fill tile becomes the top of a column, the Builder converts it
to a purple edge automatically. When a tile is painted directly above an existing edge tile, that edge
becomes fill. Chief should never have to think about this — he paints shapes, the grammar maintains itself.
Pick between 12 and 13 deterministically from position (`render.js:50` already has a position hash for
exactly this kind of stable variation) so the result does not change every repaint.

**4b. A visible check.** A panel count of grammar violations with a **FIX ALL** button, so an imported or
legacy level can be corrected in one action rather than tile by tile.

**4c. Do not silently rewrite on load.** Opening a level must not mutate it. Chief opens levels to look at
them, and a load-time rewrite would mark every level dirty and put his files at risk. Flag on load, change
on his click.

## 5. Already done — the backstop exists
`_dev/tile_grammar.mjs` is committed and asserts this per level. It currently reports **5 passed, 4 failed**,
the failures being Levels 2 and 4. Run it before pushing:

```
node _dev/tile_grammar.mjs                 # all manifest levels
node _dev/tile_grammar.mjs --only level4.json
```

It also pins Level 1 at 61/61 so the reference cannot silently drift.

## 6. Retiling the levels is Chief's call, not yours
Levels 2 and 4 need their solid tiles replaced with the Purple City set. **That is 771 and 481 tiles of
Chief's level data** and it falls under `KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`. Build the FIX ALL button,
show him the counts, and let him press it. Do not retile his levels on your own initiative.

— Kiro, Technical Director
