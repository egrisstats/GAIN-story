"""
GAIN alignment review: classifies every example whose answer on the use of
EGRISS recommendations is "None" or "Don't know", and proposes an action.

Usage
    python3 gain_alignment_review.py <kobo_export.xlsx> [prior_years_group_roster.csv] [output.xlsx]

    kobo_export.xlsx   Kobo export, XLS, "Labels" + "Include groups in headers" off or on (labels are cleaned)
    prior_years_...    analysis_ready_group_roster.csv from the previous cycle (all years); optional
    output.xlsx        default: GAIN_alignment_review_<today>.xlsx next to the export

Steps (see README):
    0 Scope        answer is None / Don't know (named answers are only checked for scope)
    1 Applicable   is this a statistics example at all, or programme delivery?
    2 Markers      alignment evidence in the answers (data source, comparison with nationals,
                   identification questions, description keywords)
    3 Signals      evidence of USE from outside the answer (previous years, inconsistency
                   within the submission, partners, awareness of the recommendation, mentions)
    4 Route        Propose change / Ask / Aligned, use not reported / No stands / Not applicable
Every route is a proposal. A reviewer confirms it in the "Reviewer decision" column.
"""
import re, sys, unicodedata, datetime
from difflib import SequenceMatcher
import warnings
import pandas as pd
warnings.simplefilter("ignore")

# ---------------------------------------------------------------- rulebook
# Paragraph numbers checked against: IRRS (March 2018), IRIS (2020), IROSS (2023).
RULEBOOK = [
    # code, rec, topic, paragraphs, what it covers
    ("IRRS-FW",  "IRRS",  "Statistical framework, populations", "88, 91-92, Figure 3.1",
     "Persons in need of international protection: asylum seekers, refugees, complementary/subsidiary and temporary protection, refugee-like (para 91); returned refugees (para 97)."),
    ("IRRS-VAR", "IRRS",  "Classificatory variables and basic counts", "113-114",
     "Core variables (age, sex, country of birth, citizenship, legal status) and counts of each population category."),
    ("IRRS-CEN", "IRRS",  "Census", "129-133, 155",
     "Core census questions (country of birth, citizenship, year of arrival, reason for migration) and actions to improve census coverage."),
    ("IRRS-SUR", "IRRS",  "Household surveys", "134, 161-164, 177",
     "Core survey identification questions (para 134); refugee survey challenges and hard-to-reach sampling."),
    ("IRRS-ADM", "IRRS",  "Administrative data and registers", "197, 204, 214",
     "Types of administrative sources incl. registers of foreign citizens (197); quality (204); maximise databases where refugees can be identified (214)."),
    ("IRRS-INT", "IRRS",  "Data integration and linkage", "242-246, 279",
     "Record linkage and statistical matching of registers and surveys; what NSOs need to run integration projects."),
    ("IRRS-CMP", "IRRS",  "Comparison with host population", "303, 406, 454",
     "Benchmark host or general population to compare refugee living conditions and integration."),
    ("IRRS-COO", "IRRS",  "Coordination, national and regional", "502, 520, 609",
     "Regional organisations (502); role of the NSO in the national statistical system (520); strengthening systems, incl. training (609)."),
    ("IRIS-FW",  "IRIS",  "Statistical framework, IDP definition", "74-75, 105",
     "IDPs and IDP-related populations (74-75); causing events incl. conflict, violence, human rights violations and disasters (105)."),
    ("IRIS-DIS", "IRIS",  "Disaster displacement", "52-53, 105 (iv)",
     "Disasters as a cause of internal displacement, sudden and slow onset."),
    ("IRIS-COL", "IRIS",  "Colombia, Single Victims Registry", "49",
     "IRIS cites the Colombian Victims' Law and the Single Victims Registry (RUV) as a national IDP definition and source."),
    ("IRIS-CEN", "IRIS",  "Census", "202-211",
     "Census questions to identify IDPs and their limits."),
    ("IRIS-SUR", "IRIS",  "Household surveys", "222-229",
     "Including IDPs in national surveys or specialised IDP surveys; comparison with the general population (223); sampling frames."),
    ("IRIS-ADM", "IRIS",  "Administrative data and IDP registers", "245-258, 263",
     "IDP-specific registers (253-256); maximise databases where IDPs can be identified (258); data exchange (263)."),
    ("IRIS-INT", "IRIS",  "Data integration", "283-290",
     "Combining sources; deterministic and name-based linkage."),
    ("IRIS-COO", "IRIS",  "Coordination", "306-310, 343-345, 369",
     "National coordination of IDP statistics; use existing coordination mechanisms (344); mainstream IDP statistics into regular statistics (369)."),
    ("IROSS-FW", "IROSS", "Statistical framework", "57, 65",
     "Persons with recognised stateless status and persons without a recognised nationality status."),
    ("IROSS-CEN","IROSS", "Census", "151-157",
     "Identifying stateless persons through the citizenship question."),
    ("IROSS-SUR","IROSS", "Sample surveys", "195-200",
     "Surveys to validate stocks and describe characteristics of stateless populations."),
    ("IROSS-ADM","IROSS", "Administrative data", "214-219, 231-234",
     "Reuse of administrative data; statelessness determination procedure registers (231); linking registers (234)."),
    ("IROSS-CAP","IROSS", "Training and capacity", "370",
     "Training programmes for statistical personnel."),
]
RB = {r[0]: r for r in RULEBOOK}

