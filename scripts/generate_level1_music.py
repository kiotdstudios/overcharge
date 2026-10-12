"""Render the original, seamless Level 1 cinematic-trap instrumental.

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


def brass(note, duration):
    """Dark synthetic brass swell with orchestral-style attack."""
    t = np.arange(round((duration + .23) * RATE)) / RATE
    f = hz(note)
    phase = 2 * np.pi * f * t
    tone = sum(np.sin(phase * harmonic) / harmonic for harmonic in range(1, 7))
    tone += .18 * np.sin(phase * .5)
    env = (1 - np.exp(-t * 35)) * np.minimum(1, (duration + .23 - t) / .22)
    return np.tanh(tone * .68) * env


def strings(note, duration):
    """Short detuned string pulse, kept beneath the drums."""
    t = np.arange(round((duration + .08) * RATE)) / RATE
    f = hz(note)
    phase = 2 * np.pi * f * t
    tone = np.sin(phase) + .32 * np.sin(phase * 2.006) + .15 * np.sin(phase * 3.992)
    env = (1 - np.exp(-t * 80)) * np.exp(-t * 7)
    env *= np.clip((duration + .08 - t) / .08, 0, 1)
    return tone * env


def impact():
    t = np.arange(round(.8 * RATE)) / RATE
    phase = 2 * np.pi * (42 * t + 95 * (1 - np.exp(-t * 18)) / 18)
    noise = rng.normal(0, 1, len(t))
    return np.sin(phase) * np.exp(-t * 6) + noise * np.exp(-t * 35) * .14


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


# Four-chord minor-key cycle. Original three-note calls leave room for SFX.
roots = [41, 37, 44, 39]  # F2, Db2, Ab2, Eb2
chords = [(53, 56, 60), (49, 53, 56), (56, 60, 63), (51, 55, 58)]
calls = [(0, 72), (1.5, 68), (3, 65)]

for bar in range(BARS):
    start = bar * 4 * BEAT
    root = roots[bar % 4]
    breakdown = bar in (0, 1, 8, 9)
    for note in chords[bar % 4]:
        put(start, pad(note, 4 * BEAT), .23 if breakdown else .43)
    if bar % 4 == 0:
        put(start, impact(), .35 if breakdown else .55)
    # Brass answers the 8-bit signal rather than copying any film cue.
    if bar % 2 == 0:
        for note in (root + 12, root + 19):
            put(start + .06 * BEAT, brass(note, 1.45 * BEAT), .09 if breakdown else .16)
        put(start + 2.7 * BEAT, brass(root + 15, .85 * BEAT), .08 if breakdown else .13)
    else:
        put(start + 1.8 * BEAT, brass(root + 12, 1.1 * BEAT), .08 if breakdown else .13)
    if not breakdown:
        for slot in (.75, 1.75, 2.75, 3.75):
            put(start + slot * BEAT, strings(root + 24, .35 * BEAT), .13)
    bass_pattern = [(0, 0, 1.35)] if breakdown else [(0, 0, 1.35), (1.75, 0, .45), (3.25, 7, .5)]
    for slot, shift, dur in bass_pattern:
        put(start + slot * BEAT, bass(root + shift, dur * BEAT), .42 if breakdown else .64)
    # Trap is in the half-time weight and syncopation; hats stay restrained.
    kicks = (0,) if breakdown else (0, 1.75, 3.25 if bar % 4 else 3.5)
    for slot in kicks:
        put(start + slot * BEAT, kick(), .8)
    if not (breakdown and bar % 2 == 0):
        put(start + 2 * BEAT, snare(), .56)
        put(start + 2 * BEAT + .025, snare(), .1)
    if not breakdown:
        for slot in (.5, 1.5, 2.5, 3.5):
            put(start + slot * BEAT, hat(slot == 3.5 and bar % 4 == 3), .035)
    for i, (slot, note) in enumerate(calls):
        if breakdown and i == 2:
            continue
        pitch = note + (roots[bar % 4] - roots[0])
        put(start + slot * BEAT, lead(pitch, .5 * BEAT), .053)

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
