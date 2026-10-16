// editor/platform-path.js — AKI_26 1.3: platform path waypoint tool.
//
// Not a TOOLS[] entry. Operates as an overlay mode on top of whatever tool
// is active, the same way state.dragMove layers on top of pointerTool. The
// inspector's "Edit Path" button (main.js) sets state.pathEditTarget to the
// platform being edited; while that is set, canvas mouse events in main.js
// are routed here FIRST, before TOOLS[state.tool] dispatch. Returning false
// lets the normal tool run (so other platforms/objects stay clickable with
// the active tool while a DIFFERENT platform's path isn't being edited —
// though in practice the inspector only offers "Edit Path" for the selected
// platform, so this mostly guards against stray events).
//
// Interactions:
//   - click near an existing waypoint (world-space hit radius)  -> begin drag
//   - click elsewhere on empty canvas                            -> add a new
//     waypoint, grid-snapped (SNAP_GAMEPLAY_DEFAULT -- the same resolution
//     platforms/sources/gates/etc. already snap to), appended to ref.path
//   - drag a waypoint                                            -> live
//     move, committed through the generic Actions.moveObject at mouseup
//     (waypoints are plain {x,y} objects -- moveObject doesn't care what
//     kind of object it moves, so no new action type is needed)
//   - right-click (contextmenu) a waypoint                       -> delete
//     it, through the generic Actions.removeFromArray (same reasoning)
//
// A path needs >= 2 points to mean anything, so deleting below 2 is a no-op;
// the inspector's "Remove Path" button is the way to drop path mode entirely.
//
// Undo/redo: every mutation goes through History.apply/record exactly like
// every other tool, so Ctrl+Z/Ctrl+Y work on waypoint add/move/delete with
// no special-casing in history.js.

import { state, SNAP_GAMEPLAY_DEFAULT, snapPoint, snapDelta, effectiveSnap, notify } from './state.js';
import * as Actions from './actions.js';
import * as History from './history.js';
import { worldUnderMouse } from './tools.js';

const HIT_RADIUS_WORLD = 10; // world px; waypoint dots render at ~5px radius

export function beginPathEdit(ref) {
  if (!ref || !Array.isArray(ref.path)) return;
  state.pathEditTarget = ref;
  state._pathDrag = null;
  notify();
}

export function endPathEdit() {
  state.pathEditTarget = null;
  state._pathDrag = null;
  notify();
}

// Defensive: if the platform being path-edited was deleted (Delete key,
// undo past its creation, etc.) out from under us, drop the dangling
// reference instead of silently eating every future canvas click.
export function isActive() {
  const ref = state.pathEditTarget;
  if (!ref) return false;
  const stillThere = Array.isArray(state.level?.platforms) && state.level.platforms.includes(ref);
  if (!stillThere) { state.pathEditTarget = null; state._pathDrag = null; return false; }
  return true;
}

function hitTestWaypoint(ref, wx, wy) {
  if (!ref || !Array.isArray(ref.path)) return -1;
  let best = -1, bestD = HIT_RADIUS_WORLD;
  for (let i = 0; i < ref.path.length; i++) {
    const p = ref.path[i];
    const d = Math.hypot(p.x - wx, p.y - wy);
    if (d <= bestD) { bestD = d; best = i; }
  }
  return best;
}

// Exported for tests -- avoids needing a real canvas/MouseEvent to verify hit-testing.
export const __test = { hitTestWaypoint };

export function handleMouseDown(evt, canvas) {
  const ref = state.pathEditTarget;
  if (!ref || !Array.isArray(ref.path) || evt.button !== 0) return false;
  const w = worldUnderMouse(evt, canvas);
  const idx = hitTestWaypoint(ref, w.x, w.y);
  if (idx >= 0) {
    const p = ref.path[idx];
    state._pathDrag = { point: p, origX: p.x, origY: p.y, startW: w };
    return true;
  }
  // Empty space while editing this platform's path -> add a waypoint.
  const snapped = snapPoint(w.x, w.y, SNAP_GAMEPLAY_DEFAULT);
  const wp = { x: snapped.x, y: snapped.y };
  const action = Actions.addToArray(ref.path, wp, 'add_waypoint');
  if (action) History.apply(action);
  return true;
}

export function handleMouseMove(evt, canvas) {
  const drag = state._pathDrag;
  if (!drag) return false;
  const w = worldUnderMouse(evt, canvas);
  const { dx, dy } = snapDelta(w.x - drag.startW.x, w.y - drag.startW.y, effectiveSnap(SNAP_GAMEPLAY_DEFAULT));
  drag.point.x = drag.origX + dx;
  drag.point.y = drag.origY + dy;
  notify();
  return true;
}

export function handleMouseUp() {
  const drag = state._pathDrag;
  if (!drag) return false;
  const dx = drag.point.x - drag.origX;
  const dy = drag.point.y - drag.origY;
  if (dx !== 0 || dy !== 0) {
    History.record(Actions.moveObject(drag.point, dx, dy));
  }
  state._pathDrag = null;
  return true;
}

export function handleContextMenu(evt, canvas) {
  const ref = state.pathEditTarget;
  if (!ref || !Array.isArray(ref.path)) return false;
  evt.preventDefault();
  const w = worldUnderMouse(evt, canvas);
  const idx = hitTestWaypoint(ref, w.x, w.y);
  if (idx < 0) return true;
  if (ref.path.length <= 2) return true; // keep at least 2 points -- use Remove Path instead
  const action = Actions.removeFromArray(ref.path, ref.path[idx], 'remove_waypoint');
  if (action) History.apply(action);
  return true;
}
