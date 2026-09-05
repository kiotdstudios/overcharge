// viewport.js — separates WORLD SIZE from VIEWPORT SIZE.
//
// Chief directive §4/§5:
//   • The canvas must COVER the whole browser viewport — no pillarboxing.
//   • Pixel art must NOT be stretched; scaling stays uniform + nearest-neighbour.
//   • Level JSON coordinates remain WORLD coordinates. Only the camera
//     decides how much of the world is visible.
//
// How it works
// ------------
// The world is H (450) tall. We lock the vertical: the full world height is
// always visible, so HUD and camera bounds behave exactly as authored.
//
//     scale  = viewportHeightPx / H          (uniform, both axes)
//     viewW  = ceil(viewportWidthPx / scale) (how many WORLD px fit across)
//
// The canvas BACKING STORE is viewW × H world pixels — i.e. a wider screen
// simply *reveals more world horizontally* rather than stretching or cropping
// what was already there. The backing store is then presented at exactly
// `scale`, so every world pixel maps to the same square on screen: uniform,
// never distorted.
//
// CSS width is set to viewW*scale (which is >= the viewport width by at most
// one scaled pixel from the ceil) and the body clips the sub-pixel remainder,
// so there is never a black bar on any axis.
//
// W from constants.js stays the DESIGN width (title screen / legacy layout
// reference). Live code that needs "how wide is the view right now" calls
// viewW(). Nothing here touches level geometry.

import { W as DESIGN_W, H } from './constants.js';

let _viewW = DESIGN_W;
let _scale = 1;
let _insetX = 0;
let _canvas = null;
let _ctx    = null;
const _listeners = new Set();

export function viewW()      { return _viewW; }
export function viewH()      { return H; }
export function viewScale()  { return _scale; }
export function designW()    { return DESIGN_W; }

// HUD SAFE AREA (Chief §7).
// Because we COVER the viewport, an aspect narrower than the design ratio
// overflows horizontally and the browser clips the excess. safeInsetX() is
// how many WORLD pixels are clipped off EACH side, so HUD elements can stay
// inside the genuinely visible region instead of being cut off.
export function safeInsetX() { return _insetX; }
export function safeLeft()   { return _insetX; }
export function safeRight()  { return _viewW - _insetX; }

export function onViewportChange(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }

function _apply() {
  if (!_canvas) return;
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);

  // Lock vertical: full world height always visible.
  _scale = vh / H;

  // Reveal as much world width as the screen affords. Never narrower than
  // the design width, so authored HUD layout always has room.
  _viewW = Math.max(DESIGN_W, Math.ceil(vw / _scale));

  // Backing store in WORLD pixels (integer) — keeps rendering crisp.
  if (_canvas.width !== _viewW) _canvas.width  = _viewW;
  if (_canvas.height !== H)     _canvas.height = H;

  // Present at exactly `scale` on both axes → uniform, no stretch.
  const cssW = _viewW * _scale;
  _canvas.style.width  = `${cssW}px`;
  _canvas.style.height = `${H * _scale}px`;

  // How much world is clipped off each side by the cover overflow. Zero on
  // 16:9-or-wider screens; a few tens of world px on 16:10 / 4:3.
  _insetX = Math.max(0, Math.ceil(((cssW - vw) / 2) / _scale));

  // Re-assert nearest-neighbour: resizing the backing store resets ctx state.
  if (_ctx) _ctx.imageSmoothingEnabled = false;

  for (const fn of _listeners) fn(_viewW, H, _scale);
}

export function initViewport(canvas, ctx) {
  _canvas = canvas;
  _ctx    = ctx;
  _apply();
  window.addEventListener('resize', _apply);
  // Some browsers fire orientationchange without resize.
  window.addEventListener('orientationchange', _apply);
  return { viewW, viewH, viewScale };
}

// Exposed for tests / manual re-sync.
export function refreshViewport() { _apply(); }
