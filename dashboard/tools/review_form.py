"""Create (or update) the Kobo form the standalone review page saves to, from alignment/spec/review_form.json.

    KOBO_TOKEN=... python3 dashboard/tools/review_form.py
    python3 dashboard/tools/review_form.py --links <decisions.json> <form single url>

--links prints one prefilled form link per decision in a decisions file (an export of the private review
page's store: {key: decision} or a folder's worth under "decisions"), to move earlier decisions into the
form by opening each link and pressing Submit. Reviewer ids are not carried over.

Creates the form on the server in dashboard/kobo_config.json if "review_form.asset_uid" is empty,
else replaces its content; deploys it; lets anyone submit to it without an account (the page saves
through the form's web link); and writes the uid back into kobo_config.json. Reading the submissions
stays private: the publish workflow reads them with the API token.
"""
import json, os, pathlib, sys, urllib.request

HERE = pathlib.Path(__file__).resolve().parents[1]
REPO = HERE.parent
sys.path.insert(0, str(HERE / "tools"))
import kobo_to_csv as K                                        # noqa: E402

CFG_PATH = HERE / "kobo_config.json"
CFG = json.loads(CFG_PATH.read_text(encoding="utf-8"))
FORM = json.loads((REPO / "alignment" / "spec" / "review_form.json").read_text(encoding="utf-8"))
SERVER = CFG["server"].rstrip("/")


def call(method, path, body=None):
    req = urllib.request.Request(SERVER + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Token " + os.environ["KOBO_TOKEN"], "Accept": "application/json", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60, context=K.tls_context()) as r:
        txt = r.read().decode()
        return json.loads(txt) if txt else {}


def content():
    survey = [{"type": "start", "name": "start"}, {"type": "end", "name": "end"}]
    for q in FORM["questions"]:
        row = {"type": q["type"], "name": q["name"], "label": [q["label"]], "required": bool(q.get("required"))}
        if q["type"] == "text" and q["name"] in ("rationale", "note", "ticks"):
            row["appearance"] = "multiline"
        survey.append(row)
    choices = [{"list_name": ln, "name": c["name"], "label": [c["label"]]} for ln, cs in FORM["choices"].items() for c in cs]
    return {"schema": "1", "survey": survey, "choices": choices, "settings": {"default_language": "English (en)"}, "translations": ["English (en)"], "translated": ["label"]}


def links(path, single_url):
    """prefilled form links, one per decision, in the page's own encoding (see alignment/review/store_public.js)"""
    import urllib.parse
    j = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    dec = j.get("decisions", j)
    uid = CFG["review_form"]["asset_uid"]
    st = {"found": "f", "not": "n", "unsure": "u"}
    yn = lambda v: "yes" if v is True else "no" if v is False else ""  # noqa: E731
    for k, d in sorted(dec.items()):
        a = d.get("answers") or {}
        ids = sorted(set(list((a.get("states") or {}).keys()) + list(a.get("ticks") or [])))
        ticks = ";".join(i + ":" + st.get((a.get("states") or {}).get(i, "found" if i in (a.get("ticks") or []) else "not"), "f") + ":" + ((a.get("where") or {}).get(i) or "") for i in ids)
        f = {"example_key": k, "title": (d.get("title_start") or "")[:200], "answer": d.get("answer", ""), "action": "save", "outcome": d["outcome"], "score": d.get("score", ""),
             "use_sign": yn(d.get("use_sign")), "q1": yn(a.get("q1")), "q2": a.get("q2") or "none", "q4": yn(a.get("q4")), "populations": a.get("populations") or "", "kind": a.get("kind") or "",
             "ticks": ticks, "rationale": d.get("rationale") or "", "rationale_edited": yn(bool(d.get("rationale_edited"))), "note": d.get("note") or "", "reviewer": "",
             "saved_at": d.get("saved_at") or "", "spec_version": d.get("spec_version") or "", "source": "migrated"}
        qs = "&".join("d%5B/" + uid + "/" + n + "%5D=" + urllib.parse.quote(str(v), safe="") for n, v in f.items() if v not in ("", None))
        print(single_url + "?" + qs)
        if d.get("notified_on"):
            print(single_url + "?" + "&".join("d%5B/" + uid + "/" + n + "%5D=" + urllib.parse.quote(str(v), safe="") for n, v in
                  {"example_key": k, "title": f["title"], "action": "sent", "saved_at": d["notified_on"] + "T12:00:00Z", "source": "migrated"}.items()))


def main():
    if len(sys.argv) == 4 and sys.argv[1] == "--links":
        links(sys.argv[2], sys.argv[3]); return
    if not os.environ.get("KOBO_TOKEN"):
        sys.exit("KOBO_TOKEN is needed")
    rf = CFG.setdefault("review_form", {"asset_uid": "", "_note": "The decisions form of the standalone review page, made by review_form.py."})
    uid = rf.get("asset_uid")
    body = {"name": FORM["title"], "asset_type": "survey", "content": content()}
    if uid:
        call("PATCH", f"/api/v2/assets/{uid}/", body)
        print("updated", uid)
    else:
        a = call("POST", "/api/v2/assets/", body)
        uid = a["uid"]
        rf["asset_uid"] = uid
        CFG_PATH.write_text(json.dumps(CFG, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("created", uid)
    a = call("GET", f"/api/v2/assets/{uid}/?format=json")
    if a.get("has_deployment"):
        call("PATCH", f"/api/v2/assets/{uid}/deployment/", {"active": True, "version_id": a["version_id"]})
    else:
        call("POST", f"/api/v2/assets/{uid}/deployment/", {"active": True})
    # anyone may submit (no account needed to save from the page); nobody but the owner reads
    call("POST", f"/api/v2/assets/{uid}/permission-assignments/",
         {"user": SERVER + "/api/v2/users/AnonymousUser/", "permission": SERVER + "/api/v2/permissions/add_submissions/"})
    a = call("GET", f"/api/v2/assets/{uid}/?format=json")
    dl = a.get("deployment__links") or {}
    print("form:", SERVER + "/#/forms/" + uid)
    print("web form (single submission):", dl.get("single_url"))
    print("web form:", dl.get("url"))


if __name__ == "__main__":
    main()
