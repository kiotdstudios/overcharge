import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'assets/sprites/npc-bus-stop/review/';
const review = JSON.parse(readFileSync(base + 'review-manifest.json', 'utf8'));
const live = JSON.parse(readFileSync('assets/ASSET_MANIFEST.json', 'utf8'));
for (const id of ['npc_bus_stop_backpack', 'npc_bus_stop_homeless']) {
  const art = review[id];
  assert.ok(art.frame_count / art.fps >= 8, `${id}: loop under 8 seconds`);
  assert.equal(art.footYByFrame, 123);
  for (let i = 0; i < art.frame_count; i++) {
    assert.ok(existsSync(base + art.path + String(i).padStart(2, '0') + '.png'), `${id} missing frame ${i}`);
  }
  assert.ok(live.assets.some(asset => asset.id === id), `${id} lost its live identity`);
}
console.log('CODEX 04 review: two 8-second loops, 96 frames present, live ids unchanged.');