EGRISS_PARTNERS = r"UNHCR|ACNUR|HCR\b|IOM\b|OIM\b|WORLD BANK|BANCO MUNDIAL|BANQUE MONDIALE|JIPS|EUROSTAT|UNSD|UNFPA|UNICEF|IDMC|STATAFRIC|ESCWA|ESCAP|UNECE|ECLAC|CEPAL|\bECA\b|OCHA|UNDP|PNUD|WFP|ILO\b|OIT\b"

KW = {
    "refugee": r"refug|asyl|asilo|réfugi|protection internationale|international protection|protecci[oó]n internacional|temporary protection|protecci[oó]n temporal|PPT\b|beschutz|ukrain|لاجئ|беженц",
    "idp":     r"\bIDP|internally displaced|desplaz|déplac|v[ií]ctimas|RUV\b|damnificad|sismo|earthquake|disaster|desastre|نازح|переселен",
    "stateless": r"stateless|apatrid|sin nacionalidad|sans nationalit|عديم|без гражданства",
    "statistics": r"statisti|estad[ií]stic|registr|register|census|censo|recensement|survey|encuesta|enqu[eê]te|indicator|indicador|data|datos|donn[ée]es|إحصاء|статист",
    "mention": r"EGRISS|IRRS|IRIS\b|IROSS|international recommendations|recomendaciones internacionales|recommandations internationales",
    "explicit_no": r"not (been )?(explicitly )?(applied|used)|were not (explicitly )?(applied|used)|no se (utiliz|aplic)|n'ont pas [ée]t[ée] (utilis|appliqu)|concepts .{0,40}n'ont pas",
    "programme": r"\bcash\b|assistance|awareness|EORE|\bGBV\b|FGM|CEFM|medical|child protection|case management|livelihood|distribution|response to|asistencia humanitaria|sensibilisation",
}
STAT_SOURCES = r"survey|census|administrative|integration|encuesta|censo|administrativ|integraci|enqu|recensement"
CAP_SOURCES = r"workshop|training|guidance|toolkit|strategy|taller|capacita|gu[ií]a|estrategia|atelier|formation|strat[ée]gie"


def clean(c):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", str(c))).strip()


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().upper()
    return re.sub(r"[^A-Z0-9 ()]", " ", s)


def acronym(s):
    m = re.search(r"\(([A-Z]{2,10})\)", norm(s))
    return m.group(1) if m else None


def find(cols, pattern, exclude=None):
    for c in cols:
        if re.search(pattern, c, re.I) and not (exclude and re.search(exclude, c, re.I)):
            return c
    return None


def has(pattern, *texts):
    return any(re.search(pattern, str(t), re.I) for t in texts if isinstance(t, str))


def same_org(a, b):
    if not isinstance(a, str) or not isinstance(b, str):
        return False
    aa, ab = acronym(a), acronym(b)
    if aa and ab and aa == ab:
        return True
    return SequenceMatcher(None, norm(a), norm(b)).ratio() > 0.8


