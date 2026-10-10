// LEVEL 2 FORK + Y-AWARE blockOnly — KIRO_RULING_BLOCKONLY_Y_AWARE + ORCHA 16
//
// Reads the SHIPPED level2.json from disk. No coordinate literals for level geometry.
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;this.src='';}addEventListener(){}};
import fs from 'fs';
const EL = await import('../src_scroll/electricity.js');
const { PLAYER_H, PLAYER_W, MAX_CHARGE, JUMP_FORCE, GRAVITY } = await import('../src_scroll/constants.js');

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

const L2 = JSON.parse(fs.readFileSync('src_scroll/levels/level2.json','utf8'));
const C = L2.cols, T = 32, solid = v => v===1 || v>=10;
const fenceDef = L2.gates.find(g=>g.blockOnly);
const exitDef  = L2.gates.find(g=>g.isExit);
const sw       = L2.switches[0];

// Surface y of the first solid tile below a given row, at a column.
const surfaceAt = (col, fromRow) => { for(let r=fromRow;r<18;r++) if(solid(L2.tiles[r*C+col])) return r*T; return null; };

sec("EXIT PORTALS PERMIT EXPLORATION — Chief revised ruling");
{
  const ex = new EL.PowerGate(exitDef);
  for (const y of [0, exitDef.y, exitDef.y + exitDef.h + 200])
    ok(!ex.blocksHorizontal(exitDef.x-4, PLAYER_W, y, PLAYER_H), "uncharged exit allows exploration at y="+y);
  ok(!ex.blocksHorizontal(exitDef.x-4, PLAYER_W), "exit has no invisible column barrier");
  const fence = new EL.PowerGate(fenceDef);
  ok(fence.blocksHorizontal(fenceDef.x-4, PLAYER_W, fenceDef.y, PLAYER_H), "interior fence retains collision");
}

sec('Y-aware blockOnly: the fence blocks its OWN rows and nothing else');
{
  const f = new EL.PowerGate(fenceDef);
  const fx = fenceDef.x - PLAYER_W/2;
  ok(f.blocksHorizontal(fx, PLAYER_W, fenceDef.y, PLAYER_H), 'blocks a player level with it');
  ok(f.blocksHorizontal(fx, PLAYER_W, fenceDef.y + fenceDef.h - PLAYER_H, PLAYER_H), 'blocks at its lowest row');
  ok(!f.blocksHorizontal(fx, PLAYER_W, fenceDef.y + fenceDef.h + 40, PLAYER_H), 'does NOT block well below it');
  ok(!f.blocksHorizontal(fx, PLAYER_W, fenceDef.y - PLAYER_H - 40, PLAYER_H), 'does NOT block well above it');
  ok(f.blocksHorizontal(fx, PLAYER_W), 'with NO Y passed, behaves exactly as before (back-compat)');
  const f2 = new EL.PowerGate(fenceDef); f2.open = true;
  ok(!f2.blocksHorizontal(fx, PLAYER_W, fenceDef.y, PLAYER_H), 'an OPEN fence blocks nothing');
}

sec('ROUTE A (upper) is gated by the fence; ROUTE B (lower) is not');
{
  const f = new EL.PowerGate(fenceDef);
  const col = Math.floor(fenceDef.x / T);
  // Route A walks the platform whose surface is the first solid row BELOW the fence.
  const aSurface = surfaceAt(col, Math.floor((fenceDef.y + fenceDef.h) / T));
  const bSurface = surfaceAt(col, Math.floor((fenceDef.y + fenceDef.h) / T) + 1);
  ok(aSurface !== null, 'an upper walkable surface exists at the fence column', `y=${aSurface}`);
  ok(bSurface !== null, 'a lower walkable surface exists at the fence column', `y=${bSurface}`);
  ok(bSurface > aSurface, 'and the lower route is genuinely below the upper one', `${bSurface} > ${aSurface}`);
  ok(f.blocksHorizontal(fenceDef.x-4, PLAYER_W, aSurface-PLAYER_H, PLAYER_H),
    'ROUTE A: a walker on the upper platform IS blocked', `walker y ${aSurface-PLAYER_H}..${aSurface}`);
  ok(!f.blocksHorizontal(fenceDef.x-4, PLAYER_W, bSurface-PLAYER_H, PLAYER_H),
    'ROUTE B: a walker on the lower floor is NOT blocked', `walker y ${bSurface-PLAYER_H}..${bSurface}`);
  // Route B must have real headroom, or it is impassable and the fork is a lie.
  let ceilBottom = 0;
  for(let r=Math.floor(bSurface/T)-1; r>=0; r--) if(solid(L2.tiles[r*C+col])) { ceilBottom=(r+1)*T; break; }
  ok(bSurface - PLAYER_H >= ceilBottom,
    'ROUTE B has real headroom under the upper platform',
    `head y=${bSurface-PLAYER_H}, ceiling bottom y=${ceilBottom}, clear by ${bSurface-PLAYER_H-ceilBottom}px`);
}

