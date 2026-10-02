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

const RUN_MULT   = 2.1;    // lab-only: production has no run state to match
const HERO_DRAW  = 80;     // game-scale display, same as Hero Lab's 80px preview
const COYOTE     = 0.10;   // lab-only convenience so jump tests are not frame-perfect
const JUMP_BUF   = 0.12;
const HURT_TIME  = 0.45;
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
  '..........####.......#..#.....',   // low raised platform for jump/landing
  '..............................',
  '..............................',
  '..............................',
  '####################....######',   // flat baseline, with a gap to fall into
  '####################....######',
  '####################....######',
  '####################....######',
  '##############################',
];
const COLS = ROOM[0].length, ROWS = ROOM.length;
const solidAt = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS) ? (r >= ROWS ? false : true) : ROOM[r][c] === '#';

const SPAWN = { x: 3 * TILE, y: 11 * TILE };

// ── State ────────────────────────────────────────────────────────────────────
const sprite = new PlayerSprites({});
const canvas = document.getElementById('lab');
const ctx    = canvas.getContext('2d');

const p = {
  x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0,
  grounded: false, facingRight: true,
  coyote: 0, jumpBuf: 0, hurtT: 0,
  absorbing: false, discharging: false,
  attackT: 0, projectile: false,
};
const keys = new Set();
let override = null;        // forced state name, or null for gameplay
let playing  = true;        // override playback
let lastT    = null;
let fps      = 0, fpsAcc = 0, fpsFrames = 0;

function reset() {
  Object.assign(p, {
    x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, grounded: false, facingRight: true,
    coyote: 0, jumpBuf: 0, hurtT: 0,
    absorbing: false, discharging: false, attackT: 0, projectile: false,
  });
}

// ── Input ────────────────────────────────────────────────────────────────────
// Keydown is where one-shots fire. The attack is latched for ATTACK_LATCH seconds so a
// tap survives to the next frame; the animator's own `attackStart` edge then triggers
// the one-shot and holds it until the clip finishes, so the latch expiring mid-swing is
// harmless. Holding the key does not retrigger, because the latch only re-arms on a
// fresh keydown.
addEventListener('keydown', e => {
  if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === ' ' || e.code === 'Space') { e.preventDefault(); p.jumpBuf = JUMP_BUF; }
  if (['a','d','e','f','h','j','k','r'].includes(k)) e.preventDefault();
  keys.add(k);
  if (e.repeat) return;                       // held key must not re-arm the latch
  if (k === 'r') reset();
  if (k === 'h') p.hurtT = HURT_TIME;
  if (k === 'j') { p.attackT = ATTACK_LATCH; p.projectile = false; }
  if (k === 'k') { p.attackT = ATTACK_LATCH; p.projectile = true;  }
}, { passive: false });

addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

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
function step(dt) {
  const running = keys.has('shift') || keys.has('arrowshift');
  const left = keys.has('a'), right = keys.has('d');
  const dir = (right ? 1 : 0) - (left ? 1 : 0);

  p.absorbing   = keys.has('e');
  p.discharging = keys.has('f');
  p.hurtT   = Math.max(0, p.hurtT - dt);
  p.attackT = Math.max(0, p.attackT - dt);

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
    // follows A/D so east/west can be compared without leaving override.
    if (keys.has('a')) p.facingRight = false;
    if (keys.has('d')) p.facingRight = true;
    sprite.setState(override, p.facingRight);
    if (playing) sprite._current.update(dt);
  } else {
    step(dt);
  }

  drawRoom();
  drawHeroFrame(ctx, sprite.currentFrame, p.x + PLAYER_W / 2, p.y + PLAYER_H, HERO_DRAW);

  // Hitbox outline — the sprite draws at 80px while the body is 20x30, so without
  // this the relationship between art and collision is invisible.
  ctx.strokeStyle = 'rgba(0,229,208,.45)'; ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(p.x) + .5, Math.round(p.y) + .5, PLAYER_W - 1, PLAYER_H - 1);

  drawHud();
  requestAnimationFrame(frame);
}

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());
requestAnimationFrame(frame);
