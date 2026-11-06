# GAIN 2026 Kobo fields used by the review

Export: XLS, labels, all versions. Example-level answers are in the `group_roster` sheet; organisation-level answers in the first sheet. Join on `_submission__id` (group roster) = `_id` (main sheet). Labels contain HTML spans and `${...}` placeholders: strip tags before matching.

| Field | Where | Label to match (after stripping HTML) | Used in |
|---|---|---|---|
| Organisation | main | `organization` | grouping, emails |
| Lead type | main | starts with "Are you filling information on behalf of a national statistical office" | context |
| Publications known (ACT04) | main | `_ACT04_list` | step 2, unaware |
| Example title (PRO02A) | group_roster | `_PRO02A` (spaces as `+`) | step 1 |
| Population (PRO07) | group_roster | `_PRO07` | step 4, PRO10 |
| Source (PRO08) | group_roster | `PRO08_label` | step 3 |
| Additional sources (PRO08B) | group_roster | `_PRO08B` | step 5, integration |
| National population covered (PRO08C) | group_roster | "cover only ... or the national population" | context |
| Recommendations used (PRO09 + PRO10, merged in 2026) | group_roster | "Which recommendations developed within EGRISS have you included in your ${_PRO02A_short}?" and its `/IRRS`, `/IRIS`, `/IROSS`, `/Don't know`, `/None of these were used in this example` dummies | entry filter |
| Description (PRO13) | group_roster | starts with "Please provide a short description of the" | steps 1, 2, 4, 5 |
| Phase (PRO06) | group_roster | starts with "In which phase of implementation" | context |
| Partners (PRO18) | group_roster | starts with "Please list partners that were involved" | step 5, sign of use |

Entry filter for 2026: the merged question equals "None of these were used in this example" (PRO09 = 2) or "Don't know" (PRO09 = 8). In older rounds use PRO09 in (2, 8) or PRO10 = Z.

Prior rounds: `analysis_ready_group_roster.csv` (2021 to 2025), with `morganization`, `year`, `PRO02A`, `PRO09`, `PRO10`, `PRO07.A/B/C`, `PRO08`. Use it for the sign of use "same organisation reported use before".
