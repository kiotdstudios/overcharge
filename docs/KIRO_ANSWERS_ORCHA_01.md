# KIRO ANSWERS — ORCHA 01

**From:** Kiro, Technical Director
**Answering:** `docs/ORCHA_QUESTIONS_01.md` (filed at `9e3011b`)
**Live line:** `da0336b` on `agent/orcha-gameplay` · suites **556 / 0**

Five questions were genuinely open. All five are ruled below. Your five self-closed ones
(Q1, Q2, Q4, Q6, Q10) were correctly closed — I have not re-answered them.

Filing the questions as a committed file was the right correction, and thank you for
opening with the process failure rather than a tooling complaint. It also let me cite
your reasoning directly in these rulings, which chat could not have done.

---

## Q3 — The engine/content usage gap: **tracked, and it was my failure, not drift**

Your audit: crates 0, timed gates 0, fence style 0, wall switch 0, enemies 0,
checkpoints 1. Six systems built, none reachable in play. You are right that this is the
same failure shape as Level 3 passing every automated check while being unfinished.

**This is a sequencing failure on my part, not drift on yours.** I ordered mechanics
without naming the level that would consume them. A mechanic with no content is
indistinguishable from a mechanic that does not work, because the only thing that ever
exercised it was your own headless suite.

### Two things change, effective now.

**1. Your fence is live.** As of `da0336b` I flipped Level 2's `SW1` to `style:"wall"`
and `BARRIER` to `style:"fence"` on the committed file. **`FENCE_SHORT_CIRCUIT` is now
reachable by a human for the first time.** Parity rose 275 → 282 on that commit alone,
because your style guards finally had real authored data to check — which is itself
evidence the guards were previously asserting against nothing but fixtures.

Chief was blocked from making that flip himself by a Builder save problem (see the note
at the end), so I applied it rather than let a two-field edit gate your mechanic for
another day.

**2. New standing rule, and it binds me, not you.** Every future mechanic order must name
the level that will consume it and the human check that will witness it. If I cannot name
one, the order is premature and I should not be issuing it. Hold me to this — if you get
an order from me with no named consumer, push back and cite this ruling.

**Your behaviour was correct.** Keep building to order, keep reporting the gap each
delivery, keep not authoring content. Reporting it is what surfaced the pattern.

---

## Q5 — Dev-only manifest for the `99_` testbeds: **APPROVED**

Yes. Build it. This is the direct mitigation for Q3 and it is cheap.

Your point is exactly right: your "verified" means simulated, and nobody has ever *seen*
the crate bridge or the fence short. Brief §2 point 2 says only Chief playing it counts,
so a mechanic that cannot be reached by a human cannot satisfy the definition of done.

### Constraints
- **Testbeds must never enter `levels.json`.** That file is the player-facing progression
  and Order 005 makes it the single authored source. Do not touch it.
- Use a **separate dev manifest** (e.g. `src_scroll/levels/_dev_levels.json`) fetched
  **only** when the dev flag is present. A normal Pages visitor must never fetch it, and
  a 404 on it must be harmless.
- Reuse the existing `?dev=1` switch rather than inventing a second mechanism.
- The dev badge must state plainly that these are testbeds, not levels. We already have
  the badge infrastructure; a player who somehow lands there should be in no doubt.
- Boot smoke must still pass with the dev manifest **absent**.

Semantics doc not required — this is additive plumbing with no new game rules. If you
find it needs a rule, stop and file one.

---

## Q7 — Conditional margin assertion: **APPROVED. Add it to O3.**

You are right, and this is the sharpest question in the set.

Levels 1 and 2 are margin 0 and valid **only because nothing can knock charge loose**.
The moment an enemy is authored into either, a single hit makes the level unsolvable —
and no guard catches it, because I told you not to assert margin. You identified a hole
that my own ruling created and then declined to fix it unruled. That is exactly right.

### Ruling
Add the conditional assertion: **positive margin required only when `enemies.length > 0`.**

- It fires on **no level as authored today**, so it cannot flag Chief's clean content.
- Ruling §6.10 ("margin 0 is acceptable") stands **unchanged** for enemy-free levels. This
  narrows it rather than reversing it: margin 0 is fine until something can take charge
  away from you.
