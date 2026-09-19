// TILE DRAG — Chief 2026-09-19: "i have tiles selected and cant click hold and drag
// them to a new location on the map editor using the pointer tool"
//
// Drives the REAL pointerTool / selectTool handlers with synthetic mouse events, and
// asserts against the REAL level tiles array. No reimplementation of the drag.
globalThis.window = { addEventListener(){}, removeEventListener(){}, innerWidth:1600, innerHeight:900,
  devicePixelRatio:1, location:{search:''}, requestAnimationFrame:(f)=>f&&0, localStorage:{getItem:()=>null,setItem(){},removeItem(){}} };
globalThis.localStorage = globalThis.window.localStorage;
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=32; this.naturalHeight=32; this.src=''; } addEventListener(n,f){ if(n==='load') f&&f(); } };
const mkCtx = () => new Proxy({}, { get:()=>()=>{}, set:()=>true });
globalThis.document = { getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[],
  addEventListener(){}, removeEventListener(){}, body:{ style:{}, appendChild(){} },
  createElement:()=>({ getContext:mkCtx, style:{}, classList:{add(){},remove(){}}, appendChild(){}, setAttribute(){} }) };

const S     = await import('../editor/state.js');
const Tools = await import('../editor/tools.js');
const Sel   = await import('../editor/selection.js');
const Hist  = await import('../editor/history.js');

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);

const COLS=24, ROWS=18, T=S.TILE_SIZE;
function freshLevel() {
  const tiles=new Array(COLS*ROWS).fill(0);
  for(let x=0;x<COLS;x++) tiles[16*COLS+x]=10;      // floor
  tiles[10*COLS+5]=11; tiles[10*COLS+6]=12; tiles[10*COLS+7]=13;   // 3 distinct tiles
  S.state.level = { name:'DRAG TEST', number:99, cols:COLS, tiles,
    playerStart:{x:64,y:480}, sources:[], gates:[], switches:[], checkpoints:[],
    platforms:[], enemies:[], decorations:[], chests:[], crates:[] };
  S.state.camera = { x:0, y:0, zoom:1 };
  S.state.dragMove = null; S.state.marquee = null;
  Sel.clearSelection(); Hist.clear && Hist.clear();
  return S.state.level;
}
const at = (c,r) => S.state.level.tiles[r*COLS+c];
// A canvas whose rect maps 1:1 to world at zoom 1, camera 0.
const canvas = { width:1600, height:900, getBoundingClientRect:()=>({left:0,top:0,width:1600,height:900}) };
const evt = (wx,wy) => ({ button:0, clientX:wx, clientY:wy, shiftKey:false, preventDefault(){} });

function drag(tool, fromWorld, toWorld) {
  tool.onMouseDown(evt(fromWorld[0], fromWorld[1]), canvas);
  tool.onMouseMove(evt(toWorld[0],   toWorld[1]),   canvas);
  tool.onMouseUp  (evt(toWorld[0],   toWorld[1]),   canvas);
}

sec('THE REPORTED BUG: pointer tool, selected tiles, click-hold-drag');
{
  freshLevel();
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true); Sel.selectTile(7,10,true);
  ok(Sel.selectedTiles().length===3, 'three tiles are selected', 'the state Chief described');
  const before=[at(5,10),at(6,10),at(7,10)];
  // grab the middle selected tile, drag 2 cells right + 1 cell down
  drag(Tools.pointerTool, [6*T+16, 10*T+16], [8*T+16, 11*T+16]);
  ok(at(7,11)===before[0] && at(8,11)===before[1] && at(9,11)===before[2],
    'all three tiles MOVED to the new location',
    `values ${before.join(',')} now at cols 7,8,9 row 11`);
  ok(at(5,10)===0 && at(6,10)===0 && at(7,10)===0, 'and the original cells are empty');
}

sec('Undo restores exactly, and the move is ONE history entry');
{
  freshLevel();
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true); Sel.selectTile(7,10,true);
  const snapshot = Array.from(S.state.level.tiles);
  drag(Tools.pointerTool, [6*T+16, 10*T+16], [9*T+16, 10*T+16]);
  ok(at(9,10)!==0, 'moved');
  Hist.undo();
  const same = S.state.level.tiles.every((v,i)=>v===snapshot[i]);
  ok(same, 'ONE undo restores the terrain exactly', 'so the drag recorded a single composite, not N entries');
}

