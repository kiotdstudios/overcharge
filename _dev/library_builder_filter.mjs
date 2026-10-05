import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.window = { location: { href: 'file:///editor.html' } };
globalThis.fetch = async url => ({
  ok: String(url).includes('ASSET_MANIFEST.json'),
  json: async () => JSON.parse(readFileSync('assets/ASSET_MANIFEST.json', 'utf8')),
});

const St = await import('../editor/state.js');
await St.loadManifest();

const expected = new Set([
  'building_nc_library_left',
  'building_nc_library_wall_bay',
  'building_nc_library_front_bay',
  'building_nc_library_right',
  'prop_ncp_book_sign',
]);

St.setLibraryOnly(true);
assert.deepEqual(new Set(St.filteredManifestItems().map(item => item.id)), expected);
const sign = St.filteredManifestItems().find(item => item.id === 'prop_ncp_book_sign');
assert.equal(sign.raw.spawnsKind, 'source-prop');
assert.equal(sign.raw.mount, 'wall');
assert.equal(sign.raw.frame_count, 8);

St.setLibraryOnly(false);
St.setBuildingOnly(true);
assert(expected.has('building_nc_library_left'));
assert(St.filteredManifestItems().some(item => item.id === 'building_nc_library_left'));
assert(!St.filteredManifestItems().some(item => item.id === 'prop_ncp_book_sign'));
St.setBuildingOnly(false);
St.setElectricOnly(true);
assert(St.filteredManifestItems().some(item => item.id === 'prop_ncp_book_sign'));

const ui = readFileSync('editor/assets.js', 'utf8');
assert(ui.includes("label: 'Library'"));
assert(ui.includes('setter: setLibraryOnly'));
assert(ui.includes('setWarehouseOnly, setCoffeeBarOnly, setApartmentOnly, setMartOnly, setLibraryOnly'));
console.log('Library filter: four panels and powered BOOKS sign; Buildings and Electric filters retain their respective items.');
