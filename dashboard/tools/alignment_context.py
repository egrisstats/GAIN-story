"""Add comparison context to the alignment review queue.

    python3 dashboard/tools/alignment_context.py <queue.json> [research.json] [documents.json] <out.json>

For each example in the queue (built by alignment_queue.py, kept outside the repo) this adds:
  region   one of the five GAIN story regions
  kind     the kind of source, from the 2026 answer or, for past rounds, from the title
  peers    similar examples and how they were answered: same organisation, same country,
           same region and source, same source; from GAIN 2021 to 2025 (pipeline/data/gain_examples.csv)
           and the other GAIN 2026 examples (dashboard/data/gain2026.csv). Titles and answers only.
           Past rounds come from the GAIN story data (assets/327ec8f9…json), which names the
           recommendation each example used (IRRS, IRIS, IROSS, mixed, or not named).
  history  per example: the organisation's earlier examples, and counts by recommendation for its
           country and for its region and source
  web      what public web pages say (optional research.json), and, from documents.json, what the
           documents behind it say when read: a summary, a signal, and per document the groups,
           identification, statistics, recommendation mentions and the checklist items it shows
  web      what public web pages say about the example (optional research.json, keyed like the queue)
Reads only public files in the repo; refuses to write inside the repo.
"""
import csv, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]

REGION = {}
for reg, names in {
    "Africa": "Angola;Burkina Faso;Burundi;Cameroon;Central African Republic;Chad;Côte d'Ivoire;Democratic Republic of the Congo;Djibouti;"
              "Equatorial Guinea;Ethiopia;Ghana;Kenya;Liberia;Libya;Malawi;Mali;Mauritania;Morocco;Mozambique;Nigeria;Republic of the Congo;"
              "Rwanda;Somalia;South Africa;South Sudan;Sudan;Uganda;Zambia;Zimbabwe;Egypt",
    "Europe": "Armenia;Azerbaijan;Belarus;Belgium;Estonia;Finland;France;Georgia;Germany;Greece;Hungary;Italy;Kosovo*;Latvia;Liechtenstein;"
              "Netherlands;Norway;Poland;Republic of Moldova;Slovenia;Spain;Sweden;Switzerland;Ukraine;United Kingdom;Serbia;Türkiye;Turkiye",
    "Americas": "Belize;Canada;Chile;Colombia;Ecuador;El Salvador;Guatemala;Haiti;Honduras;Mexico;Panama;Peru;United States of America;Brazil;Costa Rica",
    "Asia and Oceania": "Afghanistan;Bangladesh;Cambodia;Indonesia;Kazakhstan;Kyrgyzstan;Laos;Malaysia;Marshall Islands;Myanmar;Pakistan;"
                        "Philippines;Sri Lanka;Thailand;Timor-Leste;Turkmenistan",
    "Middle East": "Iraq;Jordan;Lebanon;State of Palestine;Syrian Arab Republic;Yemen",
}.items():
    for n in names.split(";"):
        REGION[n] = reg


def region(country):
    return REGION.get(country or "", "Regional / global" if not country else "Other")


KIND_WORDS = [  # first match wins; used for past rounds, which have no source answer
    ("training", r"train|course|workshop|e-learning|webinar|capacity"),
    ("census", r"census|censo"),
    ("survey", r"survey|encuesta|assessment|enquête|mics|dhs|lfs|labou?r force"),
    ("admin", r"regist|administrative|records?\b|database|permit|asylum statistics|registro"),
    ("integ", r"integrat|linkage|linking|integración"),
    ("strategy", r"strategy|plan\b|roadmap|policy|nsds"),
    ("guidance", r"guid|manual|handbook|methodolog|toolkit|recommendation"),
]
SOURCE_KIND = {"Administrative data": "admin", "Survey": "survey", "Census": "census", "Data integration": "integ",
               "Workshop/training": "training", "Training": "training", "Strategy": "strategy", "Guidance": "guidance"}
KIND_NAME = {"admin": "Administrative data", "survey": "Survey", "census": "Census", "integ": "Data integration",
             "training": "Training or event", "strategy": "Strategy or plan", "guidance": "Guidance", "other": "Other"}


def kind_of(title, source=""):
    for s in (source or "").split(";"):
        if s.strip() in SOURCE_KIND:
            return SOURCE_KIND[s.strip()]
    t = (title or "").lower()
    for k, rx in KIND_WORDS:
        if re.search(rx, t):
            return k
    return "other"


def okeys(org):
    """the organisation's name without brackets, plus any acronym in brackets (DANE, FSO, INEI)"""
    o = (org or "").lower()
    keys = {re.sub(r"[^a-z]+", " ", re.sub(r"\(.*?\)", "", o)).strip()}
    keys |= {a.strip() for a in re.findall(r"\(([a-z]{2,10})\)", o)}
    return {k for k in keys if k}


