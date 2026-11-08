"""Build the reviewer page for publishing: python3 alignment/review/build.py <out.html>

Inlines the rules (src/alignment_rules.js) at /*RULES*/, and the decision tree diagram drawn by
tree_svg.py from spec/decision_tree.json at <!--TREE--> (its styles at /*TREECSS*/).
"""
import pathlib, subprocess, sys
here = pathlib.Path(__file__).resolve().parent
root = here.parents[1]
subprocess.run([sys.executable, str(here / "tree_svg.py"), str(root)], check=True, capture_output=True)
page = (here / "review.html").read_text(encoding="utf-8")
rules = (here.parent / "src" / "alignment_rules.js").read_text(encoding="utf-8")
text = (here.parent / "src" / "alignment_text.js").read_text(encoding="utf-8")
tree = (here / "tree.svg.html").read_text(encoding="utf-8")
css = (here / "tree.css").read_text(encoding="utf-8").replace(".tree", ".dtree")
for mark in ("/*RULES*/", "/*TEXT*/", "<!--TREE-->", "/*TREECSS*/"):
    assert mark in page, mark
page = page.replace("/*RULES*/", rules).replace("/*TEXT*/", text).replace("<!--TREE-->", tree).replace("/*TREECSS*/", css)
pathlib.Path(sys.argv[1]).write_text(page, encoding="utf-8")
