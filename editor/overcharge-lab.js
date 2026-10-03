// OVERCHARGE LAB — a playable animation sandbox.
//
// WHY THIS EXISTS: Hero Lab previews frames. It cannot show whether idle→walk→run
// reads correctly while actually moving, whether the jump pose matches the real arc,
// or whether a one-shot attack corrupts movement state on the way out. This page puts
// the same animator under a controllable body so those transitions can be judged.
//
// ISOLATION (ORCHA order §3): this file and overcharge-lab.html are the only new code.
// `hero-sprites.js`, `hero-render.js` and `constants.js` are imported READ-ONLY and are
// not modified. Nothing in the live game imports this page. Deleting both files is a
// complete removal with no other edits required.
//
// Physics constants come from the production `constants.js` ON PURPOSE: a sandbox tuned
// to different numbers would validate animations against a jump the game does not have.
// RUN_MULT is lab-local because production has no run state yet.

import { PlayerSprites, HERO_STATES } from '../src_scroll/hero-sprites.js';
import { drawHeroFrame } from '../src_scroll/hero-render.js';
import { GRAVITY, JUMP_FORCE, PLAYER_SPEED, PLAYER_W, PLAYER_H, TILE } from '../src_scroll/constants.js';
// THE REAL INPUT MODULE, not a reimplementation. Chief: "i need this to have the real
// actual game controls". The original build followed the order's control table (A/D,
// Space to jump) which CONTRADICTS the shipped game — Space is CHARGE and jump is W or
// ArrowUp. Hand-rolled key handling is how that drift happened, so the lab now shares
// production's `Input` exactly: same key codes, same held/pressed edge semantics.
import * as Input from '../src_scroll/input.js';

const RUN_MULT   = 2.1;    // lab-only: production has no run state to match
const HERO_DRAW  = 80;     // game-scale display, same as Hero Lab's 80px preview
const COYOTE     = 0.10;   // lab-only convenience so jump tests are not frame-perfect
const JUMP_BUF   = 0.12;
const HURT_TIME  = 0.45;
// ── Ledge grab, LAB ONLY ─────────────────────────────────────────────────────
// Chief asked for the ledge mechanic in the lab. `ledge-climb` art exists (8 frames,
// 10fps, non-looping) and production has NO mechanic for it — the lab is where that gets
// prototyped before anything is proposed for the game. Nothing here is wired into
// production; `hero-sprites.js` already accepts `status.traversal`, which is the only
// hook used.
const LEDGE_REACH = 10;    // px in front of the body that counts as touching a wall

// WHERE THE BODY HANGS, derived from the art instead of guessed.
//
// Chief: "either the animation needs to be different or this climbing mechanic needs to be
// improved." The animation was fine; the placement was wrong. `drawHeroFrame` anchors on
// the FEET and scales the whole 512px canvas, and ledge-climb frame 0 has its content top
// (the raised hands) at source row 69. So the hands land
//   HERO_DRAW * (496 - 69) / 512 = 66.7px
// above the feet. The first version hung the body with its head 6px BELOW the lip, which
// put the hands 42.7px ABOVE it — the character reached into empty air a tile and a third
// over the ledge, which is exactly what it looked like.
//
// Hanging correctly means HANDS ON THE LIP and the body below it.
const LEDGE_FRAME0_TOP = 69;                                   // measured, hero-v3 ledge-climb
const HAND_ABOVE_FEET  = HERO_DRAW * (496 - LEDGE_FRAME0_TOP) / 512;
const LEDGE_HANG_Y     = HAND_ABOVE_FEET - PLAYER_H;           // body top, relative to the lip
// An attack must LATCH, not be read from the held key. A quick tap fires keydown and
// keyup inside one frame, so clearing the flag on keyup meant the animator never saw a
// rising edge and the strike silently never played. Caught by the smoke test tapping J.
const ATTACK_LATCH = 0.12;

// ── Test room ────────────────────────────────────────────────────────────────
// 30 x 17 tiles at 32px = 960 x 544, matching the 16:9 canvas closely enough that
// nothing is cropped. Deliberately NOT loaded from level JSON (order §6): the lab
// must not acquire a dependency on Builder-authored content.
//
//   '#' solid   '.' empty
// Requirements met: a long flat baseline for sustained walk/run, a low platform for
// jump and landing inspection, and a safe drop so fall→landing can be watched.
const ROOM = [
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '.....................####.....',   // high ledge — the safe drop is off its left edge
  '.....................#..#.....',
  '..........####.......#..#.....',   // low platform — jump/landing AND the ledge-grab
  '..............................',   // test: its left lip at col 10 is catchable, which
  '......................#.......',   // keeps the corridor clear. An earlier version added
  '......................#.......',   // a 5-tall wall here and it blocked the whole level.
  '####################....######',   // flat baseline, with a gap to fall into
  '####################....######',
  '####################....######',
  '####################....######',
  '##############################',
];
const COLS = ROOM[0].length, ROWS = ROOM.length;