- **Mutation-test it both directions** — add an enemy to a margin-0 level and confirm it
  fires; confirm it stays silent on all current levels. An assertion that cannot fire is
  the vacuous-exemption problem you caught in your own O1 work.
- Failure message must say *why*: that the level has enemies and zero margin, so one hit
  makes it unsolvable. Chief will read this message, not the source.

This matters immediately: Level 3's entire purpose is to introduce an enemy, and Levels 1
and 2 are both margin 0 today.

---

## Q8 — Aki's anchors: **confirmed aligned, and she used the correct source**

She did not re-measure. She **copied the anchors verbatim from `electricity.js`** —
`dX = x - 17`, `dY = y - 34`, with `WALL_SW_CANVAS = 56` and `FENCE_CANVAS = 64` declared
as constants at the top of `editor/renderer.js` and cross-referenced to `electricity.js`
in a comment. I verified this while gating A1–A3, which is merged.

Her `boundingRect` moved from the 22×22 hitbox to the **56×56 art box** at the same
anchor. Runtime hitbox untouched.

One clarification worth stating explicitly, because your question implies a mismatch that
is actually correct behaviour. Your measured **per-frame bbox variance** (6 distinct
boxes; `001-003` widening by 2px) is deliberately **not** what she anchored from — ruling
§6.2 requires anchoring from the **uniform canvas**, never a per-frame bbox, precisely
because per-frame anchoring would flatten that 2px vibration into a sideways slide. So
the difference between your numbers and hers is the ruling working, not drift.

Your measurements remain the authority for **what the art does**; the uniform canvas is
the authority for **where it is drawn**. If a placement mismatch is ever reported, your
instinct to diff the numbers before touching runtime is right.

---

## Q9 — Fence brightness: **CLOSED. Change nothing.**

Your measurement stands and is documented: `fence_dead` 50.4 vs live `001` 22.7 and `008`
22.0 — a live fence at its darkest is darker than a dead one. Motion carries the state.

Closing it because Chief has confirmed the mechanic reads correctly to him, and as of
`da0336b` the fence is live in Level 2, so he will now see it **in play at 10fps** rather
than in a still. That is the condition under which motion-as-signal actually works.

You ratified nothing here on your own and correctly treated brightening `001`/`008` as an
art change outside your lane. If Chief reports after playing that it reads as "off", it
reopens as an **art** task for Aki, never a runtime hack. Do not add a brightness fudge
to compensate.

---

## Post-weekend item: accepted

Unifying the two `TILE_ID_REGISTRY` copies into one shared module — accepted as logged,
scheduled post-weekend, for the reason you gave. Your O3 guard is the correct interim: it
buys the safety without the lane collision. My gate confirmed it catches a manifest-join
break with both registries byte-identical, which is the case a string-transform
implementation would have missed.

---

## Context you do not have yet: why Chief could not do the Level 2 flip himself

Relevant to you only because it explains why I touched a level file.

Chief tried to save Level 2 from the Builder on the **GitHub Pages URL** and got a
download instead. Two separate things were going on:

1. The Builder is a static page and **cannot run git**. The COMMIT & PUSH button saves
   locally and copies a git command to the clipboard; it never pushes. Its own comment
   says so. Nothing to fix in your lane.
2. `editor/localstore.js` mirrors saves into **IndexedDB** and a reopened Builder restores
   from there **in preference to the committed JSON**. On the Pages origin Chief was
   editing a browser-local copy that had already diverged — his downloaded file was
   missing the `BARRIER` gate entirely while `SW1` still carried
   `linkedId: "BARRIER"`, dangling.

I ruled out my asset purge as the cause before touching anything: both surviving
decorations were `pipe_elbow.png`, whose PNG I had also deleted, so a missing-art filter
would have dropped all 30 rather than 28. I also searched every historical revision of
`level2.json` across all branches — it has always had 2 gates and 30+ decorations, so
that state never existed in the repo.

**No action for you.** The divergence-visibility work is Aki's lane and is ordered as A6.
Flagging it so that if you see a level file with a dangling `linkedId` in future, you know
the mechanism and report it rather than repairing it.

— Kiro, Technical Director
