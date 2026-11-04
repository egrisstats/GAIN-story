# GAIN 2026 submissions tracker

A one-page dashboard that follows GAIN 2026 responses as they arrive (collection 3–22 November 2026).
It is a single static page (`index.html`, d3 from a CDN, no build step), so it can be hosted on
GitHub Pages and added to a Teams channel as a tab.

**Right now it runs on demo data**: `data/gain2026_DEMO.csv` is a simulated 2026 round made from
GAIN 2024–2025 answers (`tools/make_demo_data.py`); every title starts with "[demo]" and a red banner says so.

## What is on the page

| Panel | What it shows |
|---|---|
| Headline tiles | Examples, responses, countries, country-led · institution-led, share using the Recommendations, days to deadline, progress against GAIN 2025 (117 examples) |
| Globe / map | Examples per country (drag to turn, Ctrl/⌘ + scroll to zoom, click a country to filter everything); red pulses mark countries with a response in the last 24 hours |
| Timeline | Cumulative examples by lead, with campaign milestones and the GAIN 2025 total; responses per day below. **Click** the chart to see the round as of that moment, **Replay** to watch it fill up |
| Examples using the Recommendations | The story's double donut: every example using them is a dot, grouped into IRRS, IRIS, undetermined, mixed use (dot split, combinations listed) and IROSS, with the inner ring split by lead. **By lead** swaps the two. Below: the three Recommendations covers (`assets/recs/`), each with the examples applying it, alone or in mixed use; hover a cover to light up its examples, click to open its EGRISS page |
| By region, top countries, top organisations | Country-led and institution-led side by side |
| Data sources, population groups | Multi-answer tallies |
| Latest submissions | Searchable feed, newest first |

Filters (lead, Recommendation, region, country) apply to every panel.

## Run it locally

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123/dashboard/

## Connecting the live data

The page reads, in order: `?src=<url>` from the address, else `data/gain2026.csv` next to the page,
else the demo file. It re-reads the feed every 5 minutes (`?refresh=2` for every 2) and shows when it last read it.

The feed is one row per **example** (CSV, or JSON as an array of the same objects):

| Column | Example | Notes |
|---|---|---|
| `response_id` | `R26-014` | Same id for all examples in one questionnaire |
| `submitted_at` | `2026-11-04T09:30:00Z` | ISO date-time |
| `country` | `Kenya` | Empty for regional or global examples |
| `organisation` | `Kenya National Bureau of Statistics` | |
| `lead` | `Country-led` / `Institution-led` | |
| `title` | | Short title of the example |
| `recommendations` | `IRRS;IRIS`, `IROSS`, `Used, undetermined`, `Not used`, `Don't know` | Two or more codes count as mixed use; "undetermined" means used, which one not said |
| `data_source` | `Survey;Administrative data` | `;`-separated |
| `population_groups` | `Refugees;IDPs` | `;`-separated |
| `region` | *(optional)* | Filled from the country when empty |

Kobo-style names (`_submission_time`, `_uuid`) are also understood.

### From Kobo

`tools/kobo_to_csv.py` reads the GAIN 2026 form through the Kobo API and writes `data/gain2026.csv`.

