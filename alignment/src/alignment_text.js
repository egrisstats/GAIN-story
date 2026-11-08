/* GAIN alignment review: the two-paragraph reason for a decision, written from the checklist.
   One function for the review page (window.AlignmentText) and the yearly report (node require),
   so the page, the saved decision and the report always say the same thing.
   Plain English, no en dashes (see alignment/PROMPT.md). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AlignmentText = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var ACR = { R: 'IRRS', I: 'IRIS', S: 'IROSS' };
  var FULL = { IRRS: 'International Recommendations on Refugee Statistics', IRIS: 'International Recommendations on IDP Statistics', IROSS: 'International Recommendations on Statelessness Statistics' };
  var GROUPS = { R: 'refugees, asylum seekers, people under temporary protection or returnees', I: 'internally displaced people', S: 'stateless people' };
  var WHERE = { desc: 'their description', web: 'public web pages', similar: 'a similar GAIN example', other: 'other sources' };
  var USE = { l0: 'the same organisation reported using them for this or related work', l1: 'it is built on an instrument that follows the recommendations', l2: 'EGRISS or an EGRISS member supported it, or it mentions the recommendations' };
  var WEB = { supports_use: 'public web pages point to use of the recommendations', against_use: 'public web pages point away from use', unclear: 'public web pages do not settle it' };
  var PEER_TAGS = [['org', 'from the same organisation'], ['country', 'from the same country'], ['region_source', 'with the same source in the same region'], ['source', 'with the same source']];

  function lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function join(a, word) { word = word || 'and'; return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join('; ') + '; ' + word + ' ' + a[a.length - 1]; }
  function joinShort(a, word) { word = word || 'and'; return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' ' + word + ' ' + a[a.length - 1]; }
  // a checklist item as a clause after "we found that": verbs get "it", the rest stand as they are
  function clause(c) {
    if (c.use) return USE[c.id] || lc(c.text);
    return /^(Uses|Identifies|Produces|Covers|Includes|Follows|Applies|Asks|Counts|Built)\b/.test(c.text) ? 'it ' + lc(c.text) : lc(c.text);
  }
  function acronyms(pops) { return String(pops || '').split('').map(function (p) { return ACR[p]; }).filter(Boolean); }
  function paraName(p) { return p.replace(/^(IRRS|IRIS|IROSS) /, function (m, x) { return x + ' paragraph' + (/[ ,]|to/.test(p.slice(m.length)) ? 's ' : ' '); }); }
  /** the paragraph ranges a decision cites: found items, the recommendations it was recorded against */
  function paragraphs(found, acr) {
    var out = [];
    found.filter(function (c) { return !c.use && c.refs; }).forEach(function (c) {
      String(c.refs).split(' · ').forEach(function (p) {
        if (!acr.some(function (x) { return p.indexOf(x + ' ') === 0; }) || out.indexOf(p) >= 0) return;
        // skip a range already cited inside a longer one (IRRS 214 after IRRS 131 to 134, 214)
        var parts = function (r) { return r.replace(/^\S+ /, '').split(/,\s*/); }, pre = p.split(' ')[0];
        var seen = [].concat.apply([], out.filter(function (r) { return r.split(' ')[0] === pre; }).map(parts));
        if (parts(p).every(function (x) { return seen.indexOf(x) >= 0; })) return;
        out.push(p);
      });
    });
    return out;
  }
  function peerContext(q, used) {
    var ps = q.peers || [], pick = null;
    PEER_TAGS.some(function (t) { var n = ps.filter(function (p) { return p.tags.indexOf(t[0]) >= 0; }); if (n.length >= 3) { pick = [t, n]; return true; } return false; });
    if (!pick) PEER_TAGS.some(function (t) { var n = ps.filter(function (p) { return p.tags.indexOf(t[0]) >= 0; }); if (n.length) { pick = [t, n]; return true; } return false; });
    if (!pick) return null;
    var u = pick[1].filter(used).length;
    return { text: u + ' of ' + pick[1].length + ' similar GAIN examples ' + pick[0][1] + ' used the recommendations', used: u, n: pick[1].length, tag: pick[0][0] };
  }

  /**
   * rules: AlignmentRules; spec: decision_tree.json; q: the queue entry; d: {answer, outcome, answers, note, use_sign}
   * opts: {excerpts: {"IRRS 214": "official wording"}, peerUsed: function (peer) -> bool}
   * returns {p1, p2, text, recs, found, notFound, unsure, paragraphs, quoted, peers, web}
   */
  function rationale(rules, spec, q, d, opts) {
    opts = opts || {};
    var a = d.answers || {}, o = d.outcome, org = q.organisation || 'The organisation', acr = acronyms(a.populations);
    var states = a.states || {}; if (!a.states) (a.ticks || []).forEach(function (t) { states[t] = 'found'; });
    var crit = a.kind && spec.kinds[a.kind] ? rules.criteriaFor(spec, a.kind) : [];
    var found = crit.filter(function (c) { return states[c.id] === 'found'; }), notFound = crit.filter(function (c) { return states[c.id] === 'not'; }), unsure = crit.filter(function (c) { return states[c.id] === 'unsure'; });
    var kindName = a.kind && spec.kinds[a.kind] ? lc(spec.kinds[a.kind].name) : (q.kind_name ? lc(q.kind_name) : 'an example');
    var said = d.answer === 'dk' ? 'said they did not know whether the recommendations were used' : 'said none of the recommendations were used';
    var p1 = org + ' reported “' + q.title + '”' + (kindName ? ' (' + kindName + (q.country ? ', ' + q.country : '') + ')' : '') + ' and ' + said + '. ';
    if (o === 'outscope') p1 += 'We found that it is not about producing statistics: it delivers a programme or service rather than data.';
    else if (o === 'deliberate') p1 += 'In their answers they say they decided not to use the recommendations.';
    else if (o === 'outreach') p1 += 'In their answers they say they do not know the recommendations.';
    else if (o === 'nocat') p1 += 'It is about producing statistics, but the groups it covers cannot be told apart as the groups the recommendations cover.';
    else {
      var groups = String(a.populations || '').split('').map(function (p) { return GROUPS[p]; }).filter(Boolean);
      p1 += 'It is about producing statistics and covers ' + (joinShort(groups) || 'the groups the recommendations cover') + '.' + (a.q2 === 'other' ? ' They follow another framework that draws on the recommendations.' : '');
      var shows = found.filter(function (c) { return !c.use; }), signs = found.filter(function (c) { return c.use; });
      var where = function (c) { var w = (a.where || {})[c.id]; return WHERE[w] ? ' (seen in ' + WHERE[w] + ')' : ''; };
      if (shows.length) p1 += ' Checking it against the ' + joinShort(acr.map(function (x) { return FULL[x] + ' (' + x + ')'; })) + ', we found that ' + join(shows.map(function (c) { return clause(c) + where(c); })) + '.';
      if (signs.length) p1 += ' We also found signs they already use them: ' + join(signs.map(function (c) { return clause(c) + where(c); })) + '.';
      if (!shows.length && !signs.length) p1 += ' We did not find any of the recommendations’ markers in what we could check.';
      if (notFound.length) p1 += ' We did not find that ' + join(notFound.map(clause), 'or') + '.';
      if (unsure.length) p1 += ' We could not tell whether ' + join(unsure.map(clause), 'or') + '.';
    }
    var A = acr.join(' and ') || 'recommendations', p2;
    if (o === 'edit') p2 = 'That is enough evidence to count it as using the ' + A + (d.answer === 'dk' ? ': for a “don’t know” answer, two strong items are enough' : ': for a “not used” answer we need stronger evidence, including a sign they already use them') + '. We have recorded it as using the ' + A + ' and are telling ' + org + ' what we changed and why. Their original answer stays on record, and they can ask us to restore it.';
    else if (o === 'aligned') p2 = 'This shows the recommendations’ approach, but not enough to count it as use' + (d.answer === 'no' && !d.use_sign ? ', because for a “not used” answer we also need a sign they already use them' : '') + '. We kept their answer and recorded the example as aligned, which counts in the alignment figure but not as use. No email is sent.';
    else if (o === 'outreach') p2 = 'We kept their answer and will send them the ' + A + ' with a short introduction and the offer of training or e-learning, so the next round can build on them. It counts as an awareness gap.';
    else if (o === 'deliberate') p2 = 'We kept their answer and recorded their reason. No email is sent.';
    else if (o === 'outscope') p2 = 'We kept their answer and flagged the example for the validity check of GAIN examples. No email is sent.';
    else if (o === 'nocat') p2 = 'We kept their answer. No email is sent.';
    else p2 = 'There is too little evidence to change their answer, so we kept it. No email is sent.';
    var ctx = [], pc = peerContext(q, opts.peerUsed || function (p) { return p.used; });
    if (pc) ctx.push(pc.text);
    if (q.web && WEB[q.web.signal]) ctx.push(WEB[q.web.signal]);
    if (ctx.length) p2 += ' For comparison, ' + ctx.join('; ') + '.';
    var paras = o === 'edit' ? paragraphs(found, acr) : [], ex = opts.excerpts || {}, quoted = paras.filter(function (p) { return ex[p]; });
    if (paras.length) p2 += ' The email cites ' + joinShort(paras.map(paraName)) + (quoted.length ? ', quoting the official wording' + (quoted.length < paras.length ? ' for ' + quoted.length + ' of them' : '') : '') + '.';
    if (d.note) p2 += ' Reviewer’s note: ' + String(d.note).trim().replace(/([^.!?])$/, '$1.');
    return { p1: p1, p2: p2, text: p1 + '\n\n' + p2, recs: acr, found: found, notFound: notFound, unsure: unsure, paragraphs: paras, quoted: quoted, peers: pc, web: q.web ? q.web.signal : null };
  }
  return { rationale: rationale, acronyms: acronyms, paraName: paraName, FULL: FULL };
});
