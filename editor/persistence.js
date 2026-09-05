// persistence.js — save / load / new / duplicate for level JSON files.
//
// Browser security note (spec §1): browsers cannot silently overwrite arbitrary
// files. We use a two-tier strategy:
//
//   Tier 1 — File System Access API (Chrome/Edge):
//     First save prompts the user to pick a location via showSaveFilePicker().
//     The FileSystemFileHandle is cached in-memory per session, keyed by level
//     path (the URL that loaded it) or by ephemeral id for NEW/DUPLICATE. Every
//     subsequent SAVE on that level silently overwrites through the handle.
//
//   Tier 2 — Blob download fallback (Firefox/Safari):
//     If FSA is unavailable, generate a Blob and trigger a download. The user
//     saves it manually to src_scroll/levels/. Not a true "save-in-place" but
//     it's honest — no fake success.
//
// Dirty tracking lives in state.js as state.dirty. persistence flips it false
// on successful save; history.js flips it true on any action.
//
// Level discovery for the dropdown: probe fetch(level1.json), level2.json, ...
// stopping at first 404. No filesystem listing needed. NEW/DUPLICATE levels
// are in-memory only until the user manually places the downloaded file into
// src_scroll/levels/ and refreshes.

import { state, notify, loadLevel } from './state.js';
import * as History from './history.js';
import * as Selection from './selection.js';

// File handle cache: mapping level-key → FileSystemFileHandle.
// Level-key = state.levelPath for pre-existing files, or a synthetic id
// (`new:<number>`) for NEW/DUPLICATE levels not yet saved anywhere.
const _handles = new Map();

// Directory handle for the levels folder Chief picks on first save.
// Once set, ALL saves silently write levelN.json into this folder — no
// per-file picker. Chief picks src_scroll/levels/ once, done.
let _saveDirHandle = null;

// Tier-1 available? Chrome/Edge yes, Firefox/Safari no.
export function hasFSA() {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}
// Does the browser support the directory-picker flow?
function _hasDirPicker() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

// Ensure we have a writable directory handle to save levels into.
// Chief picks the folder ONCE via the browser's native folder picker; the
// handle is cached for the whole session and every subsequent save writes
// directly, no additional prompts. Returns the handle or null on decline.
async function _ensureSaveDir() {
  // If we already have a handle, verify permission is still granted.
  if (_saveDirHandle) {
    try {
      const q = await _saveDirHandle.queryPermission({ mode: 'readwrite' });
      if (q === 'granted') return _saveDirHandle;
      const r = await _saveDirHandle.requestPermission({ mode: 'readwrite' });
      if (r === 'granted') return _saveDirHandle;
      // Permission revoked — clear and re-pick.
      _saveDirHandle = null;
    } catch { _saveDirHandle = null; }
  }
  if (!_hasDirPicker()) return null;
  try {
    // `id` groups these picks so browsers remember the last-chosen location
    // across editor sessions (Chrome does; result is: after the first pick,
    // future editor reboots open the picker directly at the levels folder).
    _saveDirHandle = await window.showDirectoryPicker({
      id: 'overcharge-levels',
      startIn: 'documents',
      mode: 'readwrite',
    });
    return _saveDirHandle;
  } catch (err) {
    if (err && err.name === 'AbortError') return null;   // user cancelled
    console.error('[persistence] Directory picker failed:', err);
    return null;
  }
}

// Public: let the user re-pick the save folder (e.g. moved repo, wrong pick).
export async function chooseSaveFolder() {
  _saveDirHandle = null;
  return await _ensureSaveDir();
}
// Public: current save folder name for UI display.
export function saveFolderName() {
  return _saveDirHandle ? _saveDirHandle.name : null;
}