// MUTABLE copy of the ASCII map. Chief: "this doesnt let me out of the hole if i fall in
// and i keep having to reset so i wanna be able to do some quick edits". The room needs to
// be editable at runtime, so the strings above are the pristine template and this grid is
// what collision and rendering actually read.
//
// IN MEMORY ONLY. Nothing here can reach a level file — the lab has no save path and never
// imports the editor's persistence layer. Reload restores the template.
let grid = null;
function restoreRoom() {
  grid = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ROOM[r][c] === '#') grid[r*COLS + c] = 1;
}
restoreRoom();

// Out of bounds: solid at the sides and ceiling so the player cannot leave the room, open
// below so a fall still reads as a fall.
const solidAt = (c, r) => (c < 0 || c >= COLS || r < 0) ? true
                        : (r >= ROWS) ? false
                        : grid[r*COLS + c] === 1;
const setTile = (c, r, v) => {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  if (grid[r*COLS + c] === v) return false;
  grid[r*COLS + c] = v;
  markDirty();            // the level list shows * so an unsaved edit is never invisible
  return true;
};
// Defined before the level system exists during module init, so keep it indirect.
let markDirty = () => {};

const SPAWN = { x: 3 * TILE, y: 11 * TILE };

// ── State ────────────────────────────────────────────────────────────────────
// WHICH SPRITE PACK. Chief asked which sheets the lab is showing, and the answer is worth
// stating in code because three generations exist:
//
//   assets/sprites/hero-v3/        16 states, 8 frames each  <- what BOTH labs render
//   assets/sprites/hero-gait-v4/   revised walk + run only   <- opt-in with ?gait=4
//   assets/sprites/walking|running|jumping|idle_2.0   <- what the GAME still renders,
//                                                        through src_scroll/sprites.js
//
// So the lab is NOT showing the same character the game draws. hero-v3 is the newer pack
// built for the animator migration, and that migration has not shipped to production.
const useGait4 = new URLSearchParams(location.search).get('gait') === '4';
const sprite = new PlayerSprites({ gaitRoot: useGait4 ? 'assets/sprites/hero-gait-v4' : null });
const canvas = document.getElementById('lab');
const ctx    = canvas.getContext('2d');

const p = {
  x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0,
  grounded: false, facingRight: true,
  coyote: 0, jumpBuf: 0, hurtT: 0,
  absorbing: false, discharging: false,
  attackT: 0, projectile: false,
  ledge: null,        // { c, r, dir } while hanging or climbing
  climbing: false,    // the clip is playing; on its last frame the player lands on top
};
// PRODUCTION KEY MAP, read straight off player.js:
//   move    heldAny ArrowLeft/KeyA  ·  ArrowRight/KeyD
//   jump    pressedAny ArrowUp/KeyW          <- NOT Space
//   run     heldAny ShiftLeft/ShiftRight
//   drop    pressedAny ArrowDown/KeyS when grounded
//   absorb  held KeyE
//   charge  held Space                        <- shows the discharge animation
//   attack  pressed KeyK  — melee if an enemy is near, otherwise an aimed bolt
//   reset   KeyR
// KeyJ and KeyH are LAB-ONLY, flagged in the legend: the lab has no enemies, so without
// a melee trigger the energy-strike clip would be unreachable, and nothing damages the
// player so hurt would never play.
const LEFT = ['ArrowLeft','KeyA'], RIGHT = ['ArrowRight','KeyD'], JUMP = ['ArrowUp','KeyW'];
let showHitbox = false;     // B toggles it; off so nothing overlays the character
let override = null;        // forced state name, or null for gameplay
let playing  = true;        // override playback
let lastT    = null;
let fps      = 0, fpsAcc = 0, fpsFrames = 0;

function reset() {
  Object.assign(p, {
    x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, grounded: false, facingRight: true,
    coyote: 0, jumpBuf: 0, hurtT: 0,
    absorbing: false, discharging: false, attackT: 0, projectile: false,
    ledge: null, climbing: false,
  });
}

// ── Input ────────────────────────────────────────────────────────────────────
// The production Input module already owns keydown/keyup, arrow-scroll prevention and
// the clear-on-blur that stops a stuck sprint. Nothing to add here except preventing
// the page scrolling on the keys it does not already guard.
// Guarded so the module can be IMPORTED outside a browser. `_dev/module_parse.mjs`
// imports every module in Node to prove none of them is syntactically dead, and a
// bare top-level addEventListener throws there. hero-lab.js has the same problem for
// the same reason; no need to add a third.
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)) return;
    if (['KeyW','KeyA','KeyS','KeyD','KeyE','KeyJ','KeyK','KeyH','KeyR','KeyB'].includes(e.code)) e.preventDefault();
  }, { passive: false });
}

