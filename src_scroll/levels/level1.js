// Level 1 — "NEON DISTRICT"
// 100 cols × 14 rows = 3200 × 448 px
//
// Buildings ARE the level geometry — rooftop traversal across a cyberpunk city block.
// Route:
//   S1 roof (row 10, y=320) → HVAC step-up (row 9)
//   → S2a roof (row 9) → 1-tile gap → S2b roof (row 8) → mini-tower (row 7)
//   → courtyard drop (row 11 floor) + fire-escape climb (type-2 ledges)
//   → mid-gate → S4 high run (row 7) with HVAC peaks (row 6)
//   → moving platform gap → gate building (row 6)
//   → exit section (row 8) → EXIT
//
// Physics budget (JUMP_FORCE=-430, GRAVITY=900):
//   max height ≈ 103 px (3.2 tiles), max horiz at run ≈ 122 px (3.8 tiles)
//   All intentional gaps ≤ 2 tiles wide; vertical steps ≤ 2 tiles.

const BASE = 'assets/tilesets/purple_city';
const S3   = 3;  // building sprite scale (background facades)
const S2   = 2;  // prop sprite scale

// Background building — base anchored at world y=384.
// Upper portion shows above tile rooftops; tiles cover the building body below.
function bld(file, srcW, srcH, x) {
  return { src: `${BASE}/buildings/${file}.png`, x, y: 384 - srcH * S3, w: srcW * S3, h: srcH * S3 };
}
// Prop placed flush on a rooftop (groundY = top-surface y of that tile row = row * 32).
function prp(file, srcW, srcH, x, groundY = 384) {
  return { src: `${BASE}/props/${file}.png`, x, y: groundY - srcH * S2, w: srcW * S2, h: srcH * S2 };
}