def load(export):
    main = pd.read_excel(export, sheet_name=0)
    main.columns = [clean(c) for c in main.columns]
    g = pd.read_excel(export, sheet_name="group_roster")
    g.columns = [clean(c) for c in g.columns]
    c = list(g.columns)
    col = {
        "title": "_PRO02A",
        "pop": "_PRO07" if "_PRO07" in c else find(c, r"Which of these populations is"),
        "source": "PRO08_label" if "PRO08_label" in c else find(c, r"main data source"),
        "national": find(c, r"cover only .* or the national population"),
        "rec": find(c, r"^Which recommendations developed within EGRISS have you included in your \$\{_PRO02A_short\}\?$"),
        "desc": find(c, r"^Please provide a short description of the"),
        "idq": find(c, r"^Does your organization use identification questions"),
        "phase": find(c, r"^In which phase of implementation"),
        "partners": find(c, r"^Please list partners that were involved"),
        "sub": "_submission__id",
    }
    g = g.copy()
    g["_org"] = g[col["sub"]].map(main.set_index("_id")["organization"])
    act = "_ACT04_list" if "_ACT04_list" in main.columns else None
    g["_act04"] = g[col["sub"]].map(main.set_index("_id")[act]) if act else None
    return g, col


def which_recs(row, col):
    """Recommendation(s) that would apply: from the population answer, else from the description."""
    pop, desc = str(row[col["pop"]]), str(row[col["desc"]]) + " " + str(row[col["title"]])
    out = []
    if has(r"refug|asyl|réfugi|لاجئ|беженц", pop): out.append("IRRS")
    if has(r"\bIDP|PDI|desplaz|déplac|نازح|переселен", pop): out.append("IRIS")
    if has(r"stateless|apatrid|عديم|без гражданства", pop): out.append("IROSS")
    if not out:
        for rec, k in (("IRRS", "refugee"), ("IRIS", "idp"), ("IROSS", "stateless")):
            if has(KW[k], desc): out.append(rec)
    return out


def refs_for(recs, row, col):
    src, desc, title = str(row[col["source"]]), str(row[col["desc"]]), str(row[col["title"]])
    if has(r"training|course|workshop|webinar|taller|curso|capacita|formation|atelier|meeting|reuni[oó]n", title):
        src = "Workshop/training"          # capacity examples are often coded with the topic's data source
    codes = []
    for r in recs:
        codes.append(f"{r}-FW")
        if r == "IRIS" and has(r"RUV\b|Registro [ÚU]nico de V[ií]ctimas", title):
            codes.append("IRIS-COL")
        if r == "IRIS" and has(r"disaster|desastre|sismo|earthquake|damnificad|flood|inondation", desc):
            codes.append("IRIS-DIS")
        if has(r"census|censo|recensement", src):
            codes.append(f"{r}-CEN")
        elif has(r"survey|encuesta|enqu", src):
            codes.append(f"{r}-SUR")
            if r == "IRRS" and has(r"national population as well", str(row[col["national"]])):
                codes.append("IRRS-CMP")
        elif has(r"integrat|integraci", src):
            codes += [f"{r}-ADM"] + ([f"{r}-INT"] if f"{r}-INT" in RB else [])
        elif has(r"administrativ", src):
            codes.append(f"{r}-ADM")
        elif has(CAP_SOURCES, src):
            codes.append({"IRRS": "IRRS-COO", "IRIS": "IRIS-COO", "IROSS": "IROSS-CAP"}[r])
    codes = [x for x in dict.fromkeys(codes) if x in RB]
    return codes, "; ".join(f"{RB[x][1]} paras {RB[x][3]} ({RB[x][2].lower()})" for x in codes)


def prior_lookup(prior, org, title):
    """Return (any_yes_for_org, same_example_answer)."""
    if prior is None or not isinstance(org, str):
        return False, None
    p = prior[prior["morganization"].apply(lambda o: same_org(o, org))]
    if p.empty:
        return False, None
    any_yes = (p["PRO09"] == 1).any()
    t = norm(str(title).replace("+", " "))
    p = p.assign(_sim=p["PRO02A"].apply(lambda x: SequenceMatcher(None, t, norm(x)).ratio()))
    m = p[p["_sim"] > 0.6].sort_values("year")
    if m.empty:
        return any_yes, None
    ans = m.iloc[-1]["PRO09"]          # most recent year the same example was reported
    label = {1: "Yes", 2: "No", 8: "Don't know"}.get(ans, "?")
    return any_yes, f"{label} ({int(m.iloc[-1]['year'])})"


