"""Build the alignment review queue: every GAIN 2026 example whose respondent said the recommendations
were not used, or did not know, with what a reviewer needs to walk the decision tree
(alignment/spec/decision_tree.json) and suggested ticks with the reason for each.

    KOBO_TOKEN=... python3 dashboard/tools/alignment_queue.py <out.json>

The output holds respondents' descriptions and partners, so it is written OUTSIDE this public
repository (the script refuses a path inside it) and loaded into the Secretariat's private review
page. Nothing about the person who filled in the form is read: the FOC group stays blocked, and
emails and phone numbers typed into any text are blanked out, as in kobo_to_csv.py.

Suggestions are hints, never decisions: the reviewer confirms every tick.
For a dry run without Kobo, KOBO_FILES=<dir> reads <dir>/asset.json and <dir>/data.json.
"""
import csv, datetime, json, os, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parents[1]          # dashboard/
REPO = HERE.parent
sys.path.insert(0, str(HERE / "tools"))
import kobo_to_csv as K                                        # noqa: E402  (load, find, labels, scrub, anon_id)

SPEC = json.loads((REPO / "alignment" / "spec" / "decision_tree.json").read_text(encoding="utf-8"))
PAST = REPO / "pipeline" / "data" / "gain_examples.csv"

# questions by name, with label starts as a fallback (spec/kobo_fields.md)
Q = {
    "description": (["PRO13"], "please provide a short description of the"),
    "partners": (["PRO18"], "please list partners that were involved"),
    "sources_more": (["PRO08B"], None),
    "source": (["PRO08"], None),
    "population": (["PRO07"], None),
    "phase": (["PRO06"], "in which phase of implementation"),
    "recommendations": (["PRO10", "PRO09"], "which recommendations developed within egriss"),
    "title": (["_PRO02A", "PRO02A"], None),
    "known": (["ACT04", "_ACT04_list"], None),
}
NONE_ANS = re.compile(r"none of these|not used|^no$", re.I)
DK_ANS = re.compile(r"don.?t know|do not know", re.I)
USED = re.compile(r"\b(IRRS|IRIS|IROSS)\b")


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def resolve_names(asset):
    """question name for each key, by name or by the start of its label"""
    survey = asset.get("content", {}).get("survey", [])
    names = {s.get("name") for s in survey}
    out = {}
    for key, (cands, label_start) in Q.items():
        hit = [c for c in cands if c in names]
        if not hit and label_start:
            for s in survey:
                lab = s.get("label", [""])
                lab = strip_html(lab[0] if isinstance(lab, list) and lab else lab).lower()
                if lab.startswith(label_start) and s.get("name"):
                    hit = [s["name"]]; break
        out[key] = hit or cands
    return out


def snippet(text, m, width=45):
    a, b = max(0, m.start() - width), min(len(text), m.end() + width)
    return ("…" if a else "") + text[a:b].strip() + ("…" if b < len(text) else "")


def okey(s):
    s = (s or "").lower()
    m = re.search(r"\(([a-z]{2,12})\)\s*$", s)
    return m.group(1) if m else re.sub(r"[^a-z]", "", s)[:24]


