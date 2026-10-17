// AKI_26 Part 1, item 1.5 — level height (add/remove rows above).
//
// Finding: the feature already existed almost entirely as
// editor/actions.js's addSectionAbove/removeSectionAbove, wired into the
// Builder's Level tab (editor.html "Rows" input + "ADD SECTION ABOVE"
// button, editor/main.js). Chief can already type 16 into Rows and click to
// grow Level 1 from 18 to 34 rows; playerStart, decorations, sources, gates,
// switches, checkpoints, platforms, enemies, crates and chests already
// shifted by addedRows*TILE_SIZE.
//
// Two real gaps found and fixed here, both in editor/actions.js:
//   1. NPCs (added Order 22, after this code was last touched) were missing
//      from the shift entirely -- addSectionAbove's forward() had no
//      `level.npcs` line, and SECTION_OBJECT_LISTS (shared by
//      removeSectionAbove's shift-back and both removeSectionAboveIssue /
//      removeSectionRightIssue occupancy checks) didn't list 'npcs' either.
//      Growing or shrinking a level silently detached every NPC.
//   2. A path-mode platform (new in this same order's item 1.3) only had its
//      own anchor p.y shifted -- the path's own points (p.path[i].y) were
//      left in place, which would detach the platform's travel route from
//      the rest of the shifted level the moment both features were used
//      together. Fixed in both the add and remove directions, and the
//      occupancy check (removeSectionAboveIssue) now also inspects path
//      points, not just the platform's own anchor y.
//
// Test strategy: loads the REAL src_scroll/levels/level1.json read-only,
// deep-clones it in memory, and only ever mutates the clone -- the file on
// disk is opened with 'r' exactly once and never written. A separate
// synthetic fixture (level1.json has no path-mode platforms yet) covers the
// path-shift fix directly.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const Actions = await import('../editor/actions.js');
const History = await import('../editor/history.js');
const S = await import('../editor/state.js');

let ROWS0 = 0;   // Level 1's height today, set by the first section
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' \u2014 ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' \u2014 ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

const LEVEL1_PATH = path.join(__dirname, '..', 'src_scroll', 'levels', 'level1.json');
const rawBefore = fs.readFileSync(LEVEL1_PATH, 'utf-8'); // read-only, used again at the end to prove the real file was never touched

function loadLevel1Copy() {
  return JSON.parse(rawBefore); // fresh deep clone every call -- never the same object twice
}

function setLevel(level) {
  S.state.level = level;
  History.clearAll();
  return level;
}

sec('Real Level 1 fixture sanity (read-only load)');
{
  const lvl = loadLevel1Copy();
  ok(lvl.cols === 100, 'Level 1 is 100 cols wide', `got ${lvl.cols}`);
  ROWS0 = lvl.tiles.length / lvl.cols;   // Level 1 grows in the Builder; every number below is relative to today's height
ok(ROWS0 >= 18 && ROWS0 <= 38, 'Level 1 has a sane height today', `got ${ROWS0}`);
  ok(Array.isArray(lvl.npcs) && lvl.npcs.length >= 3, 'Level 1 has at least 3 authored npcs', `got ${lvl.npcs?.length}`);
  ok(lvl.platforms.length === 0, 'Level 1 has no platforms today (path-shift fix needs a synthetic fixture)');
}

sec('addSectionAbove: Level 1 copy, 18 -> 34 rows (+16 rows, +512px)');
{
  const lvl = setLevel(loadLevel1Copy());
  const npcYsBefore = lvl.npcs.map(n => n.y);
  const decoYsBefore = lvl.decorations.map(d => d.y);
  const sourceYsBefore = lvl.sources.map(s => s.y);
  const gateYsBefore = lvl.gates.map(g => g.y);
  const playerYBefore = lvl.playerStart.y;

  const action = Actions.addSectionAbove(lvl, 16);
  ok(!!action, 'addSectionAbove(16) produces an action for Level 1 (34 rows is well under the 54 cap)');
  History.apply(action);

  ok(lvl.tiles.length / lvl.cols === ROWS0 + 16, `level grew from ${ROWS0} to ${ROWS0 + 16} rows`, `got ${lvl.tiles.length / lvl.cols}`);
  ok(lvl.tiles.length === lvl.cols * (ROWS0 + 16), 'tiles array length is cols*rows', `got ${lvl.tiles.length}`);
  ok(lvl.playerStart.y === playerYBefore + 512, 'playerStart shifted by +512px');
  ok(lvl.npcs.every((n, i) => n.y === npcYsBefore[i] + 512), 'all authored npcs shifted by +512px (THE GAP -- previously unshifted)');
  ok(lvl.decorations.every((d, i) => d.y === decoYsBefore[i] + 512), 'all decorations shifted by +512px');
  ok(lvl.sources.every((s, i) => s.y === sourceYsBefore[i] + 512), 'all sources shifted by +512px');
  ok(lvl.gates.every((g, i) => g.y === gateYsBefore[i] + 512), 'the gate shifted by +512px');

  History.undo();
  ok(lvl.tiles.length / lvl.cols === ROWS0, 'undo restores the original rows');
  ok(lvl.npcs.every((n, i) => n.y === npcYsBefore[i]), 'undo restores original npc y positions');
  ok(JSON.stringify(lvl) === rawBefore.replace(/\s+/g, '') ? true : JSON.stringify(JSON.parse(rawBefore)) === JSON.stringify(lvl), 'undo restores the clone to byte-for-byte the original parsed level');

  History.redo();
  ok(lvl.tiles.length / lvl.cols === ROWS0 + 16, 'redo re-grows by 16 rows');
  ok(lvl.npcs.every((n, i) => n.y === npcYsBefore[i] + 512), 'redo re-shifts npcs by +512px');
}