// ── Level discovery (dropdown population) ────────────────────────────────
// Two paths:
//   • Chief has picked a save folder (Chrome, cached directory handle) →
//     enumerate every *.json in that folder. This makes custom-named saves
//     like 847291_WIRED_SPIRE.json show up in the dropdown.
//   • No directory handle (fresh session, Firefox, Safari) → fall back to
//     probing levelN.json in src_scroll/levels/ so bundled levels always
//     appear even before Chief picks a folder.
// Each entry: { source, name, number, path?, handle? }.
export async function discoverLevels() {
  const found = [];

  // Tier 1: enumerate the chosen save folder.
  if (_saveDirHandle && typeof _saveDirHandle.values === 'function') {
    try {
      const q = await _saveDirHandle.queryPermission?.({ mode: 'read' });
      if (q === 'granted' || q === undefined) {
        for await (const entry of _saveDirHandle.values()) {
          if (entry.kind !== 'file' || !/\.json$/i.test(entry.name)) continue;
          try {
            const file = await entry.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            found.push({
              source:  'dir',
              handle:  entry,
              name:    data.name || entry.name.replace(/\.json$/i, ''),
              number:  data.number ?? 999,
              filename: entry.name,
            });
          } catch { /* malformed JSON — skip silently */ }
        }
      }
    } catch { /* handle revoked — fall through to bundled probe */ }
  }

  // Tier 2: bundled level probe. Only used to append levels not already
  // discovered from the save folder (so Chief's local edits win).
  const seen = new Set(found.map(f => (f.name || '') + '|' + (f.number || '')));
  for (let i = 1; i <= 20; i++) {
    const path = `src_scroll/levels/level${i}.json`;
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) break;
      const data = await res.json();
      const key = (data.name || `Level ${i}`) + '|' + (data.number ?? i);
      if (seen.has(key)) continue;
      found.push({
        source: 'bundled',
        path,
        name:   data.name || `Level ${i}`,
        number: data.number ?? i,
      });
    } catch { break; }
  }

  found.sort((a, b) => (a.number || 0) - (b.number || 0));
  return found;
}

// Load a level entry produced by discoverLevels(). Returns the loaded level
// object or null on failure. Handles both directory-handle-backed entries
// and legacy bundled-path entries.
export async function loadLevelEntry(entry) {
  if (!entry) return null;
  try {
    let data;
    if (entry.source === 'dir' && entry.handle) {
      const file = await entry.handle.getFile();
      data = JSON.parse(await file.text());
      state.levelPath = 'dir:' + entry.filename;    // sentinel — save uses dir handle
    } else if (entry.path) {
      const res = await fetch(entry.path, { cache: 'no-store' });
      if (!res.ok) return null;
      data = await res.json();
      state.levelPath = entry.path;
    } else return null;
    state.level = data;
    state.camera.x = 0; state.camera.y = 0;
    state.dirty = false;
    notify();
    return data;
  } catch (err) { console.error('[persistence] loadLevelEntry failed:', err); return null; }
}

