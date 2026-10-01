import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateLevelShape } from '../level-shape.js';

const route = JSON.parse(fs.readFileSync('previews/level1-high-low.json', 'utf8'));
assert.equal(validateLevelShape(route, 54), null, 'current 18-row Level 1 variant imports');
assert.equal(validateLevelShape({ ...route, tiles: route.tiles.concat(Array(route.cols).fill(0)) }, 54), null,
  'a complete added row imports');
assert.match(validateLevelShape({ ...route, tiles: route.tiles.slice(1) }, 54), /complete rows/,
  'partial rows reject');
assert.match(validateLevelShape({ ...route, cols: 100.5 }, 54), /invalid cols/);
assert.match(validateLevelShape({ ...route, tiles: Array(55 * route.cols).fill(0) }, 54), /complete rows/,
  'oversized levels reject');
console.log('PASS: variable-height upload and snapshot shape validation');
