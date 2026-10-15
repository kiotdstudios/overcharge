// ORDER 26 ITEM 1.7: ladder decoration -- climb up, step off the top onto a
// supported rooftop, and climb back down. Exercises the REAL Level/Player
// classes end-to-end via a synthetic in-memory level (never touches a real
// level file). Also confirms the order's own stated caveat: the ladder top
// needs an actual supporting tile for the player to be able to stand there.
const listeners = {};
globalThis.window = { addEventListener(name, fn) { listeners[name] = fn; }, removeEventListener(){}, innerWidth:1920, innerHeight:1080 };
globalThis.document = { addEventListener(){}, getElementById:()=>null,
  createElement:()=>({ getContext:()=>({}), style:{} }), body:{style:{}} };
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=128; this.naturalHeight=605; this.src=''; } addEventListener(){} };

const { Level, CLIMBABLE_LADDER_SRC } = await import('../src_scroll/level.js');
const { Player } = await import('../src_scroll/player.js');
const { TILE, PLAYER_H } = await import('../src_scroll/constants.js');
const fs = await import('node:fs');

let pass = 0, fail = 0;
function ok(cond, msg) { (cond ? pass++ : fail++); console.log(`${cond ? '✓' : '✗'} ${msg}`); }
const key = (code, down) => listeners[down ? 'keydown' : 'keyup']({ code, preventDefault(){} });
const releaseAll = () => { for (const c of ['ArrowUp','KeyW','ArrowDown','KeyS','ArrowLeft','KeyA','ArrowRight','KeyD']) key(c, false); };

// Manifest sanity: the real asset is 128x605, and the manifest entry must
// now say so too (fixed this item -- was stale 64x288).
const manifest = JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json', 'utf8'));
const ladderAsset = manifest.assets.find(a => a.id === 'night_city_ladder');
ok(!!ladderAsset, 'manifest has a night_city_ladder entry');
ok(ladderAsset?.path === CLIMBABLE_LADDER_SRC, 'manifest path matches the runtime climbable-src constant exactly');
ok(ladderAsset?.frame_width === 128 && ladderAsset?.frame_height === 605,
  'manifest frame size matches the real 128x605 art (was stale 64x288 before this item)');

const cols = 6, rows = 12;
const tiles = new Array(cols * rows).fill(0);
const setSolid = (col, row) => { tiles[row * cols + col] = 1; };
// Ground floor across the bottom row so the player has somewhere to stand
// and the ladder base lands on solid ground.
for (let c = 0; c < cols; c++) setSolid(c, rows - 1); // row 11, y 352-384

const LADDER_COL = 2;
const ladderX = LADDER_COL * TILE;      // 64
const ladderTopY = 7 * TILE;            // 224 -- top of climbable range
const ladderH = (rows - 1) * TILE - ladderTopY; // down to y=352 (ground)

function buildLevel(withRoofTile) {
  const t = tiles.slice();
  // ORDER 26 1.7 FINDING: the supporting tile must be a one-way standing
  // surface (tile value 2), NOT a fully-solid wall (value 1). A solid tile
  // in the ladder's own column blocks the climb via a ceiling collision
  // (src_scroll/player.js _resolveY, vy<0 branch) long before the player
  // ever reaches the dedicated top-of-ladder grounding check -- confirmed
  // empirically. Value 2 is non-solid for that ceiling check (tileIsSolid
  // excludes it) but IS accepted by tileAllowsLanding, so the climb proceeds
  // cleanly and the player lands exactly at the clamp. This is the concrete
  // answer to the order's "the ladder top needs a supporting tile" -- it
  // needs a ONE-WAY platform tile specifically, same value Builder already
  // uses for rooftops/ledges elsewhere.
  if (withRoofTile) t[7 * cols + LADDER_COL] = 2; // row7 (224-256): one-way standing tile at the ladder's exit height
  return new Level({
    name: 'LADDER TEST', cols, tiles: t, playerStart: { x: ladderX, y: (rows - 1) * TILE - PLAYER_H },
    sources: [], gates: [], switches: [], chests: [], crates: [], enemies: [], checkpoints: [],
    decorations: [{ src: CLIMBABLE_LADDER_SRC, x: ladderX, y: ladderTopY, w: TILE, h: ladderH }],
    platforms: [],
  });
}

