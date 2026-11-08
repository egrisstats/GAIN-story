"""The yearly alignment review workbook, from report.json (written by build_report.js).

    python3 alignment/report/build_xlsx.py <report.json> <out.xlsx>

Sheets: Summary (counts by formula from the Examples sheet), Examples (one row per example with the
reason for the decision), Contact (who gets an email and why), How we review.
"""
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

src, dst = sys.argv[1], sys.argv[2]
m = json.load(open(src, encoding="utf-8"))
rows = m["rows"]
F = "Arial"
NAVY, BAND = "1C2D5A", "EFF7FF"
head = Font(name=F, bold=True, color="FFFFFF")
headfill = PatternFill("solid", fgColor=NAVY)
body = Font(name=F, size=10)
wrap = Alignment(wrap_text=True, vertical="top")
thin = Border(bottom=Side(style="thin", color="DDE4EF"))

wb = Workbook()

# ---------- Examples ----------
ex = wb.active
ex.title = "Examples"
cols = [("Organisation", 28), ("Country", 16), ("Region", 14), ("Example", 46), ("Kind of example", 20), ("They answered", 13),
        ("Outcome", 30), ("Recommendations", 15), ("Strong items found", 11), ("Not found", 9), ("Can't tell", 9), ("Seen in", 22),
        ("Similar examples that used them", 14), ("Online", 16), ("Documents read", 10), ("What the documents show", 60),
        ("Same organisation before", 24), ("Same country before", 26), ("Paragraphs cited", 30), ("Official wording quoted", 16),
        ("Email", 14), ("Reviewed on", 12), ("Reviewer note", 26), ("Why we decided this", 90)]
for i, (name, w) in enumerate(cols, 1):
    c = ex.cell(row=1, column=i, value=name)
    c.font, c.fill, c.alignment = head, headfill, Alignment(wrap_text=True, vertical="center")
    ex.column_dimensions[get_column_letter(i)].width = w
for r, x in enumerate(rows, 2):
    vals = [x["organisation"], x["country"], x.get("region", ""), x["title"], x.get("kind", ""), x["answer"], x["outcome_label"],
            x.get("recommendations", ""), x.get("strong", ""), x.get("not_found", ""), x.get("cant_tell", ""), x.get("seen_in", ""),
            x.get("similar", ""), x.get("web", ""), x.get("docs_read", ""), x.get("online", ""), x.get("org_before", ""), x.get("country_before", ""), x.get("paragraphs", ""), x.get("quoted", ""), x.get("email", ""),
            x.get("reviewed_on", ""), x.get("note", ""), x.get("why", "")]
    for i, v in enumerate(vals, 1):
        c = ex.cell(row=r, column=i, value=v if v != "" else None)
        c.font, c.alignment, c.border = body, wrap, thin
n = len(rows) + 1
ex.freeze_panes = "E2"
ex.row_dimensions[1].height = 32
if rows:
    t = Table(displayName="Examples", ref=f"A1:{get_column_letter(len(cols))}{n}")
    t.tableStyleInfo = TableStyleInfo(name="TableStyleLight9", showRowStripes=True)
    ex.add_table(t)

