// Background layer hide/visibility checkbox — regression suite.
// Run with: node _dev/aki_bg_hide_layers.mjs (auto-discovered by run_all.mjs)
//
// Exercises the REAL background.js module (init/update/setHidden/tickTrain)
// plus the REAL editor state helper (currentBackgroundLayersHidden) and the
// REAL action factory (Actions.setBackgroundLayerHidden) — no re-implemented
// stand-ins, so a pass here means the shipped hide path behaves.
//
// Mirrors the DOM-stub pattern established in _dev/aki18_background_offsets.mjs.

function makeEl(tag) {
  const el = {
    tag, style: {}, children: [],
    appendChild(c) { this.children.push(c); return c; },
    getContext() {
      if (!this.__ctx) this.__ctx = makeCtx(this);
      return this.__ctx;
    },
    remove() {},
    width: 0, height: 0,
  };
  return el;
}
function makeCtx(ownerEl) {
  const calls = { clearRect: 0, drawImage: 0 };
  if (ownerEl) ownerEl.__ctxCalls = calls;
  const handler = {
    get(target, prop) {
      if (prop === '__calls') return calls;
      return (...args) => { if (prop === 'clearRect') calls.clearRect++; if (prop === 'drawImage') calls.drawImage++; };
    },
    set: () => true,
  };
  return new Proxy({}, handler);
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

function layerImgEl(container, key) {
  for (const wrapper of container.children) {
    const img = wrapper.children && wrapper.children[0];
    if (img && img.style && img.style.backgroundImage &&
        img.style.backgroundImage.indexOf(key) >= 0) return wrapper;
  }
  return null;
}

// ── editor/state.js: currentBackgroundLayersHidden() — backward compatibility
section('currentBackgroundLayersHidden() — backward compatibility');
St.state.level = { name: 'T', cols: 10, tiles: [], background: 'night-city-rail' };
let hid = St.currentBackgroundLayersHidden();
assert(hid.sky === false && hid.mid === false && hid.track === false && hid.front === false,
  'level with no backgroundLayersHidden field defaults every layer to visible (false)');

St.state.level.backgroundLayersHidden = { track: true };
hid = St.currentBackgroundLayersHidden();
assert(hid.track === true, 'stored hidden flag is read back exactly');
assert(hid.sky === false && hid.mid === false && hid.front === false,
  'unset keys on a partially-set backgroundLayersHidden object still default to visible');

// ── editor/actions.js: setBackgroundLayerHidden forward/inverse via REAL History
section('Actions.setBackgroundLayerHidden — undo/redo through the real history stack');
St.state.level = { name: 'T2', cols: 10, tiles: [] };
let a1 = Act.setBackgroundLayerHidden(St.state.level, 'front', true);
assert(!!a1, 'action produced when value changes from the implicit false default');
Hist.apply(a1);
assert(St.state.level.backgroundLayersHidden.front === true, 'forward() wrote the new value');
assert(Hist.undo(), 'undo() succeeds');
assert(!(St.state.level.backgroundLayersHidden?.front), 'inverse() restored the pre-change value (visible)');
assert(!Object.prototype.hasOwnProperty.call(St.state.level, 'backgroundLayersHidden'), 'undo restores the absent optional field exactly');
assert(Hist.redo(), 'redo() succeeds');
assert(St.state.level.backgroundLayersHidden.front === true, 'redo() re-applied forward()');

let aFalse = Act.setBackgroundLayerHidden(St.state.level, 'front', false);
Hist.apply(aFalse);
assert(!Object.prototype.hasOwnProperty.call(St.state.level, 'backgroundLayersHidden'), 'un-hiding back to false removes the optional field');
assert(Hist.undo(), 'undoing the un-hide succeeds');
assert(St.state.level.backgroundLayersHidden.front === true, 'undoing the un-hide restores the prior hidden state');

let a2 = Act.setBackgroundLayerHidden(St.state.level, 'front', true);
assert(a2 === null, 'no-op action (same value) returns null — nothing pushed to history');

assert(Act.setBackgroundLayerHidden(null, 'front', true) === null, 'missing level is a safe no-op');

// ── src_scroll/background.js: init/update apply real hide flags ───────────
section('background.js — per-layer hide application');
BG.init(3200, null, { sky: false, mid: true, track: false, front: false });
BG.update(0);
const root = globalThis.document.body.firstChild;
assert(!!root && root.children.length >= 4, 'init() built the layer container tree');

const skyWrap   = layerImgEl(root, '01-sky');
const midWrap   = layerImgEl(root, '03-midground-skyline');
const trackWrap = layerImgEl(root, '04-elevated-track');
const frontWrap = layerImgEl(root, '06-dark-front-skyline');
assert(!!skyWrap && !!midWrap && !!trackWrap && !!frontWrap, 'all 4 named layer wrappers found in the tree');

assert(skyWrap.style.display === '', 'sky (not hidden) has empty display (visible)');
assert(midWrap.style.display === 'none', 'mid (hidden:true) has display:none');
assert(trackWrap.style.display === '', 'track (not hidden) has empty display (visible)');
assert(frontWrap.style.display === '', 'front (not hidden) has empty display (visible)');

section('background.js — levels with no hidden map render exactly as before');
BG.init(3200); // no second/third argument at all — mirrors a pre-feature level
BG.update(0);
const root2 = globalThis.document.body.firstChild;
const skyWrap2 = layerImgEl(root2, '01-sky');
assert(skyWrap2.style.display === '', 'omitted hidden argument defaults every layer to visible (no visual change)');

section('background.js — setHidden() live-updates without a re-init');
BG.setHidden({ track: true });
const trackWrap2 = layerImgEl(root2, '04-elevated-track');
assert(trackWrap2.style.display === 'none', 'setHidden() applied immediately via its own update() call');
BG.setHidden({ sky: true }); // merge, must not clobber track's hidden=true
const trackWrap3 = layerImgEl(root2, '04-elevated-track');
const skyWrap3   = layerImgEl(root2, '01-sky');
assert(trackWrap3.style.display === 'none', 'setHidden() merges — unspecified keys keep their prior value (track still hidden)');
assert(skyWrap3.style.display === 'none', 'setHidden() applied the newly-merged sky:true flag too');
BG.setHidden({ sky: false, track: false }); // restore visible for next section
assert(layerImgEl(root2, '01-sky').style.display === '' && layerImgEl(root2, '04-elevated-track').style.display === '',
  'setHidden() can restore visibility (display back to empty string)');

section('background.js — hiding "track" also clears the train canvas');
// tickTrain is not exported directly, but init()'s internal atmoLoop IIFE
// runs exactly one synchronous pass (now=0, same guarantee aki18's suite
// relies on for drawRain/tickLightning) — enough to exercise the guard.
// The train <canvas> is the FIRST 'canvas' tag appended to _container,
// the rain canvas the second; find it via document tree order.
function findCanvas(container, nth) {
  const found = container.children.filter(c => c.tag === 'canvas');
  return found[nth] || null;
}
BG.init(3200, null, { track: true });
const root3 = globalThis.document.body.firstChild;
const trainCanvas = findCanvas(root3, 0);
assert(!!trainCanvas, 'train canvas element found in the built tree');
assert(!!trainCanvas.__ctxCalls, 'train canvas had getContext() called during init (ctx captured)');
assert(trainCanvas.__ctxCalls.clearRect >= 1, 'tickTrain() cleared the train canvas on its first pass while track is hidden', String(trainCanvas.__ctxCalls.clearRect));
assert(trainCanvas.__ctxCalls.drawImage === 0, 'tickTrain() did NOT draw the train — the hidden-track guard short-circuited before drawImage()');

section('background.js — "track" visible draws the train (guard does not fire)');
BG.init(3200, null, { track: false });
const root4 = globalThis.document.body.firstChild;
const trainCanvas2 = findCanvas(root4, 0);
assert(trainCanvas2.__ctxCalls.drawImage >= 1, 'tickTrain() drew the train on its first pass while track is visible (sanity check — guard only fires when hidden)');

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