sec('addSectionAbove + removeSectionAbove round trip is lossless for npcs');
{
  const lvl = setLevel(loadLevel1Copy());
  const before = JSON.parse(JSON.stringify(lvl));
  History.apply(Actions.addSectionAbove(lvl, 16));
  const removeIssue = Actions.removeSectionAboveIssue(lvl, 16);
  ok(removeIssue === null, 'removing the same 16 rows back off is not blocked', removeIssue || '');
  History.apply(Actions.removeSectionAbove(lvl, 16));
  ok(JSON.stringify(lvl) === JSON.stringify(before), 'level is byte-identical to the pre-grow state after growing then shrinking back');
}

sec('removeSectionAboveIssue blocks when an npc sits in the region being removed');
{
  const lvl = setLevel(loadLevel1Copy());
  // ...now place a synthetic npc right at the very top to prove the occupancy check (THE GAP) catches it.
  const lvl2 = setLevel(loadLevel1Copy());
  lvl2.decorations = []; lvl2.sources = []; lvl2.gates = []; lvl2.switches = []; lvl2.checkpoints = [];
  lvl2.platforms = []; lvl2.enemies = []; lvl2.crates = []; lvl2.chests = [];
  lvl2.tiles = lvl2.tiles.map(() => 0); // clear the grid so only the npc is in the way
  lvl2.playerStart.y = 10000; // move far out of the way
  lvl2.npcs = [{ id: 'n1', x: 100, y: 16 }]; // y=16 is inside the top 2 rows (0..64px)
  const issue = Actions.removeSectionAboveIssue(lvl2, 2);
  ok(issue !== null && /npc/.test(issue), 'an npc inside the removed top rows now blocks the removal (was previously invisible to this check)', issue || '(no issue returned)');
}

sec('platform path points shift with addSectionAbove / removeSectionAbove (synthetic fixture -- Level 1 has no path-mode platforms yet)');
{
  const lvl = setLevel({
    cols: 20, tiles: new Array(20 * 18).fill(0),
    decorations: [], sources: [], gates: [], switches: [], checkpoints: [],
    enemies: [], crates: [], chests: [], npcs: [],
    platforms: [{ x: 100, y: 400, w: 96, h: 12, path: [{ x: 100, y: 400 }, { x: 400, y: 400 }], pathMode: 'pingpong', speed: 80 }],
  });
  const pl = lvl.platforms[0];
  const [p0y, p1y] = [pl.path[0].y, pl.path[1].y];
  History.apply(Actions.addSectionAbove(lvl, 16));
  // removeSectionAbove's forward() restores from its own "before" snapshot
  // and clones every object -- the platform's identity changes across that
  // call, so re-read lvl.platforms[0] after each step instead of reusing a
  // stale reference.
  const grown = lvl.platforms[0];
  ok(grown.y === 400 + 512, 'platform anchor y shifted by +512px');
  ok(grown.path[0].y === p0y + 512 && grown.path[1].y === p1y + 512, 'both path points shifted by +512px too (THE GAP)');
  History.apply(Actions.removeSectionAbove(lvl, 16));
  const shrunk = lvl.platforms[0];
  ok(shrunk.y === 400, 'undo-by-remove restores platform anchor y');
  ok(shrunk.path[0].y === p0y && shrunk.path[1].y === p1y, 'undo-by-remove restores both path points');
}

sec('removeSectionAboveIssue blocks when a platform PATH (not just its anchor) sits in the removed region');
{
  const lvl = setLevel({
    cols: 20, tiles: new Array(20 * 18).fill(0),
    decorations: [], sources: [], gates: [], switches: [], checkpoints: [],
    enemies: [], crates: [], chests: [], npcs: [],
    playerStart: { x: 0, y: 10000 },
    // anchor y is safely below the cutoff, but one path point dips up into the top region
    platforms: [{ x: 100, y: 400, w: 96, h: 12, path: [{ x: 100, y: 400 }, { x: 150, y: 16 }], pathMode: 'pingpong', speed: 80 }],
  });
  const issue = Actions.removeSectionAboveIssue(lvl, 2);
  ok(issue !== null && /path/.test(issue), 'a path point inside the removed region blocks removal even though the anchor itself is clear', issue || '(no issue returned)');
}

sec('MAX_LEVEL_ROWS cap still enforced (unaffected by this fix)');
{
  const lvl = setLevel(loadLevel1Copy()); // 18 rows
  const ROWS1 = lvl.tiles.length / lvl.cols;
const tooMany = Actions.addSectionAbove(lvl, 54 - ROWS1 + 1); // would push to 55 > 54 cap
  ok(tooMany === null, 'adding past MAX_LEVEL_ROWS (54) is still rejected', `rows requested would be ${ROWS1 + (54 - ROWS1 + 1)}`);
  const exact = Actions.addSectionAbove(lvl, 54 - ROWS1); // exactly 54
  ok(exact !== null, 'adding exactly up to the 54-row cap is still allowed');
}

sec('Real file on disk was never touched');
{
  const rawAfter = fs.readFileSync(LEVEL1_PATH, 'utf-8');
  ok(rawAfter === rawBefore, 'src_scroll/levels/level1.json is byte-identical before and after this entire test run');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
