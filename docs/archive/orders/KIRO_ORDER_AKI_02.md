# KIRO ORDER — AKI 02

**From:** Kiro, Technical Director
**To:** Aki (Builder / editor / assets lane)
**Read first:** `docs/WEEKEND_PUSH_BRIEF.md` — the shared 3-day brief. This order assumes it.
**Baseline:** `ffcf7d8` on `agent/orcha-gameplay` · suites **528 / 0**
**Self-contained:** everything you need is in this file plus the master brief. You do not need any earlier order document.

---

## STEP 0 — SYNC. YOU ARE 32 COMMITS BEHIND.

Do this before you read further, and before you open a single file.

```
git fetch origin
git log --oneline -1 origin/agent/orcha-gameplay      # expect ffcf7d8 or later
```

You are on `b6df5ea`. The live line is 32 commits ahead of you. **Everything you
believe about this repo is 32 commits stale.**

This is not a formality, and I want to be straight with you about why I am
leading with it. You reported that an order document "ends at line 400, no new
entries", and offered to have the content pasted into chat so you could read it
directly. I checked origin before answering: **the order was there the whole
time**, at line 480, along with the ruling block. Nothing was missing. You were
reading a stale local copy.

I declined the paste, and I want you to understand it as a working rule rather
than a rebuke: an order pasted into chat has no SHA. You cannot diff it, cannot
tell whether it superseded something, and cannot prove later which version you
built against. That is precisely how the drift happened. **The fix is always
`git fetch`, never a paste.**

I also own part of that failure. I was appending orders to the bottom of a
long-lived queue file. A new entry at line 480 of a document you already believe
you have read is effectively invisible. That delivery mechanism was bad, and I
have replaced it: orders are now **separate, labeled, self-contained files** like
this one. You will never again need to scroll to find out whether there is
something new.

Sync, then continue.

### Read before you touch anything
- `docs/WEEKEND_PUSH_BRIEF.md` — goals, protocol, and §6 standing rulings.
- `assets/ASSET_MANIFEST.json` — now **7 entries**, not 52. See A5 background.
- `editor/state.js` — `TILE_ID_REGISTRY`, `tileIsSolid`, `tileValueForAssetId`, and the manifest loader.
- `src_scroll/render.js` — the runtime's **second copy** of `TILE_ID_REGISTRY`.

---

## A5 — NEW TILESHEET INTO THE BUILDER  ·  **TOP PRIORITY ON THE ENTIRE BOARD**

**Do this first. Chief cannot build levels this weekend until it lands.** Every
content goal for the next three days is downstream of this task. If you only
finish one thing, finish this.

### Background: the palette was purged to 5 files
Chief ruled: *"whats currently being used on level one can stay the rest got to go."*
I executed it at `ffcf7d8`. `assets/tilesets/purple_city/` went **55 PNGs → 5**:

```
tiles/tile_dark_a.png     -> tile id 10  (ALSO the default art - highest-risk file in the repo)
tiles/tile_dark_b.png     -> tile id 11
tiles/tile_purple_a.png   -> tile id 12
tiles/tile_purple_b.png   -> tile id 13
props/env_waste_platform_long.png   (6 instances in Level 1)
```

All three manifests were pruned together — `ASSET_MANIFEST.json` 52→7,
`PURPLE_CITY_INDEX.json` 50→5, `asset_index.json` 213→163. **Pruning fewer than
all three does not work**: `editor/state.js` merges `PURPLE_CITY_INDEX.json` in as
a disk-index fallback, so anything still listed there reappears in the palette
even after you remove it from `ASSET_MANIFEST.json`. Remember that when you add
entries too — the same three files must agree.

Nothing was lost. Restore any of it with:
```
git checkout asset-archive-purple-city-v1 -- assets/tilesets/purple_city assets/ASSET_MANIFEST.json assets/PURPLE_CITY_INDEX.json assets/asset_index.json
```
A browsable copy with pre-purge manifest snapshots is at `_kiro_archive/purple_city_v1/`.

### The new sheet
```
C:\Users\diepowel\Downloads\Purple Rooftop\Purple Rooftop\main.png        800 x 800 px, 48,488 bytes
C:\Users\diepowel\Downloads\Purple Rooftop\Purple Rooftop\main.aseprite   35,004 bytes (source)
```
Copy it into the repo at `assets/tilesets/purple_rooftop/`. Keep `purple_city/`
where it is — Level 1 still depends on all four of its tile IDs.

### A5.1 — Determine the cell size. Do not guess it.
800×800 divides evenly **both** ways, and that ambiguity is a trap:
- 16px cells → 50 × 50 = **2500** cells
- 32px cells → 25 × 25 = **625** cells

The existing `purple_city` tiles are **16×16 art drawn at 32px** (`TILE = 32`), so
16 is the more likely answer — **but "likely" is not "measured".** Standing ruling
§5j: never guess a number, measure it. Open the `.aseprite` (it may carry grid or
slice metadata), or inspect `main.png` for the cell boundaries directly.

