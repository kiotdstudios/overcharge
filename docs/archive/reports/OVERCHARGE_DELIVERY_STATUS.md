# OVERCHARGE — DELIVERY STATUS

**6 Sep 2026 · ~1 day of ship window · live `d2b3a1b` on `agent/orcha-gameplay`**
Branded PDF for Chief: `Desktop\OVERCHARGE_STATUS.pdf`

> **2 of 5 levels are ship-ready. 1 is broken, 2 do not exist.**
> The engine and every mechanic the first five levels need are built and tested. The gap is **level
> content** plus one enemy behaviour. That makes this a scope decision, not an engineering one.

---

## 1. Levels — measured from the live branch, not from reports

| # | Name | State | Terrain | Contents | Blocker |
|---|---|---|---|---|---|
| 1 | NEON RISE | **SHIPPABLE** | 66 cols built | 2 generators, exit (8), 1 checkpoint | none — Chief-passed |
| 2 | SPLIT DECISION | **AWAITING PLAYTEST** | 100 cols built | 2 generators, fence + switch, chest, two routes, exit (8) | fork + chest unplayed |
| 3 | LEVEL 3 | **BROKEN** | 38 of 100 cols | 3 generators, exit, 1 drone, **0 checkpoints** | 62% void; exit **behind** spawn |
| 4 | — | **NOT STARTED** | no file | — | does not exist |
| 5 | — | **NOT STARTED** | no file | — | does not exist |

`levels.json` declares **three** levels. Levels 4 and 5 are not stubs — there is no file for either.

## 2. Finished
**Mechanics:** charge economy and banked pips under one authority · generators · chargeable and exit gates ·
fence + switch incl. shorted state · timed crates and bridging · **chest** (cost 2, rewards 1 pip to reserve) ·
**two-route forks** via Y-aware fences · drone vision, terrain-blocked and narrow · checkpoints, death, respawn.

**Pipeline:** Builder with full asset bank · chest and player spawn placeable · one-click publish ·
`overcharge://push` handler · 10 suites at **789 passing** · completability prover · boot smoke · every art
pack measured rather than guessed.

## 3. Outstanding
| Item | Owner | State | What it takes |
|---|---|---|---|
| Level 3 terrain | Orcha | BROKEN | build the missing 62%, exit ahead of spawn, add checkpoints — largest piece on the board |
| Drone hover-harass | Orcha | ORDERED | close → hover → burst → reposition; fly back on de-aggro. Tied to Level 3 (patrol height is a level decision) |
| Level 2 playtest | Chief | READY NOW | fork legibility, chest pull, climb comfort, Route A reward |
| Levels 4 and 5 | Orcha | NOT STARTED | two levels from nothing — see §4 |
| Pip meter pulse | Orcha | ORDERED | art installed and measured; needs the procedural pulse |
| Vertical levels | both | BLOCKED | needs variable-height runtime — **not reachable in one day** |
| Merge Aki's work | Aki | 2 COMMITS | chest-in-Builder done and verified, sits off the live line |

## 4. The scope call — Chief's to make

Five levels in one day means finishing Level 3, building two from nothing, shipping a new enemy behaviour and
the HUD polish, then playtesting all of it. **I do not believe that lands at a quality Chief signs off** — he
has re-cut art twice and rejected work for feeling wrong.

**Recommended: ship three, cut two.** Finish Level 3 with the drone, land the pip meter, playtest all three.
Level 1 teaches charge, Level 2 teaches choice, Level 3 introduces threat — a complete arc that shows every
mechanic built, and the only option with real playtest time in it.

*Alternative A — five thin levels.* Hit the number with short levels reusing proven mechanics. Cost: little or
no playtesting, drone likely unfinished. The risk is not short levels, it is unplayed ones.

*Alternative B — two levels polished hard.* Ship 1 and 2 with full polish. Cost: the drone never appears, so
the most novel mechanic stays hidden and it reads as a two-level demo.

## 5. Risks and debt
- **Duplicate level files that disagree.** The manifest loads `level1/2/3.json`, but `1_NEON_RISE.json`,
  `2_SPLIT_DECISION.json` and `3_LEVEL_3.json` also exist and are **already out of sync** — the unused Level 3
  copy still has the 6 decorations Chief had deleted. Editing the wrong file loses work silently. Delete the
  unused set before anyone touches Level 3.
- **789 assertions cannot tell us whether the game feels good.** Every defect that mattered this weekend — drone
  seeing through floors, holding at distance, teleporting home — came from Chief playing.
- **Level 1 declares 100 cols and builds 66.** Cosmetic, but it makes the prover noisy so a real void stands out less.
- **Rollback:** `level2-pre-fork` → `8f72425`. Note it keeps the chest.

## 6. Verification behind this
```
chest              27/0     level2_fork        39/0
crate_timed        87/0     parity_regression 386/0
drone_patrol       17/0     energy_authority   88/0
drone_sensing      14/0     fence_switch       74/0
test_electricity   37/0     completability     20/1  <- Level 3

TOTAL 789 passed / 1 failed
```
The single failure is correct: `level3.json` terrain ends x=1216 of 3200 declared (62% void).

Fence clearance recomputed from engine constants — `JUMP_FORCE -430`, `GRAVITY 900`, `PLAYER_H 30`,
apex **102.7px**. Level 2 fence: opening capped, **jumpable = false**, fixed in `d2b3a1b`.

— Kiro, Technical Director
