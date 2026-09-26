// PROP SOURCES — absorbable electric props (CHIEF 2026-09-26)
// "the new electric HVAC unit and the other electric props need to be filtered together and
//  are new absorbable assests; i put the lamp on lvl 1 but doesnt let me absorb it"
// The lamp was placed as a DECORATION, which is inert art. These assertions cover the whole
// chain: manifest declares it spawnable, the editor writes a real source, the runtime builds
// it with the right kind and art, and the player can actually walk up and drain it.
const _L={};
globalThis.window={addEventListener:(t,f)=>{(_L[t]=_L[t]||[]).push(f);},removeEventListener(){},innerWidth:1600,innerHeight:900,location:{search:''},dispatchEvent(){}};
globalThis.document={getElementById:()=>null,addEventListener:(t,f)=>{(_L[t]=_L[t]||[]).push(f);},removeEventListener(){},body:{style:{}},hidden:false,createElement:()=>({getContext:()=>null,style:{}})};
globalThis.Event=class{constructor(n){this.type=n;}};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;this._s='';}set src(v){this._s=v;}get src(){return this._s;}addEventListener(n,f){if(n==='load')f&&f();}};
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
globalThis.sessionStorage={getItem:()=>null,setItem(){}};
globalThis.fetch=globalThis.fetch||(async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''}));
import fs from 'node:fs';
const Input=await import('../src_scroll/input.js');
const { Level }=await import('../src_scroll/level.js');
const { Player }=await import('../src_scroll/player.js');
const EL=await import('../src_scroll/electricity.js');
const SV=await import('../src_scroll/source-visuals.js');
const C=await import('../src_scroll/constants.js');

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);
const fire=(t,c)=>{for(const f of (_L[t]||[]))f({code:c,preventDefault(){}});};
const manifest=JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json','utf8').replace(/^\uFEFF/,''));
const PROPS=['prop_ncp_fuse_box','prop_ncp_neon_sign','prop_ncp_security_camera','prop_ncp_streetlight','prop_ncp_vending_machine'];

sec('Manifest: HVAC and the props filter TOGETHER, and all are placeable');
{
  const el = manifest.assets.filter(a=>(a.tags||[]).includes('electric'));
  ok(el.length === 6, 'the Electric filter matches 6 assets', 'HVAC source + 5 props');
  ok(el.some(a=>a.id==='source_hvac'), 'HVAC is one of them',
    'Chief: "the new electric HVAC unit and the other electric props need to be filtered together"');
  for (const id of PROPS) {
    const a = manifest.assets.find(x=>x.id===id);
    ok(!!a, `${id} is in the assets array`, a ? '' : 'if it is in _runtime_state_sprites the browser cannot see it');
    if (!a) continue;
    ok((a.tags||[]).includes('electric'), `${id} carries the electric tag`);
    ok(a.spawnsKind === 'source-prop', `${id} declares spawnsKind source-prop`,
      'without this the editor places it as inert decoration, which is the reported bug');
    ok(Number.isFinite(a.frame_count) && a.frame_count >= 7,
      `${id} declares >= 7 frames`, 'frame 6 is the drained state per Aki\u2019s notes');
  }
  // Every frame Aki documents must exist on disk, or a drained prop renders as nothing.
  for (const id of PROPS) {
    const a = manifest.assets.find(x=>x.id===id); if(!a) continue;
    const dir = String(a.path).replace(/[^/]*$/,'');
    let missing = 0;
    for (let i=0;i<a.frame_count;i++) if(!fs.existsSync(`${dir}${String(i).padStart(2,'0')}.png`)) missing++;
    ok(missing === 0, `${id}: all ${a.frame_count} frame files exist`, missing?`${missing} missing`:'');
  }
}

sec('Runtime: kind:\'prop\' survives construction and loads its own art');
{
  const a = manifest.assets.find(x=>x.id==='prop_ncp_streetlight');
  const dir = String(a.path).replace(/[^/]*$/,'');
  const s = new EL.ElectricalSource({ id:'t', x:100, y:100, charge:4, kind:'prop',
    sprite:dir, frames:a.frame_count, artW:a.frame_width, artH:a.frame_height });
  ok(s.kind === 'prop', 'kind stays "prop"',
    'it was previously whitelisted to hvac/light only, so a prop silently became a generator');
  ok(s._frames.length === a.frame_count, `loaded ${a.frame_count} frames`);
  ok(s._frames[0].src === `${dir}00.png`, 'first frame is 00.png', s._frames[0].src);
  ok(s._frames[6].src === `${dir}06.png`, 'drained frame is 06.png');
  // geometry: art bottom on the hitbox bottom, centred
  const b = SV.sourceBox(s);
  ok(b.dW === a.frame_width && b.dH === a.frame_height, 'box uses the prop\u2019s own art size',
    `${b.dW}x${b.dH}`);
  ok(b.dY + b.dH === s.y + s.h, 'art BOTTOM sits on the hitbox bottom',
    'so a 192px lamp stands on the floor instead of floating by its own height');
  ok(Math.abs((b.dX + b.dW/2) - s.cx) < 0.01, 'art is horizontally centred on the hitbox');
  // a generator must be untouched by all of this
  const g = new EL.ElectricalSource({ id:'g', x:100, y:100, charge:4 });
  ok(g.kind === 'generator', 'a plain source is still a generator');
  const gb = SV.sourceBox(g);
  ok(gb.dW === 64 && gb.dH === 64, 'generator box is still 64x64', 'prop geometry must not leak');
}

