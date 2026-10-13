# OVERCHARGE: Level Design V2

**Status:** Draft 1 for Chief's review. Written after commit `5ad4f1b` (2026-10-13).
**Supersedes:** `docs/archive/OVERCHARGE_LEVEL_BREAKDOWN.md`, the Level 3, 4/5 and 5 briefs, the first
Level 1 world-build plan and the route preview (all kept unchanged in `docs/archive/`).
**Companion:** [`GAME_DESIGN_V2.md`](GAME_DESIGN_V2.md). Tags (CONFIRMED, CARRIED, BUILT, RECOMMENDED,
CONCEPT, OPEN) are defined in its section 0 and used identically here.
**Focus:** Level 1 is the only level in active development. **Levels 2 to 6 are paused** (CONFIRMED).
**Ownership:** Chief owns `src_scroll/levels/*.json` (`KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`). Nothing
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
7. **Level 1 keeps 12 charge available against an exit of 8.** (CONFIRMED.) The extra 4 supports
   experimentation. It is not a guarantee against unlimited projectile spending.
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
| **Reclaimable toy** | Charge goes in, the prop reacts, E drains it back out. | No, provided the player can always reach it again, or it returns the charge itself (see 3.3). |
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
| Chest (1 pip) | **Not recommended** | Level 1 never fills the 25-unit bar, so a pip has no context there, and the chest has the open refusal bug (GAME_DESIGN_V2 3.7). |
| The cost of a decision | **Already satisfied** by reclaimable toys | Toys teach "charge is something you spend" without a punishing choice. |

**RECOMMENDED: keep Level 2 separate.** Level 1 borrows its *tools* (a switch, a barrier) for the secret
route, and Level 2 keeps its *lesson*. **OPEN for Chief:** agree, or name which Level 2 parts you want merged.

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
| Market street | NEW | convenience store, Garry's Electronics, coffee bar, tire shop | Shutter toy, hint NPC, a passing car |
| Overpass | NEW | the rail and train from the parallax, close up | Distant drone foreshadow |
| Gatehouse | end | brick gatehouse and the library | The payoff |

### 3.3 Powered props and toys (CONFIRMED direction; details RECOMMENDED)
CONFIRMED: signs, fuse boxes, shutters, lights and other props **visibly react when charged,** and **each
interaction needs a clear payoff.**

