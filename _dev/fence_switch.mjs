// ORDER FENCE_SHORT_CIRCUIT — powered fence + short-circuit wall switch.
// Semantics ratified in docs/KIRO_RULING_FENCE_V1.md (F1-F11, all RATIFIED).
//
// The frame-identity assertions here are the point of this suite: frame_000 is
// the REST POSE in both packs, so a live fence must never draw it and the switch
// burn must never start on it. Recorder keys on IMAGE OBJECT IDENTITY, which is
// stronger than sx/sy or argument count (the lesson from the crate delivery).
const _l={};
globalThis.window={addEventListener(n,f){(_l[n]=_l[n]||[]).push(f);},removeEventListener(){},innerWidth:1920,innerHeight:1080,location:{search:''}};
globalThis.document={getElementById:()=>null,addEventListener(){},removeEventListener(){},createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}),style:{}}),body:{style:{}}};
// Images report their src so the recorder can name what was drawn.
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;}addEventListener(n,f){if(n==='load')setTimeout(f,0);}};

const EL        = await import('../src_scroll/electricity.js');
const { Level } = await import('../src_scroll/level.js');
const { TILE }  = await import('../src_scroll/constants.js');

let pass=0, fail=0;
const sec=t=>console.log('\n'+t);
function ok(c,label,detail=''){ if(c){pass++;console.log('  \u2713 '+label+(detail?' \u2014 '+detail:''));} else {fail++;console.log('  \u2717 '+label+(detail?' \u2014 '+detail:''));} }
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;

// Recorder: captures the src of every drawn image, in order.
const drawn=[];
function rec(){
  const noop=()=>{};
  const target={
    drawImage(...a){ drawn.push(String(a[0] && a[0].src || 'noimg')); },
    fillRect:noop,strokeRect:noop,fillText:noop,measureText:()=>({width:0}),
    save:noop,restore:noop,beginPath:noop,fill:noop,stroke:noop,
  };
  return new Proxy(target,{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>{if(k==='shadowBlur')drawn.blur=v;return true;}});
}
const CTX=rec();
const shot=obj=>{ drawn.length=0; obj.draw(CTX); return drawn.slice(); };
const fileOf=s=>String(s).split('/').pop();
const uniq=a=>[...new Set(a)];

const FLOOR=17*TILE;
const fence=(over={})=>new EL.PowerGate(Object.assign(
  {id:'FENCE_A',x:640,y:FLOOR-128,w:32,h:128,required:1,blockOnly:true,style:'fence'},over));
const wall=(over={})=>new EL.Switch(Object.assign(
  {id:'WSW_A',x:384,y:FLOOR-22,required:2,linkedId:'FENCE_A',style:'wall'},over));

sec('SCHEMA — style is additive and default-off (F9)');
{ const g=new EL.PowerGate({id:'G',x:0,y:0,w:40,h:64,required:4});
  ok(g.style===null,'gate with no style has style null');
  const s=new EL.Switch({id:'S',x:0,y:0,required:2,linkedId:'G'});
  ok(s.style===null,'switch with no style has style null');
  ok(s._destroyT===0,'switch initialises _destroyT to 0'); }
{ const g=fence();
  ok(g.style==='fence','style:"fence" is accepted on a blockOnly gate');
  const s=wall();
  ok(s.style==='wall'&&s.isWall,'style:"wall" is accepted on a switch'); }
{ // style:"fence" on a chargeable gate is an authoring error -> warn + ignore
  const g=new EL.PowerGate({id:'BAD',x:0,y:0,w:40,h:64,required:4,style:'fence'});
  ok(g.style===null,'style:"fence" on a NON-blockOnly gate is refused (warn + ignore)'); }
{ const g=new EL.PowerGate({id:'B2',x:0,y:0,w:40,h:64,required:4,blockOnly:true,style:'wat'});
  ok(g.style===null,'unknown gate style falls back to default');
  const s=new EL.Switch({id:'S2',x:0,y:0,required:2,linkedId:'G',style:'wat'});
  ok(s.style===null,'unknown switch style falls back to default'); }

