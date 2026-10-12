import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = readFileSync('assets/audio/level1_neon_rise.wav');
assert.equal(data.toString('ascii', 0, 4), 'RIFF');
assert.equal(data.toString('ascii', 8, 12), 'WAVE');
const sampleRate = data.readUInt32LE(24);
const samples = (data.length - 44) / 2;
assert.equal(sampleRate, 32000);
assert.ok(samples / sampleRate > 36 && samples / sampleRate < 38);
assert.ok(Math.abs(data.readInt16LE(44) - data.readInt16LE(data.length - 2)) <= 1,
  'loop boundary has no sample jump');

class FakeAudio {
  constructor(path) { this.path = path; this.currentTime = 0; this.plays = 0; this.pauses = 0; }
  play() { this.plays++; return Promise.resolve(); }
  pause() { this.pauses++; }
}
globalThis.Audio = FakeAudio;
const { LevelMusic } = await import('../src_scroll/music.js');
const music = new LevelMusic();
assert.equal(music.audio.path, 'assets/audio/level1_neon_rise.wav');
music.setActive(true);
assert.equal(music.audio.plays, 0, 'no autoplay before gesture');
music.unlock();
assert.equal(music.audio.plays, 1);
music.toggleMuted();
assert.equal(music.audio.pauses, 1);
music.toggleMuted();
assert.equal(music.audio.plays, 2);
music.audio.currentTime = 12;
music.setActive(false);
assert.equal(music.audio.currentTime, 0, 'level exit restarts loop next time');
assert.equal(music.audio.pauses, 2);
console.log('Level 1 music format, seam, gesture, mute, and stop: passed');
