// build_manifest.mjs — scans assets/ recursively, writes assets/manifest.json.
// Categorizes by path segments. Run: node scripts/build_manifest.mjs
// Owner: Orcha (Phase 1 scaffolding). Aki inherits category taxonomy Phase 2+.
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const ASSETS = join(ROOT, 'assets');
const OUT = join(ASSETS, 'asset_index.json');

function categorize(rel) {
  const p = rel.toLowerCase().split(sep).join('/');
  if (p.indexOf('drain_enemy') >= 0) return 'enemy/drain';
  if (p.indexOf('helicopter') >= 0 || p.indexOf('/drone/') >= 0 || p.indexOf('/drone ') >= 0) return 'enemy/drone';
  if (p.indexOf('generator') >= 0) return 'electrical/generator';
  if (p.indexOf('/backgrounds/') >= 0) return 'background';
  if (p.indexOf('tilesets') >= 0 && p.indexOf('/props/') >= 0) return 'prop';
  if (p.indexOf('tilesets') >= 0 && p.indexOf('/tiles/') >= 0) return 'terrain';
  if (p.indexOf('tilesets') >= 0) return 'terrain';
  if (p.indexOf('/tiles/') >= 0) return 'terrain';
  const playerAnims = ['/idle', '/walking', '/running', '/jumping', '/charge', '/discharge'];
  if (p.indexOf('/sprites/') >= 0 && playerAnims.some(a => p.indexOf(a) >= 0)) return 'player';
  return 'other';
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.toLowerCase().endsWith('.png')) {
      const rel = relative(ASSETS, full).split(sep).join('/');
      out.push({ path: 'assets/' + rel, name: name.replace(/\.png$/i, ''), category: categorize(rel), size: st.size });
    }
  }
  return out;
}

const items = walk(ASSETS);
items.sort((a,b) => (a.category+a.path).localeCompare(b.category+b.path));
writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), count: items.length, items }, null, 2));
console.log('Wrote ' + items.length + ' entries to ' + OUT);
const byCat = {};
for (const i of items) byCat[i.category] = (byCat[i.category]||0)+1;
console.log('By category:', byCat);
