# LEVEL SCHEMA

**Owner:** Aki (documentation) + Orcha (runtime)  
**Status:** CONFIRMED AGAINST THE RUNTIME — every ⚠️ below was resolved by reading
`src_scroll/constants.js`, `src_scroll/level.js`, `src_scroll/entities.js` and
`src_scroll/levels/level1.json` rather than waiting on review. Anything still
undecided is called out as OPEN, not left implied.  
**Last updated:** 2026-09-05 (Aki, acting owner while Orcha is out)

Do not add new fields without cross-agent agreement. Do not silently rename existing fields.

> **Correction, 2026-09-05:** this document previously described `tiles` as a 2D
> array (`number[][]`). It is not, and never was. Both the runtime
> (`Level.tileAt`) and the editor (`Actions.setTile`) index it as a FLAT array.
> Anyone who had written a tool against the old text would have produced levels
> the game cannot read.

---

## Top-Level Level Object

```js
{
  name:        string,          // ✅ Display name, e.g. "NEON DISTRICT"
  number:      integer,         // ✅ Level number (1-based)
  cols:        integer,         // ✅ Width in tile columns (1 col = 32px)
  tiles:       number[],        // ✅ FLAT tilemap, length cols × 14. See Tilemap
  playerStart: { x, y },       // ✅ World pixel coords for player spawn
  decorations: Decoration[],   // ✅ Visual-only rooftop props (no collision)
  sources:     Source[],        // ✅ Electrical charge sources (generators)
  gates:       Gate[],          // ✅ Power gates and barriers
  switches:    Switch[],        // ✅ Charge-spending switch objects
  checkpoints: Checkpoint[],   // ✅ In use — level 1 authors one ("CP1")
  platforms:   Platform[],     // ✅ Schema confirmed from MovingPlatform; none authored yet
  enemies:     Enemy[],         // ✅ Schema confirmed from DrainEnemy/DroneEnemy; none authored yet
}
```

**Derived constants (not stored in level data — computed at runtime):**
- Tile size: `TILE = 32` ✅ confirmed, `src_scroll/constants.js`
- World width: `cols × TILE`
- World height: fixed at `ROWS = 14` rows → `448px` ✅ confirmed, `constants.js`.
  There is no `rows` field in the level JSON and the runtime never reads one;
  height is not authorable.
- Camera viewport is `W = 800 × H = 450`; `viewport.js` may reveal MORE world
  horizontally on a wide window, which changes nothing about level geometry.

---

## Tilemap

```js
tiles: number[]     // FLAT, length === cols * 14
```

- Index formula: `idx = row * cols + col` (row 0 = top). ✅ Confirmed identical in
  `Level.tileAt()` and `Actions.setTile()`.
- Length is exactly `cols * 14`. Level 1: `cols = 100` → 1400 entries.

**Tile values** ✅ confirmed from `Level.isSolid()`:

| Value | Meaning |
|-------|---------|
| `0` | empty / sky, no collision |
| `1` | solid, LEGACY untextured mass — still supported, still collides |
| `2`–`9` | **RESERVED. Do not emit.** Not solid, not drawn — silently becomes a hole |
| `>= 10` | solid AND textured. The value selects the tile art |

Variant values are assigned by the editor's tile registry
(`editor/state.js`, `tileValueForAssetId`). Currently registered:

| Value | Asset id |
|-------|----------|
| `10` | `env_tile_dark_a` |
| `11` | `env_tile_dark_b` |
| `12` | `env_tile_purple_a` |
| `13` | `env_tile_purple_b` |

Adding art to the manifest does NOT make it paintable — it must be added to the
registry to get a value. Unregistered tile assets map to `-1` and place nothing.

**OPEN:** nothing blocking. If we ever need non-solid decorative tiles, they
need a value band below 10 that `isSolid()` explicitly excludes; `2`–`9` is the
obvious home and is why it stays reserved.

---

