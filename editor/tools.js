// tools.js — modular tool implementations.
// Each tool is a plain object matching the ToolInterface:
//   {
//     name:   string,
//     cursor: string CSS cursor,
//     onMouseDown(evt, canvas),
//     onMouseMove(evt, canvas),
//     onMouseUp  (evt, canvas),
//     onWheel   (evt, canvas)    // optional
//   }
// Adding a new tool: define an object below, add it to TOOLS at the bottom,
// add a matching button in editor.html's toolbar.

import {
  screenToWorld, worldToTile, TILE_SIZE,
  setTile, addDecoration,
  panCamera, zoomCamera, state,
} from './state.js';

// Helper: get screen coords relative to canvas element
function canvasCoords(evt, canvas) {
  const r = canvas.getBoundingClientRect();
  return { sx: evt.clientX - r.left, sy: evt.clientY - r.top };
}

// Helper: convert a mouse event → world coordinates
function worldUnderMouse(evt, canvas) {
  const { sx, sy } = canvasCoords(evt, canvas);
  return screenToWorld(sx, sy);
}

// Helper: convert a mouse event → tile column/row
function tileUnderMouse(evt, canvas) {
  const w = worldUnderMouse(evt, canvas);
  return worldToTile(w.x, w.y);
}

// Snap a world coordinate down to the nearest 32×32 grid corner (top-left).
function snapToGrid(worldX, worldY) {
  return {
    x: Math.floor(worldX / TILE_SIZE) * TILE_SIZE,
    y: Math.floor(worldY / TILE_SIZE) * TILE_SIZE,
  };
}

// Is this asset category "terrain-like"? Terrain assets paint the tile grid.
// Everything else gets placed as a decoration entry.
function isTerrainCategory(cat) {
  return cat === 'tile' || cat === 'terrain' || cat === 'tileset';
}

// ── PLACE TOOL ───────────────────────────────────────────────────────────
// Behavior depends on the currently selected asset in the browser:
//   • No asset selected           → paint tile-type state.selectedTile into the grid (fallback)
//   • Terrain asset (tile/tileset)→ paint tile-type 1 into the grid (drag OK)
//   • Non-terrain static asset    → add ONE decoration at cursor, snapped to 32×32 (single click)
//   • Animation asset             → skipped (Phase 5 will handle animated placement)
// Decorations are stored in level.decorations[] as { src, x, y, w, h } per SCHEMA.
export const placeTool = {
  name:   'place',
  cursor: 'crosshair',
  _painting: false,        // active drag flag (terrain only)
  _placedThisPress: false, // decorations only place once per mouse-down
  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;
    this._placedThisPress = false;
    const asset = state.selectedAsset;
    const terrain = !asset || isTerrainCategory(asset.category);
    if (terrain) {
      this._painting = true;
      const t = tileUnderMouse(evt, canvas);
      setTile(t.col, t.row, state.selectedTile);
    } else if (asset.isAnimation) {
      // Skip — animation placement is Phase 5 territory
      console.warn('[editor] animation asset placement not supported in Phase 1:', asset.id);
    } else {
      // Non-terrain decoration
      const w = worldUnderMouse(evt, canvas);
      const s = snapToGrid(w.x, w.y);
      addDecoration({
        src: asset.path,
        x:   s.x,
        y:   s.y,
        w:   asset.width  || TILE_SIZE,
        h:   asset.height || TILE_SIZE,
      });
      this._placedThisPress = true;
    }
  },
  onMouseMove(evt, canvas) {
    // Only terrain painting drags. Decorations place once per press.
    if (!this._painting) return;
    const t = tileUnderMouse(evt, canvas);
    setTile(t.col, t.row, state.selectedTile);
  },
  onMouseUp() { this._painting = false; },
};

// ── ERASE TOOL ───────────────────────────────────────────────────────────
// Left-click drag zeroes tiles.
export const eraseTool = {
  name:   'erase',
  cursor: 'cell',
  _erasing: false,
  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;
    this._erasing = true;
    const t = tileUnderMouse(evt, canvas);
    setTile(t.col, t.row, 0);
  },
  onMouseMove(evt, canvas) {
    if (!this._erasing) return;
    const t = tileUnderMouse(evt, canvas);
    setTile(t.col, t.row, 0);
  },
  onMouseUp() { this._erasing = false; },
};

// ── PAN TOOL ─────────────────────────────────────────────────────────────
// Left-click drag pans the camera. (Middle-mouse pan also works globally,
// wired in main.js — this is the explicit tool for people without a middle
// mouse button.)
export const panTool = {
  name:   'pan',
  cursor: 'grab',
  _panning: false,
  _lastX: 0, _lastY: 0,
  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;
    this._panning = true;
    const c = canvasCoords(evt, canvas);
    this._lastX = c.sx; this._lastY = c.sy;
    canvas.style.cursor = 'grabbing';
  },
  onMouseMove(evt, canvas) {
    if (!this._panning) return;
    const c = canvasCoords(evt, canvas);
    panCamera(c.sx - this._lastX, c.sy - this._lastY);
    this._lastX = c.sx; this._lastY = c.sy;
  },
  onMouseUp(evt, canvas) {
    this._panning = false;
    canvas.style.cursor = this.cursor;
  },
};

// Registry — main.js reads this to build the toolbar and dispatch events.
export const TOOLS = {
  place: placeTool,
  erase: eraseTool,
  pan:   panTool,
};

// Middle-mouse pan is a global handler wired in main.js — kept here so all
// pan logic lives in one module.
export function middleMousePan(canvas) {
  let panning = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', (evt) => {
    if (evt.button !== 1) return;
    evt.preventDefault();
    panning = true;
    const c = canvasCoords(evt, canvas);
    lastX = c.sx; lastY = c.sy;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (evt) => {
    if (!panning) return;
    const c = canvasCoords(evt, canvas);
    panCamera(c.sx - lastX, c.sy - lastY);
    lastX = c.sx; lastY = c.sy;
  });
  window.addEventListener('mouseup', (evt) => {
    if (evt.button !== 1) return;
    panning = false;
    canvas.style.cursor = TOOLS[state.tool]?.cursor || 'default';
  });
  // Prevent middle-click scroll on Windows
  canvas.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
}

// Wheel zoom — global, not tool-specific.
export function wheelZoom(canvas) {
  canvas.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    const c = canvasCoords(evt, canvas);
    const factor = evt.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomCamera(factor, c.sx, c.sy);
  }, { passive: false });
}
