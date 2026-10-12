import fs from 'node:fs';
import { Npc, drawSpeechBubble } from '../src_scroll/npc.js';
import { loadDecoAnimations } from '../src_scroll/deco-anim.js';

const manifest = JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json', 'utf8'));
const level = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
const def = level.npcs.find(npc => npc.id === 'NPC_STREETLAMP_01');
const npc = new Npc(def);
function check(value, label) {
  if (!value) throw new Error(label);
  console.log(`✓ ${label}`);
}
check(!!def && def.walkAssetId === 'npc_streetlamp_woman_walk', 'Level 1 NPC uses the new walk art');
for (const [id, count] of [[def.assetId,4],[def.greetingAssetId,4],[def.walkAssetId,6]]) {
  const asset = manifest.assets.find(entry => entry.id === id);
  check(asset?.frame_count === count, `${id} has ${count} registered frames`);
  for (let i=0; i<count; i++) {
    const path = asset.path.replace(/00\.png$/, `${String(i).padStart(2,'0')}.png`);
    const png = fs.readFileSync(path);
    check(png.readUInt32BE(16) === 236 && png.readUInt32BE(20) === 236, `${id} frame ${i} is 236×236`);
  }
}
const start = npc.x;
npc.update(0.5, null);
check(npc.x < start && npc._walking && npc.facing === 'left', 'NPC starts walking left');
for (let i=0; i<100; i++) npc.update(0.1, null);
check(npc.x >= start-32 && npc.x <= start+32, 'NPC stays inside authored patrol bounds');
check(npc.facing === 'left' || npc.facing === 'right', 'NPC turns at route ends');
npc._bubbleT = 500;
const holdX = npc.x;
npc.update(0.1, null);
check(npc.x === holdX && !npc._walking, 'dialogue pauses the strut');
const cols = level.cols;
check([1708,1740,1772].every(x => level.tiles[10*cols+Math.floor(x/32)] === 2),
  'entire patrol sits above existing Level 1 rooftop ground');

globalThis.Image = class {
  complete = true;
  naturalWidth = 236;
  naturalHeight = 236;
};
globalThis.fetch = async () => ({ok:true,json:async () => manifest});
await loadDecoAnimations();
npc._bubbleT = 0; npc._greetT = 0; npc._turnPauseT = 0;
npc.update(0.1, null);
check(npc._currentFrame()?.src.includes('/walk/'), 'moving NPC renders the walk animation');
npc.previewBubble('hello');
check(npc._currentFrame()?.src.includes('/greeting/'), 'dialogue renders the matching greeting animation');
npc._bubbleT = 0; npc._greetT = 0; npc._walking = false;
check(npc._currentFrame()?.src.includes('/idle/'), 'stationary NPC renders the matching idle animation');
const smooth = manifest.assets.find(entry => entry.id === def.walkAssetId);
check(smooth.frameOrder.length === 8 && smooth.walkFrameStepPx === 3, 'walk cycle uses eight distance-paced poses');
const paced = new Npc(def);
paced._resolveSprites();
const sampled=[];
for(let i=0;i<8;i++){
  paced._walkDistance=i*3;
  paced._walking=true;
  sampled.push(paced._currentFrame()?.src.match(/(\d\d)\.png$/)?.[1]);
}
check(sampled.join(',') === '00,01,02,04,03,04,02,01', 'walk frames flow through contact and back without repeated wide-stance seam');
const oldDistance=paced._walkDistance;
paced._walking=false;
paced._bubbleT=500;
paced.update(0.25,null);
check(paced._walkDistance===oldDistance, 'walk phase does not advance while planted');
const textCalls=[];
const ctx={textAlign:'right',save(){},restore(){},measureText(s){return {width:s.length*7};},
  beginPath(){},rect(){},fill(){},stroke(){},moveTo(){},lineTo(){},closePath(){},
  fillText(s,x,y){textCalls.push({s,x,y,align:this.textAlign});}};
drawSpeechBubble(ctx,1740,250,"Mmm, look who's got a little spark.",{x:1500,y:156,w:600,h:420});
check(textCalls.length===2 && textCalls.every(c=>c.align==='left'), 'bubble text stays left-aligned inside its border');
