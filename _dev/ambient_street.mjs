import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
globalThis.Image=class {complete=true;naturalWidth=128;set src(value){this._src=value;}};
const {PlayerSprites}=await import('../src_scroll/hero-sprites.js');
const {StreetLitter,exposedRoof}=await import('../src_scroll/street-litter.js');
const def=require('../src_scroll/levels/level1.json');
const level={cols:def.cols,rows:def.tiles.length/def.cols,pxW:def.cols*32,
  tileAt(tx,ty){return tx<0||tx>=this.cols||ty<0?1:(def.tiles[ty*this.cols+tx]||0);},
  solidAt(tx,ty){const v=this.tileAt(tx,ty);return v===1||v>=10;}};
const sprites=new PlayerSprites();
function countSteps(run){let count=0;for(let i=0;i<180;i++){
  sprites.update(1/60,true,true,false,run,false,false,run?160:75);
  if(sprites.footfall)count++;
}return count;}
const walking=countSteps(false),running=countSteps(true);
assert(walking>0,'walking should emit footfalls');
assert(running>walking,`running cadence ${running} should exceed walking ${walking}`);
sprites.update(1/60,false,true,false,false,false,false,0);
assert.equal(sprites.footfall,false,'idle is silent');
assert(exposedRoof(level,54,10),'fixture rooftop is exposed');
const litter=new StreetLitter();
litter.pieces=[{x:1740,y:320,row:10,direction:1,speed:20,age:0,kind:0,phase:0,done:false}];
litter.nextSpawn=999;
litter.update(.5,level,{x:1740},800);
assert.equal(litter.pieces[0].y,320,'litter stays grounded');
assert.equal(litter.pieces[0].x,1750,'litter moves across rooftop');
console.log(`Ambient street: ${walking} walk steps, ${running} run steps / 3s; grounded litter passed`);
