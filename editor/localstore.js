// localstore.js — durable browser-side storage for the editor.
//
// WHY THIS EXISTS
// On a static host (GitHub Pages) SAVE writes a file to the user's disk via the
// File System Access API, but bootstrap loads levels with fetch() from the
// server origin. Those are two different places and nothing bridged them, so
// every save silently vanished the moment the editor was reopened:
//
//   SAVE  → C:\Users\...\some_folder\1_NEON_RISE.json   (local disk)
//   BOOT  → GET /src_scroll/levels/level1.json          (committed in git)
//
// This module mirrors every successful save into IndexedDB and persists the
// chosen save-folder handle, so a reopened editor can find the user's latest
// work with no server involvement.
//
// IndexedDB rather than localStorage for two reasons:
//   1. FileSystemDirectoryHandle is structured-cloneable but NOT a string, so
//      localStorage cannot hold it. IndexedDB can.
//   2. Level JSON can exceed the ~5 MB localStorage budget.
//
// PERMISSIONS CAVEAT (important): a restored directory handle usually comes
// back with permission state 'prompt', and requestPermission() only resolves
// to 'granted' when called from a user gesture. That is why the restore
// attempt lives inside the SAVE click path (persistence._ensureSaveDir) and
// never on bootstrap. Level JSON stored here needs no permission at all,
// which is what makes automatic restore-on-boot possible.

const DB_NAME    = 'overcharge-editor';
const DB_VERSION = 1;
const STORE      = 'kv';

const KEY_DIR_HANDLE = 'saveDirHandle';
const LEVEL_PREFIX   = 'level:';   // level:<levelKey>

let _dbPromise = null;

function _open() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  // Never cache a rejected promise — a transient failure would poison every
  // later call for the lifetime of the page.
  _dbPromise.catch(() => { _dbPromise = null; });
  return _dbPromise;
}

async function _tx(mode, fn) {
  const db = await _open();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    try { result = fn(store); } catch (err) { reject(err); return; }
    tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
}

// Every public call is failure-tolerant: storage being unavailable (private
// browsing, quota, disabled IDB) must degrade the editor, never break it.
async function _safe(fn, fallback = null) {
  try { return await fn(); } catch (err) {
    console.warn('[localstore] ' + err.message);
    return fallback;
  }
}

// ── Save-folder handle ───────────────────────────────────────────────────
export function getDirHandle() {
  return _safe(() => _tx('readonly', s => s.get(KEY_DIR_HANDLE)));
}
export function setDirHandle(handle) {
  return _safe(() => _tx('readwrite', s => s.put(handle, KEY_DIR_HANDLE)));
}
export function clearDirHandle() {
  return _safe(() => _tx('readwrite', s => s.delete(KEY_DIR_HANDLE)));
}

// ── Saved level mirror ───────────────────────────────────────────────────
// A record is { levelKey, filename, name, number, json, savedAt, method }.
// `json` is the serialized level exactly as written to disk, so a byte
// comparison against the committed copy is meaningful.
export function putLevel(record) {
  if (!record || !record.levelKey) return Promise.resolve(null);
  return _safe(() => _tx('readwrite', s => s.put(record, LEVEL_PREFIX + record.levelKey)));
}
export function getLevel(levelKey) {
  if (!levelKey) return Promise.resolve(null);
  return _safe(() => _tx('readonly', s => s.get(LEVEL_PREFIX + levelKey)));
}
export function deleteLevel(levelKey) {
  if (!levelKey) return Promise.resolve(null);
  return _safe(() => _tx('readwrite', s => s.delete(LEVEL_PREFIX + levelKey)));
}

// All mirrored saves, newest first. Used to populate the level dropdown so
// local-only work is visible and switchable.
export async function allLevels() {
  const rows = await _safe(async () => {
    const db = await _open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const out   = [];
      const req   = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { resolve(out); return; }
        if (typeof cur.key === 'string' && cur.key.startsWith(LEVEL_PREFIX)) out.push(cur.value);
        cur.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }, []);
  return (rows || []).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}
