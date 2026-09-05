// clipboard.js — copy / cut / paste / duplicate for the current selection.
//
// The clipboard preserves relative spacing by storing an ANCHOR (the top-left
// of the selection bounding box in world coords) and then storing every
// selected item's OFFSET from that anchor. On paste, we choose a new anchor
// (either fixed offset from original or cursor location) and lay everything
// out relative to that.
//
// Undo/redo: paste and duplicate go through history as composite actions so
// Ctrl+Z reverts the whole paste in one press.

import { state, TILE_SIZE, levelRows, snapPoint, lcmSnap, SNAP_DECORATION_DEFAULT } from './state.js';
import {
  selectedDecorations, selectedTiles, clearSelection, selectDecoration, selectTile,
  selectedSources, selectedGates, selectedSwitches, selectedCheckpoints, selectedEnemies,
} from './selection.js';
import * as Actions from './actions.js';
import * as History from './history.js';
import { magneticPasteAnchor } from './tools.js';

// Paste offset in tiles when no cursor is given. 1 tile down+right — enough
// that the pasted content is immediately visible next to the original.
const PASTE_TILE_OFFSET = 1;

// ── Copy ─────────────────────────────────────────────────────────────────
// Snapshot the current selection into state.clipboard. Does not mutate level.
export function copy() {
  const decs  = selectedDecorations();
  const tiles = selectedTiles();
  if (decs.length === 0 && tiles.length === 0) { state.clipboard = null; return false; }

  // Compute anchor = top-left of bounding box across both kinds.
  let minX = Infinity, minY = Infinity;
  for (const d of decs) { if (d.x < minX) minX = d.x; if (d.y < minY) minY = d.y; }
  for (const t of tiles) {
    if (t.col * TILE_SIZE < minX) minX = t.col * TILE_SIZE;
    if (t.row * TILE_SIZE < minY) minY = t.row * TILE_SIZE;
  }

  state.clipboard = {
    // Decorations stored as clones with offset-from-anchor coords.
    decorations: decs.map(d => ({
      offX: d.x - minX, offY: d.y - minY,
      src: d.src, w: d.w, h: d.h,
      // Preserve per-item snap so pasted items retain their placement grid.
      snap: (typeof d.snap === 'number') ? d.snap : undefined,
      // Preserve family tag so pasted modular pieces stay magnetically
      // compatible with their peers.
      family: d.family || null,
    })),
    // Tiles stored with column/row offsets AND the current value at that cell.
    tiles: tiles.map(t => {
      const val = state.level ? state.level.tiles[t.row * state.level.cols + t.col] : 0;
      return {
        offCol: t.col - Math.floor(minX / TILE_SIZE),
        offRow: t.row - Math.floor(minY / TILE_SIZE),
        val,
      };
    }),
    anchorWorld: { x: minX, y: minY },
  };
  return true;
}

// ── Cut ──────────────────────────────────────────────────────────────────
// Copy the selection, then delete it as a composite undoable action.
export function cut() {
  if (!copy()) return false;
  return deleteSelection('cut');
}

// ── Delete selection ─────────────────────────────────────────────────────
// Composite action: remove every selected decoration + gameplay object +
// zero every selected tile. PLAYERSTART is not deletable — every level needs
// a spawn, so Delete silently skips it (still deletes anything else selected).
export function deleteSelection(label = 'delete') {
  const L    = state.level;
  const decs = selectedDecorations();
  const tiles= selectedTiles();
  if (!L && decs.length === 0 && tiles.length === 0) return false;

  const actions = [];
  // Decorations
  for (const d of decs) {
    const a = Actions.removeDecoration(d);
    if (a) actions.push(a);
  }
  // Gameplay object arrays — same pattern for each. Uses generic removeFromArray.
  for (const [arrName, list] of [
    ['sources',     selectedSources()],
    ['gates',       selectedGates()],
    ['switches',    selectedSwitches()],
    ['checkpoints', selectedCheckpoints()],
    ['enemies',     selectedEnemies()],
  ]) {
    const arr = L && Array.isArray(L[arrName]) ? L[arrName] : null;
    if (!arr) continue;
    for (const obj of list) {
      const a = Actions.removeFromArray(arr, obj, 'remove_' + arrName);
      if (a) actions.push(a);
    }
  }
  // Tiles
  for (const t of tiles) {
    const a = Actions.setTile(t.col, t.row, 0);
    if (a) actions.push(a);
  }
  // playerStart intentionally NOT deletable — silently skipped.

  if (actions.length === 0) return false;
  clearSelection();
  History.apply(History.makeComposite(actions, label));
  return true;
}

