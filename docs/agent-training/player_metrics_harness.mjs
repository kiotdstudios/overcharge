// Instrumentation harness for OVERCHARGE player controller.
// Boots the actual Player class against a synthetic Level shim, drives
// keyboard events into the Input module, steps physics at fixed dt,
// records trajectory data and prints metrics.

// ── DOM/env shims — must be installed BEFORE input.js registers listeners ──
globalThis.__listeners = {};
globalThis.window = {
  addEventListener: (name, fn) => {
    (globalThis.__listeners[name] = globalThis.__listeners[name] || []).push(fn);
  }
};
globalThis.document = {
  addEventListener: () => {},
  createElement: () => ({ getContext: () => ({ fillRect: () => {}, drawImage: () => {}, save:()=>{}, restore:()=>{}, translate:()=>{}, rotate:()=>{}, beginPath:()=>{}, closePath:()=>{}, arc:()=>{}, fill:()=>{}, stroke:()=>{}, moveTo:()=>{}, lineTo:()=>{}, rect:()=>{}, fillText:()=>{}, strokeText:()=>{}, measureText:()=>({width:0}) }) }),
  body: { appendChild: () => {} },
};
globalThis.Image = class {
  constructor() { this.complete = true; this.naturalWidth = 92; this.naturalHeight = 92; }
  addEventListener(n, f) { if (n === 'load') setTimeout(f, 0); }
};

// Dynamic imports AFTER shims are attached above.
const { Player } = await import('../../src_scroll/player.js');
const Input = await import('../../src_scroll/input.js');
const {
  TILE, COLS, ROWS, W, H,
  GRAVITY, PLAYER_SPEED, JUMP_FORCE, PLAYER_W, PLAYER_H, RUN_MULTIPLIER,
} = await import('../../src_scroll/constants.js');

