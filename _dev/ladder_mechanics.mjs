import { Player, Level, held, step } from './support/headless.mjs';
import { CLIMBABLE_LADDER_SRC } from '../src_scroll/level.js';

const cols = 20, rows = 18, tile = 32;
const tiles = Array(cols * rows).fill(0);
for (let y = 14; y < rows; y++) for (let x = 0; x < cols; x++) tiles[y * cols + x] = 16;
for (let x = 4; x <= 9; x++) tiles[8 * cols + x] = 2;
const ladder = { src: CLIMBABLE_LADDER_SRC, x: 6 * tile, y: 8 * tile, w: 32, h: 6 * tile };
const level = new Level({ cols, tiles, decorations: [ladder], playerStart: { x: 6 * tile, y: 14 * tile - 30 } });
const player = new Player(6 * tile, 14 * tile - 30);
player.grounded = true;
const ok = (condition, message) => { if (!condition) throw new Error(message); console.log('✓ ' + message); };

ok(level.ladders.length === 1, 'placed Night City ladder creates one climbable volume');
held(['ArrowUp']);
for (let i = 0; i < 140; i++) step(player, level);
held([]);
ok(Math.abs(player.y + player.h - ladder.y) < 1, 'Up climbs to the upper roof');
ok(player.grounded, 'player can step off the upper end');
held(['ArrowDown']);
for (let i = 0; i < 140; i++) step(player, level);
held([]);
ok(Math.abs(player.y + player.h - (ladder.y + ladder.h)) < 1, 'Down descends to the lower roof');
ok(player.grounded, 'player leaves the bottom standing');
console.log('Ladder climb/descent: 5 passed');
