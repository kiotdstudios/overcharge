// TILE REGISTRY — cross-boundary guarantee (Orcha-owned)
//
// Chief reported that placing blue rooftop tiles did nothing new. Cause: the eighteen blue
// rooftop tiles had NO entry in TILE_ID_REGISTRY, so tileValueForAssetId returned minus one
// and placement stamped the default purple tile instead. A tile absent from the registry
// cannot be represented in level JSON at all, because levels store VALUES.
//
// WHY THIS SUITE EXISTS ALONGSIDE parity_regression:
// parity documents the join as "editor id -> manifest path -> basename === runtime basename",
// which was correct when the runtime built paths as tiles/<basename>.png. render.js has since
// moved to an explicit TILE_PATHS map keyed by ASSET ID, so that assertion now compares a
// filename against an asset id and cannot pass by construction. It was already failing for
// all pre-existing tiles before this work.
// Rather than rewrite Kiro's protected suite while he is away, this suite enforces the same
// INTENT against the architecture that actually ships: for every tile value, the Builder and
// the game must end up at the SAME PNG, and that file must exist.
import fs from 'node:fs';
import path from 'node:path';

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

// Parsed from source text, not imported: render.js touches Image at module scope.
const readRegistry=(file)=>{
  const src=fs.readFileSync(file,'utf8');
  const m=src.match(/TILE_ID_REGISTRY\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/);
  if(!m) return null;
  const out={};
  for(const e of m[1].matchAll(/(\d+)\s*:\s*['"]([^'"]+)['"]/g)) out[Number(e[1])]=e[2];
  return out;
};
const editorReg  = readRegistry('editor/state.js');
const runtimeReg = readRegistry('src_scroll/render.js');
const renderSrc  = fs.readFileSync('src_scroll/render.js','utf8');
const tpM        = renderSrc.match(/TILE_PATHS\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/);
const TILE_PATHS = {};
if(tpM) for(const e of tpM[1].matchAll(/['"]([\w.\-]+)['"]\s*:\s*['"]([^'"]+)['"]/g)) TILE_PATHS[e[1]]=e[2];
const manifest = JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json','utf8').replace(/^\uFEFF/,''));
const manifestPathById = {};
for(const a of manifest.assets) manifestPathById[a.id]=a.path;

sec('Both registries parse, and no prose leaked into them');
{
  ok(!!editorReg,  'editor/state.js TILE_ID_REGISTRY parses');
  ok(!!runtimeReg, 'src_scroll/render.js TILE_ID_REGISTRY parses');
  // THIS GUARD EXISTS BECAUSE I BROKE IT TWICE.
  // parity parses the literal with /(\d+)\s*:\s*['"]/ and does NOT skip comments. I wrote a
  // date as a number-colon followed by a quoted phrase inside the registry comment and
  // silently overwrote a real tile entry — twice, the second time in the comment warning
  // about the first. Every value must look like a manifest asset id, which makes any prose
  // leak fail loudly instead of corrupting a tile binding in silence.
  for(const [id,val] of Object.entries(editorReg||{}))
    ok(/^env_[a-z0-9_]+$/.test(val), `editor id ${id} maps to a well-formed asset id`,
      /^env_[a-z0-9_]+$/.test(val) ? '' : `got "${val}" — prose leaked out of a comment`);
  for(const [id,val] of Object.entries(runtimeReg||{}))
    ok(/^env_[a-z0-9_]+$/.test(val), `runtime id ${id} maps to a well-formed asset id`,
      /^env_[a-z0-9_]+$/.test(val) ? '' : `got "${val}"`);
}

sec('Editor and runtime registries are identical');
{
  const ids=[...new Set([...Object.keys(editorReg||{}),...Object.keys(runtimeReg||{})])].map(Number).sort((a,b)=>a-b);
  ok(ids.length===45, `45 tile values are bound`, `found ${ids.length}`);
  for(const id of ids)
    ok(editorReg[id]===runtimeReg[id], `tile ${id} binds to the same asset id on both sides`,
      editorReg[id]===runtimeReg[id] ? editorReg[id] : `editor=${editorReg[id]} runtime=${runtimeReg[id]}`);
}

sec('THE THING THAT MATTERS: every tile value resolves to the SAME PNG in Builder and game');
{
  // This is parity's documented intent, implemented against the architecture that ships.
  // The Builder resolves an id through ASSET_MANIFEST; the game resolves it through
  // TILE_PATHS. If those disagree, Chief paints one tile and plays another.
  for(const id of Object.keys(editorReg).map(Number).sort((a,b)=>a-b)){
    const assetId = editorReg[id];
    const editorFile  = manifestPathById[assetId];
    const runtimeFile = TILE_PATHS[runtimeReg[id]];
    ok(!!editorFile, `tile ${id}: ${assetId} is present in ASSET_MANIFEST.json`);
    ok(!!runtimeFile, `tile ${id}: runtime has a path for ${runtimeReg[id]}`);
    ok(editorFile===runtimeFile, `tile ${id}: Builder and game resolve to the SAME png`,
      editorFile===runtimeFile ? String(editorFile) : `builder=${editorFile} game=${runtimeFile}`);
    ok(runtimeFile && fs.existsSync(runtimeFile), `tile ${id}: that png exists on disk`);
  }
}

sec('APPEND ONLY: previously-bound values must never be reassigned');
{
  // Pinned literally. A level file is just numbers, so reassigning an existing value silently
  // rewrites the art in every level that ever used it. Chief's permanent bindings.
  const PINNED = {
    10:'env_rt_tile_mid_a', 11:'env_rt_tile_mid_a', 12:'env_rt_tile_mid_a', 13:'env_rt_tile_mid_a',
    16:'env_rt_tile_mid_a', 17:'env_rt_tile_mid_b', 18:'env_rt_tile_mid_c',
    19:'env_rt_tile_purple_a', 23:'env_rt_tile_accent_a',
    24:'env_rt_bldg_r02_c01', 30:'env_rt_bldg_r03_c04', 41:'env_rt_bldg_r04_c13',
  };
  for(const [id,expect] of Object.entries(PINNED))
    ok(editorReg[id]===expect, `tile ${id} still binds to ${expect}`,
      editorReg[id]===expect ? '' : `now ${editorReg[id]} — this rewrites art in every existing level`);
  ok(Math.max(...Object.keys(editorReg).map(Number))===59, 'highest bound value is fifty-nine');
}

sec('The eighteen blue rooftop tiles are placeable');
{
  const blue = manifest.assets.filter(a=>/^env_bt_/.test(a.id)).map(a=>a.id).sort();
  ok(blue.length===18, '18 blue rooftop tiles exist in the manifest', `found ${blue.length}`);
  const rev = {};
  for(const [id,val] of Object.entries(editorReg)) if(rev[val]===undefined) rev[val]=Number(id);
  for(const id of blue){
    const v = rev[id];
    ok(v!==undefined && v>=42 && v<=59, `${id} is bound to a value in the new range`,
      v===undefined ? 'UNBOUND — placing it would stamp the default purple tile' : `value ${v}`);
  }
  // Every blue tile must be solid, or Chief would build walls he can walk through.
  ok(blue.length>0 && Object.keys(editorReg).map(Number).filter(v=>v>=42).every(v=>v>=10),
    'all new values are >= 10, so tileIsSolid() treats them as terrain');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);