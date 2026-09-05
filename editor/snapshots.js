// snapshots.js — intentional, long-term LEVEL VERSION HISTORY.
//
// ARCHITECTURE RULE (Chief): three separate concepts, never merged.
//
//   Undo/Redo   editor/history.js    short-term editing history, in memory,
//                                    dies with the tab. Fine-grained.
//   Recovery    localStorage         crash/browser recovery. ONE dirty
//                                    snapshot, overwritten constantly, offered
//                                    on boot then discarded. Not history.
//   Snapshots   THIS MODULE          deliberate immutable versions in
//                                    IndexedDB. Survive refresh, browser
//                                    restart and OS reboot. Listable,
//                                    previewable, restorable, exportable.
//
// This module owns storage + retention only. It never touches editor state and
// never writes to the repo; main.js decides when to snapshot and how to apply
// a restore. That separation is what keeps it safe.
//
// STORAGE: shares ONE IndexedDB database with localstore.js
// ('overcharge-editor' v2). localstore.js owns openDB() — the version and the
// upgrade path live in exactly one place, and both modules share a single
// cached connection. Two modules opening the same database at different
// versions deadlocks the upgrade (see the note in localstore.js), so this
// module deliberately does NOT open its own.
//
// Records are IMMUTABLE once written. Restore reads them; it never edits them.

import { levelChecksum } from '../src_scroll/levelsig.js';
import { openDB, STORE_SNAP } from './localstore.js';

// Retention: newest N AUTOMATIC snapshots per level. Manual snapshots are
// never pruned — they represent a human decision.
export const AUTO_RETENTION = 25;

export const KIND = { MANUAL: 'manual', AUTO: 'auto' };

// Run `fn(objectStore)` inside a transaction. `fn` may return an IDBRequest
// (its .result is unwrapped) or a plain value / thunk. Kept explicit rather
// than clever: an earlier version resolved with the raw IDBRequest whenever a
// get() missed, which silently handed callers a request object instead of null.
function _tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAP, mode);
    const os = tx.objectStore(STORE_SNAP);
    let out, isRequest = false;
    try {
      out = fn(os);
      isRequest = !!(out && typeof out === 'object' && 'onsuccess' in out && 'readyState' in out);
    } catch (err) { reject(err); return; }
    tx.oncomplete = () => {
      if (isRequest)                       resolve(out.result === undefined ? null : out.result);
      else if (typeof out === 'function')   resolve(out());
      else                                  resolve(out);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

// Storage problems must degrade the feature, never break the editor.
async function _safe(fn, fallback = null) {
  try { return await fn(); }
  catch (err) { console.warn('[snapshots] ' + (err && err.message)); return fallback; }
}

export function isAvailable() { return typeof indexedDB !== 'undefined'; }

// ── identity ──────────────────────────────────────────────────────────────
// Snapshots are grouped per level. Prefer the stable level number; fall back
// to name so in-memory levels (no number yet) still group sensibly.
export function levelKeyOf(level) {
  if (!level) return 'unknown';
  if (Number.isFinite(level.number)) return 'n' + level.number;
  return 'name:' + String(level.name || 'unnamed').trim().toLowerCase();
}

function _newId() {
  // Time-ordered + random suffix: sortable and collision-free within a ms.
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ── create ────────────────────────────────────────────────────────────────
/**
 * Write an immutable snapshot. Returns the stored record (without pruning
 * having removed it) or null when storage is unavailable.
 *
 * @param level  the level object to freeze (deep-copied here)
 * @param opts   { kind, note, build }
 */
export async function create(level, opts = {}) {
  if (!level) return null;
  const kind = opts.kind === KIND.MANUAL ? KIND.MANUAL : KIND.AUTO;
  // Deep copy so later edits to the live level cannot mutate stored history.
  let json;
  try { json = JSON.parse(JSON.stringify(level)); }
  catch (err) { console.warn('[snapshots] level not serializable: ' + err.message); return null; }

  const rec = {
    id:        _newId(),
    levelKey:  levelKeyOf(level),
    kind,
    note:      String(opts.note || '').slice(0, 200),
    createdAt: Date.now(),
    levelName: level.name ?? null,
    levelNumber: Number.isFinite(level.number) ? level.number : null,
    cols:      level.cols ?? null,
    tileCount: Array.isArray(level.tiles) ? level.tiles.length : null,
    checksum:  levelChecksum(level),
    build:     opts.build || null,   // { branch, shaShort, shaFull, generated }
    schema:    1,
    level:     json,
  };

  const ok = await _safe(() => _tx('readwrite', os => os.put(rec)), false);
  if (ok === false) return null;
  await prune(rec.levelKey);
  return rec;
}

// ── read ──────────────────────────────────────────────────────────────────
/** All snapshots for one level, NEWEST FIRST. */
export async function listForLevel(levelKey) {
  const rows = await _safe(() => _tx('readonly', os => {
    const out = [];
    const req = os.index('levelKey').openCursor(IDBKeyRange.only(levelKey));
    req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } };
    return () => out;
  }), []);
  return (rows || []).slice().sort((a, b) => b.createdAt - a.createdAt);
}

/** Every snapshot in the store, newest first. Used by EXPORT ALL. */
export async function listAll() {
  const rows = await _safe(() => _tx('readonly', os => {
    const out = [];
    const req = os.openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } };
    return () => out;
  }), []);
  return (rows || []).slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function get(id) {
  if (!id) return Promise.resolve(null);
  return _safe(() => _tx('readonly', os => os.get(id)));
}

