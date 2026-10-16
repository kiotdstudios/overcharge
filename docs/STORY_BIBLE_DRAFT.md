# OVERCHARGE: story bible, first draft

**SUPERSEDED 2026-10-14: Chief approved official story canon. Read `docs/STORY_CANON_THE_MERIDIAN_INCIDENT.md` and `docs/STORY_CANON_MALIK_CARTER.md` instead.** This file is kept as the brainstorm that led there; the MIOR paragraph below is now confirmed.

**Status (original): BRAINSTORM, 2026-09-06. Nothing here is decided.** Chief asked to "start tossing ideas". Every
name, line and plot beat below is a **proposal** until Chief marks it. Tags: **FACT** (already in the repo),
**PROPOSAL** (Kiro), **QUESTION** (needs Chief). This file is a working draft and is not part of the design
documents' law until Chief says so.

**HANDOFF (round 4):** Chief is giving the story to **Orcha** and will decide the premise, the hero's name and
the city's name himself. He said "I'll think of something" on the premise, so none of A, B or C below is
chosen. Chief said the tone should be **Static Shock inspired**. This draft is the starting material for
Orcha, not a plan Kiro will keep writing. Kiro keeps only the engine facts (what the game can show) and the
Level 1 hooks that the design needs (the window NPC below).

**Tone (Chief, round 4): "Static Shock inspired, something along that realm."** In practice that means a
young, relatable street-level hero, humour alongside real stakes, a neighbourhood that feels lived in, and
problems that come from the city (power, money, neglect) rather than from space. **IP caution:** inspired is
fine; copying is not. The hero, name, city, powers' look and supporting cast must be original (flagged in
`GAME_DESIGN_V2` identity). No character, name or plot of the original show should appear.

Written for a game with **no cutscene system** (checked: none exists). So story reaches the player through
things the engine already does: NPC speech bubbles, signs and graffiti, posters, the objective card, the
level-complete banner, level names and the title screen.

---

## 1. What the repo already says (FACT)

I searched code, level data, assets and every doc. There is **no premise, no hero name, no city name, no
villain and no company** anywhere. What exists is a mood and a handful of named things:

- **Hero:** a young Black man with swept short locs, dark streetwear jacket and cargo pants, purple
  high-tops and cyan electrical gloves. The v6 design adds a teal lightning-bolt chest emblem. No name.
- **World:** a rainy night in a purple-and-indigo city. A light-rail train crosses the skyline. Art packs call
  it "Night City"; the palette is "Electric City". Neither is a stated city name.
- **The power premise:** the hero **absorbs electricity from the city** (lamps, fuse boxes, vending machines,
  cameras, signs) and spends it on **gates**. Drained things go dark.
- **Words already on screen:** "CIRCUIT CLOSED // POWER RESTORED" and "LEVEL COMPLETE" (level end),
  "DISCHARGED. All charge lost." (game over), "NEED TO POWER UP" and "POWER THE EXIT" (Level 1 card), and the
  tagline "Explore. Steal the current. Solve the circuit. Protect your charge. Power the exit."
- **Enemies:** only **drones** (Sky Sentry, Wheel Drone). Nothing organic. Security cameras sit beside them.
- **Named places:** Garry's Electronics, Russ's Tire Shop, Bry's Library, 24/7 MART, Coffee Bar, a gatehouse.
- **Level names:** Neon Rise, Split Decision, Don't Get Hit, Carry Current, Live Wire, Descent. The old GDD
  also lists Timed Circuit, Chain Reaction, Mixed Test and First Major Finale.
- **Existing NPC lines (Level 1):** the streetlamp woman says things like "This street eats the unprepared"
  and "Watch those gates, sweetheart." The two smoke-break workers still say the placeholder "New line".
- **Sample lines written by me earlier for tests, never in Chief's data:** "Third blackout this week" and
  "Funny how the gates never lose power." They hint at a **blackout** and **gates that keep their power.**
