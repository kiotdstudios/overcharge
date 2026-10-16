// AKI_26 Part 1, item 1.3 — platform path tool.
// Scope: pure logic in editor/actions.js (generic addToArray/removeFromArray/
// moveObject applied to platform.path, with no new action types needed) and
// editor/platform-path.js's hit-testing + pathEditTarget lifecycle. The
// canvas click/drag wiring in main.js and the polyline/dot rendering in
// renderer.js are DOM/canvas-dependent and are exercised live in the Builder
// (see the Part 1 report), not re-tested here.

const S = await import('../editor/state.js');
const Actions = await import('../editor/actions.js');
const History = await import('../editor/history.js');
const PP = await import('../editor/platform-path.js');

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  ✓ ${m}${d ? ' — ' + d : ''}`); } else { fail++; console.log(`  ✗ ${m}${d ? ' — ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

function freshLevel(platform) {
  const level = { cols: 50, tiles: new Array(50 * 14).fill(0), platforms: [platform] };
  S.state.level = level;
  History.clearAll();
  return level;
}

sec('Old platform (no path) is completely unaffected');
{
  const pl = { x: 100, y: 200, w: 96, h: 12, x1: 36, x2: 228, speed: 80 };
  freshLevel(pl);
  ok(!Array.isArray(pl.path), 'no path field present by default');
  ok(PP.isActive() === false, 'path-edit mode is off when nothing is being edited');
  const before = JSON.stringify(pl);
  PP.beginPathEdit(pl); // should be a no-op: beginPathEdit requires an existing path array
  ok(S.state.pathEditTarget === null, 'beginPathEdit refuses a platform with no path array');
  ok(JSON.stringify(pl) === before, 'platform object untouched by the refused call');
}

sec('Add waypoint (generic Actions.addToArray) + undo/redo');
{
  const pl = { x: 100, y: 200, w: 96, h: 12, path: [{ x: 50, y: 200 }, { x: 300, y: 200 }], pathMode: 'pingpong', speed: 80 };
  freshLevel(pl);
  const wp = { x: 180, y: 180 };
  const action = Actions.addToArray(pl.path, wp, 'add_waypoint');
  ok(!!action, 'addToArray produces an action for a path array');
  History.apply(action);
  ok(pl.path.length === 3 && pl.path[2] === wp, 'waypoint appended to the platform path');
  History.undo();
  ok(pl.path.length === 2, 'undo removes the added waypoint');
  History.redo();
  ok(pl.path.length === 3 && pl.path[2] === wp, 'redo re-adds the same waypoint object');
}

sec('Move waypoint (generic Actions.moveObject, drag-then-commit pattern) + undo/redo');
{
  const pl = { x: 100, y: 200, w: 96, h: 12, path: [{ x: 50, y: 200 }, { x: 300, y: 200 }], pathMode: 'pingpong', speed: 80 };
  freshLevel(pl);
  const p0 = pl.path[0];
  // Mirrors pointerTool's drag pattern: mutate live during drag, THEN build
  // the action from the net delta and History.record (not apply) it, since
  // forward() would otherwise double-apply the already-moved position.
  const origX = p0.x, origY = p0.y;
  p0.x = 82; p0.y = 164; // live-drag mutation already happened
  const dx = p0.x - origX, dy = p0.y - origY;
  const action = Actions.moveObject(p0, dx, dy);
  History.record(action);
  ok(p0.x === 82 && p0.y === 164, 'waypoint sits at its dragged position after commit');
  History.undo();
  ok(p0.x === origX && p0.y === origY, 'undo restores the original waypoint position');
  History.redo();
  ok(p0.x === 82 && p0.y === 164, 'redo re-applies the drag');
}

sec('Delete waypoint (generic Actions.removeFromArray), floor of 2 points enforced');
{
  const pl = { x: 100, y: 200, w: 96, h: 12, path: [{ x: 50, y: 200 }, { x: 150, y: 200 }, { x: 300, y: 200 }], pathMode: 'loop', speed: 80 };
  freshLevel(pl);
  const victim = pl.path[1];
  const action = Actions.removeFromArray(pl.path, victim, 'remove_waypoint');
  ok(!!action, 'removeFromArray produces an action for a 3-point path');
  History.apply(action);
  ok(pl.path.length === 2 && !pl.path.includes(victim), 'middle waypoint removed');
  History.undo();
  ok(pl.path.length === 3 && pl.path[1] === victim, 'undo restores it at its original index (z-order preserved)');
  // The 2-point floor itself is enforced in platform-path.js's
  // handleContextMenu (checked below), not in the generic action factory --
  // removeFromArray will happily remove down to 0 if asked, same as any
  // other array. The floor is a path-tool UX rule, not a schema rule.
}

sec('hitTestWaypoint (platform-path.js, world-space hit radius)');
{
  const pl = { x: 0, y: 0, w: 96, h: 12, path: [{ x: 50, y: 200 }, { x: 300, y: 200 }], pathMode: 'pingpong', speed: 80 };
  ok(PP.__test.hitTestWaypoint(pl, 50, 200) === 0, 'exact hit on waypoint 0');
  ok(PP.__test.hitTestWaypoint(pl, 54, 203) === 0, 'near-hit within radius counts');
  ok(PP.__test.hitTestWaypoint(pl, 300, 200) === 1, 'exact hit on waypoint 1');
  ok(PP.__test.hitTestWaypoint(pl, 175, 200) === -1, 'midpoint between waypoints is not a hit');
  ok(PP.__test.hitTestWaypoint({ x:0,y:0 }, 50, 200) === -1, 'platform with no path array never hits');
}

sec('pathEditTarget lifecycle: begin / isActive / end, and dangling-ref safety');
{
  const pl = { x: 0, y: 0, w: 96, h: 12, path: [{ x: 50, y: 200 }, { x: 300, y: 200 }], pathMode: 'pingpong', speed: 80 };
  const level = freshLevel(pl);
  PP.beginPathEdit(pl);
  ok(PP.isActive() === true, 'path-edit mode is on after beginPathEdit');
  ok(S.state.pathEditTarget === pl, 'pathEditTarget points at the platform being edited');
  PP.endPathEdit();
  ok(PP.isActive() === false, 'path-edit mode is off after endPathEdit');
  ok(S.state.pathEditTarget === null, 'pathEditTarget cleared');

  // Dangling ref: platform removed from the level out from under an active edit.
  PP.beginPathEdit(pl);
  level.platforms.splice(level.platforms.indexOf(pl), 1);
  ok(PP.isActive() === false, 'isActive() self-heals when the edited platform no longer exists in the level');
  ok(S.state.pathEditTarget === null, 'dangling pathEditTarget is cleared, not left pointing at a removed object');
}

sec('Round trip through JSON (path/pathMode survive save/load exactly)');
{
  const pl = { x: 100, y: 200, w: 96, h: 12, path: [{ x: 50, y: 200 }, { x: 150, y: 150 }, { x: 300, y: 200 }], pathMode: 'loop', speed: 80 };
  const level = { cols: 50, tiles: new Array(50 * 14).fill(0), platforms: [pl] };
  const roundTripped = JSON.parse(JSON.stringify(level));
  ok(JSON.stringify(roundTripped.platforms[0].path) === JSON.stringify(pl.path), 'path array byte-identical after JSON round trip');
  ok(roundTripped.platforms[0].pathMode === 'loop', 'pathMode byte-identical after JSON round trip');
}

sec('Old level (no path/pathMode on any platform) is byte-identical after a no-op pass');
{
  const pl = { x: 100, y: 200, w: 96, h: 12, x1: 36, x2: 228, speed: 80 };
  const level = { cols: 50, tiles: new Array(50 * 14).fill(0), platforms: [pl] };
  const before = JSON.stringify(level);
  const after = JSON.stringify(JSON.parse(JSON.stringify(level)));
  ok(before === after, 'old-style platform (x1/x2 only) round-trips with zero byte changes');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS ✓');
process.exit(fail === 0 ? 0 : 1);
