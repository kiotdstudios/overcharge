import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Player, Level, held, step } from './support/headless.mjs';
const def = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
let checks = 0;
function check(ok, message) { assert.ok(ok, message); checks++; }
function move(level, x, y, direction, frames = 90) {
  const player = new Player(x, y);
  player.grounded = true;
  held([direction > 0 ? 'ArrowRight' : 'ArrowLeft']);
  for (let i = 0; i < frames; i++) step(player, level);
  held([]);
  return player;
}
const level = new Level({ ...def, gates: [], enemies: [] });
const crossing = move(level, 48 * 32, 512 - 30, 1, 460);
check(crossing.x > 65 * 32, 'player crosses whole background building along lower rooftop');
check(crossing.y + crossing.h === 512, 'feet remain on visible lower rooftop throughout crossing');
for (let y = 10; y < 16; y++) for (let x = 49; x <= 65; x++) {
  check(!level.solidAt(x, y), 'background building has no invisible floors or walls');
  check(def.decorations.some(d => d.id === `bg_exit_building_${x}_${y}` && fs.existsSync(d.src)), 'original art remains as background decoration');
}
const gate = level.gates; // terrain-only rig intentionally excludes gates
const exit = def.gates.find(g => g.isExit);
check(exit.x === 1984 && exit.y === 256, 'exit remains at Chief original authored position');
const gatedLevel = new Level({ ...def, enemies: [] });
const stopped = move(gatedLevel, 48 * 32, 482, 1, 460);
check(stopped.x > exit.x + exit.w && !gatedLevel.complete, 'uncharged elevated exit permits exploration below without completion');
gatedLevel.gates.find(g => g.isExit).open = true;
const through = move(gatedLevel, exit.x - 42, 482, 1);
check(through.x > exit.x + exit.w, 'opened exit allows lower-rooftop traversal');
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
