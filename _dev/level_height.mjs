// PER-LEVEL HEIGHT — CHIEF RULING 2026-09-19 18:30 (decisions 1,2,4,5,6)
// Drives the REAL Level class. The one that matters is the LAST section: Chief's actual
// use case, "add sections up so the player can traverse down".
globalThis.window={addEventListener(){},removeEventListener(){},innerWidth:1600,innerHeight:900,location:{search:''}};
globalThis.document={getElementById:()=>null,addEventListener(){},removeEventListener(){},body:{style:{}},
  createElement:()=>({getContext:()=>null,style:{}})};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=32;this.naturalHeight=32;}addEventListener(){}};
import fs from 'fs';
const { Level } = await import('../src_scroll/level.js');
const C = await import('../src_scroll/constants.js');

let pass=0, fail=0;
const ok=(c,m,d='')=>{ if(c){pass++;console.log(`  \u2713 ${m}${d?' — '+d:''}`);} else {fail++;console.log(`  \u2717 ${m}${d?' — '+d:''}`);} };
const sec=t=>console.log(`\n[ ${t} ]`);
const L1 = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json','utf8'));
const mk = (rows, cols=40) => ({ name:'T', number:9, cols, tiles:new Array(cols*rows).fill(0),
  playerStart:{x:64,y:(rows-3)*32}, sources:[], gates:[], switches:[], checkpoints:[],
  platforms:[], enemies:[], decorations:[], chests:[], crates:[] });

sec('DECISION 5 — no migration: the five shipped levels are untouched');
for (const n of [1,2,3,4,5]) {
  const def = JSON.parse(fs.readFileSync(`src_scroll/levels/level${n}.json`,'utf8'));
  const lv = new Level(def);
  ok(lv.rows === 18, `level${n} still derives to 18 rows`, `pxH ${lv.pxH}`);
  ok(lv.pxH === 18*32, `level${n} pxH unchanged at 576`, `${lv.pxH}`);
}

sec('DECISION 1 — height is PER-LEVEL and derived, symmetric with cols');
{
  for (const r of [12, 18, 24, 30, 54]) {
    const lv = new Level(mk(r));
    ok(lv.rows === r, `a ${r}-row level reports rows=${r}`, `pxH ${lv.pxH} = ${r}*32`);
    ok(lv.pxH === r*32, `and pxH follows it`, `${lv.pxH}`);
  }
  // cols was ALREADY per-level; guard it so this change cannot regress it.
  const wide = new Level(mk(18, 150));
  ok(wide.cols === 150 && wide.pxW === 4800, 'cols stays per-level (was already true)', `pxW ${wide.pxW}`);
}

sec('DECISION 6 — capped at MAX_ROWS, raisable in one place');
{
  ok(C.MAX_ROWS === 54, 'MAX_ROWS is Chief-set to 54', `${C.MAX_ROWS} rows = ${C.MAX_ROWS*32}px`);
  const tall = new Level(mk(90));
  ok(tall.rows === 54, 'a 90-row def clamps to the cap rather than loading', `clamped to ${tall.rows}`);
  const tiny = new Level(mk(1));
  ok(tiny.rows >= 1, 'a 1-row level does not underflow', `rows ${tiny.rows}`);
}

sec('Malformed defs fall back to the global — that is why nothing breaks');
{
  const noTiles = new Level({ name:'x', number:1, cols:40 });
  ok(noTiles.rows === C.ROWS, 'a def with no tiles falls back to global ROWS', `rows ${noTiles.rows}`);
  const noCols = new Level({ name:'x', number:1, tiles:new Array(720).fill(0) });
  ok(noCols.rows > 0 && Number.isFinite(noCols.rows), 'a def with no cols still yields finite rows', `rows ${noCols.rows}`);
}

sec('DECISION 4 — clamp: below the level is void, at the level height');
{
  const lv = new Level(mk(12));
  ok(lv.tileAt(5, 11) === 0, 'last real row is addressable');
  ok(lv.tileAt(5, 12) === 0, 'one row past the level is void (not a wall)');
  ok(lv.tileAt(5, 40) === 0, 'far past the level is still void');
  ok(lv.tileAt(-1, 5) === 1, 'off the LEFT edge is still solid wall', 'horizontal behaviour unchanged');
  ok(lv.tileAt(5, -1) === 1, 'above the ceiling is still solid', 'so the player cannot leave upward');
  // The old bug shape: a 24-row level with the global pinned at 18 would treat rows
  // 18..23 as void, so the player would fall through real floor.
  const tall = mk(24);
  for (let c=0;c<40;c++) tall.tiles[22*40+c] = 1;    // floor at row 22, BELOW old ROWS=18
  const t2 = new Level(tall);
  ok(t2.tileAt(5, 22) === 1,
    'solid floor at row 22 is SOLID, not void',
    'with the old global ROWS=18 this returned 0 and the player fell through');
}

