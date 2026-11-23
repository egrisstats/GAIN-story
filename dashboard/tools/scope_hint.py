"""Hint: an institution-led example that may fall outside GAIN.

GAIN collects work that produces, or helps a state produce, official statistics on refugees, IDPs and
stateless people. An organisation's own operational data (needs assessments, programme monitoring,
service delivery) with no national statistics office or government involved may not belong.

This only raises a hint for the Secretariat to check; it never removes or decides anything. The
description and partners are read here when the caller has them, but nothing from them is written out:
the public feed gets a code and a reason built from this file's own words.

    tag(rows, private)   rows: the feed's rows; private: {id(row): "description and partners"} or None
"""
import re

# UN system, regional and intergovernmental bodies, and EGRISS-linked centres: anything else is treated
# as civil society, an NGO or academia
IGO = re.compile(
    r"united nations|\bUN[- ]?[A-Z]{2,}|world bank|international organization for migration|\bIOM\b|"
    r"international labour|eurostat|european (commission|institute|union)|intergovernmental|\bIGAD\b|\bCOMESA\b|"
    r"\bECOWAS\b|economic community|common market|african union|\bSTATAFRIC\b|\bSESRIC\b|\bCENTROESTAD\b|"
    r"commission on statistics|world health|world food|development bank|\bOECD\b|east african community|"
    r"joint idp profiling|\bJIPS\b|internal displacement monitoring|\bIDMC\b|joint data cent", re.I)
# a state actor or official statistics named
STATE = re.compile(
    r"statistic(al)? (office|agency|bureau|authority|institute|service|department|committee|system)|"
    r"(bureau|office|institute|department|agency|directorate|committee|service) (of|for) (national )?statistics|"
    r"\bNSOs?\b|\bNSS\b|national statistic|official statistics|statistics (south|norway|sweden|denmark|canada)|"
    r"institut(o)? na[ct]ional (de |d')?(la |e )?(statisti|estad)|\bINE\b|\bINS\b|\bINSTAT\b|\bINSEED\b|\bANSD\b|"
    r"\bcensus\b|recensement|\bcenso\b|\bministr|\bminist[eè]re|\bministerio|government|gouvernement|gobierno|"
    r"national (authorit|commission|bureau|registr)|civil registr", re.I)
# an organisation's own operational data or programme delivery
OPER = [
    (r"\bMSNA\b|multi[- ]sector(al)? needs assessment|needs assessment|rapid assessment|whole of \w+ assessment", "a needs assessment"),
    (r"\bDTM\b|displacement tracking", "displacement tracking"),
    (r"protection monitoring|post[- ]return monitoring|reintegration monitoring|post[- ]distribution monitoring|border monitoring", "programme or protection monitoring"),
    (r"intentions? survey", "an intention survey"),
    (r"participatory assessment|profiling and follow[- ]up|beneficiar", "an assessment of the organisation's own programme"),
    (r"cash assistance|life[- ]s?a?ving|\bGBV\b|\bFGM\b|\bEORE\b|childcare|medical care|inser[ct]i[oó]n sociolaboral", "service delivery, not statistics"),
]
OPER = [(re.compile(p, re.I), why) for p, why in OPER]


def hint(row, text=None):
    """(code, reason) or ("", ""). text: description and partners when the caller has them, else None."""
    if row.get("kind") != "example" or not str(row.get("lead", "")).lower().startswith("inst"):
        return "", ""
    org, title = row.get("organisation", ""), row.get("title", "")
    seen = title + " " + (text or "")
    where = "the title, description or partners" if text is not None else "the title"
    state = bool(STATE.search(seen))
    oper = next((why for rx, why in OPER if rx.search(title)), None) or next((why for rx, why in OPER if text and rx.search(text)), None)
    ngo = not IGO.search(org)
    if state:
        return "", ""
    if ngo and oper:
        return "ngo-oper", f"NGO, civil society or academia; reads as {oper}; no statistics office or government named in {where}"
    if ngo:
        return "ngo", f"NGO, civil society or academia; no statistics office or government named in {where}"
    if oper:
        return "oper", f"Reads as {oper}; no statistics office or government named in {where}"
    return "", ""


def tag(rows, private=None):
    n = 0
    for r in rows:
        code, why = hint(r, None if private is None else private.get(id(r), ""))
        r["scope_hint"], r["scope_reason"] = code, why
        n += bool(code)
    return n
