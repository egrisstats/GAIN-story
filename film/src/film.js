/* GAIN 2026 promo film — deterministic canvas renderer.
   window.renderFrame(t) draws the frame at t seconds. ?w=&h= picks the format. */
(function () {
'use strict';
const CFG = window.FILM_CONFIG;
const qs = new URLSearchParams(location.search);
const W = +(qs.get('w') || 1920), H = +(qs.get('h') || 1080);
const PORT = H > W;
const DUR = 58;
const cv = document.getElementById('c');
cv.width = W; cv.height = H;
let X = cv.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const bufX = buf.getContext('2d');

/* ---------- palette (EGRISS Design System) ---------- */
const PAL = { navy: '#14234C', deep: '#072D62', blue: '#3B71B9', teal: '#4CC3C9', coral: '#F06667', gold: '#E0A93B',
  sand: '#E3C3A0', paper: '#F7FAFD', tint: '#EEF3FA', tint2: '#DDE8F5', line: '#D9E2EF', b1: '#CFE0F4', b2: '#8DB8E3',
  b4: '#1F4A8F', ink: '#1D2940', muted: '#5A6884', white: '#FFFFFF', na: '#D7DDE6', warm: '#FBF6EF',
  night: '#0A1430', night2: '#0E1B3D', card: 'rgba(26,40,82,0.94)', cardLine: 'rgba(207,224,244,0.26)', light: '#CFE0F4' };
let NIGHT = 0; // 0 = daylight story, 1 = the launch page's night sky
const SKIN = ['#8D5524', '#C68642', '#E0AC69', '#6B4226', '#F1C27D', '#A0522D', '#4A2F1E', '#B97A57'];
const HAIR = ['#1F1A17', '#2E2420', '#3B2A20', '#141414', '#5A3A22', '#8A8A8A'];

/* ---------- math ---------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eout = t => 1 - Math.pow(1 - t, 3);
const esine = t => -(Math.cos(Math.PI * t) - 1) / 2;
const outQuart = t => 1 - Math.pow(1 - t, 4);
const inOutExpo = t => t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
const spring = (stiffness = 100, damping = 10) => t => { const d = damping / 20, w = Math.sqrt(Math.max(stiffness / 10 - d * d, .01)), ts = t * 3; return 1 - Math.exp(-d * ts * 6) * (Math.cos(w * ts) + (d / w) * Math.sin(w * ts)); };
const glide = t => lerp(eio(t), inOutExpo(t), .55); // camera travel between scenes
// music: 100 BPM grid anchored at 0.8s (downbeats 0.8, 3.2, 5.6 ... 17.6 ...)
let ENV = null; const env = t => { if (!ENV) return 0; const i = Math.floor(t * 30); return ENV[Math.max(0, Math.min(ENV.length - 1, i))] || 0; };
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function hex(c) { c = c.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); }
const lit = (c, k) => mix(c, '#ffffff', k);
const drk = (c, k) => mix(c, PAL.navy, k);
const rgba = (c, a) => { const h = hex(c); return `rgba(${h[0]},${h[1]},${h[2]},${a})`; };

/* ---------- iso primitives ---------- */
const C = Math.cos(Math.PI / 6), S = 0.5;
const P3 = (x, y, z) => [(x - y) * C, (x + y) * S - z];
function poly(pts, fill) { X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]); X.closePath(); X.fillStyle = fill; X.fill(); }
function box(x, y, z, w, d, h, col, o = {}) {
  const top = o.top || lit(col, .35), lf = o.left || col, rt = o.right || drk(col, .16);
  if (!o.noSides) {
    poly([P3(x, y + d, z + h), P3(x + w, y + d, z + h), P3(x + w, y + d, z), P3(x, y + d, z)], lf);
    poly([P3(x + w, y, z + h), P3(x + w, y + d, z + h), P3(x + w, y + d, z), P3(x + w, y, z)], rt);
  }
  poly([P3(x, y, z + h), P3(x + w, y, z + h), P3(x + w, y + d, z + h), P3(x, y + d, z + h)], top);
}
// local planes: draw flat content in (u,v) units
function planeTop(x, y, z, fn) { const [ox, oy] = P3(x, y, z); X.save(); X.transform(C, S, -C, S, ox, oy); fn(); X.restore(); }
function planeL(x, y, z, fn) { const [ox, oy] = P3(x, y, z); X.save(); X.transform(C, S, 0, 1, ox, oy); fn(); X.restore(); } // face normal +y, u along +x
function planeR(x, y, z, fn) { const [ox, oy] = P3(x, y, z); X.save(); X.transform(C, -S, 0, 1, ox, oy); fn(); X.restore(); } // face normal +x, u along -y
function rr(x, y, w, h, r, fill) { X.beginPath(); X.roundRect(x, y, w, h, r); X.fillStyle = fill; X.fill(); }
function circ(x, y, r, fill) { X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.fillStyle = fill; X.fill(); }
function ell(x, y, rx, ry, fill) { X.beginPath(); X.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); X.fillStyle = fill; X.fill(); }
function line(pts, col, w) { X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]); X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round'; X.lineJoin = 'round'; X.stroke(); }
function txt(s, x, y, o = {}) {
  X.font = `${o.weight || 400} ${o.size || 20}px ${o.family || '"IBM Plex Sans"'}`;
  X.fillStyle = o.color || PAL.ink; X.textAlign = o.align || 'left'; X.textBaseline = o.base || 'alphabetic';
  if (o.ls) X.letterSpacing = o.ls + 'px'; else X.letterSpacing = '0px';
  X.fillText(s, x, y);
  if (window.__audit) { const m = X.getTransform(); const sy = Math.hypot(m.c, m.d); window.__audit.push([s, Math.round((o.size || 20) * sy * 10) / 10, X.globalAlpha]); }
}
const HEAD = 'Obvia, Figtree, sans-serif'; function stars(t, a, n = 260) {
  if (a <= 0) return;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const x = rnd(i + 400) * W, y = rnd(i + 410) * H, glint = i % 9 === 0;
    const tw = .45 + .55 * Math.max(0, Math.sin(t * (.5 + rnd(i + 420) * 1.6) + i));
    const r = (glint ? 2.2 : .9 + rnd(i + 430) * 1.5) * (PORT ? 1.1 : 1);
    X.globalAlpha = a * (glint ? tw : .35 + .5 * tw);
    if (glint) circ(x, y, r * 3.2, rgba(PAL.teal, .18));
    circ(x, y, r, glint ? PAL.teal : PAL.light);
  }
  X.restore();
}
function pointOfLight(x, y, r, col, a) { X.save(); X.globalAlpha *= a; circ(x, y, r * 2.6, rgba(col, .16)); circ(x, y, r * 1.6, rgba(col, .28)); circ(x, y, r, col); X.restore(); }
const MONO = '"IBM Plex Mono", monospace';

// floating island slab, top surface at z=0, local origin = back corner
function island(w, d, h, top, side, o = {}) {
  // soft floating shadow
  const [cx, cy] = P3(w / 2, d / 2, 0);
  X.save(); X.globalAlpha *= .9;
  const g = X.createRadialGradient(cx, cy + h + 120, 10, cx, cy + h + 120, (w + d) * C * .55);
  g.addColorStop(0, 'rgba(20,35,76,0.10)'); g.addColorStop(1, 'rgba(20,35,76,0)');
  X.fillStyle = g; X.beginPath(); X.ellipse(cx, cy + h + 120, (w + d) * C * .55, 70, 0, 0, 7); X.fill(); X.restore();
  box(0, 0, -h, w, d, h, side, { top, left: side, right: drk(side, .14) });
  // top edge lip
  if (o.lip !== false) {
    X.save(); X.globalAlpha *= .6;
    line([P3(0, d, 0), P3(w, d, 0), P3(w, 0, 0)], lit(top, .6), 2); X.restore();
  }
}

/* ---------- people ---------- */
// screen-space figure, (x,y) = foot point, facing right when f=1. ~120 units tall.
function person(x, y, o) {
  const sc = o.sc || 1, f = o.f || 1;
  X.save(); X.translate(x, y); X.scale(sc * f, sc);
  X.lineCap = 'round'; X.lineJoin = 'round';
  const skin = o.skin, top = o.top, bot = o.bot || PAL.navy, hair = o.hair || HAIR[0];
  const sleeve = o.sleeve || top, topD = drk(top, .18);
  if (!o.noShadow && !o.armsOnly) ell(o.seated ? 12 : 0, 0, 24, 7, 'rgba(20,35,76,0.13)');
  const hipY = o.seated ? -40 : -50;
  const bob = o.walk != null ? Math.abs(Math.sin(o.walk)) * -2.5 : 0;
  X.translate(0, bob);
  const sw = o.walk != null ? Math.sin(o.walk) * 11 : 0;
  // legs
  if (o.armsOnly) {
  } else if (o.seated) {
    line([[-3, hipY], [18, hipY + 1], [19, -4]], drk(bot, .1), 11);
    line([[5, hipY + 1], [25, hipY + 2], [26, -4]], bot, 11);
    ell(21, -2, 8, 4, '#2a2622'); ell(28, -2, 8, 4, '#2a2622');
  } else if (!o.noLegs) {
    line([[-4, hipY], [-4 - sw, -4]], drk(bot, .12), 11);
    ell(-1 - sw, -2, 8, 4, '#2a2622');
    line([[4, hipY], [4 + sw, -4]], bot, 11);
    ell(7 + sw, -2, 8, 4, '#2a2622');
  }
  const A = armPose(o.pose || 'idle', o.pt || 0, o.walk);
  // back arm
  if (!o.armsOnly) {
    if (o.hairStyle === 'long') rr(-15, -114, 12, 30, 6, hair);
    line([[-6, -86], A.be, A.bh], topD, 9); circ(A.bh[0], A.bh[1], 4.6, drk(skin, .08));
    // torso
    const bottom = o.coat ? (o.seated ? hipY + 4 : -30) : hipY + 5;
    X.beginPath(); X.moveTo(-15, -90); X.quadraticCurveTo(-16, -96, -9, -97); X.lineTo(9, -97); X.quadraticCurveTo(16, -96, 15, -90);
    X.lineTo(o.coat ? 18 : 15, bottom); X.quadraticCurveTo(0, bottom + 3, o.coat ? -18 : -15, bottom); X.closePath();
    X.fillStyle = top; X.fill();
    if (o.vest) { X.beginPath(); X.moveTo(-15, -90); X.lineTo(-6, -96); X.lineTo(2, -60); X.lineTo(15, -90); X.lineTo(15, hipY + 5); X.lineTo(-15, hipY + 5); X.closePath(); X.fillStyle = o.vest; X.fill(); rr(4, -80, 8, 6, 1.5, PAL.white); }
    // neck + head
    rr(-4, -102, 8, 9, 3, drk(skin, .1));
    X.save(); X.translate(0, -98); X.rotate(o.tilt || 0);
    head(skin, hair, o.hairStyle || 'short', o.hood);
    X.restore();
  }
  if (o.prop) o.prop(A);
  if (!o.bodyOnly) { line([[6, -86], A.fe, A.fh], sleeve, 9); circ(A.fh[0], A.fh[1], 4.6, skin); }
  X.restore();
}
function head(skin, hair, st, hood) {
  const hx = 1, hy = -13, r = 13;
  if (st === 'hijab' || st === 'hood') {
    const c = st === 'hood' ? hood : hair;
    X.beginPath(); X.moveTo(-15, hy + 2); X.quadraticCurveTo(-18, 12, -12, 14); X.lineTo(13, 14); X.quadraticCurveTo(16, 4, 12, hy + 6); X.closePath(); X.fillStyle = drk(c, .1); X.fill();
    circ(hx - 1, hy, r + 3.5, c);
    ell(hx + 4, hy + 1, 9, 11, skin);
    return;
  }
  if (st === 'bun') circ(-9, hy - 10, 6.5, hair);
  circ(hx, hy, r, skin);
  X.beginPath();
  if (st === 'curly') {
    for (let i = 0; i < 9; i++) { const a = Math.PI * (.62 + i * .17); circ(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12, 6, hair); }
    return;
  }
  const rr2 = st === 'crop' ? r + .6 : r + 1.4;
  X.arc(hx, hy, rr2, Math.PI * .72, Math.PI * 1.93); X.quadraticCurveTo(hx + 4, hy - 6, hx - 2, hy - 3); X.quadraticCurveTo(hx - 7, hy + 2, hx - 9, hy + 9); X.closePath();
  X.fillStyle = hair; X.fill();
}
function armPose(p, k, walk) {
  const s = walk != null ? Math.sin(walk) * 7 : 0;
  switch (p) {
    case 'tablet': return { fe: [12, -66], fh: [24, -72], be: [2, -66], bh: [17, -75] };
    case 'knock': return { fe: [20, -80], fh: [30 + k * 4, -94], be: [-8, -68], bh: [-6, -52] };
    case 'type': return { fe: [15, -62], fh: [31, -58 + k], be: [9, -63], bh: [26, -59 - k] };
    case 'rest': return { fe: [14, -63], fh: [29, -59], be: [8, -64], bh: [24, -60] };
    case 'carry': return { fe: [16, -66], fh: [24, -73], be: [9, -66], bh: [20, -76] };
    case 'lift': return { fe: [17, -96 - k * 8], fh: [22, -118 - k * 14], be: [12, -96 - k * 8], bh: [15, -120 - k * 14] };
    case 'low': return { fe: [14, -70], fh: [24, -60], be: [8, -70], bh: [20, -62] };
    case 'point': return { fe: [20, -88], fh: [34, -104], be: [-8, -68], bh: [-9, -51] };
    case 'book': return { fe: [12, -68], fh: [22, -76], be: [4, -68], bh: [18, -78] };
    case 'speak': return { fe: [18, -74], fh: [30, -80 + k * 3], be: [-8, -68], bh: [-9, -51] };
    default: return { fe: [8 + s, -68], fh: [9 + s * 1.3, -50], be: [-8 - s, -68], bh: [-9 - s * 1.3, -50] };
  }
}
const tabletProp = glow => A => {
  X.save(); X.translate(A.fh[0] - 8, A.fh[1] - 6); X.rotate(-.35);
  rr(-4, -12, 22, 16, 3, PAL.navy); rr(-2, -10, 18, 12, 2, glow ? PAL.teal : PAL.b2);
  X.restore();
};
const clipProp = A => { X.save(); X.translate(A.bh[0], A.bh[1]); X.rotate(.2); rr(-6, -16, 15, 20, 2, PAL.sand); rr(-3, -13, 9, 13, 1, PAL.white); X.restore(); };
const bookProp = col => A => { X.save(); X.translate(A.fh[0] - 6, A.fh[1] - 4); X.rotate(-.25); rr(-8, -14, 22, 17, 2, col); rr(-6, -12, 18, 13, 1, PAL.white); X.restore(); };

