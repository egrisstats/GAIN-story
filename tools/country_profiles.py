"""Builds assets/countries/, the data behind the country cards in the story (Main.dc.html):
countries.json (one entry per country) and ISO.json (where displaced and stateless people live, loaded when a card opens).

For every country with a GAIN example (2021-2025) it joins:
  - the examples themselves, from the story's data (assets/), with each one's method
    (census, survey, administrative data...) and who it covered;
  - UNHCR's population statistics (api.unhcr.org, Refugee Data Finder): refugees, asylum-seekers,
    IDPs, stateless people and returnees per year, the main countries of origin, and IDMC's
    estimate of internally displaced people;
  - UNHCR's locations of displaced and stateless people (gis.unhcr.org, wrl_prp_p_unhcr_PoC):
    the camps, settlements and communities where they live, with their type.

Where an answer is missing, the method and the groups are read from the example's title and note,
and marked as such ("basis": "title"), so the page can say so.

Run:  python3 tools/country_profiles.py            (uses cached downloads when present)
      python3 tools/country_profiles.py --refresh  (downloads again)
"""
import json, os, re, subprocess, sys, time, unicodedata, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.cache')
OUT = os.path.join(ROOT, 'assets', 'countries', 'countries.json')
LOCDIR = os.path.join(ROOT, 'assets', 'countries')
REFRESH = '--refresh' in sys.argv
YEARS = (2021, 2025)
API = 'https://api.unhcr.org/population/v1/'
GIS = 'https://gis.unhcr.org/arcgis/rest/services/core_v2/wrl_prp_p_unhcr_PoC/FeatureServer/0/query'


def get(url, key):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + '.json')
    if os.path.exists(path) and not REFRESH:
        return json.load(open(path))
    for attempt in range(4):
        try:
            # curl rather than urllib: some Python installs on macOS have no certificate store
            raw = subprocess.run(['curl', '-sfL', '-m', '120', '-A', 'GAIN-country-profiles', url],
                                 check=True, capture_output=True).stdout
            data = json.loads(raw)
            json.dump(data, open(path, 'w'))
            return data
        except Exception as e:  # network hiccups: wait and try again
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def pages(endpoint, params, key):
    out, page = [], 1
    while True:
        q = dict(params, limit=1000, page=page)
        d = get(API + endpoint + '/?' + urllib.parse.urlencode(q), '%s_p%d' % (key, page))
        out += d['items']
        if page >= (d.get('maxPages') or 1):
            return out
        page += 1


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s or '') if not unicodedata.combining(c)).lower()


# ---------- the GAIN examples, as the story holds them ----------
ex = json.load(open(os.path.join(ROOT, 'assets', '327ec8f9d9b25a43bb01173c45375b10.json')))
ch = json.load(open(os.path.join(ROOT, 'assets', '6794b02ec5b52640a5ed6e238c4bd0bf.json')))
story = json.load(open(os.path.join(ROOT, 'assets', 'c92c0aa4e7ae0e7003c152db6be5c09a.json')))
FW = ['IRRS', 'IRIS', 'IROSS', 'Mixed use', 'Undetermined']
SN = ['Survey', 'Administrative data', 'Census', 'Data integration', 'Non-traditional data', 'Tools and other']

# GAIN country names that UNHCR spells differently
ALIAS = {'Kosovo*': 'XKX', 'Laos': 'LAO', 'Turkiye': 'TUR', 'Türkiye': 'TUR', 'State of Palestine': 'PSE',
         "Côte d'Ivoire": 'CIV', 'Republic of the Congo': 'COG', 'Democratic Republic of the Congo': 'COD',
         'Republic of Moldova': 'MDA', 'Syrian Arab Republic': 'SYR', 'United Kingdom': 'GBR',
         'United States of America': 'USA', 'Iran': 'IRN', 'Netherlands': 'NLD', 'Venezuela': 'VEN', 'Bolivia': 'BOL'}
NAME = {'XKX': 'Kosovo*', 'TUR': 'Türkiye'}

countries = pages('countries', {}, 'countries')
by_name = {fold(c['name']): c['iso'] for c in countries}
for c in countries:
    for k in ('nameShort', 'nameLong', 'nameOrigin'):
        if c.get(k):
            by_name.setdefault(fold(c[k]), c['iso'])
meta = {c['iso']: c for c in countries}


def iso_of(name):
    return ALIAS.get(name) or by_name.get(fold(name))


