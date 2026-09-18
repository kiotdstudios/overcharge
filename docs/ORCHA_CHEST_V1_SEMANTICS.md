# ORCHA — CHEST v1 SEMANTICS

**From:** Orcha · **For:** Chief's ratification · **Status:** HOLD — no code until ruled.
**Filed early to unblock Aki** (A9 Builder support depends on this schema landing).

Chief: *"i need to change the route; and have a chest that you can open behind the fence to
actually teach the lesson for split decision."*

Each decision below is numbered with my recommendation. Approve with **"1-9 yes"** or override
individually, e.g. **"1-9 yes except 3, make it 4"**.

---

## The constraint that drives everything

Level 2's economy is **frozen** and measured from the shipped file:

```
sources 10   switch SW1 -2   exit EXIT -8   margin 0   checkpoints 0
```

**Margin 0 means the level is exactly solvable.** A chest that COSTS charge makes Level 2
unsolvable. A chest that GIVES charge is the only version that can exist without touching the
frozen economy, and it is also what turns the switch from a toll into a real choice: the player
pays 2 for the switch and gets more than 2 back, so the detour is worth taking.

---

## D1 — Does opening a chest cost charge?
**Recommendation: NO. Free to open.**
The switch's 2 is already the price of the route. Adding a second cost at margin 0 makes the
level unsolvable, and reward-minus-cost arithmetic is harder for a player to read mid-level than
"pay the switch, get the prize".

## D2 — What does it contain?
**Recommendation: charge, and only charge in v1.**
It is the only currency the game has, so the tradeoff stays visible and arithmetic. A permanent
upgrade would be a new system with save implications, and nothing else in the game grants one.

## D3 — How much charge?
**Recommendation: 4.**
Must exceed the switch's 2 or the detour is a trap. 4 makes the choice clearly correct when you
take it, gives Level 2 a real margin for the first time, and is one generator's worth so it reads
as a familiar quantity. `chestReward` in the level JSON, per-chest, so Chief can tune it.

## D4 — Once, or repeatable?
**Recommendation: once, latched.**
Same pattern as the gate's dormancy latch and the switch's `burnDone`. An `opened` flag that
never resets. Repeatable would let a player farm infinite charge and break every margin
assertion in the completability proof.

## D5 — Does it survive a checkpoint restore?
**Recommendation: YES — the `opened` flag is snapshotted.**
Crates already set this precedent (`level.js:171`), and the reason is the same: without it a
player could open the chest, die, and open it again. Note Level 2 currently has **zero
checkpoints**, so this is protection for Levels 3-5 rather than for Level 2 today.

## D6 — How is it opened?
**Recommendation: hold SPACE within `INTERACT_RADIUS`, like every other device.**
SPACE is already the charge/interact verb after ORDER 005. A new key for one device would be a
worse answer than reusing the established one. It is instant rather than gradual — there is
nothing to accumulate, so a progress bar would be theatre.

## D7 — Where does the charge go?
**Recommendation: straight through `player.giveEnergy(n)`.**
Non-negotiable on my side: it is the single ingest authority, so banking, pip overflow and the
MAX_CHARGE cap all behave correctly for free. **No device gets its own ledger.** If the player is
already at full charge the overflow banks as a pip exactly as a generator's would.

## D8 — Schema and default behaviour
**Recommendation: a `chests` array, absent means nothing.**
```json
"chests": [ { "id": "CH1", "x": 2400, "y": 288, "reward": 4, "opened": false } ]
```
An absent or empty `chests` array must mean **zero behavioural change** for every existing
level — the same discipline as `crates`. Grid-aligned on X, grounded on Y like every device;
never assert `y % 32`.

## D9 — What it looks like
**Recommendation: use the PixelLab `metal box` art already in Chief's account.**
I found `metal box` there, 128x128, with `base`, `open` and `open and empty` states already
generated — which is exactly a chest's three visual states. **Caveat:** PixelLab's MCP cannot
currently return a completed image (`Value is not JSON serializable: dict`), so I cannot pull it
programmatically. Chief can download it from pixellab.ai, or I draw it procedurally for v1 and
the PNG drops in later.

---

## Out of scope for v1, deliberately
- Chests containing anything other than charge.
- Locked chests requiring a key or a cost — see D1.
- Chests in a level that also has enemies. The breakdown's own note keeps enemies and crates
  apart in v1; I would keep enemies and chests apart for the same reason until Chief says
  otherwise.

## What I build once ratified
`_dev/chest.mjs` mutation-tested both directions; placement guards in
`parity_regression.mjs` for the new object type; `chests` wired into the checkpoint
snapshot/restore; and the completability proof taught that a chest's reward counts toward
available energy. Aki's A9 Builder work unblocks the moment the schema in D8 is ratified.

## The route itself is NOT mine
The fork, where the chest sits, which path is longer, and whether Level 2 gets a checkpoint are
Chief's. I will report if the level becomes unsolvable; I will not re-author it.