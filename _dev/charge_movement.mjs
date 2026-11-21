import assert from 'node:assert/strict';
import { Player, held, step, flat } from './support/headless.mjs';
import { createJuice } from '../src_scroll/juice.js';
import { PLAYER_SPEED, TILE, CHARGE_JUMP_COST, CHARGE_SPRINT_COST_PER_SECOND } from '../src_scroll/constants.js';

let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const level = flat(80);
const walker = new Player(64, 418);
walker.grounded = true;
held(['ArrowRight']); step(walker, level);
check(Math.abs(walker.vx - PLAYER_SPEED) < 1e-9, 'ordinary walking speed is unchanged');

const runner = new Player(64, 418);
runner.grounded = true;
runner.giveEnergy(2);
const juice = createJuice({ rng: () => 0.5 });
held(['ArrowRight', 'KeyF']);
for (let i = 0; i < 60; i++) { step(runner, level); juice.observe(runner, level, 1 / 60); juice.update(1 / 60); }
check(runner.chargeSprinting && Math.abs(runner.vx - PLAYER_SPEED * 2) < 1e-9,
  'F + direction runs at exactly twice walking speed');
check(Math.abs(runner.usableEnergy - (2 - CHARGE_SPRINT_COST_PER_SECOND)) < 0.02,
  'one second of charged movement costs the configured charge');
check(juice.particleCount > 0, 'charged movement leaves visible short-lived foot sparks');

const dry = new Player(64, 418);
dry.grounded = true;
held(['ArrowRight', 'KeyF']); step(dry, level);
check(!dry.chargeSprinting && dry.usableEnergy === 0, 'empty charge refuses boost without overdraft');

function peak(charged) {
  const p = new Player(64, 418); p.grounded = true;
  if (charged) p.giveEnergy(2);
  const before = p.y;
  held(charged ? ['ArrowUp', 'KeyF'] : ['ArrowUp']); step(p, level);
  held([]);
  let top = p.y;
  for (let i = 0; i < 75; i++) { step(p, level); top = Math.min(top, p.y); }
  return { height: before - top, player: p };
}
const ordinary = peak(false), powered = peak(true);
check(Math.abs((powered.height - ordinary.height) - 2 * TILE) < 4,
  'charged jump peaks two 32px grid tiles above ordinary jump');
check(Math.abs(powered.player.usableEnergy - (2 - CHARGE_JUMP_COST)) < 1e-9 &&
  powered.player.chargeJumpCount === 1, 'charged jump spends once and emits one animation event');
const jumpFx = createJuice({ rng: () => 0.5 });
const jumpPlayer = new Player(64, 418);
jumpPlayer.grounded = true;
jumpPlayer.giveEnergy(1);
jumpFx.observe(jumpPlayer, level, 1 / 60);
held(['ArrowUp', 'KeyF']); step(jumpPlayer, level);
jumpFx.observe(jumpPlayer, level, 1 / 60);
check(jumpFx.particleCount > 12, 'charged jump creates feet sparks and outward electric waves');

const emptyJump = peak(false);
check(emptyJump.player.usableEnergy === 0, 'ordinary jump stays free');
held([]);
console.log(`RESULTS: ${checks} passed, 0 failed`);