sec('Structure: the link resolves and the palette is respected');
{
  ok(L2.gates.some(g=>g.id===sw.linkedId), 'SW1.linkedId resolves to a real gate', `${sw.linkedId}`);
  ok(sw.linkedId === fenceDef.id, 'and it is the fence specifically');
  ok(!L2.tiles.some(v=>v===14||v===15), 'no forbidden 14/15 tiles');
  ok(Array.isArray(L2.chests) && L2.chests.length===1, 'exactly one chest is placed', `${L2.chests?.length}`);
  const ch = L2.chests[0];
  ok(ch.x % T === 0, 'chest is grid-aligned on X', `x=${ch.x} col=${ch.x/T}`);
  ok(ch.x > fenceDef.x, 'chest is BEHIND the fence (further right)', `chest x=${ch.x} vs fence x=${fenceDef.x}`);
  const chCol = Math.floor(ch.x / T);
  ok(solid(L2.tiles[Math.floor((ch.y + 32)/T)*C + chCol]), 'chest is grounded on solid terrain', `y+h=${ch.y+32}`);
}

sec('Economy: BOTH routes complete with the current Builder layout');
{
  // Chief replaced the A1=4 / E1=6 generators with two LAMP props (4 + 4) in Builder
  // saves after 2026-10-06. Pin the CURRENT numbers and keep the fork's real promise:
  // both routes finish, and the chest detour finishes richer.
  const lamps = L2.sources.filter(s => s.kind === 'prop');
  const total = L2.sources.reduce((n, s) => n + (s.charge || 0), 0);
  ok(lamps.length === 2 && lamps.every(s => s.charge === 4), 'two LAMP sources of 4 each', lamps.map(s => s.charge).join('+'));
  ok(L2.sources.every(s => s.x < fenceDef.x), 'all source charge is collected before the fork', `fence x=${fenceDef.x}`);
  ok(sw.required===2, 'SW1 = 2', `${sw.required}`);
  ok(exitDef.required===8, 'EXIT = 8', `${exitDef.required}`);
  ok(L2.chests[0].cost===2, 'chest cost 2', 'pays out one banked pip (MAX_CHARGE)');
  // ROUTE B: never touch the switch, walk under the fence.
  ok(total >= exitDef.required,
    'ROUTE B completes with the switch NEVER activated', `${total} >= ${exitDef.required}, finishes with ${total-exitDef.required}`);
  // ROUTE A: pay switch, pay chest, gain a full pip.
  const routeA = total - sw.required - L2.chests[0].cost + MAX_CHARGE;
  ok(routeA >= exitDef.required,
    'ROUTE A completes through the switch and chest', `usable ${routeA} >= ${exitDef.required}, finishes with ${routeA-exitDef.required}`);
  ok(routeA - exitDef.required > total - exitDef.required,
    'and ROUTE A finishes RICHER, so the detour is worth choosing',
    `A leaves ${routeA-exitDef.required} vs B leaves ${total-exitDef.required}`);
}

