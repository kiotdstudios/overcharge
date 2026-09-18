// LEVEL 2 FORK + Y-AWARE blockOnly — KIRO_RULING_BLOCKONLY_Y_AWARE + ORCHA 16
//
// Reads the SHIPPED level2.json from disk. No coordinate literals for level geometry.
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;this.src='';}addEventListener(){}};
import fs from 'fs';
const EL = await import('../src_scroll/electricity.js');
const { PLAYER_H, PLAYER_W, MAX_CHARGE } = await import('../src_scroll/constants.js');

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

sec('THE ASSERTION PROTECTING EVERY LEVEL\u2019S ECONOMY: exit gates stay unjumpable');
{
  const ex = new EL.PowerGate(exitDef);
  ok(!exitDef.blockOnly, 'the exit is NOT blockOnly, so it keeps X-only blocking');
  ok(ex.blocksHorizontal(exitDef.x-4, PLAYER_W, 0, PLAYER_H),
    'a player FAR ABOVE the exit is still blocked', 'if this ever fails, every exit cost becomes optional');
  ok(ex.blocksHorizontal(exitDef.x-4, PLAYER_W, exitDef.y, PLAYER_H), 'and blocked at exit level');
  ok(ex.blocksHorizontal(exitDef.x-4, PLAYER_W, 560, PLAYER_H), 'and blocked far BELOW the exit');
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

sec('Frozen economy: BOTH routes complete, and no number moved');
{
  const A1 = L2.sources.find(s=>s.id==='A1'), E1 = L2.sources.find(s=>s.id==='E1');
  ok(A1.charge===4, 'A1 = 4', `${A1.charge}`);
  ok(E1.charge===6, 'E1 = 6', `${E1.charge}`);
  ok(sw.required===2, 'SW1 = 2', `${sw.required}`);
  ok(exitDef.required===8, 'EXIT = 8', `${exitDef.required}`);
  ok(L2.chests[0].cost===2 && L2.chests[0].reward===10, 'chest cost 2 / reward 10', 'one pip');
  // ROUTE B: never touch the switch. 4 + 6 = 10, exit costs 8.
  ok(A1.charge + E1.charge >= exitDef.required,
    'ROUTE B completes with the switch NEVER activated', `${A1.charge}+${E1.charge}=${A1.charge+E1.charge} >= ${exitDef.required}, finishes with ${A1.charge+E1.charge-exitDef.required}`);
  // ROUTE A: pay switch 2, pay chest 2, gain a full pip (10), then E1.
  const routeA = A1.charge - sw.required - L2.chests[0].cost + MAX_CHARGE + E1.charge;
  ok(routeA >= exitDef.required,
    'ROUTE A completes through the switch and chest', `usable ${routeA} >= ${exitDef.required}, finishes with ${routeA-exitDef.required}`);
  ok(routeA - exitDef.required > A1.charge + E1.charge - exitDef.required,
    'and ROUTE A finishes RICHER, so the detour is worth choosing',
    `A leaves ${routeA-exitDef.required} vs B leaves ${A1.charge+E1.charge-exitDef.required}`);
}

sec('The twin file stays in sync');
{
  const twin = JSON.parse(fs.readFileSync('src_scroll/levels/2_SPLIT_DECISION.json','utf8'));
  ok(JSON.stringify(twin.tiles)===JSON.stringify(L2.tiles), 'twin tiles match level2.json');
  ok(JSON.stringify(twin.chests)===JSON.stringify(L2.chests), 'twin chests match');
  ok(twin.gates.find(g=>g.blockOnly)?.y === fenceDef.y, 'twin fence y matches', `${fenceDef.y}`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);