sec('Frame states follow Aki\u2019s notes — OBSERVED THROUGH THE REAL draw() CALL');
{
  // REWRITTEN. My first version computed the frame with a copy of my own formula and
  // asserted that. Deleting the `kind === 'prop'` dispatch from draw() left the suite at a
  // clean 50/0, because nothing here actually invoked the renderer — I was testing my
  // arithmetic, not the game. Same vacuous shape as the camera "0..578" check.
  // Now: a recording ctx captures what draw() really puts on screen, so the assertion fails
  // if the dispatch is removed, if the art is drawn at the wrong size, or if the frame
  // ranges drift from Aki's documented sheet.
  const recCtx = () => { const calls=[]; return { calls,
    save(){}, restore(){}, fillRect(){}, strokeRect(){}, fillText(){},
    set fillStyle(v){}, set strokeStyle(v){}, set font(v){}, set globalAlpha(v){},
    set shadowColor(v){}, set shadowBlur(v){}, set textAlign(v){}, set lineWidth(v){},
    beginPath(){}, moveTo(){}, lineTo(){}, arc(){}, fill(){}, stroke(){}, closePath(){},
    createRadialGradient(){ return { addColorStop(){} }; },
    createLinearGradient(){ return { addColorStop(){} }; },
    translate(){}, rotate(){}, scale(){}, clip(){}, rect(){}, drawImage(img,dx,dy,dw,dh){ calls.push({src:img&&img.src,dx,dy,dw,dh}); } }; };
  const mk = () => new EL.ElectricalSource({ id:'t', x:100, y:100, charge:4, kind:'prop',
    sprite:'assets/objects/night-city-props/streetlight/', frames:8, artW:192, artH:192 });
  // frame index actually DRAWN, parsed back out of the sprite filename
  const drawnFrame = (s) => { const c=recCtx(); s.draw(c);
    const last=c.calls[c.calls.length-1];
    if(!last || !last.src) return null;
    const m=String(last.src).match(/(\d+)\.png$/); return m ? Number(m[1]) : null; };

  const s1 = mk();
  ok(drawnFrame(s1) !== null, 'draw() actually draws a prop sprite',
    'if draw() does not dispatch to the prop path this is null and everything below is moot');
  const c0 = recCtx(); s1.draw(c0);
  ok(c0.calls.length === 1 && c0.calls[0].dw === 192 && c0.calls[0].dh === 192,
    'drawn at the prop\u2019s own 192x192, once', JSON.stringify(c0.calls[0]));
  ok(c0.calls[0].dy + 192 === s1.y + s1.h, 'and with its feet on the hitbox bottom');

  const idle=new Set(); for(let i=0;i<60;i++){ s1.update(1/60); idle.add(drawnFrame(s1)); }
  ok([...idle].every(f=>f<=1), 'idle draws only frames 0-1', '['+[...idle].sort().join(',')+']');

  const s2 = mk(); const abs=new Set();
  for(let i=0;i<60;i++){ s2.drain(0.01); s2.update(1/60); abs.add(drawnFrame(s2)); }
  ok([...abs].every(f=>f>=2&&f<=5), 'while draining, draws only frames 2-5', '['+[...abs].sort().join(',')+']');
  ok(abs.size>1, 'and animates rather than freezing on one frame');

  for(let i=0;i<20;i++) s2.update(1/60);
  ok(drawnFrame(s2)<=1, 'shortly after release it stops drawing the absorbing frames',
    'a stuck tell would read as "still absorbing" when nothing is');

  const s3 = mk(); while(!s3.drained) s3.drain(1); s3.update(1/60);
  ok(drawnFrame(s3)===6, 'drained draws frame 6');
  const dead=new Set(); for(let i=0;i<40;i++){ s3.update(1/60); dead.add(drawnFrame(s3)); }
  ok(dead.size===1 && dead.has(6), 'and a dead prop NEVER animates again', '['+[...dead].join(',')+']');

  // A generator must still go down the generator path, not the prop one.
  const g = new EL.ElectricalSource({ id:'g', x:100, y:100, charge:4 });
  const cg = recCtx(); g.draw(cg);
  const gsrc = (cg.calls[0]||{}).src || '';
  ok(/generator/.test(gsrc), 'a generator still draws generator art', gsrc || '(nothing drawn)');
}

