/* The yearly alignment review report, from an export of the review store.

     node alignment/report/build_report.js <export_dir> <out_dir>

   <export_dir> holds queue/*.json, decisions/*.json and meta/run.json (an ArtifactData export).
   Writes <out_dir>/gain2026_alignment_review.docx and <out_dir>/report.json; build_xlsx.py turns
   report.json into the workbook. The reason for each decision is the one saved with it, or the
   same text the review page writes from the checklist (src/alignment_text.js).
   Holds titles, organisations and reasons, no personal data. Keep it out of the public repos. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const R = require(path.join(ROOT, 'alignment/src/alignment_rules.js'));
const T = require(path.join(ROOT, 'alignment/src/alignment_text.js'));
const docxPath = process.env.DOCX_MODULE || 'docx';
const D = require(docxPath);

const [exportDir, outDir] = process.argv.slice(2);
if (!exportDir || !outDir) { console.error('usage: node build_report.js <export_dir> <out_dir>'); process.exit(1); }
const out = path.resolve(outDir);
if (out.startsWith(ROOT + path.sep) && !out.startsWith(path.join(ROOT, 'alignment', 'reports'))) { console.error('Write reports to alignment/reports (ignored by git) or outside the repo.'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'alignment/spec/decision_tree.json')));
const excerpts = (JSON.parse(fs.readFileSync(path.join(ROOT, 'alignment/spec/excerpts.json'))).excerpts) || {};
const read = (f) => { const j = JSON.parse(fs.readFileSync(f)); return j.data || j; };
const load = (dir) => fs.existsSync(dir) ? Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), read(path.join(dir, f))])) : {};
const queue = load(path.join(exportDir, 'queue')), dec = load(path.join(exportDir, 'decisions'));
const meta = fs.existsSync(path.join(exportDir, 'meta/run.json')) ? read(path.join(exportDir, 'meta/run.json')) : {};

const OUT = { edit: 'Count as using · tell them', aligned: 'Aligned · not counted as use', outreach: 'Keep their answer · send the recommendations', keep: 'Keep their answer',
  outscope: 'Keep · not statistics (check if valid)', deliberate: 'Keep · they chose not to use them', nocat: 'Keep · no matching groups' };
const ORDER = ['edit', 'aligned', 'outreach', 'keep', 'deliberate', 'nocat', 'outscope'];
const ANS = { no: 'Not used', dk: 'Don’t know' };
const WEB = { supports_use: 'Points to use', against_use: 'Points away from use', unclear: 'Unclear' };
const WHERE = { desc: 'Their description', web: 'Web', similar: 'Similar example', other: 'Other' };
const peerUsed = (p) => (p.qkey && dec[p.qkey] && dec[p.qkey].outcome) ? dec[p.qkey].outcome === 'edit' : p.used;

const rows = Object.keys(queue).sort((a, b) => (queue[a].organisation || '').localeCompare(queue[b].organisation || '') || queue[a].title.localeCompare(queue[b].title)).map((k) => {
  const q = queue[k], d = dec[k];
  const docs = (q.web && q.web.docs) || null, sig = (docs && docs.signal) || (q.web && q.web.signal);
  const h = q.history || {}, fmtB = (b) => b && b.examples ? b.used + ' of ' + b.examples + ' used' + (Object.keys(b.by_rec).filter((x) => !/know|named/.test(x)).length ? ' (' + Object.entries(b.by_rec).filter(([x]) => !/know/.test(x)).map(([x, n]) => x + ' ' + n).join(', ') + ')' : '') : 'none';
  const base = { key: k, organisation: q.organisation || '', country: q.country || 'Regional or global', region: q.region || '', title: q.title, answer: ANS[q.answer] || q.answer, kind: q.kind_name || q.source || '',
    web: WEB[sig] || 'Not checked', docs_read: docs ? (docs.documents || []).filter((d) => d.read).length : 0, online: docs ? (docs.summary || []).join(' ') : ((q.web && q.web.summary) || ''),
    org_before: (h.org || []).filter((x) => x.year !== '2026').map((x) => x.year + ' ' + (x.used ? (x.recs || 'used').replace(/;/g, '+') : 'no')).join(', ') || 'none',
    country_before: fmtB(h.country) };
  if (!d || !d.outcome) return Object.assign(base, { outcome: 'open', outcome_label: 'To review' });
  const g = T.rationale(R, spec, q, d, { excerpts, peerUsed });
  const a = d.answers || {}, where = a.where || {};
  const email = d.outcome === 'edit' || d.outcome === 'outreach' ? (d.notified_on ? 'Sent ' + d.notified_on : 'To send') : 'No email';
  return Object.assign(base, {
    outcome: d.outcome, outcome_label: OUT[d.outcome] || d.outcome,
    kind: a.kind && spec.kinds[a.kind] ? spec.kinds[a.kind].name : base.kind,
    recommendations: g.recs.join(' + '),
    found: g.found.map((c) => c.text), strong: g.found.filter((c) => c.group === 'distinctive' || c.group === 'use' || c.id === 'e0').length,
    not_found: g.notFound.length, cant_tell: g.unsure.length,
    seen_in: [...new Set(g.found.map((c) => WHERE[where[c.id]]).filter(Boolean))].join(', '),
    similar: g.peers ? g.peers.used + ' of ' + g.peers.n : '',
    paragraphs: g.paragraphs.map(T.paraName).join('; '), quoted: g.paragraphs.length ? (g.quoted.length ? (g.quoted.length === g.paragraphs.length ? 'Yes' : 'Some (' + g.quoted.length + ' of ' + g.paragraphs.length + ')') : 'No, summary only') : '',
    email, reviewed_on: (d.saved_at || '').slice(0, 10), note: d.note || '',
    why: d.rationale || g.text, why_edited: !!d.rationale_edited,
  });
});
const model = { title: 'GAIN 2026 alignment review', made_on: new Date().toISOString().slice(0, 10), examples_2026: meta.examples || null, queue_pulled_at: meta.pulled_at || null,
  web_checked_on: meta.context && meta.context.web_searched_on || null, spec_version: spec.version, thresholds: spec.thresholds, rows };
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(model, null, 1));

// ---------- Word ----------
const font = 'Arial', NAVY = '1C2D5A', TEAL = '4CC3C9';
const P = (text, o = {}) => new D.Paragraph({ spacing: { after: 120 }, ...o, children: [].concat(text).map((t) => typeof t === 'string' ? new D.TextRun({ text: t, font }) : t) });
const B = (t) => new D.TextRun({ text: t, bold: true, font });
const H = (text, level) => new D.Paragraph({ heading: level, children: [new D.TextRun({ text, font })] });
const bullet = (text) => new D.Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 }, children: [].concat(text).map((t) => typeof t === 'string' ? new D.TextRun({ text: t, font }) : t) });
const reviewed = rows.filter((r) => r.outcome !== 'open'), open = rows.filter((r) => r.outcome === 'open');
const count = (o) => rows.filter((r) => r.outcome === o).length;
const total = model.examples_2026, inRev = rows.length, usingReported = total ? total - inRev : null;
const pct = (n) => total ? Math.round(100 * n / total) + '%' : 'n/a';

const W = 9026; // A4 text width in DXA with 2.5 cm margins
const cell = (t, w, head) => new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, shading: head ? { type: D.ShadingType.CLEAR, color: 'auto', fill: 'EFF7FF' } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new D.Paragraph({ children: [new D.TextRun({ text: String(t), font, size: 19, bold: !!head })] })] });
const table = (head, data, widths) => new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: widths,
  rows: [new D.TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], true)) })].concat(data.map((r) => new D.TableRow({ children: r.map((c, i) => cell(c, widths[i])) }))) });

const body = [];
body.push(new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [new D.TextRun({ text: 'GAIN 2026 alignment review', font })] }));
body.push(P('Examples where the respondent said the EGRISS recommendations were not used, or did not know, and what the Secretariat decided. Report made on ' + model.made_on + (model.queue_pulled_at ? ' from the review queue taken from Kobo on ' + model.queue_pulled_at.slice(0, 10) : '') + '.', { spacing: { after: 240 } }));
body.push(H('1. Summary', D.HeadingLevel.HEADING_1));
body.push(P([inRev + ' of ' + (total || '?') + ' GAIN 2026 examples said No or Don’t know and went to the review. ', B(reviewed.length + ' have been reviewed'), ', ' + open.length + ' are still to review.']));
if (total) body.push(P('Use of the recommendations: ' + pct(usingReported) + ' as respondents reported it, ' + pct(usingReported + count('edit')) + ' after the review (' + count('edit') + ' counted as using), and ' + pct(usingReported + count('edit') + count('aligned')) + ' using or aligned (' + count('aligned') + ' aligned).'));
body.push(table(['Outcome', 'Examples', 'What happens'], ORDER.filter((o) => count(o)).map((o) => [OUT[o], count(o), spec.outcomes[o].detail]).concat(open.length ? [['To review', open.length, 'Not reviewed yet']] : []), [3200, 1100, 4726]));
body.push(P('', { spacing: { after: 120 } }));
body.push(H('2. How we review', D.HeadingLevel.HEADING_1));
body.push(P('Each example is checked in two parts. First three quick questions: is it about producing statistics; do they say why they did not use the recommendations; which groups does it cover. A “no” or a stated reason ends the review there. Otherwise the reviewer goes through a checklist for that kind of example, marking each item found, not found or can’t tell, and noting where it was seen: their description, public web pages, or a similar GAIN example.'));
body.push(P('The checklist has strong items (markers of the recommendations’ approach, and signs they already use them) and good practice items. For a “don’t know” answer, two strong items are enough to count the example as using the recommendations. For a “not used” answer we ask for more, including a sign they already use them. Some evidence below that bar is recorded as aligned, which counts in the alignment figure but not as use.'));
body.push(P('When an example is counted as using, the Secretariat emails the organisation with the checklist items found and the paragraphs of the recommendations they match, quoting the official wording where it has been added. Their original answer stays on record, and they can ask us to restore it. Suggestions on the page are hints: every decision is a reviewer’s.'));
body.push(H('3. Decisions and why', D.HeadingLevel.HEADING_1));
ORDER.forEach((o) => {
  const list = reviewed.filter((r) => r.outcome === o); if (!list.length) return;
  body.push(H(OUT[o] + ' (' + list.length + ')', D.HeadingLevel.HEADING_2));
  list.forEach((r) => {
    body.push(new D.Paragraph({ keepNext: true, spacing: { before: 160, after: 60 }, children: [new D.TextRun({ text: r.title, bold: true, font, color: NAVY })] }));
    body.push(new D.Paragraph({ keepNext: true, spacing: { after: 80 }, children: [new D.TextRun({ text: [r.organisation, r.country, 'said: ' + r.answer.toLowerCase(), r.kind].filter(Boolean).join(' · '), font, size: 18, color: '5F6B87' })] }));
    r.why.split(/\n\s*\n/).forEach((para) => body.push(P(para.trim())));
    if (r.online) body.push(P([B('Online (' + r.web.toLowerCase() + (r.docs_read ? ', ' + r.docs_read + (r.docs_read === 1 ? ' document read' : ' documents read') : '') + '): '), r.online], { spacing: { after: 80 } }));
    body.push(P([B('Used before: '), 'same organisation ' + r.org_before + '; same country ' + r.country_before + '.'], { spacing: { after: 80 } }));
    const facts = [r.recommendations && 'Recommendations: ' + r.recommendations, r.paragraphs && 'Paragraphs cited: ' + r.paragraphs, r.quoted && 'Official wording quoted: ' + r.quoted, 'Email: ' + r.email, r.reviewed_on && 'Reviewed on ' + r.reviewed_on].filter(Boolean);
    body.push(new D.Paragraph({ spacing: { after: 200 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'DDE4EF', space: 6 } }, children: [new D.TextRun({ text: facts.join(' · '), font, size: 18, color: '5F6B87' })] }));
  });
});
if (open.length) {
  body.push(H('4. Still to review (' + open.length + ')', D.HeadingLevel.HEADING_1));
  open.forEach((r) => body.push(bullet([B(r.title), ' · ' + r.organisation + ' · ' + r.country + ' · said: ' + r.answer.toLowerCase() + ' · online: ' + r.web.toLowerCase() + ' · same organisation before: ' + r.org_before])));
}
const outreach = reviewed.filter((r) => r.outcome === 'edit' || r.outcome === 'outreach');
if (outreach.length) {
  body.push(H((open.length ? '5' : '4') + '. Who we contact', D.HeadingLevel.HEADING_1));
  body.push(table(['Organisation', 'Example', 'Why we contact them', 'Email'], outreach.map((r) => [r.organisation, r.title.slice(0, 90) + (r.title.length > 90 ? '…' : ''), r.outcome === 'edit' ? 'To tell them we count it as using the ' + r.recommendations : 'To send them the ' + (r.recommendations || 'recommendations') + ' (awareness gap)', r.email]), [2300, 3000, 2600, 1126]));
}
const doc = new D.Document({
  creator: 'EGRISS Secretariat', title: 'GAIN 2026 alignment review',
  styles: { default: { document: { run: { font, size: 21 } },
    title: { run: { font, size: 44, bold: true, color: NAVY }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true } },
    heading1: { run: { font, size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: TEAL, space: 4 } } } },
    heading2: { run: { font, size: 24, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true } } } },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] }] },
  sections: [{ properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
    footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: 'GAIN 2026 alignment review · EGRISS Secretariat · page ', font, size: 16, color: '5F6B87' }), new D.TextRun({ children: [D.PageNumber.CURRENT], font, size: 16, color: '5F6B87' })] })] }) },
    children: body }],
});
D.Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(path.join(out, 'gain2026_alignment_review.docx'), buf); console.log(rows.length + ' examples, ' + reviewed.length + ' reviewed ->', out); });
