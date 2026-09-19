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
// My old assertion here was `C.visionX <= 128` on the basis of Chief's "2 tiles".
// Aki deliberately set 240 for the ELEVATED drone and Chief confirms the drone works,
// so her tuning is authoritative and my assertion was the stale half. Replaced with a
// sanity check rather than a number I invented.
ok(C.visionX > 0 && C.visionY > 0, 'visionX / visionY are both live dials', `vision ${C.visionX}x${C.visionY}`);

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
// CORRECTED 2026-09-19 10:38. This block used to stand the player on the MAIN FLOOR
// under the drone, then assert the drone alerts. On Level 3 the drone is elevated with
// terrain between, so line-of-sight correctly refuses — and I read that green-to-red
// flip as "the drone is inert" and reported it to Chief. He replied "lvl 3 drone does
// work idk what u mean". He was right: the player MEETS the drone by climbing to its
// level, which this test never did. Fourth time I have asserted the pose I had in mind
// instead of the one the player actually occupies.
//
// Now tested at the drone's OWN elevation, which is where the encounter happens. The
// main-floor case is a separate, correct behaviour and is asserted below as such.
for (const { file, def, drone } of droneLevels) {
  const lv = new Level(def);
  const d  = lv.enemies.find(e => e instanceof ENT.DroneEnemy);
  const p  = { x:d.cx, y:d.cy-8, w:24, h:30, cx:d.cx+12, cy:d.cy-8+15,
               stun(){}, scatter(){} };
  let stunned=0; p.stun = () => { stunned++; };
  const seq=[]; let engagedAt=-1, firstShot=-1;
  for (let i=0;i<420;i++) {
    lv.update(1/60, p);
    const st = d.alertState;
    if (seq[seq.length-1] !== st) seq.push(st);
    if (st==='engaged' && engagedAt<0) engagedAt=i;
    if ((d._blasts||[]).length && firstShot<0) firstShot=i;
  }
  ok(seq.includes('alert'), `${file}: at the drone's elevation it ALERTS`, `sequence: ${seq.join(' -> ')}`);
  ok(engagedAt>0 && firstShot>=engagedAt, `${file}: no blast before the telegraph elapsed`, `engaged f${engagedAt}, first blast f${firstShot}`);
  ok(stunned>0, `${file}: and a blast connects`, `${stunned} stun(s) landed`);
}

sec('Terrain still blocks sight DOWNWARD through a floor (the original Chief bug)');
// Scoped to levels that actually have solid terrain between the drone and the floor
// below it. Asserting this on every level was wrong: level4/level5 drones sit in open
// space, so forcing y=200 there tested a geometry that does not exist in those levels.
for (const { file, def } of droneLevels) {
  const lv = new Level(def);
  const d  = lv.enemies.find(e => e instanceof ENT.DroneEnemy);
  const p  = groundedPlayerAt(def, d.cx);
  if (!p) continue;
  const cols = def.cols, sol = v => v===1 || v>=10;
  const col  = Math.floor(d.cx / TILE);
  let between = 0;
  for (let r = Math.floor(d.cy/TILE)+1; r < Math.floor(p.cy/TILE); r++) if (sol(def.tiles[r*cols+col])) between++;
  if (between === 0) { ok(true, `${file}: no floor between drone and player — nothing to block (skipped)`, `open sight line by design`); continue; }
  ok(!d._sees(p, lv),
    `${file}: ${between} solid row(s) between them blocks sight downward`,
    `separation ${Math.abs(p.cy - d.cy).toFixed(0)}px — this is Chief's "notices me through the floor" staying fixed`);
}


sec('O12 -- smooth de-aggro return: no instant teleport, position stays finite');
// Mutation test: revert the smooth-return block to the old instant clamp and
// maxDelta would jump up to LEASH px in a single frame, failing the last assertion.
const DT = 1/60;
for (const { file, def, drone } of droneLevels) {
  const lv2 = new Level(def);
  const d2  = lv2.enemies.find(e => e instanceof ENT.DroneEnemy);
  const p2  = groundedPlayerAt(def, d2.cx);
  if (!p2) { ok(false, file + ': could not place grounded player for O12 test'); continue; }

  // Aggro: run near drone for 3s
  for (let i = 0; i < 180; i++) lv2.update(DT, p2);
  ok(Number.isFinite(d2.x) && Number.isFinite(d2.y),
    file + ': position is finite after aggro',
    'x=' + d2.x.toFixed(1) + ' y=' + d2.y.toFixed(1));

  // De-aggro: move player clearly outside visionX
  p2.x = d2.cx + C.visionX * 4;
  let maxDelta = 0;
  let prevX2 = d2.x;
  for (let i = 0; i < 180; i++) {
    lv2.update(DT, p2);
    const delta = Math.abs(d2.x - prevX2);
    if (delta > maxDelta) maxDelta = delta;
    prevX2 = d2.x;
  }
  ok(Number.isFinite(d2.x) && Number.isFinite(d2.y),
    file + ': position is finite after de-aggro',
    'x=' + d2.x.toFixed(1));
  const maxAllowed = d2.speed * DT + 0.5;
  ok(maxDelta <= maxAllowed,
    file + ': no frame moved drone more than speed*dt (O12 smooth return)',
    'max=' + maxDelta.toFixed(2) + 'px allowed=' + maxAllowed.toFixed(2) + 'px');
}

