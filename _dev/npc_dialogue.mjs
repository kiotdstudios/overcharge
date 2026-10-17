// NPC DIALOGUE SYSTEM (Order 22) — schema, trigger logic, Builder/manifest wiring.
//
// Kiro Order 22 (2026-10-12), staffed solely to Aki. Covers the runtime module
// (src_scroll/npc.js), the additive npcs[] schema, and the manifest/level1
// wiring from Order 21's streetlamp-woman asset. Does NOT re-test rendering
// pixels (module_parse.mjs already proves the editor/renderer graph loads with
// npc.js wired in); this suite is proximity/cooldown/once-per-level/line-
// rotation behavior plus the data-level contracts other modules depend on.
//
// NOTE on units: Npc.update(dt, player) takes dt in SECONDS (it does
// `this._cooldownT -= dt * 1000` against millisecond timers) — a frame tick
// here is 0.016, not 16.
import fs from 'node:fs';
import { Npc, computeBubbleDurationMs } from '../src_scroll/npc.js';

const R = process.cwd();
let pass = 0, fail = 0;
const ok = (c, label, detail = '') => {
  if (c) { pass++; console.log(`  \u2713 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
  else { fail++; console.log(`  \u2717 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
};
const sec = t => console.log(`\n[ ${t} ]`);

function makeNpc(overrides = {}) {
  return new Npc({
    id: 'TEST_NPC', assetId: 'npc_streetlamp_woman', x: 1000, y: 320, facing: 'left',
    dialogue: {
      enabled: true, trigger: 'player_proximity', radiusPx: 100, triggerMode: 'enter',
      cooldownMs: 2000, oncePerLevel: false, durationMs: 1000, selectionMode: 'sequential',
      lines: [{ id: 'L1', text: 'one' }, { id: 'L2', text: 'two' }, { id: 'L3', text: 'three' }],
      ...overrides,
    },
  });
}
// Player stub: Npc.update reads player.cx ?? (player.x + w/2) and
// player.y + (player.h || 0) — a plain {x, y} with no w/h/cx resolves to
// exactly (x, y), which we set to the feet point we want to test against.
const far    = { x: 2000, y: 320 };
const inside = { x: 1050, y: 320 }; // 50px from npc.x=1000, inside a 100px radius

function tick(npc, player, seconds) {
  // Advance in 16ms-ish steps so cooldown/duration countdowns behave like the
  // real per-frame loop would, rather than one giant dt jump.
  let elapsed = 0;
  while (elapsed < seconds) { npc.update(0.016, player); elapsed += 0.016; }
}

sec('construction defaults — never crashes, never auto-talks');
{
  const bare = new Npc({ id: 'X', assetId: 'a', x: 0, y: 0 });
  ok(bare.dialogue && bare.dialogue.enabled === false, 'dialogue.enabled defaults to false when omitted entirely');
  ok(Array.isArray(bare.dialogue.lines) && bare.dialogue.lines.length === 0, 'lines defaults to an empty array');
  ok(bare.facing === 'right', 'facing defaults to right (sprite authored facing right)');
  const clampedLow  = makeNpc({ durationMs: 10 });
  const clampedHigh = makeNpc({ durationMs: 999999 });
  ok(clampedLow.dialogue.durationMs === 500, 'durationMs clamps up to the 500ms floor', String(clampedLow.dialogue.durationMs));
  ok(clampedHigh.dialogue.durationMs === 30000, 'durationMs clamps down to the 30000ms ceiling', String(clampedHigh.dialogue.durationMs));
}

sec('proximity enter-trigger — fires once on the outside\u2192inside transition only');
{
  const npc = makeNpc();
  npc.update(0.016, far);
  ok(!npc._bubbleT, 'no bubble while player is outside the radius');
  npc.update(0.016, inside);
  ok(npc._bubbleT > 0 && npc._bubbleText === 'one', 'entering the radius fires the first line', npc._bubbleText);
  const tAfterFirstFire = npc._bubbleT;
  npc.update(0.016, inside);
  ok(npc._bubbleT < tAfterFirstFire, 'standing still inside the radius does not retrigger (bubble timer only counts down)');
}

sec('cooldown — measured from bubble END, not bubble START');
{
  // durationMs has a 500ms FLOOR (clampDuration), but the REAL bubble timer
  // is max(that floor, a reading-speed estimate for the actual line text) —
  // see computeBubbleDurationMs(). "one" is short enough that the read-speed
  // floor (not the 500ms authored floor) wins; derive the real number
  // instead of guessing, so this test tracks the formula instead of fighting it.
  const npc = makeNpc({ cooldownMs: 500, durationMs: 500 });
  npc.update(0.016, far);
  npc.update(0.016, inside);     // trigger #1 (line "one")
  ok(npc._bubbleText === 'one', 'first trigger shows line one');
  npc.update(0.016, far);        // leave
  npc.update(0.016, inside);     // re-enter immediately — should be refused (cooldown + duration still running)
  ok(npc._bubbleText === 'one', 'immediate re-entry during cooldown does not advance the line', npc._bubbleText);
  const realBubbleMs = computeBubbleDurationMs('one', 500);
  tick(npc, far, (500 + realBubbleMs) / 1000 + 0.1); // clear cooldown (500ms) + the real bubble time, plus slack
  npc.update(0.016, inside);
  ok(npc._bubbleText === 'two', 'after duration+cooldown fully elapse, re-entry fires the NEXT line (sequential rotation)', npc._bubbleText);
}

sec('oncePerLevel — overrides cooldown entirely, never retriggers this session');
{
  const npc = makeNpc({ oncePerLevel: true, cooldownMs: 0, durationMs: 50 });
  npc.update(0.016, far);
  npc.update(0.016, inside);
  ok(npc._bubbleText === 'one', 'first trigger fires normally');
  tick(npc, far, 0.5); // plenty of time for cooldown (0ms) to clear
  npc.update(0.016, inside);
  ok(npc._bubbleText === 'one', 'oncePerLevel keeps the bubble silent on re-entry even though cooldown=0 would normally allow it');
}

sec('sequential line rotation wraps at the end');
{
  // cooldownMs:0 + durationMs:10 (clamped to the 500ms floor) — but the
  // REAL gate between triggers is the longest line's read-speed-estimated
  // bubble time (computeBubbleDurationMs), not the 500ms authored floor.
  // "three" is the longest of the three lines, so size the wait off that.
  const npc = makeNpc({ cooldownMs: 0, durationMs: 10 });
  const maxRealBubbleMs = computeBubbleDurationMs('three', 10);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    npc.update(0.016, far);
    tick(npc, far, maxRealBubbleMs / 1000 + 0.1);
    npc.update(0.016, inside);
    seen.push(npc._bubbleText);
  }
  ok(seen.join(',') === 'one,two,three,one', 'four triggers rotate one\u2192two\u2192three\u2192one (wraps)', seen.join(','));
}

sec('previewBubble — bypasses trigger state entirely (Builder "Preview Bubble" contract)');
{
  const npc = makeNpc({ oncePerLevel: true });
  npc.update(0.016, far);
  npc.update(0.016, inside); // consume the real first trigger
  ok(npc._triggeredOnce === true, 'sanity: real trigger consumed oncePerLevel');
  npc.previewBubble('a custom preview line');
  ok(npc._bubbleText === 'a custom preview line', 'previewBubble shows arbitrary text on demand');
  npc.previewBubble();
  ok(npc._bubbleText === 'one', 'previewBubble with no args falls back to the first authored line');
}

sec('disabled dialogue never fires (placing an NPC must never make it talk unconfigured)');
{
  const npc = makeNpc({ enabled: false });
  npc.update(0.016, far);
  npc.update(0.016, inside);
  ok(!npc._bubbleT, 'proximity entry does nothing while dialogue.enabled is false');
}

sec('schema doc, manifest, and level1 wiring (Order 21 asset delivery)');
{
  const schema = fs.readFileSync(`${R}/docs/reference/LEVEL_SCHEMA.md`, 'utf8');
  ok(/## NPC \(Dialogue-capable, non-decoration character\)/.test(schema), 'docs/reference/LEVEL_SCHEMA.md documents the NPC section');
  ok(/greetingAssetId/.test(schema), 'schema documents greetingAssetId');

  const manifest = JSON.parse(fs.readFileSync(`${R}/assets/ASSET_MANIFEST.json`, 'utf8'));
  const idle = manifest.assets.find(a => a.id === 'npc_streetlamp_woman');
  const greet = manifest.assets.find(a => a.id === 'npc_streetlamp_woman_greeting');
  ok(!!idle, 'manifest has npc_streetlamp_woman (idle ambient)');
  ok(!!greet, 'manifest has npc_streetlamp_woman_greeting (wave/beckon)');
  ok(idle && idle.loop === true, 'idle asset is loop:true');
  ok(greet && greet.loop === false, 'greeting asset is loop:false (plays once, holds last frame)');
  ok(idle && idle.category === 'npc', 'idle asset tagged category:npc');
  ok(idle && idle.spawnsKind === 'npc', 'idle asset carries spawnsKind:npc so it is placeable in the Builder');
  ok(idle && idle.greetingAssetId === 'npc_streetlamp_woman_greeting', 'idle asset cross-references its greeting animation');
  ok(idle && fs.existsSync(`${R}/assets/sprites/npc-streetlamp-woman/idle/00.png`), 'idle frame 0 exists on disk');
  ok(greet && fs.existsSync(`${R}/assets/sprites/npc-streetlamp-woman/greeting/08.png`), 'greeting frame 8 exists on disk');

  const level1 = JSON.parse(fs.readFileSync(`${R}/src_scroll/levels/level1.json`, 'utf8'));
  // Chief calls the npc count directly (filling the level out over time) — no fixed limit, just a sanity floor.
  ok(Array.isArray(level1.npcs) && level1.npcs.length >= 3, 'level1 carries npcs[] entries (at least streetlamp woman + 2 Order-23-migrated workers)', String(level1.npcs.length));
  const npcDef = level1.npcs.find(n => n.assetId === 'npc_streetlamp_woman');
  ok(!!npcDef, 'level1 has the streetlamp woman npc');
  // Line count is a content decision, not a contract — just require at least one line to pick from.
  ok(npcDef.dialogue.lines.length > 0, 'level1 npc has at least one dialogue line', String(npcDef.dialogue.lines.length));
  ok(npcDef.dialogue.enabled === true, 'level1 npc has dialogue enabled (not left dormant after placement)');
  // Clear of CP1 (x=1824, ±40 trigger) and the LAMP source hitbox (x=1664, 28x28) it's staged beside.
  ok(Math.abs(npcDef.x - 1824) > 40, 'staged npc is clear of checkpoint CP1\u2019s trigger zone');
  ok(Math.abs(npcDef.x - 1664) > 20, 'staged npc does not overlap the streetlamp charge-source hitbox');

  // Order 23: both warehouse workers now live in npcs[] (migrated out of
  // decorations[]), each carrying an `ambient` idle<->smoke config. Chief has
  // since authored dialogue for both (3 lines each) — no fixed count enforced,
  // just confirm it is real, enabled content rather than an empty placeholder.
  const workerA = level1.npcs.find(n => n.id === 'npc_smoke_break_worker_a');
  const workerB = level1.npcs.find(n => n.id === 'npc_smoke_break_worker_b');
  ok(!!workerA && !!workerB, 'both smoke-break workers are present in npcs[]');
  ok(workerA.ambient && workerA.ambient.smokeAssetId === 'npc_smoke_break_worker_a_smoke', 'worker A ambient config points at its own smoke asset');
  ok(workerB.ambient && workerB.ambient.smokeAssetId === 'npc_smoke_break_worker_b_smoke', 'worker B ambient config points at its own smoke asset');
  ok(workerA.ambient.seed !== workerB.ambient.seed, 'workers carry different seeds so their smoke cycles do not synchronize');
  const isPlaceholder = lines => lines.some(l => l.text === 'New line');
  ok(workerA.dialogue.enabled === true && workerA.dialogue.lines.length > 0 && !isPlaceholder(workerA.dialogue.lines),
    'worker A has real, authored dialogue (not the Builder placeholder)', `${workerA.dialogue.lines.length} line(s)`);
  ok(workerB.dialogue.enabled === true && workerB.dialogue.lines.length > 0 && !isPlaceholder(workerB.dialogue.lines),
    'worker B has real, authored dialogue (not the Builder placeholder)', `${workerB.dialogue.lines.length} line(s)`);
  const decoIds = (level1.decorations || []).map(d => d.id);
  ok(!decoIds.includes('npc_smoke_break_worker_a_01') && !decoIds.includes('npc_smoke_break_worker_b_01'), 'workers no longer exist as decorations[] (fully migrated, not duplicated)');
}

sec('ambient idle<->smoke state machine (Order 23) — no dialogue, no manifest needed');
{
  // No fetch/manifest in this harness, so _resolveSprites() always returns
  // null and _smokeDurationMs() falls back to its hardcoded 2000ms — exactly
  // the "manifest not loaded yet" path real startup frames also hit, so this
  // doubles as a test that the state machine never stalls while sprites are
  // still resolving.
  const amb = new Npc({
    id: 'AMB_1', assetId: 'npc_smoke_break_worker_a', x: 0, y: 0,
    ambient: { smokeAssetId: 'npc_smoke_break_worker_a_smoke', dwellMinMs: 500, dwellMaxMs: 500, seed: 42 },
  });
  ok(amb._ambState === 'idle', 'starts in the idle state');
  ok(amb._ambTimerMs > 0, 'idle dwell timer is primed on construction (not zero/instant)');

  tick(amb, null, 0.4);
  ok(amb._ambState === 'idle', 'still idle before the 500ms dwell elapses');

  tick(amb, null, 0.2);
  ok(amb._ambState === 'smoke', 'transitions to smoke once the dwell timer runs out');

  tick(amb, null, 1.0);
  ok(amb._ambState === 'smoke', 'smoke is a one-shot — does not end early (fallback duration is 2000ms)');

  tick(amb, null, 1.1);
  ok(amb._ambState === 'idle', 'returns to idle once the one-shot smoke duration elapses');
  ok(amb._ambTimerMs > 0, 'a fresh idle dwell is rolled immediately on return (never stuck at 0)');

  const bare = new Npc({ id: 'NOAMB', assetId: 'x', x: 0, y: 0 });
  ok(bare.ambient === null, 'an NPC with no ambient config has ambient=null (pure no-op)');
  tick(bare, null, 5);
  ok(bare._ambState === 'idle', 'no-ambient NPC never leaves the idle label (nothing to update)');

  const seedA = new Npc({ id: 'SEED_A', assetId: 'x', x: 0, y: 0, ambient: { smokeAssetId: 's', seed: 1 } });
  const seedB = new Npc({ id: 'SEED_B', assetId: 'x', x: 0, y: 0, ambient: { smokeAssetId: 's', seed: 2 } });
  ok(seedA._ambTimerMs !== seedB._ambTimerMs, 'two different seeds roll two different initial dwells (no lockstep sync)');

  const noSeed1 = new Npc({ id: 'worker_q', assetId: 'x', x: 0, y: 0, ambient: { smokeAssetId: 's' } });
  const noSeed2 = new Npc({ id: 'worker_z', assetId: 'x', x: 0, y: 0, ambient: { smokeAssetId: 's' } });
  ok(noSeed1._ambTimerMs !== noSeed2._ambTimerMs, 'omitted seed falls back to a hash of the id, so differently-named NPCs still desync');
}

sec('computeBubbleDurationMs — Chief: "duration on mechanic text goes away too quick cant read it"');
{
  // Pure logic, no Npc instance needed — isolate the formula from the
  // trigger/cooldown plumbing so a future retune only has to reason about
  // this block, not re-derive every timing test above.
  ok(computeBubbleDurationMs('one', 500) > 500,
    'a short string on a short authored duration still gets a real reading-time floor, not just the 500ms clamp',
    computeBubbleDurationMs('one', 500));
  const shortLine = computeBubbleDurationMs('hi', 3500);
  ok(shortLine === 3500,
    'a very short line never gets SHORTER than whatever was authored — the formula only ever extends, never cuts, a duration',
    shortLine);
  const long61 = computeBubbleDurationMs('x'.repeat(61), 3000);
  ok(long61 > 4000 && long61 < 6000,
    'level1\'s longest real line (61 chars) at the old 3000ms authored duration now reads for 4-6s, not 3s',
    long61);
  ok(computeBubbleDurationMs('x'.repeat(61), 3000) > computeBubbleDurationMs('hi', 3000),
    'a longer line gets more time on screen than a shorter one given the same authored duration');
  const huge = computeBubbleDurationMs('x'.repeat(2000), 3000);
  ok(huge === 30000, 'the formula still respects the 30000ms hard ceiling for a pathologically long line', huge);
  ok(computeBubbleDurationMs('', 3000) === 3000,
    'empty text never divides by zero or goes negative, just falls back to the authored duration', computeBubbleDurationMs('', 3000));
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