def review(export, prior_csv=None):
    g, col = load(export)
    prior = None
    if prior_csv:
        prior = pd.read_csv(prior_csv, low_memory=False)
        prior = prior[prior["year"] < prior["year"].max() + 1]
    rows = []
    for i, r in g.iterrows():
        ans = str(r[col["rec"]])
        named = [x for x in ("IRRS", "IRIS", "IROSS") if re.search(rf"\b{x}\b", ans)]
        status = "Named" if named else ("Don't know" if "know" in ans else "None used")
        desc, src, title = str(r[col["desc"]]), str(r[col["source"]]), str(r[col["title"]]).replace("+", " ")
        recs = which_recs(r, col)

        # Step 1, applicability
        programme = has(KW["programme"], desc, title) and not has(r"census|censo|statisti|estad", desc, title)
        stat_src = has(STAT_SOURCES, src)
        cap_src = has(CAP_SOURCES, src)

        # Step 2, markers
        m = {
            "M1 statistical source or statistics capacity topic": stat_src or (cap_src and has(KW["statistics"], desc, title)),
            "M2 compares with national population": has(r"national population as well", str(r[col["national"]])),
            "M3 identification questions used": str(r[col["idq"]]).startswith("Yes"),
            "M4 description names the population categories": bool(recs) and has(KW["refugee"] + "|" + KW["idp"] + "|" + KW["stateless"], desc, title),
        }
        n_markers = sum(m.values())

        # Step 3, signals
        any_yes, same_ex = prior_lookup(prior, r["_org"], title)
        siblings = g[(g[col["sub"]] == r[col["sub"]]) & (g.index != i)]
        inconsistent = any(re.search(r"IRRS|IRIS|IROSS", str(s[col["rec"]])) and str(s[col["source"]]) == src
                           for _, s in siblings.iterrows())
        aware = [x for x in recs if re.search(rf"\b{x}\b", str(r["_act04"]))]
        partners = has(EGRISS_PARTNERS, str(r[col["partners"]]).upper()) if col["partners"] else False
        strong = {
            "S1 same example reported as using recommendations before": str(same_ex).startswith("Yes"),
            "S2 other examples in this submission, same source, name a recommendation": inconsistent,
            "S3 description mentions EGRISS or the recommendations": has(KW["mention"], desc),
        }
        weak = {
            "S4 organisation reported use in a previous year": any_yes,
            "S5 respondent knows the relevant recommendation (ACT04)": bool(aware),
            "S6 EGRISS member listed as partner": partners,
        }
        n_strong, n_weak = sum(strong.values()), sum(weak.values())
        planned = has(r"plan|prepar|not started|under preparation", str(r[col["phase"]]), desc[:200])

        # Step 4, route
        if status == "Named":
            route = "Reported use" + (" (check scope: programme example?)" if programme else "")
        elif has(KW["explicit_no"], desc):
            route = "No stands (respondent explains)"
        elif programme:
            route = "Not applicable (programme delivery, confirm)"
        elif n_strong >= 1 or n_weak >= 2:
            route = "Propose change (opt-out)" if (n_markers >= 2 and not planned) else "Ask (question)"
        elif n_markers >= 2:
            route = "Notify alignment (use answer kept)"
        else:
            route = "Not aligned"

        # Secretariat-assessed alignment, reported alongside use and never replacing it
        if status == "Named":
            alignment = "Used (reported)" if not programme else "Used (reported), check scope"
        elif route.startswith("Propose") or route.startswith("Ask"):
            alignment = "Aligned, use to confirm"
        elif route.startswith("Notify"):
            alignment = "Aligned, use not reported"
        elif route.startswith("No stands"):
            alignment = "Respondent explains not applied"
        elif route.startswith("Not applicable"):
            alignment = "Not applicable"
        else:
            alignment = "Not aligned"

        codes, ref_text = refs_for(recs, r, col) if status != "Named" else ([], "")
        rows.append({
            "Organisation": r["_org"], "Example": title[:200], "Population": r[col["pop"]], "Source": src,
            "Phase": r[col["phase"]], "Reported answer": ans, "Status": status,
            **{k: "x" if v else "" for k, v in m.items()}, "Markers (0-4)": n_markers,
            **{k: "x" if v else "" for k, v in strong.items()}, **{k: "x" if v else "" for k, v in weak.items()},
            "Prior answer, same example": same_ex or "", "Strong signals": n_strong, "Weak signals": n_weak,
            "Proposed route": route, "Alignment (assessed)": alignment,
            "Recommendation(s) that would apply": " ".join(recs) if status != "Named" else "",
            "Touch points (paragraphs)": ref_text,
            "Description": desc[:600],
            "Reviewer decision": "", "PRO09_reviewed": "", "review_reason": "", "review_source": "",
            "Contacted on": "", "Reply": "", "Closed on": "",
            "_submission__id": r[col["sub"]], "_index": r.get("_index"),
        })
    return pd.DataFrame(rows)