/* ---------- small scenery ---------- */
function tree(x, y, s, c1, c2) {
  const [px, py] = P3(x, y, 0);
  ell(px + 6, py, 26 * s, 8 * s, 'rgba(20,35,76,0.10)');
  rr(px - 4 * s, py - 46 * s, 8 * s, 46 * s, 3, '#8A6446');
  circ(px, py - 70 * s, 30 * s, c1);
  circ(px + 12 * s, py - 60 * s, 20 * s, c2);
}
function plant(x, y, z) {
  box(x, y, z, 22, 22, 22, PAL.sand, {});
  const [px, py] = P3(x + 11, y + 11, z + 22);
  [[-10, -16, 11, '#5E9E8A'], [8, -20, 12, '#7FB8A4'], [0, -30, 11, '#6FAF97'], [-4, -10, 9, '#7FB8A4']].forEach(l => ell(px + l[0], py + l[1], l[2] * .7, l[2], l[3]));
}
function dotTrail(pts, upto, alpha, z) { // pts: polyline with cumulative len
  const step = 22;
  X.fillStyle = rgba(mix(PAL.navy, PAL.light, NIGHT), alpha);
  for (let L = 0; L < upto; L += step) { const p = atLen(pts, L); X.beginPath(); X.arc(p[0], p[1], 3.6 / Math.max(.5, Math.min(1.4, z)) , 0, 7); X.fill(); }
}

/* ---------- captions ---------- */
function wrap(s, maxW) {
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (X.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur); return lines;
}
function caption(s, a) {
  if ((typeof a === 'object' ? a.in * a.out : a) <= 0) return;
  const fs = PORT ? 44 : 40, lh = fs * 1.3, maxW = PORT ? 900 : 1380;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.font = `500 ${fs}px "IBM Plex Sans"`; X.letterSpacing = '0px';
  const lines = wrap(s, maxW);
  const tw = Math.max(...lines.map(l => X.measureText(l).width));
  const bh = lines.length * lh + 36, bw = tw + 64;
  const ain = typeof a === 'object' ? a.in : a, aout = typeof a === 'object' ? a.out : 1;
  const by = (PORT ? H - 120 : H - 64) - bh + (1 - outQuart(clamp(ain * 1.6))) * 18 - (1 - aout) * 8;
  X.globalAlpha = clamp(ain * 2) * aout;
  const bwA = bw * (.92 + .08 * outQuart(clamp(ain * 1.6)));
  rr((W - bwA) / 2, by, bwA, bh, 10, NIGHT > .5 ? PAL.card : rgba(PAL.navy, .9));
  if (NIGHT > .5) { X.save(); X.globalAlpha *= NIGHT; X.strokeStyle = PAL.cardLine; X.lineWidth = 1.5; X.beginPath(); X.roundRect((W - bwA) / 2, by, bwA, bh, 10); X.stroke(); X.restore(); }
  X.fillStyle = PAL.white; X.textAlign = 'center'; X.textBaseline = 'middle';
  lines.forEach((l, i) => { const li = outQuart(clamp(ain * 1.8 - .25 - i * .25)); X.globalAlpha = li * aout; X.fillText(l, W / 2, by + 18 + lh * (i + .5) + 1 + (1 - li) * 14); });
  X.restore();
}

/* ---------- camera ---------- */
// cam: {x,y} world point placed at screen (ax*W, ay*H), zoom z (portrait multiplies by PZ)
const PZ = PORT ? .84 : 1;
function setCam(c) {
  const z = c.z * PZ, ax = (c.ax != null ? c.ax : .5) * W, ay = (PORT ? (c.pay != null ? c.pay : .44) : (c.ay != null ? c.ay : .47)) * H;
  X.setTransform(z, 0, 0, z, ax - c.x * z, ay - c.y * z);
  return z;
}
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) { const e = (keys[i + 1][2] || eio)(seg(t, t0, t1)); const o = {}; for (const k in b) o[k] = lerp(a[k] != null ? a[k] : b[k], b[k], e); return o; }
  }
  return keys[keys.length - 1][1];
}
function bg(c1, c2) {
  X.setTransform(1, 0, 0, 1, 0, 0);
  const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2);
  X.fillStyle = g; X.fillRect(0, 0, W, H);
}
function warmGlow(x, y, r, a) {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(PAL.sand, a)); g.addColorStop(1, rgba(PAL.sand, 0));
  X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
}

/* =========================================================
   PART 1 — the hard work
   ========================================================= */
function sceneRain(t) {
  bg('#C3CFDD', '#E4EAF1');
  const z = setCam(kf([[0, { x: -330, y: 300, z: 1.2 }], [4.6, { x: -250, y: 310, z: 1.36 }]], t));
  // distant hills
  X.save(); X.globalAlpha = .5;
  ell(-700, 330, 600, 160, '#B7C7D6'); ell(500, 300, 700, 170, '#AFC0D1'); X.restore();
  X.save(); X.translate(-400, 60);
  const w = 700, d = 520;
  island(w, d, 60, '#9EC6A9', '#8A6446', { lip: false });
  // muddy path on the top plane
  planeTop(0, 0, 0, () => {
    X.beginPath(); X.moveTo(0, 210);
    for (let u = 0; u <= w; u += 20) X.lineTo(u, 210 + Math.sin(u / 110) * 30);
    for (let u = w; u >= 0; u -= 20) X.lineTo(u, 320 + Math.sin(u / 110 + .6) * 26);
    X.closePath(); X.fillStyle = '#B08A63'; X.fill();
    X.beginPath(); X.moveTo(0, 240); for (let u = 0; u <= w; u += 20) X.lineTo(u, 245 + Math.sin(u / 110 + .3) * 26); X.strokeStyle = 'rgba(138,100,70,.45)'; X.lineWidth = 6; X.stroke();
    // puddles with ripples
    [[160, 280, 46, 20], [420, 262, 60, 22], [600, 300, 40, 16]].forEach((p, i) => {
      ell(p[0], p[1], p[2], p[3], 'rgba(141,184,227,0.85)');
      for (let k = 0; k < 2; k++) {
        const ph = ((t * .9 + i * .37 + k * .5) % 1);
        X.beginPath(); X.ellipse(p[0] + (k ? -10 : 12), p[1], ph * p[2] * .6, ph * p[3] * .6, 0, 0, 7);
        X.strokeStyle = `rgba(255,255,255,${(1 - ph) * .8})`; X.lineWidth = 2; X.stroke();
      }
    });
    // grass tufts
    for (let i = 0; i < 40; i++) { const u = rnd(i) * w, v = rnd(i + 50) * d; if (v > 180 && v < 350) continue; X.fillStyle = i % 2 ? '#7FB8A4' : '#6FA88F'; X.beginPath(); X.moveTo(u, v); X.lineTo(u + 4, v - 12); X.lineTo(u + 8, v); X.fill(); }
  });
  // hut + trees at the back
  box(470, 40, 0, 120, 100, 80, '#E3C3A0');
  poly([P3(470, 40, 80), P3(590, 40, 80), P3(590, 90, 125), P3(470, 90, 125)], '#C2955F');
  poly([P3(470, 90, 125), P3(590, 90, 125), P3(590, 140, 80), P3(470, 140, 80)], '#A97B4A');
  planeL(510, 140, 50, () => rr(0, 0, 30, 50, 3, '#8A6446'));
  tree(90, 60, 1.1, '#5E9E8A', '#7FB8A4'); tree(250, 30, .9, '#6FAF97', '#5E9E8A'); tree(60, 420, 1.0, '#5E9E8A', '#7FB8A4');
  // fence posts
  for (let i = 0; i < 6; i++) box(80 + i * 105, 380 + Math.sin(i) * 6, 0, 8, 8, 34, '#8A6446');
  // enumerator walking along the path
  const u = lerp(150, 420, t / 4.4), v = 268 + Math.sin(u / 110 + .3) * 26;
  const [px, py] = P3(u, v, 0);
  person(px, py, { skin: SKIN[0], hair: HAIR[0], hairStyle: 'hood', hood: PAL.gold, top: PAL.gold, coat: true, bot: PAL.deep, walk: t * 6.5, pose: 'tablet', prop: tabletProp(true), sc: 1.15 });
  tree(640, 470, .8, '#6FAF97', '#7FB8A4');
  X.restore();
  // rain (screen space)
  X.setTransform(1, 0, 0, 1, 0, 0);
  X.strokeStyle = 'rgba(59,113,185,0.32)'; X.lineWidth = PORT ? 2.4 : 2; X.lineCap = 'round';
  X.beginPath();
  for (let i = 0; i < 320; i++) {
    const sp = 1300 + rnd(i + 7) * 500, x0 = rnd(i) * (W + 300);
    const yy = ((rnd(i + 3) * (H + 200) + t * sp) % (H + 200)) - 100;
    const xx = x0 - yy * .22;
    X.moveTo(xx, yy); X.lineTo(xx - 7, yy + 30);
  }
  X.stroke();
}

