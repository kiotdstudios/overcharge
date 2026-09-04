// selection.js — tracks what is currently selected in the editor.
//
// Selection covers every kind of level content:
//   • decorations: Set<Object>   — identity references into level.decorations[]
//   • tiles:       Set<string>   — grid cells as "col,row" strings
//   • sources:     Set<Object>   — level.sources[]      (yellow "C" markers)
//   • gates:       Set<Object>   — level.gates[]        (cyan/magenta outlines)
//   • switches:    Set<Object>   — level.switches[]     (orange "S" markers)
//   • checkpoints: Set<Object>   — level.checkpoints[]  (green "CP" markers)
//   • enemies:     Set<Object>   — level.enemies[]      (red squares)
//   • playerStart: boolean       — the SPAWN triangle (0 or 1 instances per level)
//
// Rendering (renderer.js) reads this and draws yellow outlines on everything
// that's selected. Tools (select tool, delete, copy/paste) read and write it.
// Selection is transient (not saved with level). Cleared on level load.

import { state, notify, TILE_SIZE, levelRows, worldToScreen } from './state.js';

// Move-handle visual geometry (screen-space, constant across zoom).
export const MOVE_HANDLE_RADIUS = 6;   // dot radius in screen px (visual)
export const MOVE_HANDLE_HIT    = 10;  // click hit radius (visual + a little tolerance)
export const MOVE_HANDLE_OFFSET = 20;  // dot sits this far ABOVE the bbox top

// Extend state.selection lazily — state.js doesn't need to know these fields.
if (!state.selection) {
  state.selection = {
    decorations: new Set(),
    tiles:       new Set(),
    sources:     new Set(),
    gates:       new Set(),
    switches:    new Set(),
    checkpoints: new Set(),
    enemies:     new Set(),
    playerStart: false,
  };
  state.clipboard = null;
}

// Kinds that live in Sets (playerStart is a boolean, handled separately).
const SET_KINDS = ['decorations', 'sources', 'gates', 'switches', 'checkpoints', 'enemies'];

// ── Read helpers ─────────────────────────────────────────────────────────
export function selectedDecorations() { return [...state.selection.decorations]; }
export function selectedTiles()       { return [...state.selection.tiles].map(k => { const [c,r] = k.split(',').map(Number); return { col: c, row: r }; }); }
export function selectedSources()     { return [...state.selection.sources]; }
export function selectedGates()       { return [...state.selection.gates]; }
export function selectedSwitches()    { return [...state.selection.switches]; }
export function selectedCheckpoints() { return [...state.selection.checkpoints]; }
export function selectedEnemies()     { return [...state.selection.enemies]; }
export function isPlayerStartSelected() { return state.selection.playerStart; }

export function isSelected(dec)       { return state.selection.decorations.has(dec); }
export function isTileSelected(c, r)  { return state.selection.tiles.has(c + ',' + r); }

export function hasSelection() {
  const s = state.selection;
  if (s.playerStart) return true;
  if (s.tiles.size > 0) return true;
  for (const k of SET_KINDS) if (s[k].size > 0) return true;
  return false;
}
export function selectionCount() {
  const s = state.selection;
  let n = s.tiles.size + (s.playerStart ? 1 : 0);
  for (const k of SET_KINDS) n += s[k].size;
  return n;
}

// Return every selected level object grouped by kind. Used by delete + move.
// Skips playerStart from the list (returned via .playerStart flag).
export function selectedObjectsByKind() {
  const s = state.selection;
  return {
    decorations: selectedDecorations(),
    sources:     selectedSources(),
    gates:       selectedGates(),
    switches:    selectedSwitches(),
    checkpoints: selectedCheckpoints(),
    enemies:     selectedEnemies(),
    playerStart: s.playerStart ? state.level?.playerStart : null,
  };
}

// Flat list of every selectable {kind, ref} currently selected. Used by move.
export function selectedRefs() {
  const s = state.selection;
  const out = [];
  for (const d of s.decorations) out.push({ kind: 'decoration', ref: d });
  for (const o of s.sources)     out.push({ kind: 'source',     ref: o });
  for (const o of s.gates)       out.push({ kind: 'gate',       ref: o });
  for (const o of s.switches)    out.push({ kind: 'switch',     ref: o });
  for (const o of s.checkpoints) out.push({ kind: 'checkpoint', ref: o });
  for (const o of s.enemies)     out.push({ kind: 'enemy',      ref: o });
  if (s.playerStart && state.level?.playerStart) out.push({ kind: 'playerStart', ref: state.level.playerStart });
  return out;
}

// ── Mutation ─────────────────────────────────────────────────────────────
export function clearSelection() {
  const s = state.selection;
  s.decorations.clear();
  s.tiles.clear();
  s.sources.clear();
  s.gates.clear();
  s.switches.clear();
  s.checkpoints.clear();
  s.enemies.clear();
  s.playerStart = false;
  notify();
}

