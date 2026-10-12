"""Voiceover for the GAIN 2026 film: the captions, spoken, placed on the film's timeline.
Guide track made with macOS `say` (voice below). To use a recorded or better synthetic voice,
put one file per line in vo/ as line_NN.wav (same order as SCRIPT) and run with --recorded.
Writes vo.wav (mono 48 kHz, 58 s).
"""
import os, subprocess, sys
import numpy as np

SR = 48000; DUR = 58.0
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE, RATE = 'Samantha', 172
# (start s, text, rate override)
SCRIPT = [
    (0.6, 'Collecting data is hard work.', None),
    (4.7, 'Running a survey. A census. An administrative database.', None),
    (8.65, 'It is even harder when the people you need to count are refugees, internally displaced, or stateless.', 205),
    (14.1, 'GAIN is how that work gets seen.', None),
    (17.9, 'When you report it, your work joins the global picture.', None),
    (22.7, 'It shows where we are, country by country, in implementing the recommendations.', None),
    (28.8, 'It shapes the findings we share with the whole community.', None),
    (34.5, 'It shows where methods need work, so the recommendations become easier to apply.', None),
    (40.6, 'And it brings your evidence to the rooms where global policy is made.', None),
    (46.0, 'Every example you report adds to it.', None),
    (52.4, 'You do the hard work.', 160),
    (53.6, 'GAIN makes sure it counts.', 160),
    (55.7, 'Respond by the twenty-second of November.', 175),
]

def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

os.makedirs(os.path.join(HERE, 'vo'), exist_ok=True)
out = np.zeros(int(SR * DUR))
recorded = '--recorded' in sys.argv
for i, (t0, text, rate) in enumerate(SCRIPT):
    f = os.path.join(HERE, 'vo', f'line_{i:02d}.wav' if recorded else f'say_{i:02d}.aiff')
    if not recorded:
        # "GAIN" is an acronym said as a word; keep the voice from spelling it out
        spoken = text.replace('GAIN', 'gain')
        subprocess.run(['say', '-v', VOICE, '-r', str(rate or RATE), '-o', f, spoken], check=True)
    x = decode(f)
    # trim leading silence so the line lands on its cue
    nz = np.flatnonzero(np.abs(x) > 0.01); x = x[nz[0]:] if len(nz) else x
    i0 = int(t0 * SR); n = min(len(x), len(out) - i0)
    out[i0:i0 + n] += x[:n]
    nz2 = np.flatnonzero(np.abs(x) > 0.01); print(f'{i:2d} {t0:5.2f}-{t0 + (nz2[-1] if len(nz2) else 0) / SR:5.2f}  {text}')
# gentle presence: high-pass rumble, soft compression via tanh, normalise
out = out - np.convolve(out, np.ones(240) / 240, 'same')
out = np.tanh(out / (np.abs(out).max() + 1e-9) * 1.6) / np.tanh(1.6) * 0.9
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', os.path.join(HERE, 'vo.wav')], input=out.tobytes(), check=True)
