// TILE GRAMMAR vs EXPLICIT CHOICE — Chief 2026-09-19 04:00:
// "pasting env tile dark a doesnt work it randomizes placed tiles"
//
// Drives the REAL place / rect / clipboard paths against the REAL tiles array.
globalThis.window={addEventListener(){},removeEventListener(){},innerWidth:1600,innerHeight:900,
  devicePixelRatio:1,location:{search:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
globalThis.localStorage=globalThis.window.localStorage;
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=32;this.naturalHeight=32;}addEventListener(n,f){if(n==='load')f&&f();}};
const ctx=()=>new Proxy({},{get:()=>()=>{},set:()=>true});
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
  addEventListener(){},removeEventListener(){},body:{style:{},appendChild(){}},
  createElement:()=>({getContext:ctx,style:{},classList:{add(){},remove(){}},appendChild(){},setAttribute(){}})};

const S     = await import('../editor/state.js');
const Tools = await import('../editor/tools.js');
const Clip  = await import('../editor/clipboard.js');
const Sel   = await import('../editor/selection.js');
const A     = await import('../editor/actions.js');

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

const COLS=24, ROWS=18, T=S.TILE_SIZE;
const fresh=()=>{ S.state.level={name:'T',number:99,cols:COLS,tiles:new Array(COLS*ROWS).fill(0),
  playerStart:{x:64,y:480},sources:[],gates:[],switches:[],checkpoints:[],platforms:[],
  enemies:[],decorations:[],chests:[],crates:[]}; S.state.camera={x:0,y:0,zoom:1}; Sel.clearSelection(); };
const canvas={width:1600,height:900,getBoundingClientRect:()=>({left:0,top:0,width:1600,height:900})};
const evt=(wx,wy)=>({button:0,clientX:wx,clientY:wy,shiftKey:false,preventDefault(){}});
const at=(c,r)=>S.state.level.tiles[r*COLS+c];
const select=(id,val)=>{ S.state.selectedAsset={id,category:'tile'}; S.state.selectedTile=val; };

sec('DEFAULT: auto-grammar is OFF, so an explicit choice is honoured');
ok(S.state.autoGrammar === false,
  'state.autoGrammar defaults to false',
  'same reasoning as guardsOn — an explicit selection is an instruction, not a suggestion');

sec('THE REPORTED BUG: placing a fill tile must place THAT tile');
{
  // Every one of these is a fill tile on a column top — the exact condition the old
  // auto-promote rewrote. Asked for one value 8 times; must get that value 8 times.
  for (const [id, want] of [['env_tile_dark_a',10], ['env_tile_dark_b',11], ['env_rt_tile_mid_a',16]]) {
    fresh(); select(id, want);
    const got=[];
    for (let c=4;c<=11;c++){ Tools.placeTool.onMouseDown(evt(c*T+16, 10*T+16), canvas); got.push(at(c,10)); }
    ok(got.every(v=>v===want), `place ${id} x8 stores ${want} every time`, `got ${got.join(',')}`);
    ok(new Set(got).size === 1, `  ...and never varies by position`, `${new Set(got).size} distinct value(s)`);
  }
}

sec('Edge tiles are equally explicit — they must not be demoted either');
{
  // The mirror case: an edge tile that becomes buried used to be silently demoted to
  // fill, which discards an explicit choice just as badly as promoting one.
  fresh(); select('env_tile_purple_a', 12);
  Tools.placeTool.onMouseDown(evt(5*T+16, 10*T+16), canvas);
  ok(at(5,10)===12, 'purple_a placed as 12');
  Tools.placeTool.onMouseDown(evt(5*T+16, 9*T+16), canvas);   // bury it
  ok(at(5,10)===12, 'burying it does NOT rewrite it to a fill tile', `still ${at(5,10)}`);
}

sec('Rect paint honours the choice too (same chokepoint)');
{
  fresh(); select('env_tile_dark_a', 10);
  Tools.rectTool.onMouseDown(evt(4*T+16, 10*T+16), canvas);
  Tools.rectTool.onMouseMove(evt(9*T+16, 10*T+16), canvas);
  Tools.rectTool.onMouseUp  (evt(9*T+16, 10*T+16), canvas);
  const got=[]; for(let c=4;c<=9;c++) got.push(at(c,10));
  ok(got.every(v=>v===10), 'rect-painting dark_a stores 10 across the whole rect', `got ${got.join(',')}`);
}

sec('Clipboard copy/paste round-trips the exact values');
{
  // This path never called the grammar hook, so it was already correct. Asserted so a
  // future change cannot quietly route paste through a rewrite.
  fresh();
  for (const c of [5,6,7]) S.state.level.tiles[10*COLS+c]=10;
  for (const c of [5,6,7]) Sel.selectTile(c,10,true);
  Clip.copy();
  Clip.paste({ x:12*T, y:10*T });
  const got=[at(12,10),at(13,10),at(14,10)];
  ok(got.every(v=>v===10), 'three dark_a copied and pasted come back as dark_a', `got ${got.join(',')}`);
}

sec('The grammar rule is NOT lost — still reported and still appliable');
{
  fresh(); select('env_tile_dark_a', 10);
  for (let c=4;c<=9;c++) Tools.placeTool.onMouseDown(evt(c*T+16, 10*T+16), canvas);
  const violations = S.countGrammarViolations(S.state.level);
  ok(violations === 6, 'the violation counter still reports fill-on-top', `${violations} reported, so the rule is visible not silent`);
  const fix = A.fixAllGrammar();
  ok(!!fix, 'FIX ALL still returns an action', fix ? `covering ${fix.count} cells` : 'none');
  if (fix) {
    fix.forward();
    const after=[]; for(let c=4;c<=9;c++) after.push(at(c,10));
    ok(after.every(v=>v===12||v===13), 'FIX ALL applies the grammar ON REQUEST', `now ${after.join(',')}`);
    fix.inverse();
    const back=[]; for(let c=4;c<=9;c++) back.push(at(c,10));
    ok(back.every(v=>v===10), 'and it is one reversible undo', `back to ${back.join(',')}`);
  }
}

sec('Opt-in still works: flipping autoGrammar ON restores AKI 12 behaviour');
{
  // The feature is gated, not deleted. If Aki or Chief wants it back it is one flag.
  S.state.autoGrammar = true;
  fresh(); select('env_tile_dark_a', 10);
  const got=[];
  for (let c=4;c<=9;c++){ Tools.placeTool.onMouseDown(evt(c*T+16, 10*T+16), canvas); got.push(at(c,10)); }
  ok(got.every(v=>v===12||v===13), 'with the flag ON, fill tiles promote to edge again', `got ${got.join(',')}`);
  ok(new Set(got).size > 1, '  ...and THAT is the behaviour Chief called random', 'hash-chosen per position');
  S.state.autoGrammar = false;   // restore the default for any later suite
  ok(S.state.autoGrammar === false, 'flag restored to the default after the test');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);