// ── Paste ────────────────────────────────────────────────────────────────
// Paste the clipboard into the level. If `targetWorld` is given, use it as
// the new anchor. Otherwise offset by PASTE_TILE_OFFSET tiles down+right.
// After paste, the newly-pasted items become the selection.
export function paste(targetWorld = null) {
  const clip = state.clipboard;
  if (!clip) return false;

  // Determine paste-anchor snap resolution. Each pasted item's final position
  // is anchor + itemOffset. For that to be a multiple of the item's own snap
  // (its offset was already a multiple of its snap when copied), the anchor
  // must be a multiple of every item's snap → LCM. Tiles impose TILE_SIZE.
  const snaps = clip.decorations.map(c =>
    (typeof c.snap === 'number') ? c.snap : SNAP_DECORATION_DEFAULT
  );
  if (clip.tiles && clip.tiles.length > 0) snaps.push(TILE_SIZE);
  const pasteSnap = lcmSnap(snaps);

  let anchor = targetWorld
    ? snapPoint(targetWorld.x, targetWorld.y, pasteSnap)
    : { x: clip.anchorWorld.x + PASTE_TILE_OFFSET * TILE_SIZE,
        y: clip.anchorWorld.y + PASTE_TILE_OFFSET * TILE_SIZE };

  // ── Paste-anchor magnetic snap ─────────────────────────────────────
  // If the clipboard contains any modular-family pieces, snap the paste
  // anchor so the leftmost family piece abuts a sibling on the level.
  // The whole clipboard shifts by the same (dx, dy) so relative spacing
  // is preserved. Runs before decoration actions are built.
  if (state.magneticSnap && clip.decorations.length > 0) {
    const familyDecs = clip.decorations.filter(c => c.family);
    if (familyDecs.length > 0) {
      familyDecs.sort((a, b) => (a.offX - b.offX) || (a.offY - b.offY));
      const leader = familyDecs[0];
      const { pos: snappedAnchor, indicator } = magneticPasteAnchor(
        anchor, leader.offX, leader.offY, leader.w, leader.h, leader.family);
      if (snappedAnchor.x !== anchor.x || snappedAnchor.y !== anchor.y) {
        anchor = snappedAnchor;
      }
      if (indicator) {
        state.snapIndicator = indicator;
        setTimeout(() => {
          if (state.snapIndicator === indicator) state.snapIndicator = null;
        }, 500);
      }
    }
  }

  const actions = [];
  const newDecs = [];
  const newTiles = [];

  // Build decorations, wrapping each in an add_decoration action.
  // Preserve the clipped item's snap so its own drag-move stays consistent.
  for (const c of clip.decorations) {
    const dec = {
      src: c.src,
      x: anchor.x + c.offX, y: anchor.y + c.offY,
      w: c.w, h: c.h,
      snap: (typeof c.snap === 'number') ? c.snap : SNAP_DECORATION_DEFAULT,
    };
    if (c.family) dec.family = c.family;
    const a = Actions.addDecoration(dec);
    if (a) { actions.push(a); newDecs.push(dec); }
  }
  // Build tiles: paste as set_tile actions (skip if trying to paste at same
  // cell that already has same value — actions.setTile handles that).
  const anchorCol = Math.floor(anchor.x / TILE_SIZE);
  const anchorRow = Math.floor(anchor.y / TILE_SIZE);
  for (const t of clip.tiles) {
    const col = anchorCol + t.offCol;
    const row = anchorRow + t.offRow;
    const a = Actions.setTile(col, row, t.val);
    if (a) { actions.push(a); newTiles.push({ col, row }); }
  }

  if (actions.length === 0) return false;
  clearSelection();
  History.apply(History.makeComposite(actions, 'paste'));
  // Reselect the newly pasted items so subsequent Ctrl+V, drag, or delete
  // targets them.
  for (const d of newDecs)  selectDecoration(d, true);
  for (const t of newTiles) selectTile(t.col, t.row, true);
  return true;
}

// ── Duplicate ────────────────────────────────────────────────────────────
// Copy + paste in one shot (offset by PASTE_TILE_OFFSET). Ctrl+D convention.
export function duplicate() {
  if (!copy()) return false;
  return paste();   // uses default offset
}
