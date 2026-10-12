"""Original score + sound design for the GAIN 2026 film (58 s), written to the film's timeline.
D major, 100 BPM, downbeats every 2.4 s from 0.8 s. Writes mix.wav (stereo 48 kHz) and src/env.json
(music loudness per video frame, for the subtle audio-reactive glow).
SFX: Kenney.nl (CC0) and unicae_games keyboard pack (CC0), from the brag skill's library.
"""
import json, math, os, subprocess, sys
import numpy as np

SR = 48000
DUR = 58.0
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.expanduser('~/.claude/skills/brag/assets/sfx')
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)          # dry music
RL = np.zeros(N); RR = np.zeros(N)        # reverb send
FX_L = np.zeros(N); FX_R = np.zeros(N)    # sfx bus (lighter reverb)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def add(sig, t0, gain=1.0, pan=0.0, send=0.3, bus='music'):
    i0 = int(t0 * SR)
    if i0 >= N: return
    sig = sig[:N - i0]
    gl, gr = gain * math.cos((pan + 1) * math.pi / 4) * 1.414, gain * math.sin((pan + 1) * math.pi / 4) * 1.414
    if bus == 'music':
        L[i0:i0 + len(sig)] += sig * gl; R[i0:i0 + len(sig)] += sig * gr
    else:
        FX_L[i0:i0 + len(sig)] += sig * gl; FX_R[i0:i0 + len(sig)] += sig * gr
    RL[i0:i0 + len(sig)] += sig * gl * send; RR[i0:i0 + len(sig)] += sig * gr * send

def tt(d): return np.arange(int(d * SR)) / SR

# ---------- instruments ----------
def piano(m, dur, vel=1.0):
    f = mtof(m); t = tt(dur + 2.5)
    s = np.zeros_like(t)
    for n in range(1, 9):
        detune = 1 + (n * n) * 0.00025                  # slight stiffness
        a = (1 / n ** 1.7) * np.exp(-t * (0.9 + n * 0.85))
        s += a * np.sin(2 * np.pi * f * n * detune * t + n)
    att = np.minimum(1, t / 0.004)
    rel = np.where(t > dur, np.exp(-(t - dur) * 5), 1)
    hammer = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.02   # felt
    return (s * att * rel + hammer) * vel * 0.32

def pad(ms, dur, vel=1.0, bright=6):
    t = tt(dur + 2.0); s = np.zeros_like(t)
    for m in ms:
        f = mtof(m)
        for cents in (-6, 0, 7):
            fd = f * 2 ** (cents / 1200)
            for n in range(1, bright + 1):
                s += (1 / n ** 1.5) * np.sin(2 * np.pi * fd * n * t + rng.uniform(0, 6.28))
    env = np.minimum(1, t / 0.7) * np.where(t > dur, np.exp(-(t - dur) * 1.4), 1)
    lfo = 1 + 0.08 * np.sin(2 * np.pi * 0.18 * t)
    return s * env * lfo * vel * 0.018

def pluck(m, vel=1.0, decay=5.5):
    f = mtof(m); t = tt(1.6)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * decay) + 0.22 * np.sin(2 * np.pi * f * 4.95 * t) * np.exp(-t * decay * 3) + 0.12 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * decay * 1.6)
    return s * np.minimum(1, t / 0.002) * vel * 0.22

def bell(m, vel=1.0):
    f = mtof(m); t = tt(3.0); s = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1, 1.4), (2.0, .35, 2.2), (2.76, .3, 2.8), (5.4, .12, 5)):
        s += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec)
    return s * np.minimum(1, t / 0.003) * vel * 0.2

def bass(m, dur, vel=1.0):
    f = mtof(m); t = tt(dur + .4)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / 0.03) * (0.65 + 0.35 * np.exp(-t * 3)) * np.where(t > dur, np.exp(-(t - dur) * 12), 1)
    return s * env * vel * 0.11

def kick(vel=1.0):
    t = tt(0.4); f = 48 + 70 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 11) * vel * 0.3

def shaker(vel=1.0):
    t = tt(0.09); n = rng.standard_normal(len(t)); n = np.diff(np.diff(n, prepend=0), prepend=0)
    return n * np.exp(-t * 45) * np.minimum(1, t / 0.006) * vel * 0.024

def swish(dur=0.45, vel=1.0):
    t = tt(dur); n = rng.standard_normal(len(t))
    k = np.ones(12) / 12; n = n - np.convolve(n, k, 'same')       # high-ish band
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return n * env * vel * 0.05

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