// ── Save ─────────────────────────────────────────────────────────────────
// Returns { ok, method, message }. Never throws. Never fakes success.
export async function saveCurrentLevel() {
  const L = state.level;
  if (!L) return { ok: false, method: 'none', message: 'No level loaded.' };
  const json = JSON.stringify(L, null, 2);
  const filename = _levelFilename(L);

  // ── Preferred path: write into the chosen save folder ────────────────
  // Chief picks the folder once (via native folder picker). Subsequent
  // saves for every level silently write levelN.json into it. No per-file
  // picker after first pick.
  const dir = await _ensureSaveDir();
  if (dir) {
    try {
      const fh = await dir.getFileHandle(filename, { create: true });
      const w  = await fh.createWritable();
      await w.write(json);
      await w.close();
      state.dirty = false;
      state.lastSavedAt = Date.now();
      notify();
      return { ok: true, method: 'fsa-dir', message: `Saved to ${dir.name}/${filename}` };
    } catch (err) {
      // Permission revoked / disk full / whatever — clear the dir and try
      // the per-file picker below as a last-ditch effort.
      console.error('[persistence] Directory write failed, falling back:', err);
      _saveDirHandle = null;
    }
  }

  // ── Legacy tier: per-file showSaveFilePicker ────────────────────────
  // Only used if the browser doesn't support showDirectoryPicker
  // (Firefox/Safari today), OR Chief cancelled the folder pick above.
  const key = state.levelPath || `new:${L.number ?? 'x'}`;
  if (hasFSA()) {
    let handle = _handles.get(key);
    if (!handle) {
      try {
        handle = await window.showSaveFilePicker({
          id: 'overcharge-levels',
          startIn: 'documents',
          suggestedName: filename,
          types: [{ description: 'Level JSON', accept: { 'application/json': ['.json'] } }],
        });
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return { ok: false, method: 'fsa', message: 'Save cancelled.' };
        }
      }
    }
    if (handle) {
      try {
        const w = await handle.createWritable();
        await w.write(json);
        await w.close();
        _handles.set(key, handle);
        state.dirty = false;
        state.lastSavedAt = Date.now();
        notify();
        return { ok: true, method: 'fsa', message: `Saved to ${handle.name}` };
      } catch (err) {
        _handles.delete(key);
        console.error('[persistence] FSA write failed, falling back:', err);
      }
    }
  }

  // ── Final tier: Blob download ───────────────────────────────────────
  // Firefox/Safari, or when both prior paths failed. Chief manually places
  // the downloaded file into src_scroll/levels/.
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    state.dirty = false;
    state.lastSavedAt = Date.now();
    notify();
    return { ok: true, method: 'download', message: `Downloaded ${filename} — place in src_scroll/levels/ and refresh.` };
  } catch (err) {
    console.error('[persistence] Blob download failed:', err);
    return { ok: false, method: 'error', message: 'Save failed: ' + err.message };
  }
}

// ── New Level ────────────────────────────────────────────────────────────
// Creates an empty level per canonical schema. Prompts user for name + number.
// Warns if current has unsaved changes.
export async function newLevel() {
  if (!await _confirmDiscardIfDirty('Discard unsaved changes and start a new level?')) return false;

  const number = _promptNumber('New level number:', _suggestNextNumber());
  if (number === null) return false;
  const name = (window.prompt('New level name:', `LEVEL ${number}`) || '').trim() || `LEVEL ${number}`;

  const empty = _canonicalEmptyLevel(name, number);
  _loadInMemory(empty, `new:${number}`);
  return true;
}

// ── Duplicate Level ──────────────────────────────────────────────────────
// Deep-clones current level so edits to the copy never mutate the original.
// Prompts for new name + number.
export async function duplicateLevel() {
  const L = state.level;
  if (!L) return false;
  if (!await _confirmDiscardIfDirty('Discard unsaved changes before duplicating?')) return false;

  const clone = structuredClone(L);
  const number = _promptNumber('New level number:', _suggestNextNumber());
  if (number === null) return false;
  const suggestedName = clone.name ? `${clone.name} (copy)` : `LEVEL ${number}`;
  const name = (window.prompt('New level name:', suggestedName) || '').trim() || suggestedName;
  clone.number = number;
  clone.name = name;

  _loadInMemory(clone, `new:${number}`);
  return true;
}

// ── Switch to a discovered level (dropdown change) ───────────────────────
// Accepts either an entry object from discoverLevels() OR a legacy string
// path (bundled fetch). If Chief has an unsaved-dirty state, prompts first.
export async function switchToLevel(entryOrPath) {
  const entry = (typeof entryOrPath === 'string')
    ? { source: 'bundled', path: entryOrPath }
    : entryOrPath;
  const key = entry.source === 'dir' ? ('dir:' + entry.filename) : entry.path;
  if (state.levelPath === key) return true;
  if (!await _confirmDiscardIfDirty('Discard unsaved changes and switch level?')) return false;
  const data = await loadLevelEntry(entry);
  if (!data) return false;
  History.clearAll();
  Selection.clearSelection();
  state.dirty = false;
  notify();
  return true;
}