1. In `kobo_config.json`, set the Kobo `server` (e.g. `https://kf.kobotoolbox.org`, `https://eu.kobotoolbox.org`
   or your organisation's own Kobo), the form's `asset_uid` (in the form's URL in Kobo), the repeat group
   that holds the examples, and the question **names** from the XLSForm for each column.
2. Get an API key: Kobo → Account settings → Security → API key. Use an account that can only *view*
   the GAIN 2026 form.
3. Run it once locally:
   ```bash
   KOBO_TOKEN=<your key> python3 dashboard/tools/kobo_to_csv.py
   ```
   Select answers come out as their labels (read from the form), so country names and IRRS/IRIS/IROSS
   match what the page expects. Submissions marked "Not approved" in Kobo (e.g. tests) are skipped.

**Keeping it live.** The publish workflow (`.github/workflows/pages.yml`) runs every 15 minutes from 3 to
24 November, runs the script with the `KOBO_TOKEN` repository secret and puts the fresh file straight into
the published site. The Kobo data is never committed (`dashboard/data/gain2026.csv` is in `.gitignore`).
The page re-reads it every 5 minutes, so a new response shows within about 20 minutes. Until the secret
and `kobo_config.json` are in place, the step skips and the page shows demo data.

To switch it on: GitHub repo → Settings → Secrets and variables → Actions → New repository secret,
name `KOBO_TOKEN`, value the Kobo API key. Add it to the repository whose Pages link goes in Teams
(`mitrovif/GAIN-story` or the EGRISS copy).

### Updating within minutes of a submission

GitHub's 15-minute schedule often starts late, so the GAIN 2026 form also tells GitHub directly when a
submission arrives (a Kobo REST Service). It sends **no submission data**: the body is only
`{"ref":"main"}`, which starts the publish workflow; the workflow then pulls from Kobo as usual. The
page re-checks every 2 minutes, so a new response shows within about 3 minutes.

Only the mitrovif copy is notified (the egrisstats organisation does not allow fine-grained tokens), and
GitHub's schedule has in practice not run at all. So each copy of the page reads the `_meta.json` of both
published copies and loads whichever pull is newest: the EGRISS link shows the data the mitrovif copy
took from Kobo seconds after the submission. The list is `CONFIG.mirrors` in `index.html`.

Set up on the EGRISS copy (the Teams link):
- GitHub fine-grained token "Kobo - GAIN tracker": resource owner `egrisstats`, only the `GAIN-story`
  repository, permission **Actions: read and write** only (it can start the workflow, not change code),
  expiry 30 days.
- Kobo, the form, Settings, REST Services, Register a new service: endpoint
  `https://api.github.com/repos/egrisstats/GAIN-story/actions/workflows/pages.yml/dispatches`, type JSON,
  no authorization, headers `Authorization: Bearer <token>` and `Accept: application/vnd.github+json`,
  custom wrapper `{"ref":"main"}`, fields subset `INT02` (nothing else is sent anyway).
- Kobo project managers can see the token in the REST Service settings; revoke it after collection.

## Hosting and personal data

Decided 4 Nov 2026: **public GitHub Pages link, with example titles, without any personal data on the
people who submitted.** The page is not linked from anywhere public; anyone with the link can open it.

Published, per example: country, organisation, lead, title, Recommendations, data sources, population
groups and submission time. Never leaves Kobo:
- respondent name, email, phone, position or any other contact question: the script reads only the
  mapped questions and refuses to run if one of them is named like a contact field
  (`respondent`, `email`, `phone`, `contact`, `focal`…);
- Kobo metadata: the Kobo username (`_submitted_by`), device id, location;
- the Kobo submission id: replaced by a one-way hash, so the examples of one questionnaire still group
  together without exposing it;
- email addresses and phone numbers typed into a title: blanked out.

If the round needs to go fully private later: a private repository with Pages access control (GitHub
Enterprise Cloud) or Azure Static Web Apps with Microsoft sign-in. Both work, but sign-in pages usually
open in the browser rather than inside a Teams tab.

## Add it to Teams

Yes, it can be a tab. In the channel: **+** (Add a tab) → **Website** → name it "GAIN 2026 tracker" →
paste the page URL → Save. It shows inside the tab in Teams desktop, web and mobile, and fits the tab width.

What decides whether it works:
- The URL must be `https` and the host must allow being shown inside another page. GitHub Pages does.
- The public Pages link has no sign-in, so it displays inside the tab. (Sign-in protected pages usually
  don't: the sign-in page refuses to load inside Teams and the tab offers to open the browser instead.)
- Tab link: `https://mitrovif.github.io/GAIN-story/dashboard/` (or the EGRISS copy's Pages address).
- Anyone in the channel can open the tab; Teams does not add its own access control to a Website tab.

## Prompt for a dashboard platform

To try the same thing elsewhere (claude.ai Dashboard, Power BI Copilot, etc.), attach a sample of the feed
(`data/gain2026_DEMO.csv`) and use:

> Build a one-page, interactive dashboard tracking GAIN 2026 survey submissions in real time (collection
> 3–22 November 2026, EGRISS Secretariat, internal). Data: one row per example with response_id,
> submitted_at, country, organisation, lead (Country-led / Institution-led), title, recommendations
> (IRRS, IRIS, IROSS, several = mixed use, or Not used / Don't know), data_source and population_groups
> (both `;`-separated). Refresh from the source every 5 minutes and show the last refresh time.
> Layout, dark navy theme: (1) headline tiles: examples, responses, countries, country-led vs
> institution-led, % using the Recommendations, days to the 22 Nov deadline, progress against GAIN 2025
> (117 examples: 63 country-led, 54 institution-led); (2) a large rotating globe shaded by examples per
> country, click a country to filter the page, pulse countries with a response in the last 24 hours;
> (3) a timeline of cumulative examples stacked by lead with campaign milestones (launch 3 Nov, mid-way
> 11 Nov, one week left 16 Nov, deadline 22 Nov), a GAIN 2025 reference line, responses per day, and a
> replay control; (4) use of the Recommendations as a double donut: each example a dot in the outer ring,
> grouped IRRS / IRIS / undetermined / mixed use / IROSS with leader-line labels, inner ring split by lead,
> total in the centre, plus the three Recommendations cover images with how many examples apply each; (5) country-led and institution-led by region, top countries, top organisations;
> (6) data sources and population groups; (7) a searchable feed of the latest submissions.
> Global filters: lead, Recommendation, region, country. Colour-blind-safe colours, one consistent
> colour per lead and per Recommendation across all charts, tooltips on every mark.