// -- ladder extraction --
const levelWithRoof = buildLevel(true);
ok(levelWithRoof.ladders.length === 1, 'level extracts exactly one climbable ladder from decorations');
const l = levelWithRoof.ladders[0];
ok(l.x === ladderX && l.y === ladderTopY && l.w === TILE && l.h === ladderH, 'extracted ladder geometry matches the placed decoration');

// -- climb up, with a supporting tile at the top --
{
  const level = buildLevel(true);
  const player = new Player(ladderX, (rows - 1) * TILE - PLAYER_H);
  player.setEnergyState(0, 0);
  ok(!player._ladder, 'player starts off the ladder, standing on the ground');

  key('ArrowUp', true);
  let climbed = false, steps = 0;
  while (steps++ < 400) {
    player.update(1 / 60, level);
    if (player._ladder) climbed = true;
    if (!player._ladder && climbed) break; // exited the ladder after having climbed
  }
  key('ArrowUp', false);
  ok(climbed, 'player entered climbing state going up the ladder');
  ok(steps < 400, 'player exited the ladder within a bounded number of steps (did not get stuck)');
  ok(player.grounded === true, 'with a supporting tile at the top, player is grounded after climbing off');
  ok(Math.abs((player.y + player.h) - ladderTopY) < 1, 'player feet land exactly at the ladder-top height (rooftop surface)');
}

// -- climb up, WITHOUT a supporting tile at the top: order's explicit caveat --
{
  const level = buildLevel(false);
  const player = new Player(ladderX, (rows - 1) * TILE - PLAYER_H);
  player.setEnergyState(0, 0);
  key('ArrowUp', true);
  let climbed = false, steps = 0;
  while (steps++ < 400) {
    player.update(1 / 60, level);
    if (player._ladder) climbed = true;
    if (!player._ladder && climbed) break;
  }
  key('ArrowUp', false);
  ok(climbed, 'player can still climb to the top with no supporting tile');
  ok(player.grounded === false, 'with NO supporting tile at the top, player is NOT grounded (falls back) -- confirms the order\'s caveat');
}

// -- climb up, step off the top, then climb back down --
{
  const level = buildLevel(true);
  const player = new Player(ladderX, (rows - 1) * TILE - PLAYER_H);
  player.setEnergyState(0, 0);
  key('ArrowUp', true);
  let steps = 0, exitedAtTop = false;
  while (steps++ < 400) {
    player.update(1 / 60, level);
    if (!player._ladder && player.grounded) { exitedAtTop = true; break; }
  }
  key('ArrowUp', false);
  ok(exitedAtTop, 'player climbed up and stepped off onto the rooftop');
  const roofY = player.y;

  // step off: walk away from the ladder column, confirm still grounded
  key('ArrowRight', true);
  for (let i = 0; i < 10; i++) player.update(1 / 60, level);
  key('ArrowRight', false);
  releaseAll();
  ok(player.grounded, 'player remains grounded after stepping off the ladder on the rooftop');

  // walk back onto the ladder column and climb back down
  // (move left back toward the ladder x)
  key('ArrowLeft', true);
  for (let i = 0; i < 20 && player.x > ladderX; i++) player.update(1 / 60, level);
  key('ArrowLeft', false);
  releaseAll();

  key('ArrowDown', true);
  let descended = false; steps = 0;
  while (steps++ < 400) {
    player.update(1 / 60, level);
    if (player._ladder) descended = true;
    if (descended && player.grounded && !player._ladder) break;
  }
  key('ArrowDown', false);
  releaseAll();
  ok(descended, 'player climbed back down the same ladder');
  ok(player.grounded, 'player lands grounded on the ground floor after climbing back down');
  ok(player.y > roofY, 'player ends up back down near ground level, below the rooftop');
}

console.log(`RESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS ✓');
process.exit(fail === 0 ? 0 : 1);
