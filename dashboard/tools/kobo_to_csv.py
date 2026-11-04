"""Pull GAIN 2026 submissions from the Kobo API into the tracker's feed (dashboard/data/gain2026.csv).

    KOBO_TOKEN=... python3 dashboard/tools/kobo_to_csv.py

Settings live in dashboard/kobo_config.json (server, form uid, question names); the API token comes
only from the KOBO_TOKEN environment variable (a GitHub secret in the scheduled job), never from a file.

One output row per GAIN example. If the form has a repeat group for examples (one questionnaire,
several examples), set "examples_repeat" to the repeat's name; each repeat entry becomes a row and
inherits country, organisation and lead from the questionnaire. Answers to select questions are
written as their labels (read from the form itself), several answers joined with ";".

For a dry run without Kobo, KOBO_FILES=<dir> reads <dir>/asset.json and <dir>/data.json instead.

Personal data: the output is published on a public page, so only the nine columns below ever leave
Kobo. Nothing about the person who filled in the form is read: no respondent name, email, phone,
position, Kobo username (_submitted_by), device id or location. The response id is a one-way hash of
the Kobo id, and email addresses and phone numbers typed into a title are blanked out.
"""
import csv, hashlib, json, os, pathlib, re, sys, urllib.request

HERE = pathlib.Path(__file__).resolve().parents[1]
CFG = json.loads((HERE / "kobo_config.json").read_text(encoding="utf-8"))
OUT = HERE / "data" / "gain2026.csv"
# questions whose name looks like respondent contact details are refused even if mapped by mistake
PERSONAL = re.compile(r"(^|_)(name_?resp|respondent|focal|contact|e?mail|phone|tel|mobile|whatsapp|position|job_?title|first_?name|last_?name|surname|full_?name)(_|$)", re.I)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"\+?\d[\d ()./-]{7,}\d")
COLUMNS = ["response_id", "submitted_at", "country", "organisation", "lead", "title",
           "recommendations", "data_source", "population_groups"]


def get(url):
    req = urllib.request.Request(url, headers={"Authorization": "Token " + os.environ["KOBO_TOKEN"], "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
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


def find(obj, name):
    """Kobo keys carry their group path ("grp_a/grp_b/question"): match on the last part."""
    if not name:
        return None
    for k, v in obj.items():
        if k == name or k.split("/")[-1] == name:
            return v
    return None


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


def anon_id(s):
    raw = str(s.get("_uuid") or s.get("_id"))
    return "R-" + hashlib.sha256(("gain2026:" + raw).encode()).hexdigest()[:10]


def main():
    if not os.environ.get("KOBO_FILES") and (not os.environ.get("KOBO_TOKEN") or CFG["asset_uid"].startswith("FILL-IN")):
        print("Kobo not configured yet (KOBO_TOKEN or asset_uid missing): the page stays on demo data.")
        return
    bad = {k: q for k, q in CFG["fields"].items() if q and PERSONAL.search(q)}
    if bad:
        sys.exit(f"Refusing: these fields look like respondent details and would go public: {bad}")
    asset, subs = load()
    labels = label_maps(asset)
    F, rep = CFG["fields"], CFG.get("examples_repeat")
    skip = set(CFG.get("skip_validation_status", []))
    out = []
    for s in subs:
        status = (s.get("_validation_status") or {}).get("uid")
        if status in skip:
            continue
        examples = (find(s, rep) or []) if rep else [s]
        for i, ex in enumerate(examples):
            def field(key):
                q = F.get(key)
                v = find(ex, q)
                if v is None:
                    v = find(s, q)  # questionnaire-level answer (country, organisation, lead)
                return scrub(as_text(v, q, labels))
            t = s.get("_submission_time") or s.get("end") or ""
            out.append({
                "response_id": anon_id(s),
                "submitted_at": t if t.endswith("Z") or "+" in t else t + "Z",
                "country": field("country"),
                "organisation": field("organisation"),
                "lead": field("lead"),
                "title": field("title") or f"Example {i + 1}",
                "recommendations": field("recommendations"),
                "data_source": field("data_source"),
                "population_groups": field("population_groups"),
            })
    out.sort(key=lambda r: r["submitted_at"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} examples from {len(subs)} submissions -> {OUT.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