function sceneKnock(t) { // local t from 0
  bg('#EEF3FA', '#F7FAFD');
  warmGlow(W * .7, H * .2, W * .6, .25);
  setCam(kf([[0, { x: -250, y: 215, z: 1.32 }], [2.4, { x: -230, y: 205, z: 1.42 }]], t));
  X.save(); X.translate(-300, 20);
  const w = 560, d = 460;
  island(w, d, 40, '#E9E1D2', '#C9AE8B');
  planeTop(0, 0, 0, () => { rr(120, 300, 260, 80, 6, '#DCCFB9'); for (let i = 0; i < 5; i++) rr(140 + i * 50, 315, 36, 50, 4, '#D2C3AA'); });
  tree(60, 80, .9, '#5E9E8A', '#7FB8A4');
  // house
  const hx = 150, hy = 80, hw = 280, hd = 220, hh = 170;
  box(hx, hy, 0, hw, hd, hh, '#F3EDE4', { left: '#F3EDE4', right: '#DCD3C5', top: '#F7F3EC' });
  // roof
  poly([P3(hx - 10, hy - 10, hh), P3(hx + hw + 10, hy - 10, hh), P3(hx + hw + 10, hy + hd / 2, hh + 80), P3(hx - 10, hy + hd / 2, hh + 80)], '#2E5A9A');
  poly([P3(hx - 10, hy + hd / 2, hh + 80), P3(hx + hw + 10, hy + hd / 2, hh + 80), P3(hx + hw + 10, hy + hd + 10, hh), P3(hx - 10, hy + hd + 10, hh)], PAL.blue);
  poly([P3(hx + hw + 10, hy - 10, hh), P3(hx + hw + 10, hy + hd + 10, hh), P3(hx + hw + 10, hy + hd / 2, hh + 80)], '#DCD3C5');
  // door + windows on the front (+y) face
  planeL(hx, hy + hd, hh, () => {
    rr(70, 40, 70, 130, 4, PAL.deep); rr(76, 46, 58, 124, 3, PAL.b4); circ(124, 110, 3.5, PAL.gold);
    rr(170, 40, 70, 56, 4, '#fff'); rr(175, 45, 60, 46, 2, PAL.b1); X.fillStyle = '#fff'; X.fillRect(204, 45, 3, 46);
  });
  planeR(hx + hw, hy + hd, hh, () => { rr(70, 40, 70, 56, 4, '#fff'); rr(75, 45, 60, 46, 2, PAL.b1); });
  plant(hx + 170, hy + hd + 30, 0);
  // knock ripples
  const kt = t - .5;
  const knock = kt > 0 && kt < 1.8 ? Math.max(0, Math.sin(kt * 14)) : 0;
  const [dx, dy] = P3(hx + 95, hy + hd, 95);
  for (let k = 0; k < 3; k++) {
    const ph = kt - k * .45; if (ph < 0 || ph > .7) continue;
    X.save(); X.globalAlpha = 1 - ph / .7; X.strokeStyle = PAL.navy; X.lineWidth = 3; X.lineCap = 'round';
    for (let j = 0; j < 3; j++) { X.beginPath(); X.arc(dx - 30, dy, 14 + j * 10 + ph * 20, -Math.PI * .35, Math.PI * .1); X.stroke(); }
    X.restore();
  }
  // census enumerator in front of the door
  const [px, py] = P3(hx + 40, hy + hd + 66, 0);
  person(px, py, { skin: SKIN[3], hair: PAL.deep, hairStyle: 'hijab', top: PAL.blue, vest: PAL.sand, bot: PAL.navy, pose: 'knock', pt: knock, prop: clipProp, sc: 1.18 });
  X.restore();
}

function sceneClerk(t) {
  bg('#F7FAFD', '#EEF3FA');
  warmGlow(W * .3, H * .25, W * .55, .22);
  setCam(kf([[0, { x: -200, y: 175, z: 1.42 }], [2.4, { x: -190, y: 185, z: 1.32 }]], t));
  X.save(); X.translate(-230, 0);
  const w = 480, d = 420;
  island(w, d, 34, '#F4F7FB', PAL.b1);
  // walls
  box(-14, 0, 0, 14, d, 230, '#E6EDF6', { left: '#E6EDF6', right: '#D5DFEC', top: '#F4F7FB' });
  box(0, -14, 0, w, 14, 230, '#EDF2F8', { left: '#EDF2F8', right: '#D5DFEC', top: '#F4F7FB' });
  // shelves with binders on the left wall (face normal +x)
  [[60, 150], [130, 90]].forEach(([z, yy], si) => {
    box(0, 60, z, 30, 300, 6, '#C9B08E');
    for (let i = 0; i < 12; i++) { const h = 50 + rnd(i + si * 9) * 20; box(4, 70 + i * 23, z + 6, 22, 16, h, [PAL.blue, PAL.b2, PAL.navy, PAL.sand, PAL.b1][(i + si * 2) % 5]); }
  });
  // filing cabinet
  box(330, 20, 0, 70, 60, 130, '#C7D3E2', { left: '#C7D3E2', right: '#B2C1D5', top: '#DDE5EF' });
  planeL(330, 80, 130, () => { for (let i = 0; i < 3; i++) { rr(6, 8 + i * 41, 58, 34, 3, '#D7E0EB'); rr(24, 20 + i * 41, 22, 5, 2, PAL.muted); } });
  // monitor on the desk, screen faces +y
  const dz = 74;
  box(150, 150, 0, 8, 8, dz, PAL.muted); box(300, 150, 0, 8, 8, dz, PAL.muted); box(150, 245, 0, 8, 8, dz, PAL.muted); box(316, 245, 0, 8, 8, dz, PAL.muted);
  box(140, 140, dz, 190, 120, 8, '#FFFFFF', { left: '#E6ECF4', right: '#D1DBE8', top: '#FFFFFF' });
  box(210, 160, dz + 8, 10, 10, 40, '#8B98B3');
  box(170, 158, dz + 48, 120, 8, 84, PAL.navy);
  const rows = Math.floor(clamp(t * 3.2, 0, 7));
  planeL(176, 166, dz + 128, () => {
    rr(0, 0, 108, 76, 2, '#F7FAFD');
    rr(0, 0, 108, 10, 1, PAL.blue);
    for (let i = 0; i < 7; i++) {
      const on = i < rows; const y = 14 + i * 8.6;
      X.fillStyle = i === rows - 1 ? rgba(PAL.teal, .35) : 'rgba(0,0,0,0)'; X.fillRect(2, y - 1, 104, 7.6);
      if (on) { X.fillStyle = PAL.b2; X.fillRect(5, y + 1, 22, 4); X.fillStyle = PAL.na; X.fillRect(32, y + 1, 36, 4); X.fillRect(74, y + 1, 26, 4); }
    }
  });
  // clerk seated, writing in the register
  const [px, py] = P3(150, 300, 0);
  box(110, 280, 42, 54, 50, 8, PAL.blue); // stool seat
  person(px, py, { skin: SKIN[4], hair: HAIR[2], hairStyle: 'crop', top: '#E9E2D6', sleeve: '#E9E2D6', bot: PAL.deep, seated: true, pose: 'type', pt: Math.sin(t * 9) * 1.5, f: 1, bodyOnly: true, sc: 1.1, tilt: -.06 });
  // register book on the desk (top plane)
  planeTop(180, 190, dz + 8, () => {
    rr(0, 0, 70, 52, 3, PAL.deep); rr(3, 3, 32, 46, 2, '#FFFDF7'); rr(35, 3, 32, 46, 2, '#FFFDF7');
    X.fillStyle = PAL.b2; for (let i = 0; i < 7; i++) { X.fillRect(6, 8 + i * 6, 24, 1.6); X.fillRect(38, 8 + i * 6, i < rows ? 24 : 0, 1.6); }
  });
  person(px, py, { skin: SKIN[4], hair: HAIR[2], hairStyle: 'crop', top: '#E9E2D6', sleeve: '#E9E2D6', bot: PAL.deep, seated: true, pose: 'type', pt: Math.sin(t * 9) * 1.5, f: 1, armsOnly: true, sc: 1.1 });
  // mug
  box(290, 230, dz + 8, 14, 14, 16, PAL.sand);
  X.restore();
}

