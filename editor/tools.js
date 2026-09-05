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
  panCamera, zoomCamera, state, notify,
  snapPoint, snapDelta, snapForAsset, snapForRef, groupSnap,
  SNAP_DECORATION_DEFAULT, effectiveSnap,
  decoDimensions, getCachedImage,
  tileValueForAssetId, tileIsSolid,
  flashPlacementReject,
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

// ── Magnetic edge snap helper ────────────────────────────────────────────
// Same-family = the asset's category matches the sibling's src folder,
// either singular (rooftop, structure) or plural (platforms, edges, walls,
// buildings, containers, facades, signs, props). We match by folder to work
// with the disk-index entries too (which don't always share Aki's category
// spelling).
function _folderFromSrc(src) {
  if (!src) return '';
  const parts = src.split('/');
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}
function _sameFamily(decSrc, assetCat) {
  const f = _folderFromSrc(decSrc);
  if (!f || !assetCat) return false;
  return f === assetCat || f === assetCat + 's';
}
// Returns a possibly-nudged {x, y}. Never moves further than ±THRESHOLD on
// each axis. Independent X and Y snap: closest matching edge wins per axis.
// Candidate edges per sibling: abut-right/left (my.L↔sib.R, my.R↔sib.L),
// column-align (my.L↔sib.L, my.R↔sib.R), row-abut (my.T↔sib.B, my.B↔sib.T),
// row-align (my.T↔sib.T, my.B↔sib.B).
const MAGNETIC_THRESHOLD_PX = 12;
function _magneticEdgeSnap(pos, dims, asset, L) {
  if (!state.magneticSnap) return pos;
  if (!L || !Array.isArray(L.decorations) || L.decorations.length === 0) return pos;
  const cat = String(asset.category || '').toLowerCase();
  if (!cat) return pos;
  const myL = pos.x, myR = pos.x + dims.w, myT = pos.y, myB = pos.y + dims.h;
  let bestDx = 0, bestDxAbs = MAGNETIC_THRESHOLD_PX + 1;
  let bestDy = 0, bestDyAbs = MAGNETIC_THRESHOLD_PX + 1;
  for (const s of L.decorations) {
    if (!s || typeof s.x !== 'number' || typeof s.y !== 'number') continue;
    if (!_sameFamily(s.src, cat)) continue;
    const sL = s.x, sR = s.x + (s.w || 0), sT = s.y, sB = s.y + (s.h || 0);
    // X candidates
    const dxCandidates = [ sR - myL, sL - myR, sL - myL, sR - myR ];
    for (const d of dxCandidates) {
      const a = Math.abs(d);
      if (a <= MAGNETIC_THRESHOLD_PX && a < bestDxAbs) { bestDx = d; bestDxAbs = a; }
    }
    // Y candidates
    const dyCandidates = [ sB - myT, sT - myB, sT - myT, sB - myB ];
    for (const d of dyCandidates) {
      const a = Math.abs(d);
      if (a <= MAGNETIC_THRESHOLD_PX && a < bestDyAbs) { bestDy = d; bestDyAbs = a; }
    }
  }
  if (bestDx === 0 && bestDy === 0) return pos;
  return { x: pos.x + bestDx, y: pos.y + bestDy };
}
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
    const s = effectiveSnap(this._snap ?? SNAP_DECORATION_DEFAULT);
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
      const { dx, dy } = snapDelta(dxRaw, dyRaw, effectiveSnap(this._groupSnap ?? SNAP_DECORATION_DEFAULT));
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

