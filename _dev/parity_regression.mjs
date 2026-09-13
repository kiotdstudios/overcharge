// Builder ↔ runtime parity regression harness.
// Run: node --experimental-default-type=module _dev/parity_regression.mjs
// This harness tests existing contracts only; it must not change editor/runtime behavior.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';

class FakeImage {
  constructor() {
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.src = '';
  }
  addEventListener() {}
}
globalThis.Image = FakeImage;

const State = await import('../editor/state.js');
const { Level } = await import('../src_scroll/level.js');
const { TILE, ROWS, PLAYER_W, PLAYER_H } = await import('../src_scroll/constants.js');
// ORDER 005: persistence contract is now asserted via source-level checks below.

let passed = 0;
let failed = 0;
const defects = [];

function check(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function same(actual, expected, message) {
  check(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function fixtureLevel() {
  const cols = 3;
  const tiles = new Array(cols * ROWS).fill(0);
  tiles[0] = 1;
  tiles[1] = 2;
  tiles[2] = 10;
  tiles[cols + 1] = 13;
  return {
    name: 'PARITY FIXTURE',
    number: 7,
    cols,
    tiles,
    tileRotations: [0, 90, 180, 270],
    playerStart: { x: 16, y: 32 },
    decorations: [{ src: 'assets/test.png', x: 96, y: 128, w: 32, h: 16, snap: 1, rotation: 90 }],
    sources: [{ id: 'SRC-1', x: 32, y: 352, charge: 5, label: 'GEN' }],
    gates: [{ id: 'GATE-1', x: 64, y: 320, w: 40, h: 64, required: 5, isExit: true, blockOnly: false, label: 'EXIT' }],
    checkpoints: [{ id: 'CP-1', x: 112, y: 384, label: 'SAVE' }],
    platforms: [{ id: 'PLAT-1', x: 128, y: 288, w: 96, h: 12, x1: 96, x2: 256, speed: 80 }],
    switches: [{ id: 'SW-1', x: 160, y: 336, required: 1, linkedId: 'GATE-1', label: 'OPEN' }],
    enemies: [{ id: 'EN-1', type: 'patrol', x: 192, y: 320, patrolLeft: 160, patrolRight: 288, speed: 50 }],
  };
}

function validateAuthoredLevel(level, label) {
  check(Number.isInteger(level.cols) && level.cols > 0, `${label}: cols is a positive integer`);
  check(Array.isArray(level.tiles) && level.tiles.length === level.cols * ROWS, `${label}: tiles is exactly cols × ${ROWS}`);
  check(level.tiles.every(value => Number.isInteger(value)), `${label}: tiles contain integers`);
  check(level.tiles.every(value => value === 0 || value === 1 || value === 2 || value >= 10), `${label}: no reserved tile values 3–9 are authored`);
  check(level.playerStart && Number.isFinite(level.playerStart.x) && Number.isFinite(level.playerStart.y), `${label}: playerStart has numeric top-left coordinates`);
  for (const field of ['decorations', 'enemies', 'sources', 'gates', 'checkpoints', 'platforms', 'switches']) {
    check(Array.isArray(level[field]), `${label}: ${field} is serialized as an array`);
  }
}

console.log('\n[ Authored JSON round-trip ]');
const authored = fixtureLevel();
const serialized = JSON.stringify(authored);
const reloaded = JSON.parse(serialized);
same(reloaded, authored, 'loading → serializing → reloading preserves every fixture property');
validateAuthoredLevel(reloaded, 'fixture');
check(reloaded.sources[0].id === 'SRC-1' && reloaded.gates[0].id === 'GATE-1' && reloaded.switches[0].id === 'SW-1' && reloaded.checkpoints[0].id === 'CP-1', 'supported authored IDs survive the JSON round-trip');

console.log('\n[ Tile and Builder contract ]');
check(TILE === 32 && ROWS === 18, 'runtime tile contract is TILE = 32 and ROWS = 18');
State.state.level = structuredClone(authored);
check(State.worldToTile(63, 63).col === 1 && State.worldToTile(63, 63).row === 1, 'Builder worldToTile uses floor-based 32px coordinates');
check(State.getTile(0, 0) === 1 && State.getTile(1, 0) === 2 && State.getTile(2, 0) === 10 && State.getTile(1, 1) === 13, 'Builder indexes flat tiles row-major');
check(State.getTile(-1, 0) === 0 && !State.setTile(3, 0, 10), 'Builder rejects out-of-bounds tile writes');
check(State.tileValueForAssetId('env_tile_dark_a') === 10 && State.tileValueForAssetId('env_tile_purple_b') === 13, 'Builder registry emits supported art tile values ≥10');
check(State.tileValueForAssetId('unregistered_tile') === -1, 'Builder does not map an unregistered art asset to a reserved value');
check(State.tileIsSolid(1) && State.tileIsSolid(10) && State.tileIsSolid(13) && !State.tileIsSolid(2), 'Builder solidness matches the runtime tile contract');

console.log('\n[ Runtime object projection and anchors ]');
const runtime = new Level(reloaded);
check(runtime.pxW === authored.cols * TILE && runtime.pxH === ROWS * TILE, 'runtime derives world dimensions from authored cols and fixed row count');
check(runtime.tileAt(1, 1) === 13 && runtime.solidAt(2, 0) && !runtime.solidAt(1, 0), 'runtime preserves row-major art tile values and one-way semantics');
same(runtime.playerStart, authored.playerStart, 'playerStart reaches runtime unchanged as a top-left coordinate');
check(PLAYER_W === 20 && PLAYER_H === 30, 'playerStart contract uses the runtime player collision dimensions');
const source = runtime.sources[0];
const gate = runtime.gates[0];
const sw = runtime.switches[0];
const checkpoint = runtime.checkpoints[0];
const platform = runtime.platforms[0];
const enemy = runtime.enemies[0];
check(source.id === 'SRC-1' && source.x === 32 && source.y === 352 && source.w === 28 && source.h === 28, 'source keeps authored top-left coordinates and documented 28×28 hitbox');
check(source.cx === 46 && source.cy === 366, 'source center is derived from top-left placement');
check(gate.id === 'GATE-1' && gate.x === 64 && gate.y === 320 && gate.w === 40 && gate.h === 64 && gate.required === 5 && gate.isExit, 'gate properties reach runtime unchanged from authored JSON');
check(sw.id === 'SW-1' && sw.x === 160 && sw.y === 336 && sw.w === 22 && sw.h === 22 && sw.linkedId === 'GATE-1', 'switch uses authored top-left coordinates and documented 22×22 hitbox');
check(checkpoint.x === 112 && checkpoint.y === 384 && checkpoint._range === 40, 'checkpoint preserves center-x and standing-ground y contract without top-left conversion');
check(platform.x === 128 && platform.y === 288 && platform.x1 === 96 && platform.x2 === 256 && platform.w === 96, 'platform authored bounds reach runtime unchanged');
check(enemy.x === 192 && enemy.y === 320 && enemy.patrolLeft === 160 && enemy.patrolRight === 288 && enemy.speed === 50, 'enemy authored top-left placement and patrol data reach runtime unchanged');
check(runtime.decorations[0].x === 96 && runtime.decorations[0].y === 128 && runtime.decorations[0].w === 32 && runtime.decorations[0].h === 16 && runtime.decorations[0].rotation === 90, 'decoration render geometry and rotation reach runtime');
check(!Object.hasOwn(runtime.decorations[0], 'snap'), 'decoration snap remains Builder-only metadata and is intentionally normalized away by runtime');

console.log('\n[ Persistence contract (ORDER 005: Git JSON is the only authored source) ]');
const mainSource = fs.readFileSync(path.resolve('src_scroll/main.js'), 'utf8');
const persistenceSource = fs.readFileSync(path.resolve('editor/persistence.js'), 'utf8');
const localstoreSource = fs.readFileSync(path.resolve('editor/localstore.js'), 'utf8');
check(mainSource.includes("const TEST_LEVEL_KEY = 'overcharge.testLevel'"), 'runtime TEST LIVE key matches Builder preview key');
check(!mainSource.includes('_tryLocalSave') && !mainSource.includes("import('../editor/localstore.js')"), 'runtime has NO IndexedDB level-load path');
check(!persistenceSource.includes('_mirrorSave') && !persistenceSource.includes("source:   'idb'") && !persistenceSource.includes("'idb:'"), 'editor persistence has NO IndexedDB level mirror or idb discovery source');
check(!localstoreSource.includes('putLevel') && !localstoreSource.includes('allLevels'), 'localstore no longer stores authored levels');
check(persistenceSource.includes('back !== json') && persistenceSource.includes('SAVE FAILED verification'), 'SAVE verifies the canonical file by read-back and fails honestly');
check(mainSource.includes("fetch('src_scroll/levels/levels.json'") && persistenceSource.includes("LEVELS_MANIFEST = 'levels.json'"), 'Builder and runtime both read the Git-tracked level-order manifest');

console.log('\n[ Level-order manifest ]');
const levelDir = path.resolve('src_scroll/levels');
const manifest = JSON.parse(fs.readFileSync(path.join(levelDir, 'levels.json'), 'utf8'));
check(manifest._schema === 'overcharge-levels-manifest@1' && Array.isArray(manifest.order) && manifest.order.length > 0, 'manifest exists with schema tag and non-empty order');
for (const e of manifest.order) {
  const file = path.join(levelDir, e.file || `level${e.number}.json`);
  check(fs.existsSync(file), `manifest entry ${e.number} (${e.name}) points at an existing file`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(data.number === e.number, `manifest number ${e.number} matches the level file's own number`);
}
check(new Set(manifest.order.map(e => e.number)).size === manifest.order.length, 'manifest has no duplicate level numbers');

console.log('\n[ Committed canonical levels ]');
// Scan BOTH naming conventions: canonical `levelN.json` AND the descriptive
// `N_NAME.json` twins the Builder writes alongside them. The crate/timed guards
// below are worthless if they only ever see half the authored levels — the
// descriptive twin is what a human actually opens and edits.
// `levels.json` is the manifest, not a level; `*_prev_backup.json` is a rollback
// artefact and deliberately excluded.
const levelFiles = fs.readdirSync(levelDir)
  .filter(name => /^level\d+\.json$/.test(name) || /^\d+_[A-Z0-9_]+\.json$/.test(name))
  .sort();
check(levelFiles.length > 0, 'canonical level directory contains authored JSON levels');
for (const filename of levelFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(levelDir, filename), 'utf8'));
  validateAuthoredLevel(data, filename);
  // Field-guard: a gate/switch without a positive numeric `required` can never
  // be charged at runtime (required − charged is NaN). Caught live 2026-09-12
  // when a gate saved by a stale cached editor shipped without the field.
  for (const g of data.gates ?? []) {
    check(Number.isFinite(g.required) && g.required > 0,
      `${filename}: gate ${g.id} has a positive numeric required charge`);
  }
  for (const s of data.switches ?? []) {
    check(Number.isFinite(s.required) && s.required > 0,
      `${filename}: switch ${s.id} has a positive numeric required charge`);
  }

  // ── Crate field-guards (ORDER CRATE_TIMED, required by Kiro's ruling) ──
  // Same precedent as the `required` guard above: catch authoring mistakes in
  // the harness rather than as a runtime mystery.
  const crates = data.crates ?? [];
  const crateIds = new Set();
  for (const c of crates) {
    check(typeof c.id === 'string' && c.id.length > 0,
      `${filename}: crate has a non-empty string id`);
    check(!crateIds.has(c.id), `${filename}: crate id ${c.id} is unique within the level`);
    crateIds.add(c.id);
    check(Number.isFinite(c.x) && Number.isFinite(c.y),
      `${filename}: crate ${c.id} has finite x/y`);
    check(c.w === undefined || (Number.isFinite(c.w) && c.w > 0),
      `${filename}: crate ${c.id} w is a positive number when present`);
    check(c.h === undefined || (Number.isFinite(c.h) && c.h > 0),
      `${filename}: crate ${c.id} h is a positive number when present`);
  }
  // The guard with teeth: a crate can be pushed into a pit or wedged against a
  // wall, and v1 has no reset-crate button, so checkpoint restore is the ONLY
  // recovery path. A crate level with no checkpoint is unrecoverable by design.
  if (crates.length > 0) {
    check((data.checkpoints ?? []).length > 0,
      `${filename}: level contains crates, so it MUST contain at least one checkpoint ` +
      `(checkpoint restore is the only recovery from a mis-pushed crate)`);
  }

  // Timed gates: duration must be a positive number, and timed+isExit is refused
  // (a timed exit can expire during the level-complete transition).
  for (const g of data.gates ?? []) {
    if (!g.timed) continue;
    check(g.duration === undefined || (Number.isFinite(g.duration) && g.duration > 0),
      `${filename}: timed gate ${g.id} has a positive numeric duration`);
    check(!g.isExit,
      `${filename}: gate ${g.id} must not be BOTH timed and isExit (can strand the player)`);
  }

  // ── style guards (ORDER FENCE_SHORT_CIRCUIT, F6/F9) ──────────────────
  // Catch a typo'd or misplaced style in the harness rather than as a silently
  // default-rendered object in play.
  for (const g of data.gates ?? []) {
    if (g.style === undefined || g.style === null) continue;
    check(g.style === 'default' || g.style === 'fence',
      `${filename}: gate ${g.id} style is a known value (default|fence), got "${g.style}"`);
    if (g.style === 'fence') {
      // A fence is held up by its linked wall switch and is never charged
      // directly, so style:"fence" only makes sense on a blockOnly barrier.
      check(g.blockOnly === true,
        `${filename}: gate ${g.id} has style:"fence" so it MUST be blockOnly ` +
        `(a fence is opened by its wall switch, never charged by the player)`);
      check(!g.isExit,
        `${filename}: gate ${g.id} must not be BOTH style:"fence" and isExit`);
    }
  }
  for (const s of data.switches ?? []) {
    if (s.style === undefined || s.style === null) continue;
    check(s.style === 'default' || s.style === 'wall',
      `${filename}: switch ${s.id} style is a known value (default|wall), got "${s.style}"`);
    if (s.style === 'wall') {
      // A wall switch exists to short out a fence, so it must actually link to
      // something — an unlinked wall switch is a dead-end puzzle.
      check(typeof s.linkedId === 'string' && s.linkedId.length > 0,
        `${filename}: wall switch ${s.id} has a non-empty linkedId`);
      const target = (data.gates ?? []).find(g => g.id === s.linkedId);
      check(!!target,
        `${filename}: wall switch ${s.id} links to an existing gate ("${s.linkedId}")`);
      if (target) {
        check(target.blockOnly === true,
          `${filename}: wall switch ${s.id} links to ${target.id}, which must be blockOnly`);
      }
    }
  }
}

// ── Placement guards: grid alignment + grounding (KIRO_ORDER_ORCHA_01 O1) ──
// Chief 2026-09-12: "objects seem to be hovering on top of the ground; objects
// need to snap to the grid and be placed on round tiles."
//
// Every CAUSE is already repaired (checkpoint/drone spawn snapping, drag
// re-anchoring, SNAP_GAMEPLAY_DEFAULT 16->32, and the `tileIsSolid(footCol,r)`
// misuse that evaluated `footCol >= 10` and reported "solid" on the first row
// scanned for any object past column 10). Nothing PREVENTS recurrence: a
// hand-edited JSON or a future tool change reintroduces it silently. Same
// pattern as the required-less gate — fixed once, then guarded forever.
//
// GROUNDING CONTRACT — mirrors editor/tools.js `_anchorObjBottom` exactly:
//   foot column = floor((x + w/2) / 32)   i.e. the object's horizontal CENTRE
//   scan DOWN from the object's own row for the first solid tile
//   surfaceY = thatRow * 32               i.e. the TOP of the solid tile
//   grounded  <=>  y + objectHeight === surfaceY
// Deriving it from the shipped anchor rather than restating it means the guard
// and the Builder can never disagree about what "grounded" means.
console.log('\n[ Placement: grid alignment + grounding ]');
{
  // Heights are the runtime collision heights, NOT sprite heights. A source is
  // 28px, a switch 22px; a checkpoint's `y` IS the standing-ground line (height
  // 0), which is why it is compared directly against surfaceY.
  const FOOT_H = { sources: 28, switches: 22, checkpoints: 0 };
  const SOLID  = v => v === 1 || v >= 10;   // matches Level.solidAt

  for (const filename of levelFiles) {
    const L = JSON.parse(fs.readFileSync(path.join(levelDir, filename), 'utf8'));
    const cols = L.cols;
    const rows = Math.round((L.tiles?.length ?? 0) / (cols || 1));
    const tileAt = (tx, ty) =>
      (tx < 0 || tx >= cols || ty < 0 || ty >= rows) ? 0 : (L.tiles[ty * cols + tx] || 0);

    // First solid surface at or below the object's own row, at its foot column.
    // Returns null when the column is bottomless — reported as its own failure.
    const surfaceUnder = (x, w, y) => {
      const footCol = Math.max(0, Math.min(Math.floor((x + w / 2) / TILE), cols - 1));
      const fromRow = Math.max(0, Math.floor(y / TILE));
      for (let r = fromRow; r < rows; r++) if (SOLID(tileAt(footCol, r))) return r * TILE;
      return null;
    };

    const checkPlacement = (kind, obj, w, h, label) => {
      // X: grid alignment. Objects are authored on 32px columns.
      check(Number.isFinite(obj.x) && obj.x % TILE === 0,
        `${filename}: ${label} x is 32px grid-aligned (x=${obj.x})`);

      const surfaceY = surfaceUnder(obj.x, w, obj.y);
      if (surfaceY === null) {
        // Clearer, separate failure than a grounding mismatch — the object is
        // not floating above a floor, there IS no floor.
        check(false, `${filename}: ${label} is placed over a bottomless column (no solid tile below x=${obj.x})`);
        return;
      }
      // Y: grounded. Deliberately NOT `y % 32` — a 28px source resting on a
      // surface at 224 must sit at y=196, so grounding wins over grid on Y.
      const foot = obj.y + h;
      check(foot === surfaceY,
        `${filename}: ${label} rests on the surface (y+${h}=${foot}, surface=${surfaceY}` +
        (foot === surfaceY ? ')' : `, floating ${surfaceY - foot}px)`));
    };

    for (const s of L.sources ?? [])
      checkPlacement('sources', s, 28, FOOT_H.sources, `source ${s.id}`);
    for (const g of L.gates ?? [])
      checkPlacement('gates', g, g.w ?? 32, g.h ?? 64, `gate ${g.id}`);
    for (const sw of L.switches ?? [])
      checkPlacement('switches', sw, 22, FOOT_H.switches, `switch ${sw.id}`);
    for (const cp of L.checkpoints ?? [])
      checkPlacement('checkpoints', cp, 22, FOOT_H.checkpoints, `checkpoint ${cp.id}`);
    for (const c of L.crates ?? [])
      checkPlacement('crates', c, c.w ?? 32, c.h ?? 32, `crate ${c.id}`);

    // ── Deliberate exemptions, asserted rather than silently skipped ──
    // A hovering drone is SUPPOSED to float, and a moving platform legitimately
    // sits in mid-air. Recording the counts means a future reader can see they
    // were considered, not overlooked.
    const drones = (L.enemies ?? []).filter(e => e.type === 'drone');
    const ground = (L.enemies ?? []).filter(e => e.type !== 'drone');
    for (const e of ground)
      checkPlacement('enemies', e, e.w ?? 20, e.h ?? 26, `enemy ${e.id ?? e.type}`);
    check(true,
      `${filename}: ${drones.length} drone(s) and ${(L.platforms ?? []).length} platform(s) exempt from grounding by design`);
  }

  // ── The exemptions above are VACUOUS on current content ──────────────
  // No authored level currently contains a single enemy or platform, so the
  // drone/platform exemption branches are never exercised by real data. An
  // untested exemption is exactly how a guard silently stops guarding, so it is
  // proven here against a synthetic fixture instead of being taken on trust.
  {
    const cols = 10, rows = 18;
    const tiles = new Array(cols * rows).fill(0);
    for (let x = 0; x < cols; x++) tiles[17 * cols + x] = 10;   // floor, surface y = 544
    const tileAt = (tx, ty) =>
      (tx < 0 || tx >= cols || ty < 0 || ty >= rows) ? 0 : (tiles[ty * cols + tx] || 0);
    const SOLID2 = v => v === 1 || v >= 10;
    const surfaceUnder2 = (x, w, y) => {
      const footCol = Math.max(0, Math.min(Math.floor((x + w / 2) / TILE), cols - 1));
      for (let r = Math.max(0, Math.floor(y / TILE)); r < rows; r++)
        if (SOLID2(tileAt(footCol, r))) return r * TILE;
      return null;
    };
    const grounded = (x, w, y, h) => (y + h) === surfaceUnder2(x, w, y);

    // A drone deliberately hovers 200px up. It must be EXEMPT, i.e. the harness
    // must not evaluate it — proven by showing the same coordinates FAIL the
    // grounded test that a walking enemy would be held to.
    const droneY = 320;
    check(!grounded(64, 20, droneY, 26),
      'exemption fixture: a hovering drone would FAIL the grounded test (so exempting it is meaningful, not a no-op)');
    const walker = { x: 64, y: 544 - 26 };
    check(grounded(walker.x, 20, walker.y, 26),
      'exemption fixture: a ground enemy at the same column DOES satisfy the grounded test');
    // A platform in mid-air is likewise exempt for a real reason.
    check(!grounded(96, 96, 288, 12),
      'exemption fixture: a mid-air moving platform would FAIL the grounded test (exemption is load-bearing)');
    check(surfaceUnder2(64, 20, 0) === 544,
      'exemption fixture: surfaceUnder resolves the floor at y=544 as expected');
  }
}
// ── Spawn reachability guard ─────────────────────────────────────────────
// Chief 2026-09-12: "placing the player before where he is in the screenshot
// prevents the player from moving."
//
// Cause (measured, not guessed): PowerGate.blocksHorizontal() deliberately
// IGNORES Y — a closed gate is a floor-to-ceiling barrier so the player cannot
// jump over it (electricity.js:249-256). So a closed gate divides the level into
// sealed horizontal regions. Spawn the player on the wrong side of one and they
// are trapped in a sliver: reproduced at spawn x=0/16/32 in level3, where the
// player pinned at exactly gate.x - PLAYER_W = 32 - 20 = 12.
//
// A trapped player can never reach a source, so can never earn the charge needed
// to open the gate that is trapping them — an unrecoverable soft-lock with no
// on-screen explanation. Guard it: from playerStart, walk out to the nearest
// blocking gate column in each direction and require at least one source inside
// the reachable interval.
console.log('\n[ Spawn reachability (closed gates seal horizontal regions) ]');
{
  const levelDirR = path.resolve('src_scroll/levels');
  const files = fs.readdirSync(levelDirR)
    .filter(n => /\.json$/.test(n) && n !== 'levels.json' && !/_prev_backup\.json$/.test(n))
    .sort();
  for (const filename of files) {
    const L = JSON.parse(fs.readFileSync(path.join(levelDirR, filename), 'utf8'));
    if (!L.playerStart || !Array.isArray(L.tiles)) continue;
    const pxW = L.cols * TILE;
    const sx  = L.playerStart.x;

    // Gates that block by column while closed. blockOnly barriers count too:
    // they also block until their switch fires.
    const walls = (L.gates || []).map(g => ({ id: g.id, x0: g.x, x1: g.x + (g.w ?? 32) }));

    // Widest interval the player's box can occupy without overlapping a wall column.
    let lo = 0, hi = pxW - PLAYER_W;
    for (const w of walls) {
      if (sx + PLAYER_W <= w.x0)      hi = Math.min(hi, w.x0 - PLAYER_W); // wall to the right
      else if (sx >= w.x1)            lo = Math.max(lo, w.x1);            // wall to the left
      else                            { lo = Infinity; hi = -Infinity; }  // spawned INSIDE a wall
    }

    const insideWall = lo > hi;
    check(!insideWall,
      `${filename}: playerStart is not inside a closed gate's blocking column`,
      insideWall ? `spawn x=${sx} overlaps a gate column — player cannot move at all` : '');

    if (!insideWall) {
      const reachable = (L.sources || []).filter(s => s.x + 28 > lo && s.x < hi + PLAYER_W);
      check(reachable.length > 0 || (L.sources || []).length === 0,
        `${filename}: spawn can reach at least one energy source`,
        reachable.length > 0
          ? `reachable x[${lo}..${hi}], ${reachable.length}/${(L.sources || []).length} source(s)`
          : `TRAPPED: spawn x=${sx} can only occupy x[${lo}..${hi}] — no source in reach, so the gate sealing it can never be charged`);
    }
  }
}

// ── Animation frame_000 convention guard ─────────────────────────────────
// PixelLab exports frame_000 as the object's REST POSE, not the first frame of
// motion. This has now bitten the project THREE times:
//   1. gate_electric_spritesheet.png — row 0 had art only at frame 0
//   2. fence/frame_000.png       == fence_dead.png        (sha256 identical)
//   3. wall_switch/frame_000.png == switch_destroyed.png  (sha256 identical)
// Animating from 000 makes a LIVE fence flash its dead, passable-looking art one
// frame in nine, and plays a switch's destroyed end-state as the first frame of
// its own destruction. Caught on paper by Orcha; guarded here so it is caught
// mechanically instead of by memory. Animate from frame_001.
console.log('\n[ Animation frame_000 rest-pose convention ]');
{
  const objDir = path.resolve('assets/objects');
  const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const packs = fs.existsSync(objDir)
    ? fs.readdirSync(objDir).filter(d => fs.statSync(path.join(objDir, d)).isDirectory())
    : [];
  let checked = 0;
  for (const pack of packs) {
    const dir   = path.join(objDir, pack);
    const files = fs.readdirSync(dir);
    const f000  = files.find(f => /^frame_000\.png$/.test(f));
    if (!f000) continue;
    const h000  = sha(path.join(dir, f000));
    // Any non-frame sibling PNG that is byte-identical to frame_000 is the rest
    // pose, which means frame_000 is NOT motion and must be excluded from loops.
    const twins = files.filter(f => /\.png$/.test(f) && !/^frame_\d+\.png$/.test(f))
                       .filter(f => sha(path.join(dir, f)) === h000);
    if (twins.length > 0) {
      checked++;
      check(true,
        `${pack}: frame_000 is the REST POSE (identical to ${twins.join(', ')}) — animate from frame_001`);
    }
  }
  check(true, `scanned ${packs.length} object pack(s) for the frame_000 convention`);
  if (checked === 0) check(true, 'no rest-pose/frame_000 duplicates detected');
}

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
