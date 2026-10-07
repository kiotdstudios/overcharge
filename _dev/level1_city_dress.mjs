import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const old = read('level_archive/level1-2026-10-06-before-city-dress.json');
const now = read('src_scroll/levels/level1.json');
const worldW = now.cols * 32;

for (const key of ['cols', 'tiles', 'tileRotations', 'tileFlips', 'playerStart',
  'gates', 'checkpoints', 'platforms', 'enemies', 'switches', 'backgroundOffsets']) {
  assert.deepEqual(now[key], old[key], `${key} changed while dressing the level`);
}
assert.equal(now.gates.find(g => g.isExit)?.required, 8);
assert.equal(now.gates.find(g => g.isExit)?.x, 3136);

const buildings = now.decorations.filter(d => d.src?.includes('/night-city-buildings/'));
assert.equal(buildings.length, 19);
const byPack = new Map();
for (const d of buildings) {
  assert.equal(d.h, 256);
  assert.equal(d.snap, 1);
  assert.equal(d.family, 'nc_building_wall');
  assert.ok(fs.existsSync(path.join(root, d.src)), `missing facade: ${d.src}`);
  const pack = d.src.split('/night-city-buildings/')[1].split('/')[0];
  const list = byPack.get(pack) || [];
  list.push(d); byPack.set(pack, list);
}
for (const pack of ['apartment_complex', 'warehouse', 'garrys_electronics', 'library']) {
  const list = byPack.get(pack).sort((a, b) => a.x - b.x);
  assert.equal(list.length, 4, `${pack} should have four panels`);
  for (let i = 1; i < 4; i++) {
    assert.equal(list[i].x, list[i - 1].x + list[i - 1].w,
      `${pack} has an overlap or gap between panels ${i} and ${i + 1}`);
    assert.equal(list[i].y, list[0].y, `${pack} panels have mismatched baselines`);
  }
}
assert.equal(byPack.get('tire_shop').length, 2);
assert.equal(byPack.get('gatehouse').length, 1);
assert.equal(byPack.get('gatehouse')[0].x, 3072);
assert.equal(byPack.get('gatehouse')[0].x + byPack.get('gatehouse')[0].w - worldW, 32,
  'the gate portal should clip exactly 32 px at the level edge');

const added = now.sources.filter(s => !old.sources.some(o => o.id === s.id));
assert.equal(added.length, 3);
for (const s of added) {
  assert.equal(s.kind, 'prop');
  assert.equal(s.mount, 'wall');
  assert.equal(s.charge, 4);
  assert.equal(s.frames, 8);
  for (let frame = 0; frame < s.frames; frame++) {
    const file = `${s.sprite}${String(frame).padStart(2, '0')}.png`;
    assert.ok(fs.existsSync(path.join(root, file)), `missing prop frame: ${file}`);
  }
  const surfaceY = s.label === 'PLUG' ? 320 : s.label === 'TIRE' ? 384 : 480;
  const playerCenterY = surfaceY - 15;
  const sourceCenterY = s.y + 14;
  assert.ok(Math.abs(playerCenterY - sourceCenterY) < 56,
    `${s.label} sign would be out of absorb range from its roof/floor`);
}
assert.equal(now.decorations.filter(d => !d.src?.includes('/night-city-buildings/')).length,
  old.decorations.filter(d => !d.src?.includes('/night-city-buildings/')).length,
  'non-building decorations were lost');
console.log('PASS: Level 1 city dressing preserves gameplay, aligns facades, and keeps signs absorbable');
