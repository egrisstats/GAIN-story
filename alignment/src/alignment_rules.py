"""
GAIN alignment review: the decision tree as code.

The rules live in spec/decision_tree.json. This module reads them and turns a reviewer's
answers for one example into an outcome, a score and the fields to fill. It has no
dependencies beyond the standard library, so it can sit inside any dashboard back end.

    from alignment_rules import load_spec, decide
    spec = load_spec()
    result = decide(spec, {
        "answer": "no",            # no | dk | dkw
        "q1": True,                # about producing statistics
        "q2": "none",              # none | other | unaware | deliberate
        "kind": "survey",          # a key of spec["kinds"]
        "q4": True,                # populations told apart as recommendation categories
        "ticks": ["d0", "d1", "p0", "l0"],   # criteria ticked in step 5
        "populations": "R",        # R refugees, I IDPs, S stateless (used for PRO10)
    })
"""
import json
from pathlib import Path

SPEC_PATH = Path(__file__).resolve().parent.parent / "spec" / "decision_tree.json"
REC_BY_POP = {"R": "IRRS", "I": "IRIS", "S": "IROSS"}


def load_spec(path=SPEC_PATH):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def criteria_for(spec, kind):
    """All step 5 criteria for a kind of example, as (id, points, is_use_sign, pro12)."""
    k = spec["kinds"][kind]
    c = spec["criteria"]
    out = []
    if k.get("event"):
        out += [(e["id"], e["points"], False, None) for e in c["event"]["items"]]
    else:
        out += [(d["id"], c["distinctive"]["points"], False, d["pro12"]) for d in c["distinctive"]["items"]]
        out += [(f"p{i}", c["practice"]["points"], False, c["practice"]["pro12"]) for i, _ in enumerate(k["practice"])]
    out += [(u["id"], c["use"]["points"], True, None) for u in c["use"]["items"]]
    return out


def score(spec, kind, ticks, reason="none"):
    crit = {cid: (pts, use, pro12) for cid, pts, use, pro12 in criteria_for(spec, kind)}
    unknown = set(ticks) - set(crit)
    if unknown:
        raise ValueError(f"Unknown criteria for {kind}: {sorted(unknown)}")
    pts = sum(crit[t][0] for t in ticks)
    use = any(crit[t][1] for t in ticks)
    if reason == "other":
        pts += spec["steps"][1]["options"]["other"]["points"]
        use = True
    pro12 = sorted({crit[t][2] for t in ticks if crit[t][2]})
    return pts, use, pro12


def decide(spec, a):
    """Return a dict with outcome, label, score, use_sign, path and fill."""
    path = []
    if a.get("q1") is False:
        return _out(spec, "outscope", path + ["q1:no"])
    path.append("q1:yes")
    reason = a.get("q2", "none")
    path.append(f"q2:{reason}")
    then = spec["steps"][1]["options"][reason]["then"]
    if then != "continue":
        return _out(spec, then, path)
    kind = a["kind"]
    path.append(f"q3:{kind}")
    if a.get("q4") is False:
        return _out(spec, "nocat", path + ["q4:no"])
    path.append("q4:yes")
    pts, use, pro12 = score(spec, kind, a.get("ticks", []), reason)
    t = spec["thresholds"]
    ans = a["answer"]
    need = t[ans]
    if pts >= need and (ans != "no" or not t["no_requires_use_sign"] or use):
        outcome = "edit"
    elif pts >= t["aligned_min"]:
        outcome = "aligned"
    else:
        outcome = "keep"
    res = _out(spec, outcome, path + [f"q5:{pts}"])
    res.update(score=pts, use_sign=use)
    if outcome == "edit":
        recs = [REC_BY_POP[p] for p in a.get("populations", "") if p in REC_BY_POP]
        res["fill"] = {"PRO09_reviewed": 1, "PRO10_reviewed": " ".join(recs) or None,
                       "PRO12_reviewed": pro12, "review_source": "Secretariat edit, notified"}
    return res


def _out(spec, key, path):
    o = spec["outcomes"][key]
    return {"outcome": key, "label": o["label"], "detail": o["detail"], "path": path, "score": None, "use_sign": None}


if __name__ == "__main__":
    import sys
    spec = load_spec()
    print(json.dumps(decide(spec, json.loads(sys.argv[1])), indent=2, ensure_ascii=False))
