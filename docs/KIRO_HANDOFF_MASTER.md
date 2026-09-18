# KIRO HANDOFF — MASTER ORDER (Aki + Orcha)

**From:** Kiro, Technical Director
**Status:** I am out of credits. **Chief assigns duties from here; this file is the standing brief until I return.**
**Live line:** `agent/orcha-gameplay` · suites **669 / 0** · both of you read this whole file.

Chief's words: *"i'm running low on credits for KIRO so these will have to be passed to orcha and aki;
i as the chief will assign them duties and will see you when the credits renew."*

**Nothing in here is optional and nothing here is a suggestion.** Work the priority order in §8.

---

## 0. THE RULES DO NOT LAPSE BECAUSE I AM AWAY

With no QA gate running, the discipline matters more, not less.

1. **Push when green, not when finished.** Chief lost a playtest cycle because work sat unpushed.
2. **A pushed order file is immutable.** New directives get a new numbered file. I broke this once and
   Aki never saw A7.4.
3. **No agent may weaken or move a guard covering their own lane.** If a guard blocks legitimate work,
   report it and extend it — never relax it.
4. **Mutation-test every assertion.** A green run proves nothing until you have seen it go red. A check
   that still runs but no longer distinguishes anything is the most expensive bug class in this project;
   we have hit it four times.
5. **Never guess a number. Measure it.** Every art defect this weekend came from an assumed dimension.
6. **State what you could not verify.** "Geometry asserted, appearance needs Chief" is the correct
   report. Claiming more is worse than claiming less.
7. **Anything you want read goes in a committed file**, never chat. No SHA, does not exist.
8. **Content is Chief's.** Report content defects; never silently fix them.
9. **Semantics before code** for any new mechanic, then **HOLD for Chief's ratification** in my absence.
10. **Boot smoke every time** — `node C:\Users\diepowel\Documents\_kiro_tools\boot_smoke.mjs <repo> <FRESH-PORT>`.
    Suites do not cover `editor/`; a parse error once killed the whole Builder while they read 322/0.

**With me gone, ratification falls to Chief.** Present a semantics doc as a short numbered list of
decisions with your recommendation on each, so he can approve by saying "1-6 yes, 7 no." Do not hand
him a design essay.

---

## 1. FIRST: the publish workflow, because Chief hit it backwards

The `overcharge://push` handler **works**. Chief's console showed `ACCEPTED: action "push"`.

But `Changed canonical level files:` was empty, and then he moved the generator. **He published before
saving.** The order is:

> **1. SAVE in the Builder → 2. click ▶ PUBLISH TO GITHUB → 3. answer Y → 4. hard-refresh the game**

His generator move (`src_3` x 512 → 416) was on disk and uncommitted when I found it; I committed it.
This will keep happening.

### AKI — A8: make the publish button refuse to mislead
- If there are **no unsaved changes and nothing new since the last publish**, the PUBLISH link must say
  so instead of launching a run that finds nothing.
- After a save, the link must state **what will be published** in game terms — "level1: 1 source moved"
  — reusing your existing `_gameDiff` from A6.
- If **no save folder is set**, say that *before* offering to publish. A publish without a save is
  guaranteed to do nothing.
- Boot smoke. Prove the empty case and the non-empty case both report correctly.

---

## 2. BLOCKER: the level breakdown is not in git

`C:\Users\diepowel\Desktop\DOCS\OVERCHARGE_LEVEL_BREAKDOWN.pdf` is **Chief's law for Levels 1–5** and
neither of you can read it. I attempted text extraction and failed — it is image-only or uses a filter
my extractor does not handle.

### ORCHA — O6: get the law into the repo, then stop
1. Ask Chief to paste the **full text of all five level sections** into chat, or export the PDF as text.
2. Commit it verbatim as **`docs/OVERCHARGE_LEVEL_BREAKDOWN.md`**.
3. **Change nothing about it.** It is Chief's design law, not a draft to improve.

**Nobody builds Levels 3, 4 or 5 until that file exists on the live line.** Building from a
half-remembered spec is how we get another Level 3 stub.

The only section I have verbatim is Level 2, reproduced in §3. Treat everything else as unknown.

---

## 3. LEVEL 2 — SPLIT DECISION: route redesign + a new CHEST mechanic

Chief's law, verbatim:

> **Level 2 — SPLIT DECISION** · Status: Built and live
> Two generators (4 and 6 charge). A barrier mid-level blocks the upper route. A switch earlier in the
> level opens it — but costs 2 charge to activate. The exit gate needs 6 to open.
> **What it teaches:** Charge is a resource you spend, not just collect. To proceed you choose: burn 2
> charge on the switch to unlock the path, or find another route. The name is literal — there's a fork
> and your charge budget decides which way you go. First time the player has to think about whether to
> spend or save.
> **New mechanics:** Switches. Charge-as-currency. Barrier gates (block-only, don't count toward the
> exit). Resource tradeoffs.

Chief's instruction: *"i dont want to change the generator cost or any of the econemy but i need to
change the route; and have a chest that you can open behind the fence to actually teach the lesson for
split decision."*

