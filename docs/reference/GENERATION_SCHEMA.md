# OVERCHARGE — Random Level Generator · Asset Metadata Spec

**Owner:** Aki (schema authoring)  
**Consumer:** Orcha (generator implementation)  
**Status:** PROPOSED — not yet implemented  
**Base manifest:** `assets/ASSET_MANIFEST.json`

---

## Overview

Each asset entry in `ASSET_MANIFEST.json` gains a `generation` block that tells the
random level generator whether and how to place it. The generator reads `eligible`
first; if false it ignores the asset entirely. Eligible assets get placed according
to `roles`, `surface`, `layer`, and `density`.

---

## Schema: `generation` block

```jsonc
"generation": {
  // Can the generator use this asset? false = never touched by the generator.
  "eligible": boolean,

  // Why ineligible. Only present when eligible=false.
  "ineligible_reason": string,

  // Generation role tags. One asset can have multiple roles.
  // The generator uses these to decide which bucket an asset belongs to
  // when filling a level region.
  //
  // Role vocabulary (all 9 valid values):
  //   "structural"  — contributes to solid level geometry (tiles, walls, platforms)
  //   "walkable"    — player can stand on the top surface
  //   "grounded"    — must be placed on an existing solid surface (cannot float)
  //   "decorative"  — purely visual; no collision required
  //   "rooftop"     — intended for the top surface of structures / platforms
  //   "electrical"  — electrical gameplay object (generator, gate, switch)
  //   "background"  — background-layer art; drawn behind gameplay geometry
  //   "large"       — size hint: largest dimension > 48px; avoid dense clustering
  //   "small"       — size hint: largest dimension ≤ 24px; can cluster freely
  "roles": string[],

  // What surface the asset requires at its placement origin.
  //   "grid"         — painted into the tile integer array (structural tiles only)
  //   "ground_level" — bottom of sprite touches a solid tile surface from above
  //   "rooftop"      — placed on top-most visible surface of a structure block
  //   "floating"     — no surface constraint; generator picks y from a height range
  //   "background"   — placed in background layer with no surface dependency
  //   "wall_face"    — placed flush against a vertical solid face
  "surface": "grid" | "ground_level" | "rooftop" | "floating" | "background" | "wall_face",

  // Which render layer the generator targets.
  //   "background"  — parallax / city skyline layer (drawn first)
  //   "midground"   — terrain and structural elements
  //   "foreground"  — props, decorations, gameplay objects (drawn last)
  "layer": "background" | "midground" | "foreground",

  // How frequently the generator places this asset per level.
  //   "anchor"   — exactly 1–2 instances per level (landmark / key objects)
  //   "sparse"   — 1–4 instances per level; maintain visible breathing room
  //   "medium"   — 3–8 instances per level; regular recurrence is fine
  //   "dense"    — fills areas; no per-level cap (tile variants, wall textures)
  "density": "anchor" | "sparse" | "medium" | "dense",

  // Whether the generator may place multiple instances in the same region / zone.
  // false = enforce minimum world-space gap equal to the asset's largest dimension × 3.
  "stackable": boolean
}
```

---

## NEVER-Randomize List

These assets are **ineligible** for procedural placement. The generator must skip them.

| ID | Category | Reason |
|----|----------|--------|
| `player_idle` | player | Player character sprite — runtime-only |
| `player_walk` | player | Player character sprite — runtime-only |
| `player_run` | player | Player character sprite — runtime-only |
| `player_jump` | player | Player character sprite — runtime-only |
| `player_absorb` | player | Player character sprite — runtime-only |
| `player_discharge` | player | Player character sprite — runtime-only |
| `enemy_drain_walk` | enemy | Gameplay-balance sensitive; spawn density is scripted |
| `electrical_generator` | electrical | Puzzle-critical; must be placed by level designer |
| `gate_electric_closed` | electrical | Puzzle-critical; linked to generator + switches by ID |
| `env_bg_mid_city` | background | Parallax background — one per level, fixed position |
| `tileset_purple_city_full` | tileset | Full spritesheet reference only; not a placeable object |