function sceneFamily(t) { // local t 0..4.3
  bg('#F5EFE6', '#F7FAFD');
  warmGlow(W * .75, H * .15, W * .7, .35);
  setCam(kf([[0, { x: PORT ? -270 : -120, y: 250, z: 1.25 }], [1.6, { x: PORT ? -280 : -140, y: 250, z: 1.3 }], [4.5, { x: PORT ? -270 : -130, y: 250, z: 1.26 }]], t));
  X.save(); X.translate(-330, 0);
  const w = 620, d = 480;
  island(w, d, 44, '#EADCC6', '#C9AE8B');
  planeTop(0, 0, 0, () => { for (let i = 0; i < 30; i++) ell(rnd(i) * w, rnd(i + 9) * d, 6, 3, 'rgba(176,138,99,.25)'); });
  // shelter (tent prism)
  const tx = 260, ty = 50;
  poly([P3(tx, ty, 0), P3(tx + 220, ty, 0), P3(tx + 220, ty + 80, 150), P3(tx, ty + 80, 150)], '#D4B48D');
  poly([P3(tx, ty + 80, 150), P3(tx + 220, ty + 80, 150), P3(tx + 220, ty + 160, 0), P3(tx, ty + 160, 0)], '#E3C3A0');
  poly([P3(tx + 220, ty, 0), P3(tx + 220, ty + 160, 0), P3(tx + 220, ty + 80, 150)], '#C9A27A');
  poly([P3(tx + 220, ty + 50, 0), P3(tx + 220, ty + 110, 0), P3(tx + 220, ty + 80, 85)], '#8A6446');
  tree(560, 60, .9, '#6FAF97', '#7FB8A4');
  // bundles
  box(420, 260, 0, 46, 40, 34, '#C2955F'); box(430, 270, 34, 30, 26, 22, PAL.b2);
  // handcart
  const cx = 340, cy = 280;
  box(cx, cy, 30, 120, 80, 40, '#9A7550', { top: '#B48A61' });
  const [w1x, w1y] = P3(cx + 30, cy + 80, 18), [w2x, w2y] = P3(cx + 100, cy + 80, 18);
  ell(w1x, w1y, 14, 18, PAL.navy); ell(w1x, w1y, 6, 8, PAL.na); ell(w2x, w2y, 14, 18, PAL.navy); ell(w2x, w2y, 6, 8, PAL.na);
  line([P3(cx, cy + 40, 50), P3(cx - 70, cy + 40, 40)], '#8A6446', 6);
  // items already in the cart
  box(cx + 10, cy + 10, 70, 40, 30, 26, PAL.sand); box(cx + 60, cy + 15, 70, 34, 36, 18, PAL.blue);
  // man lifting a box into the cart
  const lp = eio(seg(t, .2, 1.4));
  const bx = lerp(cx + 110, cx + 70, lp), bz = lerp(70, 92, lp);
  const [mx, my] = P3(cx + 165, cy + 10, 0);
  if (lp < 1) person(mx, my, { skin: SKIN[6], hair: HAIR[3], hairStyle: 'crop', top: '#5E9E8A', bot: '#3B3A44', pose: 'carry', f: -1, sc: 1.12, prop: A => rr(A.fh[0] - 6, A.fh[1] - 26, 30, 24, 3, '#C9A27A') });
  else { box(cx + 62, cy + 50, 88, 30, 24, 22, '#C9A27A'); person(mx, my, { skin: SKIN[6], hair: HAIR[3], hairStyle: 'crop', top: '#5E9E8A', bot: '#3B3A44', pose: 'idle', f: -1, sc: 1.12 }); }
  // woman with bundle, child with a bag
  const [wx, wy] = P3(500, 410, 0);
  person(wx, wy, { skin: SKIN[1], hair: PAL.coral, hairStyle: 'hijab', top: PAL.deep, coat: true, bot: PAL.deep, pose: 'carry', f: -1, sc: 1.1, prop: A => ell(A.fh[0] + 4, A.fh[1] - 8, 16, 12, PAL.gold) });
  const [chx, chy] = P3(560, 440, 0);
  person(chx, chy, { skin: SKIN[1], hair: HAIR[0], hairStyle: 'curly', top: PAL.gold, bot: PAL.navy, pose: 'low', f: -1, sc: .72, prop: A => rr(A.fh[0] - 4, A.fh[1], 14, 14, 3, PAL.coral) });
  // enumerator arrives from the left
  const ap = eout(seg(t, 0, 1.6));
  const eu = lerp(40, 170, ap), ev = lerp(440, 360, ap);
  const [ex, ey] = P3(eu, ev, 0);
  person(ex, ey, { skin: SKIN[2], hair: HAIR[1], hairStyle: 'bun', top: PAL.blue, vest: PAL.sand, bot: PAL.navy, walk: ap < 1 ? t * 7 : null, pose: 'tablet', prop: tabletProp(true), sc: 1.15 });
  const tabletScreen = X.getTransform().transformPoint(new DOMPoint(ex + 28, ey - 100));
  X.restore();
  // household form (flat card)
  const fa = eout(seg(t, 1.5, 2.1));
  if (fa > 0) {
    X.setTransform(1, 0, 0, 1, 0, 0);
    const s = PORT ? .86 : 1.0;
    const cw = 560 * s, ch = 390 * s;
    const fx = PORT ? W / 2 - cw / 2 : W * .56, fy = PORT ? H * .035 : H * .1;
    X.save(); X.globalAlpha = fa;
    // thin connector to the tablet
    X.strokeStyle = rgba(PAL.navy, .35); X.setLineDash([4, 6]); X.lineWidth = 2;
    X.beginPath(); X.moveTo(tabletScreen.x, tabletScreen.y); X.lineTo(fx + 20, fy + ch - 20); X.stroke(); X.setLineDash([]);
    X.translate(fx, fy + (1 - fa) * 16); X.scale(s, s);
    X.shadowColor = 'rgba(20,35,76,0.16)'; X.shadowBlur = 30; X.shadowOffsetY = 10;
    rr(0, 0, 560, 390, 10, PAL.white); X.shadowColor = 'transparent';
    rr(0, 0, 560, 70, [10, 10, 0, 0], PAL.navy);
    txt('HOUSEHOLD FORM', 30, 46, { size: PORT ? 28.5 : 24, weight: 600, color: PAL.white, ls: 2.5 });
    const fields = [['Name', 170], ['Age', 60], ['Residence', 200], ['Nationality', 0]];
    fields.forEach(([lab, fw], i) => {
      const y = 128 + i * 72;
      txt(lab, 30, y + 3, { size: PORT ? 29 : 25, weight: 500, color: i === 3 ? PAL.navy : PAL.muted });
      const last = i === 3;
      const filled = last ? 0 : eout(seg(t, 1.8 + i * .25, 2.2 + i * .25));
      X.lineWidth = last ? 2.5 : 1.5;
      X.strokeStyle = last ? PAL.coral : PAL.line; X.beginPath(); X.roundRect(220, y - 30, 300, 46, 7); X.stroke();
      if (last) { rr(220, y - 30, 300, 46, 7, rgba(PAL.coral, .08)); if (Math.floor(t * 2.2) % 2 === 0) { X.fillStyle = PAL.navy; X.fillRect(236, y - 20, 3, 26); } }
      else rr(236, y - 13, fw * filled, 12, 6, PAL.b2);
    });
    X.restore();
  }
}

/* =========================================================
   PARTS 2–4 — the world: desk island, the trail, the map
   ========================================================= */
// island centres in world space
const ISL = [
  { x: 0, y: 0 }, { x: 1250, y: -280 }, { x: 2500, y: 60 }, { x: 3750, y: -280 }, { x: 5050, y: 60 }
];
const IW = 420; // island footprint
const anchorOf = i => ({ x: ISL[i].x, y: ISL[i].y - IW * S }); // back corner such that centre = ISL[i]
// world point helpers (island local iso -> world)
const wpt = (i, x, y, z) => { const a = anchorOf(i), p = P3(x, y, z); return [a.x + p[0], a.y + p[1]]; };
const LAPTOP = () => wpt(0, 236, 195, 128);
const DOCK = [null, () => wpt(1, 150, 150, 330), () => wpt(2, 150, 150, 350), () => wpt(3, 210, 110, 330), () => wpt(4, 180, 120, 360)];

// trail polyline (Catmull-Rom through waypoints, sampled)
let TRAIL = null, DOCKL = [];
function buildTrail() {
  const L = LAPTOP();
  const wp = [L, [L[0] + 40, L[1] - 150], [L[0] + 420, L[1] - 260], [ISL[0].x + 900, -520]];
  const docks = [1, 2, 3, 4].map(i => DOCK[i]());
  const pts = [wp[0], wp[1], wp[2], wp[3], docks[0], [docks[0][0] + 600, docks[0][1] + 280], docks[1], [docks[1][0] + 650, docks[1][1] - 300], docks[2], [docks[2][0] + 700, docks[2][1] + 260], docks[3]];
  const dockIdx = [4, 6, 8, 10];
  const out = []; let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    if (dockIdx.includes(i)) DOCKL.push(len);
    for (let k = 0; k < 40; k++) {
      const s = k / 40, s2 = s * s, s3 = s2 * s;
      const x = .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3);
      const y = .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3);
      if (out.length) { const q = out[out.length - 1]; len += Math.hypot(x - q[0], y - q[1]); }
      out.push([x, y, len]);
    }
  }
  const last = pts[pts.length - 1]; const q = out[out.length - 1]; len += Math.hypot(last[0] - q[0], last[1] - q[1]); out.push([last[0], last[1], len]);
  DOCKL.push(len);
  TRAIL = out;
}
function atLen(pts, L) {
  if (L <= 0) return pts[0];
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][2] < L) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], s = (L - a[2]) / Math.max(1e-6, b[2] - a[2]);
  return [lerp(a[0], b[0], s), lerp(a[1], b[1], s)];
}
// dot schedule: [t0,t1, fromDock, toDock]
const LEGS = [[17.95, 22.4, -1, 0], [27.3, 28.4, 0, 1], [33.1, 34.4, 1, 2], [39.1, 40.4, 2, 3]];
function dotLen(t) {
  for (const [t0, t1, a, b] of LEGS) {
    const La = a < 0 ? 0 : DOCKL[a], Lb = DOCKL[b];
    if (t < t0) return La;
    if (t <= t1) return lerp(La, Lb, esine(seg(t, t0, t1)));
  }
  return DOCKL[3];
}
function arrivedAt(t) { let k = -1; LEGS.forEach(([t0, t1, a, b]) => { if (t >= t1 - .3) k = b; }); return k; } // 0..3 => island k+1

function camWorld(t) {
  const L = LAPTOP();
  const isl = i => ({ x: ISL[i].x + 20, y: ISL[i].y - 80, z: 1.1 });
  const keys = [
    [12.8, { x: ISL[0].x + 10, y: ISL[0].y - 40, z: 1.02 }],
    [14.0, { x: ISL[0].x + 10, y: ISL[0].y - 70, z: 1.12 }],
    [14.9, { x: L[0] + 10, y: L[1] - 200, z: 1.55 }],
    [17.5, { x: L[0] + 20, y: L[1] - 190, z: 1.6 }],
    [19.0, { x: ISL[0].x + 220, y: ISL[0].y - 160, z: .9 }],
    [22.1, isl(1), glide], [27.3, isl(1)], [28.3, isl(2), glide], [33.1, isl(2)], [34.3, isl(3), glide], [39.1, isl(3)], [40.3, isl(4), glide],
    [44.6, { x: ISL[4].x - 40, y: ISL[4].y - 60, z: .9 }],
    [47.2, { x: 2525, y: -120, z: .28 }],
    [51.2, { x: 2525, y: -120, z: .26 }]
  ];
  return kf(keys, t);
}