// ── Gameplay marker placement ────────────────────────────────────────────
// Adds a source / gate / switch / enemy / exit / checkpoint to the level's
// typed collection, or REPLACES playerStart. Snaps to 16px. Wraps in an
// action so undo works.
function _placeGameplayMarker(asset, worldX, worldY) {
  const L = state.level;
  if (!L) return false;
  const pos    = snapPoint(worldX, worldY, 16);
  const idBase = String(asset.id || '').toLowerCase();
  const cat    = String(asset.category || '').toLowerCase();

  // playerStart is a single object per level; dragging player_* MOVES it.
  if (cat === 'player') {
    const oldStart = L.playerStart || null;
    const newStart = { x: pos.x, y: pos.y };
    const action = {
      type: 'set_player_start',
      forward: () => { L.playerStart = newStart; notify(); },
      inverse: () => { L.playerStart = oldStart; notify(); },
    };
    History.apply(action);
    return true;
  }

  // Every other marker gets its own typed array.
  let arr, ref;
  if (/exit/.test(idBase)) {
    arr = L.gates = L.gates || [];
    ref = { id: `exit_${arr.length + 1}`, x: pos.x, y: pos.y, w: 32, h: 64, isExit: true, label: 'EXIT' };
  } else if (/gate/.test(idBase)) {
    arr = L.gates = L.gates || [];
    ref = { id: `gate_${arr.length + 1}`, x: pos.x, y: pos.y, w: 32, h: 64, label: 'GATE' };
  } else if (/switch/.test(idBase)) {
    arr = L.switches = L.switches || [];
    ref = { id: `sw_${arr.length + 1}`, x: pos.x, y: pos.y, label: 'SW' };
  } else if (/check/.test(idBase)) {
    arr = L.checkpoints = L.checkpoints || [];
    ref = { id: `cp_${arr.length + 1}`, x: pos.x, y: pos.y, label: 'CP' };
  } else if (cat === 'enemy') {
    arr = L.enemies = L.enemies || [];
    const kind = /drone/.test(idBase) ? 'drone' : 'drain';
    ref = { id: `en_${arr.length + 1}`, x: pos.x, y: pos.y, type: kind, patrolLeft: pos.x - 64, patrolRight: pos.x + 64 };
  } else {
    // default: electrical source / generator
    arr = L.sources = L.sources || [];
    ref = { id: `src_${arr.length + 1}`, x: pos.x, y: pos.y, charge: 5, label: 'GEN' };
  }

  const action = {
    type:    'add_gameplay_marker',
    forward: () => { arr.push(ref); notify(); },
    inverse: () => { const i = arr.indexOf(ref); if (i >= 0) arr.splice(i, 1); notify(); },
  };
  History.apply(action);
  return true;
}

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
  // Reference atlases are for lookup, not placement.
  if (asset && asset.category === 'tileset') {
    console.warn('[editor] tileset atlas is not placeable:', asset.id);
    flashPlacementReject(worldX, worldY, 'atlas not placeable');
    return false;
  }
  if (isTerrainCategory(asset?.category) || !asset) {
    const t = { col: Math.floor(worldX / TILE_SIZE), row: Math.floor(worldY / TILE_SIZE) };
    // Determine tile value based on selected asset. When Chief selects a
    // specific tile art (env_tile_purple_a etc.) the cell records that
    // exact variant so it will render EXACTLY that art forever, not a
    let val = 1;                                // legacy default = art[0]
    if (asset && asset.id) {
      const registered = tileValueForAssetId(asset.id);
      if (registered >= 0) val = registered;    // registry-stable tile id
    }
    const a = Actions.setTile(t.col, t.row, val);
    if (a) { History.apply(a); return true; }
    return false;
  }
  // ── Gameplay marker assets ──────────────────────────────────────────
  // Categories 'electrical', 'enemy', 'player', 'gameplay' — and IDs
  // matching generator/source/gate/switch/exit/checkpoint — route to
  // typed level collections (sources/gates/switches/enemies/checkpoints)
  // or playerStart, not level.decorations. Placement snaps to 16.
  const cat = String(asset.category || '').toLowerCase();
  if (cat === 'electrical' || cat === 'enemy' || cat === 'player' || cat === 'gameplay' ||
      /generator|source|gate|switch|exit|checkpoint/i.test(asset.id || '')) {
    return _placeGameplayMarker(asset, worldX, worldY);
  }
  // Animated decoration that isn't a recognized gameplay marker: skip.
  if (asset.isAnimation) {
    console.warn('[editor] animation asset not placeable:', asset.id);
    flashPlacementReject(worldX, worldY, 'animation not placeable');
    return false;
  }
  // ── Static non-terrain decoration ─────────────────────────────────────
  // Special-case: 'wall' category acts as a tile-sized building block. Walls
  // snap to the 32 grid, render at exactly 32×32 (stretched from native ~26),
  // and cannot overlap another wall in the same cell. This makes brick walls
  // stackable into structures like normal terrain tiles.
  const isWall = asset.category === 'wall';
  const autoSnap = isWall ? TILE_SIZE : snapForAsset(asset);
  const snap     = effectiveSnap(autoSnap);            // Chief override wins
  let   pos      = snapPoint(worldX, worldY, snap);
  const img      = getCachedImage(asset.path);
  const nativeDims = decoDimensions(asset, img);
  const dims   = isWall ? { w: TILE_SIZE, h: TILE_SIZE } : nativeDims;

  const L = state.level;

  // ── Magnetic edge snap ───────────────────────────────────────────────
  // If enabled, nudge pos so we abut / align with same-family sibling
  // decorations within ±12px on each axis. Runs BEFORE guards so guards
  // evaluate the FINAL landing position, not the pre-magnetic one.
  pos = _magneticEdgeSnap(pos, dims, asset, L);

  const guardsOn = state.guardsOn !== false;   // default ON

  // ── Wall overlap guard ───────────────────────────────────────────────
  // Reject placing a wall on top of another wall in the same 32×32 cell.
  // Skipped entirely when Chief has toggled guards OFF.
  if (guardsOn && isWall && L && Array.isArray(L.decorations)) {
    const cellCol = Math.floor(pos.x / TILE_SIZE);
    const cellRow = Math.floor(pos.y / TILE_SIZE);
    const clash = L.decorations.some(d => {
      if (!d || typeof d.x !== 'number' || typeof d.y !== 'number') return false;
      if (!/\/walls\//.test(d.src || '')) return false;
      return Math.floor(d.x / TILE_SIZE) === cellCol
          && Math.floor(d.y / TILE_SIZE) === cellRow;
    });
    if (clash) {
      console.info('[editor] wall overlap rejected — already a wall in this cell', asset.id, cellCol, cellRow);
      flashPlacementReject(worldX, worldY, 'wall already here');
      return false;
    }
  }

  // ── Floating-placement guard ─────────────────────────────────────────
  // Reject decorations floating in mid-air. Skipped when guards are OFF.
  if (guardsOn && L) {
    const MAX_FALL_TILES = isWall ? 1 : 3;
    const rows = Math.floor(L.tiles.length / L.cols);
    const bottomRow = Math.floor((pos.y + dims.h) / TILE_SIZE);
    const startCol  = Math.max(0, Math.floor(pos.x / TILE_SIZE));
    const endCol    = Math.min(L.cols - 1, Math.floor((pos.x + Math.max(1, dims.w) - 1) / TILE_SIZE));
    let hasGround = false;
    for (let r = bottomRow; r <= Math.min(bottomRow + MAX_FALL_TILES, rows - 1) && !hasGround; r++) {
      if (r < 0) continue;
      for (let c = startCol; c <= endCol; c++) {
        if (tileIsSolid(L.tiles[r * L.cols + c])) { hasGround = true; break; }
      }
    }
    // Walls also treat other walls as ground so vertical stacking works.
    if (!hasGround && isWall && Array.isArray(L.decorations)) {
      const bRow = bottomRow;
      hasGround = L.decorations.some(d => {
        if (!d || !/\/walls\//.test(d.src || '')) return false;
        const dRow = Math.floor(d.y / TILE_SIZE);
        const dCol = Math.floor(d.x / TILE_SIZE);
        return dRow === bRow && dCol >= startCol && dCol <= endCol;
      });
    }
    if (!hasGround) {
      console.info('[editor] floating placement rejected — need solid ground below', asset.id, pos);
      flashPlacementReject(worldX, worldY, 'no ground below');
      return false;
    }
  }

  const dec = {
    src:  asset.path,
    x:    pos.x,
    y:    pos.y,
    w:    dims.w,
    h:    dims.h,
    snap,
  };
  const a = Actions.addDecoration(dec);
  if (a) { History.apply(a); return true; }
  return false;
}

// ── Asset drag from sidebar ──────────────────────────────────────────────
// Uses plain mousedown / mousemove / mouseup (NOT pointer events, NOT
// setPointerCapture, NOT HTML5 DnD). Mouse events are the oldest, most
// broadly-compatible interaction API and don't get hijacked by scroll
// containers or browser drag heuristics. Document-level move/up listeners
// so cursor movement anywhere on the page reaches us.
//
// Debug logs at each stage — if Chief reports drag still not working, the
// console tells us EXACTLY where it stops.
//
// UX:
//   mousedown on thumbnail   → arm potential drag, select asset
//   move past 4px threshold  → dragging=true, cursor: grabbing
//   mouseup over canvas      → placeAssetAt at cursor (or gameplay marker)
//   mouseup elsewhere        → no-op (asset stays selected)
export function startAssetDrag(asset, initialEvt) {
  if (!asset) { console.info('[drag] no asset'); return; }
  const DRAG_THRESHOLD_PX = 4;
  const startClientX = initialEvt.clientX;
  const startClientY = initialEvt.clientY;
  let dragging = false;
  const prevBodyCursor = document.body.style.cursor;

  const onMove = (e) => {
    if (!dragging) {
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      dragging = true;
      document.body.style.cursor = 'grabbing';
      console.info('[drag] entered drag mode');
    }
  };
  const cleanup = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);
    document.body.style.cursor = prevBodyCursor;
  };
  const onUp = (e) => {
    const wasDragging = dragging;
    cleanup();
    console.info('[drag] mouseup (dragging=' + wasDragging + ')');
    if (!wasDragging) return;                                 // click, not drag
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) { console.info('[drag] canvas not found'); return; }
    const r = canvas.getBoundingClientRect();
    const inCanvas = e.clientX >= r.left && e.clientX < r.right
                  && e.clientY >= r.top  && e.clientY < r.bottom;
    if (!inCanvas) { console.info('[drag] released outside canvas'); return; }
    const scaleX = r.width  > 0 ? canvas.width  / r.width  : 1;
    const scaleY = r.height > 0 ? canvas.height / r.height : 1;
    const sx = (e.clientX - r.left) * scaleX;
    const sy = (e.clientY - r.top)  * scaleY;
    const w  = screenToWorld(sx, sy);
    const ok = placeAssetAt(asset, w.x, w.y);
    console.info('[drag] placeAssetAt →', ok ? 'PLACED' : 'REJECTED');
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
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
    // Compute the correct tile value from the currently selected asset. When
    // a specific tile art is selected (env_tile_purple_a etc.) we look it up
    // in the permanent registry so the painted cell stores exactly that
    // variant. Empty selection or non-terrain selection falls back to
    // state.selectedTile (currently 1) which renders as art[0].
    const asset = state.selectedAsset;
    let val = state.selectedTile;
    if (asset && isTerrainCategory(asset.category)) {
      const registered = tileValueForAssetId(asset.id);
      if (registered >= 0) val = registered;
    }
    const a = Actions.setTile(col, row, val);
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

