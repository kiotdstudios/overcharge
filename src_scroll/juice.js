// juice.js - the shared feedback layer: particles, screen shake and hit-stop.
//
// Design rules (docs/GAME_DESIGN_V2.md section 9):
//  * It only LISTENS. It never changes player, level or physics state, so switching it off
//    (?juice=off) leaves the game exactly as it was.
//  * It derives events by watching state each frame (observe), so it needs no hooks inside
//    player.js. When player events exist (KIRO_ORDER_CODEX_01 C5) they can call the same
//    public methods (dust, landing, sparks, ...).
//  * Every effect returns to rest: particles die, shake decays to 0, hit-stop expires.
//  * prefers-reduced-motion: no shake, no hit-stop, fewer and calmer particles.
//  * Pure module: no DOM access. main.js passes in reducedMotion and the draw context.

export const JUICE_LIMITS = Object.freeze({
  maxParticles: 400,
  maxShake: 6,          // px, hard ceiling so nothing can ever lurch the camera
  maxHitStop: 0.12,     // s, hard ceiling
});

// Night City palette: cool cyan/violet power colours and grey-blue dust.
const COLORS = Object.freeze({
  dust:   ['#7d8aa6', '#a3aec6', '#5b6785'],
  spark:  ['#9ff4ff', '#44ddff', '#ffffff'],
  power:  ['#ffc070', '#ffe0a0', '#ffffff'],
  gate:   ['#b66cff', '#44ddff', '#ffffff'],
  gold:   ['#ffd45a', '#fff1a8', '#ffffff'],
  green:  ['#44ff88', '#a8ffcc', '#ffffff'],
  hurt:   ['#ff4455', '#ff8a96', '#ffffff'],
});

