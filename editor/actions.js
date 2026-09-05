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

// ── ReorderDecorationsAction ─────────────────────────────────────────────
// Move a set of decorations to new positions in L.decorations. Renderer
// iterates decorations in array order → later index draws on top.
//   'bring-forward'  → each selected shifts +1 index
//   'send-backward'  → each selected shifts −1 index
//   'bring-to-front' → all selected move to array end
//   'send-to-back'   → all selected move to array start
// Records the full prior array so undo is O(1) and always exact.
export function reorderDecorations(decs, op) {
  const L = state.level;
  if (!L || !Array.isArray(L.decorations) || !decs || decs.length === 0) return null;
  const arr = L.decorations;
  const prior = arr.slice();
  const next  = _applyReorder(arr, decs, op);
  if (!next) return null;
  let same = next.length === prior.length;
  if (same) for (let i = 0; i < next.length; i++) if (next[i] !== prior[i]) { same = false; break; }
  if (same) return null;    // no-op — already at edge
  return {
    type: 'reorder_decorations',
    forward() { L.decorations.length = 0; for (const d of next)  L.decorations.push(d); notify(); },
    inverse() { L.decorations.length = 0; for (const d of prior) L.decorations.push(d); notify(); },
  };
}

function _applyReorder(arr, decs, op) {
  const selected = new Set(decs);
  const selectedInOrder = arr.filter(d => selected.has(d));
  const unselected      = arr.filter(d => !selected.has(d));
  if (op === 'bring-to-front') return [...unselected, ...selectedInOrder];
  if (op === 'send-to-back')   return [...selectedInOrder, ...unselected];
  if (op === 'bring-forward') {
    // End → start pass, swap each selected with the unselected sibling above.
    const out = arr.slice();
    for (let i = out.length - 2; i >= 0; i--) {
      if (selected.has(out[i]) && !selected.has(out[i + 1])) {
        [out[i], out[i + 1]] = [out[i + 1], out[i]];
      }
    }
    return out;
  }
  if (op === 'send-backward') {
    const out = arr.slice();
    for (let i = 1; i < out.length; i++) {
      if (selected.has(out[i]) && !selected.has(out[i - 1])) {
        [out[i], out[i - 1]] = [out[i - 1], out[i]];
      }
    }
    return out;
  }
  return null;
}

// ── RotateDecorationsAction ──────────────────────────────────────────────
// Rotate each selected decoration by `delta` degrees clockwise (default 90).
// Rotation is stored on the decoration as .rotation (0/90/180/270). To keep
// hit-testing simple, when a rotation transitions between horizontal (0/180)
// and vertical (90/270) orientations we SWAP dec.w and dec.h so the stored
// bbox always matches the visual bbox. Center is preserved. Renderer looks
// at .rotation to rotate the sprite around the bbox center.
//
// Tiles/gameplay markers are not rotated by this action (they lack a
// meaningful rotation semantic in the current schema).
export function rotateDecorations(decs, delta = 90) {
  if (!decs || decs.length === 0) return null;
  const before = decs.map(d => ({
    ref: d,
    rotation: d.rotation || 0,
    x: d.x, y: d.y, w: d.w, h: d.h,
  }));
  const after = before.map(p => {
    const newRot = (((p.rotation + delta) % 360) + 360) % 360;
    const wasHoriz = (p.rotation % 180) === 0;
    const isHoriz  = (newRot   % 180) === 0;
    let w = p.w, h = p.h, x = p.x, y = p.y;
    if (wasHoriz !== isHoriz) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      w = p.h;
      h = p.w;
      x = Math.round(cx - w / 2);
      y = Math.round(cy - h / 2);
    }
    return { ref: p.ref, rotation: newRot, x, y, w, h };
  });
  return {
    type: 'rotate_decorations',
    forward() {
      for (const a of after) {
        const d = a.ref;
        d.rotation = a.rotation;
        d.x = a.x; d.y = a.y; d.w = a.w; d.h = a.h;
      }
      notify();
    },
    inverse() {
      for (const b of before) {
        const d = b.ref;
        d.rotation = b.rotation || 0;
        d.x = b.x; d.y = b.y; d.w = b.w; d.h = b.h;
      }
      notify();
    },
  };
}

// ── RotateTilesAction ────────────────────────────────────────────────────
// Rotate each selected tile cell by `delta` degrees clockwise (default 90).
// Rotation is stored in L.tileRotations (parallel to L.tiles). Missing array
// = all zeros. Only cells that actually contain a solid tile are rotated
// (rotating an empty cell is a no-op). Purely visual — collision unchanged.
export function rotateTiles(cells, delta = 90) {
  const L = state.level;
  if (!L || !cells || cells.length === 0) return null;
  const rows = levelRows();
  if (!Array.isArray(L.tileRotations) || L.tileRotations.length !== L.tiles.length) {
    L.tileRotations = new Array(L.tiles.length).fill(0);
  }
  const changes = [];
  for (const { col, row } of cells) {
    if (col < 0 || col >= L.cols || row < 0 || row >= rows) continue;
    const idx = row * L.cols + col;
    const v = L.tiles[idx];
    if (v === 0) continue;
    const prior = L.tileRotations[idx] || 0;
    const next  = (((prior + delta) % 360) + 360) % 360;
    if (next === prior) continue;
    changes.push({ idx, prior, next });
  }
  if (changes.length === 0) return null;
  return {
    type: 'rotate_tiles',
    forward() {
      for (const c of changes) L.tileRotations[c.idx] = c.next;
      notify();
    },
    inverse() {
      for (const c of changes) L.tileRotations[c.idx] = c.prior;
      notify();
    },
  };
}
