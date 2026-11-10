"""Build the reviewer page.

    python3 alignment/review/build.py <out.html>            the private page (Claude artifact store)
    python3 alignment/review/build.py --public <out.html>   the standalone page (GitHub Pages + Kobo form)

Inlines the rules (src/alignment_rules.js) at /*RULES*/, the reason writer (src/alignment_text.js) at
/*TEXT*/, and the decision tree diagram drawn by tree_svg.py from spec/decision_tree.json at <!--TREE-->
(its styles at /*TREECSS*/). The public build swaps the store (between // @store-claude and // @store-end,
and the actions between // @actions-claude and // @actions-end) for store_public.js, inlines the report
builder (report/report_lib.js) and adds the toolbar (evidence file, downloads).
"""
import pathlib, re, subprocess, sys
here = pathlib.Path(__file__).resolve().parent
root = here.parents[1]
args = sys.argv[1:]
public = args and args[0] == "--public"
out = pathlib.Path(args[-1]) if args else None
if not out:
    sys.exit(__doc__)
subprocess.run([sys.executable, str(here / "tree_svg.py"), str(root)], check=True, capture_output=True)
page = (here / "review.html").read_text(encoding="utf-8")
rules = (here.parent / "src" / "alignment_rules.js").read_text(encoding="utf-8")
text = (here.parent / "src" / "alignment_text.js").read_text(encoding="utf-8")
tree = (here / "tree.svg.html").read_text(encoding="utf-8")
css = (here / "tree.css").read_text(encoding="utf-8").replace(".tree", ".dtree")
for mark in ("/*RULES*/", "/*TEXT*/", "<!--TREE-->", "/*TREECSS*/", "/*STORE*/", "/*PUBLIC*/", "<!--PUBLIC-TOOLBAR-->",
             "// @store-claude", "// @store-end", "// @actions-claude", "// @actions-end"):
    assert mark in page, mark
page = page.replace("/*RULES*/", rules).replace("/*TEXT*/", text).replace("<!--TREE-->", tree).replace("/*TREECSS*/", css)

TOOLBAR = """<div class="toolbar"><div class="wrap">
  <span class="lbl">Evidence file:</span>
  <button class="btn primary" id="evOpen" title="The review-evidence.json the Secretariat keeps on its drive. It is read in your browser and never uploaded.">Open evidence file</button>
  <button class="btn" id="evClose" title="Forget the evidence file in this tab">Close it</button>
  <input type="file" id="evFile" accept=".json,application/json" hidden>
  <span class="lbl" style="margin-left:auto">Download:</span>
  <button class="btn" id="dlMails" title="Every email draft in one text file">Emails (.txt)</button>
  <button class="btn" id="dlDocx" title="The yearly report: decisions and reasons, in Word">Report (Word)</button>
  <button class="btn" id="dlXlsx" title="The yearly report as a workbook, one row per example">Report (Excel)</button>
  <button class="btn" id="dlJson" title="A backup of every decision shown here">Decisions (.json)</button>
  <label class="lbl" title="Saved with your decisions so colleagues see who reviewed what. Nothing else about you is recorded.">Your initials <input id="meInput" maxlength="12" size="4" style="font:inherit;padding:3px 6px;border:1px solid var(--line);border-radius:6px"></label>
</div></div>"""

if public:
    store = (here / "store_public.js").read_text(encoding="utf-8")
    report = (here.parent / "report" / "report_lib.js").read_text(encoding="utf-8")
    page = re.sub(r"  // @store-claude\n.*?  // @store-end\n", "", page, count=1, flags=re.S)
    page = re.sub(r"  // @actions-claude\n.*?  // @actions-end\n", "", page, count=1, flags=re.S)
    page = page.replace("/*STORE*/", store).replace("/*PUBLIC*/", "window.PUBLIC_PAGE = true;\n" + report)
    page = page.replace("<!--PUBLIC-TOOLBAR-->", TOOLBAR)
    page = page.replace("<title>GAIN Alignment Review</title>", "<title>GAIN 2026 alignment review</title>")
    page = page.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
    # the artifact host adds the document skeleton; the standalone page needs its own
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            + page.replace("</style>\n\n<header", "</style>\n</head>\n<body>\n<header", 1) + "\n</body>\n</html>\n")
    assert page.count("<body>") == 1 and page.count("</head>") == 1
    assert "claude.use" not in page, "the public page must not call the Claude store"
else:
    page = page.replace("/*STORE*/", "").replace("/*PUBLIC*/", "").replace("<!--PUBLIC-TOOLBAR-->", "")
out.write_text(page, encoding="utf-8")
print(("public" if public else "private") + " page ->", out)