# ---------- suggestions ----------
STATS = re.compile(r"\b(statistic|survey|census|register|data|indicator|estimate|enumerat|sample|household)", re.I)
PROGRAMME = re.compile(r"\b(cash|distribution|assistance|awareness campaign|livelihood|shelter|food|psychosocial|legal aid|gbv response)\b", re.I)
OTHER_FW = re.compile(r"(EU regulation|regulation \(ec\)|862/2007|2020/851|national law|\bIRTS\b|recommendations on statistics of international migration|UN recommendations on (international )?migration)", re.I)
UNAWARE = re.compile(r"(not (aware|familiar) (of|with) the (egriss )?recommendations|did not know (about )?the recommendations|unaware of the recommendations)", re.I)
DELIBERATE = re.compile(r"(recommendations were not (applied|followed) because|chose not to (apply|follow))", re.I)
CATS = re.compile(r"\b(asylum[- ]seekers?|refugees?|temporary protection|returnees?|internally displaced|IDPs?|stateless(ness)?|displaced persons?|disaster[- ]displaced)\b", re.I)
IDENT = re.compile(r"(citizenship|nationality|country of birth|place of birth|year of arrival|date of arrival|reason for (migration|moving|displacement|the move)|legal status|residence permit|protection status)", re.I)
OUTPUTS = re.compile(r"\b(counts? of|number of|indicators?|SDGs?|living conditions|integration|durable solutions?|disaggregat\w*|labour market|employment rates?)\b", re.I)
INSTRUMENT = re.compile(r"(forced displacement survey|\bFDS\b|\bMICS\b|\bDHS\b|demographic and health survey|multiple indicator cluster)", re.I)
REC_NAMED = re.compile(r"\b(EGRISS|IRRS|IRIS|IROSS|international recommendations on (refugee|idp|statelessness))", re.I)
MEMBERS = re.compile(r"\b(UNHCR|IOM|JIPS|World Bank|Eurostat|UNSD|UN Statistics Division|UNFPA|UNICEF|OECD|ESCWA|ECE|UNECE|ECA|ESCAP|ECLAC|IDMC|OCHA|SESRIC|Afristat|ILO|Statistics Norway|Statistics Sweden|CBS Netherlands|ISTAT|Destatis|INSEE|Statistics Canada|ONS|US Census Bureau)\b", re.I)
PRACTICE = {   # kind -> regex per practice item, in spec order
    "admin": [r"(statistical office|\bNSO\b|statistics (office|agency|bureau)|linkage|linked|transfer)", r"(publish|released|disseminat|statistical (report|bulletin|release))"],
    "survey": [r"(camps?|reception (centre|center)s?|informal settlements?|oversampl|collective (centres|accommodation)|host communit)", r"(statistical office|\bNSO\b|statistics (office|agency|bureau)|national statistic)"],
    "census": [r"(camps?|reception (centre|center)s?|collective (centres|accommodation)|institutional households)", r"reason for (migration|moving|displacement|the move)"],
    "integ": [r"(register|survey|census)", r"(link\w*|match\w*|personal (id|identification) number|unique identifier)"],
    "strategy": [r"(national statistical system|\bNSS\b|statistical office|\bNSO\b)"],
    "guidance": [r"(statistic|data producers?|statistical office|\bNSO\b)"],
    "nontrad": [r"(statistic|estimate|official figures)"],
    "training": [],
}
EVENT = [r"(refugee|idp|displacement|stateless\w*)[^.]{0,40}statistic|statistic\w*[^.]{0,40}(refugee|idp|displac|stateless)",
         r"(statistical offices?|\bNSOs?\b|national statistic|statistical (system|bodies|body))"]


def kind_for(source, title):
    s = (source or "").lower()
    for k, v in SPEC["kinds"].items():
        if any(p.lower() in s for p in v.get("pro08", [])):
            return k, f"reported source: {source}"
    t = title or ""
    for k, rx in (("training", r"training|workshop|course|webinar|meeting"), ("census", r"census"), ("survey", r"survey"),
                  ("admin", r"register|administrative"), ("strategy", r"strategy|roadmap|plan\b"), ("guidance", r"guid|toolkit|manual")):
        if re.search(rx, t, re.I):
            return k, "from the title"
    return None, ""


def pops(population, text):
    s = f"{population} {text}"
    out = ""
    if re.search(r"refugee|asylum|temporary protection|returnee|international protection", s, re.I): out += "R"
    if re.search(r"internally displaced|\bIDPs?\b|disaster", s, re.I): out += "I"
    if re.search(r"stateless", s, re.I): out += "S"
    return out


