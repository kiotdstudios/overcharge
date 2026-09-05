// OVERCHARGE — scroll edition
// Camera follows player horizontally; checkpoints save respawn; one wide level.
//
// LEVEL DATA PIPELINE (single source of truth):
//   src_scroll/levels/level<N>.json  ← the ONE authoritative level definition.
//   Editor loads it, saves back to it. Runtime fetches it at boot.
//   There is NO hand-authored JS mirror. Do not reintroduce one.
import * as Input from './input.js';
import { clear } from './render.js';
import { Level }  from './level.js';
import { init as bgInit, update as bgUpdate } from './background.js';
import { Player } from './player.js';
import { drawHUD, drawLevelComplete, drawTitleScreen, drawGameOver } from './ui.js';
import { W, H, C, MAX_CHARGE, MAX_BANKED_PIPS } from './constants.js';
import { initViewport, viewW } from './viewport.js';
import { logLevelSource } from './levelsig.js';

// ── Editor-driven test mode ──────────────────────────────────────────────
// When launched with `?test=1`, load the level def from localStorage under
// the shared key `overcharge.testLevel` — the editor's ▶ TEST button writes
// the current in-memory level here before opening this tab. Any failure
// falls through to the JSON pipeline so a broken localStorage state never
// blocks launching the normal game.
const TEST_LEVEL_KEY = 'overcharge.testLevel';
function _tryLoadTestLevel() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') !== '1') return null;
    const raw = localStorage.getItem(TEST_LEVEL_KEY);
    if (!raw) return null;
    const def = JSON.parse(raw);
    if (!def || !Array.isArray(def.tiles) || !def.playerStart) return null;
    _normalizeLevelDef(def, 'TEST', 0);
    logLevelSource('[game] BUILDER TEST',
      `localStorage['${TEST_LEVEL_KEY}']  (UNSAVED editor preview — not the committed JSON)`, def);
    return def;
  } catch (err) {
    console.warn('[game] Test mode requested but level load failed:', err);
    return null;
  }
}

// Editor-saved levels may omit empty collections; the Level constructor
// tolerates missing arrays but consumers assume they exist. Normalize here.
function _normalizeLevelDef(def, defaultName, defaultNumber) {
  def.sources     = def.sources     || [];
  def.gates       = def.gates       || [];
  def.switches    = def.switches    || [];
  def.checkpoints = def.checkpoints || [];
  def.platforms   = def.platforms   || [];
  def.enemies     = def.enemies     || [];
  def.decorations = def.decorations || [];
  def.name        = def.name || defaultName;
  def.number      = def.number ?? defaultNumber;
  return def;
}

