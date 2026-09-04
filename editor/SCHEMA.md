# Level JSON Schema (v1)

**Owner:** Orcha (runtime consumer) + Aki (authoring producer).
**Meeting point:** this document. Any change requires coordination.

The editor reads and writes JSON files matching this schema. The game must load the same JSON via a loader that consumes these fields.

Current example files: `src_scroll/levels/level1.json`, `src_scroll/levels/level2.json` — mechanically converted from the original `.js` modules. Original `.js` files remain in place as a rollback until the game-side JSON loader is proven.

## Top-level shape

```json
{
  "name":         "NEON DISTRICT",
  "number":       1,
  "cols":         100,
  "tiles":        [ /* cols * rows integers */ ],
  "playerStart":  { "x": 64, "y": 194 },
  "decorations":  [ ... ],
  "sources":      [ ... ],
  "gates":        [ ... ],
  "switches":     [ ... ],
  "checkpoints":  [ ... ],
  "platforms":    [ ... ],
  "enemies":      [ ... ]
}
```

### Field notes

| Field | Type | Notes |
|---|---|---|
| `name` | string | Human-readable level name shown in HUD. |
| `number` | integer | Level number for progression. |
| `cols` | integer | Level width in tiles. Level pixel width = `cols * 32`. |
| `tiles` | int[] | Flat row-major array. Length = `cols * rows`. Row count is inferred as `tiles.length / cols`. `0` = empty, `1` = solid, `2` = one-way ledge (reserved). |
| `playerStart` | `{x,y}` | Pixel coordinates where the player spawns. Bottom-of-player at `y + PLAYER_H`. |

## Decorations (non-collidable prop sprites)

```json
{
  "src": "assets/tilesets/purple_city/props/street_lamp.png",
  "x":   128,
  "y":   96,
  "w":   44,
  "h":   86
}
```

- `src` is a manifest path (see MANIFEST.md).
- `x`,`y` = top-left pixel of the rendered sprite in world coordinates.
- `w`,`h` = destination render size. May be a scaled version of the source PNG.
- Order in the array = draw order (later = on top).

## Electrical Sources (drainable power)

```json
{
  "id":     "A1",
  "x":      224,
  "y":      196,
  "charge": 4,
  "label":  "GEN-A"
}
```

- `id` (string): unique within the level. Used as reference target from other objects. Aki assigns.
- `charge` (number): units the source holds. Player absorbs at ABSORB_RATE per second (constant, runtime-owned).
- Hitbox is 28×28 centered on `x,y` (runtime constant).

## Power Gates (electric barriers / exits)

```json
{
  "id":        "EXIT",
  "x":         3040,
  "y":         128,
  "w":         40,
  "h":         64,
  "required":  6,
  "isExit":    true,
  "blockOnly": false,
  "label":     "EXIT"
}
```

- `required` (number): charge units needed to open.
- `isExit` (bool, optional): opening this gate completes the level.
- `blockOnly` (bool, optional): if true, the gate is switch-only — the player cannot discharge into it directly. Used for switch-linked barriers.
- Gate has solid collision when closed. When open, walkable.

## Switches (charge-consuming triggers)

```json
{
  "id":       "SW1",
  "x":        1920,
  "y":        202,
  "required": 2,
  "linkedId": "BARRIER",
  "label":    "OPEN"
}
```

- `required` (number): charge needed to activate the switch.
- `linkedId` (string): the `id` of a gate that opens when the switch turns on.
- Hitbox is 22×22.

## Checkpoints (optional)

```json
{ "id": "CP1", "x": 1500, "y": 200 }
```

- When the player overlaps a checkpoint, respawn point updates.
- Currently unused in Level 1/2 but supported by runtime.

## Moving Platforms (optional)

Reserved. Runtime class `MovingPlatform` exists. Editor exposure and gameplay properties to be defined in a later handoff between Aki and Orcha.

## Enemies

```json
{
  "type":        "drain",
  "x":           256,
  "y":           200,
  "patrolLeft":  224,
  "patrolRight": 500,
  "speed":       60
}
```

- `type` (string): `"drain"` currently supported. `"drone"` reserved. `"patrol"` is the fallback.
- `patrolLeft`,`patrolRight` (number): x-coordinate bounds of patrol.
- `speed` (number, optional): base movement speed. Default 60 for drain.
- Enemy AI (chase, return-to-post, contact damage) is runtime-only. Editor exposes patrol geometry only.

## Reserved / future fields

Aki may propose additions. Any of the following must be coordinated with Orcha before they land:
- `background` (array of parallax layer descriptors: `{ src, factor, y, h }`)
- `music` / `sfx` triggers
- Object `layer` (currently implicit)
- Camera boundaries

## Migration policy

- New fields must be **additive** and **optional** in v1. Runtime must default them cleanly.
- Removing or renaming a field is a **breaking change** — requires schema version bump and coordinated update to both editor and runtime loader in one commit.
- Schema version will move to explicit `"schemaVersion": 2` on next breaking change. v1 is implicit.
