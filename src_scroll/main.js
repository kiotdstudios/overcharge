// OVERCHARGE — scroll edition
// Camera follows player horizontally; checkpoints save respawn; one wide level.
import * as Input from './input.js';
import { clear } from './render.js';
import { Level }  from './level.js';
import { init as bgInit, update as bgUpdate } from './background.js';
import { Player } from './player.js';
import { drawHUD, drawLevelComplete, drawTitleScreen, drawGameOver } from './ui.js';
import { W, H, C, MAX_CHARGE, MAX_BANKED_PIPS } from './constants.js';
import { LEVEL1 } from './levels/level1.js';

// ── Editor-driven test mode ──────────────────────────────────────────────
// When launched with `?test=1`, load the level def from localStorage under
// the shared key `overcharge.testLevel` — the editor's ▶ TEST button writes
// the current in-memory level here before opening this tab. Any failure
// silently falls back to LEVEL1 so a broken localStorage state never blocks
// launching the normal game.
const TEST_LEVEL_KEY = 'overcharge.testLevel';
function _tryLoadTestLevel() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') !== '1') return null;
    const raw = localStorage.getItem(TEST_LEVEL_KEY);
    if (!raw) return null;
    const def = JSON.parse(raw);
    if (!def || !Array.isArray(def.tiles) || !def.playerStart) return null;
    // Ensure the def has all the arrays Level constructor expects, so an
    // editor-saved level with missing collections still runs.
    def.sources     = def.sources     || [];
    def.gates       = def.gates       || [];
    def.switches    = def.switches    || [];
    def.checkpoints = def.checkpoints || [];
    def.platforms   = def.platforms   || [];
    def.enemies     = def.enemies     || [];
    def.decorations = def.decorations || [];
    def.name        = def.name || 'TEST';
    def.number      = def.number ?? 0;
    console.info('[game] Test mode: loaded level from editor', def.name);
    return def;
  } catch (err) {
    console.warn('[game] Test mode requested but level load failed:', err);
    return null;
  }
}
const _TEST_LEVEL = _tryLoadTestLevel();
const LEVEL_DEFS = _TEST_LEVEL ? [_TEST_LEVEL] : [LEVEL1];

// ── Canvas ─────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
  ctx.imageSmoothingEnabled = false; // pixel-perfect: no blur on integer-scaled sprites/tiles
}
resize();
window.addEventListener('resize', resize);

// Parallax background — sized to the loaded level's width so tests of any
// length (Short/Medium/Long from the generator) get proper parallax range.
// SKIPPED in test mode per Chief: the neon-windows layers compete with the
// authored level content while iterating. Normal LEVEL1 game unaffected.
const _bgW = ((LEVEL_DEFS[0] && LEVEL_DEFS[0].cols) || 100) * 32;
if (!_TEST_LEVEL) bgInit(_bgW);

// ── State ──────────────────────────────────────
const STATES = { TITLE: 0, PLAYING: 1, LEVEL_COMPLETE: 2, GAME_OVER: 3 };
let state           = STATES.TITLE;   // startup default; test mode auto-starts below
let currentLevelIdx = 0;
let level  = null;
let player = null;
let t      = 0;
let completeTimer = 0;

// Camera
let camX = 0;

// Checkpoint respawn
let respawnX = 0;
let respawnY = 0;
let _cpFlash = 0;   // seconds to show "CHECKPOINT SAVED" message

function _updateCamera() {
  const target = player.x - W / 2 + player.w / 2;
  camX = Math.max(0, Math.min(target, level.pxW - W));
}

function loadLevel(idx, carryCharge = false) {
  const savedCharge = carryCharge && player ? player.charge : 0;
  const def = LEVEL_DEFS[idx % LEVEL_DEFS.length];
  level  = new Level(def);
  player = new Player(level.playerStart.x, level.playerStart.y);
  if (carryCharge) player.charge = savedCharge;
  level.complete = false;
  completeTimer  = 0;
  respawnX = level.playerStart.x;
  respawnY = level.playerStart.y;
  camX     = Math.max(0, Math.min(respawnX - W / 2, level.pxW - W));
  _cpFlash = 0;
}

function startGame() {
  currentLevelIdx = 0;
  loadLevel(0);
  state = STATES.PLAYING;
}

