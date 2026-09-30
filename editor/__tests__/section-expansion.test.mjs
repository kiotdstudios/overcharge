// Isolated-fixture tests for addSectionAbove / addSectionRight (AKI_NEXT_TASK_VERTICALITY).
// Uses a synthetic level, NEVER a canonical level file — per the brief:
// "Use isolated fixtures. Do not overwrite Chief's unsaved laptop level."
// Run: node editor/__tests__/section-expansion.test.mjs

globalThis.window = globalThis.window || {};
globalThis.document = globalThis.document || { getElementById: () => null };

const { addSectionAbove, addSectionRight, removeSectionAbove, removeSectionRight,
  removeSectionAboveIssue, removeSectionRightIssue } = await import('../actions.js');
const { apply, undo, redo, clearAll } = await import('../history.js');
const { state } = await import('../state.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  -', name); }
  else      { fail++; console.log('  FAIL -', name); }
}

function makeFixture() {
  // 4 cols x 3 rows, deliberately small and NOT a real level. Every current
  // schema-coordinate-bearing array gets at least one entry so a missed
  // shift shows up immediately.
  const cols = 4, rows = 3;
  const tiles = new Array(cols * rows).fill(0);
  tiles[2 * cols + 1] = 11; // one floor tile at (col1,row2)
  const tileRotations = new Array(cols * rows).fill(0);
  tileRotations[2 * cols + 1] = 90;
  const tileFlips = new Array(cols * rows).fill(0);
  tileFlips[2 * cols + 1] = 1;
  return {
    name: 'FIXTURE', number: 99, cols, tiles, tileRotations, tileFlips,
    playerStart: { x: 32, y: 64 },
    decorations: [{ src: 'x.png', x: 10, y: 20, w: 8, h: 8 }],
    sources:     [{ id: 'S1', x: 40, y: 50, charge: 5, label: 'G' }],
    gates:       [{ id: 'gate_1', x: 1984, y: 256, w: 32, h: 64, required: 8, isExit: true }],
    switches:    [{ id: 'SW1', x: 60, y: 70, required: 2, linkedId: 'gate_1', label: 'O' }],
    checkpoints: [{ id: 'CP1', x: 80, y: 90, label: 'CP1' }],
    platforms:   [{ x: 5, y: 15, w: 96, h: 12, x1: 5, x2: 100, speed: 80 }],
    enemies:     [{ type: 'drain', x: 3, y: 33, patrolLeft: 0, patrolRight: 50, speed: 60 }],
    crates:      [{ id: 'C1', x: 44, y: 44 }],
    chests:      [{ id: 'CH1', x: 48, y: 48, cost: 2, reward: 10 }],
  };
}

