import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Player, Level, held, step } from './support/headless.mjs';

const base = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
const route = JSON.parse(fs.readFileSync('previews/level1-high-low.json', 'utf8'));
assert.deepEqual(route.gates, base.gates, 'gate and charge rule unchanged');
assert.deepEqual(route.sources, base.sources, 'source economy unchanged');
assert.deepEqual(route.playerStart, base.playerStart, 'spawn unchanged');
assert.equal(route.tiles.length, base.tiles.length, 'no level resize');

const level = new Level({ ...route, enemies: [] });
for (const [row, first, last] of [[11,47,48],[14,54,56],[12,58,60]]) {
  for (let col = first; col <= last; col++) {
    assert.equal(level.tileAt(col,row), 2);
    assert.equal(level.tileBlocksX(col,row), false, 'one-way ledge cannot form a wall');
  }
}

// Lower choice: leave the upper roof without jumping and pass beneath all
// added ledges and the existing gate-roof facade.
const low = new Player(45 * 32, 352 - 30);
low.grounded = true;
held(['ArrowRight']);
for (let i = 0; i < 450; i++) step(low, level);
held([]);
assert.ok(low.x > 62 * 32, `lower passage reaches gate area (x=${low.x})`);
assert.equal(low.y + low.h, 512, 'lower roof supports player');
assert.equal(level.complete, false, 'passing under uncharged gate does not complete level');

function jump(player, keys, frames) {
  held([...keys, 'ArrowUp']); step(player, level);
  held(keys); for (let i = 1; i < frames; i++) step(player, level);
  held([]);
}

// Upper choice: a sprint jump over the one-tile split lands on a supported
// catwalk; a second jump reaches the gate roof.
const high = new Player(45 * 32, 352 - 30);
high.grounded = true;
held(['ArrowRight','ShiftLeft','ArrowUp']); step(high, level);
held(['ArrowRight','ShiftLeft']); for (let i = 1; i < 38; i++) step(high, level);
held([]); for (let i = 0; i < 40; i++) step(high, level);
assert.ok(high.x >= 47 * 32 && high.x < 49 * 32, `upper catwalk reached (x=${high.x})`);
assert.equal(high.y + high.h, 352, 'upper catwalk landing');
jump(high, ['ArrowRight'], 60);
assert.ok(high.x >= 49 * 32, 'upper roof reached');
assert.equal(high.y + high.h, 320, 'upper gate roof landing');

// Lower return: two 64px climbs, then the same existing gate roof.
const returning = new Player(55 * 32, 512 - 30);
returning.grounded = true;
jump(returning, [], 62);
assert.equal(returning.y + returning.h, 448, 'first low-return ledge');
held(['ArrowRight']); for (let i = 0; i < 26; i++) step(returning, level);
held([]);
jump(returning, ['ArrowRight','ShiftLeft'], 45);
assert.ok(returning.x >= 58 * 32, 'second low-return ledge reached');
assert.equal(returning.y + returning.h, 384, 'second low-return ledge landing');
jump(returning, [], 55);
assert.equal(returning.y + returning.h, 320, 'return reaches gate roof');

console.log('PASS: upper choice, lower passage, two-step return, gate and source preservation');
