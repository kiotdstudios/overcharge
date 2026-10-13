# LEVEL 5 — POWER AND POSITION
## Design Brief for Chief

**Status:** Ready to build in the Builder
**Mechanic introduced:** Conductive crate. Environmental puzzle (position as solution, not just movement).
**No enemies** — crates + enemies not combined in v1.
**Checkpoint required** — wrong-pushed crate is otherwise unrecoverable with no crate-reset in v1.

---

## Economy

### Sources
| ID | Charge | Access |
|---|---|---|
| gen_a | 4 | Free — first pass, right of spawn |
| gen_b | 4 | Locked — inside barrier room, accessible after puzzle solve |
| gen_c | 4 | Locked — inside barrier room, accessible after puzzle solve |
| sw_1 | -2 | Cost — paid when crate contacts switch |
| **Total available** | **10** | (12 in − 2 spent) |
| EXIT | 8 | required |
| **Margin** | **2** | |

> All sources deliver exactly 4 charge. Nothing generates 6. Compliant with standing economy rules.

---

## Economy Traces

**From zero carry (worst case — fresh start, direct `?level=5` link):**
```
Collect A:        bar = 0 + 4 = 4
Activate switch:  bar = 4 - 2 = 2   ← puzzle solve, barrier opens
Backtrack — B:    bar = 2 + 4 = 6
Collect C:        bar = 6 + 4 = 10  (bar cap)
EXIT:             10 - 8 = 2  ✓  margin 2
```

**Checkpoint respawn (bar snapshotted at cp_1, after A collected, before crate zone):**
```
bar_snap = 4
Respawn:          bar = 4
Activate switch:  bar = 4 - 2 = 2
Backtrack — B+C:  bar = 10  (cap)
EXIT:             ✓  same result
```
> Checkpoint placed after Source A and before the crate. Respawn never loses A and always has 4 to
> pay the switch. Player cannot be stranded at the crate zone with zero charge.

**With 4 carry-over from L4 (clean run, no drone hits):**
```
bar_start = 4  (carry)
Collect A:        bar = 4 + 4 = 8
Activate switch:  bar = 8 - 2 = 6
Backtrack — B:    bar = 6 + 4 = 10  (cap — C skippable)
EXIT:             ✓  margin 2
```
> Rich entry: player arrives with carry and can skip C entirely. Carry is a cushion (per Kiro ruling) —
> never required, rewards clean L4 play.

**With 0–3 carry-over from L4 (drone hits, partial run):**
```
Any carry 0–3:    bar_start = 0-3
Collect A:        bar = carry + 4   (4–7)
Activate switch:  bar - 2           (2–5)
Collect B+C:      bar + 8 = 10-13 → capped at 10
EXIT:             ✓  margin 2 in all cases
```

**Solvable from zero: YES. Carry is never a prerequisite.**

---

## Spatial Layout

**Level size:** 100 columns × ~20 rows  (3200 × ~640px)
**Tile size:** 32px

### Beat-by-beat flow

```
SPAWN → [LOCKED ROOM, visible but sealed] → SOURCE A → platforming → [CHECKPOINT]
      → CRATE ZONE → solve → barrier opens → backtrack left → LOCKED ROOM → B + C
      → continue right → EXIT
```

### Object Placement Table

| Object | id | x | y | Config |
|---|---|---|---|---|
| Player Start | — | 64 | 322 | Col 2, ground level |
| Barrier Gate | gate_barrier | 160 | 256 | Col 5, blockOnly, linked: sw_1 |
| Source B | gen_b | 224 | 324 | Col 7, inside locked room |
| Source C | gen_c | 288 | 324 | Col 9, inside locked room |
| Source A | gen_a | 448 | 324 | Col 14, free on main path |
| Checkpoint | cp_1 | 1248 | 352 | Col 39, after A, before crate zone |
| Crate | crate_1 | 1312 | ~290 | Col 41, elevated platform |
| Switch | sw_1 | 1472 | ~224 | Col 46, alcove wall. cost: 2, linked: gate_barrier |
| Exit Gate | gate_exit | 2944 | 288 | Col 92, required: 8, isExit: true |

> **Switch and crate y-values: verify in Builder.**
> Switch must be ≥ 3.5 tiles above the floor the player stands on (~112px clearance) so a direct jump
> cannot activate it. The crate, pushed rightward from col 41 to col 46, must contact the switch hitbox.
> Adjust crate platform height and switch alcove depth until crate-contact fires but player-contact cannot.

---

## Terrain Shape (intent — Chief sets the tiles)

**Col 0–4:** Ground floor, open. Player spawns and can immediately see the locked room to the right.

**Col 5–13:** Locked room. A walled compartment or raised ledge sealed by the barrier gate at the
left opening. B and C are inside and visible on first pass — player sees what's behind the barrier before
they know how to open it. That visibility is the hook.

**Col 14–19:** Source A on ground floor. No obstruction. First collectible, no cost.

**Col 20–38:** Platforming stretch. Two to three hops, varied heights. Teaches the vocabulary of this
level's terrain before the puzzle hits. Should feel easier than L4's drone gauntlet — a breath of space,
not filler.

**Col 39:** Checkpoint. Ground level, obvious placement. Last safe state before the crate zone.

**Col 40–48:** Crate zone. Elevated platform over the main floor. Crate starts at col 41. Switch sits in
a tight alcove on the far wall at col 46–47, above direct player reach. Player can stand on the platform
and push the crate rightward, but cannot jump from the platform surface to hit the switch without the crate.

**Col 49–91:** Open traversal back to the exit. After solving the puzzle, the player backtracks left
through this section, through col 14–5, collects B and C, then returns all the way right to col 92. Terrain
must be readable and traversable in both directions — no one-way drops in this corridor.

**Col 92:** Exit gate. Visible from the crate zone on the horizon.

---

## Switch mechanic notes

- `cost: 2` — fires on crate contact, not player touch
- Linked to `gate_barrier` — barrier dissolves when switch fires
- After the switch fires, barrier gate dissolves visibly so the player understands what changed
- B and C visible through the barrier on first pass — player arrives at the barrier, sees the sources
  behind it, and knows the payoff before knowing the path

### Wrong-push scenario
If the crate is pushed past the switch or falls off the platform, the puzzle cannot be solved for this
respawn. The checkpoint at col 39 must reset the crate to spawn position on respawn. **Verify this
behaviour in the Builder before shipping** — if crate does not reset on respawn, this brief needs a
redesign before Level 5 goes into the manifest.

---

## What the level teaches

The player has been trained to think about how much charge they have. This level adds the second axis:
where things sit. The switch is right there, but it's unreachable by hand. The crate is the solution —
not because it carries charge, but because it can stand in a place the player can't. Solving the puzzle
and watching the barrier open is the "aha": you did not collect your way through this one, you
repositioned something.

The backtrack is deliberate. Walking back through the level after changing it makes the change feel real.
The room that was sealed is now open. The player earns B and C by solving the puzzle, not by stumbling
past them.

---

*Brief written by Aki. Chief builds and commits the level file. Economy verified from zero carry and all
carry-over states. No enemies — compliant with v1 ruling. Margin 2 in all traces.*
