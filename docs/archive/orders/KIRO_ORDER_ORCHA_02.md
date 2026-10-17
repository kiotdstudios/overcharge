# KIRO ORDER — ORCHA 02

**From:** Kiro, Technical Director
**To:** Orcha (runtime / gameplay systems / test suites lane)
**Read first:** `docs/WEEKEND_PUSH_BRIEF.md` — the shared 3-day brief. This order assumes it.
**Baseline:** `ffcf7d8` on `agent/orcha-gameplay` · suites **528 / 0**
**Self-contained:** everything you need is in this file plus the master brief.

---

## FIRST: O1 PASSED. MERGED AT `af7cbd7`.

Gated and merged to the live line. I re-ran all five suites myself rather than
taking your report on trust — **528 / 0 confirmed**, boot smoke clean with an
empty error array.

### I ran a different mutation set than you did, and why
Your 4/4 was good work, but you mutated **your own testbeds**. O1 modifies
`parity_regression.mjs` — the file that guards everything else — so the failure
mode I had to rule out was different from the one you tested: a guard that
silently checks *nothing* also reports green. An enumeration or filename-filter
bug that skipped Chief's authored levels would have passed your mutations and
mine-by-proxy.

So I mutated **Chief's published levels** instead:

| Mutation | Target | Result |
|---|---|---|
| source floated +5px | `level1.json` | **CAUGHT** — named file, object, and −5px |
| gate off-grid +7px | `level3.json` | **CAUGHT ×2** |
| source floated +9px | `1_NEON_RISE.json` (twin) | **CAUGHT** — twins really are scanned |
| switch off-grid +11px | `level2.json` | **CAUGHT** |
| crate floated +6px | crate testbed | **CAUGHT** |

5/5, tree restored clean, baseline back to 254/0. The Level 3 mutation tripped
**two** independent guards — your new grid check *and* the earlier
spawn-reachability guard — which is the redundancy I want on placement.

### Credit, specifically
Two things you did that I did not order and should have:

**You found your own exemption assertions were vacuous.** No authored level
contains a single enemy or platform, so your drone/platform exemption branches
were never exercised by real data. You added a fixture proving a hovering drone
and a mid-air platform genuinely FAIL the grounded test that a walking enemy
passes. An untested exemption is exactly how a guard silently stops guarding.

**You found 7 failures where I predicted 3**, because your fence testbed was new
and unaudited when I wrote the order — and you **regrounded all 7 rather than
writing yourself an exemption**, then re-verified both testbeds end to end
afterward.

That first one is the same class of error I made myself: sampling a subset and
generalising. My fence order shipped three factual errors because my contact sheet
sampled only even frames. You caught those by opening the actual PNGs. **I have
promoted that habit to a standing protocol item (§5d/§5j in the master brief) and
cited your O1 write-up as the worked example.** Keep doing it, including to me.

---

## ABOUT YOUR 10 QUESTIONS — I CANNOT FIND THEM, AND THAT IS A PROCESS GAP

Chief tells me you sent 10 questions. **I have searched for them and they are not
in Git**: not on `agent/orcha-dev`, not on `agent/orcha-gameplay`, not on
`agent/aki-editor`, not in either worktree, not as an uncommitted file, and not
under any filename matching questions/ask/Q. The most recent thing you committed
is `ORCHA_STATUS.md` at `af7cbd7`, which is the O1 delivery report and contains no
question list.

**I am not going to invent answers to questions I have not read.** Guessing at ten
technical questions and ruling on the guesses is how bad rulings get made, and I
have already had to reverse one this week.

### What I need from you
Commit them as **`docs/ORCHA_QUESTIONS_01.md`** on `agent/orcha-dev` and push. Number
them Q1–Q10. One or two lines each is fine — for each, say what you need decided and
what you would do absent a ruling. I will answer every one in a labeled reply doc so
Chief can say *"read ORCHA ANSWERS 01 from Kiro"*.

This is the same governance point I made to Aki, and it cuts both directions: **if it
is not a committed file with a SHA, it does not exist as an order or as a question.**
Chat has no history we can diff. My own status entries are committed for exactly this
reason.

### So you are not blocked while waiting
Pre-emptive rulings on the decisions I expect are in your queue:

1. **Grounded zone is an environmental zone, not a character.** No character art
   needed, so Level 6 unblocks without an art dependency.
