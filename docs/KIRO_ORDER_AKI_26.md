# KIRO ORDER: AKI 26 (Level 1 Builder tools and art)

**From:** Kiro, Technical Director | **To:** Aki | **Authority:** Chief (decisions in `docs/GAME_DESIGN_V2.md` section 13 and `docs/LEVEL_DESIGN_V2.md` section 9)
**Branch:** your own branch, push as `AGENTS.md` describes. Never force-push. Status: work order, nothing started.
**Companion order:** `docs/KIRO_ORDER_CODEX_01.md` (runtime). The data contracts below are shared; if you want to change one, tell Kiro first.

## Read first
1. `docs/LEVEL_DESIGN_V2.md` sections 3.3, 4.3a, 4.5, 4.6 and 8 (the work list).
2. `docs/GAME_DESIGN_V2.md` sections 3.5, 4.5 and 7.
3. `docs/LEVEL_SCHEMA.md`.
Tags: CONFIRMED (Chief decided), RECOMMENDED (adopt unless you find a flaw and say why), OPEN (do not build).

## Hard rules
- **Chief owns `src_scroll/levels/*.json`.** You build the tools and art. **You do not place anything in Level 1
  or edit any level file.** Chief places everything in the Builder himself.
- Run `node scripts/version_editor.mjs` before committing Builder JavaScript (see `AGENTS.md`).
- There is **no fixed charge total per level** now (Chief, round 9). The earlier order text "do not modify Level
  1's three 4-charge sources" no longer limits the Builder: Chief sets totals. The exit still costs 8.
- **Art guards (mandatory, because earlier PixelLab output had a white vignette):** every new PNG must pass
  (1) fully transparent border pixels unless it is a tile, (2) a palette check against the Night City prop
  palette (list the colours used), (3) the exact size in the table, (4) a contact sheet of all frames. Show
  Chief each piece **before** you register it in the manifest. If PixelLab results are poor after two tries,
  stop and report; do not ship weak art.

## Shared data contract with Codex (do not change without Kiro)
| Field | Where | Meaning |
|---|---|---|
| `charge` | any source | the object's **capacity** (unchanged for old levels) |
| `uncharged` | any source, optional boolean, default `false` | starts at 0 charge instead of full |
| `path` | platform, optional array of `{x, y}` (2 or more) | waypoints; absent means today's `x1`/`x2` |
| `pathMode` | platform, optional `"pingpong"` or `"loop"` | default `"pingpong"` |
| `dialogue.poweredLines` | NPC, optional, same shape as `lines` | shown while the linked object holds charge |
| `dialogue.linkedObjectId` | NPC, optional string | id of the charged object that switches the lines |
| `abilities` | level, optional, e.g. `{ "bolt": false, "melee": false }` | missing means all on |

## Part 1: Builder tools (CONFIRMED)

### 1.1 "Uncharged" checkbox
Every charged object (every source placed from the palette or edited in the inspector) gets an **"Uncharged"
checkbox**. Unticked (default) places it charged as today. Ticked writes `uncharged: true`. The palette placement
uses the same default. Show it in the inspector next to the `charge` field, and rename that field's label to
"Capacity" without changing its key. Chief's words: "on builder if and when I decide to place a charged object
down, a checkbox for uncharge needs to be implemented."

### 1.2 Level total readout
A small, always-visible readout in the Builder showing the level's available charge (the sum of `charge` over
sources that are not `uncharged`), the exit cost, and a warning when the total is below the exit cost plus
mandatory spends it can see (exit 8, required platforms, required switches). It is a readout and a warning,
**not a cap**: it must never block placing anything.

### 1.3 Platform path tool
The inspector offers only number boxes for `x1`, `x2`, `speed` today and draws a dashed horizontal line.
Add a **path tool**: select a platform, click the canvas to add waypoints, drag a waypoint to move it, delete
a waypoint, with a visible polyline and numbered dots and a **Ping-pong / Loop** switch. Write `path` and
`pathMode`. Platforms with no `path` keep the old inspector. Selection, move, copy and paste, undo and redo must
all treat a path as part of the platform. Snap waypoints to the grid by default (the same snapping platforms use).

