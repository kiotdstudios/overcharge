// state.js — single source of truth for the editor.
// Pure data + subscribe/notify. No DOM, no rendering, no fetch.
// Rendering/UI modules read state and subscribe to notify() to redraw.
// Tools mutate state via the setters below (or via direct level mutation).

export const TILE_SIZE = 32;

// ── Snap resolution constants ────────────────────────────────────────────
// Terrain always snaps to TILE_SIZE (the game construction grid).
//
// Non-terrain decorations default to 1px so arbitrary-native-dimension art
// (e.g. a 26px brick) can sit flush against neighbors — a 16px snap CANNOT
// achieve edge-to-edge placement for widths that are not multiples of 16.
// Assets in the manifest may explicitly opt into a coarser grid via `snap`.
//
// Gameplay markers (sources, gates, switches, checkpoints, enemies,
// playerStart) use their own default — currently 16 — as a middle ground:
// finer than terrain, coarser than free-pixel decorations. Adjustable later.
export const SNAP_TERRAIN            = TILE_SIZE;   // 32 - do not change

// ── Terrain tile encoding ────────────────────────────────────────────────
// The tile grid stores an integer per cell. Values:
//   0                       empty (non-solid)
//   1                       LEGACY solid — renders as TILE_ID_REGISTRY[10] (default)
//   2                       one-way platform (not solid for regular collision)
//   >= 10                   solid, ID looks up TILE_ID_REGISTRY (Chief-chosen)
//
// TILE ID REGISTRY (PERMANENT BINDING — CHIEF-LOCKED):
//   Once an ID is assigned to an asset, it is stable FOREVER. New tile
//   variants ALWAYS append a NEW ID. Never renumber. Never derive from
//   manifest sort order or array position. Old saved levels remain valid
//   even if a new alphabetically-earlier tile asset is added later.
export const TILE_ID_REGISTRY = Object.freeze({
  10: 'env_tile_dark_a',
  11: 'env_tile_dark_b',
  12: 'env_tile_purple_a',
  13: 'env_tile_purple_b',
});
// Reverse map (asset id → tile value). Computed once at module load.
const _TILE_REV_REGISTRY = Object.freeze(
  Object.fromEntries(Object.entries(TILE_ID_REGISTRY).map(([v, id]) => [id, Number(v)]))
);
// Ordered list of {value, id} in registry order — for UI iteration only,
// NEVER for save decoding.
export const TILE_REGISTRY_ORDER = Object.freeze(
  Object.entries(TILE_ID_REGISTRY)
    .map(([v, id]) => ({ value: Number(v), id }))
    .sort((a, b) => a.value - b.value)
);
// The default tile ID for legacy value 1 and for unregistered fallbacks.
export const TILE_DEFAULT_ID = 'env_tile_dark_a';

export const TILE_VARIANT_BASE = 10;
export function tileIsSolid(v) { return v === 1 || v >= TILE_VARIANT_BASE; }

// Returns the asset id for a stored tile value, or null if not solid.
// Value 1 → default id. Value >= 10 → registry lookup. Unknown registry
// value falls back to default id so a corrupt/unknown value still renders.
export function tileAssetIdFor(v) {
  if (v === 1) return TILE_DEFAULT_ID;
  if (v >= TILE_VARIANT_BASE) return TILE_ID_REGISTRY[v] || TILE_DEFAULT_ID;
  return null;
}
// Returns the stored tile value for a given asset id, or -1 if unknown.
export function tileValueForAssetId(id) {
  if (!id) return -1;
  const v = _TILE_REV_REGISTRY[id];
  return v === undefined ? -1 : v;
}
// Legacy compat: some call sites still expect a 0-based art index. Keep it
// working by mapping registry value → position in TILE_REGISTRY_ORDER.
export function tileArtIndex(v) {
  const id = tileAssetIdFor(v);
  if (!id) return -1;
  const idx = TILE_REGISTRY_ORDER.findIndex(e => e.id === id);
  return idx < 0 ? 0 : idx;
}
export function tileValueForVariant(idx) {
  const e = TILE_REGISTRY_ORDER[idx];
  return e ? e.value : TILE_VARIANT_BASE;
}
// Manifest-derived listing kept only for editor UI (asset browser filter etc.);
// NOT used for save-value decoding. Returns manifest tile assets in registry
// order, unregistered tiles append at the end.
export function terrainArtOrder() {
  const m = state.manifest;
  if (!m || !Array.isArray(m.items)) return [];
  const byId = new Map();
  for (const it of m.items) {
    if (it && it.category === 'tile' && !it.isAnimation) byId.set(it.id, it);
  }
  const ordered = [];
  for (const e of TILE_REGISTRY_ORDER) if (byId.has(e.id)) { ordered.push(byId.get(e.id)); byId.delete(e.id); }
  for (const it of byId.values()) ordered.push(it);
  return ordered;
}
// Editor's Place tool uses this: asset id → stored tile value.
export function tileVariantForAssetId(id) {
  const v = tileValueForAssetId(id);
  return v < 0 ? -1 : v - TILE_VARIANT_BASE;   // return the OFFSET, caller adds BASE
}
export const SNAP_DECORATION_DEFAULT = 1;           // freeform pixel placement
export const SNAP_GAMEPLAY_DEFAULT   = 16;          // spawn/source/gate/switch/checkpoint/enemy

// Quantize a single world coordinate down to the nearest `snap`-aligned point.
// Used at placement time (defines the object's origin).
export function snapPoint(x, y, snap) {
  return {
    x: Math.floor(x / snap) * snap,
    y: Math.floor(y / snap) * snap,
  };
}

