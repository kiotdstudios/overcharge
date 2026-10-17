// level7_signal.mjs - Level 7 (SIGNAL): the relay-pylon showcase.
//
// Chief, 2026-10-17: the light-cable corners placed in level1 did not actually connect (wrong rotation on
// every corner), and he was not sure what the feature was for sitting mid-Level 1 anyway. Moved the whole
// relay-pylon / beacon-top / light-cable set here as its own level, with the corner rotation CORRECTED.
//
// Corner rotation truth table (measured directly off the sprite, see commit): 0=West<->North, 90=North<->East,
// 180=East<->South, 270=West<->South. The old level1 climb used 90 for a South<->East join (wrong - that's
// North<->East) and the old down-transitions used 180/0 for West<->South/North<->East (also wrong - rotation180
// is actually East<->South, not West<->South). This level's single climb uses the corrected South<->East join
// at rotation 180.
import { Player, Level, held, step } from './support/headless.mjs';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const d = JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level7.json', import.meta.url), 'utf8'));

sec('LEVEL 7 IS REGISTERED');
{
  const manifest = JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/levels.json', import.meta.url), 'utf8'));
  const entry = manifest.order.find(o => o.file === 'level7.json');
  ok(!!entry && entry.number === 7, 'level7.json is in the real progression manifest as number 7', JSON.stringify(entry));
}

sec('THE PYLON AND BEACON ARE PLACED');
{
  const pylon = d.decorations.filter(x => /relay-pylon\/pylon\.png$/.test(x.src));
  const beacon = d.decorations.filter(x => /beacon-top\/beacon_top\.png$/.test(x.src));
  ok(pylon.length === 1, 'exactly one relay pylon', `${pylon.length}`);
  ok(beacon.length === 1, 'exactly one beacon-top', `${beacon.length}`);
  const roofs = d.decorations.filter(x => /night-city-buildings\//.test(x.src));
  ok(roofs.length === 2, 'two roof buildings (one for the pylon, one taller one for the beacon)', `${roofs.length}`);
  const tallRoof = roofs.find(r => Math.abs(r.x - beacon[0].x) < 50);
  ok(!!tallRoof && beacon[0].y + beacon[0].h === tallRoof.y, 'the beacon sits flush on its roof (no float, no sink)',
    tallRoof ? `beacon bottom ${beacon[0].y + beacon[0].h}, roof top ${tallRoof.y}` : 'no matching roof');
}

sec('THE LIGHT-CABLE CLIMB HAS THE CORRECTED CORNER ROTATION');
{
  const cables = d.decorations.filter(x => /light-cable\//.test(x.src));
  ok(cables.length === 13, 'the climb is placed (3 straight-v + 1 corner + 9 straight-h)', `${cables.length}`);
  const corner = cables.find(x => /cable_corner/.test(x.src));
  ok(!!corner && corner.rotation === 180, 'the corner uses the CORRECTED South<->East rotation (180, not 90)', corner ? `rotation ${corner.rotation}` : 'missing');
  const vs = cables.filter(x => /cable_straight_v/.test(x.src)).sort((a, b) => b.y - a.y);
  const hs = cables.filter(x => /cable_straight_h/.test(x.src)).sort((a, b) => a.x - b.x);
  // the climb must be contiguous: each vertical piece directly above the last, the corner directly above the
  // topmost vertical, and the horizontal run starting directly beside the corner with no gaps.
  ok(vs.every((v, i) => i === 0 || vs[i - 1].y - v.y === 32), 'the vertical pieces stack with no gaps', vs.map(v => v.y).join(','));
  ok(corner.y === vs[vs.length - 1].y - 32, 'the corner sits directly above the topmost vertical piece');
  ok(hs[0].x === corner.x + 32 && hs[0].y === corner.y, 'the horizontal run starts directly beside the corner, same row');
  ok(hs.every((h, i) => i === 0 || h.x - hs[i - 1].x === 32), 'the horizontal run has no gaps', hs.map(h => h.x).join(','));
  const beacon = d.decorations.find(x => /beacon-top\/beacon_top\.png$/.test(x.src));
  ok(hs[hs.length - 1].x + 32 > beacon.x, 'the run reaches the beacon side', `last h right edge ${hs[hs.length - 1].x + 32}, beacon x ${beacon.x}`);
}

sec('THE LEVEL LOADS AND IS PLAYABLE (ENGINE, NOT JUST JSON)');
{
  const lv = new Level(d);
  const p = new Player(d.playerStart.x, d.playerStart.y);
  for (let i = 0; i < 30; i++) step(p, lv);
  ok(p.grounded, 'the hero stands on the floor at spawn (no fall-through)', `y ${p.y.toFixed(1)}`);
  const gate = lv.gates.find(g => g.isExit);
  ok(!!gate, 'there is an exit gate');
  const src = lv.sources[0];
  ok(!!src, 'there is a source to charge', src ? `charge ${src.charge}` : '');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