export function remove(id) {
  if (!id) return Promise.resolve(false);
  return _safe(async () => { await _tx('readwrite', os => os.delete(id)); return true; }, false);
}

/** Wipe all snapshots. Caller MUST have confirmed with the user first. */
export function clearAll() {
  return _safe(async () => { await _tx('readwrite', os => os.clear()); return true; }, false);
}

// ── retention ─────────────────────────────────────────────────────────────
/**
 * Keep the newest AUTO_RETENTION *automatic* snapshots for a level and delete
 * older automatic ones. MANUAL snapshots are never pruned.
 * Returns the number deleted.
 */
export async function prune(levelKey, retention = AUTO_RETENTION) {
  const all = await listForLevel(levelKey);
  const autos = all.filter(r => r.kind === KIND.AUTO);   // already newest-first
  const doomed = autos.slice(retention);
  if (!doomed.length) return 0;
  let n = 0;
  for (const r of doomed) { if (await remove(r.id)) n++; }
  return n;
}

// ── stats ─────────────────────────────────────────────────────────────────
export async function stats() {
  const all = await listAll();
  let bytes = 0;
  for (const r of all) { try { bytes += JSON.stringify(r).length; } catch { /* ignore */ } }
  return {
    total:  all.length,
    manual: all.filter(r => r.kind === KIND.MANUAL).length,
    auto:   all.filter(r => r.kind === KIND.AUTO).length,
    levels: new Set(all.map(r => r.levelKey)).size,
    approxBytes: bytes,
    newest: all[0] ? all[0].createdAt : null,
  };
}

// ── export / import ───────────────────────────────────────────────────────
export const PACKAGE_FORMAT = 'overcharge.snapshots';
export const PACKAGE_VERSION = 1;

/** One portable package object containing every snapshot. */
export async function exportPackage() {
  const all = await listAll();
  return {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    count: all.length,
    snapshots: all,
  };
}

/**
 * Validate a package WITHOUT writing anything. Returns
 * { ok, error, count, verified, corrupt[] } so the UI can refuse bad input
 * before it touches the store.
 */
export function validatePackage(obj) {
  if (!obj || typeof obj !== 'object')       return { ok: false, error: 'not an object' };
  if (obj.format !== PACKAGE_FORMAT)         return { ok: false, error: `format is "${obj.format}", expected "${PACKAGE_FORMAT}"` };
  if (!Number.isFinite(obj.version))         return { ok: false, error: 'missing version' };
  if (obj.version > PACKAGE_VERSION)         return { ok: false, error: `version ${obj.version} is newer than supported (${PACKAGE_VERSION})` };
  if (!Array.isArray(obj.snapshots))         return { ok: false, error: 'snapshots is not an array' };

  const corrupt = [];
  let verified = 0;
  obj.snapshots.forEach((r, i) => {
    const where = r && r.id ? r.id : '#' + i;
    if (!r || typeof r !== 'object') { corrupt.push(where + ': not an object'); return; }
    if (!r.id)                       { corrupt.push(where + ': missing id'); return; }
    if (!r.level || typeof r.level !== 'object') { corrupt.push(where + ': missing level payload'); return; }
    if (!Array.isArray(r.level.tiles))          { corrupt.push(where + ': level has no tiles array'); return; }
    // Re-derive the checksum: proves the payload was not altered in transit.
    const actual = levelChecksum(r.level);
    if (r.checksum && actual !== r.checksum) {
      corrupt.push(`${where}: checksum mismatch (stored ${r.checksum}, actual ${actual})`);
      return;
    }
    verified++;
  });
  return { ok: corrupt.length === 0, error: null, count: obj.snapshots.length, verified, corrupt };
}

/**
 * Import a validated package. Refuses outright if validation fails.
 * Existing ids are skipped (never overwritten) so import is non-destructive.
 * Returns { imported, skipped, error }.
 */
export async function importPackage(obj, { prunePerLevel = true } = {}) {
  const v = validatePackage(obj);
  if (!v.ok) return { imported: 0, skipped: 0, error: v.error || v.corrupt.join('; ') };

  let imported = 0, skipped = 0;
  for (const rec of obj.snapshots) {
    const existing = await get(rec.id);
    if (existing) { skipped++; continue; }
    const ok = await _safe(() => _tx('readwrite', os => os.put(rec)), false);
    if (ok !== false) imported++;
  }
  if (prunePerLevel) {
    for (const key of new Set(obj.snapshots.map(r => r.levelKey))) await prune(key);
  }
  return { imported, skipped, error: null };
}

// ── display helpers ───────────────────────────────────────────────────────
/** "2026-09-05 6:52 PM" — local time, matching Chief's requested format. */
export function formatStamp(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${h}:${p(d.getMinutes())} ${ampm}`;
}

/** "2026-09-05 6:52 PM — Before Gate Rework" */
export function describe(rec) {
  if (!rec) return '';
  return formatStamp(rec.createdAt) + (rec.note ? ' \u2014 ' + rec.note : '');
}

/** Filesystem-safe filename for a single snapshot download. */
export function filenameFor(rec) {
  const d = new Date(rec.createdAt);
  const p = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const note = String(rec.note || '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  const lvl = rec.levelNumber != null ? 'L' + rec.levelNumber : 'level';
  return `snapshot_${lvl}_${stamp}${note ? '_' + note : ''}.json`;
}