sec('Overlapping drag cannot eat its own cells (1-cell nudge)');
{
  freshLevel();
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true); Sel.selectTile(7,10,true);
  const before=[at(5,10),at(6,10),at(7,10)];
  drag(Tools.pointerTool, [6*T+16, 10*T+16], [7*T+16, 10*T+16]);   // +1 col: dest overlaps source
  ok(at(6,10)===before[0] && at(7,10)===before[1] && at(8,10)===before[2],
    'a 1-cell nudge preserves all three values',
    `${before.join(',')} -> cols 6,7,8`);
  ok(at(5,10)===0, 'only the truly-vacated cell is cleared', 'source read completes before any write');
}

sec('Terrain is TILE-quantized, never freeform');
{
  freshLevel();
  Sel.selectTile(5,10,true);
  const v=at(5,10);
  drag(Tools.pointerTool, [5*T+16, 10*T+16], [5*T+16+9, 10*T+16+9]);  // 9px: under half a tile
  ok(at(5,10)===v, 'a sub-tile drag does not move the tile', '9px rounds to 0 cells');
  freshLevel(); Sel.selectTile(5,10,true);
  drag(Tools.pointerTool, [5*T+16, 10*T+16], [5*T+16+20, 10*T+16]);   // 20px: over half
  ok(at(6,10)!==0 && at(5,10)===0, 'a 20px drag snaps to exactly one whole tile');
}

sec('Off-grid drags are REFUSED, not silently deleted');
{
  freshLevel();
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true);
  const before=[at(5,10),at(6,10)];
  drag(Tools.pointerTool, [5*T+16, 10*T+16], [5*T+16 - 40*T, 10*T+16]);  // way off the left edge
  ok(at(5,10)===before[0] && at(6,10)===before[1],
    'dragging off the grid leaves the tiles untouched', 'refusal, not data loss');
}

sec('The SELECT tool has the same bug and the same fix');
{
  freshLevel();
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true); Sel.selectTile(7,10,true);
  const before=[at(5,10),at(6,10),at(7,10)];
  drag(Tools.selectTool, [6*T+16, 10*T+16], [6*T+16, 12*T+16]);   // 2 cells down
  ok(at(5,12)===before[0] && at(6,12)===before[1] && at(7,12)===before[2],
    'select tool also drags a tile selection', 'both tools share captureTileDrag');
}

sec('MID-DRAG PREVIEW — what Chief sees while holding the mouse down');
{
  // My first suite only asserted post-mouseup state, so a mutation that broke the
  // LIVE PREVIEW (never clearing source cells during the drag) passed 13/13. The
  // preview is the whole feel of the feature — if the tiles do not visibly follow the
  // cursor it reads as broken even though the commit is correct. Asserted between
  // onMouseMove and onMouseUp.
  freshLevel();
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true); Sel.selectTile(7,10,true);
  const before=[at(5,10),at(6,10),at(7,10)];
  Tools.pointerTool.onMouseDown(evt(6*T+16, 10*T+16), canvas);
  Tools.pointerTool.onMouseMove(evt(9*T+16, 10*T+16), canvas);       // held, not released
  ok(at(8,10)===before[0] && at(9,10)===before[1] && at(10,10)===before[2],
    'DURING the drag the tiles already appear at the cursor',
    'live preview, so the drag reads as direct manipulation');
  ok(at(5,10)===0, 'and the source cells read as lifted during the drag');
  // dragging further must not compound — preview rebuilds from the pristine base
  Tools.pointerTool.onMouseMove(evt(11*T+16, 10*T+16), canvas);
  ok(at(10,10)===before[0] && at(11,10)===before[1] && at(12,10)===before[2],
    'moving further re-previews from scratch instead of compounding',
    'no smearing trail of duplicated tiles');
  ok(at(8,10)===0 && at(9,10)===0, 'the earlier preview position is cleaned up');
  Tools.pointerTool.onMouseUp(evt(11*T+16, 10*T+16), canvas);
  ok(at(10,10)===before[0] && at(11,10)===before[1] && at(12,10)===before[2],
    'and release commits exactly what the preview showed');
}