# method: what the answer says; failing that, what the title and note say
METHOD_WORDS = [
    ('Census', r'\bcensus|\bcenso\b|recensement|\brgph|\brphc|\bphc\b'),
    ('Survey', r'survey|enqu[eê]te|encuesta|\bmics\b|\bdhs\b|\blfs\b|\blsms|\bhies\b|\bmsna\b|household|\bpoll\b|panel|questionnaire|assessment'),
    ('Administrative data', r'regist|administrative|records|\bdatabase|\bprogres\b|asylum (applications|statistics|data)|admin data|border|permit'),
    ('Data integration', r'integrat|linkage|linking|combin|merg'),
]
GROUP_WORDS = [
    ('Refugees', r'refugee|r[eé]fugi'),
    ('Asylum-seekers', r'asylum|asile|solicitantes'),
    ('IDPs', r'\bidps?\b|internally displaced|d[eé]plac[eé]s internes|desplazad|displacement|displaced'),
    ('Stateless people', r'stateless|apatrid'),
    ('Returnees', r'return'),
    ('Host communities', r'\bhost'),
    ('Migrants', r'migra'),
]


def classify(e, c):
    src = [SN[k] for k in c[2]]
    text = fold(' '.join(str(x) for x in (e[5], e[8], e[6])))
    method, basis = [m for m in src if m in ('Census', 'Survey', 'Administrative data', 'Data integration')], 'answer'
    if not method:
        method = [m for m, rx in METHOD_WORDS if re.search(rx, text)][:2]
        basis = 'title' if method else 'none'
    groups, gbasis = [g.strip() for g in re.split(r'[;,·]', str(e[7] or '')) if g.strip()], 'answer'
    if not groups:
        groups = [g for g, rx in GROUP_WORDS if re.search(rx, text)]
        gbasis = 'title' if groups else 'none'
    return src, method, basis, groups, gbasis


# ---------- UNHCR population statistics ----------
pop = pages('population', {'yearFrom': YEARS[0], 'yearTo': YEARS[1], 'coa_all': 'true'}, 'pop')
origins = pages('population', {'yearFrom': YEARS[1], 'yearTo': YEARS[1], 'coa_all': 'true', 'coo_all': 'true'}, 'orig')
idmc = pages('idmc', {'yearFrom': YEARS[0], 'yearTo': YEARS[1], 'coo_all': 'true'}, 'idmc')

POPK = [('refugees', 'refugees'), ('asylum', 'asylum_seekers'), ('idps', 'idps'), ('stateless', 'stateless'),
        ('ret_ref', 'returned_refugees'), ('ret_idp', 'returned_idps'), ('ooc', 'ooc'), ('oip', 'oip')]
popby = {}
for r in pop:
    iso = r['coa_iso']
    popby.setdefault(iso, {})[r['year']] = {k: num(r[f]) for k, f in POPK}
unrwa = pages('unrwa', {'yearFrom': YEARS[0], 'yearTo': YEARS[1], 'coa_all': 'true'}, 'unrwa')
unrwaby = {}
for r in unrwa:
    unrwaby.setdefault(r['coa_iso'], {})[r['year']] = num(r['total'])
idmcby = {}
for r in idmc:
    idmcby.setdefault(r['coo_iso'], {})[r['year']] = num(r['total'])
origby = {}
for r in origins:
    n = num(r['refugees']) + num(r['asylum_seekers']) + num(r['oip'])
    if n and r['coo_iso'] not in ('-', r['coa_iso']):
        origby.setdefault(r['coa_iso'], []).append((n, r['coo_name']))

# ---------- UNHCR locations ----------
LOCSUB = {'37': 'Centre', '38': 'Formal settlement or camp', '39': 'Informal settlement', '43': 'Living in communities',
          '44': 'Collective centre', '49': 'Area (admin 1)', '50': 'Area (admin 2)', '51': 'Area (admin 3)', '97': 'Unknown', '99': 'Other'}
POPT = {52: 'Refugees', 53: 'Returnees', 54: 'IDPs', 55: 'Asylum-seekers', 56: 'Stateless people', 57: 'Others of concern'}
G, T = list(POPT.values()), list(dict.fromkeys(LOCSUB.values()))
locs, offset = [], 0
while True:
    q = {'where': 'gis_status=14 AND loc_type=62', 'outFields': 'iso3,gis_name,loc_subtype,pop_type,latitude_d,longitude_d,src_date',
         'returnGeometry': 'false', 'orderByFields': 'objectid', 'resultOffset': offset, 'resultRecordCount': 2000, 'f': 'json'}
    d = get(GIS + '?' + urllib.parse.urlencode(q), 'gis_%d' % offset)
    feats = d.get('features', [])
    locs += [f['attributes'] for f in feats]
    if not d.get('exceededTransferLimit') or not feats:
        break
    offset += len(feats)
