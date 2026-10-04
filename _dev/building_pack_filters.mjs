// CHIEF 2026-10-03 — Builder quick-filters for the four night-city building packs.
// "i dont see check box filters for warehouse, coffee bar, apartment, and mart; in asset
//  library on builder"
//
// The art was already on disk and in ASSET_MANIFEST.json; only the chips were missing, so the
// packs were reachable only by typing in the search box or scanning the 20 entries under
// Buildings.
//
// Drives the REAL editor/state.js against the REAL on-disk manifest (same approach as
// aki19_pipes_filter.mjs) — no stand-in manifest, so a pass means the shipped filters work on
// the data Chief actually has.
import { readFileSync } from 'node:fs';

globalThis.window = { location: { href: 'file:///editor.html' } };
globalThis.fetch = async (url) => {
  const clean = String(url).split('?')[0];
  if (clean.indexOf('ASSET_MANIFEST.json') >= 0)
    return { ok: true, json: async () => JSON.parse(readFileSync('assets/ASSET_MANIFEST.json', 'utf8')) };
  return { ok: false, status: 404, json: async () => ({}) };
};

const St = await import('../editor/state.js');

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' \u2014 ' + d : ''}`); }
                               else { fail++; console.log(`  \u2717 ${m}${d ? ' \u2014 ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

await St.loadManifest();

// label, setter name, state key, manifest tag, expected count
const PACKS = [
  ['Warehouse',  'setWarehouseOnly', 'warehouseOnly', 'warehouse',         4],
  ['Coffee Bar', 'setCoffeeBarOnly', 'coffeeBarOnly', 'coffee_bar',        4],
  ['Apartment',  'setApartmentOnly', 'apartmentOnly', 'abandoned',         8],
  ['Mart',       'setMartOnly',      'martOnly',      'convenience_store', 4],
];
const clearAll = () => { for (const [, s] of PACKS) St[s](false);
  St.setBuildingOnly(false); St.setPipeOnly(false); St.setElectricOnly(false);
  St.setHvacOnly(false); St.setNeonRiseOnly(false); St.setPurpleRooftopOnly(false);
  St.setBlueRooftopOnly(false); St.setFilterCategory('all'); St.setFilterSearch(''); };

sec('The manifest really does carry all four packs');
{
  ok(St.state.manifest && St.state.manifest.items.length > 0,
    'manifest loaded', `${St.state.manifest.items.length} items`);
  for (const [label, , , tag, n] of PACKS) {
    const got = St.state.manifest.items.filter(i => (i.tags || []).includes(tag));
    ok(got.length === n, `${label} pack: ${n} assets tagged '${tag}'`, `found ${got.length}`);
  }
}

sec('Each chip shows exactly its own pack and nothing else');
{
  for (const [label, setter, , tag, n] of PACKS) {
    clearAll();
    St[setter](true);
    const got = St.filteredManifestItems();
    ok(got.length === n, `${label} shows exactly ${n} items`, `got ${got.length}`);
    ok(got.every(i => (i.tags || []).includes(tag)),
      `${label} shows only '${tag}' assets`, 'no leakage from neighbouring packs');
    ok(got.every(i => (i.tags || []).includes('building')),
      `${label} items are all tagged 'building'`, 'so Buildings still contains them');
  }
  clearAll();
}

sec('The four packs are disjoint, and all sit inside Buildings');
{
  const sets = {};
  for (const [label, setter] of PACKS) {
    clearAll(); St[setter](true);
    sets[label] = new Set(St.filteredManifestItems().map(i => i.id));
  }
  clearAll(); St.setBuildingOnly(true);
  const buildings = new Set(St.filteredManifestItems().map(i => i.id));
  clearAll();
  const labels = PACKS.map(p => p[0]);
  for (let a = 0; a < labels.length; a++) {
    for (let b = a + 1; b < labels.length; b++) {
      const overlap = [...sets[labels[a]]].filter(x => sets[labels[b]].has(x));
      ok(overlap.length === 0, `${labels[a]} and ${labels[b]} share no assets`,
        overlap.length ? overlap.join(', ') : '');
    }
    const outside = [...sets[labels[a]]].filter(x => !buildings.has(x));
    ok(outside.length === 0, `every ${labels[a]} asset also appears under Buildings`,
      outside.length ? `orphans: ${outside.join(', ')}` : '');
  }
  // Mart is 'convenience_store' and Apartment is 'abandoned' — assert the labels Chief uses
  // really do map onto those tags, because there is no 'mart' or 'apartment' tag to fall back
  // on and a wrong mapping would silently show an empty list.
  ok(sets['Mart'].has('building_nc_store_front_bay'),
    'Mart really maps to the convenience_store art', 'no "mart" tag exists in the manifest');
  ok(sets['Apartment'].has('building_nc_abandoned_top1'),
    'Apartment really maps to the abandoned_apartment art', 'no "apartment" tag exists either');
}

sec('Defaults are off, and the filter keys are the shape the reset derivation assumes');
{
  clearAll();
  const unfiltered = St.filteredManifestItems().length;
  for (const [label, , key] of PACKS)
    ok(St.state.filter[key] === false, `${label} starts unchecked`, `state.filter.${key}`);
  ok(unfiltered > 80, 'with nothing checked the full palette shows', `${unfiltered} items`);

  // editor/assets.js now DERIVES its reset from the keys of state.filter that end in "Only",
  // replacing two hand-written 9-key lists. That derivation is only sound while every such
  // key is a boolean pack filter, so pin it here: a future non-boolean "...Only" key would
  // be silently clobbered to false by Clear filters.
  const onlyKeys = Object.keys(St.state.filter).filter(k => k.endsWith('Only'));
  ok(onlyKeys.length >= 13, 'state.filter exposes every pack filter as an "...Only" key',
    `${onlyKeys.length} keys`);
  ok(onlyKeys.every(k => typeof St.state.filter[k] === 'boolean'),
    'and every one of them is a boolean', 'the derived reset assumes exactly this');
  for (const [label, , key] of PACKS)
    ok(onlyKeys.includes(key), `${label}'s key is picked up by the derivation`, key);
}

sec('Mutual exclusivity: the reset is derived, so no pack filter can be left behind');
{
  // THE BUG THIS PREVENTS: the chips are radio-like — checking one clears the rest. That
  // reset was written out by hand in TWO places, 9 keys each. Adding four packs meant editing
  // both lists; missing one key means checking Warehouse leaves Buildings set, the two
  // predicates AND together, and the grid shows nothing with no error anywhere.
  // Simulating what the change handler does, using the same derivation assets.js uses.
  const cleared = () => { const out = { category: 'all' };
    for (const k of Object.keys(St.state.filter)) if (k.endsWith('Only')) out[k] = false;
    return out; };
  for (const [label, setter, key] of PACKS) {
    clearAll();
    // Leave a stale restriction behind, exactly as a forgotten reset key would.
    St.setBuildingOnly(true); St.setPipeOnly(true); St.setFilterCategory('tile');
    Object.assign(St.state.filter, cleared());
    St[setter](true);
    const stale = Object.keys(St.state.filter)
      .filter(k => k.endsWith('Only') && k !== key && St.state.filter[k]);
    ok(stale.length === 0, `selecting ${label} clears every other pack filter`,
      stale.length ? `left set: ${stale.join(', ')}` : '');
    ok(St.state.filter.category === 'all', `and ${label} clears the category restriction`);
    ok(St.filteredManifestItems().length > 0, `so ${label} actually shows its assets`,
      'a surviving filter would AND to zero');
  }
  clearAll();
}

sec('UI wiring — the four chips exist, next to the other pack filters');
{
  const src = readFileSync('editor/assets.js', 'utf8');
  for (const [label, setter] of PACKS) {
    ok(src.includes(`label: '${label}'`), `assets.js defines a "${label}" chip`);
    ok(new RegExp(`setter:\\s*${setter}`).test(src), `${label} is wired to ${setter}`);
    ok(new RegExp(`\\b${setter}\\b`).test(src.split('from \'./state.js\'')[0] || ''),
      `${setter} is imported`, 'an unimported setter throws on click');
  }
  // The derivation must be the only reset path left.
  const resetUses = (src.match(/clearedPackFilters\(\)/g) || []).length;
  ok(resetUses === 2, 'both reset sites use the derived helper', `${resetUses} call sites`);
  ok(!/purpleRooftopOnly:\s*false/.test(src),
    'and no hand-written reset list survives in assets.js',
    'that duplication is what made this easy to get wrong');
  // Chips sit after Buildings so the pack narrows read as refinements of it.
  const iB = src.indexOf("label: 'Buildings'"), iW = src.indexOf("label: 'Warehouse'");
  ok(iB > 0 && iW > iB, 'the new chips come after Buildings in the list');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);