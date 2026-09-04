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
// Silent no-op if the tile is out of bounds — call sites can pre-check.
export function setTile(col, row, newVal) {
  const L = state.level;
  if (!L) return null;
  const rows = levelRows();
  if (col < 0 || col >= L.cols || row < 0 || row >= rows) return null;
  const idx = row * L.cols + col;
  const oldVal = L.tiles[idx];
  if (oldVal === newVal) return null;   // no change, don't record
  return {
    type: 'set_tile',
    col, row, oldVal, newVal,
    forward() { L.tiles[idx] = newVal; notify(); },
    inverse() { L.tiles[idx] = oldVal; notify(); },
  };
}

// ── AddDecorationAction ──────────────────────────────────────────────────
// Appends `dec` to level.decorations at the end.
// Inverse: pop that exact entry (identity match).
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

// ── RemoveDecorationAction ───────────────────────────────────────────────
// Removes an existing decoration by identity. Remembers its position in the
// array so undo restores original z-order.
export function removeDecoration(dec) {
  const L = state.level;
  if (!L || !Array.isArray(L.decorations)) return null;
  const idx = L.decorations.indexOf(dec);
  if (idx < 0) return null;
  return {
    type: 'remove_decoration',
    dec, idx,
    forward() {
      const i = L.decorations.indexOf(dec);
      if (i >= 0) L.decorations.splice(i, 1);
      notify();
    },
    inverse() { L.decorations.splice(idx, 0, dec); notify(); },
  };
}

// ── MoveDecorationAction ─────────────────────────────────────────────────
// Applies a delta (dx, dy) to a decoration's x/y. Undo applies the inverse
// delta. Multiple decorations moving together get wrapped in a composite.
export function moveDecoration(dec, dx, dy) {
  if (!dec || (dx === 0 && dy === 0)) return null;
  return {
    type: 'move_decoration',
    dec, dx, dy,
    forward() { dec.x += dx; dec.y += dy; notify(); },
    inverse() { dec.x -= dx; dec.y -= dy; notify(); },
  };
}
