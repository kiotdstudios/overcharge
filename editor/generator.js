// generator.js — rule-based Purple City rooftop-layout idea generator.
//
// Non-destructive: builds an in-memory level object; caller (main.js) hands
// it to persistence.loadInMemoryLevel() which replaces the canvas contents.
// Chief can then SAVE AS, tweak, or regenerate.
//
// Architecture:
//   1. seeded RNG (mulberry32) — same seed + same options → same layout
//   2. classifyAssets(manifest) — infers generationRole/tags from category
//                                 today; will silently prefer explicit
//                                 asset.generationRole / asset.tags fields
//                                 when Aki adds them (Path Z pattern).
//   3. Five-stage build per Chief spec:
//        1. TRAVERSAL SKELETON — pick reachable rooftop segments L→R
//        2. BUILDING MASSES     — tile-fill columns + Purple City deco
//        3. CONNECTIVE TERRAIN  — platforms bridging gaps as needed
//        4. PROP DRESSING       — rooftop props on wide surfaces
//        5. GAMEPLAY MARKERS    — spawn, exit gate, source, checkpoint
//   4. validation — regenerate internally on invalid layouts
//   5. name — themed OVERCHARGE-style, deterministic from seed
//
// Everything Chief-tunable lives in one const block at the top so future
// swap-ins (real controller measurements, style presets) is one edit.

import { state, TILE_SIZE, getCachedImage, decoDimensions } from './state.js';

// ── Playability constants (grounded in src_scroll/constants.js physics) ──
// GRAVITY=900, PLAYER_SPEED=75, JUMP_FORCE=-430, RUN_MULTIPLIER=1.7
// Peak jump ≈ 103 px = 3.2 tiles; running gap ≈ 122 px = 3.8 tiles.
// Keep safety margins so generation always lands within reach.
export const PLAY = {
  MAX_HORIZONTAL_GAP_TILES: 3,   // hard cap; 4 is math-possible but tight
  MAX_JUMP_UP_TILES:        3,   // 3 * 32 = 96 px < 103 peak
  MAX_SAFE_DROP_TILES:      6,   // playable drop before losing sightline
  MIN_ROOFTOP_WIDTH_TILES:  2,   // 2 tiles = 64 px = enough to land + turn
  MIN_CLEARANCE_ABOVE:      3,   // clear headroom above every rooftop
};

// ── Options → dimension mapping (soft knobs; tune freely) ────────────────
const LENGTH_COLS  = { Short: 60,  Medium: 100, Long: 160 };
const COMPLEXITY_N = { Simple: { minSections: 4, maxSections: 6 },
                       Moderate: { minSections: 6, maxSections: 10 },
                       Complex:  { minSections: 8, maxSections: 14 } };
const STYLE_KNOBS  = {
  Balanced:    { heightSpread: [3, 8], gapChance: 0.35, platformChance: 0.30 },
  Rooftops:    { heightSpread: [2, 6], gapChance: 0.50, platformChance: 0.15 },
  Vertical:    { heightSpread: [4, 10], gapChance: 0.20, platformChance: 0.50 },
  'Dense City':{ heightSpread: [4, 9], gapChance: 0.20, platformChance: 0.25 },
  'Sparse / Open': { heightSpread: [2, 5], gapChance: 0.60, platformChance: 0.10 },
};

const ROWS      = 14;               // level height in tiles (matches level1)
const GROUND_ROW = ROWS - 1;         // solid ground reserved for spawn/exit fallback

// ── Seeded RNG (mulberry32 — small, fast, well-distributed) ──────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeSeed() { return Math.floor(Math.random() * 1e7); }
const randInt   = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pickFrom  = (rng, arr)      => arr[Math.floor(rng() * arr.length)] ?? null;
const chance    = (rng, p)        => rng() < p;

