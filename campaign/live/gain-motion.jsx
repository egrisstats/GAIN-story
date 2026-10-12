const { CompositionStage, useComposition, TweaksPanel, TweakSection, TweakToggle, TweakSlider, TweakRadio, TweakSelect, useTweaks } = window;

// Reusable 2D motion library for the eLearning cast. One rig per pose template (p22 = clerk pose, p67 = visitor pose);
// every recolour of a template shares its rig. Clips are written in semantic channels (raise / abduct / lean / nod…),
// mapped to each rig with per-template signs and an "arms down" calibration, so any clip plays on any character.
const GM_THREE = window.__threeP || (window.__threeP = new Promise((res, rej) => {
  if (window.THREE && window.THREE.GLTFLoader && window.THREE.SkeletonUtils) return res(window.THREE);
  const add = src => new Promise((r, j) => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = j; document.head.appendChild(s); });
  add('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js')
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/geometries/RoundedBoxGeometry.js'))
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/environments/RoomEnvironment.js'))
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js'))
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/utils/SkeletonUtils.js'))
    .then(() => res(window.THREE), rej);
}));
const gcl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const gss = (a, b, x) => { const t = gcl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const gbump = (T, t0, d) => (T > t0 && T < t0 + d ? Math.sin(Math.PI * (T - t0) / d) : 0);
const gblink = (T, t0) => { const u = T - t0; return u < 0 || u > 0.2 ? 0 : u < 0.06 ? gss(0, 0.06, u) : 1 - gss(0.06, 0.2, u); };
const gg2 = (x, y, [cx, cy, sx, sy]) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
const ghash = (i, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
function gherm(T, ks) {
  const n = ks.length;
  if (T <= ks[0][0]) return ks[0][1]; if (T >= ks[n - 1][0]) return ks[n - 1][1];
  let i = 0; while (T >= ks[i + 1][0]) i++;
  const tan = j => { if (j === 0 || j === n - 1) return 0; const a = ks[j - 1][1], p = ks[j][1], b = ks[j + 1][1]; if (Math.abs(a - p) < 1e-6 || Math.abs(p - b) < 1e-6 || (p - a) * (b - p) < 0) return 0; return 0.85 * (b - a) / (ks[j + 1][0] - ks[j - 1][0]); };
  const t0 = ks[i][0], h = ks[i + 1][0] - t0, u = (T - t0) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * ks[i][1] + (u3 - 2 * u2 + u) * h * tan(i) + (-2 * u3 + 3 * u2) * ks[i + 1][1] + (u3 - u2) * h * tan(i + 1);
}
const gmImg = src => new Promise((r, j) => { const im = new Image(); im.onload = () => r(im); im.onerror = j; im.src = src; });

// ---------------- rig templates (source px, y down) ----------------
const P67_FA = [[0, 225], [96, 225], [110, 290], [150, 318], [176, 342], [180, 392], [140, 392], [0, 330]];
const P67_FB = [[342, 195], [436, 195], [436, 292], [376, 296], [378, 382], [352, 392], [338, 378], [338, 300]];
const SL22A = [[24, 236], [60, 230], [68, 262], [72, 300], [63, 340], [56, 376], [74, 388], [62, 414], [32, 420], [6, 410], [2, 340], [6, 280], [14, 250]];
const SL22B = [[202, 236], [216, 232], [236, 252], [252, 300], [262, 338], [296, 346], [296, 418], [250, 414], [210, 402], [196, 386], [199, 330], [200, 290], [201, 262]];
const SL67A = [[150, 226], [194, 226], [194, 262], [190, 300], [189, 338], [182, 344], [176, 342], [150, 318], [146, 290], [148, 250]];
const SL67B = [[306, 226], [342, 226], [342, 262], [340, 300], [338, 300], [338, 378], [326, 386], [318, 370], [316, 336], [312, 300], [308, 262]];
const K22A = [[48, 236], [60, 230], [68, 262], [72, 300], [63, 340], [56, 376], [74, 388], [66, 404], [48, 398], [46, 378], [50, 340], [58, 300], [56, 262]], K22B = [[200, 236], [214, 236], [214, 262], [213, 300], [212, 340], [216, 384], [226, 404], [212, 404], [196, 388], [199, 330], [200, 290], [201, 262]];
const K67A = [[178, 230], [194, 226], [194, 262], [190, 300], [189, 338], [182, 344], [176, 300], [178, 262]], K67B = [[306, 226], [322, 230], [324, 262], [326, 300], [326, 380], [318, 370], [316, 336], [312, 300], [308, 262]];
const GM_RIGS = {
  p22: {
    files: ['base', 'cuff', 'rf', 'rh', 'lf', 'lh'], legFrom: ['base'], feet: 872, cx: 145, waist: 508, hipY: 535, knee: 695, legLen: 310,
    mid: y => (y < 600 ? 143 : 143 - (y - 600) * 0.012), crotch: [[124, 548], [168, 548], [160, 580], [146, 590], [132, 580]], trouserBox: [60, 560, 110, 620],
    bones: { pelvis: [140, 520], spine: [140, 505], chest: [140, 385], neck: [140, 236], head: [146, 206], armA: [44, 246], foreA: [38, 420], handA: [118, 441], armB: [214, 248], foreB: [242, 376], handB: [318, 322], thighL: [140, 566], shinL: [90, 695], thighR: [150, 566], shinR: [170, 695] },
    abMax: 32, sign: { abA: 1, abB: -1, upA: -1, upB: -1 }, down: { armA: 0, foreA: 78, handA: 0, armB: -4, foreB: 118, handB: 8 },
    layers: [
      { from: ['base'], z: 3, mask: (x, y) => y < 508 && ((!inPoly(x, y, SL22A) && !inPoly(x, y, SL22B)) || inPoly(x, y, K22A) || inPoly(x, y, K22B)), step: 4, w: (x, y) => { const head = gss(230, 205, y), neck = gss(254, 232, y) * (1 - head);
          const armA = 0, armB = 0;
          const pel = gss(470, 505, y), rest = Math.max(0, 1 - head - neck - armA - armB), ch = gss(470, 330, y);
          return { head, neck, armA, armB, pelvis: rest * pel, chest: rest * (1 - pel) * ch, spine: rest * (1 - pel) * (1 - ch) }; } },
      { from: ['base'], z: 4, mask: (x, y) => inPoly(x, y, SL22A), step: 3, box: [0, 226, 100, 440], w: (x, y) => { const a = gss(238, 266, y); return { armA: a, chest: 1 - a }; } },
      { from: ['base'], z: 5, mask: (x, y) => inPoly(x, y, SL22B), step: 3, box: [190, 226, 300, 422], w: (x, y) => { const a = gss(240, 268, y); return { armB: a, chest: 1 - a }; } },
      { from: ['lf', 'lh'], z: 6, step: 3, box: [20, 395, 200, 480], w: (x, y) => { const fo = gss(12, 38, (x - 38) * 0.975 + (y - 420) * 0.22), h = gss(-6, 8, (x - 118) * 0.975 + (y - 441) * 0.22); return { armA: 1 - fo, foreA: fo * (1 - h), handA: fo * h }; } },
      { from: ['rf', 'rh'], z: 7, step: 3, box: [225, 255, 377, 400], w: (x, y) => { const fo = gss(14, 40, (x - 242) * 0.81 - (y - 376) * 0.58), h = gss(-6, 8, (x - 318) * 0.81 - (y - 322) * 0.58); return { armB: 1 - fo, foreB: fo * (1 - h), handB: fo * h }; } },
      { from: ['cuff'], z: 8, step: 3, box: [0, 330, 377, 460], w: x => (x < 120 ? { armA: 1 } : { armB: 1 }) },
    ],
    face: { region: [60, 60, 170, 150], eyes: [[121, 109.5, 17.5, 8.5], [180.5, 107.5, 14.5, 7.5]], lidMix: [[116, 129], [184, 124]],
      brows: [[122, 87, 20, 6], [185, 84, 15, 6]], center: [150, 125, 50, 58], back: [72, 95, 28, 60], jaw: [150, 185, 38, 40], jawY: [158, 176],
      pupils: [[122, 109, 6, 5], [180, 107, 5, 4.5]], mouth: { kind: 'man', cx: 153, top: 158, hw: 14, patch: [153, 167, 27, 12], skinAt: [140, 160] } },
  },
  p67: {
    files: [], legFrom: ['src'], feet: 862, cx: 252, waist: 440, hipY: 475, knee: 660, legLen: 355,
    mid: () => 250, crotch: [[228, 490], [272, 490], [266, 520], [250, 532], [234, 520]], trouserBox: [205, 500, 245, 560], clean: [[292, 515, 340, 620]], cut: [[[331, 512], [350, 512], [350, 600], [308, 600], [312, 588]]],
    caps: [['armA', 162, 360, 19, [145, 345, 172, 368]], ['armB', 350, 364, 19, [338, 345, 366, 368]], ['armA', 170, 320, 15, [158, 300, 182, 340]], ['armB', 340, 324, 15, [328, 304, 352, 344]]],
    bones: { pelvis: [252, 455], spine: [252, 440], chest: [252, 320], neck: [250, 226], head: [250, 200], armA: [178, 234], foreA: [162, 362], handA: [88, 287], armB: [322, 234], foreB: [352, 372], handB: [366, 266], thighL: [246, 512], shinL: [222, 660], thighR: [254, 512], shinR: [268, 660] },
    abMax: 24, sign: { abA: 1, abB: -1, upA: 1, upB: -1 }, down: { armA: 2, foreA: -132, handA: 20, armB: -2, foreB: 158, handB: -35 },
    layers: [
      { from: ['src'], z: 3, mask: (x, y) => y < 440 && !inPoly(x, y, P67_FA) && !inPoly(x, y, P67_FB) && ((!inPoly(x, y, SL67A) && !inPoly(x, y, SL67B)) || inPoly(x, y, K67A) || inPoly(x, y, K67B)), step: 4, w: (x, y) => { const m = gss(180, 200, x) * (1 - gss(305, 320, x)), head = gss(232, 196, y) * (1 + (m - 1) * gss(190, 205, y)), neck = gss(250, 228, y) * m * (1 - head);
          const armA = 0, armB = 0, pel = gss(400, 438, y), rest = Math.max(0, 1 - head - neck - armA - armB), ch = gss(420, 300, y);
          return { head, neck, armA, armB, pelvis: rest * pel, chest: rest * (1 - pel) * ch, spine: rest * (1 - pel) * (1 - ch) }; } },
      { from: ['src'], z: 4, mask: (x, y) => inPoly(x, y, SL67A), step: 3, box: [130, 220, 205, 392], w: (x, y) => { const a = gss(232, 258, y); return { armA: a, chest: 1 - a }; } },
      { from: ['src'], z: 4, mask: (x, y) => inPoly(x, y, SL67B), step: 3, box: [295, 220, 350, 392], w: (x, y) => { const a = gss(232, 258, y); return { armB: a, chest: 1 - a }; } },
      { from: ['src'], z: 6, mask: (x, y) => inPoly(x, y, P67_FA), step: 3, box: [0, 220, 185, 396], w: (x, y) => { const h = gss(-4, 10, (x - 90) * -0.623 + (y - 287) * -0.783); return { foreA: 1 - h, handA: h }; } },
      { from: ['src'], z: 7, mask: (x, y) => inPoly(x, y, P67_FB), step: 3, box: [334, 190, 436, 396], w: (x, y) => { const h = gss(-4, 10, (x - 366) * 0.222 + (y - 266) * -0.975); return { foreB: 1 - h, handB: h }; } },
    ],
    face: { region: [170, 60, 160, 140], eyes: [[231, 111, 15, 7.5], [279, 110, 14, 7.5]], lidAt: [[231, 127], [279, 126]],
      brows: [[222, 94, 18, 5], [282, 94, 18, 5]], center: [252, 122, 52, 58], back: null, jaw: [250, 188, 40, 36], jawY: [162, 180],
      pupils: [[232, 111, 5.5, 5], [280, 110, 5.5, 5]], mouth: { kind: 'lips', cx: 247, top: 162, hw: 22, patch: [247, 167, 33, 14], skinAt: [247, 186], lipAt: [236, 171] } },
  },
};
const GM_LOOKS = { p22: 'p22', ex2: 'p22', ex3: 'p22', ex7: 'p22h', p67: 'p67', ex4: 'p67', ex5: 'p67', ex6: 'p67' };
GM_RIGS.p22h = Object.assign({}, GM_RIGS.p22, { face: { region: [80, 46, 150, 170], eyes: [[130, 97, 14, 6], [186.5, 97, 14.5, 6]], lidMix: [[130, 109], [186, 108]], brows: [[129, 82, 20, 6], [186, 81, 16, 6]], center: [158, 121, 52, 60], back: [92, 101, 26, 50], jaw: [160, 174, 36, 34], jawY: [153, 171], pupils: [[130, 97, 5, 4.5], [186, 97, 5, 4.5]], mouth: { kind: 'man', cx: 161, top: 152, hw: 18, patch: [161, 160, 26, 10], skinAt: [176, 178] } } });

// ---------------- puppet ----------------
const GM_BONES = ['ground', 'pelvis', 'spine', 'chest', 'neck', 'head', 'armA', 'foreA', 'handA', 'armB', 'foreB', 'handB', 'thighL', 'shinL', 'thighR', 'shinR'];
const GM_PAR = { ground: null, pelvis: 'ground', spine: 'pelvis', chest: 'spine', neck: 'chest', head: 'neck', armA: 'chest', foreA: 'armA', handA: 'foreA', armB: 'chest', foreB: 'armB', handB: 'foreB', thighL: 'pelvis', shinL: 'thighL', thighR: 'pelvis', shinR: 'thighR' };
function gmPuppet(THREE, scene, rig, imgs, ro) {
  const IW = imgs.src.width, IH = imgs.src.height;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const pixOf = (...ims) => { const c = cv(IW, IH), x = c.getContext('2d'); ims.forEach(im => x.drawImage(im, 0, 0)); return x.getImageData(0, 0, IW, IH).data; };
  const tex = data => { const d = new Uint8ClampedArray(data), f = new Uint8Array(IW * IH);
    for (let i = 0; i < f.length; i++) f[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    for (let it = 0; it < 4; it++) { const nf = f.slice(); for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const q = y * IW + x; if (f[q]) continue; let r = 0, g = 0, b = 0, n = 0;
      if (x > 0 && f[q - 1]) { r += d[q * 4 - 4]; g += d[q * 4 - 3]; b += d[q * 4 - 2]; n++; } if (x < IW - 1 && f[q + 1]) { r += d[q * 4 + 4]; g += d[q * 4 + 5]; b += d[q * 4 + 6]; n++; }
      if (y > 0 && f[q - IW]) { const j = (q - IW) * 4; r += d[j]; g += d[j + 1]; b += d[j + 2]; n++; } if (y < IH - 1 && f[q + IW]) { const j = (q + IW) * 4; r += d[j]; g += d[j + 1]; b += d[j + 2]; n++; }
      if (n) { d[q * 4] = r / n; d[q * 4 + 1] = g / n; d[q * 4 + 2] = b / n; nf[q] = 1; } } f.set(nf); }
    const o = new Uint8Array(d.length), row = IW * 4; for (let y = 0; y < IH; y++) o.set(d.subarray((IH - 1 - y) * row, (IH - y) * row), y * row);
    const t = new THREE.DataTexture(o, IW, IH, THREE.RGBAFormat); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; };
  const src = pixOf(imgs.src), rgbAt = ([x, y]) => { const i = (y * IW + x) * 4; return [src[i], src[i + 1], src[i + 2]]; };
  if (rig.clean) { const c = cv(IW, IH), x = c.getContext('2d'); x.drawImage(imgs.src, 0, 0); const id = x.getImageData(0, 0, IW, IH), d = id.data;
    for (const [x0, y0, x1, y1] of rig.clean) for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) { const i = (y * IW + xx) * 4; if (d[i + 3] > 0 && (d[i + 3] < 230 || d[i] + d[i + 1] > 200)) d[i + 3] = 0; }
    if (rig.cut) for (let y = 0; y < IH; y++) for (let xx = 0; xx < IW; xx++) if (rig.cut.some(P => inPoly(xx, y, P))) d[(y * IW + xx) * 4 + 3] = 0;
    x.putImageData(id, 0, 0); imgs.src = c; }
  // crotch patch: a pelvis-attached copy of the trouser top, revealed when the legs part
  if (!rig.noLegs) { const c = cv(IW, IH), x = c.getContext('2d'); x.beginPath(); rig.crotch.forEach(([a, bb], i) => (i ? x.lineTo(a, bb) : x.moveTo(a, bb))); x.closePath(); const [bx0, by0, bx1, by1] = rig.trouserBox; let r = 0, g = 0, b = 0, n = 0; for (let y = by0; y < by1; y++) for (let xx = bx0; xx < bx1; xx++) { const i = (y * IW + xx) * 4; if (src[i + 3] > 250) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; } }
    x.fillStyle = `rgb(${Math.round(r / n * 0.8)},${Math.round(g / n * 0.8)},${Math.round(b / n * 0.8)})`; x.fill(); imgs.crotch = c; }
  // inseam follows the real gap between the drawn legs, so no edge pixels travel with the wrong leg
  const midRow = new Float32Array(IH); if (!rig.noLegs) for (let y = 0; y < IH; y++) { const m0 = rig.mid(y); midRow[y] = m0; if (y < rig.waist + 60) continue; let best = 0, bc = m0;
    let seenOpaque = false; for (let x = Math.round(m0 - 26), run = 0; x <= m0 + 26; x++) { const a = src[(y * IW + x) * 4 + 3]; if (a < 100) run++; else { if (seenOpaque && run >= 2 && run > best) { best = run; bc = x - 1 - (run - 1) / 2; } run = 0; seenOpaque = true; } }
    if (best >= 2) midRow[y] = bc; else midRow[y] = NaN; }
  if (!rig.noLegs) { let yd = -1; for (let y = rig.waist + 60; y < IH; y++) if (!isNaN(midRow[y])) { yd = y; break; } const cd = yd > 0 ? midRow[yd] : 0;
    for (let y = 0; y < IH; y++) { const m0 = rig.mid(y); if (yd < 0) { midRow[y] = m0; continue; } if (y < yd) midRow[y] = m0 + (cd - m0) * gcl((y - (yd - 70)) / 70); else if (isNaN(midRow[y])) midRow[y] = midRow[y - 1]; } }

  const B = {}; GM_BONES.forEach(n => { const p = rig.bones[n] || [0, 0]; B[n] = { px: p[0], py: p[1], rot: 0, sx: 1, sy: 1, tx: 0, ty: 0, m: [1, 0, 0, 1, 0, 0] }; });
  const BI = Object.fromEntries(GM_BONES.map((n, i) => [n, i]));
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const solve = () => GM_BONES.forEach(n => { const b = B[n], r = b.rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), L = [c * b.sx, s * b.sx, -s * b.sy, c * b.sy, 0, 0];
    L[4] = b.px + b.tx - (L[0] * b.px + L[2] * b.py); L[5] = b.py + b.ty - (L[1] * b.px + L[3] * b.py); b.m = GM_PAR[n] ? mul(B[GM_PAR[n]].m, L) : L; });

  const FC = rig.face, fs = (FC && FC.scale) || 1, F = { turn: 0, pitch: 0, brow: 0, jaw: 0, gaze: 0 };
  function warp(x, y, out) {
    const d = gg2(x, y, FC.center), back = FC.back ? gg2(x, y, FC.back) : 0;
    let dx = F.turn * (d - 0.45 * back), dy = F.pitch * d;
    for (const b of FC.brows) dy -= F.brow * gg2(x, y, b);
    if (y > FC.jawY[0] - 8 && y < FC.jaw[1] + 30) dy += F.jaw * gss(FC.jawY[0], FC.jawY[1], y) * gg2(x, y, FC.jaw);
    for (const p of FC.pupils) dx += F.gaze * gg2(x, y, p);
    out[0] = x + dx; out[1] = y + dy;
  }
  const layers = [], grp = new THREE.Group(); scene.add(grp);
  function mesh(alphaOf, wfn, order, step, [x0, y0, x1, y1], map, uvFn, premul) {
    const nx = Math.ceil((x1 - x0) / step), ny = Math.ceil((y1 - y0) / step), idx = new Int32Array((nx + 1) * (ny + 1)).fill(-1), rest = [], tris = [];
    const vid = (i, j) => { const k = j * (nx + 1) + i; if (idx[k] < 0) { idx[k] = rest.length / 2; rest.push(Math.min(x1, x0 + i * step), Math.min(y1, y0 + j * step)); } return idx[k]; };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const cx = x0 + i * step, cy = y0 + j * step; let any = false;
      for (let a = -1; a <= step + 1 && !any; a += 2) for (let b = -1; b <= step + 1 && !any; b += 2) if (alphaOf(cx + a, cy + b) > 0) any = true;
      if (!any) continue; const p = vid(i, j), q = vid(i + 1, j), r = vid(i, j + 1), s = vid(i + 1, j + 1); tris.push(p, r, q, q, r, s); }
    const n = rest.length / 2, bi = new Uint8Array(n * 4), bw = new Float32Array(n * 4), hw = new Float32Array(n), uv = new Float32Array(n * 2);
    for (let v = 0; v < n; v++) { const x = rest[v * 2], y = rest[v * 2 + 1], ws = wfn(x, y); let k = 0, sum = 0;
      for (const [b, w] of Object.entries(ws)) if (w > 1e-4 && k < 4) { bi[v * 4 + k] = BI[b]; bw[v * 4 + k] = w; sum += w; k++; }
      for (let q = 0; q < k; q++) bw[v * 4 + q] /= sum || 1; hw[v] = ws.head || 0; uvFn(x, y, uv, v); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(tris);
    const mt = new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    if (premul) Object.assign(mt, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
    const m = new THREE.Mesh(geo, mt); m.renderOrder = order; m.frustumCulled = false; grp.add(m);
    layers.push({ geo, rest: new Float32Array(rest), bi, bw, hw, n, face: premul });
  }
  const uvImg = (x, y, uv, v) => { uv[v * 2] = x / IW; uv[v * 2 + 1] = 1 - y / IH; };
  const addLayer = (from, mask, w, order, step, box, legs, fill) => { const d = pixOf(...from.map(k => imgs[k])); if (mask) for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const i = (y * IW + x) * 4; if (!mask(x, y) || (legs && d[i + 3] < 250 && d[i] + d[i + 1] > 260)) d[i + 3] = 0; }
    if (fill) for (const [poly, [bx0, by0, bx1, by1]] of fill) { let r = 0, g = 0, b = 0, n = 0; for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) { const i = (y * IW + x) * 4; if (src[i + 3] > 250) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; } }
      for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) if (inPoly(x, y, poly)) { const i = (y * IW + x) * 4; if (d[i + 3] < 250) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; d[i + 3] = 255; } } }
    mesh((x, y) => d[(Math.min(IH - 1, Math.max(0, y)) * IW + Math.min(IW - 1, Math.max(0, x))) * 4 + 3], w, order, step, box || [0, 0, IW, IH], tex(d), uvImg, false); };
  // legs: two layers split on the inseam, thigh/shin blended at the knee; a trouser patch fills the crotch when they part
  const legW = s => (x, y) => { const k = gss(rig.knee - 28, rig.knee + 28, y), p = gss(rig.waist, rig.hipY + 20, y); return { pelvis: 1 - p, ['thigh' + s]: p * (1 - k), ['shin' + s]: p * k }; };
  if (!rig.noLegs) { addLayer(['crotch'], (x, y) => inPoly(x, y, rig.crotch), () => ({ pelvis: 1 }), ro, 4, [90, rig.waist - 14, 310, rig.waist + 160]);
  addLayer(rig.legFrom, (x, y) => y >= rig.waist - 2 && x >= midRow[y], legW('R'), ro + 1, 4, [0, rig.waist - 4, IW, IH], true);
  addLayer(rig.legFrom, (x, y) => y >= rig.waist - 2 && x < midRow[y], legW('L'), ro + 2, 4, [0, rig.waist - 4, IW, IH], true); }
  rig.layers.forEach((L, i) => addLayer(L.from, L.mask, L.w, ro + (L.z || 3 + i), L.step, L.box, false, L.fill));
  if (rig.caps) { const c = cv(IW, IH), x = c.getContext('2d'); rig.caps.forEach(([bn, ex, ey, r, [x0, y0, x1, y1]]) => { let R = 0, G = 0, Bc = 0, n = 0; for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) { const i = (y * IW + xx) * 4; if (src[i + 3] > 250) { R += src[i]; G += src[i + 1]; Bc += src[i + 2]; n++; } } x.fillStyle = `rgb(${Math.round(R / n)},${Math.round(G / n)},${Math.round(Bc / n)})`; x.beginPath(); x.arc(ex, ey, r, 0, Math.PI * 2); x.fill(); }); imgs.caps = c;
    addLayer(['caps'], null, (xx) => (xx < rig.cx ? { armA: 1 } : { armB: 1 }), ro + 5, 3, [120, 320, 400, 410]); }
  const [FX0, FY0, FW, FH] = FC ? FC.region : [0, 0, 1, 1], FS = FC ? Math.max(1, Math.min(3, 900 / Math.max(FC.region[2], FC.region[3]))) : 1, fcv = cv(FW * FS, FH * FS), fc = fcv.getContext('2d'), ftex = new THREE.CanvasTexture(fcv); ftex.premultiplyAlpha = true;
  if (FC) mesh(() => 255, () => ({ head: 1 }), ro + 9, 3, [FX0, FY0, FX0 + FW, FY0 + FH], ftex, (x, y, uv, v) => { uv[v * 2] = (x - FX0) / FW; uv[v * 2 + 1] = 1 - (y - FY0) / FH; }, true);
  const mixG = ([r, g, b]) => `rgb(${Math.round(r * 0.6 + 60)},${Math.round(g * 0.6 + 56)},${Math.round(b * 0.6 + 54)})`;
  const lids = !FC ? [] : FC.lidMix ? FC.lidMix.map(p => mixG(rgbAt(p))) : FC.lidAt.map(p => `rgb(${rgbAt(p).join(',')})`), MO = FC && FC.mouth, mSkin = MO ? rgbAt(MO.skinAt).join(',') : '', lipC = MO && MO.lipAt ? `rgb(${rgbAt(MO.lipAt).join(',')})` : '#6b2d20';
  let fKey = '';
  function drawFace(lid, open, wide) {
    if (!FC) return;
    const k = `${Math.round(lid * 40)}|${Math.round(open * 40)}|${Math.round(wide * 20)}`; if (k === fKey) return; fKey = k;
    fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, fcv.width, fcv.height); fc.setTransform(FS, 0, 0, FS, -FX0 * FS, -FY0 * FS);
    const u = fs;
    if (lid > 0.02) FC.eyes.forEach(([cx, cy, rx, ry], i) => { const yl = cy - ry - u + (2 * ry + 2 * u) * lid, sag = (3.5 * (1 - lid) + 1) * u * (FC.sag || 1);
      fc.save(); fc.beginPath(); fc.ellipse(cx, cy, rx + 1.5 * u, ry + 1.5 * u, 0, 0, Math.PI * 2); fc.clip();
      fc.fillStyle = lids[i]; fc.beginPath(); fc.moveTo(cx - rx - 3 * u, cy - ry - 3 * u); fc.lineTo(cx + rx + 3 * u, cy - ry - 3 * u); fc.lineTo(cx + rx + 3 * u, yl); fc.quadraticCurveTo(cx, yl + sag, cx - rx - 3 * u, yl); fc.closePath(); fc.fill();
      if (lid > 0.12) { fc.strokeStyle = '#1c1210'; fc.lineWidth = 2.1 * u; fc.beginPath(); fc.moveTo(cx - rx, yl); fc.quadraticCurveTo(cx, yl + sag, cx + rx, yl); fc.stroke(); }
      fc.restore(); });
    if (open > 0.08) { const cx = MO.cx, hw = MO.hw * (0.92 + 0.22 * wide), top = MO.top, h = (2.5 + (MO.kind === 'lips' ? 9 : 10) * open) * u, [px, py, prx, pry] = MO.patch;
      const pg = fc.createRadialGradient(px, py, 4 * u, px, py, prx); pg.addColorStop(0, `rgba(${mSkin},1)`); pg.addColorStop(0.64, `rgba(${mSkin},1)`); pg.addColorStop(1, `rgba(${mSkin},0)`);
      fc.fillStyle = pg; fc.beginPath(); fc.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2); fc.fill();
      const lipW = (MO.kind === 'lips' ? 4.2 : 2.4) * u;
      fc.beginPath(); fc.moveTo(cx - hw, top + u); fc.quadraticCurveTo(cx, top - 1.5 * u, cx + hw, top + u); fc.quadraticCurveTo(cx + hw * 0.6, top + h + 2 * u, cx, top + h + 2.5 * u); fc.quadraticCurveTo(cx - hw * 0.6, top + h + 2 * u, cx - hw, top + u); fc.closePath();
      fc.fillStyle = '#3f1a14'; fc.fill(); fc.save(); fc.clip(); fc.fillStyle = '#fbf6ee'; fc.fillRect(cx - hw, top - 3 * u, hw * 2, 3 * u + Math.min(3.8 * u, h * 0.42));
      if (h > 6 * u) { fc.fillStyle = '#a2424a'; fc.beginPath(); fc.ellipse(cx + u, top + h + 2 * u, hw * 0.55, h * 0.38, 0, 0, Math.PI * 2); fc.fill(); } fc.restore();
      fc.strokeStyle = lipC; fc.lineCap = 'round'; fc.lineWidth = lipW; fc.beginPath(); fc.moveTo(cx - hw + u, top + 2 * u); fc.quadraticCurveTo(cx - hw * 0.6, top + h + 2.4 * u + lipW * 0.3, cx, top + h + 3 * u + lipW * 0.35); fc.quadraticCurveTo(cx + hw * 0.6, top + h + 2.4 * u + lipW * 0.3, cx + hw - u, top + 2 * u); fc.stroke();
      fc.lineWidth = lipW * 0.88; fc.beginPath(); fc.moveTo(cx - hw - u, top + 0.5 * u); fc.quadraticCurveTo(cx - hw * 0.4, top - 2.6 * u, cx - 3 * u, top - 1.2 * u); fc.quadraticCurveTo(cx, top - 0.4 * u, cx + 3 * u, top - 1.2 * u); fc.quadraticCurveTo(cx + hw * 0.4, top - 2.6 * u, cx + hw + u, top + 0.5 * u); fc.stroke(); }
    ftex.needsUpdate = true;
  }
  const sg = rig.sign || { abA: 1, abB: -1, upA: 1, upB: -1 }, dn = rig.down || { armA: 0, foreA: 0, handA: 0, armB: 0, foreB: 0, handB: 0 }, tmp = [0, 0];
  const armRots = P => ({ foreA: sg.upA * P.upA + P.down * dn.foreA, foreB: sg.upB * P.upB + P.down * dn.foreB });
  return {
    rig,
    update(P, Plag, place, cam) {
      B.pelvis.tx = P.sway; B.pelvis.ty = P.bob; B.pelvis.rot = -P.sway * 0.12 + P.hip;
      B.spine.rot = P.spine + P.lean; B.chest.rot = P.chest + 0.25 * P.br; B.chest.sy = 1 + 0.005 * P.br; B.chest.ty = P.cbob;
      B.neck.rot = P.neck; B.head.rot = P.head; B.head.ty = P.nod * 2.4 * fs; const hs = P.headS || 1; B.head.sx = hs; B.head.sy = hs * (1 - 0.012 * P.nod);
      const R = armRots(P), RL = armRots(Plag);
      B.armA.rot = sg.abA * gcl(P.abA, -(rig.abMax || 0), rig.abMax || 0) + P.down * dn.armA + P.swA; B.armA.ty = -0.8 * P.br - P.shA; B.foreA.rot = R.foreA; B.handA.rot = sg.upA * P.hA + P.down * dn.handA + 0.65 * (RL.foreA - R.foreA);
      B.armB.rot = sg.abB * gcl(P.abB, -(rig.abMax || 0), rig.abMax || 0) + P.down * dn.armB + P.swB; B.armB.ty = -0.8 * P.br - P.shB; B.foreB.rot = R.foreB; B.handB.rot = sg.upB * P.hB + P.down * dn.handB + 0.65 * (RL.foreB - R.foreB);
      B.thighL.rot = P.thL; B.shinL.rot = P.snL; B.thighR.rot = P.thR; B.shinR.rot = P.snR;
      solve(); F.turn = P.turn * fs; F.pitch = P.nod * 3 * fs; F.brow = P.brow * fs; F.jaw = P.open * 3.2 * fs; F.gaze = P.gaze * fs * (FC && FC.gazeK || 1);
      drawFace(P.lid, P.open, P.wide);
      const { x: ox, y: oy, s, flip } = place, { z, fx, fy } = cam;
      for (const L of layers) { const pos = L.geo.attributes.position.array;
        for (let v = 0; v < L.n; v++) { let x = L.rest[v * 2], y = L.rest[v * 2 + 1]; const hw = L.face ? 1 : L.hw[v];
          if (hw > 0.001 && FC) { warp(x, y, tmp); x += (tmp[0] - x) * hw; y += (tmp[1] - y) * hw; }
          let X = 0, Y = 0; for (let q = 0; q < 4; q++) { const w = L.bw[v * 4 + q]; if (!w) continue; const m = B[GM_BONES[L.bi[v * 4 + q]]].m; X += w * (m[0] * x + m[2] * y + m[4]); Y += w * (m[1] * x + m[3] * y + m[5]); }
          const sx = ox + flip * (X - rig.cx) * s, sy = oy + (Y - rig.feet) * s;
          pos[v * 3] = fx + (sx - fx) * z; pos[v * 3 + 1] = -(fy + (sy - fy) * z); pos[v * 3 + 2] = 0; }
        L.geo.attributes.position.needsUpdate = true; }
    },
  };
}

