// state.js — single source of truth for the editor.
// Pure data + subscribe/notify. No DOM, no rendering, no fetch.
// Rendering/UI modules read state and subscribe to notify() to redraw.
// Tools mutate state via the setters below (or via direct level mutation).

export const TILE_SIZE = 32;

export const state = {
  // Loaded data
  manifest:     null,   // full asset manifest json (see MANIFEST.md)
  level:        null,   // active level json (see SCHEMA.md)
  levelPath:    null,   // where the current level came from (for save-later)

  // Selection / current tool
  selectedAsset: null,  // manifest item currently chosen for placement
  selectedTile:  1,     // integer tile-type to place with terrain brush (1=solid)
  tool:          'place', // 'place' | 'erase' | 'pan'

  // Viewport
  camera: { x: 0, y: 0, zoom: 1 },   // world→screen offset & scale

  // Filters
  filter: { category: 'all', search: '' },

  // UI toggles
  showGrid: true,
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { for (const fn of listeners) fn(); }

// ── Data loading ─────────────────────────────────────────────────────────
// The editor consumes the CURATED semantic manifest at assets/ASSET_MANIFEST.json
// (owned by Aki). The raw filesystem index at assets/asset_index.json exists
// for discovery/tooling but is NOT the level-building browser source.
//
// ASSET_MANIFEST.json shape:  { _schema, _note, assets: [ { id, path, category,
// tags, frame_width, frame_height, frame_count?, fps?, directions?, loop?, notes? } ] }
//
// We normalize each entry into a common { path, name, category, width, height,
// tags, isAnimation, raw } shape so downstream UI/tools use one field set.
export async function loadManifest(url = 'assets/ASSET_MANIFEST.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error('manifest fetch failed: ' + res.status);
  const raw = await res.json();
  const source = Array.isArray(raw.assets) ? raw.assets : (Array.isArray(raw.items) ? raw.items : []);
  const items = source.map(a => {
    const path = a.path || '';
    const isAnimation = path.indexOf('{') >= 0;    // {dir}, {n} placeholders
    return {
      id:          a.id || path,
      path:        path,
      name:        a.id || (a.name || path.split('/').pop().replace(/\.png$/i, '')),
      category:    a.category || 'other',
      width:       a.frame_width  || a.width  || 32,
      height:      a.frame_height || a.height || 32,
      tags:        a.tags || [],
      isAnimation: isAnimation,
      raw:         a,
    };
  });
  state.manifest = { source: raw, items, count: items.length };
  notify();
  return state.manifest;
}

export async function loadLevel(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('level fetch failed: ' + url + ' → ' + res.status);
  state.level = await res.json();
  state.levelPath = url;
  // Reset camera to level origin
  state.camera.x = 0;
  state.camera.y = 0;
  notify();
  return state.level;
}

// ── Derived helpers ──────────────────────────────────────────────────────
// Row count is inferred from tiles.length / cols. Keeps level flexible.
export function levelRows() {
  const L = state.level;
  return L ? Math.floor(L.tiles.length / L.cols) : 0;
}
export function levelPixelWidth()  { return state.level ? state.level.cols * TILE_SIZE : 0; }
export function levelPixelHeight() { return levelRows() * TILE_SIZE; }

// Extract unique categories from the loaded manifest — DO NOT hard-code.
export function manifestCategories() {
  if (!state.manifest) return [];
  const set = new Set();
  for (const it of state.manifest.items) set.add(it.category);
  return [...set].sort();
}

// Filter manifest by current filter state.
export function filteredManifestItems() {
  if (!state.manifest) return [];
  const { category, search } = state.filter;
  const q = search.trim().toLowerCase();
  return state.manifest.items.filter(it => {
    if (category !== 'all' && it.category !== category) return false;
    if (q && it.name.toLowerCase().indexOf(q) < 0 && it.path.toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

// ── Setters (call notify() automatically) ────────────────────────────────
export function setTool(t)              { state.tool = t; notify(); }
export function setSelectedAsset(item)  { state.selectedAsset = item; notify(); }
export function setSelectedTile(n)      { state.selectedTile = n; notify(); }
export function setFilterCategory(c)    { state.filter.category = c; notify(); }
export function setFilterSearch(s)      { state.filter.search = s; notify(); }
export function setShowGrid(v)          { state.showGrid = v; notify(); }

// Camera helpers
export function panCamera(dxScreen, dyScreen) {
  state.camera.x -= dxScreen / state.camera.zoom;
  state.camera.y -= dyScreen / state.camera.zoom;
  notify();
}
export function zoomCamera(factor, anchorScreenX, anchorScreenY) {
  // Zoom toward the mouse position: world point under cursor stays under cursor.
  const c = state.camera;
  const worldX = c.x + anchorScreenX / c.zoom;
  const worldY = c.y + anchorScreenY / c.zoom;
  c.zoom = Math.max(0.25, Math.min(4, c.zoom * factor));
  c.x = worldX - anchorScreenX / c.zoom;
  c.y = worldY - anchorScreenY / c.zoom;
  notify();
}
export function resetZoom() { state.camera.zoom = 1; notify(); }

// Coordinate conversion — the ONLY place these live.
export function screenToWorld(sx, sy) {
  const c = state.camera;
  return { x: c.x + sx / c.zoom, y: c.y + sy / c.zoom };
}
export function worldToScreen(wx, wy) {
  const c = state.camera;
  return { x: (wx - c.x) * c.zoom, y: (wy - c.y) * c.zoom };
}

// Snap a world coordinate to the tile grid. Returns tile column/row.
export function worldToTile(wx, wy) {
  return { col: Math.floor(wx / TILE_SIZE), row: Math.floor(wy / TILE_SIZE) };
}

// Get / set a tile in the loaded level. Silent no-op if out of bounds.
export function getTile(col, row) {
  const L = state.level;
  if (!L) return 0;
  if (col < 0 || col >= L.cols || row < 0 || row >= levelRows()) return 0;
  return L.tiles[row * L.cols + col];
}
export function setTile(col, row, value) {
  const L = state.level;
  if (!L) return false;
  if (col < 0 || col >= L.cols || row < 0 || row >= levelRows()) return false;
  const idx = row * L.cols + col;
  if (L.tiles[idx] === value) return false;
  L.tiles[idx] = value;
  notify();
  return true;
}

// Append a decoration to the current level. Silently no-ops if level has no
// decorations array or nothing loaded. Returns the appended entry.
export function addDecoration(entry) {
  const L = state.level;
  if (!L) return null;
  if (!Array.isArray(L.decorations)) L.decorations = [];
  L.decorations.push(entry);
  notify();
  return entry;
}
