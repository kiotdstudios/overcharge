import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Player, Level, held, step } from './support/headless.mjs';

const def = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
let checks = 0;
function walk(map, col, direction) {
  // Isolate terrain traversal from the exit's deliberate route barrier.
  const level = new Level({ ...map, gates: [], enemies: [] });
  const player = new Player(direction > 0 ? col * 32 - 42 : (col + 1) * 32 + 10, 16 * 32 - 30);
  player.grounded = true;
  held([direction > 0 ? 'ArrowRight' : 'ArrowLeft']);
  for (let i = 0; i < 90; i++) step(player, level);
  held([]);
  return player;
}
for (const col of [49]) {
  for (const direction of [1, -1]) {
    const p = walk(def, col, direction);
    assert.ok(direction > 0 ? p.x > (col + 1) * 32 : p.x + p.w < col * 32,
      `lower rooftop crosses building edge ${col} direction ${direction}`);
    assert.equal(p.y + p.h, 512, 'feet remain on lower rooftop');
    checks += 2;
  }
  const original = structuredClone(def);
  original.tiles[15 * original.cols + col] = col === 49 ? 27 : 38;
  assert.ok(walk(original, col, 1).x < col * 32, 'original side wall reproduces blocker');
  checks++;
}
const level = new Level(def);
assert.ok(level.tileBlocksX(49, 14, 15), 'upper building side remains solid');
assert.ok(level.tileBlocksX(65, 14, 15), 'upper right wall remains solid');
checks += 2;
console.log(`RESULTS: ${checks} passed, 0 failed`);
