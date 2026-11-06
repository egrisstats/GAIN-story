# GAIN alignment review

A weekly routine for examples where the respondent says **None** or **Don't know** to "Which recommendations developed within EGRISS have you included in your example?" (PRO09/PRO10, merged in 2026). It replaces the 2025 PRO09 reviewer flowchart.

The principle: GAIN measures **use** of the recommendations, not alignment. An example can be aligned without anyone having used them. Alignment decides *what* we point to. Evidence of use, from outside the answer, decides *whether* we contact anyone.

## Weekly routine (about 30 minutes)

1. **Export from Kobo.** Data, Downloads, XLS, Labels. Save it in `05 Data Collection/Data Archive`.
2. **Run the script:**
   ```
   python3 gain_alignment_review.py "<export>.xlsx" "<2025 analysis_ready_group_roster.csv>" "GAIN_alignment_review_<date>.xlsx"
   ```
3. **Open the review file** and work through the `Cases` sheet, top to bottom. For each None or Don't know row, confirm or overrule the **Proposed route** in **Reviewer decision**.
4. **Send emails** using the templates below, one email per organisation covering all of its examples. Route big organisations through their focal points.
5. **Log** the date in `Contacted on`, then fill in `Reply`, `PRO09_reviewed`, `review_reason` and `review_source` as answers come in.
6. **At the close of data collection**, apply the accepted changes in R: `PRO09_reviewed` becomes the analysis variable, and `PRO09` stays untouched.

## The five steps the script applies

| Step | Question | Source in the form |
|---|---|---|
| 0 Scope | Is the answer None or Don't know? Named answers are only checked for scope. | PRO09/PRO10 |
| 1 Applicable | Is this a statistics example, or programme delivery (cash, awareness, GBV response...)? | Title, description |
| 2 Markers (0-4) | M1 statistical source or statistics capacity topic; M2 compares with the national population; M3 identification questions used; M4 description names the population categories | PRO08, PRO08C, PRO13B, PRO13 |
| 3 Signals | **Strong:** S1 same example reported as Yes in an earlier year; S2 other examples in the same submission, same source, name a recommendation; S3 description mentions EGRISS or the recommendations. **Weak:** S4 organisation reported use in an earlier year; S5 respondent knows the relevant recommendation (ACT04); S6 EGRISS member listed as partner | Prior-year file, same submission, ACT04, PRO18 |
| 4 Route | see below | |

### Routes

| Route | Rule | Action |
|---|---|---|
| **Propose change (opt-out)** | 1+ strong or 2+ weak signals, 2+ markers, and the example is not in design or planning | Email proposing the change, with paragraph references and an objection deadline. Applied at close. `review_source` = "Secretariat proposal, no objection" or "Respondent confirmed". |
| **Ask (question)** | Same signals, but fewer than 2 markers, or the example is still being designed or planned | Neutral question. Change only on a positive reply that names what was used. |
| **Notify alignment (use answer kept)** | 2+ markers, no signals (or one weak signal) | Short note telling the respondent we have recorded the example as **aligned** with the recommendation, with paragraphs (template C). Their use answer stays as given unless they reply that the recommendations were in fact used. `review_reason` = "aligned, use not reported". |
| **No stands** | The respondent explains the recommendations were not applied | No contact. |
| **Not applicable** | Programme delivery, not statistics | No contact. Raise in the example-validity check instead. |
| **Not aligned** | Fewer than 2 markers, no signals | No contact. |

Named answers on programme examples are flagged "check scope". That is a cleaning question, not re-enumeration.

### Rules for closing a case

- One reminder through the focal point. After that, an opt-out proposal is applied, while a question keeps the original answer.
- A Yes is accepted only when the respondent can name what was used (definitions, identification questions, guidance). That corresponds to the PRO11 and PRO12 content.
- Never overwrite `PRO09`. Report **reported use** and **use after review** side by side.

### Two indicators, reported side by side

The `Alignment (assessed)` column gives every example one of: Used (reported), Aligned (use to confirm), Aligned (use not reported), Respondent explains not applied, Not applicable, Not aligned. This feeds a second indicator that sits next to use:

- **Use of the recommendations:** reported, plus changes confirmed or not objected to.
- **Alignment with the recommendations:** use, plus examples the Secretariat assessed as aligned.

Alignment never replaces use, but it means an example that clearly follows the recommendations is not lost just because the respondent said No. It also shows where the recommendations are reflected in practice without being recognised, which is useful for outreach and training. Examples where the respondent explains that the recommendations were not applied are not counted as aligned.

## Touch points: where each type of example meets the recommendations

Paragraphs checked against IRRS (March 2018), IRIS (2020) and IROSS (2023). The same table is in the `Rulebook` sheet of every review file.

| Example type | IRRS | IRIS | IROSS |
|---|---|---|---|
| Who is counted (framework) | 88, 91-92, Fig. 3.1 (incl. temporary protection, para 91) | 74-75, 105 (causes incl. disasters) | 57, 65 |
| Census | 129-133, 155 | 202-211 | 151-157 |
| Household survey | 134 (core questions), 161-164, 177 | 222-229 | 195-200 |
| Administrative data, registers | 197, 204, 214 | 245-258 (IDP registers 253-256), 263 | 214-219, 231-234 |
| Data integration, linkage | 242-246, 279 | 283-290 | 234 |
| Comparison with host population | 303, 406, 454 | 223 | |
| Coordination, regional bodies, training | 502, 520, 609 | 306-310, 343-345, 369 | 370 |
| Specific | | Disasters 52-53; Colombia RUV 49 | |

## Email templates

Fill in `[...]`. Write one email per organisation and list every example.

**A. Propose change (opt-out)**

> Subject: GAIN [year]: proposed adjustment to [n] example(s)
>
> Dear [Name],
>
> Thank you for [organisation]'s GAIN [year] submission. Reviewing your examples, we see that [example] relates directly to the [IRRS/IRIS/IROSS]: [one line, e.g. "people granted temporary protection are part of the IRRS statistical framework (paragraph 91)"].
>
> We therefore propose to record it as using the [recommendation]. If you disagree, please let us know by [date]. Otherwise we will apply the change at the close of data collection.
>
> Best regards, [names], EGRISS Secretariat

**B. Ask (question)**

> Subject: GAIN [year]: a quick question on [example]
>
> Dear [Name],
>
> Thank you for [organisation]'s GAIN [year] submission. For [example] you answered "[None/Don't know]" on the use of EGRISS recommendations. Could you check with the team whether the [recommendation] informed it, for example [the relevant touch point, e.g. "the IRRS core identification questions (paragraph 134)"]? If so, a line on which part was used would be very helpful.
>
> If they were not used, that is perfectly fine. We only want to record it accurately.
>
> Best regards, [names], EGRISS Secretariat

**C. Notify alignment (use answer kept)**

> Subject: GAIN [year]: how [example] connects to the [recommendation]
>
> Dear [Name],
>
> Thank you for [organisation]'s GAIN [year] submission. You indicated that the EGRISS recommendations were not used in [example], and we have kept that answer. We did notice that the example is closely aligned with the [recommendation], for instance [touch point, e.g. "its statistical framework for asylum seekers and refugees (paragraphs 88 to 92) and its guidance on register data (paragraphs 197 and 214)"], so we have also recorded it as aligned.
>
> If the recommendations were in fact drawn on, or if you see it differently, just let us know. If it would be useful, we are happy to share the relevant chapters or put you in touch with countries working on similar data.
>
> Best regards, [names], EGRISS Secretariat
