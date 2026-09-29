import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Player, Level, held, step } from './support/headless.mjs';
const def = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json','utf8'));
const level = new Level({...def,enemies:[]});
const gate = level.gates.find(g=>g.isExit);
assert.equal(gate.x,1984); assert.equal(gate.y,256);
// Jump from the user's newly added right rooftop, then land on the gate roof.
const p = new Player(67*32,384-30);
p.grounded=true;
held(['ArrowLeft','ArrowUp']);step(p,level);
held(['ArrowLeft']);
for(let i=0;i<120;i++)step(p,level);
assert.ok(p.x<66*32 && p.x>49*32,'jump reaches the gate rooftop');
assert.equal(p.y+p.h,320,'lands and walks on its visible roof');
held([]);
// The same facade still allows exploration on the lower roof.
const low=new Player(49*32,512-30);low.grounded=true;
held(['ArrowRight']);for(let i=0;i<420;i++)step(low,level);
assert.ok(low.x>65*32,'lower route remains open');
assert.equal(low.y+low.h,512);
assert.equal(level.complete,false,'uncharged gate does not complete level');
held([]);
// One-way surface can be crossed upward, then supports descent.
const up=new Player(55*32,384-30);up.vy=-430;
held([]);
let highest=up.y+up.h;
for(let i=0;i<110;i++){step(up,level);highest=Math.min(highest,up.y+up.h);}
assert.ok(highest<320,'jump passes upward through roof');
assert.equal(up.y+up.h,320,'lands on roof after upward crossing');
console.log('PASS: jump approach, top landing, upward crossing, lower traversal, gate unchanged and charge required');
