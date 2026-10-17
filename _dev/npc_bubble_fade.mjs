// npc_bubble_fade.mjs — Chief: "also text boxes should fade away". A bubble
// used to vanish the instant npc._bubbleT hit zero; it now ramps its alpha
// down over its last BUBBLE_FADE_MS of life (see src_scroll/npc.js) so it
// visibly fades out instead of popping off screen. Covers the alpha math in
// isolation and end-to-end through drawNpcBubbles(), plus the zero-
// regression guarantee that a bubble still comfortably inside its duration
// (the overwhelming majority of its lifetime) renders fully opaque exactly
// as before this change.
import { Npc, drawSpeechBubble, drawNpcBubbles, BUBBLE_FADE_MS } from '../src_scroll/npc.js';

let passed = 0;
function check(value, label, extra) {
  if (!value) throw new Error(label + (extra !== undefined ? ` (${JSON.stringify(extra)})` : ''));
  passed++;
  console.log(`✓ ${label}`);
}

// Mock captures globalAlpha the moment the base panel's first rect() fires —
// drawSpeechBubble sets ctx.globalAlpha immediately after ctx.save(), before
// anything else, so this reliably reflects the alpha that bubble was drawn with.
function makeCtx() {
  const bubbles = [];
  let curr = null;
  return {
    bubbles,
    globalAlpha: 1,
    save() { curr = null; },
    restore() {},
    measureText(s) { return { width: s.length * 7 }; },
    beginPath() {},
    rect(x, y, w, h) { if (!curr) { curr = { x, y, w, h, alpha: this.globalAlpha }; bubbles.push(curr); } },
    fill() {}, stroke() {}, moveTo() {}, lineTo() {}, closePath() {}, fillText() {},
  };
}

function makeNpc(x = 1000) {
  return new Npc({ id: 'FADE_TEST', assetId: 'npc_streetlamp_woman', x, y: 320, facing: 'left' });
}

// A bubble well inside its duration (way more than BUBBLE_FADE_MS remaining)
// must render fully opaque — zero regression for the overwhelming majority
// of a bubble's displayed lifetime.
{
  const npc = makeNpc();
  npc._lastGeom = { visible: { y: 352 } };
  npc._bubbleText = 'plenty of time left to read this';
  npc._bubbleT = 3000; // way above BUBBLE_FADE_MS
  const ctx = makeCtx();
  drawNpcBubbles(ctx, [npc], null);
  check(ctx.bubbles.length === 1, 'the bubble was drawn');
  check(ctx.bubbles[0].alpha === 1, 'a bubble with plenty of time left renders fully opaque (alpha 1)', ctx.bubbles[0].alpha);
}

// Exactly at the fade threshold, alpha should be right at 1 (the fade only
// starts once remaining time drops BELOW BUBBLE_FADE_MS, not at-or-below).
{
  const npc = makeNpc();
  npc._lastGeom = { visible: { y: 352 } };
  npc._bubbleText = 'right at the edge';
  npc._bubbleT = BUBBLE_FADE_MS;
  const ctx = makeCtx();
  drawNpcBubbles(ctx, [npc], null);
  check(ctx.bubbles[0].alpha === 1, 'exactly at the fade-window boundary, the bubble is still fully opaque', ctx.bubbles[0].alpha);
}

// Halfway through the fade window, alpha should be ~0.5.
{
  const npc = makeNpc();
  npc._lastGeom = { visible: { y: 352 } };
  npc._bubbleText = 'fading out now';
  npc._bubbleT = BUBBLE_FADE_MS / 2;
  const ctx = makeCtx();
  drawNpcBubbles(ctx, [npc], null);
  check(Math.abs(ctx.bubbles[0].alpha - 0.5) < 1e-9,
    'halfway through the fade window the bubble is at half opacity', ctx.bubbles[0].alpha);
}

// Right before expiring, alpha should be nearly (but not exactly) zero —
// never negative, never NaN.
{
  const npc = makeNpc();
  npc._lastGeom = { visible: { y: 352 } };
  npc._bubbleText = 'almost gone';
  npc._bubbleT = 1; // 1ms left
  const ctx = makeCtx();
  drawNpcBubbles(ctx, [npc], null);
  const a = ctx.bubbles[0].alpha;
  check(a > 0 && a < 0.01, 'a bubble with 1ms left is almost fully transparent but not negative/NaN', a);
}

// Calling drawSpeechBubble directly with an explicit alpha (the plumbing
// drawNpcBubbles relies on) clamps out-of-range input instead of producing
// a broken globalAlpha.
{
  const ctxHigh = makeCtx();
  drawSpeechBubble(ctxHigh, 1000, 352, 'clamp test high', null, 0, undefined, 5);
  check(ctxHigh.bubbles[0].alpha === 1, 'an alpha above 1 clamps down to 1 (fully opaque), never over-bright', ctxHigh.bubbles[0].alpha);

  const ctxLow = makeCtx();
  drawSpeechBubble(ctxLow, 1000, 352, 'clamp test low', null, 0, undefined, -3);
  check(ctxLow.bubbles[0].alpha === 0, 'an alpha below 0 clamps up to 0 (fully transparent), never negative', ctxLow.bubbles[0].alpha);
}

// The default alpha (no 8th arg passed, e.g. editor/renderer.js's NPC preview
// call site, which only ever passes 3 positional args) stays fully opaque —
// this change must not dim the Builder preview.
{
  const ctx = makeCtx();
  drawSpeechBubble(ctx, 1000, 352, 'builder preview text');
  check(ctx.bubbles[0].alpha === 1, 'drawSpeechBubble with no alpha argument (Builder preview call site) stays fully opaque', ctx.bubbles[0].alpha);
}

// Two simultaneously-active bubbles at different remaining times fade
// independently of one another — one speaker finishing up fades out while
// the other, freshly triggered, stays fully readable.
{
  const npcA = makeNpc(1000), npcB = makeNpc(1046);
  npcA._lastGeom = { visible: { y: 352 } };
  npcB._lastGeom = { visible: { y: 352 } };
  npcA._bubbleText = 'about to vanish';
  npcA._bubbleT = 50; // nearly expired
  npcB._bubbleText = 'just started talking';
  npcB._bubbleT = 3000; // fresh
  const ctx = makeCtx();
  drawNpcBubbles(ctx, [npcA, npcB], null);
  check(ctx.bubbles.length === 2, 'both bubbles were drawn');
  check(ctx.bubbles[0].alpha < 0.2, 'the nearly-expired speaker is most of the way through its fade', ctx.bubbles[0].alpha);
  check(ctx.bubbles[1].alpha === 1, 'the freshly-triggered neighbor stays fully opaque regardless of the first one fading', ctx.bubbles[1].alpha);
}

console.log(`\nRESULTS: ${passed} passed, 0 failed`);