export const LEVEL1 = {
  name:   'NEON DISTRICT',
  number: 1,
  cols:   100,

  // ── Tilemap ──────────────────────────────────────────────────────────────────
  // type 1 = solid building mass  |  type 2 = one-way platform (pass up, land on top)
  // Exposed top edges receive the neon glow line in render.js (topOpen flag).
  //
  // Section map (col ranges, rooftop row):
  //   S1 main:       cols  0–22   row 10   y=320
  //   S1 HVAC bump:  cols 14–18   row  9   y=288  (step up within S1)
  //   S2a:           cols 23–35   row  9   y=288  (adjacent step, no gap)
  //   pit:           col  36               (single-tile gap, fall = void)
  //   S2b:           cols 37–51   row  8   y=256
  //   mini-tower:    cols 47–50   row  7   y=224  (bump within S2b)
  //   courtyard:     cols 52–64   row 11   y=352  (drop zone)
  //     fire-esc-1:  cols 58–63   row 10   type 2  (climb step 1)
  //     fire-esc-2:  cols 60–63   row  8   type 2  (climb step 2)
  //   S4 main:       cols 65–80   row  7   y=224
  //   S4 HVAC-1:     cols 70–73   row  6   y=192  (bump within S4)
  //   S4 HVAC-2:     cols 76–78   row  6   y=192  (bump within S4)
  //   gap:           cols 81–84             (4-tile gap, moving platform)
  //   gate bldg:     cols 85–93   row  6   y=192
  //   exit section:  cols 94–99   row  8   y=256
  tiles: [
    // Row  0 — open sky
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,
    // Row  1
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,
    // Row  2
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,
    // Row  3
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,
    // Row  4
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,
    // Row  5
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,
    // Row  6 — S4 HVAC bumps (70-73, 76-78), gate building peak (85-93)
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 1,1,1,1,0,0,1,1,1,0, 0,0,0,0,0,1,1,1,1,1, 1,1,1,1,0,0,0,0,0,0,
    // Row  7 — S2b mini-tower (47-50), S4 main run (65-80), gate building (85-93)
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,1,1,1, 1,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,1,1,1,1,1, 1,1,1,1,0,0,0,0,0,0,
    // Row  8 — S2b (37-51), fire-esc-2 one-way (60-63), S4 (65-80), gate (85-93), exit (94-99)
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,0,0,0,0,0,0,0,0, 2,2,2,2,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,
    // Row  9 — S1 HVAC bump (14-18), S2a (23-35), S2b (37-51), S4 (65-80), gate (85-93), exit (94-99)
    0,0,0,0,0,0,0,0,0,0, 0,0,0,0,1,1,1,1,1,0, 0,0,0,1,1,1,1,1,1,1, 1,1,1,1,1,1,0,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,0,0,0,0,0,0,0,0, 0,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,
    // Row 10 — S1 main (0-35), S2b (37-51), fire-esc-1 one-way (58-63), S4 (65-80), gate (85-93), exit (94-99)
    1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,0,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,0,0,0,0,0,0,2,2, 2,2,2,2,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,
    // Row 11 — building bodies, courtyard floor (52-64), pit at col 36, gap at 81-84
    1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,0,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,
    // Row 12
    1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,0,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,
    // Row 13
    1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,0,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,1,1,1,1,1, 1,1,1,1,1,1,1,1,1,1,
  ],

  // Player spawns on S1 rooftop, col 2
  playerStart: { x: 64, y: 290 },

  // ── Background decorations ──────────────────────────────────────────────────
  // Building sprites anchor at y=384; their upper portion shows above tile rooftops.
  // Tiles cover the facade below the rooftop — only upper floors + signs are visible.
  // Rooftop props (lamps, signs) sit on the tile surface and extend upward.
  decorations: [
    // --- S1 backdrop (rooftop row 10, y=320 — upper 116-104 px of buildings visible) ---
    bld('building_striped_tall',  49, 60,   10),   // left anchor, top at y=204
    bld('building_large',         68, 56,  250),   // wide facade, top at y=216
    bld('building_wide',          66, 40,  500),   // lower block, top at y=264

    // --- S2a backdrop (rooftop row 9, y=288) ---
    bld('building_neon_door',     52, 53,  760),   // neon door facade, top at y=225
    bld('building_teal_sign',     31, 40,  970),   // teal sign, top at y=264

    // --- S2b backdrop (rooftop row 8, y=256 — upper 52px visible) ---
    bld('building_striped_tall',  49, 60, 1200),   // behind S2b, top at y=204
    bld('building_neon_panel',    28, 51, 1440),   // neon panel slab

    // --- Courtyard backdrop (open air from row 8 down to row 11 floor) ---
    bld('building_large',         68, 56, 1680),   // visible behind courtyard space
    bld('building_windows_wide',  43, 28, 1900),   // windows block

    // --- S4 / gate area backdrop (parallax bg handles most of this) ---
    bld('building_large',         68, 56, 2680),   // behind gate building gap

    // --- Rooftop props — lamps and signs placed on tile surfaces ---
    // S1 roof (groundY=320)
    prp('street_lamp',    20, 41,  100, 320),
    prp('street_lamp',    20, 41,  560, 320),
    // S2a roof (groundY=288)
    prp('street_lamp',    20, 41,  840, 288),
    prp('sign_arrow_right', 19, 32, 1095, 288),   // nudge toward S2b gap
    // S2b roof (groundY=256)
    prp('street_lamp',    20, 41, 1500, 256),
    // S4 roof (groundY=224)
    prp('street_lamp',    20, 41, 2200, 224),
    prp('sign_arrow_right', 19, 32, 2500, 224),   // nudge toward platform gap
    // Gate building roof (groundY=192)
    prp('street_lamp',    20, 41, 2800, 192),
    prp('sign_arrow_up',  29, 45, 2960, 192),     // exit direction indicator
    // Exit section (groundY=256)
    prp('street_lamp',    20, 41, 3090, 256),
  ],

  // ── Electrical sources ──────────────────────────────────────────────────────
  // y = row * 32 - 30  (player-top when standing on that rooftop)
  sources: [
    // SRC-A — S1 rooftop, col 5  — near start, easy grab
    { id: 'src_a', x: 160,  y: 290, charge: 3, label: 'SRC-A' },
    // SRC-B — S2b rooftop, col 44 — rewards climbing the step-up
    { id: 'src_b', x: 1408, y: 226, charge: 4, label: 'SRC-B' },
    // SRC-C — courtyard floor, col 56 — requires the drop-and-climb route
    { id: 'src_c', x: 1792, y: 322, charge: 3, label: 'SRC-C' },
    // SRC-D — S4 HVAC peak, col 70 — highest point reward
    { id: 'src_d', x: 2240, y: 162, charge: 5, label: 'SRC-D' },
    // SRC-E — gate building roof, col 90 — before exit gate
    { id: 'src_e', x: 2880, y: 162, charge: 3, label: 'SRC-E' },
  ],

  // ── Power gates ─────────────────────────────────────────────────────────────
  gates: [
    // Mid-gate — courtyard/S4 boundary (col 64, x=2048). Required: 4 charge.
    // SRC-B alone (4) unlocks it; encourages climbing S2b.
    { id: 'gate_mid',  x: 2048, y: 0, w: 14, h: 448, required: 4, label: 'SECTOR GATE' },
    // Exit gate — inside exit section (col 94, x=3008). Required: 6 charge.
    // Needs SRC-D(5)+SRC-E(3) or carried charge from earlier.
    { id: 'gate_exit', x: 3008, y: 0, w: 14, h: 448, required: 6, isExit: true, label: 'EXIT' },
  ],

  switches: [],

  // ── Checkpoints ─────────────────────────────────────────────────────────────
  checkpoints: [
    // CP1 — end of S2a rooftop (col 35, row 9). Respawn before the S2b gap.
    { x: 1120, y: 258 },
    // CP2 — entering S4 after mid-gate (col 66, row 7).
    { x: 2112, y: 194 },
  ],

  // ── Moving platform ──────────────────────────────────────────────────────────
  // Bridges the 4-tile gap (cols 81-84, x 2592-2720) between S4 and gate building.
  // Travels at S4 roof level (y=224). Player rides it then jumps up 1 tile to gate
  // building (row 6, y=192).
  platforms: [
    { x: 2590, y: 224, w: 80, h: 12, x1: 2582, x2: 2610, speed: 55 },
  ],

  // ── Enemies ─────────────────────────────────────────────────────────────────
  enemies: [
    // Drain — patrols S1 rooftop (row 10 surface y=290)
    { type: 'drain', x: 320,  y: 290, patrolLeft:  96,  patrolRight:  640, speed: 58 },
    // Drone — hovers over S2b / mini-tower area
    { type: 'drone', x: 1520, y: 170, patrolLeft: 1200, patrolRight: 1620, speed: 50 },
    // Drain — patrols S4 rooftop (row 7 surface y=194)
    { type: 'drain', x: 2270, y: 194, patrolLeft: 2110, patrolRight: 2500, speed: 68 },
    // Drain — patrols gate building roof (row 6 surface y=162)
    { type: 'drain', x: 2820, y: 162, patrolLeft: 2730, patrolRight: 2970, speed: 65 },
  ],
};
