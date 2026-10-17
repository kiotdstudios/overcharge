// npc_greeting_fade.mjs — Chief: "that other thing should be smooth too"
// (the greeting pose). A bubble now fades out over its last BUBBLE_FADE_MS
// (see npc_bubble_fade.mjs), but the greeting SPRITE used to still snap
// straight from its pose to idle/walk/smoke the instant _greetT hit zero —
// a visual mismatch between a soft fade and a hard pose snap. draw() now
// also crossfades the greeting pose into whatever comes next over that same
// window. Covers the alpha math and draw-call shape end-to-end through the
// real Npc/draw() pipeline (not just the formula in isolation), plus the
// zero-regression guarantee that every frame outside the fade window is
// still exactly one drawImage() call, pixel-identical to before.
import fs from 'node:fs';
import { Npc, BUBBLE_FADE_MS } from '../src_scroll/npc.js';
import { loadDecoAnimations } from '../src_scroll/deco-anim.js';

let passed = 0;
function check(value, label, extra) {
  if (!value) throw new Error(label + (extra !== undefined ? ` (${JSON.stringify(extra)})` : ''));
  passed++;
  console.log(`✓ ${label}`);
}

globalThis.Image = class {
  complete = true;
  naturalWidth = 236;
  naturalHeight = 236;
};
const manifest = JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json', 'utf8'));
globalThis.fetch = async () => ({ ok: true, json: async () => manifest });
await loadDecoAnimations();

const level = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
const def = level.npcs.find(npc => npc.id === 'NPC_STREETLAMP_01');
const tenantDef = level.npcs.find(npc => npc.id === 'NPC_TENANT');

// Mock ctx tracks save/restore of globalAlpha for real (unlike the bubble
// fade test's mock, whose restore() was a no-op) — closes the exact gap the
// independent reviewer flagged as untested there, this time around.
function makeCtx() {
  const draws = [];
  const stack = [];
  return {
    draws,
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    save() { stack.push(this.globalAlpha); },
    restore() { this.globalAlpha = stack.pop(); },
    translate() {}, scale() {},
    drawImage(img) { draws.push({ src: img?.src, alpha: this.globalAlpha }); },
  };
}

function makeNpc(facing = 'right') {
  const npc = new Npc(def);
  npc._resolveSprites();
  npc.facing = facing;
  return npc;
}

// Zero regression: an NPC with no greeting active at all (plain idle) still
// renders in exactly one drawImage() call, at full opacity.
{
  const npc = makeNpc();
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 1, 'idle NPC (no greeting) draws exactly once', ctx.draws.length);
  check(ctx.draws[0].alpha === 1, 'idle NPC draws at full opacity', ctx.draws[0].alpha);
  check(ctx.globalAlpha === 1, 'globalAlpha is restored to 1 after draw() returns');
}

// Zero regression: a greeting well inside its duration (way more than
// BUBBLE_FADE_MS remaining) still renders in exactly one drawImage() call,
// at full opacity — the crossfade must not kick in early.
{
  const npc = makeNpc();
  npc.previewBubble('plenty of time left');
  npc._greetT = 3000; // way above BUBBLE_FADE_MS
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 1, 'a fresh greeting draws exactly once', ctx.draws.length);
  check(ctx.draws[0].src.includes('/greeting/'), 'the single draw is the greeting pose', ctx.draws[0].src);
  check(ctx.draws[0].alpha === 1, 'a fresh greeting renders at full opacity', ctx.draws[0].alpha);
}

// Exactly at the fade threshold, the crossfade has not started yet (matches
// the bubble's own fade, which also only starts strictly below
// BUBBLE_FADE_MS, never at-or-below) — still exactly one draw call.
{
  const npc = makeNpc();
  npc.previewBubble('right at the edge');
  npc._greetT = BUBBLE_FADE_MS;
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 1, 'exactly at the fade-window boundary, still a single draw call', ctx.draws.length);
  check(ctx.draws[0].alpha === 1, 'exactly at the fade-window boundary, still fully opaque', ctx.draws[0].alpha);
}

