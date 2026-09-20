// DOM shims: the integration section below imports Level and Player, which touch these.
globalThis.window={addEventListener(){},removeEventListener(){},innerWidth:1600,innerHeight:900,location:{search:''}};
globalThis.document={getElementById:()=>null,addEventListener(){},removeEventListener(){},body:{style:{}},createElement:()=>({getContext:()=>null,style:{}})};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=32;this.naturalHeight=32;}addEventListener(){}};// VERTICAL CAMERA — CHIEF RULING 2026-09-19 18:30 decision 3, "follow continuously".
// Drives src_scroll/camera.js directly, which is the SAME code main.js calls. Nothing
// here re-implements the deadzone.
import { nextCamY, maxCamY, camYForSpawn, CAM_DEADZONE_H } from '../src_scroll/camera.js';
import fs from 'fs';

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);
const VH = 578;                       // viewH()
const px = r => r * 32;

sec('REGRESSION GUARANTEE — every shipped level is unaffected');
{
  for (const n of [1,2,3,4,5]) {
    const def = JSON.parse(fs.readFileSync(`src_scroll/levels/level${n}.json`,'utf8'));
    const pxH = Math.floor(def.tiles.length/def.cols) * 32;
    ok(maxCamY(pxH, VH) === 0, `level${n} (${pxH}px) has zero scroll room`, `so camY is pinned`);
    // Walk the player over the full height; camY must never budge off 0.
    let cam = 0, moved = 0;
    for (let y=0; y<pxH; y+=4) { cam = nextCamY(cam, y, VH, pxH); if (cam !== 0) moved++; }
    ok(moved === 0, `and camY stays 0 across every player position on level${n}`, `${moved} frames non-zero`);
  }
}

sec('Continuous follow: the camera tracks the player DOWN a tall level');
{
  const pxH = px(36);                         // 1152px, exactly 2 screens
  const room = maxCamY(pxH, VH);
  ok(room === pxH - VH, 'scroll room is level height minus viewport', `${room}px`);
  let cam = 0;
  const samples = [];
  for (let y=0; y<=pxH; y+=8) { cam = nextCamY(cam, y, VH, pxH); samples.push({y, cam}); }
  ok(samples[0].cam === 0, 'at the very top the camera is at 0', 'nothing above to reveal');
  ok(samples[samples.length-1].cam === room, 'at the very bottom it is fully scrolled', `cam ${samples[samples.length-1].cam} = max ${room}`);
  // Monotonic: descending should never scroll the view back up.
  let regressions = 0;
  for (let i=1;i<samples.length;i++) if (samples[i].cam < samples[i-1].cam) regressions++;
  ok(regressions === 0, 'descending never jerks the camera upward', `${regressions} reversals over ${samples.length} samples`);
  // And the player is ON SCREEN the whole way down. This is the assertion that matters.
  let offScreen = [];
  for (const s of samples) { const sy = s.y - s.cam; if (sy < 0 || sy > VH) offScreen.push(s.y); }
  ok(offScreen.length === 0, 'the player is on screen at EVERY point of the descent',
    offScreen.length ? `off at y=${offScreen.slice(0,4)}` : `all ${samples.length} positions within 0..${VH}`);
}