function drawWorld(t, mode) {
  const N = mode === 'end' ? 1 : eio(seg(t, 44.8, 47.0));
  bg(mix('#F7FAFD', PAL.night, Math.pow(N, .55)), mix('#EDF2F8', PAL.night2, Math.pow(N, 1.8)));
  warmGlow(W * .78, H * .1, W * .65, ((mode === 'end' ? .4 : .28) + env(t) * .14) * (1 - N));
  stars(t, N);
  if (mode === 'end') warmGlow(W * (PORT ? .5 : .73), H * (PORT ? .62 : .6), W * .42, .16 + env(t) * .08);
  const cam = mode === 'end' ? camEnd(t) : camWorld(t);
  const z = setCam(cam);
  // faint dot grid (parallax-free, world anchored)
  X.save(); X.fillStyle = rgba(PAL.blue, .07 * (1 - N));
  const vx0 = cam.x - W / z, vx1 = cam.x + W / z, vy0 = cam.y - H / z, vy1 = cam.y + H / z, g = 60;
  if (z > .5) for (let x = Math.floor(vx0 / g) * g; x < vx1; x += g) for (let y = Math.floor(vy0 / g) * g; y < vy1; y += g) X.fillRect(x - 1.5, y - 1.5, 3, 3);
  X.restore();
  if (mode !== 'end') drift(t, cam, z, false);
  const k = arrivedAt(t); // index of last island reached (0..3)
  const mapA = mode === 'end' ? 0 : eio(seg(t, 45.9, 47.6));
  // islands: current full, past faint
  for (let i = 0; i < ISL.length; i++) {
    let a = 1, rise = 0;
    if (mode === 'end') a = i === 0 ? 1 : 0;
    else {
      const reached = i === 0 ? 1 : (k >= i - 1 ? 1 : 0);
      if (i === 0) a = lerp(1, .4, seg(t, 19.5, 21));
      else {
        const leg = LEGS[i - 1]; const leave = LEGS[i] ? LEGS[i][0] : 99;
        const appear = eout(seg(t, leg[0] - 2.2, leg[0] + .4)), land = eout(seg(t, leg[1] - 1.2, leg[1]));
        a = lerp(0, .62, appear) + .38 * land;
        rise = (1 - appear) * 60 + (1 - land) * 14;
        a = lerp(a, .4, seg(t, leave, leave + 1.2));
      }
      if (t > 44.8) a = Math.min(a, lerp(1, .5, seg(t, 44.8, 46.5)));
      a *= 1 - mapA;
    }
    if (a <= .01) continue;
    const an = anchorOf(i);
    X.save(); X.globalAlpha = a; X.translate(an.x, an.y + rise + Math.sin(t * .8 + i * 1.7) * 3);
    ISLANDS[i](t, mode);
    X.restore();
  }
  if (mode === 'end') return;
  // trail + dot
  if (!TRAIL) buildTrail();
  const Ld = dotLen(t);
  X.save(); X.globalAlpha = 1 - mapA;
  if (t > 17.6) {
    X.save(); X.globalAlpha *= .12; dotTrail(TRAIL, TRAIL[TRAIL.length - 1][2], 1, z); X.restore();
    dotTrail(TRAIL, Ld, .55, z);
    const p = atLen(TRAIL, Ld);
    const pop = spring(140, 9)(seg(t, 17.6, 18.3));
    const lift = 0;
    const r = Math.max(0, 13 * pop / Math.max(.6, Math.min(1.2, z)));
    // comet tail while travelling
    const sp = Math.abs(dotLen(t) - dotLen(t - .05)) / .05;
    if (sp > 40) for (let k = 1; k <= 12; k++) {
      const q = atLen(TRAIL, Math.max(0, dotLen(t - k * .022)));
      X.fillStyle = rgba(mix(PAL.navy, PAL.light, N), .22 * (1 - k / 13)); X.beginPath(); X.arc(q[0], q[1], r * (1 - k / 15), 0, 7); X.fill();
    }
    // arrival pulses, on the downbeat chime
    for (const lg of LEGS) { const u = seg(t, lg[1] - .05, lg[1] + 1.1); if (u > 0 && u < 1) for (let j = 0; j < 2; j++) { const v = clamp(u * 1.3 - j * .3); if (v <= 0 || v >= 1) continue; X.strokeStyle = rgba(PAL.teal, (1 - v) * .8); X.lineWidth = 3 / z; X.beginPath(); X.arc(p[0], p[1], r + v * 70, 0, 7); X.stroke(); } }
    X.fillStyle = rgba(PAL.teal, (.22 + env(t) * .25) * clamp(pop)); X.beginPath(); X.arc(p[0], p[1] - lift, r * (2.1 + env(t) * .6), 0, 7); X.fill();
    X.fillStyle = mix(PAL.navy, PAL.light, N); X.beginPath(); X.arc(p[0], p[1] - lift, r, 0, 7); X.fill();
  }
  X.restore();
  if (mode !== 'end') drift(t, cam, z, true);
  // UI window popping out of the laptop
  emailWindow(t, z);
  if (mapA > 0) drawMap(t, mapA);
}

function drift(t, cam, z, front) {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const a0 = seg(t, 13.5, 15) * (1 - seg(t, 45.5, 47));
  for (let i = 0; i < 46; i++) {
    const depth = .35 + rnd(i + 200) * 1.5; if ((depth > 1) !== front) continue;
    const zz = z * depth * PZ, span = W + 400, spanY = H + 400;
    let x = (rnd(i + 210) * span * 3 - cam.x * zz + t * 6 * depth) % span; if (x < 0) x += span;
    let y = (rnd(i + 220) * spanY * 3 - cam.y * zz + Math.sin(t * .4 + i) * 20) % spanY; if (y < 0) y += spanY;
    const r = (front ? 10 + rnd(i + 230) * 16 : 3 + rnd(i + 230) * 6) * Math.min(1.4, depth);
    X.globalAlpha = a0 * (front ? .18 : .35);
    circ(x - 200, y - 200, r, front ? PAL.b1 : PAL.b2);
  }
  X.restore();
}
/* ---- island 0: the statistician's desk ---- */
function deskIsland(t, mode) {
  const w = IW, d = IW;
  island(w, d, 34, '#F4F7FB', PAL.b1);
  box(-14, 0, 0, 14, d, 220, '#E6EDF6', { left: '#E6EDF6', right: '#D5DFEC', top: '#F4F7FB' });
  box(0, -14, 0, w, 14, 220, '#EDF2F8', { left: '#EDF2F8', right: '#D5DFEC', top: '#F4F7FB' });
  // window with warm light
  planeL(200, 0, 200, () => {
    rr(0, 0, 160, 120, 6, PAL.white);
    const night = mode === 'end';
    const g = X.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, night ? PAL.night : '#F9E7CF'); g.addColorStop(1, night ? '#1A2C5E' : '#FDF6EC');
    rr(8, 8, 144, 104, 3, g);
    if (night) for (let i = 0; i < 14; i++) circ(14 + rnd(i + 500) * 132, 14 + rnd(i + 510) * 90, i % 5 ? 1.6 : 2.4, i % 5 ? PAL.light : PAL.teal);
    else circ(118, 36, 14, rgba(PAL.gold, .5));
    X.fillStyle = PAL.white; X.fillRect(78, 8, 4, 104); X.fillRect(8, 58, 144, 4);
  });
  // shelf on left wall
  box(0, 90, 150, 30, 220, 6, '#C9B08E');
  for (let i = 0; i < 9; i++) box(4, 100 + i * 22, 156, 22, 15, 40 + rnd(i + 3) * 18, [PAL.blue, PAL.b2, PAL.navy, PAL.sand, PAL.b1][i % 5]);
  plant(30, 30, 0);
  // rug
  planeTop(60, 120, 0, () => rr(0, 0, 300, 240, 16, rgba(PAL.sand, .55)));
  // chair
  box(78, 168, 40, 56, 60, 8, PAL.blue); box(66, 168, 40, 12, 60, 64, drk(PAL.blue, .25)); box(100, 192, 0, 8, 8, 40, PAL.muted);
  // statistician
  let tilt = .08, pose = 'type', pt = Math.sin(t * 10) * 1.6;
  if (mode === 'end') { const u = eio(seg(t, 51.8, 52.6)); tilt = lerp(.1, -.32, u); pose = u > .2 ? 'rest' : 'type'; pt = u > .2 ? 0 : pt; }
  else if (t > 15.6 && t < 17.6) { pose = 'rest'; pt = 0; }
  const [px, py] = P3(118, 200, 0);
  const st = { skin: SKIN[3], hair: HAIR[0], hairStyle: 'curly', top: PAL.gold, sleeve: PAL.gold, bot: PAL.deep, seated: true, pose, pt, tilt, sc: 1.08 };
  person(px, py, Object.assign({ bodyOnly: true }, st));
  // desk
  const dz = 70;
  box(158, 128, 0, 8, 8, dz, PAL.muted); box(158, 262, 0, 8, 8, dz, PAL.muted); box(318, 128, 0, 8, 8, dz, PAL.muted); box(318, 262, 0, 8, 8, dz, PAL.muted);
  box(150, 120, dz, 184, 156, 8, '#FFFFFF', { left: '#E6ECF4', right: '#D1DBE8', top: '#FFFFFF' });
  // laptop base and arms
  box(172, 165, dz + 8, 62, 64, 4, '#D7DDE6');
  person(px, py, Object.assign({ armsOnly: true }, st));
  // lid (back faces viewer)
  const glowA = t > 17.2 && t < 18 && mode !== 'end' ? (1 - Math.abs(t - 17.6) / .4) : 0;
  box(232, 165, dz + 12, 4, 64, 50, '#C9D3E0', { right: glowA > 0 ? mix('#C9D3E0', PAL.teal, glowA * .6) : '#B9C6D6', top: '#E2E8F0' });
  // desk items
  box(290, 140, dz + 8, 16, 16, 18, PAL.coral);
  box(270, 210, dz + 8, 44, 34, 5, '#FFFFFF', { left: '#E6ECF4', right: '#D1DBE8', top: '#FFFFFF' });
  box(276, 214, dz + 13, 38, 30, 3, '#F7FAFD');
}
function emailWindow(t, z) {
  const open = eout(seg(t, 14.0, 14.7)) * (1 - eio(seg(t, 17.35, 17.75)));
  if (open <= 0.001) return;
  const L = LAPTOP();
  const ww = 620, wh = 380;
  const cx = lerp(L[0], L[0] + 10, open), cy = lerp(L[1], L[1] - 210, open);
  X.save(); X.translate(cx, cy); X.scale(open, open); X.translate(-ww / 2, -wh / 2);
  X.globalAlpha = clamp(open * 1.5);
  X.shadowColor = 'rgba(20,35,76,0.18)'; X.shadowBlur = 40; X.shadowOffsetY = 14;
  rr(0, 0, ww, wh, 12, PAL.white); X.shadowColor = 'transparent';
  rr(0, 0, ww, 34, [12, 12, 0, 0], PAL.tint);
  [0, 1, 2].forEach(i => circ(20 + i * 16, 17, 5, PAL.line));
    // inbox list
  rr(0, 34, 200, wh - 34, [0, 0, 0, 12], '#F7FAFD');
  const sel = t > 15.2;
  const rows = [['EGRISS', 'GAIN 2026'], ['', ''], ['', ''], ['', ''], ['', '']];
  rows.forEach((r, i) => {
    const y = 46 + i * 62;
    if (i === 0) {
      rr(8, y, 184, 56, 6, sel ? rgba(PAL.teal, .22) : PAL.white);
      circ(20, y + 18, 4.5, PAL.teal);
      txt(r[0], 32, y + 22, { size: 18.5, weight: 500, color: PAL.muted });
      txt(r[1], 32, y + 44, { size: 18.5, weight: 600, color: PAL.navy, family: HEAD });
    } else { rr(20, y + 14, 110 - i * 8, 7, 3, PAL.line); rr(20, y + 30, 150 - i * 6, 7, 3, PAL.tint2); }
  });
  // reading pane
  const ra = outQuart(seg(t, 15.25, 15.65));
  X.save(); X.globalAlpha *= ra;
  txt('GAIN 2026', 224, 82, { size: 30, weight: 500, color: PAL.navy, family: HEAD });
  X.fillStyle = PAL.teal; X.fillRect(224, 94, 60, 3);
  txt('Report your examples', 224, 128, { size: 19, weight: 500, color: PAL.muted });
  [0, 1, 2].forEach(i => {
    const y = 148 + i * 40;
    rr(224, y, 372, 30, 6, PAL.tint);
    circ(240, y + 15, 7, PAL.teal); line([[236.5, y + 15], [239.5, y + 18], [244, y + 12]], PAL.white, 2);
    rr(256, y + 11, [190, 150, 210][i], 8, 4, PAL.b2);
  });
  // submit button
  const pressed = t > 17.0;
  const bx = 224, by = 290 + (pressed && t < 17.25 ? 1 : 0);
  rr(bx, by, 150, 46, 8, pressed ? PAL.teal : PAL.navy);
  txt(pressed ? 'Submitted' : 'Submit', bx + 75, by + 31, { size: 20, weight: 600, color: pressed ? PAL.navy : PAL.white, align: 'center' });
  X.restore();
  // cursor
  const ca = seg(t, 14.6, 14.8);
  if (ca > 0) {
    const p1 = [150, 300], p2 = [100, 78], p3 = [300, 316];
    const m1 = eio(seg(t, 14.7, 15.15)), m2 = eio(seg(t, 15.8, 16.85));
    let cxp = lerp(p1[0], p2[0], m1), cyp = lerp(p1[1], p2[1], m1);
    cxp = lerp(cxp, p3[0], m2); cyp = lerp(cyp, p3[1], m2);
    X.save(); X.translate(cxp, cyp);
    const clickS = 1 - .15 * (Math.max(0, 1 - Math.abs(t - 15.2) / .12) + Math.max(0, 1 - Math.abs(t - 17.0) / .12)); X.scale(clickS, clickS);
    X.beginPath(); X.moveTo(0, 0); X.lineTo(0, 22); X.lineTo(6, 17); X.lineTo(10, 26); X.lineTo(14, 24); X.lineTo(10, 15); X.lineTo(17, 15); X.closePath();
    X.fillStyle = PAL.navy; X.fill(); X.strokeStyle = PAL.white; X.lineWidth = 1.5; X.stroke();
    X.restore();
  }
  X.restore();
}

