"""Feed the standalone alignment review page (dashboard/review/) and the tracker from Kobo.

    KOBO_TOKEN=... python3 dashboard/tools/review_sync.py public <out_dir>
    KOBO_TOKEN=... python3 dashboard/tools/review_sync.py evidence <out.json> [research.json] [documents.json]

public   writes, into <out_dir> (the published site's dashboard/data, never committed):
           review_queue.json      every example that said No or Don't know, with region, kind, similar
                                  examples and history. Titles, organisations and select answers only:
                                  NO descriptions, partners or suggestions (those stay in the evidence file).
           review_decisions.json  the decisions saved through the Kobo review form (kobo_config.json
                                  "review_form"), folded into one current decision per example.
           alignment_review.csv   the tracker's summary of those decisions (outcome and score per example).
         Without KOBO_TOKEN the queue and decisions are left as they are (the page then shows demo data).

evidence writes OUTSIDE the repo (refused inside) the private half of the queue: the descriptions,
         partners, suggested ticks and, when given, the web research and the documents read. The
         Secretariat keeps this file on its own drive; reviewers open it on the page, where it stays
         in the browser. Nothing about the person who filled in the form is read (see kobo_to_csv.py).

The review form is append-only. Each submission is one action on one example: save (a decision),
undo (remove it), sent / unsent (the email). The latest submission wins; a save keeps the sent date
of the decision it replaces. Submissions are read with the API token; the form itself only needs
"allow submissions without a username" so that reviewers can save from the page without an account.
"""
import csv, datetime, json, os, pathlib, sys, urllib.parse, urllib.request

HERE = pathlib.Path(__file__).resolve().parents[1]          # dashboard/
REPO = HERE.parent
sys.path.insert(0, str(HERE / "tools"))
import kobo_to_csv as K                                        # noqa: E402
import alignment_queue as AQ                                   # noqa: E402
import alignment_context as AC                                 # noqa: E402

CFG = K.CFG
FORM = json.loads((REPO / "alignment" / "spec" / "review_form.json").read_text(encoding="utf-8"))
PRIVATE = ("description", "partners", "suggest", "web")        # never in the public queue
OUTCOMES = {o["name"] for o in FORM["choices"]["outcome"]}


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def api(path, params=None):
    url = CFG["server"].rstrip("/") + path + ("?" + urllib.parse.urlencode(params) if params else "")
    return K.get(url)


def form_meta(uid):
    """where the page sends reviewers to save: the form's web link (Enketo), plus the names it needs"""
    a = api(f"/api/v2/assets/{uid}/", {"format": "json"})
    links = a.get("deployment__links") or {}
    return {"uid": uid, "url": links.get("single_url") or links.get("url") or "", "edit_url": links.get("url") or "",
            "root": uid, "version": a.get("version_id") or "", "deployed": bool(a.get("has_deployment"))}


def read_log(uid):
    """every submission to the review form, oldest first; only the review fields, never _submitted_by"""
    rows, start, names = [], 0, [q["name"] for q in FORM["questions"]]
    while True:
        page = api(f"/api/v2/assets/{uid}/data/", {"format": "json", "limit": 1000, "start": start, "fields": json.dumps(names + ["_submission_time", "_id"])})
        for s in page.get("results", []):
            r = {n: K.as_text(K.find(s, n)[1], n, {}) if K.find(s, n)[1] is not None else "" for n in names}
            r["_submission_time"] = s.get("_submission_time", "")
            r["_id"] = s.get("_id")
            rows.append(r)
        start += 1000
        if start >= page.get("count", 0) or not page.get("results"):
            break
    rows.sort(key=lambda r: (r.get("saved_at") or r["_submission_time"], r["_id"] or 0))
    return rows


def parse_ticks(s):
    """"d0:f:desc;d1:n:;l0:u:web" -> ticks, states, where"""
    ticks, states, where = [], {}, {}
    for part in (s or "").split(";"):
        bits = part.split(":")
        if not bits[0]:
            continue
        cid, st, wh = bits[0], (bits[1] if len(bits) > 1 else "f"), (bits[2] if len(bits) > 2 else "")
        st = {"f": "found", "n": "not", "u": "unsure"}.get(st, st)
        states[cid] = st
        if st == "found":
            ticks.append(cid)
        if wh:
            where[cid] = wh
    return ticks, states, where