sec('RULING A2 — a blockOnly gate must FILL A BOUNDED OPENING (every level, not just this one)');
{
  // Applied to EVERY level that ships a blockOnly gate, so Levels 3/4/5 inherit it.
  const manifest = JSON.parse(fs.readFileSync('src_scroll/levels/levels.json','utf8'));
  const apex = (JUMP_FORCE * JUMP_FORCE) / (2 * GRAVITY);
  let checked = 0;
  for (const e of (manifest.order || [])) {
    const file = e.file || e;
    const L = JSON.parse(fs.readFileSync('src_scroll/levels/' + file, 'utf8'));
    const cols = L.cols, sol = v => v===1 || v>=10;
    for (const g of (L.gates || []).filter(x => x.blockOnly)) {
      checked++;
      const col = Math.floor(g.x / 32);
      const topRow = Math.floor(g.y / 32);
      // (1) the opening is CAPPED — solid immediately above the gate
      ok(sol(L.tiles[(topRow-1)*cols + col]),
        `${file} ${g.id}: the opening is CAPPED by solid terrain above it`,
        `r${topRow-1} at col ${col} — without this the gate is decoration`);
      // (2) it IS an opening — the gate's own rows are not already walled
      let ownRowsClear = true;
      for (let r = topRow; r < Math.floor((g.y + g.h) / 32); r++) if (sol(L.tiles[r*cols + col])) ownRowsClear = false;
      ok(ownRowsClear, `${file} ${g.id}: its own rows ARE an opening, not solid rock`);
      // (3) THE ASSERTION THAT WOULD HAVE CAUGHT THE JUMP.
      // A JUMPING body at apex, not a standing one. The ceiling clamps the head, so
      // the real apex is whichever is lower: free-flight apex, or the ceiling underside.
      const surface = (() => { for (let r = Math.floor((g.y+g.h)/32); r < 18; r++) if (sol(L.tiles[r*cols+col])) return r*32; return null; })();
      if (surface !== null) {
        let ceil = 0;
        for (let r = topRow - 1; r >= 0; r--) if (sol(L.tiles[r*cols + col])) { ceil = (r+1)*32; break; }
        const freeApexTop = surface - PLAYER_H - apex;
        const bodyTop = Math.max(freeApexTop, ceil);   // ceiling wins
        const overlaps = !((bodyTop + PLAYER_H) <= g.y || bodyTop >= g.y + g.h);
        ok(overlaps,
          `${file} ${g.id}: a JUMPING player at apex still overlaps the gate`,
          `apex body ${bodyTop.toFixed(0)}..${(bodyTop+PLAYER_H).toFixed(0)} vs gate ${g.y}..${g.y+g.h} (free apex would be ${freeApexTop.toFixed(0)}, ceiling clamps to ${ceil})`);
      }
      // (4) and the opening is still big enough to walk through once it opens
      ok(g.h >= PLAYER_H, `${file} ${g.id}: the opening fits the player once opened`, `${g.h}px gap vs ${PLAYER_H}px player`);
    }
  }
  ok(checked > 0, 'at least one blockOnly gate was checked (else this section is vacuous)', `${checked} found`);
}
sec('RULING A3 — REACHABILITY, proven by walking the level with real physics');
{
  const R = await import('./reach.mjs');
  const openFence = L => { for(const g of L.gates) if(g.blockOnly) g.open=true; };
  // Chief: "it created the fork but i can just jump backwards and get the chest."
  // A local geometry check cannot answer this. These three walk the level.
  const closed = R.reachable(L2, R.chestTarget(L2));
  ok(!closed.reached,
    'gate CLOSED -> the chest is NOT reachable from spawn',
    closed.reached ? `BYPASS via ${closed.hit.via} at x=${closed.hit.x.toFixed(0)}` : `${closed.explored} states explored, no route in`);
  const opened = R.reachable(L2, R.chestTarget(L2), { open: openFence });
  ok(opened.reached,
    'gate OPEN -> the chest IS reachable from spawn',
    opened.reached ? `via ${opened.hit.via} at x=${opened.hit.x.toFixed(0)}` : 'the fence is not a usable door — over-sealed');
  const ex = L2.gates.find(g=>g.isExit);
  const exitTarget = p => Math.abs(p.cx-(ex.x+ex.w/2))<60 && Math.abs(p.cy-(ex.y+ex.h/2))<80;
  const routeB = R.reachable(L2, exitTarget);
  ok(routeB.reached,
    'ROUTE B still completes end to end with the gate CLOSED',
    routeB.reached ? `reaches the exit via ${routeB.hit.via} at x=${routeB.hit.x.toFixed(0)}` : 'the lower route is broken');
  ok(!closed.reached && opened.reached,
    'so the FENCE IS THE ONLY DOOR to the reward');
  // The pocket must be usable, not a sealed box: standing room and sight of the chest.
  const ch = L2.chests[0];
  const chCol = Math.floor(ch.x/32), chRow = Math.floor(ch.y/32);
  let ceilBottom = 0;
  for (let r=chRow; r>=0; r--) if (solid(L2.tiles[r*C+chCol])) { ceilBottom=(r+1)*32; break; }
  const floorTop = (() => { for(let r=chRow+1;r<18;r++) if(solid(L2.tiles[r*C+chCol])) return r*32; })();
  ok(floorTop - ceilBottom >= PLAYER_H,
    'the pocket has standing room (not a sealed box)',
    `${floorTop-ceilBottom}px between ceiling ${ceilBottom} and floor ${floorTop}, player ${PLAYER_H}px`);
}
// The "twin file stays in sync" section is GONE along with the twin itself.
// `2_SPLIT_DECISION.json` shadowed `level2.json`, loaded in nothing, and had already
// drifted from it once — the unused Level 3 twin still held decorations Chief had
// deleted. Chief approved removing all three twins, so the class of bug these three
// assertions guarded no longer exists. Deleting the duplicate beats asserting it
// matches: there is now one file per level and nothing to keep in sync.

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
