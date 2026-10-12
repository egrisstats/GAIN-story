const { CompositionStage, useComposition, TweaksPanel, TweakSection, TweakToggle, TweakText, useTweaks } = window;

// GAIN 2026 teaser · the opening chart of the GAIN story ("Counted, and counting"), plus an empty 2026 pair to be filled
const GT = { ground: '#0a1430', blue: '#5b8fd9', teal: '#4cc3c9', ink: '#ffffff', cnt: '#e3ebf6' };
const GT_HEAD = "'Obvia', 'Figtree', sans-serif", GT_MONO = "'IBM Plex Mono', monospace";
// [year, country total, country using, institution total, institution using] · GAIN Tables 2025, Table 1.1
const GT_DATA = [[2021, 19, 19, 31, 31], [2022, 25, 25, 11, 11], [2023, 51, 25, 33, 29], [2024, 99, 87, 27, 19], [2025, 63, 51, 54, 40]];
const gcl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const gp = (T, a, b) => gcl((T - a) / (b - a));
const MO = { // calm, no overshoot
  enter: t => 1 - Math.pow(1 - t, 3),
  fade: t => t * t * (3 - 2 * t),
  settle: t => 1 - Math.pow(1 - t, 4),
};
const GT_LAYOUT = {
  portrait: { W: 1080, H: 1350, p: 15, yGap: 2, base: 1020, textY: 250, textSize: 76, numSize: 20, cntSize: 17, yrSize: 22, logoY: 1190, logoH: 92 },
  wide: { W: 1920, H: 1080, p: 21, yGap: 2.74, base: 846, textY: 92, textSize: 72, numSize: 26, cntSize: 21, yrSize: 26, logoY: 950, logoH: 80 },
};

function geom(L) {
  const p = L.p, bw = 4.35 * p, pad = (bw - 4 * p) / 2, g = 0.52 * p, pairW = 2 * bw + g, n = GT_DATA.length + 1;
  const total = n * pairW + (n - 1) * L.yGap * p, x0 = (L.W - total) / 2;
  const barX = (i, k) => x0 + i * (pairW + L.yGap * p) + k * (bw + g);
  const dot = (x, q) => ({ cx: x + pad + (q % 4) * p + p / 2, cy: L.base - 0.45 * p - Math.floor(q / 4) * p });
  const dome = (x, rows) => { const yc = L.base - 0.45 * p - (rows - 1) * p + 0.5 * p, r = bw / 2; return { d: `M${x},${L.base}V${yc}A${r},${r} 0 0 1 ${x + bw},${yc}V${L.base}`, top: yc - r }; };
  return { p, bw, pairW, barX, dot, dome };
}

function Bar({ G, L, x, n, using, color, T, s }) {
  const p = G.p, rows = Math.ceil(n / 4), fRows = Math.ceil(using / 4), D = G.dome(x, rows);
  const o = MO.fade(gp(T, s, s + 0.35)), fillDur = 0.9;
  const tintTop = using >= n ? null : L.base - 0.45 * p - (fRows - 1) * p - 0.5 * p;
  const dots = [];
  for (let q = 0; q < n; q++) {
    const a = gp(T, s + 0.1 + (q / n) * fillDur, s + 0.22 + (q / n) * fillDur);
    if (a <= 0) continue;
    const { cx, cy } = G.dot(x, q), row = Math.floor(q / 4);
    dots.push(q < using
      ? <circle key={q} cx={cx} cy={cy} r={0.36 * p} fill={color} opacity={a * (0.5 + 0.45 * row / Math.max(1, fRows - 1))} />
      : <circle key={q} cx={cx} cy={cy} r={0.33 * p} fill="none" stroke={color} strokeWidth={Math.max(1.4, p * 0.07)} opacity={a * 0.8} />);
  }
  return (
    <g>
      <g opacity={o}>
        {tintTop == null ? <path d={D.d} fill={color} fillOpacity="0.16" /> : <rect x={x} y={tintTop} width={G.bw} height={L.base - tintTop} fill={color} fillOpacity="0.16" />}
        <path d={D.d} fill="none" stroke={color} strokeOpacity="0.75" strokeWidth="1.4" strokeDasharray="4 4" />
        <text x={x + G.bw / 2} y={D.top - 10} textAnchor="middle" fill={color} style={{ font: `600 ${L.numSize}px ${GT_MONO}` }}>{n}</text>
        <text x={x + G.bw / 2} y={L.base + L.cntSize + 14} textAnchor="middle" fill={GT.cnt} style={{ font: `500 ${L.cntSize}px ${GT_MONO}` }}>{using}</text>
      </g>
      {dots}
    </g>
  );
}

