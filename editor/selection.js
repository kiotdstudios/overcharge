// selection.js — tracks what is currently selected in the editor.
//
// Two kinds of selection can coexist:
//   • decorations: Set<Object>  — identity references into level.decorations[]
//   • tiles:       Set<string>  — grid cells as "col,row" strings
//
// Rendering (renderer.js) reads this and draws yellow outlines.
// Tools (select tool, delete, copy/paste) read and write this.
// Selection is transient (not saved with level). Cleared on level load.

import { state, notify, TILE_SIZE, levelRows } from './state.js';

// Extend state.selection lazily — state.js doesn't need to know these fields.
if (!state.selection) {
  state.selection = { decorations: new Set(), tiles: new Set() };
  state.clipboard  = null;   // { decorations: [], tiles: [{col,row,val}], anchor: {x,y} }
}

// ── Read helpers ─────────────────────────────────────────────────────────
export function selectedDecorations() { return [...state.selection.decorations]; }
export function selectedTiles()       { return [...state.selection.tiles].map(k => { const [c,r] = k.split(',').map(Number); return { col: c, row: r }; }); }
export function isSelected(dec)       { return state.selection.decorations.has(dec); }
export function isTileSelected(c, r)  { return state.selection.tiles.has(c + ',' + r); }
export function hasSelection()        { return state.selection.decorations.size > 0 || state.selection.tiles.size > 0; }
export function selectionCount()      { return state.selection.decorations.size + state.selection.tiles.size; }

// ── Mutation ─────────────────────────────────────────────────────────────
export function clearSelection() {
  state.selection.decorations.clear();
  state.selection.tiles.clear();
  notify();
}

export function selectDecoration(dec, additive = false) {
  if (!additive) { state.selection.decorations.clear(); state.selection.tiles.clear(); }
  state.selection.decorations.add(dec);
  notify();
}

export function deselectDecoration(dec) {
  state.selection.decorations.delete(dec);
  notify();
}

export function toggleDecoration(dec) {
  if (state.selection.decorations.has(dec)) state.selection.decorations.delete(dec);
  else state.selection.decorations.add(dec);
  notify();
}

export function selectTile(col, row, additive = false) {
  if (!additive) { state.selection.decorations.clear(); state.selection.tiles.clear(); }
  state.selection.tiles.add(col + ',' + row);
  notify();
}

export function deselectTile(col, row) {
  state.selection.tiles.delete(col + ',' + row);
  notify();
}

export function toggleTile(col, row) {
  const key = col + ',' + row;
  if (state.selection.tiles.has(key)) state.selection.tiles.delete(key);
  else state.selection.tiles.add(key);
  notify();
}

// ── Hit-testing ──────────────────────────────────────────────────────────
// Find topmost decoration at a world coord. Latest in array wins (drawn last).
export function decorationAt(worldX, worldY) {
  const L = state.level;
  if (!L || !Array.isArray(L.decorations)) return null;
  for (let i = L.decorations.length - 1; i >= 0; i--) {
    const d = L.decorations[i];
    if (worldX >= d.x && worldX < d.x + d.w && worldY >= d.y && worldY < d.y + d.h) return d;
  }
  return null;
}

// Return decorations whose bounding rect intersects the world-space rectangle.
export function decorationsInRect(x, y, w, h) {
  const L = state.level;
  if (!L || !Array.isArray(L.decorations)) return [];
  const x2 = x + w, y2 = y + h;
  const out = [];
  for (const d of L.decorations) {
    if (d.x + d.w > x && d.x < x2 && d.y + d.h > y && d.y < y2) out.push(d);
  }
  return out;
}

// Return tile cells (col,row) whose 32x32 rect intersects the world rect.
export function tilesInRect(x, y, w, h) {
  const L = state.level;
  if (!L) return [];
  const rows = levelRows();
  const c0 = Math.max(0, Math.floor(x / TILE_SIZE));
  const r0 = Math.max(0, Math.floor(y / TILE_SIZE));
  const c1 = Math.min(L.cols - 1, Math.floor((x + w - 1) / TILE_SIZE));
  const r1 = Math.min(rows - 1,  Math.floor((y + h - 1) / TILE_SIZE));
  const out = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (L.tiles[r * L.cols + c] !== 0) out.push({ col: c, row: r });   // only selects solid tiles
    }
  }
  return out;
}