sec('F1 — LIVE FENCE NEVER DRAWS frame_000 (the rest pose)');
{ const g=fence();
  const seen=[];
  for(let i=0;i<240;i++){ g.update(1/60); seen.push(...shot(g).map(fileOf)); }
  const set=uniq(seen);
  ok(!set.includes('frame_000.png'),
    'a live fence NEVER draws frame_000.png',`drew ${set.length} distinct: ${set.sort().join(',')}`);
  ok(!set.includes('fence_dead.png'),
    '  ...and never draws fence_dead.png while blocking');
  ok(set.length===8,'  ...cycles exactly 8 frames (001-008)',`${set.length}`);
  for(let k=1;k<=8;k++) if(!set.includes('frame_00'+k+'.png')) ok(false,'missing frame_00'+k+'.png');
  ok(set.every(f=>/^frame_00[1-8]\.png$/.test(f)),'  ...all drawn frames are in 001..008'); }

sec('F1 — DEAD FENCE is static fence_dead.png');
{ const g=fence(); g.open=true;
  const seen=[];
  for(let i=0;i<240;i++){ g.update(1/60); seen.push(...shot(g).map(fileOf)); }
  const set=uniq(seen);
  ok(set.length===1&&set[0]==='fence_dead.png',
    'a dead fence draws ONLY fence_dead.png, statically',`got ${set.join(',')}`); }

sec('F3 — TILING over the hitbox, hitbox unchanged');
{ const g=fence();               // 32w x 128h
  const n=shot(g).length;
  ok(n===2,'a 32x128 fence tiles the 64x64 art exactly 2x vertically',`${n} draws`);
  ok(g.w===32&&g.h===128,'  ...and the HITBOX is unchanged',`${g.w}x${g.h}`); }
{ const g=fence({w:128,h:64});
  ok(shot(g).length===2,'a 128x64 fence tiles 2x horizontally'); }
{ const g=fence({w:32,h:32});
  ok(shot(g).length===1,'a small fence still draws at least one tile'); }

sec('F3 — fence BLOCKS while live, PASSES when dead');
{ const g=fence();
  ok(g.blocks(g.x,g.y,32,30)===true,'live fence blocks an overlapping body');
  ok(g.blocksHorizontal(g.x,32)===true,'  ...and blocks horizontally (full-height wall)');
  g.open=true;
  ok(g.blocks(g.x,g.y,32,30)===false,'dead fence does NOT block');
  ok(g.blocksHorizontal(g.x,32)===false,'  ...and does not block horizontally'); }

sec('F10 — a fence NEVER renders dead-GATE art (dormancy exemption)');
{ const g=fence();
  ok(g.blockOnly===true,'a fence is blockOnly');
  ok(g.isDormant===false,'  ...so it is EXEMPT from isDormant (verified, not assumed)');
  const seen=uniq([].concat(...Array.from({length:60},()=>{g.update(1/60);return shot(g).map(fileOf);})));
  ok(!seen.includes('gate_electric_dead.png'),
    '  ...and never draws gate_electric_dead.png',`drew: ${seen.sort().join(',')}`);
  ok(!seen.some(f=>/gate_electric/.test(f)),'  ...never draws ANY gate art'); }

sec('F5 — switch.on means FIRED, not lit');
{ const s=wall();
  ok(s.on===false,'a wall switch starts NOT fired');
  const f=shot(s).map(fileOf);
  ok(f.includes('switch_on.png'),
    'on===false renders switch_on.png (powering the fence) — the inversion',`drew ${f.join(',')}`);
  ok(!f.includes('switch_destroyed.png'),'  ...and does NOT look destroyed yet'); }
{ const s=wall();
  s.receive(2);
  ok(s.on===true,'charging to `required` fires it');
  const f=shot(s).map(fileOf);
  ok(!f.includes('switch_on.png'),'once fired it no longer renders switch_on.png'); }