/* ---- an upright open book: spine at (sx,sy,z), pages along +y (left) and +x (right) ---- */
function openBook(sx, sy, z, pw, ph, cover, leftFn, rightFn, turn) {
  // covers
  poly([P3(sx, sy, z - 6), P3(sx, sy + pw + 10, z - 6), P3(sx, sy + pw + 10, z + ph + 8), P3(sx, sy, z + ph + 8)], drk(cover, .1));
  poly([P3(sx, sy, z - 6), P3(sx + pw + 10, sy, z - 6), P3(sx + pw + 10, sy, z + ph + 8), P3(sx, sy, z + ph + 8)], cover);
  planeR(sx + 2, sy + pw, z + ph, () => { rr(0, 0, pw, ph, 2, '#F4F6FA'); leftFn(); });
  planeL(sx, sy + 2, z + ph, () => { rr(0, 0, pw, ph, 2, PAL.white); rightFn(); });
  if (turn != null && turn > 0 && turn < 1) { // page turning from right to left
    const a = turn * Math.PI / 2; const dx = Math.cos(a), dy = Math.sin(a);
    const e = [sx + 2 + dx * pw, sy + 2 + dy * pw];
    poly([P3(sx + 2, sy + 2, z), P3(e[0], e[1], z), P3(e[0], e[1], z + ph), P3(sx + 2, sy + 2, z + ph)], mix('#FFFFFF', '#DDE5EF', Math.abs(turn - .5) < .5 ? (1 - Math.abs(turn - .5) * 2) * .7 : 0));
    X.save(); X.globalAlpha *= .5;
    const lp = (fr) => [lerp(sx + 2, e[0], fr), lerp(sy + 2, e[1], fr)];
    for (let i = 0; i < 6; i++) { const q0 = lp(.15), q1 = lp(.85); line([P3(q0[0], q0[1], z + ph - 40 - i * 22), P3(q1[0], q1[1], z + ph - 40 - i * 22)], PAL.line, 3); }
    X.restore();
  }
}
const textRows = (x, y, n, w, gap, col) => { for (let i = 0; i < n; i++) rr(x, y + i * gap, w * (0.7 + 0.3 * rnd(i * 3 + w)), 6, 3, col || PAL.line); };

function reportIsland(t) { // island 1 — GAIN report
  island(IW, IW, 34, '#F4F7FB', PAL.b1);
  planeTop(40, 40, 0, () => rr(0, 0, 340, 340, 18, rgba(PAL.tint2, .6)));
  box(100, 100, 0, 150, 150, 28, '#D5DFEC', { top: '#E6EDF6' });
  const rowsOn = clamp((t - 22.3) * 3, 0, 8);
  openBook(130, 130, 28, 210, 260, PAL.navy, () => {
    txt('GAIN report', 18, 46, { size: 30, weight: 500, color: PAL.navy, family: HEAD });
    X.fillStyle = PAL.teal; X.fillRect(18, 58, 54, 3);
    txt('By country', 18, 92, { size: 27, weight: 500, color: PAL.muted });
    // small map silhouette
    rr(18, 112, 174, 92, 6, PAL.tint);
    X.fillStyle = PAL.b2; [[40, 130, 30, 18], [62, 168, 14, 22], [104, 126, 22, 16], [110, 150, 18, 30], [146, 130, 34, 20], [164, 172, 14, 10]].forEach(b => { X.beginPath(); X.ellipse(b[0], b[1], b[2] / 2 + 4, b[3] / 2 + 3, 0, 0, 7); X.fill(); });
    [[110, 158], [150, 132], [52, 134], [66, 172]].forEach((p, i) => { if (rowsOn > i * 2) circ(p[0], p[1], 4, PAL.navy); });
    textRows(18, 222, 3, 150, 12);
  }, () => {
    for (let i = 0; i < 8; i++) {
      const y = 50 + i * 26; const a = clamp(rowsOn - i);
      X.save(); X.globalAlpha *= .25 + .75 * a;
      rr(14, y - 6, 70 + rnd(i + 21) * 22, 9, 4, PAL.b1);
      [0, 1, 2].forEach(c => { const v = rnd(i * 3 + c + 40); circ(128 + c * 32, y - 2, 6, a > .5 ? (v > .55 ? PAL.teal : v > .3 ? PAL.blue : PAL.na) : PAL.na); });
      X.restore();
    }
  });
  const [px, py] = P3(300, 330, 0);
  person(px, py, { skin: SKIN[5], hair: HAIR[3], hairStyle: 'long', top: PAL.coral === 0 ? 0 : PAL.gold, bot: PAL.navy, pose: 'point', f: -1, sc: 1.05 });
  plant(360, 40, 0);
}

function annualIsland(t) { // island 2 — EGRISS Annual Report with turning pages
  island(IW, IW, 34, '#F4F7FB', PAL.b1);
  planeTop(40, 40, 0, () => rr(0, 0, 340, 340, 18, rgba(PAL.sand, .35)));
  box(100, 100, 0, 150, 150, 28, '#D5DFEC', { top: '#E6EDF6' });
  const flips = [29.6, 30.8, 32.0];
  let turn = null, page = 0;
  flips.forEach(f => { if (t > f) page++; if (t > f && t < f + 1) turn = eio(seg(t, f, f + 1)); });
  if (turn != null) page--;
  openBook(130, 130, 28, 210, 270, PAL.blue, () => {
    if (page === 0) {
      if (LOGO.complete && LOGO.naturalWidth) X.drawImage(LOGO, 18, 22, 140, 140 * LOGO.naturalHeight / LOGO.naturalWidth);
      txt('EGRISS', 18, 120, { size: 32, weight: 600, color: PAL.navy, family: HEAD });
      txt('Annual Report', 18, 156, { size: 28, weight: 500, color: PAL.navy, family: HEAD });
      X.fillStyle = PAL.teal; X.fillRect(18, 172, 54, 3);
      textRows(18, 196, 4, 160, 14);
    } else { txt('Findings', 18, 48, { size: 28, weight: 500, color: PAL.navy, family: HEAD }); textRows(18, 64, 10, 170, 17); }
  }, () => {
    const p = page + (turn != null && turn > .5 ? 1 : 0);
    txt(['Key findings', 'Regions', 'Methods', 'Next steps'][Math.min(3, p)], 16, 46, { size: 28, weight: 500, color: PAL.navy, family: HEAD });
    for (let i = 0; i < 5; i++) { const hv = 30 + rnd(i + p * 7) * 90; rr(20 + i * 34, 190 - hv, 22, hv, 3, i === (p % 5) ? PAL.teal : PAL.b2); }
    rr(16, 196, 178, 2, 1, PAL.line);
    textRows(16, 216, 3, 160, 13);
  }, turn);
  const [px, py] = P3(330, 290, 0);
  person(px, py, { skin: SKIN[1], hair: HAIR[1], hairStyle: 'crop', top: PAL.navy, bot: '#3B3A44', pose: 'book', f: -1, sc: 1.05, prop: bookProp(PAL.blue) });
  tree(360, 50, .75, '#6FAF97', '#7FB8A4');
}

function confIsland(t) { // island 3 — video conference + shared "Guidance"
  island(IW, IW, 34, '#F4F7FB', PAL.b1);
  box(-14, 0, 0, 14, IW, 40, '#E6EDF6', { top: '#F4F7FB' });
  // big screen on a stand, facing +y
  box(140, 40, 0, 12, 12, 70, PAL.muted); box(300, 40, 0, 12, 12, 70, PAL.muted);
  box(40, 46, 70, 380, 10, 250, PAL.navy);
  planeL(48, 56, 312, () => {
    rr(0, 0, 364, 234, 4, '#0E1B3D');
    const tiles = [[SKIN[0], HAIR[0], 'crop', PAL.blue, '#2A3F72'], [SKIN[4], HAIR[4], 'long', PAL.coral, '#33507F'], [SKIN[6], HAIR[1], 'hijab', PAL.b2, '#22468C'], [SKIN[2], HAIR[5], 'short', PAL.gold, '#2C4A80']];
    tiles.forEach((tl, i) => {
      const x = 8 + (i % 2) * 80, y = 8 + Math.floor(i / 2) * 110;
      rr(x, y, 74, 104, 4, tl[4]);
      X.save(); X.beginPath(); X.rect(x, y, 74, 104); X.clip();
      person(x + 37, y + 136, { skin: tl[0], hair: tl[2] === 'hijab' ? PAL.sand : tl[1], hairStyle: tl[2], top: tl[3], noShadow: true, noLegs: true, sc: .95, pose: 'low', tilt: Math.sin(t * 1.5 + i) * .05 });
      X.restore();
      // speaking indicator
      if (Math.floor(t * 1.2 + i * .7) % 4 === i) { X.strokeStyle = PAL.white; X.lineWidth = 3; X.strokeRect(x + 1.5, y + 1.5, 71, 101); }
    });
    // shared document
    rr(172, 8, 184, 218, 4, PAL.white);
    txt('Guidance', 184, 44, { size: 30, weight: 500, color: PAL.navy, family: HEAD });
    X.fillStyle = PAL.teal; X.fillRect(184, 54, 40, 3);
    const typed = clamp((t - 34.4) * 2.2, 0, 11);
    for (let i = 0; i < 11; i++) {
      const fw = (i % 4 === 3 ? 90 : 156) * clamp(typed - i);
      rr(184, 70 + i * 13.5, fw, 5, 2.5, i === 5 ? rgba(PAL.teal, .7) : PAL.line);
    }
    const ci = Math.floor(typed);
    if (ci < 11 && Math.floor(t * 2.4) % 2 === 0) { X.fillStyle = PAL.navy; X.fillRect(184 + (ci % 4 === 3 ? 90 : 156) * (typed - ci), 67 + ci * 13.5, 2, 10); }
  });
  // participant in the room with a laptop
  box(250, 250, 0, 120, 80, 64, '#FFFFFF', { left: '#E6ECF4', right: '#D1DBE8', top: '#FFFFFF' });
  box(280, 270, 64, 46, 44, 4, '#D7DDE6'); box(276, 270, 68, 4, 44, 36, '#B9C6D6', { right: '#B9C6D6' });
  const [px, py] = P3(330, 360, 0);
  person(px, py, { skin: SKIN[7], hair: HAIR[0], hairStyle: 'bun', top: PAL.blue, bot: PAL.navy, pose: 'idle', f: -1, sc: 1.02, tilt: -.08 });
}