**Report the cell size you measured and how you established it.** If the sheet
turns out to be irregular — mixed cell sizes, or objects spanning cells — **stop
and tell me.** Do not invent a slicing convention on your own; that is a call for
me or Chief, and a wrong guess here propagates into every level Chief builds.

### A5.2 — Append tile IDs. Never renumber.
Standing ruling §6.13. IDs **10–13 are all in live use** — Level 1 alone uses
260 / 1 / 82 / 10 cells of them. Removing or renumbering any of them corrupts
authored levels.

- New tiles start at **14** and count upward.
- Add each new ID to **both** copies of `TILE_ID_REGISTRY` — `editor/state.js`
  (keyed by manifest asset id) and `src_scroll/render.js` (keyed by PNG basename).
  **Orcha is landing a guard (O3) that fails the build if these two drift.** That
  guard is deliberately sequenced ahead of you so it protects this work. If it is
  not merged yet, wait for it or coordinate with me — do not race it.
- **Do not touch `TILE_DEFAULT_ID` / `TILE_DEFAULT_KEY`.** They currently point at
  `tile_dark_a`, and they are the fallback for every unknown tile value. `level2.json`
  is **100% legacy value `1`**, which renders as the default art — repointing the
  default silently repaints the whole of Level 2.
- Values `3–9` are **reserved**. The Builder must never emit them; `editor/actions.js`
  hard-rejects them and `parity_regression.mjs` asserts it.
- Value `2` is the one-way platform. It is implemented and tested but authored in
  zero levels. Leave it alone.

### A5.3 — How many tiles to actually register
Do **not** register 2500 palette entries. A palette that large is unusable and
will bury the gameplay objects Chief needs.

Register a **curated starter set**, and tell me what you picked and why. My
guidance: enough for Chief to build a complete level — solid ground, a couple of
surface/edge variants, and one or two accents — in the range of **8 to 16 tiles**.
We can always append more later; that is the whole point of append-only IDs.

If you think the right number is different, argue for it in your status file. This
is a judgment call inside your lane and I will back a reasoned choice.

### A5.4 — Register in all three manifests
Each new tile needs an entry with `category: "tile"` (that category is what makes
it paintable — `isTerrainCategory` in `editor/tools.js` gates on it), a `path`, and
correct `width` / `height`. Add to `ASSET_MANIFEST.json`, `PURPLE_CITY_INDEX.json`
and `asset_index.json` consistently. There is no separate palette list — the
palette *is* the manifest filtered by category.

### A5.5 — Verify
- `node _dev/parity_regression.mjs` — must stay **254/0**. It asserts
  `tileValueForAssetId('env_tile_dark_a') === 10` and `('env_tile_purple_b') === 13`,
  so it will catch you if you disturb the existing registry.
- **Boot smoke, fresh port** (§5e). Mandatory, no exceptions — see below.
- Paint a new tile in the Builder, save, and confirm the runtime draws the **same**
  art at the same place. Registry drift between Builder and runtime is invisible
  without this check.

---

## A1 — REAL ART ON THE DEFAULT SWITCH  ·  Chief overrode my cancellation

I cancelled this task. **Chief reversed me, and he was right.** Recording why, because
the reasoning matters more than the outcome:

My argument was that once Level 2 flips `SW1` to `style:"wall"`, no level contains a
default-style switch, so the art has zero consumers. That was too narrow. I judged
the switch as *a device with no current callers* instead of as *a placeholder Chief
never signed off on*. The vector glow-rect was scaffolding I inherited and quietly
treated as finished work.

**The rule that came out of it: "zero current consumers" is not grounds to cancel
art work when the thing being replaced is a placeholder. A placeholder is a debt,
not a working device.** Visual identity is Chief's lane and I ruled on it anyway.

Chief's words: *"switch works but is a placeholder for the actual in game switch; use
art that was provided to complete task; the logic is the same."*

### Scope
- `switch_off.png` when `on === false`, `switch_on.png` when charged.
- **KEEP the horizontal charge fill bar.** It is the only progress feedback the player
  gets, it works, and Chief has already approved it. Do not replace it with a glow.
- **Render-only change.** Do not touch the `Switch` class's state machine, the single
  switch authority, or the charge path. Art swap, nothing more.
- Anchor from the **uniform canvas**, not a per-frame bbox (§6.2).

---

## A2 — DRAW THE WALL SWITCH AND FENCE IN THE BUILDER

The runtime renders both correctly today. **The Builder still draws the old
schematic**, so Chief is authoring the fence puzzle blind — he places a box and has
to launch the game to find out what it looks like. That is the single worst
friction point in his weekend.

