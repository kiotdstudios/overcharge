// Level 1 — "NEON DISTRICT"
// 100 cols × 14 rows = 3200 × 448px
// Purple city backdrop: buildings behind, purple tile ground, neon platform ledges.
// Path: 5 sources, 2 gates (mid + exit), 2 checkpoints.

// ── Building helper ───────────────────────────────────────────────────────────
// All source images are extracted 16×16 px tiles drawn at 2× in-engine.
// Buildings are larger sprites. Scale factor 3 gives imposing city scale.
// y = 384 − (srcH × scale) so the bottom sits flush on the ground line.
const BASE = 'assets/tilesets/purple_city';
const S3   = 3;  // building scale
const S2   = 2;  // prop scale

function bld(file, srcW, srcH, x) {
  return { src: `${BASE}/buildings/${file}.png`, x, y: 384 - srcH * S3, w: srcW * S3, h: srcH * S3 };
}
function prp(file, srcW, srcH, x, groundY = 384) {
  return { src: `${BASE}/props/${file}.png`, x, y: groundY - srcH * S2, w: srcW * S2, h: srcH * S2 };
}

export const LEVEL1 = {
  name:   'NEON DISTRICT',
  number: 1,
  cols:   100,

  tiles: [
    // Row  0  — ceiling
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    // Row  1
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row  2
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row  3
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row  4
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row  5
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row  6
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row  7  — high rooftop platforms (P14)
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,0,
    // Row  8  — rooftop level (P5, P9, P11)
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row  9  — mid elevation (P2, P7, P12, P13)
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,2,2,2,2,2,2,0,0,0,0,0,0,0,
    // Row 10  — low platforms (P1, P3, P4, P6, P8, P10)
    0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,2,2,2,2,2,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row 11
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    // Row 12  — ground (gaps at 22-23, 44-47, 67-69, 84-86)
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,
    // Row 13  — ground (same gaps)
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,
  ],

  playerStart: { x: 48, y: 354 },

  // ── Background decorations ─────────────────────────────────────────────────
  // Buildings sit flush on the ground line (y=384). Scale 3× for city presence.
  // Order: painted back-to-front so foreground buildings overlap background ones.
  decorations: [
    // Section 1 — City Entry (x 0–800)
    bld('building_striped_tall',  49, 60,   20),   // left anchor building
    bld('building_large',         68, 56,  210),   // wide backdrop
    bld('building_neon_door',     52, 53,  450),   // neon door mid-block
    bld('building_wide',          66, 40,  640),   // wide low building
    prp('street_lamp',            20, 41,   80),   // lamp near start
    prp('street_lamp',            20, 41,  520),   // lamp mid-section

    // Section 2 — Downtown Block (x 800–1600)
    bld('building_teal_sign',     31, 40,  800),
    bld('building_small_a',       34, 31,  950),
    bld('building_neon_panel',    28, 51, 1100),   // tall thin neon panel
    bld('building_large',         68, 56, 1280),
    bld('building_bar_sign',      20, 33, 1510),   // BAR sign building
    prp('street_lamp',            20, 41,  860),
    prp('street_lamp',            20, 41, 1450),

    // Section 3 — Gate District (x 1600–2240)
    bld('building_windows_wide',  43, 28, 1650),
    bld('building_striped_tall',  49, 60, 1820),
    bld('building_wide',          66, 40, 2020),
    prp('street_lamp',            20, 41, 1740),
    prp('sign_arrow_right',       19, 32, 1990, 356),  // directional sign mid-height

    // Section 4 — Second District (x 2240–3200)
    bld('building_neon_door',     52, 53, 2260),
    bld('building_brick_windows', 43, 26, 2480),
    bld('building_large',         68, 56, 2640),
    bld('building_teal_sign',     31, 40, 2870),
    bld('building_striped_tall',  49, 60, 3010),
    prp('street_lamp',            20, 41, 2200),
    prp('street_lamp',            20, 41, 2760),
    prp('sign_arrow_up',          29, 45, 3120, 339),  // exit direction sign
  ],

  // ── Sources ────────────────────────────────────────────────────────────────
  sources: [
    // SRC-A — near start, ground level (col 9)
    { id: 'src_a', x: 288, y: 356, charge: 3, label: 'SRC-A' },
    // SRC-B — on P2 platform (row 9, col 19) — rewards first hop
    { id: 'src_b', x: 608, y: 256, charge: 4, label: 'SRC-B' },
    // SRC-C — rooftop P5 (row 8, col 39) — requires two hops up
    { id: 'src_c', x: 1248, y: 228, charge: 3, label: 'SRC-C' },
    // SRC-D — mid run P7 (row 9, col 53)
    { id: 'src_d', x: 1696, y: 260, charge: 3, label: 'SRC-D' },
    // SRC-E — elevated P11 (row 8, col 79)
    { id: 'src_e', x: 2528, y: 228, charge: 4, label: 'SRC-E' },
  ],

  // ── Gates ──────────────────────────────────────────────────────────────────
  gates: [
    // Mid-gate — col 64 (x=2048), 4 charge required
    { id: 'gate_mid',  x: 2048, y: 0, w: 14, h: 384, required: 4, label: 'MID GATE' },
    // Exit gate — col 89 (x=2848), 6 charge required
    { id: 'gate_exit', x: 2848, y: 0, w: 14, h: 384, required: 6, isExit: true, label: 'EXIT' },
  ],

  switches: [],

  // ── Checkpoints ────────────────────────────────────────────────────────────
  checkpoints: [
    { x: 768,  y: 354 },   // CP1 — after gap1, col 24
    { x: 2176, y: 354 },   // CP2 — after mid-gate, col 68
  ],

  // ── Moving platform ────────────────────────────────────────────────────────
  // Bridges pit 2 (cols 44–47, x=1408–1536)
  platforms: [
    { x: 1376, y: 340, w: 96, h: 12, x1: 1330, x2: 1570, speed: 60 },
  ],

  // ── Enemies ────────────────────────────────────────────────────────────────
  enemies: [
    // Drain — patrols entry street
    { type: 'drain',  x: 384, y: 356, patrolLeft: 288,  patrolRight: 640,  speed: 60 },
    // Drone — hovers over rooftop zone above P5 (catches players ignoring height)
    { type: 'drone',  x: 1184, y: 190, patrolLeft: 1000, patrolRight: 1450, speed: 55 },
    // Drain — second district
    { type: 'drain',  x: 2336, y: 356, patrolLeft: 2240, patrolRight: 2560, speed: 70 },
    // Patrol — final run, pushes player toward exit
    { type: 'drain',  x: 2976, y: 356, patrolLeft: 2880, patrolRight: 3072, speed: 75 },
  ],
};
