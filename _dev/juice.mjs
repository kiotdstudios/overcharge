// juice.mjs - the shared feedback layer (src_scroll/juice.js).
// Drives the REAL Player and Level through support/headless.mjs for the observe() cases.
import { Player, Level, held, step, flat } from './support/headless.mjs';
import { createJuice, JUICE_LIMITS } from '../src_scroll/juice.js';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const run = (j, seconds, dt = 1 / 60) => { for (let i = 0; i < Math.round(seconds / dt); i++) j.update(dt); };
const ctxProxy = () => { const calls = []; return { calls, ctx: new Proxy({}, { get: (_, k) => (...a) => { calls.push(k); }, set: () => true }) }; };

sec('EVERYTHING RETURNS TO REST');
{
  const j = createJuice({ rng: seeded() });
  j.dust(100, 100, 0, 2); j.gateBurst(200, 200); j.hurt(50, 50); j.sparks(10, 10); j.stream({ x: 0, y: 0 }, { x: 100, y: 0 }, 2);
  ok(j.particleCount > 0, 'effects create particles', `${j.particleCount}`);
  ok(j.shakeAmplitude > 0 && j.hitStopRemaining > 0, 'and a shake plus a hit-stop', `shake ${j.shakeAmplitude.toFixed(2)}, stop ${j.hitStopRemaining.toFixed(3)}`);
  run(j, 2);
  ok(j.particleCount === 0, 'every particle is dead within 2 s', `${j.particleCount} left`);
  ok(j.shakeAmplitude === 0, 'shake decays to exactly 0');
  ok(j.hitStopRemaining === 0 && !j.frozen(), 'hit-stop expires and the world is no longer frozen');
  const o = j.shakeOffset();
  ok(o.x === 0 && o.y === 0, 'shake offset is (0, 0) at rest', JSON.stringify(o));
}

sec('LIMITS: nothing can pile up or lurch the camera');
{
  const j = createJuice({ rng: seeded() });
  for (let i = 0; i < 100; i++) j.gateBurst(0, 0);
  ok(j.particleCount <= JUICE_LIMITS.maxParticles, `particle pool is capped at ${JUICE_LIMITS.maxParticles}`, `${j.particleCount}`);
  ok(j.shakeAmplitude <= JUICE_LIMITS.maxShake, `shake never exceeds ${JUICE_LIMITS.maxShake} px`, `${j.shakeAmplitude}`);
  ok(j.hitStopRemaining <= JUICE_LIMITS.maxHitStop + 1e-9, `hit-stop never exceeds ${JUICE_LIMITS.maxHitStop} s`, `${j.hitStopRemaining}`);
  let maxOff = 0;
  for (let i = 0; i < 120; i++) { j.update(1 / 60); const o = j.shakeOffset(); maxOff = Math.max(maxOff, Math.abs(o.x), Math.abs(o.y)); }
  ok(maxOff <= JUICE_LIMITS.maxShake, 'and the real camera offset stays inside the ceiling', `${maxOff}px`);
  const w = createJuice({ rng: seeded() });
  w.shake(5, 0.4); const strong = w.shakeAmplitude; w.shake(1, 0.4);
  ok(w.shakeAmplitude >= strong - 1e-9, 'a small shake cannot weaken a bigger one in progress');
}

sec('PREFERS-REDUCED-MOTION');
{
  const a = createJuice({ rng: seeded(), reducedMotion: true });
  a.gateBurst(0, 0); a.hurt(0, 0); a.landing(0, 0, 900);
  ok(a.shakeAmplitude === 0 && a.hitStopRemaining === 0 && !a.frozen(), 'no shake and no hit-stop');
  const b = createJuice({ rng: seeded() }); b.gateBurst(0, 0);
  const c = createJuice({ rng: seeded(), reducedMotion: true }); c.gateBurst(0, 0);
  ok(c.particleCount > 0 && c.particleCount < b.particleCount, 'particles stay but are fewer', `${c.particleCount} vs ${b.particleCount}`);
  const d = createJuice({ rng: seeded() }); d.shake(4, 0.3); d.setReducedMotion(true);
  ok(d.shakeAmplitude === 0, 'switching reduced motion on mid-shake stops it at once');
}

sec('THE OFF SWITCH');
{
  const j = createJuice({ rng: seeded(), enabled: false });
  j.dust(0, 0, 0, 2); j.gateBurst(0, 0); j.hurt(0, 0);
  const { ctx, calls } = ctxProxy();
  j.draw(ctx);
  ok(j.particleCount === 0 && j.shakeAmplitude === 0 && !j.frozen(), 'disabled: no particles, no shake, never freezes');
  ok(calls.length === 0, 'and draws nothing');
  const k = createJuice({ rng: seeded() }); k.gateBurst(0, 0); k.setEnabled(false);
  ok(k.particleCount === 0 && !k.frozen(), 'switching it off mid-effect clears everything');
}