### 1.4 Reactive NPC dialogue fields
In the tabbed NPC Inspector (Order 23), add a second line list **"Lines while powered"** and a **"Linked object"**
picker (a dropdown of the level's charged objects by id and label). Write `dialogue.poweredLines` and
`dialogue.linkedObjectId`. Preview both sets. Keep the focus behaviour fixed in Order 25 (typing must not lose
the field).

### 1.5 Level height
Make sure Chief can add **rows to the top of a level** (Level 1 grows from 18 to 34 rows) and that every
decoration, source, NPC, gate and the player start shift with it (+512 px for 16 rows). If this already exists,
show Chief where it is; if it exists only as a script (`_kiro_tools/expand_vertical.mjs` is on Kiro's machine,
not the repo), build it into the Builder. Test with a copy of Level 1, never the real file.

### 1.6 Per-level abilities
Add an Abilities section to the level settings with Bolt and Melee checkboxes writing `abilities`.

### 1.7 Ladders
Ladders are a decoration whose `src` is exactly `assets/objects/night-city-props/ladder/ladder.png`. The art is
128 x 605 and resizable. Make sure the Builder lets Chief place one, resize it by tile height, and see that it is
climbable (a small ladder badge in the inspector). No shipped level uses a ladder yet, so build a **test level
copy** with one ladder to a rooftop and confirm in the game that the player can climb, step off the top and
climb back. Report what you find; the ladder top needs a supporting tile.

## Part 2: art (CONFIRMED round 4 unless marked)
All art uses the Night City prop palette and the manifest format of the existing `night-city-props`.

| # | Asset | Spec | Notes |
|---|---|---|---|
| 1 | **Apartment building facade** | Night City prop palette, with at least one window opening that can hold an NPC | The hint building for the AC secret. A family-tag snap piece like the other facades. |
| 2 | **Window NPC** | Two poses at the window: **complaining** (fanning herself, 4 to 6 frames, loops) and **relieved** (4 frames) | Registered as an NPC asset. She is the first story-relevant NPC. |
| 3 | **AC unit recolour** | **Same size, same frames, same fan animation**, new colourway; Chief wants it to "look and act the exact same" | Off state: fan still. On state: fan spinning (the code already drives `_fanSpeed`). Keep the existing one too. |
| 4 | **Relay pylon** | A tall pylon that reads at the start of Level 1, with a lit top | Sits in the plaza. |
| 5 | **Light cable** | A tileable straight run and a corner, lit | A line of decorations climbing the skyline to the tower (LEVEL_DESIGN_V2 4.3a). |
| 6 | **Beacon top** | A lit crown for the gatehouse roof, same colour as the cable | |
| 7 | **Hatch and secret room dressing** | A closed hatch, an open hatch, and 3 to 5 small room props | The Easter egg room behind the AC unit. Content depends on the story. |
| 8 | **Pip pickup** | 16 x 16 icon with a 4-frame idle bob, in the pip HUD style | World object for the full-reserve chest (CODEX 01 A4). |

Do **not** make: hero frames (Kiro does duck and double jump), the vending machine, fuse box, sign and shutter
reactions (a later order, after Chief reviews these), or any music.

## Acceptance (evidence required)
- [ ] Each Part 1 item working in the Builder, with a short screen recording of Chief's workflow for 1.1, 1.3 and 1.4.
- [ ] Old levels load and save unchanged (diff a round trip of every level JSON and show it is empty).
- [ ] New tests for the checkbox round trip, the readout, path editing with undo and redo, and NPC fields.
- [ ] Suite totals versus the baseline in CODEX 01 (2617 passed, 24 failed before this order). Name every new failure.
- [ ] Each art piece: the checks above, a contact sheet and in-game screenshots, shown to Chief before registering.
- [ ] Commit and push everything, with SHA, file list and the build URL Chief should test.

## Report and stop
Report as `AKI 26 PART <1|2>`: per item PASS/FAIL, SHA, files, tests, what you did not do. Then HOLD for review.
Do not merge to the live line. Do not place anything in a level.