# ---------- harmony ----------
CH = {  # bass root, voicing
    'D': (38, [62, 66, 69]), 'A': (45, [61, 64, 69]), 'Bm': (47, [62, 66, 71]), 'G': (43, [62, 67, 71]),
}
BAR = 2.4; BEAT = 0.6; T0 = 0.8
def bar_t(k): return T0 + k * BAR
#        bar:  0     1    2    3    4     5    6    7     8    9    10   11    12   13   14   15   16   17   18    19   20   21    22   23
PROG = ['Bm', 'G', 'D', 'A', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'G', 'D', 'A', 'G', 'A', 'D']
SCALE = [62, 64, 66, 69, 71]  # D pentatonic

# intro pad before the first downbeat
add(pad(CH['Bm'][1], 0.9, .7), 0.0, pan=0, send=.5)
for k, c in enumerate(PROG):
    t0 = bar_t(k); root, voi = CH[c]
    last = k == len(PROG) - 1
    dur = (DUR - t0 - 0.3) if last else BAR
    # pad: softer in part 1, swells at the map (bars 18-20), warm at the close
    pv = .55 if t0 < 12.8 else .75 if t0 < 44 else 1.0 if t0 < 51.2 else .8
    ps = max(0, t0 - .35)
    add(pad(voi, dur + .35, pv, bright=5 if t0 < 44 else 7), ps, pan=-.1, send=.55)
    add(pad([voi[0] + 12], dur + .35, pv * .5, bright=3), ps, pan=.25, send=.6)
    # bass from 15.2 to the close
    if 15.2 <= t0 < 56:
        for b in range(0, 4, 2):
            add(bass(root, BEAT * 1.8, .9), t0 + b * BEAT, send=.05)
    if last: add(bass(root, 1.8, .8), t0, send=.1)

# ---------- melody (felt piano) ----------
mel = [  # (bar, beat, midi, beats)
    (0, 0, 78, 2), (0, 2, 74, 2), (1, 0, 71, 2), (1, 2, 74, 2), (2, 0, 69, 1.5), (2, 1.5, 74, .5), (2, 2, 78, 2),
    (3, 0, 76, 3), (3, 3, 73, 1), (4, 0, 74, 2), (4, 2, 71, 2),
    # part 2, sparser: phrase answering the email
    (5, 0, 78, 1), (5, 1, 81, 1), (5, 2, 78, 2), (6, 0, 76, 3), (7, 0, 74, 1), (7, 1, 78, 1), (7, 2, 83, 2), (8, 0, 79, 2), (8, 2, 76, 2),
    # close: G - A - D
    (21, 0, 71, 1), (21, 1, 74, 1), (21, 2, 79, 2), (22, 0, 73, 1), (22, 1, 76, 1), (22, 2, 81, 2), (23, 0, 78, 4), (23, 0, 74, 4),
]
for b, bt, m, nb in mel:
    add(piano(m, nb * BEAT, .85 if b < 21 else 1.0), bar_t(b) + bt * BEAT, pan=.1, send=.4)
# left-hand piano chords at the start of each part-1 bar and the close
for k in list(range(0, 5)) + [21, 22, 23]:
    root, voi = CH[PROG[k]]
    for i, m in enumerate([root + 12] + voi[:2]):
        add(piano(m, BAR * .9, .35), bar_t(k) + i * .03, pan=-.2, send=.4)

# ---------- pulse: plucked arpeggio from 12.8, fuller on the trail ----------
for k, c in enumerate(PROG):
    t0 = bar_t(k); root, voi = CH[c]
    if t0 < 12.8 or t0 >= 51.2: continue
    arp = [voi[0], voi[1], voi[2], voi[1] + 12, voi[2], voi[1], voi[0] + 12, voi[2]]
    steps = 8 if t0 >= 22.4 else 4
    for i in range(steps):
        st = t0 + i * (BAR / steps)
        v = (.5 if t0 < 22.4 else .7 if t0 < 44 else .85) * (1 if i % 2 == 0 else .7)
        add(pluck(arp[i % 8] + (12 if t0 >= 44 else 0), v), st, pan=(-.35 if i % 2 else .35), send=.35)

# ---------- percussion: soft kick + shaker on the trail ----------
for k in range(len(PROG)):
    t0 = bar_t(k)
    if 17.6 <= t0 < 51.2:
        for b in range(4):
            if b in (0, 2): add(kick(.55 if t0 < 22.4 else .75), t0 + b * BEAT, send=.03)
            if t0 >= 22.4: add(shaker(1.0), t0 + b * BEAT + BEAT / 2, pan=.4, send=.15)
# a soft swell into the map and into the close
for ts, d in ((43.0, 1.4), (50.0, 1.2)):
    t = tt(d); n = rng.standard_normal(len(t)); n = n - np.convolve(n, np.ones(30) / 30, 'same')
    add(n * (t / d) ** 2 * .04, ts, send=.6)