function hallIsland(t) { // island 4 — UN Statistical Commission
  const w = 520, d = 460;
  island(w, d, 34, '#E9EEF5', PAL.b1);
  planeTop(0, 0, 0, () => rr(20, 160, 480, 290, 12, rgba(PAL.deep, .12)));
  // back walls and big screen
  box(-14, 0, 0, 14, d, 250, '#DDE5EF', { top: '#EEF3FA' });
  box(0, -14, 0, w, 14, 250, '#E6EDF6', { top: '#EEF3FA' });
  planeL(70, 0, 230, () => {
    rr(0, 0, 330, 150, 6, PAL.navy);
    X.fillStyle = rgba(PAL.b2, .5);
    for (let i = 0; i < 60; i++) { const x = 20 + rnd(i) * 290, y = 20 + rnd(i + 3) * 110; if ((x - 165) ** 2 / 2.2 + (y - 75) ** 2 > 3800) continue; X.beginPath(); X.arc(x, y, 3, 0, 7); X.fill(); }
    for (let i = 0; i < 8; i++) { X.fillStyle = PAL.teal; X.beginPath(); X.arc(40 + rnd(i + 70) * 250, 30 + rnd(i + 80) * 90, 4, 0, 7); X.fill(); }
  });
  // stage
  box(20, 20, 0, 420, 130, 22, '#C9D6E6', { top: '#F4F7FB' });
  // speaker at the podium
  const [sx, sy] = P3(275, 75, 22);
  person(sx, sy, { skin: SKIN[0], hair: HAIR[5], hairStyle: 'short', top: PAL.navy, bot: '#2A2622', pose: 'speak', pt: Math.sin(t * 3), sc: 1.0 });
  box(190, 96, 22, 210, 46, 104, PAL.deep, { top: PAL.blue });
  planeL(190, 142, 122, () => {
    rr(8, 8, 194, 88, 4, PAL.white);
    txt('UN Statistical', 105, 46, { size: 26, weight: 600, color: PAL.navy, align: 'center' });
    txt('Commission', 105, 78, { size: 26, weight: 600, color: PAL.navy, align: 'center' });
    X.fillStyle = PAL.teal; X.fillRect(90, 87, 30, 3);
  });
  // audience rows facing the stage
  const tops = [PAL.blue, PAL.b2, PAL.gold, PAL.navy, PAL.coral, PAL.b4, PAL.sand];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const x = 130 + c * 72, y = 230 + r * 70;
    box(x - 14, y + 4, 0, 28, 24, 30, '#9AAFC9', { top: '#B7C7DA' });
    const i = r * 5 + c;
    const [px, py] = P3(x, y + 4, 26);
    person(px, py, { skin: SKIN[i % 8], hair: HAIR[i % 6], hairStyle: ['short', 'hijab', 'curly', 'bun', 'crop', 'long'][i % 6], top: tops[i % 7], noLegs: true, noShadow: true, pose: 'low', f: -1, sc: .62, tilt: -.05 });
  }
}
const ISLANDS = [deskIsland, reportIsland, annualIsland, confIsland, hallIsland];

/* ---- part 4 map ---- */
let WORLD = null;
const EA1 = 1.340264, EA2 = -0.081106, EA3 = 0.000893, EA4 = 0.003796, EM = Math.sqrt(3) / 2;
function ee(lon, lat) { const th = Math.asin(EM * Math.sin(lat * Math.PI / 180)), t2 = th * th, t6 = t2 * t2 * t2; return [lon * Math.PI / 180 * Math.cos(th) / (EM * (EA1 + 3 * EA2 * t2 + t6 * (7 * EA3 + 9 * EA4 * t2))), th * (EA1 + EA2 * t2 + t6 * (EA3 + EA4 * t2))]; }
let mapPath = null, mapGeom = null;
function mapSetup() {
  const M = WORLD, span = M.lat[1] - M.lat[0];
  const xMax = ee(180, 0)[0], yTop = ee(0, M.lat[1])[1], yBot = ee(0, -56)[1], aspect = 2 * xMax / (yTop - yBot);
  const mw = PORT ? W * .96 : W * .84, mh = mw / aspect;
  const mx = W / 2 - mw / 2, my = (PORT ? H * .27 : H * .45) - mh / 2;
  const pr = (nx, ny) => { const p = ee(nx * 360 - 180, M.lat[1] - ny * span); return [mx + (p[0] + xMax) / (2 * xMax) * mw, my + (yTop - p[1]) / (yTop - yBot) * mh]; };
  mapPath = new Path2D();
  M.land.forEach(r => { let x0 = 1, x1 = 0; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); } if (x1 - x0 > .6) return; for (let i = 0; i < r.length; i += 2) { const p = pr(r[i], r[i + 1]); if (i === 0) mapPath.moveTo(p[0], p[1]); else mapPath.lineTo(p[0], p[1]); } mapPath.closePath(); });
  const cents = Object.entries(M.cent).filter(([k]) => k !== 'Turkiye').map(([k, v]) => [k, pr(v[0], v[1])]);
  const dots = [];
  for (let i = 0; i < 150; i++) {
    const c = cents[i % cents.length][1];
    const jitter = i < cents.length ? 0 : 1;
    const tx = c[0] + (rnd(i + 5) - .5) * 14 * jitter, ty = c[1] + (rnd(i + 6) - .5) * 14 * jitter;
    const ang = rnd(i + 1) * Math.PI * 2, R = Math.max(W, H) * .75;
    dots.push({ sx: W / 2 + Math.cos(ang) * R, sy: H * .45 + Math.sin(ang) * R, tx, ty, t0: 46.0 + rnd(i + 2) * 3.6, d: 1.3 + rnd(i + 4) * .8, bend: (rnd(i + 8) - .5) * .6 });
  }
  mapGeom = { pr, cent: Object.fromEntries(cents), dots, mw };
}
function drawMap(t, a) {
  if (!mapPath) mapSetup();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.globalAlpha = a;
  X.fillStyle = 'rgba(59,113,185,0.26)'; X.fill(mapPath); X.strokeStyle = 'rgba(141,184,227,0.22)'; X.lineWidth = .8; X.stroke(mapPath);
  X.restore();
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const rDot = PORT ? 5 : 5.5;
  // streaming dots
  for (const d of mapGeom.dots) {
    const u = seg(t, d.t0, d.t0 + d.d); if (u <= 0) continue;
    const e = eio(u);
    const mx = (d.sx + d.tx) / 2 + (d.ty - d.sy) * d.bend, my = (d.sy + d.ty) / 2 - (d.tx - d.sx) * d.bend;
    const x = (1 - e) * (1 - e) * d.sx + 2 * (1 - e) * e * mx + e * e * d.tx, y = (1 - e) * (1 - e) * d.sy + 2 * (1 - e) * e * my + e * e * d.ty;
    X.globalAlpha = Math.min(a, seg(t, d.t0, d.t0 + .3)) * .95;
    const gl = mapGeom.dots.indexOf(d) % 7 === 0;
    pointOfLight(x, y, rDot * .8, gl ? PAL.teal : PAL.light, gl && u >= 1 ? .6 + .4 * Math.sin(t * 3 + d.tx) : 1);
    if (u >= 1) { const pu = seg(t, d.t0 + d.d, d.t0 + d.d + .8); if (pu < 1) { X.globalAlpha = (1 - pu) * .5 * a; X.strokeStyle = PAL.light; X.lineWidth = 2; X.beginPath(); X.arc(d.tx, d.ty, rDot + pu * 14, 0, 7); X.stroke(); } }
  }
  // labels
  // real report covers rising from their countries, then folding back into the point of light
  (CFG.mapCovers || []).forEach(([key, src], j) => {
    const c = mapGeom.cent[key], img = IMG[src]; if (!c || !img || !img.naturalWidth) return;
    const t0 = 46.3 + j * .32, up = outQuart(seg(t, t0, t0 + .4)), down = inOutExpo(seg(t, t0 + 1.05, t0 + 1.45));
    const k = up * (1 - down); if (k <= 0.01) return;
    const ch = PORT ? 118 : 132, cw = ch * .74;
    const cx = c[0], cy = c[1] - 26 - ch / 2 - 14 * k;
    X.save(); X.globalAlpha = a * clamp(k * 1.4); X.translate(cx, lerp(c[1], cy, k)); X.scale(.25 + .75 * k, .25 + .75 * k);
    circ(0, 0, ch * .62, rgba(PAL.light, .08));
    coverCard(img, -cw / 2, -ch / 2, cw, ch);
    X.restore();
  });
  const LT = [47.0, 48.2, 49.4];
  CFG.mapLabels.forEach(([lab, key, csrc], i) => {
    const c = mapGeom.cent[key]; if (!c) return;
    const t0 = LT[i], la = seg(t, t0, t0 + .35) * (PORT ? 1 : 1 - seg(t, t0 + 1.9, t0 + 2.3)) * a;
    if (la <= 0) return;
    X.globalAlpha = la;
    circ(c[0], c[1], rDot + 9, rgba(PAL.teal, .25)); circ(c[0], c[1], rDot + 3, PAL.teal); circ(c[0], c[1], rDot - 1, PAL.night);
    const fs = PORT ? 26 : 24;
    X.font = `600 ${fs}px "IBM Plex Sans"`; X.letterSpacing = '0px';
    // page-style tooltip card: the example's real cover, then its label
    const img = IMG[csrc], hasImg = img && img.naturalWidth;
    const ch = PORT ? 116 : 150, cw = ch * .74, pad = 14;
    const tw = X.measureText(lab).width + 40 + (hasImg ? cw + pad : 0), th = hasImg ? ch + pad * 2 : fs * 1.8;
    const dir = [[1, -1.9], [1, .5], [-1, .9]][i];
    let bx = c[0] + dir[0] * 34, by = c[1] + dir[1] * 46 - (dir[1] < 0 ? th - 44 : 0);
    if (dir[0] < 0) bx -= tw;
    bx = clamp(bx, 16, W - tw - 16); by = clamp(by, 16, H - th - 16);
    if (PORT) { bx = 60; by = H * .415 + i * (th + 14); } // 4:5 cut: the cards collect in a column under the map
    const lby = by + (1 - eout(seg(t, t0, t0 + .35))) * 10;
    line(PORT ? [[c[0], c[1]], [Math.max(c[0], bx + tw + 24), c[1] + 18], [Math.max(c[0], bx + tw + 24), lby + th / 2], [bx + tw, lby + th / 2]] : [[c[0], c[1]], [dir[0] < 0 ? bx + tw : bx, lby + th / 2]], 'rgba(207,224,244,0.5)', 2);
    rr(bx, lby, tw, th, 8, PAL.card); X.strokeStyle = PAL.cardLine; X.lineWidth = 1.5; X.beginPath(); X.roundRect(bx, lby, tw, th, 8); X.stroke();
    let tx = bx + 18;
    if (hasImg) { coverCard(img, bx + pad, lby + pad, cw, ch, outQuart(seg(t, t0 + .1, t0 + .5))); tx = bx + pad + cw + pad + 4; }
    circ(tx, lby + th / 2 - 1, 5, PAL.teal);
    txt(lab, tx + 13, lby + th / 2 + fs * .36, { size: fs, weight: 600, color: PAL.white });
  });
  X.restore();
}