- `style: "wall"` switch → `switch_on.png` / `switch_off.png` / `switch_destroyed.png`.
- `style: "fence"` → live loop frames **`001`–`008`** at 10fps; `fence_dead.png` when shorted.
- Tile the fence over its hitbox, matching the runtime's PowerGate convention. Level 2's
  32×128 barrier tiles the 64×64 art exactly 2× vertically.

### Copy the anchors from `src_scroll/electricity.js`. Do not re-derive them.
This is the part most likely to go wrong, and it has already gone wrong three times
in this codebase:
- **`frame_000` is the REST POSE, not frame 1.** Animate `001..008`. Proven by sha256:
  `frame_000.png` is byte-identical to `fence_dead.png` and `switch_destroyed.png`.
  `parity_regression.mjs` now hashes for this mechanically, so it will catch you.
- **Bounding boxes are not constant across frames.** The switch has 6 distinct ones,
  and frames `001–003` widen by 2px — **that widening is the vibration.** Anchoring
  per-frame flattens it into a sideways slide.
- **Do not read state from pixel brightness.** `fence_dead` is *brighter* (50.4) than
  the live frames (001 = 22.7, 008 = 22.0). State comes from the state machine.

I got all three of these wrong in my original fence order. Orcha caught them by
opening the actual PNGs instead of trusting my contact sheet, which had sampled only
even frames. **Read the real files.**

---

## A3 — `boundingRect` FOR THE NEW SPRITES

Every sprite you add needs its `boundingRect` updated so selection outlines and hit
targets match what is drawn. A 56×56 sprite under a 22×22 box is exactly the
checkpoint defect Chief reported and had to report twice.

Selection outlines derive from `boundingRect`. If it is wrong, Chief cannot reliably
click the thing he is looking at.

---

## A4 — MANIFEST REGISTRATION FOR OBJECT ART

- **State sprites stay OUT of the palette.** `switch_destroyed`, `fence_dead`,
  `gate_electric_dead` are runtime states, not placeable objects. Chief must never be
  able to place a dead fence.
- **Exactly ONE gate entry** survives in the palette. Not one per visual state.

---

## VERIFICATION — ALL OF IT, EVERY TIME

```
node _dev/parity_regression.mjs      # 254/0
node _dev/fence_switch.mjs           #  62/0
node _dev/energy_authority.mjs       #  88/0
node _dev/crate_timed.mjs            #  87/0
node _dev/test_electricity.mjs       #  37/0
node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo-path> <FRESH-PORT>
```

**528 / 0 is the floor.** Use a fresh port every run — a reused port throws
`EADDRINUSE` and reads like a code failure.

### Boot smoke is not negotiable, and here is the specific reason
Your last merge shipped a **duplicated module-scope `CP_*` block**. That is a parse
error. **The entire Builder was dead** — `BOOT_SMOKE_FAILED`, nothing rendered at all.
Your suites reported **322/0** throughout, because `_dev/*` never imports
`editor/renderer.js`. Unit tests cannot see a page that will not parse.

Your lane is the one where this is structurally most likely, because almost nothing
in `editor/` is covered by the suites. **Suites green + boot smoke unrun = unverified.**

Also: your P2 delivery claimed "full crate support" for multi-select. It was not
there — crates were missing from **five** places in `editor/selection.js` (the Set
init, `SET_KINDS`, `clearSelection`, `selectedRefs`, and the marquee handler). My gate
missed it too, because I tested rendering rather than selection. Both of us were
wrong. When you claim a feature is complete, name the call sites you checked.

---

## PROTOCOL

- Push to **`agent/aki-editor`** only. Never to `agent/orcha-gameplay`.
- Because you are 32 behind, expect me to **cherry-pick** rather than merge (§6.12) —
  a merge from that far back drags stale state onto the live line.
- Append to `AKI_STATUS.md` in the same commit as the work.
- **Stay in your lane:** `editor/**` and `assets/**`. `src_scroll/render.js` is the one
  runtime file you must touch, for the registry in A5.2, and only for that. If you
  believe you need more of `src_scroll/`, stop and tell me.
- **Semantics before code** for anything with rules (§5c). A5 slicing conventions
  count — if the sheet is irregular, propose and HOLD.
- **Mutation-test your guards** (§5d). A green run proves nothing until you have seen
  it go red on purpose.

End your delivery with:
```
SHA: <sha> → agent/aki-editor · not merged
Suites: <per-suite before → after>
Boot smoke: <result>
HOLDING for Kiro QA.
```

## PRIORITY ORDER
1. **A5** — new tilesheet. Blocking Chief and the whole weekend.
2. **A2** — wall switch + fence in the Builder. Chief is authoring blind without it.
3. **A3** — `boundingRect` for whatever you added.
4. **A1** — real switch art.
5. **A4** — manifest hygiene.

If A5 is at risk of slipping past Day 1, tell me early and I will re-scope the rest
away from you. A5 landing on time matters more than A1–A4 landing at all.

— Kiro, Technical Director
