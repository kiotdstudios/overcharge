/**
 * background.js — Night City parallax backdrop for OVERCHARGE
 *
 * Layers (bottom to top):
 *   1. 01-sky.png             (factor 0.03, tiled)
 *   2. 04-elevated-track.png  (factor 0.35, tiled)
 *   3. Train canvas           (viewport-sized, independent 95px/s rightward + parallax)
 *   4. 06-dark-front-skyline.png (factor 0.45, tiled)
 *   5. Rain canvas            (viewport-sized, on top)
 *
 * API:
 *   init(levelWidth)  — call once on game start
 *   update(cameraX)   — call every frame
 *
 * pointer-events: none everywhere — zero gameplay impact.
 */

const GAME_W = 800;
const GAME_H = 450;

// Source PNGs are all 1672 × 941 RGBA
const IMG_W = 1672;
const IMG_H = 941;

// Train opaque bounding box (x-axis, in source pixels)
// [561, 536, 1124, 661] — right/bottom exclusive
const TRAIN_OPQ_L = 561;
const TRAIN_OPQ_R = 1124;
const TRAIN_SPEED = 95; // image-px/s (rightward)
const TRAIN_GAP   = 400; // viewport-px gap before re-entry

const BASE = 'assets/bg/night-city-rail/night-city-rail-v1/';

// Parallax factors (match preview.html layer array)
const FACTOR_SKY   = 0.03;
const FACTOR_MID   = 0.15;  // midground skyline
const FACTOR_TRACK = 0.35;
const FACTOR_FRONT = 0.45;

// ─── module state ──────────────────────────────────────────────────────────
let _container    = null;
let _layers       = [];    // [{el, factor}]
let _ltg          = null;  // lightning flash element
let _rainCtx      = null;
let _trainCtx     = null;
let _trainImg     = null;
let _drops        = [];
let _ltgTimer     = 0;
let _ltgNext      = 5 + Math.random() * 8;
let _cameraX      = 0;
let _vp           = { s: 1, vw: 800, vh: 450 };
// _trainLayerX: train image-left x in layer-local viewport-pixels (before parallax offset)
let _trainLayerX  = -IMG_W; // start off-screen left

// ─── DOM helpers ───────────────────────────────────────────────────────────
function el(tag = 'div', styles = {}, parent = null) {
  const e = document.createElement(tag);
  Object.assign(e.style, styles);
  if (parent) parent.appendChild(e);
  return e;
}
function div(styles = {}, parent = null) { return el('div', styles, parent); }

// ─── viewport info ─────────────────────────────────────────────────────────
function vp() {
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  return { s, vw: window.innerWidth, vh: window.innerHeight };
}

// ─── layer width calculation ────────────────────────────────────────────────
function calcLayerW(factor, maxCamX, v) {
  return Math.ceil(v.vw + maxCamX * factor * v.s) + 600;
}

