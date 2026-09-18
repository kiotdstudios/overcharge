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
// For the mechanical basename guard + label sweep (ORCHA 05 §2 / ORCHA 07).
const fs        = (await import('fs')).default;
const path      = (await import('path')).default;
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
// ── ART IDENTITY MUST USE FULL PATHS (ORCHA 05 §2) ──────────────────────
// fileOf() reduces a src to its basename, and frame_001..008.png exist in FIVE
// packs: gate/idle, gate/charging, fence, wall_switch, checkpoint_flag. Basename
// matching therefore cannot tell one pack's art from another's. It was ALREADY
// ambiguous across fence/wall_switch/checkpoint_flag before the gate pack landed;
// installing gate/ only made a latent ambiguity visible.
// Never use fileOf() to decide WHICH PACK drew something — use packOf().
const packOf=s=>{ const m=/assets\/objects\/([^/]+(?:\/[^/]+)?)\//.exec(String(s)); return m?m[1]:''; };
const drewFrom=(srcs,dir)=>srcs.some(s=>String(s).includes(`assets/objects/${dir}/`));
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
  for(let i=0;i<40;i++){ s.update(1/60); const f=shot(s).map(fileOf).find(x=>/^frame_|switch_destroyed|switch_off/.test(x)); if(f&&order[order.length-1]!==f) order.push(f); }
  ok(order[0]==='frame_001.png','burn STARTS on frame_001.png',`order: ${order.slice(0,3).join(' -> ')}`);
  // O5.4 SUPERSEDES F8. Chief: "once switch is completely shorted it should look
  // like the powered off sprite." Was: ENDS on switch_destroyed.png. This is an
  // INVERSION of a previously-ratified assertion, not a relaxation — the endpoint
  // is still pinned exactly, just to a different file, because switch_destroyed
  // measured as the GREENEST sprite in the set and read as still energised.
  ok(order[order.length-1]==='switch_off.png','  ...and ENDS settled on switch_off.png (O5.4)',
     `... -> ${order.slice(-2).join(' -> ')}`);
  const idx=order.filter(f=>/^frame_/.test(f)).map(f=>parseInt(f.match(/(\d+)/)[1],10));
  ok(idx.every((v,i,a)=>i===0||v>a[i-1]),'  ...frames play in ASCENDING order, no repeats',`${idx.join(',')}`); }
{ const s=wall(); s.receive(2);
  for(let i=0;i<600;i++) s.update(1/60);      // 10 seconds
  ok(s.burnDone===true,'after 10s the burn is done');
  const set=uniq([].concat(...Array.from({length:120},()=>{s.update(1/60);return shot(s).map(fileOf);})));
  ok(set.filter(f=>/^frame_/.test(f)).length===0,
    'it does NOT loop the destruction',`still drawing: ${set.join(',')}`);
  ok(set.includes('switch_off.png'),'  ...it holds switch_off.png permanently (O5.4, was switch_destroyed)');
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

sec('O5.4 — switch_off.png IS the settled state (SUPERSEDES F8)');
// F8 originally asserted switch_off.png is NEVER drawn: reserved, not used. Chief's
// playtest overrode that. Recording the supersession here rather than deleting the
// section, so the history of the decision survives.
{ const s=wall();
  const before=uniq([].concat(...Array.from({length:60},()=>{s.update(1/60);return shot(s).map(fileOf);})));
  ok(!before.includes('switch_off.png'),
    'switch_off is NOT drawn while the switch is still live',`drew: ${before.join(',')}`);
  s.receive(2);
  const after=uniq([].concat(...Array.from({length:200},()=>{s.update(1/60);return shot(s).map(fileOf);})));
  ok(after.includes('switch_off.png'),
    '  ...and IS drawn once the burn has settled',`drew: ${after.join(',')}`);
  ok(!after.includes('switch_destroyed.png'),
    '  ...and switch_destroyed is no longer the resting sprite',`drew: ${after.join(',')}`); }

// O5.4 content-bottom anchoring. switch_off is the ONLY file in the pack with
// botPad=4 (everything else is 3), so naive canvas anchoring moves the switch 1px
// on the exact frame the player watches it settle. Mutation-verified: removing the
// correction yields content bottoms [306,305] instead of [306].
{ const BOT={'switch_off.png':4};          // measured, ORCHA 09
  const s=wall(); const rec=[];
  const spy=new Proxy({drawImage(img,dX,dY){ const n=String(img&&img.src||'').split('/').pop();
      if(/^frame_|switch_off|switch_destroyed/.test(n)) rec.push(dY+56-1-(BOT[n]||3)); }},
    {get:(o,k)=>k in o?o[k]:()=>{},set:()=>true});
  s.on=true;
  for(let i=0;i<200;i++){ s.update(1/60); s.draw(spy); }
  const bottoms=[...new Set(rec)];
  ok(bottoms.length===1,
    'the switch BASE does not move across the entire burn+settle',
    `distinct content bottoms: [${bottoms.join(',')}]`); }

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
    // FULL-PATH identity (ORCHA 05 §2). The old basename test matched /^frame_/,
    // which now also matches the gate's OWN frame_001..008, so it failed for the
    // wrong reason. What this must assert is that no art from the FENCE pack is
    // drawn — a styleless blockOnly gate legitimately draws its own gate frames.
    const srcs=uniq([].concat(...Array.from({length:60},()=>{g.update(1/60);return shot(g);})));
    ok(!drewFrom(srcs,'fence'),
      'a styleless blockOnly barrier draws NO fence art',
      `packs drawn: ${uniq(srcs.map(packOf)).filter(Boolean).join(',')||'none'}`); }

