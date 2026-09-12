# ORCHA — CRATE + TIMED DEVICE: v1 SEMANTICS (for ratification)

**Order:** `docs/ORCHA_ORDER_CRATE_TIMED_DEVICE.md`
**Status:** AWAITING KIRO RATIFICATION — no implementation written yet
**Branch:** `agent/orcha-dev` @ merged base (0 behind live, dormancy `c8ae61b` absorbed)
**Baseline before any change:** energy 86/0 · parity 75/0 · electricity 37/0

Per Kiro ruling 2 (2026-09-12): define v1 precisely, commit the doc, ratify or
veto BEFORE implementation. Cheap to correct on paper, expensive after the tests
are written. Every decision is flagged D1..D9 so a veto can name one line.

---

## SYSTEM 1 — CONDUCTIVE CRATE

### D1 — The crate is a PURE CONDUIT, not a battery (recommended)

A crate has ZERO energy capacity. Energy charged into it passes straight through
to a device it touches in the same call. It never stores, buffers, or leaks.

Why not a battery: a crate with its own reservoir needs a capacity constant, a
fill/drain rate, a charge bar, a decay rule, snapshot fields and its own
conservation proof — a second energy authority in all but name, which Order 004
exists to prevent. A pure conduit conserves trivially and provably: what enters
either exits into a device or is refused at the door.

Consequence: a crate is never "charged up". It is a wire, not a power bank.

### D2 — Contact test: AABB overlap, inflated 2px

    crateBox = { x-2, y-2, w+4, h+4 }     // 2px inflation on all sides
    contact  = crateBox overlaps device AABB

Inflation exists because a crate resting flush against a device has exactly 0px
gap, and float positions after a push make exact-equality unreliable. 2px is
below a quarter tile, so it cannot bridge a visible gap — a crate must LOOK like
it is touching.

Eligible devices: sources, gates, switches.

### D3 — Charging INTO a crate: the crate is a proxy target

While the player is adjacent to a crate (same INTERACT_RADIUS rule devices use),
holding SPACE charges THROUGH the crate into the device it touches. Mechanically
identical to charging that device directly:

- deduction via `player.spendEnergy()` (Order 004 authority — unchanged)
- delivery via `device.receive()` (same path, so charged/open/_reactT and the
  dormancy wake all behave identically)
- transfer capped by the device remaining `required`

The crate adds NO rate penalty and NO loss. v1 is about reach, not cost.

### D4 — Crate touching NO device: charge is REFUSED

Holding SPACE at a crate that bridges nothing transfers nothing and costs the
player nothing. Energy is never destroyed (section 7). HUD shows NOT CONNECTED
rather than a charge prompt, so the player is told WHY nothing happens.

### D5 — Crate touching MULTIPLE devices: first in level order, documented

v1 delivers to ONE device: the first eligible one in level array order (gates,
then switches, then sources — gates first because they are the puzzle target).
Deterministic and snapshot-stable.

NOT split across devices, NOT round-robin — either would be a multi-target
distribution rule, i.e. the multi-crate-chain complexity the order defers.

FLAGGED: least obvious call in the design. If Chief would rather a
multi-contact crate refuse outright (forcing unambiguous authoring), say so — a
one-line change now, a test rewrite later.

### D6 — Push: horizontal only, walk-into, no grab

- Player walking into a crate pushes it along X at the player own speed.
- Push resolves INSIDE `_resolveX`, where gates already block: if the crate
  destination is clear, crate and player both move; if the crate is blocked
  (tile, another crate, a closed gate, level edge) the PLAYER is blocked
  instead. No shoving through walls, no crate ever inside geometry.
- NO vertical push. A crate cannot be lifted, and standing on one and walking
  does not drag it.
- NO grab/carry button — the order specifies the simplest thing that works.
- A crate falls under gravity and rests on tiles, one-way platforms, moving
  platforms and other crates. It does NOT ride a moving platform horizontally
  in v1 (FLAGGED D6a — resting-on-mover friction is its own feature).

### D7 — Crate is solid to the player and to enemies

Blocks like a gate: X-blocking in `_resolveX`, landable-on in `_resolveY`.
Enemies collide rather than walk through. Crates block each other.

### D8 — Crates MUST be snapshotted

