import assert from 'node:assert/strict';
import fs from 'node:fs';
import { facadeAction } from '../editor/facade.js';
import { Player, Level, held, step } from './support/headless.mjs';
const path='src_scroll/levels/level1.json';
const def=JSON.parse(fs.readFileSync(path,'utf8'));
const manifest=JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json','utf8'));
const {tileAssetIdFor}=await import('../editor/state.js');
const fixture={cols:2,tiles:[42,43,45,46],tileRotations:[0,90,180,270],tileFlips:[0,1,0,1]};
const fixtureBefore=JSON.stringify(fixture);
const unit=facadeAction(fixture,[{col:0,row:0,path:'a.png'},{col:1,row:0,path:'b.png'},{col:0,row:1,path:'c.png'},{col:1,row:1,path:'d.png'}]);
unit.forward();assert.deepEqual(fixture.tiles,[2,2,0,0]);
assert.equal(fixture.decorations[1].rotation,90);assert.equal(fixture.decorations[1].flipX,true);
const fixtureAfter=JSON.stringify(fixture);unit.inverse();assert.equal(JSON.stringify(fixture),fixtureBefore);
unit.forward();assert.equal(JSON.stringify(fixture),fixtureAfter);
const cells=[];
for(let row=12;row<=14;row++)for(let col=67;col<=75;col++){
  const asset=manifest.assets.find(a=>a.id===tileAssetIdFor(def.tiles[row*def.cols+col]));
  cells.push({row,col,path:asset?.path});
}
const original=JSON.stringify(def);
const action=facadeAction(def,cells);
if(action){action.forward();const converted=JSON.stringify(def);action.inverse();assert.equal(JSON.stringify(def),original);action.forward();assert.equal(JSON.stringify(def),converted);}
const level=new Level({...def,enemies:[]});
const p=new Player(66*32,480-30);p.grounded=true;
held(['ArrowRight']);for(let i=0;i<290;i++)step(p,level);held([]);
assert.ok(p.x>76*32,'walks in front of the whole new structure');
assert.equal(p.y+p.h,480,'supported by the actual lower rooftop');
const upper=new Player(76*32,480-30);upper.grounded=true;
held(['ArrowLeft','ArrowUp']);step(upper,level);held(['ArrowLeft']);
for(let i=0;i<110;i++)step(upper,level);held([]);
assert.ok(upper.x<76*32 && upper.x>67*32);
assert.equal(upper.y+upper.h,384,'lands on the structure roof');
assert.deepEqual(def.gates,JSON.parse(original).gates);
assert.equal(level.complete,false);
if(process.argv.includes('--apply'))fs.writeFileSync(path,JSON.stringify(def,null,2)+'\n');
console.log('PASS: facade conversion undo/redo, lower route, top landing, gate preservation');
