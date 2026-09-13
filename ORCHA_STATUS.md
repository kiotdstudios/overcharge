# ORCHA Status History

Gameplay / runtime systems. Branch: `agent/orcha-dev`.
Flow: `agent/orcha-dev` â†’ Kiro QA â†’ `agent/orcha-gameplay` â†’ Pages. No direct work on `agent/orcha-gameplay`, no merges to `main`.

---

## ORDER FENCE_SHORT_CIRCUIT — powered fence + short-circuit wall switch

- **Date:** 2026-09-12T23:40-04:00
- **Branch:** `agent/orcha-dev` (synced from live `08d54cd` first)
- **Order:** `docs/ORDER_FENCE_SHORT_CIRCUIT.md` · **Ruling:** `docs/KIRO_RULING_FENCE_V1.md` (F1-F11 all RATIFIED)
- **Status:** COMPLETE — pushed, awaiting Kiro QA gate

### Tests

| Suite | Baseline | After |
|---|---|---|
| `_dev/fence_switch.mjs` (new) | — | **62 passed, 0 failed** |
| `_dev/parity_regression.mjs` | 141/0 | **163 passed, 0 failed** |
| `_dev/energy_authority.mjs` | 88/0 | **88 passed, 0 failed** |
| `_dev/crate_timed.mjs` | 87/0 | **87 passed, 0 failed** |
| `_dev/test_electricity.mjs` | 37/0 | **37 passed, 0 failed** |
| Main boot smoke | — | **PAGES_RUNTIME_BOOT_OK** |
| Testbed headless play | — | **FENCE_TESTBED_PLAYABLE_OK** |

**437 passing, zero regressions.**

### Implemented

- **Fence** (`style:"fence"` on a blockOnly gate): live loop is frames
  **001-008** at 10fps; open draws static `fence_dead.png`. Sprite tiled over the
  hitbox — Level 2's 32x128 barrier tiles the 64x64 art exactly 2x vertically,
  centred, **hitbox never changed**.
- **Wall switch** (`style:"wall"`): `on === false` draws `switch_on.png` (the F5
  inversion); on firing, burn frames **001-008** play once over ~0.67s, then it
  settles permanently on `switch_destroyed.png`. Never loops, never reverts.
- Both anchored from the **uniform canvas** (56x56 / 64x64), never per-frame bbox.
- `_destroyT` snapshotted (F11); `style` validated with warn-and-fallback;
  `style:"fence"` on a non-blockOnly gate refused.
- Parity guards: known style values, fence requires blockOnly, fence is not an
  exit, wall switch has a linkedId resolving to an existing blockOnly gate.

### Mutation-tested rather than trusted

62/0 on first run is not evidence, so I broke the code three ways to prove the
assertions bite:

1. fence live loop set to include `frame_000` → **3 failures**
2. switch burn set to start at `frame_000` → **4 failures**
3. `!burnDone` latch removed from `update()` → **initially 0 failures**

Mutation 3 exposed a real gap in my own suite. Removing the latch renders
*identically* (`burnDone` stays true), so nothing failed — but `_destroyT` then
grows without bound and is written into every snapshot. I had asserted that latch
in a code comment and never verified it. Added an explicit bound assertion; the
mutation now fails. **The invariant was claimed but untested until mutation
testing found it.**

### Verified in a real level, not just in units

Testbed run: fence blocks → player charges the wall switch through the real
`spendEnergy` path (spent exactly 2) → **fence is open and passable on the same
frame, while `burnDone` is still false** — the F7 ruling confirmed end to end —
then the burn completes and latches.

### Scope