// Generic dispatcher: select an object of any kind. If additive is false,
// clears the whole selection first. If true, adds without disturbing others.
export function selectByKind(kind, ref, additive = false) {
  if (!additive) clearSelection();
  const s = state.selection;
  if (kind === 'playerStart') { s.playerStart = true; }
  else if (kind === 'decoration') s.decorations.add(ref);
  else if (kind === 'source')     s.sources.add(ref);
  else if (kind === 'gate')       s.gates.add(ref);
  else if (kind === 'switch')     s.switches.add(ref);
  else if (kind === 'checkpoint') s.checkpoints.add(ref);
  else if (kind === 'enemy')      s.enemies.add(ref);
  else if (kind === 'tile')       s.tiles.add(ref);   // ref is "col,row"
  else return;
  notify();
}

export function toggleByKind(kind, ref) {
  const s = state.selection;
  if (kind === 'playerStart') { s.playerStart = !s.playerStart; }
  else if (kind === 'decoration') s.decorations.has(ref) ? s.decorations.delete(ref) : s.decorations.add(ref);
  else if (kind === 'source')     s.sources.has(ref)     ? s.sources.delete(ref)     : s.sources.add(ref);
  else if (kind === 'gate')       s.gates.has(ref)       ? s.gates.delete(ref)       : s.gates.add(ref);
  else if (kind === 'switch')     s.switches.has(ref)    ? s.switches.delete(ref)    : s.switches.add(ref);
  else if (kind === 'checkpoint') s.checkpoints.has(ref) ? s.checkpoints.delete(ref) : s.checkpoints.add(ref);
  else if (kind === 'enemy')      s.enemies.has(ref)     ? s.enemies.delete(ref)     : s.enemies.add(ref);
  else return;
  notify();
}

// Convenience: check membership by kind
export function isRefSelected(kind, ref) {
  const s = state.selection;
  if (kind === 'playerStart') return s.playerStart;
  if (kind === 'decoration') return s.decorations.has(ref);
  if (kind === 'source')     return s.sources.has(ref);
  if (kind === 'gate')       return s.gates.has(ref);
  if (kind === 'switch')     return s.switches.has(ref);
  if (kind === 'checkpoint') return s.checkpoints.has(ref);
  if (kind === 'enemy')      return s.enemies.has(ref);
  return false;
}

// Legacy sugar (kept so tools.js's existing calls still work while callers
// migrate to selectByKind).
export function selectDecoration(dec, additive = false)  { selectByKind('decoration', dec, additive); }
export function toggleDecoration(dec)                    { toggleByKind('decoration', dec); }
export function deselectDecoration(dec)                  { state.selection.decorations.delete(dec); notify(); }
export function selectTile(col, row, additive = false)   { selectByKind('tile', col + ',' + row, additive); }
export function deselectTile(col, row)                   { state.selection.tiles.delete(col + ',' + row); notify(); }
export function toggleTile(col, row)                     { const k = col + ',' + row; state.selection.tiles.has(k) ? state.selection.tiles.delete(k) : state.selection.tiles.add(k); notify(); }

// ── Hit-testing ──────────────────────────────────────────────────────────
// Hit boxes match the on-screen MARKER footprint (what the user sees and
// clicks), not the runtime collision hitbox. Coordinates are world-space.

// Returns bounding rect { x, y, w, h } for a given {kind, ref}.
export function boundingRect(kind, ref) {
  if (!ref) return null;
  if (kind === 'decoration') return { x: ref.x, y: ref.y, w: ref.w, h: ref.h };
  if (kind === 'gate')       return { x: ref.x, y: ref.y, w: ref.w, h: ref.h };
  // Markers are drawn as centered squares at (x, y) — hit box mirrors that.
  if (kind === 'source')     return { x: ref.x - 7, y: ref.y - 7, w: 14, h: 14 };
  if (kind === 'switch')     return { x: ref.x - 7, y: ref.y - 7, w: 14, h: 14 };
  if (kind === 'checkpoint') return { x: ref.x - 7, y: ref.y - 7, w: 14, h: 14 };
  if (kind === 'enemy')      return { x: ref.x - 6, y: ref.y - 6, w: 12, h: 12 };
  // SPAWN triangle points right — 14x14 rect from (x, y).
  if (kind === 'playerStart') return { x: ref.x, y: ref.y, w: 14, h: 14 };
  return null;
}