# ---------- story accents ----------
add(bell(86, .9), 17.6, pan=.1, send=.6)                       # the dot pops out of the laptop
for i, ta in enumerate((22.4, 28.4, 34.4, 40.4)):               # dot arrives at each scene
    add(bell([81, 83, 86, 88][i], .6), ta, pan=.2, send=.6)
for tl, m in zip((47.0, 48.2, 49.4), (86, 88, 90)):            # map labels light up
    add(bell(m, .55), tl, pan=-.2, send=.6)
# map dots landing: tiny pentatonic plucks (same pseudo-random schedule as film.js)
def jrnd(i):
    x = math.sin(i * 127.1 + 311.7) * 43758.5453
    return x - math.floor(x)
for i in range(150):
    if i % 3: continue
    land = 46.0 + jrnd(i + 2) * 3.6 + 1.3 + jrnd(i + 4) * .8
    add(pluck(SCALE[i % 5] + 12 * (1 + (i // 5) % 2), .32, decay=9), land, pan=(jrnd(i + 9) - .5), send=.5)
for tf in (29.6, 30.8, 32.0):                                    # page turns
    add(swish(.5, 1.0), tf, pan=.3, send=.2, bus='fx')

# rain (0 - 4.6): soft filtered noise + droplets
t = tt(4.9); n = rng.standard_normal(len(t))
lp = np.convolve(n, np.ones(6) / 6, 'same'); rain = (n - np.convolve(n, np.ones(40) / 40, 'same')) * .5 + lp * .3
rain *= np.minimum(1, t / .4) * np.clip((4.9 - t) / 0.7, 0, 1) * .05
add(rain, 0.0, send=.1, bus='fx')
for i in range(70):
    d = tt(.05); add(np.sin(2 * np.pi * rng.uniform(2500, 5000) * d) * np.exp(-d * 120) * .03, rng.uniform(0.1, 4.4), pan=rng.uniform(-.8, .8), send=.2, bus='fx')

# Kenney CC0 sfx: knocks, clicks; keyboard taps
knocks = [load(f'{SFX}/impact/impactWood_light_00{i}.ogg') for i in range(3)]
for i, tk in enumerate((4.9, 5.35, 5.8)): add(knocks[i], tk, gain=.55, pan=-.15, send=.2, bus='fx')
click = load(f'{SFX}/interface/click_003.ogg')
for tc in (15.2, 17.0): add(click, tc, gain=.5, send=.1, bus='fx')
keys = [load(f'{SFX}/keyboard/keypress-{i:03d}.wav') for i in range(1, 33)]
def typing(a, b, rate, gain):
    tcur = a
    while tcur < b:
        add(keys[int(rng.integers(0, 32))], tcur, gain=gain * rng.uniform(.6, 1), pan=.1, send=.1, bus='fx')
        tcur += rate * rng.uniform(.6, 1.4)
typing(6.4, 8.4, .2, .16); typing(12.9, 14.3, .15, .2); typing(51.2, 51.8, .15, .14)

# ---------- reverb + master ----------
def reverb(x, seed):
    r = np.random.default_rng(seed); n = int(2.4 * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t / 0.62); ir = np.convolve(ir, np.ones(8) / 8, 'same'); ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
    return y
wl, wr = reverb(RL, 1), reverb(RR, 2)
ml = L + FX_L + wl * .5; mr = R + FX_R + wr * .5
# gentle fade in/out
fade = np.ones(N); tt_all = np.arange(N) / SR
fade *= np.minimum(1, tt_all / .5); fade *= np.clip((DUR - tt_all) / 1.6, 0, 1) ** 1.5
ml *= fade; mr *= fade
peak = max(np.abs(ml).max(), np.abs(mr).max()); ml /= peak / .89; mr /= peak / .89
ml = np.tanh(ml * 1.1) / np.tanh(1.1); mr = np.tanh(mr * 1.1) / np.tanh(1.1)
st = np.stack([ml, mr], 1).astype(np.float32)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', os.path.join(HERE, 'mix_raw.wav')], input=st.tobytes(), check=True)

# loudness envelope of the music bed (no sfx) for the visuals
mus = (L + R + (wl + wr) * .5) * fade
fr = SR // 30; nf = int(DUR * 30)
rms = np.array([np.sqrt(np.mean(mus[i * fr:(i + 1) * fr] ** 2)) for i in range(nf)])
rms = np.convolve(rms, np.ones(5) / 5, 'same'); rms = (rms / rms.max()) ** 1.3
json.dump([round(float(v), 3) for v in rms], open(os.path.join(HERE, 'src', 'env.json'), 'w'))
print('ok', len(rms))