- **Tone words from GDD v1:** compact, readable, "puzzle first", "complexity over grind", light action.

**NEW LORE FROM CHIEF (round 10), a concept sheet for the charge-capacity upgrade items.** It is branded
**MIOR, "Meridian Institute of Research"** (a triangle logo) and its item descriptions say: compact energy
core "extracted from **MIOR technology**"; capacitor "used in **atmospheric research**"; crystallised energy
"from **Project Tempest**"; a "**Tempest Fragment**, fragment of the original storm experiment"; a reactor
"used in **MIOR drones**"; a data drive with "charge-enhancing firmware." Taken together: a research
institute, a storm experiment (Project Tempest) and drones that belong to it. This fits the blackout premise
(B) and gives the drones an owner. **QUESTION for Chief:** are MIOR and Project Tempest canon? If yes, Orcha
should build the story around them.

**IP note (QUESTION, already flagged in GAME_DESIGN_V2):** the first concept was inspired by *Static Shock*.
The hero, name and city must be original before release. Everything below is written to avoid borrowing.

---

## 2. Three premises (PROPOSAL)

### A. "Rationed" (the city under a power quota)
The city's grid was bought by one utility. Power is sold by the hour; districts are locked behind **gates**
that only open for paying customers, and **drones** enforce the schedule. The hero can hold a charge in their
body, which makes them the one thing the utility cannot meter.
- *Why gates cost 8:* each gate is a toll booth, and 8 is the price.
- *Risk:* it makes the hero a thief in a very literal way and the story turns political quickly.

### B. "Blackout" (RECOMMENDED)
Three weeks ago the city's main grid failed. Most of the districts are dark. **The gates and the drones were
never affected**: they run on a private feed. The hero is someone who can carry current, and moves from
district to district, **borrowing power from what still has it to restore what does not.**
- *Why I like it:* the end-of-level banner already says **"POWER RESTORED"**, the "dead since the blackout"
  line already exists, and it explains why lamps and vending machines are low on charge and why a person who
  stores electricity matters. Gates that keep their power while the street is dark is a clean question for
  the player to ask: *who gets to be powered?*
- *Drained lamps:* in B the hero is **moving** power, not stealing it. (Relighting lamps at the end of a
  level was **rejected by Chief**: the player cannot return to the level, so nobody would see it.)
- *Risk:* a blackout is a familiar premise, so the specific "who kept the gates on, and why" matters.

### C. "The Failsafe" (wild card)
The city's grid has a hidden safety system that woke up and put a person in charge of it. The hero is that
failsafe, half human, half circuit. Gates are **memories** of what the grid is protecting.
- *Why include it:* it justifies a dreamlike late game (Descent, the finale) and any ability the game adds.
- *Risk:* it is the biggest departure from the grounded street mood the art already sets.

---

## 3. If we pick B: a working outline (PROPOSAL)

**Hero.** Name **QUESTION.** Age 19 to 24. Not a chosen one: a person who got hit by something three weeks
ago and found they could hold current. Street-smart, quiet, funny when it counts. Voice only through the
actions the player performs, plus what NPCs say *to* them. (Fewer lines to write, fewer to localise.)

**The city.** Name **QUESTION.** Candidates that fit the art: *Halcyon*, *Lowline*, *Ninth Ward*, *Highgate*.
Districts are the levels. The skyline and the rail line in the background are the one constant.

**The opposition (faceless on purpose).** A utility, written on drone casings and gate plates.
Placeholder name: **Halcyon Power & Light.** Drones are its "load-balancing units"; the gate controllers are
"priority lines." Nobody in the early game ever meets a boss.

**Allies on the street.**
- *The streetlamp woman* (Level 1, FACT): sees everything from the same corner. She knows what the gates do
  at night and talks like someone who has learned not to say it plainly.
