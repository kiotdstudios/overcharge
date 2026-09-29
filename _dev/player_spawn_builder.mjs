import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Player, flat} from './support/headless.mjs';
globalThis.sessionStorage={getItem:()=>null,setItem(){}};
const {state}=await import('../editor/state.js');
const Tools=await import('../editor/tools.js');
const History=await import('../editor/history.js');
let count=0;
function check(c,m){assert.ok(c,m);count++;}
const level=flat();
state.level={cols:level.cols,tiles:level.tiles,playerStart:{x:64,y:390}};
const previous=state.level.playerStart;
check(Tools.placeAssetAt({id:'player_spawn',category:'player'},95,390),'palette placement succeeds');
check(state.level.playerStart.x===96 && state.level.playerStart.y+30===448,'spawn lands on the roof at snapped X');
History.undo();check(state.level.playerStart===previous,'undo restores previous spawn');
History.redo();check(state.level.playerStart.y===418,'redo restores grounded spawn');
const spawn=state.level.playerStart;spawn.x=123;spawn.y=385;
Tools.__testReanchor(new Map([[spawn,{x:123,y:385}]]));
check(spawn.x===128 && spawn.y+30===448,'drag grounds existing spawn');
// An edge click snaps into the next column: support must use the final X.
state.level.tiles=Array.from({length:40*18},(_,i)=>Math.floor(i/40)>=14 && i%40===4?16:0);
check(Tools.placeAssetAt({id:'player_spawn',category:'player'},119,390),'edge placement succeeds');
check(state.level.playerStart.x===128 && state.level.playerStart.y===418,'support is checked beneath snapped player centre');
const saved=JSON.parse(fs.readFileSync('src_scroll/levels/level1.json','utf8'));
const p=new Player(saved.playerStart.x,saved.playerStart.y);
check(p.y+p.h===480,'NEON RISE spawn feet sit on rooftop surface');
check(saved.tiles[15*saved.cols+Math.floor(p.cx/32)]>=10,'roof supports saved spawn');
console.log(`RESULTS: ${count} passed, 0 failed`);
