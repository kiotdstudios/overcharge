import assert from 'node:assert/strict';

const images = [];
globalThis.Image = class {
  constructor() { this.complete = true; this.naturalWidth = 48; images.push(this); }
};
const { ElectricBolt } = await import('../src_scroll/entities.js');
images.length = 0;

const calls = [];
const ctx = {
  save() {}, restore() {},
  translate(...args) { calls.push(['translate', ...args]); },
  rotate(angle) { calls.push(['rotate', angle]); },
  drawImage(...args) { calls.push(['drawImage', ...args]); },
};
const bolt = new ElectricBolt(100, 200, -320, 0);
assert.equal(bolt.w, 6);
assert.equal(bolt.h, 6);
bolt.draw(ctx);
assert.equal(images.length, 4);
assert.equal(images[0].src, 'assets/sprites/electric-bolt/frame_00.png');
assert.deepEqual(calls.find(call => call[0] === 'drawImage')?.slice(-4), [-24, -24, 48, 48]);
assert.equal(calls.find(call => call[0] === 'rotate')?.[1], Math.PI);
calls.length = 0;
bolt.update(0.1, { solidAt: () => false }, []);
bolt.draw(ctx);
assert.equal(calls.find(call => call[0] === 'drawImage')?.[1], images[1]);
console.log('Electric bolt art: frames, direction, scale, and hitbox passed');
