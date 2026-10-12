const { CompositionStage, useComposition, TweaksPanel, TweakSection, TweakToggle, TweakText, useTweaks } = window;

// GAIN 2026 · 30s case-study clip. Same chart as the teaser ("Counted, and counting"): one circle = one reported example, a teal ring = an EGRISS case study
const CS = { ground: '#0a1430', blue: '#5b8fd9', teal: '#4cc3c9', ring: '#8fe0e4', ink: '#ffffff', sub: '#cfe0f4', cnt: '#e3ebf6', navy: '#14234C', label: '#3b71b9', body: '#1d2940', line: '#d9e2ef' };
const CS_HEAD = "'Obvia', 'Figtree', sans-serif", CS_MONO = "'IBM Plex Mono', monospace", CS_BODY = "'IBM Plex Sans', sans-serif";
const CS_DATA = [[2021, 19, 19, 31, 31], [2022, 25, 25, 11, 11], [2023, 51, 25, 33, 29], [2024, 99, 87, 27, 19], [2025, 63, 51, 54, 40]];
const CS_N26 = [22, 16];
const CS_QS = ['What was the main reason for leaving?', 'Which province did [NAME] move to first?', 'Where was [NAME] living before fleeing?'];
const CS_QT = [[14.3, 15.4], [15.7, 16.8], [17.1, 18.1]];
const CS_SECTIONS = [['The challenge', 'Including refugees and IDPs in a national survey in conflict-affected provinces'], ['The approach', 'Questions aligned with IRRS and IRIS added to the ECVM'], ['The result', 'Representative data on more than 7,500 forcibly displaced people']];
const CS_COUNTRIES = ['South Sudan', 'Burkina Faso', 'Colombia'];
const csSafe = str => String(str).split(/([()\[\]:])/).map((q, i) => i % 2 ? <span key={i} style={{ fontFamily: "'Figtree', sans-serif" }}>{q}</span> : q);
const TGT = { bar: 4, q: 45 }; // 2025 country-led column, near the top of the filled dots

