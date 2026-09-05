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
  snapPoint, snapDelta, snapForAsset, snapForRef, groupSnap,
  SNAP_DECORATION_DEFAULT,
  decoDimensions, getCachedImage,
} from './state.js';
import * as Actions from './actions.js';
import * as History from './history.js';
import * as Selection from './selection.js';

// Convert a mouse event into canvas-INTERNAL (backing-store) pixel coords.
//
// getBoundingClientRect() returns CSS pixels. evt.clientX/Y are CSS pixels.
// canvas.width/height are BACKING-STORE pixels. worldToScreen() and every
// drawImage call in renderer.js produce/consume BACKING-store coords. If
// the CSS box has been stretched or compressed relative to the backing
// store — which happens whenever the grid layout resizes the canvas box
// between fitCanvas() calls, or on HiDPI displays if we ever raise the
// backing resolution — a raw CSS-pixel mouse coord will hit-test at the
// wrong world position. Scale by (backing / CSS) so click coords land in
// the same coordinate space that render uses.
function canvasCoords(evt, canvas) {
  const r = canvas.getBoundingClientRect();
  const scaleX = r.width  > 0 ? canvas.width  / r.width  : 1;
  const scaleY = r.height > 0 ? canvas.height / r.height : 1;
  return {
    sx: (evt.clientX - r.left) * scaleX,
    sy: (evt.clientY - r.top)  * scaleY,
  };
}
function worldUnderMouse(evt, canvas) {
  const { sx, sy } = canvasCoords(evt, canvas);
  return screenToWorld(sx, sy);
}
function tileUnderMouse(evt, canvas) {
  const w = worldUnderMouse(evt, canvas);
  return worldToTile(w.x, w.y);
}
function isTerrainCategory(cat) {
  return cat === 'tile' || cat === 'terrain' || cat === 'tileset';
}
// Legacy terrain-snap alias (32-only). Retained because paste-anchor code in
// clipboard.js used to import it. Prefer snapPoint() from state.js.
function snapToGrid(worldX, worldY) { return snapPoint(worldX, worldY, TILE_SIZE); }

// ── POINTER TOOL ────────────────────────────────────────────────────────
// Default everyday editing tool. Simpler than Select — no marquee, no shift-
// additive. Its whole job is: pick one thing, move it, done.
//
//   • Click on empty space         → clear selection
//   • Click on an object           → single-select that object (replaces any
//                                    prior selection — no shift-additive here)
//   • Click on already-selected    → begin drag-move (single object)
//   • Drag empty space             → nothing (NO marquee; that's Select's job)
//
// Works on every selectable kind: decorations, sources, gates, switches,
// checkpoints, enemies, and playerStart (SPAWN). Uses the same generic
// Selection.objectAt hit-test and Actions.moveObject that Select uses, so
// undo/redo goes through the exact same history path.
export const pointerTool = {
  name:   'pointer',
  cursor: 'default',
  _mode:  null,           // null | 'move' | 'idle'
  _startWorld: null,
  _origPositions: null,   // Map<ref, {x, y}> for move undo (single object)
  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;

    // ─ Handle-drag path ─ if the click landed on the move-handle dot,
    // begin a group drag of the current selection using LCM snap.
    const { sx, sy } = canvasCoords(evt, canvas);
    if (Selection.moveHandleContains(sx, sy)) {
      const refs = Selection.selectedRefs();
      if (refs.length > 0) {
        const w = worldUnderMouse(evt, canvas);
        this._startWorld = w;
        this._mode = 'move';
        this._origPositions = new Map();
        for (const { ref } of refs) {
          if (ref && typeof ref.x === 'number' && typeof ref.y === 'number') {
            this._origPositions.set(ref, { x: ref.x, y: ref.y });
          }
        }
        this._snap = groupSnap(refs);
        state.dragMove = { active: true, startWX: w.x, startWY: w.y, curWX: w.x, curWY: w.y };
        return;
      }
    }

    const w = worldUnderMouse(evt, canvas);
    this._startWorld = w;

    const hit = Selection.objectAt(w.x, w.y);

    if (!hit) {
      // Empty canvas → clear selection. No marquee (that's Select).
      Selection.clearSelection();
      this._mode = null;
      return;
    }

    const alreadySelected = Selection.isRefSelected(hit.kind, hit.ref);
    if (!alreadySelected) {
      // Click a different object → replace selection (no shift-additive)
      Selection.selectByKind(hit.kind, hit.ref, false);
    }

    // Direct-click drag still moves only the clicked object (Pointer's
    // "just this one" behavior). Users wanting group drag should marquee
    // with Select then use the handle for the group.
    this._mode = 'move';
    this._origPositions = new Map([[hit.ref, { x: hit.ref.x, y: hit.ref.y }]]);
    this._snap = snapForRef(hit.kind, hit.ref);
    state.dragMove = { active: true, startWX: w.x, startWY: w.y, curWX: w.x, curWY: w.y };
  },

  onMouseMove(evt, canvas) {
    if (this._mode !== 'move') return;
    const w = worldUnderMouse(evt, canvas);
    // Live-preview: quantize delta to the ref's snap resolution. For pointer
    // the "group" is always the single clicked object, so snap comes from
    // whichever kind was hit (decoration.snap, or 16 for gameplay markers).
    const dxRaw = w.x - this._startWorld.x;
    const dyRaw = w.y - this._startWorld.y;
    const s = this._snap ?? SNAP_DECORATION_DEFAULT;
    const { dx, dy } = snapDelta(dxRaw, dyRaw, s);
    for (const [ref, orig] of this._origPositions.entries()) {
      ref.x = orig.x + dx;
      ref.y = orig.y + dy;
    }
    state.dragMove.curWX = w.x;
    state.dragMove.curWY = w.y;
    import('./state.js').then(m => m.notify());
  },

  onMouseUp(_evt, _canvas) {
    if (this._mode === 'move' && this._origPositions) {
      // Commit as a single moveObject action (or empty if user just clicked
      // without dragging — makeComposite of [] is a no-op via History guard).
      const actions = [];
      for (const [ref, orig] of this._origPositions.entries()) {
        const dx = ref.x - orig.x;
        const dy = ref.y - orig.y;
        if (dx !== 0 || dy !== 0) actions.push(Actions.moveObject(ref, dx, dy));
      }
      if (actions.length > 0) {
        History.record(actions.length === 1 ? actions[0] : History.makeComposite(actions, 'move'));
      }
      state.dragMove = null;
    }
    this._mode = null;
    this._origPositions = null;
    this._startWorld = null;
    this._snap = null;
    import('./state.js').then(m => m.notify());
  },
};

