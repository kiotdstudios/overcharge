# KIRO ORDER — ORCHA 16

**From:** Kiro, Technical Director
**Chief:** *"i want one of these agents to place the chest on lvl 2 and to split the map into two routes like the lvl breakdown suggests"*
**Owner:** you. Aki already has the asset-bank half (A9, `docs/KIRO_ORDER_AKI_10.md`).

---

## 1. Sequencing — do not place a chest that does not exist yet

```
1. Implement the chest (semantics + CHIEF_RULING_CHEST_PIP_RESERVE)
2. THEN restructure Level 2: the fork + place the chest
3. O4 completability must prove BOTH routes
```

Placing a chest before the runtime honours it produces a level that silently does nothing. Implement
first.

## 2. TAG A ROLLBACK POINT BEFORE YOU TOUCH LEVEL 2

**Level 2 is the only level Chief has confirmed working** — *"other than that level 2 works."* You are
about to restructure it. Tag first:

```
git tag -a level2-pre-fork -m "Level 2 as Chief playtested it working, before the fork restructure"
git push origin level2-pre-fork
```

If the fork reads worse than the corridor, that tag is how he gets the working version back in one
command. Do this before the first edit, not after.

## 3. The design — the fork is the whole point, and the arithmetic already works

Chief's law:

> *"A barrier mid-level blocks the upper route. A switch earlier in the level opens it — but costs 2
> charge to activate... there's a fork and your charge budget decides which way you go."*

The level currently has **no fork** — it is a corridor with a fence in it, so the switch is a toll, not a
choice. Two routes make it a decision. Traced against the frozen economy:

```
ROUTE A — pay the toll
  A1 +4 → SW1 -2 (2) → fence opens → chest -2 (0) → +1 PIP reserve (10 usable)
        → E1 +6 → EXIT -8        finishes RICH

ROUTE B — skip it
  A1 +4 → E1 +6 = 10 → EXIT -8   finishes with 2, never sees the chest
```

**Both routes complete.** Route B is tighter and cheaper; Route A costs 4 total and pays back a full pip.
That is a genuine tradeoff and it is what the level's name promises.

**The chest goes behind the fence.** It is the reward that makes paying 2 for the switch worth choosing
rather than merely mandatory.

### Economy is FROZEN — do not touch these
```
A1 = 4    E1 = 6    SW1 required = 2    EXIT required = 8    chest cost 2 / reward 1 pip
```
If the fork cannot be built without changing a number, **stop and report** rather than adjusting one.

## 4. Build constraints
- **Two physically distinct paths** that rejoin before the exit. Upper route behind the fence, lower route
  open. Use terrain, not invisible walls.
- **Route B must be reachable without the switch** — verify it, do not assume. A fork where one branch is
  secretly impassable is worse than a corridor.
- **The fence must actually block Route A.** `blocksHorizontal()` ignores Y, so a `blockOnly` gate seals a
  horizontal band floor-to-ceiling. Place it so it gates the upper route only.
- Terrain extends under and beyond all content — the Level 3 defect as a rule.
- Grid-aligned on X, grounded on Y. Never assert `y % 32`.
- Only the 12 palette tiles: IDs 10–13 and 16–23. Never 14/15.
- `SW1.linkedId` must still resolve to the fence's `id`. A dangling link silently breaks the puzzle and is
  exactly how Chief lost the BARRIER once already.
- Keep the `2_SPLIT_DECISION.json` twin in sync with `level2.json`.

## 5. Verification — both routes, not just one
- **O4 completability must prove BOTH routes reach the exit independently.** Assert Route B completes with
  the switch never activated, and Route A completes through the chest. If O4 only walks one closure,
  extend it — that is the check this order lives or dies on.
- Assert the chest reward lands as **a reserve pip with the bar untouched** (bar before == bar after,
  pips +1), and mutation-test it by routing it through the normal ingest path.
- Assert `usableEnergy` still covers the exit on Route A after the pip change.
- Suites green, boot smoke fresh port, push when green.

## 6. What is Chief's, not yours
Which route *feels* like the obvious one, whether the fork is legible at speed, and whether Route A's
reward is worth the detour. **Report the traced numbers and let him judge.** He said he will make granular
edits — you are building a correct, playable fork, not the final tuning.

## 7. Queue after this
Drone behaviour + Level 3 together (ORCHA 15), then Levels 4 and 5. Work the queue; do not stop to
narrate.

— Kiro, Technical Director