// ── RECTANGLE TOOL ───────────────────────────────────────────────────────
// Drag a rectangle → fill every cell in the rectangle with the currently-
// selected terrain variant. One release = one composite action, one Undo.
// Live preview drawn by renderer.js reading state.paintRect while dragging.
//
// Behavior:
//   • Selected asset must be a terrain-category tile (env_tile_*). Otherwise
//     the tool no-ops on mousedown (guards Chief against accidentally
//     rectangle-placing decoration assets which don't make sense here).
//   • Empty selection = paints legacy value 1 (art[0] default).
//   • Only cells that CHANGE value are recorded, so a rect over
//     already-matching cells is a no-op undo entry.
export const rectTool = {
  name:   'rect',
  cursor: 'crosshair',
  _startCell: null,   // {col, row}
  _endCell:   null,

  onMouseDown(evt, canvas) {
    if (evt.button !== 0) return;
    // Only accept terrain OR empty selection. Non-terrain selection: no-op.
    const asset = state.selectedAsset;
    if (asset && !isTerrainCategory(asset.category)) return;
    const t = tileUnderMouse(evt, canvas);
    this._startCell = { col: t.col, row: t.row };
    this._endCell   = { col: t.col, row: t.row };
    // Publish preview for renderer.
    state.paintRect = {
      active: true,
      startCol: t.col, startRow: t.row,
      endCol:   t.col, endRow:   t.row,
    };
    notify();
  },

  onMouseMove(evt, canvas) {
    if (!this._startCell) return;
    const t = tileUnderMouse(evt, canvas);
    if (this._endCell.col === t.col && this._endCell.row === t.row) return;
    this._endCell = { col: t.col, row: t.row };
    state.paintRect.endCol = t.col;
    state.paintRect.endRow = t.row;
    notify();
  },

  onMouseUp(_evt, _canvas) {
    if (!this._startCell || !this._endCell) return;
    const L = state.level;
    if (!L) { this._reset(); return; }
    // Resolve the tile value from the selected asset (same rule as _paintCell).
    const asset = state.selectedAsset;
    let val = 1;
    if (asset && isTerrainCategory(asset.category)) {
      const registered = tileValueForAssetId(asset.id);
      if (registered >= 0) val = registered;
    } else if (typeof state.selectedTile === 'number') {
      val = state.selectedTile;
    }
    // Rectangle bounds inclusive, clipped to level grid.
    const rows = Math.floor(L.tiles.length / L.cols);
    const c0 = Math.max(0, Math.min(L.cols - 1, Math.min(this._startCell.col, this._endCell.col)));
    const c1 = Math.max(0, Math.min(L.cols - 1, Math.max(this._startCell.col, this._endCell.col)));
    const r0 = Math.max(0, Math.min(rows   - 1, Math.min(this._startCell.row, this._endCell.row)));
    const r1 = Math.max(0, Math.min(rows   - 1, Math.max(this._startCell.row, this._endCell.row)));
    const actions = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const a = Actions.setTile(c, r, val);
        if (a) { a.forward(); actions.push(a); }
      }
    }
    if (actions.length > 0) {
      History.record(actions.length === 1 ? actions[0] : History.makeComposite(actions, 'rect-paint'));
    }
    this._reset();
  },

  _reset() {
    this._startCell = null;
    this._endCell   = null;
    state.paintRect = null;
    notify();
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
  rect:    rectTool,
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
