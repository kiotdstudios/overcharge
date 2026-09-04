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
  panCamera, zoomCamera, state,
} from './state.js';
import * as Actions from './actions.js';
import * as History from './history.js';
import * as Selection from './selection.js';

// Helper: get screen coords relative to canvas element
function canvasCoords(evt, canvas) {
  const r = canvas.getBoundingClientRect();
  return { sx: evt.clientX - r.left, sy: evt.clientY - r.top };
}
function worldUnderMouse(evt, canvas) {
  const { sx, sy } = canvasCoords(evt, canvas);
  return screenToWorld(sx, sy);
}
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
function isTerrainCategory(cat) {
  return cat === 'tile' || cat === 'terrain' || cat === 'tileset';
}

// ── SELECT TOOL ──────────────────────────────────────────────────────────
// Default tool. Behavior:
//   • Click on empty space           → clear selection + start marquee
//   • Click on decoration            → select that decoration (Shift = additive/toggle)
//   • Click on selected decoration   → begin drag-move (single or group)
//   • Drag empty space (no click)    → marquee rectangle, adds to selection on release
//
// state.marquee = { active, startWX, startWY, curWX, curWY } — read by renderer.
// state.dragMove = { active, startWX, startWY, curWX, curWY } — snapped drag delta.
export const selectTool = {
  name:   'select',
  cursor: 'default',
  _mode:  null,           // null | 'marquee' | 'move' | 'idle'
  _shift: false,
  _startWorld: null,
  _origPositions: null,   // Map<ref, {x, y}> snapshot across ALL kinds for move undo

  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;
    this._shift = evt.shiftKey;
    const w = worldUnderMouse(evt, canvas);
    this._startWorld = w;

    const hit = Selection.objectAt(w.x, w.y);
    const alreadySelected = hit && Selection.isRefSelected(hit.kind, hit.ref);

    if (hit) {
      if (this._shift) {
        Selection.toggleByKind(hit.kind, hit.ref);
        this._mode = 'idle';
      } else if (alreadySelected) {
        // Begin drag-move of the current selection (all kinds)
        this._mode = 'move';
        this._origPositions = new Map();
        for (const { ref } of Selection.selectedRefs()) {
          if (ref && typeof ref.x === 'number' && typeof ref.y === 'number') {
            this._origPositions.set(ref, { x: ref.x, y: ref.y });
          }
        }
        state.dragMove = { active: true, startWX: w.x, startWY: w.y, curWX: w.x, curWY: w.y };
      } else {
        // Select just this one, prep for potential drag
        Selection.selectByKind(hit.kind, hit.ref, false);
        this._mode = 'move';
        this._origPositions = new Map([[hit.ref, { x: hit.ref.x, y: hit.ref.y }]]);
        state.dragMove = { active: true, startWX: w.x, startWY: w.y, curWX: w.x, curWY: w.y };
      }
    } else {
      // Empty space — start marquee, optionally clearing selection
      if (!this._shift) Selection.clearSelection();
      this._mode = 'marquee';
      state.marquee = { active: true, startWX: w.x, startWY: w.y, curWX: w.x, curWY: w.y };
    }
  },

  onMouseMove(evt, canvas) {
    if (!this._mode) return;
    const w = worldUnderMouse(evt, canvas);
    if (this._mode === 'marquee') {
      state.marquee.curWX = w.x;
      state.marquee.curWY = w.y;
      import('./state.js').then(m => m.notify());
    } else if (this._mode === 'move') {
      // Live-preview move: apply delta from start to current, quantized to 32px.
      const dxRaw = w.x - this._startWorld.x;
      const dyRaw = w.y - this._startWorld.y;
      const dx = Math.round(dxRaw / TILE_SIZE) * TILE_SIZE;
      const dy = Math.round(dyRaw / TILE_SIZE) * TILE_SIZE;
      for (const [ref, orig] of this._origPositions.entries()) {
        ref.x = orig.x + dx;
        ref.y = orig.y + dy;
      }
      state.dragMove.curWX = w.x;
      state.dragMove.curWY = w.y;
      import('./state.js').then(m => m.notify());
    }
  },

  onMouseUp(evt, canvas) {
    if (this._mode === 'marquee' && state.marquee && state.marquee.active) {
      const m = state.marquee;
      const x = Math.min(m.startWX, m.curWX);
      const y = Math.min(m.startWY, m.curWY);
      const wRect = Math.abs(m.curWX - m.startWX);
      const hRect = Math.abs(m.curWY - m.startWY);
      if (wRect >= 2 && hRect >= 2) {
        const decs  = Selection.decorationsInRect(x, y, wRect, hRect);
        const tiles = Selection.tilesInRect(x, y, wRect, hRect);
        const gp    = Selection.objectsInRect(x, y, wRect, hRect);
        if (!this._shift) Selection.clearSelection();
        for (const d of decs)  Selection.selectByKind('decoration', d, true);
        for (const t of tiles) Selection.selectByKind('tile', t.col + ',' + t.row, true);
        for (const o of gp.sources)     Selection.selectByKind('source',     o, true);
        for (const o of gp.gates)       Selection.selectByKind('gate',       o, true);
        for (const o of gp.switches)    Selection.selectByKind('switch',     o, true);
        for (const o of gp.checkpoints) Selection.selectByKind('checkpoint', o, true);
        for (const o of gp.enemies)     Selection.selectByKind('enemy',      o, true);
        if (gp.playerStart) Selection.selectByKind('playerStart', null, true);
      }
      state.marquee = null;
    } else if (this._mode === 'move' && this._origPositions) {
      // Commit the move as a composite of moveObject actions (works for any kind).
      const actions = [];
      for (const [ref, orig] of this._origPositions.entries()) {
        const dx = ref.x - orig.x;
        const dy = ref.y - orig.y;
        if (dx !== 0 || dy !== 0) {
          actions.push(Actions.moveObject(ref, dx, dy));
        }
      }
      if (actions.length > 0) History.record(History.makeComposite(actions, 'move'));
      state.dragMove = null;
    }
    this._mode = null;
    this._origPositions = null;
    this._startWorld = null;
    import('./state.js').then(m => m.notify());
  },
};