### The design problem, stated plainly
The level currently has **no fork**. It is a corridor with a fence in it, so there is no decision — the
player must pay 2 for the switch. That does not teach a tradeoff, it teaches a toll. **A choice needs
two viable routes and a reason to prefer one.**

The chest is what makes the switch route *worth* 2 charge instead of merely mandatory.

### ECONOMY IS FROZEN
```
A1 = 4    E1 = 6    SW1 required = 2    EXIT required = 8    margin = 0
```
**Do not change any of these numbers.** Note the exit is **8**, not the 6 in the PDF — Chief later ruled
all exit gates cost 8 uniformly, and that ruling supersedes the document. Flag the discrepancy to him;
do not resolve it yourselves.

Margin 0 means the level is exactly solvable. **A chest that costs charge to open makes the level
unsolvable.** So the chest must either be free to open, or reward more than it costs. See below.

### ORCHA — O7: CHEST mechanic. **Semantics first, HOLD for Chief.**
New device, so `docs/ORCHA_CHEST_V1_SEMANTICS.md` first. Decisions Chief must rule on, as a numbered
list:
1. **Does opening cost charge?** With margin 0, a cost makes the level unsolvable unless the reward
   exceeds it. My recommendation: **free to open, rewards charge** — the switch's 2 is already the price.
2. **What does it contain?** Charge? A permanent upgrade? My recommendation: **charge**, because it is
   the only currency the game has and it makes the tradeoff arithmetic visible to the player.
3. **How much?** Must be ≥ 2 for the detour to pay for itself, or the choice is a trap.
4. **Once or repeatable?** Recommendation: once, latched like the gate's dormancy.
5. **Does it survive a checkpoint restore?** It must, or the player can farm it. Checkpoints snapshot
   source state and player charge together — the chest belongs in that snapshot.
6. **Placement rule:** grid-aligned on X, grounded on Y, like every other device.

Implementation constraints:
- Route **all** charge through `spendEnergy` / `giveEnergy`. **No device gets its own ledger.**
- An absent `chests` array must mean **zero behavioural change** for every existing level — same
  discipline you applied to `crates`.
- New suite `_dev/chest.mjs`, mutation-tested both directions.
- Add placement guards to `parity_regression.mjs` for the new object type.

### AKI — A9: Builder support for the chest
After Orcha's semantics are ratified and merged: `+ Chest` spawn button, one palette entry, real art if
Chief supplies it, correct `boundingRect`, inspector fields for whatever the semantics define. **Do not
start before his schema lands** — that is exactly the mistake that stalled your P2 crate work.

### CHIEF's, not yours: the route itself
The fork, the geometry, where the chest sits, which path is longer. Report if the level becomes
unsolvable; never re-author it.

---

## 4. VERTICAL LEVELS — the largest item here. **Semantics first.**

Chief: *"this platformer is currently going linear left to right; i want the option to be able to go up
and down as well so i need in the builder if i want to go down or up it adds x amount (the size of the
map) to the top or bottom) i also need the player to be in the builder assest window as the spawn point."*

### Why this is not a small change — read before estimating
```
src_scroll/constants.js   ROWS = 18, H = 578        <- fixed, global
level.js                  tiles.length === cols * ROWS
viewport.js               LOCKS the vertical axis: the full world height is always visible
                          THERE IS NO camY. Scrolling is horizontal only.
```

So "go up and down" is **two separate features**:

**(a) Variable level height** — `ROWS` becomes per-level instead of a global constant. Touches the level
schema, every `tiles[]` index calculation, the Builder's grid, and every existing level file.

**(b) A vertical camera** — `camY` does not exist. It has to be created, with follow behaviour, clamping,
and a decision about what happens when a level is shorter than the viewport.

**(b) is a genuinely new runtime feature and it is where the risk is.** Do not treat this as a Builder task.

### There is precedent for the migration — use it
I have already grown the map once: `ROWS 14 → 18`, `H 450 → 578`, by adding **4 rows at the top as sky**
and shifting all content down 128px. All five level files were migrated in one commit. That worked
because the bottom rows were already solid fill and the viewport locks the vertical axis.

**Adding rows at the TOP shifts every object's `y` by `rows * 32`.** Adding at the BOTTOM does not.
That asymmetry is the whole difficulty, and it is why this needs a ratified plan rather than an
implementation sprint.

### ORCHA — O8: `docs/ORCHA_VERTICAL_V1_SEMANTICS.md`. **HOLD for Chief.**
Numbered decisions for him:
1. Is height **per-level** in the JSON, or does the global `ROWS` just increase for everyone?
2. When rows are added at the top, is the shift applied to **objects, tiles and `tileRotations`**
   together? (All three, or the level corrupts.)
3. Does `camY` follow the player continuously, or snap between vertical "screens"?
4. What happens when a level is **shorter** than the viewport — letterbox, or clamp?
5. Do the five existing levels get migrated, or stay at 18 rows via a default?
6. What is the maximum height? An unbounded value lets Chief make a level that cannot be authored.

