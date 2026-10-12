const { CompositionStage, useComposition, Easing, TweaksPanel, TweakSection, TweakToggle, TweakText, useTweaks } = window;

const C = { bg: '#eef3fa', plinth: '#dde8f5', paper: '#f7fafd', white: '#ffffff', navy: '#14234C', deep: '#072D62', blue: '#3B71B9', teal: '#4CC3C9', tealDeep: '#3d9ea4', sky: '#cfe0f4', mid: '#5b7db3', strong: '#b9c7dc', ink: '#1d2940', muted: '#5a6884', line: '#d9e2ef', ground: '#0a1430', mud: '#c9bba6', sand: '#e9dfd0', leaf: '#5fb8a6', puddle: '#9fb6d3', screen: '#1f3a70' };
const SKIN = ['#8d5a3b', '#c68b59', '#e3b98f', '#5c3a24', '#a86b48'];
const HAIR = ['#1d1a1a', '#3b2a20', '#2a2233'];
const HEAD = "'Obvia', 'Figtree', sans-serif", MONO = "'IBM Plex Mono', monospace", BODY = "'IBM Plex Sans', sans-serif";
const RULE = 'linear-gradient(90deg, #4cc3c9, rgba(76,195,201,0))';
function cubicBezier(x1, y1, x2, y2) {
  const bx = t => ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t, by = t => ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t;
  const dx = t => 3 * (1 - 3 * x2 + 3 * x1) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (bx(t) - x) / d; } return by(Math.min(1, Math.max(0, t))); };
}
const M = { enter: cubicBezier(0.2, 0, 0.1, 1), move: cubicBezier(0.65, 0, 0.35, 1), fade: cubicBezier(0.37, 0, 0.63, 1) };
const prog = (T, s, e, ease) => e <= s ? (T >= s ? 1 : 0) : ease(Math.min(1, Math.max(0, (T - s) / (e - s))));
const tw = (T, a, b, s, e, ease) => a + (b - a) * prog(T, s, e, ease);
const cl = v => Math.min(1, Math.max(0, v));
const mixHex = (a, b, f) => { const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
const hash = (i, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- load three.js (classic build, includes RoundedBoxGeometry) ----------
const SKYC = [[0, '#eef3fa'], [22, '#eef3fa'], [30, '#e1e6f1'], [36, '#c1c9de'], [40.5, '#8592b6'], [44.5, '#33447a'], [46.2, '#0a1430']];
const EXPO = [[0, 1], [26, 1], [34, 0.93], [40, 0.82], [44, 0.7], [49.99, 0.62], [50, 0.74]];
const rampN = (st, T) => { if (T <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) if (T < st[i][0]) { const f = (T - st[i - 1][0]) / (st[i][0] - st[i - 1][0]); return st[i - 1][1] + (st[i][1] - st[i - 1][1]) * f; } return st[st.length - 1][1]; };
const rampC = (st, T) => { if (T <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) if (T < st[i][0]) return mixHex(st[i - 1][1], st[i][1], (T - st[i - 1][0]) / (st[i][0] - st[i - 1][0])); return st[st.length - 1][1]; };
const THREE_P = window.__threeP || (window.__threeP = new Promise((res, rej) => {
  if (window.THREE && window.THREE.GLTFLoader && window.THREE.SkeletonUtils) return res(window.THREE);
  const add = src => new Promise((r, j) => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = j; document.head.appendChild(s); });
  add('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js')
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/geometries/RoundedBoxGeometry.js'))
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/environments/RoomEnvironment.js'))
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js'))
    .then(() => add('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/utils/SkeletonUtils.js'))
    .then(() => res(window.THREE), rej);
}));
const DATA_P = Promise.all(['assets/bdf389090d13a90c6c8dc9e4a5c402e4.json', 'assets/327ec8f9d9b25a43bb01173c45375b10.json'].map(u => fetch(u).then(r => r.json())));
const FONTS_P = Promise.all(['500 40px Obvia', '400 30px "IBM Plex Sans"', '600 30px "IBM Plex Sans"', '500 24px "IBM Plex Mono"'].map(f => document.fonts.load(f).catch(() => null)));

// world layout: one diorama per beat
const P = { rain: [0, 0, 0], door: [14, 0, -1], clerk: [28, 0, 0], family: [42, 0, -1], desk: [56, 0, 0], report: [68, 0, 7], annual: [80, 0, 1], call: [92, 0, 7], train: [93, 0, 21], hall: [105, 0, 1], map: [54, 0, -34] };
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const MODEL_IDS = ['nature/tent_detailedOpen', 'nature/tent_smallClosed', 'survival/tent-canvas', 'survival/campfire-pit', 'survival/barrel', 'survival/bedroll-packed', 'survival/bucket', 'nature/log_stack', 'furniture/chairDesk', 'furniture/pottedPlant', 'furniture/bookcaseClosedWide', 'furniture/lampSquareFloor', 'furniture/books', 'furniture/speaker'];
const loadModels = THREE => { const LD = new THREE.GLTFLoader(); return Promise.all(MODEL_IDS.map(id => new Promise(r => LD.load('assets/models/' + id + '.glb', g => r([id.split('/')[1], { scene: g.scene, anims: g.animations }]), undefined, () => r([id.split('/')[1], null]))))).then(e => Object.fromEntries(e.filter(x => x[1]))); };
function buildWorld(THREE, canvas, W, H, data, AVT, MOD, PIMG, COV = {}) {
  const MODS = MOD || {}, MIX = [];
  const HSLt = {};
  function recolor(c) { c.getHSL(HSLt); const { h, s: sat, l } = HSLt; if (sat < 0.3) return; const hd = h * 360;
    const to = hd < 18 || hd >= 330 ? '#e7ddcc' : hd < 45 ? '#cdb994' : hd < 70 ? '#f3f6fa' : hd < 170 ? '#5fb8a6' : hd < 250 ? '#3B71B9' : '#5b7db3';
    const t = new THREE.Color(to); t.getHSL(HSLt); c.setHSL(HSLt.h, HSLt.s, Math.min(0.93, HSLt.l * 0.92 + l * 0.08)); }
  function prop(p, name, pos, ry = 0, h = 1, flat) {
    const src = MODS[name], g = G(p, pos); g.rotation.y = ry; if (!src) return g;
    const rig = src.anims && src.anims.length ? THREE.SkeletonUtils.clone(src.scene) : src.scene.clone(true);
    rig.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; const mt = m.material = m.material.clone(); if (mt.map && flat) { mt.map = null; mt.color.set(flat); } else if (mt.map) { mt.map.encoding = THREE.LinearEncoding; mt.color.set('#dfe7f1'); } else if (mt.color) recolor(mt.color); mt.envMapIntensity = 0.35; mt.needsUpdate = true; } });
    const bb = new THREE.Box3().setFromObject(rig), hh = (bb.max.y - bb.min.y) || 1, sc = h / hh;
    rig.scale.setScalar(sc); rig.position.set(-(bb.min.x + bb.max.x) / 2 * sc, -bb.min.y * sc, -(bb.min.z + bb.max.z) / 2 * sc); g.add(rig);
    if (src.anims && src.anims.length) { const mx = new THREE.AnimationMixer(rig), clip = src.anims.find(a => /idle/i.test(a.name)) || src.anims[0]; mx.clipAction(clip).play(); MIX.push([mx, clip.duration, (MIX.length * 0.37) % clip.duration]); }
    return g;
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.setClearColor(C.bg); renderer.toneMapping = THREE.LinearToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(C.bg, 60, 90); scene.fog = fog; let PORT = false;
  const camera = new THREE.PerspectiveCamera(22, W / H, 0.5, 600);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9c7dc', 0.2));
  const sun = new THREE.DirectionalLight('#fff8ee', 0.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 7; sun.shadow.blurSamples = 16;
  const fill = new THREE.DirectionalLight('#dbe8ff', 0.18); fill.position.set(-30, 20, 10); scene.add(fill);
  scene.add(sun); scene.add(sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.3; ground.receiveShadow = true; scene.add(ground);

  const mats = {};
  const mat = (c, rough = 0.88) => mats[c + rough] || (mats[c + rough] = new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, envMapIntensity: 0.3 }));
  const sh = m => { m.castShadow = m.receiveShadow = true; return m; };
  const G = (p, pos = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...pos); p && p.add(g); return g; };
  const box = (p, [x, y, z], [w, h, d], c, r = 0.06, rough) => { const rr = Math.min(Math.max(r, Math.min(w, h, d) * 0.22), 0.16, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002); const m = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(w, h, d, 4, Math.max(0.001, rr)), mat(c, rough))); m.position.set(x, y + h / 2, z); p.add(m); return m; };
  const sph = (p, [x, y, z], r, c, sx = 1, sy = 1, sz = 1, rough) => { const m = sh(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), mat(c, rough))); m.position.set(x, y, z); m.scale.set(sx, sy, sz); p.add(m); return m; };
  const cap = (p, [x, y, z], r, len, c) => { const m = sh(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat(c))); m.position.set(x, y, z); p.add(m); return m; };
  const cyl = (p, [x, y, z], rt, rb, h, c, seg = 28, rough) => { const m = sh(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c, rough))); m.position.set(x, y + h / 2, z); p.add(m); return m; };
  const cone = (p, [x, y, z], r, h, c, seg = 4) => { const m = sh(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c))); m.position.set(x, y + h / 2, z); if (seg === 4) m.rotation.y = Math.PI / 4; p.add(m); return m; };
  const ctex = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8; return { ctx: cv.getContext('2d'), tex, key: null, draw(key, fn) { if (key === this.key) return; this.key = key; fn(this.ctx, w, h); tex.needsUpdate = true; } }; };
  const plane = (p, [x, y, z], w, h, tex, lit = false) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, envMapIntensity: 0.1 }) : new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(x, y, z); m.receiveShadow = lit; p.add(m); return m; };
  const rr = (ctx, x, y, w, h, r, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); } };
  const lines = (ctx, x, y, w, n, gap, h, c, p = 1, seed = 1) => { for (let i = 0; i < n; i++) { const f = cl(p * n - i); if (f > 0) rr(ctx, x, y + i * gap, w * (0.55 + 0.45 * hash(i + seed, 3)) * f, h, h / 2, c); } };
  const plinth = (p, w, d, c = C.plinth) => { box(p, [0, -0.3, 0], [w - 0.18, 0.2, d - 0.18], '#c3d0e2', 0.06); box(p, [0, -0.13, 0], [w, 0.13, d], c, 0.05); };
  const FL = {};
  const drawFloor = (c, w, h, kind) => {
    if (kind === 'wood') { c.fillStyle = '#e8dcc8'; c.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let k = -1; k < 3; k++) { const x = k * 256 + (r % 2) * 128, sh = hash(r * 5 + k, 3); c.fillStyle = sh > 0.66 ? '#e3d5bf' : sh > 0.33 ? '#ebe0ce' : '#e6d9c4'; c.fillRect(x + 2, r * 64 + 2, 252, 60); } c.fillStyle = '#d4c3a8'; for (let r = 0; r <= 8; r++) c.fillRect(0, r * 64 - 1, w, 2); }
    else if (kind === 'tile') { c.fillStyle = '#e8edf4'; c.fillRect(0, 0, w, h); c.fillStyle = '#d4dce8'; for (let i = 0; i <= 4; i++) { c.fillRect(i * 128 - 2, 0, 4, h); c.fillRect(0, i * 128 - 2, w, 4); } }
    else if (kind === 'carpet') { c.fillStyle = '#d5deeb'; c.fillRect(0, 0, w, h); c.fillStyle = '#cbd5e4'; for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) c.fillRect(x, y, 4, 4); }
    else if (kind === 'grid') { c.fillStyle = '#f1f4f9'; c.fillRect(0, 0, w, h); c.fillStyle = '#e2e8f1'; for (let i = 0; i <= 16; i++) { c.fillRect(i * 32, 0, 1, h); c.fillRect(0, i * 32, w, 1); } c.fillStyle = '#d5deea'; for (let i = 0; i <= 4; i++) { c.fillRect(i * 128 - 1, 0, 2, h); c.fillRect(0, i * 128 - 1, w, 2); } }
    else if (kind === 'earth') { c.fillStyle = '#d9cdb5'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const x = hash(i, 81) * w, y = hash(i, 82) * h, r = 30 + hash(i, 83) * 90, dk = hash(i, 84) > 0.5; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const g2 = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g2.addColorStop(0, dk ? 'rgba(158,136,102,0.22)' : 'rgba(242,234,218,0.35)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } }
      for (let i = 0; i < 2600; i++) { const v = hash(i, 85); c.fillStyle = v > 0.6 ? 'rgba(120,100,75,0.25)' : v > 0.3 ? 'rgba(250,245,235,0.35)' : 'rgba(170,150,120,0.3)'; c.fillRect(hash(i, 86) * w, hash(i, 87) * h, 1 + hash(i, 88) * 2, 1 + hash(i, 89) * 2); }
      for (let i = 0; i < 160; i++) { const x = hash(i, 90) * w, y = hash(i, 91) * h, r = 1.5 + hash(i, 92) * 3.5; c.fillStyle = 'rgba(110,95,78,0.45)'; c.beginPath(); c.ellipse(x + 1, y + 1, r, r * 0.75, 0, 0, 7); c.fill(); c.fillStyle = hash(i, 93) > 0.5 ? '#e8e1d3' : '#c9bfae'; c.beginPath(); c.ellipse(x, y, r, r * 0.75, 0, 0, 7); c.fill(); } }
    else { c.fillStyle = '#e7e0d4'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = hash(i, 2) > 0.5 ? '#dad1c2' : '#efe9df'; c.beginPath(); c.arc(hash(i, 3) * w, hash(i, 4) * h, 1.5 + hash(i, 5) * 3, 0, 7); c.fill(); } }
  };
  function floorP(s, fw, fd, kind) {
    if (!FL[kind]) { const t = ctex(512, 512); t.draw('x', (c, w, h) => drawFloor(c, w, h, kind)); t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping; FL[kind] = t.tex; }
    const tex = FL[kind].clone(); tex.needsUpdate = true; tex.repeat.set(fw / 2.5, fd / 2.5);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(fw - 0.24, fd - 0.24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, envMapIntensity: 0.15 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.receiveShadow = true; s.add(m);
  }
  const WINS = [];
  const SKY = ctex(512, 512);
  SKY.draw('x', (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe0f4'); g.addColorStop(1, '#f2f6fb'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 11; i++) { const bw = 40 + hash(i, 6) * 60, bh = 110 + hash(i, 7) * 230, x = i * 48 - 20 + hash(i, 8) * 20; c.fillStyle = i % 2 ? '#dce6f2' : '#d2ddeb'; c.fillRect(x, h - bh, bw, bh); c.fillStyle = '#e9eff7'; for (let y = h - bh + 14; y < h - 10; y += 22) for (let xx = x + 8; xx < x + bw - 10; xx += 16) c.fillRect(xx, y, 7, 10); } });
  const POSTER = ctex(400, 520);
  POSTER.draw('x', (c, w, h) => { c.fillStyle = C.white; c.fillRect(0, 0, w, h); c.fillStyle = C.teal; c.fillRect(36, 44, 70, 6); c.fillStyle = C.navy; c.fillRect(36, 70, 220, 18); c.fillRect(36, 100, 150, 18); [0.55, 0.8, 0.4, 0.95, 0.68].forEach((v, i) => { c.fillStyle = i === 3 ? C.teal : C.blue; c.fillRect(44 + i * 64, 460 - 280 * v, 40, 280 * v); }); c.fillStyle = C.strong; c.fillRect(36, 462, 328, 3); });
  function winB(s, x, y, w, h, zf) {
    WINS.push(plane(s, [x, y + h / 2, zf + 0.004], w, h, SKY.tex));
    const t = 0.07, dz = zf;
    box(s, [x, y - t, dz], [w + t * 2, t, 0.07], C.white, 0.02); box(s, [x, y + h, dz], [w + t * 2, t, 0.07], C.white, 0.02);
    box(s, [x - w / 2 - t / 2, y, dz], [t, h, 0.07], C.white, 0.02); box(s, [x + w / 2 + t / 2, y, dz], [t, h, 0.07], C.white, 0.02);
    box(s, [x, y, dz], [0.04, h, 0.045], C.white, 0.01); box(s, [x, y + h * 0.62, dz], [w, 0.04, 0.045], C.white, 0.01);
    box(s, [x, y - t - 0.05, zf + 0.06], [w + 0.34, 0.06, 0.2], C.white, 0.02);
  }
  function artB(s, x, y, w, h, zf) { box(s, [x, y, zf + 0.01], [w + 0.08, h + 0.08, 0.04], C.navy, 0.015); plane(s, [x, y + 0.04 + h / 2, zf + 0.035], w, h, POSTER.tex, true); }
  function wallB(s, x, z, w, h, o = {}) {
    const zf = z + 0.1;
    box(s, [x, 0, z], [w, h, 0.2], o.wall || '#f3f6fa', 0.03);
    box(s, [x, h, z], [w + 0.06, 0.08, 0.28], C.white, 0.03);
    box(s, [x, 0, zf], [w - 0.02, 0.9, 0.03], o.wain || '#e2e9f3', 0.01);
    box(s, [x, 0.9, zf], [w - 0.02, 0.05, 0.07], o.rail || C.white, 0.015);
    box(s, [x, 0, zf + 0.02], [w - 0.02, 0.13, 0.05], o.skirt || C.navy, 0.015);
    (o.win || []).forEach(([wx, wy, ww, wh]) => winB(s, x + wx, wy, ww, wh, zf + 0.02));
    (o.art || []).forEach(([ax, ay, aw, ah]) => artB(s, x + ax, ay, aw, ah, zf + 0.02));
  }
  function wallL(s, x, z, d, h) {
    box(s, [x, 0, z], [0.2, h, d], '#eaf0f7', 0.03); box(s, [x, h, z], [0.28, 0.08, d + 0.06], C.white, 0.03);
    box(s, [x + 0.115, 0, z], [0.03, 0.9, d - 0.02], '#dde5f0', 0.01); box(s, [x + 0.12, 0.9, z], [0.07, 0.05, d - 0.02], C.white, 0.015); box(s, [x + 0.13, 0, z], [0.05, 0.13, d - 0.02], C.navy, 0.015);
  }

  const AV = [];
  const blobTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); const g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(20,35,76,0.42)'); g.addColorStop(1, 'rgba(20,35,76,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
  function avatar(p, pos, ids, h = 1.85, flip = false) {
    ids = [].concat(ids);
    const g = G(p, pos), rig = G(g), poses = {};
    ids.forEach((id, i) => { const tx = AVT[id], w = h * tx.image.width / tx.image.height; const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tx, transparent: true, alphaTest: 0.05, opacity: i ? 0 : 1 })); if (flip) m.scale.x = -1; m.visible = i === 0; rig.add(m); poses[id] = m; });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.62, h * 0.24), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    b.rotation.x = -Math.PI / 2; b.position.y = 0.012; g.add(b);
    const a = { g, rig, m: poses[ids[0]], b, poses, ids, h, i: AV.length, fade: 1, w: null }; AV.push(a); return a;
  }
  function poseAt(a, T, sched) { if (a.pup) { let ci = 0; sched.forEach(([t], i) => { if (T >= t) ci = i; }); if (sched[ci][1] !== sched[0][1]) a.pup.gest = [sched[ci][0], ci + 1 < sched.length ? sched[ci + 1][0] : sched[ci][0] + 2.5]; return; } let ci = 0; sched.forEach(([t], i) => { if (T >= t) ci = i; }); const cur = sched[ci][1], prev = ci ? sched[ci - 1][1] : null, f = ci ? (T >= sched[ci][0] + 0.04 ? 1 : 0) : 1; a.w = {}; a.w[cur] = f; if (prev && prev !== cur) a.w[prev] = 1 - f; else a.w[cur] = 1; }
  const aHop = (a, T, t0, hh = 0.14, dur = 0.5) => { const p = (T - t0) / dur; if (p > 0 && p < 1) { const k = Math.sin(Math.PI * p); a.rig.position.y += hh * k; a.rig.scale.y *= 1 + 0.035 * k; } };
  const aNod = (a, T, t0, dur = 0.5) => { const p = (T - t0) / dur; if (p > 0 && p < 1) { const k = Math.sin(Math.PI * p); if (a.pup) { a.pup.nod += k; return; } a.rig.scale.y *= 1 - 0.03 * k; a.rig.rotation.x -= 0.06 * k; } };
  const aWalk = (a, T, k) => { if (k <= 0) return; if (a.pup) { a.pup.walkK = Math.max(a.pup.walkK, k); return; } a.rig.position.y += Math.abs(Math.sin(T * 7.5)) * 0.07 * k; a.rig.rotation.z += Math.sin(T * 7.5) * 0.05 * k; };
  const aTalk = (a, T, on) => { if (a.pup) { if (on) a.pup.talkOn = 1; return; } if (on) { a.rig.position.y += Math.max(0, Math.sin(T * 9)) * 0.025; a.rig.rotation.z += Math.sin(T * 4.5) * 0.012; } };
  function bubble(a, kind) {
    const t = ctex(256, 232);
    t.draw('x', (c, w, h) => { c.clearRect(0, 0, w, h); c.save(); c.shadowColor = 'rgba(20,35,76,0.22)'; c.shadowBlur = 16; c.shadowOffsetY = 6; rr(c, 16, 10, 224, 168, 26, C.white); c.restore();
      c.save(); c.beginPath(); c.roundRect(16, 10, 224, 168, 26); c.clip(); c.fillStyle = C.navy; c.fillRect(16, 166, 224, 12); c.restore();
      c.beginPath(); c.moveTo(104, 172); c.lineTo(128, 214); c.lineTo(152, 172); c.closePath(); c.fillStyle = C.white; c.fill();
      if (kind === 'q') { c.fillStyle = C.navy; c.font = `600 118px ${BODY}`; c.textAlign = 'center'; c.fillText('?', 128, 136); }
      else if (kind === 'tick') { c.strokeStyle = C.teal; c.lineWidth = 22; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(80, 94); c.lineTo(116, 128); c.lineTo(180, 60); c.stroke(); }
      else { c.fillStyle = C.navy; [88, 128, 168].forEach(x => { c.beginPath(); c.arc(x, 94, 14, 0, 7); c.fill(); }); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.65), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, opacity: 0 }));
    m.position.set(-0.3, a.h + 0.28, 0.05); m.renderOrder = 20; m.visible = false; a.g.add(m); return m;
  }
  const popB = (m, T, wins) => { let o = 0; wins.forEach(([t0, t1]) => { o = Math.max(o, tw(T, 0, 1, t0, t0 + 0.3, M.enter) * tw(T, 1, 0, t1 - 0.3, t1, M.fade)); }); m.visible = o > 0.01; m.material.opacity = o; m.scale.setScalar(0.6 + 0.4 * o); };
  function bustOld(p, pos, id, h, flip) { const a = avatar(p, pos, id, h, flip); a.b.visible = false; return a; }
  function bust(p, pos, id, h, flip, o) { const a = puppetAv(p, pos, id, h, flip, Object.assign({ kind: 'bust', idle: 'listen' }, o || {})); a.b.visible = false; return a; }
  function seated(p, pos, id, h = 1.8, flip = false, seatY = 0.46) {
    const a = avatar(p, pos, id, h, flip);
    // show only the upper 58% of the figure, so the desk hides the legs
    const uv = a.m.geometry.attributes.uv, ps = a.m.geometry.attributes.position; const cut = 0.42;
    for (let i = 0; i < uv.count; i++) { if (uv.getY(i) < 0.5) { uv.setY(i, cut); ps.setY(i, h * cut); } }
    uv.needsUpdate = ps.needsUpdate = true; a.g.position.y -= h * cut - seatY; a.b.visible = false; return a;
  }
  // cut-out arm rig: forearm pivots at the elbow, hand at the wrist, cuffs drawn over the joint
  function armRig(a) {
    const tx = AVT['rig/p22-base']; if (!tx) return null; const h = a.h, IW = tx.image.width, IH = tx.image.height, w = h * IW / IH;
    const L = (x, y) => [(x / IW - 0.5) * w, h * (1 - y / IH)], mats = [];
    // bleed edge colours into transparent texels so filtered cut edges don't darken
    const bleed = t => { const im = t.image, cv = document.createElement('canvas'); cv.width = IW; cv.height = IH; const c = cv.getContext('2d'); c.drawImage(im, 0, 0); const d = c.getImageData(0, 0, IW, IH).data, f = new Uint8Array(IW * IH);
      for (let i = 0; i < f.length; i++) f[i] = d[i * 4 + 3] > 0 ? 1 : 0;
      for (let it = 0; it < 6; it++) { const nf = f.slice(); for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const q = y * IW + x; if (f[q]) continue; let r = 0, g = 0, b = 0, n = 0; if (x > 0 && f[q - 1]) { r += d[q * 4 - 4]; g += d[q * 4 - 3]; b += d[q * 4 - 2]; n++; } if (x < IW - 1 && f[q + 1]) { r += d[q * 4 + 4]; g += d[q * 4 + 5]; b += d[q * 4 + 6]; n++; } if (y > 0 && f[q - IW]) { const j = (q - IW) * 4; r += d[j]; g += d[j + 1]; b += d[j + 2]; n++; } if (y < IH - 1 && f[q + IW]) { const j = (q + IW) * 4; r += d[j]; g += d[j + 1]; b += d[j + 2]; n++; } if (n) { d[q * 4] = r / n; d[q * 4 + 1] = g / n; d[q * 4 + 2] = b / n; nf[q] = 1; } } f.set(nf); }
      const o = new Uint8Array(d.length), row = IW * 4; for (let y = 0; y < IH; y++) o.set(d.subarray((IH - 1 - y) * row, (IH - y) * row), y * row);
      const dt = new THREE.DataTexture(o, IW, IH, THREE.RGBAFormat); dt.generateMipmaps = true; dt.minFilter = THREE.LinearMipmapLinearFilter; dt.magFilter = THREE.LinearFilter; dt.anisotropy = 8; dt.needsUpdate = true; return dt; };
    a.m.material.map = bleed(tx); a.m.material.needsUpdate = true;
    const lay = (par, k, at, z) => { const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0); const mt = new THREE.MeshBasicMaterial({ map: bleed(AVT['rig/p22-' + k]), transparent: true, alphaTest: 0.05 }); const m = new THREE.Mesh(geo, mt); m.position.set(-at[0], -at[1], z); par.add(m); mats.push(mt); };
    const limb = (f, hd, el, wr) => { const E = L(...el), P = L(...wr), ge = G(a.rig, [E[0], E[1], 0]); lay(ge, f, E, 0.01); const gw = G(ge, [P[0] - E[0], P[1] - E[1], 0]); lay(gw, hd, P, 0.02); return { fore: ge, hand: gw }; };
    const r = { R: limb('rf', 'rh', [250, 368], [318, 322]), L: limb('lf', 'lh', [50, 425], [118, 441]) }; lay(a.rig, 'cuff', [0, 0], 0.03);
    r.fade = o => mats.forEach(mt => { mt.opacity = o; }); return r;
  }
  // smooth keyframes (degrees) with ease-in-out between keys
  const keyA = (T, ks) => { if (T <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (T < ks[i][0]) { const f = (T - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]), e = f * f * f * (f * (f * 6 - 15) + 10); return ks[i - 1][1] + (ks[i][1] - ks[i - 1][1]) * e; } return ks[ks.length - 1][1]; };
  // ---- 2D puppets (gain-motion rigs) rendered into textures and used as the billboards ----
  const PUPS = []; let PT = [0, 0];
  const PRW0 = 640, PRH0 = 1024, PFEET0 = 990, PS = 1.0, PCHS = ['sway', 'spine', 'chest', 'neck', 'head', 'turn', 'brow', 'abA', 'upA', 'hA', 'abB', 'upB', 'hB', 'shA', 'shB', 'down', 'bob', 'cbob', 'lean', 'talk', 'gaze', 'nod', 'hip', 'swA', 'swB', 'thL', 'thR', 'snL', 'snR', 'br', 'open', 'wide', 'lid'];
  function puppetAv(p, pos, look, h = 1.85, flip = false, o = {}) {
    const GMx = window.GM, tx0 = AVT[look]; let rigT = null;
    if (GMx && tx0) { if (GMx.LOOKS[look] && PIMG && PIMG[look]) rigT = GMx.RIGS[GMx.LOOKS[look]]; else if (o.kind === 'bust') rigT = GMx.bustRig(look, tx0.image); else if (o.kind === 'back') rigT = GMx.backRig(tx0.image); }
    if (!rigT) return o.kind === 'bust' ? bustOld(p, pos, look, h, flip) : o.seat != null ? seated(p, pos, look, h, flip, o.seat) : avatar(p, pos, look, h, flip);
    const PSq = o.hi ? 2 : PS, big = o.kind === 'bust', PRW = big ? Math.ceil(tx0.image.width * 1.25 * PSq) : PRW0 * PSq, PRH = big ? Math.ceil(tx0.image.height * 1.06 * PSq) : PRH0 * PSq, PFEET = big ? (tx0.image.height + 4) * PSq : PFEET0 * PSq;
    const im = AVT[look].image, IH = im.height, k = h / IH, pscene = new THREE.Scene(), pcam = new THREE.OrthographicCamera(0, PRW, 0, -PRH, -10, 10);
    const pup = GMx.puppet(THREE, pscene, rigT, Object.assign({ src: im }, (PIMG && PIMG[look]) || {}), 0);
    const rt = new THREE.WebGLRenderTarget(PRW, PRH, { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: false });
    const ly = R => (IH - (rigT.feet + (R - PFEET) / PSq)) * k, Rb = o.seat != null ? PFEET + (IH * 0.58 - rigT.feet) * PSq : PRH, off = (rigT.cx - im.width / 2) * k * (flip ? -1 : 1);
    const geo = new THREE.PlaneGeometry(PRW / PSq * k, 1), ps = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < ps.count; i++) { const top = uv.getY(i) > 0.5; ps.setY(i, top ? ly(0) : ly(Rb)); ps.setX(i, ps.getX(i) + off); uv.setY(i, top ? 1 : 1 - Rb / PRH); }
    ps.needsUpdate = uv.needsUpdate = true;
    const mtl = new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, alphaTest: 0.04, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
    const g = G(p, pos), rig = G(g), m = new THREE.Mesh(geo, mtl); rig.add(m);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.62, h * 0.24), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); b.rotation.x = -Math.PI / 2; b.position.y = 0.012; g.add(b);
    if (o.seat != null) { b.visible = false; g.position.y -= h * 0.42 - o.seat; }
    const a = { g, rig, m, b, poses: { [look]: m }, ids: [look], h, i: AV.length, fade: 1, w: null, pup: { pup, pscene, pcam, rt, o, rigT, flip, PRW, PFEET, PSq, ph: AV.length * 1.37, nod: 0, talkOn: 0, walkK: 0, gest: null, tw: 0, ww: 0, lastT: -1, done: false } };
    AV.push(a); PUPS.push(a); return a;
  }
  const ENV = ['wave', 'shrug', 'point', 'think', 'cheer'];
  function pupPose(a, T) {
    const q = a.pup, o = q.o, CL = window.GM.CLIPS, ss = window.GM.ss, P = {}; PCHS.forEach(c => (P[c] = 0));
    const mix = (c, w) => { if (w > 0) for (const kk of PCHS) P[kk] = P[kk] * (1 - w) + (c[kk] || 0) * w; };
    const addEnv = (c, s0, e0) => { const env = ss(s0, s0 + 0.3, T) * (1 - ss(e0 - 0.3, e0, T)); for (const kk in c) if (kk !== 'down') P[kk] += c[kk]; P.down *= 1 - env; };
    const dt = Math.abs(T - q.lastT), sm = (cur, tgt, rate) => (q.lastT < 0 || dt > 0.25 ? tgt : cur + (tgt - cur) * Math.min(1, dt * rate));
    q.tw = sm(q.tw, q.talkOn, 7); q.ww = sm(q.ww, q.walkK, 5); q.lastT = T;
    mix(CL[o.idle || 'listen'](T + q.ph, 99), 1);
    (o.acts || []).forEach(([s0, e0, n]) => { if (T < s0 - 0.3 || T > e0 + 0.3) return; if (ENV.includes(n)) addEnv(CL[n](T - s0, e0 - s0), s0, e0); else mix(CL[n](T - s0, e0 - s0), ss(s0 - 0.2, s0 + 0.2, T) * (1 - ss(e0 - 0.2, e0 + 0.2, T))); });
    mix(CL.talk(T + q.ph, 99), q.tw);
    if (q.gest) { const [s0, e0] = q.gest; addEnv(CL[o.alt || 'point'](T - s0, e0 - s0), s0, e0); }
    P.nod += q.nod;
    const amp = o.amp ?? 1.1; for (const kk of ['abA', 'upA', 'hA', 'abB', 'upB', 'hB', 'spine', 'lean']) P[kk] *= amp;
    if (q.ww > 0.01) window.GM.walk(P, q.ww, T * Math.PI * 1.9 + q.ph, 1, q.rigT.legLen);
    window.GM.life(P, T, q.ph, q.ww); if (o.seat != null) P.sway *= 0.2;
    P.down = Math.min(1, Math.max(0, P.down)); P.headS = o.headS || 1; return P;
  }
  const pcc = new THREE.Color();
  function renderPups() { if (!PUPS.length) return; const [T, Tr] = PT; renderer.getClearColor(pcc); const ca = renderer.getClearAlpha(); renderer.setClearColor(0x000000, 0);
    for (const a of PUPS) { const q = a.pup, o = q.o, t = o.tr ? Tr : T; a.m.material.color.setScalar(a.m.material.opacity);
      const live = a.fade > 0.01 && (!o.on || (t >= o.on[0] && t <= o.on[1])); if (q.done && !live) continue;
      const P = pupPose(a, t); q.pup.update(P, P, { x: q.PRW / 2, y: q.PFEET, s: q.PSq, flip: q.flip ? -1 : 1 }, { z: 1, fx: 0, fy: 0 });
      renderer.setRenderTarget(q.rt); renderer.clear(); renderer.render(q.pscene, q.pcam); q.done = true; }
    renderer.setRenderTarget(null); renderer.setClearColor(pcc, ca); }
  const GREYS = ['#e4eaf2', '#dce4ee', '#e8edf4', '#dfe6f0'];
  const matteM = {}; const matte = c => matteM[c] || (matteM[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, envMapIntensity: 0.45 }));
  function person(p, pos, o) {
    o = { ...o, grey: true, skin: '#eef2f7', shirt: GREYS[Math.floor(hash(pos[0] * 7 + pos[2] * 13, 2) * 4)], pants: '#cdd7e4', hair: '#d9e1ec', scarf: o.scarf ? '#dde4ee' : null };
    const g = G(p, pos), body = G(g, [0, 0.05, 0]); body.scale.setScalar(o.s || 1);
    const legs = [], shins = [], arms = [];
    for (const sx of [-1, 1]) {
      const th = G(body, [sx * 0.09, 0.52, 0]); cap(th, [0, -0.13, 0], 0.075, 0.14, o.pants || C.navy);
      const sn = G(th, [0, -0.26, 0]); cap(sn, [0, -0.13, 0], 0.07, 0.14, o.pants || C.navy); sph(sn, [0, -0.27, 0.04], 0.075, C.ink, 1, 0.6, 1.5);
      legs.push(th); shins.push(sn);
      const a = G(body, [sx * 0.225, 1.0, 0]); cap(a, [0, -0.17, 0], 0.062, 0.22, o.shirt); sph(a, [0, -0.36, 0], 0.062, o.skin); arms.push(a);
    }
    cap(body, [0, 0.78, 0], 0.175, 0.26, o.shirt);
    sph(body, [0, 1.1, 0], 0.07, o.skin);
    const hd = G(body, [0, 1.37, 0]); hd.scale.setScalar(1.3);
    sph(hd, [0, 0, 0], 0.19, o.skin);
    const hair = sh(new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(o.hair || HAIR[0])));
    hair.rotation.x = -0.42; hair.position.set(0, 0.012, -0.012); hd.add(hair);
    if (o.bun) sph(hd, [0, 0.12, -0.17], 0.09, o.hair || HAIR[0]);
    if (o.long) cap(hd, [0, -0.12, -0.13], 0.15, 0.18, o.hair || HAIR[0]);
    if (o.scarf) { const s2 = sh(new THREE.Mesh(new THREE.SphereGeometry(0.215, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.72), mat(o.scarf))); s2.rotation.x = -0.75; hd.add(s2); cap(hd, [0, -0.17, -0.06], 0.17, 0.06, o.scarf); }
    if (!o.grey) for (const sx of [-1, 1]) { sph(hd, [sx * 0.068, 0.02, 0.172], 0.026, C.ink, 1, 1.15, 1, 0.3); sph(hd, [sx * 0.11, -0.045, 0.148], 0.034, mixHex(o.skin, '#e5776f', 0.35), 1, 0.7, 0.45); }
    if (!o.grey) { const sm = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.011, 8, 18, Math.PI), mat(C.ink)); sm.rotation.z = Math.PI; sm.position.set(0, -0.055, 0.178); hd.add(sm); }
    if (o.sit) { legs.forEach(l => (l.rotation.x = -Math.PI / 2)); shins.forEach(s => (s.rotation.x = Math.PI / 2)); }
    if (o.tablet) { const t = box(arms[1], [0.02, -0.42, 0.12], [0.2, 0.26, 0.03], C.navy, 0.02); t.rotation.x = -0.9; arms[1].rotation.x = -0.9; }
    if (o.grey) g.traverse(m => { if (m.isMesh) m.material = matte('#' + m.material.color.getHexString()); });
    return { g, body, legs, shins, arms, hd };
  }
  const walk = (pp, T, k = 1) => { const s = Math.sin(T * 7.5) * 0.45 * k; pp.legs[0].rotation.x = s; pp.legs[1].rotation.x = -s; pp.shins[0].rotation.x = Math.max(0, -s) * 0.8; pp.shins[1].rotation.x = Math.max(0, s) * 0.8; pp.arms[0].rotation.x = -s * 0.7; pp.body.position.y = 0.05 + Math.abs(Math.cos(T * 7.5)) * 0.025 * k; };
  // tree: tapered, branching trunk + clustered leaf clumps (jittered icosahedra, flat-shaded, per-clump hue drift, inner shade)
  const leafTex = (() => { const t = ctex(256, 256); t.draw('x', (c, w, h) => { c.fillStyle = '#d9d9d9'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { const x = hash(i, 31) * w, y = hash(i, 32) * h, r = 3 + hash(i, 33) * 6, a = hash(i, 34) * Math.PI, l = hash(i, 35);
        c.fillStyle = l < 0.35 ? 'rgba(90,90,90,0.55)' : l < 0.7 ? 'rgba(255,255,255,0.45)' : 'rgba(170,170,170,0.5)'; c.beginPath(); c.ellipse(x, y, r, r * 0.55, a, 0, Math.PI * 2); c.fill(); } });
    t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping; t.tex.repeat.set(3, 2); return t.tex; })();
  const leafM = {}; const leafMat = c => leafM[c] || (leafM[c] = new THREE.MeshStandardMaterial({ color: c, map: leafTex, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 }));
  const clumpGeo = (() => { const gs = []; for (let v = 0; v < 4; v++) { const g = new THREE.SphereGeometry(1, 40, 28), p = g.attributes.position, o = v * 1.7;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 1 + 0.07 * Math.sin(x * 5 + o) * Math.cos(z * 4.6 - o) + 0.06 * Math.sin(y * 6.2 + x * 2.1 + o * 2) + 0.035 * Math.sin(x * 13 + y * 11 + z * 9 + o);
        p.setXYZ(i, x * f, y * f * (y < 0 ? 0.72 : 0.92), z * f); }
      g.computeVertexNormals(); gs.push(g); } return gs; })();
  const LEAVES = ['#3b6e4a', '#467d50', '#548c58', '#64995f', '#78a868'];
  const tree = (p, pos, s = 1) => { const g = G(p, pos); g.scale.setScalar(s); g.rotation.y = hash(pos[0] * 3 + pos[2], 9) * Math.PI * 2;
    const bark = mat('#7d6450', 0.92), barkD = mat('#6a5444', 0.95);
    const limb = (par, x0, y0, z0, x1, y1, z1, r0, r1, m) => { const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), d = b.clone().sub(a), L = d.length();
      const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 10), m)); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); par.add(c); return b; };
    limb(g, 0, 0, 0, 0.03, 0.62, 0.01, 0.1, 0.065, bark); sph(g, [0, 0.02, 0], 0.12, '#7d6450', 1, 0.35, 1);
    [[-0.13, 0.04, 0.1], [0.12, 0.05, -0.08], [0.02, 0.05, 0.14]].forEach(([x, y, z]) => limb(g, 0, 0.06, 0, x * 1.6, 0, z * 1.6, 0.05, 0.03, barkD));
    const tips = [[-0.32, 0.98, 0.1], [0.3, 1.02, -0.06], [0.04, 1.12, 0.26], [0.06, 1.08, -0.28]].map(([x, y, z]) => limb(g, 0.03, 0.58, 0.01, x, y, z, 0.05, 0.022, bark));
    const crown = [[0, 1.24, 0, 0.36], [-0.34, 1.02, 0.1, 0.29], [0.33, 1.06, -0.06, 0.3], [0.06, 1.06, 0.3, 0.27], [0.05, 1.0, -0.3, 0.27], [-0.16, 1.44, -0.08, 0.24], [0.2, 1.4, 0.12, 0.23], [-0.3, 0.86, -0.18, 0.2], [0.36, 0.86, 0.2, 0.19], [0, 0.88, 0.04, 0.28], [-0.2, 1.22, 0.24, 0.22], [0.26, 1.22, -0.24, 0.22], [-0.42, 1.18, -0.12, 0.18], [0.44, 1.2, 0.1, 0.18], [0.02, 1.56, 0.02, 0.18], [-0.08, 1.12, -0.38, 0.17], [0.12, 0.98, 0.42, 0.16]];
    crown.forEach(([x, y, z, r], i) => { const h2 = hash(i + pos[0] * 7, 13), up = (y - 0.86) / 0.6, col = LEAVES[Math.min(4, Math.max(0, Math.round(up * 3 + h2 * 1.6 - 0.3)))];
      const m = sh(new THREE.Mesh(clumpGeo[i % 4], leafMat(col))); m.position.set(x, y, z); m.scale.setScalar(r * (0.92 + 0.16 * h2)); m.rotation.set(h2 * 3, h2 * 5, h2 * 2); g.add(m); });
    const inner = sh(new THREE.Mesh(clumpGeo[1], leafMat('#2f5a3c'))); inner.position.set(0, 1.04, 0); inner.scale.set(0.34, 0.3, 0.34); g.add(inner);
    return g; };
  const plantOld = (p, pos, s = 1) => { const g = G(p, pos); g.scale.setScalar(s); if (MODS.pottedPlant) { prop(g, 'pottedPlant', [0, 0, 0], 0, 0.95); return g; } cyl(g, [0, 0, 0], 0.16, 0.12, 0.28, C.blue); [[0, 0.5, 0, 0.2], [0.12, 0.42, 0.06, 0.15], [-0.11, 0.44, -0.05, 0.16]].forEach(([x, y, z, r]) => sph(g, [x, y, z], r, C.leaf)); return g; };
  const chair = (p, pos, ry = 0, c = C.mid) => { const g = G(p, pos); g.rotation.y = ry; if (MODS.chairDesk) { prop(g, 'chairDesk', [0, 0, 0], 0, 1.0); return g; } box(g, [0, 0.4, 0], [0.5, 0.08, 0.5], c, 0.04); box(g, [0, 0.48, -0.22], [0.5, 0.5, 0.07], c, 0.04); cyl(g, [0, 0, 0], 0.04, 0.04, 0.4, C.ink, 10); cyl(g, [0, 0, 0], 0.22, 0.22, 0.04, C.ink, 20); return g; };
  const ups = [];
  const TXC = {}, cvTex = (key, w, h, fn, rep) => TXC[key] || (TXC[key] = (() => { const t = ctex(w, h); t.draw('x', fn); if (rep) t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping; return t.tex; })());
  const stdM = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0, envMapIntensity: 0.35 }, o));
  const imgTex = im => { const t = new THREE.Texture(im); t.anisotropy = 8; t.needsUpdate = true; return t; };
  const coverFit = (c, im, x, y, w, h, ax = 0.5, ay = 0.5) => { if (!im) return; const s2 = Math.max(w / im.width, h / im.height), sw = w / s2, sh2 = h / s2; c.drawImage(im, (im.width - sw) * ax, (im.height - sh2) * ay, sw, sh2, x, y, w, h); };
  const oakTex = () => cvTex('oak', 1024, 256, (c, w, h) => { c.fillStyle = '#d6bb93'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) { const y = hash(i, 61) * h, a = 0.04 + 0.09 * hash(i, 62); c.strokeStyle = hash(i, 63) > 0.5 ? `rgba(130,90,52,${a})` : `rgba(255,242,220,${a})`; c.lineWidth = 1 + hash(i, 64) * 3; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 32) c.lineTo(x, y + 5 * Math.sin(x * 0.006 + i) + 2.5 * Math.sin(x * 0.021 + i * 2)); c.stroke(); }
    for (let i = 0; i < 5; i++) { const x = hash(i, 65) * w, y = hash(i, 66) * h; c.strokeStyle = 'rgba(115,78,44,0.13)'; c.lineWidth = 1.4; for (let r = 3; r < 16; r += 3) { c.beginPath(); c.ellipse(x, y, r * 2.6, r * 0.7, 0, 0, 7); c.stroke(); } } }, true);
  const kbTex = () => cvTex('kb', 512, 168, (c, w, h) => { c.fillStyle = '#cfd5dd'; c.fillRect(0, 0, w, h); const u = (w - 16) / 15, rh = (h - 12) / 6;
    const rows = [[15, 0.6], [15], [15], [14], [13], [[1.3, 1.3, 1.3, 6, 1.3, 1.3, 1.3]]];
    rows.forEach((r, j) => { const y = 6 + j * rh + (j === 0 ? 0 : rh * 0.1), kh = j === 0 ? rh * 0.62 : rh * 0.84; const ks = Array.isArray(r[0]) ? r[0] : Array(r[0]).fill(15 / r[0]); let x = 8; ks.forEach(kw => { const ww = kw * u - 3; c.fillStyle = '#9aa3af'; c.beginPath(); c.roundRect(x, y + 1.5, ww, kh, 3); c.fill(); c.fillStyle = '#f7f9fb'; c.beginPath(); c.roundRect(x, y, ww, kh - 1, 3); c.fill(); x += kw * u; }); }); });
  const cable = (p, pts, r = 0.004, col = '#2a2f38') => { const cv = new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v))); const m = sh(new THREE.Mesh(new THREE.TubeGeometry(cv, 24, r, 6), stdM({ color: col, roughness: 0.6 }))); p.add(m); return m; };
  function realDesk(p, pos, w, d, o = {}) { const g = G(p, pos), H = o.h || 0.74, top = 0.032, lam = '#f2f5f9', pnl = H - top;
    const tm = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(w, top, d, 3, 0.008), stdM({ map: oakTex(), roughness: 0.46 }))); tm.position.y = H - top / 2; g.add(tm);
    [-1, 1].forEach(sd => box(g, [sd * (w / 2 - 0.05), 0, -0.01], [0.028, pnl, d - 0.08], lam, 0.004, 0.5));
    box(g, [0, 0.14, d / 2 - 0.1], [w - 0.13, pnl - 0.18, 0.018], o.panel || lam, 0.004, 0.5);
    box(g, [0, pnl - 0.05, d / 2 - 0.13], [w - 0.13, 0.05, 0.03], '#dfe5ee', 0.004);
    [-1, 1].forEach(sd => [-1, 1].forEach(sz => box(g, [sd * (w / 2 - 0.05), 0, sz * (d / 2 - 0.08)], [0.04, 0.01, 0.07], '#8a919c', 0.003)));
    return g; }
  function monitorReal(p, pos, scrTex, w = 0.82, h = 0.53) { const g = G(p, pos), alu = stdM({ color: '#c3c9d2', roughness: 0.32, metalness: 0.6 }), blk = stdM({ color: '#1b1f27', roughness: 0.38 });
    const base = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(0.27, 0.012, 0.2, 3, 0.005), alu)); base.position.set(0, 0.006, -0.03); g.add(base);
    const neck = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(0.06, 0.36, 0.022, 3, 0.008), alu)); neck.position.set(0, 0.19, -0.085); neck.rotation.x = -0.1; g.add(neck);
    const pan = G(g, [0, 0.13 + h / 2, -0.045]); pan.rotation.x = -0.04;
    pan.add(sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(w, h, 0.02, 3, 0.007), blk)));
    const back = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(w * 0.6, h * 0.55, 0.03, 3, 0.012), alu)); back.position.z = -0.016; pan.add(back);
    plane(pan, [0, 0.014, 0.0105], w - 0.022, h - 0.05, scrTex);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.003, 8), new THREE.MeshBasicMaterial({ color: '#8fe6ea' })); led.position.set(w / 2 - 0.03, -h / 2 + 0.012, 0.0106); pan.add(led);
    return g; }
  function keyboard(p, pos, ry = 0) { const g = G(p, pos); g.rotation.y = ry;
    const body = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(0.44, 0.014, 0.135, 3, 0.005), stdM({ color: '#c6ccd4', roughness: 0.35, metalness: 0.45 }))); body.position.y = 0.007; g.add(body);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.125), stdM({ map: kbTex(), roughness: 0.55 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.0145; top.receiveShadow = true; g.add(top); return g; }
  function mouse(p, pos, ry = 0) { const g = G(p, pos); g.rotation.y = ry;
    const pad = new THREE.Mesh(new THREE.RoundedBoxGeometry(0.25, 0.004, 0.21, 2, 0.002), stdM({ color: C.navy, roughness: 0.92 })); pad.position.y = 0.002; pad.receiveShadow = true; g.add(pad);
    const m = sh(new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 14), stdM({ color: '#eef1f5', roughness: 0.3 }))); m.scale.set(1, 0.5, 1.7); m.position.set(0.02, 0.016, 0); g.add(m); return g; }
  function mug(p, pos, col = '#ffffff', sc = 1) { const g = G(p, pos); g.scale.setScalar(sc); const mm = stdM({ color: col, roughness: 0.28, side: THREE.DoubleSide });
    g.add(sh(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.038, 0], [0.04, 0.004], [0.041, 0.095], [0.037, 0.095], [0.036, 0.008], [0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y)), 28), mm)));
    const hd = sh(new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0065, 8, 16, Math.PI), mm)); hd.rotation.z = -Math.PI / 2; hd.position.set(0.04, 0.05, 0); g.add(hd);
    const cof = new THREE.Mesh(new THREE.CircleGeometry(0.036, 20), stdM({ color: '#4a2f22', roughness: 0.15 })); cof.rotation.x = -Math.PI / 2; cof.position.y = 0.08; g.add(cof); return g; }
  function deskLamp(p, pos, ry = 0) { const g = G(p, pos); g.rotation.y = ry; const bodyM = stdM({ color: C.navy, roughness: 0.32, metalness: 0.35 }), steel = stdM({ color: '#b9c0ca', roughness: 0.28, metalness: 0.75 });
    { const base = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.022, 32), bodyM)); base.position.y = 0.011; g.add(base); }
    const V = (x, y, z) => new THREE.Vector3(x, y, z), seg = (a, b, r, m) => { const d = b.clone().sub(a), L = d.length(), c = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), m)); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(c); };
    const j0 = V(0, 0.03, 0), j1 = V(-0.12, 0.38, 0), j2 = V(0.21, 0.56, 0);
    seg(j0, j1, 0.008, steel); seg(V(0.014, 0.03, 0), V(-0.106, 0.38, 0), 0.0035, steel); seg(j1, j2, 0.007, steel); seg(V(-0.12, 0.394, 0), V(0.21, 0.574, 0), 0.0035, steel);
    [j0, j1, j2].forEach(j => { const k = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 16), bodyM)); k.rotation.x = Math.PI / 2; k.position.copy(j); g.add(k); });
    const head = G(g, [j2.x + 0.02, j2.y, 0]); head.rotation.z = -0.95;
    head.add(sh(new THREE.Mesh(new THREE.LatheGeometry([[0.018, 0.07], [0.03, 0.055], [0.058, 0.0], [0.078, -0.07], [0.075, -0.072]].map(([x, y]) => new THREE.Vector2(x, y)), 32), stdM({ color: C.navy, roughness: 0.32, metalness: 0.35, side: THREE.DoubleSide }))));
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.066, 24), new THREE.MeshBasicMaterial({ color: '#fff4e2', toneMapped: false })); bulb.rotation.x = Math.PI / 2; bulb.position.y = -0.05; head.add(bulb);
    return g; }
  function laptop(p, pos, ry = 0, scrTex = null, sz = 1, open = -0.28) { const g = G(p, pos); g.rotation.y = ry; g.scale.setScalar(sz); const alu = stdM({ color: '#c3c9d2', roughness: 0.3, metalness: 0.55 });
    const base = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(0.34, 0.016, 0.235, 3, 0.006), alu)); base.position.y = 0.008; g.add(base);
    const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.1), stdM({ map: kbTex(), roughness: 0.6 })); kb.rotation.x = -Math.PI / 2; kb.position.set(0, 0.0164, -0.035); g.add(kb);
    const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), stdM({ color: '#b3bac4', roughness: 0.25, metalness: 0.4 })); tp.rotation.x = -Math.PI / 2; tp.position.set(0, 0.0165, 0.066); g.add(tp);
    const lid = G(g, [0, 0.016, -0.113]); lid.rotation.x = open;
    const lb = sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(0.34, 0.226, 0.008, 3, 0.004), alu)); lb.position.set(0, 0.113, -0.002); lid.add(lb);
    const bez = new THREE.Mesh(new THREE.PlaneGeometry(0.334, 0.22), stdM({ color: '#14171d', roughness: 0.3 })); bez.position.set(0, 0.113, 0.0025); lid.add(bez);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.312, 0.195), scrTex ? new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }) : new THREE.MeshBasicMaterial({ color: '#3a5f96', toneMapped: false })); scr.position.set(0, 0.116, 0.003); lid.add(scr);
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.014, 20), stdM({ color: '#e8edf3', roughness: 0.2, metalness: 0.6 })); logo.position.set(0, 0.113, -0.0065); logo.rotation.y = Math.PI; lid.add(logo);
    return g; }
  const plLeafTex = () => cvTex('pleaf', 128, 256, (c, w, h) => { c.clearRect(0, 0, w, h); const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2c6442'); gr.addColorStop(0.5, '#4f985d'); gr.addColorStop(1, '#2c6442'); c.fillStyle = gr;
    c.beginPath(); c.moveTo(w / 2, h - 2); c.bezierCurveTo(w * 1.02, h * 0.72, w * 0.94, h * 0.24, w / 2, 2); c.bezierCurveTo(w * 0.06, h * 0.24, -w * 0.02, h * 0.72, w / 2, h - 2); c.fill();
    c.strokeStyle = 'rgba(214,236,196,0.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, h - 2); c.lineTo(w / 2, 8); c.stroke(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(205,232,186,0.32)';
    for (let i = 1; i < 9; i++) { const y = h - i * h / 10; [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(w / 2, y); c.quadraticCurveTo(w / 2 + sd * w * 0.2, y - 14, w / 2 + sd * w * 0.38, y - 30); c.stroke(); }); } });
  const PL_LEAF = (() => { const gg = new THREE.PlaneGeometry(1, 1, 1, 8); const pp = gg.attributes.position; for (let i = 0; i < pp.count; i++) { const v = pp.getY(i) + 0.5; pp.setZ(i, 0.38 * v * v); pp.setY(i, v * (1 - 0.12 * v)); } gg.computeVertexNormals(); return gg; })();
  const PL_MATS = []; const plMats = () => PL_MATS.length ? PL_MATS : (PL_MATS.push(...['#ffffff', '#e2efd9', '#cde2c3'].map(t => stdM({ map: plLeafTex(), color: t, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.5 }))), PL_MATS);
  const plant = (p, pos, s = 1) => { const g = G(p, pos); g.scale.setScalar(s); g.rotation.y = hash(pos[0] * 5 + pos[2] * 3, 12) * 6.28;
    g.add(sh(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.106, 0.012], [0.134, 0.27], [0.142, 0.285], [0.128, 0.285], [0.12, 0.262]].map(([x, y]) => new THREE.Vector2(x, y)), 32), stdM({ color: '#efece6', roughness: 0.42 }))));
    const soil = new THREE.Mesh(new THREE.CircleGeometry(0.122, 24), stdM({ color: '#4a3a2c', roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.y = 0.258; g.add(soil);
    const ms = plMats(), N = 18; for (let i = 0; i < N; i++) { const a = i * 2.4 + hash(i + pos[0], 13) * 0.5, f = i / N, tilt = 0.12 + 0.95 * f * (0.65 + 0.35 * hash(i, 14)), L = 0.3 + 0.26 * hash(i, 15) + 0.2 * (1 - f);
      const st = G(g, [Math.cos(a) * 0.025, 0.26, Math.sin(a) * 0.025]); st.rotation.y = Math.PI / 2 - a; const lf = sh(new THREE.Mesh(PL_LEAF, ms[i % 3])); lf.scale.set(L * 0.36, L, L); lf.rotation.x = tilt; lf.rotation.z = (hash(i, 16) - 0.5) * 0.4; st.add(lf); }
    return g; };
  const spineTex = () => cvTex('spine', 64, 256, (c, w2, h2) => { c.fillStyle = '#e9e9e9'; c.fillRect(0, 0, w2, h2); c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, h2 * 0.08, w2, h2 * 0.03); c.fillRect(0, h2 * 0.86, w2, h2 * 0.03); c.fillStyle = '#ffffff'; c.fillRect(w2 * 0.2, h2 * 0.3, w2 * 0.6, h2 * 0.3); c.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 4; i++) c.fillRect(w2 * 0.28, h2 * (0.34 + i * 0.06), w2 * 0.44, h2 * 0.02); });
  function book(p, pos, w, h, d, col, rot = [0, 0, 0]) { const g = G(p, pos); g.rotation.set(...rot); const bm = stdM({ color: col, roughness: 0.62 });
    const pg = sh(new THREE.Mesh(new THREE.BoxGeometry(w - 0.004, h - 0.008, d - 0.004), stdM({ color: '#f3eee2', roughness: 0.9 }))); pg.position.set(0, h / 2, -0.001); g.add(pg);
    [-1, 1].forEach(sd => { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.0025, h, d), bm)); b.position.set(sd * (w / 2 - 0.00125), h / 2, 0); g.add(b); });
    const sp = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.003), stdM({ map: spineTex(), color: col, roughness: 0.62 }))); sp.position.set(0, h / 2, d / 2 - 0.0015); g.add(sp); return g; }
  function bookRow(p, pos, ry, specs) { const g = G(p, pos); g.rotation.y = ry; let x = 0; specs.forEach(([w, h, d, col, lean]) => { const b = book(g, [x + w / 2, 0, 0], w, h, d, col, [0, 0, lean || 0]); if (lean) b.position.x += Math.sin(-lean) * h * 0.5; x += w + 0.002; });
    [[-0.012], [x + 0.012]].forEach(([bx]) => { box(g, [bx, 0, 0], [0.004, 0.16, 0.12], '#2a2f38', 0.001, 0.4); box(g, [bx + (bx < 0 ? -0.04 : 0.04), 0, 0], [0.08, 0.004, 0.12], '#2a2f38', 0.001, 0.4); }); return g; }
  function bookshelf(p, pos, w, h, d, o = {}) { const g = G(p, pos), fr = o.frame || '#f3f5f8';
    box(g, [0, 0, -d / 2 + 0.012], [w, h, 0.02], o.back || '#dfe6ef', 0.003);
    [-w / 2 + 0.015, 0, w / 2 - 0.015].forEach(x => box(g, [x, 0, 0], [0.03, h, d], fr, 0.005));
    box(g, [0, h - 0.03, 0], [w + 0.02, 0.03, d + 0.01], fr, 0.005); box(g, [0, 0, 0], [w, 0.07, d], fr, 0.005);
    const NS = 4, y0 = 0.07, gap = (h - 0.1 - y0) / NS; for (let r = 1; r < NS; r++) box(g, [0, y0 + r * gap - 0.022, 0], [w - 0.03, 0.022, d - 0.02], fr, 0.003);
    const PAL = [C.navy, C.blue, C.teal, '#5b7db3', '#cfe0f4', '#f1ede4', '#8a9bb5', C.deep, '#E0A93B', '#e4ddd0', '#6b7f99', '#ffffff', '#3d9ea4'];
    const items = [], zf = d / 2 - 0.03;
    for (let r = 0; r < NS; r++) for (let b = 0; b < 2; b++) {
      const xa = b === 0 ? -w / 2 + 0.035 : 0.02, xb = b === 0 ? -0.02 : w / 2 - 0.035, yb = y0 + r * gap, hm = gap - 0.06, sd = r * 13 + b * 7, mode = (r * 2 + b) % 4; let x = xa + 0.01, k = 0;
      if (mode === 3) { const nb = r === 3 ? 3 : 1; for (let i = 0; i < nb; i++) { box(g, [x + 0.16, yb, zf - 0.16], [0.31, Math.min(hm, 0.27), 0.32], '#cdb994', 0.008, 0.9); const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), stdM({ color: '#f7f4ec', roughness: 0.8 })); lb.position.set(x + 0.16, yb + 0.15, zf + 0.002); g.add(lb); x += 0.34; }
        if (r !== 3) { plant(g, [x + 0.12, yb, zf - 0.12], 0.42); x += 0.28; const fr2 = G(g, [x + 0.1, yb, zf - 0.08]); fr2.rotation.x = -0.12; box(fr2, [0, 0, 0], [0.2, 0.26, 0.02], C.navy, 0.004); plane(fr2, [0, 0.13, 0.011], 0.16, 0.22, POSTER.tex, true); x += 0.24; } }
      while (x < xb - 0.03 && k < 70) { const q = hash(sd + k, 71), q2 = hash(sd + k, 72);
        if (mode === 1 && k < 8) { const bw = 0.07; if (x + bw > xb) break; const bh = Math.min(hm, 0.32), col = PAL[[0, 1, 3, 7][Math.floor(q * 4)]], bz = zf - 0.14;
          box(g, [x + bw / 2, yb, bz], [bw - 0.004, bh, 0.28], col, 0.005, 0.55); const lb = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.66, bh * 0.4), stdM({ color: '#f7f9fc', roughness: 0.7 })); lb.position.set(x + bw / 2, yb + bh * 0.6, bz + 0.141); g.add(lb);
          const hole = new THREE.Mesh(new THREE.CircleGeometry(bw * 0.17, 16), stdM({ color: '#1a1f28', roughness: 1 })); hole.position.set(x + bw / 2, yb + bh * 0.2, bz + 0.141); g.add(hole); x += bw; k++; continue; }
        if (q < 0.07 && k > 2) { x += 0.05 + q2 * 0.07; k++; continue; }
        if (q > 0.93 && x < xb - 0.32) { const n = 3 + Math.floor(q2 * 3), sw = 0.24 + q2 * 0.05; let yy = yb; for (let i = 0; i < n; i++) { const th = 0.025 + hash(sd + k + i, 73) * 0.02, bd = 0.17 + hash(i, 74) * 0.04; items.push([x + sw / 2 + (hash(i, 78) - 0.5) * 0.02, yy + th / 2, zf - bd / 2, sw - i * 0.012, th, bd, PAL[Math.floor(hash(sd + i, 75) * PAL.length)]]); yy += th; } x += sw + 0.02; k++; continue; }
        const bw = 0.02 + q * 0.034, bh = Math.min(hm, hm * (0.58 + 0.42 * q2)), bd = 0.15 + hash(sd + k, 76) * 0.09; if (x + bw > xb) break;
        items.push([x + bw / 2, yb + bh / 2, zf - bd / 2, bw, bh, bd, PAL[Math.floor(hash(sd + k, 77) * PAL.length)]]); x += bw + 0.0015; k++; } }
    const spine = cvTex('spine', 64, 256, (c, w2, h2) => { c.fillStyle = '#e9e9e9'; c.fillRect(0, 0, w2, h2); c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, h2 * 0.08, w2, h2 * 0.03); c.fillRect(0, h2 * 0.86, w2, h2 * 0.03); c.fillStyle = '#ffffff'; c.fillRect(w2 * 0.2, h2 * 0.3, w2 * 0.6, h2 * 0.3); c.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 4; i++) c.fillRect(w2 * 0.28, h2 * (0.34 + i * 0.06), w2 * 0.44, h2 * 0.02); });
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stdM({ map: spine, roughness: 0.72 }), items.length); im.castShadow = im.receiveShadow = true;
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Vp = new THREE.Vector3(), Vs = new THREE.Vector3(), Cc = new THREE.Color();
    items.forEach(([x, y, z, sx, sy, sz, col], i) => { M4.compose(Vp.set(x, y, z), Q, Vs.set(sx, sy, sz)); im.setMatrixAt(i, M4); im.setColorAt(i, Cc.set(col)); }); g.add(im);
    return g; }
  const TT = {}; const tentTex = col => TT[col] || (TT[col] = (() => { const t = ctex(512, 512); t.draw('x', (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 256) { c.fillStyle = hash(x, 61) > 0.5 ? `rgba(255,255,255,${0.03 + 0.03 * hash(x, 62)})` : `rgba(80,60,35,${0.03 + 0.03 * hash(x, 62)})`; c.fillRect(x, 0, 256, h); }
      for (let i = 0; i < 3200; i++) { c.fillStyle = hash(i, 41) > 0.5 ? `rgba(90,70,40,${0.02 + 0.03 * hash(i, 42)})` : `rgba(255,255,255,${0.02 + 0.03 * hash(i, 42)})`; c.fillRect(hash(i, 43) * w, hash(i, 44) * h, 2 + hash(i, 45) * 4, 2 + hash(i, 46) * 3); }
      c.filter = 'blur(7px)'; for (let i = 0; i < 34; i++) { const x0 = hash(i, 63) * w, y0 = hash(i, 64) * h, L = 80 + 200 * hash(i, 65), dx = (hash(i, 66) - 0.5) * 0.9 * L; c.lineCap = 'round';
        c.strokeStyle = `rgba(70,55,35,${0.05 + 0.04 * hash(i, 67)})`; c.lineWidth = 12 + 16 * hash(i, 68); c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + dx * 0.6, y0 + L * 0.5, x0 + dx, y0 + L); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 8; c.beginPath(); c.moveTo(x0 + 16, y0); c.quadraticCurveTo(x0 + 16 + dx * 0.6, y0 + L * 0.5, x0 + 16 + dx, y0 + L); c.stroke(); } c.filter = 'none';
      for (let x = 0; x < w; x += 256) { c.fillStyle = 'rgba(60,45,25,0.13)'; c.fillRect(x, 0, 4, h); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 4, 0, 3, h); c.fillStyle = 'rgba(60,45,25,0.16)'; for (let y = 0; y < h; y += 10) { c.fillRect(x - 5, y, 1.5, 5); c.fillRect(x + 12, y, 1.5, 5); } }
      c.filter = 'blur(3px)'; for (let i = 0; i < 9; i++) { const x0 = hash(i, 71) * w, len = h * (0.1 + 0.2 * hash(i, 72)), g2 = c.createLinearGradient(0, h - len, 0, h); g2.addColorStop(0, 'rgba(110,85,55,0)'); g2.addColorStop(1, `rgba(110,85,55,${0.08 + 0.1 * hash(i, 73)})`); c.fillStyle = g2; c.fillRect(x0, h - len, 14 + 20 * hash(i, 74), len); } c.filter = 'none';
      const gr = c.createLinearGradient(0, h * 0.55, 0, h); gr.addColorStop(0, 'rgba(120,92,58,0)'); gr.addColorStop(0.7, 'rgba(120,92,58,0.22)'); gr.addColorStop(1, 'rgba(105,78,48,0.48)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { const y = h - Math.pow(hash(i, 75), 2.2) * h * 0.22; c.fillStyle = `rgba(95,70,42,${0.1 + 0.2 * hash(i, 76)})`; c.beginPath(); c.arc(hash(i, 77) * w, y, 0.8 + 2.6 * hash(i, 78), 0, 6.283); c.fill(); } });
    t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping; return t.tex; })());
  const quadG = (A, B, Cq, D, nu, nv, sag, nrm, ru = 1, rv = 1, wr = 0, bays = 3) => { const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu, v = j / nv, p = A.clone().multiplyScalar((1 - u) * (1 - v)).addScaledVector(B, u * (1 - v)).addScaledVector(Cq, (1 - u) * v).addScaledVector(D, u * v);
      p.addScaledVector(nrm, -sag * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * (0.8 + 0.4 * hash(i * 7 + j, 51)) - wr * Math.pow(Math.sin(Math.PI * v), 0.7) * (0.5 - 0.5 * Math.cos(2 * Math.PI * u * bays)) * (0.85 + 0.3 * hash(i, 52))); pos.push(p.x, p.y, p.z); uv.push(u * ru, v * rv); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c2 = a + nu + 1, d2 = c2 + 1; idx.push(a, b, d2, a, d2, c2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  function tentReal(p, pos, ry, o) {
    const { w = 2.2, d = 2.6, h = 1.7, wall = 0.75, col = '#e6dcc8', door = 1, win = 1 } = o, g = G(p, pos); g.rotation.y = ry;
    const V = (x, y, z) => new THREE.Vector3(x, y, z), x = w / 2, z = d / 2;
    const tm = new THREE.MeshStandardMaterial({ map: tentTex(col), roughness: 0.96, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.3 });
    const put = geo => { const m = sh(new THREE.Mesh(geo, tm)); g.add(m); return m; };
    { const gt = cvTex('tentGround', 128, 128, (c, w2, h2) => { const rg = c.createRadialGradient(w2 / 2, h2 / 2, w2 * 0.18, w2 / 2, h2 / 2, w2 / 2); rg.addColorStop(0, 'rgba(70,52,32,0.32)'); rg.addColorStop(0.6, 'rgba(70,52,32,0.16)'); rg.addColorStop(1, 'rgba(70,52,32,0)'); c.fillStyle = rg; c.fillRect(0, 0, w2, h2); });
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.4, d + 1.6), new THREE.MeshStandardMaterial({ map: gt, transparent: true, depthWrite: false, roughness: 1 })); gm.rotation.x = -Math.PI / 2; gm.position.y = 0.004; gm.receiveShadow = true; g.add(gm); }
    // fly sheet: roof runs past the walls (eaves) and past the gables (porch), sagging between rope points
    const ex = 1.17, ov = 0.24, eX = x * ex, eY = h + (wall - h) * ex, zz = z + ov, nL = V(-(h - wall), x, 0).normalize(), nR = V(h - wall, x, 0).normalize();
    put(quadG(V(-eX, eY, zz), V(-eX, eY, -zz), V(0, h + 0.015, zz), V(0, h + 0.015, -zz), 24, 10, 0.075, nL, 2.4, 1.2, 0.03));
    put(quadG(V(eX, eY, -zz), V(eX, eY, zz), V(0, h + 0.015, -zz), V(0, h + 0.015, zz), 24, 10, 0.075, nR, 2.4, 1.2, 0.03));
    put(quadG(V(-x - 0.07, 0, z), V(-x - 0.07, 0, -z), V(-x, wall, z), V(-x, wall, -z), 18, 4, -0.03, V(-1, 0, 0), 2.4, 0.5, 0.018));
    put(quadG(V(x + 0.07, 0, -z), V(x + 0.07, 0, z), V(x, wall, -z), V(x, wall, z), 18, 4, -0.03, V(1, 0, 0), 2.4, 0.5, 0.018));
    if (win) { const wg = G(g, [x + 0.05, wall * 0.52, z * 0.25]); wg.rotation.order = 'YXZ'; wg.rotation.set(-0.1, Math.PI / 2, 0); const ww = Math.min(0.5, d * 0.2), wh = wall * 0.36;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), stdM({ color: '#4a4135', roughness: 1, transparent: true, opacity: 0.88 })); mesh.position.z = 0.004; wg.add(mesh);
      [[0, wh / 2, ww + 0.04, 0.03], [0, -wh / 2, ww + 0.04, 0.03]].forEach(([a, b, c2, d2]) => box(wg, [a, b - 0.015, 0.006], [c2, d2, 0.006], mixHex(col, '#5a4a36', 0.35), 0.002));
      [[-ww / 2, 0], [ww / 2, 0]].forEach(([a]) => box(wg, [a, -wh / 2 - 0.015, 0.006], [0.03, wh + 0.03, 0.006], mixHex(col, '#5a4a36', 0.35), 0.002)); }
    const k = h / 1.7, dw = 0.32 * k, dh = 1.02 * k, gable = (zz, hole) => { const sp = new THREE.Shape([[-x - 0.06, 0], [x + 0.06, 0], [x, wall], [0, h], [-x, wall]].map(([a, b]) => new THREE.Vector2(a, b)));
      if (hole) sp.holes.push(new THREE.Path([[-dw, 0.03], [dw, 0.03], [dw, dh * 0.8], [0, dh], [-dw, dh * 0.8]].map(([a, b]) => new THREE.Vector2(a, b))));
      const geo = new THREE.ShapeGeometry(sp); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9, uv.getY(i) * 0.6); const m = put(geo); m.position.z = zz; return m; };
    gable(z, door); gable(-z, false);
    if (door) { const dk = new THREE.Mesh(new THREE.PlaneGeometry(dw * 2, dh), mat('#3b3127', 1)); dk.position.set(0, dh / 2, z - 0.18); g.add(dk);
      const fl = cyl(g, [0, 0, 0], 0.05 * k, 0.05 * k, dw * 2.3, mixHex(col, '#5a4a36', 0.25), 12); fl.rotation.z = Math.PI / 2; fl.position.set(0, dh + 0.04, z + 0.04); }
    else { const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.02, dh), mat(mixHex(col, '#3b3127', 0.5), 1)); sm.position.set(0, dh / 2, z + 0.005); g.add(sm); }
    const poleM = '#6b5a48'; [z, -z].forEach(zz => cyl(g, [0, 0, zz + Math.sign(zz) * 0.01], 0.022, 0.022, h + 0.1, poleM, 8));
    box(g, [0, h - 0.015, 0], [0.05, 0.03, d + 0.04], mixHex(col, '#5a4a36', 0.3), 0.01);
    box(g, [0, h + 0.02, 0], [0.07, 0.012, zz * 2], mixHex(col, '#5a4a36', 0.18), 0.004);
    const rope = (a, b) => { const dv = b.clone().sub(a), L = dv.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, L, 5), mat('#8b7a62', 1)); m.position.copy(a).addScaledVector(dv, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), dv.normalize()); g.add(m); box(g, [b.x, 0, b.z], [0.04, 0.07, 0.04], '#5c4a36', 0.005); };
    [z, -z].forEach(zz => rope(V(0, h + 0.08, zz), V(0, 0.02, zz + Math.sign(zz) * (0.55 + 0.25 * k))));
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => rope(V(a * eX, eY, b * (zz - 0.04)), V(a * (eX + 0.5 * k), 0.02, b * (zz + 0.12))));
    [-1, 1].forEach(a => [-1 / 3, 1 / 3].forEach(f => rope(V(a * eX, eY, f * zz), V(a * (eX + 0.55 * k), 0.02, f * zz))));
    return g; }

  // ---- 3 clerk ----
  const clerkScr = ctex(512, 320);
  { const s = G(scene, P.clerk); plinth(s, 8.5, 6.5);
    wallB(s, 0, -2.6, 7, 2.4, { win: [[2.6, 1.08, 1.3, 1.0]], art: [[-0.25, 1.15, 0.66, 0.86]] }); floorP(s, 8.5, 6.5, 'tile');
    bookshelf(s, [-2.2, 0, -2.3], 2.4, 2.0, 0.42);
    realDesk(s, [0.8, 0, -1.4], 2.6, 1.1);
    monitorReal(s, [1.3, 0.74, -1.75], clerkScr.tex); keyboard(s, [1.28, 0.742, -1.4], -0.04); mouse(s, [1.7, 0.742, -1.38], 0.1); mug(s, [2.0, 0.742, -1.72], C.teal, 1.1);
    cable(s, [[1.28, 0.75, -1.47], [1.3, 0.746, -1.62], [1.3, 0.746, -1.8], [1.36, 0.746, -1.9]]); cable(s, [[1.7, 0.752, -1.48], [1.62, 0.746, -1.6], [1.45, 0.746, -1.82]]);
    { const pc = G(s, [-0.32, 0.742, -1.72]); cyl(pc, [0, 0, 0], 0.035, 0.032, 0.1, C.navy, 20, 0.4); [[0.1, 0.05, C.white], [-0.08, -0.1, C.blue], [0.02, 0.12, '#E0A93B']].forEach(([a, b, c2]) => { const pn = cyl(pc, [0, 0.02, 0], 0.004, 0.004, 0.15, c2, 6, 0.4); pn.rotation.set(a, 0, b); }); }
    const book = G(s, [0.15, 0.74, -1.25]); book.rotation.y = 0.2; book.scale.setScalar(0.72); box(book, [-0.3, 0, 0], [0.58, 0.05, 0.8], C.navy, 0.02); box(book, [0.3, 0, 0], [0.58, 0.05, 0.8], C.navy, 0.02); box(book, [-0.29, 0.05, 0], [0.54, 0.03, 0.74], C.white, 0.01); box(book, [0.29, 0.05, 0], [0.54, 0.03, 0.74], C.white, 0.01);
    for (let i = 0; i < 7; i++) box(book, [-0.3 + (i % 2) * 0.6, 0.085, -0.28 + Math.floor(i / 2) * 0.17], [0.4, 0.005, 0.03], C.strong, 0.002);
    chair(s, [0.25, 0, -2.4], 0);
    const jc = puppetAv(s, [0.25, 0, -2.2], 'p22', 1.8, false, { seat: 0.46, on: [2.5, 9.5] }), jcB = bubble(jc, 'tick'), jcR = null;
    if (jcR) {
      // raised hand: speech beats while explaining; low hand: turns the ledger pages at 5.0 and 5.9
      const RF = [[3, 0], [4.3, 0], [4.5, -2], [4.8, 6], [5.1, 2.5], [5.4, 7], [5.75, 1.5], [6.15, 5.5], [6.55, 1], [6.85, -2], [7.15, 5], [7.6, 2], [8.4, 0]];
      const RH = [[3, 0], [4.3, 0], [4.8, -5], [5.4, -8], [6.15, -4], [6.85, 2], [7.15, 9], [7.7, 3], [8.4, 0]];
      const LF = [[3, 0], [4.7, 0], [4.92, -4], [5.25, 5], [5.62, 1], [5.82, -4], [6.15, 5], [6.55, 1], [7.0, 0]];
      const LH = [[3, 0], [4.7, 0], [4.92, -9], [5.3, 12], [5.62, 0], [5.82, -9], [6.2, 12], [6.6, 0], [7.0, 0]];
      const D = Math.PI / 180;
      ups.push(T => { if (T < 2.5 || T > 9.5) return; jcR.fade(jc.fade);
        const idle = (ph, k) => k * (Math.sin(T * 1.3 + ph) * 0.7 + Math.sin(T * 2.9 + ph * 2) * 0.35);
        const rf = keyA(T, RF) + idle(0, 1), lf = keyA(T, LF) + idle(1.7, 0.8);
        // wrists trail the forearm (overlapping action) instead of moving rigidly with it
        const rh = keyA(T, RH) + 0.7 * (keyA(T - 0.12, RF) - keyA(T, RF)) + idle(0.6, 1.4), lh = keyA(T, LH) + 0.7 * (keyA(T - 0.12, LF) - keyA(T, LF)) + idle(2.3, 1.2);
        jcR.R.fore.rotation.z = rf * D; jcR.R.hand.rotation.z = rh * D; jcR.L.fore.rotation.z = lf * D; jcR.L.hand.rotation.z = lh * D; });
    }
    const lp = G(book, [0, 0.09, 0]); const lpm = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.74), new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.9, side: THREE.DoubleSide })); lpm.rotation.x = -Math.PI / 2; lpm.position.x = 0.29; lp.add(lpm);
    ups.push(T => { if (T > 9) return; aTalk(jc, T, T > 4.4 && T < 6.9); const fl = [5.0, 5.9].reduce((a, t) => a + prog(T, t, t + 0.6, M.move), 0), fr = fl % 1; lp.rotation.z = fr * Math.PI; lp.visible = fr > 0.001; aNod(jc, T, 6.95, 0.4); popB(jcB, T, [[6.95, 8.1]]); });
    ups.push(T => {
      if (T < 3 || T > 8.5) return;
      const p = prog(T, 4.8, 6.9, M.move), k = Math.round(p * 12);
      clerkScr.draw(k, (c, w, h) => { c.fillStyle = C.screen; c.fillRect(0, 0, w, h); rr(c, 24, 24, 464, 34, 6, C.teal); c.fillStyle = C.navy; c.font = `600 22px ${BODY}`; c.fillText('Register', 40, 49); for (let i = 0; i < 6; i++) { const f = cl(p * 6 - i); rr(c, 24, 76 + i * 38, 464, 28, 4, 'rgba(207,224,244,0.12)'); if (f > 0) { rr(c, 34, 84 + i * 38, 150 * f, 12, 6, C.sky); rr(c, 210, 84 + i * 38, 110 * f, 12, 6, C.strong); rr(c, 350, 84 + i * 38, 90 * f, 12, 6, C.mid); } } });
    });
  }
  // ---- 4 family ----
  const formTex = ctex(640, 420); let formCard;
  { const s = G(scene, P.family); plinth(s, 11, 7.5, '#e6e0d6'); floorP(s, 11, 7.5, 'earth');
    tentReal(s, [1.7, 0, -2.5], -0.3, { w: 1.9, d: 2.2, h: 1.5, wall: 0.6, col: '#e2e6ea' });
    const Y0 = new THREE.Vector3(0, 1, 0);
    [[2.5, 0.5, 0.2, C.teal], [2.82, 0.62, -0.4, C.blue], [2.62, 0.9, 0.5, '#E0A93B']].forEach(([x, z, ry, col]) => { const g = G(s, [x, 0, z]); g.rotation.y = ry; box(g, [0, 0, 0], [0.26, 0.36, 0.15], col, 0.035, 0.5); box(g, [-0.035, 0.36, 0], [0.12, 0.035, 0.035], col, 0.012, 0.5); box(g, [0.075, 0.35, 0], [0.04, 0.05, 0.04], col, 0.01, 0.5); cyl(g, [0.075, 0.395, 0], 0.022, 0.022, 0.03, '#e8edf3', 12); });
    const rockG = (seed, r) => { const gg = new THREE.IcosahedronGeometry(r, 1), pp = gg.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); const k = 0.78 + 0.36 * hash(Math.round((v.x * 31 + v.y * 17 + v.z * 13) * 1000) + seed, 98); pp.setXYZ(i, v.x * k, v.y * k * 0.62, v.z * k); } gg.computeVertexNormals(); return gg; };
    [[-4.6, 2.6, 0.22], [-4.1, 2.9, 0.16], [4.8, 2.7, 0.2], [-1.9, 2.5, 0.12], [3.1, -0.9, 0.1], [-4.85, 1.6, 0.09]].forEach(([x, z, r], i) => { const m = sh(new THREE.Mesh(rockG(i * 7, r), stdM({ color: ['#c9bfae', '#b7ad9c', '#d2c9b8'][i % 3], roughness: 0.95, flatShading: true }))); m.position.set(x, r * 0.3, z); m.rotation.y = i * 1.3; s.add(m); });
    { const blades = []; for (let b = 0; b < 7; b++) { const a = b * 0.9 + 0.3, r0 = 0.012, lean = 0.05 + 0.04 * hash(b, 41), hh = 0.1 + 0.08 * hash(b, 42), bx = Math.cos(a), bz = Math.sin(a); blades.push(bx * r0 - bz * 0.008, 0, bz * r0 + bx * 0.008, bx * r0 + bz * 0.008, 0, bz * r0 - bx * 0.008, bx * (r0 + lean), hh, bz * (r0 + lean)); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3)); gg.computeVertexNormals();
      const pts = []; for (let i = 0; i < 500 && pts.length < 150; i++) { const x = (hash(i, 43) - 0.5) * 10.4, z = (hash(i, 44) - 0.5) * 7.0, edge = Math.max(Math.abs(x) / 5.2, Math.abs(z) / 3.5); if (edge < 0.55 && hash(i, 45) > 0.25) continue; if (Math.abs(x + 0.1) < 2.2 && z > -1.7 && z < 1.4) continue; if ((x + 2.6) ** 2 + (z + 1.7) ** 2 < 2.6 || (x - 1.7) ** 2 + (z + 2.5) ** 2 < 1.8 || (x + 4.3) ** 2 + (z + 2.6) ** 2 < 1.2 || (x - 3.5) ** 2 + (z - 2.2) ** 2 < 0.4) continue; pts.push([x, z, hash(i, 46)]); }
      const im = new THREE.InstancedMesh(gg, stdM({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), pts.length), M4g = new THREE.Matrix4(), Qg = new THREE.Quaternion(), Cg = new THREE.Color(), PALG = ['#b8ad74', '#a7a463', '#c9bd88', '#8f9a5a', '#9fae6a'];
      pts.forEach(([x, z, q], i) => { Qg.setFromAxisAngle(Y0, q * 6.28); const sc = 0.7 + q * 0.9; M4g.compose(new THREE.Vector3(x, 0, z), Qg, new THREE.Vector3(sc, sc * (0.8 + 0.5 * hash(i, 47)), sc)); im.setMatrixAt(i, M4g); im.setColorAt(i, Cg.set(PALG[i % PALG.length])); }); im.receiveShadow = true; s.add(im);
      const pb = []; for (let i = 0; i < 160; i++) { const x = (hash(i, 51) - 0.5) * 10.4, z = (hash(i, 52) - 0.5) * 7.0; if (Math.abs(x + 0.1) < 1.9 && z > -1.0 && z < 0.6) continue; pb.push([x, z, hash(i, 53)]); }
      const pm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), stdM({ color: '#ffffff', roughness: 0.95, flatShading: true }), pb.length), PALP = ['#bdb5a8', '#a59d90', '#d3cbbd', '#8f877b'];
      pb.forEach(([x, z, q], i) => { const r = 0.015 + q * 0.035; Qg.setFromEuler(new THREE.Euler(q * 3, q * 7, q * 5)); M4g.compose(new THREE.Vector3(x, r * 0.3, z), Qg, new THREE.Vector3(r, r * 0.6, r * (0.8 + 0.4 * hash(i, 54)))); pm.setMatrixAt(i, M4g); pm.setColorAt(i, Cg.set(PALP[i % 4])); }); pm.castShadow = pm.receiveShadow = true; s.add(pm); }
    { const p1 = new THREE.Vector3(2.95, 1.75, -1.55), p2 = new THREE.Vector3(4.6, 1.75, -0.4); [p1, p2].forEach(v => cyl(s, [v.x, 0, v.z], 0.025, 0.03, v.y + 0.05, '#7a6650', 8));
      const lp = []; for (let i = 0; i <= 12; i++) { const u = i / 12; lp.push(p1.clone().lerp(p2, u).add(new THREE.Vector3(0, -0.12 * Math.sin(Math.PI * u), 0))); } const lc = new THREE.CatmullRomCurve3(lp); s.add(new THREE.Mesh(new THREE.TubeGeometry(lc, 24, 0.004, 5), mat('#8b7a62', 1)));
      const dir = p2.clone().sub(p1).normalize(), ang = Math.atan2(-dir.z, dir.x);
      [[0.2, C.teal, 0.42, 0.5], [0.43, '#f3efe6', 0.5, 0.62], [0.65, '#E0A93B', 0.38, 0.46], [0.84, C.sky, 0.36, 0.5]].forEach(([u, col, w, h], i) => { const at = lc.getPointAt(u), gg = new THREE.PlaneGeometry(w, h, 6, 4), pp = gg.attributes.position; for (let j = 0; j < pp.count; j++) pp.setZ(j, 0.02 * Math.sin(pp.getX(j) * 12 + i) * (0.5 - pp.getY(j) / h)); gg.computeVertexNormals(); const m = sh(new THREE.Mesh(gg, stdM({ color: col, roughness: 0.9, side: THREE.DoubleSide }))); m.position.set(at.x, at.y - h / 2 + 0.01, at.z); m.rotation.y = ang; s.add(m); }); }
    tentReal(s, [-2.6, 0, -1.7], 0.15, { w: 2.4, d: 2.8, h: 1.9, wall: 0.85, col: '#e6dcc8' });
    tentReal(s, [-4.3, 0, -2.6], 0.5, { w: 1.5, d: 1.9, h: 1.25, wall: 0.5, col: '#d8ccb4', door: 0 }); prop(s, 'campfire-pit', [3.5, 0, 2.2], 0, 0.42, '#b3a48c'); prop(s, 'barrel', [-4.4, 0, 0.3], 0, 0.72, '#5b7db3'); prop(s, 'barrel', [-4.05, 0, 0.75], 0.6, 0.62, '#3B71B9');
    prop(s, 'bedroll-packed', [-3.9, 0, -0.9], 0.4, 0.32, '#4CC3C9'); prop(s, 'log_stack', [4.3, 0, -1.1], 1.2, 0.5); prop(s, 'bucket', [2.98, 0, 0.32], 0, 0.3, '#cfe0f4');

    const sackM = new THREE.MeshStandardMaterial({ map: tentTex('#e4d9bf'), roughness: 0.95, envMapIntensity: 0.3 });
    [[-1.25, -1.45, 0.25, 0], [-0.7, -1.55, -0.3, 0], [-1.0, -1.5, 0.05, 0.24]].forEach(([x, z, ry, y0]) => { const gg = new THREE.RoundedBoxGeometry(0.44, 0.28, 0.64, 4, 0.13), pp = gg.attributes.position; for (let i = 0; i < pp.count; i++) { const zz = pp.getZ(i); pp.setY(i, pp.getY(i) * (1 - 0.2 * (zz / 0.32) ** 2)); pp.setX(i, pp.getX(i) * (1 + 0.07 * Math.cos(zz * 4))); } gg.computeVertexNormals(); const m = sh(new THREE.Mesh(gg, sackM)); m.position.set(x, 0.13 + y0, z); m.rotation.y = ry; s.add(m); });
    box(s, [0.75, 0, -1.15], [0.6, 0.45, 0.5], '#d6c4a6', 0.04); box(s, [0.8, 0.45, -1.15], [0.5, 0.35, 0.45], '#c9b48f', 0.04);
    
    tree(s, [4.4, 0, -2.4], 1.2);
    const FO = { on: [7, 14] };
    const fa = puppetAv(s, [-0.95, 0, -0.62], 'ex6', 1.72, false, Object.assign({ seat: 0.45, hi: 1, amp: 0.6 }, FO)), fb = puppetAv(s, [-0.35, 0, -0.62], 'ex7', 1.8, false, Object.assign({ seat: 0.45, hi: 1, amp: 0.7 }, FO)), fc = puppetAv(s, [0.2, 0, -0.62], 'ex4', 1.25, false, Object.assign({ seat: 0.45, headS: 1.05, hi: 1, amp: 0.6 }, FO));
    const tabTex = ctex(512, 340);
    { const t = G(s, [-0.35, 0, -0.05]), TW = 2.0, TD = 0.8, TH = 0.73;
      const cloth = stdM({ map: cvTex('cloth', 256, 256, (c, w, h) => { c.fillStyle = '#1b2d5e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { c.fillStyle = hash(i, 95) > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)'; c.fillRect(hash(i, 96) * w, hash(i, 97) * h, 2, 1); } c.fillStyle = C.teal; c.fillRect(0, h - 14, w, 6); }), roughness: 0.95, side: THREE.DoubleSide });
      const top = sh(new THREE.Mesh(new THREE.BoxGeometry(TW + 0.04, 0.02, TD + 0.04), cloth)); top.position.y = TH; t.add(top);
      const drape = (w, x, z, ry) => { const dh = TH - 0.02, gg = new THREE.PlaneGeometry(w, dh, Math.ceil(w * 16), 2), pz = gg.attributes.position; for (let i = 0; i < pz.count; i++) pz.setZ(i, 0.014 * Math.sin(pz.getX(i) * 34 + 1.3) * (0.5 - pz.getY(i) / dh)); gg.computeVertexNormals(); const m = sh(new THREE.Mesh(gg, cloth)); m.position.set(x, dh / 2 + 0.01, z); m.rotation.y = ry; t.add(m); };
      drape(TW + 0.04, 0, TD / 2 + 0.02, 0); drape(TD + 0.04, TW / 2 + 0.02, 0, Math.PI / 2); drape(TD + 0.04, -TW / 2 - 0.02, 0, -Math.PI / 2);
      box(t, [-0.62, TH + 0.01, 0.06], [0.3, 0.012, 0.22], '#ffffff', 0.002).rotation.y = 0.2; box(t, [-0.6, TH + 0.022, 0.05], [0.3, 0.004, 0.22], '#f3f6fa', 0.001).rotation.y = 0.32;
      { const cb = G(t, [-0.1, TH + 0.01, 0.12]); cb.rotation.y = -0.15; box(cb, [0, 0, 0], [0.24, 0.008, 0.33], '#9a7650', 0.003); box(cb, [0, 0.008, 0.01], [0.21, 0.003, 0.28], '#ffffff', 0.001); box(cb, [0, 0.011, -0.135], [0.1, 0.012, 0.03], '#b9c0ca', 0.003); }
      { const pn = cyl(t, [0.13, TH + 0.012, 0.13], 0.005, 0.005, 0.14, C.blue, 6); pn.rotation.z = Math.PI / 2; pn.rotation.y = 0.4; box(t, [0.3, TH + 0.01, 0.2], [0.085, 0.003, 0.055], '#cfe0f4', 0.001); cyl(t, [-0.92, TH + 0.01, -0.18], 0.034, 0.034, 0.22, '#d5e9f1', 16, 0.15); cyl(t, [-0.92, TH + 0.23, -0.18], 0.018, 0.018, 0.03, C.blue, 12); }
      { const tg = G(t, [0.8, TH + 0.01, 0.05]); tg.rotation.y = Math.PI / 2; const blk = stdM({ color: '#1d222b', roughness: 0.35 });
        const st = sh(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.008, 0.11), blk)); st.position.y = 0.004; tg.add(st);
        const tb = G(tg, [0, 0.1, 0]); tb.rotation.x = -0.95; tb.add(sh(new THREE.Mesh(new THREE.RoundedBoxGeometry(0.3, 0.21, 0.01, 3, 0.012), blk))); plane(tb, [0, 0, 0.0056], 0.278, 0.188, tabTex.tex);
        const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.006), blk)); leg.position.set(0, 0.055, -0.05); leg.rotation.x = 0.55; tg.add(leg); } }
    { const A = new THREE.Vector3(-1.12, 2.55, -1.1), B = new THREE.Vector3(1.45, 2.55, -1.1), Cq = new THREE.Vector3(-1.12, 2.35, 0.9), D = new THREE.Vector3(1.45, 2.35, 0.9);
      s.add(sh(new THREE.Mesh(quadG(A, B, Cq, D, 12, 8, 0.07, new THREE.Vector3(0, 1, 0), 3, 2), new THREE.MeshStandardMaterial({ map: tentTex('#3B71B9'), roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.3 }))));
      [A, B, Cq, D].forEach(v => cyl(s, [v.x, 0, v.z], 0.028, 0.032, v.y, '#7a6650', 10));
      const rope = (a, b) => { const dv = b.clone().sub(a), L = dv.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, L, 5), mat('#8b7a62', 1)); m.position.copy(a).addScaledVector(dv, 0.5); m.quaternion.setFromUnitVectors(Y0, dv.clone().normalize()); s.add(m); box(s, [b.x, 0, b.z], [0.04, 0.07, 0.04], '#5c4a36', 0.005); };
      rope(Cq, new THREE.Vector3(-1.6, 0.02, 1.7)); rope(D, new THREE.Vector3(1.95, 0.02, 1.7)); }
    
    const enBk = puppetAv(s, [1.0, 0, 0.0], 'rig/ex2-back', 1.8, true, { kind: 'back', on: [9.2, 13.2], idle: 'stand' });
    
    const en = puppetAv(s, [1.0, 0, 0.0], 'ex2', 1.8, true, { on: [7, 14], idle: 'stand' });
    const tEn = bubble(en, 'dots'), tFb = bubble(fb, 'dots'), tFa = bubble(fa, 'dots'), qB = bubble(fc, 'q');
    ups.push(T => { if (T < 7.5 || T > 13.5) return; const W1 = [[8.4, 9.6], [10.9, 12.0]], W2 = [[9.6, 10.9]], W3 = [[12.0, 13.2]], on = (w) => w.some(([a, b]) => T > a && T < b);
      const ots = T >= 9.4 && T < 12.9; en.fade = ots ? 0 : 1; enBk.fade = ots ? 1 : 0; aTalk(enBk, T, on(W1)); aNod(enBk, T, 10.2);
      aTalk(en, T, on(W1)); aTalk(fb, T, on(W2)); aTalk(fa, T, on(W3)); popB(tEn, T, W1); popB(tFb, T, W2); popB(tFa, T, W3); aNod(fb, T, 9.0); aNod(en, T, 10.2); aNod(fa, T, 11.2); aNod(fc, T, 9.4, 0.4); aTalk(fc, T, T > 10.65 && T < 11.5); popB(qB, T, [[10.6, 11.8]]); if (ots) [tEn, tFb, tFa, qB].forEach(b => (b.visible = false)); });
    formCard = plane(s, [3.2, 2.7, 0.2], 2.4, 1.575, formTex.tex);
    ups.push(T => {
      if (T < 7.5 || T > 13.5) return;
      const ea = prog(T, 8.6, 11.2, M.fade); 
      const fo = tw(T, 0, 1, 9.8, 10.6, M.enter) * (1 - prog(T, 14.0, 14.5, M.fade)); formCard.material.opacity = fo; formCard.material.transparent = true; formCard.visible = fo > 0.01;
      if (T >= 9.4 && T < 12.9) { const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), rt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), upv = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        formCard.position.copy(camera.position).addScaledVector(fw, 1.6).addScaledVector(rt, PORT ? -0.1 : -0.26).addScaledVector(upv, (PORT ? 0.2 : 0.17) + 0.015 * fo); s.worldToLocal(formCard.position); formCard.quaternion.copy(camera.quaternion); formCard.scale.setScalar(PORT ? 0.09 : 0.115); }
      else { formCard.quaternion.identity(); formCard.position.set(PORT ? 2.5 : 3.2, (PORT ? 3.15 : 2.6) + 0.12 * fo, 0.2); formCard.scale.setScalar(PORT ? 1.3 : 1); }
      const nat = prog(T, 12.15, 12.55, M.move), sub = T >= 12.6 ? 1 : 0, prs = T >= 12.45 && T < 12.6 ? 1 : 0, blink = Math.floor(T * 2.2) % 2;
      const HQ = [['Household roster', '5 members'], ['Have you been forced to flee your home?', 'Yes'], ['Have you crossed an international border?', 'No'], ['Nationality', null], ['Access to electricity', 'Yes · solar lamp']];
      formTex.draw(blink + '-' + Math.round(nat * 10) + '-' + sub + prs, (c, w, h) => { c.clearRect(0, 0, w, h); rr(c, 4, 4, w - 8, h - 8, 22, C.white, C.line); c.fillStyle = C.blue; c.font = `500 21px ${MONO}`; c.fillText('HOUSEHOLD QUESTIONNAIRE', 40, 56); c.fillStyle = C.muted; c.font = `400 16px ${MONO}`; c.fillText('SECTION B · 2 OF 6', w - 220, 56);
        HQ.forEach(([l, v], i) => { const y = 68 + i * 57, act = i === 3 && nat < 1, done = i !== 3 || nat >= 1; c.fillStyle = C.muted; c.font = `400 19px ${BODY}`; c.fillText(l, 40, y + 17); rr(c, 40, y + 25, w - 80, 27, 6, act ? C.white : C.bg, act ? C.blue : C.line);
          if (v) { c.fillStyle = C.navy; c.font = `500 16px ${BODY}`; c.fillText(v, 54, y + 44); } else if (nat > 0) rr(c, 54, y + 34, 200 * nat, 10, 5, C.navy); else if (blink) { c.fillStyle = C.navy; c.fillRect(56, y + 29, 3, 19); }
          if (done) { c.fillStyle = C.teal; c.beginPath(); c.arc(w - 60, y + 38, 7, 0, 7); c.fill(); } });
        if (sub) { rr(c, w - 250, h - 60, 210, 44, 10, C.white, C.teal); c.fillStyle = C.teal; c.beginPath(); c.arc(w - 222, h - 38, 9, 0, 7); c.fill(); c.fillStyle = C.navy; c.font = `600 22px ${BODY}`; c.fillText('Submitted', w - 202, h - 30); }
        else { rr(c, w - 210, h - 60 + prs * 2, 170, 44, 10, C.teal); c.fillStyle = C.navy; c.font = `600 22px ${BODY}`; c.fillText('Submit', w - 158, h - 30 + prs * 2); } });
      const tst = T < 8.55 ? 'off' : T < 12.6 ? 'f' + Math.round(nat * 6) : 'ok';
      tabTex.draw(tst, (c, w, h) => { if (tst === 'off') { c.fillStyle = '#0e1a33'; c.fillRect(0, 0, w, h); return; } c.fillStyle = C.white; c.fillRect(0, 0, w, h); c.fillStyle = C.navy; c.fillRect(0, 0, w, 42); c.fillStyle = '#ffffff'; c.font = `600 16px ${MONO}`; c.fillText('HOUSEHOLD QUESTIONNAIRE', 16, 27); c.fillStyle = C.teal; c.beginPath(); c.arc(w - 22, 21, 7, 0, 7); c.fill();
        if (tst === 'ok') { c.fillStyle = C.teal; c.beginPath(); c.arc(w / 2, h / 2 + 4, 46, 0, 7); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(w / 2 - 20, h / 2 + 6); c.lineTo(w / 2 - 4, h / 2 + 22); c.lineTo(w / 2 + 24, h / 2 - 12); c.stroke(); c.fillStyle = C.navy; c.font = `600 26px ${BODY}`; c.textAlign = 'center'; c.fillText('Submitted', w / 2, h - 28); c.textAlign = 'left'; return; }
        const n = parseInt(tst.slice(1)); HQ.forEach(([l], i) => { const y = 50 + i * 47; c.fillStyle = C.muted; c.font = `400 14px ${BODY}`; c.fillText(l, 18, y + 11); rr(c, 18, y + 16, w - 36, 22, 5, C.bg, i === 3 ? C.blue : C.line); const f = i !== 3 ? 1 : n / 6; if (f > 0) rr(c, 28, y + 23, [150, 60, 60, 130, 170][i] * f, 8, 4, C.strong); });
        rr(c, w - 140, h - 40, 122, 32, 8, C.teal); c.fillStyle = C.navy; c.font = `600 16px ${BODY}`; c.fillText('Submit', w - 106, h - 19); });
    });
  }
  // ---- 5 desk ----
  const lapTex = ctex(640, 400); let stat, statChair;
  const LAP = [0.3, 0.76, -1.75];
  { const s = G(scene, P.desk); plinth(s, 10, 7.5);
    wallB(s, 0, -3.0, 8, 3.0, { win: [[0.3, 1.3, 2.2, 1.3]] }); wallL(s, -3.9, -0.9, 4.4, 3.0); floorP(s, 10, 7.5, 'wood');
    { const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), mat('#c9d6e8')); rug.rotation.x = -Math.PI / 2; rug.position.set(0.5, 0.009, -1.3); rug.receiveShadow = true; s.add(rug); }
    box(s, [-3.6, 1.7, -1.0], [0.4, 0.05, 1.6], C.strong, 0.02); plant(s, [-3.6, 1.75, -1.4], 0.8); bookRow(s, [-3.62, 1.75, -0.78], Math.PI / 2, [[0.034, 0.26, 0.19, C.blue], [0.028, 0.24, 0.18, C.navy], [0.04, 0.27, 0.2, C.teal], [0.024, 0.22, 0.17, '#f1ede4'], [0.032, 0.25, 0.19, '#5b7db3'], [0.03, 0.24, 0.18, C.deep, -0.22]]);
    plant(s, [-3.2, 0, -2.5], 1.5); prop(s, 'bookcaseClosedWide', [-3.45, 0, -0.5], Math.PI / 2, 1.3); prop(s, 'lampSquareFloor', [-2.4, 0, -2.6], 0, 1.6); bookRow(s, [-0.92, 0.742, -2.12], 0.12, [[0.032, 0.24, 0.17, C.navy], [0.026, 0.22, 0.16, '#f1ede4'], [0.04, 0.25, 0.18, C.blue], [0.022, 0.21, 0.15, C.teal], [0.03, 0.23, 0.17, '#8a9bb5']]); { const st = G(s, [-0.45, 0.742, -2.12]); st.rotation.y = -0.25; book(st, [0.12, 0.0175, 0], 0.035, 0.24, 0.17, C.deep, [0, 0, Math.PI / 2]); const b2 = book(st, [0.115, 0.035 + 0.014, 0.01], 0.028, 0.21, 0.15, '#E0A93B', [0, 0, Math.PI / 2]); b2.rotation.y = 0.12; } 
    realDesk(s, [0.3, 0, -1.85], 2.8, 1.15); mug(s, [1.45, 0.742, -1.55], C.white, 1.25); mouse(s, [0.95, 0.742, -1.6], -0.1);
    deskLamp(s, [1.3, 0.742, -2.2], Math.PI * 0.86);
    const lampL = new THREE.PointLight('#fff1dc', 0, 4.5, 1.2); lampL.position.set(1.35, 1.15, -2.0); s.add(lampL); ups.push(T => { lampL.intensity = T >= 50 ? 1.1 : 0; });
    laptop(s, [LAP[0], 0.742, LAP[2]], 0, lapTex.tex, 2.5, -0.2);
    statChair = chair(s, [-0.6, 0, -2.78], 0);
    const an = puppetAv(s, [-0.6, 0, -2.6], 'p67', 1.85, false, { seat: 0.46, on: [12, 19.5], acts: [[17.8, 18.7, 'cheer']] }), anB = bubble(an, 'tick'), anT = bubble(an, 'dots');
    ups.push(T => { if (T > 23 && T < 49) return; an.fade = T > 18.7 && T < 49.5 ? 0 : 1; aTalk(an, T, T > 15.6 && T < 17.5); aNod(an, T, 14.3, 0.5); aNod(an, T, 17.5, 0.35); aHop(an, T, 17.9, 0.08, 0.4); popB(anT, T, [[15.7, 17.5]]); popB(anB, T, [[17.9, 18.7]]); aNod(an, T, 51.2, 0.5); });
    ups.push(T => {
      const st = T < 15.0 ? 'off' : T < 15.8 ? 'inbox' : T < 17.7 ? 'form' + Math.round(prog(T, 15.9, 17.0, M.move) * 9) + (T > 17.5 ? 'p' : '') : 'sent';
      lapTex.draw(st, (c, w, h) => {
        c.fillStyle = st === 'off' ? C.screen : C.white; c.fillRect(0, 0, w, h);
        if (st === 'off') return;
        if (st === 'inbox') { c.fillStyle = C.muted; c.font = `500 20px ${MONO}`; c.fillText('INBOX', 36, 50); rr(c, 24, 74, w - 48, 104, 10, C.bg, C.blue); c.beginPath(); c.arc(56, 126, 9, 0, 7); c.fillStyle = C.teal; c.fill(); c.fillStyle = C.navy; c.font = `600 34px ${BODY}`; c.fillText('GAIN 2026', 82, 118); c.fillStyle = C.muted; c.font = `400 24px ${BODY}`; c.fillText('Your invitation to report', 82, 154); lines(c, 36, 214, w - 140, 4, 40, 18, C.line); return; }
        c.fillStyle = C.blue; c.font = `500 22px ${MONO}`; c.fillText('GAIN 2026', 36, 50);
        const k = st === 'sent' ? 9 : parseInt(st.slice(4));
        ['Example', 'Lead', 'Recommendations applied'].forEach((l, i) => { const y = 74 + i * 82; c.fillStyle = C.muted; c.font = `400 22px ${BODY}`; c.fillText(l, 36, y + 20); rr(c, 36, y + 32, w - 72, 34, 6, C.bg, C.line); const f = cl(k / 3 - i); if (f > 0) rr(c, 48, y + 44, [380, 150, 280][i] * f, 10, 5, C.strong); });
        if (st === 'sent') { rr(c, w - 252, h - 78, 216, 54, 10, C.white, C.teal); c.fillStyle = C.navy; c.font = `600 26px ${BODY}`; c.fillText('Submitted', w - 206, h - 42); }
        else { rr(c, w - 220, h - 78 + (st.endsWith('p') ? 3 : 0), 184, 54, 10, C.teal); c.fillStyle = C.navy; c.font = `600 26px ${BODY}`; c.fillText('Submit', w - 170, h - 42 + (st.endsWith('p') ? 3 : 0)); }
      });
      const turn = prog(T, 50.3, 51.7, M.move);
      statChair.rotation.y = 0;
    });
  }
  // ---- 6 report ----
  const repL = ctex(512, 680), repR = ctex(512, 680);
  { const s = G(scene, P.report); plinth(s, 9, 7); floorP(s, 9, 7, 'grid');
    const bk = G(s, [0, 0, 0]);
    [-1, 1].forEach(sd => { const pg = G(bk, [sd * 1.25, 0, 0]); pg.rotation.z = -sd * 0.06; box(pg, [0, 0, 0], [2.55, 0.08, 3.4], C.navy, 0.03); box(pg, [-sd * 0.02, 0.08, 0], [2.42, 0.1, 3.28], C.white, 0.02); const pl = plane(pg, [-sd * 0.02, 0.185, 0], 2.36, 3.13, (sd < 0 ? repL : repR).tex, true); pl.rotation.x = -Math.PI / 2; });

    const r5 = puppetAv(s, [-3.3, 0, -1.6], 'ex5', 1.85, true, { on: [20, 30] }); ups.push(T => { if (T < 21 || T > 29) return; aNod(r5, T, 24.3); aNod(r5, T, 25.6); });
    repL.draw('x', (c, w, h) => { c.fillStyle = C.white; c.fillRect(0, 0, w, h); if (COV.gainTables) coverFit(c, COV.gainTables, 0, 0, w, h); });
    ups.push(T => {
      if (T < 20 || T > 30) return;
      const k = Math.round(prog(T, 22.4, 24.2, M.move) * 20), land = T > 23.35 ? 1 : 0, pl = land ? Math.round(prog(T, 23.35, 23.9, M.enter) * 6) : 0;
      repR.draw(k + '-' + land + '-' + pl, (c, w, h) => { c.fillStyle = C.white; c.fillRect(0, 0, w, h); rr(c, 22, 22, w - 44, h - 44, 14, '#0a1430');
        c.strokeStyle = '#cfe0f4'; c.lineWidth = 1.5; c.strokeRect(44, 46, 268, 30); c.fillStyle = '#ffffff'; c.font = `500 15px ${MONO}`; c.fillText('ALL ROUNDS · GAIN 2021–2026', 54, 67);
        c.fillStyle = '#8db8e3'; c.font = `500 14px ${MONO}`; c.fillText('EXAMPLES BY YEAR AND LEAD', 44, 104);
        const YR = [[2021, 19, 31], [2022, 25, 11], [2023, 51, 33], [2024, 99, 27], [2025, 63, 54], [2026, 0, 0]], PT = 8, cols = 3, cw = cols * PT + 6, base = 600;
        YR.forEach(([yr, a, b], g) => { const gx = 44 + g * 72, f = cl((k / 20) * 1.5 - g * 0.12), now = g === 5;
          [[a, '#5b8fd9'], [b, '#4cc3c9']].forEach(([n, col], j) => { const x0 = gx + j * (cw + 4), ch = now ? 22 * PT + 8 : Math.ceil(n / cols) * PT + 8, dot = q => [x0 + 3 + (q % cols) * PT + PT / 2, base - 4 - Math.floor(q / cols) * PT - PT / 2];
            c.save(); c.setLineDash([3, 3]); c.strokeStyle = now ? '#8fe6ea' : col; c.globalAlpha = now ? 0.5 + 0.4 * f : 0.55; c.lineWidth = now ? 1.6 : 1.2; c.beginPath(); c.roundRect(x0, base - ch, cw, ch, [cw / 2, cw / 2, 0, 0]); c.stroke(); c.restore();
            const m = now ? (j === 0 && land ? 1 : 0) : Math.round(n * f); for (let q = 0; q < m; q++) { const [cx, cy] = dot(q); c.beginPath(); c.arc(cx, cy, 3, 0, 7); c.fillStyle = now ? '#d8fbfc' : col; c.fill(); }
            if (now && j === 0 && land) { const [cx, cy] = dot(0); c.beginPath(); c.arc(cx, cy, 6 + pl, 0, 7); c.strokeStyle = 'rgba(255,255,255,' + (0.9 - pl * 0.1).toFixed(2) + ')'; c.lineWidth = 2; c.stroke(); }
            if (!now) { c.fillStyle = col; c.font = `600 14px ${MONO}`; c.textAlign = 'center'; c.fillText(String(m), x0 + cw / 2, base - ch - 8); c.textAlign = 'left'; } });
          c.fillStyle = now ? '#4cc3c9' : '#ffffff'; c.font = `600 15px ${MONO}`; c.textAlign = 'center'; c.fillText(String(yr), gx + cw + 2, base + 28); c.textAlign = 'left';
          if (now) { c.fillStyle = '#8fe6ea'; c.font = `500 12px ${MONO}`; c.textAlign = 'center'; c.fillText(land ? '+1' : 'NEXT', gx + cw + 2, base - 22 * PT - 22); c.textAlign = 'left'; } }); });
    });
  }
  // ---- 7 annual ----
  const anL = ctex(400, 560), anR = ctex(400, 560), anCover = ctex(400, 560), anFlip = ctex(400, 560);
  let flipPg;
  { const s = G(scene, P.annual); plinth(s, 9, 7); floorP(s, 9, 7, 'grid');
    box(s, [2.3, 0, -0.6], [1.6, 0.16, 2.2], C.navy, 0.03).rotation.y = -0.12;
    const rep = (x, y, z, ry, tex, th = 0.08) => { const g = G(s, [x, y, z]); g.rotation.y = ry; box(g, [0, 0, 0], [1.5, th, 2.1], '#f3eee2', 0.01, 0.9); box(g, [0, th - 0.008, 0], [1.52, 0.01, 2.12], C.navy, 0.003); const cp = plane(g, [0, th + 0.004, 0], 1.5, 2.1, tex, true); cp.rotation.x = -Math.PI / 2; return g; };
    if (COV.ar2024) rep(2.08, 0.16, -0.42, 0.22, imgTex(COV.ar2024));
    rep(2.4, COV.ar2024 ? 0.25 : 0.16, -0.72, -0.07, anCover.tex);
    const bk = G(s, [-1.0, 0, 0.4]); bk.rotation.y = 0.15;
    [-1, 1].forEach(sd => { const pg = G(bk, [sd * 0.95, 0, 0]); pg.rotation.z = -sd * 0.05; box(pg, [0, 0, 0], [1.95, 0.08, 2.6], C.navy, 0.03); box(pg, [0, 0.08, 0], [1.84, 0.08, 2.5], C.white, 0.02); const pl = plane(pg, [0, 0.165, 0], 1.8, 2.45, (sd < 0 ? anL : anR).tex, true); pl.rotation.x = -Math.PI / 2; });
    flipPg = G(bk, [0, 0.17, 0]); const fp = plane(flipPg, [0.9, 0, 0], 1.8, 2.45, anFlip.tex, true); fp.rotation.x = -Math.PI / 2; fp.material.side = THREE.DoubleSide;

    tree(s, [-3.8, 0, -2.4], 1.0);
    anCover.draw('x', (c, w, h) => { c.fillStyle = C.navy; c.fillRect(0, 0, w, h); coverFit(c, COV.annual, 0, 0, w, h); });
    anL.draw('x', (c, w, h) => { c.fillStyle = C.white; c.fillRect(0, 0, w, h); c.fillStyle = C.navy; c.font = `500 40px ${HEAD}`; c.fillText('Findings', 30, 70); lines(c, 30, 104, 330, 5, 32, 12, C.line); rr(c, 30, 290, 340, 220, 8, C.sky); });
    anR.draw('x', (c, w, h) => { c.fillStyle = C.white; c.fillRect(0, 0, w, h); coverFit(c, COV.csBanner, 0, 0, w, 200, 0.12, 0.5); c.fillStyle = C.navy; c.font = `600 15px ${MONO}`; c.fillText('EXPLORE', 26, 236); if (COV.csGrid) { const im = COV.csGrid, sx = 120, sy = 395, sw = im.width - 2 * sx * im.width / 2612, sh3 = im.height - sy * im.height / 1218; c.drawImage(im, sx * im.width / 2612, sy * im.height / 1218, sw, sh3, 14, 252, w - 28, (w - 28) * sh3 / sw); } });
    anFlip.draw('x', (c, w, h) => { c.fillStyle = C.paper; c.fillRect(0, 0, w, h); lines(c, 30, 60, 330, 12, 36, 12, C.line, 1, 9); });
    const glowT = ctex(256, 256); glowT.draw('x', (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.62); g.addColorStop(0, 'rgba(76,195,201,0.85)'); g.addColorStop(1, 'rgba(76,195,201,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const csG = plane(bk, [0.95, 0.2, 0], 2.6, 3.2, glowT.tex); csG.rotation.x = -Math.PI / 2; csG.material.transparent = true; csG.material.blending = THREE.AdditiveBlending; csG.material.depthWrite = false; csG.material.fog = false;
    ups.push(T => { const f = prog(T, 27.4, 28.2, M.move); flipPg.rotation.z = f * Math.PI; flipPg.visible = f > 0.001 && f < 0.999; const g = tw(T, 0, 1, 28.9, 29.6, M.enter) * tw(T, 1, 0.55, 30.5, 32.5, M.fade); csG.visible = g > 0.01; csG.material.opacity = g; });
  }
  // ---- 8 call ----
  const callTex = ctex(1024, 560);
  { const s = G(scene, P.call); plinth(s, 9, 7);
    wallB(s, 0, -2.9, 7.6, 2.9, { win: [[-3.0, 1.05, 1.0, 1.45], [3.0, 1.05, 1.0, 1.45]] }); floorP(s, 9, 7, 'carpet');
    box(s, [0, 0.8, -2.75], [4.4, 2.0, 0.12], C.ink, 0.06); plane(s, [0, 1.8, -2.68], 4.2, 2.3 * 0.8, callTex.tex);
    realDesk(s, [0, 0, -0.4], 3.4, 1.0); mug(s, [0.15, 0.742, -0.35], C.navy, 1.1); { const pp = G(s, [-0.2, 0.742, -0.3]); pp.rotation.y = 0.15; box(pp, [0, 0, 0], [0.21, 0.012, 0.297], C.white, 0.002); }
    [-0.8, 0.8].forEach(x => laptop(s, [x, 0.742, -0.55], Math.PI, null, 1.35));
    const cs = [[-0.8, 'ex1'], [0.8, 'ex4']].map(([x, id]) => puppetAv(s, [x, 0, -0.95], id === 'ex1' ? 'ex3' : id, 1.8, x > 0, { seat: 0.46, on: [31, 41] })), cB = cs.map(a => bubble(a, 'dots'));
    plant(s, [3.3, 0, -2.3], 1.3);
    const jv = puppetAv(s, [2.6, 0, 0.7], 'p22', 1.85, false, { on: [31, 41], alt: 'think' });
    ups.push(T => { if (T < 32 || T > 40) return; const W2 = [[[33.8, 35.1], [36.4, 37.7]], [[35.1, 36.4]]]; cs.forEach((a, i) => aTalk(a, T, W2[i].some(([x, y]) => T > x && T < y))); cB.forEach((b, i) => popB(b, T, W2[i])); poseAt(jv, T, [[0, 'p22'], [35.2, 'p40'], [37.8, 'p22']]); aNod(jv, T, 37.9); });
    const CROPS = new Map(), camCrop = im => { if (CROPS.has(im)) return CROPS.get(im); const W2 = im.width, H2 = im.height, cv2 = document.createElement('canvas'); cv2.width = W2; cv2.height = Math.round(H2 * 0.14); const x2 = cv2.getContext('2d'); x2.drawImage(im, 0, 0); const d2 = x2.getImageData(0, 0, W2, cv2.height).data; let sx = 0, n = 0; for (let yy = 0; yy < cv2.height; yy += 2) for (let xx = 0; xx < W2; xx += 2) if (d2[(yy * W2 + xx) * 4 + 3] > 128) { sx += xx; n++; } const hx = n ? sx / n : W2 / 2, ch = H2 * 0.34, cw = ch * 1.24; const r = { x: Math.max(0, Math.min(W2 - cw, hx - cw / 2)), y: 0, w: Math.min(cw, W2), h: ch }; CROPS.set(im, r); return r; };
    const face = (c, x, y, w, h, sk, shc, hr) => { rr(c, x, y, w, h, 10, C.sky); c.fillStyle = shc; c.beginPath(); c.ellipse(x + w / 2, y + h, w * 0.28, h * 0.32, 0, Math.PI, 0); c.fill(); c.fillStyle = sk; c.beginPath(); c.arc(x + w / 2, y + h * 0.45, h * 0.18, 0, 7); c.fill(); c.fillStyle = hr; c.beginPath(); c.arc(x + w / 2, y + h * 0.42, h * 0.19, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.fillStyle = C.ink; [-1, 1].forEach(d => { c.beginPath(); c.arc(x + w / 2 + d * h * 0.065, y + h * 0.46, h * 0.018, 0, 7); c.fill(); }); c.strokeStyle = C.ink; c.lineWidth = 3; c.beginPath(); c.arc(x + w / 2, y + h * 0.5, h * 0.05, 0.2, Math.PI - 0.2); c.stroke(); };
    ups.push(T => {
      if (T < 30 || T > 41) return;
      const k = Math.round(prog(T, 34.4, 37.6, M.move) * 12);
      callTex.draw(k, (c, w, h) => { c.fillStyle = C.navy; c.fillRect(0, 0, w, h); const tw2 = (w - 40) / 3, th = (h - 30) / 2;
        for (let i = 0; i < 6; i++) { const x = 10 + (i % 3) * (tw2 + 10), y = 10 + Math.floor(i / 3) * (th + 10);
          if (i === 5) { rr(c, x, y, tw2, th, 10, C.white); c.fillStyle = C.teal; c.fillRect(x + 22, y + 22, 44, 4); c.fillStyle = C.navy; c.font = `500 25px ${HEAD}`; c.fillText('Methodological papers', x + 22, y + 56);
            [COV.mp4, COV.mp3].forEach((im, j) => { const f = cl(k / 6 - j * 0.8); if (!im || f <= 0) return; const ch = th - 92, cw2 = ch * 0.707, cx = x + 22 + j * (cw2 + 14), cy = y + 74 + (1 - f) * 18; c.save(); c.globalAlpha = f; c.shadowColor = 'rgba(20,35,76,0.25)'; c.shadowBlur = 10; c.shadowOffsetY = 4; c.drawImage(im, cx, cy, cw2, ch); c.restore(); }); }
          else { const im = AVT[['ex3', 'ex6', 'ex2', 'ex5', 'p67'][i]].image, crop = camCrop(im); rr(c, x, y, tw2, th, 10, C.sky); c.save(); c.beginPath(); c.roundRect(x, y, tw2, th, 10); c.clip(); const g2 = c.createLinearGradient(0, y, 0, y + th); g2.addColorStop(0, ['#dfe8f3', '#e9e3d8', '#dfeceb', '#e6e9f0', '#ece6df'][i]); g2.addColorStop(1, '#c9d6e6'); c.fillStyle = g2; c.fillRect(x, y, tw2, th); c.fillStyle = 'rgba(20,35,76,0.08)'; c.fillRect(x, y + th * 0.42, tw2, 6);
            const sh2 = th / crop.h * 1.0, dw = crop.w * sh2; c.drawImage(im, crop.x, crop.y, crop.w, crop.h, x + (tw2 - dw) / 2, y + th * 0.06, dw, th); c.restore(); } } });
    });
  }
  // ---- 8b training ----
  const trainTex = ctex(1024, 576);
  { const s = G(scene, P.train); plinth(s, 9, 7); floorP(s, 9, 7, 'tile');
    wallB(s, 0, -2.9, 7.6, 3.0, { win: [[-3.0, 1.05, 1.0, 1.4]] });
    box(s, [0.3, 0.62, -2.76], [4.0, 2.3, 0.08], C.ink, 0.04); prop(s, 'lampSquareFloor', [-3.5, 0, -2.35], 0, 1.5); plant(s, [3.6, 0, -0.3], 1.2); prop(s, 'bookcaseClosedWide', [-3.55, 0, 0.2], Math.PI / 2, 1.2); plane(s, [0.3, 1.77, -2.71], 3.84, 2.16, trainTex.tex);
    [[-1.1, -0.9], [1.5, -0.9], [-1.1, 0.7], [1.5, 0.7]].forEach(([x, z]) => { realDesk(s, [x, 0, z], 2.0, 0.8); [-0.45, 0.45].forEach(dx => laptop(s, [x + dx, 0.742, z + 0.1], Math.PI, null, 1.15)); });
    const TB = [['ex3', -1.55, -1.45], ['ex6', -0.65, -1.45], ['ex2', 1.05, -1.45], ['ex4', 1.95, -1.45], ['ex6', -1.55, 0.15], ['ex5', -0.65, 0.15], ['ex3', 1.05, 0.15], ['ex4', 1.95, 0.15]];
    const tbs = TB.map(([id, x, z], i) => puppetAv(s, [x, 0, z], id, 1.74 + hash(i, 17) * 0.08, false, { seat: 0.48, tr: true, on: [36, 45] }));
    const trn = puppetAv(s, [3.15, 0, -1.9], 'p22', 1.85, false, { tr: true, on: [36, 45], alt: 'point' }), trB = bubble(trn, 'dots'), tkB = bubble(tbs[2], 'tick');
    ups.push((T, Tr) => { if (Tr < 37 || Tr > 44.5) return; poseAt(trn, Tr, [[0, 'p22'], [40.4, 'p52'], [41.5, 'p22']]); aTalk(trn, Tr, Tr > 39.8 && Tr < 41.8); popB(trB, Tr, [[39.9, 41.4]]);
      tbs.forEach((a, i) => { aNod(a, Tr, 40.2 + i * 0.22, 0.45); if (i % 3 === 1) a.rig.rotation.x -= 0.06; }); aTalk(tbs[5], Tr, Tr > 41.4 && Tr < 42.2); popB(tkB, Tr, [[41.0, 42.3]]);
      trainTex.draw(Tr > 39.6 ? 'h' : 'n', (c, w, h) => { c.fillStyle = C.white; c.fillRect(0, 0, w, h); const ch = h - 80, cw2 = ch * 0.707; c.save(); c.shadowColor = 'rgba(20,35,76,0.22)'; c.shadowBlur = 14; c.shadowOffsetY = 5; if (COV.manual) c.drawImage(COV.manual, 44, 40, cw2, ch); c.restore(); const x0 = 44 + cw2 + 48; c.fillStyle = C.teal; c.fillRect(x0, 52, 90, 7); c.fillStyle = C.navy; c.font = `500 46px ${HEAD}`; c.fillText('Guidance and', x0, 118); c.fillText('capacity strengthening', x0, 170); [0, 1, 2].forEach(i => { const y = 228 + i * 92; if (i === 1 && Tr > 39.6) rr(c, x0 - 14, y - 14, w - x0 - 30, 72, 10, 'rgba(76,195,201,0.28)'); c.fillStyle = C.teal; c.font = `600 34px ${MONO}`; c.fillText(String(i + 1), x0 + 4, y + 32); lines(c, x0 + 56, y + 6, w - x0 - 120, 2, 26, 14, C.strong, 1, i * 3 + 2); }); }); });
  }
  // ---- 9 hall ----
  const hallScr = ctex(640, 360), signTex = ctex(512, 256);
  { const s = G(scene, P.hall); plinth(s, 10, 8);
    wallB(s, 0, -3.6, 9, 3.4, { wain: '#2a3f78', rail: C.teal, win: [[-3.7, 1.1, 0.8, 1.9], [3.7, 1.1, 0.8, 1.9]] }); floorP(s, 10, 8, 'carpet');
    [-2.55, 2.55].forEach(x => { box(s, [x, 0.95, -3.47], [0.55, 2.2, 0.04], C.navy, 0.01); box(s, [x, 2.95, -3.44], [0.55, 0.1, 0.04], C.teal, 0.01); });
    box(s, [0, 0, -2.6], [8, 0.4, 2.0], '#dccbb0', 0.03); box(s, [0, 0, -1.6], [8.04, 0.4, 0.06], C.navy, 0.02);
    [-3.65, 3.65].forEach(x => { prop(s, 'speaker', [x, 0.4, -2.4], 0, 1.05); plant(s, [x, 0, -1.25], 1.1); });

    box(s, [0, 1.3, -3.45], [3.6, 1.9, 0.1], C.ink, 0.05); plane(s, [0, 2.25, -3.38], 3.45, 1.94, hallScr.tex);
    const js = puppetAv(s, [0.9, 0.4, -2.55], 'p22', 1.85, false, { on: [37, 47], alt: 'point', idle: 'stand' });
    ups.push(T => { if (T < 38 || T > 46) return; poseAt(js, T, [[0, 'p52'], [40.6, 'p22'], [41.9, 'p52'], [43.1, 'p22']]); aTalk(js, T, T > 40.2 && T < 44.2); aud.forEach((a, i) => { aNod(a, T, 41.0 + (i % 5) * 0.55, 0.5); aHop(a, T, 44.0 + hash(i, 11) * 0.5, 0.08, 0.4); }); });
    box(s, [0.9, 0.4, -2.05], [0.9, 1.05, 0.5], C.paper, 0.04); box(s, [0.9, 1.45, -2.1], [1.0, 0.06, 0.6], C.blue, 0.02);
    plane(s, [0.9, 1.0, -1.79], 0.86, 0.43, signTex.tex, true);
    signTex.draw('x', (c, w, h) => { c.fillStyle = C.paper; c.fillRect(0, 0, w, h); c.fillStyle = C.navy; c.textAlign = 'center'; c.font = `500 46px ${HEAD}`; c.fillText('UN Statistical', w / 2, 108); c.fillText('Commission', w / 2, 168); c.fillStyle = C.teal; c.fillRect(w / 2 - 40, 196, 80, 5); });
    const aud = []; for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
      const x = -3.0 + k * 1.0, z = -0.3 + r * 0.95;
      if (hash(r * 7 + k, 4) > 0.3) { const id = AUD[(r * 5 + k * 2) % AUD.length]; const av = puppetAv(s, [x + (r % 2) * 0.5 + (hash(r * 7 + k, 6) - 0.5) * 0.25, 0, z + 0.1], id, 1.55 + hash(r * 7 + k, 7) * 0.1, (r + k) % 2 === 0, { kind: 'back', idle: 'listen', on: [36.5, 47] }); av.m.renderOrder = r; aud.push(av); }
    }
    ups.push(T => {
      if (T < 36 || T > 46) return;
      const k = Math.round(prog(T, 40.2, 41.6, M.move) * 16);
      const hb = prog(T, 40.2, 41.8, M.move), hd = prog(T, 40.8, 42.4, M.move);
      hallScr.draw(Math.round(hb * 40) + '-' + Math.round(hd * 40), (c, w, h) => { c.fillStyle = '#072D62'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(207,224,244,0.12)'; c.lineWidth = 1; for (let gy = 148; gy <= 318; gy += 34) { c.beginPath(); c.moveTo(28, gy); c.lineTo(300, gy); c.stroke(); }
        c.fillStyle = '#8db8e3'; c.font = `500 13px ${MONO}`; c.fillText('GAIN · EXAMPLES REPORTED, 2021–2025', 28, 36); c.fillStyle = '#ffffff'; c.font = `600 46px ${MONO}`; c.fillText(String(Math.round(413 * hb)), 28, 88); c.fillStyle = '#cfe0f4'; c.font = `400 15px ${BODY}`; c.fillText('examples tracked', 28, 112);
        const YRS = [[2021, 50], [2022, 36], [2023, 84], [2024, 126], [2025, 117]], bx = 28, by = 318, bw2 = 38, bh = 170;
        YRS.forEach(([yr, n], i) => { const f = cl(hb * 1.6 - i * 0.15), hh = bh * n / 126 * f, x = bx + i * (bw2 + 12); c.fillStyle = i === 3 ? '#F06667' : '#4CC3C9'; c.beginPath(); c.roundRect(x, by - hh, bw2, hh, [3, 3, 0, 0]); c.fill(); c.fillStyle = '#ffffff'; c.font = `600 12px ${MONO}`; c.textAlign = 'center'; if (f > 0.9) c.fillText(String(n), x + bw2 / 2, by - hh - 6); c.fillStyle = '#8db8e3'; c.fillText(String(yr), x + bw2 / 2, by + 18); c.textAlign = 'left'; });
        const SEG = [['Administrative data', 87, '#4CC3C9'], ['Survey', 76, '#F06667'], ['Census', 18, '#9fe0e3'], ['Workshop / training', 18, '#f7a3a4'], ['Other', 41, '#5b7db3']], tot = 240, cx = 432, cy = 176, R = 92, r0 = 56;
        c.fillStyle = '#8db8e3'; c.font = `500 13px ${MONO}`; c.fillText('BY DATA SOURCE', 352, 36); let a0 = -Math.PI / 2;
        SEG.forEach(([lab, n, col], i) => { const a1 = a0 + (n / tot) * Math.PI * 2 * hd; c.beginPath(); c.arc(cx, cy, R, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fillStyle = col; c.fill(); a0 = a0 + (n / tot) * Math.PI * 2 * hd + 0.0; 
          const ly = 292 + i * 14; c.fillStyle = col; c.fillRect(352, ly - 8, 9, 9); c.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.6 * hd).toFixed(2) + ')'; c.font = `400 11px ${BODY}`; c.fillText(lab + '  ' + n, 368, ly); });
        c.fillStyle = '#ffffff'; c.font = `600 24px ${MONO}`; c.textAlign = 'center'; c.fillText(String(Math.round(tot * hd)), cx, cy + 4); c.fillStyle = '#8db8e3'; c.font = `400 11px ${BODY}`; c.fillText('classified', cx, cy + 20); c.textAlign = 'left'; });
    });
  }
  // ---- globe ----
  const [map, roster] = data;
  const GR = 11, GC = new THREE.Vector3(P.map[0], 13, P.map[2]), D2R = Math.PI / 180, YAX = new THREE.Vector3(0, 1, 0);
  const span = map.lat[1] - map.lat[0];
  const gtex = ctex(2048, 1024);
  const px = (u, v) => [u * 2048, (90 - (map.lat[1] - v * span)) / 180 * 1024];
  const drawRings = (c, rings) => { c.beginPath(); rings.forEach(R => { let lo = 1, hi = 0; for (let i = 0; i < R.length; i += 2) { lo = Math.min(lo, R[i]); hi = Math.max(hi, R[i]); } if (hi - lo > 0.5) return; for (let i = 0; i < R.length; i += 2) { const [x, y] = px(R[i], R[i + 1]); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }); };
  const byC = {}; roster.forEach(r => { if (r[3]) byC[r[3]] = (byC[r[3]] || 0) + 1; });
  const maxN = Math.max(...Object.values(byC));
  gtex.draw('x', (c, w, h) => {
    c.fillStyle = '#1d3a78'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(207,224,244,0.10)'; c.lineWidth = 1.5;
    for (let x = 0; x <= w; x += w / 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    drawRings(c, map.land); c.fillStyle = '#5674b0'; c.fill();
    Object.keys(byC).forEach(k => { if (!map.hl[k]) return; drawRings(c, map.hl[k]); c.fillStyle = 'rgba(76,195,201,' + (0.5 + 0.45 * Math.min(1, byC[k] / maxN)).toFixed(2) + ')'; c.fill(); });
  });
  const globe = G(scene, [GC.x, GC.y, GC.z]);
  globe.add(sh(new THREE.Mesh(new THREE.SphereGeometry(GR, 96, 64), new THREE.MeshStandardMaterial({ map: gtex.tex, roughness: 0.8, envMapIntensity: 0.12 }))));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(GR * 1.07, 64, 32), new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0.14, side: THREE.BackSide })));
  const gpos = (lon, lat, r) => { const ph = (lon + 180) * D2R, la = lat * D2R; return new THREE.Vector3(-Math.cos(ph) * Math.cos(la) * r, Math.sin(la) * r, Math.sin(ph) * Math.cos(la) * r); };
  const ll = k => { const v = map.cent[k]; return [v[0] * 360 - 180, map.lat[1] - v[1] * span]; };
  const gRot = T => { const u = cl((T - 45.8) / 4.2), e = u < 0.82 ? u / 0.82 * 0.78 : 0.78 + (1 - Math.pow(1 - (u - 0.82) / 0.18, 2)) * 0.22; return (-262 + 336 * e) * D2R; };
  const toWorld = (loc, th, out) => out.copy(loc).applyAxisAngle(YAX, th).add(GC);
  const kIn = {};
  const mdots = roster.filter(r => r[3] && map.cent[r[3]]).map((r, j) => { const k = kIn[r[3]] = (kIn[r[3]] ?? -1) + 1; const [lo, la] = ll(r[3]); return { loc: gpos(lo, la, GR + 0.18 + k * 0.32), lead: r[1], j }; });
  const srcs = ['clerk', 'family', 'desk', 'report', 'annual', 'call', 'train', 'hall'].map(k => new THREE.Vector3(P[k][0], 1.5, P[k][2]));
  mdots.forEach((d, i) => { d.from = srcs[Math.floor(hash(i, 5) * srcs.length)].clone().add(new THREE.Vector3((hash(i, 6) - 0.5) * 1.2, 0, (hash(i, 7) - 0.5) * 1.0)); d.s = 45.3 + 2.0 * hash(i, 8); });
  const dotGeo = new THREE.SphereGeometry(0.16, 14, 10);
  const mkInst = (col, n) => { const im = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#7fe0e4', toneMapped: false }), n); scene.add(im); return im; };
  const tealI = mkInst(C.teal, mdots.length), blueI = mkInst(C.teal, mdots.length);
  const GP = new Float32Array(mdots.length * 3); const glowPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(GP, 3)), new THREE.PointsMaterial({ size: 1.5, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, color: '#4cc3c9', toneMapped: false })); scene.add(glowPts);
  const tmpW = new THREE.Vector3();
  const LBL = [{ c: 'Mexico', side: 'r', t: 'Intercensal Survey 2025, Mexico', cv: 'assets/covers/mexico-intercensal-2025.png', at: 49.0 }, { c: 'Burkina Faso', side: 'l', t: 'IDP and host community survey, Burkina Faso', cv: 'assets/covers/burkina-esep-pdi-2024.png', at: 48.2 }, { c: 'Mozambique', side: 'r', t: 'Durable solutions for IDPs, Mozambique', cv: 'assets/covers/mozambique-pemba-durable-solutions.png', at: 47.4 }, { c: 'Kenya', side: 'l', t: 'Demographic and Health Survey 2022, Kenya', cv: 'assets/covers/kenya-dhs-2022.png', at: 47.8 }, { c: 'Italy', side: 'r', t: 'Entry, marriage and citizenship, Italy', cv: 'assets/covers/italy-istat-citizenship-2025.png', at: 47.6 }, { c: 'Nigeria', side: 'l', t: 'Report on internally displaced persons 2023, Nigeria', cv: 'assets/covers/nigeria-idp-2023.png', at: 47.5 }].map(l => ({ ...l, loc: gpos(...ll(l.c), GR + 0.3) }));
  { const V = new THREE.Vector3(0, Math.sin(14 * D2R), Math.cos(14 * D2R)), n = new THREE.Vector3(); LBL.forEach(l => { let bt = 48, bf = -2; for (let t = 46.2; t <= 50; t += 0.02) { n.copy(l.loc).normalize().applyAxisAngle(YAX, gRot(t)); const f = n.dot(V); if (f > bf) { bf = f; bt = t; } } l.at = Math.min(49.05, Math.max(46.6, bt - 0.7)); l.bf = bf; }); LBL.sort((x, y) => x.at - y.at); for (let i = 1; i < LBL.length; i++) LBL[i].at = Math.min(49.2, Math.max(LBL[i].at, LBL[i - 1].at + 0.45)); LBL.forEach((l, i) => (l.side = i % 2 ? 'r' : 'l')); window.__LBL = LBL.map(l => [l.c, +l.at.toFixed(2), +l.bf.toFixed(2)]); }

  // ---- travelling dot + trail ----
  const local = (k, v) => new THREE.Vector3(...add3(P[k], v));
  const tp = [local('desk', [0.3, 1.05, -1.6]), local('desk', [1.0, 0.9, -1.45]), local('desk', [1.6, 0.14, -0.8]), local('desk', [3.4, 0.14, 0.8]), local('desk', [4.9, 0.14, 2.6]), local('desk', [6.0, -0.16, 3.8])];
  const hop = (k, tgt, ent, ext) => [local(k, ent), local(k, tgt), local(k, ext)];
  const legPts = [
    [local('report', [-5.5, -0.16, -1.0]), local('report', [-4.4, 0.14, -0.6]), local('report', [-1.0, 0.55, 0.4]), local('report', [1.954, 0.26, 1.16])],
    [local('report', [2.7, 0.42, 1.45]), local('report', [4.3, 0.14, 1.0]), local('report', [5.4, -0.16, 0.6]), local('annual', [-5.4, -0.16, 2.2]), local('annual', [-4.4, 0.14, 1.8]), local('annual', [-0.1, 0.42, 0.5])],
    [local('annual', [0.5, 0.4, 1.5]), local('annual', [4.4, 0.14, 2.4]), local('annual', [5.4, -0.16, 3.6]), local('call', [-5.4, -0.16, -0.6]), local('call', [-4.4, 0.14, -0.2]), local('call', [-0.2, 0.88, -0.2])],
    [local('call', [1.0, 0.88, -0.1]), local('call', [4.4, 0.14, 0.6]), local('call', [5.4, -0.16, 0.2]), local('hall', [-5.4, -0.16, 2.4]), local('hall', [-4.9, 0.14, 1.6]), local('hall', [-3.9, 0.14, -0.9]), local('hall', [-0.2, 0.54, -1.65])],
  ];
  const feed = new THREE.CatmullRomCurve3([local('family', [0.45, 0.98, 0.05]), local('family', [1.5, 0.7, 0.9]), local('family', [2.9, 0.14, 1.7]), local('family', [5.2, 0.14, 2.6]), local('family', [6.0, -0.16, 3.0]), local('desk', [-5.6, -0.16, 3.0]), local('desk', [-4.7, 0.14, 2.9]), local('desk', [-2.4, 0.14, 1.5]), local('desk', [1.9, 0.3, -0.6]), local('desk', [1.2, 1.1, -1.3]), tp[0]], false, 'centripetal');
  const curves = [feed, new THREE.CatmullRomCurve3([...tp, ...legPts[0]], false, 'centripetal'), ...legPts.slice(1).map((pts, i) => new THREE.CatmullRomCurve3([legPts[i][legPts[i].length - 1], ...pts], false, 'centripetal'))];
  const trail = []; curves.forEach((cv, ci) => { const n = Math.round(cv.getLength() / 0.32); for (let i = 0; i <= n; i++) trail.push({ ci, f: i / n, p: cv.getPointAt(i / n) }); });
  const trI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#8fe6ea', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), trail.length); trI.receiveShadow = true; scene.add(trI);
  const haloTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); const g = c.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(160,235,238,0.75)'); g.addColorStop(0.6, 'rgba(76,195,201,0.22)'); g.addColorStop(1, 'rgba(76,195,201,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshBasicMaterial({ color: '#d8fbfc', toneMapped: false })); scene.add(dot);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#7fe0e4', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.scale.setScalar(1.4); dot.add(halo);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: C.teal, transparent: true })); ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const preTr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), trI.material, 240); preTr.frustumCulled = false; preTr.count = 0; scene.add(preTr);
  const fwdV = new THREE.Vector3(), dE = new THREE.Vector3(), dQ = new THREE.Vector3(), M4p = new THREE.Matrix4(), Qp = new THREE.Quaternion(), Sp = new THREE.Vector3();
  const G0S = new THREE.Vector3(Math.sin(-8 * D2R) * Math.cos(8 * D2R), Math.sin(8 * D2R), Math.cos(-8 * D2R) * Math.cos(8 * D2R)).applyAxisAngle(YAX, -0.75); G0S.y -= 0.32; G0S.normalize();
  const gCenter = out => { fwdV.set(0, 0, -1).applyQuaternion(camera.quaternion); const oc = camera.position.clone().sub(GC), b = oc.dot(fwdV), cc = oc.lengthSq() - (GR + 0.15) ** 2, disc = b * b - cc, t = disc > 0 ? -b - Math.sqrt(disc) : -b; return out.copy(camera.position).addScaledVector(fwdV, t).sub(GC).normalize(); };
  const gPt = (u, out) => { dQ.copy(G0S).lerp(dE, u).normalize(); return out.copy(GC).addScaledVector(dQ, GR + 0.15); };
  const C1 = new THREE.CatmullRomCurve3([local('clerk', [0.5, 1.0, -1.25]), local('clerk', [0.34, 0.97, -1.22]), local('clerk', [0.18, 0.93, -1.2])]);
  const C2 = new THREE.CatmullRomCurve3([local('clerk', [0.18, 0.93, -1.2]), local('clerk', [0.55, 1.3, -1.32]), local('clerk', [1.0, 1.26, -1.55]), local('clerk', [1.3, 1.14, -1.7])]);
  const TABW = local('family', [0.45, 0.86, 0.05]);
  function preDot(T, out) {
    if (T < 0.5) return 0;
    if (T < 4.0) { gCenter(dE); gPt(prog(T, 0.6, 3.5, M.move), out); return 0.026 * camera.position.distanceTo(out) * prog(T, 0.5, 0.95, M.enter); }
    if (T < 8.0) { if (T < 4.5) C1.getPointAt(prog(T, 4.0, 4.5, M.move), out); else if (T < 6.0) { C1.getPointAt(1, out); out.y += 0.025 * Math.sin((T - 4.5) * 3.2); } else C2.getPointAt(prog(T, 6.0, 6.8, M.move), out); return 1 - prog(T, 6.8, 7.1, M.fade); }
    if (T < 8.75) { out.copy(TABW); out.y += 1.6 * (1 - prog(T, 8.05, 8.6, M.move)); return (1 - prog(T, 8.55, 8.75, M.fade)) * prog(T, 8.0, 8.12, M.enter); }
    return 0; }
  const dotAt = (t, out) => { if (t < 12.9) return preDot(t, out); if ((t >= 15.0 && t < 18.0) || t >= 45.0) return 0;
    let ci = -1, f = 0; LEGS.forEach(([s0, e0], i) => { if (t >= s0) { ci = i; f = prog(t, s0, e0, M.move); } });
    const pop = t < 15 ? prog(t, 12.9, 13.25, M.enter) * (1 - prog(t, 14.75, 15.0, M.fade)) : prog(t, 18.0, 18.5, M.enter);
    if (t >= 18.0 && ci < 1) { out.copy(tp[0]); out.z += 0.2 * pop; } else if (ci >= 0) curves[ci].getPointAt(Math.min(1, f), out); else feed.getPointAt(0, out);
    if (t >= 18.0 && t < 18.6) out.y += Math.sin(Math.PI * prog(t, 18.0, 18.6, M.fade)) * 0.3; return pop; };
  const miniAt = (tr, out) => { if (tr <= 37.6 || tr >= 40.2) return 0; const p = prog(tr, 37.7, 39.6, M.move); out.lerpVectors(sA, sB, p); out.y += Math.sin(Math.PI * p) * 3.2; return 0.7 * (1 - prog(tr, 39.6, 40.2, M.fade)) * (0.4 + 0.6 * prog(tr, 37.6, 37.95, M.enter)); };
  const CUTS = [4.0, 8.0, 9.4, 12.9, 54.0];
  const comet = (fn, t, base, N, W, cut) => { for (let i = 0; i < N; i++) { const f = i / (N - 1), ti = t - W * f, sc = ti < cut ? 0 : fn(ti, Sp), k = Math.pow(1 - f, 1.5); M4p.compose(Sp, Qp, dQ.setScalar(Math.max(0.0001, sc * 1.7 * (0.06 + 0.94 * k)))); preTr.setMatrixAt(base + i, M4p); } };
  function preTrail(T, Tr = T) { const cut = CUTS.reduce((m, c) => (c <= T ? c : m), 0);
    if (T >= 0.6 && T < 4.0) { const pg = prog(T, 0.6, 3.5, M.move), sc = 0.05 * camera.position.distanceTo(GC), len = Math.min(pg, 0.38), N = 90; for (let i = 0; i < N; i++) { const f = i / (N - 1), u = pg - len * f; gPt(Math.max(0, u), Sp); const k = Math.pow(1 - f, 1.6); M4p.compose(Sp, Qp, dQ.setScalar(Math.max(0.0001, sc * (0.08 + 0.92 * k) * (u < 0 ? 0 : 1)))); preTr.setMatrixAt(i, M4p); } }
    else { for (let i = 90; i < 160; i++) { M4p.compose(Sp, Qp, dQ.setScalar(0.0001)); preTr.setMatrixAt(i, M4p); } }
    if (!(T >= 0.6 && T < 4.0)) comet(dotAt, T, 0, 160, 0.34, cut);
    comet(miniAt, Tr, 160, 80, 0.34, 0);
    preTr.count = 240; preTr.instanceMatrix.needsUpdate = true; }
  const LEGS = [[13.0, 15.0], [18.6, 23.4], [27.0, 28.8], [32.4, 34.0], [38.4, 40.0]];
  const hallEnd = curves[curves.length - 1].getPointAt(1).clone();
  const herLocal = new THREE.Vector3(0, Math.sin(0.17) * (GR + 0.5), Math.cos(0.17) * (GR + 0.5)).applyAxisAngle(YAX, -gRot(48.8));
  const walker = puppetAv(scene, [0, 0, 0], 'p67', 1.85, false, { on: [18.6, 45.7], alt: 'point', idle: 'stand' });
  ups.push(T => {
    const on = T >= 18.7 && T < 45.6; walker.fade = on ? tw(T, 0, 1, 18.7, 19.2, M.fade) * tw(T, 1, 0, 45.0, 45.6, M.fade) : 0; if (!on) return;
    let li = 1, f = 0; for (let i = 1; i < LEGS.length; i++) if (T >= LEGS[i][0]) { li = i; f = prog(T, LEGS[i][0], LEGS[i][1], M.move); }
    const cv = curves[li], fw = Math.min(0.97, Math.max(li === 1 ? 0.14 : 0, f - 0.05)); cv.getPointAt(fw, tmpW); const tg = cv.getTangentAt(Math.min(0.999, fw + 0.001)), sd = new THREE.Vector3(-tg.z, 0, tg.x).normalize().multiplyScalar(f > 0.02 && f < 0.98 ? 0.8 : 1.5);
    walker.g.position.set(tmpW.x + sd.x, Math.min(0, Math.max(-0.3, tmpW.y - 0.14)), tmpW.z + sd.z);
    const PARK = [null, local('report', [-3.0, 0, 1.9]), local('annual', [-0.9, 0, 2.3]), local('call', [-1.9, 0, 0.9]), local('hall', [-3.6, 0, -0.4])];
    const pk = PARK[li], pp = prog(T, LEGS[li][1] - 1.1, LEGS[li][1] - 0.1, M.move);
    if (pk && pp > 0) { walker.g.position.x += (pk.x - walker.g.position.x) * pp; walker.g.position.z += (pk.z - walker.g.position.z) * pp; walker.g.position.y = walker.g.position.y * (1 - pp); }
    aWalk(walker, T, f > 0.02 && f < 0.98 ? 1 : 0); const arr = LEGS[li][1]; poseAt(walker, T, [[0, 'p67'], [arr + 0.15, 'p94'], [arr + 2.2, 'p67']]);
  });
  const mini = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: '#d8fbfc', toneMapped: false })); const miniH = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: '#7fe0e4', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); miniH.scale.setScalar(0.9); mini.add(miniH); scene.add(mini);
  const sA = local('call', [1.4, 1.25, -2.5]), sB = local('train', [0.3, 1.95, -2.55]);
  ups.push((T, Tr) => { mini.visible = Tr > 37.6 && Tr < 40.2; if (!mini.visible) return; const p = prog(Tr, 37.7, 39.6, M.move); mini.position.lerpVectors(sA, sB, p); mini.position.y += Math.sin(Math.PI * p) * 3.2; mini.scale.setScalar(Math.max(0.001, (1 - prog(Tr, 39.6, 40.2, M.fade)) * (0.4 + 0.6 * prog(Tr, 37.6, 37.95, M.enter)))); });

  [trI, halo, mini, miniH, dot, glowPts].forEach(o => (o.material.fog = false));
  // ---- camera keyframes (world target, dist, yaw°, pitch°) ----
  const K = (t, sc, lt, dist, yaw, pitch, o = {}) => ({ t, tg: add3(P[sc], lt), dist, yaw, pitch, ...o });
  const CAM = [
    K(0, 'map', [0, 13, 0], 64, -8, 8, { dp: 1.75 }), K(4.0, 'map', [0, 15, 0], 24, 6, 12, { ease: 'move', dp: 1.6 }),
    K(4.0, 'clerk', [0.5, 1.0, -1.25], 9.8, 30, 23, { cut: 1 }), K(8, 'clerk', [0.6, 1.0, -1.3], 9.2, 26, 22, { ease: 'fade' }),
    K(8, 'family', [0.0, 1.0, -0.2], 15.5, 12, 18, { cut: 1 }), K(9.4, 'family', [-0.1, 0.95, -0.2], 14, 10, 17, { ease: 'fade' }),
    K(9.4, 'family', [-0.42, 1.1, -0.62], 3.8, 33, 9, { cut: 1, dp: 1.35 }), K(12.9, 'family', [-0.42, 1.1, -0.62], 3.6, 33, 9, { ease: 'fade', dp: 1.35 }), K(12.9, 'family', [1.8, 0.8, 0.8], 14, 10, 22, { cut: 1 }),
    K(13.8, 'desk', [-2.0, 0.4, 1.0], 15, 14, 30, { ease: 'move' }),
    K(15.4, 'desk', [-0.15, 1.05, -1.7], 8.4, 12, 16, { ease: 'move' }), K(17.8, 'desk', [-0.15, 1.1, -1.8], 7.4, 8, 14, { ease: 'fade' }),
    K(19.6, 'desk', [1.6, 0.6, -0.6], 12, 22, 26, { ease: 'move' }),
    K(23.2, 'report', [0, 0.4, 0.2], 15, 10, 44, { ease: 'move', dp: 1.9, pt: [-0.4, 0, 0] }), K(27.0, 'report', [0, 0.4, 0.2], 14, 6, 46, { ease: 'fade', dp: 1.9, pt: [-0.4, 0, 0] }),
    K(28.8, 'annual', [0, 0.5, 0.3], 14, 12, 34, { ease: 'move', dp: 1.8, pt: [0.6, 0, 0] }), K(32.4, 'annual', [-0.3, 0.5, 0.3], 12.8, 8, 34, { ease: 'fade', dp: 1.8, pt: [0.8, 0, 0] }),
    K(34.0, 'call', [0, 1.3, -1.0], 15, 14, 16, { ease: 'move' }), K(38.4, 'call', [0, 1.4, -1.2], 13.5, 10, 15, { ease: 'fade' }), K(39.8, 'train', [0.0, 1.2, -0.7], 15.5, -10, 20, { ease: 'move' }), K(42.4, 'train', [0.0, 1.2, -0.8], 14.2, -6, 19, { ease: 'fade' }),
    K(44.0, 'hall', [0, 1.1, -0.6], 19, -16, 22, { ease: 'move' }), K(49.0, 'hall', [0, 1.1, -0.8], 17.5, -12, 22, { ease: 'fade' }),
    K(51.4, 'map', [0, 10, 4], 74, 0, 14, { ease: 'move', dp: 1.55, pt: [0, 3, 0], pp: 17.5 }), K(54.0, 'map', [0, 10, 4], 70, 0, 14, { ease: 'fade', dp: 1.55, pt: [0, 3, 0], pp: 17.5 }),
    K(54.0, 'desk', [-0.6, 1.15, -2.55], 7.4, 22, 7, { cut: 1, look: 1 }), K(59.0, 'desk', [-0.6, 1.15, -2.55], 6.6, 14, 6, { ease: 'fade', look: 1 }),
  ];
  const tmpV = new THREE.Vector3(), m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s1 = new THREE.Vector3();

  function setCam(T, portrait) {
    let a = CAM[0], b = CAM[0];
    for (let i = 0; i < CAM.length; i++) if (CAM[i].t <= T) { a = CAM[i]; b = CAM[i + 1] || CAM[i]; }
    if (b.cut) b = a;
    const p = b === a ? 0 : prog(T, a.t, b.t, M[b.ease || 'move']);
    const L = (x, y) => x + (y - x) * p;
    const tk = k => portrait && k.pt ? add3(k.tg, k.pt) : k.tg, ta = tk(a), tb = tk(b);
    const tg = [0, 1, 2].map(i => L(ta[i], tb[i]));
    const df = k => k.dist * (portrait ? (k.dp ?? 1.5) : 1);
    const dist = L(df(a), df(b)), yaw = L(a.yaw, b.yaw) * Math.PI / 180, pk = k => portrait && k.pp != null ? k.pp : k.pitch, pit = L(pk(a), pk(b)) * Math.PI / 180;
    let shift = [0, 0];
    if (a.look) shift = portrait ? [0.95, -0.15] : [1.25, 0.1];
    const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const T3 = [tg[0] + right[0] * shift[0], tg[1] + shift[1], tg[2] + right[2] * shift[0]];
    camera.position.set(T3[0] + dist * Math.sin(yaw) * Math.cos(pit), T3[1] + dist * Math.sin(pit), T3[2] + dist * Math.cos(yaw) * Math.cos(pit));
    const nz = (f, ph) => Math.sin(T * f + ph), amp = 0.0065 * dist;
    camera.position.x += amp * (0.6 * nz(1.31, 0.2) + 0.4 * nz(2.87, 1.7)); camera.position.y += amp * (0.5 * nz(1.73, 2.1) + 0.3 * nz(3.31, 0.4)); camera.position.z += amp * 0.4 * nz(1.07, 3.3);
    camera.lookAt(T3[0] + amp * 0.3 * nz(0.93, 1.2), T3[1] + amp * 0.3 * nz(1.19, 0.7), T3[2]);
    camera.rotateZ(0.0035 * nz(0.77, 0.5) + 0.002 * nz(2.13, 1.9));
    const ss = Math.max(8, dist * 0.45);
    sun.position.set(T3[0] + ss * 0.6, T3[1] + ss * 1.2, T3[2] + ss * 0.5); sun.target.position.set(...T3);
    Object.assign(sun.shadow.camera, { left: -ss, right: ss, top: ss, bottom: -ss, near: 0.5, far: ss * 4 }); sun.shadow.camera.updateProjectionMatrix();
    return dist;
  }

  return {
    update(Tr, portrait) {
      const T = Tr < 38.4 ? Tr : Tr < 42.4 ? 38.4 : Tr - 4;
      PORT = portrait; const cd = setCam(Tr, portrait), skc = rampC(SKYC, T);
      renderer.setClearColor(skc, 1); fog.color.set(skc); const gf = Tr >= 54 ? 0 : prog(Tr, 49.0, 50.4, M.fade) * 600; fog.near = cd + 5 + gf; fog.far = cd + 28 + gf; renderer.toneMappingExposure = rampN(EXPO, T); ground.visible = !(T > 45.6 && T < 50);
      { const nt = cl((T - 30) / 16), wc = mixHex('#ffffff', '#4a5c92', nt); WINS.forEach(m => m.material.color.set(wc)); }
      AV.forEach(a => { const ph = a.i * 1.7; a.rig.position.set(0, 0, 0); a.rig.rotation.set(0, 0, 0.007 * Math.sin(T * 1.1 + ph)); a.rig.scale.set(1, 1 + 0.006 * Math.sin(T * 1.6 + ph), 1); a.fade = 1; a.w = null; });
      PUPS.forEach(a => { a.pup.nod = 0; a.pup.talkOn = 0; a.pup.walkK = 0; a.pup.gest = null; }); PT = [T, Tr];
      MIX.forEach(([mx, d, o]) => mx.setTime((Tr + o) % d)); ups.forEach(f => f(T, Tr));
      AV.forEach(a => { a.ids.forEach((id, i) => { const wt = a.w ? (a.w[id] || 0) : (i === 0 ? 1 : 0), o = wt * a.fade, m = a.poses[id]; m.material.opacity = o; m.visible = o > 0.01; }); a.b.material.opacity = a.fade * (1 - Math.min(0.6, a.rig.position.y * 3)); });
      AV.forEach(a => { tmpV.copy(camera.position); a.g.parent.worldToLocal(tmpV); a.g.rotation.y = Math.atan2(tmpV.x - a.g.position.x, tmpV.z - a.g.position.z); });
      globe.visible = T < 4.6 || (T > 44.8 && T < 50); tealI.visible = blueI.visible = T > 44.8 && T < 50; const th = T < 10 ? (-150 + T * 9) * D2R : gRot(T); globe.rotation.y = th;
      formCard.quaternion.copy(camera.quaternion);
      // trail & dot
      let ci = -1, f = 0;
      LEGS.forEach(([s, e], i) => { if (T >= s) { ci = i; f = prog(T, s, e, M.move); } });
      const fade = 1 - prog(T, 45.0, 45.8, M.fade);
      const closeUp = T >= 9.4 && T < 12.9; trail.forEach((d, i) => { const on = !closeUp && fade > 0 && (d.ci < ci || (d.ci === ci && d.f < f)); s1.setScalar(on ? Math.min(1, fade) * (0.7 + 0.3 * Math.sin(T * 3 + i * 0.7)) : 0.0001); m4.compose(d.p, q0, s1); trI.setMatrixAt(i, m4); });
      trI.instanceMatrix.needsUpdate = true;
      const inLap = T >= 15.0 && T < 18.0;
      const pop = T < 15 ? prog(T, 12.9, 13.25, M.enter) * (1 - prog(T, 14.75, 15.0, M.fade)) : prog(T, 18.0, 18.5, M.enter);
      dot.visible = T >= 12.9 && !inLap && fade > 0.01;
      if (T >= 18.0 && ci < 1) { tmpV.copy(tp[0]); tmpV.z += 0.2 * pop; dot.position.copy(tmpV); }
      else if (ci >= 0) { curves[ci].getPointAt(Math.min(1, f), tmpV); dot.position.copy(tmpV); }
      else { feed.getPointAt(0, tmpV); dot.position.copy(tmpV); }
      if (T >= 18.0 && T < 18.6) dot.position.y += Math.sin(Math.PI * prog(T, 18.0, 18.6, M.fade)) * 0.3;
      dot.scale.setScalar(Math.max(0.001, pop * fade));
      if (T < 12.9) { const sc = preDot(T, tmpV); dot.visible = sc > 0.001; if (dot.visible) { dot.position.copy(tmpV); dot.scale.setScalar(sc); } }
      preTrail(T, Tr); trI.visible = false;
      if (T > 45.0 && T < 50) { const pf = prog(T, 45.2, 48.8, M.move); toWorld(herLocal, th, tmpW); dot.position.lerpVectors(hallEnd, tmpW, pf); dot.position.y += Math.sin(Math.PI * pf) * 7; dot.visible = true; dot.scale.setScalar(1 + 1.8 * pf + (T > 48.8 ? 0.25 * Math.sin((T - 48.8) * 4) : 0)); }
      if (T >= 50) dot.visible = false;
      halo.material.opacity = 0.8 + 0.2 * Math.sin(T * 3); halo.scale.setScalar(1.4 * (0.92 + 0.08 * Math.sin(T * 2.4)));
      ring.visible = false;
      LEGS.forEach(([, e], li) => { const r = li === 0 ? 0 : prog(T, e, e + 0.9, M.enter); if (r > 0 && r < 1 && fade > 0) { ring.visible = true; ring.position.copy(dot.position); ring.position.y -= 0.12; ring.scale.setScalar(0.25 + 0.8 * r); ring.material.opacity = 1 - r; } });
      if (T > 8.55 && T < 9.4) { const r = prog(T, 8.55, 9.4, M.enter); ring.visible = true; ring.position.copy(TABW); ring.position.y -= 0.11; ring.scale.setScalar(0.06 + 0.42 * r); ring.material.opacity = 1 - r; }
      // map dots
      [tealI, blueI].forEach(im => im.count = mdots.length);
      mdots.forEach((d, i) => {
        const p = prog(T, d.s, d.s + 1.3, M.move), on = T < 50 && p > 0;
        toWorld(d.loc, th, tmpW); tmpV.lerpVectors(d.from, tmpW, p); tmpV.y += Math.sin(Math.PI * p) * 5;
        s1.setScalar(on ? 1 : 0.0001); m4.compose(tmpV, q0, s1); GP[i * 3] = on ? tmpV.x : 0; GP[i * 3 + 1] = on ? tmpV.y : -9999; GP[i * 3 + 2] = on ? tmpV.z : 0;
        (d.lead ? blueI : tealI).setMatrixAt(i, m4); (d.lead ? tealI : blueI).setMatrixAt(i, m4.clone().scale(s1.set(0.0001, 0.0001, 0.0001)));
      });
      tealI.instanceMatrix.needsUpdate = blueI.instanceMatrix.needsUpdate = true; glowPts.geometry.attributes.position.needsUpdate = true; glowPts.visible = tealI.visible;
    },
    render() { renderPups(); renderer.render(scene, camera); },
    labels(T) {
      if (T < 47 || T >= 50) return [];
      return LBL.map(l => { const o = tw(T, 0, 1, l.at, l.at + 0.28, M.enter) * tw(T, 1, 0, l.at + 0.72, l.at + 0.98, M.fade); const wp = toWorld(l.loc, gRot(T), new THREE.Vector3()); const face = wp.clone().sub(GC).normalize().dot(camera.position.clone().sub(wp).normalize()); const v = wp.clone().project(camera); return { t: l.t, cv: l.cv, side: l.side, o: o * cl(face * 4), x: (v.x + 1) / 2 * W, y: Math.max(H * 0.17, (1 - v.y) / 2 * H) }; }).filter(l => l.o > 0.001);
    },
  };
}