def main():
    args = sys.argv[1:]
    if len(args) not in (2, 3, 4):
        sys.exit(__doc__)
    qpath, out = pathlib.Path(args[0]), pathlib.Path(args[-1]).resolve()
    if ROOT in out.parents:
        sys.exit("Write the enriched queue outside the repo: it holds respondent descriptions.")
    research = json.loads(pathlib.Path(args[1]).read_text())["items"] if len(args) >= 3 else {}
    docs_file = json.loads(pathlib.Path(args[2]).read_text()) if len(args) == 4 else {}
    docs = docs_file.get("items", {})
    q = json.loads(qpath.read_text())

    # the GAIN story data: [year, institution-led, framework, country, organisation, title, ., ., note] and a parallel
    # list whose first value says whether the example uses the recommendations
    ex = json.load(open(ROOT / "assets/327ec8f9d9b25a43bb01173c45375b10.json", encoding="utf-8"))
    ch = json.load(open(ROOT / "assets/6794b02ec5b52640a5ed6e238c4bd0bf.json", encoding="utf-8"))
    FW = ["IRRS", "IRIS", "IROSS", "Mixed", "Not named"]
    past = [{"year": str(e[0]), "country": e[3] or "", "org": e[4] or "", "title": e[5] or "", "kind": kind_of((e[5] or "") + " " + (e[8] or "")),
             "used": bool(c[0]), "recs": FW[e[2]] if c[0] and e[2] is not None and e[2] < len(FW) else ""}
            for e, c in zip(ex, ch)]
    now = [{"year": "2026", "country": r["country"], "org": r["organisation"], "title": r["title"], "rid": r["response_id"],
            "kind": kind_of(r["title"], r["data_source"]), "used": bool(re.search(r"IRRS|IRIS|IROSS", r["recommendations"])),
            "recs": ";".join(x for x in ("IRRS", "IRIS", "IROSS") if x in r["recommendations"])}
           for r in csv.DictReader(open(ROOT / "dashboard/data/gain2026.csv", encoding="utf-8")) if r["kind"] == "example"]
    inq = {(e["response_id"], e["title_start"][:40]): e["key"] for e in q["queue"]}

    for e in q["queue"]:
        e["region"] = region(e.get("country"))
        e["kind"] = kind_of(e["title"], e.get("source", ""))
        e["kind_name"] = KIND_NAME[e["kind"]]
        ok = okeys(e["organisation"])
        peers = []
        for p in past + now:
            if p.get("rid") == e["response_id"] and p["title"][:40] == e["title"][:40]:
                continue  # itself
            tags = []
            if ok & okeys(p["org"]):
                tags.append("org")
            if e.get("country") and p["country"] == e["country"]:
                tags.append("country")
            if region(p["country"]) == e["region"] and p["kind"] == e["kind"]:
                tags.append("region_source")
            if p["kind"] == e["kind"]:
                tags.append("source")
            if not tags or tags == ["source"] and len([x for x in peers if "source" in x["tags"]]) >= 40:
                continue
            row = {"year": p["year"], "country": p["country"] or "Regional or global", "org": p["org"], "title": p["title"][:140],
                   "kind": KIND_NAME[p["kind"]], "used": p["used"], "recs": p["recs"], "tags": tags}
            if p.get("rid"):
                k = inq.get((p["rid"], p["title"][:40]))
                if k:
                    row["qkey"] = k
            peers.append(row)
        peers.sort(key=lambda r: (-len(r["tags"]), -int(r["year"])))
        e["peers"] = peers[:80]
        def by_rec(rows):
            out_ = {}
            for p in rows:
                k = p["recs"] if p["used"] and p["recs"] else ("Used, not named" if p["used"] else "No or don’t know")
                for part in str(k).split(";"):
                    out_[part] = out_.get(part, 0) + 1
            return {"examples": len(rows), "used": sum(1 for p in rows if p["used"]), "by_rec": out_}
        mine = [p for p in peers if "org" in p["tags"]]
        e["history"] = {"org": [{"year": p["year"], "title": p["title"], "recs": p["recs"] if p["used"] else "", "used": p["used"]} for p in sorted(mine, key=lambda p: p["year"])],
                        "country": by_rec([p for p in peers if "country" in p["tags"]]),
                        "region_source": by_rec([p for p in peers if "region_source" in p["tags"]])}
        if e["key"] in research:
            e["web"] = research[e["key"]]
        if e["key"] in docs:
            d = docs[e["key"]]
            e.setdefault("web", {})
            e["web"]["docs"] = {"summary": d.get("summary", []), "signal": d.get("signal"), "reason": d.get("signal_reason", ""),
                                "documents": d.get("documents", []), "read_on": docs_file.get("read_on")}
    q["meta"]["context"] = {"past_examples": len(past), "examples_2026": len(now), "web_searched_on": (json.loads(pathlib.Path(args[1]).read_text()).get("searched_on") if research else None)}
    out.write_text(json.dumps(q, ensure_ascii=False))
    print(len(q["queue"]), "examples enriched ->", out)


if __name__ == "__main__":
    main()
