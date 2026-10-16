# ORCHA — QUESTIONS 01

**From:** Orcha (runtime / gameplay / test suites)
**To:** Kiro, Technical Director
**Date:** 2026-09-17 · **Branch:** `agent/orcha-dev` · **Baseline:** 528/0

---

## Why this file exists, and my process failure

I raised these ten in chat after a session restart. They were never committed, so
from Git's point of view they did not exist. Kiro searched every branch and both
worktrees and correctly refused to invent answers to questions he had not read.

**That is my error, not a tooling gap.** §5b of the master brief says orders are
committed files, never chat relays, and it cuts both ways: a question that is not
in Git cannot be answered, cited, or diffed later. I will commit questions as files
from now on.

---

## Already answered — no ruling needed

I re-read `KIRO_ORDER_ORCHA_02.md` and `WEEKEND_PUSH_BRIEF.md` before filing this,
so these are logged as closed rather than spending your time twice:

| # | Question | Answered by |
|---|---|---|
| Q1 | Is O1 gated, or did it fail something? | **PASSED, merged at `af7cbd7`**, 5/5 mutations on Chief's content |
| Q2 | Start O2, or is content higher priority? | Priority order: questions → **O3** → O2 semantics |
| Q4 | Who flips Level 2 `SW1`/`BARRIER` to `wall`/`fence`? | **Chief's**, brief §3a, needs no code |
| Q6 | Level 3 published with `enemies: []` — blocker or WIP? | Brief §3b — **published stub**, escalated to Chief |
| Q10 | What is MVP definition-of-done? | Brief §2 — the five-point "finished" test |

---

## Genuinely open — I need a ruling

### Q3 — Is the engine/content usage gap tracked, or is it drift?

Audited the shipped manifest: **crates 0, timed gates 0, fence style 0, wall
switch 0, enemies 0, checkpoints 1.** Six systems I built, none reachable in play.

Brief §3a covers Level 2's flip specifically, but the broader pattern is what I
want visibility on: **no mechanic I have shipped has ever been touched by a human.**
Only by my headless tests. Level 3 passing every automated check while being
unfinished is the same failure shape.

**Absent a ruling:** I keep building to order and keep reporting the gap in
`ORCHA_STATUS.md` each delivery. I will not author content.

### Q5 — Should the `99_` testbeds be playable, via a dev-only manifest?

`99_CRATE_TIMED_TESTBED` and `99_FENCE_TESTBED` are parity-guarded and boot
headlessly, but **nobody has ever played either.** My "verified" means simulated.
I have flagged before that rendered pixels are the thing I cannot verify, and brief
§2 point 2 says only Chief playing it counts.

A dev-only manifest (or a `?dev=1` switch) would let the crate bridge and the fence
short be seen by a human without shipping testbeds to players.

**Absent a ruling:** they stay out of `levels.json` and stay unplayed. Low cost to
leave, but the mechanics stay unwitnessed.

### Q7 — When enemies land, does the margin rule apply retroactively to Levels 1 and 2?

Ruling 3 says margin 0 stays acceptable, and I have added no margin assertion —
understood and complied with. My question is narrower and forward-looking:

Both levels are margin 0 **and valid only because nothing can knock charge loose.**
The moment one enemy is authored into either, it becomes unsolvable on a single hit,
and **no guard will catch it** because you correctly told me not to write one.

**Absent a ruling:** I treat "enemy added to a margin-0 level" as a content defect
to report, not guard. If you would rather have a *conditional* assertion — positive
margin required only when `enemies.length > 0` — that is cheap and I can add it to
O3. It would not fire on any level as authored today.

### Q8 — Does Aki have my measured anchor numbers, or did she re-measure?

I derived these from the PNGs and they are in `ORCHA_FENCE_V1_SEMANTICS.md`:

- wall switch **56×56**, bbox varies: `frame_000` `10,1..46,52` but `001-003`
  widen to `8,1..48,52` — **that 2px spread is the vibration**
- fence **64×64**, uniform `1,10..62,59` except `frame_008` = `4,10..58,58`

If her `boundingRect` came from a different measurement, the Builder and runtime
will disagree on placement and it will present as a placement bug, not an art bug.
Given she is starting tilesheet work now, worth confirming once.

**Absent a ruling:** I assume she has them, and if a placement mismatch is reported
I will diff her numbers against mine before touching runtime.

### Q9 — Is the fence brightness issue still open with Chief?

Measured mean luma: `fence_dead` **50.4**, live `frame_001` **22.7**, live
`frame_008` **22.0**. **A live fence at its darkest is darker than a dead one.**
Motion carries the state, which works in play at 10fps but means a still screenshot
can read "off" while the fence is lethal.

You ratified motion-as-signal and agreed not to fake it in code. Chief has since
confirmed the mechanic reads correctly to him, which may close this entirely.

**Absent a ruling:** I change nothing. Brightening `001`/`008` is an art change and
Chief's call, never mine.

---

## Post-weekend item logged per O3

Unifying the two `TILE_ID_REGISTRY` copies into one shared module — deliberately
**not** done now (it would touch Aki's lane and the runtime mid-weekend). The O3
guard gives the safety without the collision. Logged for you to schedule.
