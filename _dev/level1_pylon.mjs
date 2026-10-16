// level1_pylon.mjs - Level 1 guard after the secret-room preview was scrapped (Chief, 2026-10-16).
// Proves: the relay pylon is placed, the preview (fire escape, ladder, AC, switch, door, room) is gone,
// and the street is clean: three 4-charge lamps, exit costs 8, the hero walks the street unblocked.
import { Player, Level, held, step } from './support/headless.mjs';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const d = JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level1.json', import.meta.url), 'utf8'));

sec('THE PYLON STAYS');
{
  const pylon = d.decorations.filter(x => /relay-pylon\/pylon\.png$/.test(x.src));
  ok(pylon.length === 1, 'exactly one relay pylon is placed', `${pylon.length}`);
  ok(pylon[0] && pylon[0].x === 576 && pylon[0].w === 96 && pylon[0].h === 256, 'at x576, 96x256 (Aki art)');
}

sec('THE SCRAPPED PREVIEW IS GONE');
{
  ok(!d.decorations.some(x => /secret-room|ladder\.png/.test(x.src)), 'no secret-room props and no ladder in Level 1');
  ok(!d.sources.some(s => s.id === 'src_ac'), 'no preview AC source');
  ok(!d.switches.some(s => s.id === 'SW_AC') && d.switches.length === 0, 'no preview switch');
  ok(!d.gates.some(g => g.id === 'SECRET_DOOR') && d.gates.length === 1, 'only the exit gate remains');
  let oneWay = 0;
  for (let i = 0; i < d.tiles.length; i++) if (d.tiles[i] === 2) oneWay++;
  const row9 = []; for (let c = 3; c <= 13; c++) row9.push(d.tiles[9 * d.cols + c]);
  ok(row9.every(v => v !== 2) , 'the fire escape one-way tiles are gone', `row 9 cols 3-13: ${row9.join(',')}`);
  ok(d.tiles[4 * d.cols + 8] !== 46 && d.tiles[4 * d.cols + 13] !== 46, 'the room wall tiles (46) are gone');
}

sec('THE STREET IS CLEAN');
{
  const level = new Level(d);
  const lamps = level.sources.filter(s => s.label === 'LAMP');
  ok(lamps.length === 3 && lamps.every(s => s.charge === 4), 'three 4-charge lamps');
  ok(level.gates.find(g => g.isExit).required === 8, 'the exit costs 8');
  ok(level.ladders.length === 0, 'no ladders');
  const q = new Player(64, 450);
  held([]); for (let i = 0; i < 40; i++) step(q, level);
  held(['ArrowRight']); for (let i = 0; i < 240; i++) step(q, level);
  held([]);
  ok(q.x > 250, 'walking right from the spawn is not blocked', `x ${q.x.toFixed(0)}`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
