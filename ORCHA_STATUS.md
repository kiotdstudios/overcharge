# ORCHA Status History

Gameplay / runtime systems. Branch: `agent/orcha-dev`.
Flow: `agent/orcha-dev` → Kiro QA → `agent/orcha-gameplay` → Pages. No direct work on `agent/orcha-gameplay`, no merges to `main`.

---

## Order #004 — Charge System Authority

- **Date/time:** 2026-09-11T06:16-04:00
- **Branch:** `agent/orcha-dev`
- **Base commit:** `3cab1d9a667585626984b695595101698663c9fa`
- **Assignment:** Audit every energy/charge path, establish ONE authoritative energy model, implement the correct bank/refill behavior, prove it with the required test matrix, and keep the protected parity/electricity suites intact. No editor changes, no Level 1 changes, no merges.

### Architecture found (audit)

The canonical INGEST model was already present on this branch from `b558d1b` (verified by content, not just SHA — `git merge-base --is-ancestor` reports ancestry but I re-checked the actual symbols in `player.js`). Already correct and needing no change:

- `usableEnergy` getter = `charge + bankedPips * MAX_CHARGE`, used by both HUD and gameplay
- `canAfford()`, `energyHeadroom`
- `giveEnergy()` — fill → top out → +1 pip → reset → continue; refuses at pip cap and returns the accepted amount so callers refund instead of destroying
- `_pullReserve()` — demand-driven pip promotion
- `ui.js:257` already calls `player.canAfford(needed)`, so the "single authority" for affordability was in place

All three §10 gate bugs were therefore **already fixed** before this order: banking on full, false `POWER REQUIRED`, and pip-spend not transferring (F-key already used the real `dev.receive()` path).

**Baseline captured before touching anything** (protected suites, unmodified):
- `node _dev/parity_regression.mjs` — **63 passed, 0 failed**
- `node _dev/test_electricity.mjs` — **37 passed, 0 failed**

**Required matrix run against unmodified code: 9 of 11 rows passed.** The two that did not are the subject of rulings 1 and 2 below.

### Gaps found (the real work of this order)

| # | Gap | Evidence before fix |
|---|---|---|
| 1 | **No SPEND authority.** Ingestion was centralized; spending was ad hoc. | `spendEnergy` did not exist — 0 hits |
| 2 | **`takeDamage()` could not see the reserve.** | `bar 0 + 3 pips`, `takeDamage(3)` → usable **30 → 30, lost 0** |
| 3 | **No validation on state restore.** | forcing `charge=999, pips=99` → `energyHeadroom = **-1929**` |

Raw writes bypassing the authority: `player.js` `scatter()`, `takeDamage()`, `_updateDischarge()`, `_updatePipSpend()`; `main.js:132/133` and `:147`.

### What was consolidated

`player.js` now exposes exactly four energy entry points, and **nothing outside that block assigns to `charge` or `bankedPips`**:

| Entry point | Role |
|---|---|
| `giveEnergy(n)` | INGEST. Returns accepted. (pre-existing) |
| `spendEnergy(n)` | **NEW.** SPEND mirror: drains bar, promotes a pip when dry, returns actually-spent, never negative, never fabricates. |
| `spendPip()` | **NEW.** Withdraw exactly one whole battery without disturbing the bar (F-key). |
| `setEnergyState(c, p)` | **NEW.** Validated save/load write. Clamps + warns; returns `false` when it had to correct. |
| `_pullReserve()` | internal, demand-driven only |