---

## Eligible Asset Classifications

| ID | Roles | Surface | Layer | Density | Stackable | Notes |
|----|-------|---------|-------|---------|-----------|-------|
| `env_tile_dark_a` | structural, walkable | grid | midground | dense | yes | Mix with other tile variants |
| `env_tile_dark_b` | structural, walkable | grid | midground | dense | yes | |
| `env_tile_purple_a` | structural, walkable | grid | midground | dense | yes | Prefer upper / decorated zones |
| `env_tile_purple_b` | structural, walkable | grid | midground | dense | yes | Prefer upper / decorated zones |
| `env_building_large` | background, large | background | background | sparse | no | 70×58 — leave gap between instances |
| `env_building_wide` | background, large | background | background | sparse | no | 68×42 — wide footprint |
| `env_building_small_a` | background, small | background | background | medium | yes | 36×33 — gap-fill between large buildings |
| `env_platform_long_a` | structural, walkable, grounded | floating | midground | sparse | no | 45×14 — longest platform; use for main traversal hops |
| `env_platform_medium` | structural, walkable, grounded | floating | midground | medium | no | 39×14 |
| `env_platform_short_a` | structural, walkable, small | floating | midground | medium | no | 21×14 — tight gaps, parkour segments |
| `env_prop_street_lamp` | decorative, grounded, small | ground_level | foreground | medium | no | 22×43 — enforce horizontal spacing ≥ 2 tiles |
| `env_prop_pipe_thin` | decorative, rooftop, small | rooftop | foreground | medium | yes | 5×13 — clusters of 2–3 feel intentional |
| `env_prop_sign_arrow_right` | decorative, grounded, small | ground_level | foreground | sparse | no | 21×34 — CAUTION: directional; place near transitions/exits only |
| `env_crate_large` | decorative, grounded, structural | ground_level | foreground | medium | yes | 50×50 — player-climbable obstacle; don't block critical paths |
| `env_container_small_a` | decorative, grounded, small | ground_level | foreground | medium | yes | 20×18 — background clutter |
| `env_wall_brick_a` | structural, decorative | wall_face | midground | dense | yes | 26×26 — use for vertical wall texturing |
| `env_wall_brick_b` | structural, decorative | wall_face | midground | dense | yes | 27×26 |
| `env_wall_brick_c` | structural, decorative | wall_face | midground | dense | yes | 25×24 |

---

## Generator Placement Order (recommended)

The generator should fill a level region in this order to avoid placement conflicts:

1. **Background layer** — scatter buildings (`background` surface)
2. **Terrain grid** — paint tile variants into the integer tile array (`grid` surface)
3. **Platforms** — place floating platforms at height intervals (`floating` surface)
4. **Wall textures** — apply wall bricks to exposed vertical faces (`wall_face` surface)
5. **Ground-level props** — lamps, crates, containers, signs (`ground_level` surface)
6. **Rooftop props** — pipes (`rooftop` surface)

Electrical objects and enemies are placed last by the **scripted pass** (not the random generator).

---

## Open Questions for Orcha

1. **Tile variant mixing rule** — should the generator use one tile variant per "zone" for visual
   consistency, or mix all four randomly per-tile? Suggestion: assign per-zone, switch on zone boundary.

2. **Platform height bands** — what vertical range should `floating` platforms occupy relative to
   the ground? The current level is 14 rows tall. Suggested bands: rows 3–5 (high), 6–8 (mid), 9–11 (low).

3. **`env_crate_large` collision** — at 50×50 it spans more than one 32-px tile. Does the generator
   need to punch through the tile grid to carve a solid footprint, or is it purely decorative?

4. **Flip horizontal** — can props and platforms be mirrored on the x-axis? Adds variety at zero
   art cost. Would need a `flipHorizontal: true` flag per asset and renderer support.

5. **`env_prop_sign_arrow_right`** — currently only a right-pointing variant exists. Should the
   generator skip it entirely until a left-pointing variant is available, or place it only near
   right-side exits/transitions?
