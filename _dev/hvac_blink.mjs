// hvac_blink.mjs — Chief: "new night city prop hvac unit blinks/flashes when
// it first loads fix that plz". drawHvac() used to fetch each of its 9 fan
// frames lazily, one at a time, only the first instant the fan phase reached
// that frame index. Over a real network that staggered loading drew a blank
// frame every time the fan rotated onto an index whose image hadn't been
// requested yet, which read as a blink/flash right when the unit first
// appeared on screen. The fix: fetch all 9 frames together the moment the
// module loads, and if one frame is still mid-load, hold the last frame that
// did paint instead of drawing nothing.
//
// This suite mocks Image with controllable per-path completion so it can
// freeze a frame mid-load and prove the draw call still has pixels on
// screen, without needing a browser.

let passed = 0;
function check(value, label, extra) {
  if (!value) throw new Error(label + (extra !== undefined ? ` (${JSON.stringify(extra)})` : ''));
  passed++;
  console.log(`\u2713 ${label}`);
}

const instancesBySrc = new Map();
class MockImage {
  constructor() { this._complete = false; this._src = ''; }
  set src(v) { this._src = v; instancesBySrc.set(v, this); }
  get src() { return this._src; }
  get complete() { return this._complete; }
  get naturalWidth() { return this._complete ? 64 : 0; }
  addEventListener(evt, fn) { if (evt === 'load') this._onload = fn; }
  finishLoading() { this._complete = true; if (this._onload) this._onload(); }
}
globalThis.Image = MockImage;

// Import AFTER the mock is installed and BEFORE any drawHvac call — the
// module-level preload runs at import time, which is exactly the behaviour
// under test.
const { drawHvac } = await import('../src_scroll/source-visuals.js');

const framePath = i => `assets/objects/night-city-props/hvac/${String(i).padStart(2, '0')}.png`;

// [ EAGER PRELOAD — all 9 frames requested together at import, not lazily ]
{
  const missing = [];
  for (let i = 0; i < 9; i++) if (!instancesBySrc.has(framePath(i))) missing.push(i);
  check(missing.length === 0, 'all 9 HVAC frames were requested at module load, before any draw() call', missing);
}

function makeCtx() {
  const draws = [];
  return {
    draws,
    imageSmoothingEnabled: true,
    save() {}, restore() {},
    drawImage(img) { draws.push(img.src); },
  };
}

// [ NORMAL CASE — frame already loaded draws exactly as before ]
{
  const ctx = makeCtx();
  const source = { powered: true, _fanPhase: 0, _fanSpeed: 1 };
  instancesBySrc.get(framePath(0)).finishLoading();
  drawHvac(ctx, source);
  check(ctx.draws.length === 1 && ctx.draws[0] === framePath(0), 'frame 0 loaded: draws it normally, one drawImage call', ctx.draws);
  check(source._hvacLastFrame === 0, 'records frame 0 as the last good frame after a real draw');
}

// [ THE BUG — a frame still mid-load used to draw nothing (the blink). Now it
//   holds the last good frame instead, so there is still a pixel on screen. ]
{
  const ctx = makeCtx();
  const source = { powered: true, _fanPhase: 0, _fanSpeed: 1 };
  instancesBySrc.get(framePath(0)).finishLoading();
  drawHvac(ctx, source); // establishes frame 0 as the last good frame

  // Advance the fan phase onto frame 1, but leave frame 1's image mid-load —
  // this is the exact moment that used to blink to a blank frame.
  source._fanPhase = Math.PI / 4; // boundary of frame 1 (phase*8/2pi == 1)
  check(instancesBySrc.get(framePath(1)).complete === false, 'frame 1 is still mid-load, the scenario that used to blink');
  drawHvac(ctx, source);
  check(ctx.draws.length === 2, 'draws something even while frame 1 is still loading — never skips the draw call', ctx.draws);
  check(ctx.draws[1] === framePath(0), 'falls back to the last good frame (0) instead of a blank frame', ctx.draws);
  check(source._hvacLastFrame === 0, 'last-good-frame bookkeeping is untouched by the fallback draw (no false credit for frame 1)');

  // Once frame 1 actually finishes loading, it takes over normally.
  instancesBySrc.get(framePath(1)).finishLoading();
  drawHvac(ctx, source);
  check(ctx.draws.length === 3 && ctx.draws[2] === framePath(1), 'once frame 1 finishes loading it draws normally again', ctx.draws);
  check(source._hvacLastFrame === 1, 'last-good-frame now advances to 1');
}

// [ DRAINED / STOPPED UNIT — frame 8 (dark cabinet) gets the same treatment ]
{
  const ctx = makeCtx();
  const source = { powered: false, _fanPhase: 0, _fanSpeed: 0 };
  check(instancesBySrc.get(framePath(8)).complete === false, 'frame 8 (stopped/dark) has not been drawn yet in this test, so still mid-load');
  drawHvac(ctx, source);
  check(ctx.draws.length === 0, 'with no prior good frame and frame 8 still loading, draws nothing (unavoidable only on the very first-ever paint)');
  instancesBySrc.get(framePath(8)).finishLoading();
  drawHvac(ctx, source);
  check(ctx.draws.length === 1 && ctx.draws[0] === framePath(8), 'once frame 8 loads, a drained/stopped unit draws its dark frame normally', ctx.draws);
}

console.log(`\nRESULTS: ${passed} passed, 0 failed`);
