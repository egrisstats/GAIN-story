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


# ---------- where IDPs live, from IOM DTM and camp-management site lists (HDX) ----------
# For a few countries the card adds a layer on top of UNHCR's points:
#   'areas': the country's administrative areas (OCHA common boundaries) shaded by the IDPs counted there, when the
#            published site lists carry area codes but no coordinates (Nigeria, Ethiopia, Mali, Ukraine, DR Congo);
#   'sites': one dot per IDP site, sized by its population, when they carry coordinates (Somalia).
# The files are Excel, so this needs openpyxl; without it the cards simply have no layer.
def hdx_res(pkg, k=0, key=None):
    """the k-th resource of an HDX dataset: (name, local file)"""
    r = get('https://data.humdata.org/api/3/action/package_show?id=' + pkg, 'hdx_' + (key or pkg))['result']['resources'][k]
    d = os.path.join(CACHE, 'layers'); os.makedirs(d, exist_ok=True)
    f = os.path.join(d, (key or pkg) + '.' + r['format'].lower())
    if REFRESH or not os.path.exists(f):
        subprocess.run(['curl', '-sfL', '-m', '600', '-o', f, r['url']], check=True)
    return r['name'], f
def cod_ab(iso3, level):
    """OCHA common operational boundaries (HDX cod-ab-xxx), one admin level as GeoJSON"""
    import zipfile
    name, f = hdx_res('cod-ab-' + iso3.lower(), [i for i, r in enumerate(get('https://data.humdata.org/api/3/action/package_show?id=cod-ab-' + iso3.lower(), 'hdx_cod_' + iso3)['result']['resources']) if 'geojson' in (r['format'] + r['name']).lower()][0], 'cod_' + iso3)
    z = zipfile.ZipFile(f)
    return json.load(z.open([n for n in z.namelist() if n.endswith('_admin%d.geojson' % level)][0]))
def sheet_rows(f, sheet=0, hi=0):
    import openpyxl
    ws = openpyxl.load_workbook(f, read_only=True)
    ws = ws[sheet] if isinstance(sheet, str) else ws.worksheets[sheet]
    rows = list(ws.iter_rows(values_only=True))
    return [str(c or '').strip() for c in rows[hi]], rows[hi + 1:]