// One-shots are read as EDGES from Input.pressed() inside step(), not latched here.
// The previous build latched them on its own keydown handler, which is what let a tap
// get lost. Input's two-frame snapshot makes the edge survive to exactly one step().

// ── Collision ────────────────────────────────────────────────────────────────
// Axis-separated AABB against the tile grid. Simple on purpose (order §6) — this is
// not production collision and must never be mistaken for it.
function hits(x, y) {
  const c0 = Math.floor(x / TILE), c1 = Math.floor((x + PLAYER_W - 1) / TILE);
  const r0 = Math.floor(y / TILE), r1 = Math.floor((y + PLAYER_H - 1) / TILE);
  for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (solidAt(c, r)) return true;
  return false;
}

function moveAxis(dx, dy) {
  if (dx) {
    const nx = p.x + dx;
    if (!hits(nx, p.y)) p.x = nx;
    else { p.vx = 0; const step = Math.sign(dx); while (!hits(p.x + step, p.y)) p.x += step; }
  }
  if (dy) {
    const ny = p.y + dy;
    if (!hits(p.x, ny)) { p.y = ny; p.grounded = false; }
    else {
      const step = Math.sign(dy);
      while (!hits(p.x, p.y + step)) p.y += step;
      if (dy > 0) p.grounded = true;
      p.vy = 0;
    }
  }
}

// ── Simulation ───────────────────────────────────────────────────────────────
// Is there a grabbable lip in front of the player's head?
// A ledge is a solid tile whose own top is OPEN — so the player's hands can clear it.
// Searching a 2-row band around head height keeps the grab from being frame-perfect,
// which is the difference between a mechanic that feels good and one that feels broken.
function findLedge(facing) {
  const frontX = facing > 0 ? p.x + PLAYER_W + LEDGE_REACH - 1 : p.x - LEDGE_REACH;
  const c = Math.floor(frontX / TILE);

  // THE FLOOR IS NOT A LEDGE, and this took two attempts to get right.
  //
  // Every floor tile is "solid with an open top", so the first version grabbed the ground
  // on the way down from any jump. Excluding the player's own column was not enough
  // either: the floor is CONTINUOUS, so the column beside the player is floor too — the
  // player jumped at x=160, faced west, and hung off the baseline one tile to its left.
  //
  // The rule that actually separates the two cases: if there is ground under your feet you
  // are LANDING, not hanging. A real ledge grab happens over empty space.
  const colL = Math.floor(p.x / TILE);
  const colR = Math.floor((p.x + PLAYER_W - 1) / TILE);
  if (c >= colL && c <= colR) return null;                 // directly beneath = ground
  const feetRow = Math.floor((p.y + PLAYER_H) / TILE);
  if (solidAt(colL, feetRow) || solidAt(colR, feetRow)) return null;   // about to land

  const headRow = Math.floor(p.y / TILE);
  for (const r of [headRow, headRow + 1]) {
    if (!solidAt(c, r)) continue;        // need a wall face here
    if (solidAt(c, r - 1)) continue;     // ...whose top is open, or it is not a lip
    // The body must STRADDLE the lip: feet below it, head at or above it. Anything else is
    // either standing on top or nowhere near.
    if (p.y + PLAYER_H <= r * TILE) continue;
    if (p.y > r * TILE + TILE) continue;
    return { c, r, dir: facing };
  }
  return null;
}

