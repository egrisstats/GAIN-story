# GAIN alignment review

How the EGRISS Secretariat reviews GAIN examples where the respondent says the recommendations (IRRS, IRIS, IROSS) were not used, or does not know, and decides whether to edit the answer and notify the respondent.

![Decision tree, a No for a survey](docs/tree_no_survey.png)

## The tree

1. **About producing statistics?** No: keep the answer, flag for the validity check.
2. **What reason do they give?** None or another framework: continue (another framework adds 1 point). Does not know the recommendations: keep the answer, send outreach. Deliberately not applied: keep the answer.
3. **Kind of example:** register, survey, census, data integration, strategy, guidance, non-traditional source, or event.
4. **Can the populations be told apart as recommendation categories?** No: keep the answer.
5. **Score the evidence:** distinctive markers of the recommendations (2 points each), good practice for the kind of source (1 point each), signs of use (2 points each).

| Answer | Edit and notify | Otherwise |
|---|---|---|
| Don't know (PRO09 = 8) or PRO10 = Z | 4 points or more | keep the answer |
| No (PRO09 = 2) | 7 points or more, including a sign of use | 4 or more: keep, record as aligned; under 4: keep |

The rules are in [`spec/decision_tree.json`](spec/decision_tree.json), implemented in [`src/alignment_rules.py`](src/alignment_rules.py) and tested on hypothetical cases in [`tests/`](tests). Open [`prototype/decision_tree.html`](prototype/decision_tree.html) in a browser to walk through it.

## Run the tests

```
python3 tests/test_rules.py
```

## Try one example

```
python3 src/alignment_rules.py '{"answer":"no","q1":true,"q2":"none","kind":"admin","q4":true,"ticks":["d0","d1","p1","l0"],"populations":"R"}'
```

## Paragraph references

From the International Recommendations on Refugee Statistics (2018), on IDP Statistics (2020) and on Statelessness Statistics (2023). Each criterion in the spec carries its paragraphs.

## Data

No respondent data are kept here. The dashboard reads the GAIN Kobo export and prior rounds; see [`spec/kobo_fields.md`](spec/kobo_fields.md).

## The review page for colleagues (no sign-in)

The standalone review page is published with the tracker at `dashboard/review/` on GitHub Pages. It is built
by the publish workflow from [`review/review.html`](review/review.html) with `review/build.py --public`,
and reads two files the workflow writes from Kobo every 15 minutes with `dashboard/tools/review_sync.py`:

| File | What it holds |
|---|---|
| `dashboard/data/review_queue.json` | every example that said No or Don't know: titles, organisations, select answers, region, kind, similar examples and history. Never descriptions, partners or web findings. |
| `dashboard/data/review_decisions.json` | the decisions saved through the Kobo review form, one current decision per example |

**Evidence file.** The descriptions and what was found online never go online. The Secretariat makes one file,
keeps it on its own drive, and reviewers open it on the page (it stays in their browser):

```
KOBO_TOKEN=... python3 dashboard/tools/review_sync.py evidence ~/Desktop/review-evidence.json [research.json] [documents.json]
```

**Saving.** The page saves through a Kobo form (`alignment/spec/review_form.json`, made once with
`dashboard/tools/review_form.py`, which lets anyone submit without an account). Save opens the form prefilled in a
new tab; the reviewer presses Submit. The decision shows on everyone's page after the next publish (about 20 minutes),
and on the reviewer's own computer straight away. Undo and "mark as sent" work the same way.

**Downloads.** Emails (.txt), the yearly report (Word and Excel, built in the browser from
[`report/report_lib.js`](report/report_lib.js)), a backup of the decisions (.json), and a printable checklist per example.

The private page on claude.ai (same `review.html`, built without `--public`) keeps working for the Secretariat.