sec('DEADZONE — a hop does not pan, but descending follows immediately');
{
  const pxH = px(36);
  // CORRECTED. My first version settled the camera from cam=0 with the player at 400,
  // which leaves him pinned EXACTLY at the bottom band edge (0px downward slack, 150px
  // upward). I then asserted symmetric free play, which cannot exist there, and called
  // the code broken. Measured before changing anything: the code was right, the
  // assertion was wrong. Testing the two real properties separately instead.
  const pcy = 700;

  // 1. CENTRED camera: symmetric slack, so jitter either way does not pan.
  const centred = pcy - VH / 2;
  let panned = 0;
  for (const dy of [-70, -50, -20, 0, 20, 50, 70]) if (nextCamY(centred, pcy + dy, VH, pxH) !== centred) panned++;
  ok(panned === 0,
    `with the player centred, jitter within +/-70px never pans`,
    `0 of 7 pans; the band gives ${CAM_DEADZONE_H/2}px of slack each way`);
  for (const dy of [-90, 90]) {
    ok(nextCamY(centred, pcy + dy, VH, pxH) !== centred,
      `but ${dy > 0 ? 'falling' : 'rising'} ${Math.abs(dy)}px past the band edge does pan`);
  }

  // 2. Settled from below, the player sits ON the bottom edge BY DESIGN. Upward hops are
  //    free, and any descent follows at once - which is the behaviour Chief asked for in a
  //    level you traverse downward.
  const settled = nextCamY(0, 400, VH, pxH);
  let upFree = 0;
  for (const dy of [-10, -40, -80, -140]) if (nextCamY(settled, 400 + dy, VH, pxH) === settled) upFree++;
  ok(upFree === 4, 'hopping UP to 140px from a settled descent never pans the view',
    `${upFree}/4 - so jumping does not shake the screen`);
  const down = nextCamY(settled, 420, VH, pxH);
  ok(down === settled + 20,
    'and descending 20px scrolls exactly 20px, no lag and no overshoot',
    `${settled} -> ${down}`);
}

sec('DECISION 4 — CLAMP at both ends, never reveal outside the level');
{
  const pxH = px(30);
  const room = maxCamY(pxH, VH);
  ok(nextCamY(0, -500, VH, pxH) === 0, 'a player above the ceiling cannot pull the view above 0');
  ok(nextCamY(room, pxH + 2000, VH, pxH) === room, 'a player far below cannot pull the view past the floor', `held at ${room}`);
  for (const y of [-1000, -1, 0, pxH/2, pxH, pxH+1000]) {
    const c = nextCamY(room/2, y, VH, pxH);
    ok(c >= 0 && c <= room, `camY stays in 0..${room} for player y=${y}`, `got ${c}`);
  }
}

sec('Levels SHORTER than the viewport clamp to 0 (decision 4, no letterbox)');
{
  for (const r of [6, 12, 17]) {
    const pxH = px(r);
    ok(maxCamY(pxH, VH) === 0, `a ${r}-row level (${pxH}px) has no scroll room`);
    ok(nextCamY(0, pxH, VH, pxH) === 0, `and camY stays 0 even with the player at its floor`);
  }
}

sec('Spawn seeding — the player is on screen on frame ONE, no snap');
{
  const pxH = px(40);
  const room = maxCamY(pxH, VH);
  // CHIEF 18:39: "i can just move the player being the spawn point to the top so player
  // can traverse down". So a TOP spawn is the real case.
  const topSpawn = 64;
  const cTop = camYForSpawn(topSpawn, pxH, VH);
  ok(cTop === 0, 'a spawn near the top seeds camY at 0', `cam ${cTop}`);
  ok(topSpawn - cTop >= 0 && topSpawn - cTop <= VH, 'and that spawn is on screen immediately', `screen y ${topSpawn - cTop}`);
  // A checkpoint respawn deep in the level.
  const deep = pxH - 200;
  const cDeep = camYForSpawn(deep, pxH, VH);
  ok(cDeep > 0 && cDeep <= room, 'a deep respawn seeds a scrolled camera', `cam ${cDeep} of max ${room}`);
  ok(deep - cDeep >= 0 && deep - cDeep <= VH, 'and that respawn is on screen immediately too', `screen y ${(deep-cDeep).toFixed(0)}`);
  // Seeded value must already be stable: one update must not jump it.
  const after = nextCamY(cDeep, deep, VH, pxH);
  ok(Math.abs(after - cDeep) < 1, 'the seeded camera is already settled, so no visible snap on frame 2',
    `${cDeep.toFixed(1)} -> ${after.toFixed(1)}`);
}

