import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { npcGeometry } from '../src_scroll/npc-geometry.js';
import { HERO_SIZE } from '../src_scroll/hero-render.js';

const manifest = JSON.parse(readFileSync('assets/ASSET_MANIFEST.json', 'utf8'));
const level = JSON.parse(readFileSync('src_scroll/levels/level1.json', 'utf8'));
const asset = manifest.assets.find(a => a.id === 'npc_streetlamp_woman');
const npc = level.npcs.find(n => n.assetId === asset.id);
assert.ok(asset && npc);
const g = npcGeometry(asset, npc.x, npc.y, npc.scale, npc.facing);
assert.ok(Math.abs(g.visible.h - 70) < .001, 'visible figure is 70 world px high');
assert.ok(g.visible.h > HERO_SIZE * .8 && g.visible.h < HERO_SIZE * 1.15);
assert.ok(Math.abs(g.visible.y + g.visible.h - npc.y) < .001, 'shoes meet feet anchor');
assert.ok(Math.abs(g.visible.x + g.visible.w / 2 - npc.x) < .001, 'figure centered on anchor');
assert.ok(Math.abs(g.drawW / g.drawH - 1) < .001, 'source canvas stays uniformly scaled');
for (const id of [asset.id, npc.greetingAssetId, npc.walkAssetId]) {
  const clip = manifest.assets.find(a => a.id === id);
  for (const footY of clip.footYByFrame) {
    const frame = npcGeometry(asset, npc.x, npc.y, npc.scale, npc.facing, footY);
    assert.ok(Math.abs(frame.drawY + footY * frame.scale - npc.y) < .001,
      `${id} shoe bottom meets ground`);
    assert.equal(frame.visible.h, g.visible.h, 'animation keeps a stable selection box');
  }
}
for (const zoom of [1, 2.35]) {
  assert.ok(Math.abs((g.visible.y + g.visible.h) * zoom - npc.y * zoom) < .001,
    `Builder ground alignment at ${zoom * 100}% zoom`);
}
const second = npcGeometry(asset, 2120, 288, 1, 'right');
assert.ok(Math.abs(second.visible.y + second.visible.h - 288) < .001,
  'a second instance uses the same feet rule');
const worker = manifest.assets.find(a => a.id === 'npc_smoke_break_worker_a');
const workerPlacement = level.npcs.find(n => n.assetId === worker.id);
const wg = npcGeometry(worker, workerPlacement.x, workerPlacement.y, workerPlacement.scale);
assert.ok(Math.abs(wg.drawH - 176 * .5455) < .001,
  'existing workers retain native-canvas scale');
const row = npc.y / 32;
assert.equal(row, Math.floor(row));
for (let x = npc.x - npc.patrol.rangePx; x <= npc.x + npc.patrol.rangePx; x += 16) {
  const col = Math.floor(x / 32);
  assert.notEqual(level.tiles[row * level.cols + col], 0, `ground under patrol x=${x}`);
}
console.log('NPC visible scale, feet, mirrored bounds, zoom parity, second instance, and ground: passed');
