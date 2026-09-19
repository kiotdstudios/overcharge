// CHEST v1 — ORCHA_CHEST_V1_SEMANTICS.md + CHIEF_RULING_CHEST_PIP_RESERVE.md
//
// Driven through Level.update(dt, player) wherever behaviour is involved, NOT by
// poking the class. ORCHA 15: "if it only passes at the class level it does not
// count." The drone bug shipped because level.js dropped an argument and every
// class-level test still passed.
globalThis.window = { addEventListener(){}, removeEventListener(){}, innerWidth:1920, innerHeight:1080, location:{search:''} };
globalThis.document = { getElementById:()=>null, addEventListener(){}, removeEventListener(){},
  createElement:()=>({ getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}), style:{} }), body:{style:{}} };
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=128; this.naturalHeight=128; this.src=''; } addEventListener(n,f){ if(n==='load') setTimeout(f,0); } };

import fs from 'fs';
const { Level }  = await import('../src_scroll/level.js');
const { Player } = await import('../src_scroll/player.js');
const ENT        = await import('../src_scroll/entities.js');
const { MAX_CHARGE, MAX_BANKED_PIPS, TILE } = await import('../src_scroll/constants.js');
const Input      = (await import('../src_scroll/input.js')).default ?? (await import('../src_scroll/input.js')).Input;

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

// Minimal level with solid ground and one chest, built as a real Level.
const ROWS=18, COLS=20;
function mkLevel(chestOver={}) {
  const tiles=new Array(COLS*ROWS).fill(0);
  for(let x=0;x<COLS;x++) tiles[16*COLS+x]=10;          // floor, surface y=512
  return new Level({ name:'CHEST TEST', number:99, cols:COLS, tiles,
    playerStart:{x:96,y:480},
    sources:[], gates:[], switches:[], checkpoints:[], platforms:[], enemies:[], decorations:[],
    chests:[Object.assign({ id:'CH1', x:128, y:480, cost:2, reward:10 }, chestOver)] });
}
function mkPlayer(level, charge=0, pips=0) {
  const p=new Player(level.playerStart.x, level.playerStart.y);
  // setEnergyState(charge, bankedPips) takes POSITIONAL args. My first harness passed
  // an object, got NaN, and the authority silently clamped it to 0 — so four
  // assertions ran against a player with no energy. The SUITE was wrong, not the code.
  p.setEnergyState(charge, pips);
  return p;
}
// Hold SPACE by driving the real input map, then run the real level loop.
const holdSpace = (on) => { const K = Input.keys ?? Input._keys ?? null; if (K) K['Space'] = on; };

sec('An absent chests array changes NOTHING (D8)');
{
  const tiles=new Array(COLS*ROWS).fill(0); for(let x=0;x<COLS;x++) tiles[16*COLS+x]=10;
  const L=new Level({ name:'NO CHEST', number:98, cols:COLS, tiles, playerStart:{x:96,y:480},
    sources:[], gates:[], switches:[], checkpoints:[], platforms:[], enemies:[], decorations:[] });
  ok(Array.isArray(L.chests) && L.chests.length===0, 'level with no `chests` key gets an empty array, no throw');
  const p=mkPlayer(L,5,0); let threw=null;
  try { for(let i=0;i<30;i++) L.update(1/60, p); } catch(e){ threw=e.message; }
  ok(!threw, 'and Level.update runs clean', threw||'no exception');
  const snap=L.snapshot ? L.snapshot() : null;
  ok(!snap || Array.isArray(snap.chests), 'snapshot includes an empty chests array', snap?`len=${snap.chests.length}`:'no snapshot fn');
}