function advanceLevel() {
  currentLevelIdx = (currentLevelIdx + 1) % LEVEL_DEFS.length;
  loadLevel(currentLevelIdx, true);
  state = STATES.PLAYING;
}

function _respawn() {
  player   = new Player(respawnX, respawnY);
  camX     = Math.max(0, Math.min(respawnX - W / 2, level.pxW - W));
}

// ── Loop ───────────────────────────────────────
let lastTime = null;
function loop(now) {
  requestAnimationFrame(loop);
  if (lastTime === null) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  t += dt;
  _update(dt);
  _render();
  Input.update();
}

function _update(dt) {
  switch (state) {
    case STATES.TITLE:
      if (Input.pressedAny('Space', 'Enter')) startGame();
      break;

    case STATES.PLAYING:
      player.update(dt, level);
      level.update(dt, player);
      _updateCamera();
      _cpFlash = Math.max(0, _cpFlash - dt);

      // Checkpoint activation
      for (const cp of level.checkpoints) {
        if (cp.tryActivate(player)) {
          respawnX = cp.x;
          respawnY = cp.y;
          _cpFlash = 2.5;
        }
      }

      // Dev shortcuts
      if (Input.pressed('F2')) advanceLevel();
      if (Input.pressed('KeyP')) {
        if (player.charge < MAX_CHARGE)             player.charge = Math.min(player.charge + 2, MAX_CHARGE);
        else if (player.bankedPips < MAX_BANKED_PIPS) player.bankedPips++;
      }

      // Fall off level → respawn at last checkpoint (not a full game over)
      if (player.y > H + 60) _respawn();

      // Hit with no charge and no pips → game over
      if (player.dead) state = STATES.GAME_OVER;

      // No charge path remaining → actual fail state
      if (level.isFailState(player)) state = STATES.GAME_OVER;

      if (level.complete) {
        state = STATES.LEVEL_COMPLETE;
        completeTimer = 0;
      }
      break;

    case STATES.LEVEL_COMPLETE:
      completeTimer += dt;
      level.update(dt, player);
      if (completeTimer > 0.5 && Input.pressedAny('Space', 'Enter')) advanceLevel();
      break;

    case STATES.GAME_OVER:
      if (Input.pressedAny('KeyR')) { loadLevel(currentLevelIdx); state = STATES.PLAYING; }
      if (Input.pressedAny('Space'))  state = STATES.TITLE;
      break;
  }
}

function _render() {
  clear(ctx, W, H, C.BG);
  switch (state) {
    case STATES.TITLE:
      drawTitleScreen(ctx, t);
      break;
    case STATES.PLAYING:
      _drawScrollGame();
      drawHUD(ctx, player, level, t);
      _drawDevBar();
      _drawCpFlash();
      break;
    case STATES.LEVEL_COMPLETE:
      _drawScrollGame();
      drawHUD(ctx, player, level, t);
      drawLevelComplete(ctx, level, completeTimer, t);
      break;
    case STATES.GAME_OVER:
      _drawScrollGame();
      drawGameOver(ctx, t);
      break;
  }
}

function _drawScrollGame() {
  if (!_TEST_LEVEL) bgUpdate(camX);
  // Scanlines — fixed, not scrolled
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle   = '#000';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();
  // World: translate by camera before drawing level + player
  ctx.save();
  ctx.translate(-Math.round(camX), 0);
  level.draw(ctx, t);
  player.draw(ctx);
  ctx.restore();
}

function _drawDevBar() {
  ctx.fillStyle = 'rgba(5,8,15,0.75)';
  ctx.fillRect(0, 0, W, 20);
  ctx.fillStyle = '#3a5060';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    '\u2190\u2192 MOVE   \u2191/W JUMP   E ABSORB   SPACE CHARGE   [F2] skip   [P] +charge',
    W / 2, 13
  );
}

function _drawCpFlash() {
  if (_cpFlash <= 0) return;
  const alpha = Math.min(1, _cpFlash * 1.5);
  ctx.save();
  ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(t * 9));
  ctx.shadowBlur  = 14;
  ctx.shadowColor = '#44ff88';
  ctx.fillStyle   = '#44ff88';
  ctx.font        = 'bold 16px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('\u2713 CHECKPOINT SAVED', W / 2, H / 2 - 40);
  ctx.restore();
}

// Test mode: auto-start into PLAYING so Chief lands directly in the level.
if (_TEST_LEVEL) startGame();

requestAnimationFrame(loop);