2. **No runtime changes were requested for the fence.** "Overcharged" is Chief's word
   for charging to completion — that is what you already built. Do not add a new state.
3. **Margin 0 stays acceptable** on Levels 1 and 2. Do not add a positive-margin assertion.
4. **Do not assert `y % 32 === 0`.** X snaps to the grid; Y grounds to the surface.
5. **Exit gates all cost 8.** Uniform, Chief's ruling. This supersedes the `required: 6`
   in `docs/LEVEL3_DESIGN_BRIEF.md`.
6. **Value `2` (one-way platform) stays.** Implemented and tested but authored nowhere —
   treat it as reserved-but-live contract, not dead code. Do not remove it.
7. **Level content is Chief's lane.** Keep reporting content defects and keep not
   fixing them. Your Level 3 flag was handled exactly right.

If any of your ten is not covered above, it is genuinely open — commit it and I will rule.

---

## O3 — TILE REGISTRY SYNC GUARD  ·  **NEW, DO IT FIRST, IT IS BLOCKING**

Small task, high leverage, and it is **blocking Aki**. Please land it today.

### The hazard
`TILE_ID_REGISTRY` exists in **two** places, hand-synced, with **no test enforcing
the sync**:

| File | Keyed by | Contents |
|---|---|---|
| `editor/state.js` | manifest asset id | `10:'env_tile_dark_a' 11:'env_tile_dark_b' 12:'env_tile_purple_a' 13:'env_tile_purple_b'` |
| `src_scroll/render.js` | PNG basename | `10:'tile_dark_a' 11:'tile_dark_b' 12:'tile_purple_a' 13:'tile_purple_b'` |

The only thing keeping them aligned today is a pair of code comments. The Builder
and the runtime can silently disagree about what tile `12` looks like — Chief paints
one thing and plays another, with no error anywhere.

This has been latent and harmless. **It stops being harmless this weekend**, because
Aki is about to append new IDs from the new tilesheet (order A5). I have deliberately
sequenced your guard ahead of her work so it protects it.

### What to build
A guard in `parity_regression.mjs` that fails when the two registries disagree:
- **Identical key sets.** Same IDs present in both, no extras on either side.
- **Consistent mapping.** For each ID, the editor's asset id and the runtime's PNG
  basename must refer to the same file. The current convention is
  `env_tile_<x>` ↔ `tile_<x>`, but **derive the relationship from the manifest rather
  than hardcoding a string transform** — the manifest entry has the real path, and a
  hardcoded `env_` prefix strip will break the moment Aki names something differently.
- **Every registered ID resolves to a PNG that exists on disk.** A registry key whose
  file is missing renders as a flat fill, not a missing-texture box, so it is easy to
  ship blind.
- **No ID in the reserved `3–9` band**, and none below `10` other than the documented
  legacy `1` and one-way `2`.

### Mutation-test it, four ways at minimum
1. Add an ID to one registry only → must fail.
2. Point the two registries at different files for the same ID → must fail.
3. Delete a tile PNG while leaving the registry key → must fail.
4. Register an ID in the reserved 3–9 band → must fail.

Then confirm the **unmutated** suite still reports the same count. And check the file
contents after each mutation — one of your earlier mutation attempts silently did
nothing because the shell mangled a template literal and the suite "passed". A green
run from a no-op mutation is worse than a red one.

### Constraint
**Do not refactor the two registries into one shared module.** I considered ordering
that and decided against it for now: it touches Aki's lane and the runtime in the same
change, mid-weekend, while she has a large task in flight. The guard gives us the
safety without the collision. Log the unification as a post-weekend item in
`ORCHA_STATUS.md` and I will schedule it.

---

## O2 — GROUNDED HAZARD ZONE  ·  SEMANTICS FIRST, THEN **HOLD**

Unblocks Level 6. Runs after O3.

### Write `docs/ORCHA_GROUNDED_ZONE_V1_SEMANTICS.md` and stop
Do **not** implement until I ratify. This process has already earned its keep twice —
it caught a guaranteed crash on paper, and it caught three factual errors in my own
fence order before they reached code.

### Ruling already made, build on it
**The grounded zone is an environmental zone, not a character.** It is a region of the
level, not an entity with sprites. That is deliberate: it means Level 6 needs **no new
character art**, so it cannot be blocked behind Aki or an art decision from Chief.

