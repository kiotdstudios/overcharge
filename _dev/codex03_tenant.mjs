// Synthetic tenant fixture: no authored Level 1 or manifest edits are needed.
import assert from 'node:assert/strict';

globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; } };
const { Level } = await import('../src_scroll/level.js');
const { createAchievements, ACHIEVEMENT_STORAGE_KEY } = await import('../src_scroll/achievements.js');

const def = () => ({
  cols: 24, tiles: Array(24 * 18).fill(0),
  sources: [{ id: 'AC', x: 96, y: 160, kind: 'hvac', charge: 3, uncharged: true }],
  switches: [{ id: 'PLATE', x: 68, y: 200, style: 'plate', required: 2, linkedId: 'AC' }],
  npcs: [{ id: 'TENANT', x: 130, y: 190, assetId: 'hot', poweredAssetId: 'relieved', linkedObjectId: 'AC',
    dialogue: { enabled: true, lines: [{ text: "It's an oven in here" }],
      poweredLines: [{ text: "Oh, thank God. It's back on." }] } }],
});
const level = new Level(def());
const ac = level.sources[0], plate = level.switches[0], tenant = level.npcs[0];
assert.equal(plate.w, 16);
assert.equal(plate.h, 24);
assert.equal(level.isPowered('AC'), false);
assert.equal(ac.powered, false);
const checkpoint = level.snapshot();
assert.equal(plate.receive(1), false);
assert.equal(level.isPowered('AC'), false);
assert.equal(plate.receive(1), true);
level.update(0.1, null);
assert.equal(level.isPowered('AC'), true);
assert.equal(ac._switchOn, true);
assert.equal(tenant._justRelieved, true);
assert.equal(tenant._bubbleText, "Oh, thank God. It's back on.");
level.update(0.1, null);
assert.ok(ac._fanSpeed > 0);
assert.equal(tenant._justRelieved, false);
level.restore(checkpoint);
assert.equal(level.isPowered('AC'), false);
assert.equal(tenant._powered, false);
assert.equal(plate.on, false);
assert.equal(ac._fanSpeed, 0);

// Direct charging is an alternative path: partial charge does not run this AC.
assert.equal(ac.receive(2), 2);
level.update(0.1, null);
assert.equal(level.isPowered('AC'), false);
assert.equal(ac.receive(1), 1);
level.update(0.1, null);
assert.equal(level.isPowered('AC'), true);
assert.equal(tenant._justRelieved, true);

const contents = new Map();
const storage = { getItem: key => contents.get(key) || null, setItem: (key, value) => contents.set(key, value) };
const catalogue = [{ id: 'good_neighbor', title: 'GOOD NEIGHBOR', text: 'Restore power.' },
  { id: 'second', title: 'SECOND', text: 'Queue check.' }];
const a = createAchievements({ storage, search: '', catalogue });
assert.equal(a.unlock('good_neighbor'), true);
assert.equal(a.unlock('good_neighbor'), false);
assert.equal(a.unlock('second'), true);
assert.equal(a.update(0.01).id, 'good_neighbor');
assert.equal(a.current.id, 'good_neighbor');
assert.equal(a.update(3.01).id, 'second');
assert.equal(a.queued, 0);
assert.equal(a.update(3.01), null);
assert.equal(a.current, null);
assert.deepEqual(JSON.parse(contents.get(ACHIEVEMENT_STORAGE_KEY)), ['good_neighbor', 'second']);
const reloaded = createAchievements({ storage, search: '', catalogue });
assert.equal(reloaded.has('good_neighbor'), true);
assert.equal(reloaded.unlock('good_neighbor'), false);
const off = createAchievements({ storage, search: '?achievements=off', catalogue });
assert.equal(off.unlock('good_neighbor'), false);
assert.equal(off.current, null);
const blocked = createAchievements({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
assert.equal(blocked.unlock('good_neighbor'), true);
console.log('CODEX 03 tenant/plate/AC/achievement: PASS (31 assertions)');
