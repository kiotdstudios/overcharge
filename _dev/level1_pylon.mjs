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

sec('THE LIGHT CABLE RUNS THE FULL SKYLINE, PYLON TO GATEHOUSE (AKI_26 #5)');
{
  const cables = d.decorations.filter(x => /light-cable\//.test(x.src));
  ok(cables.length === 81, 'the full cable run is placed (pylon climb + skyline run to the gatehouse)', `${cables.length}`);
  const hs = cables.filter(x => /cable_straight_h/.test(x.src));
  const vs = cables.filter(x => /cable_straight_v/.test(x.src));
  const corners = cables.filter(x => /cable_corner/.test(x.src));
  ok(corners.length === 5, 'five corners: one climb at the pylon, two height-step transitions (2 corners each)', `${corners.length}`);
  ok(corners.every(c => [0, 90, 180, 270].includes(c.rotation || 0)), 'every corner has a valid 90-degree rotation');
  const minX = Math.min(...cables.map(c => c.x));
  const maxX = Math.max(...cables.map(c => c.x + c.w));
  ok(minX < 800, 'the run starts at the pylon', `min x ${minX}`);
  const gate = d.gates.find(g => g.isExit);
  ok(maxX > gate.x - 100, 'the run reaches all the way to the gatehouse', `max x ${maxX}, gate x ${gate.x}`);
  // No gaps along each horizontal row (straight_h pieces + the corners that sit in that row connecting to them).
  // Vertical straight_v pieces are excluded: they stack at one x, not meant to chain horizontally.
  const rowPieces = cables.filter(x => /cable_straight_h|cable_corner/.test(x.src));
  let maxGapSameRow = 0;
  const byY = {};
  for (const c of rowPieces) { (byY[c.y] = byY[c.y] || []).push(c); }
  for (const y of Object.keys(byY)) {
    const row = byY[y].sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].x - (row[i - 1].x + row[i - 1].w);
      if (gap > maxGapSameRow) maxGapSameRow = gap;
    }
  }
  ok(maxGapSameRow <= 0, 'no horizontal gaps within any single cable height level (chain is unbroken)', `max gap ${maxGapSameRow}px`);
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