## Source (ElectricalSource / Generator)

```js
{
  id:     string,   // ✅ Unique ID within the level, e.g. "A1"
  x:      number,   // ✅ World pixel X (left edge of hitbox)
  y:      number,   // ✅ World pixel Y (top edge of hitbox)
  charge: number,   // ✅ Total charge units available to absorb
  label:  string,   // ✅ Display label, e.g. "GEN-A"
}
```

Runtime hitbox: `28×28px` with TOP-LEFT at `(x, y)`. Sprite drawn `64×64px`, centered horizontally on hitbox, bottom aligned with hitbox bottom.

> **Correction, 2026-09-06:** the earlier note "centered at (x, y)" was wrong. The runtime
> sets `this.x = x` and derives centre as `cx = x + w/2`. Editor stores top-left to match.
> Previous editor builds stored centre (x+14, y+14) — those placements were 14px off.
> All committed levels (level1, level2) were hand-authored correctly as top-left.  
Asset: `electrical_generator` (see ASSET_MANIFEST.json)

---

## Gate (PowerGate)

```js
{
  id:        string,   // ✅ Unique ID within level, e.g. "EXIT", "BARRIER"
  x:         number,   // ✅ World pixel X (left edge)
  y:         number,   // ✅ World pixel Y (top edge)
  w:         number,   // ✅ Width in pixels
  h:         number,   // ✅ Height in pixels
  required:  number,   // ✅ Charge units needed to open gate
  isExit:    boolean,  // ✅ True = completing this gate ends the level
  blockOnly: boolean,  // ✅ True = switch-only gate; player cannot discharge into it directly
  label:     string,   // ✅ Display label
}
```

**Known instances:**
- Exit gate: typically `40×64px`, `isExit: true`
- Barrier: typically `32×128px`, `blockOnly: true`, opened via linked Switch

Asset: `gate_electric_closed` (see ASSET_MANIFEST.json)  
Runtime state files (not palette entries — wired in `electricity.js`): `gate_electric_open.png` (energised/open), `gate_electric_dead.png` (dormant before first charge), `gate_electric_spritesheet.png` (charge animation).

---

## Switch

```js
{
  id:        string,   // ✅ Unique ID within level, e.g. "SW1"
  x:         number,   // ✅ World pixel X — TOP-LEFT, not center (see correction)
  y:         number,   // ✅ World pixel Y — TOP-LEFT, not center
  required:  number,   // ✅ Charge units needed to activate
  linkedId:  string,   // ✅ ID of the Gate this switch controls
  label:     string,   // ✅ Display label, e.g. "OPEN"
}
```

Runtime hitbox: `22×22px` with its TOP-LEFT at `(x, y)`.

> **Correction, 2026-09-05:** this section previously said x/y "appear to be the
> center point". They are not. `Switch` in `src_scroll/electricity.js` sets
> `this.w = this.h = 22` and exposes `get cx() { return this.x + this.w / 2; }` —
> the centre is *derived*, so the stored value is the top-left. An editor that
> wrote centre coords would place every switch 11px down and right of where it
> was dropped.

`w`/`h` are NOT authorable — the runtime hardcodes 22×22 and ignores any values
in the JSON.

---

## Decoration (Visual Prop — no collision)

```js
{
  src:  string,   // ✅ Asset path, e.g. "assets/tilesets/purple_city/props/street_lamp.png"
  x:    number,   // ✅ World pixel X (left edge)
  y:    number,   // ✅ World pixel Y (top edge)
  w:    number,   // ✅ Rendered width in pixels (source dims × scale factor)
  h:    number,   // ✅ Rendered height in pixels
}
```

Decorations carry an extra field the old text omitted:

```js
  snap: number,   // ✅ Editor-only. Grid the prop was snapped to (1 = freeform pixel)
```

The runtime ignores `snap`; it exists so reopening the editor preserves the snap
mode a prop was placed with.

