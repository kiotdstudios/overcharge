# WEEKEND PUSH — MASTER BRIEF (3 DAYS)

**Issued by:** Kiro, Technical Director
**Audience:** Chief, Aki, Orcha — **everyone reads this file first, then their own order.**
**Baseline at issue:** `ffcf7d8` on `agent/orcha-gameplay` (the live / GitHub Pages line)
**Suites at issue:** parity 254/0 · fence_switch 62/0 · energy_authority 88/0 · crate_timed 87/0 · test_electricity 37/0 = **528 / 0**

Chief has given us three days to put a major completion dent in OVERCHARGE. This
file is the shared picture: what the game is, where it actually stands, what
"done" means by Sunday night, who owns what, and the protocol nobody gets to skip.

Read it once end to end. It is long because guessing is more expensive than reading.

---

## 1. WHAT WE ARE BUILDING

OVERCHARGE is a **vanilla JS / HTML5 puzzle-platformer**. No framework, no build
step, no bundler. It ships as static files on GitHub Pages.

**There is exactly ONE delivery surface. Two URLs, one pair:**

| | URL |
|---|---|
| Game | `https://kiotdstudios.github.io/overcharge/index.html` |
| Builder | `https://kiotdstudios.github.io/overcharge/editor.html` |

Never hand Chief a third URL, a local path, or a branch preview. If work is not
reachable from that pair, it does not exist yet.

### The core loop
The player is an electrical entity that **carries a charge budget**. Charge is
absorbed from generators, spent to open gates, and lost when hit. Every level is
an energy-routing puzzle: *is there enough charge, and did you spend it in the
right order?*

### The controls, and why they are what they are
| Key | Action |
|---|---|
| `SPACE` | **charge** (hold — the primary verb) |
| `K` | attack |
| `E` | absorb |
| `F` | unbound / reserved |

`SPACE` is charging, not jumping. That was a deliberate ruling (ORDER
`SPACE_CHARGE`): charging is the verb the player performs most, so it gets the
biggest key.

### The energy authority rule
There is **one** energy authority and **one** spend path. Every cost flows through
`spendEnergy`. No device may invent its own accounting, cache a balance, or
short-circuit the ledger. This is why `energy_authority.mjs` exists as its own
88-assertion suite. If your feature needs to charge the player, you call the
authority. No exceptions, and no "just this once".

