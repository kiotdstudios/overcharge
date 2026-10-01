// AKI_18 — background parallax layer vertical offset regression suite.
// Run with: node _dev/aki18_background_offsets.mjs (auto-discovered by run_all.mjs)
//
// Exercises the REAL background.js module (init/update/setOffsets) plus the
// REAL editor state helpers (BG_OFFSET_LAYERS, currentBackgroundOffsets) and
// the REAL action factory (Actions.setBackgroundOffset) — no re-implemented
// stand-ins, so a pass here means the shipped offset path behaves.

// ── Minimal DOM surface — background.js builds a real element tree on init().
// Elements are plain objects with a style bag and a children array; good
// enough for background.js, which never reads layout, only writes transforms.
function makeEl(tag) {
  return {
    tag, style: {}, children: [],
    appendChild(c) { this.children.push(c); return c; },
    getContext() { return makeCtx(); },
    remove() {},
    width: 0, height: 0,
  };
}
function makeCtx() {
  return new Proxy({}, { get: () => () => {}, set: () => true });
}
globalThis.window = {
  innerWidth: 1920, innerHeight: 1080,
  addEventListener(){}, removeEventListener(){},
};
globalThis.document = {
  createElement: (tag) => makeEl(tag),
  getElementById: () => null,
  head: { appendChild(){} },
  body: { firstChild: null, insertBefore(node){ this.firstChild = node; }, appendChild(){} },
};
globalThis.Image = class { constructor(){ this.complete = true; } set src(_v){} };
let _rafQueue = [];
globalThis.requestAnimationFrame = (fn) => { _rafQueue.push(fn); return _rafQueue.length; };

const BG   = await import('../src_scroll/background.js');
const St   = await import('../editor/state.js');
const Act  = await import('../editor/actions.js');
const Hist = await import('../editor/history.js');

let passed = 0, failed = 0;
function assert(cond, name, detail = '') {
  if (cond) { console.log(`  \u2713 ${name}${detail ? ' \u2014 ' + detail : ''}`); passed++; }
  else { console.error(`  \u2717 FAIL: ${name}${detail ? ' \u2014 ' + detail : ''}`); failed++; }
}
function section(t) { console.log(`\n${t}`); }

// ── editor/state.js: BG_OFFSET_LAYERS + currentBackgroundOffsets ───────────
section('BG_OFFSET_LAYERS catalog');
assert(St.BG_OFFSET_LAYERS.length === 4, 'exactly 4 named layers');
assert(St.BG_OFFSET_LAYERS.map(l => l.key).join(',') === 'sky,mid,track,front',
  'keys match background.js layer keys', St.BG_OFFSET_LAYERS.map(l => l.key).join(','));

section('currentBackgroundOffsets() — backward compatibility');
St.state.level = { name: 'T', cols: 10, tiles: [], background: 'night-city-rail' };
let offs = St.currentBackgroundOffsets();
assert(offs.sky === 0 && offs.mid === 0 && offs.track === 0 && offs.front === 0,
  'level with no backgroundOffsets field defaults every layer to 0');

St.state.level.backgroundOffsets = { track: -24 };
offs = St.currentBackgroundOffsets();
assert(offs.track === -24, 'stored offset is read back exactly', String(offs.track));
assert(offs.sky === 0 && offs.mid === 0 && offs.front === 0,
  'unset keys on a partially-set backgroundOffsets object still default to 0');

// ── editor/actions.js: setBackgroundOffset forward/inverse via REAL History ─
section('Actions.setBackgroundOffset — undo/redo through the real history stack');
St.state.level = { name: 'T2', cols: 10, tiles: [] };
let a1 = Act.setBackgroundOffset(St.state.level, 'sky', 16);
assert(!!a1, 'action produced when value changes from the implicit 0 default');
Hist.apply(a1);
assert(St.state.level.backgroundOffsets.sky === 16, 'forward() wrote the new value');
assert(Hist.undo(), 'undo() succeeds');
assert((St.state.level.backgroundOffsets.sky || 0) === 0, 'inverse() restored the pre-change value (0)');
assert(Hist.redo(), 'redo() succeeds');
assert(St.state.level.backgroundOffsets.sky === 16, 'redo() re-applied forward()');

let a2 = Act.setBackgroundOffset(St.state.level, 'sky', 16);
assert(a2 === null, 'no-op action (same value) returns null — nothing pushed to history');

assert(Act.setBackgroundOffset(null, 'sky', 5) === null, 'missing level is a safe no-op');

// ── src_scroll/background.js: init/update/setOffsets apply real offsets ────
section('background.js — per-layer vertical offset application');
BG.init(3200, { sky: 10, mid: -5, track: 7, front: 0 });
BG.update(0);
// _layers is module-private; verify indirectly via the element tree committed
// to document.body (first child = sky layer container built first in init()).
const root = globalThis.document.body.firstChild;
assert(!!root && root.children.length >= 4, 'init() built the layer container tree');

// Re-derive which child is which by filename substring baked into backgroundImage.
function layerImgEl(container, key) {
  // Each layer wrapper div's single child carries backgroundImage style.
  for (const wrapper of container.children) {
    const img = wrapper.children && wrapper.children[0];
    if (img && img.style && img.style.backgroundImage &&
        img.style.backgroundImage.indexOf(key) >= 0) return wrapper;
  }
  return null;
}
const skyWrap   = layerImgEl(root, '01-sky');
const midWrap    = layerImgEl(root, '03-midground-skyline');
const trackWrap  = layerImgEl(root, '04-elevated-track');
const frontWrap  = layerImgEl(root, '06-dark-front-skyline');
assert(!!skyWrap && !!midWrap && !!trackWrap && !!frontWrap, 'all 4 named layer wrappers found in the tree');

function offsetYOf(wrap) {
  const t = wrap.style.transform || '';
  const m = /translate3d\(-?[\d.]+px,(-?[\d.]+)px,0\)/.exec(t);
  return m ? Number(m[1]) : NaN;
}
assert(offsetYOf(skyWrap)   === 10, 'sky layer transform carries its +10 offset', skyWrap.style.transform);
assert(offsetYOf(midWrap)   === -5, 'mid layer transform carries its -5 offset (moved UP)', midWrap.style.transform);
assert(offsetYOf(trackWrap) === 7,  'track layer transform carries its +7 offset', trackWrap.style.transform);
assert(offsetYOf(frontWrap) === 0,  'front layer with explicit 0 stays at 0', frontWrap.style.transform);

section('background.js — levels with no offsets render exactly as before');
BG.init(3200); // no second argument at all — mirrors a pre-AKI_18 level
BG.update(0);
const root2 = globalThis.document.body.firstChild;
const skyWrap2 = layerImgEl(root2, '01-sky');
assert(offsetYOf(skyWrap2) === 0, 'omitted offsets argument defaults every layer to 0 (no visual change)');

section('background.js — setOffsets() live-updates without a re-init');
BG.setOffsets({ track: 40 });
const trackWrap2 = layerImgEl(root2, '04-elevated-track');
assert(offsetYOf(trackWrap2) === 40, 'setOffsets() applied immediately via its own update() call');
BG.setOffsets({ sky: -3 }); // merge, must not clobber track's 40
const trackWrap3 = layerImgEl(root2, '04-elevated-track');
assert(offsetYOf(trackWrap3) === 40, 'setOffsets() merges — unspecified keys keep their prior value');

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
