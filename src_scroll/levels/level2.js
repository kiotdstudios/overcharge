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

// ── Row data ────────────────────────────────────────────────────────────
// Phase 1 redesign: added setback tiers to A, B, D, F for reference-style
// silhouette variety.
const SKY = tileRow();   // pure sky — rows 0, 1, 2

//  Row 3: E-tower peak + B-upper peak
const R3  = tileRow([22, 27, 1,   80, 85, 1]);

//  Row 4: C-tower + E-tower body + B-upper body + F-setback peak
const R4  = tileRow([22, 27, 1,   48, 53, 1,   80, 85, 1,   96, 99, 1]);

//  Row 5: setback rooftops (A-east, D-east) + B main + tower bodies + F-setback body
const R5  = tileRow([12, 16, 1,   19, 34, 1,   48, 53, 1,   65, 72, 1,   75, 90, 1,   96, 99, 1]);

//  Row 6: C main, E main, F main + B body + setback bodies (A, D)
const R6  = tileRow([12, 16, 1,   19, 34, 1,   37, 53, 1,   65, 72, 1,   75, 90, 1,   93, 99, 1]);

//  Row 7: A main + B body + C body + D main + E body + F body
const R7  = tileRow([0, 16, 1,   19, 34, 1,   37, 53, 1,   57, 72, 1,   75, 90, 1,   93, 99, 1]);

// Rows 8–13: same bodies as R7
const R8  = R7;

export const LEVEL2 = {
  name:   'SPLIT DECISION',
  number: 2,
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
    // Phase 1: dense rooftop clutter matching Level 1 v2.
    prp('street_lamp',      22, 43,    96, 224),
    prp('pipe_elbow',       19, 27,   224, 224),
    prp('pipe_thin',         5, 13,   320, 224),
    prp('street_lamp',      22, 43,   416, 160),
    prp('bracket_corner',    8,  9,   512, 160),
    prp('street_lamp',      22, 43,   640, 160),
    prp('tool_hammer',      25, 20,   800, 160),
    prp('pipe_thin',         5, 13,   960, 160),
    prp('sign_arrow_right', 21, 34,  1056, 160),
    prp('sign_arrow_up',    31, 47,   768, 96),
    prp('pipe_thin',         5, 13,   832, 96),
    prp('street_lamp',      22, 43,  1248, 192),
    prp('pipe_elbow',       19, 27,  1376, 192),
    prp('platform_glow_green', 23, 18, 1472, 192),
    prp('pipe_thin',         5, 13,  1536, 192),
    prp('sign_arrow_up',    31, 47,  1568, 128),
    prp('pipe_thin',         5, 13,  1632, 128),
    prp('street_lamp',      22, 43,  1888, 224),
    prp('tool_hammer',      25, 20,  1984, 224),
    prp('street_lamp',      22, 43,  2112, 160),
    prp('pipe_elbow',       19, 27,  2208, 160),
    prp('sign_arrow_right', 21, 34,  2272, 160),
    prp('street_lamp',      22, 43,  2432, 160),
    prp('pipe_thin',         5, 13,  2496, 160),
    prp('sign_arrow_up',    31, 47,  2592, 96),
    prp('pipe_thin',         5, 13,  2688, 96),
    prp('pipe_elbow',       19, 27,  2784, 160),
    prp('platform_glow_green', 23, 18, 2848, 160),
    prp('street_lamp',      22, 43,  3008, 192),
    prp('sign_arrow_up',    31, 47,  3104, 128),
    prp('pipe_thin',         5, 13,  3168, 128),
  ],
  // ── Puzzle elements — intentionally empty for architecture pass ───────────────
  // Do not populate until traversal and silhouette are approved.
  // ── Puzzle elements — Level 2: "Split Decision" (GDD §11) ─────────────────
  // Two devices compete for limited power; one opens the route to the energy
  // needed for the exit. Player MUST spend part of their initial 4 charge on
  // the switch — otherwise the barrier stays closed and Building E (and thus
  // the exit) is unreachable.
  //
  // FLOW:
  //   Bldg A: absorb GEN-A (4 charge)
  //   Bldg D: discharge 2 into SWITCH → BARRIER opens        (2 charge remain)
  //   Bldg E: barrier open → absorb GEN-B                    (2 + 6 = 8 charge)
  //   Bldg F: discharge 6 into EXIT → level complete
  //
  // "Wrong path" (skip switch) is physically prevented: BARRIER blocks the
  // west edge of Bldg E, so player can't reach GEN-B or F without switch on.
  sources: [
    { id: 'A1', x:  224, y: 196, charge: 4, label: 'GEN-A' },   // Bldg A col 7 (main roof)
    { id: 'E1', x: 2784, y: 132, charge: 6, label: 'GEN-B' },   // Bldg E col 87 (main east, past tower & barrier)
  ],
  gates: [
    { id: 'BARRIER', x: 2496, y:  32, w: 32, h: 128, required: 1, blockOnly: true, label: 'BARRIER' }, // Bldg E col 78 wall
    { id: 'EXIT',    x: 3040, y: 128, w: 40, h:  64, required: 6, isExit: true,    label: 'EXIT' },    // Bldg F col 95 → setback
  ],
  switches: [
    { id: 'SW1', x: 1920, y: 202, required: 2, linkedId: 'BARRIER', label: 'OPEN' }, // Bldg D col 60 (main roof)
  ],
  checkpoints: [],
  platforms:   [],
  enemies:     [],   // No enemies until Level 3 per GDD §11 progression
};
