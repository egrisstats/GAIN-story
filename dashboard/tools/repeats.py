"""Flags GAIN 2026 examples that look like an example already reported, either in GAIN 2023-2025
(pipeline/data/gain_examples.csv, the analysis-ready roster) or by another 2026 response.

A match needs the same country (or, for examples with no country, the same organisation) and titles
that share most of their distinctive words. Words are weighted by how rare they are across all past
titles, so shared generic words ("census", "survey", "report", "press release") count for little.
These are hints for a person to check, not decisions: a recurring training or an annual release
can rightly be reported again.
"""
import csv, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
PAST = os.path.join(HERE, "..", "..", "pipeline", "data", "gain_examples.csv")
STOP = set("""the of and for in on to a an de la le les des du et en el los las y with by from at as its into is was
are be this that their our new first planned ongoing has have was were more than
press release report publication published annual data statistic survey national office""".split())
YEAR = re.compile(r"(?<!\d)(19|20)\d\d(?!\d)")
PAST_MIN, NOW_MIN = 0.65, 0.75   # weighted share of the shorter title's words found in the other


def words(t, place=""):
    t = re.sub(r"[^a-z0-9à-ÿ]+", " ", (t or "").lower().replace("+", " "))
    t = re.sub(r"(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])", " ", t)   # IOF2025 -> iof 2025
    drop = STOP | set(re.sub(r"[^a-z ]", " ", (place or "").lower()).split())   # the country's own name says nothing
    ws = {w[:-1] if w.endswith("s") and len(w) > 4 else w for w in t.split() if len(w) > 2 and w not in drop}
    return {w for w in ws if w not in drop and not YEAR.fullmatch(w)}


def years(t):
    return {int(m.group(0)) for m in YEAR.finditer((t or "").replace("+", " "))}


def other_edition(t1, t2):
    """both titles name years, and none is within a year of the other: another round, not the same example"""
    y1, y2 = years(t1), years(t2)
    return bool(y1 and y2) and all(abs(a - b) > 1 for a in y1 for b in y2)


def key(s):
    return re.sub(r"[^a-z]", "", (s or "").lower())


class Matcher:
    def __init__(self, path=PAST):
        self.past = []
        if os.path.exists(path):
            with open(path, newline="", encoding="utf-8") as f:
                for r in csv.DictReader(f):
                    self.past.append({"id": r["ex_id"], "year": r.get("gain_year", ""), "country": key(r["country"]),
                                      "org": key(r["organisation"])[:14], "title": r["title"], "w": words(r["title"], r["country"])})
        n = max(1, len(self.past))
        df = {}
        for p in self.past:
            for w in p["w"]: df[w] = df.get(w, 0) + 1
        self.idf = lambda w: math.log((n + 1) / (df.get(w, 0) + 1)) + 0.3

    def sim(self, a, b):
        if not a or not b or len(a & b) < 2: return 0.0
        small, big = (a, b) if sum(map(self.idf, a)) <= sum(map(self.idf, b)) else (b, a)
        tot = sum(self.idf(w) for w in small)
        return sum(self.idf(w) for w in small if w in big) / tot if tot else 0.0

    @staticmethod
    def same_place(c1, o1, c2, o2):
        return (c1 and c1 == c2) or (not c1 and not c2 and o1 and o1 == o2)

    def tag(self, rows):
        """rows: dicts with response_id, country, organisation, title, kind. Adds 'reported_before' and
        'possible_duplicate' (text, empty when nothing found)."""
        ex = [r for r in rows if r.get("kind") == "example"]
        for r in ex:
            r["_w"], r["_c"], r["_o"] = words(r["title"], r["country"]), key(r["country"]), key(r["organisation"])[:14]
            hits = sorted(((self.sim(r["_w"], p["w"]), p) for p in self.past
                           if self.same_place(r["_c"], r["_o"], p["country"], p["org"]) and not other_edition(r["title"], p["title"])),
                          key=lambda x: -x[0])
            hits = [(s, p) for s, p in hits if s >= PAST_MIN][:2]
            r["reported_before"] = " | ".join(f"GAIN {p['year']}: {p['title'][:110]}" for s, p in hits)
        for i, a in enumerate(ex):
            dup = []
            for j, b in enumerate(ex):
                if i == j or a["response_id"] == b["response_id"]: continue  # one response listing several products is fine
                if self.same_place(a["_c"], a["_o"], b["_c"], b["_o"]) and self.sim(a["_w"], b["_w"]) >= NOW_MIN \
                        and not other_edition(a["title"], b["title"]):
                    dup.append(f"{b['response_id']}: {b['title'][:110]}")
            a["possible_duplicate"] = " | ".join(dup[:2])
        for r in rows:
            for k in ("_w", "_c", "_o"): r.pop(k, None)
            r.setdefault("reported_before", ""); r.setdefault("possible_duplicate", "")
        return rows


if __name__ == "__main__":  # python3 repeats.py some_gain2026.csv  -> prints what would be flagged
    import sys
    rows = list(csv.DictReader(open(sys.argv[1], newline="", encoding="utf-8")))
    m = Matcher()
    for r in m.tag(rows):
        if r["reported_before"] or r["possible_duplicate"]:
            print(f"- {r['country'] or r['organisation']}: {r['title'][:90]}")
            if r["reported_before"]: print("    before: " + r["reported_before"])
            if r["possible_duplicate"]: print("    2026:   " + r["possible_duplicate"])
    # near misses, to calibrate
    if "-v" in sys.argv:
        print("\nnear misses:")
        for r in [x for x in rows if x["kind"] == "example"]:
            w = words(r["title"], r["country"])
            for p in m.past:
                if m.same_place(key(r["country"]), key(r["organisation"])[:14], p["country"], p["org"]):
                    s = m.sim(w, p["w"])
                    if 0.4 <= s < PAST_MIN: print(f"  {s:.2f} {r['title'][:60]}  ~  {p['year']} {p['title'][:60]}")
