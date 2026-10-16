// level1_secret.mjs - the first working version of the Level 1 AC secret (Chief's order, 2026-10-16).
// Drives the REAL Player and the REAL src_scroll/levels/level1.json:
// ladder up to the fire escape, a locked door, a wall switch that costs 2, the room behind it,
// and proof that none of it is needed to finish the level.
import { Player, Level, held, step } from './support/headless.mjs';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const def = () => JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level1.json', import.meta.url), 'utf8'));
const run = (p, lv, keys, seconds, until) => { held(keys); for (let i = 0; i < Math.round(seconds * 60); i++) { step(p, lv); if (until && until()) break; } };

sec('WHAT WAS PLACED');
{
  const d = def();
  const src = d.sources.find(s => s.id === 'src_ac'), sw = d.switches.find(s => s.id === 'SW_AC'), door = d.gates.find(g => g.id === 'SECRET_DOOR');
  ok(!!src && src.kind === 'hvac' && src.uncharged === true && src.charge === 3, 'the AC unit is a charged object that starts uncharged, capacity 3');
  ok(!!sw && sw.required === 2 && sw.linkedId === 'SECRET_DOOR', 'the AC switch costs 2 and is linked to the door');
  ok(!!door && door.blockOnly && door.style === 'fence' && !door.isExit, 'the door is a fence-style barrier, not an exit');
  ok(d.decorations.some(x => /ladder\.png$/.test(x.src)), 'a ladder decoration is placed');
  ok(d.decorations.some(x => /relay-pylon\/pylon\.png$/.test(x.src)), 'the relay pylon is placed');
  const level = new Level(d);
  const ac = level.sources.find(s => s.id === 'src_ac');
  ok(ac && ac.charge === 0 && ac.drained === true && ac.max === 3, 'at load the AC is dark with capacity 3', `charge ${ac && ac.charge}, max ${ac && ac.max}`);
  ok(level.ladders.length === 1, 'the engine sees exactly one climbable ladder', `${level.ladders.length}`);
  const lamps = level.sources.filter(s => s.label === 'LAMP');
  ok(lamps.length === 3 && lamps.every(s => s.charge === 4), 'the three 4-charge lamps are untouched');
  ok(level.gates.find(g => g.isExit).required === 8, 'the exit still costs 8');
}

sec('CLIMB: the ladder reaches the fire escape');
const level = new Level(def());
const p = new Player(128 + 16 - 10, 450);                 // standing under the ladder (x 128 to 160)
run(p, level, [], 0.6);
ok(p.grounded, 'the hero starts on the street under the ladder');
run(p, level, ['ArrowUp'], 5, () => p.grounded && p.y + p.h < 400);
ok(p.grounded && Math.abs(p.y + p.h - 288) < 2, 'holding Up climbs the ladder and steps off onto the fire escape (y 288)', `feet ${(p.y + p.h).toFixed(1)} grounded ${p.grounded}`);
held([]); for (let i = 0; i < 20; i++) step(p, level);
ok(p.grounded && Math.abs(p.y + p.h - 288) < 2, 'and stays standing there when the key is released', `feet ${(p.y + p.h).toFixed(1)}`);

sec('THE DOOR IS LOCKED UNTIL THE AC SWITCH IS PAID');
{
  run(p, level, ['ArrowRight'], 3);
  ok(p.x + p.w <= 258, 'walking right stops at the fence, outside the room', `right edge ${(p.x + p.w).toFixed(1)}`);
  const sw = level.switches.find(s => s.id === 'SW_AC'), door = level.gates.find(g => g.id === 'SECRET_DOOR');
  ok(!sw.on && !door.open, 'the switch is off and the door is shut');
  ok(sw.inRange(p.cx, p.cy), 'the hero is in range of the AC switch when standing at the door');
  p.giveEnergy(4);
  const before = p.usableEnergy;
  run(p, level, ['Space'], 4, () => door.open);
  held([]);
  ok(door.open, 'holding SPACE at the switch opens the door');
  ok(Math.abs((before - p.usableEnergy) - 2) < 0.05, 'and it cost exactly 2 charge', `spent ${(before - p.usableEnergy).toFixed(2)}`);
}

sec('THE ROOM');
{
  run(p, level, ['ArrowRight'], 3);
  ok(p.x > 300 && p.x < 416, 'with the door open the hero walks into the room', `x ${p.x.toFixed(0)}`);
  ok(p.y + p.h <= 290 && p.grounded, 'standing on the room floor', `feet ${(p.y + p.h).toFixed(1)}`);
  ok(p.y > 150, 'and does not poke through the ceiling', `head ${p.y.toFixed(0)}`);
}

sec('NOTHING HERE IS NEEDED TO FINISH THE LEVEL');
{
  const d = def();
  const exit = d.gates.find(g => g.isExit);
  ok(exit.required === 8 && d.sources.filter(s => s.label === 'LAMP').reduce((a, s) => a + s.charge, 0) >= 8, 'the three lamps alone still pay the exit');
  const secretCols = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const newSolids = [];
  for (const c of secretCols) for (let r = 0; r < 18; r++) { const v = d.tiles[r * d.cols + c]; if ((c >= 8 && r === 4) || (c === 8 && (r === 5 || r === 6)) || (c === 13 && r >= 5 && r <= 8)) { if (v >= 10) newSolids.push(`${c},${r}`); } }
  ok(newSolids.length === 6 + 2 + 4, 'the new solid tiles are only the room shell, all above head height of the street', `${newSolids.length} tiles`);
  const street = new Level(d);
  const q = new Player(64, 450);
  run(q, street, [], 0.6);
  run(q, street, ['ArrowRight'], 4);
  ok(q.x > 150, 'walking along the street from the spawn is not blocked', `x ${q.x.toFixed(0)}`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
