// level1_pylon.mjs - Level 1 guard. Chief edits Level 1 in the Builder all the time, so this checks FACTS that must stay true, not
// coordinates: the pylon is placed; the scrapped secret room is gone; the ladders are real and climbable and carry the hero from the
// street to the apartment roof; three 3-charge lamps and an exit that costs 8 are untouched.
import { Player, Level, held, step } from './support/headless.mjs';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const d = JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level1.json', import.meta.url), 'utf8'));
const run = (p, lv, keys, seconds, until) => { held(keys); for (let i = 0; i < Math.round(seconds * 60); i++) { step(p, lv); if (until && until()) break; } held([]); };

sec('THE PYLON STAYS');
{
  const pylon = d.decorations.filter(x => /relay-pylon\/pylon\.png$/.test(x.src));
  ok(pylon.length === 1, 'exactly one relay pylon is placed', `${pylon.length}`);
}

sec('THE BEACON SITS ON THE GATEHOUSE ROOF (AKI_26 #6)');
{
  const beacon = d.decorations.filter(x => /beacon-top\/beacon_top\.png$/.test(x.src));
  ok(beacon.length === 1, 'exactly one beacon-top is placed', `${beacon.length}`);
  const gate = d.gates.find(g => g.isExit);
  const b = beacon[0];
  ok(Math.abs(b.x - gate.x) < 200, 'the beacon sits near the exit gate', `beacon x ${b.x}, gate x ${gate.x}`);
  const roofBuildings = d.decorations.filter(x => /filler_wall_04/.test(x.src) && Math.abs(x.x - b.x) < 150);
  ok(roofBuildings.length > 0, 'there is a gatehouse roof under the beacon', `${roofBuildings.length} roof pieces nearby`);
  if (roofBuildings.length > 0) {
    const roofTop = Math.min(...roofBuildings.map(r => r.y));
    ok(b.y + b.h === roofTop, 'the beacon sits flush on the roof top (no float, no sink)', `beacon bottom ${b.y + b.h}, roof top ${roofTop}`);
  }
}

sec('THE LIGHT CABLE CLIMBS FROM THE PYLON (AKI_26 #5)');
{
  const cables = d.decorations.filter(x => /light-cable\//.test(x.src));
  ok(cables.length === 6, 'the pylon-side cable climb is placed (3 straight-v + 1 corner + 2 straight-h)', `${cables.length}`);
  const corner = cables.find(x => /cable_corner/.test(x.src));
  ok(corner && corner.rotation === 90, 'the corner piece is rotated to bend the climb into a rightward run', corner ? `rotation ${corner.rotation}` : 'missing');
  const pylon = d.decorations.find(x => /relay-pylon\/pylon\.png$/.test(x.src));
  ok(cables.every(c => Math.abs(c.x - pylon.x) < 300), 'the whole cable run is near the pylon it climbs from', cables.map(c => c.x).join(','));
}

sec('THE SCRAPPED ROOM IS GONE');
{
  ok(!d.decorations.some(x => /secret-room/.test(x.src)), 'no secret-room props');
  ok(!d.sources.some(s => s.id === 'src_ac'), 'no preview AC source');
  ok(d.switches.length === 0, 'no switch of any kind');
  ok(!d.gates.some(g => g.id === 'SECRET_DOOR') && d.gates.length === 1, 'only the exit gate remains');
}

sec('THE LADDERS ARE REAL AND THEY CHAIN UP TO THE APARTMENT ROOF');
{
  const decos = d.decorations.filter(x => /night-city-props\/ladder\/ladder\.png$/.test(x.src));
  const lv = new Level(d);
  ok(decos.length >= 2 && lv.ladders.length === decos.length, 'every ladder decoration is a climbable ladder in the engine', `${decos.length} placed, ${lv.ladders.length} in the engine`);
  ok(decos.every(x => x.w <= 64 && x.h <= 320), 'no ladder is absurdly large (Chief: "wayyyy too large")', decos.map(x => `${x.w}x${x.h}`).join(' '));
  const ac = lv.sources.find(s => s.id === 'AC_TENANT');
  const ladders = [...lv.ladders].sort((a, b) => (b.y + b.h) - (a.y + a.h));          // lowest first
  const p = new Player(d.playerStart.x, d.playerStart.y - 40);
  run(p, lv, [], 0.8);
  let where = 'spawn';
  for (const [i, lad] of ladders.entries()) {
    // walk to the ladder (right or left), then climb until standing on its top
    const targetX = lad.x + lad.w / 2 - p.w / 2;
    run(p, lv, [p.x < targetX ? 'ArrowRight' : 'ArrowLeft'], 8, () => Math.abs(p.x - targetX) < 4);
    run(p, lv, ['ArrowUp'], 8, () => p.grounded && Math.abs(p.y + p.h - lad.y) < 2);
    ok(p.grounded && Math.abs(p.y + p.h - lad.y) < 2, `ladder ${i + 1} (x ${lad.x}) climbs and steps off on its top`, `feet ${(p.y + p.h).toFixed(1)}, ladder top ${lad.y}`);
    held([]); run(p, lv, [], 0.3);
    ok(p.grounded && Math.abs(p.y + p.h - lad.y) < 2, 'and the hero stays standing there', `feet ${(p.y + p.h).toFixed(1)}`);
  }
  run(p, lv, ['ArrowRight'], 6, () => ac.inRange(p.cx, p.cy));
  ok(ac.inRange(p.cx, p.cy), 'from the top ladder the hero walks to the AC unit and is in range of it', `x ${p.x.toFixed(0)}, feet ${(p.y + p.h).toFixed(0)}`);
}

sec('THE STREET IS UNTOUCHED');
{
  const lv = new Level(d);
  const lamps = lv.sources.filter(s => s.label === 'LAMP');
  ok(lamps.length === 3 && lamps.every(s => s.charge === 3), 'three 3-charge lamps (Chief, round 15: streetlight is 3)');
  ok(lamps.reduce((a, s) => a + s.charge, 0) === 9, 'the lamps hold 9 together');
  ok(lv.gates.find(g => g.isExit).required === 8, 'the exit costs 8');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