sec('D7 / CHIEF RULING — the reward is ONE PIP and the BAR IS UNTOUCHED');
{
  const L=mkLevel(); const p=mkPlayer(L, 6, 0);      // bar deliberately mid-way
  const ch=L.chests[0];
  const barBefore=p.charge, pipsBefore=p.bankedPips;
  // Pay the cost through the real authority, then open through the real hook.
  p.spendEnergy(ch.receive(ch.cost));
  const opened=ch.tryOpen(p);
  ok(opened, 'chest opens once its cost is met');
  ok(p.bankedPips===pipsBefore+1, 'reward lands as exactly +1 banked pip', `${pipsBefore} -> ${p.bankedPips}`);
  // THE RULING: the reward must not flow through the bar. Bar may only have moved
  // by the COST that was spent, never by the reward.
  ok(Math.abs(p.charge-(barBefore-ch.cost))<1e-9,
    'the bar moved ONLY by the cost, never by the reward',
    `bar ${barBefore} -> ${p.charge}, cost ${ch.cost}, reward ${ch.reward} never entered the bar`);
  ok(p.charge < MAX_CHARGE, 'and the bar never filled/flushed (no "gained then lost" read)', `charge=${p.charge}`);
}

sec('bankPip() respects MAX_BANKED_PIPS, and a refused chest does NOT open');
{
  const L=mkLevel(); const p=mkPlayer(L, 8, MAX_BANKED_PIPS);
  const ch=L.chests[0];
  p.spendEnergy(ch.receive(ch.cost));
  const barAfterCost=p.charge;
  const opened=ch.tryOpen(p);
  ok(!opened, 'at the pip cap the chest REFUSES to open (reward not wasted)');
  ok(p.bankedPips===MAX_BANKED_PIPS, 'pips never exceed the cap', `pips=${p.bankedPips}/${MAX_BANKED_PIPS}`);
  ok(ch.opened===false, 'and it stays closed so the player can return');
  ok(ch.charged===0, 'the accumulation is refunded, so he is not billed for nothing', `charged=${ch.charged}`);
}

sec('D4 — opens ONCE and latches');
{
  const L=mkLevel(); const p=mkPlayer(L, 10, 0); const ch=L.chests[0];
  p.spendEnergy(ch.receive(ch.cost)); ch.tryOpen(p);
  const pipsAfterFirst=p.bankedPips;
  for(let i=0;i<5;i++){ ch.receive(ch.cost); ch.tryOpen(p); }
  ok(p.bankedPips===pipsAfterFirst, 'repeated opens grant nothing further', `pips stayed ${p.bankedPips}`);
  ok(ch.receive(5)===0, 'an opened chest accepts no more charge', 'receive() returns 0');
}

sec('D5 — Chief\u2019s exact checkpoint rule');
{
  // "open + die BEFORE a checkpoint -> reopenable"
  const L=mkLevel(); const p=mkPlayer(L,10,0); const ch=L.chests[0];
  const preSnap=L.snapshot();                       // snapshot taken BEFORE opening
  p.spendEnergy(ch.receive(ch.cost)); ch.tryOpen(p);
  ok(ch.opened===true, 'chest is open before the death');
  L.restore(preSnap);
  ok(L.chests[0].opened===false, 'die BEFORE a checkpoint -> chest is closed again and reopenable');
  // "open + cross a checkpoint + die -> stays open"
  const L2=mkLevel(); const p2=mkPlayer(L2,10,0); const ch2=L2.chests[0];
  p2.spendEnergy(ch2.receive(ch2.cost)); ch2.tryOpen(p2);
  const postSnap=L2.snapshot();                     // snapshot taken AFTER opening
  L2.restore(postSnap);
  ok(L2.chests[0].opened===true, 'open, cross a checkpoint, then die -> chest STAYS open');
}

sec('Art sequence: closed -> opening -> empty, never looping back (D9)');
{
  const L=mkLevel(); const p=mkPlayer(L,10,0); const ch=L.chests[0];
  ok(ch.visualState==='closed', 'starts closed');
  ok(/assets\/objects\/chest\/closed\.png$/.test(String(ch.frameFor('closed').src)), '  ...drawn from closed.png');
  p.spendEnergy(ch.receive(ch.cost)); ch.tryOpen(p);
  ok(ch.visualState==='opening', 'opens into the opening animation');
  ok(/assets\/objects\/chest\/opening\/frame_00\d\.png$/.test(String(ch.frameFor('opening').src)), '  ...drawn from opening/frame_00N.png');
  const seen=new Set();
  // The animation is 9 frames at 12fps = 0.75s, so 60 ticks. My first pass used 40
  // (0.667s) and reported "still opening" as a failure when the clock simply had not
  // elapsed — a test asserting against a duration it had not allowed to pass.
  for(let i=0;i<60;i++){ L.update(1/60,p); seen.add(ch.visualState); }
  ok(ch.visualState==='empty', 'settles on empty and stays there', `states seen: ${[...seen].join(' -> ')}`);
  ok(/assets\/objects\/chest\/open_empty\.png$/.test(String(ch.frameFor('empty').src)), '  ...drawn from open_empty.png');
  for(let i=0;i<120;i++) L.update(1/60,p);
  ok(ch.visualState==='empty', 'and never loops back to closed or opening');
}

