# EGRISS Design System

A brand & UI system for **EGRISS** — the *Expert Group on Refugee, IDP and Statelessness Statistics*.
EGRISS is an inter-agency body that develops international statistical standards and supports
countries and institutions to produce reliable, comparable data on **refugees, internally
displaced people (IDPs) and stateless populations**. Its outputs are the IRRS / IRIS / IROSS
recommendations and the **GAIN** ("Guidance Application & Implementation") monitoring programme.

This system exists to produce on-brand EGRISS materials — data-forward report pages, slide decks,
chart layouts and outreach collateral — that are visually consistent with the Secretariat's
official branding.

> **Sources provided** (read-only, mounted at build time):
> - `EGRISS-design-kit/` — official brand kit: `BRAND.md`, `brand.css`, `PHOTOS.md`,
>   `logos/` (8 PNG lockups), `charts/` (GAIN `LI.*` data visuals + animated GIFs).
> - Source of truth cited in the kit: *"EGRISS Colours and Fonts"* and the *Branding package*
>   (`906 - Communication and Outreach / 00_Outreach / 00_Logo and fonts`).
> - Authorized photo index: `PHOTOS.md` (the `photos/` folder in the kit was **empty** — web
>   copies live in an external `gain-page-final/img/` referenced there; not available here).

---

## Content fundamentals — how EGRISS writes

**Voice.** Institutional, precise, quietly confident. This is a UN-aligned statistical body:
copy is factual and measured, never breathless or salesy. It lets the numbers carry weight.