export function createJuice(opts = {}) {
  const rng = opts.rng || Math.random;
  const state = {
    enabled: opts.enabled !== false,
    reducedMotion: !!opts.reducedMotion,
    particles: [],
    shakeAmp: 0, shakeT: 0, shakeDur: 0,
    hitStopT: 0,
    time: 0,
    // observe() memory
    seen: null,
    listeners: [],
  };

  // Other systems (the audio bus) subscribe here. Events fire even when the visuals are switched off,
  // so ?juice=off does not silence the game.
  function emit(name, data = {}) { for (const fn of state.listeners) fn(name, data); }

  const pick = arr => arr[Math.floor(rng() * arr.length) % arr.length];
  const range = (a, b) => a + (b - a) * rng();

  function add(p) {
    if (!state.enabled) return;
    if (state.particles.length >= JUICE_LIMITS.maxParticles) state.particles.shift();
    state.particles.push(p);
  }

  // Reduced motion keeps a little feedback (so actions still read) but at 40% of the count.
  const count = n => Math.max(1, Math.round(n * (state.reducedMotion ? 0.4 : 1)));

  function burst({ x, y, n = 8, colors = COLORS.spark, speed = 80, spread = Math.PI * 2, angle = -Math.PI / 2,
                   life = 0.4, size = 2, gravity = 0, drag = 0.9 }) {
    for (let i = 0; i < count(n); i++) {
      const a = angle + (rng() - 0.5) * spread;
      const s = speed * range(0.4, 1);
      add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * range(0.7, 1.2), max: life,
            size, color: pick(colors), gravity, drag });
    }
  }

  // ---- named effects -------------------------------------------------------------------
  function dust(x, y, dir = 0, strength = 1) {
    // dir: -1 left, 1 right, 0 both. Low, grey puffs kicked sideways along the ground.
    const sides = dir === 0 ? [-1, 1] : [dir];
    for (const side of sides) {
      for (let i = 0; i < count(3 + 3 * strength); i++) {
        add({ x: x + side * range(0, 5), y, vx: side * range(15, 55) * (0.6 + strength * 0.5),
              vy: -range(8, 30), life: range(0.25, 0.5), max: 0.5, size: strength > 1 ? 3 : 2,
              color: pick(COLORS.dust), gravity: 40, drag: 0.86 });
      }
    }
  }

  function landing(x, y, fallSpeed) {
    if (fallSpeed >= 120) emit('land', { x, y, fallSpeed });
    // Below 220 px/s (a step down) nothing: feedback must scale with the fall.
    if (fallSpeed < 220) return;
    const strength = Math.min(2, (fallSpeed - 220) / 380);       // 0..2
    dust(x, y, 0, strength);
    if (fallSpeed > 520) shake(1 + 2.5 * Math.min(1, (fallSpeed - 520) / 300), 0.18);
  }

  function jump(x, y) { emit('jump', { x, y }); dust(x, y, 0, 0.4); }

  function sparks(x, y, dirAngle = -Math.PI / 2, n = 6) {
    burst({ x, y, n, colors: COLORS.spark, speed: 90, spread: Math.PI, angle: dirAngle, life: 0.3, drag: 0.88 });
  }

  // A stream of sparks travelling from `from` to `to` (absorb: object -> hero, charge: hero -> object).
  function stream(from, to, rate = 1, colors = COLORS.spark) {
    const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 1;
    const speed = 150 + 120 * rate;
    for (let i = 0; i < count(1 + rate); i++) {
      add({ x: from.x + range(-3, 3), y: from.y + range(-3, 3),
            vx: dx / len * speed + range(-20, 20), vy: dy / len * speed + range(-30, 10),
            life: Math.min(0.5, len / speed + 0.05), max: 0.5, size: 2, color: pick(colors),
            gravity: 0, drag: 1 });
    }
  }

  function gateBurst(x, y) {
    emit('gate-open', { x, y });
    burst({ x, y, n: 28, colors: COLORS.gate, speed: 170, life: 0.7, gravity: 60, size: 3 });
    shake(3, 0.28);
    hitStop(0.07);
  }
  function checkpointBurst(x, y) { emit('checkpoint', { x, y }); burst({ x, y, n: 14, colors: COLORS.green, speed: 110, life: 0.6, gravity: -20 }); }
  function chestBurst(x, y) { emit('chest-open', { x, y }); burst({ x, y, n: 20, colors: COLORS.gold, speed: 130, life: 0.6, gravity: 80, size: 3 }); shake(2, 0.2); }
  function dryPuff(x, y) { emit('source-dry', { x, y }); burst({ x, y, n: 8, colors: COLORS.power, speed: 60, life: 0.35, gravity: 20 }); }
  function hurt(x, y) { emit('hurt', { x, y }); burst({ x, y, n: 12, colors: COLORS.hurt, speed: 140, life: 0.4, size: 3 }); shake(3, 0.2); hitStop(0.05); }

  function shake(amp, dur = 0.2) {
    if (!state.enabled || state.reducedMotion) return;
    amp = Math.min(JUICE_LIMITS.maxShake, Math.max(0, amp));
    if (amp > state.shakeAmp * (state.shakeT / (state.shakeDur || 1))) {   // never weaken a bigger shake in progress
      state.shakeAmp = amp; state.shakeT = dur; state.shakeDur = dur;
    }
  }
  function hitStop(sec) {
    if (!state.enabled || state.reducedMotion) return;
    state.hitStopT = Math.min(JUICE_LIMITS.maxHitStop, Math.max(state.hitStopT, sec));
  }

  // ---- per-frame -----------------------------------------------------------------------
  function update(dt) {
    state.time += dt;
    if (state.hitStopT > 0) state.hitStopT = Math.max(0, state.hitStopT - dt);
    if (state.shakeT > 0) {
      state.shakeT = Math.max(0, state.shakeT - dt);
      if (state.shakeT === 0) state.shakeAmp = 0;
    }
    const ps = state.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  // True while a hit-stop freeze is running. main.js should skip the world update then.
  function frozen() { return state.enabled && state.hitStopT > 0; }

  // Whole-pixel camera offset. Deterministic from the clock, so tests and recordings repeat.
  function shakeOffset() {
    if (!state.enabled || state.shakeT <= 0) return { x: 0, y: 0 };
    const k = state.shakeT / (state.shakeDur || 1);               // 1 -> 0
    const a = state.shakeAmp * k;
    return { x: Math.round(Math.sin(state.time * 91) * a), y: Math.round(Math.cos(state.time * 77) * a) };
  }

  function draw(ctx) {
    if (!state.enabled || !state.particles.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of state.particles) {
      const k = Math.max(0, Math.min(1, p.life / p.max));
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size * (0.5 + 0.5 * k)));
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.restore();
  }

  // Tell the audio bus to end any absorb/charge loop. Called when play stops (level complete, game over,
  // title), on a level change, on a checkpoint rewind and when the module is switched off. Without it the
  // charge hum started at the exit gate kept playing into the next level, because observe() only runs
  // while the game state is PLAYING and so never saw the player stop charging.
  function stopLoops() {
    const s = state.seen;
    if (!s) return;
    if (s.absorbOn) { s.absorbOn = false; emit('absorb', { active: false, rate: 0 }); }
    if (s.chargeOn) { s.chargeOn = false; emit('charge', { active: false, rate: 0 }); }
  }

  // Watches the game and fires the effects. Reads only; never writes to player or level.
  function observe(player, level, dt) {
    if (!player || !level) return;
    const feetX = player.x + player.w / 2, feetY = player.y + player.h;
    let s = state.seen;
    if (!s || s.level !== level) {
      stopLoops();                       // a new level must never inherit the last level's hum
      s = state.seen = { level, grounded: !!player.grounded, vy: player.vy || 0, hurt: player._hurtFlash || 0,
                         laddered: !!player._ladder, gates: new Map(), cps: new Map(), chests: new Map(),
                         drained: new Map(), streamT: 0, peakFall: 0, absorbOn: false, chargeOn: false, absorbRate: 0, chargeRate: 0 };
    }
    // landing / jumping
    if (!player.grounded) s.peakFall = Math.max(s.peakFall, player.vy || 0);
    if (player.grounded && !s.grounded) { landing(feetX, feetY, Math.max(s.vy, s.peakFall)); s.peakFall = 0; }
    if (!player.grounded && s.grounded && (player.vy || 0) < -150) jump(feetX, feetY);
    s.grounded = !!player.grounded;
    s.vy = player.vy || 0;
    // hurt
    const hurtNow = player._hurtFlash || 0;
    if (hurtNow > s.hurt + 0.05) hurt(feetX, player.y + player.h / 2);
    s.hurt = hurtNow;
    // absorb / charge loops for the audio bus: report changes only, never every frame
    const rate = 1 + (player.usableEnergy || 0) / 25;           // mirrors the charge-speed formula
    const absorbOn = !!(player.absorbing && player.absorbTarget), chargeOn = !!(player.discharging && player.dischargeTarget);
    if (absorbOn !== s.absorbOn || (absorbOn && Math.abs(rate - s.absorbRate) > 0.05)) { emit('absorb', { active: absorbOn, rate }); s.absorbOn = absorbOn; s.absorbRate = rate; }
    if (chargeOn !== s.chargeOn || (chargeOn && Math.abs(rate - s.chargeRate) > 0.05)) { emit('charge', { active: chargeOn, rate }); s.chargeOn = chargeOn; s.chargeRate = rate; }
    // absorb / charge streams (rate-aware: more bursts when the transfer is fast)
    s.streamT -= dt;
    if (s.streamT <= 0) {
      s.streamT = 0.04;
      const chest = { x: feetX, y: player.y + player.h * 0.45 };
      if (player.absorbing && player.absorbTarget) {
        const t = player.absorbTarget;
        stream({ x: t.cx ?? t.x, y: t.cy ?? t.y }, chest, 1 + (player.usableEnergy || 0) / 25, COLORS.spark);
      }
      if (player.discharging && player.dischargeTarget) {
        const t = player.dischargeTarget;
        stream(chest, { x: t.cx ?? t.x, y: t.cy ?? t.y }, 1 + (player.usableEnergy || 0) / 25, COLORS.power);
      }
    }
    // gates opening, checkpoints, chests, sources running dry: one burst per transition
    for (const g of level.gates || []) {
      const was = s.gates.get(g);
      if (was === false && g.open) gateBurst(g.x + g.w / 2, g.y + g.h / 2);
      s.gates.set(g, !!g.open);
    }
    for (const c of level.checkpoints || []) {
      const was = s.cps.get(c);
      if (was === false && c.activated) checkpointBurst(c.x, c.y - 10);
      s.cps.set(c, !!c.activated);
    }
    for (const c of level.chests || []) {
      const was = s.chests.get(c);
      if (was === false && c.opened) chestBurst(c.x + 16, c.y + 10);
      s.chests.set(c, !!c.opened);
    }
    for (const src of level.sources || []) {
      const was = s.drained.get(src);
      if (was === false && src.drained) dryPuff(src.cx ?? src.x, src.cy ?? src.y);
      s.drained.set(src, !!src.drained);
    }
  }

  return {
    // effects
    dust, landing, jump, sparks, stream, burst, gateBurst, checkpointBurst, chestBurst, dryPuff, hurt, shake, hitStop,
    // loop
    update, draw, observe, frozen, shakeOffset,
    // control
    on(fn) { state.listeners.push(fn); return () => { state.listeners = state.listeners.filter(f => f !== fn); }; },
    setEnabled(v) { state.enabled = !!v; if (!v) this.clear(); },
    setReducedMotion(v) { state.reducedMotion = !!v; if (v) { state.shakeT = 0; state.shakeAmp = 0; state.hitStopT = 0; } },
    stopLoops,
    clear() { stopLoops(); state.particles.length = 0; state.shakeT = 0; state.shakeAmp = 0; state.hitStopT = 0; state.seen = null; },
    // inspection (tests and the dev overlay)
    get particleCount() { return state.particles.length; },
    get enabled() { return state.enabled; },
    get reducedMotion() { return state.reducedMotion; },
    get shakeAmplitude() { return state.shakeT > 0 ? state.shakeAmp * state.shakeT / (state.shakeDur || 1) : 0; },
    get hitStopRemaining() { return state.hitStopT; },
  };
}
