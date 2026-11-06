"""Hypothetical cases with the expected outcome. Run: python3 -m pytest tests  (or python3 tests/test_rules.py)"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from alignment_rules import load_spec, decide

CASES = json.loads((Path(__file__).parent / "hypothetical_cases.json").read_text(encoding="utf-8"))


def test_cases():
    spec = load_spec()
    for c in CASES:
        got = decide(spec, c["input"])
        assert got["outcome"] == c["expected"], f'{c["name"]}: expected {c["expected"]}, got {got["outcome"]} ({got["path"]})'


if __name__ == "__main__":
    spec = load_spec()
    bad = 0
    for c in CASES:
        got = decide(spec, c["input"])
        ok = got["outcome"] == c["expected"]
        bad += not ok
        print(("ok  " if ok else "FAIL"), c["name"], "->", got["outcome"], got["score"] if got["score"] is not None else "")
    sys.exit(bad)