**Sequencing, non-negotiable:** the runtime must accept variable height **before** the Builder can
create it. A Builder that writes 30-row levels the game cannot load produces corrupt files Chief will
lose work to.

### AKI — A10: Builder vertical expansion. **Blocked until O8 ships.**
- `+ ADD ROWS ABOVE` / `+ ADD ROWS BELOW`, in whatever increment the semantics define.
- Adding above must shift **every** object, tile and rotation down together. Preview the shift and
  require confirmation — this is destructive if wrong.
- Canvas, grid, scroll and zoom all follow the new height.
- **A6 divergence detection must survive this**; a height change is exactly the sort of edit that
  should be reported in game terms.

### AKI — A11: player spawn as a placeable palette asset
Chief: *"i also need the player to be in the builder assest window as the spawn point."*

Currently `playerStart` is a bare `{x, y}` with no palette presence. Add a palette entry with the real
player sprite, placeable, and moving it must rewrite `playerStart` — **exactly one per level, never two.**

**Do not lose the spawn-reachability guard.** A closed gate blocks floor-to-ceiling
(`blocksHorizontal()` ignores Y deliberately), so a spawn inside a gate's blocking column pins the
player permanently. Chief hit this on Level 3 and lost a session to it. `parity_regression.mjs` guards
it; keep it passing, and surface it in the Builder if you can.

**A11 is small and independent — it is the best first task of the vertical work.**

---

## 5. Outstanding from before this handoff

**ORCHA — O5.4** (in flight): shorted switch renders `switch_off.png`, anchored from **content bottom** —
it is the only file in the pack with `botPad = 4`, so canvas anchoring drops it 1px on the exact frame
the player is watching. `switch_off` is also ~12% smaller by design; **do not compensate for that in
code.**

**ORCHA — O4** completability proof: energy budget, reachability through floor-to-ceiling gates, and
content placed beyond where terrain ends. That last check is the one that would have caught Level 3.
**Do this before Levels 3–5 are authored, not after.**

**ORCHA — O2** grounded hazard zone: **still deferred.** Level 6 is out of scope.

**Both:** `editor/main.js` was touched by me for the publish link. Aki, it is in your lane and I am
telling you rather than letting you find it in a diff.

---

## 6. Three things awaiting Chief's eye, none of them code
1. **The gate is ~30px wider** — restored art the old crop had been hiding since the spritesheet
   shipped. If he wants it narrower it is `GATE_DRAW_W` and nothing else.
2. **Flipped-below label placement** when a gate sits near the ceiling.
3. **`switch_off` being visibly smaller** than the other switch states.

---

## 7. Level 3 is still a published stub
Terrain stops at x=1184 with 62% of the level empty, exit gate at x=32 *behind* the spawn at x=64, zero
enemies, zero checkpoints, name still "LEVEL 3". It is in `levels.json`, so anyone finishing SPLIT
DECISION lands in it.

It passes every automated check because it **is** completable. Unfinished is not something a test can
assert — which is precisely why O4 must land.

**Chief's call: finish it or cut it from the manifest.** Do not author it yourselves.

---

## 8. PRIORITY ORDER — work this top to bottom

| # | Owner | Task | Blocked by |
|---|---|---|---|
| 1 | Orcha | **O6** — get the level breakdown into `docs/` | Chief pasting the text |
| 2 | Orcha | **O5.4** — shorted switch art, then **push** | — |
| 3 | Aki | **A11** — player spawn as a palette asset | — |
| 4 | Aki | **A8** — publish button honesty | — |
| 5 | Orcha | **O4** — completability proof | — |
| 6 | Orcha | **O7** — chest semantics → HOLD for Chief | — |
| 7 | Orcha | **O8** — vertical semantics → HOLD for Chief | — |
| 8 | Aki | **A9** — chest in Builder | O7 ratified + merged |
| 9 | Aki | **A10** — Builder vertical expansion | O8 ratified + runtime shipped |

**Items 2, 3, 4 and 5 are unblocked right now.** Start there.

## 9. Reference — nothing here should be re-derived
| What | Where |
|---|---|
| Agent state, derived from git | `docs/AGENT_BOARD.md` — `node _kiro/agent_board.mjs --write` |
| Full protocol + 13 standing rulings | `docs/WEEKEND_PUSH_BRIEF.md` |
| Gate sprite geometry (measured) | `assets/objects/gate/GEOMETRY.md` |
| Level JSON schema | `docs/LEVEL_SCHEMA.md` |
| Suites (669/0 floor) | `_dev/*.mjs`, run from the repo root |
| Boot smoke, probes | `C:\Users\diepowel\Documents\_kiro_tools\` |
| Publish handler + installer | `_kiro/protocol_handler.mjs`, `_kiro/install_protocol.ps1` |

**Measured facts, so nobody re-measures them:** grid snap is 32; X snaps to grid but Y grounds to the
surface, so never assert `y % 32`; tile IDs append and never renumber, and solidity is `v === 1 || v >= 10`
which is a numeric range, not registry membership; `frame_000` is the rest pose in the fence, switch and
gate packs but a **real frame** in the generator pack — verify per pack by hash, never by convention.

— Kiro, Technical Director
