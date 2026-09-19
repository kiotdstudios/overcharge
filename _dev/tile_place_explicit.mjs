// TILE PLACEMENT IS LITERAL — CHIEF RULING 2026-09-19 04:37
//
// "rule of top must cary purple wasnt interpreted correctly remove that rule and
//  hopefully it goes back to being able to click the tiles down correctly"
//
// The tile grammar auto-promote is DELETED. This suite pins the replacement
// guarantee, which is the simplest one available: the editor stores exactly the tile
// that was selected, at every cell, through every path. Nothing rewrites it.
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

sec('The grammar machinery is GONE, not merely switched off');
{
  // Asserted as absence so nobody can quietly reinstate it behind a flag.
  for (const name of ['GRAMMAR_FILL','GRAMMAR_EDGE','grammarEdgeFor','grammarFillFor','countGrammarViolations'])
    ok(S[name] === undefined, `state.js no longer exports ${name}`);
  ok(A.fixAllGrammar === undefined, 'actions.js no longer exports fixAllGrammar');
  ok(!('autoGrammar' in S.state), 'there is no autoGrammar flag — the rule is deleted, not optional');
}

sec('PLACE tool stores exactly the selected tile, anywhere');
{
  // Every one of these is a fill tile as the topmost solid — the exact case the old
  // rule rewrote to a hash-chosen edge.
  for (const [id, want] of [['env_tile_dark_a',10], ['env_tile_dark_b',11],
                            ['env_tile_purple_a',12], ['env_tile_purple_b',13],
                            ['env_rt_tile_mid_a',16]]) {
    fresh(); select(id, want);
    const got=[];
    for (let c=4;c<=11;c++){ Tools.placeTool.onMouseDown(evt(c*T+16, 10*T+16), canvas); got.push(at(c,10)); }
    ok(got.every(v=>v===want) && new Set(got).size===1,
      `place ${id} x8 -> ${want} every time`, `got ${got.join(',')}`);
  }
}

sec('Stacking and burying never rewrite anything');
{
  fresh(); select('env_tile_purple_a', 12);
  Tools.placeTool.onMouseDown(evt(5*T+16, 10*T+16), canvas);
  ok(at(5,10)===12, 'purple_a placed on open ground stays 12');
  Tools.placeTool.onMouseDown(evt(5*T+16, 9*T+16), canvas);      // bury it
  ok(at(5,10)===12, 'burying it leaves it 12 (no demote to fill)', `still ${at(5,10)}`);
  ok(at(5,9)===12,  'and the tile placed above is also exactly 12');
  fresh(); select('env_tile_dark_a', 10);
  Tools.placeTool.onMouseDown(evt(5*T+16, 10*T+16), canvas);
  Tools.placeTool.onMouseDown(evt(5*T+16, 9*T+16), canvas);
  ok(at(5,9)===10 && at(5,10)===10, 'a dark_a column is dark_a top to bottom', `${at(5,9)},${at(5,10)}`);
}

sec('ERASE exposes the tile below without retiling it');
{
  fresh(); select('env_tile_dark_a', 10);
  Tools.placeTool.onMouseDown(evt(5*T+16, 10*T+16), canvas);
  Tools.placeTool.onMouseDown(evt(5*T+16, 9*T+16), canvas);
  Tools.eraseTool.onMouseDown(evt(5*T+16, 9*T+16), canvas);
  ok(at(5,9)===0,  'the erased cell is empty');
  ok(at(5,10)===10, 'the newly-exposed tile below is still dark_a', `${at(5,10)} — used to be promoted to 12/13`);
}

sec('RECT paint and CLIPBOARD paste are literal too');
{
  fresh(); select('env_tile_dark_a', 10);
  Tools.rectTool.onMouseDown(evt(4*T+16, 10*T+16), canvas);
  Tools.rectTool.onMouseMove(evt(9*T+16, 12*T+16), canvas);
  Tools.rectTool.onMouseUp  (evt(9*T+16, 12*T+16), canvas);
  let allTen=true;
  for(let r=10;r<=12;r++) for(let c=4;c<=9;c++) if(at(c,r)!==10) allTen=false;
  ok(allTen, 'rect-painting dark_a fills the whole rect with 10', 'including the top row of it');

  fresh();
  for (const c of [5,6,7]) S.state.level.tiles[10*COLS+c]=10;
  for (const c of [5,6,7]) Sel.selectTile(c,10,true);
  Clip.copy(); Clip.paste({ x:12*T, y:10*T });
  const got=[at(12,10),at(13,10),at(14,10)];
  ok(got.every(v=>v===10), 'copy/paste round-trips dark_a unchanged', `got ${got.join(',')}`);
}

sec('Tile DRAG still works (the 02:15 fix must survive this removal)');
{
  fresh();
  for (const c of [5,6,7]) S.state.level.tiles[10*COLS+c]=10;
  for (const c of [5,6,7]) Sel.selectTile(c,10,true);
  Tools.pointerTool.onMouseDown(evt(6*T+16, 10*T+16), canvas);
  Tools.pointerTool.onMouseMove(evt(9*T+16, 10*T+16), canvas);
  Tools.pointerTool.onMouseUp  (evt(9*T+16, 10*T+16), canvas);
  const got=[at(8,10),at(9,10),at(10,10)];
  ok(got.every(v=>v===10), 'dragging three dark_a moves them as dark_a', `got ${got.join(',')}`);
  ok(at(5,10)===0 && at(6,10)===0 && at(7,10)===0, 'and the source cells are cleared');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);