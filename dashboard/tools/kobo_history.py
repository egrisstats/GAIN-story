"""One-off: daily submission counts of the past GAIN rounds on UNHCR Kobo, for the tracker's trend chart.

Reads only each submission's arrival time and validation status (Kobo's `fields` filter), never any
answer, and writes day-by-day counts to dashboard/data/gain_history.json, which is committed: past rounds
are closed, so this runs once.

    KOBO_TOKEN=... python3 dashboard/tools/kobo_history.py
"""
import collections, datetime as dt, importlib.util, json, os, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("k", os.path.join(HERE, "kobo_to_csv.py"))
k = importlib.util.module_from_spec(spec); spec.loader.exec_module(k)

SERVER = "https://kobo.unhcr.org"
ROUNDS = {"2025": "aNzHzCwxT4gtJtKjZmMRPs", "2024": "aM4nRMvG7vdz9xVhAbBdHL", "2023": "aQEWgmxf3VndN3v2vT7Gbu"}
SKIP = {"validation_status_not_approved"}

out = {"_note": "Daily counts of submissions to the GAIN 2023-2025 Kobo forms (arrival time only, UTC). "
                "No answers are read. Built by tools/kobo_history.py.", "rounds": {}}
for year, uid in ROUNDS.items():
    q = urllib.parse.urlencode({"format": "json", "limit": 1000,
                                "fields": json.dumps(["_submission_time", "_validation_status"])})
    url, times, skipped = f"{SERVER}/api/v2/assets/{uid}/data/?{q}", [], 0
    while url:
        page = k.get(url)
        for s in page["results"]:
            if (s.get("_validation_status") or {}).get("uid") in SKIP: skipped += 1; continue
            times.append(s["_submission_time"][:10])
        url = page.get("next")
    days = collections.Counter(times)
    first, last = min(days), max(days)
    print(f"{year}: {len(times)} submissions ({skipped} not approved, left out), {first} to {last}")
    top = days.most_common(5)
    print("   busiest days:", ", ".join(f"{d} ({n})" for d, n in top))
    out["rounds"][year] = {"first": first, "last": last, "total": len(times),
                           "daily": dict(sorted(days.items()))}

path = os.path.join(HERE, "..", "data", "gain_history.json")
with open(path, "w") as f: json.dump(out, f, indent=1)
print("written", os.path.normpath(path))
