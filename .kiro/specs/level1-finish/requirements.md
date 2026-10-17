# Requirements Document

## Introduction

Level 1 ("NEON RISE", 100 x 22 tiles, 3,200 x 704 px) is built and was play-tested by Chief on 2026-10-17. This feature finishes it. The scope is the eleven-item finish list in `docs/design/LEVEL_DESIGN_V2.md` section 7.1 (also section 4 of `_dev/tools/level1_status/content.html`), plus the change-control and protected-file rules that keep the work safe.

Facts read from the real files on branch `agent/orcha-gameplay` at commit `86bcc78`:

- `level1.json` holds five charged objects: three lamps (3 each), one vending machine (2) and one air conditioner (capacity 4, starts uncharged). That is 11 charge placed against an exit gate that costs 8 and sits at x 3136. Spawn is at x 32.
- There is one checkpoint (`CP1`, x 1824), seven NPCs, no enemies, no platforms and no switches.
- The only stretch of the main route longer than 600 px without a beat runs from the bus stop commuter (x 2320) to the exit gate (x 3136): 816 px.
- Lamp 3 (x 1664) and the vending machine (x 2035) are both on the high strip. Lamps 1 and 2 hold 6 in total, which is less than the 8 the gate costs.
- The relay pylon, light cable and beacon were removed from Level 1 and moved to Level 7. The "Charge gate to open." label is dropped.

### Decision status

Four tags are kept separate throughout this document.

**CONFIRMED** (Chief, final):
- C1. Chief supplies the Level 1 music track; Kiro wires it. Nothing else waits on the track.
- C2. The movement retune covers Level 1 only. The controller is shared by all six levels, so the paused levels change feel too. A rollback to the frozen baseline in Appendix A.1 of `LEVEL_DESIGN_V2.md` is required.
- C3. A written order (Chief, 2026-10-17) lets Kiro edit `src_scroll/levels/level1.json` for four changes only: (a) a beat in the 816 px stretch from x 2320 to x 3136; (b) a second checkpoint; (c) an exit signpost; (d) the final copy when Orcha delivers it.
- C4. The exit signpost is a lit arrow or neon sign near the start pointing east, plus the exit gate's own glow growing as the player approaches. The relay pylon is not the signpost.
- C5. The fork stays as scenery. The low street is a scenic loop back to the strip. The requirement is that the low street reconnects to the strip with no dead end and no soft-lock, checked with the route prover.
- C6. The "Charge gate to open." world label is dropped.
- C7. Done-list item 14 means Level 1 routes only. Done-list item 17 means the full suite passes, the Builder module version is current, and Chief signs off.
- C8. Chief owns `src_scroll/levels/*.json`. An agent edits a level file only under a numbered or written order that names the file and the change (`docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`).
- C9. Standing rules that stay: the exit costs 8; exits are non-solid; every level is completable from zero carried charge; the 90 to 120 s main-route target; a meaningful absorb, carry and spend loop within the first minute.

