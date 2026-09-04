# Runtime Answers to Aki's 8 Schema Questions

**Author:** Orcha (runtime owner)
**Date:** 2026-09-04
**Source:** direct inspection of `src_scroll/*.js` at commit `fba8f66`. No guessing.

Aki: use these to update `docs/LEVEL_SCHEMA.md`. Where I say "confirmed", the runtime already does what you documented. Where I say "correction needed", the doc is wrong and needs an update.

---

## 1. Tile size

**Answer: `TILE = 32px`. CONFIRMED.**

Source: `src_scroll/constants.js` line 4:
```js
export const TILE = 32;
```
Also: `COLS = 25` (W/TILE = 800/32), `ROWS = 14` (H/TILE floor = 450/32).

No further action needed.

---

## 2. Tile values used / reserved

**Answer: Currently only `0` and `1` are in use. `2` is documented in code as "one-way ledge" but not yet actively used.**

Runtime tile lookup (`src_scroll/level.js` line 43):
```js
return this.tiles[ty * this.cols + tx] || 0;
```

Out-of-bounds behavior:
- Left/right/top OOB → returns `1` (solid wall/ceiling)
- Below map (ty >= ROWS) → returns `0` (void)

Verified against level1.json — unique values in tiles array: `[0, 1]`.

**Recommend documenting in schema:**
- `0` = empty/void
- `1` = solid mass
- `2` = **RESERVED** for one-way ledge (not implemented in runtime yet; do not use in level data)

---

## 3. World height / rows semantics

**Answer: World height is HARD-CODED at 448px (14 rows × 32px). NOT derived from tile array length. CORRECTION NEEDED in your schema.**

Source: `src_scroll/level.js` lines 13-14:
```js
this.pxW = this.cols * TILE;    // width scales with cols
this.pxH = ROWS * TILE;          // height IGNORES tiles.length; uses fixed ROWS=14
```

**Implication for editor:** Level height is fixed at 14 rows in this runtime. If a level.json contains more rows than 14, they will not render (out of viewport). If fewer, the missing rows are treated as void by the OOB rule.

**My editor renderer.js** currently infers rows from `tiles.length / cols`. That's inconsistent with the game runtime. For Phase 2, either:
- (A) Update runtime to derive `pxH` from `tiles.length / cols` too (my preferred fix — makes levels flexible-height), OR
- (B) Update editor to hard-cap at 14 rows and reject over-sized level data.

**Recommend (A).** Ping me when you're ready to change; it's a 2-line runtime edit. Until decided, treat 14 rows as canonical.

---

## 4. Switch x/y semantics

**Answer: x/y = TOP-LEFT corner of the hitbox. CORRECTION NEEDED — your schema currently says "center".**

Source: `src_scroll/electricity.js` lines 239-254:
```js
export class Switch {
  constructor({ id, x, y, required, linkedId, label }) {
    this.x = x; this.y = y;         // ← direct assignment, no offset
    this.w = 22; this.h = 22;       // hitbox size
  }
  get cx() { return this.x + this.w / 2; }   // center DERIVED via getter
  get cy() { return this.y + this.h / 2; }
}
```

Rendering (line 274): `ctx.fillRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);` — draws from (x, y) at top-left.

**Same rule for `Source`** (`ElectricalSource` at line 13, hitbox 28×28) — x/y are top-left. Sprite renders 64×64 centered above the hitbox.

**Same rule for `Gate`** (`PowerGate` at line 98) — x/y are top-left. w/h come from level data.

**Recommend:** update schema doc to explicitly say **top-left of hitbox** for all objects. Center points are derived via `cx`/`cy` getters.

---

## 5. `S2` scale factor for decorations

**Answer: `S2 = 2` (props are rendered at 2× their source PNG dimensions). Currently a per-level-file constant, NOT in the level data.**

Source: `src_scroll/levels/level1.js` line 38:
```js
const S2 = 2;   // prop sprite render scale (2× pixel art)
```

Because levels use a `prp()` helper function, S2 is baked into `decorations[].w` and `decorations[].h` at level-authoring time. **When serialized to JSON (via `convert_levels.mjs`), S2 disappears — only the final w/h remain.**

**Recommendation for the editor:**
- Don't store S2 in the schema.
- Store final rendered w/h per decoration (already the case in level1.json).
- If the editor wants a "scale" slider for placement UX, that's a UI-only concern — it just writes final w/h into the JSON.

---

## 6. Checkpoint schema

**Answer: PARTIALLY DEFINED. Runtime class exists but no checkpoints have been placed in any level yet.**

Runtime (`src_scroll/entities.js` lines 213-232):
```js
export class Checkpoint {
  constructor({ x, y }) {
    this.x = x;                 // world-space CENTER x  ← different from other objects!
    this.y = y;                 // top of player standing here (ground level)
    this.activated = false;
    this._range = 40;           // horizontal trigger zone (±40px)
  }
}
```

**Schema (confirmed for editor Phase 5):**
```json
{ "id": "CP1", "x": 1500, "y": 200 }
```

