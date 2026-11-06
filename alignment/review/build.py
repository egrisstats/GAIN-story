"""Inline the rules into the reviewer page for publishing: python3 alignment/review/build.py <out.html>"""
import pathlib, sys
here = pathlib.Path(__file__).resolve().parent
page = (here / "review.html").read_text(encoding="utf-8")
rules = (here.parent / "src" / "alignment_rules.js").read_text(encoding="utf-8")
assert "/*RULES*/" in page
pathlib.Path(sys.argv[1]).write_text(page.replace("/*RULES*/", rules), encoding="utf-8")