const ccl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const cp = (T, a, b) => ccl((T - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const CM = { // calm, no overshoot
  enter: t => 1 - Math.pow(1 - t, 3),
  fade: t => t * t * (3 - 2 * t),
  settle: t => 1 - Math.pow(1 - t, 4),
  move: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};
const chash = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const cmix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

const CSM = { ready: false, subs: new Set(), paths: {} };
fetch('assets/bdf389090d13a90c6c8dc9e4a5c402e4.json').then(r => r.json()).then(map => {
  const span = map.lat[1] - map.lat[0];
  CSM.shapes = CS_COUNTRIES.map(c => (map.hl[c] || []).map(R => { const o = []; for (let i = 0; i < R.length; i += 2) o.push([R[i] * 360 - 180, map.lat[1] - R[i + 1] * span]); return o; }));
  CSM.ready = true; CSM.subs.forEach(f => f());
});
const useMap = () => { const [, f] = React.useState(0); React.useEffect(() => { const cb = () => f(x => x + 1); CSM.subs.add(cb); return () => CSM.subs.delete(cb); }, []); return CSM.ready; };
function outlinePath(k, bw, bh) {
  const key = k + ':' + bw + 'x' + bh; if (CSM.paths[key]) return CSM.paths[key];
  const rings = CSM.shapes[k], all = rings.flat(), latM = all.reduce((a, q) => a + q[1], 0) / all.length, kx = Math.cos(latM * Math.PI / 180);
  const P = rings.map(r => r.map(([lo, la]) => [lo * kx, -la]));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; P.flat().forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  const sc = Math.min(bw * 0.9 / (x1 - x0), bh * 0.9 / (y1 - y0)), ox = bw / 2 - sc * (x0 + x1) / 2, oy = bh / 2 - sc * (y0 + y1) / 2;
  return (CSM.paths[key] = P.map(r => r.map(([x, y], i) => (i ? 'L' : 'M') + (ox + sc * x).toFixed(1) + ',' + (oy + sc * y).toFixed(1)).join('') + 'Z').join(''));
}

const CS_LAYOUT = {
  portrait: { W: 1080, H: 1350, p: 15, yGap: 2, base: 1080, textY: 190, textSize: 60, textW: 920, numSize: 20, cntSize: 17, yrSize: 22,
    open: { x: 540, y: 720 }, CW: 860, CH0: 360, CH1: 690, card: { x: 110, y: 120 }, centerCard: false, cpad: 44, labSize: 18, titSize: 42, tagSize: 16, secH: 27, secT: 24,
    q: { x: 110, w: 860, below: 50 }, qSize: 26, qGap: 26,
    minis: { s: 0.24, y: 560, xs: [230, 540, 850] }, ctry: { y: 960, bw: 250, bh: 230 },
    endSize: 84, logoY: 1200, logoH: 84 },
  wide: { W: 1920, H: 1080, p: 19, yGap: 2.74, base: 900, textY: 80, textSize: 56, textW: 1640, numSize: 24, cntSize: 20, yrSize: 24,
    open: { x: 960, y: 580 }, CW: 880, CH0: 360, CH1: 690, card: { x: 150 }, centerCard: true, cpad: 44, labSize: 18, titSize: 40, tagSize: 16, secH: 26, secT: 23,
    q: { x: 1130, w: 640, y: 450 }, qSize: 26, qGap: 26,
    minis: { s: 0.22, y: 430, xs: [520, 960, 1400] }, ctry: { y: 780, bw: 320, bh: 250 },
    endSize: 92, logoY: 950, logoH: 80 },
};

function csGeom(L) {
  const p = L.p, bw = 4.35 * p, pad = (bw - 4 * p) / 2, g = 0.52 * p, pairW = 2 * bw + g, n = CS_DATA.length + 1;
  const total = n * pairW + (n - 1) * L.yGap * p, x0 = (L.W - total) / 2;
  const barX = (i, k) => x0 + i * (pairW + L.yGap * p) + k * (bw + g);
  const dot = (x, q) => ({ cx: x + pad + (q % 4) * p + p / 2, cy: L.base - 0.45 * p - Math.floor(q / 4) * p });
  const dome = (x, rows) => { const yc = L.base - 0.45 * p - (rows - 1) * p + 0.5 * p, r = bw / 2; return { d: `M${x},${L.base}V${yc}A${r},${r} 0 0 1 ${x + bw},${yc}V${L.base}`, top: yc - r }; };
  return { p, bw, pairW, barX, dot, dome };
}
const dotStart = (s, q, n) => s + 0.1 + (q / n) * 0.9;

function CsBar({ G, L, x, n, using, color, T, s, rings, skip, seed }) {
  const p = G.p, rows = Math.ceil(n / 4), fRows = Math.ceil(using / 4), D = G.dome(x, rows), o = CM.fade(cp(T, s, s + 0.35));
  const tintTop = using >= n ? null : L.base - 0.45 * p - (fRows - 1) * p - 0.5 * p;
  const dots = [];
  for (let q = 0; q < n; q++) {
    if (q === skip) continue;
    const a = cp(T, dotStart(s, q, n), dotStart(s, q, n) + 0.12);
    if (a <= 0) continue;
    const { cx, cy } = G.dot(x, q), row = Math.floor(q / 4);
    dots.push(q < using
      ? <circle key={q} cx={cx} cy={cy} r={0.36 * p} fill={color} opacity={a * (0.5 + 0.45 * row / Math.max(1, fRows - 1))} />
      : <circle key={q} cx={cx} cy={cy} r={0.33 * p} fill="none" stroke={color} strokeWidth={Math.max(1.4, p * 0.07)} opacity={a * 0.8} />);
    if (rings && chash(q, seed) < 0.075) dots.push(<circle key={'r' + q} cx={cx} cy={cy} r={0.56 * p} fill="none" stroke={CS.ring} strokeWidth="1.6" opacity={a * 0.85} />);
  }
  return (
    <g>
      <g opacity={o}>
        {tintTop == null ? <path d={D.d} fill={color} fillOpacity="0.16" /> : <rect x={x} y={tintTop} width={G.bw} height={L.base - tintTop} fill={color} fillOpacity="0.16" />}
        <path d={D.d} fill="none" stroke={color} strokeOpacity="0.75" strokeWidth="1.4" strokeDasharray="4 4" />
        <text x={x + G.bw / 2} y={D.top - 10} textAnchor="middle" fill={color} style={{ font: `600 ${L.numSize}px ${CS_MONO}` }}>{n}</text>
        <text x={x + G.bw / 2} y={L.base + L.cntSize + 14} textAnchor="middle" fill={CS.cnt} style={{ font: `500 ${L.cntSize}px ${CS_MONO}` }}>{using}</text>
      </g>
      {dots}
    </g>
  );
}

function CardContent({ L, T }) {
  const f = (a, b) => CM.enter(cp(T, a, b)), up = v => `translateY(${(1 - v) * 8}px)`;
  const lab = f(10.9, 11.4), tit = f(11.3, 12.2), tg = [f(12.4, 12.9), f(12.55, 13.05)], sec = [0, 1, 2].map(j => f(19.0 + j * 0.7, 19.6 + j * 0.7));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: L.CW, boxSizing: 'border-box', padding: L.cpad, display: 'flex', flexDirection: 'column' }}>
      <div style={{ font: `600 ${L.labSize}px ${CS_MONO}`, letterSpacing: '0.12em', color: CS.label, opacity: lab, transform: up(lab) }}>EGRISS CASE STUDY · ANNUAL REPORT 2025</div>
      <div style={{ marginTop: 18, font: `500 ${L.titSize}px/1.15 ${CS_HEAD}`, letterSpacing: '-0.015em', color: CS.navy, textWrap: 'pretty', opacity: tit, transform: up(tit) }}>{csSafe('DR Congo: displacement in the 2025 Survey on Household Living Conditions (ECVM)')}</div>
      <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
        {['IRRS', 'IRIS'].map((t, i) => <div key={t} style={{ padding: '6px 12px', borderRadius: 4, background: CS.teal, color: CS.navy, font: `600 ${L.tagSize}px ${CS_MONO}`, letterSpacing: '0.06em', opacity: tg[i], transform: up(tg[i]) }}>{t}</div>)}
      </div>
      <div style={{ marginTop: 30, height: 1, background: CS.line, opacity: sec[0] }}></div>
      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {CS_SECTIONS.map(([hd, ln], j) => (
          <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: sec[j], transform: up(sec[j]) }}>
            <div style={{ font: `600 ${L.secH}px/1.2 ${CS_HEAD}`, color: CS.navy }}>{csSafe(hd)}</div>
            <div style={{ font: `400 ${L.secT}px/1.45 ${CS_BODY}`, color: CS.body, textWrap: 'pretty' }}>{ln}</div>
          </div>))}
      </div>
    </div>
  );
}

