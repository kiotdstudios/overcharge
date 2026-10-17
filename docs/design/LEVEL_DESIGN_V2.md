# OVERCHARGE: Level Design V2

**Status:** Draft 1 for Chief's review. Written after commit `5ad4f1b` (2026-10-13).
**Supersedes:** `docs/archive/OVERCHARGE_LEVEL_BREAKDOWN.md`, the Level 3, 4/5 and 5 briefs, the first
Level 1 world-build plan and the route preview (all kept unchanged in `docs/archive/`).
**Companion:** [`docs/design/GAME_DESIGN_V2.md`](GAME_DESIGN_V2.md). Tags (CONFIRMED, CARRIED, BUILT, RECOMMENDED,
CONCEPT, OPEN) are defined in its section 0 and used identically here.
**Focus:** Level 1 is the only level in active development. **Levels 2 to 6 are paused** (CONFIRMED).
**Ownership:** Chief owns `src_scroll/levels/*.json` (`docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`). Nothing
here edits a level file. Sections 3 and 4 are a specification for Chief to build in the Builder, or to
hand to an agent under a named order.

---

## 1. Level design rules

### 1.1 Standing rules (binding; each traced to its source)
1. **Every exit gate costs 8.** (`CHIEF_RULING_EXIT_COST_8`.) `blockOnly` barriers are not exits and never
   count toward it.
2. **Exits are non-solid.** The player may walk past an uncharged exit. A level completes only when the
   exit is open, fully charged and overlapping the player's body. (`CHIEF_EXIT_EXPLORATION_RULE`.)
3. **Every level must be completable from zero carried charge.** Carry-over is a cushion, never a
   prerequisite. (`KIRO_FINDING_CARRY_OVER_VS_SELF_SUFFICIENCY`, ruled.)
4. **A level with enemies needs positive margin.** One hit must not make it unwinnable.
5. **A level with crates needs at least one checkpoint,** and **no level has both enemies and crates**
   (carried from the old breakdown; no shipped level has crates at all).
6. **A chest's reward is 1 pip placed straight in the reserve,** never through the bar.
   (`CHIEF_RULING_CHEST_PIP_RESERVE`.)
7. **SUPERSEDED (round 9): there is no fixed charge total for Level 1 or any level.** Chief sets each level's
   total in the Builder. Level 1 as built holds 12 against an exit of 8, and that is how the numbers in this
   document are worked out, but it is a current value, not a rule. The exit still costs 8 (rule 1).
8. **Chief owns the level files.** Agents do not write them without a named order. `level_guard.mjs`
   runs before every push.

### 1.2 Teaching rules for tutorial levels (RECOMMENDED)
These turn "a rich exploration tutorial" into something testable.

| # | Rule | Why |
|---|---|---|
| T1 | **See, try, payoff** within 15 seconds. A mechanic is visible before it is needed, tried once in a safe place, and rewarded visibly. | Teaches by doing, not by text. |
| T2 | **No dead walking.** Every 600 px window (8 s at walking speed) of the main route holds at least one beat: an interaction, an NPC, a readable event or a new view. | The measured reason Level 1 feels empty today (section 4.2). |
| T3 | **Failure is cheap near a new verb.** No pit, enemy or timer within the first 15 seconds of meeting a mechanic. | Experimentation must not be punished. |
| T4 | **Hints are observations, never instructions** ("that machine's dead; they run on a few volts"), so the world teaches and text only confirms. | `GAME_DESIGN_V2` section 8. |
| T5 | **Optional content never blocks the exit and never taxes it.** Its permanent cost is bounded (section 6). | Protects the 12-versus-8 economy. |
| T6 | **The environment teaches first; the objective card confirms.** | CONFIRMED that the card stays. |
| T7 | **One new ability per beat.** Exploration is rich, but absorb, spend, reclaim, platform and secret are introduced one at a time. | Carried from v1: early levels teach one concept at a time. |

### 1.3 Movement envelope rules (RECOMMENDED, from the measured controller)
A new player walks. They may not discover Shift. So Level 1's **required** path obeys the walking limits.

| Requirement | Walking player | Sprinting player | Source |
|---|---|---|---|
| Required horizontal gap | at most 1 tile (32 px) | at most 2 tiles (64 px) | Appendix A: max cleared is 1 and 3 |
| Required climb | at most 2 tiles (64 px) | at most 2 tiles | Appendix A: max reached is 3 |
| Optional or hard gap | not allowed | 3 tiles (96 px) | the physical limit, not a target |
| Corridor to jump through | at least 5 tiles (160 px) of headroom | same | 99 px jump plus 30 px body |

**These numbers are provisional.** The movement retune (GAME_DESIGN_V2 section 4.3) can change gap reach.
They are re-derived from the new measurements (Appendix A) before any new geometry is placed.

### 1.4 Charge cost rules for props (RECOMMENDED)
The 12-versus-8 economy stays safe only if optional spending cannot strand the player.

| Class | Behaviour | Counts against the 4 spare? |
|---|---|---|
| **Reclaimable charged object** | Charge goes in, the prop reacts, E drains it back out. | Only if the player takes it back. Charge left in a prop when the player exits is lost (CONFIRMED round 2, see 3.3), so abandoned charged objects count. |
| **Permanent payoff** | Charge is consumed for a lasting reward. | **Yes.** The sum of all permanent costs in the level must be **at most 4.** |
| **Mandatory spend** (the exit, or a required platform) | Required to finish. | Counted in the 8, or documented as reducing the spare. |

Worked check: sources 12, exit 8. If a secret costs 2 permanently and a ferry holds 2 unrecoverably,
the player ends with 12 - 2 - 2 = 8, exactly enough. Any more and the level can strand a careful player.

---

## 2. The roster

### 2.1 What exists today (BUILT, from the manifest and the level files)

All six levels are in `src_scroll/levels/levels.json`. **All are PAUSED** except Level 1.

| # | Name (manifest) | Size | Sources | Exit | Contents | What it actually teaches |
|---|---|---|---|---|---|---|
| 1 | NEON RISE | 100 x 18 | 3 lamps x 4 = **12** | 8 | 1 checkpoint, 3 NPCs, no enemies, parallax on | Absorb, carry, discharge into a gate |
| 2 | SPLIT DECISION | 100 x 36 | 2 lamps x 4 = 8 | 8 | fence plus a switch (cost 2), a chest behind it (cost 2, reward 10), 1 checkpoint, no enemies | Spend-or-save, with a real fork |
| 3 | DON'T GET HIT | 100 x 18 | 6 sources x 4 = 24 | 8 | 1 drone, a chest, 1 checkpoint, 20 building backdrops | Being hit scatters charge; recover it |
| 4 | CARRY CURRENT | 100 x 18 | 3 x 4 = 12 | 8 | 3 drones, 1 checkpoint, greybox | Carry charge across a hostile stretch |
| 5 | LIVE WIRE | 100 x 18 | 4 x 4 = 16 | 8 | fence plus switch "CUT POWER" (cost 4), 4 drones, 2 checkpoints, greybox | Spend under pressure |
| 6 | DESCENT | 40 x 40 | 2 x 6 = 12 | 8 | vertical map, 1 checkpoint, no enemies, greybox | Unclear: vertical traversal, or a stub |

No level uses crates, ladders, grapple anchors or moving platforms. Only Level 1 has NPCs.

### 2.2 Where the roster has drifted from the old plans (BUILT)
The old breakdown and the v1 roadmap are now wrong in these places. They are not being corrected in the
archive; the roster above is the truth.

| Old plan said | The game has |
|---|---|
| Level 2 sources 4 + 6, exit 6 | 4 + 4, exit 8 (the exit part was the exit-cost ruling) |
| Level 2 chest should be free | cost 2, reward 1 pip behind the fence |
| Level 3 is a published stub | a full level with a drone and a chest |
| Level 4 has one drone | three drones |
| Level 5 is "Power and Position" with a conductive crate | "LIVE WIRE": a fence-and-switch level with four drones and **no crate** |
| Level 6 is "Grounded" | "DESCENT", a vertical level |
| Levels 7 to 10 (timed circuit, chain reaction, mixed test, finale) | not built |

The crate mechanic exists and is tested, but **no shipped level uses it.** The "checkpoint required with
crates" rule and the "no enemies with crates" rule are therefore enforced by tests but untested by content.

### 2.3 Prover status on the paused levels (BUILT)
- `completability.mjs`: 39 pass, 3 fail, **all three failures are Level 2 and are false.** The prover
  hard-codes 18 rows and scans only the top 18 of Level 2's 36, concluding 62% of the level is void. A real
  scan finds terrain to the end. The same bug mis-measures Level 6.
- `level2_fork.mjs`: 34 pass, 11 fail, mostly the same bug.
- **Level 5's fence failures look genuine:** the test finds a jumping player at apex overlapping the
  fence, so the fence may be skippable and its 4-charge switch not truly mandatory.
- **RECOMMENDED:** fix the prover's row count before the movement-retune route check, or the check proves
  nothing for Levels 2 and 6. This is test infrastructure, not design work, and does not resume Levels 2 to 6.

