# GAIN Resources page: Glossary and FAQ in five languages

Page: https://egrisstats.org/implementation/gain-survey/resources/ (Divi, one "Fullwidth Code" module).

The Glossary and FAQ sections get a language switch (English · Français · Español · Русский · العربية).
English is the default. One choice switches both sections, and Arabic reads right to left.
The glossary search works in the language on screen. Each translated FAQ also links to its full
FAQ PDF (15 questions, including help with the online Kobo form).

## Links for the invitation emails

| Language | FAQ | Glossary |
|---|---|---|
| English | `…/gain-survey/resources/#faq` | `…/gain-survey/resources/#glossary` |
| French | `…/gain-survey/resources/#faq-fr` | `…/gain-survey/resources/#glossary-fr` |
| Spanish | `…/gain-survey/resources/#faq-es` | `…/gain-survey/resources/#glossary-es` |
| Russian | `…/gain-survey/resources/#faq-ru` | `…/gain-survey/resources/#glossary-ru` |
| Arabic | `…/gain-survey/resources/#faq-ar` | `…/gain-survey/resources/#glossary-ar` |

Each link scrolls to the section and opens the page in that language. Clicking a language on the
page also updates the address bar, so a link copied from the browser keeps the language.

## For a colleague: one file to update the page

`GAIN-Resources-page-update.html` holds everything: open it in a browser for the steps, the
**Copy code** and **Download code** buttons, a backup of the current live code, the email links,
and a live preview. Rebuilt by `python3 build.py`.

## Publishing

1. Upload the four FAQ PDFs to the WordPress Media Library with exactly these file names
   (or edit the names in `build.py` and rebuild):
   `EGRISS-GAIN-Survey_FAQs_French_2025.pdf`, `..._Spanish_2025.pdf`, `..._Russian_2025.pdf`, `..._Arabic_2025.pdf`.
   Question 15 of these PDFs contains the shared login for viewing submissions; remove it first
   if it should not be public.
2. In Divi, open the page's Fullwidth Code module and replace its content with
   `module_multilingual.html`. `module_live_backup.html` is the current live code, to roll back.

## Where the translations come from

- **FAQ:** the 2025 translated FAQ documents (SharePoint: GAIN Survey 2025 › 01 Annexes ›
  03 Paper Questionnaire › FAQs Translation). The web shows 8 questions; they are questions
  1, 2, 3, 9, 10, 11, 12 and 14 of the documents (`WEB_TO_DOC` in `build.py`).
- **Glossary:** question 16 of the same documents, which holds the glossary in all four languages
  (`GLOSSARY` in `build.py`).
- **Interface text** (section headings and descriptions, search placeholder, PDF link label, and the
  glossary term titles) was written for this page and needs a check by a native speaker.

## Kobo form translations (GAIN 2026 v16)

From 2026 v02 to v15 the form's glossary hints (and other new text) were English pasted into the
French, Spanish, Russian and Arabic columns. `kobo/translations/` holds the English strings
(`todo.json`) and their translations (`out_<lang>.json`); `kobo_fill.py` writes them into a form:

```bash
python3 kobo_fill.py kobo/translations "GAIN 2026 - v15 arm 1.xlsx" "GAIN 2026 - v16 arm 1.xlsx"
```

It fills a cell only when the translation is empty, a copy of the English, or missing its second
sentence; nothing else in the form changes. Name lists (countries, institutions, LOC06
international organisations) are left as they are. The v16 forms are in SharePoint next to v15.

## Review workbook

`review/GAIN_glossary_translation_review.xlsx`, for the translation reviewers:

| Sheet | What it is |
|---|---|
| Glossary review | The 6 glossary terms: website English beside each translation, with OK and comment columns per language, and the matching Kobo v15 hint |
| Kobo v16 new translations | Every new Kobo translation, English beside French, Spanish, Russian and Arabic, with OK and comment columns |
| Kobo v15 name lists | The same check for countries, institutions and other name lists (often fine in English) |

## Files

| File | What it is |
|---|---|
| `build.py` | Builds the module from the live code and the translated FAQ text: `python3 build.py` |
| `faq_<Language>.txt` | Text of the translated FAQ .docx files. Not in git (they contain the shared login); export them with `textutil -convert txt` to rebuild |
| `module_multilingual.html` | The new module to paste into Divi |
| `module_live_backup.html` | The live module as of 14 Oct 2026 |
| `preview.html` | Local preview with a stand-in header |
| `GAIN-Resources-page-update.html` | The colleague file (steps, code, backup, preview) |
| `kit_template.html` | Template for the colleague file |
| `kobo_fill.py`, `kobo/translations/` | Kobo translation fill (see above) |