// Quantize a movement DELTA (dx, dy). Used during drag-move so relative
// spacing across a group is preserved (one delta, applied to everyone).
export function snapDelta(dx, dy, snap) {
  return {
    dx: Math.round(dx / snap) * snap,
    dy: Math.round(dy / snap) * snap,
  };
}

// Determine snap resolution for a given ref (a level object). Kind is one of:
// 'decoration' | 'source' | 'gate' | 'switch' | 'checkpoint' | 'enemy' |
// 'playerStart' | 'tile'. Decorations may carry an explicit `snap` field
// stored at placement time; older decorations without it fall through to
// SNAP_DECORATION_DEFAULT.
export function snapForRef(kind, ref) {
  if (kind === 'tile') return SNAP_TERRAIN;
  if (kind === 'decoration' && ref && typeof ref.snap === 'number') return ref.snap;
  if (kind === 'decoration') return SNAP_DECORATION_DEFAULT;
  // sources, gates, switches, checkpoints, enemies, playerStart
  return SNAP_GAMEPLAY_DEFAULT;
}

// ── Group-move delta snap ────────────────────────────────────────────────
// A group-move delta is valid only if it is a valid delta for EVERY member.
// The set of valid deltas for one member with snap S is {n·S : n ∈ Z}.
// The intersection of {n·A} and {n·B} is {n·LCM(A,B)}. So the group's
// required delta increment is the LCM of all members' snaps.
//
// In our value space this reduces to the MAX when the finer snap divides the
// coarser (16 divides 32; 1 divides everything), which is the common case:
//   • terrain(32) + deco(16)  → LCM(32,16) = 32
//   • terrain(32) + deco(1)   → LCM(32, 1) = 32
//   • deco(16)   + deco(1)   → LCM(16, 1) = 16
//   • deco(1)    + deco(1)   → LCM( 1, 1) =  1   (freeform)
// This is Chief's "most restrictive compatible movement increment".
function _gcd(a, b) { a = Math.abs(a|0); b = Math.abs(b|0); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function _lcm(a, b) { return Math.abs((a * b) / _gcd(a, b)); }
export function groupSnap(refs) {
  if (!refs || refs.length === 0) return SNAP_DECORATION_DEFAULT;
  let acc = 1;
  for (const { kind, ref } of refs) acc = _lcm(acc, snapForRef(kind, ref));
  return acc || SNAP_DECORATION_DEFAULT;
}

// LCM of a numeric list. Callers that already have snap values (e.g. clipboard
// enumerating clipped items' preserved snaps) use this directly.
export function lcmSnap(values) {
  if (!values || values.length === 0) return SNAP_DECORATION_DEFAULT;
  let acc = 1;
  for (const v of values) if (v > 0) acc = _lcm(acc, v);
  return acc || SNAP_DECORATION_DEFAULT;
}

// Snap resolution to USE at placement time for a manifest asset. Terrain
// categories always 32; anything else takes asset.snap or the decoration
// default. Kept alongside the other helpers so callers only import one place.
export function snapForAsset(asset) {
  if (!asset) return SNAP_DECORATION_DEFAULT;
  const cat = asset.category;
  if (cat === 'tile' || cat === 'terrain' || cat === 'tileset') return SNAP_TERRAIN;
  return (typeof asset.snap === 'number') ? asset.snap : SNAP_DECORATION_DEFAULT;
}

// Resolve the pixel dimensions a decoration should occupy when placed.
// Priority: manifest width/height → cached image.naturalWidth/Height → TILE_SIZE.
// `cachedImg` is the shared preloaded HTMLImageElement (see imgCache below).
export function decoDimensions(asset, cachedImg) {
  const w = (asset && typeof asset.width  === 'number' && asset.width  > 0) ? asset.width
          : (cachedImg && cachedImg.complete && cachedImg.naturalWidth  > 0) ? cachedImg.naturalWidth
          : TILE_SIZE;
  const h = (asset && typeof asset.height === 'number' && asset.height > 0) ? asset.height
          : (cachedImg && cachedImg.complete && cachedImg.naturalHeight > 0) ? cachedImg.naturalHeight
          : TILE_SIZE;
  return { w, h };
}

// ── Shared image cache ───────────────────────────────────────────────────
// Both placeTool (dimension resolution) and renderer.js (drawing) share this
// so a decoration's natural dimensions are known at placement even when the
// user has never seen its thumbnail — provided we preloaded at manifest load.
const _imgCache = new Map();
export function getCachedImage(path) {
  let img = _imgCache.get(path);
  if (!img) {
    img = new Image();
    img.src = path;
    _imgCache.set(path, img);
  }
  return img;
}
// Preload every non-animated asset path from the manifest. Returns a promise
// that resolves when all images have finished loading (success or error).
// Called from bootstrap right after loadManifest so placement is deterministic.
export function preloadManifestImages() {
  if (!state.manifest || !Array.isArray(state.manifest.items)) return Promise.resolve();
  const paths = state.manifest.items
    .filter(it => it && it.path && !it.isAnimation)
    .map(it => it.path);
  return Promise.all(paths.map(p => new Promise(resolve => {
    const img = getCachedImage(p);
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.addEventListener('load',  () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  })));
}

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

  // ── Level workflow / persistence ─────────────────────────────────────
  dirty:           false,   // true when unsaved changes exist since load/save
  lastSavedAt:     null,    // Date.now() timestamp of last successful save
  availableLevels: [],      // populated by persistence.discoverLevels() at boot
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
  // Reset camera to level origin, clear dirty flag (fresh load = clean)
  state.camera.x = 0;
  state.camera.y = 0;
  state.dirty = false;
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