function CasePiece({ L, rings, closing }) {
  const { T } = useComposition();
  const ready = useMap();
  const G = csGeom(L), p = G.p, yrY = L.base + L.cntSize + 22 + L.yrSize * 1.3;
  // camera: push in on the target circle (origin at the target, so it never drifts)
  const [, tN, tU] = [0, CS_DATA[TGT.bar][1], CS_DATA[TGT.bar][2]];
  const tBarX = G.barX(TGT.bar, 0), tq = G.dot(tBarX, TGT.q), tS = 0.1 + TGT.bar * 0.18;
  const Z = 30 / (0.36 * p), zk = CM.move(cp(T, 6.0, 8.6)), zs = Math.pow(Z, zk) * (1 + 0.015 * CM.fade(cp(T, 0, 6)));
  const dx = (L.open.x - tq.cx) * zk, dy = (L.open.y - tq.cy) * zk, chartO = 1 - CM.fade(cp(T, 7.4, 8.8));
  const rS = 0.36 * p * zs, tC = { x: tq.cx + dx, y: tq.cy + dy };
  // target circle → card
  const tA = cp(T, dotStart(tS, TGT.q, tN), dotStart(tS, TGT.q, tN) + 0.12), tOp = 0.5 + 0.45 * Math.floor(TGT.q / 4) / (Math.ceil(tU / 4) - 1);
  const bri = CM.fade(cp(T, 3.0, 4.2)), e = CM.move(cp(T, 8.3, 9.6)), mv = CM.move(cp(T, 10.0, 11.0)), ex = CM.move(cp(T, 18.2, 19.0));
  const ch = lerp(L.CH0, L.CH1, ex), cardTop = L.centerCard ? (L.H - ch) / 2 : L.card.y;
  const work = { x: L.card.x + L.CW / 2, y: cardTop + ch / 2 };
  const cw = lerp(2 * rS, L.CW, e), chh = lerp(2 * rS, ch, e), rad = lerp(rS, 16, e);
  const c0 = { x: lerp(tC.x, work.x, mv), y: lerp(tC.y, work.y, mv) };
  const dotCol = cmix(CS.blue, '#d3e4fb', bri), cardBg = cmix(dotCol, '#ffffff', ccl(e / 0.35)), cardA = lerp(tA * (tOp + (1 - tOp) * bri), 1, ccl(e / 0.2));
  const shadow = `0 0 ${(rS * 1.8).toFixed(1)}px ${(rS * 0.5).toFixed(1)}px rgba(140,185,245,${(0.5 * bri * (1 - e)).toFixed(3)}), 0 24px 60px rgba(0,0,0,${(0.35 * e).toFixed(3)})`;
  // scene 5: shrink, then three copies glide to the outlines
  const sh = CM.move(cp(T, 22.0, 22.9)), msc = lerp(1, L.minis.s, sh), shC = { x: L.W / 2, y: L.minis.y }, cBase = { x: lerp(c0.x, shC.x, sh), y: lerp(c0.y, shC.y, sh) };
  const dockY = L.ctry.y - L.ctry.bh / 2 - (L.CH1 * L.minis.s) / 2 + 24, cardsOut = 1 - CM.fade(cp(T, 25.9, 26.5));
  const copies = T < 22.95 ? [cBase] : L.minis.xs.map((x, k) => { const g = CM.move(cp(T, 23.0 + 0.2 * k, 24.2 + 0.2 * k)); return { x: lerp(shC.x, x, g), y: lerp(shC.y, dockY, g) }; });
  // ring
  const ringDraw = CM.fade(cp(T, 5.0, 6.0)), ringO = 1 - CM.fade(cp(T, 9.4, 10.2)), gap = lerp(0.75 * rS, 10, e), rr = rS + 0.75 * rS;
  // questions
  const qO = CM.fade(cp(T, 14.0, 14.4)) * (1 - CM.fade(cp(T, 22.0, 22.4)));
  const qPos = L.centerCard ? { left: L.q.x, top: L.q.y } : { left: L.q.x, top: cardTop + ch + L.q.below };
  // copy
  const t1 = CM.fade(cp(T, 0.4, 1.1)) * (1 - CM.fade(cp(T, 4.7, 5.1))), t2 = CM.fade(cp(T, 5.3, 5.9)) * (1 - CM.fade(cp(T, 9.9, 10.4))), t3 = CM.fade(cp(T, 22.8, 23.4)) * (1 - CM.fade(cp(T, 25.8, 26.2)));
  const endO = CM.fade(cp(T, 26.5, 27.2)), end2 = CM.fade(cp(T, 26.9, 27.6)), logoO = CM.fade(cp(T, 27.0, 27.6));
  const textBlock = (o, txt, key) => o > 0.001 && (
    <div key={key} style={{ position: 'absolute', left: 0, right: 0, top: L.textY, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>
      <div style={{ width: 72, height: 3, background: 'linear-gradient(90deg, #4cc3c9, rgba(76,195,201,0))' }}></div>
      <div style={{ font: `500 ${L.textSize}px/1.1 ${CS_HEAD}`, letterSpacing: '-0.02em', color: CS.ink, textAlign: 'center', textWrap: 'balance', maxWidth: L.textW }}>{txt}</div>
    </div>);
  const cl2 = (closing || 'GAIN 2026 · Deadline 22 November').split('GAIN 2026');
  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, background: CS.ground, overflow: 'hidden' }}>
      {chartO > 0.001 && (
        <div style={{ position: 'absolute', inset: 0, opacity: chartO, transformOrigin: `${tq.cx}px ${tq.cy}px`, transform: `translate(${dx}px, ${dy}px) scale(${zs})` }}>
          <svg width={L.W} height={L.H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            {CS_DATA.map(([yr, cn, cu, inn, iu], i) => {
              const s = 0.1 + i * 0.18, yo = CM.fade(cp(T, s, s + 0.35));
              return (
                <g key={yr}>
                  <CsBar G={G} L={L} x={G.barX(i, 0)} n={cn} using={cu} color={CS.blue} T={T} s={s} rings={rings} skip={i === TGT.bar ? TGT.q : -1} seed={i * 2 + 1} />
                  <CsBar G={G} L={L} x={G.barX(i, 1)} n={inn} using={iu} color={CS.teal} T={T} s={s + 0.08} rings={rings} skip={-1} seed={i * 2 + 2} />
                  <text x={G.barX(i, 0) + G.pairW / 2} y={yrY} textAnchor="middle" fill={CS.ink} opacity={yo} style={{ font: `600 ${L.yrSize}px ${CS_MONO}` }}>{yr}</text>
                </g>);
            })}
            <g opacity={CM.fade(cp(T, 1.2, 1.8))}>
              {[0, 1].map(k => <path key={k} d={G.dome(G.barX(5, k), 12).d} fill="none" stroke={k ? CS.teal : CS.blue} strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="4 4" />)}
              <text x={G.barX(5, 0) + G.pairW / 2} y={yrY} textAnchor="middle" fill={CS.teal} style={{ font: `600 ${L.yrSize}px ${CS_MONO}` }}>2026</text>
            </g>
            {[0, 1].map(k => {
              const x = G.barX(5, k), startY = G.dome(x, 12).top - 240, color = k ? CS.teal : CS.blue, fr = Math.ceil(CS_N26[k] / 4), out = [];
              for (let q = 0; q < CS_N26[k]; q++) {
                const s = 1.6 + k * 0.05 + q * 0.1; if (T < s) break;
                const land = G.dot(x, q), d = CM.settle(cp(T, s, s + 0.7)), landed = T > s + 0.7, op = 0.5 + 0.45 * Math.floor(q / 4) / Math.max(1, fr - 1);
                out.push(<circle key={k + '-' + q} cx={land.cx} cy={startY + (land.cy - startY) * d} r={0.36 * p} fill={landed ? color : '#e4f6fb'} opacity={CM.fade(cp(T, s, s + 0.2)) * (landed ? op : 1)} />);
              }
              return <g key={'n' + k}>{out}</g>;
            })}
          </svg>
        </div>
      )}
      {ringO > 0.001 && T >= 5.0 && T < 6.0 && (
        <svg width={L.W} height={L.H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          <circle cx={tC.x} cy={tC.y} r={rr} fill="none" stroke={CS.ring} strokeWidth="2.2" strokeLinecap="round" strokeDasharray={2 * Math.PI * rr} strokeDashoffset={2 * Math.PI * rr * (1 - ringDraw)} transform={`rotate(-90 ${tC.x} ${tC.y})`} />
        </svg>
      )}
      {ringO > 0.001 && T >= 6.0 && (
        <div style={{ position: 'absolute', left: c0.x - cw / 2 - gap, top: c0.y - chh / 2 - gap, width: cw + 2 * gap, height: chh + 2 * gap, boxSizing: 'border-box', borderRadius: rad + gap, border: `2.2px solid ${CS.ring}`, opacity: ringO }}></div>
      )}
      {ready && L.minis.xs.map((x, k) => {
        const o = CM.fade(cp(T, 22.6, 23.2)) * cardsOut; if (o <= 0.001) return null;
        const hl = CM.fade(cp(T, 24.1 + 0.2 * k, 24.7 + 0.2 * k));
        return (
          <svg key={'c' + k} width={L.ctry.bw} height={L.ctry.bh} style={{ position: 'absolute', left: x - L.ctry.bw / 2, top: L.ctry.y - L.ctry.bh / 2, opacity: o, overflow: 'visible' }}>
            <path d={outlinePath(k, L.ctry.bw, L.ctry.bh)} fill={`rgba(76,195,201,${(0.05 + 0.27 * hl).toFixed(3)})`} stroke={cmix(CS.sub, CS.teal, hl)} strokeOpacity={0.5 + 0.5 * hl} strokeWidth="1.8" strokeLinejoin="round" />
          </svg>);
      })}
      {cardA > 0.001 && cardsOut > 0.001 && copies.map((c, k) => (
        <div key={'k' + k} style={{ position: 'absolute', left: c.x - cw / 2, top: c.y - chh / 2, width: cw, height: chh, borderRadius: rad, background: cardBg, opacity: cardA * cardsOut, boxShadow: shadow, overflow: 'hidden', transform: `scale(${msc})`, transformOrigin: '50% 50%' }}>
          {T > 10.5 && <CardContent L={L} T={T} />}
        </div>
      ))}
      {qO > 0.001 && (
        <div style={{ position: 'absolute', left: qPos.left, top: qPos.top, width: L.q.w, display: 'flex', flexDirection: 'column', gap: L.qGap, opacity: qO }}>
          {CS_QS.map((q, i) => {
            const [a, b] = CS_QT[i], n = Math.round(q.length * cp(T, a, b)), typing = T > a && T < b + 0.3;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: cp(T, a - 0.25, a) }}>
                <div style={{ minHeight: L.qSize * 1.3, font: `500 ${L.qSize}px/1.3 ${CS_MONO}`, color: CS.ink, whiteSpace: 'pre-wrap' }}>{q.slice(0, n)}{typing && <span style={{ display: 'inline-block', width: 3, height: L.qSize, marginLeft: 4, verticalAlign: '-0.15em', background: CS.teal }}></span>}</div>
                <div style={{ height: 1, background: 'rgba(207,224,244,0.28)' }}></div>
              </div>);
          })}
        </div>
      )}
      {textBlock(t1, 'Every example reported to GAIN enters the global record.', 'a')}
      {textBlock(t2, 'Some become EGRISS case studies.', 'b')}
      {textBlock(t3, 'Shared with statistical offices facing similar challenges.', 'c')}
      {endO > 0.001 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: L.H - L.logoY + 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
          <div style={{ width: 72, height: 3, background: 'linear-gradient(90deg, #4cc3c9, rgba(76,195,201,0))', opacity: endO }}></div>
          <div style={{ font: `500 ${L.endSize}px/1.06 ${CS_HEAD}`, letterSpacing: '-0.025em', color: CS.ink, textAlign: 'center', opacity: endO, transform: `translateY(${(1 - endO) * 12}px)` }}>{csSafe('Report your example.')}</div>
          <div style={{ font: `500 ${Math.round(L.endSize * 0.5)}px/1.2 ${CS_HEAD}`, letterSpacing: '-0.01em', color: CS.sub, textAlign: 'center', textWrap: 'balance', maxWidth: L.W - 160, opacity: end2, transform: `translateY(${(1 - end2) * 10}px)` }}>{cl2[0]}{cl2.length > 1 && <span style={{ color: CS.teal }}>GAIN 2026</span>}{cl2.slice(1).join('GAIN 2026')}</div>
        </div>
      )}
      <img src="assets/egriss-white-h.png" alt="EGRISS" style={{ position: 'absolute', left: '50%', top: L.logoY, height: L.logoH, transform: 'translateX(-50%)', opacity: logoO }} />
    </div>
  );
}

function GainCase({ format }) {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const L = CS_LAYOUT[format === 'wide' ? 'wide' : 'portrait'];
  return (
    <>
      <CompositionStage width={L.W} height={L.H} bg={CS.ground} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <CasePiece L={L} rings={t.caseRings} closing={t.closing} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={x => setTweak('motionEditor', x)} />
        <TweakSection label="Chart" />
        <TweakToggle label="Case-study rings in chart" value={t.caseRings} onChange={x => setTweak('caseRings', x)} />
        <TweakSection label="Copy" />
        <TweakText label="Closing line" value={t.closing} onChange={x => setTweak('closing', x)} />
      </TweaksPanel>
    </>
  );
}
window.GainCase = GainCase;
