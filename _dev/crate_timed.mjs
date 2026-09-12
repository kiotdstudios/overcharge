// ORDER CRATE_TIMED — System 1 (conductive crate) + System 2 (timed device).
// Semantics ratified in docs/KIRO_RULING_CRATE_TIMED_V1.md (D1-D9, D5 vetoed).
//
// GEOMETRY NOTE: PLAYER_W=20, PLAYER_H=30 (not 64 — an early draft of this file
// assumed 64 and every "push" assertion failed for rig reasons, not code
// reasons). Floor row 13 top = y 416, so a standing body of height h sits at
// y = 416 - h. All rigs below derive y from the real dimensions.
const _l={};
globalThis.window={addEventListener(n,f){(_l[n]=_l[n]||[]).push(f);},removeEventListener(){},innerWidth:1920,innerHeight:1080,location:{search:''}};
const fire=(t,code)=>{for(const f of (_l[t]||[]))f({code,preventDefault(){}});};
globalThis.document={getElementById:()=>null,addEventListener(){},removeEventListener(){},createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}),style:{}}),body:{style:{}}};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=1152;this.naturalHeight=384;}addEventListener(n,f){if(n==='load')setTimeout(f,0);}};

const { Player } = await import('../src_scroll/player.js');
const { Crate }  = await import('../src_scroll/entities.js');
const EL         = await import('../src_scroll/electricity.js');
const { Level }  = await import('../src_scroll/level.js');
const Input      = await import('../src_scroll/input.js');
const { TILE, MAX_CHARGE, CRATE_CONTACT_PAD, PLAYER_H, PLAYER_W, INTERACT_RADIUS } = await import('../src_scroll/constants.js');

let pass=0, fail=0;
const sec=t=>console.log('\n'+t);
function ok(c,label,detail=''){ if(c){pass++;console.log('  \u2713 '+label+(detail?' \u2014 '+detail:''));} else {fail++;console.log('  \u2717 '+label+(detail?' \u2014 '+detail:''));} }
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const keyDown=c=>fire('keydown',c), keyUp=c=>fire('keyup',c);
const relAll=()=>{['Space','KeyK','KeyE','KeyF'].forEach(keyUp);Input.update();};

const FLOOR=13*TILE;                 // 416
const STAND=FLOOR-PLAYER_H;          // player y when standing on the floor
function mk(over={}){
  const cols=over.cols||24, tiles=new Array(cols*14).fill(0);
  for(let x=0;x<cols;x++) tiles[13*cols+x]=10;
  return new Level(Object.assign({name:'T',number:99,cols,tiles,playerStart:{x:32,y:STAND},
    decorations:[],sources:[],gates:[],switches:[],checkpoints:[],platforms:[],enemies:[],crates:[]},over));
}
const gateAt=(x,extra={})=>Object.assign({id:'G',x,y:FLOOR-64,w:40,h:64,required:4},extra);
const crateAt=(x,id='C1',w=32)=>({id,x,y:FLOOR-32,w,h:32});
function stand(p,x){ p.x=x; p.y=STAND; p.vx=0; p.vy=0; p.grounded=true; }

sec('SCHEMA / BACKWARD COMPATIBILITY');
{ const L=mk();
  ok(Array.isArray(L.crates)&&L.crates.length===0,'level with no crates field -> empty crates array');
  const L2=new Level({name:'T',number:1,cols:10,tiles:new Array(140).fill(0)});
  ok(Array.isArray(L2.crates)&&L2.crates.length===0,'level omitting EVERY array still constructs (no regression)'); }
{ const L=mk({crates:[{id:'C1',x:100,y:200}]});
  const c=L.crates[0];
  ok(c.w===32&&c.h===32,'crate w/h default to one tile',`${c.w}x${c.h}`);
  ok(c.charge===undefined,'D1: crate has NO charge field (it is a wire, not a battery)'); }