`Level.snapshot()`/`restore()` currently captures sources, gates, switches,
checkpoints, enemies, platforms, complete. A crate position is MUTABLE GAMEPLAY
STATE: without it, dying after pushing a crate rewinds the player but leaves the
crate moved — a silent soft-lock generator. Adding:

    crates: this.crates.map(c => ({ x: c.x, y: c.y, vy: c.vy })),

This is NOT optional and I am treating it as in-scope, because the order requires
serialization round-trip and the parity harness will get a fixture.

### Crate schema

    crates: [
      {
        id: string,   // required — unique within level
        x:  number,   // required — world pixel X (left edge)
        y:  number,   // required — world pixel Y (top edge)
        w:  number,   // optional — default 32 (one tile)
        h:  number,   // optional — default 32
      }
    ]

Absent/empty `crates` means ZERO behavioral change to any existing level.

### Explicitly NOT in v1 (order defers these)

magnetization · multi-crate chains · carry/grab · crate-as-battery · vertical
push · crates conducting to each other · riding movers horizontally.

---

## SYSTEM 2 — TIMED DEVICE (temporary circuit)

### D9 — `timed` + `duration` on the existing gate

    { ...existing gate fields...,
      timed:    boolean,   // optional, default false — non-timed gates UNAFFECTED
      duration: number,    // optional, default 3 — seconds open once full
    }

Lifecycle:

    DORMANT --charge--> CHARGING --full--> OPEN (timer running, duration s)
       ^                                       |
       +---------- drain to 0, revert <---------+   timer expires

On expiry: open=false, charged=0, blocking resumes, and the gate returns to the
DORMANT visual state — NOT idle-animated.

### Composition with dormancy (Kiro added constraint)

Kiro is right that this is the kind of bug tests miss. Checked against the
shipped predicate:

    get isDormant() {
      return !this.open && !this.blockOnly && this.charged <= 1e-9 && this._reactT <= 0;
    }

An expired timed gate has open=false, charged=0, and _reactT already lapsed, so
isDormant becomes TRUE AUTOMATICALLY — the composition works without
special-casing. But it is only correct if expiry resets charged to 0 AND leaves
_reactT alone. I will assert it explicitly:

  expired timed gate -> isDormant === true, emits ONE static row-0 frame, zero glow

using the same draw-call recorder the dormancy tests already use, so the visual
state is proven and not assumed.

### Countdown readout

Reuses the existing charge-bar strip below the gate, drawn as REMAINING TIME
instead of fill while the timer runs, flickering under 1s. No new art.

### Timed gate snapshot

`gates` snapshot gains `_timeLeft` so a checkpoint taken mid-countdown restores
truthfully.

### `isExit` + `timed` = REFUSED

A timed exit gate could expire during the level-complete transition and strand
the player. v1 treats `timed && isExit` as an AUTHORING ERROR: warn to console
and ignore `timed`. Flagged rather than silently allowed.

---

## Risks flagged now, not after QA

1. CRATE SOFT-LOCKS. A crate pushed into a pit or wedged against a wall can make
   a level unsolvable, and v1 has no reset-crate button. Checkpoint restore (D8)
   is the recovery path. Real constraint for whoever authors crate levels —
   worth a line in the Level 4/5 brief.
2. PUSH FEEL IS UNTUNED. Order says simplest thing that works. Expect Chief to
   want push speed/weight tuning after first play; I will not invent a weight
   constant now.
3. `_resolveX` IS GETTING CROWDED. Tiles, gates, now crates. Still readable but
   it is the next refactor candidate — noting, not acting.

---

## What I will build once ratified

1. `Crate` class (physics + solid + conduit) in `entities.js`
2. `level.js`: parse `crates`, include in snapshot/restore, draw order
3. `player.js`: crate push in `_resolveX`, crate-as-charge-proxy in the SPACE path
4. `electricity.js`: timed/duration lifecycle + countdown render + dormant revert
5. `docs/LEVEL_SCHEMA.md`: crate section, gate timed/duration fields
6. Hand-authored test level with crate + timed gate, booted headless
7. `_dev/` tests: crate push/block/gravity, bridge conduction, refusal when
   unconnected, multi-contact determinism, timed activate/expire, expired-gate
   dormancy, snapshot round-trip, conservation through a crate

NO implementation until Kiro ratifies or vetoes D1-D9. HOLDING.
