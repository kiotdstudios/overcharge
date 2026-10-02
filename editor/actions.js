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

import { state, notify, levelRows, TILE_VARIANT_BASE, tileIsSolid, TILE_SIZE, MAX_LEVEL_ROWS } from './state.js';

// ── SetTileAction ────────────────────────────────────────────────────────
// Sets a single tile (col,row) to `newVal`, remembers `oldVal` for undo.
export function setTile(col, row, newVal) {
  const L = state.level;
  if (!L) return null;
  const rows = levelRows();
  if (col < 0 || col >= L.cols || row < 0 || row >= rows) return null;
  // 3-9 are RESERVED — never let the editor emit them.
  if (newVal >= 3 && newVal < TILE_VARIANT_BASE) {
    console.warn(`[editor] setTile rejected: value ${newVal} is RESERVED (3–9). Use 0=empty, 1/2=legacy, >=10=variant.`);
    return null;
  }
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

// ── AddToArrayAction (generic) ──────────────────────────────────────────
// Appends an object to a specific level array (L.enemies, L.switches, etc.).
// Mirrors removeFromArray so undo/redo works symmetrically.
export function addToArray(arr, obj, label = 'add_to_array') {
  if (!Array.isArray(arr)) return null;
  return {
    type: label,
    obj,
    forward()  { arr.push(obj); notify(); },
    inverse()  {
      const i = arr.indexOf(obj);
      if (i >= 0) arr.splice(i, 1);
      notify();
    },
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
//
// A12: enemies carry patrolLeft/patrolRight as absolute world X. A drag only
// moved obj.x during live preview; patrol was left behind. We fix it here at
// commit time so the undo/redo record is always consistent:
//   - capture old patrol from obj right now (still at pre-drag value)
//   - immediately apply translated+clamped patrol so the saved level is correct
//   - forward() restores the translated value (for redo after an undo)
//   - inverse() restores the original value (for undo)
export function moveObject(obj, dx, dy) {
  if (!obj || (dx === 0 && dy === 0)) return null;
  // Patrol fix: only enemies have these fields; dx=0 means no horizontal move.
  const hasPatrol = dx !== 0 && obj.patrolLeft != null && obj.patrolRight != null;
  const oldPL = hasPatrol ? obj.patrolLeft  : undefined;
  const oldPR = hasPatrol ? obj.patrolRight : undefined;
  let   newPL, newPR;
  if (hasPatrol) {
    const maxX = (state.level ? state.level.cols * 32 : Infinity);
    newPL = Math.max(0, Math.min(maxX, oldPL + dx));
    newPR = Math.max(0, Math.min(maxX, oldPR + dx));
    // Apply immediately — the live drag already moved obj.x but left patrol
    // behind. Set patrol to the correct final position so the level file is
    // right as soon as the action is recorded.
    obj.patrolLeft  = newPL;
    obj.patrolRight = newPR;
  }
  return {
    type: 'move_object',
    obj, dx, dy,
    forward() {
      obj.x += dx; obj.y += dy;
      if (hasPatrol) { obj.patrolLeft = newPL; obj.patrolRight = newPR; }
      notify();
    },
    inverse() {
      obj.x -= dx; obj.y -= dy;
      if (hasPatrol) { obj.patrolLeft = oldPL; obj.patrolRight = oldPR; }
      notify();
    },
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

// ── FlipTilesAction / FlipDecorationsAction ──────────────────────────────
// Chief 2026-09-26: "add a flip button next to rotate on the level editor; i wanna
// fllip the orientation of the tile".
// Horizontal mirror, stored per-cell in L.tileFlips (parallel to L.tiles, 1 = mirrored)
// and per-decoration as d.flipX. A TOGGLE, not an accumulator: flipping twice returns
// the original, so the action records the exact prior value for a clean undo.
// Purely visual — collision is untouched, same contract as rotation.
//
// Flip covers DECORATIONS as well as tiles because the button sits beside Rot, and Rot
// already handles both. A Flip that silently did nothing to a selected prop would read
// as broken the first time Chief tried it.
export function flipTiles(cells) {
  const L = state.level;
  if (!L || !cells || cells.length === 0) return null;
  const rows = levelRows();
  if (!Array.isArray(L.tileFlips) || L.tileFlips.length !== L.tiles.length) {
    L.tileFlips = new Array(L.tiles.length).fill(0);
  }
  const changes = [];
  for (const { col, row } of cells) {
    if (col < 0 || col >= L.cols || row < 0 || row >= rows) continue;
    const idx = row * L.cols + col;
    // Flipping an EMPTY cell is a no-op, matching rotateTiles. Otherwise a marquee over
    // blank sky would fill tileFlips with entries for cells that draw nothing.
    if (L.tiles[idx] === 0) continue;
    const prior = L.tileFlips[idx] ? 1 : 0;
    changes.push({ idx, prior, next: prior ? 0 : 1 });
  }
  if (changes.length === 0) return null;
  return {
    type: 'flip_tiles',
    forward() { for (const c of changes) L.tileFlips[c.idx] = c.next; notify(); },
    inverse() { for (const c of changes) L.tileFlips[c.idx] = c.prior; notify(); },
  };
}

export function flipDecorations(decs) {
  if (!decs || decs.length === 0) return null;
  // No bbox swap here, unlike rotation: a horizontal mirror keeps width and height, so
  // x/y/w/h are all unchanged and only the render transform differs.
  const changes = decs.map(d => ({ ref: d, prior: !!d.flipX }));
  return {
    type: 'flip_decorations',
    forward() { for (const c of changes) c.ref.flipX = !c.prior; state.dirty = true; notify(); },
    inverse() { for (const c of changes) c.ref.flipX = c.prior;  state.dirty = true; notify(); },
  };
}

// ── SetPlayerStartAction ─────────────────────────────────────────────────
// Moves (or creates) the player spawn point. playerStart is a unique {x,y}
// field on the level root, not an array entry. Records the old position so
// Ctrl+Z restores exactly where the spawn was before the click.
export function setPlayerStart(level, x, y) {
  if (!level) return null;
  const old = level.playerStart ? { ...level.playerStart } : { x: 0, y: 0 };
  if (old.x === x && old.y === y) return null;
  return {
    type: 'set_player_start',
    forward() { level.playerStart = { x, y }; notify(); },
    inverse() { level.playerStart = old; notify(); },
  };
}

// ── SetBackgroundOffsetAction ───────────────────────────────────────────────
// AKI_18: vertical pixel offset for one named background parallax layer
// ('sky' | 'mid' | 'track' | 'front' — see src_scroll/background.js). Stored
// in level.backgroundOffsets, an optional object; levels without it (or
// without a given key) default to 0, so pre-existing levels render exactly
// as before. Negative moves the layer UP (documented in the Builder UI, not
// just here) because screen-space Y grows downward.
export function setBackgroundOffset(level, key, value) {
  if (!level) return null;
  const hadOffsets = Object.prototype.hasOwnProperty.call(level, 'backgroundOffsets');
  const hadKey = !!level.backgroundOffsets && Object.prototype.hasOwnProperty.call(level.backgroundOffsets, key);
  const old = (level.backgroundOffsets && level.backgroundOffsets[key]) || 0;
  if (old === value) return null;
  return {
    type: 'set_background_offset',
    forward() {
      if (value === 0) {
        if (level.backgroundOffsets) {
          delete level.backgroundOffsets[key];
          if (Object.keys(level.backgroundOffsets).length === 0) delete level.backgroundOffsets;
        }
      } else {
        if (!level.backgroundOffsets) level.backgroundOffsets = {};
        level.backgroundOffsets[key] = value;
      }
      notify();
    },
    inverse() {
      if (!hadOffsets) delete level.backgroundOffsets;
      else {
        if (!level.backgroundOffsets) level.backgroundOffsets = {};
        if (hadKey) level.backgroundOffsets[key] = old;
        else delete level.backgroundOffsets[key];
      }
      notify();
    },
  };
}

// ── SetBackgroundLayerHiddenAction ──────────────────────────────────────────
// Per-layer visibility toggle beside the vertical-offset controls (same 4
// named layers as BG_OFFSET_LAYERS). Stored in level.backgroundLayersHidden,
// an optional object; missing/absent keys default to visible (false), so
// pre-existing levels keep showing every layer exactly as before. Hiding
// 'track' also hides the train canvas (src_scroll/background.js) — they are
// one visual unit, same coupling AKI_18 used for the offset.
export function setBackgroundLayerHidden(level, key, hidden) {
  if (!level) return null;
  const hadMap = Object.prototype.hasOwnProperty.call(level, 'backgroundLayersHidden');
  const hadKey = !!level.backgroundLayersHidden && Object.prototype.hasOwnProperty.call(level.backgroundLayersHidden, key);
  const old = !!(level.backgroundLayersHidden && level.backgroundLayersHidden[key]);
  const next = !!hidden;
  if (old === next) return null;
  return {
    type: 'set_background_layer_hidden',
    forward() {
      if (!next) {
        if (level.backgroundLayersHidden) {
          delete level.backgroundLayersHidden[key];
          if (Object.keys(level.backgroundLayersHidden).length === 0) delete level.backgroundLayersHidden;
        }
      } else {
        if (!level.backgroundLayersHidden) level.backgroundLayersHidden = {};
        level.backgroundLayersHidden[key] = true;
      }
      notify();
    },
    inverse() {
      if (!hadMap) delete level.backgroundLayersHidden;
      else {
        if (!level.backgroundLayersHidden) level.backgroundLayersHidden = {};
        if (hadKey) level.backgroundLayersHidden[key] = old;
        else delete level.backgroundLayersHidden[key];
      }
      notify();
    },
  };
}

// ── FIX ALL GRAMMAR: DELETED — CHIEF RULING 2026-09-19 04:37 ────────────────
// fixAllGrammar() swept the level promoting fill-on-top to a hash-chosen edge and
// demoting buried edges back to fill. The rule it enforced was a misreading of
// Chief's intent, so the action and its FIX ALL button are gone rather than left as
// a trap that silently retiles a hand-authored level.


// ── AddSectionAboveAction / AddSectionRightAction ───────────────────────
// ORCHA_VERTICAL_V1_SEMANTICS + AKI_NEXT_TASK_VERTICALITY: per-level height
// is derived (tiles.length / cols), not stored. ABOVE prepends empty rows
// and shifts every world-Y coordinate on the level by addedRows*TILE, so the
// existing layout is preserved relative to its own terrain — the added rows
// are new empty space above it. RIGHT appends empty columns to every grid
// row without touching any world coordinate, since width has always been
// per-level (level.js:15 `this.cols = def.cols || COLS`) and needs no shift.
//
// Both actions snapshot the ENTIRE level object (deep clone via JSON
// round-trip — the level is plain JSON-safe data, no functions/Dates/Maps)
// before mutating, and inverse() restores that exact snapshot. This is
// deliberately simpler than reversing each field by hand: the brief requires
// "restores dimensions, every coordinate and every aligned array exactly",
// and a whole-level snapshot is byte-for-byte over engineering a symmetric
// inverse for every current AND future coordinate-bearing array.

function _cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function _restoreLevel(level, snapshot) {
  // Replace every enumerable own key so removed/added keys round-trip too,
  // without swapping the object identity other modules may have captured.
  for (const k of Object.keys(level)) delete level[k];
  Object.assign(level, snapshot);
}

// addedRows > 0. Prepends addedRows*cols empty (0) cells to tiles (and, if
// present, tileRotations/tileFlips — kept aligned per Chief's ruling that a
// tiles-only shift silently corrupts levels that carry rotations), then
// shifts every authored world-Y field by addedRows*TILE_SIZE: playerStart,
// decorations, sources, gates, switches, checkpoints, platforms (y only —
// x1/x2 are horizontal and untouched), enemies, crates, chests. Rejects if the
// resulting height would exceed MAX_LEVEL_ROWS (mirrors src_scroll's
// MAX_ROWS cap — the Builder must not silently raise it).
export function addSectionAbove(level, addedRows) {
  if (!level || !Number.isFinite(addedRows) || addedRows <= 0) return null;
  const curRows = Math.floor(level.tiles.length / level.cols);
  const newRows = curRows + addedRows;
  if (newRows > MAX_LEVEL_ROWS) {
    console.warn(`[editor] addSectionAbove rejected: ${newRows} rows exceeds MAX_LEVEL_ROWS (${MAX_LEVEL_ROWS}).`);
    return null;
  }
  const before = _cloneLevel(level);
  const dy = addedRows * TILE_SIZE;
  const padCells = addedRows * level.cols;

  return {
    type: 'add_section_above',
    addedRows,
    forward() {
      const pad = new Array(padCells).fill(0);
      level.tiles = pad.concat(level.tiles);
      if (Array.isArray(level.tileRotations) && level.tileRotations.length === before.tiles.length) {
        level.tileRotations = new Array(padCells).fill(0).concat(level.tileRotations);
      }
      if (Array.isArray(level.tileFlips) && level.tileFlips.length === before.tiles.length) {
        level.tileFlips = new Array(padCells).fill(0).concat(level.tileFlips);
      }
      if (level.playerStart) level.playerStart.y += dy;
      for (const d of level.decorations  || []) d.y += dy;
      for (const s of level.sources      || []) s.y += dy;
      for (const g of level.gates        || []) g.y += dy;
      for (const sw of level.switches    || []) sw.y += dy;
      for (const c of level.checkpoints  || []) c.y += dy;
      for (const p of level.platforms    || []) p.y += dy;
      for (const e of level.enemies      || []) e.y += dy;
      for (const cr of level.crates      || []) cr.y += dy;
      for (const ch of level.chests      || []) ch.y += dy;
      notify();
    },
    inverse() {
      _restoreLevel(level, before);
      notify();
    },
  };
}

// addedCols > 0. Re-strides every row of tiles/tileRotations/tileFlips to
// append addedCols empty cells on the right of EACH row (not a flat
// append, which would shift every later row's cells left by addedCols and
// corrupt the whole map — re-striding per row is the only correct form).
// No world coordinate changes: width has always been per-level, existing
// x-values stay exactly where they were authored.
export function addSectionRight(level, addedCols) {
  if (!level || !Number.isFinite(addedCols) || addedCols <= 0) return null;
  const before = _cloneLevel(level);
  const oldCols = level.cols;
  const rows = Math.floor(level.tiles.length / oldCols);
  const newCols = oldCols + addedCols;

  function restride(flatOld) {
    const out = new Array(rows * newCols).fill(0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < oldCols; c++) {
        out[r * newCols + c] = flatOld[r * oldCols + c];
      }
    }
    return out;
  }

  return {
    type: 'add_section_right',
    addedCols,
    forward() {
      level.tiles = restride(before.tiles);
      if (Array.isArray(level.tileRotations) && level.tileRotations.length === before.tiles.length) {
        level.tileRotations = restride(before.tileRotations);
      }
      if (Array.isArray(level.tileFlips) && level.tileFlips.length === before.tiles.length) {
        level.tileFlips = restride(before.tileFlips);
      }
      level.cols = newCols;
      notify();
    },
    inverse() {
      _restoreLevel(level, before);
      notify();
    },
  };
}

// Section removal is deliberately limited to empty outer grid space. A
// populated strip must be cleared or moved explicitly before it can be cut;
// this prevents a mistaken count from deleting authored terrain or objects.
const SECTION_OBJECT_LISTS = [
  'decorations', 'sources', 'gates', 'switches', 'checkpoints',
  'platforms', 'enemies', 'crates', 'chests',
];

function _sectionGridIssue(level, amount) {
  if (!level || !Number.isInteger(amount) || amount <= 0) return 'Enter a whole number greater than zero.';
  if (!Number.isInteger(level.cols) || level.cols <= 0 ||
      !Array.isArray(level.tiles) || level.tiles.length === 0 ||
      level.tiles.length % level.cols !== 0) return 'The level grid is malformed.';
  for (const key of ['tileRotations', 'tileFlips']) {
    if (level[key] != null && (!Array.isArray(level[key]) || level[key].length !== level.tiles.length)) {
      return `${key} is not aligned with the tile grid.`;
    }
  }
  return null;
}

function _sectionObjects(level) {
  const objects = level.playerStart ? [['player start', level.playerStart]] : [];
  for (const key of SECTION_OBJECT_LISTS) {
    const name = key.replace(/ies$/, 'y').replace(/s$/, '');
    for (const obj of level[key] || []) objects.push([name, obj]);
  }
  return objects;
}

export function removeSectionAboveIssue(level, removedRows) {
  const issue = _sectionGridIssue(level, removedRows);
  if (issue) return issue;
  const rows = level.tiles.length / level.cols;
  if (removedRows >= rows) return 'Keep at least one row in the level.';
  const cells = removedRows * level.cols;
  for (const key of ['tiles', 'tileRotations', 'tileFlips']) {
    if (level[key] && level[key].slice(0, cells).some(v => v !== 0)) {
      return `The top ${removedRows} rows contain ${key === 'tiles' ? 'tiles' : key}. Clear them first.`;
    }
  }
  const cutoff = removedRows * TILE_SIZE;
  for (const [name, obj] of _sectionObjects(level)) {
    if (!Number.isFinite(obj.y) || obj.y < cutoff) return `A ${name} is in the top section. Move it first.`;
  }
  return null;
}

export function removeSectionAbove(level, removedRows) {
  if (removeSectionAboveIssue(level, removedRows)) return null;
  const before = _cloneLevel(level);
  const cells = removedRows * level.cols;
  const dy = removedRows * TILE_SIZE;
  return {
    type: 'remove_section_above', removedRows,
    forward() {
      _restoreLevel(level, _cloneLevel(before));
      level.tiles = level.tiles.slice(cells);
      if (level.tileRotations) level.tileRotations = level.tileRotations.slice(cells);
      if (level.tileFlips) level.tileFlips = level.tileFlips.slice(cells);
      if (level.playerStart) level.playerStart.y -= dy;
      for (const key of SECTION_OBJECT_LISTS) {
        for (const obj of level[key] || []) obj.y -= dy;
      }
      notify();
    },
    inverse() { _restoreLevel(level, _cloneLevel(before)); notify(); },
  };
}

export function removeSectionRightIssue(level, removedCols) {
  const issue = _sectionGridIssue(level, removedCols);
  if (issue) return issue;
  if (removedCols >= level.cols) return 'Keep at least one column in the level.';
  const newCols = level.cols - removedCols;
  const rows = level.tiles.length / level.cols;
  for (const key of ['tiles', 'tileRotations', 'tileFlips']) {
    if (!level[key]) continue;
    for (let row = 0; row < rows; row++) {
      if (level[key].slice(row * level.cols + newCols, (row + 1) * level.cols).some(v => v !== 0)) {
        return `The right ${removedCols} columns contain ${key === 'tiles' ? 'tiles' : key}. Clear them first.`;
      }
    }
  }
  const cutoff = newCols * TILE_SIZE;
  for (const [name, obj] of _sectionObjects(level)) {
    const anchorX = name === 'platform' && !Number.isFinite(obj.x) ? obj.x1 : obj.x;
    if (!Number.isFinite(anchorX) || anchorX >= cutoff) return `A ${name} is in the right section. Move it first.`;
    if (Number.isFinite(obj.w) && obj.w > 0 && anchorX + obj.w > cutoff) {
      return `A ${name} overlaps the right section. Move or resize it first.`;
    }
    if (name === 'platform' && (obj.x1 >= cutoff || obj.x2 > cutoff)) return 'A platform path crosses the right section. Move it first.';
    if (name === 'enemy' && obj.patrolRight > cutoff) return 'An enemy patrol crosses the right section. Move it first.';
  }
  return null;
}

export function removeSectionRight(level, removedCols) {
  if (removeSectionRightIssue(level, removedCols)) return null;
  const before = _cloneLevel(level);
  const oldCols = level.cols;
  const newCols = oldCols - removedCols;
  const rows = level.tiles.length / oldCols;
  function trim(flat) {
    const out = [];
    for (let row = 0; row < rows; row++) out.push(...flat.slice(row * oldCols, row * oldCols + newCols));
    return out;
  }
  return {
    type: 'remove_section_right', removedCols,
    forward() {
      _restoreLevel(level, _cloneLevel(before));
      level.tiles = trim(before.tiles);
      if (before.tileRotations) level.tileRotations = trim(before.tileRotations);
      if (before.tileFlips) level.tileFlips = trim(before.tileFlips);
      level.cols = newCols;
      notify();
    },
    inverse() { _restoreLevel(level, _cloneLevel(before)); notify(); },
  };
}