> **Correction, 2026-09-05:** the `prp()` helper and the `S2` scale factor are
> GONE. They belonged to the old hand-authored JS level files, which no longer
> exist — the runtime fetches JSON only. There is no `S2` to expose. Decorations
> now store final `w`/`h` in pixels, resolved at placement time in the editor.

`src` is a full repo-relative path including the extension, e.g.
`assets/tilesets/purple_city/edges/rooftop_edge_left.png` — not a bare filename.

---

## Checkpoint

✅ Confirmed from `Checkpoint` in `src_scroll/entities.js`. Level 1 authors one.

```js
{
  id:    string,   // ⚠️ AUTHORED BUT IGNORED by the runtime constructor. Editor bookkeeping
  x:     number,   // ✅ World pixel X — CENTRE of the trigger zone (±40px horizontal)
  y:     number,   // ✅ World pixel Y — GROUND level (top of a player standing here)
  label: string,   // ⚠️ AUTHORED BUT IGNORED by the runtime. Editor display only
}
```

Trigger zone is `±40px` horizontally, hardcoded (`this._range = 40`), not
authorable. Fires once — `activated` latches so re-crossing does nothing.

Note the coordinate convention differs from Gate and Switch: checkpoint `x` is a
CENTRE, gate/switch `x` is a TOP-LEFT. That is a runtime inconsistency, not a
documentation error. See STILL OPEN below.

---

## Platform

✅ Confirmed from `MovingPlatform` in `src_scroll/entities.js`. None authored yet,
but the runtime is ready — the editor simply has no tool for it.

```js
{
  x:     number,   // ✅ World pixel X, top-left. Starting position
  y:     number,   // ✅ World pixel Y, top-left
  w:     number,   // ✅ Width.  Defaults to 96 if omitted
  h:     number,   // ✅ Height. Defaults to 12 if omitted
  x1:    number,   // ✅ Left end of the horizontal sweep
  x2:    number,   // ✅ Right end of the horizontal sweep
  speed: number,   // ✅ px/sec. Defaults to 80
}
```

Movement is horizontal only — there is no `y1`/`y2` and no vertical mode. There
is no `id` field.

---

## Enemy

✅ Confirmed from `Level` (type dispatch) plus the three enemy classes. None
authored yet. The editor CAN place them — verified 2026-09-05.

```js
{
  type:        string,   // ✅ "drain" | "drone" | anything else → PatrolEnemy
  x:           number,   // ✅ World pixel X, top-left
  y:           number,   // ✅ World pixel Y, top-left
  patrolLeft:  number,   // ✅ Left limit of the patrol, world px
  patrolRight: number,   // ✅ Right limit of the patrol, world px
  speed:       number,   // ✅ px/sec. Default depends on type (see table)
}
```

| `type` | Class | Default `speed` |
|--------|-------|-----------------|
| `"drain"` | `DrainEnemy` | 60 |
| `"drone"` | `DroneEnemy` | 55 |
| anything else / omitted | `PatrolEnemy` (20×26) | 50 |

Two traps worth stating plainly:

- The dispatch values are `"drain"` and `"drone"`, **not** the asset ids
  `enemy_drain_walk` / `drone`. A typo does not error — it silently falls through
  to a generic `PatrolEnemy`.
- There is no `id` field. `drainAmount`, `health` and `activationDelay` do not
  exist; they were speculative. Do not emit them.

---

## RESOLVED QUESTIONS

All eight items that were waiting on Orcha were answered by reading the runtime
on 2026-09-05. Two of them turned out to be documentation errors, not gaps.