const EXTRAS = ['ex1', 'ex2', 'ex3', 'ex4', 'ex5', 'ex6'];
const AUD = ['ex1b', 'ex2b', 'ex3b', 'ex4b', 'ex5b', 'ex6b', 'p52b', 'p67b', 'p22b'];
const BUSTS = ['b12', 'b19', 'b25', 'b27', 'b28', 'b29', 'b30'];
const RIG_IDS = ['base', 'cuff', 'rf', 'rh', 'lf', 'lh'].map(k => 'rig/p22-' + k);
const PUP_LOOKS = ['p22', 'p67', 'ex2', 'ex3', 'ex4', 'ex5', 'ex6', 'ex7'];
const COVER_URLS = { gainTables: 'assets/covers/gain-tables-2026.png', annual: 'assets/covers/annual-2025.png', ar2024: 'assets/covers/ar-2024.png', ar2023: 'assets/covers/ar-2023-some.png', csBanner: 'assets/covers/case-studies-banner.png', csGrid: 'assets/covers/case-studies-grid.png', mp4: 'assets/covers/method-paper-4.png', mp3: 'assets/covers/method-paper-3.png', manual: 'assets/covers/compilers-manual.png' };
const loadCovers = () => Promise.all(Object.entries(COVER_URLS).map(([k, u]) => new Promise(r => { const im = new Image(); im.onload = () => r([k, im]); im.onerror = () => r([k, null]); im.src = u; }))).then(Object.fromEntries);
const loadPupImgs = () => window.GM ? Promise.all(PUP_LOOKS.map(look => Promise.all(window.GM.RIGS[window.GM.LOOKS[look]].files.map(k => new Promise(r => { const im = new Image(); im.onload = () => r([k, im]); im.onerror = () => r([k, null]); im.src = 'assets/avatars2/rig/' + look + '-' + k + '.png'; }))).then(e => [look, Object.fromEntries(e)]))).then(Object.fromEntries) : Promise.resolve(null);
const AV_EXTRA = ['rig/ex2-back', 'ex7'];
const AV_IDS0 = ['p40', 'p52', 'p67', 'p22', 'p94', ...EXTRAS, ...AUD, ...BUSTS, ...RIG_IDS];
const AV_IDS = [...AV_IDS0, ...AV_EXTRA];
const STARS = Array.from({ length: 170 }, (_, i) => ({ x: hash(i, 21), y: hash(i, 22), r: 1.2 + hash(i, 23) * 3, k: hash(i, 24) < 0.16 ? 'ring' : hash(i, 25) < 0.55 ? 'b' : 't', gl: hash(i, 26) < 0.07 }));
function Stars({ W, H, T, o }) {
  if (o <= 0.001) return null;
  return <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: o, pointerEvents: 'none' }}>{STARS.map((p, i) => { const x = p.x * W, y = p.y * H, a = 0.5 + 0.5 * Math.sin(T * 1.2 + i * 1.7); return <g key={i} opacity={0.35 + 0.65 * a}>{p.k === 'ring' ? <circle cx={x} cy={y} r={p.r + 1.6} fill="none" stroke="#4cc3c9" strokeWidth="1.2" /> : <circle cx={x} cy={y} r={p.r} fill="#4cc3c9" />}{p.gl && <path d={`M${x - 10},${y}H${x + 10}M${x},${y - 10}V${y + 10}`} stroke="#ffffff" strokeWidth="1" opacity={a} />}</g>; })}</svg>;
}
const CAPS = [
  [0.4, 4.0, 'Producing official statistics is demanding work,'],
  [4.2, 8.0, 'the effort behind every census, survey and administrative register.'],
  [8.2, 13.0, 'It is even more challenging to produce official statistics that include refugees, internally displaced and stateless people.'],
  [13.2, 17.0, 'The EGRISS Global Annual Inclusion (GAIN) Survey monitors statistical examples related to refugees, individuals in need of international protection, IDPs, and stateless persons in national data systems, including those aligned with the International Recommendations.'],
  [17.2, 22.0, 'When you report your example, it joins the global picture.'],
  [22.2, 28.0, 'GAIN shows, country by country, how the International Recommendations are being applied.'],
  [28.2, 33.0, 'Its findings feed the EGRISS Annual Report and the case studies shared with the whole community.'],
  [33.2, 39.0, 'It shows where methods need refinement, so the recommendations become easier to apply.'],
  [39.2, 45.0, 'And it brings your evidence to the UN Statistical Commission, where global policy is shaped.'],
  [45.4, 50.0, 'Every example you report makes the picture more complete.'],
];
const ART_WIN = [['clerk', 4, 8], ['family', 8, 13], ['desk', 13, 22], ['report', 22, 28], ['annual', 28, 33], ['call', 33, 39], ['hall', 39, 45]];
const LAYOUT = {
  wide: { W: 1920, H: 1080, cap: { w: 1400, size: 36, bottom: 60 }, title: { left: 1040, top: 110, w: 760, size: 84 }, end: { head: 96, line: 32, sub: 24, subT: 40, gap: 48 }, logoH: 240, fs: 26 },
  portrait: { W: 1080, H: 1350, cap: { w: 960, size: 38, bottom: 72 }, title: { left: 90, top: 120, w: 900, size: 78 }, end: { head: 104, line: 34, sub: 26, subT: 46, gap: 60 }, logoH: 210, fs: 28 },
};