// ── addSectionAbove: atomic shift across every current schema field ──────
{
  clearAll();
  state.level = makeFixture();
  const before = JSON.parse(JSON.stringify(state.level));
  const dy = 2 * 32;

  const act = addSectionAbove(state.level, 2);
  check('addSectionAbove returns an action for a valid add', !!act);
  apply(act);
  const L = state.level;

  check('rows grew by exactly addedRows', Math.floor(L.tiles.length / L.cols) === Math.floor(before.tiles.length / before.cols) + 2);
  check('cols untouched by a vertical add', L.cols === before.cols);

  // Original tiles preserved, shifted down by addedRows*cols cells.
  const padCells = 2 * L.cols;
  let tilesShiftOk = true, rotShiftOk = true, flipShiftOk = true;
  for (let i = 0; i < before.tiles.length; i++) {
    if (L.tiles[i + padCells] !== before.tiles[i]) tilesShiftOk = false;
    if (L.tileRotations[i + padCells] !== before.tileRotations[i]) rotShiftOk = false;
    if (L.tileFlips[i + padCells] !== before.tileFlips[i]) flipShiftOk = false;
  }
  check('original tiles preserved, shifted by addedRows*cols', tilesShiftOk);
  check('tileRotations shifted alongside tiles, stays aligned', rotShiftOk);
  check('tileFlips shifted alongside tiles, stays aligned', flipShiftOk);
  check('the new rows above are empty (0), so the player can fall through', L.tiles.slice(0, padCells).every(v => v === 0));

  check('playerStart.y shifted by dy', L.playerStart.y === before.playerStart.y + dy);
  check('playerStart.x unchanged', L.playerStart.x === before.playerStart.x);
  check('decoration.y shifted', L.decorations[0].y === before.decorations[0].y + dy);
  check('decoration.x unchanged', L.decorations[0].x === before.decorations[0].x);
  check('source.y shifted', L.sources[0].y === before.sources[0].y + dy);
  check('gate.y shifted, gate.x unchanged (no route change)', L.gates[0].y === before.gates[0].y + dy && L.gates[0].x === before.gates[0].x);
  check('gate.isExit / required preserved exactly', L.gates[0].isExit === true && L.gates[0].required === before.gates[0].required);
  check('switch.y shifted', L.switches[0].y === before.switches[0].y + dy);
  check('checkpoint.y shifted (ground level moves with the shift)', L.checkpoints[0].y === before.checkpoints[0].y + dy);
  check('checkpoint.x (centre) unchanged', L.checkpoints[0].x === before.checkpoints[0].x);
  check('platform.y shifted', L.platforms[0].y === before.platforms[0].y + dy);
  check('platform.x1/x2 (horizontal sweep) unchanged', L.platforms[0].x1 === before.platforms[0].x1 && L.platforms[0].x2 === before.platforms[0].x2);
  check('enemy.y shifted', L.enemies[0].y === before.enemies[0].y + dy);
  check('enemy.patrolLeft/Right (horizontal) unchanged', L.enemies[0].patrolLeft === before.enemies[0].patrolLeft && L.enemies[0].patrolRight === before.enemies[0].patrolRight);
  check('crate.y shifted', L.crates[0].y === before.crates[0].y + dy);
  check('chest.y shifted', L.chests[0].y === before.chests[0].y + dy);
  check('chest.x unchanged', L.chests[0].x === before.chests[0].x);

  undo();
  check('undo restores exact tile array', JSON.stringify(state.level.tiles) === JSON.stringify(before.tiles));
  check('undo restores exact tileRotations', JSON.stringify(state.level.tileRotations) === JSON.stringify(before.tileRotations));
  check('undo restores exact gate position (x=1984,y=256 preserved)', state.level.gates[0].x === 1984 && state.level.gates[0].y === 256);
  check('undo restores exact playerStart', JSON.stringify(state.level.playerStart) === JSON.stringify(before.playerStart));
  check('undo restores exact cols/rows', state.level.cols === before.cols && state.level.tiles.length === before.tiles.length);

  redo();
  check('redo re-applies the shift exactly (idempotent replay)', state.level.gates[0].y === 256 + dy);
}

// ── addSectionAbove: MAX_LEVEL_ROWS cap is enforced, not silently raised ──
{
  clearAll();
  const L = makeFixture();
  // cols=4 rows=3 currently; ask for 60 rows -> 63 total, over the 54 cap.
  state.level = L;
  const act = addSectionAbove(state.level, 60);
  check('addSectionAbove rejects a request that would exceed MAX_LEVEL_ROWS', act === null);
}

// ── addSectionRight: re-stride, not a flat append (the corruption trap) ──
{
  clearAll();
  state.level = makeFixture();
  const before = JSON.parse(JSON.stringify(state.level));
  const act = addSectionRight(state.level, 2);
  check('addSectionRight returns an action for a valid add', !!act);
  apply(act);
  const L = state.level;

  check('cols grew by exactly addedCols', L.cols === before.cols + 2);
  const rows = Math.floor(before.tiles.length / before.cols);
  check('row count unchanged by a horizontal add', Math.floor(L.tiles.length / L.cols) === rows);

  let restrideOk = true;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < before.cols; c++) {
      if (L.tiles[r * L.cols + c] !== before.tiles[r * before.cols + c]) restrideOk = false;
    }
    for (let c = before.cols; c < L.cols; c++) {
      if (L.tiles[r * L.cols + c] !== 0) restrideOk = false;
    }
  }
  check('each row re-strided correctly (not a flat block appended after the last row)', restrideOk);
  check('tileRotations re-strided in lockstep with tiles', L.tileRotations.length === L.tiles.length);
  check('tileFlips re-strided in lockstep with tiles', L.tileFlips.length === L.tiles.length);
  check('no world coordinate changed on a horizontal add (gate stays at x=1984,y=256)', L.gates[0].x === 1984 && L.gates[0].y === 256);
  check('playerStart unchanged on a horizontal add', JSON.stringify(L.playerStart) === JSON.stringify(before.playerStart));

  undo();
  check('undo restores exact pre-expansion tiles/cols', state.level.cols === before.cols && JSON.stringify(state.level.tiles) === JSON.stringify(before.tiles));
  redo();
  check('redo re-applies the column expansion', state.level.cols === before.cols + 2);
}