sec('D2 — CONTACT TEST (2px inflation)');
{ const L=mk({gates:[gateAt(320)]});
  const g=L.gates[0];
  ok(CRATE_CONTACT_PAD===2,'contact pad is the ratified 2px',String(CRATE_CONTACT_PAD));
  ok(new Crate({id:'F',x:288,y:FLOOR-32}).touches(g),'crate FLUSH against gate counts as contact (0px gap)');
  ok(new Crate({id:'N',x:287,y:FLOOR-32}).touches(g),'crate 1px away counts as contact');
  // The inflated overlap uses STRICT inequality, matching every other AABB test in
  // the codebase, so exactly-2px is the EXCLUSIVE boundary. Documented, not fudged.
  ok(!new Crate({id:'B',x:286,y:FLOOR-32}).touches(g),'exactly 2px is the exclusive boundary');
  ok(!new Crate({id:'X',x:280,y:FLOOR-32}).touches(g),'crate 8px away does NOT count (cannot bridge a visible gap)');
  ok(!new Crate({id:'A',x:288,y:0}).touches(g),'crate far above the gate does NOT count (Y must overlap too)'); }

sec('D5 (KIRO VETO) — BRIDGE RESOLUTION: ok / none / ambiguous');
{ const L=mk({gates:[gateAt(320)],crates:[crateAt(288)]});
  ok(L.crates[0].bridgeTarget(L).state==='ok','crate touching exactly ONE gate -> ok');
  ok(L.crates[0].bridgeTarget(L).target===L.gates[0],'  ...and resolves to that gate'); }
{ const L=mk({crates:[crateAt(288)]});
  ok(L.crates[0].bridgeTarget(L).state==='none','crate touching nothing -> none (D4 refusal)'); }
{ // gate AND switch both against the crate's right edge
  const L=mk({gates:[gateAt(320)],switches:[{id:'SW',x:320,y:FLOOR-32,required:2,linkedId:'G'}],crates:[crateAt(288)]});
  const b=L.crates[0].bridgeTarget(L);
  ok(b.state==='ambiguous','crate touching a gate AND a switch -> ambiguous',`hits=${b.all.length}`);
  ok(b.target===null,'  ...target is null: REFUSES rather than guessing first-in-order'); }
{ const L=mk({gates:[gateAt(320),gateAt(240,{id:'G2'})],crates:[crateAt(288)]});
  L.gates[1].open=true;
  ok(L.crates[0].bridgeTarget(L).state==='ok','an OPEN gate is not an eligible target (no false ambiguity)'); }
{ const L=mk({gates:[gateAt(320,{blockOnly:true})],crates:[crateAt(288)]});
  ok(L.crates[0].bridgeTarget(L).state==='none','blockOnly gate excluded (no laundering past switch-only intent)'); }
{ const L=mk({sources:[{id:'GEN',x:320,y:FLOOR-32,charge:4}],crates:[crateAt(288)]});
  ok(L.crates[0].bridgeTarget(L).state==='none',
    'KIRO CORRECTION: a SOURCE is not a delivery target (it has no receive())'); }

sec('D6 — PUSH primitives');
{ const L=mk({crates:[crateAt(320)]});
  const c=L.crates[0], x0=c.x;
  ok(c.tryMoveX(6,L)===6&&near(c.x,x0+6),'crate moves into clear space',`${x0} -> ${c.x}`);
  ok(c.tryMoveX(-6,L)===-6,'crate moves back left'); }
{ const L=mk({cols:20,crates:[crateAt(TILE*18)]});
  ok(L.crates[0].tryMoveX(200,L)===0,'crate CANNOT be pushed off the level edge'); }
{ const L=mk({gates:[gateAt(320)],crates:[crateAt(288)]});
  ok(L.crates[0].tryMoveX(10,L)===0,'crate CANNOT be pushed into a CLOSED gate'); }
{ const L=mk({gates:[gateAt(320)],crates:[crateAt(288)]});
  L.gates[0].open=true;
  ok(L.crates[0].tryMoveX(10,L)===10,'  ...but CAN be pushed through an OPEN gate'); }
{ const L=mk({crates:[crateAt(320,'A'),crateAt(352,'B')]});
  ok(L.crates[0].tryMoveX(10,L)===0,'crates block each other'); }
{ const L=mk({crates:[crateAt(320)]});
  L.tiles[12*L.cols+11]=10;
  ok(L.crates[0].tryMoveX(24,L)===0,'crate CANNOT be pushed into a solid tile'); }

