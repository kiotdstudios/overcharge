// Selected Builder scenery can cross the rooftop tile plane without moving collision.
globalThis.window = { addEventListener() {}, removeEventListener() {}, location: { search: '' } };
globalThis.document = { getElementById: () => null, addEventListener() {}, removeEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 16; this.naturalHeight = 16; } addEventListener() {} };
const { Level } = await import('../src_scroll/level.js');
const { state } = await import('../editor/state.js');
const { setDecorationTileLayer } = await import('../editor/actions.js');
const { render } = await import('../editor/renderer.js');

const front = { src: 'fixture/front.png', x: 0, y: 0, w: 32, h: 32, tileLayer: 'front' };
const back = { src: 'fixture/back.png', x: 0, y: 0, w: 32, h: 32, tileLayer: 'back' };
const legacy = { src: 'fixture/legacy.png', x: 0, y: 0, w: 32, h: 32 };
const def = { cols: 2, tiles: [1, 0], decorations: [front, back, legacy] };
state.level = def;
const action = setDecorationTileLayer([front, legacy], 'back');
if (!action) throw new Error('layer action missing');
action.forward();
if (front.tileLayer !== 'back' || legacy.tileLayer !== 'back') throw new Error('layer action did not set both selected assets');
action.inverse();
if (front.tileLayer !== 'front' || 'tileLayer' in legacy) throw new Error('undo did not restore explicit and absent values');
if (JSON.parse(JSON.stringify(def)).decorations[1].tileLayer !== 'back') throw new Error('layer was lost on level export');

const level = new Level(def);
const calls = [];
const ctx = new Proxy({ drawImage(img) { calls.push(img.src || 'tile'); } }, {
  get(target, key) { return key in target ? target[key] : () => {}; }, set() { return true; },
});
level.draw(ctx, 0);
const backIndex = calls.indexOf('fixture/back.png');
const legacyIndex = calls.indexOf('fixture/legacy.png');
const frontIndex = calls.indexOf('fixture/front.png');
const tileIndex = calls.findIndex(src => src !== 'fixture/back.png' && src !== 'fixture/legacy.png' && src !== 'fixture/front.png');
if (!(backIndex >= 0 && legacyIndex > backIndex && tileIndex > legacyIndex && frontIndex > tileIndex)) {
  throw new Error(`wrong draw order: ${calls.join(', ')}`);
}
if (def.tiles[0] !== 1) throw new Error('decoration layering changed collision tiles');
console.log('decoration tile layer: undo and draw order pass');

// Builder preview must place a backed asset before the solid tile and a
// front asset after it. Empty selection/markers keep the probe focused.
state.showGrid = false;
const editorCalls = [];
const editorCtx = new Proxy({
  drawImage(img) { editorCalls.push(img.src); },
  fillRect(x, y, w, h) { if (x === 0 && y === 0 && w === 32 && h === 32) editorCalls.push('ground'); },
}, { get(target, key) { return key in target ? target[key] : () => {}; }, set() { return true; } });
render(editorCtx, { width: 128, height: 128 });
const eb = editorCalls.indexOf('fixture/back.png');
const et = editorCalls.indexOf('ground');
const ef = editorCalls.indexOf('fixture/front.png');
if (!(eb >= 0 && et > eb && ef > et)) throw new Error(`Builder preview order wrong: ${editorCalls.join(', ')}`);
console.log('Builder preview tile layering passes');