// ── Rejections: non-mutating on invalid input ─────────────────────────────
{
  clearAll();
  state.level = makeFixture();
  check('addSectionAbove(0) is a no-op (returns null)', addSectionAbove(state.level, 0) === null);
  check('addSectionAbove(-1) is a no-op (returns null)', addSectionAbove(state.level, -1) === null);
  check('addSectionRight(0) is a no-op (returns null)', addSectionRight(state.level, 0) === null);
  check('addSectionAbove(null level) is a no-op', addSectionAbove(null, 5) === null);
}

// Section removal must round-trip only blank outer space and reject content.
{
  clearAll();
  state.level = makeFixture();
  const original = JSON.stringify(state.level);
  apply(addSectionAbove(state.level, 2));
  const expanded = JSON.stringify(state.level);
  check('top removal accepts rows added above existing content', removeSectionAboveIssue(state.level, 2) === null);
  apply(removeSectionAbove(state.level, 2));
  check('top removal restores every original field and tile array', JSON.stringify(state.level) === original);
  undo();
  check('undo restores removed top rows exactly', JSON.stringify(state.level) === expanded);
  redo();
  check('redo removes top rows exactly', JSON.stringify(state.level) === original);
}
{
  clearAll();
  state.level = makeFixture();
  state.level.gates[0].x = 80; // synthetic fixture gate must be within its four-column grid
  const original = JSON.stringify(state.level);
  apply(addSectionRight(state.level, 2));
  const expanded = JSON.stringify(state.level);
  check('right removal accepts columns added after existing content', removeSectionRightIssue(state.level, 2) === null);
  apply(removeSectionRight(state.level, 2));
  check('right removal re-strides every row and restores original fields', JSON.stringify(state.level) === original);
  undo();
  check('undo restores removed right columns exactly', JSON.stringify(state.level) === expanded);
  redo();
  check('redo removes right columns exactly', JSON.stringify(state.level) === original);
}
{
  const L = makeFixture();
  const original = JSON.stringify(L);
  L.tiles[0] = 11;
  check('top removal rejects authored tiles', /contain tiles/.test(removeSectionAboveIssue(L, 1)));
  check('rejected top removal creates no action', removeSectionAbove(L, 1) === null);
  L.tiles[0] = 0;
  L.tileFlips[0] = 1;
  check('top removal rejects aligned flip data', /tileFlips/.test(removeSectionAboveIssue(L, 1)));
  L.tileFlips[0] = 0;
  L.playerStart.y = 0;
  check('top removal rejects an object in the trimmed rows', /player start/.test(removeSectionAboveIssue(L, 2)));
  check('rejections did not mutate geometry', L.cols === 4 && L.tiles.length === 12);
  L.tileFlips.pop();
  check('top removal rejects malformed aligned arrays', /not aligned/.test(removeSectionAboveIssue(L, 1)));
  check('top removal rejects all rows', /at least one row/.test(removeSectionAboveIssue(makeFixture(), 3)));
  check('top removal rejects fractional counts', /whole number/.test(removeSectionAboveIssue(makeFixture(), 1.5)));
}
{
  const L = makeFixture();
  L.gates[0].x = 80;
  L.tiles[3] = 11;
  check('right removal rejects authored tiles', /contain tiles/.test(removeSectionRightIssue(L, 1)));
  check('rejected right removal creates no action', removeSectionRight(L, 1) === null);
  L.tiles[3] = 0;
  L.tileRotations[3] = 90;
  check('right removal rejects aligned rotation data', /tileRotations/.test(removeSectionRightIssue(L, 1)));
  L.tileRotations[3] = 0;
  L.decorations[0].x = 110;
  check('right removal rejects objects in trimmed columns', /decoration/.test(removeSectionRightIssue(L, 1)));
  L.decorations[0].x = 90;
  L.decorations[0].w = 16;
  check('right removal rejects objects overlapping trimmed columns', /overlaps/.test(removeSectionRightIssue(L, 1)));
  check('right removal rejects all columns', /at least one column/.test(removeSectionRightIssue(makeFixture(), 4)));
  check('right removal rejects fractional counts', /whole number/.test(removeSectionRightIssue(makeFixture(), 1.5)));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