sec('Level 1: Chief\u2019s lamp is a real source he can walk to and drain');
{
  const def=JSON.parse(fs.readFileSync('src_scroll/levels/level1.json','utf8'));
  const lamp=(def.sources||[]).find(s=>s.kind==='prop');
  ok(!!lamp, 'level1 has a prop source', 'this is the lamp Chief placed');
  ok(!(def.decorations||[]).some(d=>/night-city-props/.test(d.src||'')),
    'and it is NO LONGER a decoration', 'a decoration can never be absorbed');
  if (lamp) {
    const lv0=new Level(def); const s=lv0.sources.find(x=>x.kind==='prop');
    const b=SV.sourceBox(s);
    // Chief placed the DECORATION freehand at (173,293) with snap 1. Parity requires a
    // SOURCE to be 32px grid-aligned and to rest on the surface — rules decorations are
    // exempt from. So it had to move 1px right and 5px up, to (174,288).
    // Asserting the grounded/aligned position rather than his original pixels: keeping his
    // exact placement meant failing two parity rules that every other source obeys.
    ok(b.dX===174 && b.dY===288, 'art sits where his placement grid-snaps and grounds to',
      `dX=${b.dX} dY=${b.dY}, was (173,293) freehand`);
    ok(s.y + s.h === 480, 'and the lamp base rests ON the surface, not 5px into it');
  }
  // The real thing: walk there from spawn and hold E.
  const lv=new Level(def);
  const lamp2=lv.sources.find(s=>s.kind==='prop');
  const p=new Player(def.playerStart.x, def.playerStart.y);
  const dir = lamp2.cx < p.cx ? 'KeyA' : 'KeyD';
  fire('keydown',dir);
  let arrived=false;
  for(let i=0;i<3000;i++){ p.update(1/60,lv); lv.update(1/60,p); Input.update();
    if(lamp2.inRange(p.cx,p.cy)){arrived=true;break;} if(p.y>lv.pxH+80) break; }
  fire('keyup',dir);
  ok(arrived, 'the player can WALK to it from spawn', 'unreachable energy is not energy');
  const before=p.charge+p.bankedPips*C.MAX_CHARGE;
  fire('keydown','KeyE');
  let saw=false;
  for(let i=0;i<120;i++){ p.update(1/60,lv); lv.update(1/60,p); Input.update(); if(p.absorbing) saw=true; }
  fire('keyup','KeyE');
  const after=p.charge+p.bankedPips*C.MAX_CHARGE;
  ok(saw, 'holding E sets player.absorbing');
  ok(after-before > 3.9, `and transfers the full 4 charge (got ${(after-before).toFixed(2)})`,
    'this is the exact thing Chief reported as not working');
  ok(lamp2.drained, 'the lamp ends up drained');
}

sec('Palette: HVAC and the props are in ONE filter, and nothing else leaked in');
{
  // Chief could not find HVAC next to the props because source_hvac was hidden from the
  // palette entirely by generation.eligible:false — and there is no + HVAC button either,
  // so it was unplaceable by any route. These assertions pin the fix AND its blast radius,
  // because loosening a visibility rule is exactly the kind of change that quietly surfaces
  // art Aki retired on purpose.
  const S = await import('../editor/state.js');
  S.state.manifest = { items: manifest.assets.map(a=>({ id:a.id, name:a.id, category:a.category,
    tags:a.tags||[], path:a.path||'', raw:a, width:a.frame_width, height:a.frame_height })) };
  const setF = (o) => { S.state.filter = Object.assign({ category:'all', search:'',
    purpleCityOnly:false, purpleRooftopOnly:false, blueRooftopOnly:false, hvacOnly:false,
    nightCityRailOnly:false, electricOnly:false }, o); };
  const ids = () => S.filteredManifestItems().map(i=>i.id);

  setF({ electricOnly:true });
  const el = ids();
  ok(el.length === 6, 'the Electric filter shows exactly 6', el.join(', '));
  ok(el.includes('source_hvac'), 'HVAC is in it — filtered TOGETHER with the props',
    'this is the literal request');
  ok(PROPS.every(p=>el.includes(p)), 'and all 5 props are in it');

  setF({});
  const all = ids();
  ok(all.includes('source_hvac'), 'HVAC is visible in the unfiltered palette at all',
    'it was invisible before, with no spawn button either — unplaceable by any route');
  for (const id of ['env_rt_tile_purple_b','env_rt_tile_purple_c','env_rt_tile_light_a'])
    ok(!all.includes(id), `retired art ${id} stays hidden`, 'retired means retired');
  for (const id of ['electrical_generator','gate_electric_closed','wall_switch','electric_fence',
                    'env_rt_tile_purple_a','env_rt_tile_accent_a'])
    ok(!all.includes(id), `generator-ineligible non-spawn ${id} stays hidden`,
      'the exemption is scoped to spawn assets, so Aki\u2019s palette is otherwise unchanged');
  ok(all.length === 54, 'palette total is 54', 'was 51; +3 is player_spawn, drone_enemy, chest — spawn entries that were always meant to be visible');

  setF({ hvacOnly:true });
  ok(ids().includes('source_hvac'), 'and HVAC still appears under its own HVAC filter too');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