// Fetch a level JSON from the levels directory. Path is resolved relative
// to the served HTML (index.html), so this works identically local and on
// GitHub Pages (no bundler, static files served as-is).
async function _loadJsonLevel(path, fallbackName, fallbackNumber) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Level fetch failed: ${path} (HTTP ${res.status})`);
  const def = await res.json();
  if (!def || !Array.isArray(def.tiles) || !def.playerStart) {
    throw new Error(`Level malformed: ${path} — missing tiles/playerStart`);
  }
  return _normalizeLevelDef(def, fallbackName, fallbackNumber);
}

// LEVEL_DEFS filled by _bootAsync — see bottom of file. Kept the same
// single-element array shape as the previous JS-import version so runtime
// gameplay (advanceLevel / loadLevel(idx)) is unchanged.
let LEVEL_DEFS   = null;
let _TEST_LEVEL  = null;
let _bgEnabled   = false;   // set by _bootAsync from the level JSON `background` field

// ── Canvas + viewport ──────────────────────────
// Sizing lives in viewport.js. It COVERS the browser viewport (no black
// pillarbox bars), keeps scaling uniform + nearest-neighbour, and reveals
// more WORLD horizontally on wider screens instead of stretching. Level
// geometry is untouched — only the visible window changes.
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
initViewport(canvas, ctx);

// Parallax background — see _bootAsync. It is DATA-DRIVEN off the level JSON
// (`background` field). Level 1 does not request one, so no procedural city
// appears in either boot path. See the note in _bootAsync for the history.

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
  const target = player.x - viewW() / 2 + player.w / 2;
  camX = Math.max(0, Math.min(target, level.pxW - viewW()));
}

// ── Checkpoint snapshot ──────────────────────────
// The full "restore state on death" model. We keep a single snapshot
// object with the level's mutable state AND the player's charge/pip
// state at snapshot time. Taken at level load (fallback = initial state)
// and refreshed on each checkpoint activation.
let _snap = null;

function _takeSnapshot() {
  _snap = {
    level: level.snapshot(),
    player: { charge: player.charge, bankedPips: player.bankedPips },
    respawnX, respawnY,
  };
}

function _applySnapshot() {
  if (!_snap) return false;
  level.restore(_snap.level);
  player = new Player(_snap.respawnX, _snap.respawnY);
  player.charge     = _snap.player.charge;
  player.bankedPips = _snap.player.bankedPips;
  respawnX = _snap.respawnX;
  respawnY = _snap.respawnY;
  camX = Math.max(0, Math.min(respawnX - viewW() / 2, level.pxW - viewW()));
  _cpFlash = 0;
  return true;
}

function loadLevel(idx, carryCharge = false) {
  const savedCharge = carryCharge && player ? player.charge : 0;
  const savedPips   = carryCharge && player ? player.bankedPips : 0;
  const def = LEVEL_DEFS[idx % LEVEL_DEFS.length];
  level  = new Level(def);
  player = new Player(level.playerStart.x, level.playerStart.y);
  if (carryCharge) { player.charge = savedCharge; player.bankedPips = savedPips; }
  level.complete = false;
  completeTimer  = 0;
  respawnX = level.playerStart.x;
  respawnY = level.playerStart.y;
  camX     = Math.max(0, Math.min(respawnX - viewW() / 2, level.pxW - viewW()));
  _cpFlash = 0;
  // Initial snapshot = clean level + initial player state. If Chief dies
  // before touching any checkpoint, _applySnapshot restores this.
  _takeSnapshot();
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
  _applySnapshot();
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

      // Checkpoint activation — first cross snapshots the whole level +
      // player state so death fully rewinds to this moment.
      for (const cp of level.checkpoints) {
        if (cp.tryActivate(player)) {
          respawnX = cp.x;
          respawnY = cp.y;
          _cpFlash = 2.5;
          _takeSnapshot();
        }
      }

      // Dev shortcuts
      if (Input.pressed('F2')) advanceLevel();
      // Dev P now feeds energy through the SAME rule the game uses
      // (fill bar first, roll to pip when bar tops out). No shortcut
      // that bypasses the charge model.
      if (Input.pressed('KeyP')) player.giveEnergy(2);

      // Fall off level → respawn at last checkpoint (not a full game over).
      // _respawn() restores the full snapshot: level state + player
      // charge/pip, not just position.
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
      // R restores from checkpoint snapshot; Space returns to title.
      if (Input.pressedAny('KeyR')) { _respawn(); player.dead = false; state = STATES.PLAYING; }
      if (Input.pressedAny('Space'))  state = STATES.TITLE;
      break;
  }
}

function _render() {
  clear(ctx, viewW(), H, C.BG);
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
  if (_bgEnabled) bgUpdate(camX);   // parity: driven by level data, not by test-vs-normal
  // Scanlines — fixed, not scrolled
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle   = '#000';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, viewW(), 1);
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
  ctx.fillRect(0, 0, viewW(), 20);
  ctx.fillStyle = '#3a5060';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    '\u2190\u2192 MOVE   \u2191/W JUMP   E ABSORB/DISCHARGE   SPACE ATTACK   F SPEND PIP   [F2] skip   [P] +charge',
    viewW() / 2, 13
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
  ctx.fillText('\u2713 CHECKPOINT SAVED', viewW() / 2, H / 2 - 40);
  ctx.restore();
}

// ── Boot: fetch level JSON, then launch ──────────
// Runtime and editor share ONE authoritative source per level (level<N>.json).
// The runtime no longer imports a hand-authored JS mirror. If Chief updates
// a level in the editor and saves it back to src_scroll/levels/level<N>.json,
// the next runtime launch picks it up automatically.
//
// Progression note: LEVEL_DEFS keeps the same single-Level-1 array the
// runtime has always used. Adding levels to game progression is a gameplay
// change, not a data-pipeline change, and requires its own Chief directive.
function _drawFatalLevelLoadError(msg) {
  clear(ctx, viewW(), H, C.BG);
  ctx.fillStyle = '#ff4466';
  ctx.font      = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL LOAD FAILED', viewW() / 2, H / 2 - 20);
  ctx.fillStyle = '#c8d8f0';
  ctx.font      = '11px monospace';
  ctx.fillText(msg.slice(0, 90), viewW() / 2, H / 2 + 6);
  ctx.fillStyle = '#7ab4ff';
  ctx.fillText('Check console for details.', viewW() / 2, H / 2 + 30);
}

function _drawBootingScreen() {
  clear(ctx, viewW(), H, C.BG);
  ctx.fillStyle = '#7ab4ff';
  ctx.font      = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LOADING\u2026', viewW() / 2, H / 2);
}

async function _bootAsync() {
  _drawBootingScreen();
  _TEST_LEVEL = _tryLoadTestLevel();
  if (_TEST_LEVEL) {
    LEVEL_DEFS = [_TEST_LEVEL];
  } else {
    const LEVEL1_PATH = 'src_scroll/levels/level1.json';
    try {
      const l1 = await _loadJsonLevel(LEVEL1_PATH, 'LEVEL 1', 1);
      LEVEL_DEFS = [l1];
      logLevelSource('[game] NORMAL GAME', LEVEL1_PATH + '  (authoritative committed JSON)', l1);
    } catch (err) {
      console.error('[game] FATAL: Level 1 JSON failed to load', err);
      _drawFatalLevelLoadError(err.message || 'unknown error');
      return; // do NOT start the loop or fall back to a stale bundled level.
    }
  }

  // ── Parallax background: DATA-DRIVEN, never implicit ──────────────────
  // PARITY BUGFIX (Chief §3): bgInit() used to be called whenever we were
  // NOT in test mode. background.js builds a large procedural DOM city
  // (sky / far / mid / near silhouettes, rain, lightning) and inserts it
  // behind the canvas. Result: the normal game rendered a neon city behind
  // Level 1 while Builder TEST rendered none — identical level JSON, wildly
  // different picture. That is the "old Level 1 with the city background".
  //
  // The city is NOT part of any level's authored data, so it must not appear
  // implicitly. It is now opt-in per level via the JSON `background` field.
  // Level 1 does not set it, so neither boot path shows a city. background.js
  // itself is untouched and stays available for levels that ask for it.
  const bgKind = LEVEL_DEFS[0] && LEVEL_DEFS[0].background;
  if (bgKind) {
    const _bgW = ((LEVEL_DEFS[0] && LEVEL_DEFS[0].cols) || 100) * 32;
    bgInit(_bgW);
    console.info(`[game] parallax background ENABLED by level data (background="${bgKind}")`);
  } else {
    console.info('[game] parallax background OFF — level JSON declares no "background" field');
  }
  _bgEnabled = !!bgKind;

  if (_TEST_LEVEL) startGame();       // auto-start in TEST so Chief lands in-level
  requestAnimationFrame(loop);
}

_bootAsync();