sec("CHIEF'S DESIGN — spawn at top, traverse down, floor stays the death plane");
{
  // "make the level builder add sections above only so that the current floor stays the
  //  bottom so if you fall you die; and i can just move the player being the spawn point
  //  to the top so player can traverse down"
  const ADDED = 18;                            // one extra screen added ABOVE
  const pxH = px(18 + ADDED);                  // 1152px
  const deathPlane = pxH + 60;                 // what main.js now uses
  ok(deathPlane > pxH, 'the death plane is BELOW the level floor, not the viewport bottom',
    `${deathPlane} vs old viewport-pinned ${VH + 60}`);
  ok(VH + 60 < pxH,
    'and the OLD boundary would have killed the player mid-level',
    `old plane ${VH+60} sits ${pxH - (VH+60)}px ABOVE this level's real floor`);
  // Full descent from a top spawn to the floor, camera seeded then updated each step.
  let cam = camYForSpawn(64, pxH, VH);
  let worstScreenY = -1, everOff = 0;
  for (let y=64; y<=pxH; y+=6) {
    cam = nextCamY(cam, y, VH, pxH);
    const sy = y - cam;
    if (sy < 0 || sy > VH) everOff++;
    if (sy > worstScreenY) worstScreenY = sy;
  }
  ok(everOff === 0, 'the player stays on screen for the WHOLE top-to-bottom traverse', `${everOff} off-screen frames`);
  ok(cam === maxCamY(pxH, VH), 'and the camera ends resting on the level floor', `cam ${cam}`);
  ok(worstScreenY <= VH, 'never rendered below the viewport edge', `deepest screen y ${worstScreenY.toFixed(0)}`);
}

sec('Purity — same inputs, same output, no hidden state');
{
  const a = nextCamY(300, 700, VH, px(40));
  const b = nextCamY(300, 700, VH, px(40));
  ok(a === b, 'nextCamY is pure', `${a} both times`);
  ok(Number.isFinite(nextCamY(0, NaN, VH, px(40))) || true, 'a NaN player y does not throw', 'guard noted, not asserted as a value');
  ok(maxCamY(px(40), VH) === px(40) - VH, 'maxCamY is plain arithmetic');
}

sec('SHORT-LEVEL PIN is load-bearing — a stale camY must be forced back to 0');
{
  // A mutation changing `return 0` to `return camY` on the fits-the-screen path PASSED
  // 47/47, because every short-level case I wrote fed camY=0 in, so returning camY
  // returned 0 anyway. Vacuous. The bug it hides is real: going from a TALL level
  // (camY scrolled to 500) into a SHORT one leaves the camera stuck at 500 and the
  // whole level renders off-frame. Feeding a non-zero camY is what gives this teeth.
  for (const r of [6, 12, 17, 18]) {
    const pxH = px(r);
    for (const stale of [120, 400, 900]) {
      const c = nextCamY(stale, pxH / 2, VH, pxH);
      ok(c === 0,
        `a ${r}-row level forces a stale camY of ${stale} back to 0`,
        `got ${c}`);
    }
  }
  // The realistic sequence: descend a tall level, then load a short one.
  const tall = px(40);
  let cam = 0;
  for (let y=0; y<=tall; y+=16) cam = nextCamY(cam, y, VH, tall);
  ok(cam > 500, 'camera is deep in the tall level before the transition', `camY ${cam}`);
  const shortH = px(18);
  ok(nextCamY(cam, 300, VH, shortH) === 0,
    'and loading a short level snaps it back to 0 rather than rendering off-frame',
    `${cam} -> 0`);
}

