# Email templates

One email per organisation, covering all of its examples. Write in the respondent's language (English, French, Spanish, Arabic, Russian). Sign as the GAIN team at the EGRISS Secretariat. Fill `[...]` from the review record. No en dashes; always "recommendations", never "standards".

## 1. Edit and notify (outcome `edit`)

Used for Don't know (PRO09 = 8), PRO10 = Z, and No (PRO09 = 2) that cleared the higher bar.

> **Subject:** GAIN [year]: an update to your submission
>
> Dear [Name],
>
> Thank you for [organisation]'s GAIN [year] submission. Reviewing your examples, we have recorded the following as using the [recommendation full name] ([acronym]):
>
> **[Example title]**: [one sentence on what the example does, in the respondent's terms]. This reflects the [acronym] in [the parts ticked, each with its paragraph, for example: its categories for people with temporary protection (paragraph 91), the use of registers for statistics (paragraph 214) and published counts by category (paragraph 114)]. [For a No only, add the sign of use: "Your [other example / earlier submission] on the same data was reported as using the [acronym]."]
>
> [Repeat for each example.]
>
> If this does not reflect your work, just reply and we will restore your original answer.
>
> With thanks,
> [names], EGRISS Secretariat

Notes:
- For a No, open with "You indicated that the recommendations were not used. Looking at the example, we believe it does draw on them, so we have recorded it as such." before the example paragraph.
- Record `review_notified_on`. If they object, set `review_objection` and restore the reported answer.

## 2. Keep the answer, send outreach (outcome `outreach`)

> **Subject:** GAIN [year]: the EGRISS recommendations for your work on [topic]
>
> Dear [Name],
>
> Thank you for [organisation]'s GAIN [year] submission. You mentioned you are not familiar with the EGRISS recommendations. For work like [example title], the [acronym] may be useful, in particular [chapter or paragraphs]. [Link]. The e-learning course [link] gives a short introduction, and we would be glad to set up a call.
>
> With thanks, [names], EGRISS Secretariat

## 3. Keep the answer, record as aligned (outcome `aligned`)

No email is required. If a note is useful (for example a large NSO), send a short pointer:

> For [example title], you may find [acronym] [paragraphs] relevant: [one line on why]. No change to your submission is needed.

## 4. No email

`outscope`, `deliberate`, `nocat`, `keep`.

## Filling the record after an edit

| Field | Value |
|---|---|
| PRO09_reviewed | 1 |
| PRO10_reviewed | IRRS for refugees, asylum seekers, temporary protection, returnees; IRIS for IDPs; IROSS for stateless people |
| PRO11_reviewed | from the kind of example: census, survey, administrative data, coordination |
| PRO12_reviewed | from the criteria ticked (framework, data sources, indicator selection) |
| review_source | Secretariat edit, notified |
| PRO09 (original) | never overwritten |
