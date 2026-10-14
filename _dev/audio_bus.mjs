// audio_bus.mjs - src_scroll/audio.js with a recording fake AudioContext, plus the juice -> audio wiring.
import { Player, Level, held, step, flat } from './support/headless.mjs';
import { createAudio } from '../src_scroll/audio.js';
import { createJuice } from '../src_scroll/juice.js';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

function fakeContext() {
  const log = { oscillators: [], sources: [], gains: [], filters: [], connects: 0 };
  const param = (v = 0) => ({ value: v, calls: [], setValueAtTime(x, t) { this.calls.push(['set', x, t]); this.value = x; }, linearRampToValueAtTime(x, t) { this.calls.push(['lin', x, t]); },
    exponentialRampToValueAtTime(x, t) { this.calls.push(['exp', x, t]); }, setTargetAtTime(x, t, k) { this.calls.push(['target', x, t, k]); this.last = x; }, cancelScheduledValues() {} });
  const node = extra => ({ connect() { log.connects++; }, ...extra });
  const ctx = {
    state: 'suspended', currentTime: 10, sampleRate: 8000, destination: node({}),
    resume() { this.state = 'running'; },
    createGain() { const n = node({ gain: param(1) }); log.gains.push(n); return n; },
    createOscillator() { const n = node({ type: 'sine', frequency: param(440), started: null, stopped: null, start(t) { this.started = t; }, stop(t) { this.stopped = t; } }); log.oscillators.push(n); return n; },
    createBiquadFilter() { const n = node({ type: 'lowpass', frequency: param(1000), Q: param(1) }); log.filters.push(n); return n; },
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; },
    createBufferSource() { const n = node({ buffer: null, start() {}, stop() {} }); log.sources.push(n); return n; },
  };
  return { ctx, log };
}

sec('LOCKED UNTIL A USER GESTURE');
{
  const { ctx, log } = fakeContext();
  const a = createAudio({ contextFactory: () => ctx });
  ok(a.play('jump') === false && log.oscillators.length === 0, 'before unlock() nothing plays and nothing is created');
  ok(a.unlock() === true && a.unlocked && ctx.state === 'running', 'unlock() creates the context and resumes it');
  ok(a.play('jump') === true && log.oscillators.length === 1, 'then a sound plays');
  ok(a.play('no-such-sound') === false, 'an unknown sound is ignored, not thrown');
}

sec('NO AUDIO IN THE ENVIRONMENT');
{
  const a = createAudio({ contextFactory: () => null });
  ok(a.unlock() === false && a.play('jump') === false, 'a missing AudioContext is a quiet no-op');
  a.setLoop('absorb', true, 1); a.handle('gate-open'); a.handle('absorb', { active: true, rate: 1 });
  ok(true, 'and no call throws');
}

sec('EVERY SOUND PLAYS, STAYS AUDIBLE AND ENDS');
{
  const { ctx, log } = fakeContext();
  const a = createAudio({ contextFactory: () => ctx }); a.unlock();
  for (const name of a.soundNames) {
    const before = log.oscillators.length + log.sources.length;
    a.play(name, { fallSpeed: 600 });
    ok(log.oscillators.length + log.sources.length > before, `${name} creates a voice`);
  }
  const all = [...log.oscillators, ...log.sources];
  ok(all.every(n => n.stopped === undefined || n.stopped === null || n.stopped > 10), 'every oscillator is scheduled to stop after it starts');
  ok(log.oscillators.every(o => o.started !== null && o.stopped !== null && o.stopped > o.started), 'start and stop times are ordered');
  const gainsBounded = log.gains.every(g => g.gain.calls.every(c => c[1] <= 0.25));
  ok(gainsBounded, 'no scheduled gain exceeds 0.25, so nothing clips on its own');
}

sec('LAND SCALES WITH THE FALL');
{
  const peak = speed => { const { ctx, log } = fakeContext(); const a = createAudio({ contextFactory: () => ctx }); a.unlock(); a.play('land', { fallSpeed: speed });
    return Math.max(...log.gains.flatMap(g => g.gain.calls.filter(c => c[0] === 'lin' || c[0] === 'set').map(c => c[1]))); };
  ok(peak(700) > peak(200), 'a long drop is louder than a hop', `${peak(700).toFixed(3)} vs ${peak(200).toFixed(3)}`);
}