function step(dt) {
  const running = Input.heldAny('ShiftLeft', 'ShiftRight');
  const left = Input.heldAny(...LEFT), right = Input.heldAny(...RIGHT);
  const dir = (right ? 1 : 0) - (left ? 1 : 0);

  // Escape hatches FIRST. The ledge block below short-circuits the rest of step(), and an
  // earlier version put these after it — so while hanging, R did nothing and the player was
  // stuck with no way out. That is the exact frustration the lab is meant to remove.
  if (Input.pressed('KeyR')) { reset(); return; }
  if (Input.pressed('KeyB')) showHitbox = !showHitbox;

  // ── LEDGE: hanging or climbing short-circuits normal movement ──────────────
  if (p.ledge) {
    const { c, r } = p.ledge;
    const lipY   = r * TILE;
    const hangY  = lipY + LEDGE_HANG_Y;        // hands on the lip, body below
    const standY = lipY - PLAYER_H;            // final: stood on top of the lip
    const hangX  = p.ledge.dir > 0 ? c * TILE - PLAYER_W : (c + 1) * TILE;
    p.vx = 0; p.vy = 0;                        // no gravity while attached
    p.facingRight = p.ledge.dir > 0;

    if (p.climbing) {
      sprite.update(dt, false, p.facingRight, false, false, false, false, 0, 0, false,
        { traversal: 'ledge-climb' });
      // TRAVEL with the clip rather than snapping at the end. The first version held the
      // body at the hang spot for all 8 frames and teleported it on the last one, so the
      // character mimed a climb on the spot and then jumped. Now position follows the
      // clip's progress, and x eases in only over the second half — a real mantle is
      // "pull up, then over", not a diagonal slide.
      const prog = Math.min(1, (sprite._current._frame + 1) / sprite._current.frames.length);
      p.y = hangY + (standY - hangY) * prog;
      const xProg = Math.max(0, (prog - 0.5) * 2);
      p.x = hangX + (c * TILE - hangX) * xProg;
      if (sprite._current.done) {
        p.x = c * TILE; p.y = standY;          // commit the exact final cell
        p.ledge = null; p.climbing = false; p.grounded = true;
      }
      return;
    }

    p.x = hangX;
    p.y = hangY;

    // Hanging. Up/W climbs, Down/S drops, and letting go restores normal fall.
    if (Input.pressedAny(...JUMP)) {
      p.climbing = true;
      sprite.setState('ledge-climb', p.facingRight);
      sprite._current.reset();
      return;
    }
    if (Input.pressedAny('ArrowDown', 'KeyS')) {
      p.ledge = null;
      p.y += 2;                                // nudge clear so it cannot re-grab instantly
      return;
    }
    // Hold the first frame while hanging — the clip is the CLIMB, not the hang.
    sprite.setState('ledge-climb', p.facingRight);
    sprite._current._frame = 0;
    sprite._current._t = 0;
    sprite._current.done = false;
    return;
  }

  p.absorbing   = Input.held('KeyE');
  p.discharging = Input.held('Space');     // production: hold Space to push charge out
  p.hurtT   = Math.max(0, p.hurtT - dt);
  p.attackT = Math.max(0, p.attackT - dt);

  if (Input.pressed('KeyH')) p.hurtT = HURT_TIME;                       // lab-only
  if (Input.pressed('KeyJ')) { p.attackT = ATTACK_LATCH; p.projectile = false; } // lab-only melee
  if (Input.pressed('KeyK')) { p.attackT = ATTACK_LATCH; p.projectile = true;  } // production attack
  if (Input.pressedAny(...JUMP)) p.jumpBuf = JUMP_BUF;

  const speed = PLAYER_SPEED * (running ? RUN_MULT : 1);
  p.vx = dir * speed;
  if (dir) p.facingRight = dir > 0;

  // Coyote time and jump buffering are lab conveniences so a jump test does not
  // require frame-perfect input. They do not exist in production.
  p.coyote  = p.grounded ? COYOTE : Math.max(0, p.coyote - dt);
  p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = JUMP_FORCE; p.grounded = false; p.coyote = 0; p.jumpBuf = 0; }

  p.vy = Math.min(p.vy + GRAVITY * dt, 700);

  const wasGrounded = p.grounded;
  moveAxis(p.vx * dt, 0);
  moveAxis(0, p.vy * dt);
  if (!wasGrounded && p.grounded) p.vy = 0;

  // Grab only while airborne and FALLING. Requiring vy > 0 means a jump arcs past a lip
  // on the way up and catches it on the way down, which is what players expect — grabbing
  // on the rise makes a jump feel like it is snagging on the scenery.
  if (!p.grounded && p.vy > 0) {
    const facing = dir !== 0 ? dir : (p.facingRight ? 1 : -1);
    const hit = findLedge(facing);
    if (hit) { p.ledge = hit; p.climbing = false; p.vy = 0; }
  }

  // Fell out of the room — the pit is intentional, so recover rather than hang.
  if (p.y > ROWS * TILE + 120) reset();

  sprite.update(
    dt,
    dir !== 0,                 // moving
    p.facingRight,             // right
    p.absorbing,               // absorbing
    running,                   // running
    !p.grounded,               // airborne
    p.discharging,             // discharging
    Math.abs(p.vx),            // speed, drives gait fps
    p.vy,                      // vy, picks the jump pose
    false,                     // wallBlocked — no wall mechanic in the lab
    { hurt: p.hurtT > 0, attacking: p.attackT > 0, projectile: p.projectile }
  );
}

