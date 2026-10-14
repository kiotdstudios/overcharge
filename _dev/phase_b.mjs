import assert from 'node:assert/strict';
import { Player, Level, Input, held, step, flat } from './support/headless.mjs';
import { PLAYER_H, PLAYER_DUCK_H, TILE } from '../src_scroll/constants.js';
import { state as editorState, setLevelAbility } from '../editor/state.js';

let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); passed++; };
const tick = (p, l, keys = [], frames = 1) => {
  held(keys);
  for (let i = 0; i < frames; i++) step(p, l);
};

{
  const l = flat(), p = new Player(100, 14 * TILE - PLAYER_H);
  tick(p, l); // settle
  const feet = p.y + p.h;
  tick(p, l, ['ArrowDown', 'ArrowRight']);
  check(p.ducking && p.h === PLAYER_DUCK_H, 'Down ducks to the shorter hitbox');
  check(Math.abs(p.y + p.h - feet) < 0.01, 'duck preserves foot position');
  check(p.vx === 0, 'walking input does not move while ducked');
  tick(p, l, []);
  check(!p.ducking && p.h === PLAYER_H, 'release Down stands in clear space');
}
{
  const l = flat(), p = new Player(100, 14 * TILE - PLAYER_H);
  tick(p, l);
  tick(p, l, ['ArrowDown']);
  const feet = p.y + p.h;
  // Solid ledge overlaps the standing top, but clears the ducked head.
  const row = Math.floor((feet - PLAYER_H) / TILE);
  const col = Math.floor(p.x / TILE);
  l.tiles[row * l.cols + col] = 16;
  tick(p, l, []);
  check(p.ducking && p.h === PLAYER_DUCK_H, 'blocked ceiling prevents standing');
  l.tiles[row * l.cols + col] = 0;
  tick(p, l, []);
  check(!p.ducking, 'standing resumes when headroom clears');
}
{
  const cols = 20, rows = 18, tiles = Array(cols * rows).fill(0);
  for (let x = 0; x < cols; x++) { tiles[10 * cols + x] = 2; tiles[15 * cols + x] = 16; }
  const l = new Level({ cols, tiles, playerStart: { x: 100, y: 10 * TILE - PLAYER_H } });
  const p = new Player(100, 10 * TILE - PLAYER_H);
  tick(p, l);
  tick(p, l, ['ArrowDown']);
  check(p.grounded && p.ducking, 'Down alone ducks on a one-way tile');
  tick(p, l, ['ArrowDown', 'ArrowUp']);
  check(p._dropTimer > 0 && p.vy > 0, 'Down+jump starts the drop window');
  tick(p, l, ['ArrowDown'], 10);
  check(p.y + p.h > 10 * TILE + 2, 'player passes through one-way tile');
}
{
  const l = flat();
  l.abilities = { melee: false, bolt: false };
  const p = new Player(100, 14 * TILE - PLAYER_H);
  p.setEnergyState(5, 0);
  const enemy = { alive: true, hit() { throw Error('disabled melee hit'); } };
  p.nearEnemy = enemy;
  tick(p, l, ['KeyK']);
  check(p._attackCooldown === 0, 'disabled melee does nothing');
  tick(p, l, []);
  tick(p, l, ['KeyL']);
  check(p._bolts.length === 0 && p.charge === 5, 'disabled bolt spends no charge');
  const legacy = flat();
  check(legacy.abilities.melee && legacy.abilities.bolt, 'missing abilities preserves both attacks');
}
{
  const before = editorState.level;
  editorState.level = { number: 1 };
  setLevelAbility('bolt', false);
  check(editorState.level.abilities.bolt === false && editorState.dirty,
    'Builder saves a disabled bolt without editing a level file');
  setLevelAbility('bolt', true);
  check(!Object.hasOwn(editorState.level, 'abilities'), 'restoring both attacks removes the optional field');
  editorState.level = before;
}
{
  const cols = 20, tiles = Array(cols * 18).fill(0);
  const l = new Level({ cols, tiles, gates: [{ id: 'EXIT', x: 400, y: 300, w: 32, h: 64, required: 8, isExit: true }] });
  const p = new Player(100, 100);
  p.setEnergyState(7.75, 0);
  check(l.isFailState(p), '7.75 charge cannot pay an 8-charge exit');
  p.setEnergyState(8, 0);
  check(!l.isFailState(p), '8 charge keeps exit payable');
}

console.log(`RESULTS: ${passed} passed, 0 failed`);