sec('MAIN.JS WIRING — structural, because main.js boots on import');
{
  // These two cannot be reached from a pure-function suite: main.js runs the game the
  // moment it is imported, so I cannot call into it. Both are mutations that survived
  // the behavioural suite, and both are real bugs I actually made during this build:
  // a viewport-pinned death plane, and a missing viewH import. A source-text guard is
  // the weaker kind of assertion, and I am using it here deliberately because the
  // alternative is no assertion at all. Scoped to exact single lines, not a broad scan.
  const src = fs.readFileSync('src_scroll/main.js', 'utf8');
  ok(/if \(player\.y > level\.pxH \+ 60\) _respawn\(\);/.test(src),
    'the death plane is the LEVEL bottom, not the viewport bottom',
    'H + 60 would kill the player mid-level on any tall level');
  ok(!/if \(player\.y > H \+ 60\) _respawn\(\);/.test(src),
    'and the old viewport-pinned boundary is gone');
  ok(/import \{[^}]*\bviewH\b[^}]*\} from '\.\/viewport\.js';/.test(src),
    'viewH is imported',
    'I wired _updateCamera to viewH() and forgot the import; it would ReferenceError on frame 1');
  ok(/ctx\.translate\(-Math\.round\(camX\), -Math\.round\(camY\)\)/.test(src),
    'the world transform applies camY, not a hardcoded 0');
  ok(/camY = nextCamY\(camY, player\.y \+ player\.h \/ 2, viewH\(\), level\.pxH\)/.test(src),
    'and it drives the shared camera.js function rather than inline math');
  const seeds = (src.match(/camY\s*=\s*_camYForSpawn\(respawnY\)/g) || []).length;
  ok(seeds === 2,
    'BOTH respawn paths seed camY (snapshot restore and level load)',
    `${seeds} of 2 — I missed one of these on the first pass and the grep caught it`);
}
sec('END-TO-END — real gravity, real Level, real Player down a real 36-row level');
{
  // Everything above this point is PURE MATH. Passing it does not prove a player can
  // actually traverse a tall level, and "the maths is right so the game is right" is the
  // exact inference that has burned me repeatedly this weekend. So this section builds a
  // real level the way Chief's Builder will, drops a real Player through it under real
  // gravity, and measures whether he was ever off screen.
  const { Level }  = await import('../src_scroll/level.js');
  const { Player } = await import('../src_scroll/player.js');
  const L1 = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json','utf8'));

  // Chief 18:39: sections are added ABOVE only, the existing floor stays the bottom, and
  // the spawn moves to the top so the player traverses DOWN.
  const ADDED = 18, cols = L1.cols, dy = ADDED * 32;
  const def = JSON.parse(JSON.stringify(L1));
  def.tiles = new Array(ADDED*cols).fill(0).concat(L1.tiles);
  if (Array.isArray(L1.tileRotations)) def.tileRotations = new Array(ADDED*cols).fill(0).concat(L1.tileRotations);
  def.playerStart = { x:L1.playerStart.x, y:96 };
  for (const k of ['sources','gates','switches','checkpoints','platforms','enemies','decorations','chests','crates'])
    if (Array.isArray(def[k])) def[k] = def[k].map(o => ({ ...o, y:(o.y ?? 0) + dy }));

  const lv = new Level(def);
  ok(lv.rows === 36 && lv.pxH === 1152, 'the built level really is 36 rows / 1152px', `rows ${lv.rows}`);
  ok(maxCamY(lv.pxH, VH) > 0, 'and it genuinely needs vertical scrolling', `${maxCamY(lv.pxH, VH)}px of room`);

  const p = new Player(def.playerStart.x, def.playerStart.y);
  let cam = camYForSpawn(def.playerStart.y, lv.pxH, VH);
  ok(p.y - cam >= 0 && p.y - cam <= VH, 'the player is on screen at spawn', `screen y ${p.y - cam}`);

  let off = 0, landedAt = null, died = false, deepestCam = cam;
  for (let i=0; i<1200; i++) {
    p.update(1/60, lv);                                  // real signature (dt, level)
    cam = nextCamY(cam, p.y + p.h/2, VH, lv.pxH);
    if (cam > deepestCam) deepestCam = cam;
    const sy = p.y - cam;
    if (sy < -1 || sy > VH + 1) off++;
    if (p.y > lv.pxH + 60) { died = true; break; }        // the real death plane
    if (p.grounded && landedAt === null) landedAt = p.y;
  }
  ok(off === 0, 'the player was NEVER off screen during the whole fall', `${off} off-screen frames of 1200`);
  ok(landedAt !== null, 'he landed on real floor rather than falling forever', landedAt !== null ? `y=${landedAt.toFixed(0)}` : 'never landed');
  ok(!died, 'and he did NOT cross the death plane on a legitimate descent',
    `death plane is ${lv.pxH + 60}; under the old viewport-pinned ${VH + 60} he would have died mid-air`);
  ok(deepestCam === maxCamY(lv.pxH, VH), 'the camera scrolled all the way to the level floor', `camY ${deepestCam}`);
  ok(landedAt > VH, 'the landing point is BELOW the viewport, so this could not have worked before',
    `floor at y=${landedAt.toFixed(0)} vs viewport ${VH}`);
}
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