| # | Question | Answer |
|---|----------|--------|
| 1 | Tile size | `TILE = 32`. Confirmed, `constants.js` |
| 2 | Tile values beyond 0/1 | `>= 10` in use for textured variants; `2`–`9` reserved, must not be emitted |
| 3 | World height | Fixed `ROWS = 14` → 448px. Not authorable, no `rows` field |
| 4 | Switch x/y | **TOP-LEFT.** The old "appears to be centre" note was wrong |
| 5 | `S2` scale factor | **Obsolete.** Belonged to the deleted hand-authored JS levels. Decorations store final `w`/`h` |
| 6 | Checkpoint schema | Defined above. `id`/`label` are authored but ignored by the runtime |
| 7 | Platform schema | Defined above: `x1`/`x2`/`speed`. Horizontal only |
| 8 | Enemy schema | Defined above: `type`/`patrolLeft`/`patrolRight`/`speed`. No `health`/`drainAmount` |

## STILL OPEN — needs a decision, not research

1. **Coordinate convention is inconsistent.** Checkpoint `x` is a centre; gate and
   switch `x` are top-left. Normalising would invalidate existing level JSON, so
   it is Chief's call, not an agent's.
2. **Vertical moving platforms** are not supported by the runtime. Feature
   request, not a schema fix.
3. **Non-solid decorative tiles** have no value band. `2`–`9` is the natural home
   and is reserved for it.
4. **`gate_electric_open` art** still does not exist.
5. **The editor has no tool** for platforms or switches, so two confirmed runtime
   features are currently unauthorable.

---

*This document is the agreed contract between editor (Aki) and runtime (Orcha).
Neither agent expands it unilaterally. Corrections that bring the document into
line with what the runtime already does are not expansions — they are bug fixes,
and are marked inline with a dated correction note.*

---

## Crate (Conductive Crate) — ORDER CRATE_TIMED v1

```js
{
  id: string,   // ✅ REQUIRED — unique, non-empty, within the level
  x:  number,   // ✅ REQUIRED — world pixel X (left edge)
  y:  number,   // ✅ REQUIRED — world pixel Y (top edge)
  w:  number,   // optional — default 32 (one tile); positive when present
  h:  number,   // optional — default 32; positive when present
}
```

An absent or empty `crates` array means ZERO behavioral change to any level
authored before this order.

**v1 semantics** (ratified in `docs/KIRO_RULING_CRATE_TIMED_V1.md`):

- **Pure conduit, ZERO capacity.** A crate never stores, buffers or leaks energy.
  There is no `charge` field. It is a wire, not a power bank.
- **Contact** = AABB overlap with the crate box inflated by `CRATE_CONTACT_PAD`
  (2px). Strict inequality, so exactly 2px is the exclusive boundary.
- **Delivery targets are GATES and SWITCHES ONLY.** `ElectricalSource` has no
  `receive()` method, so a source is never a target. Absorb-through-crate is
  deferred to v2.
- **A crate must bridge EXACTLY ONE device.** Touching none → refuses
  (`NOT CONNECTED`). Touching two or more → refuses and console-warns
  (`AMBIGUOUS CONTACT`). It never guesses which device gets the energy.
- Already-finished devices (open gate / switch already on) and `blockOnly` gates
  are not eligible targets.
- **Push:** horizontal only, by walking into it. If the crate's destination is
  blocked, the PLAYER is blocked instead — a crate can never be shoved into
  geometry. No lift, no carry, no grab button.
- Crates fall under gravity, rest on tiles / one-way platforms / movers / other
  crates, and are solid to the player and to enemies.
- Crate position is **snapshotted**, so checkpoint restore rewinds it.

**AUTHORING RULE (enforced by the parity harness):** any level containing
`crates` MUST contain at least one checkpoint. A crate can be pushed into a pit
or wedged against a wall and v1 has no reset-crate button, so checkpoint restore
is the only recovery path.

### Not in v1
magnetization · multi-crate chains · carry/grab · crate-as-battery · vertical
push · crate-to-crate conduction · riding movers horizontally ·
absorb-through-crate (draining a source via a crate).

---

## Gate: timed fields — ORDER CRATE_TIMED v1

Optional additions to the Gate object. **Non-timed gates are completely
unaffected** — every timed branch is gated on `timed`.