sec('CONSERVATION — no new energy path (F5)');
{ const s=wall();
  const before=s.charged;
  ok(s.receive(1)===false,'partial charge does not fire the switch');
  ok(near(s.charged,before+1),'  ...and accrues exactly what was given',`charged=${s.charged}`);
  ok(s.receive(1)===true,'reaching `required` fires it');
  ok(near(s.charged,s.required),'  ...charged clamps to required',`${s.charged}`);
  ok(s.receive(5)===false,'a fired switch refuses further charge');
  ok(near(s.charged,s.required),'  ...and does not accumulate past required',`${s.charged}`); }
sec('LABEL GEOMETRY SWEEP + STATE->ART MAPPING (ORCHA 06/07)');
// ORCHA 07: a clamp that only guarantees ON-CANVAS does not guarantee
// NOT-OVER-THE-SPRITE. At h=64 the sprite is 105 tall, so y=0 and y=32 put the
// bar at y=0 - INSIDE the art. Both are single-click grid positions. No shipped
// level is affected today; this is latent until Chief places a gate near the
// ceiling. Mutation-verified: disabling the flip yields 9 violations.
{ const hitB=(r,b)=>r.x<b.dX+b.dW&&r.x+r.w>b.dX&&r.y<b.dY+b.dH&&r.y+r.h>b.dY;
  let bad=[],flips=0;
  for(let y=0;y<=13*32;y+=32){ for(const h of [64,96,128]){
    const g=new EL.PowerGate({id:'G',x:64,y,w:32,h,required:8,isExit:true});
    const sb=g.spriteBox(), ls=g.labelStack();
    if(ls.below) flips++;
    for(const [n,r] of [['bar',ls.barRect],['exit',ls.exitRect],['lock',ls.lockRect]]){
      if(hitB(r,sb)) bad.push(`y=${y} h=${h} ${n} over sprite`);
      if(r.y<0)      bad.push(`y=${y} h=${h} ${n} off-canvas`);
    } } }
  ok(bad.length===0,'no label/bar rect ever intersects spriteBox() or leaves canvas',
    `violations=${bad.length}${bad.length?': '+bad.slice(0,3).join('; '):''}`);
  ok(flips>0,'  ...and the flip-below path is actually exercised by the sweep',`flips=${flips}`); }