locby = {}
for a in locs:
    if a.get('latitude_d') is None or a.get('pop_type') not in POPT:
        continue
    locby.setdefault(a['iso3'], []).append(a)


# ---------- small maps for the country cards ----------
# Country outlines from Natural Earth (world-atlas 50m, TopoJSON), projected here (Mercator) so the story only
# has to draw a ready-made picture: outline, neighbours and UNHCR's locations as x/y in a 0..W x 0..H box.
import math
ATLAS_NAME = {'COD': 'Dem. Rep. Congo', 'CAF': 'Central African Rep.', 'COG': 'Congo', 'SSD': 'S. Sudan', 'MDA': 'Moldova',
              'PSE': 'Palestine', 'SYR': 'Syria', 'TUR': 'Turkey', 'XKX': 'Kosovo', 'MHL': 'Marshall Is.', 'LAO': 'Laos',
              'CIV': "Côte d'Ivoire", 'USA': 'United States of America', 'GBR': 'United Kingdom', 'RUS': 'Russia',
              'BIH': 'Bosnia and Herz.', 'DOM': 'Dominican Rep.', 'TZA': 'Tanzania', 'IRN': 'Iran', 'VEN': 'Venezuela', 'BOL': 'Bolivia'}
topo = get('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json', 'atlas50m')
sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
ARCS = []
for arc in topo['arcs']:
    x = y = 0; pts = []
    for dx, dy in arc:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    ARCS.append(pts)
def ring(ids):
    out = []
    for i in ids:
        a = ARCS[i] if i >= 0 else ARCS[~i][::-1]
        out += a[1:] if out else a
    return out
def polys(geom):
    if geom['type'] == 'Polygon':
        return [[ring(r) for r in geom['arcs']]]
    if geom['type'] == 'MultiPolygon':
        return [[ring(r) for r in pg] for pg in geom['arcs']]
    return []
GEO = {g['properties']['name']: polys(g) for g in topo['objects']['countries']['geometries']}
def merc(lon, lat):
    lat = max(-85, min(85, lat))
    return lon, math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2


# ---------- Nigeria: IDPs and camps by area (IOM DTM site assessments) ----------
# DTM publishes every assessed site with its local government area (LGA) and head count, but no coordinates,
# so the card shades LGAs (OCHA common boundaries) by the IDPs living there, in camps or with host communities.
# Needs openpyxl to read DTM's Excel files; without it the Nigeria card simply has no area layer.
DTM_NGA = [('nigeria-site-assessment-data', 'North-east, round'), ('nigeria-displacement-data-north-central-west-site-assessment-iom-dtm', 'North-central and north-west, round')]
NGA_ADM = 'https://data.humdata.org/dataset/81ac1d38-f603-4a98-804d-325c658599a3/resource/7e30ec96-7f29-4ee8-9f4c-77633b353cbb/download/nga_admin_boundaries.geojson.zip'
def dtm_nigeria():
    try:
        import openpyxl
    except ImportError:
        print('openpyxl not installed: Nigeria card without DTM areas'); return None
    import zipfile, io
    d = os.path.join(CACHE, 'dtm'); os.makedirs(d, exist_ok=True)
    by, rounds = {}, []
    for k, (pkg, label) in enumerate(DTM_NGA):
        meta_ = get('https://data.humdata.org/api/3/action/package_show?id=' + pkg, 'dtm_pkg%d' % k)['result']['resources'][0]
        f = os.path.join(d, 'site%d.xlsx' % (k + 1))
        if REFRESH or not os.path.exists(f):
            subprocess.run(['curl', '-sfL', '-m', '300', '-o', f, meta_['url']], check=True)
        rounds.append(meta_['name'])
        rows = list(openpyxl.load_workbook(f, read_only=True).worksheets[0].iter_rows(values_only=True))
        h = [str(x or '') for x in rows[0]]
        col = lambda pre: [i for i, x in enumerate(h) if x.startswith(pre)][0]
        pi, ni, li, si, di = col('1.1.b.3 Population Type'), col('Number of Individuals'), col('LGA Pcode'), col('State'), col('A.1 Date')
        for r in rows[1:]:
            pc, pt = str(r[li] or ''), str(r[pi] or '')
            try:
                n = int(float(r[ni] or 0))
            except (TypeError, ValueError):
                continue
            if not pc.startswith('NGA'):
                continue
            a = by.setdefault('NG' + pc[3:], {'idp': 0, 'camp': 0, 'camps': 0, 'ret': 0})
            if pt.startswith('IDPs'):
                a['idp'] += n
                if pt == 'IDPs in Camps':
                    a['camp'] += n; a['camps'] += 1
            elif pt.startswith('Returnee'):
                a['ret'] += n
    zf = os.path.join(d, 'nga_adm.geojson.zip')
    if REFRESH or not os.path.exists(zf):
        subprocess.run(['curl', '-sfL', '-m', '300', '-o', zf, NGA_ADM], check=True)
    z = zipfile.ZipFile(zf)
    adm2 = json.load(z.open([n for n in z.namelist() if n.endswith('nga_admin2.geojson')][0]))
    adm1 = json.load(z.open([n for n in z.namelist() if n.endswith('nga_admin1.geojson')][0]))
    return {'by': by, 'adm2': adm2, 'adm1': adm1, 'rounds': rounds}