// ── Override panel ───────────────────────────────────────────────────────────
const GROUPS = {
  Movement:  ['idle','walk','run','jump','hurt','stunned','death'],
  Combat:    ['energy-strike','projectile-cast','absorb','discharge'],
  Traversal: ['ladder-up','ladder-down','ledge-climb','wall-slide','grapple'],
};
const LABEL = { idle:'Idle', walk:'Walk', run:'Run', jump:'Jump', hurt:'Hurt', stunned:'Stunned',
  death:'Death', 'energy-strike':'Strike', 'projectile-cast':'Cast', absorb:'Absorb',
  discharge:'Discharge', 'ladder-up':'Ladder up', 'ladder-down':'Ladder dn',
  'ledge-climb':'Ledge', 'wall-slide':'Wall slide', grapple:'Grapple' };

const ovButtons = [];
const host = document.getElementById('override-groups');
for (const [group, states] of Object.entries(GROUPS)) {
  const wrap = document.createElement('div'); wrap.className = 'grp';
  const h = document.createElement('h3'); h.textContent = group; wrap.append(h);
  const grid = document.createElement('div'); grid.className = 'states';
  for (const s of states) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = LABEL[s]; b.dataset.state = s;
    b.addEventListener('click', () => setOverride(s));
    grid.append(b); ovButtons.push(b);
  }
  wrap.append(grid); host.append(wrap);
}

const btnOff = document.getElementById('ov-off');
const btnPlay = document.getElementById('ov-play');
function syncOv() {
  btnOff.setAttribute('aria-pressed', String(override === null));
  ovButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.state === override)));
  btnPlay.textContent = playing ? 'Pause' : 'Play';
}
function setOverride(s) {
  override = s;
  sprite.setState(s, p.facingRight);
  sprite._current.reset();
  playing = true;
  syncOv();
}
btnOff.addEventListener('click', () => { override = null; playing = true; syncOv(); });
btnPlay.addEventListener('click', () => { playing = !playing; syncOv(); });
document.getElementById('ov-replay').addEventListener('click', () => { sprite._current.reset(); playing = true; syncOv(); });
syncOv();

// ── Render ───────────────────────────────────────────────────────────────────
function drawRoom() {
  ctx.fillStyle = '#050d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint grid so pose alignment against tile boundaries is readable.
  ctx.strokeStyle = '#0d2630'; ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c*TILE, 0); ctx.lineTo(c*TILE, ROWS*TILE); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r*TILE); ctx.lineTo(COLS*TILE, r*TILE); ctx.stroke(); }

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!solidAt(c, r)) continue;
    const x = c*TILE, y = r*TILE;
    ctx.fillStyle = '#123240';
    ctx.fillRect(x, y, TILE, TILE);
    // Teal cap on surface tiles — reads as a test chamber and marks where feet land.
    if (!solidAt(c, r-1)) { ctx.fillStyle = '#00e5d0'; ctx.fillRect(x, y, TILE, 2); }
  }
}

function drawHud() {
  const a = sprite._current;
  const st = sprite.state;
  const [stFps, loop] = HERO_STATES[st] ?? [0, false];
  const rows = [
    ['STATE',    st + (override ? '  <span class="warn">(override)</span>' : '')],
    ['FACING',   sprite.dir === 'east' ? 'east / right' : 'west / left'],
    ['FRAME',    `${a._frame + 1} / ${a.frames.length}   ${loop ? 'loop' : 'one-shot'}`],
    ['ANIM FPS', `${a.fps.toFixed(1)}  (base ${stFps})`],
    ['POS',      `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}`],
    ['VEL',      `vx ${p.vx.toFixed(1)}  vy ${p.vy.toFixed(1)}`],
    ['GROUNDED', p.grounded ? 'yes' : '<span class="warn">no</span>'],
    ['RENDER',   `${fps.toFixed(0)} fps`],
    ['LEDGE',    p.ledge ? (p.climbing ? '<span class="warn">climbing</span>'
                                       : '<span class="warn">hanging — ↑/W climb, ↓/S drop</span>') : 'no'],
    ['PACK',     useGait4 ? '<span class="warn">hero-gait-v4</span> walk/run' : 'hero-v3'],
    ['TILE EDIT', editMode ? '<span class="warn">ON — click to paint</span>' : 'off'],
    ['HITBOX',   showHitbox ? '<span class="warn">shown (B)</span>' : 'hidden'],
  ];
  document.getElementById('hud').innerHTML =
    rows.map(([k, v]) => `<b>${k.padEnd(9, ' ')}</b> ${v}`).join('<br>');
}