sec('F6 — burn plays 001..008 ONCE then settles, never loops, never reverts');
{ const s=wall(); s.receive(2);
  const seq=[];
  for(let i=0;i<12;i++){ s.update(1/60); seq.push(...shot(s).map(fileOf)); }
  const burn=uniq(seq).filter(f=>/^frame_/.test(f));
  ok(!burn.includes('frame_000.png'),
    'the burn NEVER plays frame_000.png (it is the destroyed rest pose)',`played ${burn.sort().join(',')}`);
  ok(burn.every(f=>/^frame_00[1-8]\.png$/.test(f)),'  ...only frames 001..008 play'); }
{ const s=wall(); s.receive(2);
  // Walk the whole burn and record the frame order actually shown.
  const order=[];
  for(let i=0;i<40;i++){ s.update(1/60); const f=shot(s).map(fileOf).find(x=>/^frame_|switch_destroyed/.test(x)); if(f&&order[order.length-1]!==f) order.push(f); }
  ok(order[0]==='frame_001.png','burn STARTS on frame_001.png',`order: ${order.slice(0,3).join(' -> ')}`);
  ok(order[order.length-1]==='switch_destroyed.png','  ...and ENDS settled on switch_destroyed.png',
     `... -> ${order.slice(-2).join(' -> ')}`);
  const idx=order.filter(f=>/^frame_/.test(f)).map(f=>parseInt(f.match(/(\d+)/)[1],10));
  ok(idx.every((v,i,a)=>i===0||v>a[i-1]),'  ...frames play in ASCENDING order, no repeats',`${idx.join(',')}`); }
{ const s=wall(); s.receive(2);
  for(let i=0;i<600;i++) s.update(1/60);      // 10 seconds
  ok(s.burnDone===true,'after 10s the burn is done');
  const set=uniq([].concat(...Array.from({length:120},()=>{s.update(1/60);return shot(s).map(fileOf);})));
  ok(set.filter(f=>/^frame_/.test(f)).length===0,
    'it does NOT loop the destruction',`still drawing: ${set.join(',')}`);
  ok(set.includes('switch_destroyed.png'),'  ...it holds switch_destroyed.png permanently');
  ok(s.on===true,'  ...and never reverts');
  // The `!this.burnDone` latch in update() exists so _destroyT stops accruing
  // once the burn completes. Without it, rendering is IDENTICAL (burnDone stays
  // true) but _destroyT grows without bound and gets written into every
  // snapshot. Found by mutation testing: removing the latch did not fail any
  // assertion, so the invariant was claimed in a comment but never verified.
  const burnLen = 8 / 12;                       // frames / WALL_SW_DESTROY_FPS
  ok(s._destroyT <= burnLen + 1/30,
    '  ...and _destroyT is LATCHED, not growing without bound',
    `_destroyT=${s._destroyT.toFixed(3)} after ~12s, burn is ${burnLen.toFixed(3)}s`); }

sec('F8 — switch_off.png is never drawn in v1 (reserved, not used)');
{ const s=wall();
  const seen=uniq([].concat(...Array.from({length:60},()=>{s.update(1/60);return shot(s).map(fileOf);})));
  s.receive(2);
  const seen2=uniq([].concat(...Array.from({length:120},()=>{s.update(1/60);return shot(s).map(fileOf);})));
  ok(![...seen,...seen2].includes('switch_off.png'),
    'switch_off.png is never rendered across the whole lifecycle'); }

sec('F7 — the fence dies IMMEDIATELY, concurrently with the burn (RULED)');
{ // Full mechanism: switch fires -> linked gate opens -> fence passable at once,
  // while the switch is still visibly burning.
  const cols=44, tiles=new Array(cols*18).fill(0);
  for(let x=0;x<cols;x++) tiles[17*cols+x]=10;
  const L=new Level({name:'T',number:99,cols,tiles,playerStart:{x:64,y:FLOOR-30},
    decorations:[],sources:[],switches:[{id:'WSW_A',x:384,y:FLOOR-22,required:2,linkedId:'FENCE_A',style:'wall'}],
    gates:[{id:'FENCE_A',x:640,y:FLOOR-128,w:32,h:128,required:1,blockOnly:true,style:'fence'}],
    checkpoints:[],platforms:[],enemies:[],crates:[]});
  const sw=L.switches[0], fg=L.gates[0];
  ok(fg.blocks(fg.x,fg.y,32,30)===true,'fence blocks before the switch is shorted');
  sw.receive(2);
  L.update(1/60,{});                      // one frame: linked-gate resolution
  ok(fg.open===true,'the frame the switch fires, the fence is ALREADY open');
  ok(fg.blocks(fg.x,fg.y,32,30)===false,'  ...and immediately passable (no delay)');
  ok(sw.burnDone===false,'  ...while the switch burn is still playing');
  ok(fileOf(shot(fg)[0])==='fence_dead.png','  ...fence already draws dead art'); }

