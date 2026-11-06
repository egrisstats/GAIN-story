# Task for Claude Code: add the alignment review to the GAIN monitoring dashboard

## Context

GAIN is the EGRISS Secretariat's annual survey on how statistical offices and organisations use the International Recommendations on Refugee Statistics (IRRS), on IDP Statistics (IRIS) and on Statelessness Statistics (IROSS). Always call them "recommendations", never "standards". Do not use en dashes in any text the dashboard shows or any email it drafts.

When a respondent says an example did **not** use the recommendations (PRO09 = 2) or **does not know** (PRO09 = 8, or PRO10 = Z in older rounds), the Secretariat reviews the example itself. If the evidence is clear, it **edits the answer and notifies** the respondent; back and forth rarely gets replies. A Don't know clears a lower bar than a No, and a No also needs a sign that the recommendations were actually used.

The dashboard already has a data quality view with a **duplicates** check. Add the alignment review **next to it**, as its own tab or panel, reading the same Kobo data.

## What is in this folder

| Path | What it is |
|---|---|
| `spec/decision_tree.json` | The rules: steps, reasons, kinds of example, criteria with points and paragraph references, thresholds, outcomes, fields to fill. **Single source of truth.** |
| `src/alignment_rules.py` | Reference implementation of the rules (standard library only). `decide(spec, answers)` returns outcome, score, path and fields. |
| `tests/hypothetical_cases.json`, `tests/test_rules.py` | 15 hypothetical cases with expected outcomes. Keep them passing; port them if you reimplement in R or JavaScript. |
| `spec/kobo_fields.md` | Which Kobo export columns feed which step, and the entry filter. |
| `templates/emails.md` | Email wording per outcome, and how PRO09, PRO10, PRO11, PRO12 and review_source are filled after an edit. |
| `prototype/decision_tree.html` | Interactive prototype of the tree (open in a browser). Use it as the reference for the reviewer screen. |
| `docs/*.png` | Screenshots of the prototype. |
| `reference/` | The earlier automated script and its method note. Useful for parsing the Kobo export and matching prior rounds; its scoring is **superseded** by the spec. |

## What to build

1. **Queue.** From the current Kobo data, list every example that enters the review (filter in `spec/kobo_fields.md`), grouped by organisation, next to the duplicates list. Show: organisation, example title, answer, reported source (PRO08), population (PRO07), description, partners, phase, and the organisation's answers for the same or similar examples in this submission and in prior rounds.
2. **Reviewer form per example**, following the prototype: step 1 yes/no, step 2 reason, step 3 kind (prefilled from PRO08, editable), step 4 yes/no, step 5 checklist for that kind with points and paragraph references. Show the score against the bar for the answer, and the outcome live.
3. **Pre-fill suggestions, never decisions.** Where the data allow, suggest ticks, and show why: for example the sign of use "same organisation reported use" from prior rounds or sibling examples, or "another framework" when the description names EU Regulation 862/2007. The reviewer confirms every tick.
4. **Save the decision** per example: answers, ticks, score, outcome, reviewer, date, note. Never overwrite PRO09; write the `review_*` and `*_reviewed` fields listed in `spec/decision_tree.json` under `recording`.
5. **Email drafts.** For each organisation with at least one `edit` or `outreach` outcome, draft one email from `templates/emails.md` that covers all its examples, citing the paragraphs of the ticked criteria. Drafts only; the Secretariat sends them.
6. **Summary.** Counts by outcome, and three figures side by side: use as reported, use after review, alignment (use plus `aligned`). Exclude Secretariat-filled PRO12 from any "elements used" table unless the respondent confirmed.

## Constraints

- Keep thresholds, points and criteria in `spec/decision_tree.json`; the dashboard reads them, so they can change without code changes.
- Respondent data stay where the dashboard keeps them. Do not commit Kobo exports or respondent details to this repository.
- The tests in `tests/` must pass against whatever implementation the dashboard uses.

## Open points to confirm with the Secretariat

- Thresholds are a first proposal: Don't know edited at 4 points, No at 7 including a sign of use, aligned from 4.
- Whether "the statistical office is involved in the design" should count for surveys run only by international organisations.
- Whether the census reason-for-migration question should stay optional.