def gj_polys(geom):
    if geom['type'] == 'Polygon':
        return [geom['coordinates']]
    if geom['type'] == 'MultiPolygon':
        return geom['coordinates']
    return []

def country_map(iso, name, L):
    pg = GEO.get(ATLAS_NAME.get(iso, name)) or GEO.get(name)
    W = 560
    if pg:
        # fit the main landmass (and any part at least 15% of its size), so overseas territories do not shrink it
        big = max(area(pp[0]) for pp in pg)
        keep = [pp for pp in pg if area(pp[0]) >= big * 0.15]
        xs = [merc(*q)[0] for pp in keep for q in pp[0]]; ys = [merc(*q)[1] for pp in keep for q in pp[0]]
    elif L:
        xs = [merc(a['longitude_d'], a['latitude_d'])[0] for a in L]; ys = [merc(a['longitude_d'], a['latitude_d'])[1] for a in L]
    else:
        return None
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    span = max(x1 - x0, y1 - y0, 0.6)
    pad = span * 0.08
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad
    if x1 - x0 < 0.8: c = (x0 + x1) / 2; x0, x1 = c - 0.4, c + 0.4
    if y1 - y0 < 0.8: c = (y0 + y1) / 2; y0, y1 = c - 0.4, c + 0.4
    k = W / (x1 - x0)
    H = int(min(560, max(260, (y1 - y0) * k)))
    k = min(k, H / (y1 - y0))
    ox = (W - (x1 - x0) * k) / 2; oy = (H - (y1 - y0) * k) / 2
    def P(lon, lat):
        mx, my = merc(lon, lat)
        return (ox + (mx - x0) * k, oy + (y1 - my) * k)
    def path(pgs):
        d = []
        for pp in pgs:
            for r in pp:
                q = [P(*v) for v in r]
                bx = [v[0] for v in q]; by = [v[1] for v in q]
                if max(bx) < -50 or min(bx) > W + 50 or max(by) < -50 or min(by) > H + 50:
                    continue
                last = None; seg = []
                for v in q:
                    v = (round(v[0]), round(v[1]))
                    if last is None or abs(v[0] - last[0]) + abs(v[1] - last[1]) >= 2:
                        seg.append(v); last = v
                if len(seg) > 2:
                    d.append('M' + 'L'.join('%g %g' % v for v in seg) + 'Z')
        return ''.join(d)
    near = path([pp for nm, g in GEO.items() if g is not pg for pp in g])
    land = path(pg) if pg else ''
    pts = []
    for a in L:
        x, y = P(a['longitude_d'], a['latitude_d'])
        if 0 <= x <= W and 0 <= y <= H:
            pts.append([round(x), round(y), G.index(POPT[a['pop_type']]), T.index(LOCSUB.get(str(a['loc_subtype']), 'Other')), a['gis_name']])
    res = {'w': W, 'h': H, 'land': land, 'near': near, 'pts': pts, 'off': len(L) - len(pts)}
    if iso == 'NGA' and NGA_DTM:
        # [path, pcode, LGA, state, IDPs, IDPs in camps, camps, returnees] for every LGA; states as outlines with a label point
        areas = []
        for f in NGA_DTM['adm2']['features']:
            pr = f['properties']; a = NGA_DTM['by'].get(pr['adm2_pcode'], {})
            areas.append([path(gj_polys(f['geometry'])), pr['adm2_pcode'], pr['adm2_name'], pr['adm1_name'],
                          a.get('idp', 0), a.get('camp', 0), a.get('camps', 0), a.get('ret', 0)])
        states = []
        for f in NGA_DTM['adm1']['features']:
            pr = f['properties']; x, y = P(pr['center_lon'], pr['center_lat'])
            states.append([path(gj_polys(f['geometry'])), pr['adm1_name'], round(x), round(y)])
        res['areas'] = areas; res['states'] = states
        res['areas_src'] = 'IOM DTM site assessments (' + '; '.join(NGA_DTM['rounds']) + '), via HDX. Boundaries: OCHA/HDX common operational datasets.'
    return res

