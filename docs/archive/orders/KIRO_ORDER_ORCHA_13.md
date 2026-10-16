# KIRO ORDER — ORCHA 13

**From:** Kiro, Technical Director
**Subject:** BUILD LEVELS 3, 4 and 5. This is a deliberate, Chief-authorised exception to the content rule.

---

## 1. My handoff was wrong. Chief asked for these levels to be built.

`KIRO_HANDOFF_MASTER.md` says *"Content is Chief's. Report content defects; never silently fix them."*
That is the standing rule — **and Chief had already overridden it before I wrote it:**

> *"using this as law for the first 5 levels **build them using the tiles available**; i'll go in and make
> granualar edits to them"*

So you have been correctly declining work he asked for, because I preserved a rule he had lifted. That is
my error. **You are now authorised and directed to build Levels 3, 4 and 5.**

The override is **scoped**: build the levels from his written law, mechanically sound and completable.
**He refines feel, difficulty, and layout afterwards.** You are producing a correct, playable skeleton —
not a finished design. Do not editorialise beyond the spec.

`docs/OVERCHARGE_LEVEL_BREAKDOWN.md` is the law. It is on the live line. Read the **RECORDED OVERRIDES**
section at the bottom; it changes three things the spec text still states incorrectly.

---

## 2. Hard constraints — these are not preferences

1. **Every exit gate `required: 8`.** Chief's ruling supersedes the spec's "6" in Levels 2, 3 and 4.
2. **Levels 3 and 4 have enemies, so both REQUIRE positive margin.** Margin 0 plus an enemy is a
   softlock — one hit scatters charge and the level becomes unsolvable. Your own Q7 conditional guard
   enforces this; do not fight it.
3. **Terrain must extend under and beyond all content.** This is the Level 3 defect: terrain stopped at
   x=1184 while objects sat out to x=672 and 62% of the level was void. **Run your O4 completability
   proof on each level before you deliver it.** If O4 is not built yet, build it first — it is the tool
   that makes this order verifiable.
4. **Every object grid-aligned on X, grounded on Y.** Never assert `y % 32`; Y grounds to the surface.
5. **Level 5 MUST have a checkpoint.** The spec is explicit: a wrongly-pushed crate is otherwise
   unrecoverable, there is no reset-crate button in v1.
6. **Spawn must not sit inside a closed gate's blocking column.** `blocksHorizontal()` ignores Y
   deliberately, so a gate seals floor-to-ceiling and pins the player. Chief lost a session to this. The
   guard exists — keep it green.
7. **Use only the 12 tiles currently in the palette.** IDs 10–13 (purple_city) and 16–23 (purple_rooftop).
   Do not add tiles. Do not use 14/15 — removed.
8. **No level gets both enemies AND crates.** The spec's own note; keep it for v1.

---

## 3. Level 3 — DON'T GET HIT (finish the existing stub)

It exists and is published. **Chief has already placed `drone_1`** at x=512, y=200, patrol 400–600. Keep
his drone. Fix the level around it.

Per spec: two generators, drone patrolling a corridor the player must cross, getting hit scatters charge
onto **open floor nearby — not into a pit**, so recovery is obvious.

What is currently wrong and must be resolved:
- Terrain stops at x=1184; content and the crossing need continuous floor.
- **Exit gate is at x=32, behind the spawn at x=64.** Move it to the far end — the spec describes a
  crossing, which requires the exit past the corridor.
- **Zero checkpoints.** The spec's recovery lesson needs one.
- Name is still "LEVEL 3"; the spec calls it **DON'T GET HIT**.
- Sources are 5+5+5=15 against exit 8. With an enemy present you need positive margin — you have it, but
  confirm after any change.

**Note for Chief, not for you to fix:** his drone at y=200 sits 282px above the ground line, outside its
220px vision. ORCHA 12 decouples the vision axes. Build the corridor so the drone can actually threaten
the crossing once that lands.

## 4. Level 4 — CARRY CURRENT (new)

Generators clustered at one end, exit at the far end, **nothing in between to recharge**. A drone patrols
the traversal stretch. The player physically carries charge across.

- **Surplus is mandatory**, per both the spec and constraint 2. Generator total must exceed 8 with room
  for one hit's loss.
- The carry stretch must be long enough that a hit mid-carry means going back — that is the lesson.
- Scattered charge must land recoverable, not in a pit.

## 5. Level 5 — POWER AND POSITION (new)

A switch the player **cannot reach directly**. A conductive crate nearby, pushed into contact with the
switch to complete the circuit from a distance. The switch opens a route back to something **earlier** in
the level. Exit last.

- The crate system is **built and merged** (`CRATE_TIMED`) — this is not blocked.
- **Checkpoint required** (constraint 5).
- The backtrack after opening the switch is the intended "aha". Do not shortcut it.
- Verify the switch is genuinely unreachable without the crate, and genuinely reachable with it. Assert
  both — that is the whole puzzle and a spatial bug here is invisible to every existing guard.

---

## 6. Delivery
- One commit per level, **push when green**. Do not batch three levels into one commit.
- Do **not** add them to `levels.json` until Chief has played each one. Build them, publish the files,
  tell him which to load with `?level=N`. He decides what ships.
- Report per level: completability, margin, and the O4 output. State plainly that **feel and difficulty
  are unverified** — that is Chief's, and no simulation of yours can answer it.

## 7. Aki is not idle on this
She has A12 (drone patrol range must move with the drone), A14 (unidentified placeholder boxes), A13
(drone into the asset bank). A12 matters to you: until it lands, **Chief moving a drone leaves its patrol
range behind**, so verify patrol values in the JSON rather than trusting the Builder view.

— Kiro, Technical Director