function frame(t) {
  const dt = lastT === null ? 0 : Math.min((t - lastT) / 1000, 0.1);
  lastT = t;
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.25) { fps = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0; }

  if (override) {
    // Inspection mode: freeze the body, drive the animator directly. Facing still
    // follows the move keys so east/west can be compared without leaving override.
    if (Input.heldAny(...LEFT))  p.facingRight = false;
    if (Input.heldAny(...RIGHT)) p.facingRight = true;
    sprite.setState(override, p.facingRight);
    if (playing) sprite._current.update(dt);
  } else {
    step(dt);
  }

  drawRoom();
  drawHeroFrame(ctx, sprite.currentFrame, p.x + PLAYER_W / 2, p.y + PLAYER_H, HERO_DRAW);

  // Hitbox outline. OFF by default — Chief: "remove the weird box on top of the
  // charcter". The 20x30 body sits inside an 80px sprite, so the outline landed across
  // the character's middle and read as a glitch rather than as information. Kept behind
  // a key because the art-to-collision relationship is genuinely useful when something
  // looks mis-anchored, but it is not something to stare at while testing movement.
  if (showHitbox) {
    ctx.strokeStyle = 'rgba(0,229,208,.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(p.x) + .5, Math.round(p.y) + .5, PLAYER_W - 1, PLAYER_H - 1);
  }

  drawHud();
  // MUST be last, exactly as production does it: this copies cur -> prev so that
  // Input.pressed() reports a true one-frame edge. Call it earlier and every
  // pressed() read in the same frame returns false.
  Input.update();
  requestAnimationFrame(frame);
}

// ── Tile edit ────────────────────────────────────────────────────────────────
// Chief: "this doesnt let me out of the hole if i fall in and i keep having to reset so i
// wanna be able to do some quick edits ... i dont need a full asset bank whatevrr this
// teal tile is is fine". So: one brush, no palette. Left-click places, right-click erases,
// drag paints a run, and movement keeps working so you can build a step and walk out.
//
// Strictly in memory. The lab has no save path and does not import the editor's
// persistence layer, so nothing here can reach a level file.
let editMode = false;
let painting = 0;            // 0 none, 1 placing, -1 erasing

const btnEdit    = document.getElementById('te-toggle');
const btnSwatch  = document.getElementById('te-swatch');
const btnFillRow = document.getElementById('te-fillrow');
const btnRestore = document.getElementById('te-restore');

function syncEdit() {
  btnEdit.textContent = 'Edit: ' + (editMode ? 'ON' : 'OFF');
  btnEdit.setAttribute('aria-pressed', String(editMode));
  canvas.style.cursor = editMode ? 'crosshair' : 'default';
}
// ── LAB LEVEL SYSTEM ─────────────────────────────────────────────────────────
// Chief: "this LAB needs its own seprate level system".
//
// Deliberately NOT the game's level system. These are named rooms with their own tiles
// and spawn, stored in localStorage and exportable as JSON. Nothing here can read or
// write `src_scroll/levels/` — the lab must never gain a path into Chief's level data,
// which is the one thing in this project that cannot be regenerated. Keeping the two
// systems apart is the point, not a limitation.
//
// Fixed 30x17 geometry for v1 so every lab level fits the canvas exactly; a stored level
// whose shape does not match is refused rather than misread.
const LV_KEY = 'overcharge.lab.levels.v1';
const status = document.getElementById('te-status');
function say(msg, warn = false) {
  status.innerHTML = warn ? `<span style="color:#ffd166">${msg}</span>` : msg;
  clearTimeout(say._t);
  say._t = setTimeout(() => { status.textContent = ''; }, 5000);
}

let levels = [];        // [{ id, name, cols, rows, tiles:number[], spawn:{x,y} }]
let activeId = null;
let dirty = false;      // unsaved tile edits, shown as * in the list

const templateTiles = () => { const g = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (ROOM[r][c] === '#') g[r*COLS+c] = 1;
  return Array.from(g); };

// A brand new level gets a floor, not a void. An empty room drops the player forever and
// the first thing anyone would do is paint a floor anyway.
function blankTiles() {
  const g = new Uint8Array(COLS * ROWS);
  for (let c = 0; c < COLS; c++) { g[(ROWS-1)*COLS + c] = 1; g[(ROWS-2)*COLS + c] = 1; }
  return Array.from(g);
}

const newId = () => 'lv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const active = () => levels.find(l => l.id === activeId) || null;

function persist() {
  try { localStorage.setItem(LV_KEY, JSON.stringify({ activeId, levels })); return true; }
  catch (e) { say('Could not save: ' + e.message, true); return false; }
}

