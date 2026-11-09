# Counted, and counting

The GAIN 2021–2025 scrollytelling page for the GAIN 2026 launch on the EGRISS website: 413
implementation examples, drawn as points of light, re-forming into the charts of the GAIN Tables 2025.

| Path | What it is |
|---|---|
| `Main.dc.html` | The page (exported from the "GAIN Scrollytelling" design on claude.ai). Serve the folder and open it; `index.html` redirects to it. |
| `support.js`, `vendor/` | Runtime the page needs (React and the design-component loader). |
| `assets/*.json` | Examples roster, chart layouts, world map and `c92c…json`: covers and source links per example (0-based roster row). |
| `assets/covers/`, `assets/covers-web/` | The 96 images the story uses: originals, and 480px JPEGs the page loads. |
| `assets/fonts/` | Obvia, the EGRISS heading face (from the EGRISS design system). Check the licence before the repo goes public. |
| `pipeline/` | The cover and link scraping workstream (formerly `GAIN_post-collection`), with the SDG-map covers in `pipeline/covers-sdg/`. See its README. |
| `review/` | Review material: story frames, EGRISS case study captures and the review board page. |

## Preview

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123/Main.dc.html.

## Country cards

Every example's profile names its country as a link (for example **NIGERIA ↗** in the header). It opens a
**country card** on top of the example, like a second index card: the country's GAIN examples year by year (click one
to open it), who lives there according to UNHCR and which examples covered each group, a small map of where
displaced and stateless people live (places named in an example in gold), and how the examples counted them
(census, survey, administrative data). "Back to the example" returns to the card underneath.
A country card has its own link: `Main.dc.html#country-NGA`.

The data is in `assets/countries/`: `countries.json` and one map file per country, built by
`python3 tools/country_profiles.py` (add `--refresh` to download UNHCR's figures and locations again).
Sources: UNHCR Refugee Data Finder (with IDMC and UNRWA), UNHCR's GIS list of locations, Natural Earth outlines.
GAIN asked about data sources and population groups only from 2024; for earlier examples the method is read from the title.

**Where IDPs live, in more detail.** Six country cards add a layer from the humanitarian site lists on HDX:

| Country | Source | Shown as |
|---|---|---|
| Nigeria | IOM DTM site assessments (north-east R52, north-central and north-west R19) | IDPs per local government area, switch to IDPs in camps |
| Ethiopia | IOM DTM site assessment R37 | IDPs per woreda, switch to camps and collective centres |
| Somalia | CCCM Cluster IDP site master list (Q4 2024) | one dot per IDP site, sized by its people; regions shaded by their total |
| DR Congo | OCHA population movements, people still displaced (June 2026) | IDPs per territory, switch to sites and collective centres |
| Ukraine | IOM DTM IDP estimates R24 (June 2026) | IDPs per oblast |
| Mali | IOM DTM baseline assessment R83 | IDPs per cercle |

Areas are OCHA's common boundaries (HDX `cod-ab-*`), matched by area code. Areas or regions named in an example are
outlined in gold. Not included: Haiti and Mozambique (their current files are not openly downloadable), Chad (area
codes do not match the boundaries), and countries whose site lists are years old (South Sudan, Sudan, Syria, Burkina Faso).
The files are Excel, so the build needs `openpyxl` (`pip install openpyxl`); without it the cards show UNHCR's points only.

## Updating the design artifact

The design copy loads images and data from its own uploads (`/_blob/<id>`), not from this repo.
`tools/design_blob_map.json` maps the covers added on 8 Oct 2026 (`exNNN`) to their upload ids;
the other covers keep their original ids (the file name in `assets/covers-web/`). To push new covers:
upload the images and a covers JSON with `/_blob/` paths, then point `Main.dc.html` at the new JSON.
Since 8 Oct 2026 (244 covers) it loads covers data `/_blob/1b6f97288b7bb43b217b860e0c27b52a`.

## Links

- Public site (GitHub Pages, republished on every push to main): https://mitrovif.github.io/GAIN-story/

- Story (design tool): https://claude.ai/artifact/Frysz8mQTSS5Rv8GX5LRMi
- Review board: https://claude.ai/artifact/L4amtyMx6v3FKYuZAWLK1t