def summary(df):
    s1 = df["Status"].value_counts().rename_axis("Reported answer").reset_index(name="Examples")
    s2 = df[df["Status"] != "Named"]["Proposed route"].value_counts().rename_axis("Route (None / Don't know)").reset_index(name="Examples")
    n = len(df)
    named = (df["Status"] == "Named").sum()
    prop = (df["Proposed route"] == "Propose change (opt-out)").sum()
    ask = (df["Proposed route"] == "Ask (question)").sum()
    aligned = df["Alignment (assessed)"].str.startswith(("Used", "Aligned")).sum()
    vals = [named, named + prop, named + prop + ask, aligned]
    s3 = pd.DataFrame({
        "Indicator": ["Use, reported today", "Use, if every 'Propose change' is accepted",
                      "Use, if 'Ask' cases also confirm", "Aligned with the recommendations (used + assessed)"],
        "Examples": vals,
        "Share of all examples": [f"{v/n:.0%}" for v in vals],
    })
    return s1, s2, s3


def fmt(path):
    """Header style, widths, filters and route colours, so the file is readable in Excel."""
    from openpyxl import load_workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    wb = load_workbook(path)
    ws = wb["Cases"]
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="3B71B3")
        c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes, ws.auto_filter.ref = "C2", ws.dimensions
    ws.row_dimensions[1].height = 75
    wide = {"Organisation": 30, "Example": 45, "Touch points (paragraphs)": 60, "Description": 60,
            "Proposed route": 30, "Alignment (assessed)": 26, "Reported answer": 24}
    for c in ws[1]:
        ws.column_dimensions[c.column_letter].width = wide.get(c.value, 12)
    colours = {"Propose": "D9EAD3", "Ask": "FFF2CC", "Notify": "DEEAF6"}
    rcol = [c.column for c in ws[1] if c.value == "Proposed route"][0]
    for row in ws.iter_rows(min_row=2):
        for key, colour in colours.items():
            if str(row[rcol - 1].value).startswith(key):
                for c in row[:rcol + 1]:
                    c.fill = PatternFill("solid", fgColor=colour)
    for name, w in (("Summary", 48), ("Rulebook", 22)):
        for col in wb[name].columns:
            wb[name].column_dimensions[col[0].column_letter].width = w
    wb["Rulebook"].column_dimensions["E"].width = 100
    wb["Summary"]["A1"] = "GAIN alignment review"
    wb["Summary"]["A1"].font = Font(bold=True, size=13)
    wb.save(path)


if __name__ == "__main__":
    export = sys.argv[1]
    prior = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2].endswith(".csv") else None
    out = sys.argv[-1] if sys.argv[-1].endswith(".xlsx") and sys.argv[-1] != export else \
        re.sub(r"[^/\\]+$", f"GAIN_alignment_review_{datetime.date.today():%Y%m%d}.xlsx", export)
    df = review(export, prior)
    s1, s2, s3 = summary(df)
    rb = pd.DataFrame(RULEBOOK, columns=["Code", "Recommendation", "Topic", "Paragraphs", "What it covers"])
    with pd.ExcelWriter(out, engine="openpyxl") as w:
        s1.to_excel(w, sheet_name="Summary", index=False, startrow=1)
        s2.to_excel(w, sheet_name="Summary", index=False, startrow=len(s1) + 4)
        s3.to_excel(w, sheet_name="Summary", index=False, startrow=len(s1) + len(s2) + 7)
        df.sort_values(["Status", "Proposed route", "Organisation"]).to_excel(w, sheet_name="Cases", index=False)
        rb.to_excel(w, sheet_name="Rulebook", index=False)
    fmt(out)
    print(f"{len(df)} examples, written to {out}")
    print(s1.to_string(index=False)); print(s2.to_string(index=False)); print(s3.to_string(index=False))
