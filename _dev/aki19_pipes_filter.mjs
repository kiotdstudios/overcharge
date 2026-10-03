// AKI_19 — Builder Pipes filter regression suite.
// Run with: node _dev/aki19_pipes_filter.mjs (auto-discovered by run_all.mjs)
//
// Exercises the REAL editor/state.js filter pipeline (loadManifest +
// filteredManifestItems + setPipeOnly) against the REAL
// assets/ASSET_MANIFEST.json on disk — no re-implemented stand-in manifest,
// so a pass here means the shipped Pipes filter behaves against real data.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

globalThis.window = { location: { href: 'file:///editor.html' } };
globalThis.fetch = async (url) => {
  const clean = String(url).split('?')[0];
  if (clean.indexOf('ASSET_MANIFEST.json') >= 0) {
    const raw = readFileSync(path.join(REPO_ROOT, 'assets/ASSET_MANIFEST.json'), 'utf8');
    return { ok: true, json: async () => JSON.parse(raw) };
  }
  // PURPLE_CITY_INDEX.json and anything else: not found, loadManifest's
  // disk-index merge is wrapped in try/catch and treats this as "optional".
  return { ok: false, status: 404, json: async () => ({}) };
};

const St = await import('../editor/state.js');

let passed = 0, failed = 0;
function assert(cond, name, detail = '') {
  if (cond) { console.log(`  \u2713 ${name}${detail ? ' \u2014 ' + detail : ''}`); passed++; }
  else { console.error(`  \u2717 FAIL: ${name}${detail ? ' \u2014 ' + detail : ''}`); failed++; }
}
function section(t) { console.log(`\n${t}`); }

section('loadManifest() against the real on-disk manifest');
await St.loadManifest();
assert(St.state.manifest && St.state.manifest.items.length > 0, 'manifest loaded with items', String(St.state.manifest.items.length));

section('Pipes filter — tag-driven, shows exactly the 6 pipe entries (3 lit + 3 unlit)');
St.setPipeOnly(true);
const pipeItems = St.filteredManifestItems();
assert(pipeItems.length === 6, 'exactly 6 items under the Pipes filter', String(pipeItems.length));
const expectedNames = [
  'Night City pipe - short', 'Night City pipe - elbow', 'Night City pipe - branch',
  'Night City pipe - short (unlit)', 'Night City pipe - elbow (unlit)', 'Night City pipe - branch (unlit)',
];
for (const n of expectedNames) {
  assert(pipeItems.some(it => it.name === n), `includes "${n}"`);
}
assert(pipeItems.every(it => it.tags.indexOf('pipe') >= 0), 'every returned item actually carries the pipe tag (no leakage)');

section('Pipe variants keep their authored dimensions');
for (const it of pipeItems) {
  assert(typeof it.width === 'number' && it.width > 0 && typeof it.height === 'number' && it.height > 0,
    `"${it.name}" has placeable dimensions`, `${it.width}x${it.height}`);
}

section('Other quick-filters still work (no leakage from the new filter wiring)');
St.setPipeOnly(false);
St.setElectricOnly(true);
const electricItems = St.filteredManifestItems();
assert(electricItems.length > 0, 'Electric filter still returns items', String(electricItems.length));
assert(!electricItems.some(it => it.tags.indexOf('pipe') >= 0 && it.tags.indexOf('electric') < 0),
  'Electric filter does not leak plain pipe-only items in');
St.setElectricOnly(false);

// The neon-rise dressing pack was REMOVED at Chief's instruction. Six pipe entries had
// been double-tagged `neon_rise_dressing`, which is the only reason they ever appeared
// under this filter — the original assertion here was measuring that double-tag, not a
// real relationship. Deleting the pack by tag would therefore have taken the pipes with
// it; they were removed by path instead and the stray tag stripped.
//
// New truth: the Neon Rise filter matches nothing, and the pipes are unaffected.
St.setNeonRiseOnly(true);
const neonItems = St.filteredManifestItems();
assert(neonItems.length === 0, 'Neon Rise filter returns nothing — the pack is removed', String(neonItems.length));
St.setNeonRiseOnly(false);

St.setPipeOnly(true);
const pipesAfter = St.filteredManifestItems();
assert(pipesAfter.length >= 6, 'the 6 pipes SURVIVED the neon-rise removal', String(pipesAfter.length));
assert(!pipesAfter.some(it => (it.tags || []).indexOf('neon_rise_dressing') >= 0),
  'no pipe still carries the stray neon_rise_dressing tag');
St.setPipeOnly(false);

section('state.filter defaults — pipeOnly starts false, matches every other quick-filter default');
St.setPipeOnly(false);
assert(St.state.filter.pipeOnly === false, 'pipeOnly cleanly resettable to its default');

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
