# ORCHA â€” CHEST v1 SEMANTICS

**From:** Orcha Â· **For:** Chief's ratification Â· **Status:** HOLD â€” no code until ruled.
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

## D1 â€” Does opening a chest cost charge?
**Recommendation: NO. Free to open.**
The switch's 2 is already the price of the route. Adding a second cost at margin 0 makes the
level unsolvable, and reward-minus-cost arithmetic is harder for a player to read mid-level than
"pay the switch, get the prize".

## D2 â€” What does it contain?
**Recommendation: charge, and only charge in v1.**
It is the only currency the game has, so the tradeoff stays visible and arithmetic. A permanent
upgrade would be a new system with save implications, and nothing else in the game grants one.

## D3 â€” How much charge?
**Recommendation: 4.**
Must exceed the switch's 2 or the detour is a trap. 4 makes the choice clearly correct when you
take it, gives Level 2 a real margin for the first time, and is one generator's worth so it reads
as a familiar quantity. `chestReward` in the level JSON, per-chest, so Chief can tune it.

## D4 â€” Once, or repeatable?
**Recommendation: once, latched.**
Same pattern as the gate's dormancy latch and the switch's `burnDone`. An `opened` flag that
never resets. Repeatable would let a player farm infinite charge and break every margin
assertion in the completability proof.

## D5 â€” Does it survive a checkpoint restore?
**Recommendation: YES â€” the `opened` flag is snapshotted.**
Crates already set this precedent (`level.js:171`), and the reason is the same: without it a
player could open the chest, die, and open it again. Note Level 2 currently has **zero
checkpoints**, so this is protection for Levels 3-5 rather than for Level 2 today.

## D6 â€” How is it opened?
**Recommendation: hold SPACE within `INTERACT_RADIUS`, like every other device.**
SPACE is already the charge/interact verb after ORDER 005. A new key for one device would be a
worse answer than reusing the established one. It is instant rather than gradual â€” there is
nothing to accumulate, so a progress bar would be theatre.

## D7 â€” Where does the charge go?
**Recommendation: straight through `player.giveEnergy(n)`.**
Non-negotiable on my side: it is the single ingest authority, so banking, pip overflow and the
MAX_CHARGE cap all behave correctly for free. **No device gets its own ledger.** If the player is
already at full charge the overflow banks as a pip exactly as a generator's would.

## D8 â€” Schema and default behaviour
**Recommendation: a `chests` array, absent means nothing.**
```json
"chests": [ { "id": "CH1", "x": 2400, "y": 288, "reward": 4, "opened": false } ]
```
An absent or empty `chests` array must mean **zero behavioural change** for every existing
level â€” the same discipline as `crates`. Grid-aligned on X, grounded on Y like every device;
never assert `y % 32`.

## D9 â€” What it looks like
**Recommendation: use the PixelLab `metal box` art already in Chief's account.**
I found `metal box` there, 128x128, with `base`, `open` and `open and empty` states already
generated â€” which is exactly a chest's three visual states. **Caveat:** PixelLab's MCP cannot
currently return a completed image (`Value is not JSON serializable: dict`), so I cannot pull it
programmatically. Chief can download it from pixellab.ai, or I draw it procedurally for v1 and
the PNG drops in later.

---

## Out of scope for v1, deliberately
- Chests containing anything other than charge.
- Locked chests requiring a key or a cost â€” see D1.
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

---

# RATIFIED BY CHIEF — 2026-09-18 09:10

His rulings, recorded verbatim beneath the proposal rather than edited into it, so the
proposal and the decision stay separately traceable.

| # | Proposed | **CHIEF RULED** |
|---|---|---|
| D1 | free to open | **COSTS 2 charge** — "yes this box 2 charges" |
| D2 | charge only | **a full pip token** |
| D3 | reward 4 | **reward 10** — "a full pip is 10 charges" |
| D4 | once, latched | **once** (as proposed) |
| D5 | opened flag snapshotted | **snapshotted** — see his exact wording below |
| D6 | hold SPACE | **SPACE** (as proposed) |
| D7 | route via giveEnergy | *"i dont know what u mean"* — see MY CALL below |
| D8 | `chests` array schema | *"idk what that is"* — see MY CALL below |
| D9 | PixelLab metal box | **INSTALLED** from his Downloads; `open_and_empty` is the last frame |

## D1/D3 — the economy still works, and it works BETTER

I recommended free-to-open because a cost at margin 0 makes Level 2 unsolvable. **Chief's
cost 2 / reward 10 is solvable**, because the reward far exceeds the cost. Traced:

```
A1 +4  ->  SW1 -2 (2 left)  ->  chest -2 (0 left)  ->  reward +10 (10)
       ->  E1 +6 (16)       ->  EXIT -8 (8 left)
```

Level 2's margin goes from **0 to +8**, and the detour now pays **net +8** for a 2-charge
switch and a 2-charge chest. That is a stronger version of the lesson than my proposal: the
player spends twice and is rewarded well for it, so "spend to gain" is unmistakable.
`MAX_CHARGE = 10` confirmed in `constants.js`, so "a full pip is 10 charges" matches the engine
exactly — no conversion needed.

## D5 — his wording, and why it is exactly what snapshotting gives
> *"if chest is open and player dies before checkpoint its able to be open again; if player
> opens hits checkpoint and dies u cant open it again"*

That is precisely the behaviour of putting `opened` in the checkpoint snapshot:
- open chest, die **before** any checkpoint -> restore to level start -> chest closed, reopenable
- open chest, **cross a checkpoint**, then die -> restore to that snapshot -> chest stays open

No special-casing needed. Same mechanism `crates` already uses (`level.js:171`).

## D7 — MY CALL (plumbing, not design). Reversible.
The question was *where the 10 charge is added*. Answer: through the same single function every
generator already uses, so banking, the pip cap and overflow all behave identically to absorbing
from a generator. The chest gets **no separate charge logic of its own**.

Visible consequence, the only part Chief may care about: at 0 charge the reward fills the bar to
full and banks **1 pip**; if the bar already holds charge the overflow banks a pip and the
remainder stays in the bar. Either way the player is **+10 charge richer**. If Chief instead wants
the pip to land **directly in the reserve and never touch the bar**, that is a one-line change —
say so.

## D8 — MY CALL (file format, not design). Reversible.
"Schema" just means how the chest is written into the level file so the Builder and the game
agree. It will look like this, and Aki needs exactly this to build her `+ Chest` button:
```json
"chests": [ { "id": "CH1", "x": 2400, "y": 288, "cost": 2, "reward": 10 } ]
```
A level with **no `chests` entry behaves exactly as it does today** — nothing changes anywhere.

## Still Chief's, untouched
The fork, where the chest sits, which path is longer, whether Level 2 gets a checkpoint. And
whether the `low top-down` art reads correctly in a side-scroller — see
`assets/objects/chest/GEOMETRY.md`.