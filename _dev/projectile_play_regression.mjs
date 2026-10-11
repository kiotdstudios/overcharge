import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Player, Level, held, step } from './support/headless.mjs';

const def = JSON.parse(readFileSync('src_scroll/levels/level1.json', 'utf8'));
const level = new Level(def);
const player = new Player(def.playerStart.x, def.playerStart.y);
player.setEnergyState(8, 0);
for (const source of level.sources) {
  source.charge = 0;
  source.drained = true;
}
held(['KeyK']);
step(player, level);
assert.equal(player._bolts.length, 0, 'K swings without firing a projectile');
assert.equal(player.usableEnergy, 8, 'K melee remains free');
held([]);
step(player, level);
player._attackCooldown = 0;
held(['KeyL']);
step(player, level);
assert.equal(player._bolts.length, 1, 'L creates a visible projectile in Level 1');
assert.equal(player._bolts[0].alive, true, 'the first frame does not cull the bolt');
assert.ok(Math.abs(player._bolts[0].cx - (player.cx + 18 + 320 / 60)) < 1e-6,
  'east-facing bolt begins at the casting hand');
assert.ok(Math.abs(player._bolts[0].cy - (player.y - 16)) < 1e-6,
  'bolt height aligns with the hand, not the lower body');
assert.equal(player.usableEnergy, 7.75, 'L spends 0.25 of the player’s 8 charge');
assert.equal(level.isFailState(player), false, 'remaining charge keeps the run active');

player.setEnergyState(0, 0);
assert.equal(level.isFailState(player), false, 'a final bolt can finish its flight');
player._bolts.length = 0;
assert.equal(level.isFailState(player), true, 'a genuinely empty dead end still fails');
const levelWithSource = new Level(def);
for (const source of levelWithSource.sources.slice(1)) {
  source.charge = 0;
  source.drained = true;
}
assert.equal(levelWithSource.isFailState(player), false,
  'remaining source charge is not mislabeled as discharged');

const west = new Player(def.playerStart.x, def.playerStart.y);
west.setEnergyState(1, 0);
held([]);
step(west, level);
held(['ArrowLeft', 'KeyL']);
step(west, level);
assert.equal(west._bolts.length, 1, 'west-facing shot is created');
assert.ok(Math.abs(west._bolts[0].cx - (west.cx - 18 - 320 / 60)) < 1e-6,
  'west-facing bolt begins at the mirrored casting hand');
assert.ok(Math.abs(west._bolts[0].cy - (west.y - 16)) < 1e-6,
  'west-facing bolt keeps the hand height');
console.log('RESULTS: 14 passed, 0 failed');