sec('D6 — PLAYER PUSH INTEGRATION (real _resolveX)');
{ const L=mk({crates:[crateAt(200)]});
  const p=new Player(64,STAND); const c=L.crates[0], cx0=c.x;
  stand(p,c.x-p.w+4); p.vx=120;
  p._resolveX(L);
  ok(c.x>cx0,'walking into a crate pushes it',`crate ${cx0} -> ${c.x.toFixed(1)}`);
  ok(near(p.x+p.w,c.x),'  ...player ends flush against it, never inside',`p.right=${(p.x+p.w).toFixed(1)} c.x=${c.x.toFixed(1)}`); }
{ const L=mk({crates:[crateAt(200)]});
  const p=new Player(64,STAND); const c=L.crates[0], cx0=c.x;
  stand(p,c.x+c.w-4); p.vx=-120;
  p._resolveX(L);
  ok(c.x<cx0,'crates can be pushed LEFT too',`${cx0} -> ${c.x.toFixed(1)}`); }
{ const L=mk({gates:[gateAt(320)],crates:[crateAt(288)]});
  const p=new Player(64,STAND); const c=L.crates[0], cx0=c.x;
  stand(p,c.x-p.w+4); p.vx=120;
  p._resolveX(L);
  ok(c.x===cx0,'crate wedged against a closed gate does not move');
  ok(p.vx===0,'  ...and the PLAYER is blocked instead (D6 resolution order)'); }
{ const L=mk({crates:[crateAt(200)]});
  const p=new Player(64,STAND); const c=L.crates[0], cy0=c.y, cx0=c.x;
  p.x=c.x+2; p.y=c.y-p.h; p.vx=100; p.grounded=true;   // standing ON it
  p._resolveX(L);
  ok(c.y===cy0,'standing on a crate never lifts it (no vertical push)');
  ok(c.x===cx0,'  ...and walking on top does not drag it'); }

sec('D7 — CRATE IS SOLID (stand on top)');
{ const L=mk({crates:[crateAt(200)]});
  const p=new Player(200,0); const c=L.crates[0];
  p.x=c.x; p.y=c.y-p.h-2; p.vy=200;
  const prevBottom=p.y+p.h;
  p.y+=4;
  p._resolveCrates(L,prevBottom);
  ok(p.grounded===true&&near(p.y,c.y-p.h),'player lands on top of a crate',`y=${p.y} expect ${c.y-p.h}`);
  ok(p.vy===0,'  ...vertical velocity zeroed'); }

sec('GRAVITY / RESTING');
{ const L=mk({crates:[{id:'C1',x:200,y:100}]});
  const c=L.crates[0];
  for(let i=0;i<180;i++) c.update(1/60,L);
  ok(near(c.y,FLOOR-c.h,0.5)&&c.grounded,'a crate falls and rests on the floor',`y=${c.y.toFixed(2)}`);
  ok(near(c.vy,0),'  ...velocity settles to 0'); }
{ const L=mk({crates:[{id:'A',x:200,y:FLOOR-32},{id:'B',x:200,y:100}]});
  for(let i=0;i<180;i++) for(const c of L.crates) c.update(1/60,L);
  ok(near(L.crates[1].y,L.crates[0].y-32,1),'a crate stacks on top of another crate',`y=${L.crates[1].y.toFixed(1)}`); }