**RECOMMENDED** (Kiro's proposal; Chief may change): the beat is not a charge source (R3.2); the checkpoint position (R3.5); the glow range and intensity ratio (R4.4); the response time for a charged-object reaction (R7.2); the music level relative to effects (R8.3); the order of retune knobs (R6.4).

**CONCEPT** (idea only, not adopted, nothing is built or tested for it): a per-level movement override so the paused levels keep today's feel; a human first-time playtest used alongside the scripted run.

**OPEN** (no decision yet; recorded here and reported to Chief, not decided by Kiro):
- O1. Which kind of beat goes in the 816 px stretch.
- O2. The exact checkpoint x, after the route prover answers.
- O3. Whether art that reads as an east-pointing arrow already exists in `assets/objects/night-city-props/neon-sign/` or elsewhere; making new art is outside this feature.
- O4. What happens if the timed run measures the main route outside 90 to 120 s, since the four-change order cannot lengthen the route much.
- O5. The date Orcha delivers the final copy.
- O6. The format and file name of the music track.
- O7. The finish list names a "sign" reaction. `level1.json` has no charged sign, and the order adds none.

## Glossary

- **Level_1**: The level "NEON RISE", number 1, in `src_scroll/levels/level1.json`.
- **Level_1_File**: `src_scroll/levels/level1.json`, owned by Chief.
- **Game_Runtime**: The game code in `src_scroll/` that loads and plays a level.
- **Builder**: The level editor under `editor/` (`editor.html`).
- **Chief**: The project owner, who approves placements, supplies the music and signs off.
- **Orcha**: The agent who writes the final text for every line the player reads in Level 1.
- **Finish_Process**: The set of steps in this feature, carried out by Kiro, Technical Director.
- **Spawn**: The player start, x 32, y 578 in the Level_1_File.
- **Exit_Gate**: The gate `gate_1` at x 3136 with `isExit` true and `required` 8.
- **Charged_Object**: A source in the Level_1_File that holds charge and reacts when charged: three lamps, the vending machine and the air conditioner (id `AC_TENANT`). The word "toy" is not used.
- **Charge_Figure**: The number given for a Charged_Object. It is the charge that object holds, not a price and not what the player receives. Lamps hold 3 each, the vending machine holds 2, the air conditioner has capacity 4 and starts holding 0.
- **Placed_Charge**: The sum of the Charge_Figures of the lamps and the vending machine as loaded: 11. The air conditioner is excluded because the charge put into it is returned when reclaimed.
- **Beat**: A moment on the Main_Route that is an interaction, an NPC, a readable event or a new view (rule T2 of `LEVEL_DESIGN_V2.md`).
- **Main_Route**: The walking path from Spawn to the Exit_Gate that uses only required traversals and collects at least 8 charge, with no optional detours.
- **High_Strip**: The raised one-way strip at y 448 (x about 1500 to 2140) that carries lamp 3, the checkpoint and the vending machine.
- **Low_Street**: The lower street at y 640 beneath the High_Strip.
- **Two_Way_Path**: A sequence of moves between two points in which every move can also be made in the reverse direction within the Movement_Envelope. Walking, jumps within the envelope and ladders are two-way. A drop longer than the jump height is one-way.
- **Soft_Lock**: A reachable player state from which the Exit_Gate cannot be reached by any legal sequence of moves and the Game_Runtime offers neither a respawn nor a retry.
- **Movement_Envelope**: The limits of the player controller measured in Appendix A of `LEVEL_DESIGN_V2.md`.
- **Timed_Run**: A scripted headless walker that plays the real Level_1_File with the real controller at a 60 Hz fixed step, using walking speed only, and reports seconds of game time.
- **Route_Prover**: The project's reachability and completability provers in `_dev/` (for example `reach.mjs` and `completability.mjs`), run on the real Level_1_File.
- **Beat_Scan**: A script that reads the Level_1_File and measures the distance between consecutive Beats on the Main_Route, with Spawn and the Exit_Gate as end points.
- **Named_Change**: One of the four changes allowed by the written order: Beat, Second_Checkpoint, Signpost, Copy_Swap.
- **Second_Checkpoint**: A new entry `CP2` in the `checkpoints` array of the Level_1_File.
- **Signpost**: A lit arrow or neon sign decoration near Spawn that points toward increasing x (east).
- **Gate_Glow**: The glow drawn around the Exit_Gate by the Game_Runtime, whose strength depends on the distance from the player.
- **Copy_Swap**: Replacing the `text` value of each player-readable line in the Level_1_File with Orcha's final text.
- **Diff_Check**: A script written under this feature that compares the Level_1_File at the base commit `86bcc78` with the working copy and fails on any difference outside the four Named_Changes.
- **Placement_Process**: The steps by which Kiro makes a Named_Change, shows it to Chief and keeps or reverts it.
- **Approval_Record**: A dated line in `KIRO_STATUS.md` giving the Named_Change, the coordinates and Chief's words approving it.
- **Standing_Orders_Log**: Section 3 of `docs/orders/KIRO_STANDING_CHIEF_OWNS_LEVEL_FILES.md`, "Written orders that name files (log)".
- **Retune**: The change to the player controller constants (jump cut, fall multiplier, walk ramp, look-ahead) described in Appendix A.2 of `LEVEL_DESIGN_V2.md`.
- **Baseline**: The frozen controller numbers in the "Before" column of Appendix A.1.
- **Movement_Harness**: `docs/reference/agent-training/player_metrics_harness.mjs`.
- **Audio_Bus**: The audio module `src_scroll/audio.js`.
- **Juice_Module**: The effects module `src_scroll/juice.js`.
- **Effect_Switch**: A control that turns a sound or visual effect off: `setEnabled(false)` on the Audio_Bus, `?juice=off` on the Juice_Module, or reduced motion.
- **Music_Track**: The audio file Chief supplies for Level 1.
- **Full_Suite**: Every test suite run by `_dev/run_all.mjs`, plus any suite documented there as a manual run.
- **Builder_Module_Version**: The version query (for example `?v=10`) that the Builder and Game_Runtime put on module imports so that browsers load current code.
- **Done_List**: The Level 1 definition of done in section 7.1 of `LEVEL_DESIGN_V2.md`, 17 items.
- **Protected_Files**: `assets/fixtures/hero-mechanics.json` and `assets.zip`.
- **Status_Report**: The dated entries in `KIRO_STATUS.md` where evidence for this feature is recorded.

## Requirements

### Requirement 1: Timed run

**User Story:** As Chief, I want a timed run on the real Level 1 file, so that I know the opening teaches within a minute and the route length matches the target.

Status: Done_List items 1 and 2, finish-list task 1. Targets CONFIRMED (C9); model details RECOMMENDED; shortfall handling OPEN (O4); human playtest CONCEPT.

#### Acceptance Criteria

1. WHEN the Timed_Run is executed, THE Timed_Run SHALL report, in seconds of game time to 0.1 s, the time from Spawn to the first absorb, the time to the first spend, and the time to Exit_Gate completion.
2. THE Timed_Run SHALL measure the first absorb at less than 60 seconds from Spawn.
3. THE Timed_Run SHALL measure the first spend at less than 60 seconds from Spawn, where a spend is the first transfer of charge from the player into a Charged_Object or the Exit_Gate.
4. THE Timed_Run SHALL measure the Main_Route time from Spawn to Exit_Gate completion at a value from 90.0 to 120.0 seconds inclusive.
5. THE Timed_Run SHALL use walking speed (75 px/s) with the real controller and SHALL include the full duration of each Beat interaction on the Main_Route.
6. IF the measured Main_Route time is outside 90.0 to 120.0 seconds, THEN THE Finish_Process SHALL record the measured value and the shortfall or excess in the Status_Report, mark the point as open for Chief, and make no Level_1_File edit beyond the four Named_Changes.
7. WHEN the Beat, Second_Checkpoint, Signpost and Retune are all applied, THE Timed_Run SHALL be repeated on the final state and THE Status_Report SHALL list the before and after figures side by side.
8. THE Timed_Run SHALL be runnable by a single command that exits with code 0 when criteria 2, 3 and 4 hold and a non-zero code otherwise.

### Requirement 2: Route prover for the fork and two-way reachability

**User Story:** As Chief, I want the route prover run on the real file, so that I know the fork is safe, every Charged_Object is reachable again, and the level completes from zero charge.

Status: Done_List items 6, 8 and 9, finish-list task 2. The fork rule is CONFIRMED (C5, C9). It replaces the earlier wording "both branches finish from zero charge".

#### Acceptance Criteria

1. WHEN the Route_Prover is executed, THE Route_Prover SHALL report for every required traversal on the Main_Route whether the walking controller passes it, using the Movement_Envelope.
2. THE Route_Prover SHALL confirm that, starting from zero carried charge, the Main_Route passes enough Charged_Objects to collect at least 8 charge (Placed_Charge is 11, Exit_Gate cost is 8).
3. THE Route_Prover SHALL confirm that every point of the Low_Street has a path to the High_Strip, so that the Low_Street has no dead end.
4. THE Route_Prover SHALL confirm that no reachable player state on the Low_Street is a Soft_Lock.
5. WHEN evaluating the fork, THE Route_Prover SHALL check the Low_Street for reconnection to the High_Strip only, and SHALL record that completion from zero charge is checked on the Main_Route.
6. THE Route_Prover SHALL report what the Low_Street actually does today, including which Charged_Objects are reachable from it and where it rejoins the High_Strip.
7. THE Route_Prover SHALL confirm that each of the five Charged_Objects (three lamps, the vending machine and the air conditioner) is reachable from the Exit_Gate by a Two_Way_Path and that the Exit_Gate is reachable from each of them by a Two_Way_Path.
8. IF a Charged_Object fails the check in criterion 7, THEN THE Route_Prover SHALL name that object by id and coordinates, and THE Finish_Process SHALL report the failure to Chief without editing the Level_1_File.
9. IF the Low_Street fails the check in criterion 3 or 4, THEN THE Finish_Process SHALL report the location of the dead end or Soft_Lock to Chief without editing the Level_1_File.
10. WHEN a Named_Change or the Retune is applied, THE Route_Prover SHALL be re-run, and THE Status_Report SHALL record the result.
11. THE Route_Prover SHALL report the Charge_Figure of each Charged_Object as read from the Level_1_File: lamps 3, 3 and 3, vending machine 2, air conditioner capacity 4.

### Requirement 3: Beat and second checkpoint

**User Story:** As a player, I want something to see or do on the long last stretch and a closer checkpoint, so that the walk to the exit is not empty and a fall does not send me far back.

Status: Named_Changes (a) and (b); Done_List item 3. Order CONFIRMED (C3); beat kind OPEN (O1); checkpoint position RECOMMENDED and OPEN (O2).

#### Acceptance Criteria

1. WHEN the Beat_Scan is executed on the final Level_1_File, THE Beat_Scan SHALL find no 600 px stretch of the Main_Route without a Beat.
2. THE Beat SHALL NOT be a charge source, so that Placed_Charge stays 11 and the Exit_Gate cost stays 8.
3. WHEN the Beat is placed, THE Level_1_File SHALL hold the Beat anchor at an x position from 2536 to 2920 on solid ground that the walking player reaches along the Main_Route, so that both gaps (from the bus stop commuter at x 2320 and to the Exit_Gate at x 3136) are at most 600 px.
4. WHERE the Beat includes a line of dialogue, THE Level_1_File SHALL take that line's text from Orcha's final copy and SHALL contain no placeholder text.
5. WHEN the Second_Checkpoint is placed, THE Level_1_File SHALL hold exactly two entries in `checkpoints`, `CP1` unchanged at x 1824 and a new `CP2` on solid ground on the Main_Route at least 600 px east of `CP1` and west of the Exit_Gate.
6. WHEN the player activates `CP2` and then respawns, THE Game_Runtime SHALL restore the charge bar and pips as recorded when `CP2` was activated.
7. THE Beat and the Second_Checkpoint SHALL leave every Main_Route traversal passing in the Route_Prover.
8. IF the Route_Prover shows that the fork answer changes the best position for `CP2`, THEN THE Placement_Process SHALL use the position the Route_Prover supports and record the reason in the Status_Report.

### Requirement 4: Exit signpost

**User Story:** As a player, I want to see which way the exit is from the start, so that I head east without being told.

Status: Named_Change (c); Done_List item 5, finish-list tasks 3 and 5. Design CONFIRMED (C4, C6); glow range and ratio RECOMMENDED; art availability OPEN (O3).

#### Acceptance Criteria

1. WHEN the Signpost is placed, THE Level_1_File SHALL contain one Signpost, a lit arrow or neon sign that points toward increasing x.
2. THE Signpost SHALL lie wholly inside the camera view at Spawn.
3. WHERE art that reads as an east-pointing arrow exists in the registered assets, THE Signpost SHALL use that art.
4. THE Game_Runtime SHALL draw the Gate_Glow with a strength that increases as the horizontal distance between the player and the Exit_Gate decreases, starting at a range of 1,200 px, with the strength at 100 px at least twice the strength at 1,200 px.
5. THE Game_Runtime SHALL apply the Gate_Glow to gates with `isExit` true only.
6. THE Game_Runtime SHALL leave the Exit_Gate cost (8), the Exit_Gate position, and the non-solid exit behaviour unchanged by the Gate_Glow.
7. WHILE an Effect_Switch has turned visual effects off or reduced motion is on, THE Game_Runtime SHALL draw the Gate_Glow without pulse or flicker.
8. IF no registered art reads as an east-pointing arrow, THEN THE Finish_Process SHALL report that to Chief with the candidate assets found and SHALL leave the Level_1_File without a Signpost until Chief decides.
9. THE Level_1_File SHALL contain no relay-pylon, light-cable or beacon-top decoration.
10. THE Game_Runtime SHALL draw no "Charge gate to open." label above any exit gate.

### Requirement 5: Final copy swap

**User Story:** As a player, I want real, final text in every line I read, so that Level 1 has no placeholders.

Status: Named_Change (d); Done_List items 4, 7 and 8, finish-list task 6. Order CONFIRMED (C3); delivery date OPEN (O5).

#### Acceptance Criteria

1. WHEN Orcha delivers the final text for every player-readable Level 1 line, THE Placement_Process SHALL replace the `text` value of each corresponding line in the Level_1_File.
2. THE Copy_Swap SHALL change `text` values only, so that every line `id`, NPC `id`, coordinate, radius and duration stays as before.
3. THE Level_1_File SHALL contain no line whose text is "New line", is empty, or is otherwise a placeholder, after the Copy_Swap.
4. THE Level_1_File SHALL cover the 12 dialogue lines present on 2026-10-17, the tenant's lines, the hint text, and any line added by the Beat.
5. THE Copy_Swap SHALL be shown to Chief for approval before it stays.
6. WHILE Orcha's final text is not delivered, THE Finish_Process SHALL leave the existing text unchanged and SHALL list the Copy_Swap as an open dependency in the Status_Report.
7. THE Diff_Check SHALL report the Copy_Swap as changing `text` fields only.

### Requirement 6: Movement retune for Level 1

**User Story:** As Chief, I want the movement retuned for Level 1 with before and after numbers and a one-step rollback, so that the feel improves without losing any route.

Status: Done_List items 13 and 14, finish-list task 7. Scope and rollback CONFIRMED (C2, C7); knob order RECOMMENDED; per-level override CONCEPT.

#### Acceptance Criteria

1. WHEN the Retune begins, THE Finish_Process SHALL record the Baseline from Appendix A.1 (walk 75.00 px/s, sprint 127.50 px/s, jump height 99.17 px, airtime 0.933 s, and the rest of the table) in a rollback record committed to the repository.
2. THE Retune SHALL begin only after the Beat, Second_Checkpoint and Signpost are approved by Chief, so that the Level 1 routes are final.
3. THE Retune SHALL change jump height by 0.00 px relative to the Baseline value of 99.17 px, as measured by the Movement_Harness.
4. THE Retune SHALL apply one change at a time (jump cut, fall multiplier, walk ramp, look-ahead) and SHALL re-run the Movement_Harness after each, recording the result per change.
5. THE Retune SHALL reject any change that reduces maximum jump height.
6. WHEN the Retune is complete, THE Route_Prover SHALL confirm that every required Level 1 traversal still passes.
7. THE Retune SHALL fill the "After" column of every metric in Appendix A.1 and SHALL regenerate `docs/reference/PLAYER_MOVEMENT_METRICS.md` from the Movement_Harness.
8. WHEN the Retune is complete, THE Finish_Process SHALL run the existing suites for the paused levels and SHALL report to Chief any result that changed, without editing Levels 2 to 6.
9. WHEN Chief reports that the feel is wrong, THE Finish_Process SHALL restore the Baseline in one step, and THE Movement_Harness SHALL then reproduce the Appendix A.1 "Before" values with a difference of 0.00 on each metric.
10. WHEN the Retune is complete, THE Timed_Run SHALL be repeated so that the Main_Route time is re-checked against Requirement 1.

### Requirement 7: Ambience and charged-object reactions

**User Story:** As a player, I want the street to sound alive and every Charged_Object to visibly and audibly react when charged, so that each interaction pays off.

Status: Done_List items 9 and 11, finish-list task 8. Direction CONFIRMED (`LEVEL_DESIGN_V2.md` 3.3: props visibly react when charged and each interaction needs a clear payoff); response time RECOMMENDED; "sign" reaction OPEN (O7).

#### Acceptance Criteria

1. WHILE Level_1 is playing and audio is enabled, THE Audio_Bus SHALL play a looping street ambience.
2. WHEN a Charged_Object receives charge, THE Game_Runtime SHALL start that object's visible reaction and its sound within 250 ms (15 frames at 60 Hz).
3. WHEN the player drains a Charged_Object, THE Game_Runtime SHALL return that object's reaction to its uncharged state.
4. THE Game_Runtime SHALL give each of the vending machine (holds 2), the air conditioner (capacity 4) and the three lamps (hold 3 each) a reaction that a test can detect as a change in drawn state or a triggered sound.
5. THE Audio_Bus SHALL start no sound and no loop while `setEnabled(false)` is in effect.
6. THE Juice_Module SHALL create no particle, shake or hit-stop while `?juice=off` is in effect.
7. WHILE reduced motion is on, THE Juice_Module SHALL create no shake and no hit-stop, and the ambience and reactions SHALL show no flashing.
8. THE Finish_Process SHALL list every sound and effect used by Level_1, and THE Full_Suite SHALL contain a test per entry that confirms it has an off switch.
9. THE ambience and the reactions SHALL leave charge values, positions and physics unchanged.
10. IF a Charged_Object in the Level_1_File has no reaction defined, THEN THE Full_Suite SHALL fail and name that object.
11. WHERE the Game_Runtime supports a charged sign, THE Game_Runtime SHALL give it a visible reaction; Level_1 holds no charged sign, so Level 1 has no acceptance check for this clause.

### Requirement 8: Music wiring

**User Story:** As Chief, I want my Level 1 music track wired in and set to a sensible level, so that the level has a soundtrack.

Status: Done_List item 15, finish-list task 9. CONFIRMED (C1); format OPEN (O6); level relative to effects RECOMMENDED.

#### Acceptance Criteria

1. WHEN Chief supplies the Music_Track, THE Audio_Bus SHALL play the Music_Track in a loop while Level_1 is playing.
2. THE Audio_Bus SHALL start the Music_Track after the first player input, so that browser autoplay rules are met.
3. THE Audio_Bus SHALL set the music gain at or below the effects gain, so that the absorb hum and gate-open sound stay audible, and THE Status_Report SHALL record the gain value.
4. WHILE `setEnabled(false)` is in effect on the Audio_Bus, THE Audio_Bus SHALL play no music.
5. IF the Music_Track has not been supplied, THEN THE Game_Runtime SHALL start Level_1 silent, with no console error and no blocked sign-off.
6. WHEN the Music_Track is added, THE Finish_Process SHALL record its file path and format in the Status_Report.
7. THE Music_Track SHALL be added by file name only, and THE Finish_Process SHALL leave `assets.zip` unmodified.

### Requirement 9: Clean-up

**User Story:** As a maintainer, I want the stale tests, closed orders and wrong document sections cleaned up, so that the repository describes Level 1 as it is.

Status: Done_List items 14 and 17 wording, finish-list task 10. Rewordings CONFIRMED (C7).

#### Acceptance Criteria

1. THE Finish_Process SHALL remove `_dev/aki27_draft.mjs` and its entry in `_dev/run_all.mjs`, so that the Full_Suite reports no skipped suite for it.
2. THE Finish_Process SHALL mark `docs/orders/KIRO_ORDER_AKI_28.md` as closed and obsolete, with the date and the reason, and SHALL keep the file.
3. WHEN the clean-up is complete, THE design document `docs/design/LEVEL_DESIGN_V2.md` SHALL contain no statement that `level_guard.mjs` exists or runs before pushes, and SHALL name the Diff_Check as the check that replaces it.
4. WHEN the clean-up is complete, THE section headings for the tower, lift, relay pylon, light cable, beacon and gatehouse in `LEVEL_DESIGN_V2.md` SHALL each carry a SUPERSEDED or REMOVED tag.
5. WHEN the clean-up is complete, THE Done_List in section 7.1 of `LEVEL_DESIGN_V2.md` SHALL state item 5 as the new Signpost (C4), item 6 as the Low_Street reconnecting to the strip (C5), item 14 as Level 1 routes only, and item 17 as the full suite passing, the Builder_Module_Version current and Chief signing off (C7).
6. WHEN the clean-up is complete, THE Standing_Orders_Log and `LEVEL_DESIGN_V2.md` SHALL describe the Charged_Object economy with the Charge_Figures defined above.
7. WHEN the work is complete, THE Finish_Process SHALL delete every temporary file it created for verification.

### Requirement 10: Final run and sign-off

**User Story:** As Chief, I want a final full run and a sign-off step, so that I only play Level 1 once everything else passes.

Status: Done_List items 16 and 17, finish-list task 11. CONFIRMED (C7, C8).

#### Acceptance Criteria

1. WHEN requirements 1 to 9 are complete, THE Finish_Process SHALL run the Full_Suite and record the passed and failed counts in the Status_Report.
2. THE Full_Suite SHALL report 0 failed.
3. IF any suite fails, THEN THE Finish_Process SHALL attribute the failure to its cause in the Status_Report before sign-off.
4. THE Finish_Process SHALL run the suites documented as manual in `_dev/run_all.mjs` and SHALL record their counts in the Status_Report.
5. THE Builder_Module_Version of every module changed under this feature SHALL be higher than its value at commit `86bcc78`, and THE Builder SHALL load Level_1 with no module load error.
6. THE Diff_Check SHALL pass on the final Level_1_File.
7. THE Status_Report SHALL list the revised Done_List with a pass or fail result per item and SHALL list every open dependency (Orcha's copy, the Music_Track, Chief's approvals).
8. WHEN the Status_Report shows no open dependency other than the Music_Track, THE Finish_Process SHALL ask Chief to play Level_1.
9. WHEN Chief signs off, THE Finish_Process SHALL record the sign-off, the date and Chief's words in the Status_Report.
10. WHILE Chief's sign-off is not recorded, THE Finish_Process SHALL describe Level_1 as not finished.
11. WHEN the final run is complete, THE Placed_Charge SHALL read 11, the Exit_Gate cost SHALL read 8, and the lamp charges SHALL read 3, 3 and 3, the vending machine 2 and the air conditioner capacity 4 in the Level_1_File.

### Requirement 11: Level file change control

**User Story:** As Chief, I want the Level 1 file edited only as I ordered, with every placement shown to me and every edit logged, so that I can refresh and play what I saved.

Status: C3 and C8, restated from the standing order. CONFIRMED. The Diff_Check replaces the missing `level_guard.mjs`.

#### Acceptance Criteria

1. THE Finish_Process SHALL limit edits to the Level_1_File to the four Named_Changes: the Beat, the Second_Checkpoint, the Signpost and the Copy_Swap.
2. WHEN the Diff_Check compares the Level_1_File with commit `86bcc78`, THE Diff_Check SHALL report differences only as one added Beat entry, one added `CP2` checkpoint, one added Signpost entry, and changed `text` values.
3. THE Diff_Check SHALL fail on any change to `tiles`, `tileRotations`, `tileFlips`, `playerStart`, `sources`, `gates`, `switches`, `platforms`, `enemies`, `backgroundOffsets`, `name`, `number`, `cols` or `background`.
4. THE Diff_Check SHALL fail on any change to an existing decoration, NPC, checkpoint, or gate, other than a `text` value.
5. THE Placement_Process SHALL edit the Level_1_File by text-level edits that keep the existing line endings, so that every byte outside the edited lines matches the base commit.
6. THE Finish_Process SHALL leave every other file in `src_scroll/levels/`, including `levels.json` and `_dev_levels.json`, byte-identical to commit `86bcc78`.
7. WHEN a Named_Change is placed, THE Placement_Process SHALL show Chief the coordinates, a diff and an in-game screenshot, and SHALL keep the Named_Change only after an Approval_Record exists.
8. IF Chief does not approve a Named_Change, THEN THE Placement_Process SHALL restore the Level_1_File to its bytes before that Named_Change.
9. WHEN a Named_Change is made, THE Finish_Process SHALL append an entry to the Standing_Orders_Log with the date, Chief's written order, the ids and coordinates changed, what stayed unchanged, the test used and the steps to undo it.
10. IF a needed fix lies outside the four Named_Changes, THEN THE Finish_Process SHALL leave the Level_1_File unchanged and report the fix, its location and its reason to Chief for a further written order.
11. WHEN a Builder save follows any Named_Change, THE Diff_Check SHALL be re-run, because an earlier Builder save reverted the vending machine charge from 2 to 4.

### Requirement 12: Protected files

**User Story:** As Chief, I want two named files left alone, so that unrelated work is not committed by accident.

Status: CONFIRMED, from Chief's instruction for this feature.

#### Acceptance Criteria

1. THE Finish_Process SHALL leave `assets/fixtures/hero-mechanics.json` and `assets.zip` unmodified by any step, with the SHA-256 of each recorded at the start and equal at the end.
2. THE Finish_Process SHALL stage no Protected_File and commit no Protected_File.
3. WHEN a commit is made under this feature, THE Finish_Process SHALL stage files by name only.
4. WHEN the work is complete, `git diff --name-only 86bcc78..HEAD` SHALL list neither Protected_File.
5. WHILE `assets/fixtures/hero-mechanics.json` carries an uncommitted modification from before this feature, THE Finish_Process SHALL leave that modification in the working copy as found.

### Requirement 13: Sequencing and evidence

**User Story:** As Chief, I want the work done in a safe order with evidence at each step, so that every item ends when its check passes.

Status: Finish-list order from `LEVEL_DESIGN_V2.md` 7.1. CONFIRMED order; evidence format RECOMMENDED.

#### Acceptance Criteria

1. THE Finish_Process SHALL carry out the finish list in this order: timed run, route prover, signpost decision, beat and second checkpoint, signpost, final copy, retune, ambience and reactions, music wiring, clean-up, final run and sign-off.
2. THE Finish_Process SHALL run the Timed_Run and the Route_Prover before any Named_Change.
3. WHEN an item's check passes, THE Finish_Process SHALL record the item, the measured numbers and the command used in the Status_Report.
4. IF an item is blocked, THEN THE Finish_Process SHALL record the blocker and its owner in the Status_Report and continue with the items that do not depend on the blocked one.
5. THE Finish_Process SHALL treat the Copy_Swap and the Music_Track as items that block only their own steps.

## Non-Goals

These are out of scope for this feature.

- Any change to Levels 2 to 6, including fixing their routes after the Retune (they are reported to Chief, not fixed). All six levels stay paused except Level 1.
- Re-adding the relay pylon, light cable or beacon to Level 1 (they live in Level 7), and re-adding the tower, lift or gatehouse roof.
- Any layout change to Level 1: no tile, ladder, platform, gate, switch or enemy change, and no change to the fork's geometry.
- Any change to charge numbers or the exit cost: lamps 3, vending machine 2, air conditioner 4, exit 8.
- New Charged_Objects, a charged sign in Level 1, or any Beat that is a charge source.
- A "Charge gate to open." label of any kind.
- New movement abilities: double-jump wiring, ducking, a charged-wire glide.
- Writing dialogue or hint copy (Orcha's job), composing music (Chief's job), and drawing new arrow or sign art.
- Changes to the Builder's tools or to its Commit & Push behaviour.
- Rotating the PixelLab key, deciding the wall tileset's type, and deleting the duplicate twin level files.
- Recreating `level_guard.mjs` outside the repository.
- A per-level movement override (CONCEPT) and a human first-time playtest (CONCEPT).
- Modifying, staging or committing `assets/fixtures/hero-mechanics.json` or `assets.zip`.
