// MODULE PARSE + IMPORT GUARD
//
// CHIEF 2026-09-26: "editor not responsive can u fix" — the editor was serving a blank
// canvas and a permanent "loading...". Cause: editor/state.js line 500 was written as
// method shorthand, `setHvacOnly(v) { ... }`, with `export function` missing. That is a
// SYNTAX error at module scope, so state.js never parsed, so every module importing it
// failed, so editor.html executed NO JAVASCRIPT AT ALL. bootstrap()'s try/catch could not
// report it because nothing ever ran.
//
// A one-token typo took the whole editor down and the only symptom was silence.
//
// This suite is the cheapest possible guard for that entire class: PARSE and then IMPORT
// every editor and runtime module. It answers "does the app even load" in under a second,
// names the offending file and message, and cannot be satisfied by a test that mocks the
// broken thing away. It runs before any behavioural suite is worth trusting.
globalThis.window={addEventListener(){},removeEventListener(){},innerWidth:1600,innerHeight:900,
  devicePixelRatio:1,location:{search:''},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){}},
  matchMedia:()=>({matches:false,addEventListener(){}})};
globalThis.localStorage=window.localStorage; globalThis.sessionStorage=window.sessionStorage;
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=32;this.naturalHeight=32;}addEventListener(n,f){if(n==='load')f&&f();}};
const _ctx=()=>new Proxy({},{get:()=>()=>{},set:()=>true});
globalThis.document={getElementById:()=>_el(),querySelector:()=>_el(),querySelectorAll:()=>[],
  addEventListener(){},removeEventListener(){},
  body:{style:{},appendChild(){},classList:{add(){},remove(){}}},
  createElement:()=>_el()};
globalThis.indexedDB={open:()=>({addEventListener(){}})};
// getElementById returns an ELEMENT STUB, not null. editor/main.js grabs the canvas and
// calls getContext at module scope, so a null here would report a false failure on a file
// that is perfectly fine in a browser. Honest limitation: this proves the module GRAPH
// loads, not that the DOM contract is satisfied — the browser smoke (_dev/editor_smoke)
// covers that half.
const _el = () => new Proxy({
  getContext: _ctx, style:{}, dataset:{}, value:'', textContent:'', innerHTML:'',
  width:800, height:600, checked:false, disabled:false, files:[],
  classList:{add(){},remove(){},toggle(){},contains:()=>false},
  appendChild(){}, removeChild(){}, setAttribute(){}, removeAttribute(){},
  addEventListener(){}, removeEventListener(){}, remove(){}, focus(){}, blur(){}, click(){},
  getBoundingClientRect:()=>({left:0,top:0,width:800,height:600,right:800,bottom:600}),
  querySelector:()=>_el(), querySelectorAll:()=>[], closest:()=>null, insertAdjacentHTML(){},
}, { get:(t,k)=> (k in t ? t[k] : (typeof k === 'string' && /^on/.test(k) ? null : _el())),
     set:()=>true });
globalThis.fetch=async()=>({ok:false,status:404,text:async()=>'',json:async()=>({})});

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

const dirs = ['editor', 'src_scroll'];
const files = dirs.flatMap(d => fs.existsSync(d)
  ? fs.readdirSync(d).filter(f => f.endsWith('.js')).map(f => path.join(d, f))
  : []);

sec('Every module PARSES as an ES module');
{
  ok(files.length > 20, `found ${files.length} modules to check`, dirs.join(' + '));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ocparse-'));
  for (const f of files) {
    // Copied to .mjs so Node parses it with ES module rules, which is how the browser
    // loads it. `node --check` on a .js file would treat `import` as a syntax error and
    // report a false failure on every single file.
    const dest = path.join(tmp, path.basename(f).replace(/\.js$/, '.mjs'));
    fs.copyFileSync(f, dest);
    let err = null;
    try { execFileSync(process.execPath, ['--check', dest], { stdio: ['ignore','ignore','pipe'] }); }
    catch (e) { err = (e.stderr ? e.stderr.toString() : e.message).split('\n').filter(Boolean).slice(0,3).join(' | '); }
    ok(err === null, `${f} parses`, err || '');
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

sec('Every EDITOR module IMPORTS (catches a missing export, not just bad syntax)');
{
  // Parsing is not enough: `setHvacOnly` was also imported by name in assets.js, so a
  // local-but-not-exported function would break the import graph even with valid syntax.
  for (const f of files.filter(f => f.startsWith('editor'))) {
    let err = null;
    try { await import('../' + f.replace(/\\/g, '/')); }
    catch (e) { err = e.message.split('\n')[0]; }
    ok(err === null, `${f} imports`, err || '');
  }
}

sec('Named exports the editor depends on actually exist');
{
  // Pinned because these are the ones a filter/toolbar addition tends to forget, and each
  // missing one is a total editor outage rather than a degraded feature.
  // Wrapped: if state.js is the broken file, a bare top-level import here would CRASH the
  // whole suite and print no RESULTS line at all. A guard whose job is to NAME the broken
  // file must not die silently on the exact input it exists to diagnose.
  let S = null, importErr = null;
  try { S = await import('../editor/state.js'); }
  catch (e) { importErr = e.message.split('\n')[0]; }
  ok(S !== null, 'editor/state.js could be imported at all',
    importErr || 'if this fails, the editor runs NO javascript in the browser');
  if (!S) { S = {}; }
  const required = ['setTool','setSelectedAsset','setSelectedTile','setFilterCategory',
    'setFilterSearch','setPurpleCityOnly','setPurpleRooftopOnly','setBlueRooftopOnly',
    'setHvacOnly','setNightCityRailOnly','setLevelBackground','setShowGrid','setGuardsOn',
    'setMagneticSnap','levelRows','state'];
  for (const name of required) {
    ok(typeof S[name] !== 'undefined', `state.js exports ${name}`,
      name === 'setHvacOnly' ? 'this is the one that was missing and killed the editor' : '');
  }
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);