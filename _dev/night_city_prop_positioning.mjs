import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { state, snapForRef, snapDelta, groupSnap } from '../editor/state.js';
import { __testReanchor, pointerTool } from '../editor/tools.js';
import { clearSelection } from '../editor/selection.js';

const tiles = Array.from({ length: 40 * 18 }, (_, i) => Math.floor(i / 40) >= 14 ? 16 : 0);
const wall = { kind: 'prop', mount: 'wall', x: 201, y: 350 };
const lamp = { kind: 'prop', x: 208, y: 420 };
const generator = { x: 320, y: 420, charge: 4 };
state.level = { cols: 40, tiles, sources: [wall, lamp, generator] };

for (const prop of [wall, lamp]) {
  assert.equal(snapForRef('source', prop), 1);
  const start = { x: prop.x, y: prop.y };
  const { dx, dy } = snapDelta(7, -13, snapForRef('source', prop));
  prop.x += dx; prop.y += dy;
  __testReanchor(new Map([[prop, start]]));
  assert.deepEqual({ x: prop.x, y: prop.y }, { x: start.x + 7, y: start.y - 13 });
}

assert.equal(groupSnap([{ kind: 'source', ref: wall }, { kind: 'source', ref: lamp }]), 1);
assert.equal(snapForRef('source', generator), 32);
generator.y -= 13;
__testReanchor(new Map([[generator, { x: 320, y: 420 }]]));
assert.equal(generator.y + 28, 448, 'ordinary generator stays grounded');

// Exercise the real pointer drag path, including hit testing, delta snap,
// re-anchoring, and the committed final position on mouse-up.
const draggable = { kind: 'prop', x: 300, y: 350, artW: 64, artH: 64 };
state.level.sources = [draggable];
state.camera = { x: 0, y: 0, zoom: 1 };
state.snapOverride = 'auto';
clearSelection();
const canvas = { width: 800, height: 600, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
const event = (x, y) => ({ button: 0, clientX: x, clientY: y, shiftKey: false });
pointerTool.onMouseDown(event(314, 350), canvas);
pointerTool.onMouseMove(event(321, 337), canvas);
assert.deepEqual({ x: draggable.x, y: draggable.y }, { x: 307, y: 337 });
pointerTool.onMouseUp(event(321, 337), canvas);
assert.deepEqual({ x: draggable.x, y: draggable.y }, { x: 307, y: 337 });

const spawn = readFileSync('editor/main.js', 'utf8');
assert.match(spawn, /const propPos = snapPoint\(wx, wy, effectiveSnap\(1\)\)/);
assert.match(spawn, /y: wallMounted \? propPos\.y : _groundAt\(/);
console.log('Night City props move up and by single pixels; generators retain grid/ground behavior.');
