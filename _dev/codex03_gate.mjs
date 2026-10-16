import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Player, Level } from './support/headless.mjs';
import { isSourcePowered } from '../src_scroll/electricity.js';

const def = JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level1.json', import.meta.url), 'utf8'));
const config = def.gates.find(g => g.id === 'SECRET_DOOR');
assert.ok(config?.blockOnly && config.style === 'fence', 'real Level 1 secret door fixture exists');
assert.ok(def.sources.some(s => s.id === 'src_ac' && s.charge === 3), 'real AC source fixture exists');

const changed = structuredClone(def);
const doorDef = changed.gates.find(g => g.id === 'SECRET_DOOR');
doorDef.style = 'hatch';
doorDef.openWhenSourceCharged = { id: 'src_ac', min: 3 };
const level = new Level(changed);
const player = new Player(64, 450);
const door = level.gates.find(g => g.id === 'SECRET_DOOR');
const ac = level.sources.find(s => s.id === 'src_ac');
const sw = level.switches.find(s => s.id === 'SW_AC');
const drawn = [];
const ctx = new Proxy({ drawImage(img) { drawn.push(img.src); }, save() {}, restore() {} },
  { get(target, key) { return key in target ? target[key] : () => {}; }, set() { return true; } });
const art = () => { drawn.length = 0; door.draw(ctx); return drawn.at(-1); };
const tick = () => level.update(1 / 60, player);

assert.equal(isSourcePowered(level.sources, 'missing', 3), false, 'unknown source fails closed');
assert.equal(isSourcePowered(level.sources, 'src_ac', 3), false, 'uncharged AC is not powered');

assert.equal(door.style, 'hatch');
assert.equal(art(), 'assets/objects/night-city-props/secret-room/hatch_closed.png');
assert.equal(door.blocks(door.x, door.y, 8, 8), true);
sw.on = true; tick();
assert.equal(door.open, false, 'source rule overrides old linked wall switch');
assert.equal(ac.receive(2), 2); tick();
assert.equal(door.open, false, 'two of three charge is insufficient');
assert.equal(ac.receive(1), 1); tick();
assert.equal(isSourcePowered(level.sources, 'src_ac', 3), true, 'NPCs can use the same powered-source predicate');
assert.equal(door.open, true, 'three charge opens the hatch');
assert.equal(art(), 'assets/objects/night-city-props/secret-room/hatch_open.png');
assert.equal(door.blocks(door.x, door.y, 8, 8), false);

const saved = level.snapshot();
assert.equal(ac.drain(1), 1); tick();
assert.equal(door.open, false, 'draining AC closes the hatch even with switch on');
assert.equal(art(), 'assets/objects/night-city-props/secret-room/hatch_closed.png');
level.restore(saved); tick();
assert.equal(door.open, true, 'checkpoint restores AC charge and open hatch');

const legacy = new Level(def);
const fence = legacy.gates.find(g => g.id === 'SECRET_DOOR');
assert.equal(fence.style, 'fence');
assert.equal(fence.openWhenSourceCharged, null);
legacy.switches.find(s => s.id === 'SW_AC').on = true;
legacy.update(1 / 60, player);
assert.equal(fence.open, true, 'existing fence still opens from its wall switch');

const custom = new Level({ ...def, gates: [{ ...doorDef, closedSrc: 'custom/closed.png', openSrc: 'custom/open.png' }], switches: [] });
assert.equal(custom.gates[0]._hatchClosed.src, 'custom/closed.png');
assert.equal(custom.gates[0]._hatchOpen.src, 'custom/open.png');
console.log('CODEX 03 gate tests passed: hatch states, AC threshold, reversible close, checkpoint, legacy fence, custom art');
