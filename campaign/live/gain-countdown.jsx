const { CompositionStage, useComposition, TweaksPanel, TweakSection, TweakToggle, TweakText, useTweaks } = window;

// GAIN 2026 countdown · teaser chart (no counts), circles dropping into 2026, countdown figure on top
const CD = { ground: '#0a1430', blue: '#5b8fd9', teal: '#4cc3c9', ink: '#ffffff', sub: '#cfe0f4', drop: '#e4f6fb' };
const CD_HEAD = "'Obvia', 'Figtree', sans-serif", CD_MONO = "'IBM Plex Mono', monospace";
const CD_RULE = 'linear-gradient(90deg, #4cc3c9, rgba(76,195,201,0))';
const CD_DATA = [[2021, 19, 19, 31, 31], [2022, 25, 25, 11, 11], [2023, 51, 25, 33, 29], [2024, 99, 87, 27, 19], [2025, 63, 51, 54, 40]];
const CD_SLOT = 12; // rows in the 2026 slot (48 circles per bar)
const CD_FILL = { '1': [0, 16], '2': [16, 32], '3': [32, 45] }; // ~1/3, ~2/3, nearly full; each clip continues from the last
const ccl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const cpp = (T, a, b) => ccl((T - a) / (b - a));
const CMO = { fade: t => t * t * (3 - 2 * t), settle: t => 1 - Math.pow(1 - t, 4) };
const CD_LAYOUT = {
  portrait: { W: 1080, H: 1350, p: 15, yGap: 2, base: 1020, yrSize: 22, logoY: 1200, logoH: 80, fig: { top: 116, size: 300, label: 54 }, big: { top: 232, size: 100 }, close: { top: 205, size: 76 } },
  wide: { W: 1920, H: 1080, p: 20, yGap: 2.74, base: 890, yrSize: 26, logoY: 972, logoH: 62, fig: { top: 44, size: 200, label: 44 }, big: { top: 104, size: 120 }, close: { top: 130, size: 72 } },
};

function cdGeom(L) {
  const p = L.p, bw = 4.35 * p, pad = (bw - 4 * p) / 2, g = 0.52 * p, pairW = 2 * bw + g, n = CD_DATA.length + 1;
  const total = n * pairW + (n - 1) * L.yGap * p, x0 = (L.W - total) / 2;
  const barX = (i, k) => x0 + i * (pairW + L.yGap * p) + k * (bw + g);
  const dot = (x, q) => ({ cx: x + pad + (q % 4) * p + p / 2, cy: L.base - 0.45 * p - Math.floor(q / 4) * p });
  const dome = (x, rows) => { const yc = L.base - 0.45 * p - (rows - 1) * p + 0.5 * p, r = bw / 2; return { d: `M${x},${L.base}V${yc}A${r},${r} 0 0 1 ${x + bw},${yc}V${L.base}`, top: yc - r }; };
  return { p, bw, pairW, barX, dot, dome };
}

function CdBar({ G, L, x, n, using, color }) {
  const p = G.p, rows = Math.ceil(n / 4), fRows = Math.ceil(using / 4), D = G.dome(x, rows);
  const tintTop = using >= n ? null : L.base - 0.45 * p - (fRows - 1) * p - 0.5 * p;
  const dots = [];
  for (let q = 0; q < n; q++) {
    const { cx, cy } = G.dot(x, q), row = Math.floor(q / 4);
    dots.push(q < using
      ? <circle key={q} cx={cx} cy={cy} r={0.36 * p} fill={color} opacity={0.5 + 0.45 * row / Math.max(1, fRows - 1)} />
      : <circle key={q} cx={cx} cy={cy} r={0.33 * p} fill="none" stroke={color} strokeWidth={Math.max(1.4, p * 0.07)} opacity={0.8} />);
  }
  return (
    <g>
      {tintTop == null ? <path d={D.d} fill={color} fillOpacity="0.16" /> : <rect x={x} y={tintTop} width={G.bw} height={L.base - tintTop} fill={color} fillOpacity="0.16" />}
      <path d={D.d} fill="none" stroke={color} strokeOpacity="0.75" strokeWidth="1.4" strokeDasharray="4 4" />
      {dots}
    </g>
  );
}