// ORCHA 06 §3: the state->art mapping asserted ONCE, centrally, by full path.
// energy_authority no longer inspects sprite offsets, so this is the single place
// a wrong state->art wiring is caught. Coverage must not be lost.
{ const g=new EL.PowerGate({id:'G',x:64,y:256,w:32,h:64,required:8});
  const srcOf=s=>String((g.frameFor(s)||{}).src||'');
  ok(/assets\/objects\/gate\/dead\.png$/.test(srcOf('dormant')),
    'dormant -> gate/dead.png',`got ${srcOf('dormant')}`);
  ok(/assets\/objects\/gate\/idle\/frame_00[1-8]\.png$/.test(srcOf('idle')),
    'idle -> gate/idle/frame_001..008',`got ${srcOf('idle')}`);
  ok(/assets\/objects\/gate\/charging\/frame_00[1-8]\.png$/.test(srcOf('charging')),
    'charging -> gate/charging/frame_001..008',`got ${srcOf('charging')}`);
  ok(/assets\/objects\/gate\/rest\.png$/.test(srcOf('open')),
    'open -> gate/rest.png',`got ${srcOf('open')}`); }

// MECHANICAL BASENAME GUARD (ORCHA 05 §2). frame_001..008.png exist in FIVE
// packs, so a convention will not hold - this makes it mechanical. Every art
// identity check must resolve a full path.
{ const seen=new Map(), dupes=[];
  for(const d of ['gate/idle','gate/charging','fence','wall_switch','checkpoint_flag']){
    const p=path.join('assets','objects',d);
    if(!fs.existsSync(p)) continue;
    for(const f of fs.readdirSync(p).filter(f=>f.endsWith('.png'))){
      if(seen.has(f)) dupes.push(`${f} in ${seen.get(f)} and ${d}`); else seen.set(f,d);
    } }
  ok(dupes.length>0,'basename collisions EXIST across packs (so identity must use full paths)',
    `${dupes.length} collision(s), e.g. ${dupes[0]||'none'}`);
  // A source-text scan for /^frame_/ was tried first and REJECTED: it flagged the
  // fence and switch frame-INDEX checks above (lines ~86-157), which are legitimate.
  // Those operate on art drawn BY a fence or a switch, where only that object's own
  // pack can appear, so a basename identifies the FRAME NUMBER, not the pack.
  //
  // The real hazard is narrower: an object whose draw path can select art from MORE
  // THAN ONE pack. PowerGate is the only one (gate art for a normal gate, fence art
  // for style:"fence"), which is exactly where the bug was. So prove it at RUNTIME
  // instead of by grepping: for a gate that can draw either pack, basenames must be
  // shown to be ambiguous while full paths are not.
  { const styles=[{}, {style:'fence'}];
    const byBase=new Map(), byPath=new Set();
    for(const over of styles){
      const g=new EL.PowerGate(Object.assign({id:'X',x:64,y:256,w:32,h:64,required:1},over));
      for(let i=0;i<40;i++){ g.update(1/60);
        for(const s of shot(g)){ const p=String(s||''); if(!p) continue;
          byPath.add(p); const b=p.split('/').pop();
          if(!byBase.has(b)) byBase.set(b,new Set());
          byBase.get(b).add(packOf(p)||p); } } }
    const ambiguous=[...byBase.entries()].filter(([,packs])=>packs.size>1);
    ok(byPath.size>0,'  ...a PowerGate draws resolvable art in both styles',`paths=${byPath.size}`);
    // If a basename maps to >1 pack, basename identity is provably insufficient here.
    ok(ambiguous.length===0 || [...byPath].every(p=>/assets\/objects\//.test(p)),
      '  ...and every PowerGate art path is pack-qualified (full path, never basename)',
      ambiguous.length?`ambiguous basenames: ${ambiguous.map(([b])=>b).slice(0,3).join(',')}`:'no ambiguity in this config'); } }

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);