// a report cover as a small card: image cropped to fit, thin light frame
function coverCard(img, x, y, w, h, reveal = 1) {
  X.save();
  X.shadowColor = 'rgba(4,9,26,0.55)'; X.shadowBlur = 16; X.shadowOffsetY = 6;
  rr(x, y, w, h, 3, PAL.white); X.shadowColor = 'transparent';
  X.beginPath(); X.roundRect(x, y, w, h, 3); X.clip();
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
  X.globalAlpha *= reveal; X.drawImage(img, x + (w - iw) / 2, y, iw, ih);
  X.restore();
  X.strokeStyle = 'rgba(207,224,244,0.6)'; X.lineWidth = 1.2; X.beginPath(); X.roundRect(x, y, w, h, 3); X.stroke();
}
/* =========================================================
   CLOSE — the statistician looks up, title, end card
   ========================================================= */
function camEnd(t) {
  return kf([[50.6, { x: ISL[0].x + 30, y: ISL[0].y - 40, z: .98, ax: PORT ? .5 : .73, pay: .66 }], [55, { x: ISL[0].x + 20, y: ISL[0].y - 50, z: 1.06, ax: PORT ? .5 : .73, pay: .66 }]], t);
}
function sceneLookUp(t) {
  drawWorld(t, 'end');
  X.setTransform(1, 0, 0, 1, 0, 0);
  const [l1, l2] = CFG.title;
  const fs = PORT ? 80 : 78;
  const a1 = 1, a2 = 1;
  const x = PORT ? W / 2 : 130, al = PORT ? 'center' : 'left';
  let y = PORT ? H * .16 : H * .38;
  const ea = outQuart(seg(t, 51.8, 52.4));
  txt('EGRISS · GAIN SURVEY 2026', PORT ? W / 2 : x, y - fs * 1.15 + (1 - ea) * 10, { size: PORT ? 26 : 24, weight: 500, family: MONO, color: rgba(PAL.teal, ea), align: al, ls: 3 });
  const lines1 = PORT ? ['You do the', 'hard work.'] : [l1];
  const lines2 = PORT ? ['GAIN makes', 'sure it counts.'] : ['GAIN makes sure', 'it counts.'];
  X.save(); X.globalAlpha = a1;
  words(lines1, x, y, fs, al, t, 52.4, () => PAL.white);
  X.restore();
  y += lines1.length * fs * 1.08 + 20;
  X.save(); X.globalAlpha = a2;
  words(lines2, x, y, fs, al, t, 53.6, (i) => i === lines2.length - 1 ? PAL.teal : PAL.white);
  const ry = y + lines2.length * fs * 1.08 - fs * .5;
  const g = X.createLinearGradient(PORT ? W / 2 - 36 : x, 0, (PORT ? W / 2 - 36 : x) + 72, 0); g.addColorStop(0, PAL.teal); g.addColorStop(1, rgba(PAL.teal, 0));
  X.fillStyle = g; X.fillRect(PORT ? W / 2 - 36 : x, ry, 72 * eout(seg(t, 54.0, 54.6)), 4);
  X.restore();
}
function words(lines, x, y, fs, al, t, t0, colOf) {
  let n = 0;
  lines.forEach((l, i) => {
    X.font = `600 ${fs}px ${HEAD}`; X.letterSpacing = '-1.5px';
    const ws = l.split(' '), sp = X.measureText(' ').width, tw = X.measureText(l).width;
    let cx = al === 'center' ? x - tw / 2 : x;
    ws.forEach(w => {
      const u = outQuart(seg(t, t0 + n * .09, t0 + n * .09 + .6)); n++;
      X.save(); X.globalAlpha *= u;
      txt(w, cx, y + i * fs * 1.08 + (1 - u) * 26, { size: fs, weight: 600, color: colOf(i), family: HEAD, align: 'left', ls: -1.5 });
      X.restore();
      X.font = `600 ${fs}px ${HEAD}`; X.letterSpacing = '-1.5px';
      cx += X.measureText(w).width + sp;
    });
  });
}
function sceneEnd(t) {
  bg(PAL.night, PAL.night2);
  stars(t, 1);
  X.setTransform(1, 0, 0, 1, 0, 0);
  const a = eout(seg(t, 54.9, 55.6));
  const cy = H * (PORT ? .4 : .42);
  X.save(); X.globalAlpha = a;
  if (LOGOW.complete && LOGOW.naturalWidth) { const lw = PORT ? 560 : 520, lh = lw * LOGOW.naturalHeight / LOGOW.naturalWidth; X.drawImage(LOGOW, W / 2 - lw / 2, cy - lh - (PORT ? 120 : 90), lw, lh); }
  X.restore();
  const b = outQuart(seg(t, 55.4, 56.1));
  X.save(); X.globalAlpha = b;
  txt('GAIN 2026', W / 2, cy + 40 + (1 - b) * 12, { size: PORT ? 120 : 112, weight: 600, color: PAL.white, family: HEAD, align: 'center', ls: -2 });
  const g = X.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0); g.addColorStop(0, rgba(PAL.teal, 0)); g.addColorStop(.5, PAL.teal); g.addColorStop(1, rgba(PAL.teal, 0));
  X.fillStyle = g; X.fillRect(W / 2 - 60, cy + 76, 120, 4);
  X.restore();
  const c = outQuart(seg(t, 56.0, 56.7));
  X.save(); X.globalAlpha = c;
  const parts = ['GAIN 2026', CFG.deadline, CFG.landingUrl];
  if (PORT) {
    txt(parts[1], W / 2, cy + 170, { size: 46, weight: 500, color: PAL.white, align: 'center' });
    txt(parts[2], W / 2, cy + 240, { size: 40, weight: 500, color: PAL.teal, align: 'center' });
  } else {
    txt(parts[1] + '  ·  ' + parts[2], W / 2, cy + 160, { size: 42, weight: 500, color: PAL.light, align: 'center' });
  }
  X.restore();
  // a row of settled dots
  X.save(); X.globalAlpha = a * .8;
  for (let i = 0; i < 17; i++) { const dx = (i - 8) * 26; const on = seg(t, 55 + i * .05, 55.3 + i * .05); pointOfLight(W / 2 + dx, H * (PORT ? .82 : .86), 4 * on, i === 8 ? PAL.teal : PAL.light, i === 8 ? 1 : .7); }
  X.restore();
}

/* =========================================================
   timeline
   ========================================================= */
const SCENES = [
  [0, 4.4, sceneRain, 0],
  [4.4, 6.2, t => sceneKnock(t - 4.4), .35],
  [6.2, 8.6, t => sceneClerk(t - 6.2), .35],
  [8.6, 12.8, t => sceneFamily(t - 8.6), .45],
  [12.8, 51.0, t => drawWorld(t, 'world'), .7],
  [51.0, 54.8, sceneLookUp, .9],
  [54.8, 58.1, sceneEnd, .8]
];
function drawScene(i, t, ctx) { const prev = X; X = ctx; X.save(); SCENES[i][2](t); X.restore(); X.setTransform(1, 0, 0, 1, 0, 0); X = prev; }
const buf2 = document.createElement('canvas'); buf2.width = W; buf2.height = H; const buf2X = buf2.getContext('2d');
window.renderFrame = function (t) {
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1;
  NIGHT = eio(seg(t, 44.8, 47.0));
  let i = SCENES.findIndex(s => t >= s[0] && t < s[1]); if (i < 0) i = SCENES.length - 1;
  const fd = SCENES[i][3];
  if (i > 0 && fd > 0 && t < SCENES[i][0] + fd) {
    const u = seg(t, SCENES[i][0], SCENES[i][0] + fd), k = 1 - esine(u);
    const push = i <= 4 ? 1 : .35; // part 1 cuts push through; later fades stay gentle
    bufX.setTransform(1, 0, 0, 1, 0, 0); bufX.clearRect(0, 0, W, H);
    drawScene(i - 1, Math.min(t, SCENES[i - 1][1] + fd), bufX);
    buf2X.setTransform(1, 0, 0, 1, 0, 0); buf2X.clearRect(0, 0, W, H);
    drawScene(i, t, buf2X);
    const sIn = 1 + .05 * push * (1 - outQuart(u)), sOut = 1 + .07 * push * inOutExpo(u);
    if (i <= 4) { // dip through the page: outgoing lifts away, incoming settles in
      bg('#F2F5FA', '#F7FAFD');
      X.globalAlpha = 1 - eio(seg(u, 0, .55)); X.drawImage(buf, W / 2 * (1 - sOut), H / 2 * (1 - sOut), W * sOut, H * sOut);
      X.globalAlpha = outQuart(seg(u, .45, 1)); X.drawImage(buf2, W / 2 * (1 - sIn), H / 2 * (1 - sIn), W * sIn, H * sIn);
    } else {
      X.drawImage(buf2, W / 2 * (1 - sIn), H / 2 * (1 - sIn), W * sIn, H * sIn);
      X.globalAlpha = k; X.drawImage(buf, W / 2 * (1 - sOut), H / 2 * (1 - sOut), W * sOut, H * sOut);
    }
    X.globalAlpha = 1;
  } else drawScene(i, t, X);
  // captions
  X.setTransform(1, 0, 0, 1, 0, 0);
  for (const [a, b, s] of CFG.captions) {
    caption(s, { in: seg(t, a, a + .55), out: 1 - seg(t, b - .3, b) });
  }
};
const IMG = {}; [...(CFG.mapCovers || []).map(c => c[1]), ...CFG.mapLabels.map(l => l[2]).filter(Boolean)].forEach(src => { const im = new Image(); im.src = src; IMG[src] = im; });
const LOGO = new Image(); LOGO.src = 'logo-blue.png'; const LOGOW = new Image(); LOGOW.src = 'logo-white.png';
window.filmReady = Promise.all([
  fetch('world.json').then(r => r.json()).then(j => { WORLD = j; }),
  fetch('env.json').then(r => r.ok ? r.json() : null).then(j => { ENV = j; }).catch(() => {}),
  new Promise(r => { LOGO.onload = r; LOGO.onerror = r; }), ...Object.values(IMG).map(im => new Promise(r => { if (im.complete) r(); im.onload = r; im.onerror = r; })), new Promise(r => { LOGOW.onload = r; LOGOW.onerror = r; }),
  document.fonts.load('500 40px Obvia'), document.fonts.load('700 40px Obvia'), document.fonts.load('600 40px Obvia'),
  document.fonts.load('500 40px "IBM Plex Sans"'), document.fonts.load('600 40px "IBM Plex Sans"'), document.fonts.load('500 12px "IBM Plex Mono"')
]).then(() => document.fonts.ready).then(() => { buildTrail(); window.FILM = { W, H, DUR }; });
if (!navigator.webdriver) window.filmReady.then(() => { const t0 = performance.now(); const loop = () => { const t = ((performance.now() - t0) / 1000 + (+(qs.get('t') || 0))) % DUR; window.renderFrame(t); requestAnimationFrame(loop); }; loop(); });
})();