Routed through the authority (previously duplicated arithmetic):
- `scatter()` → `spendEnergy(1)`
- `takeDamage()` → `spendEnergy(amount)`
- `_updateDischarge()` → `spendEnergy(want)` (removes its own `charge -= frameSpend` and its explicit `_pullReserve()`; a frame's transfer can now span a pip boundary without stalling)
- `_updatePipSpend()` → `spendPip()` (removes raw `bankedPips--`)
- `main.js` `_applySnapshot()` and `loadLevel(carryCharge)` → `setEnergyState()`
- New `_dropCharge()` conservation helper so scattered pickups sum to exactly what was deducted

### Behavior implemented

- **Banking:** bar fills → crosses MAX → `+1 pip`, bar resets to 0, leftover keeps filling the new bar. `bar 8 + 4 → bar 2 + 1 pip`.
- **Pip cap:** at `MAX_BANKED_PIPS` with a full bar, further energy is refused and `giveEnergy` returns 0. Nothing is destroyed.
- **Reserve refill:** on demand (spend/damage), `bar 0 + pips > 0` → consume 1 pip, bar to MAX, continue.
- **Gate:** affordability is asked via `usableEnergy` / `canAfford()`, so a full bar or a pip-only reserve both open a gate; `POWER REQUIRED` cannot appear while usable energy suffices.
- **F-key:** real transfer through `spendPip()` + `dev.receive()`. Whole pip consumed, surplus returned via `giveEnergy()`.
- **Restore:** out-of-range/NaN/fractional-pip states are clamped with a console warning rather than installed.

### Rulings applied (Kiro, 2026-09-11)

1. **`Bar 10 + 10 → Bar 0 + 1 pip` is a typo; the §7 invariant wins.** Correct result is `bar 0 + 2 pips` (20 usable, conserved). Encoded in the suite with the ruling cited inline.
2. **§8 eager per-tick auto-refill REJECTED; demand-driven stands.** The unconditional version was the regression fixed in `b558d1b` (it fought banking, so pips could never accumulate). Cited in a comment above `_pullReserve()`, and guarded by two regression tests asserting idle ticks leave `bar 0 + 1 pip` untouched and that 3 banked pips survive idling.
3. **Partial-pip spend RATIFIED.** Whole pip consumed, surplus to bar. Now explicit policy in the comment block, with a test proving `3 delivered + 7 returned = 10`.

### Files changed

- `src_scroll/player.js` — energy authority: `spendEnergy`, `spendPip`, `setEnergyState`, `_dropCharge`; `scatter`/`takeDamage`/`_updateDischarge`/`_updatePipSpend` routed through it
- `src_scroll/main.js` — `_applySnapshot` and `loadLevel` restore via `setEnergyState`
- `_dev/energy_authority.mjs` — **new** Order 004 regression suite
- `ORCHA_STATUS.md` — **new** (this file)

Not touched: editor, `assets/`, `src_scroll/levels/`, Level 1 content, `main`, legacy WIP.

### Tests executed / results

| Suite | Before | After |
|---|---|---|
| `node _dev/energy_authority.mjs` | did not exist | **51 passed, 0 failed** |
| `node _dev/parity_regression.mjs` | 63 passed, 0 failed | **63 passed, 0 failed** |
| `node _dev/test_electricity.mjs` | 37 passed, 0 failed | **37 passed, 0 failed** |
| Runtime boot smoke | — | **RUNTIME_BOOT_OK**, 0 errors |

New suite covers all 11 matrix rows, the 3 rulings, the 3 audit gaps, and a randomized conservation invariant: **400 runs × 40 interleaved gain/spend ops, worst energy drift 8.53e-14, 0 illegal states**.

### Observable gameplay change — explicitly stated (per Kiro's gate condition)

**No change to gameplay as currently played, with three deliberate exceptions:**

1. **`takeDamage()` — no observable change today.** Enemy contact uses `stun()`; `takeDamage()` has no live caller. The fix is to a dormant-but-live path. Behavior *does* change materially for whoever wires it up next: a player holding only banked pips now takes damage instead of being invulnerable.
2. **`scatter()` — behavior identical for whole-unit hits.** Only the sub-1.0-bar edge case changes: it previously deducted e.g. 0.5 but dropped a full 1-unit pickup, creating 0.5 out of nothing. Now the pickup matches the deduction.
3. **`_updateDischarge()` — one real improvement.** A single frame's transfer can now cross a pip boundary instead of being capped at the current bar, so a discharge no longer stalls for a frame at the boundary. At `DISCHARGE_RATE=3` and 60fps this is ~0.05 units per frame, so it is not expected to be visible; it is a correctness change, not a tuning change.

### Unresolved / for Chief or Kiro

- **Level 1 checksum is now `0167334D`**, not the `B2B714CA` I reported previously. I did not touch `src_scroll/levels/level1.json` (confirmed: not in my diff). Level 1 changed via Aki/Kiro work upstream of my base commit. Flagging so nobody reads the delta as mine.
- **`ChargePickup` now receives fractional values** in the sub-unit scatter case. It stores and grants `value` correctly, but its rendering was authored for 1-unit pickups. A 0.5 pickup will render at full size. Cosmetic only, and only in an edge case that previously created energy — flagging rather than changing render code under this order.
- `docs/` was not updated. If the energy model should be documented alongside `LEVEL_SCHEMA.md`, say so and I will add it as a separate change.

### Handoff

- Commit: see SHA in the report accompanying this entry
- Pushed to: `agent/orcha-dev`
- **Not merged.** Awaiting Kiro QA before any consideration for `agent/orcha-gameplay`.