// ─── CSS injection (rain canvas only; no animation keyframes needed) ────────
function injectStyles() {
  if (document.getElementById('_bg_styles')) return;
  const s = document.createElement('style');
  s.id = '_bg_styles';
  s.textContent = `
    @keyframes bgBlink { 0%,48%,100%{opacity:1} 49%,97%{opacity:0} }
  `;
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════════════════════
// IMAGE LAYER — tiled PNG background div
// Images are 1672×941; scale to full container height, repeat on x, bottom-align.
// ══════════════════════════════════════════════════════════════════════════════
function buildImageLayer(parent, filename, lw, v) {
  const tileW = Math.round(IMG_W * v.vh / IMG_H); // scaled tile width in viewport px
  div({
    position:           'absolute',
    top:                '0',
    left:               '0',
    width:              `${lw}px`,
    height:             '100%',
    backgroundImage:    `url('${BASE}${filename}')`,
    backgroundRepeat:   'repeat-x',
    backgroundSize:     `${tileW}px 100%`,
    backgroundPosition: 'left bottom',
    imageRendering:     'pixelated',
  }, parent);
}

// ══════════════════════════════════════════════════════════════════════════════
// LIGHTNING — flash overlay inside sky layer
// ══════════════════════════════════════════════════════════════════════════════
function buildLightning(parent, lw) {
  _ltg = div({
    position:      'absolute',
    top:           '0',
    left:          '0',
    width:         `${lw}px`,
    height:        '100%',
    background:    'radial-gradient(ellipse 50% 35% at 65% 15%, rgba(160,210,255,0.28) 0%, transparent 70%)',
    opacity:       '0',
    transition:    'opacity 0.04s',
    pointerEvents: 'none',
  }, parent);
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAIN CANVAS — viewport-sized canvas drawn in atmo loop
// ══════════════════════════════════════════════════════════════════════════════
function buildTrainCanvas(v) {
  const canvas = el('canvas', {
    position:       'fixed',
    top:            '0',
    left:           '0',
    width:          '100%',
    height:         '100%',
    pointerEvents:  'none',
    imageRendering: 'pixelated',
  }, _container);
  canvas.width  = v.vw;
  canvas.height = v.vh;
  _trainCtx = canvas.getContext('2d');
  _trainCtx.imageSmoothingEnabled = false;

  _trainImg = new Image();
  _trainImg.src = BASE + '05-light-rail-train.png';

  // Start train off-screen left (layer-local viewport-px)
  const scale = v.vh / IMG_H;
  _trainLayerX = -(TRAIN_OPQ_R * scale) - 200;
}

// ══════════════════════════════════════════════════════════════════════════════
// RAIN
// ══════════════════════════════════════════════════════════════════════════════
function initRain(vw, vh) {
  _drops = [];
  for (let i = 0; i < 140; i++) {
    _drops.push({
      x:     Math.random() * vw,
      y:     Math.random() * vh,
      len:   9  + Math.random() * 15,
      speed: 300 + Math.random() * 220,
      alpha: 0.06 + Math.random() * 0.10,
    });
  }
}

function drawRain(dt, vw, vh) {
  if (!_rainCtx) return;
  _rainCtx.clearRect(0, 0, vw, vh);
  _rainCtx.lineWidth = 0.6;
  for (const d of _drops) {
    d.y += d.speed * dt;
    d.x -= d.speed * 0.12 * dt;
    if (d.y > vh + d.len) { d.y = -d.len; d.x = Math.random() * vw; }
    if (d.x < 0)          { d.x = vw + 5; }
    _rainCtx.globalAlpha = d.alpha;
    _rainCtx.strokeStyle = 'rgba(130,175,225,1)';
    _rainCtx.beginPath();
    _rainCtx.moveTo(d.x, d.y);
    _rainCtx.lineTo(d.x - d.len * 0.12, d.y + d.len);
    _rainCtx.stroke();
  }
  _rainCtx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════════════════════
// LIGHTNING TICK
// ══════════════════════════════════════════════════════════════════════════════
function tickLightning(dt) {
  if (!_ltg) return;
  _ltgTimer += dt;
  if (_ltgTimer < _ltgNext) return;
  _ltgTimer = 0;
  _ltgNext  = 4 + Math.random() * 12;
  // Double-flash
  _ltg.style.opacity = '1';
  setTimeout(() => { _ltg.style.opacity = '0';    },  55);
  setTimeout(() => { _ltg.style.opacity = '0.45'; },  80);
  setTimeout(() => { _ltg.style.opacity = '0';    }, 140);
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAIN TICK — advance and draw the light-rail train
// ══════════════════════════════════════════════════════════════════════════════
function tickTrain(dt) {
  if (!_trainCtx || !_trainImg?.complete) return;
  const { vw, vh, s } = _vp;
  const scale       = vh / IMG_H;               // px per source-px
  const trackOffset = _cameraX * FACTOR_TRACK * s; // viewport-px the track layer has shifted

  // Advance train in layer-local space
  _trainLayerX += TRAIN_SPEED * scale * dt;

  // Viewport position of image left edge
  const drawX = _trainLayerX - trackOffset;

  // Wrap: once the opaque right edge exits right viewport + gap, re-enter from left
  if (drawX + TRAIN_OPQ_R * scale > vw + TRAIN_GAP) {
    // Place opaque left edge just off screen left
    _trainLayerX = trackOffset - TRAIN_OPQ_L * scale - 300;
  }

  _trainCtx.clearRect(0, 0, vw, vh);
  _trainCtx.imageSmoothingEnabled = false;
  _trainCtx.drawImage(
    _trainImg,
    Math.round(drawX),
    0,
    Math.round(IMG_W * scale),
    vh,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * init(levelWidth)
 * Creates all parallax layers and inserts the container before the canvas.
 * Call once when the game starts.
 */
export function init(levelWidth = 3200) {
  injectStyles();

  // Clean up any previous instance (e.g. level restart)
  if (_container) { _container.remove(); _container = null; }
  _layers  = [];
  _ltg     = null;
  _rainCtx = null;
  _trainCtx = null;
  _trainImg = null;

  const v       = vp();
  _vp           = v;
  const maxCamX = Math.max(levelWidth - GAME_W, 0);

  // Root container — fixed, full viewport, behind everything
  _container = div({
    position:      'fixed',
    top:           '0',
    left:          '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
    zIndex:        '0',
    overflow:      'hidden',
  });
  document.body.insertBefore(_container, document.body.firstChild);

  // ── Layer 1: Sky (slowest) ────────────────────────────────────────────────
  const skyLw = calcLayerW(FACTOR_SKY, maxCamX, v);
  const skyEl  = div({ position:'absolute', top:'0', left:'0',
                        width:`${skyLw}px`, height:'100%', willChange:'transform' }, _container);
  buildImageLayer(skyEl, '01-sky.png', skyLw, v);
  buildLightning(skyEl, skyLw);
  _layers.push({ el: skyEl, factor: FACTOR_SKY });

  // ── Layer 2: Midground skyline ───────────────────────────────────────
  const midLw = calcLayerW(FACTOR_MID, maxCamX, v);
  const midEl  = div({ position:'absolute', top:'0', left:'0',
                        width:`${midLw}px`, height:'100%', willChange:'transform' }, _container);
  buildImageLayer(midEl, '03-midground-skyline.png', midLw, v);
  _layers.push({ el: midEl, factor: FACTOR_MID });

  // ── Layer 3: Elevated track ───────────────────────────────────────────────
  const trkLw = calcLayerW(FACTOR_TRACK, maxCamX, v);
  const trkEl  = div({ position:'absolute', top:'0', left:'0',
                        width:`${trkLw}px`, height:'100%', willChange:'transform' }, _container);
  buildImageLayer(trkEl, '04-elevated-track.png', trkLw, v);
  _layers.push({ el: trkEl, factor: FACTOR_TRACK });

  // ── Layer 3: Train (viewport canvas, sits above track in DOM order) ───────
  buildTrainCanvas(v);

  // ── Layer 4: Dark front skyline ───────────────────────────────────────────
  const fntLw = calcLayerW(FACTOR_FRONT, maxCamX, v);
  const fntEl  = div({ position:'absolute', top:'0', left:'0',
                        width:`${fntLw}px`, height:'100%', willChange:'transform' }, _container);
  buildImageLayer(fntEl, '06-dark-front-skyline.png', fntLw, v);
  _layers.push({ el: fntEl, factor: FACTOR_FRONT });

  // ── Rain canvas (top of stack) ────────────────────────────────────────────
  const rc = el('canvas', {
    position:      'absolute',
    top:           '0',
    left:          '0',
    width:         '100%',
    height:        '100%',
    pointerEvents: 'none',
  }, _container);
  rc.width  = v.vw;
  rc.height = v.vh;
  _rainCtx  = rc.getContext('2d');
  initRain(v.vw, v.vh);

  // ── Atmospheric RAF loop (rain + lightning + train — independent of game loop)
  let last = 0;
  (function atmoLoop(now) {
    requestAnimationFrame(atmoLoop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    tickTrain(dt);
    drawRain(dt, v.vw, v.vh);
    tickLightning(dt);
  })(0);
}

/**
 * update(cameraX)
 * Drive the parallax. Call every frame from the game render loop.
 */
export function update(cameraX) {
  _cameraX = cameraX;
  _vp = vp();
  const { s } = _vp;
  for (const layer of _layers) {
    const offset = (cameraX * layer.factor * s) | 0;
    layer.el.style.transform = `translate3d(${-offset}px,0,0)`;
  }
}
