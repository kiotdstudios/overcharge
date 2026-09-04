# LEVEL SCHEMA — PROVISIONAL DRAFT

**Owner:** Aki (documentation) + Orcha (runtime confirmation)  
**Status:** PROVISIONAL — fields marked ✅ confirmed in runtime, ⚠️ provisional until Orcha review  
**Last updated:** 2026-09-04

Orcha must review and confirm or amend every field before either agent expands the schema.  
Do not add new fields without cross-agent agreement. Do not silently rename existing fields.

---

## Top-Level Level Object

```js
{
  name:        string,          // ✅ Display name, e.g. "NEON DISTRICT"
  number:      integer,         // ✅ Level number (1-based)
  cols:        integer,         // ✅ Width in tile columns (1 col = 32px)
  tiles:       number[][],      // ✅ 2D tilemap. See Tilemap section below
  playerStart: { x, y },       // ✅ World pixel coords for player spawn
  decorations: Decoration[],   // ✅ Visual-only rooftop props (no collision)
  sources:     Source[],        // ✅ Electrical charge sources (generators)
  gates:       Gate[],          // ✅ Power gates and barriers
  switches:    Switch[],        // ✅ Charge-spending switch objects
  checkpoints: Checkpoint[],   // ⚠️ Empty in current levels — schema TBD
  platforms:   Platform[],     // ⚠️ Empty in current levels — schema TBD
  enemies:     Enemy[],         // ⚠️ Empty in current levels — schema TBD
}
```

**Derived constants (not stored in level data — computed at runtime):**
- Tile size: `TILE = 32px` (Orcha to confirm exact value from constants.js)
- World width: `cols × TILE`
- World height: fixed at `14 rows × TILE = 448px` (Orcha to confirm)

---

## Tilemap

```js
tiles: number[][]
```

- Outer array = rows (top to bottom)
- Inner array = columns (left to right)
- Tile values: `0` = empty/sky, `1` = solid mass

**Orcha to confirm:** Are additional tile type values (2, 3, etc.) reserved or in use?

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

Runtime hitbox: `28×28px` centered at `(x, y)`. Sprite drawn `64×64px` above hitbox.  
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
**Pending:** `gate_electric_open` asset not yet created.

---

## Switch

```js
{
  id:        string,   // ✅ Unique ID within level, e.g. "SW1"
  x:         number,   // ✅ World pixel X (center of switch)
  y:         number,   // ✅ World pixel Y (center of switch)
  required:  number,   // ✅ Charge units needed to activate
  linkedId:  string,   // ✅ ID of the Gate this switch controls
  label:     string,   // ✅ Display label, e.g. "OPEN"
}
```

Runtime hitbox: `22×22px` centered at `(x, y)`.  
**Note:** Switch x/y appear to be the center point, not top-left corner. Orcha to confirm.

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

Built by level data via the `prp()` helper function (internal to level files).  
`prp(file, srcW, srcH, x, groundY)` — computes y so the prop bottom sits on groundY.  
Scale factor `S2` is defined in the level file. **Orcha to expose S2 value.**

Props reference assets from `assets/tilesets/purple_city/props/` by filename (no extension in helper call).

---

## Checkpoint

```js
// ⚠️ SCHEMA NOT YET DEFINED — no checkpoints exist in current levels
// Provisional fields (Orcha to define):
{
  id: string,
  x:  number,
  y:  number,
  // ... Orcha owns runtime behavior definition
}
```

---

## Platform

```js
// ⚠️ SCHEMA NOT YET DEFINED — no moving platforms in current levels
// Provisional fields (Orcha to define):
{
  id: string,
  x:  number,
  y:  number,
  w:  number,
  h:  number,
  // ... Orcha owns: patrolDistance, speed, direction, etc.
}
```

---

## Enemy

```js
// ⚠️ SCHEMA NOT YET DEFINED — no enemies in current levels
// Provisional fields (Orcha to define):
{
  id:   string,
  type: string,   // e.g. "drain_enemy", "drone"
  x:    number,
  y:    number,
  // ... Orcha owns: patrol, drainAmount, health, activationDelay, etc.
}
```

---

## NOTES FOR ORCHA

Please confirm or amend the following before either agent expands the schema:

1. **Tile size** — is `TILE = 32px` correct? Level1 comment says "100 cols × 14 rows = 3200 × 448 px" which implies 32px/tile.
2. **Tile values** — are values beyond 0 and 1 reserved or planned?
3. **World height** — is 448px (14 rows × 32px) the fixed canvas height, or does it vary?
4. **Switch x/y** — center or top-left?
5. **S2 scale factor** — what is its value? Should it be in level data or stay internal?
6. **Checkpoint schema** — define fields when implementing.
7. **Platform schema** — define `patrolDistance`, `speed`, etc. when implementing moving platforms.
8. **Enemy schema** — define `drainAmount`, `health`, `activationDelay` etc. when implementing.

---

*This document is the agreed contract between editor (Aki) and runtime (Orcha). Neither agent expands it unilaterally.*
