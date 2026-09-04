// actions.js — factory functions that produce Action objects for history.js.
//
// Every action is a plain object with:
//   { type: string, forward(): void, inverse(): void, ...payload }
// Actions mutate state.level directly. history.js knows nothing about the
// specific payloads — it only invokes forward()/inverse().
//
// Adding a new action type: define a factory here, use it from tools.js or
// wherever the mutation originates. Layers/inspector/collision/links will
// add their own action types without touching history.js.

import { state, notify, levelRows } from './state.js';

// ── SetTileAction ────────────────────────────────────────────────────────
// Sets a single tile (col,row) to `newVal`, remembers `oldVal` for undo.
export function setTile(col, row, newVal) {
  const L = state.level;
  if (!L) return null;
  const rows = levelRows();
  if (col < 0 || col >= L.cols || row < 0 || row >= rows) return null;
  const idx = row * L.cols + col;
  const oldVal = L.tiles[idx];
  if (oldVal === newVal) return null;
  return {
    type: 'set_tile',
    col, row, oldVal, newVal,
    forward() { L.tiles[idx] = newVal; notify(); },
    inverse() { L.tiles[idx] = oldVal; notify(); },
  };
}

// ── AddDecorationAction ──────────────────────────────────────────────────
export function addDecoration(dec) {
  const L = state.level;
  if (!L) return null;
  if (!Array.isArray(L.decorations)) L.decorations = [];
  return {
    type: 'add_decoration',
    dec,
    forward() { L.decorations.push(dec); notify(); },
    inverse() {
      const i = L.decorations.indexOf(dec);
      if (i >= 0) L.decorations.splice(i, 1);
      notify();
    },
  };
}

// ── RemoveFromArrayAction (generic) ──────────────────────────────────────
// Removes an object by identity from a specific level array (e.g. L.sources,
// L.gates, L.decorations). Remembers its original index so undo restores
// z-order. Returns null if the object isn't in the array.
//
// This is the ONE action type that handles removal for every gameplay object
// kind. Prevents duplicated logic per kind and keeps the composite-delete
// path in clipboard.js uniform.
export function removeFromArray(arr, obj, label = 'remove_from_array') {
  if (!Array.isArray(arr)) return null;
  const idx = arr.indexOf(obj);
  if (idx < 0) return null;
  return {
    type: label,
    idx, obj,
    forward() {
      const i = arr.indexOf(obj);
      if (i >= 0) arr.splice(i, 1);
      notify();
    },
    inverse() { arr.splice(idx, 0, obj); notify(); },
  };
}

// Thin wrapper for the common decoration case. Existing callers keep working.
export function removeDecoration(dec) {
  const L = state.level;
  if (!L || !Array.isArray(L.decorations)) return null;
  return removeFromArray(L.decorations, dec, 'remove_decoration');
}

// ── MoveObjectAction (generic) ───────────────────────────────────────────
// Applies a delta (dx, dy) to ANY object with .x/.y fields. Works uniformly
// for: decorations, sources, gates, switches, checkpoints, enemies, and the
// level.playerStart sub-object. Multiple objects moving together get wrapped
// in a Composite so a single Ctrl+Z reverts the whole gesture.
export function moveObject(obj, dx, dy) {
  if (!obj || (dx === 0 && dy === 0)) return null;
  return {
    type: 'move_object',
    obj, dx, dy,
    forward() { obj.x += dx; obj.y += dy; notify(); },
    inverse() { obj.x -= dx; obj.y -= dy; notify(); },
  };
}

// Legacy alias. Deprecated — use moveObject.
export function moveDecoration(dec, dx, dy) { return moveObject(dec, dx, dy); }
