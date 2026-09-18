# KIRO RULING — `blockOnly` GATES BECOME Y-AWARE. Exit and chargeable gates do not.

**Ruled by:** Kiro, Technical Director
**Raised by:** Orcha, who proved it by simulation before building anything
**Amends:** `docs/KIRO_ORDER_ORCHA_16.md` §4, which contained an instruction that cannot be satisfied

---

## 1. My order was impossible and he was right to stop

ORCHA 16 §4 said *"place it so it gates the upper route only."* **That cannot be done.** He proved it:

```
player far ABOVE the fence      : blocked = true
player level WITH the fence     : blocked = true
player far BELOW on main floor  : blocked = true
blocksHorizontal(rx, rw) — Y IS NOT AN INPUT
```

`player.js:399` states the intent plainly: *"use blocksHorizontal (X-only) so the player cannot jump over
a closed gate — it acts as a full-height wall."*

In a side-scroller both branches of a fork must traverse the same X range to get from start to exit. So a
column-blocking fence seals **every** branch at that column, always. **Any fork I asked him to build would
have had a secretly impassable route — the exact failure §4 warned against.** Stopping to report rather
than building around it was correct, and it is the second time this weekend he has caught an error of
mine before it reached code.

## 2. The ruling

> **`blockOnly` gates block only the rows their hitbox actually occupies.**
> **Exit gates and chargeable gates keep X-only, full-height blocking, unchanged.**

### Why the split is right, not just convenient
These are two different fictions and always were:

- A **chargeable/exit gate** is an energy barrier — a force field filling the doorway. Full-height blocking
  is correct, and it must stay unjumpable or the exit cost becomes optional.
- A **fence** is a physical object with a height. `BARRIER` is `h: 64` — one tile of art, deliberately, after
  Chief reported the two-stacked-fences defect. A 64px-tall fence that blocks 578px of world is the
  inconsistency, not the fix.

Chief's own design law requires it: *"A barrier mid-level blocks the upper route."* **The upper route** —
which presupposes a lower one that stays open.

### Scope — narrow, and keep it narrow
- Gate the new behaviour on `blockOnly === true`. Nothing else changes.
- Do **not** generalise this into per-object Y-aware collision. One flag, one code path.
- Vertical extent comes from the hitbox (`y` .. `y + h`), consistent with everything else.

## 3. The sequencing risk — this is the part that can break a working level

**Level 2 currently works** with the fence sealing floor-to-ceiling. The moment `blockOnly` becomes
Y-aware, the existing `BARRIER` at `y=224 h=64` stops blocking the main floor below it — so **the player
walks under it and skips the switch entirely.** The puzzle Chief confirmed working would be dead.

**Therefore: the collision change and the Level 2 terrain rebuild must land in the SAME commit.** Do not
push the collision change on its own. A green suite between the two states is not sufficient — the level
would be trivially skippable in that window.

`level2-pre-fork` at `8f72425` is the rollback point if the fork reads worse than the corridor.

## 4. Verification — mandatory
1. **Exit gates must remain unjumpable.** Assert a player above an exit gate is still blocked.
   **Mutation-test it** by extending Y-awareness to exit gates and confirming the assertion fires. This is
   the single assertion protecting the whole exit economy — if a player can jump an exit gate, every level's
   charge cost becomes optional.
2. **The fence must block at its own rows and NOT below them.** Assert both directions.
3. **Route B must be genuinely passable with the switch never activated**, and Route A passable only after
   it. Both proven through `Level.update(dt, player)` and through O4's closure walk — not by calling
   collision helpers directly. That distinction is what hid the drone bug for two playtests.
4. **The F-series fence semantics stay intact.** Nothing here changes when a fence dies, how the burn plays,
   or that the switch is its only opener. If you find yourself touching those, stop.
5. Suites green, boot smoke fresh port, and re-verify the frozen economy traces after the rebuild.

## 5. Economy unchanged
```
A1 = 4    E1 = 6    SW1 = 2    EXIT = 8    chest cost 2 / reward 1 pip to reserve
```
Route A finishes rich, Route B finishes with 2. Confirmed by his own trace. **If the fork cannot be built
without moving a number, stop and report.**

## 6. Proceed
You are clear to implement. Order of work, unchanged otherwise:
1. Chest implementation
2. **This collision change + the Level 2 fork, one commit**
3. Drone behaviour + Level 3 together
4. Levels 4 and 5
5. Pip UI last

Your point that the drone work is unaffected is correct — if you would rather do that while this sits, that
is your call. But this is now ruled, so nothing is blocked.
