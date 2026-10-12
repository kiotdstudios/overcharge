"""Render the original, seamless Level 1 arcade/hip-hop instrumental.

No samples or third-party recordings are used. Run with Python + NumPy.
"""
from pathlib import Path
import wave
import numpy as np

RATE = 32000
BPM = 140
BEAT = 60 / BPM
BARS = 16
LENGTH = BARS * 4 * BEAT
COUNT = round(LENGTH * RATE)
mix = np.zeros(COUNT, dtype=np.float64)
rng = np.random.default_rng(41991)


def put(start, sound, gain=1):
    """Wrap release tails around the loop boundary for a clean seam."""
    pos = round(start * RATE) % COUNT
    sound = np.asarray(sound) * gain
    first = min(len(sound), COUNT - pos)
    mix[pos:pos + first] += sound[:first]
    if first < len(sound):
        mix[:len(sound) - first] += sound[first:]


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def bass(note, duration):
    t = np.arange(round((duration + .09) * RATE)) / RATE
    f = hz(note)
    phase = 2 * np.pi * (f * t + 3.8 * (1 - np.exp(-t * 32)) / 32)
    core = np.sin(phase) + .22 * np.sin(2 * phase)
    env = (1 - np.exp(-t * 100)) * np.exp(-t * 2.1)
    env *= np.clip((duration + .09 - t) / .09, 0, 1)
    return np.tanh(core * 1.35) * env


def lead(note, duration, accent=1):
    t = np.arange(round((duration + .12) * RATE)) / RATE
    f = hz(note)
    vibrato = .0025 * np.sin(2 * np.pi * 5.2 * t)
    phase = (f * t + vibrato) % 1
    pulse = np.where(phase < .28, 1., -1.)
    triangle = 4 * np.abs(phase - .5) - 1
    tone = .57 * pulse + .43 * triangle
    # Short chip arpeggio body, softened to leave space for drums/hero SFX.
    env = (1 - np.exp(-t * 90)) * np.exp(-t * 7.5)
    env *= np.clip((duration + .12 - t) / .10, 0, 1)
    return tone * env * accent


def pad(note, duration):
    t = np.arange(round(duration * RATE)) / RATE
    f = hz(note)
    tone = np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * f * 2.003 * t)
    env = np.minimum(1, t / .05) * np.minimum(1, (duration - t) / .11)
    return tone * env * .12


def kick():
    t = np.arange(round(.43 * RATE)) / RATE
    phase = 2 * np.pi * (48 * t + 115 * (1 - np.exp(-t * 34)) / 34)
    return np.sin(phase) * np.exp(-t * 10) + rng.normal(0, 1, len(t)) * np.exp(-t * 110) * .13


def snare():
    t = np.arange(round(.24 * RATE)) / RATE
    noise = rng.normal(0, 1, len(t))
    # Differentiate once to emphasize the papery upper register.
    bright = noise - np.roll(noise, 1) * .78
    clap = (noise - np.roll(noise, 61) + np.roll(noise, 137) * .5) * .27
    return (bright * .44 + clap + np.sin(2 * np.pi * 184 * t) * .23) * np.exp(-t * 22)


def hat(open_hat=False):
    length = .20 if open_hat else .065
    t = np.arange(round(length * RATE)) / RATE
    noise = rng.normal(0, 1, len(t))
    bright = noise - np.roll(noise, 1) * .93
    return bright * np.exp(-t * (24 if open_hat else 70))


# Four-chord minor-key cycle. The two 8-bar phrases vary in melody and drums.
roots = [41, 37, 44, 39]  # F2, Db2, Ab2, Eb2
chords = [(53, 56, 60), (49, 53, 56), (56, 60, 63), (51, 55, 58)]
melodies = [
    [(0, 72), (.75, 68), (1.5, 65), (2.25, 68), (3.5, 72)],
    [(0, 73), (1, 72), (1.75, 68), (2.75, 65), (3.25, 68)],
    [(0, 75), (.75, 72), (1.5, 68), (2.5, 72), (3.5, 75)],
    [(0, 70), (.75, 67), (1.5, 63), (2.25, 67), (3.25, 70)],
]

for bar in range(BARS):
    start = bar * 4 * BEAT
    root = roots[bar % 4]
    for note in chords[bar % 4]:
        put(start, pad(note, 4 * BEAT), .27)
    # Half-time trap pulse at 140 BPM: sliding 808, hard beat-three clap,
    # double-time hats, and little 32nd-note rolls at phrase turns.
    for slot, shift, dur in [(0, 0, 1.1), (1.5, 0, .42), (2.75, 7, .55), (3.5, 0, .38)]:
        put(start + slot * BEAT, bass(root + shift, dur * BEAT), .61)
    for step in range(16):
        swing = .025 * BEAT if step % 2 else 0
        put(start + step * BEAT / 4 + swing, hat(), .087 if step % 4 == 0 else .052)
    if bar % 4 in (1, 3):
        for roll in range(8):
            put(start + (3 + roll / 8) * BEAT, hat(), .055 + .007 * roll)
    for beat in (0, 1.5, 2.75, 3.5 if bar % 4 == 3 else 3.25):
        put(start + beat * BEAT, kick(), .79)
    put(start + 2 * BEAT, snare(), .56)
    put(start + 2 * BEAT + .024, snare(), .12)  # clap width
    if bar % 4 == 3:
        put(start + 3.75 * BEAT, snare(), .19)
    for slot in (.5, 2.5):
        put(start + slot * BEAT, hat(True), .11)
    for i, (slot, note) in enumerate(melodies[bar % 4]):
        if bar % 8 in (3, 7) and i == 3:
            continue  # phrase break
        octave = 12 if bar >= 8 and i == 4 else 0
        put(start + slot * BEAT, lead(note + octave, .48 * BEAT, .9 if i else 1), .095)
    if bar % 4 == 3:
        for n, slot in zip((67, 70, 72, 75), (3, 3.25, 3.5, 3.75)):
            put(start + slot * BEAT, lead(n, .2 * BEAT), .065)

# Gentle bus saturation keeps retro edges while controlling simultaneous hits.
mix = np.tanh(mix * 1.55)
mix *= .88 / max(1, np.max(np.abs(mix)))
# Match the final sample to the first over 12 ms; the drum tail then wraps
# without a click even though the kick starts exactly on the next downbeat.
seam = round(.012 * RATE)
fade = np.linspace(0, 1, seam) ** 2
mix[-seam:] = mix[-seam:] * (1 - fade) + mix[0] * fade
pcm = np.asarray(np.clip(mix * 32767, -32768, 32767), dtype='<i2')
out = Path(__file__).resolve().parents[1] / 'assets' / 'audio' / 'level1_neon_rise.wav'
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(RATE)
    wav.writeframes(pcm.tobytes())
print(f'{out} ({LENGTH:.2f}s, {out.stat().st_size:,} bytes)')