sec('F11 — _destroyT snapshot / restore');
{ const cols=20, tiles=new Array(cols*18).fill(0);
  const L=new Level({name:'T',number:99,cols,tiles,playerStart:{x:0,y:0},
    decorations:[],sources:[],switches:[{id:'W',x:0,y:0,required:2,linkedId:'G',style:'wall'}],
    gates:[{id:'G',x:100,y:0,w:32,h:128,required:1,blockOnly:true,style:'fence'}],
    checkpoints:[],platforms:[],enemies:[],crates:[]});
  const sw=L.switches[0];
  sw.receive(2);
  for(let i=0;i<20;i++) sw.update(1/60);          // mid-burn
  const snap=L.snapshot();
  ok(snap.switches[0]._destroyT>0,'snapshot captures _destroyT mid-burn',
     `_destroyT=${snap.switches[0]._destroyT.toFixed(3)}`);
  const at=snap.switches[0]._destroyT;
  for(let i=0;i<60;i++) sw.update(1/60);
  ok(sw._destroyT>at,'burn advanced past the snapshot');
  L.restore(snap);
  ok(near(sw._destroyT,at),'restore rewinds the burn to the snapshot point',`${sw._destroyT.toFixed(3)}`);
  const legacy=L.snapshot(); delete legacy.switches[0]._destroyT;
  let threw=false; try{ L.restore(legacy); }catch(e){ threw=true; }
  ok(!threw,'restore tolerates a snapshot with no _destroyT (older build)'); }

sec('REGRESSION — styleless switch/gate behave exactly as before');
{ const s=new EL.Switch({id:'S',x:0,y:0,required:2,linkedId:'G'});
  ok(s.isWall===false,'a default switch is not a wall switch');
  s.receive(2);
  for(let i=0;i<600;i++) s.update(1/60);
  ok(s._destroyT===0,'a default switch never accrues _destroyT',`${s._destroyT}`);
  const f=shot(s).map(fileOf);
  ok(f.length===0,'  ...and draws NO images (vector renderer, unchanged)',`drew ${f.join(',')}`); }
{ const g=new EL.PowerGate({id:'G',x:0,y:0,w:40,h:64,required:2});
  g.receive(2);
  ok(g.open===true,'a default gate still opens when charged');
  for(let i=0;i<600;i++) g.update(1/60);
  ok(g.open===true&&g.charged===2,'  ...and is unaffected by the fence branch'); }
{ const g=new EL.PowerGate({id:'B',x:0,y:0,w:32,h:128,required:1,blockOnly:true});
  const seen=uniq([].concat(...Array.from({length:60},()=>{g.update(1/60);return shot(g).map(fileOf);})));
  ok(!seen.some(f=>/^frame_|fence_dead/.test(f)),
    'a styleless blockOnly barrier draws NO fence art',`drew: ${seen.join(',')||'none'}`); }

sec('CONSERVATION — no new energy path (F5)');
{ const s=wall();
  const before=s.charged;
  ok(s.receive(1)===false,'partial charge does not fire the switch');
  ok(near(s.charged,before+1),'  ...and accrues exactly what was given',`charged=${s.charged}`);
  ok(s.receive(1)===true,'reaching `required` fires it');
  ok(near(s.charged,s.required),'  ...charged clamps to required',`${s.charged}`);
  ok(s.receive(5)===false,'a fired switch refuses further charge');
  ok(near(s.charged,s.required),'  ...and does not accumulate past required',`${s.charged}`); }

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
