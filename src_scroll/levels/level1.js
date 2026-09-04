// Level 1 — "NEON DISTRICT"
// 100 cols × 14 rows = 3200 × 448 px
//
// Six distinct buildings form the traversable skyline.
// The TILE GEOMETRY IS the architecture — no decorative building sprites.
//
// ┌────────────────── SKYLINE MAP ──────────────────────────────────────────────┐
// │  A  │ gap │  B   │gap│    C    │ gap │   D   │gap│     E     │gap│  F   │  │
// │     │     │ ████ │   │         │     │       │   │    ████   │   │      │  │
// │     │     │ ████ │   │    ████ │     │       │   │    ████   │   │      │  │
// │     │     │ ████ │   │ ██████  │     │       │   │ ██████████│   │      │  │
// │ ██  │     │ ████ │   │ ██████  │     │ ████  │   │ ██████████│   │ ████ │  │
// │ ██  │     │ ████ │   │ ██████  │     │ ████  │   │ ██████████│   │ ████ │  │
// │ ██  │     │ ████ │   │ ██████  │     │ ████  │   │ ██████████│   │ ████ │  │
// └───────────────────────────────────────────────────────────────────────────-─┘
//
//  BUILDING    COLS     ROOF ROW   SURFACE Y   NOTES
//  A           0–16     row 7      y=224       Tutorial — wide, low entry
//  B           19–34    row 5      y=160       Office block — step UP from A
//  C           37–53    row 6      y=192       Complex — step down from B
//  C-tower     48–53    row 4      y=128       Spire above C main
//  D           57–72    row 7      y=224       Maintenance shed — drop from C
//  E           75–90    row 5      y=160       Power facility — step UP from D
//  E-tower     80–85    row 3      y=96        Tallest structure in level
//  F           93–99    row 6      y=192       Exit building
//
//  ALLEYS (void — falling triggers respawn):
//  A→B: cols 17–18 (64 px)    B→C: cols 35–36 (64 px)
//  C→D: cols 54–56 (96 px)    D→E: cols 73–74 (64 px)
//  E→F: cols 91–92 (64 px)
//
//  PHYSICS BUDGET (JUMP_FORCE=-430, GRAVITY=900):
//  max apex ≈ 103 px  |  run horiz range ≈ 122 px
//  Hardest jump: A→B (UP 64 px across 64 px gap) — needs running jump
//  All other jumps are comfortable with a short-to-medium jump arc.

const BASE = 'assets/tilesets/purple_city';
const S2   = 2;   // prop sprite render scale (2× pixel art)

// Prop flush on a rooftop surface.
// groundY = row * 32 (top face of the rooftop tile row).
// Sprite bottom-edge sits at groundY, so the prop stands ON the tile.
function prp(file, srcW, srcH, x, groundY) {
  return {
    src: `${BASE}/props/${file}.png`,
    x,
    y:   groundY - srcH * S2,
    w:   srcW * S2,
    h:   srcH * S2,
  };
}

// Build one tile row (100 columns).
// specs: flat array of [fromCol, toCol, tileType, ...] triplets.
// All unspecified columns default to 0 (void/sky).
function tileRow(specs = [], cols = 100) {
  const r = new Array(cols).fill(0);
  for (let i = 0; i < specs.length; i += 3) {
    const [a, b, v] = [specs[i], specs[i + 1], specs[i + 2]];
    for (let c = a; c <= b; c++) r[c] = v;
  }
  return r;
}

// ── Row data ──────────────────────────────────────────────────────────────────
const SKY = tileRow();   // pure sky — rows 0, 1, 2

//  Row 3: E-tower peak only
const R3  = tileRow([80, 85, 1]);

//  Row 4: C-tower body + E-tower body (both peaks already passed row 3)
const R4  = tileRow([48, 53, 1,   80, 85, 1]);

//  Row 5: B rooftop  + C-tower body + E-tower body
const R5  = tileRow([19, 34, 1,   48, 53, 1,   80, 85, 1]);

//  Row 6: B body + C main rooftop + E main rooftop + F rooftop
//  (A has NOT started yet — A roof is row 7)
const R6  = tileRow([19, 34, 1,   37, 53, 1,   75, 90, 1,   93, 99, 1]);