// Find topmost selectable object at a world coord. Search order:
// playerStart → gameplay markers (sources/gates/switches/checkpoints/enemies) →
// decorations (last so they don't cover gameplay markers).
// Returns { kind, ref } or null.
export function objectAt(worldX, worldY) {
  const L = state.level;
  if (!L) return null;

  // playerStart — highest priority (it's a single object; if clicked, don't fall through)
  const psRect = boundingRect('playerStart', L.playerStart);
  if (L.playerStart && psRect && _hits(psRect, worldX, worldY)) return { kind: 'playerStart', ref: L.playerStart };

  // Gameplay markers next
  for (const [kind, arr] of [
    ['source',     L.sources     || []],
    ['gate',       L.gates       || []],
    ['switch',     L.switches    || []],
    ['checkpoint', L.checkpoints || []],
    ['enemy',      L.enemies     || []],
  ]) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const rect = boundingRect(kind, arr[i]);
      if (rect && _hits(rect, worldX, worldY)) return { kind, ref: arr[i] };
    }
  }

  // Decorations last (bottom of z-order for hit-testing so gameplay markers win)
  if (Array.isArray(L.decorations)) {
    for (let i = L.decorations.length - 1; i >= 0; i--) {
      const d = L.decorations[i];
      if (worldX >= d.x && worldX < d.x + d.w && worldY >= d.y && worldY < d.y + d.h) {
        return { kind: 'decoration', ref: d };
      }
    }
  }
  return null;
}
function _hits(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }

// Legacy: kept for backcompat with clipboard.js paste-select. Deprecated.
export function decorationAt(worldX, worldY) {
  const hit = objectAt(worldX, worldY);
  return hit && hit.kind === 'decoration' ? hit.ref : null;
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

// Return tile cells whose 32x32 rect intersects the world rect (solid only).
export function tilesInRect(x, y, w, h) {
  const L = state.level;
  if (!L) return [];
  const rows = levelRows();
  const c0 = Math.max(0, Math.floor(x / TILE_SIZE));
  const r0 = Math.max(0, Math.floor(y / TILE_SIZE));
  const c1 = Math.min(L.cols - 1, Math.floor((x + w - 1) / TILE_SIZE));
  const r1 = Math.min(rows - 1,   Math.floor((y + h - 1) / TILE_SIZE));
  const out = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (L.tiles[r * L.cols + c] !== 0) out.push({ col: c, row: r });
    }
  }
  return out;
}

// Return all gameplay-marker refs whose bounding rect intersects the world rect.
// Grouped by kind for use by marquee.
export function objectsInRect(x, y, w, h) {
  const L = state.level;
  if (!L) return {};
  const out = { sources: [], gates: [], switches: [], checkpoints: [], enemies: [], playerStart: false };
  const check = (kind, ref) => {
    const r = boundingRect(kind, ref);
    return r && r.x + r.w > x && r.x < x + w && r.y + r.h > y && r.y < y + h;
  };
  for (const o of L.sources     || []) if (check('source',     o)) out.sources.push(o);
  for (const o of L.gates       || []) if (check('gate',       o)) out.gates.push(o);
  for (const o of L.switches    || []) if (check('switch',     o)) out.switches.push(o);
  for (const o of L.checkpoints || []) if (check('checkpoint', o)) out.checkpoints.push(o);
  for (const o of L.enemies     || []) if (check('enemy',      o)) out.enemies.push(o);
  if (L.playerStart && check('playerStart', L.playerStart)) out.playerStart = true;
  return out;
}

// ── Move handle ──────────────────────────────────────────────────────────
// A visible dot-handle sits above the top-center of the current selection's
// bounding box. Only rendered when at least one MOVABLE ref is selected
// (tiles alone don't get a handle — tiles aren't currently movable). Multi-
// selection produces ONE handle at the union bbox. Constant screen size
// across zoom because computed in screen space at render time.

// World-space bounding box of every currently-selected movable ref. Excludes
// tiles (they'd need column/row math and aren't drag-movable today). Returns
// { x, y, w, h } in world coords or null when there's nothing movable selected.
export function selectedBoundingBox() {
  const refs = selectedRefs();
  if (refs.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { kind, ref } of refs) {
    const r = boundingRect(kind, ref);
    if (!r) continue;
    if (r.x         < minX) minX = r.x;
    if (r.y         < minY) minY = r.y;
    if (r.x + r.w   > maxX) maxX = r.x + r.w;
    if (r.y + r.h   > maxY) maxY = r.y + r.h;
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Screen-space position of the move handle dot. Returns { sx, sy, r } or null.
// The `r` returned is the VISUAL radius; use MOVE_HANDLE_HIT for click testing.
// Because everything is computed in screen space, the handle size does not
// scale with camera zoom — which is exactly what Chief asked for.
export function moveHandleScreen() {
  const bb = selectedBoundingBox();
  if (!bb) return null;
  const topCenterWorldX = bb.x + bb.w / 2;
  const topCenterWorldY = bb.y;
  const p = worldToScreen(topCenterWorldX, topCenterWorldY);
  return { sx: p.x, sy: p.y - MOVE_HANDLE_OFFSET, r: MOVE_HANDLE_RADIUS };
}

// Test whether a canvas-local (sx, sy) hits the current move handle.
export function moveHandleContains(sx, sy) {
  const h = moveHandleScreen();
  if (!h) return false;
  const dx = sx - h.sx, dy = sy - h.sy;
  return (dx * dx + dy * dy) <= (MOVE_HANDLE_HIT * MOVE_HANDLE_HIT);
}