// ---------------- motion library (semantic channels; u = seconds into the clip) ----------------
const GM_CH = ['sway', 'spine', 'chest', 'neck', 'head', 'turn', 'brow', 'abA', 'upA', 'hA', 'abB', 'upB', 'hB', 'shA', 'shB', 'down', 'bob', 'cbob', 'lean', 'talk', 'gaze', 'nod', 'hip'];
const beat = (u, f, ph) => Math.pow(Math.max(0, Math.sin(u * Math.PI * 2 * f + ph + 0.8 * Math.sin(u * 3.1 + ph))), 3);
const GM_CLIPS = {
  stand: () => ({}),
  relax: () => ({ down: 1 }),
  talk: (u, d, o) => { const b1 = beat(u, 1.7, 0), b2 = beat(u, 1.3, 1.9), b3 = beat(u, 2.1, 3.3);
    return { upB: 13 * b1 - 2, hB: 8 * b2 - 2, upA: 9 * b3 - 1, hA: 5 * b1, abB: 5 + 16 * b1 + 4 * b2 + 2 * Math.sin(u * 1.3), abA: 3 + 12 * b3 + 3 * b2, shB: 3 * b1, shA: 2.2 * b3, head: 3 * Math.sin(u * 2.3) + 2.5 * b2, brow: 1 + 1.6 * b1, talk: 1, lean: 1.2, chest: -0.8 * b3, spine: 0.6 * Math.sin(u * 0.9), cbob: -1.2 * b1 }; },
  listen: (u) => { const nod = gbump(u, 0.5, 0.42) + gbump(u, 1.65, 0.4) + gbump(u, 2.7, 0.42) + gbump(u, 3.8, 0.4);
    return { down: 0.45, lean: 2.2, nod, head: 2.5 + 1.5 * Math.sin(u * 0.9), brow: 0.6 + 0.6 * gbump(u, 1.2, 0.8), upA: 2 * Math.sin(u * 0.7), spine: 0.8 }; },
  wave: (u, d) => { const e = gss(0, 0.3, u) * (1 - gss(d - 0.3, d, u)), w = Math.sin(u * Math.PI * 2 * 2.3);
    return { abB: 34 * e + 4 * w * e, upB: 12 * e + 13 * w * e, hB: 16 * Math.sin(u * Math.PI * 2 * 2.3 - 0.9) * e, shB: 6 * e, brow: 2.4 * e, head: (3 + 2 * w) * e, turn: 1.5 * e, chest: -1 * e, down: 0 }; },
  shrug: (u, d) => { const e = gss(0, 0.25, u) * (1 - gss(d - 0.35, d, u));
    return { shA: 9 * e, shB: 9 * e, upA: 14 * e, upB: 14 * e, abA: 18 * e, abB: 18 * e, head: 7 * e, neck: -2 * e, brow: 3.2 * e, talk: 0.5 * e, cbob: -2 * e }; },
  point: (u, d) => { const e = gss(0, 0.35, u) * (1 - gss(d - 0.35, d, u)), b = beat(u, 1.6, 0.4);
    return { abB: 36 * e + 3 * b, upB: 18 * e + 5 * b, hB: -8 * e, shB: 4 * e, turn: 3.5 * e, head: 3 * e, lean: 2.5 * e, brow: 1.8 * e, talk: 0.8 * e, spine: 1.2 * e, down: 0.35 * e, gaze: 1 * e }; },
  think: (u, d) => { const e = gss(0, 0.4, u) * (1 - gss(d - 0.4, d, u));
    return { down: 0.55 * e, head: -6 * e, neck: -1.5 * e, gaze: -1.6 * e, turn: -2 * e, brow: 1.8 * e, sway: 3 * Math.sin(u * 1.4) * e, spine: -1 * e, upA: 6 * e }; },
  cheer: (u, d) => { const e = gss(0, 0.2, u) * (1 - gss(d - 0.3, d, u)), h = gbump(u, 0.12, 0.42) + 0.7 * gbump(u, 0.62, 0.38);
    return { bob: -30 * h, upA: 30 * e, upB: 30 * e, abA: 36 * e, abB: 36 * e, shA: 7 * e, shB: 7 * e, brow: 3 * e, head: -3 * h, talk: 0.7 * e, cbob: 3 * h }; },
};