sec('DETERMINISM and DRAW');
{
  const snap = () => { const j = createJuice({ rng: seeded(3) }); j.gateBurst(10, 10); run(j, 0.1); return JSON.stringify([j.particleCount, j.shakeOffset()]); };
  ok(snap() === snap(), 'the same seed gives the same result (recordings repeat)');
  const j = createJuice({ rng: seeded() }); j.dust(50, 50, 0, 1);
  const { ctx, calls } = ctxProxy(); j.draw(ctx);
  ok(calls.includes('fillRect') && calls.filter(c => c === 'save').length === calls.filter(c => c === 'restore').length, 'draw paints squares and balances save/restore');
}

sec('FEEDBACK SCALES WITH THE FALL');
{
  const small = createJuice({ rng: seeded() }); small.landing(0, 0, 150);
  ok(small.particleCount === 0, 'a step down (150 px/s) makes no effect');
  const mid = createJuice({ rng: seeded() }); mid.landing(0, 0, 400);
  const big = createJuice({ rng: seeded() }); big.landing(0, 0, 700);
  ok(mid.particleCount > 0 && mid.shakeAmplitude === 0, 'a medium fall (400 px/s) gives dust and no shake', `${mid.particleCount} particles`);
  ok(big.particleCount > mid.particleCount && big.shakeAmplitude > 0, 'a long fall (700 px/s) gives more dust and a shake', `${big.particleCount} particles, shake ${big.shakeAmplitude.toFixed(2)}`);
}

sec('observe() ON THE REAL GAME');
{
  held([]);
  const level = flat(); const p = new Player(100, 418);
  const j = createJuice({ rng: seeded() });
  for (let i = 0; i < 30; i++) { step(p, level); j.observe(p, level, 1 / 60); j.update(1 / 60); }
  ok(p.grounded, 'the hero settles on the floor');
  ok(j.particleCount === 0, 'standing still produces no effects', `${j.particleCount}`);
  // jump, then land
  held(['ArrowUp']); step(p, level); j.observe(p, level, 1 / 60); held([]);
  let launched = j.particleCount;
  for (let i = 0; i < 120; i++) { step(p, level); j.observe(p, level, 1 / 60); j.update(1 / 60); launched = Math.max(launched, j.particleCount); }
  ok(launched > 0, 'a jump and landing produce dust', `peak ${launched}`);
  run(j, 2);
  ok(j.particleCount === 0, 'which all fades');
  // a fall from height
  const high = new Player(100, 100);
  const lv2 = flat(); const j2 = createJuice({ rng: seeded() });
  let peak = 0, peakShake = 0;
  for (let i = 0; i < 200; i++) { step(high, lv2); j2.observe(high, lv2, 1 / 60); j2.update(1 / 60); peak = Math.max(peak, j2.particleCount); peakShake = Math.max(peakShake, j2.shakeAmplitude); }
  ok(peak > launched, 'a long drop makes more dust than a hop', `${peak} vs ${launched}`);
  ok(peakShake > 0, 'and shakes the camera', peakShake.toFixed(2));
}

sec('observe() reads the state, and never writes it');
{
  held([]);
  const level = flat(); const p = new Player(100, 418);
  for (let i = 0; i < 30; i++) step(p, level);
  const before = JSON.stringify({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, g: p.grounded, e: p.usableEnergy });
  const j = createJuice({ rng: seeded() });
  for (let i = 0; i < 60; i++) { j.observe(p, level, 1 / 60); j.update(1 / 60); }
  const after = JSON.stringify({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, g: p.grounded, e: p.usableEnergy });
  ok(before === after, 'the player is identical after 60 observed frames');
  // transitions: a gate opening bursts exactly once
  const gate = { open: false, x: 300, y: 300, w: 32, h: 64 };
  const lv = { gates: [gate], checkpoints: [], chests: [], sources: [] };
  const j2 = createJuice({ rng: seeded() });
  j2.observe(p, lv, 1 / 60);
  gate.open = true; j2.observe(p, lv, 1 / 60);
  const n1 = j2.particleCount;
  j2.observe(p, lv, 1 / 60); j2.observe(p, lv, 1 / 60);
  ok(n1 > 0 && j2.particleCount === n1, 'a gate opening bursts exactly once, not every frame', `${n1} then ${j2.particleCount}`);
  ok(j2.frozen(), 'and gives a short hit-stop');
  gate.open = false; j2.observe(p, lv, 1 / 60); const n2 = j2.particleCount; gate.open = true; j2.observe(p, lv, 1 / 60);
  ok(j2.particleCount > n2, 'reopening after a checkpoint rewind bursts again');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