- **Person.** Third-person and organisational ("EGRISS supports…", "The Expert Group's
  recommendations…"). Addresses the reader as "you" only in instructional / how-to contexts.
- **Casing.** Sentence case for headings and UI. **ALL-CAPS** is reserved for the logo descriptor
  and short eyebrow/label lines (tracked wide, `letter-spacing: 0.12em`). Avoid Title Case.
- **Acronyms.** Heavy domain vocabulary — spell out on first use: *IRRS* (Refugee Statistics),
  *IRIS* (IDP Statistics), *IROSS* (Statelessness Statistics), *GAIN*, *NSO* (National
  Statistical Office). Keep "EGRISS" all-caps.
- **Numbers lead.** Headlines are often a figure + a plain clause: *"117 examples tracked across
  49 countries."* Use the mono key-figure treatment for the number.
- **Tone words.** "guidance into practice", "applied", "implementation", "evidence", "comparable",
  "inclusion". Humanitarian but rigorous — refugees and displaced people are *included* and
  *counted*, never abstracted away.
- **Emoji.** None. Not used in any brand material. Don't introduce them.
- **Punctuation.** Mid-dots (·) and pipes (|) separate metadata in chart captions and credits
  (e.g. *"Source: GAIN 2025 Survey · EGRISS Secretariat"*). Keep photo **credit lines** verbatim.

Example copy that is on-brand:
> *Guidance into practice — recommendations applied worldwide.*
> *91 of 117 tracked examples now use EGRISS recommendations, across 49 countries.*
> *Source: GAIN 2025 Survey · EGRISS Secretariat*

---

## Visual foundations

**Palette.** Five official colours plus practical neutrals (see `tokens/colors.css`):
`navy #14234C` (primary dark, hero/section grounds) · `deep blue #072D62` (chart grounds,
footers) · `blue #3B71B9` (secondary accent, links) · **`teal #4CC3C9` — the signature
accent** (rules, key numbers, the single highlighted idea) · `coral #F06667` (emphasis ONLY —
tags, quote marks; never a primary surface). A derived **data-viz ramp** (light→deep blue,
teal signal, gold `#E0A93B` for challenge bubbles / "no response", grey for no-data) matches the
GAIN chart outputs.

**Type.** Headings in **Obvia Medium** (a licensed font) with **Figtree** as the free
geometric-humanist fallback; body in **IBM Plex Sans**; figures and small data labels in **IBM
Plex Mono**. Display is tight (`line-height 1.08`, `letter-spacing −0.02em`); body is generous
(`1.65`) for long-form reading. Key numbers are large mono numerals.

**Backgrounds.** Two registers: light (off-white `#F7FAFD` / pale-blue tint `#EEF3FA`) for
reading, and **navy / deep-blue grounds** for hero bands, chart panels and feature cards. No
gradients on UI surfaces (the only gradient is the teal accent rule fading to transparent).
Charts sit on solid navy; maps use a light grey landmass on navy ocean. Full-bleed authorized
photography is used for hero / scene bands (always with a credit line and, over a photo, a navy
scrim for legibility).

**Imagery vibe.** Documentary photography of registration, census and survey work in country —
warm, human, real people; never stocky or staged. Always paired with the UNHCR/source credit.

**Spacing & layout.** 4px base scale; generous section rhythm (48–128px). Reading measure
~760px. Crisp, gridded, lots of breathing room — institutional, not dense.

**Corners & borders.** Restrained rounding: 6px controls, 10px cards, 16px large panels (the
brand reads crisp — never pill-shaped surfaces except status badges). Hairline borders
`#D9E2EF` on light; 2px borders on focus/active.

**Shadows.** Soft, cool blue-tinted, low — cards get `shadow-sm`; nothing heavy or dark. Sunk
(tint) and navy surfaces carry no shadow.

**Motion.** Measured and institutional. Quick fades and short transl\-Y nudges; standard easing
`cubic-bezier(0.2,0,0.1,1)`; durations 120–360ms. **No bounce, no spring, no decorative loops.**
Respect `prefers-reduced-motion`.

**Interaction states.** Hover = subtle brightness shift (fills brighten ~8%, outlined controls
gain a blue border); press = 1px downward nudge. Focus = 3px blue focus ring
(`rgba(59,113,185,0.35)`). Links underline on hover.

**Signature primitives.** (1) the **teal accent rule** — a 72px bar fading to transparent under
section headers; (2) the **all-caps eyebrow** descriptor echoing the logo's tagline; (3) the
**key figure** — oversized mono numeral + small caption, lifted straight from the GAIN charts.

---

## Iconography

- The **EGRISS mark** is the teal-navy-blue *arrowhead* — three flowing bands forming an "E"
  before the wordmark. Keep clear space; never recolour outside the palette. Lockups live in
  `assets/logos/` (horizontal, vertical, plain, white, and the 10-Years anniversary mark).
- The brand kit ships **no icon font, sprite, or SVG icon set** — iconography is light. EGRISS
  materials lean on the logo mark, the data visuals, and photography rather than UI iconware.
- **Substitution (flagged):** where a UI genuinely needs functional icons (chevrons, search,
  arrows), use **[Lucide](https://lucide.dev)** from CDN — a thin 2px-stroke, rounded-join set
  that matches the brand's crisp, humanist feel. This is an *added* convention, not from the kit;
  confirm with the Secretariat before production use. Most marks (the select chevron, the
  checkbox tick) are drawn inline at small scale to avoid a dependency.
- **No emoji.** No decorative unicode as iconography.

---

## What's in here — index

| Path | What |
|---|---|
| `styles.css` | Global entry point — `@import`s only. Consumers link this one file. |
| `tokens/colors.css` | Brand palette, neutrals, semantic aliases, data-viz ramp. |
| `tokens/typography.css` | Families, weights, type scale, line-height, tracking. |
| `tokens/fonts.css` | Google Fonts `@import` (IBM Plex Sans/Mono, Figtree); Obvia hook. |
| `tokens/spacing.css` | Spacing, radius, border, shadow, motion, layout tokens. |
| `tokens/base.css` | Light element resets + signature primitive helper classes. |
| `components/core/` | Button, Tag, Badge, Card, Stat, Callout. |
| `components/forms/` | Input, Select, Checkbox. |
| `components/navigation/` | Tabs. |
| `ui_kits/gain-report/` | **GAIN data-story report** — interactive recreation of EGRISS's data-forward web page. |
| `slides/` | Deck templates (title, section, data, quote, comparison, closing). |
| `guidelines/cards/` | Foundation specimen cards (Design System tab). |
| `assets/logos/` | 8 official logo lockups (PNG). |
| `assets/charts/` | GAIN `LI.*` data-visual exports (PNG). |
| `SKILL.md` | Agent-Skill wrapper for use in Claude Code. |

**Components** (namespace `window.EGRISSDesignSystem_041258` in cards):
`Button` · `Tag` · `Badge` · `Card` · `Stat` · `Callout` · `Input` · `Select` · `Checkbox` · `Tabs`.

---

## Caveats / to confirm

- **Obvia** is licensed and not bundled — headings currently render in **Figtree** (free
  fallback). Drop Obvia web fonts into `assets/fonts/` and uncomment the `@font-face` in
  `tokens/fonts.css` to switch.
- The kit's `photos/` directory was empty; the authorized-photo system is documented in
  `PHOTOS.md` but the binaries weren't available, so the report UI kit uses neutral photo
  placeholders where a credited image would go.
- The Lucide icon convention is an added substitution, not from the official kit.