```js
{
  ...existing gate fields...,
  timed:    boolean,   // optional, default false
  duration: number,    // optional, default 3 — seconds it stays open once full
}
```

Lifecycle: `DORMANT → charge → OPEN (counting down `duration`) → expiry → drains
to `charged: 0`, blocking resumes, returns to the **DORMANT** visual state (the
dedicated TRUE DEAD art, static and unlit — not idle-animated).

- Countdown is drawn in the same strip as the charge bar, flickering under 1s.
- `_timeLeft` is snapshotted, so a checkpoint taken mid-countdown restores the
  remaining time rather than handing the player a fresh duration.
- **`timed` + `isExit` is REFUSED** as an authoring error (console-warn, `timed`
  ignored): a timed exit could expire during the level-complete transition and
  strand the player. The parity harness also rejects this combination.

---

## `style` — powered fence + wall switch (ORDER FENCE_SHORT_CIRCUIT v1)

Optional, additive, default-off. **Absent `style` is byte-identical to
pre-order behaviour** — Levels 1/2/3 are unaffected until Chief authors the flag.

### Switch: `style: "wall"`

```js
{ ...existing switch fields..., style: "wall" }   // optional
```

Renders the `assets/objects/wall_switch/` art (56x56) and **inverts the
presentation**:

| `switch.on` | renders |
|---|---|
| `false` | `switch_on.png` — green, **powering the fence** |
| `true` | `frame_001..008` once (~0.67s burn) → `switch_destroyed.png` **permanently** |

**`on` means FIRED, not lit.** Charging a wall switch does not turn something on,
it **destroys** the thing holding the fence up. No state-machine change and no new
energy path — only the render mapping inverts.

A `style:"wall"` switch must have a `linkedId` pointing at an existing
**blockOnly** gate. Enforced by the parity harness.

`switch_off.png` is installed but **unused in v1** and deliberately reserved: it
is genuinely unpowered art and this puzzle has no "intact but unpowered" state.

### blockOnly gate: `style: "fence"`

```js
{ ...existing gate fields..., blockOnly: true, style: "fence" }   // optional
```

Renders the `assets/objects/fence/` art (64x64):

- **closed (live):** loops `frame_001..frame_008` at 10fps — blocking
- **open (shorted):** static `fence_dead.png` — passable

`style:"fence"` **requires `blockOnly: true`**. A fence is opened by its linked
wall switch and is never charged by the player, so `style:"fence"` on a chargeable
gate is an authoring error: console-warn and ignore. Also rejected by parity.

The sprite is drawn **larger than the hitbox and tiled** to cover it, the same
convention `PowerGate` already uses. Level 2's `BARRIER` (32w x 128h) tiles the
64x64 art exactly 2x vertically, centred horizontally. **The hitbox is never
changed** — collision stays exactly as authored.

### FRAME INDEXING — animate from 001, never 000

`frame_000.png` is **byte-identical to the rest pose** in both packs
(`fence_dead.png`, `switch_destroyed.png`). PixelLab exports frame 0 as the
object's base pose, so the motion is frames **001-008**.

Animating from 000 would make a **live, blocking fence flash its dead passable
art one frame in nine**, and would play the switch's **destroyed end-state as the
first frame of its own destruction**. `_dev/parity_regression.mjs` now detects this
pack layout mechanically for any future asset pack.

**Motion, not brightness, is the fence state signal.** Measured, `fence_dead` is
lum 50.4 while live frames 001/008 are 22.7/22.0 — the live fence at its darkest
is darker than dead. A live fence moves; a dead fence is static.

### Timing on open

The fence becomes passable **the instant the switch fires**, with the burn playing
out concurrently. The fence going dark IS the player's confirmation that the
charge worked, so it is never delayed behind an animation.

### Snapshot

The switch snapshot carries `_destroyT` (burn progress), so a checkpoint taken
mid-burn neither replays nor skips the destruction.