// ── PLACE TOOL ───────────────────────────────────────────────────────────
// Behavior:
//   • Terrain-category asset (or none): paint tile-1 into grid (drag OK)
//   • Non-terrain static asset: single decoration at cursor snapped to 32×32
//   • Animation asset: skipped (Phase 5)
// Every mutation goes through History.apply so undo works.
// A drag paints multiple tiles — recorded as one composite for one-press undo.
export const placeTool = {
  name:   'place',
  cursor: 'crosshair',
  _painting: false,
  _dragActions: null,    // collected while dragging; flushed on mouseUp
  _paintedThisDrag: null,// Set<"c,r"> to avoid re-recording same cell in a single drag

  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;
    const asset = state.selectedAsset;
    const terrain = !asset || isTerrainCategory(asset.category);
    if (terrain) {
      this._painting = true;
      this._dragActions = [];
      this._paintedThisDrag = new Set();
      const t = tileUnderMouse(evt, canvas);
      this._paintCell(t.col, t.row);
    } else if (asset.isAnimation) {
      console.warn('[editor] animation asset placement not supported in Phase 1:', asset.id);
    } else {
      // Non-terrain decoration
      const w = worldUnderMouse(evt, canvas);
      const s = snapToGrid(w.x, w.y);
      const dec = {
        src: asset.path,
        x:   s.x,
        y:   s.y,
        w:   asset.width  || TILE_SIZE,
        h:   asset.height || TILE_SIZE,
      };
      const a = Actions.addDecoration(dec);
      if (a) History.apply(a);
    }
  },

  onMouseMove(evt, canvas) {
    if (!this._painting) return;
    const t = tileUnderMouse(evt, canvas);
    this._paintCell(t.col, t.row);
  },

  onMouseUp() {
    if (this._painting && this._dragActions && this._dragActions.length > 0) {
      History.record(History.makeComposite(this._dragActions, 'paint'));
    }
    this._painting = false;
    this._dragActions = null;
    this._paintedThisDrag = null;
  },

  _paintCell(col, row) {
    const key = col + ',' + row;
    if (this._paintedThisDrag.has(key)) return;
    this._paintedThisDrag.add(key);
    const a = Actions.setTile(col, row, state.selectedTile);
    if (a) { a.forward(); this._dragActions.push(a); }   // apply live, batch record
  },
};

// ── ERASE TOOL ───────────────────────────────────────────────────────────
// Removes tiles AND removes decorations under the cursor. Drag OK for tiles.
// Decorations are removed on first click (single click per decoration).
export const eraseTool = {
  name:   'erase',
  cursor: 'cell',
  _erasing: false,
  _dragActions: null,
  _erasedThisDrag: null,
  _decorationsErasedThisPress: null,

  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;
    this._erasing = true;
    this._dragActions = [];
    this._erasedThisDrag = new Set();
    this._decorationsErasedThisPress = new Set();

    // Erase any decoration under cursor (single click).
    const w = worldUnderMouse(evt, canvas);
    const dec = Selection.decorationAt(w.x, w.y);
    if (dec && !this._decorationsErasedThisPress.has(dec)) {
      const a = Actions.removeDecoration(dec);
      if (a) { a.forward(); this._dragActions.push(a); this._decorationsErasedThisPress.add(dec); }
    }
    // Erase tile at cursor.
    const t = tileUnderMouse(evt, canvas);
    this._eraseCell(t.col, t.row);
  },

  onMouseMove(evt, canvas) {
    if (!this._erasing) return;
    const t = tileUnderMouse(evt, canvas);
    this._eraseCell(t.col, t.row);
    // Drag also erases decorations you drag over (but each only once per press).
    const w = worldUnderMouse(evt, canvas);
    const dec = Selection.decorationAt(w.x, w.y);
    if (dec && !this._decorationsErasedThisPress.has(dec)) {
      const a = Actions.removeDecoration(dec);
      if (a) { a.forward(); this._dragActions.push(a); this._decorationsErasedThisPress.add(dec); }
    }
  },

  onMouseUp() {
    if (this._erasing && this._dragActions && this._dragActions.length > 0) {
      History.record(History.makeComposite(this._dragActions, 'erase'));
    }
    this._erasing = false;
    this._dragActions = null;
    this._erasedThisDrag = null;
    this._decorationsErasedThisPress = null;
  },

  _eraseCell(col, row) {
    const key = col + ',' + row;
    if (this._erasedThisDrag.has(key)) return;
    this._erasedThisDrag.add(key);
    const a = Actions.setTile(col, row, 0);
    if (a) { a.forward(); this._dragActions.push(a); }
  },
};

// ── PAN TOOL ─────────────────────────────────────────────────────────────
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
  select: selectTool,
  place:  placeTool,
  erase:  eraseTool,
  pan:    panTool,
};

// Middle-mouse pan is a global handler wired in main.js.
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
