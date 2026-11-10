/* The yearly alignment review report: the model, the Word document and the workbook.
   Used by build_report.js (node) and by the standalone review page (browser, docx and SheetJS from a CDN).
   Holds titles, organisations and reasons, no personal data. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.AlignmentReport = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var OUT = { edit: 'Count as using · tell them', aligned: 'Aligned · not counted as use', outreach: 'Keep their answer · send the recommendations', keep: 'Keep their answer',
    outscope: 'Keep · not statistics (check if valid)', deliberate: 'Keep · they chose not to use them', nocat: 'Keep · no matching groups' };
  var ORDER = ['edit', 'aligned', 'outreach', 'keep', 'deliberate', 'nocat', 'outscope'];
  var ANS = { no: 'Not used', dk: 'Don’t know' };
  var WEB = { supports_use: 'Points to use', against_use: 'Points away from use', unclear: 'Doesn’t settle it' };
  var WHERE = { desc: 'Their description', web: 'Online', similar: 'Similar example', other: 'Other' };

  // ---------- model ----------
  // o = { queue: {key: example}, dec: {key: decision}, meta, spec, excerpts, rules, text }
  function buildModel(o) {
    var queue = o.queue, dec = o.dec, spec = o.spec, T = o.text, R = o.rules, excerpts = o.excerpts || {}, meta = o.meta || {};
    var peerUsed = function (p) { return (p.qkey && dec[p.qkey] && dec[p.qkey].outcome) ? dec[p.qkey].outcome === 'edit' : p.used; };
    var fmtB = function (b) {
      if (!b || !b.examples) return 'none';
      var named = Object.keys(b.by_rec).filter(function (x) { return !/know|named/.test(x); });
      return b.used + ' of ' + b.examples + ' used' + (named.length ? ' (' + Object.keys(b.by_rec).filter(function (x) { return !/know/.test(x); }).map(function (x) { return x + ' ' + b.by_rec[x]; }).join(', ') + ')' : '');
    };
    var rows = Object.keys(queue).sort(function (a, b) { return (queue[a].organisation || '').localeCompare(queue[b].organisation || '') || (queue[a].title || '').localeCompare(queue[b].title || ''); }).map(function (k) {
      var q = queue[k], d = dec[k];
      var docs = (q.web && q.web.docs) || null, sig = (docs && docs.signal) || (q.web && q.web.signal);
      var h = q.history || {};
      var base = { key: k, organisation: T.niceOrg(q.organisation) || '', country: q.country || 'Regional or global', region: q.region || '', title: q.title, answer: ANS[q.answer] || q.answer, kind: q.kind_name || q.source || '',
        web: WEB[sig] || 'Not checked', docs_read: docs ? (docs.documents || []).filter(function (x) { return x.read; }).length : 0, online: docs ? (docs.summary || []).join(' ') : ((q.web && q.web.summary) || ''),
        org_before: (h.org || []).filter(function (x) { return x.year !== '2026'; }).map(function (x) { return x.year + ' ' + (x.used ? (x.recs && x.recs !== 'Not named' ? x.recs.replace(/;/g, '+') : 'used, not named') : 'not used'); }).join(', '),
        country_before: q.country ? fmtB(h.country) : '' };
      if (!d || !d.outcome) return Object.assign(base, { outcome: 'open', outcome_label: 'To review' });
      var g = T.rationale(R, spec, q, d, { excerpts: excerpts, peerUsed: peerUsed });
      var a = d.answers || {}, where = a.where || {};
      var email = d.outcome === 'edit' || d.outcome === 'outreach' ? (d.notified_on ? 'Sent ' + d.notified_on : 'To send') : 'No email';
      var seen = {}; g.found.forEach(function (c) { if (WHERE[where[c.id]]) seen[WHERE[where[c.id]]] = 1; });
      return Object.assign(base, {
        outcome: d.outcome, outcome_label: OUT[d.outcome] || d.outcome,
        kind: a.kind && spec.kinds[a.kind] ? spec.kinds[a.kind].name : base.kind,
        recommendations: g.recs.join(' + '),
        found: g.found.map(function (c) { return c.text; }), strong: g.found.filter(function (c) { return c.group === 'distinctive' || c.group === 'use' || c.id === 'e0'; }).length,
        not_found: g.notFound.length, cant_tell: g.unsure.length,
        seen_in: Object.keys(seen).join(', '),
        similar: g.peers ? g.peers.used + ' of ' + g.peers.n : '',
        paragraphs: g.paragraphs.map(T.paraName).join('; '), quoted: g.paragraphs.length ? (g.quoted.length ? (g.quoted.length === g.paragraphs.length ? 'Yes' : 'Some (' + g.quoted.length + ' of ' + g.paragraphs.length + ')') : 'No, summary only') : '',
        email: email, reviewed_on: (d.saved_at || '').slice(0, 10), note: d.note || '',
        why: d.rationale || g.text, why_edited: !!d.rationale_edited
      });
    });
    return { title: 'GAIN 2026 alignment review', made_on: new Date().toISOString().slice(0, 10), examples_2026: meta.examples || null, queue_pulled_at: meta.pulled_at || null,
      web_checked_on: meta.context && meta.context.web_searched_on || null, spec_version: spec.version, thresholds: spec.thresholds, outcomes: spec.outcomes, rows: rows };
  }

  // "the same organisation reported … ; 13 of 17 examples from Colombia used them (IRIS 12, IRRS 1)"
  function usedBefore(r) {
    var org = r.org_before ? 'the same organisation reported ' + r.org_before : 'the same organisation has no earlier examples';
    var cty = !r.country_before ? 'a regional example, so no country record' : r.country_before === 'none' ? 'no other examples from ' + r.country : r.country_before.replace(/^(\d+ of \d+) used/, '$1 examples from ' + r.country + ' used them');
    return org + '; ' + cty + '.';
  }
  function contactWhy(r) { return r.outcome === 'edit' ? 'To tell them we count it as using the ' + r.recommendations : 'To send them the ' + (r.recommendations || 'recommendations') + ' (awareness gap)'; }

  // ---------- Word ----------
  function buildDocx(D, m) {
    var rows = m.rows, font = 'Arial', NAVY = '1C2D5A', TEAL = '4CC3C9';
    var runs = function (text) { return [].concat(text).map(function (t) { return typeof t === 'string' ? new D.TextRun({ text: t, font: font }) : t; }); };
    var P = function (text, o) { return new D.Paragraph(Object.assign({ spacing: { after: 120 } }, o || {}, { children: runs(text) })); };
    var B = function (t) { return new D.TextRun({ text: t, bold: true, font: font }); };
    var H = function (text, level) { return new D.Paragraph({ heading: level, children: [new D.TextRun({ text: text, font: font })] }); };
    var bullet = function (text) { return new D.Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 }, children: runs(text) }); };
    var reviewed = rows.filter(function (r) { return r.outcome !== 'open'; }), open = rows.filter(function (r) { return r.outcome === 'open'; });
    var count = function (o) { return rows.filter(function (r) { return r.outcome === o; }).length; };
    var total = m.examples_2026, inRev = rows.length, usingReported = total ? total - inRev : null;
    var pct = function (n) { return total ? Math.round(100 * n / total) + '%' : 'n/a'; };
    var W = 9026;
    var cell = function (t, w, head) { return new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, shading: head ? { type: D.ShadingType.CLEAR, color: 'auto', fill: 'EFF7FF' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new D.Paragraph({ children: [new D.TextRun({ text: String(t), font: font, size: 19, bold: !!head })] })] }); };
    var table = function (head, data, widths) { return new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: widths,
      rows: [new D.TableRow({ tableHeader: true, children: head.map(function (h, i) { return cell(h, widths[i], true); }) })].concat(data.map(function (r) { return new D.TableRow({ children: r.map(function (c, i) { return cell(c, widths[i]); }) }); })) }); };
    var body = [];
    body.push(new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [new D.TextRun({ text: 'GAIN 2026 alignment review', font: font })] }));
    body.push(P('Examples where the respondent said the EGRISS recommendations were not used, or did not know, and what the Secretariat decided. Report made on ' + m.made_on + (m.queue_pulled_at ? ' from the review queue taken from Kobo on ' + m.queue_pulled_at.slice(0, 10) : '') + '.', { spacing: { after: 240 } }));
    body.push(H('1. Summary', D.HeadingLevel.HEADING_1));
    body.push(P([inRev + ' of ' + (total || '?') + ' GAIN 2026 examples said No or Don’t know and went to the review. ', B(reviewed.length + ' have been reviewed'), ', ' + open.length + ' are still to review.']));
    if (total) body.push(P('Use of the recommendations: ' + pct(usingReported) + ' as respondents reported it, ' + pct(usingReported + count('edit')) + ' after the review (' + count('edit') + ' counted as using), and ' + pct(usingReported + count('edit') + count('aligned')) + ' using or aligned (' + count('aligned') + ' aligned).'));
    body.push(table(['Outcome', 'Examples', 'What happens'], ORDER.filter(count).map(function (o) { return [OUT[o], count(o), m.outcomes[o].detail]; }).concat(open.length ? [['To review', open.length, 'Not reviewed yet']] : []), [3200, 1100, 4726]));
    body.push(P('', { spacing: { after: 120 } }));
    body.push(H('2. How we review', D.HeadingLevel.HEADING_1));
    body.push(P('Each example is checked in two parts. First three quick questions: is it about producing statistics; do they say why they did not use the recommendations; which groups does it cover. A “no” or a stated reason ends the review there. Otherwise the reviewer goes through a checklist for that kind of example, marking each item found, not found or can’t tell, and noting where it was seen: their description, public web pages, or a similar GAIN example.'));
    body.push(P('The checklist has strong items (markers of the recommendations’ approach, and signs they already use them) and good practice items. For a “don’t know” answer, two strong items are enough to count the example as using the recommendations. For a “not used” answer we ask for more, including a sign they already use them. Some evidence below that bar is recorded as aligned, which counts in the alignment figure but not as use.'));
    body.push(P('When an example is counted as using, the Secretariat emails the organisation with the checklist items found and the paragraphs of the recommendations they match, quoting the official wording where it has been added. Their original answer stays on record, and they can ask us to restore it. Suggestions on the page are hints: every decision is a reviewer’s.'));
    body.push(H('3. Decisions and why', D.HeadingLevel.HEADING_1));
    ORDER.forEach(function (o) {
      var list = reviewed.filter(function (r) { return r.outcome === o; }); if (!list.length) return;
      body.push(H(OUT[o] + ' (' + list.length + ')', D.HeadingLevel.HEADING_2));
      list.forEach(function (r) {
        body.push(new D.Paragraph({ keepNext: true, spacing: { before: 160, after: 60 }, children: [new D.TextRun({ text: r.title, bold: true, font: font, color: NAVY })] }));
        body.push(new D.Paragraph({ keepNext: true, spacing: { after: 80 }, children: [new D.TextRun({ text: [r.organisation, r.country, 'said: ' + r.answer.toLowerCase(), r.kind].filter(Boolean).join(' · '), font: font, size: 18, color: '5F6B87' })] }));
        r.why.split(/\n\s*\n/).forEach(function (para) { body.push(P(para.trim())); });
        if (r.online) body.push(P([B('Online: ' + r.web.toLowerCase() + (r.docs_read ? ' (' + r.docs_read + (r.docs_read === 1 ? ' document read)' : ' documents read)') : '') + '. '), r.online], { spacing: { after: 80 } }));
        body.push(P([B('Used before: '), usedBefore(r)], { spacing: { after: 80 } }));
        var facts = [r.recommendations && 'Recommendations: ' + r.recommendations, r.paragraphs && 'Paragraphs cited: ' + r.paragraphs, r.quoted && 'Official wording quoted: ' + r.quoted, 'Email: ' + r.email, r.reviewed_on && 'Reviewed on ' + r.reviewed_on].filter(Boolean);
        body.push(new D.Paragraph({ spacing: { after: 200 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'DDE4EF', space: 6 } }, children: [new D.TextRun({ text: facts.join(' · '), font: font, size: 18, color: '5F6B87' })] }));
      });
    });
    if (open.length) {
      body.push(H('4. Still to review (' + open.length + ')', D.HeadingLevel.HEADING_1));
      open.forEach(function (r) { body.push(bullet([B(r.title), ' · ' + r.organisation + ' · ' + r.country + ' · said: ' + r.answer.toLowerCase() + ' · online: ' + r.web.toLowerCase() + ' · same organisation, earlier rounds: ' + (r.org_before || 'none')])); });
    }
    var outreach = reviewed.filter(function (r) { return r.outcome === 'edit' || r.outcome === 'outreach'; });
    if (outreach.length) {
      body.push(H((open.length ? '5' : '4') + '. Who we contact', D.HeadingLevel.HEADING_1));
      body.push(table(['Organisation', 'Example', 'Why we contact them', 'Email'], outreach.map(function (r) { return [r.organisation, r.title.slice(0, 90) + (r.title.length > 90 ? '…' : ''), contactWhy(r), r.email]; }), [2300, 3000, 2600, 1126]));
    }
    return new D.Document({
      creator: 'EGRISS Secretariat', title: 'GAIN 2026 alignment review',
      styles: { default: { document: { run: { font: font, size: 21 } },
        title: { run: { font: font, size: 44, bold: true, color: NAVY }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true } },
        heading1: { run: { font: font, size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: TEAL, space: 4 } } } },
        heading2: { run: { font: font, size: 24, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true } } } },
      numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] }] },
      sections: [{ properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [new D.TextRun({ text: 'GAIN 2026 alignment review · EGRISS Secretariat · page ', font: font, size: 16, color: '5F6B87' }), new D.TextRun({ children: [D.PageNumber.CURRENT], font: font, size: 16, color: '5F6B87' })] })] }) },
        children: body }]
    });
  }

  // ---------- Excel (SheetJS): the same sheets as build_xlsx.py, counts by formula over the Examples sheet ----------
  function buildXlsx(XLSX, m) {
    var rows = m.rows, wb = XLSX.utils.book_new();
    var cols = [['Organisation', 28], ['Country', 16], ['Region', 14], ['Example', 46], ['Kind of example', 20], ['They answered', 13], ['Outcome', 30], ['Recommendations', 15],
      ['Strong items found', 11], ['Not found', 9], ["Can't tell", 9], ['Seen in', 22], ['Similar examples that used them', 14], ['Online', 16], ['Documents read', 10], ['What the documents show', 60],
      ['Same organisation, earlier rounds', 24], ['Same country, all rounds', 26], ['Paragraphs cited', 30], ['Official wording quoted', 16], ['Email', 14], ['Reviewed on', 12], ['Reviewer note', 26], ['Why we decided this', 90]];
    var data = [cols.map(function (c) { return c[0]; })].concat(rows.map(function (x) {
      return [x.organisation, x.country, x.region || '', x.title, x.kind || '', x.answer, x.outcome_label, x.recommendations || '', x.strong, x.not_found, x.cant_tell, x.seen_in || '', x.similar || '',
        x.web || '', x.docs_read, x.online || '', x.org_before || '', x.country_before || '', x.paragraphs || '', x.quoted || '', x.email || '', x.reviewed_on || '', x.note || '', x.why || ''].map(function (v) { return v == null ? '' : v; });
    }));
    var ex = XLSX.utils.aoa_to_sheet(data);
    ex['!cols'] = cols.map(function (c) { return { wch: c[1] }; });
    ex['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: cols.length - 1 } }) };
    var n = Math.max(rows.length + 1, 2), rng = function (col) { return 'Examples!$' + col + '$2:$' + col + '$' + n; };
    var G = rng('G'), Hc = rng('H'), Fc = rng('F'), Q = rng('U'), Pc = rng('T');
    var lines = [
      ['GAIN 2026 examples', m.examples_2026, 'Input: all GAIN 2026 examples in the Kobo pull (source: review queue, meta).'],
      ['In the review (said No or Don\'t know)', { f: 'COUNTA(Examples!$D$2:$D$' + n + ')' }, 'Every row of the Examples sheet.'],
      ['Reviewed', { f: 'B5-B7' }, ''], ['To review', { f: 'COUNTIF(' + G + ',"To review")' }, ''],
      null, ['Outcome', null, null],
      ['Count as using · tell them', { f: 'COUNTIF(' + G + ',"Count as using · tell them")' }, 'Recorded as using the recommendation; the organisation is told what changed and why.'],
      ['Aligned · not counted as use', { f: 'COUNTIF(' + G + ',"Aligned · not counted as use")' }, 'Counts in the alignment figure, not in use.'],
      ['Keep their answer · send the recommendations', { f: 'COUNTIF(' + G + ',"Keep their answer · send the recommendations")' }, 'Awareness gap: the Secretariat sends the recommendations.'],
      ['Keep their answer', { f: 'COUNTIF(' + G + ',"Keep their answer")' }, 'Too little evidence either way.'],
      ['Keep · they chose not to use them', { f: 'COUNTIF(' + G + ',"Keep · they chose not to use them")' }, ''],
      ['Keep · no matching groups', { f: 'COUNTIF(' + G + ',"Keep · no matching groups")' }, ''],
      ['Keep · not statistics (check if valid)', { f: 'COUNTIF(' + G + ',"Keep · not statistics (check if valid)")' }, 'Flagged for the validity check.'],
      null, ['Use of the recommendations', null, null],
      ['Using, as they told us', { f: 'IF(B4="","",(B4-B5)/B4)', z: '0%' }, 'Examples outside this review named a recommendation.'],
      ['Using, after our review', { f: 'IF(B4="","",(B4-B5+B10)/B4)', z: '0%' }, 'Adds the examples counted as using.'],
      ['Using or aligned', { f: 'IF(B4="","",(B4-B5+B10+B11)/B4)', z: '0%' }, 'Adds the aligned examples.'],
      null, ['By what they answered', null, null],
      ['Said: not used', { f: 'COUNTIF(' + Fc + ',"Not used")' }, ''], ['Said: don\'t know', { f: 'COUNTIF(' + Fc + ',"Don’t know")' }, ''],
      null, ['Recommendations recorded', null, null],
      ['IRRS', { f: 'COUNTIF(' + Hc + ',"*IRRS*")' }, 'Examples recorded against the IRRS (any outcome).'], ['IRIS', { f: 'COUNTIF(' + Hc + ',"*IRIS*")' }, ''], ['IROSS', { f: 'COUNTIF(' + Hc + ',"*IROSS*")' }, ''],
      null, ['Emails', null, null],
      ['To send', { f: 'COUNTIF(' + Q + ',"To send")' }, ''], ['Sent', { f: 'COUNTIF(' + Q + ',"Sent*")' }, ''],
      ['Emails quoting the official wording', { f: 'COUNTIF(' + Pc + ',"Yes")+COUNTIF(' + Pc + ',"Some*")' }, 'Paragraph wording comes from alignment/spec/excerpts.json.']
    ];
    var su = XLSX.utils.aoa_to_sheet([[m.title], ['Made on ' + m.made_on + (m.queue_pulled_at ? ' · queue taken from Kobo on ' + m.queue_pulled_at.slice(0, 10) : '') + (m.web_checked_on ? ' · web check on ' + m.web_checked_on : '')], []]);
    lines.forEach(function (l, i) {
      var r = 3 + i; if (!l) return;
      XLSX.utils.sheet_add_aoa(su, [[l[0]]], { origin: { r: r, c: 0 } });
      if (l[1] != null) { var c = XLSX.utils.encode_cell({ r: r, c: 1 }); su[c] = typeof l[1] === 'object' ? Object.assign({ t: 'n' }, l[1]) : { t: 'n', v: l[1] }; }
      if (l[2]) XLSX.utils.sheet_add_aoa(su, [[l[2]]], { origin: { r: r, c: 2 } });
    });
    su['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 3 + lines.length, c: 2 } });
    su['!cols'] = [{ wch: 44 }, { wch: 14 }, { wch: 70 }];
    var contact = rows.filter(function (x) { return x.outcome === 'edit' || x.outcome === 'outreach'; });
    var co = XLSX.utils.aoa_to_sheet([['Organisation', 'Example', 'Why we contact them', 'Recommendations', 'Paragraphs cited', 'Official wording quoted', 'Email']].concat(
      contact.length ? contact.map(function (x) { return [x.organisation, x.title, contactWhy(x), x.recommendations || '', x.paragraphs || '', x.quoted || '', x.email || '']; }) : [['No organisation to contact yet.']]));
    co['!cols'] = [30, 50, 50, 16, 32, 16, 14].map(function (w) { return { wch: w }; });
    var t = m.thresholds || {};
    var hw = XLSX.utils.aoa_to_sheet([['How we review'],
      ['1. Three quick questions: is it about producing statistics; do they say why they did not use the recommendations; which groups does it cover. A no, or a stated reason, ends the review there.'],
      ['2. A checklist for the kind of example: each item is marked found, not found or can\'t tell, with where it was seen (their description, public web pages, a similar GAIN example).'],
      ['3. The rule: strong items are markers of the recommendations\' approach and signs they already use them; good practice items count half. For a don\'t know answer two strong items are enough; for a not used answer we ask for more, including a sign they already use them. Below that bar, some evidence is recorded as aligned.'],
      ['Thresholds in the spec (version ' + m.spec_version + '): don\'t know ' + t.dk + ' points, not used ' + t.no + ' points with a sign of use, aligned from ' + t.aligned_min + ' points. Strong items 2 points, good practice 1.'],
      ['4. Emails list the items found and the paragraphs they match, quoting the official wording where it has been added. The respondent\'s own answer is never overwritten and they can ask us to restore it.'],
      ['Suggestions on the review page are hints; every decision is a reviewer\'s.']]);
    hw['!cols'] = [{ wch: 120 }];
    XLSX.utils.book_append_sheet(wb, su, 'Summary');
    XLSX.utils.book_append_sheet(wb, ex, 'Examples');
    XLSX.utils.book_append_sheet(wb, co, 'Contact');
    XLSX.utils.book_append_sheet(wb, hw, 'How we review');
    return wb;
  }

  return { buildModel: buildModel, buildDocx: buildDocx, buildXlsx: buildXlsx, OUT: OUT, ORDER: ORDER };
});