// ── Level name generator (deterministic from seed) ───────────────────────
// Word pools chosen to reproduce Chief-approved style examples:
// NEON DISTRICT, SPLIT DECISION, VOLTAGE ALLEY, MIDNIGHT CIRCUIT, DEAD GRID,
// PURPLE HAZE, HIGH VOLTAGE, BLACKOUT BLOCK, STATIC HEIGHTS, NEON DESCENT.
const NAME_ADJ = [
  'NEON', 'MIDNIGHT', 'DEAD', 'HIGH', 'STATIC', 'PURPLE', 'BLACKOUT',
  'ELECTRIC', 'VOLTAIC', 'LOST', 'BROKEN', 'SILENT', 'BURNING', 'FROZEN',
  'DIM', 'LIVE', 'WIRED', 'SHATTERED', 'CROWNED', 'HOLLOW', 'VIOLET',
  'CRIMSON', 'IRON', 'ARC', 'CIRCUIT', 'HALFLIT', 'FLICKER',
];
const NAME_LOC = [
  'DISTRICT', 'ALLEY', 'HEIGHTS', 'DESCENT', 'CIRCUIT', 'BLOCK', 'GRID',
  'SECTOR', 'ZONE', 'TOWERS', 'SPIRE', 'DEPOT', 'DOCKS', 'JUNCTION',
  'TERRACE', 'ROOFS', 'CORRIDOR', 'YARD', 'LOOP', 'HAZE', 'VOLTAGE',
  'DECISION', 'CROSSING', 'SIGNAL',
];
export function generateName(rng) {
  return `${pickFrom(rng, NAME_ADJ)} ${pickFrom(rng, NAME_LOC)}`;
}

// ── Manifest asset classification (Path Z inference layer) ───────────────
// Reads Aki's contract from a.generation:
//   eligible: bool          — false = skip entirely
//   roles:    string[]      — [decorative, structural, rooftop, small, walkable,
//                              grounded, large, background]
//   surface:  string        — [rooftop, ground_level, wall_face, floating,
//                              background, grid]
//   layer:    string        — [foreground, midground, background]
//   density:  string        — [anchor, dense, medium, sparse]
//   stackable: bool
// Falls back to category inference for legacy entries lacking generation.
export function classifyAssets(manifest) {
  const out = { building: [], wall: [], platform: [], prop: [], electrical: [] };
  if (!manifest || !Array.isArray(manifest.items)) return out;
  for (const a of manifest.items) {
    if (!a) continue;
    // Skip animated sprites — they're never scattered as decoration.
    // Gameplay electrical items pass through even if animated (generator anim).
    const g = a.generation || null;

    // (1) Explicit Aki gate: eligible=false means DO NOT USE.
    if (g && g.eligible === false) continue;

    // (2) Never-scatter categories regardless of eligible flag.
    if (a.category === 'tileset' || a.category === 'tile' ||
        a.category === 'terrain' || a.category === 'background' ||
        a.category === 'player'  || a.category === 'sprite') continue;
    if (a.category === 'enemy') continue;   // enemies come from a different pass

    // (3) Route by Aki metadata first, category second.
    const pool = _poolFor(a, g);
    if (pool && out[pool]) out[pool].push(a);
  }
  return out;
}