NGA_DTM = dtm_nigeria()

# ---------- one profile per country ----------
out = {}
for i, e in enumerate(ex):
    name = e[3]
    if not name:
        continue
    iso = iso_of(name)
    if not iso:
        print('no ISO code for', name)
        continue
    c = ch[i]
    src, method, basis, groups, gbasis = classify(e, c)
    p = out.setdefault(iso, {'iso': iso, 'name': NAME.get(iso, name), 'examples': []})
    text = fold(e[5] + ' ' + str(e[8]))
    cname = {fold(name), fold(meta.get(iso, {}).get('name', ''))}
    named = sorted({l['gis_name'] for l in locby.get(iso, []) if len(l['gis_name']) > 3
                    and fold(l['gis_name']) not in cname and re.search(r'\b' + re.escape(fold(l['gis_name'])) + r'\b', text)})
    # Nigeria: states and LGAs named in the example (for the area map)
    areas = []
    if iso == 'NGA' and NGA_DTM:
        for f in NGA_DTM['adm1']['features'] + NGA_DTM['adm2']['features']:
            nm = f['properties'].get('adm2_name') or f['properties']['adm1_name']
            if len(nm) > 4 and re.search(r'\b' + re.escape(fold(nm)) + r'\b', text) and nm not in areas:
                areas.append(nm)
    s = story.get(str(i)) or {}
    p['examples'].append({'areas': areas,
        'id': i + 1, 'year': e[0], 'lead': 'Institution-led' if e[1] else 'Country-led', 'org': e[4], 'title': e[5], 'note': e[8] or '',
        'uses': bool(c[0]), 'recs': FW[e[2]] if c[0] else None, 'sources': src, 'method': method, 'method_basis': basis,
        'groups': groups, 'groups_basis': gbasis, 'places': named, 'cover': s.get('cover'), 'link': s.get('link')})

for iso, p in out.items():
    m = meta.get(iso, {})
    p['region'] = m.get('majorArea')
    p['subregion'] = m.get('region')
    p['population'] = {str(y): v for y, v in sorted(popby.get(iso, {}).items())}
    p['idmc'] = {str(y): v for y, v in sorted(idmcby.get(iso, {}).items())}
    p['origins'] = [{'country': n, 'people': k} for k, n in sorted(origby.get(iso, []), reverse=True)[:5]]
    p['unrwa'] = {str(y): v for y, v in sorted(unrwaby.get(iso, {}).items())}
    # locations go in one small file per country, loaded when its profile opens:
    # [name, lat, lon, group, type] with group and type as indexes into the lists in countries.json
    L = sorted(locby.get(iso, []), key=lambda a: a['gis_name'])
    tally = {}
    for a in L:
        k = (POPT[a['pop_type']], LOCSUB.get(str(a['loc_subtype']), 'Other'))
        tally[k] = tally.get(k, 0) + 1
    p['places'] = [{'group': g, 'type': t, 'n': n} for (g, t), n in sorted(tally.items(), key=lambda kv: -kv[1])]
    os.makedirs(LOCDIR, exist_ok=True)
    mp = country_map(iso, p['name'], L)
    if mp is None:
        print('no map for', p['name'])
    json.dump(mp or {}, open(os.path.join(LOCDIR, iso + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    p['examples'].sort(key=lambda x: (x['year'], x['id']))

doc = {
    '_note': 'Country profiles for the GAIN dashboard. Examples: GAIN Survey 2021-2025. Population: UNHCR Refugee Data Finder '
             '(api.unhcr.org), end of each year; IDPs also from IDMC through the same API. Locations: UNHCR, gis.unhcr.org '
             '(wrl_prp_p_unhcr_PoC, active locations only, no population figures). Built by tools/country_profiles.py.',
    'built': time.strftime('%Y-%m-%d'),
    'location_groups': list(POPT.values()),
    'location_types': list(dict.fromkeys(LOCSUB.values())),
    'countries': dict(sorted(out.items(), key=lambda kv: kv[1]['name'])),
}
json.dump(doc, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
n_ex = sum(len(p['examples']) for p in out.values())
print('%d countries, %d examples, %d locations -> %s (%d kB)' % (len(out), n_ex, sum(sum(x['n'] for x in p['places']) for p in out.values()),
                                                                os.path.relpath(OUT, ROOT), os.path.getsize(OUT) // 1024))
