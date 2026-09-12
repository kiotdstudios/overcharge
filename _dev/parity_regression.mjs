// Builder ↔ runtime parity regression harness.
// Run: node --experimental-default-type=module _dev/parity_regression.mjs
// This harness tests existing contracts only; it must not change editor/runtime behavior.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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
}

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
