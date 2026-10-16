# KIRO ORDER: ORCHA 19 (the story)

**From:** Kiro, Technical Director | **To:** Orcha | **Authority:** Chief
**Status:** work order, nothing started. **This order is writing only. You change no code, no level file and no art.**

**Status update, 2026-10-15:** Chief has approved official story canon (`docs/STORY_CANON_THE_MERIDIAN_INCIDENT.md` and `docs/STORY_CANON_MALIK_CARTER.md`: Malik Carter, Meridian Industries, MIOR, Project Tempest, six chapters). **Step 1 (three premises) is done and superseded.** Read the canon first. Steps 2 and 3 remain: a short story bible that points at the canon, and `docs/LEVEL1_DIALOGUE.md` with every line the player reads in Level 1, written to the canon. The "New in round 10" section below is now confirmed rather than a candidate.

Welcome back. You have been away, so this order gives you a short reading list and one job: **the story.**
Chief assigned it to you himself.

## What changed while you were away (just enough)
- The game is **OVERCHARGE** (final name). The old "Static Shock" name is retired.
- Chief declared the old design documents law, then asked for a rework. The new documents are
  `docs/GAME_DESIGN_V2.md` and `docs/LEVEL_DESIGN_V2.md`. The old ones are in `docs/archive/`, unchanged.
- **Level 1 is being finished first, completely.** Levels 2 to 6 are paused.
- Aki and Codex are building Level 1's tools and runtime features. You are not part of that.
- The hero absorbs electricity from the city and spends it on gates. That is the whole game loop.

## Reading list (about 30 minutes)
1. `docs/STORY_BIBLE_DRAFT.md`. This is my starting material: what the repo already says (almost nothing),
   three premises, an outline, Level 1 story beats and open questions.
2. `docs/GAME_DESIGN_V2.md`: sections 1 (identity), 7 (world and NPCs) and 13 (decision ledger).
3. `docs/LEVEL_DESIGN_V2.md`: sections 3.2 to 3.5 and 4.6 (zones, NPCs, the foreshadow and the AC secret).
4. `src_scroll/levels/level1.json`, only the `npcs` array (three NPCs; two still say the placeholder "New line").

## New in round 10: Chief's concept sheet names MIOR and Project Tempest
Chief sent a concept sheet for the charge-upgrade items. It is branded **MIOR, "Meridian Institute of
Research"** and mentions **MIOR technology, atmospheric research, Project Tempest (a storm experiment) and
MIOR drones.** Read the "NEW LORE FROM CHIEF" paragraph in `docs/STORY_BIBLE_DRAFT.md`. Treat it as a strong
candidate for the premise. **Ask Chief whether it is canon before you build on it.**

## Chief's decisions you must respect
- **Tone: Static Shock inspired.** A young, relatable street-level hero, humour beside real stakes, a
  neighbourhood that feels lived in, problems that come from the city. **Inspired is not copied:** no character,
  name, place or plot of the original show. The hero, city and cast must be original.
- **Premise, hero name and city name are not decided.** Chief will pick; he said "I'll think of something."
- **No cutscenes** (none exist, and Chief said to develop the story first). The story reaches the player only
  through NPC speech bubbles, signs, graffiti, posters, the objective card, level names and the level-complete
  banner.
- The drone is foreshadowed in Level 1 by **story, not a live enemy**: an NPC line, a sign, graffiti.
- Hint lines are **observations, never instructions** ("that machine's dead; they run on a few volts"). The world
  teaches; text only confirms.
- Drained lamps do **not** relight at the end of a level.
- The hero's existing look: young Black man, swept short locs, dark streetwear, purple high-tops, cyan gloves.

## Deliverables
### Step 1: premise options (do this first, then stop for Chief)
Write `docs/STORY_PREMISES.md`: **three premises**, each at most one page: the one-line pitch, what the hero
wants, who the opposition is, why the gates cost power and the drones exist, how Levels 1 to 6 would feel
(names are fixed: Neon Rise, Split Decision, Don't Get Hit, Carry Current, Live Wire, Descent), and what the
ending question is. You may reuse A, B or C from the draft, improve them or replace them. Say which one you
would pick and why. **Then HOLD. Chief chooses.**

### Step 2: after Chief picks, `docs/STORY_BIBLE.md`
Hero (name, age, voice, what they want), the city (name, districts), the opposition, three to five recurring
characters, the world rules (why the power is out or rationed), and a one-paragraph arc for Levels 1 to 6.
Keep it short enough that a new agent reads it in ten minutes.

### Step 3: `docs/LEVEL1_DIALOGUE.md`, every line the player will read in Level 1
The level has these slots (the layout is in LEVEL_DESIGN_V2 4.3a):
| Slot | Count | Notes |
|---|---|---|
| Smoke-break worker A and B | replace "New line" | They know the grid and fear their employer |
| Streetlamp woman | keep her four lines or rewrite | Chief ruled her tone "per NPC"; she is flirtatious today |
| Hint NPCs | 3 | Observations only; one near the vending machine, one on the upper roof, one at the tower |
| Flavor NPCs | 4 | Colour, no information |
| **Window NPC, two line sets** | 2 to 4 each | Before the AC is powered she complains about the heat; after, she thanks God it is back on |
| Drone foreshadow | graffiti text, a sign text, one NPC line | Told by story, not a live enemy |
| AC secret room clue | 1 poster or graffiti | The first story clue; depends on the premise |
| Objective card, level-complete line | optional | The card already reads "Try absorbing power from a street lamp" and "POWER THE EXIT" |

**Format limits (from `npc.js`):** a speech bubble is about 220 px wide and at most 6 lines; the default
duration is 3.5 s; a line should be **under 90 characters** and read in one glance. Give each NPC an id, a
role tag (`hint`, `flavor` or `story`), and a tone note.

## Rules
- Writing only. Do not edit `src_scroll/`, `editor/`, `assets/` or any level JSON. **Chief owns the level files**
  and places your lines himself in the Builder.
- Do not invent mechanics. If the story needs one (a talking terminal, a boss), write it as a request to Chief.
- Do not use em dashes; keep sentences short. Plain words.
- Report as `ORCHA 19 STEP <1|2|3>`: file, commit SHA, three bullets on what Chief should decide next.
  Then HOLD. Do not merge to the live line.
