// Visual-only Neon Rise pass. Safe to rerun: replaces only decorations with
// the nr_l1_ prefix and refuses to run against a different route geometry.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'src_scroll/levels/level1.json';
const level = JSON.parse(fs.readFileSync(path, 'utf8'));
const route = JSON.parse(fs.readFileSync('previews/level1-high-low.json', 'utf8'));
assert.equal(level.cols, route.cols);
assert.deepEqual(level.tiles, route.tiles, 'do not dress a changed route without review');
for (const key of ['playerStart', 'sources', 'gates', 'switches', 'checkpoints', 'platforms', 'enemies'])
  assert.deepEqual(level[key], route[key], `do not change ${key} while dressing`);

const root = 'assets/objects/neon-rise-dressing/';
const props = [
  // Small rooftop silhouettes break up the long, level rooflines. These are
  // background art with no collider, power behavior or interaction prompt.
  ['antenna-west', 'antenna-utility-cluster.png', 616, 368, 104, 80],
  ['billboard-center', 'lightning-billboard.png', 1176, 208, 168, 144],
  ['glyph-center', 'vertical-glyph-sign.png', 1352, 224, 64, 128],
  ['antenna-east', 'antenna-utility-cluster.png', 2832, 400, 104, 80],

  // Wall-mounted detail is intentionally below the landable roof tops. The
  // blue and purple facades remain passable on the lower traversal route.
  ['blue-graffiti', 'cyan-magenta-graffiti.png', 1608, 400, 208, 94],
  ['blue-vent', 'service-vent-panel.png', 1888, 412, 104, 66],
  ['blue-conduit', 'lit-conduit-pipe.png', 1856, 462, 128, 55],
  ['purple-graffiti', 'cyan-magenta-graffiti.png', 2184, 402, 184, 83],
  ['purple-lamp', 'amber-service-lamp.png', 2360, 398, 80, 48],
];

level.decorations = (level.decorations || []).filter(d => !d.id?.startsWith('nr_l1_'));
for (const [name, file, x, y, w, h] of props) {
  const src = root + file;
  assert.ok(fs.existsSync(src), `missing art: ${src}`);
  assert.ok(x >= 0 && y >= 0 && x + w <= level.cols * 32 && y + h <= level.tiles.length / level.cols * 32);
  level.decorations.push({ id: `nr_l1_${name}`, src, x, y, w, h, snap: 1 });
}
fs.writeFileSync(path, JSON.stringify(level, null, 2) + '\n');
console.log(`Dressed Level 1 with ${props.length} non-colliding Neon Rise props`);