// ---------------- performance: a visitor arrives at the registration point ----------------
const GM_D = 16;
const GM_CAST = [
  { id: 'clerk', look: 'p22', s: 1, ph: 0,
    X: [[0, -260], [2.9, 650], [13.1, 650], [15.6, -320], [16, -320]], F: [[0, 1], [13.0, 1], [13.3, -1], [16, -1]],
    clips: [[0, 2.9, 'relax'], [2.9, 3.5, 'stand'], [3.5, 4.7, 'wave'], [4.7, 7.6, 'talk'], [7.6, 9.0, 'listen'], [9.0, 10.0, 'think'], [10.0, 11.3, 'point'], [11.3, 12.4, 'talk'], [12.4, 13.1, 'wave'], [13.1, 16, 'relax']] },
  { id: 'visitor', look: 'p67', s: 0.93, ph: 1.3,
    X: [[0, 2180], [2.7, 1270], [12.9, 1270], [15.5, 2260], [16, 2260]], F: [[0, -1], [12.75, -1], [13.05, 1], [16, 1]],
    clips: [[0, 2.7, 'relax'], [2.7, 3.0, 'stand'], [3.0, 4.3, 'wave'], [4.3, 7.6, 'listen'], [7.6, 9.0, 'talk'], [9.0, 10.0, 'shrug'], [10.0, 11.3, 'listen'], [11.3, 12.5, 'cheer'], [12.5, 12.9, 'stand'], [12.9, 16, 'relax']] },
];
const GM_FADE = 0.36;
function gmClipPose(ch, T, amp) {
  const P = Object.fromEntries(GM_CH.map(k => [k, 0])); let ws = 0;
  for (const [s, e, name] of ch.clips) { const w = gss(s - GM_FADE / 2, s + GM_FADE / 2, T) * (1 - gss(e - GM_FADE / 2, e + GM_FADE / 2, T)); if (w <= 0) continue; ws += w; const c = GM_CLIPS[name](T - s, e - s);
    for (const k in c) P[k] += w * c[k]; }
  if (ws > 0 && ws < 1) for (const k of GM_CH) P[k] /= Math.max(ws, 0.5);
  for (const k of ['abA', 'upA', 'hA', 'abB', 'upB', 'hB', 'spine', 'lean']) P[k] *= amp;
  P.down = gcl(P.down); return P;
}
function gmPose(ch, T, amp, legLen, scale) {
  const P = gmClipPose(ch, T, amp), t2 = T + ch.ph;
  // root motion drives the walk: phase from distance travelled, amplitude from speed
  const x = gherm(T, ch.X), v = (gherm(Math.min(GM_D, T + 0.03), ch.X) - gherm(Math.max(0, T - 0.03), ch.X)) / 0.06, f = gherm(T, ch.F);
  let dist = 0; for (let i = 0; i < ch.X.length - 1; i++) { const [ta, xa] = ch.X[i], [tb, xb] = ch.X[i + 1]; if (T >= tb) dist += Math.abs(xb - xa); else { if (T > ta) dist += Math.abs(x - xa); break; } }
  const amt = gcl(Math.abs(v) / 230), A = 15 * amt, step = 2 * legLen * Math.sin(15 * Math.PI / 180) * scale, ph = Math.PI * dist / step, sp = Math.sin(ph), cp = Math.cos(ph), dir = Math.sign(v * f) || 1;
  P.thL = -dir * A * sp; P.thR = dir * A * sp; P.snL = dir * 26 * amt * Math.pow(Math.max(0, cp), 1.4); P.snR = dir * 26 * amt * Math.pow(Math.max(0, -cp), 1.4);
  P.bob += legLen * (1 - Math.cos(A * Math.abs(sp) * Math.PI / 180)); P.hip = 1.2 * amt * sp * dir; P.chest += -1.2 * amt * sp;
  P.down = gcl(P.down + amt); P.swA = dir * 10 * amt * sp; P.swB = -dir * 10 * amt * sp; P.lean += 2.5 * amt * dir; P.turn += 1.5 * amt; P.head += 1.2 * amt * Math.sin(ph * 2);
  // turning round: a small hop as the drawing flips
  const turnHop = Math.max(0, 1 - Math.abs(f)); P.bob -= 14 * turnHop;
  // life: breath, blinks, saccades, speech
  P.br = Math.sin(t2 * Math.PI * 2 / (GM_D / 4)); P.sway += 1.5 * Math.sin(t2 * 0.8) * (1 - amt);
  const syl = gcl(0.55 + 0.45 * Math.sin(t2 * 14.3 + 1.7 * Math.sin(t2 * 3.7))) * (0.5 + 0.5 * Math.max(0, Math.sin(t2 * 4.1 + 0.6)));
  P.open = gcl(P.talk) * syl; P.wide = 0.5 + 0.5 * Math.sin(t2 * 7.3); P.head += P.talk * 1.4 * Math.sin(t2 * 5.3); P.brow += P.talk * syl * 0.8; P.cbob += -P.talk * 1.2 * Math.max(0, Math.sin(t2 * 9));
  const bl = Array.from({ length: 6 }, (_, i) => i * (GM_D / 6) + ghash(i, ch.ph * 10 + 3) * 1.4);
  P.lid = Math.max(...bl.map(t => gblink(T, t)), P.nod * 0.35, 0.5 * turnHop);
  const sac = Math.floor(t2 * 2.6); P.gaze += ((sac * 7919) % 5 - 2) * 0.35 + 1.2 * (1 - amt * 0.4);
  return { P, x, f };
}