function fireKey(name, code) {
  const ls = globalThis.__listeners[name] || [];
  for (const fn of ls) fn({ code, preventDefault: () => {} });
}
const keyDown = c => fireKey('keydown', c);
const keyUp   = c => fireKey('keyup',   c);
function releaseAll() {
  for (const c of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','ShiftLeft','ShiftRight','Space','KeyE','KeyF']) keyUp(c);
}

// ── Synthetic level (floor at row 12, 200 cols wide) ──
function makeLevel({ platformX = null, gapCols = null, floorRow = 12, ledgeCol = null, ledgeRow = null } = {}) {
  const cols = 200;
  const tiles = new Array(cols * ROWS).fill(0);
  const put = (c, r, v) => { if (c >= 0 && c < cols && r >= 0 && r < ROWS) tiles[r*cols + c] = v; };
  for (let c = 0; c < cols; c++) put(c, floorRow, 1);
  for (let r = floorRow+1; r < ROWS; r++) for (let c = 0; c < cols; c++) put(c, r, 1);
  if (platformX !== null && gapCols !== null) {
    for (let c = platformX; c < platformX + gapCols; c++) {
      for (let r = floorRow; r < ROWS; r++) put(c, r, 0);
    }
  }
  if (ledgeCol !== null && ledgeRow !== null) {
    for (let c = ledgeCol; c < ledgeCol + 8; c++) put(c, ledgeRow, 1);
  }
  return {
    cols, tiles,
    gates: [], platforms: [], sources: [], pickups: [], enemies: [], switches: [], checkpoints: [],
    pxW: cols * TILE,
    tileAt(tx, ty) { if (tx < 0 || tx >= cols || ty < 0) return 1; if (ty >= ROWS) return 0; return tiles[ty*cols + tx] || 0; },
    solidAt(tx, ty) { const v = this.tileAt(tx, ty); return v === 1 || v >= 10; },
  };
}

const DT = 1/60;
function step(p, level) { p.update(DT, level); Input.update(); }

// ── 1. Run speed (steady state) ──
function measureRunSpeed(shift = false) {
  releaseAll();
  const level = makeLevel();
  const p = new Player(100, 12*TILE - PLAYER_H);
  p.grounded = true;
  if (shift) keyDown('ShiftLeft');
  keyDown('ArrowRight');
  for (let i = 0; i < 120; i++) step(p, level);
  const v = p.vx;
  releaseAll();
  return v;
}

// ── 2. Deceleration ──
function measureDecel(shift = false) {
  releaseAll();
  const level = makeLevel();
  const p = new Player(200, 12*TILE - PLAYER_H);
  p.grounded = true;
  if (shift) keyDown('ShiftLeft');
  keyDown('ArrowRight');
  for (let i = 0; i < 60; i++) step(p, level);
  keyUp('ArrowRight');
  let frames = 0;
  while (Math.abs(p.vx) >= 5 && frames < 240) { step(p, level); frames++; }
  releaseAll();
  return { frames, seconds: frames*DT, finalVx: p.vx };
}

// ── 3. Acceleration (frames to reach 90% target) ──
function measureAccel(shift = false) {
  releaseAll();
  const level = makeLevel();
  const p = new Player(100, 12*TILE - PLAYER_H);
  p.grounded = true;
  if (shift) keyDown('ShiftLeft');
  const target = shift ? PLAYER_SPEED * RUN_MULTIPLIER : PLAYER_SPEED;
  keyDown('ArrowRight');
  let frames = 0;
  while (p.vx < target * 0.9 && frames < 60) { step(p, level); frames++; }
  const vxAtFrame = p.vx;
  releaseAll();
  return { frames, seconds: frames*DT, vxAtFrame };
}

// ── 4. Jump metrics ──
function measureJump(shift = false) {
  releaseAll();
  const level = makeLevel();
  const startY = 12*TILE - PLAYER_H;
  const p = new Player(100, startY);
  p.grounded = true;
  step(p, level);
  if (shift) keyDown('ShiftLeft');
  keyDown('ArrowUp');
  step(p, level);
  keyUp('ArrowUp');
  let apex = p.y, apexT = 0, framesToApex = 0;
  let t = 0, totalFrames = 0;
  const initialVy = p.vy;
  while (totalFrames < 300) {
    step(p, level);
    t += DT;
    totalFrames++;
    if (p.y < apex) { apex = p.y; apexT = t; framesToApex = totalFrames; }
    if (p.grounded && totalFrames > 5 && p.y >= startY - 0.5) break;
  }
  releaseAll();
  return {
    initialVy,
    heightPx: startY - apex,
    heightTiles: (startY - apex) / TILE,
    apexT,
    framesToApex,
    airtime: t,
    totalFrames,
  };
}

// ── 5. Horizontal jump gap (running edge jump) ──
function measureHorizontalJump(shift = false) {
  const jumpFromCol = 30;                          // gap starts at col 31
  const startCol = 20;                             // 10-tile runup (320 px)
  const startX = startCol * TILE;
  const startY = 12*TILE - PLAYER_H;
  let bestOK = 0;
  let bestLandingDx = 0;
  for (let gap = 1; gap <= 20; gap++) {
    releaseAll();
    const level = makeLevel({ platformX: jumpFromCol + 1, gapCols: gap });
    const p = new Player(startX, startY);
    p.grounded = true;
    step(p, level);
    if (shift) keyDown('ShiftLeft');
    keyDown('ArrowRight');
    let frames = 0;
    // Run until right edge is past the right edge of jumpFromCol tile.
    const edgePx = (jumpFromCol + 1) * TILE;
    while (p.x + p.w < edgePx && frames < 1200) {
      step(p, level);
      frames++;
    }
    // Jump on next frame — we're at the edge or just past
    keyDown('ArrowUp');
    step(p, level);
    keyUp('ArrowUp');
    let landed = false;
    let landedX = null;
    for (let f = 0; f < 240; f++) {
      step(p, level);
      if (p.grounded && f > 3) { landed = true; landedX = p.x; break; }
    }
    releaseAll();
    const targetPlatformLeft = (jumpFromCol + 1 + gap) * TILE;
    const cleared = landed && landedX >= targetPlatformLeft - 0.5;
    if (cleared) {
      bestOK = gap;
      bestLandingDx = landedX - jumpFromCol * TILE;
    } else break;
  }
  return { maxGapTiles: bestOK, maxGapPx: bestOK * TILE, landingDxFromEdge: bestLandingDx };
}

// ── 6. Max upward ledge reach ──
function measureLedgeReach(shift = false) {
  const groundRow = 12;
  const startY = groundRow * TILE - PLAYER_H;
  const ledgeCol = 30;
  const startCol = 20;                             // 10-tile runup
  const startX = startCol * TILE;
  let bestOK = 0;
  for (let ledgeUp = 1; ledgeUp <= 6; ledgeUp++) {
    releaseAll();
    const ledgeRow = groundRow - ledgeUp;
    const level = makeLevel({ ledgeCol, ledgeRow });
    const p = new Player(startX, startY);
    p.grounded = true;
    step(p, level);
    if (shift) keyDown('ShiftLeft');
    keyDown('ArrowRight');
    let frames = 0;
    // Run until just before ledge (so we jump BEFORE hitting the wall)
    const jumpAtX = (ledgeCol - 1) * TILE;
    while (p.x + p.w < jumpAtX && frames < 1200) {
      step(p, level);
      frames++;
    }
    keyDown('ArrowUp');
    step(p, level);
    keyUp('ArrowUp');
    const ledgeTopY = ledgeRow * TILE - PLAYER_H;
    let landedOnLedge = false;
    for (let f = 0; f < 240; f++) {
      step(p, level);
      if (p.grounded && Math.abs(p.y - ledgeTopY) < 1 && p.x >= ledgeCol * TILE - 1) {
        landedOnLedge = true; break;
      }
      if (p.grounded && p.y >= startY - 1 && f > 60) break;
    }
    releaseAll();
    if (landedOnLedge) bestOK = ledgeUp; else break;
  }
  return { maxLedgeTiles: bestOK, maxLedgePx: bestOK * TILE };
}

// ── 7. Terminal fall vy ──
function measureTerminalFall() {
  releaseAll();
  const cols = 20;
  const tiles = new Array(cols * ROWS).fill(0);
  for (let c = 0; c < cols; c++) tiles[(ROWS - 1) * cols + c] = 1;
  const level = {
    cols, tiles,
    gates: [], platforms: [], sources: [], pickups: [], enemies: [], switches: [], checkpoints: [],
    pxW: cols * TILE,
    tileAt(tx, ty) { if (tx < 0 || tx >= cols || ty < 0) return 1; if (ty >= ROWS) return 0; return tiles[ty*cols + tx] || 0; },
    solidAt(tx, ty) { const v = this.tileAt(tx, ty); return v === 1 || v >= 10; },
  };
  const p = new Player(100, 0);
  let peakVy = 0;
  for (let i = 0; i < 300; i++) {
    step(p, level);
    if (p.vy > peakVy) peakVy = p.vy;
    if (p.grounded && i > 5) return { peakVy, landY: p.y, frames: i };
  }
  return { peakVy, landY: p.y, frames: -1 };
}

// ── 8. Air control — vx while airborne ──
function measureAirControl() {
  releaseAll();
  const level = makeLevel();
  const startY = 12*TILE - PLAYER_H;
  const p = new Player(100, startY);
  p.grounded = true;
  step(p, level);
  keyDown('ArrowUp');
  step(p, level);
  keyUp('ArrowUp');
  // In air now; press right and read vx immediately
  keyDown('ArrowRight');
  step(p, level);
  const vxAir = p.vx;
  releaseAll();
  return { vxAir };
}

// ═══════════════════════════════════════════════════════
console.log('=== OVERCHARGE PLAYER MOVEMENT METRICS ===');
console.log('dt = 1/60s = ' + (DT*1000).toFixed(2) + 'ms per step');
console.log('');
console.log('CONSTANTS (from src_scroll/constants.js):');
console.log('  TILE=' + TILE + '  W=' + W + '  H=' + H + '  ROWS=' + ROWS + '  COLS=' + COLS);
console.log('  PLAYER_W=' + PLAYER_W + '  PLAYER_H=' + PLAYER_H);
console.log('  PLAYER_SPEED=' + PLAYER_SPEED + '  RUN_MULTIPLIER=' + RUN_MULTIPLIER);
console.log('  GRAVITY=' + GRAVITY + '  JUMP_FORCE=' + JUMP_FORCE);
console.log('  Terminal vy clamp = 700 (from player.js line 138)');
console.log('  COYOTE_TIME=0.1  JUMP_BUFFER=0.1  (from player.js lines 17-18)');
console.log('');

console.log('=== MEASURED (60Hz fixed step) ===');
console.log('');
console.log('RUN SPEED:');
console.log('  walk max vx  = ' + measureRunSpeed(false).toFixed(2) + ' px/s   (expected ' + PLAYER_SPEED + ')');
console.log('  sprint max vx = ' + measureRunSpeed(true).toFixed(2) + ' px/s   (expected ' + (PLAYER_SPEED * RUN_MULTIPLIER).toFixed(2) + ')');
console.log('');
const aw = measureAccel(false);
const ar = measureAccel(true);
console.log('ACCELERATION (frames to reach 90% top speed):');
console.log('  walk   = ' + aw.frames + ' frames = ' + aw.seconds.toFixed(4) + 's   (vx at frame ' + aw.frames + ' = ' + aw.vxAtFrame.toFixed(2) + ')');
console.log('  sprint = ' + ar.frames + ' frames = ' + ar.seconds.toFixed(4) + 's');
console.log('');
const dw = measureDecel(false);
const dr = measureDecel(true);
console.log('DECELERATION (release input to |vx|<5):');
console.log('  walk   = ' + dw.frames + ' frames = ' + dw.seconds.toFixed(4) + 's   final vx=' + dw.finalVx.toFixed(3));
console.log('  sprint = ' + dr.frames + ' frames = ' + dr.seconds.toFixed(4) + 's   final vx=' + dr.finalVx.toFixed(3));
console.log('');
const air = measureAirControl();
console.log('AIR CONTROL (vx after 1 frame of held input in mid-jump):');
console.log('  vx = ' + air.vxAir.toFixed(2) + ' px/s   (expected instant snap to ' + PLAYER_SPEED + ')');
console.log('');
const jw = measureJump(false);
console.log('JUMP (walk):');
console.log('  initial vy       = ' + jw.initialVy + ' px/s');
console.log('  height           = ' + jw.heightPx.toFixed(2) + ' px = ' + jw.heightTiles.toFixed(3) + ' tiles');
console.log('  time to apex     = ' + jw.apexT.toFixed(4) + 's (' + jw.framesToApex + ' frames)');
console.log('  total airtime    = ' + jw.airtime.toFixed(4) + 's (' + jw.totalFrames + ' frames)');
const jr = measureJump(true);
console.log('JUMP (sprint):');
console.log('  height           = ' + jr.heightPx.toFixed(2) + ' px = ' + jr.heightTiles.toFixed(3) + ' tiles');
console.log('  time to apex     = ' + jr.apexT.toFixed(4) + 's (' + jr.framesToApex + ' frames)');
console.log('  total airtime    = ' + jr.airtime.toFixed(4) + 's');
console.log('');
const hw = measureHorizontalJump(false);
const hr = measureHorizontalJump(true);
console.log('HORIZONTAL JUMP (max gap cleared, run-off-edge + jump):');
console.log('  walk   = ' + hw.maxGapTiles + ' tiles = ' + hw.maxGapPx + ' px');
console.log('  sprint = ' + hr.maxGapTiles + ' tiles = ' + hr.maxGapPx + ' px');
console.log('');
const lw = measureLedgeReach(false);
const lr = measureLedgeReach(true);
console.log('UPWARD LEDGE REACH (max landable ledge height):');
console.log('  walk   = ' + lw.maxLedgeTiles + ' tiles = ' + lw.maxLedgePx + ' px');
console.log('  sprint = ' + lr.maxLedgeTiles + ' tiles = ' + lr.maxLedgePx + ' px');
console.log('');
const term = measureTerminalFall();
console.log('TERMINAL FALL (peak vy from long drop):');
console.log('  peak vy = ' + term.peakVy.toFixed(2) + ' px/s   (constant clamp = 700)');
console.log('  frames to land = ' + term.frames);
console.log('');
console.log('=== END ===');
