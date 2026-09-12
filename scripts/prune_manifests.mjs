// prune_manifests.mjs — one-shot cleanup after the 2026-09-12 asset purge.
// Drops manifest entries whose asset path no longer exists on disk.
// Handles template paths like ".../{dir}/frame_{n}.png" by checking the
// static directory prefix before the first "{".
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

function pathAlive(p) {
  const brace = p.indexOf('{');
  const probe = brace >= 0 ? dirname(p.slice(0, brace) + 'x') : p;
  return existsSync(join(ROOT, probe));
}

for (const file of ['assets/ASSET_MANIFEST.json', 'assets/PURPLE_CITY_INDEX.json']) {
  const full = join(ROOT, file);
  const doc = JSON.parse(readFileSync(full, 'utf8'));
  const before = doc.assets.length;
  const dropped = doc.assets.filter(a => !pathAlive(a.path)).map(a => a.id);
  doc.assets = doc.assets.filter(a => pathAlive(a.path));
  writeFileSync(full, JSON.stringify(doc, null, 2) + '\n');
  console.log(`${file}: ${before} -> ${doc.assets.length}  dropped: ${dropped.join(', ') || 'none'}`);
}
