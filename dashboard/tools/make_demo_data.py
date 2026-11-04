"""Build a DEMO submissions file for the GAIN 2026 tracker.

Simulated data only: it re-uses countries, organisations and answers from the GAIN 2024 and
2025 roster (assets/327ec…json + assets/6794…json) and spreads them over the 2026 collection
window (3–22 November 2026). Titles carry a "[demo]" prefix so nobody mistakes a row for a
real 2026 submission.

    python3 dashboard/tools/make_demo_data.py

Writes dashboard/data/gain2026_DEMO.csv in the same columns the live export must use
(see dashboard/README.md).
"""
import csv, json, random, datetime as dt, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
roster = json.load(open(ROOT / "assets/327ec8f9d9b25a43bb01173c45375b10.json"))
coded = json.load(open(ROOT / "assets/6794b02ec5b52640a5ed6e238c4bd0bf.json"))
# mixed-use examples, 0 all three, 1 IRRS+IRIS, 2 IRRS+IROSS, 3 IRIS+IROSS (as in Main.dc.html)
MIX = {"0":1,"1":0,"7":1,"10":1,"13":1,"14":0,"15":2,"19":0,"21":0,"24":0,"25":1,"29":0,"30":0,"32":0,"35":2,"37":0,"39":1,"40":0,"45":1,"47":1,"50":1,"53":1,"57":1,"58":0,"66":0,"84":3,"95":1,"120":0,"122":1,"123":0,"124":2,"125":0,"132":1,"139":0,"145":0,"148":0,"150":1,"151":0,"154":0,"157":1,"170":0,"171":0,"172":0,"180":0,"199":1,"201":1,"204":0,"206":0,"209":0,"210":2,"216":1,"219":1,"221":2,"222":1,"225":1,"229":0,"232":0,"239":1,"246":0,"249":0,"251":1,"256":0,"262":1,"264":0,"265":1,"266":1,"269":0,"271":1,"284":1,"289":0,"291":1,"293":1,"294":2,"295":0,"305":0,"307":0,"313":0,"317":1,"318":2,"326":0,"343":1,"344":1,"345":1,"357":1,"358":1,"359":1,"360":1,"371":1,"372":1,"376":1,"377":0,"394":1,"395":1,"396":1,"398":1,"399":1,"400":1,"404":1,"407":1}
MIXN = ["IRRS;IRIS;IROSS", "IRRS;IRIS", "IRRS;IROSS", "IRIS;IROSS"]
FW = ["IRRS", "IRIS", "IROSS"]
SN = ["Survey", "Administrative data", "Census", "Data integration", "Non-traditional data", "Tool or other"]

random.seed(2026)
pool = [i for i, r in enumerate(roster) if r[0] >= 2024]
random.shuffle(pool)
pool = pool[:132]

# group examples into responses: one response per organisation (as in the GAIN questionnaire)
by_org = {}
for i in pool:
    by_org.setdefault((roster[i][3], roster[i][4]), []).append(i)
responses = list(by_org.items())
random.shuffle(responses)

# collection window and the campaign pushes that bring responses in
start = dt.datetime(2026, 11, 3, 8, 0)
days = [start.date() + dt.timedelta(d) for d in range(20)]  # 3–22 Nov
weight = {3: 9, 4: 6, 5: 4, 6: 3, 7: 1, 8: 1, 9: 3, 10: 3, 11: 6, 12: 4, 13: 3, 14: 1, 15: 1,
          16: 6, 17: 5, 18: 5, 19: 8, 20: 10, 21: 4, 22: 9}

rows = []
for n, ((country, org), ids) in enumerate(responses):
    day = random.choices(days, [weight[d.day] for d in days])[0]
    if day.weekday() >= 5 and random.random() < 0.6:
        day = day + dt.timedelta(days=7 - day.weekday()) if day.day < 21 else day
    t = dt.datetime.combine(day, dt.time(random.randint(6, 19), random.randint(0, 59)))
    rid = f"R26-{n + 1:03d}"
    for i in ids:
        r, c = roster[i], coded[i]
        if not c[0]:
            rec = "Don't know" if r[2] == 4 else "Not used"
        elif str(i) in MIX:
            rec = MIXN[MIX[str(i)]]
        elif r[2] in (0, 1, 2):
            rec = FW[r[2]]
        else:
            rec = "Used, undetermined"
        src = ";".join(SN[s] for s in c[2]) or (r[6] or "")
        rows.append({
            "response_id": rid,
            "submitted_at": t.strftime("%Y-%m-%dT%H:%M:00Z"),
            "country": country,
            "organisation": org,
            "lead": "Country-led" if r[1] == 0 else "Institution-led",
            "title": "[demo] " + r[5],
            "recommendations": rec,
            "data_source": src,
            "population_groups": ";".join(p for p in (r[7] or "").split(" · ") if p),
        })

rows.sort(key=lambda x: (x["submitted_at"], x["response_id"]))
out = ROOT / "dashboard/data/gain2026_DEMO.csv"
out.parent.mkdir(parents=True, exist_ok=True)
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)
print(f"{len(rows)} demo examples in {len({r['response_id'] for r in rows})} responses -> {out.relative_to(ROOT)}")