def fold(log):
    """one current decision per example, in the shape the review page and the report use"""
    dec = {}
    for r in log:
        k = r.get("example_key", "").strip()
        if not k:
            continue
        act = r.get("action") or "save"
        prev = dec.get(k) or {}
        if act == "undo":
            dec.pop(k, None)
            continue
        if act in ("sent", "unsent"):
            for kk in k.split("|"):
                if kk in dec:
                    dec[kk]["notified_on"] = (r.get("saved_at") or r["_submission_time"])[:10] if act == "sent" else None
            continue
        if r.get("outcome") not in OUTCOMES:
            continue
        ticks, states, where = parse_ticks(r.get("ticks"))
        yn = lambda v: True if v == "yes" else False if v == "no" else None  # noqa: E731
        dec[k] = {
            "key": k, "response_id": k.split("-")[0] + "-" + k.split("-")[1] if k.count("-") >= 2 else "", "title_start": r.get("title", "")[:60],
            "answer": r.get("answer") or "", "outcome": r["outcome"], "score": int(r["score"]) if str(r.get("score", "")).lstrip("-").isdigit() else None,
            "use_sign": yn(r.get("use_sign")),
            "answers": {"q1": yn(r.get("q1")), "q2": r.get("q2") or "none", "kind": r.get("kind") or None, "q4": yn(r.get("q4")),
                        "ticks": ticks, "states": states, "where": where, "populations": r.get("populations") or ""},
            "note": r.get("note") or "", "reviewer": r.get("reviewer") or None, "saved_at": r.get("saved_at") or r["_submission_time"],
            "spec_version": r.get("spec_version") or None, "rationale": r.get("rationale") or "", "rationale_edited": r.get("rationale_edited") == "yes",
            "notified_on": prev.get("notified_on"), "objection": prev.get("objection"), "kobo_id": r["_id"],
        }
    return dec


def write_tracker_csv(dec, path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["response_id", "title_start", "outcome", "score", "reviewed_on"])
        for d in sorted(dec.values(), key=lambda d: d["key"]):
            w.writerow([d["response_id"], d["title_start"], d["outcome"], d["score"] if d["score"] is not None else "", (d["saved_at"] or "")[:10]])


def public(out_dir):
    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    if not os.environ.get("KOBO_TOKEN") and not os.environ.get("KOBO_FILES"):
        print("review_sync: no KOBO_TOKEN, nothing refreshed")
        return
    q = AC.enrich(AQ.build())
    for e in q["queue"]:
        for k in PRIVATE:
            e.pop(k, None)
        assert not any(k in e for k in PRIVATE)
    rf = CFG.get("review_form") or {}
    uid = rf.get("asset_uid")
    q["meta"]["form"] = form_meta(uid) if uid and os.environ.get("KOBO_TOKEN") else None
    q["meta"]["fields"] = [x["name"] for x in FORM["questions"]]
    q["meta"]["published_at"] = now_iso()
    (out / "review_queue.json").write_text(json.dumps(q, ensure_ascii=False), encoding="utf-8")
    dec, n = {}, 0
    if uid and os.environ.get("KOBO_TOKEN"):
        log = read_log(uid)
        n = len(log)
        dec = fold(log)
    (out / "review_decisions.json").write_text(json.dumps({"fetched_at": now_iso(), "submissions": n, "decisions": dec}, ensure_ascii=False), encoding="utf-8")
    write_tracker_csv(dec, out / "alignment_review.csv")
    print(f"review_sync: {len(q['queue'])} in the review, {len(dec)} decisions from {n} submissions -> {out}")


def evidence(out_path, research=None, docs=None):
    out = pathlib.Path(out_path).expanduser().resolve()
    if REPO in out.parents:
        sys.exit("Refusing: the evidence file holds respondents' descriptions; write it outside this public repository.")
    q = AC.enrich(AQ.build(), json.loads(pathlib.Path(research).read_text()) if research else None, json.loads(pathlib.Path(docs).read_text()) if docs else None)
    items = {e["key"]: {k: e[k] for k in PRIVATE if e.get(k) is not None} for e in q["queue"]}
    out.write_text(json.dumps({"kind": "gain-review-evidence", "made_at": now_iso(), "pulled_at": q["meta"]["pulled_at"], "context": q["meta"].get("context"),
                               "items": items}, ensure_ascii=False), encoding="utf-8")
    print(f"evidence for {len(items)} examples -> {out}  (keep it on the Secretariat's drive, not in the repo)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == "public":
        public(a[1])
    elif len(a) in (2, 3, 4) and a[0] == "evidence":
        evidence(a[1], a[2] if len(a) > 2 else None, a[3] if len(a) > 3 else None)
    else:
        sys.exit(__doc__)
