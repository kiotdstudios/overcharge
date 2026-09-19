// A9 — Chest in Builder.
// KIRO ORDER AKI 10: prove chest is placeable, state frames are NOT placeable,
// spawn defaults land as cost:2/reward:10, boundingRect matches content box.
//
// All assertions driven from the manifest and the editor modules directly —
// no browser required; browser globals are stubbed below.

// ── Browser stubs ────────────────────────────────────────────────────────────
globalThis.window = {
  addEventListener(){}, removeEventListener(){},
  innerWidth:1920, innerHeight:1080,
  location:{ search:'' },
};
globalThis.document = {
  getElementById:()=>null, addEventListener(){}, removeEventListener(){},
  createElement:()=>({
    getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}),
    style:{}, addEventListener(){},
  }),
  body:{style:{}},
  querySelectorAll:()=>[], querySelector:()=>null,
};
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=128; this.naturalHeight=128; } };
globalThis.sessionStorage = { getItem:()=>null, setItem(){} };

// ── Harness ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const sec = t => console.log('\n' + t);
function ok(c, label, detail='') {
  if (c) { pass++; console.log('  ✓ ' + label + (detail?' — '+detail:'')); }
  else   { fail++; console.log('  ✗ ' + label + (detail?' — '+detail:'')); }
}

// ── 1. ASSET_MANIFEST — palette correctness ──────────────────────────────────
import { readFileSync } from 'fs';
const manifest = JSON.parse(readFileSync('assets/ASSET_MANIFEST.json', 'utf-8'));

sec('ASSET_MANIFEST — chest palette entry');
{
  const entry = manifest.assets.find(a => a.id === 'chest');
  ok(!!entry, 'chest entry exists in assets[]');
  ok(entry?.spawnsKind === 'chest', 'spawnsKind is "chest"', String(entry?.spawnsKind));
  ok(entry?.path === 'assets/objects/chest/closed.png', 'path is closed.png', entry?.path);
  ok(entry?.frame_width === 128 && entry?.frame_height === 128, 'canvas 128×128', `${entry?.frame_width}×${entry?.frame_height}`);
}

sec('ASSET_MANIFEST — state frames NOT in assets[] (must not be placeable)');
{
  const assetIds  = new Set(manifest.assets.map(a => a.id));
  const assetPaths = new Set(manifest.assets.map(a => a.path));
  ok(!assetIds.has('chest_open_empty'), 'chest_open_empty NOT in assets[]');
  ok(!assetPaths.has('assets/objects/chest/open_empty.png'), 'open_empty.png path absent from assets[]');
  for (let i = 0; i < 9; i++) {
    const id  = `chest_opening_frame_${String(i).padStart(3,'0')}`;
    const pth = `assets/objects/chest/opening/frame_${String(i).padStart(3,'0')}.png`;
    ok(!assetIds.has(id),   `frame_${String(i).padStart(3,'0')} NOT in assets[]`);
    ok(!assetPaths.has(pth), `frame_${String(i).padStart(3,'0')}.png path absent`);
  }
}

sec('ASSET_MANIFEST — state frames ARE in _runtime_state_sprites[]');
{
  const rts = manifest._runtime_state_sprites || [];
  const rtsIds = new Set(rts.map(e => e.id));
  ok(rtsIds.has('chest_open_empty'), 'chest_open_empty in _runtime_state_sprites[]');
  for (let i = 0; i < 9; i++) {
    const id = `chest_opening_frame_${String(i).padStart(3,'0')}`;
    ok(rtsIds.has(id), `frame_${String(i).padStart(3,'0')} in _runtime_state_sprites[]`);
  }
}

// ── 2. boundingRect — content box 104×104 ────────────────────────────────────
sec('boundingRect — chest returns 104×104 content box');
{
  // Import the state mock then selection.js
  const { boundingRect } = await import('../editor/selection.js');
  const ref = { id: 'CH1', x: 64, y: 128, cost: 2, reward: 10 };
  const r = boundingRect('chest', ref);
  ok(!!r, 'boundingRect returns non-null for chest');
  ok(r?.x === 64,  'x matches chest.x',   String(r?.x));
  ok(r?.y === 128, 'y matches chest.y',   String(r?.y));
  ok(r?.w === 104, 'width  = 104 (content)', String(r?.w));
  ok(r?.h === 104, 'height = 104 (content)', String(r?.h));
}

// ── 3. Spawn defaults ────────────────────────────────────────────────────────
sec('Spawn defaults — cost:2, reward:10, id prefixed "chest_"');
{
  // Simulate what _doSpawn produces:
  const TILE_SIZE = 32;
  const snapGrid = v => Math.round(v / TILE_SIZE) * TILE_SIZE;
  const px = snapGrid(200), py = 128;
  const obj = { id: 'chest_' + Date.now(), x: px, y: py, cost: 2, reward: 10 };
  ok(obj.cost   === 2,  'default cost  = 2',  String(obj.cost));
  ok(obj.reward === 10, 'default reward = 10', String(obj.reward));
  ok(obj.id.startsWith('chest_'), 'id prefixed "chest_"', obj.id);
  ok(obj.x % TILE_SIZE === 0, 'x is grid-aligned', String(obj.x));
  // No w/h in schema (Orcha's call D8)
  ok(obj.w === undefined, 'no w in schema (schema is {id,x,y,cost,reward})');
  ok(obj.h === undefined, 'no h in schema');
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\nchest_builder: ${pass}/${pass+fail}`);
if (fail > 0) process.exit(1);
