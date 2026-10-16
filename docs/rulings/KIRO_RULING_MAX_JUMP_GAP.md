# STANDING RULE: Maximum Jump Gap

**Issued:** 2026-09-19  
**Authority:** Chief (KIOTD Studios)  
**Scope:** All OVERCHARGE levels, all agents

---

## The Rule

A player can max-jump **4 tiles** but that is already a difficult jump. Any gap that forces a max jump is unfair. Hard-but-fair ceiling is **3 tiles**.

| Gap type | Max allowed | Notes |
|---|---|---|
| Horizontal gap (same elevation) | **3 tiles (96 px)** | at full sprint; 4 tiles (128 px) is unbeatable |
| Horizontal gap (jumping down) | 5 tiles | extra horizontal range when dropping |
| Vertical step up (single jump) | 3 tiles (96 px) | max jump height = 102.7 px = ~3.2 tiles |

---

## Physics Reference

```
GRAVITY        = 900 px/s2
JUMP_FORCE     = -430 px/s
PLAYER_SPEED   = 75 px/s   (walk)
RUN_MULTIPLIER = 1.7        -> sprint = 127.5 px/s
TILE           = 32 px

Max jump height (apex above ground)  = 430x430/(2x900) = 102.7 px = 3.21 tiles
Full-arc air time                    = 2x430/900        = 0.956 s
Max horizontal distance (sprint)     = 127.5 x 0.956   = 121.8 px = 3.81 tiles
Max horizontal distance (walk)       = 75    x 0.956   = 71.7  px = 2.24 tiles
```

A 4-tile horizontal gap = 128 px. Sprint max = 121.8 px. **Gap of 4 tiles at same elevation is strictly unbeatable.**

---

## What This Fixed

Level 4 ("CARRY CURRENT") had 5 unbeatable gaps:

| Location | Gap before | Gap after | Fix |
|---|---|---|---|
| Row 9 (elevated), cols 18-21 | 4 tiles | 3 tiles | Added tile at col 18 |
| Row 10 (elevated), cols 18-21 | 4 tiles | 3 tiles | Added tile at col 18 |
| Row 11 (floor), cols 40-43 | 4 tiles | 3 tiles | Added tile at col 40 |
| Row 11 (floor), cols 77-80 | 4 tiles | 3 tiles | Added tile at col 77 |
| Row 11 (floor), cols 83-86 | 4 tiles | 3 tiles | Added tile at col 83 |

---

## Enforcement

Level guard should reject any level where a required traversal gap exceeds 3 tiles horizontally at the same elevation. Until that check exists, this rule is enforced by code review (Kiro QA) and manual audit by Aki before any level commit.

Any intentional large gap (fall pit, alternate route) must have a floor path below that is itself gap-legal.