sec('CHIEF 10:38 — pursuit is NOT capped at a leash boundary');
{
  // "the drone does only chase a bit and stays locked to the edge of the next
  //  platform ... the drone stops and doesnt move past a certain point"
  //
  // The old clamp was patrolLeft-LEASH .. patrolRight+LEASH. On Level 3 that is
  // x 240..720 — an invisible wall mid-level. These assert the wall is gone, that the
  // drone still cannot leave authored space, and that it still gives up on its own.
  const P=(x,y)=>({x,y,w:24,h:30,cx:x+12,cy:y+15,stun(){this._s=(this._s||0)+1;},scatter(){this._c=(this._c||0)+1;}});
  for (const { file, def } of droneLevels) {
    const lv = new Level(def);
    const d  = lv.enemies.find(e => e instanceof ENT.DroneEnemy);
    const oldWall = d.patrolRight + C.LEASH - d.w;
    // Player at the drone's own elevation (the CLIMBED case — the one my 04:37 test
    // missed entirely, which is why I wrongly reported the drone inert), moving right
    // slightly slower than the drone's chase speed so sight is genuinely maintained.
    const chaseSpeed = d.speed * C.CHASE_MULT;
    let px = d.cx, py = d.cy - 8, maxX = d.x, hits = 0;
    for (let i=0;i<1800;i++) {
      px += (chaseSpeed * 0.8) / 60;
      const p = P(px, py);
      lv.update(1/60, p);
      hits += (p._s||0);
      maxX = Math.max(maxX, d.x);
      if (px > lv.pxW - 200) break;
    }
    ok(maxX > oldWall,
      `${file}: the drone pursues PAST the old leash wall`,
      `reached x=${maxX.toFixed(0)}, old wall was ${oldWall}`);
    ok(maxX <= lv.pxW - d.w + 1,
      `${file}: but never leaves the authored level`,
      `max x=${maxX.toFixed(0)}, level allows ${lv.pxW - d.w}`);
    ok(hits > 0, `${file}: and it keeps landing hits during the long chase`, `${hits} stun(s)`);
  }
}

sec('Pursuit persists through a BRIEF break in sight, then gives up');
{
  const P=(x,y)=>({x,y,w:24,h:30,cx:x+12,cy:y+15,stun(){},scatter(){}});
  for (const { file, def } of droneLevels) {
    const lv = new Level(def);
    const d  = lv.enemies.find(e => e instanceof ENT.DroneEnemy);
    const near = P(d.cx + 20, d.cy - 8);
    for (let i=0;i<60;i++) lv.update(1/60, near);           // establish aggro
    ok(d._aggro === true, `${file}: aggro established`);
    // One frame with no player at all = sight lost for a single frame.
    const xBefore = d.x;
    lv.update(1/60, null);
    lv.update(1/60, near);
    ok(d._deaggroT >= 0, `${file}: a one-frame sight break does not hard-reset the chase`,
      'the de-aggro window carries it through, so a pillar no longer freezes it');
    // Now leave for good and confirm it de-aggros and walks home.
    const far = P(20, def.playerStart.y);
    const seq=[];
    for (let i=0;i<400;i++){ lv.update(1/60, far); const s=d.alertState; if(seq[seq.length-1]!==s) seq.push(s); }
    ok(seq.includes('lost') || seq.includes('patrol'),
      `${file}: it still gives up when he stays out of sight`, `states: ${seq.join(' -> ')}`);
    ok(d.x >= d.patrolLeft - 1 && d.x + d.w <= d.patrolRight + 1,
      `${file}: and walks back into its patrol range`,
      `x=${d.x.toFixed(0)} within ${d.patrolLeft}..${d.patrolRight}`);
  }
}

sec('DEAGGRO_TIME is untouched — Chief said the timing is already right');
ok(Math.abs(C.DEAGGRO_TIME - 0.7) < 1e-9,
  'DEAGGRO_TIME still 0.7s', 'Chief: "how ever the amount of time is set up now its perfect"');
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