| Prop | Interaction | Payoff (must be visible and audible) | Cost class | Engine status |
|---|---|---|---|---|
| Vending machine | Give 3 | Lights up, hums, a can drops, its sign flickers on | Reclaimable (the Chief's example) | **NEW:** a prop that can receive and return charge |
| Fuse box and neon sign | Give 2 | The box sparks, the sign above it lights and animates | Reclaimable | **NEW** receiver plus a linked reaction |
| Roller shutter (market) | Give 2 | The shutter rises, revealing a lit shop interior and a hint poster | Reclaimable | **NEW** receiver plus an animated reveal |
| AC unit (secret) | Give 2 | A hatch or fire-escape ladder reveals a hidden route and a trophy | Permanent | **BUILDABLE TODAY** as a Switch linked to a `blockOnly` barrier; art needed |
| Streetlights | Already absorbable | The light pool dims as they drain | n/a | **BUILT** |
| Charge platform ferry | Give 2 | Carries the player across a gap (section 4.5) | Reclaimable at the far shore | **BUILT** |

**How a toy should keep or return its charge (OPEN, with a recommendation):**
- (a) *Stays until reclaimed.* Simple, and matches the charge platform. But every toy must be reachable
  again, and Level 1 has a 160 px drop with no way back up except the stairs.
- (b) *Returns when the player leaves.* The prop stays lit while the player is within range, then fades and
  hands the charge back. It can never strand anyone.
- **RECOMMENDED: (b) for the first two toys in the level,** so a new player cannot hurt themselves while
  learning, and (a) later where the level guarantees a way back. Verify "can always return" in the prover.

### 3.4 City life (CONFIRMED: "substantially more"; counts and placement RECOMMENDED)

| Class | Target in Level 1 | Role | Engine status |
|---|---|---|---|
| Dialogue NPCs, **hint** | 3 | Tell the player something true about the world | **BUILT** (NPC system) |
| Dialogue NPCs, **flavor** | 4 | Voice and tone, no information | **BUILT** |
| Ambient walkers (no dialogue) | 5 to 6 | Pedestrians crossing the plaza and market | Partly: NPC patrol exists; a long crossing path may need work |
| Window silhouettes | 8 to 12 | Lit windows with shifting figures | **BUILT** (decoration animation) |
| Passing cars | 2 | Cross the background street, never the player's lane | **NEW:** a drifting ambient actor |
| Birds, steam, flickering signs, rooftop dishes | several | Fill sky and edges | **BUILT** for animated decorations; drift is **NEW** |

Rules: **one readable event per ten seconds of walking;** keep ambient actors out of the player's lane so
the route is never crowded (CONFIRMED: "without overcrowding the playable route").

**Hint copy, as examples for Chief to rewrite (RECOMMENDED):**
- Vending machine NPC or note: "Machine's been dead since the blackout. Takes a few volts, that's all."
- Smoke workers: "That gate at the end of the block? Needs eight. Three lamps on the street, so don't waste it."
- Market NPC: "Roof's AC still hums when you're near. Somebody's been up there."
Each describes something the player can *observe*, and none names a button.

### 3.5 Foreshadowing a threat (CONFIRMED allowed; method RECOMMENDED)
CONFIRMED: Level 1 may foreshadow a threat **safely,** for example a distant drone.
**RECOMMENDED: make it a decoration or ambient actor, not an enemy.** A real Sky Sentry sees 240 px
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
Sections 5 and 6 are built from this layout. It keeps everything Chief already built (the pillar, shaft,
rooftop, fork and step block) and adds three new stretches and a ferry.

**Target width: about 4,400 px (139 columns).** At 75 px/s that is the 90 to 120 second target. The same
beats could instead be fitted into the current 100 columns by stacking vertically (the sky is empty), which
costs more Builder work and a taller camera. **OPEN for Chief: lengthen, or go vertical?**

```
x(px)  0     400  680  900       1500  1600     2112 2430    3230   3630  4010 4420
       |plaza | L1 |toy |pillar/  |roof |fork    |step |market W | E    |over|ferry|gate
       |      |    |    |shaft L2 |work |high L3 |block|shutter  | NPC  |pass|     |
```

### 4.4 Show the exit early (CONFIRMED; method OPEN)
The gate is 4,300 px from the spawn, far off-screen. Two ways to show it:

| Option | Description | Trade-off |
|---|---|---|
| **A: beacon** (RECOMMENDED) | A tall light pylon and a glow above the skyline, visible from the spawn, drawn as ordinary decorations. The card also names the exit. | Cheap; **buildable today.** The player sees *something* distant, not the gate itself. |
| **B: exit above the spawn** | The gatehouse stands on a high rooftop directly above the start. The player does a long loop, then returns to charge it. | The whole level becomes real backtracking (GAME_DESIGN_V2 pillar 3), but the return trip risks empty walking and needs a return path. |

**OPEN for Chief.** Option A is the safe tutorial choice. Option B is the stronger design and could be
saved for a later level.

### 4.5 Traversal in Level 1
- **Moving platform to reach the gate (CONFIRMED as "consider").** **BUILT constraint: the charge platform is
  horizontal only; its height never changes.** So it can carry the player *across* a gap near the gatehouse,
  as the 320 px ferry in section 5, but it **cannot lift** them to a raised gate. Either the gate is at the
  platform's height (recommended), or a vertical mode is new engine work.
  The ferry's 2 charge must be recoverable at the far shore, or the spare drops from 4 to 2 (section 1.4).
  A fall into the gap must respawn at a nearby checkpoint (RECOMMENDED: one at the near shore).
- **A charged wire the player glides along (CONFIRMED as "an additional concept to investigate").**
  Nothing like it exists. It is **not** in the layout. If it is later approved it would replace the ferry as
  the final set piece. Open questions are in GAME_DESIGN_V2 section 4.5.
- **Existing traversal** (ladder, ledge climb, grapple) is available but unused. **RECOMMENDED:** do not add
  them to Level 1. Teaching a ladder, a grapple and absorb in one level breaks rule T7.

### 4.6 The fork and the secret (CONFIRMED: keep the fork as an exploration reward; secret = a possibility)
- **Fork.** High route: lamp 3 (the spare), the woman, the checkpoint and an overlook. Low route: the
  sunken street, reached by dropping 160 px, a short-cut that skips lamp 3 and the checkpoint. **Both must
  complete the level from zero** (rule 3), so lamp 3 stays genuinely optional. Make the high route the
  *rewarding* one (extra life and a checkpoint) and the low route the *fast* one.
- **Secret (CONFIRMED: "could reveal a previously hidden route, trophy, or Easter egg").** Powering an AC unit
  on the rooftop (permanent cost 2) opens a hidden route to a trophy.
  **Buildable today:** a Switch (cost 2) linked to a `blockOnly` barrier that seals the alcove.
  **OPEN:** what is the trophy? A cosmetic collectible, an Easter egg, or a pip? A pip would demonstrate the
  reserve, but a pip is 25 charge, which dwarfs Level 1's whole 12. If it is a pip, it must not be
  *required*, and the HUD would need to explain it.

### 4.7 Checkpoints (RECOMMENDED)
Level 1 has one, at x 1824. With a longer route it needs at least three: before the shaft jump, at the
fork rejoin, and at the ferry's near shore. A respawn restores the bar and pips as of that checkpoint
(BUILT), so it never costs the player a lamp they have already drained.

### 4.8 What must not change (CONFIRMED)
Sources total 12. The exit costs 8. Spawn, the three lamps, the exit and the exploration rule stay as
Chief's rulings define them. Specifically (Order 025): **do not touch the three sources or the 8-charge exit
while dressing.** Adding more *sources* is not authorized by anything here.

---

## 5. Level 1: pacing and the 90 to 120 second route

CONFIRMED: **90 to 120 seconds is the proposed main-route target,** longer exploration allowed, and a
meaningful absorb-carry-spend loop **inside the first minute.**

### 5.1 Time budget for the section 4.3 layout (RECOMMENDED, computed)
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
| 7 | Rooftop run: fuse box and sign (reclaimable toy) | 457 | 6.1 | 4.0 | 10.1 |
| 8 | Smoke workers: hint dialogue | 0 | 0 | 3.5 | 3.5 |
| 9 | Approach to the fork | 114 | 1.5 | 0 | 1.5 |
| 10 | High route A: climb to the strip, lamp 3 (the spare) | 160 | 2.1 | 2.8 | 4.9 |
| 11 | High route B: streetlamp woman (flavor) | 77 | 1.0 | 3.5 | 4.5 |
| 12 | High route C: checkpoint flag | 83 | 1.1 | 1.0 | 2.1 |
| 13 | High route D: strip-end overlook onto the street below | 288 | 3.8 | 1.5 | 5.3 |
| 14 | Step block and drop to the street | 320 | 4.3 | 2.0 | 6.3 |
| 15 | NEW Market street, west half: shutter toy | 400 | 5.3 | 4.0 | 9.3 |
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
second absorb and the rooftop toy. A second spend (the shutter) comes at about 1:25.
Note the first version of this table had a 10.7 s walk with no beat; splitting it was a design change the
computation forced, which is why the arithmetic is scripted.

### 5.2 What this table cannot tell us
It is a model. **It must be checked with a timed run** by a person or a scripted walker. New players dawdle,
read, or get lost, which adds time; skilled players skip optional toys, which removes it.

---

## 6. Level 1: economy

### 6.1 Trace from zero (BUILT numbers, CONFIRMED rules)
- Sources: lamp 1 (4), lamp 2 (4), lamp 3 (4) = **12.** Exit **8.** Spare **4.**
- **The main route needs only lamps 1 and 2** (4 + 4 = 8) before the fork, so lamp 3 is a genuine spare.
- Reclaimable toys return their charge, so they cost nothing net.
- Permanent costs (section 1.4): the AC secret (2) and, worst case, the unreclaimed ferry (2) = 4.
  12 - 4 = 8, so even a player who buys every permanent payoff can still pay the exit.
- **Level 1 never fills the 25-unit bar:** the player can hold at most 12. So no pip is banked and **the
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
8. Sources total 12; exit 8; the sum of permanent optional costs is at most 4. (test)
9. Every optional charge cost is reclaimable or bounded, and the player can always return to it. (test)
10. A stuck player is detected and offered a retry. (needs the fail-state fix)

**Engine and content**
11. Reclaimable-charge props exist, react visibly and audibly, and have a regression test. (NEW engine)
12. The objective card reads "Charge gate to open." with its test updated. (strings, GAME_DESIGN_V2 8.2)
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
| 2 | Fix the prover's hard-coded 18 rows | Test infra | none | RECOMMENDED |
| 3 | Fail-state fix, in-play respawn, and "out of charge" prompt | Runtime | none | RECOMMENDED |
| 4 | Objective-card strings (two places) plus test | Runtime | none | CONFIRMED wording |
| 5 | Movement retune with before and after (Appendix A) | Runtime | 2 | CONFIRMED authorized |
| 6 | Route verification across all six levels | Test | 2, 5 | CONFIRMED |
| 7 | Reclaimable-charge props (receiver, reaction, drain) | Runtime | none | NEW; blocks 9 |
| 8 | Juice module (particles, shake, hit-stop) and land/jump feedback | Runtime | 5 | RECOMMENDED |
| 9 | Toy payoffs: vending machine, fuse box and sign, shutter | Art + runtime | 7 | CONFIRMED direction |
| 10 | Ambient actors: pedestrians, passing cars, drifting birds | Runtime + art | none | CONFIRMED direction |
| 11 | Ducking and double-jump **animations** (no ability implied) | Art | none | CONFIRMED |
| 12 | Audio bus and effects: absorb hum, gate open, toys, land, ambience | Runtime + audio | none | GAME_DESIGN_V2 sections 9 and 10 |
| 13 | Replacement Level 1 music | Audio (Kiro) | 12 | CONFIRMED; pending assets |
| 14 | Lengthen or stack Level 1; place zones, NPCs, props, beacon | Content | 1, 4, 7, 9, 10 | Chief |
| 15 | Hint copy and NPC role tags | Content | 14 | RECOMMENDED |
| 16 | The AC-unit secret (switch plus barrier) and trophy | Content + art | 14 | CONCEPT |
| 17 | Level 1 pacing, economy and coverage tests | Test | 14 | RECOMMENDED |
| 18 | Refund on a refused chest | Runtime | none | OPEN |
| 19 | Gate the dev keys (`P`, `F2`, `[`, `]`) | Runtime | none | RECOMMENDED |
| 20 | Regenerate `PLAYER_MOVEMENT_METRICS.md` | Docs | 5 | CONFIRMED |

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
Teaching rules T1 to T7; the movement envelope in 1.3; prop cost classes in 1.4; zones in 3.2; toy return
behaviour (b) in 3.3; the city-life counts in 3.4; the foreshadow as an ambient actor in 3.5; the layout and
width in 4.3; beacon A in 4.4; three checkpoints in 4.7; the timing budget in 5.1; the fail-state fix in 6.2;
the work list ordering in 8.

### OPEN questions (need Chief)
1. **Lengthen Level 1 to about 139 columns, or stack it vertically?** (4.3)
2. **Exit early: beacon A, or exit above the spawn B?** (4.4)
3. **Do toys return charge when you leave (b), or hold it until you take it back (a)?** (3.3)
4. **What is the trophy?** Cosmetic, an Easter egg, or a pip? (4.6)
5. **Is the foreshadow drone a decoration (recommended) or a real enemy?** (3.5)
6. **Is a required platform ferry wanted at all,** given it reduces the spare unless recoverable? (4.5)
7. **Agree to keep Level 2 separate,** or name the parts to merge? (2.4)
8. **Which tone for NPC lines?** The existing streetlamp woman's lines are flirtatious; confirm that is the
   intended voice for the city. (3.4)

---

## Appendix A: movement baseline and retune protocol

### A.1 Baseline, before any retune (BUILT, measured by the real controller)
Source: `docs/agent-training/player_metrics_harness.mjs`, 60 Hz fixed step, run on commit `5ad4f1b`.
The existing `PLAYER_MOVEMENT_METRICS.md` is stale (it lists a 450 px screen and 14 rows; the game is
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
7. Regenerate `PLAYER_MOVEMENT_METRICS.md` from the same harness.

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