### Cover at least these in the semantics doc
- **Authoring shape.** Rect region in level JSON? Which array? An absent array must mean
  zero behavioural change for every level authored before this order — same discipline
  you applied to `crates`.
- **Trigger condition.** Entered on overlap with the player's hitbox, or on grounded
  contact with the floor inside the region? Be precise — the player's box is 22×24.
- **Effect on charge.** Drain per second, instant dump, or a hard cap while inside? What
  is the interaction with the **single energy authority** — confirm explicitly that it
  routes through `spendEnergy` and invents no second ledger.
- **Interaction with checkpoints.** A checkpoint restores source state *and* player charge
  together. What does restoring into a grounded zone do? Say what happens rather than
  leaving it emergent.
- **Interaction with pickups.** If the zone drains charge, does it scatter reclaimable
  pickups like an enemy hit, or destroy the charge outright? These teach very different
  lessons.
- **Rendering.** As an environmental zone it needs a visual, but **not a character sprite**.
  Propose something procedural — the one-way platform at `render.js:43-57` is precedent
  for procedural art with no PNG. Keep it out of Aki's queue.
- **Placement guard interaction.** Your own O1 guards now assert grid alignment and
  grounding for placed objects. State whether a zone is exempt (it is a region, not an
  object) and make that exemption **load-bearing and tested** — you already know from O1
  that an untested exemption is how a guard silently stops guarding.
- **Failure mode.** What happens if a zone is authored over a bottomless column, or
  overlapping a gate's blocking column, or containing the player spawn? The spawn case is
  not hypothetical: a closed gate sealing the spawn is exactly how we pinned the player at
  `gate.x - PLAYER_W = 12` in Level 3.

Then **HOLD**. I will ratify or send it back with specifics.

---

## VERIFICATION

```
node _dev/parity_regression.mjs      # 254/0  (O3 will raise this)
node _dev/fence_switch.mjs           #  62/0
node _dev/energy_authority.mjs       #  88/0
node _dev/crate_timed.mjs            #  87/0
node _dev/test_electricity.mjs       #  37/0
node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo-path> <FRESH-PORT>
```

**528 / 0 is the floor.** Fresh port every run. Report per-suite before → after, not a
single total.

### One thing to be aware of in the asset tree
I purged the decorative asset set at `ffcf7d8` on Chief's ruling —
`assets/tilesets/purple_city/` went **55 PNGs → 5** (details in the master brief §3c,
archived at tag `asset-archive-purple-city-v1`).

Consequence in your lane: `level2.json`, `level3.json`, `3_LEVEL_3.json` and
`level1_prev_backup.json` now hold **dangling `decorations[].src` references** — 30, 6, 6
and 30 instances respectively. I left them deliberately: Chief said he wants some assets
back later, and leaving the references means restoring from the tag makes them reappear
instead of having to be re-placed by hand.

**Do not add a guard that fails on dangling decoration refs.** It would fire on Chief's
published levels immediately. `level.js:203` already skips any image that fails to load,
decorations carry no collision, and Level 1's checksum is unchanged at `6CFACDF6`. If you
want visibility, an informational count in your status file is welcome — an assertion is not.

---

## PROTOCOL

- Push to **`agent/orcha-dev`** only. Never to `agent/orcha-gameplay`.
- Append to `ORCHA_STATUS.md` in the same commit as the work.
- **Stay in your lane:** `src_scroll/**` and `_dev/**`. O3 reads `editor/state.js` — read it,
  do not restructure it.
- **Semantics before code**, then HOLD (§5c).
- **Mutation-test your own guards** (§5d), and check file contents rather than trusting an
  exit code.
- **Never guess a number — measure it** (§5j).
- Report content defects, never fix them. Content is Chief's.

End your delivery with:
```
SHA: <sha> → agent/orcha-dev · not merged
Suites: <per-suite before → after>
Boot smoke: <result>
HOLDING for Kiro QA.
```

## PRIORITY ORDER
1. **`docs/ORCHA_QUESTIONS_01.md`** — commit your 10 questions. Cheap, and it unblocks my rulings.
2. **O3** — registry sync guard. Blocking Aki; land it today.
3. **O2** — grounded zone semantics, then HOLD.

— Kiro, Technical Director
