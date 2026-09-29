// TILE / DECORATION FLIP — Chief 2026-09-26
// "add a flip button next to rotate on the level editor; i wanna fllip the orientation of
//  the tile"
//
// Horizontal mirror. Combined with the four existing rotations this reaches all EIGHT
// orientations of a square tile, so a separate vertical button would add nothing reachable.
//
// The thing this suite really protects is that BOTH renderers agree. Every gameplay visual
// in this project has two draw paths — editor/renderer.js and src_scroll — and I have now
// shipped a one-sided fix twice (prop art drew as a generator in the Builder while the game
// was fine). Flip is asserted on both sides, for tiles AND decorations, including the
// transform ORDER, because translate-scale-rotate and translate-rotate-scale both "work" and
// silently disagree with each other on any rotated tile.
globalThis.window={addEventListener(){},removeEventListener(){},innerWidth:1600,innerHeight:900,
  location:{search:''},dispatchEvent(){},devicePixelRatio:1,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){}}};
globalThis.localStorage=window.localStorage; globalThis.sessionStorage=window.sessionStorage;
globalThis.Event=class{constructor(n){this.type=n;}};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=16;this.naturalHeight=16;this._s='';}
  set src(v){this._s=v;} get src(){return this._s;} addEventListener(n,f){if(n==='load')f&&f();}};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
  addEventListener(){},removeEventListener(){},body:{style:{}},
  createElement:()=>({getContext:()=>null,style:{}})};
globalThis.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});

import fs from 'node:fs';
let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

const S   = await import('../editor/state.js');
const A   = await import('../editor/actions.js');
const RED = await import('../editor/renderer.js');
const { Level } = await import('../src_scroll/level.js');

// Records BOTH drawImage calls and the transform ops, in order.
const recorder = () => { const calls=[], ops=[]; return new Proxy({calls,ops},{ get:(t,k)=>{
  if(k==='calls') return calls; if(k==='ops') return ops;
  if(k==='drawImage') return (img,...a)=>{ if(img&&img.src) calls.push({src:String(img.src),a}); };
  if(k==='scale')     return (x,y)=>ops.push(`scale(${x},${y})`);
  if(k==='rotate')    return (r)=>ops.push(`rotate(${(r*180/Math.PI).toFixed(0)})`);
  if(k==='translate') return (x,y)=>ops.push('translate');
  if(k==='save')      return ()=>ops.push('save');
  if(k==='restore')   return ()=>ops.push('restore');
  if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>({addColorStop(){}});
  if(k==='measureText') return ()=>({width:10});
  if(k==='canvas') return {width:800,height:600};
  return ()=>{}; }, set:()=>true}); };

// The Builder resolves tile art through state.manifest (terrainImageForId), so without a
// manifest every tile falls to the coloured-rect fallback and NO transform is emitted.
// My first draft of this suite missed that and reported the Builder as not mirroring, which
// was the harness, not the product. Load the real manifest so the tile path is genuinely
// exercised — the same path the real editor uses.
const _man = JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json','utf8').replace(/^\uFEFF/,''));
const MANIFEST = { items: _man.assets.map(a => ({ id:a.id, name:a.id, category:a.category,
  tags:a.tags||[], path:a.path||'', raw:a, width:a.frame_width, height:a.frame_height })) };
// Assigned ONCE here rather than per-section: state.manifest is module state and every
// Builder render in this suite needs it. Setting it per-section is what I got wrong first.
S.state.manifest = MANIFEST;

const baseLevel = () => ({
  name:'FLIPTEST', number:99, cols:4,
  tiles:[0,0,0,0, 0,0,0,0, 10,10,10,10, 10,10,10,10],
  playerStart:{x:32,y:32}, decorations:[], sources:[], gates:[], switches:[],
  checkpoints:[], platforms:[], enemies:[],
});