sec('D3 / D4 / D5 — CHARGING THROUGH A CRATE (real SPACE input)');
// A WIDE crate (64px) is used so the player stands beyond INTERACT_RADIUS of the
// gate itself. With a 1-tile crate the player is usually already in direct range
// of the gate, so the crate route is never offered — a real design consequence,
// documented rather than worked around.
function rig(extra={}){
  const L=mk(Object.assign({gates:[gateAt(320)],crates:[crateAt(256,'C1',64)]},extra));
  const p=new Player(64,STAND);
  p.setEnergyState(MAX_CHARGE,0);
  stand(p,L.crates[0].x-p.w);
  return {L,p,g:L.gates[0],c:L.crates[0]};
}
{ relAll(); const {L,p,g}=rig();
  p._updateContext(L);
  ok(p.nearDevice===null,'player is beyond direct range of the gate',`gateDist>${INTERACT_RADIUS}`);
  ok(p.nearCrate!==null,'player beside a crate registers nearCrate');
  ok(p.crateBridge==='ok'&&p.crateTarget===g,'  ...bridge ok, target resolved to the gate');
  const before=p.usableEnergy;
  keyDown('Space'); p._updateDischarge(1/60,L);
  ok(g.charged>0,'SPACE charges the gate THROUGH the crate',`gate charged ${g.charged.toFixed(4)}`);
  ok(near(before-p.usableEnergy,g.charged),'  ...conserved exactly',
     `player -${(before-p.usableEnergy).toFixed(4)} gate +${g.charged.toFixed(4)}`);
  ok(p.chargeViaCrate!==null,'  ...marked crate-routed (for the render flash)');
  relAll(); }
{ relAll(); const {L,p,g,c}=rig();
  p._updateContext(L);
  keyDown('Space'); for(let i=0;i<10;i++) p._updateDischarge(1/60,L);
  ok(c.charge===undefined,'D1: crate stores nothing after conducting (pure conduit)');
  ok(g.charged>0,'  ...all of it went to the device',`${g.charged.toFixed(4)}`); relAll(); }
{ relAll(); const L=mk({crates:[crateAt(256,'C1',64)]});
  const p=new Player(64,STAND); p.setEnergyState(MAX_CHARGE,0); stand(p,L.crates[0].x-p.w);
  p._updateContext(L);
  ok(p.crateBridge==='none','crate bridging nothing -> HUD state none');
  const before=p.usableEnergy;
  keyDown('Space'); for(let i=0;i<30;i++) p._updateDischarge(1/60,L);
  ok(p.usableEnergy===before,'D4: charging an unconnected crate costs NOTHING',`usable still ${p.usableEnergy}`);
  ok(p.discharging===false,'  ...and the player never enters the charging state'); relAll(); }
{ relAll(); // both devices on the crate's far edge -> ambiguous, player far from both
  const L=mk({gates:[gateAt(320)],switches:[{id:'SW',x:320,y:FLOOR-32,required:2,linkedId:'G'}],crates:[crateAt(256,'C1',64)]});
  const p=new Player(64,STAND); p.setEnergyState(MAX_CHARGE,0); stand(p,L.crates[0].x-p.w);
  p._updateContext(L);
  ok(p.nearDevice===null,'player beyond direct range of BOTH devices');
  ok(p.crateBridge==='ambiguous','crate touching two devices -> ambiguous');
  const before=p.usableEnergy, gc=L.gates[0].charged, sc=L.switches[0].charged;
  keyDown('Space'); for(let i=0;i<30;i++) p._updateDischarge(1/60,L);
  ok(p.usableEnergy===before,'multi-contact refuses and warns, player charge unchanged',`usable ${p.usableEnergy}`);
  ok(L.gates[0].charged===gc&&L.switches[0].charged===sc,'  ...and NEITHER device received anything'); relAll(); }
{ relAll(); const L=mk({gates:[gateAt(320)],crates:[crateAt(288)]});
  const p=new Player(64,STAND); p.setEnergyState(MAX_CHARGE,0); stand(p,300);
  p._updateContext(L);
  ok(p.nearDevice!==null&&p.nearCrate===null,'standing at the device itself: crate route not offered'); relAll(); }
{ relAll(); const {L,p,g}=rig();
  p._updateContext(L);
  const before=p.usableEnergy;
  keyDown('Space');
  for(let i=0;i<600&&!g.open;i++){ p._updateContext(L); p._updateDischarge(1/60,L); }
  ok(g.open===true,'sustained crate-charging OPENS the gate',`charged ${g.charged}/4`);
  ok(near(before-p.usableEnergy,4,1e-6),'  ...exactly `required` left the player',`spent ${(before-p.usableEnergy).toFixed(6)}`);
  relAll(); }