# ---------- Summary (formulas over the Examples sheet) ----------
su = wb.create_sheet("Summary", 0)
su.column_dimensions["A"].width = 44
su.column_dimensions["B"].width = 14
su.column_dimensions["C"].width = 70
su["A1"] = m["title"]
su["A1"].font = Font(name=F, bold=True, size=16, color=NAVY)
su["A2"] = f"Made on {m['made_on']}" + (f" · queue taken from Kobo on {m['queue_pulled_at'][:10]}" if m.get("queue_pulled_at") else "") + (f" · web check on {m['web_checked_on']}" if m.get("web_checked_on") else "")
su["A2"].font = Font(name=F, size=10, color="5F6B87")
G = "Examples!$G$2:$G$" + str(max(n, 2))
H = "Examples!$H$2:$H$" + str(max(n, 2))
Fc = "Examples!$F$2:$F$" + str(max(n, 2))
Q = "Examples!$U$2:$U$" + str(max(n, 2))
P = "Examples!$T$2:$T$" + str(max(n, 2))
lines = [
    ("GAIN 2026 examples", m.get("examples_2026"), "Input: all GAIN 2026 examples in the Kobo pull (source: review queue, meta/run)."),
    ("In the review (said No or Don't know)", f"=COUNTA(Examples!$D$2:$D${max(n, 2)})", "Every row of the Examples sheet."),
    ("Reviewed", '=B5-B7', ""),
    ("To review", f'=COUNTIF({G},"To review")', ""),
    (None, None, None),
    ("Outcome", None, None),
    ("Count as using · tell them", f'=COUNTIF({G},"Count as using · tell them")', "Recorded as using the recommendation; the organisation is told what changed and why."),
    ("Aligned · not counted as use", f'=COUNTIF({G},"Aligned · not counted as use")', "Counts in the alignment figure, not in use."),
    ("Keep their answer · send the recommendations", f'=COUNTIF({G},"Keep their answer · send the recommendations")', "Awareness gap: the Secretariat sends the recommendations."),
    ("Keep their answer", f'=COUNTIF({G},"Keep their answer")', "Too little evidence either way."),
    ("Keep · they chose not to use them", f'=COUNTIF({G},"Keep · they chose not to use them")', ""),
    ("Keep · no matching groups", f'=COUNTIF({G},"Keep · no matching groups")', ""),
    ("Keep · not statistics (check if valid)", f'=COUNTIF({G},"Keep · not statistics (check if valid)")', "Flagged for the validity check."),
    (None, None, None),
    ("Use of the recommendations", None, None),
    ("Using, as they told us", "=IF(B4=\"\",\"\",(B4-B5)/B4)", "Examples outside this review named a recommendation."),
    ("Using, after our review", "=IF(B4=\"\",\"\",(B4-B5+B10)/B4)", "Adds the examples counted as using."),
    ("Using or aligned", "=IF(B4=\"\",\"\",(B4-B5+B10+B11)/B4)", "Adds the aligned examples."),
    (None, None, None),
    ("By what they answered", None, None),
    ("Said: not used", f'=COUNTIF({Fc},"Not used")', ""),
    ("Said: don't know", f'=COUNTIF({Fc},"Don’t know")', ""),
    (None, None, None),
    ("Recommendations recorded", None, None),
    ("IRRS", f'=COUNTIF({H},"*IRRS*")', "Examples recorded against the IRRS (any outcome)."),
    ("IRIS", f'=COUNTIF({H},"*IRIS*")', ""),
    ("IROSS", f'=COUNTIF({H},"*IROSS*")', ""),
    (None, None, None),
    ("Emails", None, None),
    ("To send", f'=COUNTIF({Q},"To send")', ""),
    ("Sent", f'=COUNTIF({Q},"Sent*")', ""),
    ("Emails quoting the official wording", f'=COUNTIF({P},"Yes")+COUNTIF({P},"Some*")', "Paragraph wording comes from alignment/spec/excerpts.json."),
]
for i, (a, b, c) in enumerate(lines, 4):
    if a is None:
        continue
    su.cell(row=i, column=1, value=a).font = Font(name=F, bold=b is None, color=NAVY if b is None else "000000")
    if b is not None:
        cb = su.cell(row=i, column=2, value=b)
        cb.font = Font(name=F, color="0000FF" if not str(b).startswith("=") else "000000")
        if a.startswith("Using"):
            cb.number_format = "0%"
    if c:
        su.cell(row=i, column=3, value=c).font = Font(name=F, size=9, color="5F6B87")
for r_ in range(4, 4 + len(lines)):
    if su.cell(row=r_, column=2).value is not None and not str(su.cell(row=r_, column=2).value).startswith("="):
        su.cell(row=r_, column=2).fill = PatternFill("solid", fgColor="FFFF00")

# ---------- Contact ----------
co = wb.create_sheet("Contact")
ccols = [("Organisation", 30), ("Example", 50), ("Why we contact them", 50), ("Recommendations", 16), ("Paragraphs cited", 32), ("Official wording quoted", 16), ("Email", 14)]
for i, (name, w) in enumerate(ccols, 1):
    c = co.cell(row=1, column=i, value=name)
    c.font, c.fill = head, headfill
    co.column_dimensions[get_column_letter(i)].width = w
crow = 2
for x in rows:
    if x["outcome"] not in ("edit", "outreach"):
        continue
    why = ("To tell them we count it as using the " + x.get("recommendations", "")) if x["outcome"] == "edit" else ("To send them the " + (x.get("recommendations") or "recommendations") + " (awareness gap)")
    for i, v in enumerate([x["organisation"], x["title"], why, x.get("recommendations", ""), x.get("paragraphs", ""), x.get("quoted", ""), x.get("email", "")], 1):
        c = co.cell(row=crow, column=i, value=v or None)
        c.font, c.alignment = body, wrap
    crow += 1
if crow == 2:
    co.cell(row=2, column=1, value="No organisation to contact yet.").font = body

# ---------- How we review ----------
hw = wb.create_sheet("How we review")
hw.column_dimensions["A"].width = 120
t = m["thresholds"]
text = [
    ("How we review", True),
    ("1. Three quick questions: is it about producing statistics; do they say why they did not use the recommendations; which groups does it cover. A no, or a stated reason, ends the review there.", False),
    ("2. A checklist for the kind of example: each item is marked found, not found or can't tell, with where it was seen (their description, public web pages, a similar GAIN example).", False),
    ("3. The rule: strong items are markers of the recommendations' approach and signs they already use them; good practice items count half. For a don't know answer two strong items are enough; for a not used answer we ask for more, including a sign they already use them. Below that bar, some evidence is recorded as aligned.", False),
    (f"Thresholds in the spec (version {m['spec_version']}): don't know {t['dk']} points, not used {t['no']} points with a sign of use, aligned from {t['aligned_min']} points. Strong items 2 points, good practice 1.", False),
    ("4. Emails list the items found and the paragraphs they match, quoting the official wording where it has been added. The respondent's own answer is never overwritten and they can ask us to restore it.", False),
    ("Suggestions on the review page are hints; every decision is a reviewer's.", False),
]
for i, (s, b) in enumerate(text, 1):
    c = hw.cell(row=i, column=1, value=s)
    c.font = Font(name=F, bold=b, size=14 if b else 10, color=NAVY if b else "000000")
    c.alignment = wrap

wb.save(dst)
print("wrote", dst)