// ── Load a level object directly (used by the generator) ────────────────
// Non-destructive: prompts to discard unsaved changes first. On accept,
// swaps in the given level as if it were a NEW/DUPLICATE. Chief can then
// SAVE AS or regenerate.
export async function loadInMemoryLevel(levelObj, opts = {}) {
  const label = opts.confirmMessage || 'Discard unsaved changes and load this level?';
  if (!await _confirmDiscardIfDirty(label)) return false;
  const key = opts.syntheticKey || `generated:${levelObj?.number ?? Date.now()}`;
  _loadInMemory(levelObj, key);
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Build the filename for a level. Preferred shape per Chief:
//   <seed>_<sanitized_name>.json     (for generator-produced levels)
// Fallback for hand-authored levels that never had a seed:
//   <number>_<sanitized_name>.json
// Sanitization: whitespace → underscore, only [A-Za-z0-9_-] survives, ≤64
// chars. Names with unusual characters degrade gracefully to a stub.
function _levelFilename(L) {
  const rawName = (L && L.name) ? String(L.name) : 'LEVEL';
  const cleanName = rawName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 64) || 'LEVEL';
  // Seed comes from the generator (level.generated.seed). Hand-authored
  // levels use their level number as the ID slot.
  const idPart = (L && L.generated && typeof L.generated.seed === 'number')
    ? L.generated.seed
    : (L && L.number != null ? L.number : Date.now());
  return `${idPart}_${cleanName}.json`;
}
function _canonicalEmptyLevel(name, number) {
  return {
    name, number,
    cols: 100,
    tiles: new Array(14 * 100).fill(0),
    playerStart: { x: 64, y: 194 },
    decorations: [],
    sources:     [],
    gates:       [],
    switches:    [],
    checkpoints: [],
    platforms:   [],
    enemies:     [],
  };
}

function _loadInMemory(levelObj, syntheticKey) {
  state.level = levelObj;
  state.levelPath = null;                 // in-memory only; save assigns a real path
  state.dirty = true;                     // freshly created, unsaved
  state.camera.x = 0;
  state.camera.y = 0;
  History.clearAll();
  Selection.clearSelection();
  _handles.delete(syntheticKey);          // ensure first save prompts for location
  notify();
}

function _suggestNextNumber() {
  if (Array.isArray(state.availableLevels) && state.availableLevels.length > 0) {
    return Math.max(...state.availableLevels.map(l => l.number || 0)) + 1;
  }
  return (state.level?.number ?? 0) + 1;
}

function _promptNumber(msg, def) {
  const s = window.prompt(msg, String(def));
  if (s === null) return null;
  const n = parseInt(s.trim(), 10);
  if (!Number.isFinite(n) || n < 1) { window.alert('Level number must be a positive integer.'); return null; }
  return n;
}

// In-page confirm using <dialog id="confirm-dialog"> so browser popup-block
// permissions can't silently kill our flows. Falls back to window.confirm
// only if the dialog element is missing from the page.
async function _confirmDiscardIfDirty(msg) {
  if (!state.dirty) return true;

  const dialog = typeof document !== 'undefined' && document.getElementById('confirm-dialog');
  const msgEl  = typeof document !== 'undefined' && document.getElementById('confirm-message');
  const okBtn  = typeof document !== 'undefined' && document.getElementById('confirm-ok');
  const cxBtn  = typeof document !== 'undefined' && document.getElementById('confirm-cancel');

  if (!dialog || !okBtn || !cxBtn || typeof dialog.showModal !== 'function') {
    // Fallback for browsers without <dialog> support or missing DOM.
    return window.confirm(msg);
  }

  if (msgEl) msgEl.textContent = msg;

  return new Promise((resolve) => {
    const cleanup = (v) => {
      okBtn.removeEventListener('click', onOk);
      cxBtn.removeEventListener('click', onCancel);
      dialog.removeEventListener('close', onClose);
      try { if (dialog.open) dialog.close(); } catch {}
      resolve(v);
    };
    const onOk     = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onClose  = () => cleanup(false);   // Esc / backdrop dismiss = cancel
    okBtn.addEventListener('click', onOk);
    cxBtn.addEventListener('click', onCancel);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}