sec("CHIEF'S USE CASE — a section added ABOVE, player traverses DOWN");
{
  // Build it the way the Builder will per decision 2: prepend N empty rows, shift every
  // object down by N*32, shift tiles AND tileRotations together.
  const N = 6, cols = L1.cols;
  const shifted = JSON.parse(JSON.stringify(L1));
  shifted.tiles = new Array(N*cols).fill(0).concat(L1.tiles);
  if (Array.isArray(L1.tileRotations)) shifted.tileRotations = new Array(N*cols).fill(0).concat(L1.tileRotations);
  const dy = N*32;
  shifted.playerStart = { x:L1.playerStart.x, y:L1.playerStart.y + dy };
  for (const key of ['sources','gates','switches','checkpoints','platforms','enemies','decorations','chests','crates'])
    if (Array.isArray(shifted[key])) shifted[key] = shifted[key].map(o => ({ ...o, y:(o.y ?? 0) + dy }));

  const base = new Level(L1), grown = new Level(shifted);
  ok(grown.rows === base.rows + N, `the grown level is ${N} rows taller`, `${base.rows} -> ${grown.rows}`);
  ok(grown.pxH === base.pxH + dy, 'and pxH grew by exactly the added height', `${base.pxH} -> ${grown.pxH}`);
  ok(grown.cols === base.cols, 'width is untouched by a vertical add', `cols ${grown.cols}`);

  // The whole point: identical terrain, just lower in the grid.
  let mismatch = 0;
  for (let ty=0; ty<base.rows; ty++)
    for (let tx=0; tx<base.cols; tx++)
      if (base.tileAt(tx,ty) !== grown.tileAt(tx, ty+N)) mismatch++;
  ok(mismatch === 0, 'every original tile is intact, shifted down N rows', `${mismatch} mismatches across ${base.rows*base.cols} cells`);

  // The new space on top must be empty and traversable, not solid.
  let solidUp = 0;
  for (let ty=0; ty<N; ty++) for (let tx=0; tx<grown.cols; tx++) if (grown.tileAt(tx,ty) !== 0) solidUp++;
  ok(solidUp === 0, 'the added section above is empty, so the player can fall DOWN through it', `${solidUp} solid cells in the new rows`);

  // tileRotations must have shifted with the tiles or three of five levels corrupt.
  if (Array.isArray(L1.tileRotations)) {
    ok(grown.tileRotations && grown.tileRotations.length === grown.tiles.length,
      'tileRotations shifted alongside tiles and still aligns',
      `rot ${grown.tileRotations.length} vs tiles ${grown.tiles.length}`);
    let rotMismatch = 0;
    for (let i=0;i<L1.tiles.length;i++)
      if ((L1.tileRotations[i]||0) !== (grown.tileRotations[i + N*cols]||0)) rotMismatch++;
    ok(rotMismatch === 0, 'and every rotation still matches its original tile', `${rotMismatch} misaligned`);
  }
  ok(grown.rows <= C.MAX_ROWS, 'the grown level is within the cap', `${grown.rows} <= ${C.MAX_ROWS}`);
}

sec('The RENDER loop walks the level height, not the old global');
{
  // My first version of this section asserted lv.rows and tileAt, NEITHER of which
  // touches the draw loop, so a mutation putting the loop back on global ROWS passed
  // 42/42. Vacuous. The loop calls this.tileAt(tx, ty) for every cell, so spying on
  // tileAt records the exact ty range the loop walked. Measured, not inferred.
  const def = mk(24);
  for (let c=0;c<40;c++) { def.tiles[20*40+c] = 1; def.tiles[23*40+c] = 1; }
  const lv = new Level(def);
  const seen = new Set();
  const realTileAt = lv.tileAt.bind(lv);
  lv.tileAt = (tx, ty) => { seen.add(ty); return realTileAt(tx, ty); };
  const ctx = new Proxy({}, { get:(t,k)=>{
    if (k==='createLinearGradient'||k==='createRadialGradient') return ()=>({addColorStop(){}});
    if (k==='canvas') return { width:1600, height:900 };
    return ()=>{};
  }, set:()=>true });
  let threw = null;
  try { lv.draw(ctx, 0); } catch(e) { threw = e.message.split('\n')[0]; }
  ok(threw === null, 'draw() completes on a 24-row level', threw ? `threw: ${threw}` : 'no throw');
  const tys = [...seen].filter(n => Number.isFinite(n));
  const maxTy = tys.length ? Math.max(...tys) : -1;
  ok(maxTy >= 23,
    'the draw loop reaches row 23, past the old 18-row bound',
    `deepest row queried = ${maxTy}; pinned to global ROWS this caps at 17`);
  ok(seen.has(20) && seen.has(23),
    'and both floor rows below the old bound are visited by the render loop',
    'rows 20 and 23 both queried');
}
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS \u2713');
process.exit(fail===0?0:1);
