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

// Tier-1 available? Chrome/Edge yes, Firefox/Safari no.
export function hasFSA() {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

// ── Level discovery (dropdown population) ────────────────────────────────
// Probes level1.json → level10.json. Stops at the first 404. Returns an array
// of { path, name, number } sorted by number. Safe to call at boot.
export async function discoverLevels() {
  const found = [];
  for (let i = 1; i <= 20; i++) {   // upper bound 20 — Chief will never author more than that in one session
    const path = `src_scroll/levels/level${i}.json`;
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) break;   // first 404 stops the walk
      const data = await res.json();
      found.push({ path, name: data.name || `Level ${i}`, number: data.number ?? i });
    } catch {
      break;
    }
  }
  return found;
}

// ── Save ─────────────────────────────────────────────────────────────────
// Returns { ok, method, message }. Never throws. Never fakes success.
export async function saveCurrentLevel() {
  const L = state.level;
  if (!L) return { ok: false, method: 'none', message: 'No level loaded.' };
  const json = JSON.stringify(L, null, 2);
  const key = state.levelPath || `new:${L.number ?? 'x'}`;

  // Tier 1: File System Access API
  if (hasFSA()) {
    let handle = _handles.get(key);
    if (!handle) {
      try {
        handle = await window.showSaveFilePicker({
          suggestedName: `level${L.number ?? ''}.json`,
          types: [{ description: 'Level JSON', accept: { 'application/json': ['.json'] } }],
        });
      } catch (err) {
        // User cancelled the picker — no error, no save.
        if (err.name === 'AbortError') return { ok: false, method: 'fsa', message: 'Save cancelled.' };
        // Any other error — fall through to blob tier.
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
        // Permission revoked, disk full, etc. Drop the handle, retry via blob.
        _handles.delete(key);
        console.error('[persistence] FSA write failed, falling back to download:', err);
      }
    }
  }

  // Tier 2: Blob download
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `level${L.number ?? ''}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    state.dirty = false;
    state.lastSavedAt = Date.now();
    notify();
    return { ok: true, method: 'download', message: `Downloaded ${a.download} — place in src_scroll/levels/ and refresh.` };
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
export async function switchToLevel(path) {
  if (state.levelPath === path) return true;
  if (!await _confirmDiscardIfDirty('Discard unsaved changes and switch level?')) return false;
  await loadLevel(path);
  History.clearAll();
  Selection.clearSelection();
  state.dirty = false;
  notify();
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────

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

async function _confirmDiscardIfDirty(msg) {
  if (!state.dirty) return true;
  return window.confirm(msg);
}
