import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Npc } from '../src_scroll/npc.js';
import { loadDecoAnimations } from '../src_scroll/deco-anim.js';
import { npcGeometry } from '../src_scroll/npc-geometry.js';

const manifest = JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json', 'utf8'));
const level = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
globalThis.Image = class { complete = true; naturalWidth = 128; naturalHeight = 128; set src(value) { this._src = value; } get src() { return this._src; } };
globalThis.fetch = async () => ({ ok: true, json: async () => manifest });
await loadDecoAnimations();

for (const id of ['npc_bus_stop_homeless', 'npc_bus_stop_backpack']) {
  const asset = manifest.assets.find(a => a.id === id);
  const def = level.npcs.find(n => n.assetId === id);
  assert(asset && def, `${id} is placeable and present in Level 1`);
  assert.equal(asset.spawnsKind, 'npc');
  assert.equal(asset.frame_count, 5);
  assert.equal(asset.loop, true);
  assert.deepEqual(asset.footYByFrame, [123, 123, 123, 123, 123]);
  const npc = new Npc(def);
  const frames = [];
  for (let i = 0; i < 5; i++) {
    const path = asset.path.replace(/00\.png$/, `${String(i).padStart(2, '0')}.png`);
    const png = fs.readFileSync(path);
    assert.equal(png.readUInt32BE(16), 128);
    assert.equal(png.readUInt32BE(20), 128);
    npc._clock = i / asset.fps;
    frames.push(npc._currentFrame()?.src);
    const g = npcGeometry(asset, def.x, def.y, 1, def.facing, 123);
    assert(Math.abs(g.visible.y + g.visible.h - def.y) < 0.01, `${id} feet stay grounded`);
  }
  assert.deepEqual(frames.map(src => src.match(/(\d\d)\.png$/)?.[1]), ['00', '01', '02', '03', '04']);
  npc._clock = 5 / asset.fps;
  assert.equal(npc._currentFrame()?.src, frames[0], `${id} loops to its first pose`);
  console.log(`${id}: five grounded idle frames loop correctly`);
}