//  Row 7: A rooftop + B body + C body + D rooftop + E body + F body
const R7  = tileRow([0, 16, 1,   19, 34, 1,   37, 53, 1,   57, 72, 1,   75, 90, 1,   93, 99, 1]);

// Rows 8–13: same building bodies, no new rooftops
const R8  = R7;

export const LEVEL1 = {
  name:   'NEON DISTRICT',
  number: 1,
  cols:   100,

  // ── Tilemap ──────────────────────────────────────────────────────────────────
  // type 1 = solid building mass   type 2 = one-way ledge (pass up, land top)
  // topOpen logic in level.js/render.js: tile above ≠ 1 → neon rooftop edge drawn.
  tiles: [
    ...SKY,  // row 0  — open sky
    ...SKY,  // row 1  — open sky
    ...SKY,  // row 2  — open sky
    ...R3,   // row 3  — E-tower peak                             (cols 80–85)
    ...R4,   // row 4  — C-tower body, E-tower body               (cols 48–53, 80–85)
    ...R5,   // row 5  — B rooftop, tower bodies                  (cols 19–34, 48–53, 80–85)
    ...R6,   // row 6  — C rooftop, E rooftop, F rooftop, B body  (cols 19–34, 37–53, 75–90, 93–99)
    ...R7,   // row 7  — A rooftop, D rooftop, all bodies         (cols 0–16, 19–34, 37–53, 57–72, 75–90, 93–99)
    ...R8,   // row 8  — building bodies
    ...R8,   // row 9
    ...R8,   // row 10
    ...R8,   // row 11
    ...R8,   // row 12
    ...R8,   // row 13
  ],

  // Player spawns on Building A rooftop, col 2.
  // A roof = row 7 → surface y = 7 × 32 = 224 → player.y = 224 − PLAYER_H = 224 − 30 = 194
  playerStart: { x: 64, y: 194 },

  // ── Rooftop props ─────────────────────────────────────────────────────────────
  // No background building sprites — the tiles ARE the buildings.
  // Props (lamps, signs, pipes) sit on the tile surface and extend upward.
  // groundY = row * 32 (top face of that row's tile).
  decorations: [
    // ── Building A — row 7, groundY = 224 ──────────────────────────────────────
    prp('street_lamp',       22, 43,   128, 224),   // col  4
    prp('street_lamp',       22, 43,   448, 224),   // col 14

    // ── Building B — row 5, groundY = 160 ──────────────────────────────────────
    prp('street_lamp',       22, 43,   736, 160),   // col 23
    prp('sign_arrow_right',  21, 34,  1056, 160),   // col 33 — nudge player toward C

    // ── Building C main — row 6, groundY = 192 ─────────────────────────────────
    prp('street_lamp',       22, 43,  1312, 192),   // col 41
    prp('pipe_elbow',        19, 27,  1536, 192),   // col 48 — rooftop machinery at tower base

    // ── Building C tower top — row 4, groundY = 128 ────────────────────────────
    prp('sign_arrow_up',     31, 47,  1568, 128),   // col 49 — look up, reward is here

    // ── Building D — row 7, groundY = 224 ──────────────────────────────────────
    prp('street_lamp',       22, 43,  1984, 224),   // col 62
    prp('sign_arrow_right',  21, 34,  2240, 224),   // col 70 — point toward E

    // ── Building E main — row 5, groundY = 160 ─────────────────────────────────
    prp('street_lamp',       22, 43,  2464, 160),   // col 77
    prp('pipe_elbow',        19, 27,  2720, 160),   // col 85 — conduit at E-tower edge

    // ── Building E tower top — row 3, groundY = 96 ─────────────────────────────
    prp('sign_arrow_up',     31, 47,  2592, 96),    // col 81 — highest point

    // ── Building F — row 6, groundY = 192 ──────────────────────────────────────
    prp('street_lamp',       22, 43,  3040, 192),   // col 95
  ],

  // ── Puzzle elements — intentionally empty for architecture pass ───────────────
  // Do not populate until traversal and silhouette are approved.
  sources:     [],
  gates:       [],
  switches:    [],
  checkpoints: [],
  platforms:   [],
  enemies:     [],
};
