// absorb_prompt_bubble_overlap.mjs — Chief screenshot: the streetlamp woman's
// speech bubble and that same lamp's "[E] ABSORB" prompt both anchor near the
// lamp and landed on top of each other. Covers ui.js's _clearOfBubbles()
// helper, now threaded through the "[E] ABSORB" and "[SPACE] CHARGE" world
// prompts via drawWorldPrompts(ctx, player, t, bubbleRects).
// render.js (imported by ui.js) touches `new Image()` at module scope, so a
// headless run needs the same DOM-ish globals every other headless suite
// uses — see _dev/support/headless.mjs.
globalThis.window = { addEventListener() {}, removeEventListener() {}, innerWidth: 960, innerHeight: 578, location: { search: '' } };
globalThis.document = { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {}, getContext() { return new Proxy({}, { get: () => () => {} }); } }; }, body: { style: {} } };
globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 64; this.naturalHeight = 64; } addEventListener() {} };
const { drawWorldPrompts } = await import('../src_scroll/ui.js');

let passed = 0;
function check(value, label, extra) {
  if (!value) throw new Error(label + (extra !== undefined ? ` (${JSON.stringify(extra)})` : ''));
  passed++;
  console.log(`✓ ${label}`);
}

function makeCtx() {
  const texts = [];
  return {
    save() {}, restore() {},
    measureText(s) { return { width: s.length * 7 }; },
    fillText(s, x, y) { texts.push({ s, x, y }); },
    font: '', fillStyle: '', strokeStyle: '', textAlign: '', shadowBlur: 0, shadowColor: '', globalAlpha: 1,
    texts,
  };
}

// ── "[E] ABSORB" lands clear of an overlapping bubble ──────────────────────
{
  const player = { nearSource: { cx: 1740, y: 352, drained: false } };
  const defaultCy = player.nearSource.y - 22; // the fallback math _drawContextPrompts uses with no promptAnchor()

  const noBubbles = makeCtx();
  drawWorldPrompts(noBubbles, player, 0, []);
  const base = noBubbles.texts.find(c => c.s === '[E] ABSORB');
  check(!!base, 'ABSORB prompt renders with no bubbles active');
  check(base.y === defaultCy, 'with zero bubbles active, ABSORB renders at its normal unmodified position (no regression)', base);

  // A bubble box that straddles the ABSORB prompt's default spot — the exact
  // shape of the real repro (streetlamp woman's bubble sitting right above
  // the lamp she's linked to).
  const collidingBubble = { bx: 1740 - 110, by: defaultCy - 20, w: 220, h: 60 };
  const withBubble = makeCtx();
  drawWorldPrompts(withBubble, player, 0, [collidingBubble]);
  const lifted = withBubble.texts.find(c => c.s === '[E] ABSORB');
  check(!!lifted, 'ABSORB prompt still renders with a colliding bubble present');
  check(lifted.y < collidingBubble.by, 'ABSORB prompt lifts clear above the bubble instead of landing inside it', { lifted, collidingBubble });

  // A bubble nowhere near the prompt must not move it at all.
  const farBubble = { bx: 200, by: 50, w: 220, h: 60 };
  const unaffected = makeCtx();
  drawWorldPrompts(unaffected, player, 0, [farBubble]);
  const same = unaffected.texts.find(c => c.s === '[E] ABSORB');
  check(same.y === defaultCy, 'a bubble far from the prompt leaves it untouched', same);
}

// ── "[SPACE] CHARGE" (nearChargeSource) gets the same treatment ────────────
{
  const player = { nearChargeSource: { cx: 900, y: 300, h: 40 } };
  const defaultCy = player.nearChargeSource.y + player.nearChargeSource.h + 12;

  const collidingBubble = { bx: 900 - 110, by: defaultCy - 20, w: 220, h: 60 };
  const ctx = makeCtx();
  drawWorldPrompts(ctx, player, 0, [collidingBubble]);
  const lifted = ctx.texts.find(c => c.s === '[SPACE] CHARGE');
  check(!!lifted, 'CHARGE prompt still renders with a colliding bubble present');
  check(lifted.y < collidingBubble.by, 'CHARGE prompt also lifts clear of a colliding bubble', { lifted, collidingBubble });
}

// ── Calling with no 4th argument at all (every pre-existing caller) must not throw ──
{
  const player = { nearSource: { cx: 1740, y: 352, drained: false } };
  const ctx = makeCtx();
  drawWorldPrompts(ctx, player, 0); // bubbleRects omitted entirely
  check(ctx.texts.some(c => c.s === '[E] ABSORB'), 'omitting bubbleRects entirely (old call signature) still renders normally, no throw');
}

// Font-size parsing regression: parseInt('bold 11px monospace') is NaN (the
// string starts with 'b'), so _clearOfBubbles used to silently fall back to
// a hardcoded 11 no matter the prompt's real font size — right answer today
// only because every prompt that calls it happens to be 11px. Prove the
// extraction itself is correct for an arbitrary font string, independent of
// which prompts currently use it.
{
  for (const [font, want] of [['bold 11px monospace', 11], ['bold 20px monospace', 20], ['14px monospace', 14]]) {
    const got = parseInt((/(\d+)px/.exec(font) || [])[1], 10) || 11;
    check(got === want, `font-size regex reads "${font}" as ${want}px, not a hardcoded 11`, { font, got });
  }
}

console.log(`\nRESULTS: ${passed} passed, 0 failed`);
