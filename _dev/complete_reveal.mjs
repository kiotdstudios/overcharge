import assert from 'node:assert/strict';

globalThis.window = { innerWidth: 800, addEventListener() {} };
globalThis.document = { addEventListener() {} };
globalThis.Image = class {};
const { drawLevelComplete } = await import('../src_scroll/ui.js');

function record(time) {
  const calls = { strokes: 0, sparks: 0, clips: 0, text: [] };
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() { calls.strokes++; }, strokeRect() {},
    fillRect(x, y, w, h) { if (w <= 7 && h <= 3) calls.sparks++; },
    rect() {}, clip() { calls.clips++; },
    createLinearGradient() { return gradient; },
    fillText(s) { calls.text.push(s); },
  }, { get(target, key) { return key in target ? target[key] : undefined; } });
  drawLevelComplete(ctx, { number: 1, name: 'NEON RISE' }, time, time);
  return calls;
}

const early = record(0.12), impact = record(0.26), glitch = record(0.68), settled = record(1.15);
assert.equal(early.text.length, 0, 'completion card stays hidden before impact');
assert.ok(impact.strokes > 0 && impact.sparks > 0, 'bolt and sparks draw at impact');
assert.ok(glitch.clips > 0 && glitch.text.includes('LEVEL COMPLETE'), 'card glitches in through scanline bands');
assert.ok(settled.text.includes('LEVEL COMPLETE') && settled.clips === 0, 'card settles into a stable full panel');
console.log('RESULTS: 4 passed, 0 failed');
