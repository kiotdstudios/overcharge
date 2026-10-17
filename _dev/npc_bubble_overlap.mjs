// npc_bubble_overlap.mjs — Chief's bug report: "text boxes sit on top of
// each other" when two NPCs' dialogue bubbles are both active at once (the
// smoke-break workers, only 46px apart, were the real-world repro). Covers
// drawNpcBubbles()'s stacking fix in src_scroll/npc.js and the new restyle's
// backward-compatibility guarantee (a single active bubble renders exactly
// where it always did — lift only ever kicks in once a real collision would
// happen).
import fs from 'node:fs';
import { Npc, drawSpeechBubble, drawNpcBubbles } from '../src_scroll/npc.js';

let passed = 0;
function check(value, label, extra) {
  if (!value) throw new Error(label + (extra !== undefined ? ` (${JSON.stringify(extra)})` : ''));
  passed++;
  console.log(`✓ ${label}`);
}

// A ctx mock matching the one npc_patrol.mjs already uses for drawSpeechBubble,
// plus bubble-rect capture: the FIRST rect() call after each save() is always
// the base panel (see drawSpeechBubble), so one entry per bubble drawn.
function makeCtx() {
  const bubbles = [];
  let curr = null;
  return {
    bubbles,
    save() { curr = null; },
    restore() {},
    measureText(s) { return { width: s.length * 7 }; },
    beginPath() {},
    rect(x, y, w, h) { if (!curr) { curr = { x, y, w, h }; bubbles.push(curr); } },
    fill() {}, stroke() {}, moveTo() {}, lineTo() {}, closePath() {}, fillText() {},
  };
}
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Real-world repro: level1.json's own smoke-break workers, same y, 46px apart.
const level = JSON.parse(fs.readFileSync('src_scroll/levels/level1.json', 'utf8'));
const workers = level.npcs.filter(n => n.ambient && n.dialogue?.lines?.length);
check(workers.length >= 2, 'level1 still has at least two smoke-break-style NPCs to repro against', workers.length);
const [wa, wb] = workers;
check(Math.abs(wa.x - wb.x) < 220, 'the two workers are close enough on x to have collided before this fix', Math.abs(wa.x - wb.x));

{
  const npcA = new Npc(wa), npcB = new Npc(wb);
  // No real <img> loads headless, so simulate what draw() would have stashed.
  npcA._lastGeom = { visible: { y: 352 } };
  npcB._lastGeom = { visible: { y: 352 } };
  npcA._bubbleT = 1000; npcA._bubbleText = "You see sparks out there? Yeah. Me too. Pretend you didn't.";
  npcB._bubbleT = 1000; npcB._bubbleText = "Smoke break's the only honest minute in this whole shift.";

  const ctx = makeCtx();
  drawNpcBubbles(ctx, [npcA, npcB], null);
  check(ctx.bubbles.length === 2, 'both active bubbles were drawn', ctx.bubbles.length);
  check(!overlaps(ctx.bubbles[0], ctx.bubbles[1]),
    'the two simultaneously-active bubbles no longer overlap on screen', ctx.bubbles);
}

// A lone active bubble (the overwhelming majority of levels: one NPC talking
// at a time) must render in EXACTLY the same spot as before this fix — the
// stacking logic should never move a bubble that has nothing to collide with.
{
  const npc = new Npc(wa);
  npc._lastGeom = { visible: { y: 352 } };
  npc._bubbleT = 1000; npc._bubbleText = 'solo line, nobody else is talking';

  const viaPass = makeCtx();
  drawNpcBubbles(viaPass, [npc], null);

  const direct = makeCtx();
  drawSpeechBubble(direct, npc.x, 352, npc._bubbleText, null);

  check(viaPass.bubbles.length === 1 && direct.bubbles.length === 1, 'both paths drew exactly one bubble');
  check(JSON.stringify(viaPass.bubbles[0]) === JSON.stringify(direct.bubbles[0]),
    'a lone bubble through drawNpcBubbles lands pixel-identical to calling drawSpeechBubble directly (zero lift, zero regression)',
    { viaPass: viaPass.bubbles[0], direct: direct.bubbles[0] });
}

// Three-way cluster: make sure the stacking loop handles more than a pair —
// each one lands clear of every bubble already placed, not just its neighbour.
{
  const npcs = [0, 1, 2].map(i => {
    const n = new Npc(wa);
    n.x = 1392 + i * 20;
    n._lastGeom = { visible: { y: 352 } };
    n._bubbleT = 1000;
    n._bubbleText = `worker ${i} says something short`;
    return n;
  });
  const ctx = makeCtx();
  drawNpcBubbles(ctx, npcs, null);
  check(ctx.bubbles.length === 3, 'all three simultaneous bubbles were drawn', ctx.bubbles.length);
  let clean = true;
  for (let i = 0; i < ctx.bubbles.length; i++)
    for (let j = i + 1; j < ctx.bubbles.length; j++)
      if (overlaps(ctx.bubbles[i], ctx.bubbles[j])) clean = false;
  check(clean, 'a three-NPC cluster stacks every bubble clear of every other one', ctx.bubbles);
}

console.log(`\nRESULTS: ${passed} passed, 0 failed`);