function CountdownPiece({ L, clip, figure, label, closing }) {
  const { T } = useComposition();
  const G = cdGeom(L), p = G.p, yrY = L.base + L.yrSize + 18;
  const drift = 1 + 0.018 * CMO.fade(cpp(T, 0, 6));
  const [from, to] = CD_FILL[clip] || CD_FILL['1'], iv = 2.8 / Math.max(1, to - from);
  const drops = [];
  [0, 1].forEach(k => {
    const x = G.barX(5, k), startY = G.dome(x, CD_SLOT).top - 240, color = k ? CD.teal : CD.blue;
    for (let q = 0; q < to; q++) {
      const land = G.dot(x, q), pre = q < from, s = 0.5 + (q - from) * iv + k * iv * 0.5, d = pre ? 1 : CMO.settle(cpp(T, s, s + 0.7));
      drops.push({ key: k + '-' + q, x: land.cx, y: startY + (land.cy - startY) * d, o: pre ? 1 : CMO.fade(cpp(T, s, s + 0.2)), on: pre || T >= s, landed: pre || T > s + 0.7, op: 0.5 + 0.45 * Math.floor(q / 4) / (CD_SLOT - 1), glow: !pre && T > s + 0.65 ? Math.sin(Math.PI * cpp(T, s + 0.65, s + 1.25)) : 0, color });
    }
  });
  const t1 = CMO.fade(cpp(T, 0.2, 0.8)) * (1 - CMO.fade(cpp(T, 4.0, 4.4))), t2 = CMO.fade(cpp(T, 4.3, 4.9)), logoO = CMO.fade(cpp(T, 0.1, 0.6));
  const isNum = /^\d+$/.test(String(figure).trim());
  const cl2 = (closing || '').split('GAIN 2026');
  const block = (top, o, kids) => (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>
      <div style={{ width: 72, height: 3, background: CD_RULE }}></div>
      {kids}
    </div>);
  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, background: CD.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${drift})`, transformOrigin: `50% ${(L.base / L.H) * 100}%` }}>
        <svg width={L.W} height={L.H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          {CD_DATA.map(([yr, cn, cu, inn, iu], i) => (
            <g key={yr}>
              <CdBar G={G} L={L} x={G.barX(i, 0)} n={cn} using={cu} color={CD.blue} />
              <CdBar G={G} L={L} x={G.barX(i, 1)} n={inn} using={iu} color={CD.teal} />
              <text x={G.barX(i, 0) + G.pairW / 2} y={yrY} textAnchor="middle" fill={CD.ink} style={{ font: `600 ${L.yrSize}px ${CD_MONO}` }}>{yr}</text>
            </g>))}
          {[0, 1].map(k => <path key={k} d={G.dome(G.barX(5, k), CD_SLOT).d} fill="none" stroke={k ? CD.teal : CD.blue} strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="4 4" />)}
          <text x={G.barX(5, 0) + G.pairW / 2} y={yrY} textAnchor="middle" fill={CD.teal} style={{ font: `600 ${L.yrSize}px ${CD_MONO}` }}>2026</text>
          {drops.map(d => d.on && (
            <g key={d.key}>
              {d.glow > 0.001 && <circle cx={d.x} cy={d.y} r={p * (0.4 + 0.5 * d.glow)} fill={d.color} opacity={0.25 * d.glow} />}
              <circle cx={d.x} cy={d.y} r={0.36 * p} fill={d.landed ? d.color : CD.drop} opacity={d.o * (d.landed ? d.op : 1)} />
            </g>))}
        </svg>
      </div>
      {t1 > 0.001 && (isNum
        ? block(L.fig.top, t1, <>
            <div style={{ font: `500 ${L.fig.size}px/0.86 ${CD_MONO}`, letterSpacing: '-0.02em', color: CD.ink }}>{figure}</div>
            <div style={{ font: `500 ${L.fig.label}px/1.1 ${CD_HEAD}`, color: CD.sub }}>{label}</div>
          </>)
        : block(L.big.top, t1, <div style={{ font: `500 ${L.big.size}px/1.05 ${CD_HEAD}`, letterSpacing: '-0.02em', color: CD.ink, textAlign: 'center', textWrap: 'balance', maxWidth: L.W - 120 }}>{figure}</div>))}
      {t2 > 0.001 && block(L.close.top, t2, <div style={{ font: `500 ${L.close.size}px/1.08 ${CD_HEAD}`, letterSpacing: '-0.02em', color: CD.ink, textAlign: 'center', textWrap: 'balance', maxWidth: L.W - 160 }}>{cl2[0]}{cl2.length > 1 && <span style={{ color: CD.teal }}>GAIN 2026</span>}{cl2.slice(1).join('GAIN 2026')}</div>)}
      <img src="assets/egriss-white-h.png" alt="EGRISS" style={{ position: 'absolute', left: '50%', top: L.logoY, height: L.logoH, transform: 'translateX(-50%)', opacity: logoO }} />
    </div>
  );
}

function GainCountdown({ format, clip }) {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const L = CD_LAYOUT[format === 'wide' ? 'wide' : 'portrait'];
  return (
    <>
      <CompositionStage width={L.W} height={L.H} bg={CD.ground} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <CountdownPiece L={L} clip={String(clip || '1')} figure={t.figure} label={t.label} closing={t.closing} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={x => setTweak('motionEditor', x)} />
        <TweakSection label="Copy" />
        <TweakText label="Countdown (number or text)" value={t.figure} onChange={x => setTweak('figure', x)} />
        <TweakText label="Label under number" value={t.label} onChange={x => setTweak('label', x)} />
        <TweakText label="Closing line" value={t.closing} onChange={x => setTweak('closing', x)} />
      </TweaksPanel>
    </>
  );
}
window.GainCountdown = GainCountdown;
