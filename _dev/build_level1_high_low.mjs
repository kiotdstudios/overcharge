// Build a disposable high/low Level 1 variant from the current campaign JSON.
// Never writes src_scroll/levels/level1.json or the level order manifest.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = 'src_scroll/levels/level1.json';
const target = 'previews/level1-high-low.json';
const level = JSON.parse(fs.readFileSync(source, 'utf8'));
const originalGate = JSON.stringify(level.gates);
const originalSources = JSON.stringify(level.sources);
const originalSpawn = JSON.stringify(level.playerStart);
assert.equal(level.cols, 100, 'review the route against a changed Level 1 width');
assert.equal(level.tiles.length / level.cols, 18, 'review the route against a changed Level 1 height');
assert.equal(level.gates.find(g => g.isExit)?.x, 1984);
assert.equal(level.gates.find(g => g.isExit)?.y, 256);

// The first gap is a genuine fork: jump from the left roof to this two-tile
// catwalk for the high route, or run off the edge to the lower roof.
// The lower return uses two generous 64px climbs before the existing gate roof.
const ledges = [
  { row: 11, first: 47, last: 48, id: 'high_entry' },
  { row: 14, first: 54, last: 56, id: 'low_return_1' },
  { row: 12, first: 58, last: 60, id: 'low_return_2' },
];
const art = [
  'assets/tilesets/blue_rooftop/tiles/bt_bldg_r02_c01.png',
  'assets/tilesets/blue_rooftop/tiles/bt_bldg_r02_c02.png',
  'assets/tilesets/blue_rooftop/tiles/bt_bldg_r04_c13.png',
];
for (const { row, first, last, id } of ledges) {
  for (let col = first; col <= last; col++) {
    const index = row * level.cols + col;
    assert.equal(level.tiles[index], 0, `ledge ${id} must not replace authored terrain`);
    level.tiles[index] = 2; // one-way landing, no horizontal wall
    const offset = col - first;
    const src = art[offset === 0 ? 0 : col === last ? 2 : 1];
    level.decorations.push({ id: `route_${id}_${col}`, src,
      x: col * 32, y: row * 32, w: 32, h: 32, snap: 32 });
  }
}

assert.equal(JSON.stringify(level.gates), originalGate);
assert.equal(JSON.stringify(level.sources), originalSources);
assert.equal(JSON.stringify(level.playerStart), originalSpawn);
fs.mkdirSync('previews', { recursive: true });
fs.writeFileSync(target, JSON.stringify(level, null, 2) + '\n');
console.log(`${target}: ${level.cols} x ${level.tiles.length / level.cols}, ${ledges.length} one-way ledges`);
