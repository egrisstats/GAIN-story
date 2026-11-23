"""One-off: who reported an example in GAIN 2023-2025, for the tracker's "Back from earlier rounds" view.

Reads pipeline/data/gain_examples.csv (already public) and writes dashboard/data/gain_past.json:
countries with a country-led example and organisations with an institution-led one, with the years.

    python3 dashboard/tools/past_respondents.py
"""
import collections, csv, json, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
YEARS = ("2023", "2024", "2025")
SAME = {"Turkiye": "Türkiye"}  # one spelling per country
countries, orgs = collections.defaultdict(set), collections.defaultdict(set)
for r in csv.DictReader(open(REPO / "pipeline" / "data" / "gain_examples.csv", encoding="utf-8")):
    if r["gain_year"] not in YEARS:
        continue
    if r["lead"] == "country" and r["country"].strip():
        countries[SAME.get(r["country"].strip(), r["country"].strip())].add(r["gain_year"])
    elif r["lead"] == "institution" and r["organisation"].strip():
        orgs[r["organisation"].strip()].add(r["gain_year"])
out = {"_note": "Who reported an example in GAIN 2023-2025. Built by tools/past_respondents.py from pipeline/data/gain_examples.csv.",
       "countries": {k: sorted(v) for k, v in sorted(countries.items())},
       "orgs": {k: sorted(v) for k, v in sorted(orgs.items())}}
path = REPO / "dashboard" / "data" / "gain_past.json"
path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("written", path, len(out["countries"]), "countries,", len(out["orgs"]), "organisations")
