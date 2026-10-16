// level1_pylon.mjs - Level 1 guard after the secret-room preview was scrapped (Chief, 2026-10-16).
// Proves: the relay pylon is placed; the ladder and the upper walkway (the way up to the second area) are back
// and climbable; the rest of the preview (room, props, AC, switch, door) is gone; the street is clean:
// three 3-charge lamps, exit costs 8, the hero walks the street unblocked.
import { Player, Level, held, step } from './support/headless.mjs';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const d = JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level1.json', import.meta.url), 'utf8'));
const run = (p, lv, keys, seconds, until) => { held(keys); for (let i = 0; i < Math.round(seconds * 60); i++) { step(p, lv); if (until && until()) break; } };

sec('THE PYLON STAYS');
{
  const pylon = d.decorations.filter(x => /relay-pylon\/pylon\.png$/.test(x.src));
  ok(pylon.length === 1, 'exactly one relay pylon is placed', `${pylon.length}`);
  ok(pylon[0] && pylon[0].x === 576 && pylon[0].w === 96 && pylon[0].h === 256, 'at x576, 96x256 (Aki art)');
}

sec('THE WAY UP IS BACK');
{
  const lad = d.decorations.filter(x => /night-city-props\/ladder\/ladder\.png$/.test(x.src));
  ok(lad.length === 1 && lad[0].x === 128 && lad[0].y === 288 && lad[0].h === 192, 'one ladder at x128, street up to y288');
  const row9 = []; for (let c = 3; c <= 13; c++) row9.push(d.tiles[9 * d.cols + c]);
  ok(row9.every(v => v === 2), 'a one-way upper walkway at row 9, columns 3 to 13', row9.join(','));
  const level = new Level(d);
  ok(level.ladders.length === 1, 'the engine sees exactly one climbable ladder', `${level.ladders.length}`);
}

sec('THE SCRAPPED ROOM IS GONE');
{
  ok(!d.decorations.some(x => /secret-room/.test(x.src)), 'no secret-room props');
  ok(!d.sources.some(s => s.id === 'src_ac'), 'no preview AC source');
  ok(d.switches.length === 0, 'no preview switch');
  ok(!d.gates.some(g => g.id === 'SECRET_DOOR') && d.gates.length === 1, 'only the exit gate remains');
  ok(d.tiles[4 * d.cols + 8] !== 46 && d.tiles[4 * d.cols + 13] !== 46, 'the room wall tiles (46) are gone');
}

sec('CLIMB: the ladder reaches the upper walkway');
{
  const level = new Level(d);
  const p = new Player(128 + 16 - 10, 450);
  run(p, level, [], 0.6);
  ok(p.grounded, 'the hero starts on the street under the ladder');
  run(p, level, ['ArrowUp'], 5, () => p.grounded && p.y + p.h < 400);
  ok(p.grounded && Math.abs(p.y + p.h - 288) < 2, 'holding Up climbs and steps off onto the walkway (y 288)', `feet ${(p.y + p.h).toFixed(1)}`);
  held([]); for (let i = 0; i < 20; i++) step(p, level);
  ok(p.grounded && Math.abs(p.y + p.h - 288) < 2, 'and stays standing there when the key is released', `feet ${(p.y + p.h).toFixed(1)}`);
}

sec('THE STREET IS CLEAN');
{
  const level = new Level(d);
  const lamps = level.sources.filter(s => s.label === 'LAMP');
  ok(lamps.length === 3 && lamps.every(s => s.charge === 3), 'three 3-charge lamps (Chief, round 15: streetlight is 3)');
  ok(level.sources.length === 3 && level.sources.reduce((a, s) => a + s.charge, 0) === 9, 'the level holds 9 charge until Chief adds the market vending machine (2) and one more prop');
  ok(level.gates.find(g => g.isExit).required === 8, 'the exit costs 8');
  // The street itself is Chief's. Walking from the spawn must end at the same x with or without the new walkway and ladder.
  const walk = lv => { const q = new Player(64, 450); held([]); for (let i = 0; i < 40; i++) step(q, lv); held(['ArrowRight']); for (let i = 0; i < 300; i++) step(q, lv); held([]); return q.x; };
  const bare = JSON.parse(JSON.stringify(d));
  for (let c = 3; c <= 13; c++) bare.tiles[9 * bare.cols + c] = 0;
  const a = walk(new Level(d)), b = walk(new Level(bare));
  ok(a > 250 && Math.abs(a - b) < 0.5, 'the walkway and ladder do not change how the street plays', `x ${a.toFixed(0)} vs ${b.toFixed(0)} without`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
