// O10 + O9 + ORCHA 12/14/18 — DRONE SENSING, LINE OF SIGHT, ALERT TELL, AIMED BLAST
//
// Every assertion reads SHIPPED level JSON from disk, and the behavioural ones are
// driven through Level.update(dt, player) — NOT by calling DroneEnemy directly.
// ORCHA 18: "if it only passes at the class level it does not count." The drone bug
// that cost two playtests was level.js dropping an argument while every class-level
// test still passed.
globalThis.window = { addEventListener(){}, removeEventListener(){}, innerWidth:1920, innerHeight:1080, location:{search:''} };
globalThis.document = { getElementById:()=>null, addEventListener(){}, removeEventListener(){},
  createElement:()=>({ getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}), style:{} }), body:{style:{}} };
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=40; this.naturalHeight=36; this.src=''; } addEventListener(){} };
import fs from 'fs';
const ENT = await import('../src_scroll/entities.js');
const { Level } = await import('../src_scroll/level.js');
const { Player } = await import('../src_scroll/player.js');
const { PLAYER_H, PLAYER_W, TILE } = await import('../src_scroll/constants.js');
const C = ENT.DroneEnemy.CFG;

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

const manifest = JSON.parse(fs.readFileSync('src_scroll/levels/levels.json','utf8'));
const droneLevels = [];
for (const e of (manifest.order||[])) {
  const file = e.file || e;
  const L = JSON.parse(fs.readFileSync('src_scroll/levels/'+file,'utf8'));
  for (const en of (L.enemies||[])) if (en.type==='drone') droneLevels.push({ file, def:L, drone:en });
}

// Stand a real Player on the ground directly under/near a world x.
// The MAIN FLOOR at a column: the bottom-most solid row that has open space above
// it. Scanning from r0 down finds the first CEILING instead — my first version did
// exactly that and stood the player on the r8 platform ABOVE the drone, which made
// four assertions fail against correct code and one pass for the wrong reason.
function floorSurfaceAt(def, x) {
  const cols = def.cols, sol = v => v===1 || v>=10;
  const col = Math.floor(x / TILE);
  for (let r=17; r>=1; r--) if (sol(def.tiles[r*cols+col]) && !sol(def.tiles[(r-1)*cols+col])) return r*TILE;
  return null;
}
function groundedPlayerAt(def, x) {
  const surf = floorSurfaceAt(def, x);
  if (surf === null) return null;
  const p = new Player(x, surf - PLAYER_H);
  p.setEnergyState(5, 0);
  return p;
}

sec('O10 — the dial, and the relationship that must hold');
ok(C.visionX !== undefined && C.visionY !== undefined, 'visionX / visionY both exist', `${C.visionX} / ${C.visionY}`);
ok(C.VISION === undefined, 'the old symmetric radius is gone');
ok(C.FIRE_ARC >= C.visionY,
  'FIRE_ARC >= visionY, so anything it can SEE it can SHOOT',
  `FIRE_ARC ${C.FIRE_ARC} >= visionY ${C.visionY} — the reverse shipped once and the drone fired nothing`);
ok(C.visionX <= 128, 'visionX is narrow, per Chief\u2019s "2 tiles"', `${C.visionX}px = ${C.visionX/TILE} tiles`);

sec('O10 — LINE OF SIGHT: terrain between them breaks sight');
ok(typeof ENT.DroneEnemy.prototype._hasLineOfSight === 'function', 'a line-of-sight check exists at all');
for (const { file, def, drone } of droneLevels) {
  const lv = new Level(def);
  const d  = lv.enemies.find(e => e instanceof ENT.DroneEnemy);
  // A player directly below with SOLID FLOOR between: must NOT be seen. Built by
  // finding a real solid tile under the drone rather than by assuming one.
  const cols = def.cols, sol = v => v===1 || v>=10;
  const dcol = Math.floor(d.cx / TILE);
  let blockRow = null;
  for (let r = Math.floor(d.cy/TILE)+1; r<18; r++) if (sol(def.tiles[r*cols+dcol])) { blockRow = r; break; }
  if (blockRow !== null) {
    const below = { cx: d.cx, cy: (blockRow+2)*TILE, x:d.cx-10, y:(blockRow+2)*TILE-15, w:20, h:30 };
    const sepOK = Math.abs(below.cy - d.cy) < C.visionY;
    ok(!d._sees(below, lv),
      `${file}: a player behind a SOLID TILE is NOT seen`,
      `blocker at r${blockRow}; within visionY? ${sepOK} — NOTE: distance alone also rejects this pair; LOS is proven by the synthetic case, not here`);
    ok(d._sees(below, null) || !sepOK,
      `${file}: and with no level supplied it fails OPEN (back-compat)`,
      'a caller without terrain behaves as before rather than going blind');
  }
  // Clear sight: same elevation, nothing between.
  const near = { cx: d.cx + 20, cy: d.cy, x: d.cx+10, y: d.cy-15, w:20, h:30 };
  ok(d._sees(near, lv), `${file}: a player 20px away at the same elevation IS seen`, 'clear line, no blocker');
}