sec('State helpers: storage shape matches tileRotations, and old files still load');
{
  S.state.level = baseLevel();
  ok(S.getTileFlip(0,2) === false, 'a level with no tileFlips array reads as not flipped',
    'every level authored before the Flip button must keep working');
  ok(S.setTileFlip(0,2,true) === true, 'setTileFlip creates the array and sets the cell');
  ok(S.state.level.tileFlips.length === S.state.level.tiles.length,
    'the array is exactly parallel to tiles', `${S.state.level.tileFlips.length} entries`);
  ok(S.getTileFlip(0,2) === true, 'and reads back as flipped');
  ok(S.setTileFlip(0,2,true) === false, 'setting the same value again reports no change',
    'so it cannot spam notify() or the dirty flag');
  ok(S.getTileFlip(-1,2) === false && S.setTileFlip(99,2,true) === false,
    'out-of-bounds reads are false and writes are refused');
  // Collision must be untouched — flip is purely visual, same as rotation.
  ok(S.tileIsSolid(S.getTile(0,2)) === true, 'a flipped tile is still solid',
    'flip is visual only; collision reads L.tiles unchanged');
}

sec('Flip action is a TOGGLE with a clean undo');
{
  S.state.level = baseLevel();
  const cells=[{col:0,row:2},{col:1,row:2}];
  const a1=A.flipTiles(cells); ok(!!a1,'flipTiles returns an action for solid cells');
  a1.forward();
  ok(S.getTileFlip(0,2)===true && S.getTileFlip(1,2)===true, 'both cells flip');
  const a2=A.flipTiles(cells); a2.forward();
  ok(S.getTileFlip(0,2)===false && S.getTileFlip(1,2)===false,
    'flipping again returns them to normal — it is a toggle, not an accumulator');
  a2.inverse();
  ok(S.getTileFlip(0,2)===true, 'undo restores the flipped state exactly');
  a1.inverse();
  ok(S.getTileFlip(0,2)===false, 'and undoing the first flip restores the original');
  // empty cells
  S.state.level = baseLevel();
  ok(A.flipTiles([{col:0,row:0}])===null, 'flipping an EMPTY cell is a no-op',
    'a marquee over blank sky must not fill tileFlips with invisible entries');
  ok(A.flipTiles([])===null && A.flipTiles(null)===null, 'no cells means no action');
  // decorations
  const d={src:'a.png',x:0,y:0,w:32,h:32};
  const da=A.flipDecorations([d]); ok(!!da,'flipDecorations returns an action');
  da.forward(); ok(d.flipX===true,'the decoration flips');
  ok(d.w===32 && d.h===32,'and its bbox is UNCHANGED',
    'a horizontal mirror keeps width and height, unlike a 90 rotation');
  da.inverse(); ok(d.flipX===false,'undo unflips it');
}

sec('BOTH renderers mirror the tile, with the SAME transform order');
{
  // ── BUILDER ──
  S.state.level = baseLevel();
  S.state.level.tileFlips = new Array(16).fill(0);
  S.state.level.tileFlips[2*4+0] = 1;           // flip one tile
  S.state.level.tileRotations = new Array(16).fill(0);
  S.state.level.tileRotations[2*4+0] = 90;      // AND rotate it, the interesting case
  S.state.camera={x:0,y:0,zoom:1};
  const ec=recorder(); RED.render(ec,{width:800,height:600});
  const eScale = ec.ops.filter(o=>o==='scale(-1,1)').length;
  ok(eScale === 1, 'BUILDER mirrors exactly the one flipped tile', `${eScale} scale(-1,1) calls`);
  const eSeq = ec.ops.join(' ');
  ok(/translate scale\(-1,1\) rotate\(90\)/.test(eSeq),
    'BUILDER order is translate -> scale -> rotate',
    'scale before rotate mirrors the already-rotated tile, i.e. what the author sees');

  // ── GAME ──
  const def = baseLevel();
  def.tileFlips = new Array(16).fill(0); def.tileFlips[2*4+0] = 1;
  def.tileRotations = new Array(16).fill(0); def.tileRotations[2*4+0] = 90;
  const lv = new Level(def);
  const gc=recorder(); lv.draw(gc, 0, 0, 800, 600);
  const gScale = gc.ops.filter(o=>o==='scale(-1,1)').length;
  ok(gScale === 1, 'GAME mirrors exactly the one flipped tile', `${gScale} scale(-1,1) calls`);
  ok(/translate scale\(-1,1\) rotate\(90\)/.test(gc.ops.join(' ')),
    'GAME order is translate -> scale -> rotate — IDENTICAL to the Builder',
    'if these two ever disagree, Chief authors one thing and plays another');

  // Neither side may mirror anything when nothing is flipped.
  const clean = baseLevel();
  const lv2 = new Level(clean);
  const gc2=recorder(); lv2.draw(gc2,0,0,800,600);
  ok(gc2.ops.filter(o=>o==='scale(-1,1)').length===0, 'GAME mirrors nothing in an unflipped level');
  S.state.level = baseLevel();
  const ec2=recorder(); RED.render(ec2,{width:800,height:600});
  ok(ec2.ops.filter(o=>o==='scale(-1,1)').length===0, 'BUILDER mirrors nothing in an unflipped level');
}

