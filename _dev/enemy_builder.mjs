// Integration contract: curated palette -> JSON -> runtime, dimensions and rewind.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Level, flat } from './support/headless.mjs';
import { SkySentry, WheelDrone } from '../src_scroll/city-drones.js';
globalThis.sessionStorage = { getItem:()=>null, setItem(){} };
const S = await import('../editor/state.js');
const Selection = await import('../editor/selection.js');
const Tools = await import('../editor/tools.js');
const History = await import('../editor/history.js');
const Actions = await import('../editor/actions.js');
let count = 0;
const check = (condition, label) => { assert.ok(condition, label); count++; };
globalThis.fetch = async url => {
  const file = String(url).split('?')[0];
  return { ok:fs.existsSync(file), json:async()=>JSON.parse(fs.readFileSync(file,'utf8')) };
};
await S.loadManifest();
S.setFilterCategory('enemy');
const entries = S.filteredManifestItems();
check(entries.length === 2, 'enemy category has exactly the two placeable entries');
check(entries.map(e=>e.name).sort().join('|') === 'Sky Sentry|Wheel Drone', 'readable enemy names');
S.setPurpleCityOnly(true);
check(S.filteredManifestItems().length === 2, 'enemies remain available with environment pack filter');
S.setPurpleCityOnly(false);
for (const item of entries) {
  const type = item.raw.spawnsKind;
  check(['sky-sentry','wheel-drone'].includes(type), `${type} enters entity spawn mode`);
  for (let i=0;i<8;i++) {
    const file = `assets/sprites/city-drones/${type}/frame_${String(i).padStart(3,'0')}.png`;
    const png = fs.readFileSync(file);
    check(png.readUInt32BE(16)===384 && png.readUInt32BE(20)===384, `${type} frame ${i} exists at declared dimensions`);
  }
  const def = { type, x:192, y:320, patrolLeft:128, patrolRight:384, speed:55 };
  const level = flat();
  S.state.level = {cols:level.cols,tiles:level.tiles,enemies:[],decorations:[]};
  History.clearAll();
  History.apply(Actions.addToArray(S.state.level.enemies, def, 'add_enemy'));
  check(S.state.level.enemies.length===1 && S.state.dirty, `${type} placement is tracked`);
  History.undo(); check(S.state.level.enemies.length===0, `${type} undo removes entity`);
  History.redo(); check(S.state.level.enemies.length===1, `${type} redo restores entity`);
  const saved = JSON.parse(JSON.stringify(S.state.level));
  const runtime = new Level(saved).enemies[0];
  check(runtime instanceof (type==='sky-sentry'?SkySentry:WheelDrone), `${type} JSON constructs correct runtime enemy`);
  const box = Selection.boundingRect('enemy',def);
  check(box.w===runtime.w && box.h===runtime.h, `${type} selection matches runtime collider`);
  Tools.__testReanchor(new Map([[def,{x:def.x,y:def.y}]]));
  check(type==='sky-sentry'?def.y===320:def.y+runtime.h===448, `${type} drag anchor floats or grounds correctly`);
}
const legacy = new Level({cols:40,tiles:flat().tiles,enemies:[{type:'drone',x:192,y:320,patrolLeft:128,patrolRight:384}]}).enemies[0];
check(legacy instanceof SkySentry, 'legacy authored drone is replaced by Sky Sentry');
const level=flat(),wheel=new WheelDrone({x:192,y:414,patrolLeft:128,patrolRight:384});
level.enemies=[wheel];wheel._plasma=[{x:250,y:400,vx:200,vy:0,life:1}];
const snap=level.snapshot();
wheel._plasma[0].x=999;
level.restore(snap);check(wheel._plasma[0].x===250, 'plasma snapshot detached from simulation');
wheel._plasma[0].x=555;
level.restore(snap);check(wheel._plasma[0].x===250, 'repeated plasma restore reuses pristine snapshot');
console.log(`RESULTS: ${count} passed, 0 failed`);