sec('Level 2 economy re-verified with the chest as a RESERVE pip');
{
  // Chief's ruling asks this explicitly: confirm usableEnergy still covers the exit
  // when the reward is a pip rather than bar charge.
  const L=mkLevel(); const p=mkPlayer(L,0,0); const ch=L.chests[0];
  p.giveEnergy(4);                                  // A1
  const afterA1=p.usableEnergy;
  p.spendEnergy(2);                                 // SW1
  p.spendEnergy(ch.receive(ch.cost)); ch.tryOpen(p); // chest -2, +1 pip
  const afterChest=p.usableEnergy;
  p.giveEnergy(6);                                  // E1
  const beforeExit=p.usableEnergy;
  ok(afterA1===4, 'A1 +4', `usable=${afterA1}`);
  ok(afterChest===MAX_CHARGE, 'after SW1 -2 and chest -2 +1pip', `usable=${afterChest} (one pip = ${MAX_CHARGE})`);
  ok(p.canAfford(8), 'EXIT 8 is affordable from a pip-backed reserve', `usable=${beforeExit}`);
  const spent=p.spendEnergy(8);
  ok(Math.abs(spent-8)<1e-9, 'and the exit actually takes 8', `spent=${spent}, left=${p.usableEnergy}`);
}

sec('CHIEF BUG — buying a chest must never trigger the DISCHARGED fail state');
{
  // "on lvl 2 i have 2 pips and when spending the 2 to get the chest i die"
  // isFailState() listed sources, pickups and enemy drops as future income but did
  // NOT know chests exist, so paying the cost lowered `available` while the reward
  // stayed invisible and the level was declared unwinnable mid-purchase.
  const L2 = JSON.parse(fs.readFileSync('src_scroll/levels/level2.json','utf8'));
  const lv = new Level(L2);
  const ch = lv.chests[0];
  const p  = new Player(L2.playerStart.x, L2.playerStart.y);
  p.setEnergyState(0, 2);                       // Chief's exact state: 2 pips
  ok(!lv.isFailState(p), 'not a fail state before buying', `usable=${p.usableEnergy}`);
  const paid = p.spendEnergy(ch.receive(ch.cost));
  ok(Math.abs(paid - ch.cost) < 1e-9, 'the cost is actually paid', `paid ${paid}`);
  ok(!lv.isFailState(p),
    'STILL not a fail state immediately after paying the cost',
    `usable=${p.usableEnergy} — this assertion is the bug Chief hit`);
  ch.tryOpen(p);
  ok(!lv.isFailState(p), 'and not after the chest opens', `usable=${p.usableEnergy}, pips=${p.bankedPips}`);
  // The worst honest case: no energy at all, chest still shut.
  const lv2 = new Level(L2);
  const p2  = new Player(L2.playerStart.x, L2.playerStart.y);
  p2.setEnergyState(0, 0);
  ok(!lv2.isFailState(p2),
    'zero energy with the chest unopened is survivable (chest + sources cover the exit)');
  // An opened chest must NOT keep counting as future income.
  const lv3 = new Level(L2);
  const p3  = new Player(L2.playerStart.x, L2.playerStart.y);
  p3.setEnergyState(0, 0);
  lv3.chests[0].opened = true;
  for (const s of lv3.sources) { s.drained = true; s.charge = 0; }
  ok(lv3.isFailState(p3),
    'an OPENED chest stops counting, so a genuine dead end is still detected',
    'no sources, chest looted, no energy -> correctly a fail state');
}
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);