// O9 + ORCHA 12/14 — DRONE SENSING, ALERT TELL, AIMED BLAST
//
// EVERY assertion here reads SHIPPED level JSON from disk. The vision bug shipped
// because my simulation placed the test player at the DRONE'S OWN HEIGHT — a fixture
// I chose, which could not fail. Kiro: "assert against shipped geometry, not a
// fixture you chose." So the geometry comes from level3.json, never from a literal.
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=40; this.naturalHeight=36; this.src=''; } addEventListener(){} };
import fs from 'fs';
const E = await import('../src_scroll/entities.js');
const C = E.DroneEnemy.CFG;

let pass = 0, fail = 0;
const ok = (c, m, d='') => { if (c) { pass++; console.log(`  \u2713 ${m}${d?' — '+d:''}`); } else { fail++; console.log(`  \u2717 ${m}${d?' — '+d:''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

const P = (x,y) => ({ x, y, w:24, h:32, cx:x+12, cy:y+16, stun(){this._s=(this._s||0)+1;}, scatter(){this._c=(this._c||0)+1;} });

// Every level that ships a drone, from the manifest.
const manifest = JSON.parse(fs.readFileSync('src_scroll/levels/levels.json','utf8'));
const withDrones = [];
for (const e of (manifest.order||[])) {
  const f = e.file || e;
  const L = JSON.parse(fs.readFileSync('src_scroll/levels/'+f,'utf8'));
  for (const en of (L.enemies||[])) if (en.type === 'drone') withDrones.push({ file:f, drone:en, spawn:L.playerStart });
}

sec('A drone must be able to SEE the grounded player in its own level');
ok(withDrones.length > 0, 'at least one shipped level has a drone (else this suite is vacuous)', `${withDrones.length} found`);
for (const { file, drone, spawn } of withDrones) {
  const d = new E.DroneEnemy(drone);
  // Player standing on the spawn's ground line, directly under the drone. This is
  // the case that was impossible with a circular radius.
  const under = P(drone.x, spawn.y);
  const sep = Math.abs(under.cy - (drone.y + 18));
  ok(d._sees(under),
    `${file}: drone sees the player ${Math.round(sep)}px below it`,
    `visionY=${C.visionY} must exceed ${Math.round(sep)}`);
  ok(C.visionY > sep, `${file}: visionY has headroom over the real separation`, `${C.visionY} > ${Math.round(sep)}`);
}

sec('...but must NOT aggro from off-screen');
for (const { file, drone, spawn } of withDrones) {
  const d = new E.DroneEnemy(drone);
  const atSpawn = P(spawn.x, spawn.y);
  const dx = Math.abs(atSpawn.cx - d.cx);
  // Only meaningful if the spawn is genuinely far away horizontally.
  if (dx > C.visionX) ok(!d._sees(atSpawn), `${file}: no aggro from the actual spawn`, `dx=${Math.round(dx)} > visionX=${C.visionX}`);
  else ok(true, `${file}: spawn is within visionX by design`, `dx=${Math.round(dx)}`);
}

sec('O9 — ALERT must precede the first shot');
for (const { file, drone, spawn } of withDrones) {
  const d = new E.DroneEnemy(drone);
  const near = P(drone.x, spawn.y);
  const seq = []; let firstShot = -1, engagedAt = -1;
  for (let i = 0; i < 240; i++) {
    d.update(1/60, {}, near);
    const st = d.alertState;
    if (seq[seq.length-1] !== st) seq.push(st);
    if (st === 'engaged' && engagedAt < 0) engagedAt = i;
    if ((d._blasts||[]).length && firstShot < 0) firstShot = i;
  }
  ok(seq[0] === 'alert', `${file}: first reaction to seeing the player is ALERT, not a shot`, `sequence: ${seq.join(' -> ')}`);
  ok(engagedAt > 0 && firstShot >= engagedAt,
    `${file}: no blast fired before the telegraph elapsed`, `engaged f${engagedAt}, first blast f${firstShot}`);
  ok(Math.abs(engagedAt - C.ALERT_TIME*60) <= 2,
    `${file}: telegraph lasts ALERT_TIME`, `measured ${engagedAt} frames, expected ${Math.round(C.ALERT_TIME*60)}`);
}

sec('The AIMED blast must actually connect across the real vertical drop');
for (const { file, drone, spawn } of withDrones) {
  const d = new E.DroneEnemy(drone);
  const p = P(drone.x, spawn.y);
  for (let i = 0; i < 400; i++) d.update(1/60, {}, p);
  ok((p._s||0) > 0 && (p._c||0) > 0,
    `${file}: a blast hits a player ${Math.round(Math.abs(p.cy-(drone.y+18)))}px below`,
    `stun=${p._s||0} scatter=${p._c||0} — routed through player.stun + player.scatter`);
  ok(C.FIRE_ARC > Math.abs(p.cy - (drone.y+18)),
    `${file}: FIRE_ARC covers the real separation (not just visionY)`,
    `FIRE_ARC=${C.FIRE_ARC} vs ${Math.round(Math.abs(p.cy-(drone.y+18)))}`);
}

sec('O9 — a distinct de-aggro tell when the player escapes');
for (const { file, drone, spawn } of withDrones) {
  const d = new E.DroneEnemy(drone);
  const near = P(drone.x, spawn.y);
  for (let i = 0; i < 80; i++) d.update(1/60, {}, near);
  const far = P(3000, spawn.y); const seq = [];
  for (let i = 0; i < 80; i++) { d.update(1/60, {}, far); const st = d.alertState; if (seq[seq.length-1] !== st) seq.push(st); }
  ok(seq.includes('lost'), `${file}: shows a LOST tell after the player escapes`, `sequence: ${seq.join(' -> ')}`);
  ok(seq[seq.length-1] === 'patrol', `${file}: and returns to patrol afterwards`, `ended: ${seq[seq.length-1]}`);
}

sec('Vision is DECOUPLED, not a radius');
ok(C.visionX !== undefined && C.visionY !== undefined, 'CFG exposes visionX and visionY', `${C.visionX} / ${C.visionY}`);
ok(C.VISION === undefined, 'the old symmetric CFG.VISION is gone', 'a radius is structurally wrong for a flying threat');
ok(C.visionY > C.visionX, 'vertical tolerance exceeds horizontal reach', `${C.visionY} > ${C.visionX} — drones fly, players walk`);

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);