### Devices that exist and work today
- **Generator / source** — absorbable charge.
- **Gate** — costs charge to open. Blocks **floor-to-ceiling**; `blocksHorizontal()`
  deliberately ignores Y so the player cannot jump over. A closed gate seals a
  horizontal region of the level. Exit gates all cost **8** (Chief's ruling: uniform).
- **Gate dormancy** — a spent gate settles into a dead state rather than re-arming.
- **Checkpoint** — snapshot/restore of source state *and* player charge together.
- **Timed crate** (`CRATE_TIMED`) — bridges a gap, expires.
- **Wall switch + electric fence** (`FENCE_SHORT_CIRCUIT`) — charge the switch to
  short the fence and open a path. **Built and merged, not yet used in a level.**

### Levels
| # | Name | State |
|---|---|---|
| 1 | NEON RISE | Complete. **Never human-playtested** since the economy, grounding and art changes. |
| 2 | SPLIT DECISION | Built, but the fence puzzle is **not switched on** (see §3). |
| 3 | "LEVEL 3" | **Unfinished stub.** See §3 — this is the biggest content hole. |
| 4–5 | — | Briefed in `docs/LEVEL4_5_DESIGN_BRIEF.md`, not started. |
| 6 | — | Blocked on the grounded-hazard zone (Orcha O2). |

---

## 2. THE THREE-DAY GOAL

> **By Sunday night: Levels 1, 2 and 3 are genuinely finished and human-playtested,
> the new tilesheet is usable in the Builder, and Levels 4–6 are unblocked.**

"Finished" is not "boots without errors". A level is finished when:
1. It is in `levels.json` and loads on the Pages link.
2. It is completable, and **Chief has personally played it start to finish.**
3. It teaches the thing it exists to teach.
4. Its placement passes the guards (grid-aligned on X, grounded on Y).
5. It has a name that is not a placeholder.

Point 2 is the one automation cannot do, and point 3 is the one automation cannot
even detect. Level 3 currently passes every automated check we have and is still
not a real level. Keep that in mind before trusting a green run.

### The critical path runs through Aki
Chief cannot build levels with the new tilesheet until the sheet is sliced,
registered and visible in the Builder palette. **Everything Chief wants to do this
weekend is downstream of Aki's Day 1 work.** Aki: your tilesheet task is the
highest-priority item on the whole board. Orcha's work is parallel and does not
block Chief.

---

## 3. WHAT IS ACTUALLY BROKEN OR PENDING RIGHT NOW

### 3a. Level 2's fence puzzle is built but switched off
The runtime fully supports it. The level does not use it yet. Flipping two fields
turns it on:
- `SW1` → add `"style": "wall"`
- `BARRIER` → add `"style": "fence"`

Save, play. **This is Chief's, and it needs no code from anyone.** It changes no
costs, so the level's energy margin is unaffected.

### 3b. Level 3 is a published stub — worse than it looks
Audited in full. It is in the manifest, so anyone finishing SPLIT DECISION lands in it.

```
world:      3200px (100 cols)
terrain:    stops at x=1184 — columns 38-99 are COMPLETELY EMPTY (62% void)
content:    rightmost object at x=672
enemies:    0          checkpoints: 0
spawn:      x=64       exit gate: x=32   <-- the exit is BEHIND the spawn
name:       "LEVEL 3"  (the brief calls for "DON'T GET HIT")
```

It **is** completable — 15 charge available against 8 required; you spawn, collect
to the right, walk back left, and exit. That is exactly why nothing caught it.
Completability passes. The new placement guards pass. Nothing is *broken*. The
level is **unfinished**, and no assertion can express that.

Per `docs/LEVEL3_DESIGN_BRIEF.md` its whole teaching goal is *getting hit scatters
your charge, go reclaim it*. With no enemy there is nothing to be hit by, so it
cannot teach the one thing it exists for.

Almost certainly a casualty of the player-freeze bug: Chief started authoring near
that x=32 gate, hit the freeze, reported it, and the session never resumed. **The
freeze is fixed.** The level was never picked back up.

### 3c. The decorative asset set is gone as of `ffcf7d8`
Chief's ruling: *"whats currently being used on level one can stay the rest got to go."*

Executed. `assets/tilesets/purple_city/` went from **55 PNGs to 5**:

```
KEEP  tiles/tile_dark_a.png      (tile id 10, default art)
KEEP  tiles/tile_dark_b.png      (tile id 11)
KEEP  tiles/tile_purple_a.png    (tile id 12)
KEEP  tiles/tile_purple_b.png    (tile id 13)
KEEP  props/env_waste_platform_long.png   (6 instances in Level 1)
```

All three manifests pruned together — `ASSET_MANIFEST.json` 52→7,
`PURPLE_CITY_INDEX.json` 50→5, `asset_index.json` 213→163. Pruning fewer than all
three does not work: the disk-index is merged in as a fallback and silently
resurrects anything still listed.

**Nothing is lost.** Archived two ways:
- Git tag **`asset-archive-purple-city-v1`** — authoritative. Restore with:
  `git checkout asset-archive-purple-city-v1 -- assets/tilesets/purple_city assets/ASSET_MANIFEST.json assets/PURPLE_CITY_INDEX.json assets/asset_index.json`
- Browsable copy outside the repo at `_kiro_archive/purple_city_v1/`, including
  `.prepurge` snapshots of all three manifests.

**Known and accepted consequence:** Level 2 loses 30 background decoration
instances (7 distinct assets) and Level 3 loses 6 (1 asset). These are
**cosmetic only** — decorations are background sprites with no collision, drawn at
`level.js:201`, and `level.js:203` silently skips any image that fails to load. No
crash, no error, no gameplay change. Level 1 is untouched: checksum still
`6CFACDF6`, verified post-purge.

I deliberately **left the dangling decoration references in the level JSON.**
Chief said he wants some assets back later; leaving the references means restoring
from the tag makes them reappear automatically instead of having to be re-placed
by hand. The cost is some 404s in the console. That is a trade I made knowingly —
if anyone would rather have clean JSON, say so and I will strip them.

### 3d. Aki is 32 commits behind and has delivered nothing
This is the single biggest schedule risk. Detail in `docs/KIRO_ORDER_AKI_02.md`.

### 3e. A real hazard nobody has hit yet: the tile registry is duplicated
`TILE_ID_REGISTRY` exists **twice**, hand-synced, with **no test enforcing the sync**:
- `editor/state.js` — keyed by manifest asset id
- `src_scroll/render.js` — keyed by PNG basename

The Builder and the runtime can silently disagree about what tile `12` looks like.
The only thing holding it together today is a pair of code comments. With a new
tilesheet about to add IDs, this stops being theoretical. **Orcha closes this
before Aki appends anything** — sequencing is deliberate.

---

## 4. WHO OWNS WHAT

| Lane | Owner | Scope |
|---|---|---|
| **Level content, art direction, game feel** | **Chief** | Which levels exist, what they teach, layout, difficulty, names, what looks right. Final say on everything. |
| **Builder / editor** | **Aki** | `editor/**`, `assets/**`, the palette, manifests, in-Builder rendering, `boundingRect`, tilesheet slicing. |
| **Runtime / gameplay systems** | **Orcha** | `src_scroll/**`, devices, physics, energy authority, `_dev/**` test suites, placement guards. |
| **Technical direction + QA gate** | **Kiro** | Orders, rulings, semantics ratification, the QA gate, merges to the live line, governance. |

### Lane discipline
Do not edit outside your lane. If your task genuinely requires it, **stop and say
so in your status file** — I will either re-scope the order or hand that piece to
the lane owner. Two agents editing the same file is how we got a duplicated
`CP_*` block that killed the entire Builder with a parse error.

Chief's lane is his. Orcha correctly flagged the Level 3 problem and did **not**
fix it. That was the right call. Report content problems, never quietly repair them.

---

## 5. PROTOCOL — NON-NEGOTIABLE

### 5a. Sync before you do anything
```
git fetch origin
git log --oneline -1 origin/agent/orcha-gameplay
```
`agent/orcha-gameplay` is the live line and the only truth. If you are behind, you
are reading fiction. **Aki, this is aimed at you** — you reported an order was
"missing" while it sat on origin, because you were reading a 32-commit-stale local
copy.

### 5b. Orders are committed files. Never chat relays.
An order is real when it is a file on origin with a SHA. If you cannot see it,
`git fetch` — do not ask for it to be pasted. I have declined that once already
and will keep declining: content with no SHA is exactly how drift starts.

Orders are now **labeled and self-contained** so Chief can say *"read AKI 02 from
Kiro"* out loud, and so you never need a second document to start work.

### 5c. Semantics before code, for anything with rules
New mechanics get a semantics doc **first**, and you **HOLD for ratification**
before implementing. This is not ceremony. It has already caught a guaranteed
crash on paper and three factual errors in my own fence order. Cheaper on paper
than in a merge.

### 5d. A green test run is not evidence. Mutation-test your own guards.
Break your feature on purpose and confirm the suite goes red. If it stays green,
your test asserts nothing.

Standard set by Orcha, unprompted, on O1 — worth repeating in full because it is
exactly right:
- He got 62/0 on first run, **distrusted it**, and mutated the code three ways.
- Mutation 3 produced **zero** failures and exposed a real hole in his own suite.
- An earlier mutation attempt "passed" because the shell had mangled a template
  literal and the change never applied. He checked the file contents instead of
  trusting the exit code. **A green run from a no-op mutation is worse than a red one.**
- On O1 he found his drone/platform exemptions were **vacuous** — no authored level
  contains a single enemy or platform, so those branches were never exercised by
  real data. He added a fixture proving a hovering drone genuinely fails the test a
  walking enemy passes.

That last one is the same class of mistake I made myself: sampling a subset and
generalising. My fence order shipped three factual errors because my contact sheet
sampled only even frames. **Verify against the real thing, not a sample of it.**

### 5e. Boot smoke is mandatory. Suites are not sufficient.
```
node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo-path> <FRESH-PORT>
```
Always pass a **fresh port** — reused ports fail with `EADDRINUSE` and look like a
code failure.

Why this is not optional: Aki's merge once shipped a duplicated module-scope
`CP_*` block. Parse error. **The entire Builder was dead.** Her suites reported
322/0 the whole time, because `_dev/*` never imports `editor/renderer.js`. Unit
tests cannot see a page that will not parse.

### 5f. Run the full gate, from the repo root
```
node _dev/parity_regression.mjs      # 254/0
node _dev/fence_switch.mjs           #  62/0
node _dev/energy_authority.mjs       #  88/0
node _dev/crate_timed.mjs            #  87/0
node _dev/test_electricity.mjs       #  37/0
```
**528 / 0 is the floor.** Any drop is a regression and blocks your merge. Report
before-and-after per suite, not a single total.

### 5g. Branch flow
```
agent/aki-editor  ─┐
                   ├─→  Kiro QA gate  ─→  agent/orcha-gameplay  ─→  Pages
agent/orcha-dev   ─┘
```
Push to your own branch. **Never** to `agent/orcha-gameplay` — that is the live
line and I merge to it. Nothing reaches Chief without passing the gate.

### 5h. Status files, and what makes a good report
Append to your own status file (`AKI_STATUS.md` / `ORCHA_STATUS.md`) in the same
commit as the work. End every delivery with:

```
SHA: <sha> → <branch> · not merged
Suites: <per-suite before → after>
Boot smoke: <result>
HOLDING for Kiro QA.
```

Report what you **verified**, not what you believe. Say plainly what you could not
check. If you contradict something I ruled, say so with evidence — Orcha
overturned three of my fence claims by checking the actual PNGs, and he was right
to. **I would rather be corrected than agreed with.**

### 5i. PowerShell hazards on this machine
These have each cost us real time:
- Long inline commands get mangled and can appear as `^C`. Put anything non-trivial
  in a `.mjs` or `.ps1` **file** and run the file.
- `>` redirect writes **UTF-16**, which breaks `JSON.parse`. Use `execSync` from
  node instead.
- `git add -A` and a file-append in the same command block **race** — the append
  can land after the commit. Separate them.
- Use `;` not `&&`. Never use `cd`; pass a working directory instead.

### 5j. Never guess a number. Measure it.
If you do not know a sprite's real dimensions, the cell size of a sheet, or which
frame is which — **read the file**. Do not infer from a filename, a sibling, or a
contact sheet. This has burned us at least four times.

---

## 6. STANDING TECHNICAL RULINGS

These are settled. Do not re-litigate them; build on them.

1. **`frame_000` is the REST POSE, not animation frame 1.** Animate `001..008`.
   Verified by sha256: `frame_000.png` is byte-identical to `fence_dead.png` and to
   `switch_destroyed.png`. This has bitten us **three separate times**, so it is now
   enforced mechanically — `parity_regression.mjs` hashes every
   `assets/objects/<pack>/frame_000.png` against its siblings. A written convention
   alone was rejected precisely because it would fail a fourth time.
2. **Anchor sprites from the uniform canvas, never from a per-frame bbox.** Per-frame
   anchoring flattens the wall switch's 2px vibration into a slide. Bounding boxes
   are **not** constant across frames — the switch has 6 distinct ones.
3. **Luma cannot signal state.** `fence_dead` is *brighter* (50.4) than the live
   frames (001 = 22.7, 008 = 22.0). Read state from the state machine, never from pixels.
4. **Grid snap is 32 (`TILE_SIZE`)**, not 16. A half-tile snap is why a gate once
   landed at x=1200.
5. **X snaps to the 32 grid; Y does not.** Y is **grounded** to the surface, so a
   28px-tall source on a surface at y=224 correctly sits at y=196. Grounding wins
   over grid alignment on Y. **Never assert `y % 32 === 0`.**
6. **`_reanchorGameplay` applies to single-object drags only.** Group drags stay rigid
   via LCM delta snap; per-object grounding would scatter a cluster.
7. **World-anchored prompts must draw inside the camera transform.** `drawHUD` runs
   after `ctx.restore()`, so world coordinates there are offset by exactly `camX`.
   Use `drawWorldPrompts`, called from `_drawScrollGame`.
8. **Horizontal scroll only. There is no `camY`.** The viewport locks the vertical
   axis and the full world height is always visible. This is why the map could grow
   4 rows at the top as sky with no camera work.
9. **A parenthesised inspector label means unset.** `(default)` / `(none)` **delete**
   the key rather than writing `null`, so levels stay byte-identical.
10. **Margin 0 is acceptable** on Levels 1 and 2. Do **not** add a
    "margin must be positive" assertion.
11. **Fence dies immediately; the burn animation plays concurrently.** A ~1s delay was
    rejected — this is a puzzle game, feedback beats cinematic ordering.
12. **Cherry-pick rather than merge when a branch is far behind.** Avoids dragging
    stale state onto the live line.
13. **Tile IDs: always append, never renumber.** Renumbering invalidates every saved
    level and every localStorage cache. Solidity is `v === 1 || v >= 10` — a numeric
    range, *not* registry membership. An orphaned ID keeps colliding and silently
    re-skins to the default art: no error, no missing-texture box, just wrong art.

---

## 7. DAY PLAN

**Day 1 — unblock Chief**
- Orcha: registry-sync guard (O3), so tile work cannot drift. Small, first, blocking.
- Aki: sync, then slice and register the new tilesheet (A5). **Top priority on the board.**
- Chief: flip Level 2's fence puzzle and play it. Playtest Level 1. Both need nobody.
- Kiro: gate O3, then gate A5 the moment it lands.

**Day 2 — content**
- Chief: finish Level 3 into a real level — drone in the corridor, a checkpoint,
  exit moved to the right end, renamed. Start Level 4 if it flows.
- Aki: remaining art tasks (A1–A4) — real switch art, fence and wall switch drawn in
  the Builder, `boundingRect`, manifest registration.
- Orcha: O2 grounded zone — semantics doc, HOLD for ratification.
- Kiro: gate as things land; playtest support.

**Day 3 — close out**
- Chief: full playthrough 1→2→3, then Level 4/5 content.
- Orcha: implement O2 once ratified.
- Aki: whatever Chief's playtest surfaces in the Builder.
- Kiro: final gate, merge, publish, verify on the live URL pair.

Slip the day plan if quality is at risk. Do not slip the protocol.

---

## 8. YOUR ORDERS

| Agent | File | Chief can say |
|---|---|---|
| Aki | `docs/KIRO_ORDER_AKI_02.md` | *"read AKI 02 from Kiro"* |
| Orcha | `docs/KIRO_ORDER_ORCHA_02.md` | *"read ORCHA 02 from Kiro"* |

Read this brief, then your order. Sync first. Ask before guessing.

— Kiro, Technical Director