def suggest(ex, siblings, prior):
    """suggested answers per step, each with the reason; the reviewer confirms every one"""
    title, desc, partners = ex["title"], ex["description"], ex["partners"]
    allt = f"{title}. {desc}"
    sg = {"ticks": []}
    if STATS.search(allt) and not PROGRAMME.search(title):
        sg["q1"] = {"value": True, "why": "the title or description is about data or statistics"}
    elif PROGRAMME.search(allt) and not STATS.search(allt):
        m = PROGRAMME.search(allt)
        sg["q1"] = {"value": False, "why": "reads as programme delivery: " + snippet(allt, m)}
    for rx, val in ((DELIBERATE, "deliberate"), (UNAWARE, "unaware"), (OTHER_FW, "other")):
        m = rx.search(allt)
        if m:
            sg["q2"] = {"value": val, "why": "description: " + snippet(allt, m)}; break
    k, why = kind_for(ex["source"], title)
    if k: sg["kind"] = {"value": k, "why": why}
    p = pops(ex["population"], allt)
    if p:
        sg["populations"] = p
        sg["q4"] = {"value": True, "why": "population reported: " + (ex["population"] or "named in the description")}

    def tick(cid, why):
        sg["ticks"].append({"id": cid, "why": why})

    kind = k or ""
    if kind == "training":
        for i, rx in enumerate(EVENT):
            m = re.search(rx, allt, re.I)
            if m: tick(f"e{i}", "description: " + snippet(allt, m))
    else:
        m = CATS.search(allt)
        if m: tick("d0", "names the category: " + snippet(allt, m))
        m = IDENT.search(allt)
        if m: tick("d1", "identification: " + snippet(allt, m))
        m = OUTPUTS.search(allt)
        if m: tick("d2", "statistics produced: " + snippet(allt, m))
        for i, rx in enumerate(PRACTICE.get(kind, [])):
            m = re.search(rx, allt + " " + ex["organisation"], re.I)
            if m: tick(f"p{i}", "description or organisation: " + snippet(allt + " " + ex["organisation"], m))
    used_sib = [s for s in siblings if USED.search(s["recommendations"])]
    used_prior = [p for p in prior if p["uses"] == "yes"]
    if used_sib:
        s = used_sib[0]
        tick("l0", f"another example in this submission reports {', '.join(sorted(set(USED.findall(s['recommendations']))))}: {s['title'][:90]}")
    elif used_prior:
        p = used_prior[0]
        tick("l0", f"GAIN {p['year']}: this organisation reported use for {p['title'][:90]}")
    m = INSTRUMENT.search(allt)
    if m: tick("l1", "instrument: " + snippet(allt, m))
    m = REC_NAMED.search(allt)
    if m:
        tick("l2", "description mentions the recommendations: " + snippet(allt, m))
    else:
        m = MEMBERS.search(partners) or MEMBERS.search(allt)
        if m: tick("l2", f"EGRISS member involved: {m.group(0)}")
    return sg


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = pathlib.Path(sys.argv[1]).expanduser().resolve()
    if REPO in out.parents:
        sys.exit("Refusing: the queue holds respondents' descriptions; write it outside this public repository.")
    asset, subs = K.load()
    labels = K.label_maps(asset)
    N = resolve_names(asset)
    blocked = K.blocked_questions(asset)
    if any(q in blocked for v in N.values() for q in v):
        sys.exit("Refusing: a mapped question sits in a blocked group.")
    skip = set(K.CFG.get("skip_validation_status", []))

    def val(objs, key):
        for q in N[key]:
            for o in objs:
                _, v = K.find(o, q)
                if v is not None:
                    return K.scrub(K.as_text(v, q, labels))
        return ""

    past = list(csv.DictReader(open(PAST, encoding="utf-8"))) if PAST.exists() else []
    queue, n_ex = [], 0
    for s in subs:
        if (s.get("_validation_status") or {}).get("uid") in skip:
            continue
        exs = K.find(s, K.CFG["examples_repeat"])[1] or []
        org = K.scrub(K.as_text(K.find(s, K.CFG["fields"]["organisation"])[1], "organization", labels))
        rid = K.anon_id(s)
        rows = []
        for i, ex in enumerate(exs):
            n_ex += 1
            rows.append({
                "title": K.tidy_title(val([ex], "title")) or f"Example {i + 1}",
                "recommendations": val([ex], "recommendations"),
                "source": val([ex], "source"), "sources_more": val([ex], "sources_more"),
                "population": val([ex], "population"), "phase": val([ex], "phase"),
                "description": val([ex], "description"), "partners": val([ex], "partners"),
                "country": K.scrub(K.as_text(K.find(ex, K.CFG["fields"]["country"])[1] or K.find(s, K.CFG["fields"]["country"])[1], "PRO03C", labels)),
            })
        known = val([s], "known")
        prior = [{"year": p["gain_year"], "title": p["title"], "uses": p["uses_recommendations"]}
                 for p in past if okey(p["organisation"]) == okey(org)]
        prior.sort(key=lambda p: p["year"], reverse=True)
        for r in rows:
            rec = r["recommendations"]
            ans = "dk" if DK_ANS.search(rec) else "no" if NONE_ANS.search(rec) else None
            if not ans:
                continue
            sib = [{"title": x["title"], "recommendations": x["recommendations"]} for x in rows if x is not r]
            ex = {**r, "organisation": org}
            key = rid + "-" + re.sub(r"[^a-z0-9]+", "-", r["title"].lower()).strip("-")[:40]
            queue.append({
                "key": key, "response_id": rid, "title_start": r["title"][:60], "answer": ans, "answer_text": rec,
                "organisation": org, **{k: r[k] for k in ("title", "country", "source", "sources_more", "population", "phase", "description", "partners")},
                "known_publications": known, "siblings": sib, "prior": prior[:6],
                "submitted_at": s.get("_submission_time", ""), "suggest": suggest(ex, sib, prior),
            })
    meta = {"pulled_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "examples": n_ex, "in_review": len(queue), "spec_version": SPEC.get("version")}
    out.write_text(json.dumps({"meta": meta, "queue": queue}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(queue)} of {n_ex} examples enter the review -> {out}")


if __name__ == "__main__":
    main()