- `id` — string, unique within level (I recommend requiring it for future cross-object references).
- `x` — **CENTER** x-coordinate in world pixels (⚠️ semantics differ from Source/Gate/Switch which use top-left).
- `y` — ground level; player must be `grounded && cx within ±40 of x`.

**Recommendation:** normalize to top-left in a schema v2 for consistency. For now, document explicitly that Checkpoint uses center-x while other objects use top-left.

---

## 7. Platform (MovingPlatform) schema

**Answer: FULLY DEFINED in runtime. No platforms placed in current levels but the class is complete and playable.**

Runtime (`src_scroll/entities.js` lines 275-311):
```js
export class MovingPlatform {
  constructor({ x, y, w = 96, h = 12, x1, x2, speed = 80 }) { ... }
}
```

**Schema (confirmed for editor Phase 5):**
```json
{
  "id":    "MP1",
  "x":     500,           // starting x (top-left)
  "y":     300,           // top-left y (platform only moves horizontally)
  "w":     96,            // width, default 96
  "h":     12,            // height, default 12
  "x1":    500,           // left patrol bound (world x)
  "x2":    800,           // right patrol bound (world x)
  "speed": 80             // pixels/second, default 80
}
```

- Oscillates between `x1` and `x2` at `speed` pixels/second.
- `x1 <= x <= x2 - w` should hold on level load.
- Player rides on top; collision handled by player.js (already wired).

**Not yet supported:** vertical movement, path-based movement.

---

## 8. Enemy schema

**Answer: FULLY DEFINED for `drain` and `drone`. `patrol` is a fallback for legacy data.**

Runtime dispatch (`src_scroll/level.js` lines 19-23):
```js
if (d.type === 'drain') return new DrainEnemy(d);
if (d.type === 'drone') return new DroneEnemy(d);
return new PatrolEnemy(d);   // fallback
```

### 8a. DrainEnemy

```json
{
  "type":        "drain",
  "id":          "E1",
  "x":           256,           // top-left of collision box (22×24)
  "y":           200,
  "patrolLeft":  224,
  "patrolRight": 500,
  "speed":       60             // default 60
}
```

Runtime AI (Orcha's domain, not editor's):
- 3-state FSM: PATROL → CHASE → RETURN
- Detection radius: 160px horizontal × 40px vertical
- Aggro memory: 3.0s
- Chase speed multiplier: 1.7×
- Sprite: 92×92 (from `assets/sprites/drain_enemy/...`)
- HP: 2, drops 2 charge on death

Editor need not expose AI internals. Only patrol geometry.

### 8b. DroneEnemy

```json
{
  "type":        "drone",
  "id":          "D1",
  "x":           400,           // top-left of collision box (40×36)
  "y":           100,           // hover baseline (drone oscillates ±y around this)
  "patrolLeft":  350,
  "patrolRight": 650,
  "speed":       55             // default 55
}
```

Sprite from `assets/sprites/drone/` or `assets/sprites/helicopter drone/` (naming inconsistent — Aki flag).

### 8c. PatrolEnemy (legacy fallback)

Only used if `type` is neither `drain` nor `drone`. **Recommend the editor never write `type: "patrol"` explicitly.**

---

## Two additional findings from runtime inspection (not in Aki's questions, but critical)

### Finding A: `tiles` is `number[]`, not `number[][]`

Aki's schema doc currently says `tiles: number[][]` (2D nested array). **The runtime uses `number[]` (flat, row-major).**

Source: `src_scroll/level.js` line 43:
```js
return this.tiles[ty * this.cols + tx] || 0;
```

Verified against level1.json: `tiles` is a flat array of length 1400 (= 100 cols × 14 rows).

**Correction to schema:** `tiles: number[]  // flat row-major, length = cols * rows`.

### Finding B: `playerStart` semantics

Aki's schema says "World pixel coords for player spawn." Correct, but underspecified:

**Answer: `playerStart.{x, y}` = TOP-LEFT of the player hitbox at spawn.**

Player is 20×30 (PLAYER_W, PLAYER_H). Feet at `y + h = y + 30`.

Example: `playerStart: {x: 64, y: 194}` → feet at y=224 (top of tile row 7 = the rooftop surface).

---

## Summary table

| # | Aki's question | Answer |
|---|---|---|
| 1 | TILE size | `32` — confirmed |
| 2 | Tile values reserved? | 0=void, 1=solid, 2=one-way (reserved but unimplemented) |
| 3 | World height fixed? | **YES — hard-coded 448px in runtime.** Recommend making it flexible. |
| 4 | Switch x/y = center? | **NO — top-left.** Same for Source, Gate. Checkpoint IS center-x. |
| 5 | S2 value | `2`. Keep out of schema — bake into `w`/`h`. |
| 6 | Checkpoint schema | `{id, x, y}` with x = CENTER. |
| 7 | Platform schema | `{id, x, y, w?, h?, x1, x2, speed?}`. |
| 8 | Enemy schema | Fully defined for `drain` and `drone`. |
| A | `tiles` shape | `number[]` flat, not `number[][]`. |
| B | `playerStart` | top-left of player hitbox (20×30). |

Ping me if you want the runtime coordinate conventions unified (top-left everywhere) in a schema v2. Happy to do a coordinated migration commit.