// ── SELECT TOOL ─────────────────────────────────────────────────────────
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

    // ─ Handle-drag path ─ same as Pointer: hitting the move-handle dot
    // begins a group drag of whatever's currently selected.
    const cc = canvasCoords(evt, canvas);
    if (Selection.moveHandleContains(cc.sx, cc.sy)) {
      const refs = Selection.selectedRefs();
      if (refs.length > 0) {
        const w0 = worldUnderMouse(evt, canvas);
        this._startWorld = w0;
        this._mode = 'move';
        this._origPositions = new Map();
        for (const { ref } of refs) {
          if (ref && typeof ref.x === 'number' && typeof ref.y === 'number') {
            this._origPositions.set(ref, { x: ref.x, y: ref.y });
          }
        }
        this._groupSnap = groupSnap(refs);
        state.dragMove = { active: true, startWX: w0.x, startWY: w0.y, curWX: w0.x, curWY: w0.y };
        return;
      }
    }

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
        const refs = Selection.selectedRefs();
        for (const { ref } of refs) {
          if (ref && typeof ref.x === 'number' && typeof ref.y === 'number') {
            this._origPositions.set(ref, { x: ref.x, y: ref.y });
          }
        }
        this._groupSnap = groupSnap(refs);
        state.dragMove = { active: true, startWX: w.x, startWY: w.y, curWX: w.x, curWY: w.y };
      } else {
        // Select just this one, prep for potential drag
        Selection.selectByKind(hit.kind, hit.ref, false);
        this._mode = 'move';
        this._origPositions = new Map([[hit.ref, { x: hit.ref.x, y: hit.ref.y }]]);
        this._groupSnap = snapForRef(hit.kind, hit.ref);
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
      // Group-move: preserve relative spacing. Quantize the delta ONCE using
      // the finest snap in the selection, then apply that same delta to every
      // ref. 32 is a multiple of 16 so mixed groups still land on valid grids.
      const dxRaw = w.x - this._startWorld.x;
      const dyRaw = w.y - this._startWorld.y;
      const { dx, dy } = snapDelta(dxRaw, dyRaw, this._groupSnap ?? SNAP_DECORATION_DEFAULT);
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
    this._groupSnap = null;
    import('./state.js').then(m => m.notify());
  },
};

