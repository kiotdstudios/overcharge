import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Player, Level, held, step } from './support/headless.mjs';
const def = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
let checks = 0;
function check(ok, message) { assert.ok(ok, message); checks++; }
function move(level, x, y, direction) {
  const player = new Player(x, y);
  player.grounded = true;
  held([direction > 0 ? 'ArrowRight' : 'ArrowLeft']);
  for (let i = 0; i < 90; i++) step(player, level);
  held([]);
  return player;
}
const level = new Level({ ...def, gates: [], enemies: [] });
const blocked = move(level, 49 * 32 - 42, 512 - 30, 1);
check(blocked.x + blocked.w <= 49 * 32, 'lower path cannot enter solid building');
check(blocked.y + blocked.h === 512, 'blocked player remains on lower rooftop');
const roof = move(level, 50 * 32, 320 - 30, 1);
check(roof.x > 50 * 32 + 80, 'player walks across upper rooftop');
check(roof.y + roof.h === 320, 'player stands on visible rooftop surface');
for (let tile = 24; tile <= 59; tile++) {
  const tiles = new Array(8 * 18).fill(0);
  for (let col = 0; col < 8; col++) tiles[16 * 8 + col] = 16;
  tiles[15 * 8 + 4] = tile;
  const rig = new Level({ cols: 8, tiles });
  const right = move(rig, 4 * 32 - 42, 512 - 30, 1);
  const left = move(rig, 5 * 32 + 10, 512 - 30, -1);
  check(right.x + right.w <= 128, `tile ${tile} blocks entry from left`);
  check(left.x >= 160, `tile ${tile} blocks entry from right`);
}
console.log(`RESULTS: ${checks} passed, 0 failed`);