function ArtSlot({ src, show }) {
  const [ok, setOk] = React.useState(false);
  return <img src={src} alt="" onLoad={() => setOk(true)} onError={() => setOk(false)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: ok && show ? 'block' : 'none' }} />;
}

function Piece({ L, portrait, showCaps, folder }) {
  const { T: Treal } = useComposition(); const T = Treal < 38.4 ? Treal : Treal < 42.4 ? 38.4 : Treal - 4;
  const cvRef = React.useRef(null), world = React.useRef(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let dead = false;
    Promise.all([THREE_P, DATA_P, FONTS_P]).then(([THREE, data]) => Promise.all(AV_IDS.map(id => new Promise((r, j) => new THREE.TextureLoader().load((/^b\d/.test(id) ? 'assets/busts/' : 'assets/avatars2/') + id + '.png', r, undefined, j)))).then(tx => { if (dead || !cvRef.current) return; tx.forEach(t => (t.anisotropy = 8)); Promise.all([loadModels(THREE), loadPupImgs(), loadCovers()]).then(([MOD, PIMG, COV]) => { if (dead || !cvRef.current) return; world.current = buildWorld(THREE, cvRef.current, L.W, L.H, data, Object.fromEntries(AV_IDS.map((id, i) => [id, tx[i]])), MOD, PIMG, COV); setReady(true); }).catch(e => console.error('models', e)); })).catch(e => console.error('3D load failed', e));
    return () => { dead = true; };
  }, []);
  let labels = [];
  if (ready && world.current) { world.current.update(Treal, portrait); world.current.render(); labels = world.current.labels(T); }
  const titleO = tw(T, 0, 1, 51.0, 52.0, M.enter) * (T < 55.6 ? 1 : 0);
  const endO = prog(T, 54.8, 55.6, M.fade);
  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden', fontFamily: BODY, color: C.navy }}>
      <canvas ref={cvRef} width={L.W} height={L.H} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}></canvas>
      <div style={{ position: 'absolute', inset: 0, background: C.bg, opacity: tw(T, 0, 1, 3.4, 4.0, M.fade) * tw(T, 1, 0, 4.0, 4.7, M.fade), pointerEvents: 'none' }}></div>
      {folder && ART_WIN.map(([id, s, e]) => <ArtSlot key={id} src={`${folder}${id}.png`} show={T >= s && T < e} />)}
      {(() => { const bo = tw(T, 0, 1, 0.2, 0.9, M.enter) * (1 - Math.max(titleO, endO)), Tw = Treal < 38.4 ? Treal : Treal < 42.4 ? 38.4 : Treal - 4, dk = prog(Tw, 40.0, 41.6, M.fade); if (bo <= 0.01) return null; const lh = portrait ? 46 : 44;
        return (
          <div style={{ position: 'absolute', right: portrait ? 36 : 40, top: portrait ? 36 : 30, opacity: bo, display: 'flex', alignItems: 'center', gap: 14, padding: '8px 14px', borderRadius: 6, background: `rgba(${dk > 0.5 ? '20,35,76,0.62' : '255,255,255,0.82'})`, pointerEvents: 'none' }}>
            <div style={{ position: 'relative', height: lh }}>
              <img src="assets/egriss-blue-h.png" alt="EGRISS" style={{ height: lh, display: 'block', opacity: 1 - dk }} />
              <img src="assets/egriss-white-h.png" alt="" style={{ position: 'absolute', left: 0, top: 0, height: lh, display: 'block', opacity: dk }} />
            </div>
            <div style={{ width: 1.5, height: lh * 0.8, background: dk > 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(20,35,76,0.3)' }}></div>
            <div style={{ font: `600 ${portrait ? 21 : 20}px ${MONO}`, letterSpacing: '0.08em', color: dk > 0.5 ? '#ffffff' : C.navy }}>GAIN <span style={{ color: dk > 0.5 ? C.teal : C.blue }}>2026</span></div>
          </div>); })()}
      {(() => { const o = tw(T, 0, 1, 17.3, 17.8, M.enter) * tw(T, 1, 0, 21.6, 22.0, M.fade); if (o <= 0) return null;
        const G2 = [['Data sources', ['Implementation of a survey', 'Administration of a database', 'Work on a census', 'Data integration between data sources', 'Work on a non-traditional data source']], ['Tools', ['Developing strategies', 'Guidance documents', 'Training sessions and workshops']]];
        let n = 0; const fs = portrait ? 22 : 20;
        return (
          <div style={{ position: 'absolute', left: portrait ? 60 : 64, top: portrait ? 90 : 84, width: portrait ? 600 : 470, opacity: o, transform: `translateX(${(1 - o) * -16}px)`, padding: '24px 28px 26px', borderRadius: 10, background: 'rgba(20,35,76,0.9)', boxShadow: '0 8px 28px rgba(7,45,98,0.3)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><div style={{ width: 56, height: 3, background: RULE }}></div><div style={{ font: `500 15px ${MONO}`, letterSpacing: '0.12em', color: C.teal }}>WHAT COUNTS AS AN EXAMPLE</div></div>
            {G2.map(([h, items]) => (
              <div key={h} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ font: `500 13px ${MONO}`, letterSpacing: '0.12em', color: '#8db8e3', textTransform: 'uppercase' }}>{h}</div>
                {items.map(t => { const k = n++, on = T > 17.9 + k * 0.32, f = cl((T - 17.6 - k * 0.32) / 0.25); return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.35 + 0.65 * f }}>
                    <div style={{ width: 20, height: 20, flex: 'none', borderRadius: 4, border: `2px solid ${C.teal}`, background: on ? C.teal : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <svg width="12" height="10" viewBox="0 0 12 10"><path d="M1 5l3.2 3.2L11 1.5" fill="none" stroke="#14234C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                    <div style={{ font: `400 ${fs}px/1.3 ${BODY}`, color: '#ffffff' }}>{t}</div>
                  </div>); })}
              </div>))}
          </div>); })()}
      {labels.map((l, i) => (
        <div key={i} style={{ position: 'absolute', left: l.x, top: l.y, opacity: l.o, transform: l.side === 'l' ? 'translate(calc(-100% + 18px), calc(-100% - 22px))' : l.side === 'r' ? 'translate(-18px, calc(-100% - 22px))' : 'translate(-50%, calc(-100% - 22px))', display: 'flex', flexDirection: 'column', alignItems: l.side === 'l' ? 'flex-end' : l.side === 'r' ? 'flex-start' : 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 8px 8px', borderRadius: 6, background: '#1a2852', border: '1px solid rgba(207,224,244,0.3)', boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }}>
            {l.cv ? <img src={l.cv} style={{ height: L.fs * 4.2, maxWidth: L.fs * 7.4, borderRadius: 2, flex: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', display: 'block' }} /> : <div style={{ width: L.fs * 2.2, height: L.fs * 3.1, borderRadius: 2, background: '#ffffff', overflow: 'hidden', position: 'relative', flex: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }}>
              <div style={{ height: '38%', background: C.deep, padding: '12% 10%', display: 'flex', flexDirection: 'column', gap: '10%' }}><div style={{ height: 2, width: '80%', background: '#ffffff' }}></div><div style={{ height: 2, width: '60%', background: '#ffffff' }}></div></div>
              <div style={{ position: 'absolute', left: '-20%', right: '-20%', bottom: '-38%', height: '60%', borderRadius: '50%', background: C.blue }}></div>
              <div style={{ position: 'absolute', left: '-30%', width: '55%', bottom: '-30%', height: '45%', borderRadius: '50%', background: C.teal }}></div>
            </div>}
            <div style={{ font: `600 ${L.fs}px ${HEAD}`, color: '#ffffff', whiteSpace: 'nowrap' }}>{l.t}</div>
          </div>
          <div style={{ width: 2, height: 18, background: C.teal, margin: l.side ? '0 17px' : 0 }}></div>
        </div>
      ))}
      {titleO > 0 && (
        <div style={{ position: 'absolute', left: L.title.left, top: L.title.top, width: L.title.w, opacity: titleO, transform: `translateY(${(1 - titleO) * 16}px)`, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ width: 72, height: 3, background: RULE }}></div>
          <div style={{ font: `500 ${L.title.size}px/1.06 ${HEAD}`, letterSpacing: '-0.025em', color: '#ffffff', textWrap: 'balance', background: 'rgba(10,20,48,0.84)', padding: '28px 32px', borderRadius: 16 }}>You do the hard work. GAIN makes sure it counts.</div>
        </div>
      )}
      {showCaps && CAPS.map(([s, e, text], i) => {
        const o = tw(T, 0, 1, s, s + 0.4, M.enter) * tw(T, 1, 0, e - 0.35, e, M.fade);
        return o > 0 ? (
          <div key={i} style={{ position: 'absolute', left: (L.W - L.cap.w) / 2, bottom: L.cap.bottom, width: L.cap.w, display: 'flex', justifyContent: 'center', opacity: o }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 30px 18px', borderRadius: 10, background: 'rgba(20,35,76,0.88)', boxShadow: '0 6px 24px rgba(7,45,98,0.28)', transform: `translateY(${(1 - o) * 10}px)` }}><div style={{ width: 56, height: 3, background: RULE }}></div><div style={{ font: `400 ${L.cap.size}px/1.38 ${BODY}`, color: '#ffffff', textAlign: 'center', textWrap: 'balance', maxWidth: L.cap.w - 60 }}>{text}</div></div>
          </div>
        ) : null;
      })}
      {endO > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: C.ground, opacity: endO, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: L.end.gap, padding: '0 80px', textAlign: 'center' }}>
          <Stars W={L.W} H={L.H} T={T} o={1} />
          <img src="assets/egriss-white-h.png" alt="EGRISS" style={{ position: 'relative', height: L.logoH, display: 'block', transform: `scale(${tw(T, 0.97, 1, 55, 58, M.fade)})` }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
            <div style={{ font: `500 ${L.end.head}px/1.05 ${HEAD}`, color: '#ffffff', letterSpacing: '-0.02em', opacity: prog(T, 55.2, 56.0, M.enter), transform: `translateY(${(1 - prog(T, 55.2, 56.0, M.enter)) * 12}px)` }}>Submit your example.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 18px', font: `500 ${L.end.line}px ${MONO}`, color: '#cfe0f4', opacity: prog(T, 55.6, 56.4, M.enter) }}>
              <span>Every example adds to the global picture.</span>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: portrait ? 20 : 18, opacity: prog(T, 56.2, 57, M.enter) }}>
            <div style={{ width: 120, height: 1, background: 'rgba(207,224,244,0.3)' }}></div>
            <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: portrait ? 14 : '8px 18px', font: `500 ${L.end.sub}px ${MONO}`, color: '#cfe0f4' }}>
              <span style={{ padding: '6px 12px', border: '1.5px solid #cfe0f4', color: '#ffffff', letterSpacing: '0.12em' }}>GAIN SURVEY 2026</span>
              <span style={{ font: `600 ${L.end.subT}px ${HEAD}`, color: C.teal, letterSpacing: '-0.01em' }}>Coming soon</span>
            </div>
          </div>
        </div>
      )}
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 22px ${MONO}`, color: C.muted }}>Loading scene…</div>}
    </div>
  );
}

function GainHeroV3({ format }) {
  const portrait = format === 'portrait';
  const L = LAYOUT[portrait ? 'portrait' : 'wide'];
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <>
      <CompositionStage width={L.W} height={L.H} bg={C.bg} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <Piece L={L} portrait={portrait} showCaps={t.captions} folder={t.artFolder} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={v => setTweak('motionEditor', v)} />
        <TweakSection label="Film" />
        <TweakToggle label="Burned-in captions" value={t.captions} onChange={v => setTweak('captions', v)} />
        <TweakText label="Scene art folder" value={t.artFolder} onChange={v => setTweak('artFolder', v)} />
      </TweaksPanel>
    </>
  );
}
window.GainHeroV3 = GainHeroV3;