sec('D9 — TIMED DEVICE');
{ const g=new EL.PowerGate(gateAt(320,{timed:true,duration:2,required:2}));
  ok(g.timed===true&&g.duration===2,'timed gate parses timed/duration');
  ok(g._timeLeft===0,'  ...timer starts at 0 (not counting before it opens)');
  g.receive(2);
  ok(g.open===true,'charging it full opens it');
  ok(near(g._timeLeft,2),'  ...and starts the countdown at `duration`',`_timeLeft=${g._timeLeft}`);
  for(let i=0;i<60;i++) g.update(1/60);
  ok(g._timeLeft>0.9&&g._timeLeft<1.1,'  ...counts down while open',`_timeLeft=${g._timeLeft.toFixed(3)}`);
  ok(g.open===true,'  ...still open mid-countdown');
  for(let i=0;i<90;i++) g.update(1/60);
  ok(g.open===false,'EXPIRY: gate closes');
  ok(g.charged===0,'  ...drains to empty (must be re-charged)');
  ok(g._timeLeft===0,'  ...timer clamps to 0');
  ok(g.blocks(320,FLOOR-64,32,64),'  ...blocking RESUMES after expiry'); }
{ const g=new EL.PowerGate(gateAt(320,{timed:true,duration:1,required:1}));
  g.receive(1);
  // Expire it FULLY before observing: duration is 1s, so 90 frames at 1/60 is
  // comfortably past. (An earlier draft used 40 frames = 0.67s and the gate was
  // still open — the assertion failed for rig reasons, not code reasons.)
  for(let i=0;i<90;i++) g.update(1/60);
  ok(g.isDormant===true,'KIRO CONSTRAINT: an EXPIRED timed gate is DORMANT, not idle-animated');
  ok(g.open===false&&g.charged===0,'  ...(confirmed expired before observing the draw)');
  // The recorder identifies the SOURCE IMAGE by identity, not by argument count.
  // Both the dead art and the spritesheet use the 9-arg drawImage form, while the
  // OPEN sprite uses the 5-arg form — an earlier draft keyed off arg count and
  // mislabelled the open sprite as dead art.
  const calls=[]; const noop=()=>{};
  const rec=new Proxy({drawImage(...a){
      const which = a[0]===g._deadImg ? 'DEAD-ART' : (a[0]===g._sheet ? ('sheet:'+a[1]+','+a[2]) : 'other');
      calls.push({which});
    },
    fillRect:noop,strokeRect:noop,fillText:noop,measureText:()=>({width:0}),save:noop,restore:noop,beginPath:noop,fill:noop,stroke:noop},
    {get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>{if(k==='shadowBlur')calls.blur=v;return true;}});
  const seen=new Set();
  for(let i=0;i<120;i++){ g.update(1/60); calls.length=0; g.draw(rec);
    for(const c of calls) seen.add(c.which); }
  ok(seen.size===1,'  ...emits ONE static frame over 2s (no animation)',`variants=${[...seen]}`);
  ok([...seen][0]==='DEAD-ART','  ...drawn from the dedicated TRUE DEAD art',`got ${[...seen][0]}`);
  ok(calls.blur===0,'  ...and does not glow',`shadowBlur=${calls.blur}`); }
{ const g=new EL.PowerGate(gateAt(320,{timed:true,duration:1,required:2}));
  g.receive(2); for(let i=0;i<80;i++) g.update(1/60);
  ok(g.open===false&&g.charged===0,'expired gate is closed and empty');
  g.receive(2);
  ok(g.open===true&&near(g._timeLeft,1),'  ...and can be charged again, restarting the timer'); }
{ const g=new EL.PowerGate(gateAt(320,{required:2}));
  g.receive(2);
  ok(g.open===true,'non-timed gate opens');
  for(let i=0;i<600;i++) g.update(1/60);
  ok(g.open===true&&g.charged===2,'REGRESSION: a non-timed gate NEVER expires',`open=${g.open} charged=${g.charged}`);
  ok(g._timeLeft===0,'  ...and never runs a timer'); }
{ const g=new EL.PowerGate(gateAt(320,{timed:true,duration:2,required:2,isExit:true}));
  ok(g.timed===false,'timed + isExit is REFUSED (timed ignored, warned)');
  g.receive(2);
  for(let i=0;i<600;i++) g.update(1/60);
  ok(g.open===true,'  ...so a timed exit can never expire and strand the player'); }