sec('LOOPS: absorb and charge');
{
  const { ctx, log } = fakeContext();
  const a = createAudio({ contextFactory: () => ctx }); a.unlock();
  a.setLoop('absorb', true, 1);
  ok(a.activeLoops.join() === 'absorb' && log.oscillators.length === 2, 'absorb starts one voice (oscillator plus tremolo)');
  a.setLoop('absorb', true, 1); a.setLoop('absorb', true, 1.5);
  ok(log.oscillators.length === 2, 'repeating it does not stack voices');
  const voice = log.oscillators[0];
  const lowPitch = voice.frequency.calls.find(c => c[0] === 'set')[1];
  a.setLoop('absorb', true, 2);
  const retarget = voice.frequency.calls.filter(c => c[0] === 'target').pop()[1];
  ok(retarget > lowPitch, 'the pitch rises as the transfer rate rises (the speed-up is audible)', `${lowPitch.toFixed(0)} -> ${retarget.toFixed(0)} Hz`);
  a.setLoop('charge', true, 1);
  ok(a.activeLoops.length === 2, 'charge is its own voice');
  a.setLoop('absorb', false); a.setLoop('charge', false);
  ok(a.activeLoops.length === 0 && voice.stopped > 10, 'both stop, with a fade out', `stopped at ${voice.stopped}`);
  a.setLoop('absorb', false);
  ok(true, 'stopping an idle loop is harmless');
  a.setLoop('absorb', true, 1); a.setEnabled(false);
  ok(a.activeLoops.length === 0, 'switching audio off stops every loop');
  ok(a.play('jump') === false, 'and nothing plays while it is off');
}

sec('VOLUME');
{
  const { ctx } = fakeContext();
  const a = createAudio({ contextFactory: () => ctx, volume: 0.4 }); a.unlock();
  ok(a.volume === 0.4, 'volume starts as asked');
  a.setVolume(7); ok(a.volume === 1, 'volume clamps to 1');
  a.setVolume(-3); ok(a.volume === 0, 'and to 0');
}

sec('WIRED TO THE REAL GAME THROUGH juice.on()');
{
  held([]);
  const { ctx, log } = fakeContext();
  const audio = createAudio({ contextFactory: () => ctx }); audio.unlock();
  const j = createJuice({ rng: () => 0.5 });
  j.on(audio.handle);
  const level = flat(); const p = new Player(100, 100);
  for (let i = 0; i < 200; i++) { step(p, level); j.observe(p, level, 1 / 60); j.update(1 / 60); }
  ok(audio.soundsPlayed >= 1, 'a long fall makes the land sound', `${audio.soundsPlayed} played`);
  // absorb loop starts and stops on the player's flags
  p.absorbing = true; p.absorbTarget = { cx: 120, cy: 400 }; p.usableEnergy; j.observe(p, level, 1 / 60);
  ok(audio.activeLoops.includes('absorb'), 'absorbing starts the absorb loop');
  p.absorbing = false; p.absorbTarget = null; j.observe(p, level, 1 / 60);
  ok(!audio.activeLoops.includes('absorb'), 'and releasing E stops it');
  // gate opening
  const gate = { open: false, x: 300, y: 300, w: 32, h: 64 };
  const lv = { gates: [gate], checkpoints: [], chests: [], sources: [] };
  const j2 = createJuice({ rng: () => 0.5 }); const a2 = createAudio({ contextFactory: () => fakeContext().ctx }); a2.unlock(); j2.on(a2.handle);
  j2.observe(p, lv, 1 / 60); gate.open = true; j2.observe(p, lv, 1 / 60);
  ok(a2.soundsPlayed === 1, 'a gate opening plays exactly one sound');
  // the visuals-off switch must not silence audio
  const j3 = createJuice({ rng: () => 0.5, enabled: false }); const a3 = createAudio({ contextFactory: () => fakeContext().ctx }); a3.unlock(); j3.on(a3.handle);
  const gate3 = { open: false, x: 0, y: 0, w: 32, h: 64 }; const lv3 = { gates: [gate3], checkpoints: [], chests: [], sources: [] };
  j3.observe(p, lv3, 1 / 60); gate3.open = true; j3.observe(p, lv3, 1 / 60);
  ok(a3.soundsPlayed === 1 && j3.particleCount === 0, '?juice=off removes the visuals but keeps the sound');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