sec('Cancel path: releasing without moving leaves terrain pristine');
{
  freshLevel();
  Sel.selectTile(5,10,true);
  const snap = Array.from(S.state.level.tiles);
  Tools.pointerTool.onMouseDown(evt(5*T+16, 10*T+16), canvas);
  Tools.pointerTool.onMouseMove(evt(5*T+16+4, 10*T+16+4), canvas);   // jitter under 1 tile
  Tools.pointerTool.onMouseUp(evt(5*T+16+4, 10*T+16+4), canvas);
  ok(S.state.level.tiles.every((v,i)=>v===snap[i]),
    'a click with tiny jitter changes nothing at all', 'no accidental 1-cell nudge, no history entry');
}
sec('MOVE-HANDLE drag (the yellow dot) — the other gesture, and it was untested');
{
  // Two mutations passed 19/19 because nothing in the suite ever clicked the handle.
  // Selection.moveHandleScreen() gives its exact canvas position, so it can be driven
  // properly instead of assumed. This is the gesture for a marquee'd group, so if
  // Chief grabs the dot rather than a tile it MUST work too.
  freshLevel();
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true); Sel.selectTile(7,10,true);
  const h = Sel.moveHandleScreen();
  ok(!!h, 'a move handle exists for a tile selection', h ? `at screen (${h.sx.toFixed(0)},${h.sy.toFixed(0)})` : 'none — tiles get no handle');
  if (h) {
    ok(Sel.moveHandleContains(h.sx, h.sy), 'and clicking its centre registers as a handle hit');
    const before=[at(5,10),at(6,10),at(7,10)];
    // Handle drag: mousedown ON the handle, then move by a whole tile in world terms.
    for (const tool of [Tools.pointerTool, Tools.selectTool]) {
      freshLevel();
      Sel.selectTile(5,10,true); Sel.selectTile(6,10,true); Sel.selectTile(7,10,true);
      const hh = Sel.moveHandleScreen();
      tool.onMouseDown(evt(hh.sx, hh.sy), canvas);
      tool.onMouseMove(evt(hh.sx + 2*T, hh.sy + T), canvas);
      tool.onMouseUp  (evt(hh.sx + 2*T, hh.sy + T), canvas);
      ok(at(7,11)===before[0] && at(8,11)===before[1] && at(9,11)===before[2],
        `${tool.name} tool: HANDLE drag moves the tile selection`,
        `values ${before.join(',')} -> cols 7,8,9 row 11`);
      ok(at(5,10)===0 && at(6,10)===0 && at(7,10)===0, `${tool.name} tool: sources cleared after handle drag`);
    }
  }
}

sec('MIXED selection: tiles AND an object move together by the same delta');
{
  const L=freshLevel();
  L.decorations.push({ id:'d1', assetId:'x', x:5*T, y:9*T, w:32, h:32, snap:32 });
  const dec=L.decorations[0];
  Sel.selectTile(5,10,true); Sel.selectTile(6,10,true);
  Sel.selectByKind('decoration', dec, true);
  const beforeTiles=[at(5,10),at(6,10)];
  const bx=dec.x, by=dec.y;
  const hh=Sel.moveHandleScreen();
  Tools.selectTool.onMouseDown(evt(hh.sx, hh.sy), canvas);
  Tools.selectTool.onMouseMove(evt(hh.sx + 2*T, hh.sy), canvas);
  Tools.selectTool.onMouseUp  (evt(hh.sx + 2*T, hh.sy), canvas);
  ok(at(7,10)===beforeTiles[0] && at(8,10)===beforeTiles[1], 'the tiles moved 2 cells right');
  ok(dec.x === bx + 2*T && dec.y === by, 'and the decoration moved the SAME 2 tiles right', `${bx} -> ${dec.x}`);
}
sec('Objects still drag (no regression to decorations / markers)');
{
  const L=freshLevel();
  L.decorations.push({ id:'d1', assetId:'x', x:100, y:100, w:32, h:32, snap:1 });
  const dec=L.decorations[0];
  Sel.selectByKind('decoration', dec, false);
  drag(Tools.pointerTool, [116,116], [216,166]);
  ok(dec.x!==100 || dec.y!==100, 'a decoration still moves', `now (${dec.x},${dec.y})`);
  ok(S.state.level.tiles[10*COLS+5]===11, 'and terrain was NOT disturbed by an object drag');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);