Levels 1/2/3 verified to have **zero** `style` fields, so they are untouched until
Chief flips Level 2's `SW1`/`BARRIER`. Testbed is a `99_` file kept out of
`levels.json`. No editor work (Aki's lane). No art changes.

### Notes

- Removed a stray `_fenceImg(` file created by a mangled shell mutation attempt —
  caught in `git status` before committing.
- Level 2 remains **margin 0** (2 + 8 spent vs 10 available). Flipping `SW1` and
  `BARRIER` to `wall`/`fence` changes no costs, so the budget is unaffected.
- **Next per Kiro's queue ruling:** `PLACEMENT_GUARDS_GROUNDED` P1, then P2.

---

## ORDER FENCE_SHORT_CIRCUIT — v1 semantics proposed (HOLDING)

- **Date:** 2026-09-12T22:58-04:00
- **Branch:** `agent/orcha-dev`, synced 0 behind live
- **Order:** `docs/ORDER_FENCE_SHORT_CIRCUIT.md`
- **Deliverable:** `docs/ORCHA_FENCE_V1_SEMANTICS.md` — F1-F11, awaiting ratification
- **Status:** HOLDING. No implementation written, zero runtime files touched.

### Headline: the order's frame inventory is off by one

`frame_000.png` is **byte-identical to the rest pose in BOTH packs** (sha256):
`fence/frame_000.png` == `fence_dead.png`, and
`wall_switch/frame_000.png` == `switch_destroyed.png`.
`metadata.json` confirms why — PixelLab exports frame_000 as the object's base
pose, so the real motion is frames **001-008**.

Implementing the order literally would have shipped:
- a **live, blocking fence rendering its dead passable art every 9th frame**
- the switch's **destroyed end-state as the first frame** of its own destruction

Same hazard class as the gate spritesheet row-0 finding. Third time this PixelLab
convention has bitten the project; proposed a standing rule for it.

### Also found by measurement, contradicting the order

- **Bboxes are NOT constant.** Switch `frame_000` is `10,1..46,52` but `001-003`
  are `8,1..48,52` (that 2px is the vibration); fence `frame_008` is
  `4,10..58,58` vs `1,10..62,59` elsewhere. Anchoring per-frame bbox would make
  the sprite jump — anchor by the uniform canvas instead, and hand Aki the same
  numbers.
- **Brightness cannot carry the fence state.** `fence_dead` is lum 50.4 but live
  frames 001/008 are 22.7/22.0 — the live fence at its darkest is *darker than
  dead*. Motion is the state signal. Flagged as an art call, not compensated in code.

### Verified, not assumed

- `blockOnly` is still exempt from `isDormant` (`electricity.js:184`), so a fence
  can never render dead-**gate** art. Will assert with the image-identity recorder.
- `frame_008` (lum 99.7/green 19.0) ≈ `switch_destroyed` (100.3/19.6), so settling
  after the burn has no visible pop.
- Level 2 budget independently recomputed: 4+6 available, 2+8 spent, **margin 0**.

### Flagged for decision

- **F7** fence dies immediately vs. as the switch burns out (~1s) — feel call.
- **F8** `switch_off.png` is unused in v1; it is the natural "intact but
  unpowered" art and v1 has no such state. Reserved rather than silently dropped.
- **F5** `switch.on` means FIRED, not lit — for a wall switch `on === false`
  renders `switch_on.png`. Naming trap, documented loudly.

### Queue note

Two orders are open for me.
`docs/ORCHA_ORDER_PLACEMENT_GUARDS_GROUNDED.md` **P1 placement guards is not
done** (no ground/snap guards exist in the parity harness yet) and **P2 grounded
zone** is blocked behind it. Fence is newer. Confirm the order of work.

### Baseline on merged base

crate_timed 87/0 · energy 88/0 · parity 138/0 · electricity 37/0 = **350/0**.
Energy moved 87→88: Kiro back-ported my image-identity QA note. My testbed was
migrated to 18 rows with everything else.

---

## Game favicon: purple bolt (distinct from the editor)

- **Date:** 2026-09-12T17:20-04:00
- **Branch:** `agent/orcha-dev` (synced, 0 behind live)
- **Directive:** Chief, 2026-09-12: game favicon should be another colour from the editor so the tabs are tellable apart.

### What was actually wrong

The game had **no favicon and no `<title>` at all**. `editor.html` already carried a
yellow bolt icon, so the editor tab looked branded while the game tab showed the
browser default globe plus the raw URL. The problem was not a wrong colour, it was
a missing icon.

### Fix

`index.html` head gains a `<title>OVERCHARGE</title>` and an inline SVG data-URI
favicon: the same bolt silhouette and same `#091526` background as the editor, so
they still read as one project, with the bolt in `#cc44ff` purple.

| | bolt | background |
|---|---|---|
| game (`index.html`) | `#cc44ff` purple | `#091526` |
| editor (`editor.html`) | `#ffee00` yellow | `#091526` |

Purple was chosen because it is the charge/gate colour used throughout play, so
the game tab matches what the game looks like.

### Verified

- Both data URIs decoded and checked: well-formed SVG, single root, bolt path
  present, no raw `#`, `"` or `<` that could break the HTML attribute.
- Colour separation measured, not eyeballed: RGB distance **310.7 of 441 max**,
  comfortably distinguishable at 16px tab size.
- `index.html` structure intact: head/body balanced, one `<title>`, one icon link,
  `canvas id="game"` present, module script and `src_scroll/main.js` still wired.
- Suites unchanged: crate_timed **87/0** · energy **87/0** · parity **110/0** ·
  electricity **37/0** = **321/0**. Boot smoke **PAGES_RUNTIME_BOOT_OK**.

### Noted, not changed

`index_classic.html` ("OVERCHARGE Classic") also has no favicon. It is outside the
directive and I did not touch it. Say the word if you want it given a third colour,
or left plain deliberately so it never gets confused with the live game.

### Scope

One file, `index.html`. No runtime code, no editor, no assets, no levels.

---

## ORDER CRATE_TIMED — Conductive Crate + Timed Device

- **Date:** 2026-09-12T15:55-04:00
- **Branch:** `agent/orcha-dev` (merged from live `b004aa5` first, per the order)
- **Order:** `docs/ORCHA_ORDER_CRATE_TIMED_DEVICE.md`
- **Ruling:** `docs/KIRO_RULING_CRATE_TIMED_V1.md` — D1-D9 ratified, D5 vetoed, sources removed as delivery targets, BUILD CLEARANCE appended
- **Status:** COMPLETE — pushed, awaiting Kiro QA gate

### Tests

| Suite | Baseline | After |
|---|---|---|
| `_dev/crate_timed.mjs` (new) | — | **87 passed, 0 failed** |
| `_dev/energy_authority.mjs` | 87/0 | **87 passed, 0 failed** |
| `_dev/parity_regression.mjs` | 75/0 | **110 passed, 0 failed** |
| `_dev/test_electricity.mjs` | 37/0 | **37 passed, 0 failed** |
| Main boot smoke | — | **PAGES_RUNTIME_BOOT_OK** |
| Testbed headless play | — | **TESTBED_PLAYABLE_VIA_CRATE_OK** |

**321 passing, zero regressions.**

### System 1 — Conductive Crate

- `Crate` class in `entities.js`: pure conduit, **no `charge` field at all** (D1)
- Contact = AABB inflated by `CRATE_CONTACT_PAD` (2px, ratified). Strict inequality, so exactly 2px is the exclusive boundary — documented, asserted
- `bridgeTarget()` returns `ok` / `none` / `ambiguous`. Gates + switches only (Kiro's correction: `ElectricalSource` has no `receive()`)
- **D5 as vetoed:** ambiguous contact REFUSES, console-warns with crate + device ids, HUD shows `AMBIGUOUS CONTACT`. Never guesses
- Push resolves inside `_resolveX`: crate destination clear → both move; crate blocked → **player** blocked. A crate cannot enter geometry by construction
- Gravity, rests on tiles / one-way / movers / other crates, solid to player and enemies
- Crate-routed charging uses the SAME `spendEnergy()` → `device.receive()` path. No second transfer arithmetic

### System 2 — Timed Device

- `timed` / `duration` on the existing gate; timer starts on open, expiry sets `open=false`, `charged=0`, blocking resumes
- Expiry runs BEFORE the dormancy check in `update()`, so there is no one-frame flash of idle animation on the way down
- Countdown reuses the charge-bar strip, flickers under 1s. No new art
- `_timeLeft` snapshotted — dying mid-countdown does not grant free time
- `timed` + `isExit` refused (warn + ignore), also rejected by the parity harness

### Kiro's added constraint — verified, not assumed

An expired timed gate is DORMANT and renders the **dedicated TRUE DEAD art**.
Proven with a draw-call recorder that identifies the source image **by object
identity**: 2 simulated seconds after expiry emit exactly ONE variant, `DEAD-ART`,
with `shadowBlur 0`.

### Parity guards built into the delivery

Unique non-empty crate `id`, finite `x`/`y`, positive `w`/`h` when present,
positive `duration` on timed gates, and `timed`+`isExit` rejected. Plus the guard
with teeth: **any level containing crates must contain at least one checkpoint.**

Also widened the harness's level scan to include the descriptive `N_NAME.json`
twins, not just `levelN.json`. The guards were silently scanning only half the
authored levels — my testbed was not being checked at all until I fixed this.
That is what took parity from 75 to 110.

### Three bugs I made and caught

1. `INTERACT_RADIUS` used in `player.js` without importing it — would have thrown at runtime
2. Test rigs assumed `PLAYER_H = 64`; it is **30**. Every push/landing assertion failed for rig reasons, not code reasons. `tryMoveX` was correct all along
3. Draw-recorder labels were inverted: the dead art is the 9-arg `drawImage`, the open sprite is the 5-arg one. Now keyed on image identity

### Derived decision needing ratification

**`blockOnly` gates are excluded as bridge targets.** `blockOnly` means "the
player cannot discharge into this directly", so letting a crate bridge into one
would launder energy around that authoring intent. Derived from the documented
meaning of `blockOnly`, not from the order text. Flag if you disagree.

### Design consequence worth knowing

With a **1-tile** crate the player is usually already inside `INTERACT_RADIUS`
(50px) of the gate, so the gate is charged directly and the crate route is never
offered. Crate-routing only matters for **wider crates** or gates the player
cannot stand beside. My first testbed proved playable while never exercising the
crate at all; the testbed now uses a 64px crate and verifies energy actually
flowed through it. **Level 5 authoring should use 2-tile crates or unreachable
gates**, or the mechanic will not appear.

### Files

`entities.js` (Crate) · `constants.js` (`CRATE_CONTACT_PAD`, `CRATE_SIZE`) ·
`level.js` (parse, update order, snapshot/restore, draw) · `player.js` (push,
`_resolveCrates`, bridge resolution, crate-routed charging) · `electricity.js`
(timed lifecycle, countdown, `timed`+`isExit` refusal) · `ui.js` (crate prompts) ·
`_dev/crate_timed.mjs` (new) · `_dev/parity_regression.mjs` (guards + scan) ·
`docs/LEVEL_SCHEMA.md` · `src_scroll/levels/99_CRATE_TIMED_TESTBED.json` (new)

**Not shipped to the manifest** — the testbed is a `99_` file, deliberately not
added to `levels.json`, so it is guarded by parity but never appears in the game.

### Scope

Editor untouched. Aki assets untouched. Levels 1-2 untouched. No merge to the
live line. HOLDING for Kiro QA.

---

## Order: SPACE_CHARGE â€” SPACE charges, K attacks, F instant-fill removed

- **Date/time:** 2026-09-11T23:35-04:00
- **Branch:** `agent/orcha-dev`
- **Base:** synced fast-forward from `agent/orcha-gameplay` `d344658` (was 21 behind, 0 ahead â€” lossless)
- **Order:** `docs/ORCHA_ORDER_SPACE_CHARGE.md` (Kiro, Chief directive 2026-09-12)
- **Amendment (Chief, 2026-09-11 23:11):** *"k is the projectile button then space is the charge gate button"* â€” projectile/attack moves to **K**, SPACE is charge-only.
- **Ruling A (Chief, 23:15):** melee attack moves to K **now**. SPACE is purely gate-charge.

### Why the amendment mattered

The original spec put projectile *and* gate-charge both on SPACE, which forced a
context-priority rule for "gate and enemy both in range". Splitting onto separate
keys **deleted that problem** â€” there is no priority heuristic anywhere in the
final implementation, and the player never has to guess what SPACE will do.

### Final bindings

| Key | Action |
|---|---|
| **SPACE** | hold near gate/switch â†’ gradual charge (`spendEnergy` authority, `dev.receive`, capped by `needed`) |
| **K** | attack â€” melee now; projectile slots in as branch 2 later |
| **E** | absorb / interact at sources **only** |
| **F** | **unbound** â€” nothing completes a gate in one press |

**Order Â§3 decision: charging is SPACE-only.** E does not also discharge. One
mechanic, one binding â€” the old E-does-both/F-shortcut split is what made the
controls unteachable.

### Changes

- **`player.js`**
  - `_updatePipSpend()` **deleted** (the F instant-fill). `KeyF` is now unbound.
  - `spendPip()` **retained** in the energy authority â€” order Â§2 requires it, and
    Order 004 ruling 3 asserts against it directly.
  - `_updateAttack()` rebound `Space` â†’ `KeyK`, restructured as an explicit branch
    table (branch 1 = melee, branch 2 = future projectile, left inert).
  - `_updateDischarge()` rebound `KeyE` â†’ `Space`. Mechanic itself unchanged.
  - **Removed the `nearSource` guard** from `_updateDischarge`. It only existed
    because E meant both absorb and discharge; with separate keys it would have
    silently blocked SPACE-charging near a generator.
- **`ui.js`** â€” `[E] DISCHARGE` â†’ `[SPACE] CHARGE`; `DISCHARGING...` â†’ `CHARGING...`;
  `[SPACE] ATTACK` â†’ `[K] ATTACK`; `[F] SPEND PIP` â†’ **`RESERVE: n PIPS`** (information,
  not a key prompt, since pips still auto-feed the bar via `_pullReserve`).
  Mirrored the `nearSource` removal so UI and gameplay agree.
- **`main.js`** â€” dev help strings â†’ `E ABSORB  SPACE CHARGE  K ATTACK`.
- **`entities.js`** â€” stale "killed with Space attack" comment corrected.
- **`_dev/energy_authority.mjs`** â€” harness now records `window` listeners and
  dispatches synthetic keydown/keyup into the **real `input.js`**, so binding
  assertions exercise shipped key handling rather than a re-implementation.
  **+21 tests.**

### Tests

| Suite | Baseline (pre-change) | After |
|---|---|---|
| `_dev/energy_authority.mjs` | 51 passed, 0 failed | **72 passed, 0 failed** |
| `_dev/parity_regression.mjs` | 75 passed, 0 failed | **75 passed, 0 failed** |
| `_dev/test_electricity.mjs` | 37 passed, 0 failed | **37 passed, 0 failed** |
| Runtime boot smoke | â€” | **PAGES_RUNTIME_BOOT_OK**, 0 errors |

New coverage: SPACE transfers and conserves exactly; a single frame **cannot**
open a gate; sustained hold does; release stops transfer; **F does nothing** at
all (no charge, no cost, no pip consumed) and `_updatePipSpend` is gone;
`spendPip()` authority survives; K hits, SPACE does not; K neither charges nor
costs energy; SPACE charges while near a source; charging draws the reserve and
spends exactly 8 for the 8-cost exit.

Conservation invariant (Â§7) untouched and still passing: 400 randomized runs,
worst drift 8.53e-14, 0 illegal states.

### Observable gameplay change

**Intentional and total for controls** â€” this order is a rebind, so every change
is user-visible by design:
1. Gate charging moves from hold-E to hold-SPACE.
2. Attack moves from SPACE to K.
3. F does nothing. Level 1's exit can no longer be opened in one press; at
   `required=8` with `DISCHARGE_RATE=3` it takes ~2.7s of sustained holding.
4. Standing at a generator no longer suppresses the gate prompt or the ability
   to charge â€” both `[E] ABSORB` and `[SPACE] CHARGE` now show together.

No energy-model behavior changed. Every transfer still routes through the Order
004 authority; no new drain arithmetic was introduced.

### Notes / flagged

- **`573223b`** (*"always show [F] SPEND PIP prompt near gate"*) is **superseded**
  by this order, not accidentally reverted. Order Â§4 explicitly requires every
  F/E prompt to be rewritten. Recorded here because it was recent teammate work.
- **`input.js` left untouched** per order ("no listener changes expected").
  `'KeyF'` remains in the `preventDefault` list â€” harmless dead config now that F
  is unbound. `KeyK` deliberately not added: K does not scroll the page, so it
  needs no `preventDefault`.
- **SPACE / level-complete collision: investigated, no fix needed.** I flagged
  this as a risk during review and then verified `input.js`: `pressed()` is
  strictly edge-triggered (`cur && !prev`) and `main.js` additionally guards on
  `completeTimer > 0.5`. Holding SPACE through gate-open never retriggers
  `advanceLevel()`. My initial warning was an over-call; withdrawn.
- **Projectiles NOT built**, per order. Branch 2 of `_updateAttack` is an inert
  no-op rather than an energy-costing stub, so nothing can silently drain the bar.
- Level 1 checksum now `0B4F15C6` (Chief's economy change: generators 4, exit 8).
  I did not touch level content.

### Handoff

- Pushed to `agent/orcha-dev`. **Not merged.** Awaiting Kiro QA gate.

---

## Order #004 â€” Charge System Authority

- **Date/time:** 2026-09-11T06:16-04:00
- **Branch:** `agent/orcha-dev`
- **Base commit:** `3cab1d9a667585626984b695595101698663c9fa`
- **Assignment:** Audit every energy/charge path, establish ONE authoritative energy model, implement the correct bank/refill behavior, prove it with the required test matrix, and keep the protected parity/electricity suites intact. No editor changes, no Level 1 changes, no merges.

### Architecture found (audit)

The canonical INGEST model was already present on this branch from `b558d1b` (verified by content, not just SHA â€” `git merge-base --is-ancestor` reports ancestry but I re-checked the actual symbols in `player.js`). Already correct and needing no change:

- `usableEnergy` getter = `charge + bankedPips * MAX_CHARGE`, used by both HUD and gameplay
- `canAfford()`, `energyHeadroom`
- `giveEnergy()` â€” fill â†’ top out â†’ +1 pip â†’ reset â†’ continue; refuses at pip cap and returns the accepted amount so callers refund instead of destroying
- `_pullReserve()` â€” demand-driven pip promotion
- `ui.js:257` already calls `player.canAfford(needed)`, so the "single authority" for affordability was in place

All three Â§10 gate bugs were therefore **already fixed** before this order: banking on full, false `POWER REQUIRED`, and pip-spend not transferring (F-key already used the real `dev.receive()` path).

**Baseline captured before touching anything** (protected suites, unmodified):
- `node _dev/parity_regression.mjs` â€” **63 passed, 0 failed**
- `node _dev/test_electricity.mjs` â€” **37 passed, 0 failed**

**Required matrix run against unmodified code: 9 of 11 rows passed.** The two that did not are the subject of rulings 1 and 2 below.

### Gaps found (the real work of this order)

| # | Gap | Evidence before fix |
|---|---|---|
| 1 | **No SPEND authority.** Ingestion was centralized; spending was ad hoc. | `spendEnergy` did not exist â€” 0 hits |
| 2 | **`takeDamage()` could not see the reserve.** | `bar 0 + 3 pips`, `takeDamage(3)` â†’ usable **30 â†’ 30, lost 0** |
| 3 | **No validation on state restore.** | forcing `charge=999, pips=99` â†’ `energyHeadroom = **-1929**` |

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
- `scatter()` â†’ `spendEnergy(1)`
- `takeDamage()` â†’ `spendEnergy(amount)`
- `_updateDischarge()` â†’ `spendEnergy(want)` (removes its own `charge -= frameSpend` and its explicit `_pullReserve()`; a frame's transfer can now span a pip boundary without stalling)
- `_updatePipSpend()` â†’ `spendPip()` (removes raw `bankedPips--`)
- `main.js` `_applySnapshot()` and `loadLevel(carryCharge)` â†’ `setEnergyState()`
- New `_dropCharge()` conservation helper so scattered pickups sum to exactly what was deducted

### Behavior implemented

- **Banking:** bar fills â†’ crosses MAX â†’ `+1 pip`, bar resets to 0, leftover keeps filling the new bar. `bar 8 + 4 â†’ bar 2 + 1 pip`.
- **Pip cap:** at `MAX_BANKED_PIPS` with a full bar, further energy is refused and `giveEnergy` returns 0. Nothing is destroyed.
- **Reserve refill:** on demand (spend/damage), `bar 0 + pips > 0` â†’ consume 1 pip, bar to MAX, continue.
- **Gate:** affordability is asked via `usableEnergy` / `canAfford()`, so a full bar or a pip-only reserve both open a gate; `POWER REQUIRED` cannot appear while usable energy suffices.
- **F-key:** real transfer through `spendPip()` + `dev.receive()`. Whole pip consumed, surplus returned via `giveEnergy()`.
- **Restore:** out-of-range/NaN/fractional-pip states are clamped with a console warning rather than installed.

### Rulings applied (Kiro, 2026-09-11)

1. **`Bar 10 + 10 â†’ Bar 0 + 1 pip` is a typo; the Â§7 invariant wins.** Correct result is `bar 0 + 2 pips` (20 usable, conserved). Encoded in the suite with the ruling cited inline.
2. **Â§8 eager per-tick auto-refill REJECTED; demand-driven stands.** The unconditional version was the regression fixed in `b558d1b` (it fought banking, so pips could never accumulate). Cited in a comment above `_pullReserve()`, and guarded by two regression tests asserting idle ticks leave `bar 0 + 1 pip` untouched and that 3 banked pips survive idling.
3. **Partial-pip spend RATIFIED.** Whole pip consumed, surplus to bar. Now explicit policy in the comment block, with a test proving `3 delivered + 7 returned = 10`.

### Files changed

- `src_scroll/player.js` â€” energy authority: `spendEnergy`, `spendPip`, `setEnergyState`, `_dropCharge`; `scatter`/`takeDamage`/`_updateDischarge`/`_updatePipSpend` routed through it
- `src_scroll/main.js` â€” `_applySnapshot` and `loadLevel` restore via `setEnergyState`
- `_dev/energy_authority.mjs` â€” **new** Order 004 regression suite
- `ORCHA_STATUS.md` â€” **new** (this file)

Not touched: editor, `assets/`, `src_scroll/levels/`, Level 1 content, `main`, legacy WIP.

### Tests executed / results

| Suite | Before | After |
|---|---|---|
| `node _dev/energy_authority.mjs` | did not exist | **51 passed, 0 failed** |
| `node _dev/parity_regression.mjs` | 63 passed, 0 failed | **63 passed, 0 failed** |
| `node _dev/test_electricity.mjs` | 37 passed, 0 failed | **37 passed, 0 failed** |
| Runtime boot smoke | â€” | **RUNTIME_BOOT_OK**, 0 errors |

New suite covers all 11 matrix rows, the 3 rulings, the 3 audit gaps, and a randomized conservation invariant: **400 runs Ã— 40 interleaved gain/spend ops, worst energy drift 8.53e-14, 0 illegal states**.

### Observable gameplay change â€” explicitly stated (per Kiro's gate condition)

**No change to gameplay as currently played, with three deliberate exceptions:**

1. **`takeDamage()` â€” no observable change today.** Enemy contact uses `stun()`; `takeDamage()` has no live caller. The fix is to a dormant-but-live path. Behavior *does* change materially for whoever wires it up next: a player holding only banked pips now takes damage instead of being invulnerable.
2. **`scatter()` â€” behavior identical for whole-unit hits.** Only the sub-1.0-bar edge case changes: it previously deducted e.g. 0.5 but dropped a full 1-unit pickup, creating 0.5 out of nothing. Now the pickup matches the deduction.
3. **`_updateDischarge()` â€” one real improvement.** A single frame's transfer can now cross a pip boundary instead of being capped at the current bar, so a discharge no longer stalls for a frame at the boundary. At `DISCHARGE_RATE=3` and 60fps this is ~0.05 units per frame, so it is not expected to be visible; it is a correctness change, not a tuning change.

### Unresolved / for Chief or Kiro

- **Level 1 checksum is now `0167334D`**, not the `B2B714CA` I reported previously. I did not touch `src_scroll/levels/level1.json` (confirmed: not in my diff). Level 1 changed via Aki/Kiro work upstream of my base commit. Flagging so nobody reads the delta as mine.
- **`ChargePickup` now receives fractional values** in the sub-unit scatter case. It stores and grants `value` correctly, but its rendering was authored for 1-unit pickups. A 0.5 pickup will render at full size. Cosmetic only, and only in an edge case that previously created energy â€” flagging rather than changing render code under this order.
- `docs/` was not updated. If the energy model should be documented alongside `LEVEL_SCHEMA.md`, say so and I will add it as a separate change.

### Handoff

- Commit: see SHA in the report accompanying this entry
- Pushed to: `agent/orcha-dev`
- **Not merged.** Awaiting Kiro QA before any consideration for `agent/orcha-gameplay`.