sec('O10 — LOS exercised for REAL: within visionX AND visionY, but terrain between');
{
  // The shipped-level "behind a solid tile" case above is rejected by DISTANCE before
  // line-of-sight is ever consulted, so it proves nothing about LOS. Both LOS
  // mutations passed against it, which is how I found out. A purpose-built geometry
  // is required because Level 3 contains no blocked pair inside a 96px visionY.
  // Synthetic on purpose, and labelled so.
  const ROWS=18, COLS=20;
  const tiles=new Array(COLS*ROWS).fill(0);
  for(let x=0;x<COLS;x++) tiles[16*COLS+x]=10;      // main floor, surface y=512
  for(let x=4;x<=8;x++)  tiles[14*COLS+x]=10;       // a SLAB at y 448..480
  const def={ name:'LOS TEST', number:97, cols:COLS, tiles, playerStart:{x:160,y:482},
    sources:[], gates:[], switches:[], checkpoints:[], platforms:[], decorations:[],
    enemies:[{ id:'d', type:'drone', x:176, y:412, patrolLeft:160, patrolRight:200, speed:0 }] };
  const lv=new Level(def);
  const d=lv.enemies.find(e=>e instanceof ENT.DroneEnemy);
  const p=new Player(176, 512-PLAYER_H);
  const sepY=Math.abs(p.cy-d.cy), sepX=Math.abs(p.cx-d.cx);
  ok(sepX < C.visionX, 'SETUP: the pair is inside visionX', sepX.toFixed(0)+' < '+C.visionX);
  ok(sepY < C.visionY, 'SETUP: inside visionY too, so distance CANNOT be the reason', sepY.toFixed(0)+' < '+C.visionY);
  ok(!d._sees(p, lv),
    'a slab between them blocks sight even though BOTH axes are in range',
    'THIS is the assertion the LOS mutations must break');
  for(let x=4;x<=8;x++) lv.tiles[14*COLS+x]=0;
  ok(d._sees(p, lv), 'with the slab gone the identical pair IS seen', 'so the terrain was the only thing blocking');
  for(let x=4;x<=8;x++) lv.tiles[14*COLS+x]=2;
  ok(d._sees(p, lv), 'a tile-2 one-way platform does NOT block sight', 'you can see through what you can jump into');
}
sec('O10 — the drone patrols AT player elevation, or a narrow sensor is pointless');
for (const { file, def, drone } of droneLevels) {
  const cols = def.cols, sol = v => v===1 || v>=10;
  const col = Math.floor(drone.x / TILE);
  const surf = floorSurfaceAt(def, drone.x);   // MAIN FLOOR, not the first ceiling
  const playerCy = surf - PLAYER_H/2;
  const droneCy  = drone.y + 18;
  ok(Math.abs(playerCy - droneCy) < C.visionY,
    `${file}: a grounded player is INSIDE visionY of the drone`,
    `player cy ${playerCy}, drone cy ${droneCy}, separation ${Math.abs(playerCy-droneCy)} < ${C.visionY}`);
  // and the drone must not be embedded in terrain anywhere along its patrol
  let clash = false;
  for (let c=Math.floor(drone.patrolLeft/TILE); c<=Math.floor(drone.patrolRight/TILE); c++)
    for (let r=Math.floor(drone.y/TILE); r<=Math.floor((drone.y+36)/TILE); r++) if (sol(def.tiles[r*cols+c])) clash = true;
  ok(!clash, `${file}: the drone body never overlaps terrain along its patrol`);
}

sec('Driven through Level.update: aggro, telegraph, then a hit');
for (const { file, def, drone } of droneLevels) {
  const lv = new Level(def);
  const d  = lv.enemies.find(e => e instanceof ENT.DroneEnemy);
  const p  = groundedPlayerAt(def, d.cx);          // stand him under the drone
  ok(!!p, `${file}: a grounded player position exists at the drone column`);
  if (!p) continue;
  const seq=[]; let engagedAt=-1, firstShot=-1;
  let stunned=0;
  const origStun = p.stun.bind(p);
  p.stun = (...a) => { stunned++; return origStun(...a); };
  for (let i=0;i<420;i++) {
    lv.update(1/60, p);
    const st = d.alertState;
    if (seq[seq.length-1] !== st) seq.push(st);
    if (st==='engaged' && engagedAt<0) engagedAt=i;
    if ((d._blasts||[]).length && firstShot<0) firstShot=i;
  }
  ok(seq.includes('alert'), `${file}: LEVEL.update wires a player through and the drone ALERTS`, `sequence: ${seq.join(' -> ')}`);
  ok(engagedAt>0 && firstShot>=engagedAt, `${file}: no blast before the telegraph elapsed`, `engaged f${engagedAt}, first blast f${firstShot}`);
  ok(stunned>0, `${file}: and a blast actually connects with the grounded player`, `${stunned} stun(s) landed`);
}

sec('Level 3\u2019s ORIGINAL bug must stay dead: no sight through the floor from above');
for (const { file, def, drone } of droneLevels) {
  const lv = new Level(def);
  const d  = lv.enemies.find(e => e instanceof ENT.DroneEnemy);
  // Put the drone back where it used to be and confirm it can no longer see down.
  d.y = 200; d._baseY = 200;
  const p = groundedPlayerAt(def, d.cx);
  if (!p) continue;
  ok(!d._sees(p, lv),
    `${file}: a drone at the OLD y=200 cannot see the grounded player`,
    `separation ${Math.abs(p.cy - d.cy).toFixed(0)}px, and terrain is between them`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);