// ── Asset placement primitive ────────────────────────────────────────────
// Shared single-point placement used by BOTH the Place tool click path AND
// the drag-and-drop drop handler. Keeps their behavior identical.
//
//   terrain-category asset (or null): paint a single tile-1 at (wx, wy)
//   non-terrain static asset:         create a decoration at (wx, wy) with
//                                     asset-defined snap + native dims
//   animation asset:                  skipped (Phase 5 territory)
//
// Every mutation goes through History.apply so undo works.
// Returns true if a placement action was applied, false otherwise.
export function placeAssetAt(asset, worldX, worldY) {
  if (isTerrainCategory(asset?.category) || !asset) {
    const t = { col: Math.floor(worldX / TILE_SIZE), row: Math.floor(worldY / TILE_SIZE) };
    const a = Actions.setTile(t.col, t.row, 1);
    if (a) { History.apply(a); return true; }
    return false;
  }
  if (asset.isAnimation) {
    console.warn('[editor] animation asset placement not supported in Phase 1:', asset.id);
    return false;
  }
  // Static non-terrain decoration
  const snap = snapForAsset(asset);
  const pos  = snapPoint(worldX, worldY, snap);
  const img  = getCachedImage(asset.path);
  const dims = decoDimensions(asset, img);

  // ── Floating-placement guard ─────────────────────────────────────────
  // Reject decorations that would float in mid-air. Requires a solid tile
  // within N tiles below the decoration's bottom, spanning any col in its
  // x-range. N=3 tolerance so slightly-high clicks still register (they
  // won't auto-snap yet — Chief just gets a rejection console note).
  const L = state.level;
  if (L) {
    const MAX_FALL_TILES = 3;
    const rows = Math.floor(L.tiles.length / L.cols);
    const bottomRow = Math.floor((pos.y + dims.h) / TILE_SIZE);
    const startCol  = Math.max(0, Math.floor(pos.x / TILE_SIZE));
    const endCol    = Math.min(L.cols - 1, Math.floor((pos.x + Math.max(1, dims.w) - 1) / TILE_SIZE));
    let hasGround = false;
    for (let r = bottomRow; r <= Math.min(bottomRow + MAX_FALL_TILES, rows - 1) && !hasGround; r++) {
      if (r < 0) continue;
      for (let c = startCol; c <= endCol; c++) {
        if (L.tiles[r * L.cols + c] === 1) { hasGround = true; break; }
      }
    }
    if (!hasGround) {
      console.info('[editor] floating placement rejected — need solid tile below', asset.id, pos);
      return false;
    }
  }

  const dec = {
    src:  asset.path,
    x:    pos.x,
    y:    pos.y,
    w:    dims.w,
    h:    dims.h,
    snap,     // remember so drag-move / paste use the same resolution
  };
  const a = Actions.addDecoration(dec);
  if (a) { History.apply(a); return true; }
  return false;
}

// ── Asset drag from sidebar ──────────────────────────────────────────────
// HTML5 native drag-and-drop is unreliable across browsers (Firefox in
// particular has quirks with drag from children of scrollable containers,
// and popup-block/permission state can interfere). Instead we use raw
// pointer events, tracking mousedown → move → up on the document. This is
// deterministic and browser-neutral.
//
// UX:
//   pointerdown on thumbnail    → arm potential drag
//   move past 4px threshold     → enter drag mode, cursor: grabbing
//   pointerup over canvas       → placeAssetAt at cursor
//   pointerup elsewhere         → do nothing (asset stays selected via click)
export function startAssetDrag(asset, initialEvt, sourceEl) {
  if (!asset || asset.isAnimation) return;
  if (!sourceEl) sourceEl = initialEvt.currentTarget || initialEvt.target;
  if (!sourceEl) return;

  const DRAG_THRESHOLD_PX = 4;
  const startClientX = initialEvt.clientX;
  const startClientY = initialEvt.clientY;
  const pointerId    = initialEvt.pointerId;
  let dragging = false;
  const prevBodyCursor = document.body.style.cursor;

  // setPointerCapture routes ALL subsequent pointermove/pointerup for this
  // pointerId to `sourceEl`, regardless of which element the cursor is over.
  // This prevents scroll gestures, text selection, and native image drag
  // from stealing the pointer mid-drag. Firefox in particular needs this.
  try { sourceEl.setPointerCapture(pointerId); } catch {}

  const onMove = (e) => {
    if (e.pointerId !== pointerId) return;
    if (!dragging) {
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      dragging = true;
      document.body.style.cursor = 'grabbing';
    }
  };
  const cleanup = () => {
    sourceEl.removeEventListener('pointermove',   onMove);
    sourceEl.removeEventListener('pointerup',     onUp);
    sourceEl.removeEventListener('pointercancel', onUp);
    document.body.style.cursor = prevBodyCursor;
    try { sourceEl.releasePointerCapture(pointerId); } catch {}
  };
  const onUp = (e) => {
    if (e.pointerId !== pointerId) return;
    const wasDragging = dragging;
    cleanup();
    if (!wasDragging) return;                                 // click, not drag
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const inCanvas = e.clientX >= r.left && e.clientX < r.right
                  && e.clientY >= r.top  && e.clientY < r.bottom;
    if (!inCanvas) return;                                    // released outside canvas
    const scaleX = r.width  > 0 ? canvas.width  / r.width  : 1;
    const scaleY = r.height > 0 ? canvas.height / r.height : 1;
    const sx = (e.clientX - r.left) * scaleX;
    const sy = (e.clientY - r.top)  * scaleY;
    const w  = screenToWorld(sx, sy);
    placeAssetAt(asset, w.x, w.y);
  };
  // Listen on the captured element so the browser routes events reliably.
  sourceEl.addEventListener('pointermove',   onMove);
  sourceEl.addEventListener('pointerup',     onUp);
  sourceEl.addEventListener('pointercancel', onUp);
}
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
    } else {
      // Non-terrain single-shot placement via shared primitive so click-place
      // and drop-place behave identically.
      const wPt = worldUnderMouse(evt, canvas);
      placeAssetAt(asset, wPt.x, wPt.y);
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
  pointer: pointerTool,
  select:  selectTool,
  place:   placeTool,
  erase:   eraseTool,
  pan:     panTool,
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