function TeaserPiece({ L, dateLine }) {
  const { T } = useComposition();
  const G = geom(L), p = G.p, yrY = L.base + L.cntSize + 22 + L.yrSize * 1.3;
  const drift = 1 + 0.018 * MO.fade(gp(T, 0, 6));
  // 2026: empty dashed pair, then examples fall in one after another
  const c6 = MO.fade(gp(T, 2.0, 2.6)), slotRows = 12, N26 = [22, 16];
  const drops = [];
  [0, 1].forEach(k => {
    const x = G.barX(5, k), startY = G.dome(x, slotRows).top - 240, color = k ? GT.teal : GT.blue, fr = Math.ceil(N26[k] / 4);
    for (let q = 0; q < N26[k]; q++) {
      const land = G.dot(x, q), s = 2.4 + k * 0.05 + q * 0.085, d = MO.settle(gp(T, s, s + 0.7));
      drops.push({ key: k + '-' + q, x: land.cx, y: startY + (land.cy - startY) * d, o: MO.fade(gp(T, s, s + 0.2)), on: T >= s, landed: T > s + 0.7, op: 0.5 + 0.45 * Math.floor(q / 4) / Math.max(1, fr - 1), glow: T > s + 0.65 ? Math.sin(Math.PI * gp(T, s + 0.65, s + 1.25)) : 0, color });
    }
  });
  const t1 = MO.fade(gp(T, 0.5, 1.2)) * (1 - MO.fade(gp(T, 4.0, 4.4))), t2 = MO.fade(gp(T, 4.3, 4.9)), logoO = MO.fade(gp(T, 4.4, 5.0));
  const textBlock = (o, children, key) => (
    <div key={key} style={{ position: 'absolute', left: 0, right: 0, top: L.textY, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>
      <div style={{ width: 72, height: 3, background: 'linear-gradient(90deg, #4cc3c9, rgba(76,195,201,0))' }}></div>
      <div style={{ font: `500 ${L.textSize}px/1.08 ${GT_HEAD}`, letterSpacing: '-0.02em', color: GT.ink, textAlign: 'center', textWrap: 'balance', maxWidth: L.W - 160 }}>{children}</div>
    </div>);
  const dl = (dateLine || 'GAIN 2026 opens 3 November').split('GAIN 2026');
  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, background: GT.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${drift})`, transformOrigin: `50% ${(L.base / L.H) * 100}%` }}>
        <svg width={L.W} height={L.H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          {GT_DATA.map(([yr, cn, cu, inn, iu], i) => {
            const s = 0.1 + i * 0.22, yo = MO.fade(gp(T, s, s + 0.35));
            return (
              <g key={yr}>
                <Bar G={G} L={L} x={G.barX(i, 0)} n={cn} using={cu} color={GT.blue} T={T} s={s} />
                <Bar G={G} L={L} x={G.barX(i, 1)} n={inn} using={iu} color={GT.teal} T={T} s={s + 0.08} />
                <text x={G.barX(i, 0) + G.pairW / 2} y={yrY} textAnchor="middle" fill={GT.ink} opacity={yo} style={{ font: `600 ${L.yrSize}px ${GT_MONO}` }}>{yr}</text>
              </g>);
          })}
          <g opacity={c6}>
            {[0, 1].map(k => <path key={k} d={G.dome(G.barX(5, k), slotRows).d} fill="none" stroke={k ? GT.teal : GT.blue} strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="4 4" />)}
            <text x={G.barX(5, 0) + G.pairW / 2} y={yrY} textAnchor="middle" fill={GT.teal} style={{ font: `600 ${L.yrSize}px ${GT_MONO}` }}>2026</text>
          </g>
          {drops.map(d => d.on && (
            <g key={d.key}>
              {d.glow > 0 && <circle cx={d.x} cy={d.y} r={p * (0.4 + 0.5 * d.glow)} fill={d.color} opacity={0.25 * d.glow} />}
              <circle cx={d.x} cy={d.y} r={0.36 * p} fill={d.landed ? d.color : '#e4f6fb'} opacity={d.o * (d.landed ? d.op : 1)} />
            </g>))}
        </svg>
      </div>
      {t1 > 0.001 && textBlock(t1, 'Every example counts.', 'a')}
      {t2 > 0.001 && textBlock(t2, <>{dl[0]}{dl.length > 1 && <span style={{ color: GT.teal }}>GAIN 2026</span>}{dl.slice(1).join('GAIN 2026')}</>, 'b')}
      <img src="assets/egriss-white-h.png" alt="EGRISS" style={{ position: 'absolute', left: '50%', top: L.logoY, height: L.logoH, transform: 'translateX(-50%)', opacity: logoO }} />
    </div>
  );
}

function GainTeaser({ format }) {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const L = GT_LAYOUT[format === 'wide' ? 'wide' : 'portrait'];
  return (
    <>
      <CompositionStage width={L.W} height={L.H} bg={GT.ground} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <TeaserPiece L={L} dateLine={t.dateLine} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={x => setTweak('motionEditor', x)} />
        <TweakSection label="Copy" />
        <TweakText label="Closing line" value={t.dateLine} onChange={x => setTweak('dateLine', x)} />
      </TweaksPanel>
    </>
  );
}
window.GainTeaser = GainTeaser;
