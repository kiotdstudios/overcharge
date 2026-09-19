// A13.4 — Save / Publish path assertions.
//
// What this suite proves:
//   1. saveCurrentLevel() writes exactly one file (canonical levelN.json, no twin)
//   2. ensureInLevelOrder() leaves the manifest unchanged when the level is absent
//   3. The auto-click path is present in main.js (structural)
//   4. The handler-unavailable try/catch is present in main.js (structural)
//
// Runs in bun/node — browser globals stubbed below.

// ── Browser stubs ─────────────────────────────────────────────────────────
globalThis.window = {
  addEventListener(){}, removeEventListener(){},
  showSaveFilePicker: async () => { throw new Error('stub'); },
  showDirectoryPicker: async () => { throw new Error('stub — replaced per test'); },
  location: { search: '' },
};
globalThis.document = {
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style: {}, addEventListener(){} }),
  body: { style: {}, appendChild(){}, removeChild(){} },
  addEventListener(){}, removeEventListener(){},
};
globalThis.navigator = { clipboard: { writeText: async () => {} } };
// IndexedDB absent → localstore degrades gracefully (it checks typeof indexedDB)
// fetch not available → loadLevelOrder falls through to the empty-manifest default

// ── Harness ───────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const sec = t => console.log('\n[ ' + t + ' ]');
function ok(c, label, detail = '') {
  if (c) { pass++; console.log('  ✓ ' + label + (detail ? ' — ' + detail : '')); }
  else   { fail++; console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}

// ── Helpers ───────────────────────────────────────────────────────────────
// Build a mock FileSystemDirectoryHandle that tracks writes.
function mockDirHandle(levels_json_order = []) {
  const files = {};  // filename → last written content
  const writes = []; // ordered log of { name, bytes }

  function makeFileHandle(name) {
    return {
      async getFile() {
        const content = files[name] ?? null;
        return {
          async text() {
            if (content === null) throw Object.assign(new Error('not found'), { name: 'NotFoundError' });
            return content;
          }
        };
      },
      async createWritable() {
        let buf = '';
        return {
          async write(data) { buf = data; },
          async close() { files[name] = buf; writes.push({ name, bytes: buf.length }); },
        };
      },
    };
  }

  // Pre-populate levels.json so loadLevelOrder can read it
  files['levels.json'] = JSON.stringify({
    _schema: 'overcharge-levels-manifest@1',
    order: levels_json_order,
  }, null, 2);

  return {
    name: 'mock-levels',
    async queryPermission() { return 'granted'; },
    async requestPermission() { return 'granted'; },
    async getFileHandle(name, opts = {}) {
      if (!opts.create && !files[name]) {
        throw Object.assign(new Error(name + ' not found'), { name: 'NotFoundError' });
      }
      return makeFileHandle(name);
    },
    _writes: writes,
    _files: files,
  };
}

// ── Import persistence ────────────────────────────────────────────────────
import { saveCurrentLevel, ensureInLevelOrder, chooseSaveFolder }
  from '../editor/persistence.js';
import { state } from '../editor/state.js';
import { readFileSync } from 'node:fs';

// ── 1. Save writes exactly one file ──────────────────────────────────────
sec('saveCurrentLevel — writes exactly one file (canonical only)');
{
  const dir = mockDirHandle([{ number: 5, name: 'TEST LEVEL', file: 'level5.json' }]);
  // Inject the mock dir handle by overriding showDirectoryPicker
  globalThis.window.showDirectoryPicker = async () => dir;
  // chooseSaveFolder triggers the picker and caches the handle
  await chooseSaveFolder();

  // Set up a minimal level in state
  state.level = { number: 5, name: 'TEST LEVEL', tiles: [], cols: 20 };
  state.dirty = true;

  const r = await saveCurrentLevel();
  ok(r.ok, 'save reports success', r.message);

  // Count writes to canonical vs descriptive-twin names
  const canonicalWrites = dir._writes.filter(w => w.name === 'level5.json');
  const twinWrites      = dir._writes.filter(w => w.name !== 'level5.json' && w.name !== 'levels.json');
  ok(canonicalWrites.length === 1, 'exactly one write to level5.json', String(canonicalWrites.length));
  ok(twinWrites.length === 0,      'no descriptive-twin files written',
     twinWrites.length ? twinWrites.map(w => w.name).join(', ') : 'none');
  ok(r.message && r.message.includes('level5.json'), 'success message names canonical file', r.message);
}

// ── 2. ensureInLevelOrder — absent level leaves manifest unchanged ─────
sec('ensureInLevelOrder — absent level does NOT append to manifest');
{
  const dir = mockDirHandle([
    { number: 1, name: 'LEVEL ONE', file: 'level1.json' },
    { number: 3, name: 'LEVEL THREE', file: 'level3.json' },
  ]);
  globalThis.window.showDirectoryPicker = async () => dir;
  await chooseSaveFolder();

  const beforeWrites = dir._writes.length;
  // Level 99 is NOT in the manifest
  const result = await ensureInLevelOrder({ number: 99, name: 'GHOST LEVEL' });
  const afterWrites = dir._writes.length;

  ok(result === null, 'returns null for absent level', String(result));
  ok(afterWrites === beforeWrites, 'manifest not written for absent level',
     `writes before=${beforeWrites}, after=${afterWrites}`);

  // Verify the manifest still has only levels 1 and 3
  const manifest = JSON.parse(dir._files['levels.json']);
  const numbers = manifest.order.map(e => e.number);
  ok(!numbers.includes(99), 'level 99 not in manifest after ensureInLevelOrder', numbers.join(','));
  ok(numbers.length === 2, 'manifest order length unchanged', String(numbers.length));
}

// ── 3+4. main.js structural assertions (A13 + A14) ─────────────────────
sec('main.js — structural: click path, handler guard, A14 honest reporting');
{
  const mainSrc = readFileSync('editor/main.js', 'utf-8');

  // 3. The auto-click block must exist after a verified save
  ok(mainSrc.includes('_autoLink.click()'),
    'auto-invoke _autoLink.click() is present in main.js');
  ok(mainSrc.includes("_autoLink.href = 'overcharge://push'"),
    'auto-link targets overcharge://push');
  ok(mainSrc.includes('document.body.appendChild(_autoLink)'),
    'auto-link is appended to body before click');
  ok(mainSrc.includes('_autoLink.remove()'),
    'auto-link is removed after click');

  // 4. The try/catch guard: exception does NOT claim success
  const autoClickBlock = mainSrc.match(/try \{[^}]*_autoLink\.click\(\)[^}]*\}[^}]*catch[^}]*\}/s);
  ok(!!autoClickBlock, 'auto-click is wrapped in try/catch');
  // Status element set BEFORE the auto-click attempt
  const savedMsgIdx = mainSrc.indexOf('SAVED + VERIFIED');
  const autoClickIdx = mainSrc.indexOf('_autoLink.click()');
  ok(savedMsgIdx > 0 && savedMsgIdx < autoClickIdx,
    '"SAVED + VERIFIED" status appears before auto-click attempt',
    `msg@${savedMsgIdx} click@${autoClickIdx}`);

  // A14.1: No primary-styled peer publish button.
  ok(!mainSrc.includes('PUBLISH TO GITHUB'),
    'A14.1 — ▶ PUBLISH TO GITHUB peer button is absent from success path');

  // A14.2: All three required report states must be present.
  ok(mainSrc.includes("'PUBLISHED ' + _newSha"),
    'A14.2 — PUBLISHED <sha> state is present');
  ok(mainSrc.includes('PUBLISH FAILED'),
    'A14.2 — PUBLISH FAILED state is present');
  ok(mainSrc.includes("'SAVED \u2014 not published'"),
    'A14.2 — SAVED — not published state is present');

  // A14.2 mutation: PUBLISHED is only reachable when _published === true.
  const publishedBranch = mainSrc.match(/if \(_published\) \{([\s\S]*?)\} else if/);
  ok(!!publishedBranch, 'A14.2 — PUBLISHED state is inside if (_published) guard');
  ok(!!(publishedBranch && publishedBranch[1].includes("'PUBLISHED '")),
    'A14.2 — PUBLISHED string is inside the _published guard');

  // A14.1 mutation: fallback link absent on success path.
  const pubBranchStr = publishedBranch ? publishedBranch[1] : '';
  ok(!pubBranchStr.includes('_buildFallback'),
    'A14.1 — _buildFallback() absent from PUBLISHED branch');
}

console.log('\nRESULTS: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);