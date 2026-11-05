"""Pull GAIN 2026 submissions from the Kobo API into the tracker's feed (dashboard/data/gain2026.csv).

    KOBO_TOKEN=... python3 dashboard/tools/kobo_to_csv.py

Settings live in dashboard/kobo_config.json (server, form uid, question names); the API token comes
only from the KOBO_TOKEN environment variable (a GitHub secret in the scheduled job), never from a file.

One output row per GAIN example. If the form has a repeat group for examples (one questionnaire,
several examples), set "examples_repeat" to the repeat's name; each repeat entry becomes a row and
inherits country, organisation and lead from the questionnaire. Answers to select questions are
written as their labels (read from the form itself), several answers joined with ";".

To fill in kobo_config.json, list the form's questions (names, types, labels; never any answers):

    KOBO_TOKEN=... python3 dashboard/tools/kobo_to_csv.py --describe <server> <form uid>

For a dry run without Kobo, KOBO_FILES=<dir> reads <dir>/asset.json and <dir>/data.json instead.

Personal data: the output is published on a public page, so only the nine columns below ever leave
Kobo. Nothing about the person who filled in the form is read: no respondent name, email, phone,
position, Kobo username (_submitted_by), device id or location. The response id is a one-way hash of
the Kobo id, and email addresses and phone numbers typed into a title are blanked out.
"""
import csv, hashlib, json, os, pathlib, re, ssl, sys, urllib.request


