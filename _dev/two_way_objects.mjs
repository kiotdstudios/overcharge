import { Player, Level, held, step } from './support/headless.mjs';

let passed = 0;
function check(condition, label) {
  if (!condition) throw new Error(label);
  passed++;
}
function level(source) {
  const cols = 20;
  const tiles = Array(cols * 18).fill(0);
  for (let x = 0; x < cols; x++) tiles[16 * cols + x] = 10;
  return new Level({ name: 'TWO WAY', number: 99, cols, tiles,
    playerStart: { x: 96, y: 480 }, sources: [source], gates: [], switches: [],
    checkpoints: [], platforms: [], enemies: [], decorations: [], chests: [] });
}
function tick(player, world, keys = [], frames = 1) {
  held(keys);
  for (let i = 0; i < frames; i++) step(player, world);
}
function near(a, b) { return Math.abs(a - b) < 1e-6; }

const world = level({ id: 'S', x: 108, y: 480, charge: 4, uncharged: true });
const player = new Player(96, 480);
tick(player, world, [], 12);
player.setEnergyState(4, 0);
const source = world.sources[0];
check(source.max === 4 && source.charge === 0 && source.drained, 'uncharged keeps capacity and starts dark');
tick(player, world, ['Space'], 120);
check(near(source.charge, 4) && !source.drained, 'charging fills and wakes source');
check(near(player.usableEnergy + source.charge, 4), 'charging conserves energy');
tick(player, world, ['Space'], 30);
check(near(source.charge, 4), 'cannot overfill source');
tick(player, world, ['KeyE'], 120);
check(near(source.charge, 0) && source.drained, 'absorbing drains source again');
check(near(player.usableEnergy, 4), 'round trip conserves energy');

tick(player, world, ['Space'], 45);
const saved = world.snapshot();
const half = source.charge;
tick(player, world, ['KeyE'], 45);
world.restore(saved);
check(near(source.charge, half) && !source.drained, 'checkpoint restores partial charge');

const old = level({ id: 'OLD', x: 108, y: 480, charge: 4 });
check(old.sources[0].max === 4 && old.sources[0].charge === 4 && !old.sources[0].drained,
  'legacy source starts fully charged');
held([]);
console.log(`${passed} passed / 0 failed`);
