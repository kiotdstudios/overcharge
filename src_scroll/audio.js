// audio.js - the audio bus: one AudioContext, a master gain, an effects bus and procedural sounds.
//
// v1 (GDD section 9) asked for "tactile sound design: hums, crackles, capacitor whines, power-down
// thumps, relay clicks, and escalating audio feedback as the player approaches maximum charge."
// Until now the only sound was a footstep (footsteps.js, which keeps its own context).
//
// Everything is synthesised, so there are no audio files to ship, and nothing here touches
// gameplay: it listens to juice.js events (createJuice().on(audio.handle)).
//
// The context is injected so tests can run without a browser. Browsers refuse to start audio before
// a user gesture, so unlock() is called from the first key press; until then every call is a no-op.

export function createAudio(opts = {}) {
  const makeContext = opts.contextFactory || (() => {
    const C = globalThis.AudioContext || globalThis.webkitAudioContext;
    return C ? new C() : null;
  });
  const state = { ctx: null, master: null, sfx: null, noise: null, enabled: opts.enabled !== false,
                  volume: opts.volume ?? 0.55, loops: new Map(), played: 0 };

  function unlock() {
    if (!state.enabled) return false;
    if (!state.ctx) {
      const ctx = makeContext();
      if (!ctx) return false;
      state.ctx = ctx;
      state.master = ctx.createGain();
      state.master.gain.value = state.volume;
      state.master.connect(ctx.destination);
      state.sfx = ctx.createGain();
      state.sfx.gain.value = 1;
      state.sfx.connect(state.master);
      // one second of white noise, reused by every noise-based sound
      const len = ctx.sampleRate || 44100;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate || 44100);
      const data = buf.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647) * 2 - 1; }
      state.noise = buf;
    }
    if (state.ctx.state === 'suspended') state.ctx.resume?.();
    return true;
  }

  const ready = () => state.enabled && state.ctx && state.ctx.state !== 'closed';
  const now = () => state.ctx.currentTime;

  // ---- building blocks ----------------------------------------------------------------
  // A tone that sweeps f0 -> f1 over dur, with a fast attack and an exponential release.
  function tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.1, at = 0, attack = 0.005, dest }) {
    const ctx = state.ctx, t = now() + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || state.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // Filtered noise: crackle, thud body, sparkle.
  function noise({ filter = 'lowpass', f0 = 800, f1 = f0, dur = 0.1, vol = 0.1, at = 0, q = 1, dest }) {
    const ctx = state.ctx, t = now() + at;
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = state.noise;
    fl.type = filter; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || state.sfx);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // ---- the sounds (name -> recipe). Volumes are deliberately low; the master scales them. ----
  const SOUNDS = {
    jump: () => tone({ type: 'sine', f0: 300, f1: 520, dur: 0.09, vol: 0.06 }),
    land: ({ fallSpeed = 300 } = {}) => {
      const k = Math.min(1, Math.max(0.15, (fallSpeed - 120) / 600));        // soft hop .. heavy drop
      tone({ type: 'sine', f0: 110, f1: 45, dur: 0.16, vol: 0.18 * k });
      noise({ filter: 'lowpass', f0: 900, f1: 150, dur: 0.12, vol: 0.12 * k });
    },
    'gate-open': () => {
      tone({ type: 'sine', f0: 160, f1: 760, dur: 0.55, vol: 0.12 });
      tone({ type: 'triangle', f0: 80, f1: 50, dur: 0.35, vol: 0.2 });
      noise({ filter: 'highpass', f0: 2500, f1: 6000, dur: 0.4, vol: 0.05, at: 0.08 });
      tone({ type: 'sine', f0: 880, f1: 1320, dur: 0.3, vol: 0.05, at: 0.3 });
    },
    checkpoint: () => { tone({ type: 'triangle', f0: 660, dur: 0.12, vol: 0.08 }); tone({ type: 'triangle', f0: 880, dur: 0.2, vol: 0.08, at: 0.09 }); },
    'chest-open': () => [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.07, at: i * 0.07 })),
    // the power-down thump: a drained lamp
    'source-dry': () => { tone({ type: 'sine', f0: 240, f1: 55, dur: 0.38, vol: 0.14 }); noise({ filter: 'bandpass', f0: 1800, f1: 300, dur: 0.25, vol: 0.06, q: 4 }); },
    hurt: () => { tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.22, vol: 0.12 }); noise({ filter: 'bandpass', f0: 2200, f1: 500, dur: 0.18, vol: 0.1, q: 2 }); },
    'relay-click': () => noise({ filter: 'highpass', f0: 3000, dur: 0.025, vol: 0.08 }),
  };

  function play(name, data) {
    if (!ready() || !SOUNDS[name]) return false;
    SOUNDS[name](data || {});
    state.played++;
    return true;
  }

  // ---- loops: one voice per name; pitch follows the rate so the speed-up is audible ----------
  // absorb: a rising, crackling hum (the lamp giving). charge: a lower, steadier tone (the hero giving).
  const LOOPS = {
    absorb: { type: 'sawtooth', base: 92, lfo: 13, vol: 0.05, cutoff: 700 },
    charge: { type: 'triangle', base: 150, lfo: 8, vol: 0.06, cutoff: 1100 },
  };
  function setLoop(name, active, rate = 1) {
    const spec = LOOPS[name];
    if (!ready() || !spec) return;
    let voice = state.loops.get(name);
    const t = now();
    const pitch = spec.base * (0.8 + 0.45 * Math.min(2, rate));           // rate 1 -> x1.25, rate 2 -> x1.7
    if (active) {
      if (!voice) {
        const o = state.ctx.createOscillator(), lfo = state.ctx.createOscillator(), lg = state.ctx.createGain(),
              g = state.ctx.createGain(), fl = state.ctx.createBiquadFilter();
        o.type = spec.type; fl.type = 'lowpass'; fl.frequency.value = spec.cutoff;
        lfo.frequency.value = spec.lfo; lg.gain.value = spec.vol * 0.6;
        lfo.connect(lg); lg.connect(g.gain);                                  // tremolo: the crackle
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(spec.vol, t + 0.06);
        o.connect(fl); fl.connect(g); g.connect(state.sfx);
        o.frequency.setValueAtTime(pitch, t);
        o.start(t); lfo.start(t);
        voice = { o, lfo, g };
        state.loops.set(name, voice);
      }
      voice.o.frequency.setTargetAtTime(pitch, t, 0.05);
    } else if (voice) {
      voice.g.gain.cancelScheduledValues?.(t);
      voice.g.gain.setTargetAtTime(0.0001, t, 0.05);
      voice.o.stop(t + 0.3); voice.lfo.stop(t + 0.3);
      state.loops.delete(name);
    }
  }

  // Wire this to juice.on(): it translates feedback events into sounds.
  function handle(name, data = {}) {
    if (name === 'absorb') return setLoop('absorb', !!data.active, data.rate);
    if (name === 'charge') return setLoop('charge', !!data.active, data.rate);
    return play(name, data);
  }

  return {
    unlock, play, setLoop, handle,
    // Stop the loops BEFORE flipping the flag: setLoop() refuses to act once audio is disabled.
    setEnabled(v) { if (!v) for (const n of [...state.loops.keys()]) setLoop(n, false); state.enabled = !!v; },
    setVolume(v) { state.volume = Math.max(0, Math.min(1, v)); if (state.master) state.master.gain.value = state.volume; },
    get unlocked() { return !!state.ctx; },
    get activeLoops() { return [...state.loops.keys()]; },
    get soundsPlayed() { return state.played; },
    get volume() { return state.volume; },
    get enabled() { return state.enabled; },
    soundNames: Object.keys(SOUNDS),
  };
}
