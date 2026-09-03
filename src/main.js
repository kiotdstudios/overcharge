// OVERCHARGE — main entry point
// Game loop, state machine, scene orchestration
import * as Input from './input.js';
import { clear, drawText } from './render.js';
import { Level }  from './level.js';
import { Player } from './player.js';
import { drawHUD, drawLevelComplete, drawTitleScreen, drawGameOver } from './ui.js';
import { W, H, C, MAX_CHARGE, MAX_BANKED_PIPS } from './constants.js';

import { LEVEL1  } from './levels/level1.js';
import { LEVEL2  } from './levels/level2.js';
import { LEVEL3  } from './levels/level3.js';
import { LEVEL4  } from './levels/level4.js';
import { LEVEL5  } from './levels/level5.js';
import { LEVEL6  } from './levels/level6.js';
import { LEVEL7  } from './levels/level7.js';
import { LEVEL8  } from './levels/level8.js';
import { LEVEL9  } from './levels/level9.js';
import { LEVEL10 } from './levels/level10.js';

const LEVEL_DEFS = [LEVEL1, LEVEL2, LEVEL3, LEVEL4, LEVEL5, LEVEL6, LEVEL7, LEVEL8, LEVEL9, LEVEL10];

// ── Canvas setup ──────────────────────────────
const canvas  = document.getElementById('game');
const ctx     = canvas.getContext('2d');

function resize() {
  const scaleX = window.innerWidth  / W;
  const scaleY = window.innerHeight / H;
  const scale  = Math.min(scaleX, scaleY);
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}
resize();
window.addEventListener('resize', resize);

// ── Game State ────────────────────────────────
const STATES = { TITLE: 0, PLAYING: 1, LEVEL_COMPLETE: 2, GAME_OVER: 3 };

let state        = STATES.TITLE;
let currentLevelIdx = 0;
let level        = null;
let player       = null;
let t            = 0;       // global time (seconds)
let completeTimer = 0;

function loadLevel(idx, carryCharge = false) {
  const savedCharge = carryCharge && player ? player.charge : 0;
  const def = LEVEL_DEFS[idx % LEVEL_DEFS.length];
  level  = new Level(def);
  player = new Player(level.playerStart.x, level.playerStart.y);
  if (carryCharge) player.charge = savedCharge; // persist charge across levels
  level.complete = false;
  completeTimer  = 0;
}

function startGame() {
  currentLevelIdx = 0;
  loadLevel(0);               // fresh start — charge 0
  state = STATES.PLAYING;
}

function advanceLevel() {
  currentLevelIdx++;
  if (currentLevelIdx >= LEVEL_DEFS.length) {
    currentLevelIdx = 0;
  }
  loadLevel(currentLevelIdx, true); // carry charge into next level
  state = STATES.PLAYING;
}

// ── Game loop ─────────────────────────────────
let lastTime = null;

function loop(now) {
  requestAnimationFrame(loop);

  if (lastTime === null) { lastTime = now; }
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms (20fps min)
  lastTime = now;
  t += dt;

  update(dt);
  render();
  Input.update(); // snapshot current frame AFTER processing, so pressed() works next frame
}

function update(dt) {
  switch (state) {
    case STATES.TITLE:
      if (Input.pressedAny('Space', 'Enter')) startGame();
      break;

    case STATES.PLAYING:
      player.update(dt, level);
      level.update(dt, player);

      // Dev: skip level with F2 / add charge with P
      if (Input.pressed('F2')) advanceLevel();
      if (Input.pressed('KeyP')) {
        if (player.charge < MAX_CHARGE) {
          player.charge = Math.min(player.charge + 2, MAX_CHARGE);
        } else if (player.bankedPips < MAX_BANKED_PIPS) {
          player.bankedPips++;
        }
      }

      // Game over: fell off level OR impossible to finish (not enough charge left)
      if (player.y > H + 60 || level.isFailState(player)) {
        state = STATES.GAME_OVER;
      }

      if (level.complete) {
        state = STATES.LEVEL_COMPLETE;
        completeTimer = 0;
      }
      break;

    case STATES.LEVEL_COMPLETE:
      completeTimer += dt;
      level.update(dt, player); // keep animating
      if (completeTimer > 0.5 && Input.pressedAny('Space', 'Enter')) {
        advanceLevel();
      }
      break;

    case STATES.GAME_OVER:
      if (Input.pressedAny('KeyR')) {
        loadLevel(currentLevelIdx);
        state = STATES.PLAYING;
      }
      if (Input.pressedAny('Space')) {
        state = STATES.TITLE;
      }
      break;
  }
}

function render() {
  clear(ctx, W, H, C.BG);

  switch (state) {
    case STATES.TITLE:
      drawTitleScreen(ctx, t);
      break;

    case STATES.PLAYING:
      _drawGame();
      drawHUD(ctx, player, level, t);
      _drawControls(ctx);
      break;

    case STATES.LEVEL_COMPLETE:
      _drawGame();
      drawHUD(ctx, player, level, t);
      drawLevelComplete(ctx, level, completeTimer, t);
      break;

    case STATES.GAME_OVER:
      _drawGame();
      drawGameOver(ctx, t);
      break;
  }
}

function _drawGame() {
  // Subtle scanline effect on background
  _drawScanlines(ctx);
  level.draw(ctx, t);
  player.draw(ctx);
}

function _drawScanlines(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle   = '#000';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

function _drawControls(ctx) {
  // TEMP — remove before release
  ctx.fillStyle = 'rgba(5,8,15,0.75)';
  ctx.fillRect(0, 0, W, 20);
  ctx.fillStyle = '#3a5060';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MOVE: ← →   JUMP: ↑ / W   ABSORB: hold E   CHARGE: hold SPACE   [F2] skip   [P] +charge', W / 2, 13);
}

// ── Boot ──────────────────────────────────────
requestAnimationFrame(loop);
