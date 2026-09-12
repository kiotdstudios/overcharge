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

// ── Shared database ───────────────────────────────────────────────────────
// THIS MODULE OWNS THE CONNECTION. Both this module and snapshots.js use the
// same IndexedDB database, so the version and the upgrade path MUST live in
// exactly one place.
//
// Why: an earlier split had localstore open v1 while snapshots opened v2. If
// localstore connected first, its open v1 connection BLOCKED the v2 upgrade and
// the editor hung forever waiting on `onblocked`. If snapshots connected first,
// localstore's v1 open failed with VersionError and silently lost save mirroring.
// One version + one upgrade function + one cached connection removes both
// failure modes. snapshots.js imports openDB() from here rather than opening
// its own.
export const DB_NAME    = 'overcharge-editor';
export const DB_VERSION = 2;          // v1: kv only. v2: + snapshots store.
export const STORE_KV   = 'kv';       // save mirror + save-folder handle
export const STORE_SNAP = 'snapshots';// level version history (snapshots.js)

const STORE = STORE_KV;               // this module's own store

// Keys within the kv store.
const KEY_DIR_HANDLE = 'saveDirHandle';
// (ORDER 005: the `level:` key prefix and its accessors were removed — see below.)

let _dbPromise = null;

/** Open (once) and return the shared connection. Creates every object store. */
export function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Guarded creates: a v1 database keeps its existing kv contents and only
      // gains the snapshots store.
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
      if (!db.objectStoreNames.contains(STORE_SNAP)) {
        const os = db.createObjectStore(STORE_SNAP, { keyPath: 'id' });
        os.createIndex('levelKey',  'levelKey',  { unique: false });
        os.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // If another tab requests a newer version, close so it is not blocked.
      db.onversionchange = () => { try { db.close(); } catch {} _dbPromise = null; };
      resolve(db);
    };
    req.onerror   = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another open tab'));
  });
  // Never cache a rejected promise — a transient failure would poison every
  // later call for the lifetime of the page.
  _dbPromise.catch(() => { _dbPromise = null; });
  return _dbPromise;
}

const _open = openDB;   // internal alias, keeps the rest of this file unchanged

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

// ── ORDER 005 ────────────────────────────────────────────────────────────
// The saved-level mirror (the read/write/list accessors keyed by
// `level:*`) has been REMOVED. Git-tracked JSON in src_scroll/levels is
// the only authored level store; IndexedDB keeps only the save-folder handle
// above (a machine-local capability) and the snapshots store (edit history,
// never a level source). Do not reintroduce a level mirror here.