def num_(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0

def layer_nga():
    by, rounds = {}, []
    for k, pkg in enumerate(['nigeria-site-assessment-data', 'nigeria-displacement-data-north-central-west-site-assessment-iom-dtm']):
        name, f = hdx_res(pkg); rounds.append(name)
        h, rows = sheet_rows(f)
        col = lambda pre: [i for i, x in enumerate(h) if x.startswith(pre)][0]
        pi, ni, li = col('1.1.b.3 Population Type'), col('Number of Individuals'), col('LGA Pcode')
        for r in rows:
            pc, pt = str(r[li] or ''), str(r[pi] or '')
            if not pc.startswith('NGA') or not pt.startswith('IDPs'):
                continue
            a = by.setdefault('NG' + pc[3:], {'idp': 0, 'camp': 0, 'camps': 0})
            a['idp'] += num_(r[ni])
            if pt == 'IDPs in Camps':
                a['camp'] += num_(r[ni]); a['camps'] += 1
    return {'kind': 'areas', 'level': 2, 'by': by, 'camp': True, 'parent': 'state', 'unit': 'local government area',
            'who': 'IOM’s Displacement Tracking Matrix (DTM)', 'src': 'IOM DTM site assessments (' + '; '.join(rounds) + ')',
            'cover': 'DTM covers the north of the country, so this is not a national total.'}

def layer_eth():
    name, f = hdx_res('ethiopia-baseline-assessment-data-iom-dtm')
    h, rows = sheet_rows(f)
    wi = h.index('OCHA Woreda P-Code'); ti = [i for i, x in enumerate(h) if x.startswith('1.3.b.1: Settlement/site type')][0]
    ni = [i for i, x in enumerate(h) if x.startswith('2.1.b.7')][0]
    by = {}
    for r in rows:
        pc = str(r[wi] or '')
        if not pc.startswith('ET'):
            continue
        a = by.setdefault(pc, {'idp': 0, 'camp': 0, 'camps': 0}); n = num_(r[ni]); a['idp'] += n
        if re.search(r'camp|collective', str(r[ti] or ''), re.I):
            a['camp'] += n; a['camps'] += 1
    return {'kind': 'areas', 'level': 3, 'by': by, 'camp': True, 'campWord': 'camps and collective centres', 'parent': 'region', 'unit': 'woreda',
            'who': 'IOM’s Displacement Tracking Matrix (DTM)', 'src': 'IOM DTM, ' + name,
            'cover': 'The site assessment covers the sites DTM visited, not every IDP in the country.'}

def layer_mli():
    name, f = hdx_res('mali-baseline-assessment-data-iom-dtm')
    h, rows = sheet_rows(f, 'PDIs')
    ci, ti = h.index('Cercle PCODE'), h.index('Grand Total')
    by = {}
    for r in rows:
        pc = str(r[ci] or '')
        if pc.startswith('ML'):
            by.setdefault(pc, {'idp': 0, 'camp': 0, 'camps': 0})['idp'] += num_(r[ti])
    return {'kind': 'areas', 'level': 2, 'by': by, 'camp': False, 'parent': 'region', 'unit': 'cercle',
            'who': 'IOM’s Displacement Tracking Matrix (DTM)', 'src': 'IOM DTM, ' + name, 'cover': ''}

def layer_ukr():
    name, f = hdx_res('ukraine-idp-estimates')
    h, rows = sheet_rows(f)
    ci, ni = h.index('admin1Pcode'), h.index('idp_stock_rounded')
    by = {}
    for r in rows:
        pc = str(r[ci] or '')
        if pc.startswith('UA'):
            by.setdefault(pc, {'idp': 0, 'camp': 0, 'camps': 0})['idp'] += num_(r[ni])
    return {'kind': 'areas', 'level': 1, 'by': by, 'camp': False, 'parent': 'oblast', 'unit': 'oblast',
            'who': 'IOM’s Displacement Tracking Matrix (DTM)', 'src': 'IOM DTM, ' + name + ' (estimates by oblast where IDPs live now)', 'cover': ''}

def layer_cod():
    name, f = hdx_res('drc-displacement-deplace-site-assessment-ocha')
    h, rows = sheet_rows(f, 'Data')
    ci, ni, hi = h.index('admin2_id'), h.index('person'), h.index('hebergement_label')
    by = {}
    for r in rows:
        pc = str(r[ci] or '')
        if not pc.startswith('CD'):
            continue
        a = by.setdefault(pc, {'idp': 0, 'camp': 0, 'camps': 0}); n = num_(r[ni]); a['idp'] += n
        if re.search(r'site|camp|centre collectif', str(r[hi] or ''), re.I):
            a['camp'] += n; a['camps'] += 1
    return {'kind': 'areas', 'level': 2, 'by': by, 'camp': True, 'campWord': 'sites and collective centres', 'campCount': 'movements', 'parent': 'province', 'unit': 'territory',
            'who': 'OCHA and partners (population movement tracking)', 'src': 'OCHA DR Congo, people displaced and still displaced' + (lambda m_: ', ' + m_.group(1).replace('juin', 'June').replace('mai', 'May').replace('avril', 'April').replace('mars', 'March') + ' ' + m_.group(2) if m_ else '')(re.search(r'([a-zéû]+)_(20\d\d)', name)), 'cover': 'Counts of people displaced and still displaced, as tracked by OCHA and partners.'}

def layer_som():
    name, f = hdx_res('cccm-somalia-idp-site-master-list-q2-2024')
    h, rows = sheet_rows(f, 'CCCM IDP Site List (Verified)', 1)
    la, lo, ri = h.index('Latitude'), h.index('Longitude'), h.index('Region')
    ni = [i for i, x in enumerate(h) if x.startswith('Individual')][0]; si = h.index('IDP Site')
    sites = []
    for r in rows:
        try:
            lat, lon = float(r[la]), float(r[lo])
        except (TypeError, ValueError):
            continue
        sites.append((lon, lat, num_(r[ni]), str(r[si] or ''), str(r[ri] or '')))
    return {'kind': 'sites', 'level': 1, 'sites': sites, 'camp': False, 'parent': 'region', 'unit': 'site',
            'who': 'the CCCM Cluster Somalia (camp coordination and camp management)', 'src': 'CCCM Cluster Somalia, ' + re.sub(r'\.xlsx?$', '', name, flags=re.I),
            'cover': 'Verified IDP sites; people living outside sites, with host families or renting, are not in this list.'}


# Every other country IOM DTM reports on, through HDX's standard "IOM DTM data for admin levels 0-2" files
# (one per country, one row per area, operation and round). For each operation (variants such as "(Overview)" and
# "(Monthly)" count as one) the latest round is used, at the finest admin level it reports.
WORDS = {'SDN': ('state', 'locality'), 'SSD': ('state', 'county'), 'YEM': ('governorate', 'district'), 'AFG': ('province', 'district'),
         'SYR': ('governorate', 'district'), 'IRQ': ('governorate', 'district'), 'CMR': ('region', 'department'), 'TCD': ('province', 'department'),
         'HTI': ('department', 'commune'), 'MOZ': ('province', 'district'), 'CAF': ('prefecture', 'sub-prefecture'), 'BFA': ('region', 'province'),
         'LBY': ('region', 'municipality'), 'PAK': ('province', 'district'), 'BDI': ('province', 'commune'), 'DJI': ('region', 'district'),
         'KEN': ('county', 'sub-county'), 'UGA': ('region', 'district'), 'ZWE': ('province', 'district'), 'ZMB': ('province', 'district'),
         'PHL': ('region', 'province'), 'IDN': ('province', 'regency'), 'BGD': ('division', 'district'), 'LBN': ('governorate', 'district'),
         'GTM': ('department', 'municipality'), 'HND': ('department', 'municipality'), 'SLV': ('department', 'municipality'),
         'ECU': ('province', 'canton'), 'PER': ('region', 'province'), 'LKA': ('province', 'district'), 'LAO': ('province', 'district'),
         'ARM': ('province', 'community'), 'ZAF': ('province', 'district')}
def layer_dtm_api(iso3):
    import csv
    name, f = hdx_res(iso3.lower() + '-iom-dtm-from-api', 0, 'dtmapi_' + iso3)
    rows = list(csv.DictReader(open(f, encoding='utf-8-sig')))
    base = lambda op: re.sub(r'\s*\(.*?\)\s*$', '', op or '').strip()
    latest = {}
    for r in rows:
        if r.get('operationStatus') not in ('Active', '') or not r.get('reportingDate'):
            continue
        k = (r['operation'], r['reportingDate'][:10], r['adminLevel'])
        latest.setdefault(base(r['operation']), {}).setdefault(k, []).append(r)
    picked, dates = [], []
    for b, sets in latest.items():
        # newest round of this operation; at that date, the finest admin level; among variants, the one covering most areas
        top = max(k[1] for k in sets)
        cands = [k for k in sets if k[1] == top]
        lvl = max(int(k[2] or 0) for k in cands)
        cands = [k for k in cands if int(k[2] or 0) == lvl]
        k = max(cands, key=lambda k: len(set(x['admin%dPcode' % lvl] if lvl else 'all' for x in sets[k])))
        picked.append((lvl, sets[k], k[0], top)); dates.append(top)
    if not picked:
        return None
    newest = max(dates)
    picked = [p_ for p_ in picked if p_[3] >= str(int(newest[:4]) - 2) + newest[4:] and p_[0] >= 1]
    if not picked:
        return None
    lvl = min(p_[0] for p_ in picked)   # one level for the whole map
    # operations can overlap (a national one and a local one): keep the largest, add others only where they cover other areas
    picked.sort(key=lambda p_: -sum(num_(r['numPresentIdpInd']) for r in p_[1]))
    keep, seen_ = [], set()
    for p_ in picked:
        codes = {r['admin%dPcode' % lvl] for r in p_[1] if r['admin%dPcode' % lvl]}
        if not keep or not (codes & seen_):
            keep.append(p_); seen_ |= codes
    picked = keep
    inconsistent = False
    for l_, rs, op, d_ in picked:
        if l_ == 2:
            up = [r for r in rows if r['operation'] == op and r['reportingDate'][:10] == d_ and r['adminLevel'] == '1']
            s1, s2 = sum(num_(r['numPresentIdpInd']) for r in up), sum(num_(r['numPresentIdpInd']) for r in rs)
            if s1 and abs(s2 - s1) > 0.15 * s1:
                inconsistent = True
    by = {}
    for l_, rs, op, d_ in picked:
        for r in rs:
            pc = r['admin%dPcode' % lvl]
            if pc:
                by.setdefault(pc, {'idp': 0, 'camp': 0, 'camps': 0})['idp'] += num_(r['numPresentIdpInd'])
    if sum(a['idp'] for a in by.values()) < 1000:
        return None
    ops = sorted({(op, d_[:7]) for l_, rs, op, d_ in picked}, key=lambda x: x[1], reverse=True)
    month = lambda ym: time.strftime('%B %Y', time.strptime(ym, '%Y-%m'))
    par, unit = WORDS.get(iso3, ('region', 'district'))
    return {'kind': 'areas', 'level': lvl, 'by': by, 'camp': False, 'parent': par, 'unit': unit if lvl == 2 else par,
            'who': 'IOM’s Displacement Tracking Matrix (DTM)',
            'src': 'IOM DTM, ' + '; '.join('%s (%s)' % (op, month(d_)) for op, d_ in ops),
            'cover': 'The latest round of each DTM operation in the country; DTM may not cover every area.', 'inconsistent': inconsistent}

def match_rate(Ly, adm):
    codes = {f['properties']['adm%d_pcode' % Ly['level']] for f in adm['features']}
    tot = sum(a['idp'] for a in Ly['by'].values()) or 1
    return sum(a['idp'] for k, a in Ly['by'].items() if k in codes) / tot

LAYERS = {}
try:
    import openpyxl  # noqa: F401
    for iso_, fn in [('NGA', layer_nga), ('ETH', layer_eth), ('MLI', layer_mli), ('UKR', layer_ukr), ('COD', layer_cod), ('SOM', layer_som)]:
        try:
            L_ = fn()
            L_['adm'] = cod_ab(iso_, L_['level']) if L_['kind'] == 'areas' else None
            L_['adm1'] = cod_ab(iso_, 1)
            LAYERS[iso_] = L_
        except Exception as e:  # one country failing should not stop the rest
            print('no IDP layer for', iso_, '-', e)
    # the standard DTM files, for the GAIN countries without a layer above
    gain_iso = {iso_of(e[3]) for e in ex if e[3]}
    for iso_ in sorted(gain_iso - set(LAYERS)):
        if not iso_:
            continue
        miss_f = os.path.join(CACHE, 'dtm_missing.json')
        missing = json.load(open(miss_f)) if os.path.exists(miss_f) and not REFRESH else []
        if iso_ in missing:
            continue   # no DTM file for this country (remembered, so later runs do not ask again)
        try:
            get('https://data.humdata.org/api/3/action/package_show?id=' + iso_.lower() + '-iom-dtm-from-api', 'hdx_' + iso_.lower() + '-iom-dtm-from-api')
        except Exception:
            json.dump(sorted(set(missing + [iso_])), open(miss_f, 'w'))
            continue
        try:
            L_ = layer_dtm_api(iso_)
            if not L_:
                print('DTM', iso_, ': no recent sub-national figures'); continue
            # sanity: no more than 1.6 times what UNHCR and IDMC report (screens out duplicated files and short disaster evacuations)
            tot_ = sum(a['idp'] for a in L_['by'].values())
            ref_ = max([v.get('idps', 0) for y, v in sorted(popby.get(iso_, {}).items())][-1:] + [v for y, v in sorted(idmcby.get(iso_, {}).items())][-1:] + [0])
            if not ref_ or tot_ > 1.6 * ref_:
                print('DTM', iso_, ': %s IDPs against %s from UNHCR/IDMC, left out' % (format(tot_, ','), format(ref_, ','))); continue
            if L_.get('inconsistent'):
                print('DTM', iso_, ': area figures do not add up to the province figures, left out'); continue
            L_['adm'] = cod_ab(iso_, L_['level'])
            r_ = match_rate(L_, L_['adm'])
            if r_ < 0.8:
                print('DTM', iso_, ': area codes match only %d%%, left out' % (r_ * 100)); continue
            L_['adm1'] = cod_ab(iso_, 1)
            LAYERS[iso_] = L_
            print('DTM', iso_, ': %s IDPs, level %d, codes match %d%%' % (format(sum(a['idp'] for a in L_['by'].values()), ','), L_['level'], r_ * 100))
        except Exception as e:
            print('DTM', iso_, ': failed -', str(e)[:120])
except ImportError:
    print('openpyxl not installed: country cards without the IDP site layers')

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
    def path(pgs, fine=False):
        # fine: half-pixel precision for outlines that are drawn on top (country, regions); coarser for fills underneath
        d = []
        step, nd = (1.0, 1) if fine else (2, 0)
        for pp in pgs:
            for r in pp:
                q = [P(*v) for v in r]
                bx = [v[0] for v in q]; by = [v[1] for v in q]
                if max(bx) < -50 or min(bx) > W + 50 or max(by) < -50 or min(by) > H + 50:
                    continue
                last = None; seg = []
                for v in q:
                    v = (round(v[0], nd), round(v[1], nd)) if nd else (round(v[0]), round(v[1]))
                    if last is None or abs(v[0] - last[0]) + abs(v[1] - last[1]) >= step:
                        seg.append(v); last = v
                if len(seg) > 2:
                    d.append('M' + 'L'.join('%g %g' % v for v in seg) + 'Z')
        return ''.join(d)
    near = path([pp for nm, g in GEO.items() if g is not pg for pp in g])
    land = path(pg, True) if pg else ''
    # neighbours' names, placed in the middle of their largest landmass when it is in view
    nlab = []
    for nm, g in GEO.items():
        if g is pg or not g:
            continue
        # the part of the neighbour that is in view: label the middle of its visible outline, pulled away from the edge
        vis = [P(*v) for pp in g for v in pp[0]]
        vis = [v for v in vis if 20 < v[0] < W - 20 and 16 < v[1] < H - 10]
        if len(vis) < 12:
            continue
        x_ = sum(v[0] for v in vis) / len(vis); y_ = sum(v[1] for v in vis) / len(vis)
        if any(abs(x_ - a) < 70 and abs(y_ - b) < 16 for a, b, _ in nlab):
            continue
        nlab.append([round(x_), round(y_), nm])
    pts = []
    for a in L:
        x, y = P(a['longitude_d'], a['latitude_d'])
        if 0 <= x <= W and 0 <= y <= H:
            pts.append([round(x), round(y), G.index(POPT[a['pop_type']]), T.index(LOCSUB.get(str(a['loc_subtype']), 'Other')), a['gis_name']])
    res = {'w': W, 'h': H, 'land': land, 'near': near, 'nlab': nlab, 'pts': pts, 'off': len(L) - len(pts)}
    Ly = LAYERS.get(iso)
    if Ly:
        lv = Ly['level']
        if Ly['kind'] == 'areas':
            # [path, pcode, area, parent, IDPs, IDPs in camps, camps]
            res['areas'] = []
            for f in Ly['adm']['features']:
                pr = f['properties']; a = Ly['by'].get(pr['adm%d_pcode' % lv], {})
                res['areas'].append([path(gj_polys(f['geometry'])), pr['adm%d_pcode' % lv], pr['adm%d_name' % lv], pr.get('adm1_name', ''),
                                     a.get('idp', 0), a.get('camp', 0), a.get('camps', 0)])
        else:
            # [x, y, people, name, parent]
            res['sites'] = []
            for lon, lat, n, nm, reg in Ly['sites']:
                x, y = P(lon, lat)
                if 0 <= x <= W and 0 <= y <= H:
                    res['sites'].append([round(x, 1), round(y, 1), n, nm, reg])
        res['states'] = []
        for f in Ly['adm1']['features']:
            pr = f['properties']
            cx, cy = (pr.get('center_lon'), pr.get('center_lat'))
            if cx is None:
                ring_ = max(gj_polys(f['geometry']), key=lambda pp: len(pp[0]))[0]
                cx = sum(v[0] for v in ring_) / len(ring_); cy = sum(v[1] for v in ring_) / len(ring_)
            x, y = P(cx, cy)
            res['states'].append([path(gj_polys(f['geometry']), True), pr['adm1_name'], round(x), round(y)])
        res['layer'] = {k: Ly.get(k, '') for k in ('kind', 'camp', 'campWord', 'campCount', 'parent', 'unit', 'who', 'cover')}
        res['areas_src'] = re.sub(r'\s+', ' ', re.sub(r'\.xlsx?$', '', Ly['src'], flags=re.I)) + ', via HDX. Boundaries: OCHA common operational datasets (HDX).'
    return res

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
    # areas of the IDP layer (regions, districts...) named in the example, outlined on its map
    areas = []
    Ly = LAYERS.get(iso)
    if Ly:
        feats = Ly['adm1']['features'] + (Ly['adm']['features'] if Ly.get('adm') else [])
        for f in feats:
            pr = f['properties']; nm = pr.get('adm%d_name' % Ly['level']) or pr.get('adm1_name')
            if nm and len(nm) > 4 and fold(nm) not in cname and re.search(r'\b' + re.escape(fold(nm)) + r'\b', text) and nm not in areas:
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