sec('D8 — SNAPSHOT / RESTORE ROUND-TRIP');
{ const L=mk({crates:[crateAt(200)],checkpoints:[{id:'CP1',x:100,y:STAND}]});
  const c=L.crates[0];
  const snap=L.snapshot();
  ok(Array.isArray(snap.crates)&&snap.crates.length===1,'snapshot() includes crates');
  ok(snap.crates[0].x===c.x&&snap.crates[0].y===c.y,'  ...capturing x/y');
  c.tryMoveX(64,L); c.vy=123;
  ok(c.x!==snap.crates[0].x,'crate moved after the snapshot');
  L.restore(snap);
  ok(c.x===snap.crates[0].x&&c.y===snap.crates[0].y,'restore() rewinds the crate position',`x=${c.x}`);
  ok(c.vy===snap.crates[0].vy,'  ...and its velocity'); }
{ const L=mk({crates:[crateAt(200)]});
  const legacy=L.snapshot(); delete legacy.crates;
  let threw=false; try{ L.restore(legacy); }catch(e){ threw=true; }
  ok(!threw,'restore() tolerates a snapshot with no crates field (no throw)'); }
{ const L=mk({gates:[gateAt(320,{timed:true,duration:4,required:2})]});
  const g=L.gates[0];
  g.receive(2); for(let i=0;i<120;i++) g.update(1/60);
  const snap=L.snapshot();
  ok(snap.gates[0]._timeLeft>1.9&&snap.gates[0]._timeLeft<2.1,'D9: snapshot captures _timeLeft mid-countdown',
     `_timeLeft=${snap.gates[0]._timeLeft.toFixed(3)}`);
  for(let i=0;i<60;i++) g.update(1/60);
  L.restore(snap);
  ok(g._timeLeft>1.9&&g._timeLeft<2.1,'  ...and restore rewinds it (no free time from dying)',`${g._timeLeft.toFixed(3)}`); }

sec('CONSERVATION THROUGH A CRATE (randomized)');
{ let worst=0, illegal=0;
  for(let run=0;run<200;run++){
    relAll();
    const L=mk({gates:[gateAt(320,{required:999})],crates:[crateAt(256,'C1',64)]});
    const p=new Player(64,STAND);
    p.setEnergyState(Math.random()*MAX_CHARGE, Math.floor(Math.random()*3));
    stand(p,L.crates[0].x-p.w);
    p._updateContext(L);
    const start=p.usableEnergy;
    keyDown('Space');
    for(let i=0;i<40;i++){ p._updateDischarge(1/60,L);
      if(p.charge<-1e-9||p.charge>MAX_CHARGE+1e-9||p.bankedPips<0) illegal++; }
    relAll();
    worst=Math.max(worst,Math.abs((start-p.usableEnergy)-L.gates[0].charged));
  }
  ok(worst<1e-6,'200 randomized crate-routed runs conserve energy exactly',`worst drift ${worst.toExponential(2)}`);
  ok(illegal===0,'  ...and never leave the legal energy envelope',`${illegal} violations`); }

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
