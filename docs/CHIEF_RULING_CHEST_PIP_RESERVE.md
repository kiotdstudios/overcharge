# CHIEF RULING — CHEST REWARD GOES STRAIGHT TO THE RESERVE

**Ruled by:** Chief · **Recorded by:** Kiro · **Status:** LAW
**Amends:** `docs/ORCHA_CHEST_V1_SEMANTICS.md` decision 7. Everything else in that doc stands.

---

## 1. The ruling
> *"id rather rather the pip drop straight into the reserve without touching the bar"*

The chest's **reward 10 becomes 1 banked pip placed directly in the reserve.** It must **not** flow
through the bar.

### Why it matters mechanically
Routing 10 through the normal ingest path fills the bar, crosses `MAX_CHARGE = 10`, banks a pip and
resets the bar to 0 — same end state on paper, but with a visible bar-fill-and-flush animation the player
reads as "I gained charge and then lost it." A pip appearing in the reserve reads as "I gained a battery,"
which is what the chest is.

### ORCHA — implementation constraints
- **The single energy authority still owns it.** Do not write to `bankedPips` raw. This is a **new
  entry point on the authority** — the mirror of `spendPip()` — not a bypass of it. `player.js` exposes
  exactly four energy entry points and nothing outside that block assigns to `charge` or `bankedPips`;
  that rule is not relaxed.
- **Respect `MAX_BANKED_PIPS`.** At the cap the pip must be refused, not silently destroyed and not
  allowed to exceed. State in your report what happens when a full-reserve player opens a chest — my
  ruling: **the chest does not open**, so the reward is not wasted and the player can return. If you
  think refusing to open reads worse than opening-and-wasting, argue it before implementing.
- **The bar must be untouched.** Assert it explicitly: bar value before == bar value after, pips +1.
  That assertion is the whole ruling and it must be mutation-tested — route the reward through the
  normal ingest path and confirm it fires.
- **Checkpoint snapshot unchanged.** The `opened` flag still lives in the snapshot per decision 5.
- **Cost 2 is unchanged** and still spends through `spendEnergy`.

### Level 2 economy — re-verify after the change
The traced path was:
```
A1 +4 → SW1 -2 (2) → chest -2 (0) → reward +10 (10) → E1 +6 (16) → EXIT -8 (8 left)
```
With the reward as a reserve pip rather than bar charge, **confirm `usableEnergy` still covers the exit.**
The gate asks affordability via `usableEnergy` / `canAfford()`, and a full bar or a pip-only reserve both
open a gate — so this should hold, but **verify it rather than assuming**, and state the traced numbers
in your report.

---

## 2. Art orientation — CLOSED, keep as-is
> *"i made another crate on pixel lab and hit side scroller and got the same orientation so ima just keep
> it for now as is"*

The `low top-down` look is **accepted**. Chief tried regenerating at side-scroller view and got the same
orientation, so this is a generator limitation rather than a mistake.

**Nobody spends further time on it.** Do not add a runtime transform, do not skew or rotate it in code, and
do not regenerate. If it reads badly once it is in a level, Chief reopens it — and the fix would still be
art, never a transform.

This closes the only open question on the chest. `ORCHA_CHEST_V1_SEMANTICS.md` is fully ratified.

---

## 3. Who acts
- **ORCHA** — implement the reserve-direct reward under the energy authority, with the bar-untouched
  assertion and the cap behaviour. Fold it into the chest implementation; it is not a separate piece of work.
- **AKI** — **nothing changes for you.** The schema is still `{ id, x, y, cost, reward }` and the art is
  final. A9 proceeds exactly as ordered in `docs/KIRO_ORDER_AKI_10.md`.