// Return the target pool name (or null to skip). Consults Aki's generation
// contract if present, else falls back to category inference.
function _poolFor(a, g) {
  const roles = (g && Array.isArray(g.roles)) ? g.roles : [];
  const surface = g && g.surface;
  const cat = a.category || '';
  const p = a.path || '';

  // Puzzle-critical: electrical is ALWAYS routed to the electrical pass,
  // never scattered as decoration — regardless of any decorative role tags.
  if (cat === 'electrical' || /generator|switch|source|gate/i.test(a.id || '')) {
    return 'electrical';
  }

  // Walls stay their own pool (used for wall category).
  if (cat === 'wall' || /\/walls\//.test(p)) return 'wall';

  // Aki-role driven routing.
  if (roles.includes('structural') && roles.includes('grounded'))  return 'building';
  if (roles.includes('structural') && roles.includes('large'))     return 'building';
  if (roles.includes('walkable'))                                  return 'platform';

  // Aki rooftop props: any decorative with surface=rooftop OR
  // roles containing 'rooftop' feeds Stage 4 prop-dressing. This is where
  // Batch 1 rooftop_ac_unit, rooftop_vent_unit, antenna_tall, etc. land.
  if (surface === 'rooftop' || roles.includes('rooftop')) return 'prop';

  // Legacy category inference (Batch 0 entries without generation metadata).
  if (cat === 'building' || /\/buildings\//.test(p)) return 'building';
  if (cat === 'platform' || /\/platforms\//.test(p)) return 'platform';
  if (cat === 'prop' || cat === 'container' || cat === 'rooftop' ||
      /\/props\//.test(p) || /\/containers\//.test(p) || /\/rooftop\//.test(p)) return 'prop';

  // Defensive size cap — anything oversized is almost certainly a sheet.
  if ((a.width && a.width > 200) || (a.height && a.height > 200)) return null;

  return null;   // unknown → skip
}

// ── Public API ───────────────────────────────────────────────────────────
// Returns { level, seed, name, style, complexity, length, retries }
export function generateLevel(opts = {}) {
  const style = opts.style || 'Balanced';
  const length = opts.length || 'Medium';
  const complexity = opts.complexity || 'Moderate';
  const withProps      = opts.props      !== false;
  const withElectrical = opts.electrical !== false;
  const withCheckpoint = opts.checkpoint === true;
  const withEnemies    = opts.enemies    === true;
  const seed = (typeof opts.seed === 'number' && opts.seed > 0) ? opts.seed : makeSeed();

  const classified = classifyAssets(state.manifest);
  const cols  = LENGTH_COLS[length]  ?? 100;
  const knob  = STYLE_KNOBS[style]   ?? STYLE_KNOBS.Balanced;
  const bounds= COMPLEXITY_N[complexity] ?? COMPLEXITY_N.Moderate;

  // Retry loop — validation may reject; we retry with an evolved sub-seed.
  const MAX_TRIES = 8;
  for (let tri = 0; tri < MAX_TRIES; tri++) {
    const rng = mulberry32(seed + tri * 8191);
    const nameRng = mulberry32(seed);   // name always uses the base seed
    const name = generateName(nameRng);

    const level = _buildLevel(rng, {
      cols, knob, bounds,
      withProps, withElectrical, withCheckpoint, withEnemies,
      classified,
    });
    level.name = name;
    level.number = 999;
    level.generated = { seed, style, length, complexity };

    if (_validate(level)) {
      return { level, seed, name, style, complexity, length, retries: tri };
    }
  }
  // If MAX_TRIES exhausts, emit the last attempt anyway — better a rough
  // level than blocking Chief. Failure is unlikely with sane knobs.
  const rng = mulberry32(seed + MAX_TRIES * 8191);
  const level = _buildLevel(rng, {
    cols, knob, bounds,
    withProps, withElectrical, withCheckpoint, withEnemies, classified,
  });
  level.name = generateName(mulberry32(seed));
  level.number = 999;
  level.generated = { seed, style, length, complexity };
  return { level, seed, name: level.name, style, complexity, length, retries: MAX_TRIES };
}

// ── Level construction (five stages, in order) ───────────────────────────
function _buildLevel(rng, ctx) {
  const { cols, knob, bounds, withProps, withElectrical, withCheckpoint, classified } = ctx;
  const tiles = new Array(ROWS * cols).fill(0);
  const decorations = [];
  const sources = [], gates = [], switches = [], checkpoints = [], enemies = [];

  // ── Stage 1: TRAVERSAL SKELETON ────────────────────────────────────────
  // Slice the level width into "sections" separated by traversable gaps.
  // Each section has an integer rooftop row within [minRoof, maxRoof] and
  // consecutive-section heights differ by at most MAX_JUMP_UP_TILES.
  const numSections = randInt(rng, bounds.minSections, bounds.maxSections);
  const [minRoof, maxRoof] = knob.heightSpread;   // world-Y in tiles; larger row = lower elevation? Actually 0=top, ROWS-1=floor. Bigger row = LOWER on screen.

  // Rooftop rows are inverted from human intuition — row 4 is HIGHER than
  // row 8. We interpret heightSpread as "how many tiles up from ground",
  // so translate to actual row indices.
  const toRow = (upFromGround) => GROUND_ROW - upFromGround;

  const sections = [];
  let col = 1;                               // leave a 1-col margin left
  const usableRight = cols - 2;              // 1-col margin right
  let prevUp = randInt(rng, minRoof, maxRoof);

  for (let i = 0; i < numSections; i++) {
    // Section width — bigger when Dense, smaller when Sparse
    const wMin = Math.max(PLAY.MIN_ROOFTOP_WIDTH_TILES, 3);
    const wMax = Math.max(wMin + 1, Math.floor((usableRight - col) / (numSections - i)) + 2);
    const width = randInt(rng, wMin, wMax);
    const startCol = col;
    const endCol   = Math.min(usableRight, startCol + width - 1);
    if (endCol <= startCol) break;

    // Height stays within jump reach of previous section.
    let up;
    if (i === 0) up = prevUp;
    else {
      const [lo, hi] = knob.heightSpread;
      const minAllowed = Math.max(lo, prevUp - PLAY.MAX_SAFE_DROP_TILES);
      const maxAllowed = Math.min(hi, prevUp + PLAY.MAX_JUMP_UP_TILES);
      up = randInt(rng, minAllowed, maxAllowed);
    }
    sections.push({ startCol, endCol, roofRow: toRow(up), up });
    prevUp = up;
    col = endCol + 1;

    // Gap to next section, respecting horizontal reach.
    if (i < numSections - 1 && chance(rng, knob.gapChance)) {
      col += randInt(rng, 1, PLAY.MAX_HORIZONTAL_GAP_TILES);
    } else {
      // Adjacent (no gap) — flush geometry.
    }
    if (col >= usableRight) break;
  }

  // ── Stage 2: BUILDING MASSES ───────────────────────────────────────────
  // Paint solid tiles from each section's rooftop row down to GROUND_ROW.
  // Optionally place a Purple City building decoration behind the mass for
  // visual character (its size doesn't affect collision).
  for (const s of sections) {
    for (let c = s.startCol; c <= s.endCol; c++) {
      for (let r = s.roofRow; r <= GROUND_ROW; r++) {
        tiles[r * cols + c] = 1;
      }
    }
    if (classified.building.length > 0 && chance(rng, 0.75)) {
      const bldg = pickFrom(rng, classified.building);
      if (bldg) {
        const img = getCachedImage(bldg.path);
        const dims = decoDimensions(bldg, img);
        // Center the building decoration horizontally over the rooftop and
        // sit its bottom at ground row. Building sizes are native-px so
        // they may extend above the tile top — fine, adds skyline character.
        const sectionMidX = (s.startCol + s.endCol + 1) / 2 * TILE_SIZE;
        const decX = Math.floor(sectionMidX - dims.w / 2);
        const decY = (GROUND_ROW + 1) * TILE_SIZE - dims.h;
        decorations.push({
          src: bldg.path, x: decX, y: decY, w: dims.w, h: dims.h, snap: 1,
        });
      }
    }
  }

  // ── Stage 3: CONNECTIVE TERRAIN — bridging platforms for wide gaps ─────
  // For every gap between adjacent sections wider than 1 tile OR with a
  // height differential near the jump ceiling, drop a floating platform in
  // the middle at a reachable Y. Uses tile-1 for a solid landing.
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i], b = sections[i + 1];
    const gapWidth = b.startCol - a.endCol - 1;
    if (gapWidth < 1) continue;
    const needBridge = gapWidth > PLAY.MAX_HORIZONTAL_GAP_TILES - 1
                    || chance(rng, knob.platformChance);
    if (!needBridge) continue;
    const bridgeCol = a.endCol + Math.max(1, Math.floor(gapWidth / 2));
    const midUp = Math.min(a.up, b.up) + 1;
    const bridgeRow = toRow(midUp);
    if (bridgeRow >= 0 && bridgeRow < ROWS && bridgeCol > 0 && bridgeCol < cols - 1) {
      tiles[bridgeRow * cols + bridgeCol] = 1;
    }
  }

  // ── Stage 4: PROP DRESSING ─────────────────────────────────────────────
  // Sprinkle rooftop props (street lamp, sign, container) on wide sections.
  // Density scaled by section width; props only where they can "sit" on a
  // rooftop tile. Never in the middle of gaps.
  if (withProps && classified.prop.length > 0) {
    for (const s of sections) {
      const sectionWidth = s.endCol - s.startCol + 1;
      const density = Math.max(0, sectionWidth - 2) * 0.35;   // 0.35 props/tile beyond 2
      const nProps = Math.floor(density) + (chance(rng, density % 1) ? 1 : 0);
      for (let k = 0; k < nProps; k++) {
        const prop = pickFrom(rng, classified.prop);
        if (!prop) continue;
        const img = getCachedImage(prop.path);
        const dims = decoDimensions(prop, img);
        // Sit prop centered horizontally on a random rooftop tile,
        // with bottom flush to rooftop.
        const propCol = randInt(rng, s.startCol, s.endCol);
        const propX = Math.floor(propCol * TILE_SIZE + (TILE_SIZE - dims.w) / 2);
        const propY = s.roofRow * TILE_SIZE - dims.h;
        decorations.push({ src: prop.path, x: propX, y: propY, w: dims.w, h: dims.h, snap: 1 });
      }
    }
  }

  // ── Stage 5: GAMEPLAY MARKERS ──────────────────────────────────────────
  const firstS = sections[0];
  const lastS  = sections[sections.length - 1];
  const spawnX = (firstS.startCol + 0.5) * TILE_SIZE;
  const spawnY = firstS.roofRow * TILE_SIZE - 2;   // player standing atop rooftop
  const playerStart = { x: Math.floor(spawnX), y: Math.floor(spawnY) };

  // Exit gate at the rightmost rooftop, snug to its right edge.
  const exitGate = {
    id: 'exit', isExit: true, label: 'EXIT',
    x: Math.floor((lastS.endCol + 1) * TILE_SIZE - 32),
    y: (lastS.roofRow - 2) * TILE_SIZE,
    w: 32, h: 64,
  };
  gates.push(exitGate);

  // Optional source: place on a mid-level section. Simple always-charged.
  if (withElectrical && sections.length >= 2) {
    const midS = sections[Math.floor(sections.length / 2)];
    sources.push({
      id: 'src_gen',
      x: Math.floor(((midS.startCol + midS.endCol) / 2 + 0.5) * TILE_SIZE),
      y: (midS.roofRow - 1) * TILE_SIZE,
      charge: 5, label: 'GEN',
    });
  }

  // Optional checkpoint at ~66% of the way through.
  if (withCheckpoint && sections.length >= 3) {
    const cpSection = sections[Math.floor(sections.length * 0.66)];
    checkpoints.push({
      id: 'cp1',
      x: Math.floor((cpSection.startCol + 0.5) * TILE_SIZE),
      y: cpSection.roofRow * TILE_SIZE - 2,
    });
  }

  return {
    name: 'GENERATED',
    number: 999,
    cols,
    tiles,
    playerStart,
    decorations,
    sources,
    gates,
    switches,
    checkpoints,
    platforms: [],
    enemies,
  };
}

// ── Validation ───────────────────────────────────────────────────────────
// Basic checks per Chief spec. Returns true if the level is playable.
function _validate(level) {
  const { cols, tiles, playerStart, gates } = level;
  const rows = tiles.length / cols;
  // 1) Spawn has solid ground within 1 tile below spawn position.
  const spawnCol = Math.floor(playerStart.x / TILE_SIZE);
  const spawnRow = Math.floor(playerStart.y / TILE_SIZE);
  let hasGround = false;
  for (let r = spawnRow; r <= Math.min(spawnRow + 2, rows - 1); r++) {
    if (tiles[r * cols + spawnCol] === 1) { hasGround = true; break; }
  }
  if (!hasGround) return false;

  // 2) Exit gate has solid ground within its footprint.
  const exit = gates.find(g => g.isExit);
  if (!exit) return false;
  const exCol = Math.floor((exit.x + exit.w / 2) / TILE_SIZE);
  const exRow = Math.floor((exit.y + exit.h) / TILE_SIZE);
  let exitGround = false;
  for (let r = exRow; r <= Math.min(exRow + 2, rows - 1); r++) {
    if (tiles[r * cols + exCol] === 1) { exitGround = true; break; }
  }
  if (!exitGround) return false;

  // 3) At least one tile placed (sanity).
  let anyTile = false;
  for (let i = 0; i < tiles.length; i++) if (tiles[i] !== 0) { anyTile = true; break; }
  if (!anyTile) return false;

  // 4) Level bounds respected — spawn and exit are inside [0, cols·32) × [0, ROWS·32)
  if (playerStart.x < 0 || playerStart.x >= cols * TILE_SIZE) return false;
  if (exit.x < 0 || exit.x + exit.w > cols * TILE_SIZE) return false;

  return true;
}
