// CHECKPOINT ACTIVATION — CHIEF 2026-09-20 03:54
// "im hitting the checkpoint on lvl 6 without even touching it; checkpoint logic needs to
//  change to player must run past checkpoint to activate it"
//
// There was NO suite for checkpoints at all, which is why an X-only trigger survived into
// a vertical level. Drives the real Checkpoint class and the real Player.
globalThis.window={addEventListener(){},removeEventListener(){},innerWidth:1600,innerHeight:900,location:{search:''}};
globalThis.document={getElementById:()=>null,addEventListener(){},removeEventListener(){},body:{style:{}},createElement:()=>({getContext:()=>null,style:{}})};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=32;this.naturalHeight=32;}addEventListener(){}};
import fs from 'node:fs';
const { Level }  = await import('../src_scroll/level.js');
const { Player } = await import('../src_scroll/player.js');
const { Checkpoint } = await import('../src_scroll/entities.js');
const C = await import('../src_scroll/constants.js');

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);
// a player standing with feet exactly on `feetY`, centred on `cx`
const standing = (cx, feetY) => { const p = new Player(cx - C.PLAYER_W/2, feetY - C.PLAYER_H); p.grounded = true; return p; };

sec('REGRESSION: every shipped checkpoint still activates when you stand on it');
{
  for (const n of [1,2,3,4,5,6]) {
    const path = `src_scroll/levels/level${n}.json`;
    if (!fs.existsSync(path)) continue;
    const def = JSON.parse(fs.readFileSync(path,'utf8'));
    if (!def.checkpoints || !def.checkpoints.length) continue;
    const lv = new Level(def);
    lv.checkpoints.forEach((cp, i) => {
      ok(cp.tryActivate(standing(cp.x, cp.y)),
        `level${n} cp[${i}] activates when the player stands at it`,
        `flag (${cp.x},${cp.y})`);
    });
  }
}

sec('THE BUG: a player on ANOTHER FLOOR in the same column must not trigger it');
{
  // Chief's level6 flag is at (640,576) on roof row 18. Six roofs share that column.
  const def = JSON.parse(fs.readFileSync('src_scroll/levels/level6.json','utf8'));
  const cpDef = def.checkpoints[0];
  const otherFloors = [6,10,22,30,36].map(r => r*32);   // measured from level6's roofs
  for (const feet of otherFloors) {
    const lv = new Level(def);
    ok(!lv.checkpoints[0].tryActivate(standing(cpDef.x, feet)),
      `standing ${Math.abs(feet-cpDef.y)}px away vertically does NOT activate it`,
      `feet y=${feet} vs flag y=${cpDef.y}`);
  }
  const lv = new Level(def);
  ok(lv.checkpoints[0].tryActivate(standing(cpDef.x, cpDef.y)),
    'but standing on the flag\u2019s own floor DOES',
    'the fix must not make it unreachable');
}

sec('Tolerance is real slack, not a hair trigger');
{
  const cp = new Checkpoint({ x: 500, y: 400 });
  for (const dy of [0, 8, -8, 20, -20]) {
    const c = new Checkpoint({ x: 500, y: 400 });
    ok(c.tryActivate(standing(500, 400 + dy)),
      `feet ${dy>=0?'+':''}${dy}px off the line still counts`,
      'uneven footing and landing jitter must not block a legitimate touch');
  }
  for (const dy of [64, -64, 128]) {
    const c = new Checkpoint({ x: 500, y: 400 });
    ok(!c.tryActivate(standing(500, 400 + dy)),
      `but ${Math.abs(dy)}px off does not`);
  }
}

sec('Horizontal rule and grounded rule both still hold');
{
  const far = new Checkpoint({ x: 500, y: 400 });
  ok(!far.tryActivate(standing(500 + 200, 400)), 'far away horizontally does not activate');
  const air = new Checkpoint({ x: 500, y: 400 });
  const p = standing(500, 400); p.grounded = false;
  ok(!air.tryActivate(p), 'airborne over the flag does not activate', 'Chief asked for "run past", so grounded stays required');
  const nul = new Checkpoint({ x: 500, y: 400 });
  ok(!nul.tryActivate(null), 'a null player does not throw or activate', 'level-complete and death frames tick with no player');
}

sec('Latching: it only ever fires once');
{
  const cp = new Checkpoint({ x: 500, y: 400 });
  ok(cp.tryActivate(standing(500,400)) === true, 'first touch returns true');
  ok(cp.tryActivate(standing(500,400)) === false, 'second touch returns false', 'so the snapshot is not retaken every frame');
  ok(cp.activated === true, 'and it stays activated');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);