// Halfway through the fade window: two draw calls, in order — the pose
// coming next drawn first at full opacity, then the greeting pose on top at
// ~half opacity (same BUBBLE_FADE_MS ramp the bubble itself uses).
{
  const npc = makeNpc();
  npc.previewBubble('fading out now');
  npc._greetT = BUBBLE_FADE_MS / 2;
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 2, 'mid-fade renders exactly two draw calls (crossfade)', ctx.draws.length);
  check(!ctx.draws[0].src.includes('/greeting/'), 'the first (underneath) draw is the NEXT pose, not greeting', ctx.draws[0].src);
  check(ctx.draws[0].alpha === 1, 'the underneath pose draws at full opacity', ctx.draws[0].alpha);
  check(ctx.draws[1].src.includes('/greeting/'), 'the second (on top) draw is still the greeting pose', ctx.draws[1].src);
  check(Math.abs(ctx.draws[1].alpha - 0.5) < 1e-9,
    'halfway through the fade window the greeting pose is at half opacity', ctx.draws[1].alpha);
  check(ctx.globalAlpha === 1, 'globalAlpha is restored to 1 after a crossfade draw() returns');
}

// Right before expiring, the greeting pose's alpha should be nearly (but
// not exactly) zero — never negative, never NaN — while the underneath pose
// stays fully opaque throughout.
{
  const npc = makeNpc();
  npc.previewBubble('almost gone');
  npc._greetT = 1; // 1ms left
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 2, 'still mid-fade with 1ms left, two draw calls', ctx.draws.length);
  const a = ctx.draws[1].alpha;
  check(a > 0 && a < 0.01, 'a greeting pose with 1ms left is almost fully transparent but not negative/NaN', a);
  check(ctx.draws[0].alpha === 1, 'the underneath pose stays fully opaque even at the very end of the fade', ctx.draws[0].alpha);
}

// The crossfade logic also runs correctly through the facing==='left'
// branch (translate+scale) without crashing or losing a draw call.
{
  const npc = makeNpc('left');
  npc.previewBubble('facing left while fading');
  npc._greetT = BUBBLE_FADE_MS / 2;
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 2, 'facing left during a crossfade still renders both draw calls', ctx.draws.length);
  check(Math.abs(ctx.draws[1].alpha - 0.5) < 1e-9, 'facing left does not change the alpha ramp', ctx.draws[1].alpha);
}

// Edge case: the lookahead ("next pose") frame isn't ready yet (e.g. still
// loading). draw() must not crash, and must fall back to rendering the
// greeting frame ALONE, at full opacity — never silently dim or skip the
// only renderable pose just because the thing underneath it isn't ready.
{
  const npc = makeNpc();
  npc.previewBubble('lookahead not ready');
  npc._greetT = BUBBLE_FADE_MS / 2;
  npc._walking = true; // next pose resolves to the walk slot
  for (const img of npc._sprites.walk.frames) img.complete = false;
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 1, 'an unready lookahead frame falls back to a single draw call', ctx.draws.length);
  check(ctx.draws[0].src.includes('/greeting/'), 'the single fallback draw is the greeting frame itself', ctx.draws[0].src);
  check(ctx.draws[0].alpha === 1, 'the fallback draw renders at full opacity, never dimmed', ctx.draws[0].alpha);
}

// After a crossfade draw, this._frameSlot still reflects the greeting slot
// (the frame actually on top) — the lookahead call must not leave it
// clobbered for drawNpcBubbles() or anything else reading it afterward.
{
  const npc = makeNpc();
  npc.previewBubble('slot sanity check');
  npc._greetT = BUBBLE_FADE_MS / 2;
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(npc._frameSlot === npc._sprites.greeting, 'this._frameSlot still points at the greeting slot after a crossfade draw');
}

// Powered priority: a powered NPC with poweredAssetId takes priority over
// greeting in _currentFrame's own slot order (usePowered is checked before
// useGreeting), so even if _greetT also happens to be inside the fade
// window (both ARE set from the same source in _fire(), see npc.js), the
// crossfade must NOT kick in - a powered pose never dissolves into
// anything, it just renders once, fully opaque, same as before this change.
{
  const npc = new Npc({ ...tenantDef, greetingAssetId: 'npc_streetlamp_woman_greeting' });
  npc._resolveSprites();
  npc._powered = true;
  npc._greetT = BUBBLE_FADE_MS / 2; // inside the fade window, same as the crossfade tests above
  const ctx = makeCtx();
  npc.draw(ctx, null);
  check(ctx.draws.length === 1, 'a powered NPC with _greetT inside the fade window still draws exactly once (powered wins)', ctx.draws.length);
  check(ctx.draws[0].src.includes('npc_window_tenant_relieved') || ctx.draws[0].src.includes('relieved'),
    'the single draw is the powered pose, not greeting', ctx.draws[0].src);
  check(ctx.draws[0].alpha === 1, 'the powered pose renders at full opacity, never crossfaded', ctx.draws[0].alpha);
}

console.log(`\nRESULTS: ${passed} passed, 0 failed`);