function loadAll() {
  try {
    const raw = localStorage.getItem(LV_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.levels)) {
        levels = d.levels.filter(l => l && l.cols === COLS && l.rows === ROWS
                                   && Array.isArray(l.tiles) && l.tiles.length === COLS * ROWS);
        const dropped = d.levels.length - levels.length;
        if (dropped > 0) say(`${dropped} saved level(s) had a different shape and were skipped.`, true);
        activeId = levels.some(l => l.id === d.activeId) ? d.activeId : (levels[0]?.id ?? null);
      }
    }
  } catch (e) { say('Saved levels unreadable — starting fresh.', true); levels = []; }

  if (levels.length === 0) {
    levels = [{ id: newId(), name: 'Test Room', cols: COLS, rows: ROWS,
                tiles: templateTiles(), spawn: { x: SPAWN.x, y: SPAWN.y } }];
    activeId = levels[0].id;
    persist();
  }
}

function applyActive() {
  const l = active(); if (!l) return;
  grid = new Uint8Array(l.tiles);
  SPAWN.x = l.spawn.x; SPAWN.y = l.spawn.y;
  reset();
  dirty = false;
  renderList();
}

function renderList() {
  const sel = document.getElementById('lv-select');
  sel.replaceChildren();
  for (const l of levels) {
    const o = document.createElement('option');
    o.value = l.id;
    o.textContent = (l.id === activeId && dirty ? '* ' : '') + l.name;
    sel.append(o);
  }
  sel.value = activeId ?? '';
}

function saveActive() {
  const l = active(); if (!l) return;
  l.tiles = Array.from(grid);
  if (persist()) { dirty = false; renderList(); say(`Saved "${l.name}" — ${grid.reduce((a,v)=>a+v,0)} tiles.`); }
}

document.getElementById('lv-select').addEventListener('change', e => {
  if (dirty && !confirm('This level has unsaved edits. Switch anyway?')) { renderList(); return; }
  activeId = e.target.value; persist(); applyActive(); canvas.focus();
});
document.getElementById('lv-save').addEventListener('click', () => { saveActive(); canvas.focus(); });
document.getElementById('lv-new').addEventListener('click', () => {
  const name = prompt('New lab level name:', 'Room ' + (levels.length + 1));
  if (!name) return;
  levels.push({ id: newId(), name, cols: COLS, rows: ROWS, tiles: blankTiles(),
                spawn: { x: 3 * TILE, y: (ROWS - 4) * TILE } });
  activeId = levels[levels.length - 1].id; persist(); applyActive();
  say(`Created "${name}" with a floor to stand on.`); canvas.focus();
});
document.getElementById('lv-dup').addEventListener('click', () => {
  const l = active(); if (!l) return;
  const name = prompt('Duplicate as:', l.name + ' copy'); if (!name) return;
  levels.push({ id: newId(), name, cols: COLS, rows: ROWS,
                tiles: Array.from(grid), spawn: { ...l.spawn } });
  activeId = levels[levels.length - 1].id; persist(); applyActive();
  say(`Duplicated to "${name}".`); canvas.focus();
});
document.getElementById('lv-rename').addEventListener('click', () => {
  const l = active(); if (!l) return;
  const name = prompt('Rename to:', l.name); if (!name) return;
  l.name = name; persist(); renderList(); say('Renamed.'); canvas.focus();
});
document.getElementById('lv-del').addEventListener('click', () => {
  const l = active(); if (!l) return;
  if (levels.length === 1) { say('That is the only lab level — make another first.', true); return; }
  if (!confirm(`Delete "${l.name}"? This cannot be undone.`)) return;
  levels = levels.filter(x => x.id !== l.id);
  activeId = levels[0].id; persist(); applyActive(); say(`Deleted "${l.name}".`); canvas.focus();
});
document.getElementById('lv-spawn').addEventListener('click', () => {
  const l = active(); if (!l) return;
  l.spawn = { x: Math.round(p.x / TILE) * TILE, y: Math.round(p.y / TILE) * TILE };
  SPAWN.x = l.spawn.x; SPAWN.y = l.spawn.y;
  persist(); say(`Spawn set to (${l.spawn.x}, ${l.spawn.y}) — R returns here.`); canvas.focus();
});
document.getElementById('lv-reset-room').addEventListener('click', () => {
  if (!confirm('Replace this level\'s tiles with the built-in template?')) return;
  grid = new Uint8Array(templateTiles()); dirty = true; renderList();
  say('Template loaded — press 💾 to keep it.'); canvas.focus();
});