- *The smoke-break workers* (Level 1, FACT slot): line crew from the utility, off-shift. They know the grid
  and are scared of their own employer.
- *A pirate radio voice* (PROPOSAL): text between levels on the level-complete card, no cutscene needed.
  A stranger who has been watching the lamps relight and says so.

**Arc, mapped to the existing levels** (PROPOSAL; Levels 2 to 6 are paused, so this is a sketch only):

| Level | Name (FACT) | Story beat |
|---|---|---|
| 1 | Neon Rise | The first night. The hero relights one block. The first gate opens. A hint that the gates are fed by something else. |
| 2 | Split Decision | A rationing checkpoint. Spend your charge on yourself or on a neighbour: the first moral choice. |
| 3 | Don't Get Hit | The first drones. They are not hunting the hero: they are guarding the gates' feed. |
| 4 | Carry Current | Moving power across a hostile stretch to a district clinic. |
| 5 | Live Wire | Cutting a feed. The fence and the switch become the first real act against the utility. |
| 6 | Descent | Underground, to the substation. The source of the private feed. |
| 7 to 10 | (no plan) | Open. The finale should answer the question "who was the grid kept on for?". |

---

## 4. Level 1 as a story (PROPOSAL, works with premise B)

The player should leave Level 1 able to say **"the lights are out, the gates are not, and I'm the one who
can fix that."** Using only decorations and NPC lines.

**Start of the level.** A lit gate beyond the dark street, and a vending machine that hums faintly. The
objective card is the only text.

**Smoke-break workers (replace "New line"):**
- Worker A: "Grid's been down three weeks. Funny, the gates never flicker."
- Worker B: "Don't say that near the cameras."

**Streetlamp woman:** keep her four lines, add one that fits: "They turned the street off. They kept the door on."

**Foreshadowing the drones (Chief's choice: story, not an enemy):**
- Graffiti on a tower wall: **"THEY SEE THE LIGHT. STAY DARK."**
- A sign: **"LOAD MONITORING IN PROGRESS. UNITS ON PATROL."**
- Hint NPC: "If something small and square hovers over you, you're drawing too much."

**The window NPC and the AC unit (CONFIRMED design by Chief, round 4; wording is a PROPOSAL for Orcha).**
An apartment building near the plaza has an NPC in a window who complains about the heat. The AC unit on the
fire escape above and behind the spawn is the answer. When the player powers it, her line changes to thanks.
- Before: "It's an oven in here. Somebody fix that AC!" (or) "Third night with no air. I'm melting."
- After: "Oh, thank God. It's back on." (or) "Finally! Whoever you are, bless you."
This is also the Level 1 proof that the player's power changes real people's lives, in one line. The secret
room behind the hatch holds the Easter egg and the first story clue; its content depends on the premise.

**Level complete.** Keep the banner as it is.

---

## 5. Questions I need answered

1. **Premise:** A, B (my pick), C, or a mix?
2. **Tone dial:** grounded and a little noir (the art's mood), hopeful and bright, or comic? The streetlamp
   woman's voice leans noir.
3. **Hero:** a name? Does the city know who they are? Do they have family nearby?
4. **City name:** one of mine, or yours?
5. **The utility:** an invented company, or no named company at all (just "the grid")?
6. ~~Relighting at the end of a level~~ (answered: no).
7. **Delivery:** only NPCs, signs and cards, or do you want to invest in a cutscene tool later?
8. **How much story:** a thin line (the hero, the dark city, the gates) or a full arc across ten levels?
9. **Who writes what:** I can draft every NPC line for your pass, or you tell me the voice for each NPC and
   I write to it.

**On handing this to another agent (you offered):** Orcha and Aki are the runtime and Builder lanes. Story is
a writing task, and the best use of another agent would be **drafting dialogue per NPC once you pick a
premise and a tone**, not choosing the premise. I'd keep the premise decision between you and me, then hand
them a short brief.