sec('Decoration flip reaches both renderers too');
{
  const def = baseLevel();
  def.decorations=[{src:'assets/tilesets/blue_rooftop/tiles/bt_bldg_r02_c01.png',x:0,y:0,w:32,h:32,flipX:true}];
  const lv=new Level(def);
  const gc=recorder(); lv.draw(gc,0,0,800,600);
  ok(gc.ops.filter(o=>o==='scale(-1,1)').length===1, 'GAME mirrors a flipped decoration');
  S.state.level = structuredClone(def); S.state.camera={x:0,y:0,zoom:1}; S.state.manifest = MANIFEST;
  const ec=recorder(); RED.render(ec,{width:800,height:600});
  ok(ec.ops.filter(o=>o==='scale(-1,1)').length===1, 'BUILDER mirrors it as well');
}

sec('Round-trips through save/load, and the UI is actually wired');
{
  const def = baseLevel();
  def.tileFlips = new Array(16).fill(0); def.tileFlips[8]=1;
  const reloaded = JSON.parse(JSON.stringify(def));
  ok(Array.isArray(reloaded.tileFlips) && reloaded.tileFlips[8]===1,
    'tileFlips survives the JSON round-trip', 'persistence stringifies the level whole');
  const lv=new Level(reloaded);
  ok(lv.tileFlips && lv.tileFlips[8]===1, 'and the runtime reads it back off the reloaded def');
  // Missing array on an old file must not throw anywhere.
  const old = baseLevel(); delete old.tileFlips;
  const lvOld=new Level(old);
  ok(lvOld.tileFlips === null, 'a level with no tileFlips yields null, not a crash');
  const gc=recorder(); lvOld.draw(gc,0,0,800,600);
  ok(gc.calls.length > 0, 'and it still draws its tiles');
  // UI wiring, checked in the source so a missing button cannot pass silently.
  const html = fs.readFileSync('editor.html','utf8');
  ok(/id="btn-flip"/.test(html), 'editor.html has the Flip button');
  const rotIdx = html.indexOf('id="btn-rotate"'), flipIdx = html.indexOf('id="btn-flip"');
  ok(rotIdx > 0 && flipIdx > rotIdx, 'and it sits immediately AFTER Rot, as Chief asked',
    'literally "next to rotate"');
  const main = fs.readFileSync('editor/main.js','utf8');
  ok(/btnFlip\?\.addEventListener/.test(main), 'the button is wired to a click handler');
  ok(/e\.key === 'f' \|\| e\.key === 'F'/.test(main), 'and F is bound as the shortcut');
  ok(/flipDecorations/.test(main) && /flipTiles/.test(main),
    'the handler covers decorations AND tiles', 'Rot does both, so Flip must too');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