// Export / import so a lab level can leave this browser. JSON only, and import validates
// shape before touching anything.
document.getElementById('lv-export').addEventListener('click', () => {
  const l = active(); if (!l) return;
  const payload = { _schema: 'overcharge-lab-level@1', ...l, tiles: Array.from(grid) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = l.name.replace(/[^\w.-]+/g, '_') + '.lab.json';
  a.click(); URL.revokeObjectURL(a.href);
  say('Exported ' + a.download);
});
document.getElementById('lv-import').addEventListener('click', () => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.addEventListener('change', async () => {
    const f = inp.files?.[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.cols !== COLS || d.rows !== ROWS || !Array.isArray(d.tiles) || d.tiles.length !== COLS * ROWS)
        return say('That file is not a lab level of this shape — ignored.', true);
      levels.push({ id: newId(), name: d.name || f.name.replace(/\.lab\.json$/, ''),
                    cols: COLS, rows: ROWS, tiles: d.tiles.map(v => v ? 1 : 0),
                    spawn: d.spawn && Number.isFinite(d.spawn.x) ? d.spawn : { x: 3*TILE, y: (ROWS-4)*TILE } });
      activeId = levels[levels.length - 1].id; persist(); applyActive();
      say(`Imported "${levels[levels.length-1].name}".`);
    } catch (e) { say('Import failed: ' + e.message, true); }
  });
  inp.click();
});

btnEdit.addEventListener('click', () => { editMode = !editMode; syncEdit(); canvas.focus(); });
btnSwatch.addEventListener('click', () => { editMode = true; syncEdit(); canvas.focus(); });
// The specific thing Chief asked for: fall in a pit, one click, floor appears under you.
btnFillRow.addEventListener('click', () => {
  const r = Math.min(ROWS - 1, Math.floor((p.y + PLAYER_H + 1) / TILE));
  const c = Math.floor((p.x + PLAYER_W / 2) / TILE);
  for (let i = c - 2; i <= c + 2; i++) setTile(i, r, 1);
  canvas.focus();
});

// Canvas pixels -> grid cell. The canvas is CSS-scaled, so the backing resolution and the
// on-screen size differ; without this ratio the painted cell drifts from the cursor.
function cellAt(ev) {
  const b = canvas.getBoundingClientRect();
  const x = (ev.clientX - b.left) * (canvas.width  / b.width);
  const y = (ev.clientY - b.top ) * (canvas.height / b.height);
  return { c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
}

canvas.tabIndex = 0;
canvas.addEventListener('contextmenu', e => { if (editMode) e.preventDefault(); });
canvas.addEventListener('pointerdown', e => {
  canvas.focus();
  if (!editMode) return;
  e.preventDefault();
  painting = e.button === 2 ? -1 : 1;
  const { c, r } = cellAt(e);
  setTile(c, r, painting === 1 ? 1 : 0);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!editMode || !painting) return;
  const { c, r } = cellAt(e);
  setTile(c, r, painting === 1 ? 1 : 0);
});
const endPaint = () => { painting = 0; };
canvas.addEventListener('pointerup', endPaint);
canvas.addEventListener('pointercancel', endPaint);
window.addEventListener('blur', endPaint);

// Test handle. The lab is a dev page that nothing in the game imports, so exposing its
// internals costs nothing and makes the ledge mechanic testable DETERMINISTICALLY.
// Driving it through a 2.7s walk and a jump depended on rAF timing, which a throttled
// headless browser does not deliver reliably — the mechanic was fine and the test was
// flaky, which is the worst kind of red.
window.__lab = {
  player: p,
  findLedge,
  setTile, solidAt, restoreRoom,
  TILE, PLAYER_W, PLAYER_H,
  // lab level system, for tests
  levels: () => levels.map(l => ({ id: l.id, name: l.name })),
  activeId: () => activeId,
  isDirty: () => dirty,
  saveActive, applyActive,
  switchTo: (id) => { activeId = id; persist(); applyActive(); },
  spawn: () => ({ ...SPAWN }),
  state: () => ({ state: sprite.state, ledge: p.ledge, climbing: p.climbing,
                  x: p.x, y: p.y, vy: p.vy, grounded: p.grounded }),
  // Put the body beside a lip and let the real step() decide. No teleport-into-hanging:
  // the grab must be earned by the same code the player exercises.
  placeBeside(c, r, dir = 1) {
    p.ledge = null; p.climbing = false;
    p.x = dir > 0 ? c * TILE - PLAYER_W : (c + 1) * TILE;
    p.y = r * TILE - 4;
    p.vx = 0; p.vy = 60;            // falling, which is when a grab is allowed
    p.grounded = false;
    p.facingRight = dir > 0;
  },
};

markDirty = () => { if (!dirty) { dirty = true; renderList(); } };

syncEdit();
loadAll();
applyActive();
window.addEventListener('beforeunload', e => {
  // Losing a room you spent time on because you closed the tab is exactly the kind of
  // silent data loss this project has already paid for twice.
  if (dirty) { e.preventDefault(); e.returnValue = ''; }
});
requestAnimationFrame(frame);