def tls_context():
    """Verified HTTPS. The python.org macOS build has no certificate list of its own: use certifi
    if installed, else the system's bundle."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        for f in ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt"):
            if os.path.exists(f):
                return ssl.create_default_context(cafile=f)
    return ssl.create_default_context()

HERE = pathlib.Path(__file__).resolve().parents[1]
CFG = json.loads((HERE / "kobo_config.json").read_text(encoding="utf-8"))
OUT = HERE / "data" / "gain2026.csv"
# questions whose name looks like respondent contact details are refused even if mapped by mistake
PERSONAL = re.compile(r"(^|_)(name_?resp|respondent|focal|contact|e?mail|phone|tel|mobile|whatsapp|position|job_?title|first_?name|last_?name|surname|full_?name)(_|$)", re.I)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"\+?\d[\d ()./-]{7,}\d")
COLUMNS = ["response_id", "submitted_at", "kind", "country", "organisation", "lead", "title",
           "recommendations", "data_source", "population_groups", "phase", "reported_before", "possible_duplicate",
           "repeat_reason", "repeat_caveat", "repeat_suggested", "repeat_checked"]


def get(url):
    req = urllib.request.Request(url, headers={"Authorization": "Token " + os.environ["KOBO_TOKEN"], "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60, context=tls_context()) as r:
        return json.load(r)


def load():
    files = os.environ.get("KOBO_FILES")
    if files:
        d = pathlib.Path(files)
        return json.loads((d / "asset.json").read_text()), json.loads((d / "data.json").read_text())["results"]
    base = CFG["server"].rstrip("/") + "/api/v2/assets/" + CFG["asset_uid"]
    asset = get(base + "/?format=json")
    rows, url = [], base + "/data/?format=json&limit=1000"
    while url:  # the API pages its results
        page = get(url)
        rows += page["results"]
        url = page.get("next")
    return asset, rows


def label_maps(asset):
    """question name -> {choice name: label}, from the deployed form."""
    content = asset.get("content", {})
    lists = {}
    for c in content.get("choices", []):
        lab = c.get("label") or [c["name"]]
        lists.setdefault(c["list_name"], {})[c["name"]] = (lab[0] if isinstance(lab, list) else lab) or c["name"]
    q = {}
    for s in content.get("survey", []):
        ln = s.get("select_from_list_name")
        if ln and "name" in s:
            q[s["name"]] = lists.get(ln, {})
    return q


BLOCKED = set(CFG.get("blocked_groups", []))


def find(obj, names):
    """First non-empty answer among `names` (a name or a list of names). Kobo keys carry their group
    path ("grp_a/grp_b/question"), so match on the last part; keys inside a blocked group (the
    respondent's contact details) are never read."""
    for name in ([names] if isinstance(names, str) else names or []):
        for k, v in obj.items():
            parts = k.split("/")
            if BLOCKED.intersection(parts[:-1]):
                continue
            if (k == name or parts[-1] == name) and v not in (None, ""):
                return name, v
    return None, None


def as_text(value, question, labels):
    if value is None:
        return ""
    if isinstance(value, list):
        return ";".join(as_text(v, question, labels) for v in value)
    value = str(value).strip()
    choices = labels.get(question)
    if choices:  # select_one / select_multiple: space-separated choice names
        return ";".join(choices.get(v, v) for v in value.split())
    return value


def scrub(text):
    text = EMAIL.sub("[email removed]", text)
    # a phone number has 9+ digits; year ranges such as 2021-2025 (8 digits) stay
    return PHONE.sub(lambda m: "[phone removed]" if sum(c.isdigit() for c in m.group()) >= 9 else m.group(), text)


def tidy_title(t):
    """a title typed as Words+Joined+By+Plus (copied from a URL) reads as words"""
    return t.replace("+", " ") if t and " " not in t and "+" in t else t


def anon_id(s):
    raw = str(s.get("_uuid") or s.get("_id"))
    return "R-" + hashlib.sha256(("gain2026:" + raw).encode()).hexdigest()[:10]


def describe(server, uid):
    CFG["server"], CFG["asset_uid"] = server, uid
    base = server.rstrip("/") + "/api/v2/assets/" + uid
    asset = get(base + "/?format=json")
    print(f"Form: {asset.get('name')}  ·  {asset.get('deployment__submission_count', '?')} submissions so far\n")
    path = []
    for q in asset.get("content", {}).get("survey", []):
        t = q.get("type", "")
        if t in ("begin_group", "begin_repeat"):
            path.append(q.get("name", ""))
            print(f"{'  ' * (len(path) - 1)}[{'REPEAT' if t == 'begin_repeat' else 'group'}] {q.get('name')}")
            continue
        if t in ("end_group", "end_repeat"):
            path and path.pop()
            continue
        if "name" not in q or t in ("note", "start", "end", "today", "deviceid", "calculate"):
            continue
        lab = q.get("label", [""])
        lab = (lab[0] if isinstance(lab, list) and lab else lab) or ""
        flag = "   <- personal, not used" if PERSONAL.search(q["name"]) else ""
        print(f"{'  ' * len(path)}{q['name']}  ({t})  {str(lab)[:80]}{flag}")


def blocked_questions(asset):
    """names of every question inside a blocked group of the form"""
    names, path = set(), []
    for q in asset.get("content", {}).get("survey", []):
        t = q.get("type", "")
        if t in ("begin_group", "begin_repeat"):
            path.append(q.get("name", "")); continue
        if t in ("end_group", "end_repeat"):
            path and path.pop(); continue
        if BLOCKED.intersection(path) and "name" in q:
            names.add(q["name"])
    return names


def main():
    if len(sys.argv) == 4 and sys.argv[1] == "--describe":
        return describe(sys.argv[2], sys.argv[3])
    if not os.environ.get("KOBO_FILES") and (not os.environ.get("KOBO_TOKEN") or CFG["asset_uid"].startswith("FILL-IN")):
        print("Kobo not configured yet (KOBO_TOKEN or asset_uid missing): the page stays on demo data.")
        return
    F = CFG["fields"]
    mapped = {q for v in F.values() for q in ([v] if isinstance(v, str) else v)}
    mapped |= {CFG["lead"].get("respondent_type"), CFG["lead"].get("example_lead"), CFG.get("no_country_scope", {}).get("field")}
    mapped.discard(None)
    bad = {q for q in mapped if PERSONAL.search(q)}
    if bad:
        sys.exit(f"Refusing: these questions look like respondent details and would go public: {sorted(bad)}")
    asset, subs = load()
    bad = mapped & blocked_questions(asset)
    if bad:
        sys.exit(f"Refusing: these questions sit in a blocked group ({sorted(BLOCKED)}): {sorted(bad)}")
    labels = label_maps(asset)
    L, scope = CFG["lead"], CFG.get("no_country_scope", {})
    combine = set(CFG.get("combine", []))
    skip = set(CFG.get("skip_validation_status", []))
    out, n_sub = [], 0

    def text(objs, key):
        names = F.get(key)
        names = [names] if isinstance(names, str) else names
        vals = []
        for q in names:
            for o in objs:
                _, v = find(o, q)
                if v is not None:
                    vals.append(scrub(as_text(v, q, labels)))
                    break
            if vals and key not in combine:
                break
        return ";".join(dict.fromkeys(x for v in vals for x in v.split(";") if x))

    for s in subs:
        if (s.get("_validation_status") or {}).get("uid") in skip:
            continue
        n_sub += 1
        t = s.get("_submission_time") or s.get("end") or ""
        _, rtype = find(s, L["respondent_type"])
        resp_country_led = rtype in L["country_led"]
        base = {
            "response_id": anon_id(s),
            "submitted_at": t if t.endswith("Z") or "+" in t else t + "Z",
            "organisation": text([s], "organisation"),
        }
        examples = find(s, CFG["examples_repeat"])[1] or []
        if not examples:  # a response that reports no new example still counts as a response
            out.append({**base, "kind": "response", "lead": "Country-led" if resp_country_led else "Institution-led",
                        "country": text([s], "country") if resp_country_led else ""})
            continue
        for i, ex in enumerate(examples):
            _, elead = find(ex, L.get("example_lead"))
            country_led = True if elead in L.get("example_country_led", []) else False if elead in L.get("example_institution_led", []) else resp_country_led
            _, sc = find(ex, scope.get("field"))
            if sc in scope.get("codes", []):
                country = ""  # a global or regional example
            else:
                # the example's own country; the respondent's country only for national institutions
                country = text([ex], "country") or (text([s], "country") if resp_country_led else "")
            out.append({**base, "kind": "example",
                        "lead": "Country-led" if country_led else "Institution-led",
                        "country": country,
                        "title": tidy_title(text([ex], "title")) or f"Example {i + 1}",
                        "recommendations": text([ex], "recommendations"),
                        "data_source": text([ex], "data_source"),
                        "population_groups": text([ex], "population_groups"),
                        "phase": text([ex], "phase") if "phase" in F else ""})
    out.sort(key=lambda r: r["submitted_at"])
    # hints for checking: looks like an example from GAIN 2023-2025, or one another 2026 response gave
    try:
        sys.path.insert(0, str(HERE / "tools"))
        from repeats import Matcher
        Matcher().tag(out)
    except Exception as e:  # never block the publish over the hints
        print("repeat check skipped:", e)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, restval="")
        w.writeheader()
        w.writerows(out)
    n_ex = sum(r["kind"] == "example" for r in out)
    # when the data was taken from Kobo, so the page can say how fresh it is
    import datetime as _dt
    (OUT.parent / "gain2026_meta.json").write_text(json.dumps({
        "pulled_at": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "responses": n_sub, "examples": n_ex}), encoding="utf-8")
    print(f"{n_ex} examples from {n_sub} responses -> {OUT.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