function MotionPiece({ amp, looks }) {
  const { T } = useComposition();
  const cvRef = React.useRef(null), world = React.useRef(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { let dead = false;
    const need = []; GM_CAST.forEach((c, i) => { const look = looks[i], rig = GM_LOOKS[look]; need.push(['src:' + i, 'assets/avatars2/' + look + '.png']); GM_RIGS[rig].files.forEach(k => need.push([k + ':' + i, `assets/avatars2/rig/${look}-${k}.png`])); });
    Promise.all([GM_THREE, ...need.map(([, u]) => gmImg(u))]).then(([THREE, ...ims]) => { if (dead || !cvRef.current) return;
      const renderer = new THREE.WebGLRenderer({ canvas: cvRef.current, antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(1920, 1080, false); renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(0, 1920, 0, -1080, -10, 10), byKey = Object.fromEntries(need.map(([k], i) => [k, ims[i]]));
      const pups = GM_CAST.map((c, i) => { const rig = GM_RIGS[GM_LOOKS[looks[i]]], imgs = { src: byKey['src:' + i] }; rig.files.forEach(k => (imgs[k] = byKey[k + ':' + i])); return gmPuppet(THREE, scene, rig, imgs, i * 20); });
      world.current = { renderer, scene, camera, pups }; setReady(true); }).catch(e => console.error('motion load failed', e));
    return () => { dead = true; }; }, []);
  const FLOOR = 1000, Tc = gcl(T, 0, GM_D), cam = { z: 1 + 0.03 * (1 - Math.cos(Tc * Math.PI * 2 / GM_D)) / 2, fx: 960, fy: 560 };
  const S = GM_CAST.map(c => ({ x: gherm(Tc, c.X), f: gherm(Tc, c.F), bob: 0 }));
  if (ready && world.current) { const W = world.current;
    GM_CAST.forEach((c, i) => { const pp = W.pups[i], r = pp.rig, a = gmPose(c, Tc, amp, r.legLen, c.s), b = gmPose(c, Math.max(0, Tc - 0.1), amp, r.legLen, c.s); S[i].bob = a.P.bob;
      pp.update(a.P, b.P, { x: a.x, y: FLOOR, s: c.s, flip: (a.f < 0 ? -1 : 1) * Math.max(0.2, Math.abs(a.f)) }, cam); });
    W.renderer.render(W.scene, W.camera); }
  const PJ = (x, y) => [cam.fx + (x - cam.fx) * cam.z, cam.fy + (y - cam.fy) * cam.z], floorY = PJ(0, 905)[1];
  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, background: '#eef3fa', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: floorY, bottom: 0, background: '#e4ebf5' }}></div>
      {GM_CAST.map((c, i) => { const [x, y] = PJ(S[i].x, FLOOR), lift = gcl(-S[i].bob / 40), w = 270 * c.s * cam.z * (1 - 0.3 * lift); return <div key={c.id} style={{ position: 'absolute', left: x - w / 2, top: y - 20 * cam.z, width: w, height: 40 * cam.z, opacity: 1 - 0.5 * lift, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(20,35,76,0.22), rgba(20,35,76,0))' }}></div>; })}
      <canvas ref={cvRef} width={1920} height={1080} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 22px "IBM Plex Mono", monospace', color: '#5a6884' }}>Loading…</div>}
    </div>
  );
}

function GainMotion() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const looks = [t.clerkLook, t.visitorLook];
  return (
    <>
      <CompositionStage width={1920} height={1080} bg="#eef3fa" scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <MotionPiece key={looks.join('|')} amp={t.gesture / 100} looks={looks} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={x => setTweak('motionEditor', x)} />
        <TweakSection label="Cast" />
        <TweakRadio label="Clerk" value={t.clerkLook} options={['p22', 'ex2', 'ex3']} onChange={x => setTweak('clerkLook', x)} />
        <TweakRadio label="Visitor" value={t.visitorLook} options={['p67', 'ex4', 'ex5', 'ex6']} onChange={x => setTweak('visitorLook', x)} />
        <TweakSection label="Acting" />
        <TweakSlider label="Gesture size" value={t.gesture} min={40} max={160} step={5} unit="%" onChange={x => setTweak('gesture', x)} />
      </TweaksPanel>
    </>
  );
}
window.GainMotion = GainMotion;

// ---- shared exports for other films ----
function gmWalk(P, amt, ph, dir, legLen) {
  const A = 15 * amt, sp = Math.sin(ph), cp = Math.cos(ph);
  P.thL = -dir * A * sp; P.thR = dir * A * sp; P.snL = dir * 26 * amt * Math.pow(Math.max(0, cp), 1.4); P.snR = dir * 26 * amt * Math.pow(Math.max(0, -cp), 1.4);
  P.bob += legLen * (1 - Math.cos(A * Math.abs(sp) * Math.PI / 180)); P.hip = 1.2 * amt * sp * dir; P.chest += -1.2 * amt * sp;
  P.down = gcl(P.down + amt); P.swA = dir * 10 * amt * sp; P.swB = -dir * 10 * amt * sp; P.lean += 2.5 * amt * dir; P.turn += 1.5 * amt; P.head += 1.2 * amt * Math.sin(ph * 2);
}
function gmLife(P, T, ph, amt = 0) {
  const t2 = T + ph; P.br = Math.sin(t2 * Math.PI * 2 / 4); P.sway += 1.5 * Math.sin(t2 * 0.8) * (1 - amt);
  const syl = gcl(0.55 + 0.45 * Math.sin(t2 * 14.3 + 1.7 * Math.sin(t2 * 3.7))) * (0.5 + 0.5 * Math.max(0, Math.sin(t2 * 4.1 + 0.6)));
  P.open = gcl(P.talk) * syl; P.wide = 0.5 + 0.5 * Math.sin(t2 * 7.3); P.head += P.talk * 1.4 * Math.sin(t2 * 5.3); P.brow += P.talk * syl * 0.8; P.cbob += -P.talk * 1.2 * Math.max(0, Math.sin(t2 * 9));
  const k = Math.floor(t2 / 3.1); let lid = 0; for (let j = k - 1; j <= k + 1; j++) lid = Math.max(lid, gblink(t2, j * 3.1 + ghash(j, 7) * 1.6));
  P.lid = Math.max(lid, P.nod * 0.35);
  const sac = Math.floor(t2 * 2.6); P.gaze += ((sac * 7919) % 5 - 2) * 0.35 + 1.2 * (1 - amt * 0.4);
}
// ---- auto rigs: head-and-shoulders busts (landmarks refined from pixels) and back views ----
const GM_BUSTS = { // eyes [x,y] and mouth [x,y] as fractions; chin, neck as y fractions
  b12: { eL: [0.42, 0.24], eR: [0.64, 0.24], m: [0.53, 0.37], chin: 0.45, neck: 0.52 }, b19: { eL: [0.42, 0.31], eR: [0.65, 0.31], m: [0.54, 0.465], chin: 0.6, neck: 0.68 },
  b25: { eL: [0.38, 0.33], eR: [0.62, 0.33], m: [0.5, 0.49], chin: 0.58, neck: 0.64 }, b27: { eL: [0.43, 0.37], eR: [0.69, 0.365], E: [[151.5, 168.5, 23.5, 9.5], [243.5, 166.5, 22.5, 9.5]], m: [0.565, 0.6], chin: 0.67, neck: 0.74, pin: 1 },
  b28: { eL: [0.36, 0.39], eR: [0.6, 0.39], m: [0.48, 0.6], chin: 0.72, neck: 0.8, lips: 1 }, b29: { eL: [0.36, 0.28], eR: [0.5, 0.28], m: [0.43, 0.47], chin: 0.55, neck: 0.61 },
  p52: { eL: [0.531, 0.12], eR: [0.648, 0.121], E: [[206, 105, 16, 7], [252, 106, 15, 7]], lidAt: [[206, 128], [252, 129]], m: [0.569, 0.176], chin: 0.225, neck: 0.248, pin: 1 },
  b30: { eL: [0.43, 0.3], eR: [0.62, 0.3], m: [0.53, 0.47], chin: 0.55, neck: 0.6 },
};
function gmBustRig(id, im) {
  const L = GM_BUSTS[id]; if (!L) return null; const W = im.width, H = im.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, W, H).data;
  const px = (X, Y) => { const i = (Math.round(Y) * W + Math.round(X)) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }, lum = p => (p[0] + p[1] + p[2]) / 3;
  const eye = ([fx, fy]) => { const cx = fx * W, cy = fy * H, wx = 0.07 * W, wy = 0.035 * H; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, sx = 0, sy = 0, n = 0;
    for (let Y = cy - wy; Y < cy + wy; Y++) for (let X = cx - wx; X < cx + wx; X++) { const p = px(X, Y); if (p[3] < 200) continue; const l = lum(p), sat = Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]); if (l > 175 && sat < 55) { x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); sx += X; sy += Y; n++; } }
    const fb = [cx, cy, 0.05 * W, 0.02 * H]; if (n < 6) return fb; const ex = (x0 + x1) / 2, ey = (y0 + y1) / 2; if (Math.abs(ey - cy) > 0.018 * H || Math.abs(ex - cx) > 0.04 * W || (y1 - y0) > 0.05 * H) return fb; return [ex, ey, Math.max(6, (x1 - x0) / 2 + 2), Math.max(4, (y1 - y0) / 2 + 2)]; };
  const eA = L.E ? L.E[0] : eye(L.eL), eB = L.E ? L.E[1] : eye(L.eR), es = Math.abs(eB[0] - eA[0]);
  const skin = px((eA[0] + eB[0]) / 2, (eA[1] + L.m[1] * H) / 2), sl = lum(skin);
  let mx = L.m[0] * W, my = L.m[1] * H, best = 0, bx0 = mx - es * 0.3, bx1 = mx + es * 0.3;
  if (!L.pin) for (let Y = my - 0.03 * H; Y < my + 0.03 * H; Y++) { let n = 0, a = 1e9, b = -1e9; for (let X = mx - es * 0.32; X < mx + es * 0.32; X++) { const p = px(X, Y); if (p[3] > 200 && lum(p) < sl - 32) { n++; a = Math.min(a, X); b = Math.max(b, X); } } if (n > best) { best = n; my = Y; bx0 = a; bx1 = b; } }
  if (best > 4) mx = (bx0 + bx1) / 2; const hw = Math.max(es * 0.22, Math.min(es * 0.45, (bx1 - bx0) / 2)), u = es / 60;
  const chin = L.chin * H, neck = L.neck * H, cx = W / 2, fy0 = Math.max(0, Math.min(eA[1], eB[1]) - es * 0.9), fy1 = Math.min(H, chin + es * 0.2), fx0 = Math.max(0, Math.min(eA[0], eB[0]) - es * 0.8), fx1 = Math.min(W, Math.max(eA[0], eB[0]) + es * 0.8);
  const lidAt = L.lidAt || [eA, eB].map(e => [Math.round(e[0]), Math.round(e[1] + e[3] + es * 0.16)]);
  return { files: [], noLegs: true, feet: H, cx, legLen: 300,
    bones: { pelvis: [cx, H], spine: [cx, H], chest: [cx, H], neck: [mx, neck], head: [mx, chin] },
    layers: [{ from: ['src'], step: Math.max(4, Math.round(W / 90)), w: (X, Y) => { const h = gss(neck, chin - es * 0.15, Y), n2 = gss(neck + es * 0.4, neck, Y) * (1 - h); return { head: h, neck: n2, chest: Math.max(0, 1 - h - n2) }; } }],
    face: { scale: u, sag: 0.8, region: [fx0, fy0, fx1 - fx0, fy1 - fy0], eyes: [eA, eB], lidAt,
      brows: [eA, eB].map(e => [e[0], e[1] - es * 0.32, es * 0.3, es * 0.1]), center: [(eA[0] + eB[0]) / 2, (eA[1] + my) / 2, es * 1.1, (my - eA[1]) * 1.6 + es * 0.4], back: null,
      jaw: [mx, (my + chin) / 2, hw * 2.2, (chin - my) * 1.2], jawY: [my, my + (chin - my) * 0.6], pupils: [eA, eB].map(e => [e[0], e[1], e[2] * 0.35, e[3] * 0.6]), gazeK: 0.6,
      mouth: { kind: L.lips ? 'lips' : 'man', cx: mx, top: my - 2 * u, hw, patch: [mx, my + 4 * u, hw * 1.8, es * 0.22], skinAt: [Math.round(mx), Math.round(my + es * 0.38)], lipAt: L.lips ? [Math.round(mx - hw * 0.4), Math.round(my + 5 * u)] : null } } };
}
function gmBackRig(im) {
  const W = im.width, H = im.height, cx = W / 2, f = y => y * H;
  return { files: [], noLegs: true, feet: H - 6, cx, legLen: 300,
    bones: { pelvis: [cx, f(0.6)], spine: [cx, f(0.58)], chest: [cx, f(0.42)], neck: [cx, f(0.25)], head: [cx, f(0.22)] },
    layers: [{ from: ['src'], step: 7, w: (X, Y) => { const head = gss(f(0.26), f(0.21), Y), neck = gss(f(0.29), f(0.25), Y) * (1 - head), legs = gss(f(0.57), f(0.66), Y), t = gcl((Y - f(0.66)) / (f(0.97) - f(0.66)));
      const rest = Math.max(0, 1 - head - neck - legs), ch = gss(f(0.55), f(0.38), Y); return { head, neck, pelvis: legs * (1 - t), ground: legs * t, chest: rest * ch, spine: rest * (1 - ch) }; } }], face: null };
}
window.GM = { bustRig: gmBustRig, backRig: gmBackRig, RIGS: GM_RIGS, LOOKS: GM_LOOKS, puppet: gmPuppet, CLIPS: GM_CLIPS, walk: gmWalk, life: gmLife, ss: gss };