### 2.4 Should parts of Level 2 move into Level 1? (CONCEPT: "an option to evaluate")

| Level 2 element | Move into Level 1? | Reasoning |
|---|---|---|
| The fork | **Already there.** Level 1 has a high/low split at x about 1500. | Keep it as an exploration reward (CONFIRMED). |
| Switch plus fence | **Not recommended** | It is a costly decision ("spend 2 or skip"). That lesson belongs to Level 2, and a mandatory 2 would cut Level 1's spare. A *secret* built from a switch and a barrier is fine (section 4.6). |
| Chest (1 pip) | **Not recommended** | With a 10-unit bar (round 10) Level 1 can bank a pip from its spare lamp, but a chest still adds a second pip source to a tutorial, so it is not recommended for Level 1. (The chest's refusal bug is replaced by the pickup design, GAME_DESIGN_V2 3.7.) |
| The cost of a decision | **Already satisfied** by reclaimable charged objects | Charged objects teach "charge is something you spend" without a punishing choice. |

**CONFIRMED (round 2): keep Level 2 separate.** Level 1 borrows its *tools* (a switch, a barrier) for the
secret route, and Level 2 keeps its *lesson*. Chief adds: Level 1 must become **more in depth and dynamic**,
through **ladders and vertical traversal.**

---

## 3. Level 1: world and dressing

Everything here is a specification. Tags say what is decided.

### 3.1 What Level 1 contains today (BUILT, parsed from `level1.json`)
See Appendix B for coordinates. In short: a 100-column street, 3 identical streetlight sources, one exit
gate, one checkpoint, three NPCs and 129 decorations.

- **109 of the 129 decorations are a single blue-rooftop tile pattern** forming a backdrop behind the low
  street. Only **20 are real building facades** (warehouse, library, filler walls, one industrial wall).
- **Everything draws behind the tiles.** Nothing is layered in front of the player.
- **Not placed at all:** neon signs, fuse boxes, security cameras, pipes, vending machines, placed litter,
  and the Neon Rise prop pack, even though the art exists. Building families that exist as art but are not
  in Level 1 at `5ad4f1b`: convenience store, Garry's Electronics, tire shop, coffee bar, apartment complex.
- **Rows 0 to 9 are empty across the entire width,** about 60% of the screen.
- **Both smoke workers say the placeholder `"New line"`.** (A defect; fix before anything else.)

### 3.2 Target zones (RECOMMENDED)
One identity per zone, so the player always knows where they are. All families below already exist as art.

| Zone | Where | Look | Beat |
|---|---|---|---|
| Spawn plaza | start | filler walls, rain, a distant glow where the exit is | Orient. The exit beacon is visible. |
| Walkway | after lamp 1 | apartment block, streetlights | First spend, a pedestrian NPC |
| Rooftops | the raised block | warehouse bays, the smoke-break NPCs | Hint dialogue, fuse box and sign |
| High strip and low street | the fork | blue-rooftop backdrop (already there) | Lamp 3, the woman, the checkpoint |
| Market street | NEW | convenience store, Garry's Electronics, coffee bar, tire shop | Shutter charged object, hint NPC, a passing car |
| Overpass | NEW | the rail and train from the parallax, close up | Distant drone foreshadow |
| Gatehouse | end | brick gatehouse and the library | The payoff |

### 3.3 Powered props and charged objects (CONFIRMED direction; details RECOMMENDED)
CONFIRMED: signs, fuse boxes, shutters, lights and other props **visibly react when charged,** and **each
interaction needs a clear payoff.**

| Prop | Interaction | Payoff (must be visible and audible) | Cost class | Engine status |
|---|---|---|---|---|
| Vending machine | Give 3 | Lights up, hums, a can drops, its sign flickers on | Reclaimable (the Chief's example) | **NEW:** a prop that can receive and return charge |
| Fuse box and neon sign | Give 2 | The box sparks, the sign above it lights and animates | Reclaimable | **NEW** receiver plus a linked reaction |
| Roller shutter (market) | Give 2 | The shutter rises, revealing a lit shop interior and a hint poster | Reclaimable | **NEW** receiver plus an animated reveal |
| AC unit (secret, recoloured) | Give 2 | Fan spins up, the window NPC thanks heaven it is back on, a hatch opens to an Easter egg and a story clue | Permanent | **NEW** receiver, **NEW** reactive NPC line; the hatch is **BUILDABLE TODAY** as a Switch linked to a `blockOnly` barrier |
| Streetlights | Already absorbable | The light pool dims as they drain | n/a | **BUILT** |
| Charge platform (lift) | Give 2 | Carries the player up to the raised gate (section 4.5) | Reclaimable if taken back | Horizontal **BUILT**; vertical **NEW** |

**How a charged object keeps its charge (CONFIRMED round 2: option (a)):** a charged prop **keeps its charge until the
player takes it back.** If the player leaves through the exit gate first, the charge is **gone for good.**
That is final; the return-on-leaving option (b) is dropped.
- **Consequence for design:** every charged object the player can charge must be reachable again, or its cost counts
  against the 4 spare. Level 1 has a 160 px drop with no way back except the stairs, so each charged object needs a way
  back, or is accepted as a permanent cost.
- **Consequence for the economy:** the total of all charged objects a player could leave charged must stay at or under
  4. Three charged objects at 3 + 2 + 2 = 7 could strand a player who charges all and abandons them. So either some
  charged objects are cheap, or the level guarantees recovery before the exit, or the HUD tells the player that the
  charge stays in the prop. **RECOMMENDED:** a short "charge stored: take it back with E" tag on each charged object.
- **To verify in the prover:** that for every charged object, a route back exists from where the player would
  reach the exit.

### 3.4 City life (CONFIRMED: "substantially more"; counts and placement RECOMMENDED)

| Class | Target in Level 1 | Role | Engine status |
|---|---|---|---|
| Dialogue NPCs, **hint** | 3 | Tell the player something true about the world | **BUILT** (NPC system) |
| Dialogue NPCs, **flavor** | 4 | Voice and tone, no information | **BUILT** |
| Ambient walkers (no dialogue) | 5 to 6 | Pedestrians crossing the plaza and market | Partly: NPC patrol exists; a long crossing path may need work |
| Window silhouettes | 8 to 12 | Lit windows with shifting figures | **BUILT** (decoration animation) |
| Passing cars | 2 | Cross the background street, never the player's lane | **NEW:** a drifting ambient actor |
| Birds, steam, flickering signs, rooftop dishes | several | Fill sky and edges | **BUILT** for animated decorations; drift is **NEW** |

**NPC roles (CONFIRMED round 2):** it depends on the NPC. Some are **filler** (atmosphere), some **drive
story**, and some give hints. **There is no story for the game yet,** so the story-driving NPCs cannot be
written until one exists. The tone question (the woman's flirtatious lines) is therefore closed as
"per NPC", and the next step is a **story bible** (premise, setting, who the hero is, why the city is dark,
what the drones are) written with Chief. **Until then, story NPCs stay as placeholders.**

Rules: **one readable event per ten seconds of walking;** keep ambient actors out of the player's lane so
the route is never crowded (CONFIRMED: "without overcrowding the playable route").

**Hint copy, as examples for Chief to rewrite (RECOMMENDED):**
- Vending machine NPC or note: "Machine's been dead since the blackout. Takes a few volts, that's all."
- Smoke workers: "That gate at the end of the block? Needs eight. Three lamps on the street, so don't waste it."
- Market NPC: "Roof's AC still hums when you're near. Somebody's been up there."
Each describes something the player can *observe*, and none names a button.

### 3.5 Foreshadowing a threat (CONFIRMED allowed; method RECOMMENDED)
CONFIRMED: Level 1 may foreshadow a threat **safely,** for example a distant drone.
**CONFIRMED (round 2): tell it through story, not a live enemy.** Chief's options: an NPC who shares
knowledge (possibly a cutscene before the level that shows the real enemy), a sign that says "beware of
drones," or graffiti on a wall.
**Engine status:** an NPC line, a sign and graffiti are all **buildable today** (dialogue, decorations).
A **cutscene is new engine work** (no cutscene system exists). **RECOMMENDED:** start with graffiti plus one
NPC line, which cost nothing new, and leave a cutscene for when the story exists.
**Earlier recommendation, still true:** do not use a real enemy. A real Sky Sentry sees 240 px
sideways and 340 px up and fires a laser, so it cannot be made safe by distance alone. As an ambient actor it
cannot attack by construction, and it does not trigger the rule that levels with enemies need positive
margin or the "no enemies and crates" rule.

---

## 4. Level 1: route and layout

### 4.1 Layout today (BUILT, parsed at `5ad4f1b`)

| Columns | x range (px) | Surface (y) | Notes |
|---|---|---|---|
| 0 to 11 | 0 to 384 | 480 | Flat street, spawn at column 2 |
| 12 to 23 | 384 to 768 | 448 | Walkway, one step up. **Lamp 1** at x 451 |
| 24 to 25 | 768 to 832 | 384 | Pillar, a +64 px climb |
| 26 | 832 to 864 | none | **The only pit:** a 1-tile bottomless shaft |
| 27 to 46 | 864 to 1504 | 352 | Rooftop block. **Lamp 2** at x 933. Smoke workers at 1392 and 1438 |
| 47 to 65 | 1504 to 2112 | 512 | Sunken low street, 160 px below the roof |
| 49 to 65 | 1568 to 2112 | 320 (one-way) | High strip. **Lamp 3** at x 1664, the woman at 1741, **checkpoint** at 1824 |
| 54 to 56, 58 to 60 | 1728 to 1952 | 448 and 384 (one-way) | A staircase from the low street up to the strip |
| 66 to 75 | 2112 to 2432 | 480, 416, 384 | A step block |
| 76 to 99 | 2432 to 3200 | 480 | Flat street to the **exit gate** at x 3136 |

Height changes are at most 64 px, so every climb fits a walking jump (99 px). Nothing uses the vertical space.

### 4.2 Why it feels empty (BUILT, measured)
- **The dead stretch is x 2112 to 3136:** 1,024 px, about 14 seconds of walking, holding only a step-down and
  a flat street. It is the last thing before the goal, so the goal has no build-up.
- Other long gaps: x 480 to 768 (after lamp 1) and x 980 to 1390 (on the rooftop).
- The first spend of any kind happens at the exit, **about 40 seconds in.**
- The high/low fork is cosmetic: lamp 3 is surplus, so skipping it changes nothing.

### 4.3 Target layout (RECOMMENDED; width OPEN)
> **SUPERSEDED IN PART (round 2, 2026-09-06): Chief chose VERTICAL.** The horizontal 139-column diagram and
> the timing in section 5.1 below describe the abandoned option and are kept only as a record of the beats.
> A vertical layout (ladders, a vertical platform, floors stacked in the empty rows 0 to 9) has to be
> **redrawn from scratch** and re-timed. Not done yet. The beats, zones and teaching rules still apply.
> **Engine facts that shape it:** the camera must follow the Y axis (the level is 18 rows tall; a taller
> level needs more rows, and the prover assumes 18, see 2.3); the death plane is tied to the camera; ladders
> work today but need ladder decorations.

Sections 5 and 6 were built from the horizontal layout. It keeps everything Chief already built (the pillar,
shaft, rooftop, fork and step block) and adds three new stretches and a ferry.

**Target width (SUPERSEDED): about 4,400 px (139 columns).** At 75 px/s that is the 90 to 120 second target.
The vertical version trades width for height, so the walking distance falls and the **climbing** time has to
make up the 90 to 120 seconds. Ladder speed is 105 px/s, so a 10-tile climb is about 3 seconds.

```
x(px)  0     400  680  900       1500  1600     2112 2430    3230   3630  4010 4420
       |plaza | L1 |obj |pillar/  |roof |fork    |step |market W | E    |over|ferry|gate
       |      |    |    |shaft L2 |work |high L3 |block|shutter  | NPC  |pass|     |
```

### 4.3a The vertical layout (RECOMMENDED draft, round 3; geometry not yet checked against tiles)

**Chief said go ahead (round 3).** This replaces the horizontal plan above. It follows the rule *keep what
Chief already built*: the 100-column street stays as the ground floor, and **16 rows are added on top**
(18 to 34 rows, 576 to 1,088 px). `_kiro_tools/expand_vertical.mjs` already exists for adding rows at the
top; whoever edits the JSON must shift every decoration's `y` by +512 px. **Chief owns the level files, so
nothing here touches them; this is a spec for the Builder.**

Heights are tiles above the spawn street surface (h0 = y 480 today, row 31 after the shift).

| Zone | Columns | Height | What is there | Teaches |
|---|---|---|---|---|
| Plaza | 0 to 11 | h0 | Spawn, pedestrian, **opening ladder at col 8** (6 tiles up to a fire escape, h+6), relay pylon at col 14 | Orient. The ladder is optional and visible. |
| Walkway | 12 to 23 | h+1 | **Lamp 1** (x 451), **vending machine (3)** | First absorb, then first spend |
| Pillar and shaft | 24 to 26 | h+3, a 1-tile pit | Existing | Jump |
| Rooftop | 27 to 46 | h+4 | **Lamp 2** (x 933), smoke workers, **fuse box + sign (2)**, **ladder lesson at col 45** | Dialogue, cause and effect, climb |
| Upper roof | 40 to 52 | h+10 | Sign payoff, hint NPC, a view of the tower | Reward for climbing |
| Fork | 47 to 65 | h+5 and h-1 | Existing: high strip (lamp 3, the woman, **CP1**), low street shortcut and stairs | Choice |
| Tower base | 76 to 87 | h0 | **CP2**, the foot of the tower | Rest before the climb |
| Tower floor 1 | 84 to 99 | h+5 | Ledge walk, drone graffiti, ladder at col 97 | Foreshadow |
| Tower floor 2 | 88 to 99 | h+11 | **Shutter (2)**, hint NPC, **CP3**, the lift's foot | Last charged object before the gate |
| **Lift** | cols 86 to 88 | h+11 to h+19 | **Charge platform (2), vertical path** | The set piece |
| Gatehouse roof | 80 to 90 | h+19 | **Exit gate** (cost 8), beacon top | The payoff |

**Reach checks (all against the BUILT envelope, `LEVEL_DESIGN_V2` Appendix A):**
- Any climb up to 3 tiles is a jump (jump height 3.1 tiles). Every other climb here is a ladder, the stairs
  (existing), or the lift. **The upper roof (h+10 from h+4) is 6 tiles, so it needs the ladder.**
- Every drop is a plain fall: no fall damage exists (searched `src_scroll`). Terminal fall speed is 700 px/s,
  so the longest drop here (the tower top to the street, 19 tiles) takes under a second and a half.
- **Ladders are exact:** the engine only treats a decoration as a ladder if its `src` is
  `assets/objects/night-city-props/ladder/ladder.png` (`level.js` line 12). The art is 128 x 605 px and
  resizable in the Builder. The player grabs it with Up or Down within its x range and climbs at 105 px/s,
  and steps off at the top onto a real supporting tile. **A ladder top needs a solid tile (or one-way) at its
  top end, or the player cannot stand.** No shipped level has a ladder yet, so this is **untested in a real
  level**: build the opening ladder first and test it.

**The exit shown early, in a vertical level (replaces the beacon note in 4.4).** The gate sits at h+19, 19
tiles above the start and 2,500 px east, outside the first screen (18 rows tall). A lone beacon cannot be seen.
**RECOMMENDED: a relay pylon in the plaza plus a visible cable of lit decorations running up the skyline to
the tower.** The pylon is on screen at the start; the cable climbs out of the top of the first screen and
leads the eye to the tower. The beacon on the gatehouse roof is the same colour. All of this is ordinary
decoration (buildable today; the cable and pylon art are new).

**SUPERSEDED in round 14 (Chief, 2026-10-16): the hidden room, hatch, fire escape and room props are SCRAPPED. The AC
now belongs to the tenant sequence in section 4.3c. The text below is kept only as history.**

**The AC secret (round 4, superseded): above and behind the spawn, hinted by a window NPC.**
- **The hint (Chief's design).** An **apartment building** in the Night City prop colour palette stands by
  the plaza. In one window an **NPC complains about the heat.** That line is the hint: it tells the player
  something up there needs power, with no tutorial text.
- **The object.** The opening ladder at col 8 leads to a fire escape at h+6 with the **AC unit**. Chief wants
  the existing Night City AC unit **recoloured, with the same look and the same behaviour** (the fan and
  animation unchanged). It must be a **charged object** the player gives 2 to, not an absorbable source like
  today's HVAC (`kind: 'hvac'`, charge 4). Off state: fan still. On state: fan spinning.
- **The payoff.** When the AC unit is powered, **the window NPC's text changes to thanking God it is back on**,
  and (RECOMMENDED, a Switch linked to a `blockOnly` barrier, **buildable today**) a hatch opens to a small
  room with the **Easter egg and the first story clue** (graffiti or a poster; the text comes from the story
  bible, which is Orcha's to write).
- **The backtracking incentive.** The player starts with 0 charge, so a curious player must **leave, absorb,
  and come back.** There is no backwards level.
- **New art and work this needs:** (1) the apartment building facade in the Night City prop palette, with a
  window the NPC can stand in; (2) the window NPC sprite and pose; (3) the AC unit recolour with its fan
  frames; (4) the AC as a charged object (the receiver work, row 7); (5) **reactive NPC dialogue** (the NPC's
  lines switch when the linked AC is powered, which does not exist: `GAME_DESIGN_V2` section 7); (6) the
  hatch and room art.

**Charged objects and their reclaim paths (round 4: charged objects have their own cost system, scaled to size):**

| Charged object | Cost | Where | Way back to it from the gate |
|---|---|---|---|
| Vending machine | 3 | Walkway, h+1 | The street is reachable by the tower ladders and the lift |
| Fuse box + sign | 2 | Rooftop, h+4 | Ladders and stairs; no one-way drop |
| Shutter | 2 | Tower floor 2 | On the way to the lift |
| AC unit (permanent) | 2 | Plaza fire escape | Not reclaimed by design |
| Lift (mandatory) | 2 | Tower | Rides down while charged |

The worst case where the player buys the permanent AC payoff (2) and the lift (2) and reclaims everything
else is 12 - 2 - 2 = 8, exactly enough. A player who leaves the shutter charged must ride down and take it
back before the exit; the fail-state check has to count the charge stored in charged objects (see section 8).

**Checkpoints:** CP1 (existing, high strip), CP2 (tower base), CP3 (tower floor 2 at the lift). A fall off the
tower lands on the street, which is safe; the pit at col 26 stays the only death plane.

**What the Builder needs for this level** (all items to be confirmed with Aki): extra rows, ladder
decorations, a vertical platform path (GAME_DESIGN_V2 4.5), the charged-object props (not built, GAME_DESIGN_V2 3.5),
the pylon and cable art, and the AC hatch art.

### 4.3b The relay pylon and the ladder in Level 1 (Chief's order, 2026-10-16; the secret-room preview was REMOVED in round 14, the ladder came back)
Chief asked to see the pylon and the secret room together. He liked the pylon ("looks good") and scrapped the rest
("im not liking any of that we can scrap that for now"). `level1.json` now differs from before the preview by **one decoration only**:
- **Relay pylon:** plaza, x 576, on the walkway. Aki's art (96 x 256). Test: `_dev/level1_pylon.mjs` (16 checks; also proves the
  ladder climbs, the preview is gone and the street is unchanged).
- **What the pylon is for (RECOMMENDED, Chief asked "not sure what its doing"):** it is the **start of a lit cable line** that runs along the
  route to the exit gate, so the player always has something to follow. The cable pieces arrive with the vertical build (Aki's `light-cable`
  art, AKI 27). Until then it is scenery. Optional later: a slow lantern pulse (needs frames registered in the manifest).
- **Ladder (put back by Chief's order, round 14):** x 128, from the street up to y 288, with a one-way upper walkway at row 9, columns 3 to 13.
  The test climbs it. It is the way up to the second area (4.3c). Its art is still the old blue and purple ladder until Codex's Night City version is approved.
- **Level economy unchanged:** three 4-charge lamps (12), exit 8.

### 4.3c The tenant sequence (round 14, replaces the hidden room; Chief's design, Kiro's layout is RECOMMENDED)
CONFIRMED by Chief: a **new 4-panel apartment building** made to fit this job; a **tenant in a window**; an **AC unit that the player charges directly**;
**powering the AC makes the tenant relieved, and the achievement is awarded automatically**
(no room, no poster, no pickup).
- **Flow (CONFIRMED, Chief's own wording, 2026-10-16):** "Above the spawn area is the second level (vertical area the player can go to). Until
  they get enough charge the player can't do anything. The tenant in the window complains about the heat. The player powers on the AC unit
  (a charged object that was off). The AC fan spins and hums. She turns relieved, and GOOD NEIGHBOR is awarded automatically. An achievement pops up on screen."
  - So the sequence lives in the **upper area**, reached by the **ladder** at the start of the level. A player who climbs with an empty bar can see
    the tenant and the dark AC but cannot act yet: they go back down, absorb from a lamp, and return. That is the backtracking reason.
  - The ladder is back in `level1.json` (x 128, street up to y 288) with a one-way upper walkway at row 9, columns 3 to 13. That is only the
    **start** of the upper area; the building and the rest come with Codex's art and Aki's vertical build.
  - **Ladder art:** the current ladder is blue and purple with cyan lights. Chief wants a **Night City prop coloured** ladder; Codex makes it
    (CODEX 03 task 9). The engine needs the file to be exactly `assets/objects/night-city-props/ladder/ladder.png`, so the new art replaces that file
    after Chief approves it.
- **The control (CONFIRMED, Chief round 14b):** the player **charges the AC directly, like any other charged object.** *"Switch is only meant for powering down a
  fence."* There is no switch on the AC.
- **Both ways (CONFIRMED, Chief rounds 15 and 15b):** the AC is an **ordinary charged HVAC prop**, capacity **4** (charge table 3.9), placed **uncharged**. **It takes its whole 4
  to turn on** (Chief round 15c: "ac unit takes 4 charge"); 3 of 4 leaves it off, and zapping even a little out turns it off. No switch. Charge it with Space, zap it with E. **The tenant is relieved while it is on and gets hot again when it is off, but the achievement stays** ("let her suffer").
- **Economy (round 15; computed on the page `docs/design/OVERCHARGE_Level1_Charge_Economy.html`):** Level 1's three lamps are 3 each (9). Chief adds a 24/7 market with a
  vending machine (2) where the streetlamp woman walks (total 11), and "one more prop" (Kiro suggests the fuse box, 4, total 15). One lamp (3) is **not** enough for the
  AC (4), so the player needs two sources before the AC can be turned on. **Trap to avoid:** with 11 only, an AC left on leaves 7, one short of the exit's 8
  (the player can zap it back, so nobody is stuck for good). A total of **12 or more** removes it. **Also:** the free pip is gone (9 < 10); 11 gives 1 pip + 1.
- **Risk to check:** the market is where the streetlamp woman walks (x about 1741, next to lamp 3 at x 1664, the high route). A route that skips lamp 3 holds only 6
  from the lamps; the vending machine makes it 8. Put the market where both routes pass, or keep the low route's total at 8 or more. Kiro has not checked whether a
  lamp can be skipped in the Level 1 as built today.
- **LAYOUT NOW (Chief's Builder save and Kiro's fixes, round 16):** Level 1 is 22 rows. A real rooftop (tile 43, row 12) is the second level, reached by the street ladder (x 128, y 384 to 608). The apartment stands on it; its roof is a second slab (tile 46, row 4, x 352 to 479, surface y 128), reached by a second ladder (x 352, y 128 to 384). **The AC unit stands on the apartment roof** (x 416, y 100). The tenant goes in the **top-floor window of the left panel** once Codex's small figure and plain kit exist (`KIRO_ORDER_CODEX_05.md`); her current position (x 258, y 301) is a leftover. Where a ladder passes through a roof tile, that one tile is a **one-way hatch** (value 2), because a solid tile blocks the climb. `_dev/level1_pylon.mjs` proves the whole chain: spawn, ladder, roof, ladder, apartment roof, in range of the AC.
- **PLACED in Level 1 (round 15b, SUPERSEDED by the layout above, Chief: "I need to test the apartment girl and AC unit so place that in the game and builder"):** the four-panel building stands on the upper walkway (x 96, 288, 448, 608; top y 32; the walkway now runs x 96 to 735), the tenant is in the big front-bay window (x 518, y 237, linked to the AC), and the ordinary HVAC unit AC_TENANT (x 512, y 260, capacity 4, uncharged) hangs under her window. Test: `_dev/tenant_sequence.mjs` (29 checks, real level, real hero, real manifest frames). Everything is movable in the Builder.
- **Pieces and owners:** building art, window NPC (two animations), reactive tenant lines, AC on-state effects, achievements system: **Codex (CODEX 03 tasks
  1, 2, 6 to 8)**. The small wall-plate switch (CODEX 03 task 3) is now only for fence gates. Placement: **Aki**. Text: **Orcha**.
- **Questions for Chief (OPEN):** which extra prop (fuse box 4?), and which route the market is on (above).

### 4.4 Show the exit early (CONFIRMED; method OPEN)
(For the vertical layout, see 4.3a: pylon plus cable.) In the horizontal draft the gate was 4,300 px from
the spawn, far off-screen. Two ways to show it:

| Option | Description | Trade-off |
|---|---|---|
| **A: beacon** (RECOMMENDED) | A tall light pylon and a glow above the skyline, visible from the spawn, drawn as ordinary decorations. The card also names the exit. | Cheap; **buildable today.** The player sees *something* distant, not the gate itself. |
| **B: exit above the spawn** | The gatehouse stands on a high rooftop directly above the start. The player does a long loop, then returns to charge it. | The whole level becomes real backtracking (GAME_DESIGN_V2 pillar 3), but the return trip risks empty walking and needs a return path. |

**CONFIRMED (round 2): option A, the beacon decoration.** Option B is saved for a later level. In a
vertical Level 1 the beacon should sit at the top of the level, so the beacon also says "up".

### 4.5 Traversal in Level 1
- **Moving platform to reach the gate (CONFIRMED round 2: it moves vertically too).** The "ferry" in
  earlier drafts meant the charge platform carrying the player sideways across a gap. Chief wants it to
  **lift** the player, so it becomes the lift to the raised exit gate. **BUILT constraint: today the platform
  is horizontal only.** The vertical mode is **new engine work** (GAME_DESIGN_V2 4.5), and Level 1 cannot be
  built around it until that exists. It needs: a vertical axis, riders carried, and a defined result when
  charge runs out mid-ride.
  The platform's charge cost (2) is reclaimable only if the player takes it back. Under the round 2
  persistence rule (charge stays until reclaimed, lost on exit), a lift the player abandons costs 2 for good,
  so it counts against the 4 spare (section 1.4).
  A fall from the lift must land somewhere safe, or respawn at a nearby checkpoint (RECOMMENDED).
- **A charged wire the player glides along (CONFIRMED as "an additional concept to investigate").**
  Nothing like it exists. It is **not** in the layout. If it is later approved it would replace the ferry as
  the final set piece. Open questions are in GAME_DESIGN_V2 section 4.5.
- **Ladders are IN Level 1 (CONFIRMED round 2, overriding my earlier recommendation against them).** The
  player traverses vertically. **RECOMMENDED sequencing to protect rule T7:** teach the ladder alone, in a
  place with nothing else to do (a short, safe climb with a visible reward at the top), before the first
  lift or the AC secret. The grapple and ledge climb stay unused in Level 1.
  **Needs:** ladder decorations placed in the level (the engine ladder works only on a ladder decoration),
  a prompt for climbing, and art for any ladder that is not the existing one.

### 4.6 The fork and the secret (CONFIRMED: keep the fork as an exploration reward; secret = a possibility)
- **Fork.** High route: lamp 3 (the spare), the woman, the checkpoint and an overlook. Low route: the
  sunken street, reached by dropping 160 px, a short-cut that skips lamp 3 and the checkpoint. **Both must
  complete the level from zero** (rule 3), so lamp 3 stays genuinely optional. Make the high route the
  *rewarding* one (extra life and a checkpoint) and the low route the *fast* one.
- **Secret: SUPERSEDED in round 14 by the tenant sequence (4.3c). The hidden room and its poster are scrapped; the achievement is awarded
  automatically when the tenant is relieved. The text below is history.**
- **Secret (round 4, superseded; spec in 4.3a).** Powering the AC unit (permanent cost 2) changes the
  window NPC's line, opens a hidden room and gives an Easter egg plus a story clue. The "trophy" is that
  in-game collectible; there is no separate achievement system yet.
  **Buildable today:** a Switch (cost 2) linked to a `blockOnly` barrier that seals the alcove.
  **Trophy question, answered by Chief with "you tell me":** the point was a reason to go back. **No
  achievement or trophy system exists in the game** (searched `src_scroll`: nothing), so a literal in-game
  trophy is a new feature. **RECOMMENDED:** do not make the level run backwards (it conflicts with the
  early beacon and the vertical layout). Instead, put the AC-unit secret **above and behind the spawn**,
  reachable by a ladder the player passed at the start. The reward is an **Easter egg plus a story
  clue** (a poster or graffiti that tells the first piece of the world's story), which costs no new system.
  Add a real achievement system later, once the game has more than one level that wants it. A pip as the
  reward is not recommended. **Round 11 (Chief): the AC-secret room gives "that poster or piece of the story,
  achievement or something"**, not the Capacitor Module. The poster is the first piece of the story (it can
  now be written to the official canon). Whether an achievement needs a small system (a list, a pop-up) or the
  poster is itself the achievement is OPEN (GAME_DESIGN_V2 section 13, question F).

### 4.7 Checkpoints (RECOMMENDED)
Level 1 has one, at x 1824. With a longer route it needs at least three: before the shaft jump, at the
fork rejoin, and at the ferry's near shore. A respawn restores the bar and pips as of that checkpoint
(BUILT), so it never costs the player a lamp they have already drained.

### 4.8 What must not change (CONFIRMED)
The exit costs 8. (Round 9: the source total is no longer fixed at 12; Chief sets it.) Spawn, the three lamps, the exit and the exploration rule stay as
Chief's rulings define them. Specifically (Order 025): **do not touch the three sources or the 8-charge exit
while dressing.** Adding more *sources* is not authorized by anything here.

---

## 5. Level 1: pacing and the 90 to 120 second route

CONFIRMED: **90 to 120 seconds is the proposed main-route target,** longer exploration allowed, and a
meaningful absorb-carry-spend loop **inside the first minute.**

### 5.1 Time budget for the section 4.3 layout (SUPERSEDED: horizontal; re-time after the vertical redraw)
Assumptions: the player walks at 75 px/s, absorbs at 3 units/s, and each "beat" time is the measured time
for that interaction plus a short look at the payoff. Produced by a throwaway script (not committed; the
inputs are the table below) so the sums are arithmetic, not hand-added.

| # | Segment | px walked | walk s | beat s | total s |
|---|---|---|---|---|---|
| 1 | Spawn plaza (exit beacon visible, ambient street life) | 400 | 5.3 | 0 | 5.3 |
| 2 | Lamp 1: first ABSORB | 80 | 1.1 | 1.3 | 2.4 |
| 3 | Vending machine: first SPEND (3 given, then reclaimed) | 200 | 2.7 | 4.0 | 6.7 |
| 4 | Walkway and pedestrian NPC (flavor) | 210 | 2.8 | 3.0 | 5.8 |
| 5 | Pillar, shaft jump, onto the rooftop | 130 | 1.7 | 2.0 | 3.7 |
| 6 | Lamp 2: ABSORB | 0 | 0 | 1.3 | 1.3 |
| 7 | Rooftop run: fuse box and sign (reclaimable charged object) | 457 | 6.1 | 4.0 | 10.1 |
| 8 | Smoke workers: hint dialogue | 0 | 0 | 3.5 | 3.5 |
| 9 | Approach to the fork | 114 | 1.5 | 0 | 1.5 |
| 10 | High route A: climb to the strip, lamp 3 (the spare) | 160 | 2.1 | 2.8 | 4.9 |
| 11 | High route B: streetlamp woman (flavor) | 77 | 1.0 | 3.5 | 4.5 |
| 12 | High route C: checkpoint flag | 83 | 1.1 | 1.0 | 2.1 |
| 13 | High route D: strip-end overlook onto the street below | 288 | 3.8 | 1.5 | 5.3 |
| 14 | Step block and drop to the street | 320 | 4.3 | 2.0 | 6.3 |
| 15 | NEW Market street, west half: shutter charged object | 400 | 5.3 | 4.0 | 9.3 |
| 16 | NEW Market street, east half: hint NPC and passing car | 400 | 5.3 | 3.5 | 8.8 |
| 17 | NEW Overpass: distant drone foreshadow | 400 | 5.3 | 2.0 | 7.3 |
| 18 | NEW Ferry gap: charge platform ride (320 px gap) | 380 | 5.1 | 7.0 | 12.1 |
| 19 | Gatehouse: discharge 8, gate-open payoff | 0 | 0 | 5.7 | 5.7 |
| | **Total** | **4,099** | **54.7** | **52.1** | **106.8** |

| Result | Value |
|---|---|
| Walking the whole route, doing every beat | **106.8 s** (inside the 90 to 120 target) |
| Sprinting, still doing every beat | 84.2 s |
| Speed-run floor (sprint, only mandatory beats) | 47.4 s |
| First absorb | about 5.9 s |
| **First spend** (vending machine) | about 10.4 s |
| **Absorb, carry and spend all complete** | about 14.4 s (end of segment 3) |
| Longest walk between beats | 6.4 s (inside rule T2's 8 s) |
| Level length | about 4,420 px (139 columns) including the 320 px the platform carries |

The first minute therefore holds: absorb, carry, spend, reclaim, a pedestrian, the pillar and shaft, the
second absorb and the rooftop charged object. A second spend (the shutter) comes at about 1:25.
Note the first version of this table had a 10.7 s walk with no beat; splitting it was a design change the
computation forced, which is why the arithmetic is scripted.

### 5.1a Time budget for the vertical layout in 4.3a (RECOMMENDED, computed)
Same assumptions as 5.1 (walk 75 px/s, ladder 105 px/s) plus a **proposed lift speed of 64 px/s** (a slow,
readable ride; the engine default for platforms is 80). Beats are my estimates, not measurements. Produced by
a throwaway script (`v1_vertical_timing.mjs`, not committed); the walking distances are rough readings of
the 4.3a table, so **they must be re-measured once the tiles exist.**

| # | Segment | walk px | ladder px | lift px | move s | beat s | total s |
|---|---|---|---|---|---|---|---|
| 1 | Plaza: orient, beacon, pedestrian | 387 | 0 | 0 | 5.2 | 1.5 | 6.7 |
| 2 | Lamp 1: first absorb (4 units) | 0 | 0 | 0 | 0.0 | 2.8 | 2.8 |
| 3 | Vending machine: first spend (give 3) | 130 | 0 | 0 | 1.7 | 4.0 | 5.7 |
| 4 | Walkway, pillar, shaft jump | 330 | 0 | 0 | 4.4 | 1.5 | 5.9 |
| 5 | Rooftop, lamp 2 (absorb 4) | 180 | 0 | 0 | 2.4 | 2.8 | 5.2 |
| 6 | Smoke workers + fuse box (give 2) | 420 | 0 | 0 | 5.6 | 6.5 | 12.1 |
| 7 | Ladder lesson: rooftop to upper roof | 90 | 192 | 0 | 3.0 | 3.0 | 6.0 |
| 8 | Upper roof: sign payoff + hint NPC | 260 | 0 | 0 | 3.5 | 3.5 | 7.0 |
| 9 | Fork: drop to the high strip, lamp 3 | 240 | 0 | 0 | 3.2 | 2.8 | 6.0 |
| 10 | Woman NPC + checkpoint | 160 | 0 | 0 | 2.1 | 3.5 | 5.6 |
| 11 | Walk to the tower base | 330 | 0 | 0 | 4.4 | 0.0 | 4.4 |
| 12 | Tower floor 1: ladder (5 tiles) | 70 | 160 | 0 | 2.5 | 1.5 | 4.0 |
| 13 | Tower floor 1: ledge walk, drone graffiti | 300 | 0 | 0 | 4.0 | 4.0 | 8.0 |
| 14 | Tower floor 2: ladder (6 tiles) | 60 | 192 | 0 | 2.6 | 1.5 | 4.1 |
| 15 | Tower floor 2: shutter (give 2) | 220 | 0 | 0 | 2.9 | 6.0 | 8.9 |
| 16 | Lift: charge the platform (give 2), ride 8 tiles | 80 | 0 | 256 | 5.1 | 3.0 | 8.1 |
| 17 | Gatehouse roof: approach the gate | 200 | 0 | 0 | 2.7 | 1.0 | 3.7 |
| 18 | Gate: discharge 8, gate-open payoff | 0 | 0 | 0 | 0.0 | 5.7 | 5.7 |
| | **Total** | **3457** | **544** | **256** | **55.3** | **54.6** | **109.9** |

Results: the route takes **about 110 s**, inside the 90 to 120 s target. The first absorb lands at **8.0 s**
and the first spend at **12.2 s** (the first-minute loop is met). The longest run without a beat is **6.9 s**
(under the 8 s rule). Sprinting everything and skipping every beat takes **36.3 s**, so the floor is short;
exploration (the opening ladder, the AC secret, the low route) is what adds time, as intended.
**Scope rule (Chief, round 12): one level at a time. This table and the economy section are about Level 1 only; do not rework Levels 2 to 6 yet.**

**Round 11 changes this: Chief chose a charge speed that is SLOW when the bar is empty (1.2 units/s) and reaches 3 units/s only when full (GAME_DESIGN_V2 3.3).** Calculated by simulation (_kiro_tools/absorb_time.mjs): the first 4-unit lamp takes **2.6 s instead of 1.3 s**, so the first absorb lands at about **9.3 s** instead of 8.0 s, and absorbing all three lamps (to 1 pip plus 2 charge) takes **6.55 s instead of 4.0 s**. Charging a gate is slower for the same reason when the bar is low. The route total in this table therefore grows by roughly 3 to 5 s; re-run it once the rule is built. The lift (segment 16) is the single new thing the player waits for;
if it feels slow, raise its speed rather than shorten the ride.

### 5.2 What this table cannot tell us
It is a model. **It must be checked with a timed run** by a person or a scripted walker. New players dawdle,
read, or get lost, which adds time; skilled players skip optional charged objects, which removes it.

---

## 6. Level 1: economy

### 6.1 Trace from zero (BUILT numbers, CONFIRMED rules)
- Sources: lamp 1 (4), lamp 2 (4), lamp 3 (4) = **12.** Exit **8.** Spare **4.**
- **The main route needs only lamps 1 and 2** (4 + 4 = 8) before the fork, so lamp 3 is a genuine spare.
- Reclaimable charged objects return their charge, so they cost nothing net.
- Permanent costs (section 1.4): the AC secret (2) and, worst case, the unreclaimed ferry (2) = 4.
  12 - 4 = 8, so even a player who buys every permanent payoff can still pay the exit.
- **Round 10 supersedes the next note.** The bar is 10 now, so a player who absorbs all 12 banks one pip.
  Older note, true only for a 25 bar: **Level 1 never fills the 25-unit bar:** the player can hold at most 12. So no pip is banked and **the
  reserve is never seen in Level 1** (unless the trophy is a pip).

### 6.2 The projectile case (CONFIRMED; measured)
CONFIRMED: the spare 4 does not guarantee protection from unlimited projectile spending. At 0.25 per bolt it
is **16 bolts.** Measured against the real level:

| State | Held | World left | Game's fail check | Winnable? |
|---|---|---|---|---|
| Absorbed all 12, fired 16 bolts | 8.00 | 0 | not failed | Yes, exactly |
| Absorbed all 12, fired a **17th bolt** | 7.75 | 0 | **not failed** | **No** |
| Lamps 2 and 3 drained, holding 3, lamp 1 intact | 3 | 4 | not failed | **No** (3 + 4 = 7) |
| Everything drained, holding 7 | 7 | 0 | **not failed** | **No** |
| Everything drained, holding 0 | 0 | 0 | failed | No, and the game says so |

**The game detects a stuck player only when they hold exactly 0.** With 7.75 held and nothing left to
absorb, the player is stuck and nothing tells them. They can only recover by falling into the shaft at
column 26 (the sole pit), which respawns them and refills the lamps, or by reloading. There is no in-play
respawn key.
- **BUILT defect, not fixed.** `Level.isFailState` returns false whenever `usableEnergy > 0`.
- **RECOMMENDED:** the fail test becomes "held plus all reachable income is less than the remaining cost,"
  whatever the player holds. Pair it with a visible "out of charge: press R to retry from checkpoint,"
  and add an in-play respawn key. This is a **runtime change** (outside this documentation task) and is on
  the work list. It also removes the need to hide the bolt in Level 1 for safety, though GAME_DESIGN_V2
  section 6 still asks whether to hide it for clarity.

### 6.3 Pips and gates in Level 1
Tested rules (GAME_DESIGN_V2 3.2) apply but are not exercised: with at most 12 held, the bar pays every
gate and no pip is spent. They matter from the first level that has a chest.

---

## 7. Level 1: definition of done

Level 1 is "completely finished" when **all** of these are true. Items marked (test) are to be written; none
exist yet.

**Design**
1. A new player completes absorb, carry and spend within 60 s of spawn, unprompted. (timed run)
2. The main route takes 90 to 120 s walking. (timed run, and the computed budget)
3. No 600 px window of the main route lacks a beat. (test: scan the level file)
4. Every placeholder line is gone (`"New line"`).
5. The exit is visible or signposted from the spawn.
6. The fork is a real choice; both branches complete from zero charge. (test)
7. Hints read as observations. (Chief review)

**Economy and safety**
8. The level's total charge (set by Chief) pays the exit (8) plus every mandatory spend, and permanent
   optional costs still leave at least 8 for the exit. (test, reading the total from the level data)
9. Every charged object can be reached again from the gate by two-way paths only (ladder, stairs, lift), never only by a
   one-way drop. (test) This replaces "the sum of permanent costs is at most 4".
10. A stuck player is detected and offered a retry. (needs the fail-state fix)

**Engine and content**
11. Reclaimable-charge props exist, react visibly and audibly, and have a regression test. (NEW engine)
12. ~~The text "Charge gate to open." appears above exit gates in the world~~ (DROPPED by Chief, round 18); the stage 1 card reads
    "Try absorbing power from a street lamp" (done). (GAME_DESIGN_V2 8.2)
13. Movement is retuned, with Appendix A's before and after both filled in.
14. Every route in all six levels is re-verified after the retune.
15. Replacement music exists, or Level 1 ships silent by Chief's choice.

**Process**
16. The browser, node and parity suites pass, with failures attributed to their cause.
17. `level_guard.mjs` passes. Chief signs off in the Builder.

---

## 8. Work list

Ordered by dependency. "Content" means authored in the Builder (Chief). "Runtime" means code in
`src_scroll/`. "Art" means sprites and animation.

| # | Work | Kind | Depends on | Status |
|---|---|---|---|---|
| 1 | Remove the two `"New line"` placeholder lines | Content | none | CONFIRMED defect |
| 2 | Fix the prover's hard-coded 18 rows | Test infra | none | **DONE round 10**: `completability` 42/0, `level2_fork` 44/2, plus the reachability prover now settles until grounded and follows long drops. Two stale 18-row guards (`camera_vertical`, `level_height`) updated for the 36-row Level 2. |
| 3 | Fail-state fix, in-play respawn, and "out of charge" prompt | Runtime | none | **ALREADY BUILT (verified round 18)**: `Level.isFailState` counts player charge, banked pips, undrained sources (including charge held in two-way objects), platforms, pickups and chests; the DISCHARGED screen reads "Not enough charge to power the exit." with [R] Retry. Falling off the level respawns at the last checkpoint. |
| 4 | Objective-card stage 1 line (two places) | Runtime | none | **DONE round 3** ("Try absorbing power from a street lamp"). The "Charge gate to open." world label above exit gates is still to build. |
| 5 | Movement retune with before and after (Appendix A) | Runtime | 2 | CONFIRMED authorized |
| 6 | Route verification across all six levels | Test | 2, 5 | CONFIRMED |
| 7 | **Two-way charged objects**: `capacity` plus `startCharge` on every source, a `receive()` that revives a drained object, conservation test, checkpoint snapshot | Runtime | none | CONFIRMED round 5; blocks 9 |
| 8 | Juice module (particles, shake, hit-stop) and land/jump feedback | Runtime | 5 | **FIRST PASS BUILT round 10** (`juice.js`, 32 tests); needs Chief's eyes and tuning |
| 9 | Charged-object payoffs: vending machine, fuse box and sign, shutter, AC unit | Art + runtime | 7 | CONFIRMED direction |
| 10 | Ambient actors: pedestrians, passing cars, drifting birds | Runtime + art | none | CONFIRMED direction |
| 11 | Ducking and double-jump **animations** (no ability implied) | Art | none | Duck: Chief says the hero has one (note: in the hero-v6 pack `duck` is still a stand-in for idle). **Double-jump: DONE round 18**, art only: `hero-v6/double-jump`, 16 frames, 0.67 s, not wired to any input. Preview: `docs/reference/double_jump_preview.png` |
| 12 | Audio bus and effects: absorb hum, gate open, charged objects, land, ambience | Runtime + audio | none | **FIRST PASS BUILT round 10** (`audio.js`, 34 tests, not yet heard by a person). Ambience and the charged-object reactions are still to do. |
| 13 | Replacement Level 1 music | Audio (Kiro) | 12 | CONFIRMED; pending assets |
| 14 | Lengthen or stack Level 1; place zones, NPCs, props, beacon | Content | 1, 4, 7, 9, 10 | Chief |
| 15 | Hint copy and NPC role tags | Content | 14 | RECOMMENDED |
| 16 | ~~The AC-unit secret: hatch, room, Easter egg and clue~~ **SCRAPPED round 14**; replaced by the tenant sequence (4.3c, rows 49 to 51, 53) | Content + art | none | SUPERSEDED |
| 34 | **Apartment building in the Night City prop palette**, with a window NPC position | Art (Aki) | none | CONFIRMED round 4 |
| 35 | **Window NPC** sprite (complaining pose, thankful pose) | Art | 34 | CONFIRMED round 4 |
| 36 | **AC unit recolour**, same animation and behaviour, as a charged object | Art + runtime | 7 | CONFIRMED round 4 |
| 37 | **Reactive NPC dialogue**: a second line set shown while a linked object is powered; rewinds on checkpoint | Runtime + Builder | 7 | NEW, CONFIRMED round 4 |
| 17 | Level 1 pacing, economy and coverage tests | Test | 14 | RECOMMENDED |
| 18 | Chest at the pip cap: "CHARGE FULL", pip drops as a pickup (replaces "refund") | Runtime + art | none | CONFIRMED design, reading OPEN |
| 19 | Gate the dev keys (`P`, `F2`, `[`, `]`) | Runtime | none | **DONE round 18**: F2 and P work only in dev mode (localhost or `?dev=1`); the controls bar shows the dev hints only there |
| 20 | Regenerate `docs/reference/PLAYER_MOVEMENT_METRICS.md` | Docs | 5 | CONFIRMED |
| 21 | **Q pip use**: instant gate open, amend the "no one-press" comment, update `pip_gate_spend` | Runtime + test | none | CONFIRMED round 3 |
| 22 | **Charge-speed scaling** (see GAME_DESIGN_V2 3.3: original for charging, mine for absorbing, OPEN) and HUD tell | Runtime + test | none | CONFIRMED mechanic; curve OPEN |
| 40 | **10-unit bar and pip slots**: `MAX_CHARGE` becomes 10, a pip is 10, the player starts with 1 slot, HUD reads / 10 with dim locked icons, tests rewritten (CODEX 02 task 1) | Runtime + test | none | CONFIRMED round 12 |
| 41 | **Capacitor Module pickup** (adds one pip slot): entity, animation, checkpoint rule, Builder placement | Runtime + Builder | 40 | Later (not Level 1) |
| 42 | **Capacitor Module art** (48 x 48, 8-frame idle) | Art (Kiro) | none | **DONE round 10** |
| 43 | **Charge bar colours** red, yellow, cyan | Runtime | none | CONFIRMED round 10 (Kiro) |
| 44 | Decide where the first Capacitor Module appears (not Level 1, not the AC-secret room) | Design | 41 | Later, Chief |
| 45 | **Charge table** in one place in code; Builder defaults per object kind (GAME_DESIGN_V2 3.9) | Runtime + Builder | none | CONFIRMED round 11 (CODEX 02 task 4, AKI 26 addendum) |
| 46 | **Q**: a pip pays the gate's 8, the other 2 returns to the bar (already built by Codex Phase A; add the edge-case tests) | Runtime + test | none | CONFIRMED round 12 (CODEX 02 task 2) |
| 47 | **Charge speed: slow when empty, faster when full**, both directions, 1.2 to 3 units/s | Runtime + test | 40 | CONFIRMED round 11 (CODEX 02 task 3) |
| 48 | Review pages for Chief (Capacitor Module, Aki's Part 2 art); Aki's branch merged after review | Review | none | Kiro; pages are in `docs/reference/review-pages/` |
| 49 | **Redo failed art**: window NPC (both animations), **NEW 4-panel apartment for the tenant sequence** (tiles match rooftops), pip pickup, Capacitor Module to match concept #3, **small wall-plate switch art** | Art (Codex) | Chief's reference sheet | CONFIRMED round 13, revised round 14 (CODEX 03 tasks 1 to 5) |
| 50 | **Relay pylon in Level 1** (the secret-room preview was removed in round 14) | Content (Kiro, by Chief's order) | none | **DONE**, `_dev/level1_pylon.mjs` 12/0 |
| 51 | **Tenant sequence runtime** (plate Switch is now fence-only): reactive tenant lines and relieved animation, AC on effects, **achievements system** (automatic unlock "GOOD NEIGHBOR") | Runtime (Codex) | 49 not required | CONFIRMED round 14 (CODEX 03 tasks 3, 6, 7, 8). Replaces the hatch art and barrier-link tasks, which are dropped |
| 52 | **Vertical Level 1 as a separate draft file**, with proof from the provers | Content (Aki) | her Part 1 on the live line | CONFIRMED round 13 (AKI 27) |
| 53 | **Place the tenant building, tenant and AC (no switch)** in Level 1 once Chief approves the art; run the pylon's lit cable toward the exit | Content (Aki) | 49, 51 | NEW round 14 |
| 23 | **Path-based moving platforms** (waypoints, vertical, rider carry) | Runtime | none | CONFIRMED round 3 |
| 24 | **Builder path tool** for platforms (waypoints, mode, line, dots) | Builder (Aki) | 23 | CONFIRMED round 3 |
| 25 | Vertical camera and 34-row Level 1: add rows, shift decorations +512 px | Content | 1 | Chief |
| 26 | Test a ladder in a real level (none exists); ladder art and tops | Content + test | none | RECOMMENDED |
| 27 | Pip pickup object and art | Art + runtime | 18 | NEW |
| 28 | Per-level ability list: hide bolt and melee in Level 1, prompts and dev bar | Runtime | none | CONFIRMED round 3 |
| 29 | Ducking (standard from frame 1, dodges attacks; hold Down, shorter hitbox; Down + jump drops through) and unlockable double jump (after the tutorial levels): abilities, art | Runtime + art | 5 | CONFIRMED rounds 5 and 7 |
| 38 | **Builder "Uncharged" checkbox** on every charged object (default: charged), a capacity field, and a live "level total" readout | Builder (Aki) | 7 | CONFIRMED round 5 |
| 39 | **Per-level objective system** (the card exists only for Level 1) so Level 3 can teach the bolt | Runtime | none | CONFIRMED round 5 |
| 30 | Charged-object pricing applied to props; charge stored in objects counted by the fail-state check | Runtime | 7, 3 | CONFIRMED prices; RECOMMENDED check |
| 31 | Relay pylon, light cable and tower beacon art (the early-exit signpost) | Art + content | 25 | RECOMMENDED |
| 32 | Story bible, then story NPC lines and the AC-room clue | Writing | none | Started: `docs/archive/STORY_BIBLE_DRAFT.md` |
| 33 | ~~"Charge gate to open." world label above exit gates~~ | Runtime | none | **DROPPED by Chief, round 18** ("dont need it") |

### 8.1 Who does what (issued 2026-10-14)
| Owner | Order | Rows |
|---|---|---|
| Codex | `docs/orders/KIRO_ORDER_CODEX_01.md` | 3 (fail state), 7 (two-way objects), 18 (chest and pip pickup), 21 (Q pip), 22 (charge speed), 23 (path platforms), 28 (abilities), 29 (duck; double jump not yet), 33 (gate label), 39 (objectives), plus reactive NPC dialogue (37) and player events for juice |
| Aki | `docs/orders/KIRO_ORDER_AKI_26.md` | 24 (path tool), 25 (rows), 26 (ladder test), 34 to 36 (apartment, window NPC, AC recolour), 38 (Uncharged checkbox and readout), 27 and 31 (pip pickup, pylon, cable, beacon art), 16 (hatch and room dressing) |
| Orcha | `docs/orders/KIRO_ORDER_ORCHA_19.md` | 15 and 32 (story, premises, dialogue). Writing only. |
| Kiro | this document | 2 (prover rows), 5 and 6 (retune and route checks, after Codex), 8 (juice module), 12 and 13 (audio bus, music), hero duck and double-jump frames, review of every order's output |
| Chief | the Builder | 1 and 14 (placing everything in Level 1, removing "New line"), tuning the lift and charge curve in play, approving art and story |

Out of scope until Chief says otherwise: Levels 2 to 6, a charged-wire glide, new movement abilities,
passing the replacement music into the build.

---

## 9. Decision ledger

### CONFIRMED by Chief
Everything in GAME_DESIGN_V2 section 13, plus: Level 1 expands as needed; the 12-versus-8 economy stays;
show the exit early; keep an optional fork as an exploration reward; more NPCs and customized dialogue;
atmosphere with pedestrians, windows and possibly cars; no empty walking stretches; the objective card
stays; Levels 2 to 6 are paused.

### Evaluate or investigate (CONCEPT)
Merging parts of Level 2 (RECOMMENDED against); a moving-platform route to the gate (constrained to
horizontal); a charged-wire glide (not in the layout); the AC-unit secret and its trophy; passing cars.

### RECOMMENDED by Kiro
Teaching rules T1 to T7; the movement envelope in 1.3; prop cost classes in 1.4; zones in 3.2; the charged object
reclaim tag in 3.3; the city-life counts in 3.4; graffiti plus one NPC line for the foreshadow in 3.5; the
ladder-first sequencing and the no-backwards trophy in 4.5 and 4.6; three checkpoints in 4.7 (to be redone
for the vertical layout); the timing budget in 5.1 (superseded, to be redone); the fail-state fix in 6.2;
the work list ordering in 8.

### CONFIRMED by Chief (round 2, 2026-09-06)
- Level 1 goes **vertical**, with **ladders** and a **vertical** charge platform (the lift). (4.3, 4.5)
- The exit is shown early with the **beacon decoration** (option A). (4.4)
- A prop's charge stays until reclaimed; leaving through the exit forfeits it. (3.3)
- The foreshadow is told through **story** (an NPC, a sign, graffiti). (3.5)
- **Level 2 stays separate.** (2.4)
- NPC tone depends on the NPC (filler, hint, story). **The game needs a story.** (3.4)
- Bolt and melee hidden in Level 1; "Charge gate to open." is a world label above exit gates; pip use is
  instant and separate from charging (all in GAME_DESIGN_V2 section 13).

### CONFIRMED by Chief (round 9, 2026-09-06)
- **No level has a fixed charge total.** Chief sets whatever each level needs, Level 1 included. The 12 in this
  document is Level 1 as built, used for the worked examples. Exit cost 8 and completable-from-zero still hold.
- The Builder places a charged object **charged by default, with an "Uncharged" checkbox.** (Replaces my
  earlier "default uncharged" recommendation.)
- **Consequence:** the economy checks in sections 1.4 and 6 should read the level's own total from the level
  data, not assume 12. The "4 spare" in the worked examples is Level 1's current spare (12 minus 8).

### CONFIRMED by Chief (round 6, 2026-09-06)
- Level 1 stays as is: the three existing lamps stay charged (4 each, 12 in total today). The charge-speed
  formula is Kiro's recommendation, to be tuned in play.

### CONFIRMED by Chief (round 5, 2026-09-06)
- Every charged object works both ways (absorb and charge) and the Builder places it charged or uncharged.
  **Consequence:** every object placed charged adds to the level's available charge. Round 9: Chief sets the
  total, so this is a readout, not a cap, and the Builder checkbox is "Uncharged" (default charged).
- Pips come only from chests or from absorbing enough charge to fill the bar.
- Ducking is standard from the first frame and dodges attacks (no effect in Level 1, which has no attacks).
- The Level 3 objective card teaches the bolt. Cutscenes are skipped until the story exists.

### CONFIRMED by Chief (round 4, 2026-09-06)
- The word is **charged object**, not "toy".
- Charged objects have their own cost system, separate from the source power system.
- The secret's hint is a **window NPC** in a Night City palette apartment building; powering the recoloured
  AC unit changes her line and opens the secret. (4.3a)
- Tower position and lift speed: Kiro's call (east end; 64 px/s), to be tuned in play.
- Story is Orcha's. Drained lamps do not relight at level end.
- Q does nothing with no pip; the chest still takes its payment; double jump comes after the tutorial levels.

### CONFIRMED by Chief (round 3, 2026-09-06)
- Draw the vertical layout (done as a draft, 4.3a). The secret is an Easter egg plus a story clue as an
  in-game collectible, above and behind the spawn, reached by the opening ladder. (4.6)
- The platform does both sideways and up/down with author-set paths. (GAME_DESIGN_V2 4.5)
- Prices follow prop size; Kiro sets them. (GAME_DESIGN_V2 3.5)
- Start the story bible. (`docs/archive/STORY_BIBLE_DRAFT.md`)

### OPEN questions (need Chief)
1. **Check the 4.3a draft** in the Builder: zone heights, the 34-row total, the lift's route, the
   pylon-and-cable signpost. Chief has not reviewed it yet. The lift speed and tower position are Kiro's
   call for now (64 px/s; east end) and need playtesting.
2. **Story direction.** Chief will pick; Orcha writes. (`docs/archive/STORY_BIBLE_DRAFT.md`)

---

## Appendix A: movement baseline and retune protocol

### A.1 Baseline, before any retune (BUILT, measured by the real controller)
Source: `docs/reference/agent-training/player_metrics_harness.mjs`, 60 Hz fixed step, run on commit `5ad4f1b`.
The existing `docs/reference/PLAYER_MOVEMENT_METRICS.md` is stale (it lists a 450 px screen and 14 rows; the game is
578 px and 18 rows). **This table is the new reference.**

| Metric | Before | After retune |
|---|---|---|
| Screen / rows | 800 x 578 / 18 | (unchanged) |
| Walk top speed | 75.00 px/s | to be measured |
| Sprint top speed | 127.50 px/s | to be measured |
| Walk acceleration (to 90%) | 1 frame (instant) | to be measured |
| Sprint acceleration (to 90%) | 12 frames (0.200 s) | to be measured |
| Walk deceleration (to rest) | 10 frames (0.167 s) | to be measured |
| Sprint deceleration | 12 frames (0.200 s) | to be measured |
| Air control | 75 px/s, instant | to be measured |
| Jump initial vy | -415 px/s | to be measured |
| Jump height | 99.17 px (3.099 tiles) | to be measured |
| Time to apex | 0.450 s (27 frames) | to be measured |
| Total airtime | 0.933 s (56 frames) | to be measured |
| Max gap, walking | 1 tile (32 px) | to be measured |
| Max gap, sprinting | 3 tiles (96 px) | to be measured |
| Max ledge, walking and sprinting | 3 tiles (96 px) | to be measured |
| Terminal fall speed | 700 px/s | to be measured |
| Frames to land from the harness drop | 66 | to be measured |

### A.2 Retune protocol (CONFIRMED requirement; procedure RECOMMENDED)
1. Fix the prover's row count first (work item 2), so the results mean something for Levels 2 and 6.
2. Apply one change at a time (jump cut, fall multiplier, walk ramp, look-ahead), re-running the harness
   after each, so any loss of reach is attributed to its cause.
3. Fill in the "After" column. A change that **reduces maximum height** is rejected. One that reduces
   **horizontal reach** is allowed only if every *required* traversal in all six levels still passes.
4. For each level, list every required gap and climb from its tile data and compare with the new
   envelope (a script is to be written). Level 1's are in Appendix B: a 1-tile shaft, a +64 px pillar,
   a +32 px roof step, a 64 px gap onto the high strip, and a 160 px drop.
5. Re-run `completability`, `level2_fork`, `energy_authority`, `pip_gate_spend` and the browser suites.
6. This verification **does not** resume design work on Levels 2 to 6 (CONFIRMED). If a route breaks, it is
   reported to Chief, not fixed.
7. Regenerate `docs/reference/PLAYER_MOVEMENT_METRICS.md` from the same harness.

## Appendix B: Level 1 as built (BUILT, parsed from `level1.json` at `5ad4f1b`)

| Item | Detail |
|---|---|
| Size | 100 columns x 18 rows = 3200 x 576 px |
| Spawn | (64, 450), feet land on the street at y 480 |
| Sources | Lamp 1 `src_4` at (451, 417); lamp 2 at (933, 323); lamp 3 at (1664, 292). Each charge 4, 8 animation frames |
| Exit | `gate_1` at (3136, 416), 32 x 64, required 8, `isExit` |
| Checkpoint | `CP1` at (1824, 320) |
| NPCs | Smoke worker A (1392, 352) and B (1438, 352): scale 0.5455, ambient smoke 4 to 9 s, dialogue radius 100, line `"New line"`. Streetlamp woman `NPC_STREETLAMP_01` at (1741, 320), patrol 32 px at 22 px/s, dialogue radius 112, four lines |
| Decorations | 129: 109 blue-rooftop tiles, 12 filler walls, 3 warehouse, 4 library, 1 industrial wall; all behind the tiles |
| Background | `night-city-rail`, with `backgroundOffsets: { mid: -72 }` |
| Enemies, switches, platforms, chests, crates | none |
| Objective card | Stage 1 "NEED TO POWER UP / Absorb power from street lamp"; stage 2 "POWER THE EXIT / Absorb enough energy to exit gate". Level 1 only, hard-coded in `ui.js` |
