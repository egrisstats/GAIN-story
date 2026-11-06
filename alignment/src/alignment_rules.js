/* GAIN alignment review: the decision tree as code, in JavaScript.
   Same rules as alignment_rules.py, read from spec/decision_tree.json, so thresholds and criteria
   change in the spec only. Works in the browser (window.AlignmentRules) and in node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AlignmentRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REC_BY_POP = { R: 'IRRS', I: 'IRIS', S: 'IROSS' };

  /** step 5 criteria for a kind: [{id, points, use, pro12, text, refs, group}] */
  function criteriaFor(spec, kind) {
    var k = spec.kinds[kind], c = spec.criteria, out = [];
    if (k.event) {
      c.event.items.forEach(function (e) { out.push({ id: e.id, points: e.points, use: false, pro12: null, text: e.text, refs: e.refs || '', group: 'event' }); });
    } else {
      c.distinctive.items.forEach(function (d) { out.push({ id: d.id, points: c.distinctive.points, use: false, pro12: d.pro12, text: d.text, refs: d.refs || '', group: 'distinctive' }); });
      k.practice.forEach(function (p, i) { out.push({ id: 'p' + i, points: c.practice.points, use: false, pro12: c.practice.pro12, text: p[0], refs: p[1] || '', group: 'practice' }); });
    }
    c.use.items.forEach(function (u) { out.push({ id: u.id, points: c.use.points, use: true, pro12: null, text: u.text, refs: u.refs || '', group: 'use' }); });
    return out;
  }

  function score(spec, kind, ticks, reason) {
    var crit = {};
    criteriaFor(spec, kind).forEach(function (c) { crit[c.id] = c; });
    var unknown = (ticks || []).filter(function (t) { return !crit[t]; });
    if (unknown.length) throw new Error('Unknown criteria for ' + kind + ': ' + unknown.join(', '));
    var pts = 0, use = false, pro12 = {};
    (ticks || []).forEach(function (t) { pts += crit[t].points; use = use || crit[t].use; if (crit[t].pro12) pro12[crit[t].pro12] = 1; });
    if (reason === 'other') { pts += spec.steps[1].options.other.points; use = true; }
    return { points: pts, use: use, pro12: Object.keys(pro12).sort() };
  }

  function out(spec, key, path) {
    var o = spec.outcomes[key];
    return { outcome: key, label: o.label, detail: o.detail, path: path, score: null, use_sign: null };
  }

  /** a: {answer: no|dk|dkw, q1, q2, kind, q4, ticks, populations}. Unanswered steps stop the walk
      with outcome null, so a half-filled form shows how far it got. */
  function decide(spec, a) {
    var path = [];
    if (a.q1 === false) return out(spec, 'outscope', ['q1:no']);
    if (a.q1 !== true) return { outcome: null, path: path, score: null, step: 'q1' };
    path.push('q1:yes');
    var reason = a.q2 || 'none';
    path.push('q2:' + reason);
    var then = spec.steps[1].options[reason].then;
    if (then !== 'continue') return out(spec, then, path);
    if (!a.kind) return { outcome: null, path: path, score: null, step: 'q3' };
    path.push('q3:' + a.kind);
    if (a.q4 === false) return out(spec, 'nocat', path.concat(['q4:no']));
    if (a.q4 !== true) return { outcome: null, path: path, score: null, step: 'q4' };
    path.push('q4:yes');
    var s = score(spec, a.kind, a.ticks || [], reason), t = spec.thresholds, need = t[a.answer];
    var outcome = s.points >= need && (a.answer !== 'no' || !t.no_requires_use_sign || s.use) ? 'edit'
      : s.points >= t.aligned_min ? 'aligned' : 'keep';
    var res = out(spec, outcome, path.concat(['q5:' + s.points]));
    res.score = s.points; res.use_sign = s.use; res.need = need;
    if (outcome === 'edit') {
      var recs = String(a.populations || '').split('').filter(function (p) { return REC_BY_POP[p]; }).map(function (p) { return REC_BY_POP[p]; });
      res.fill = { PRO09_reviewed: 1, PRO10_reviewed: recs.join(' ') || null, PRO12_reviewed: s.pro12, review_source: 'Secretariat edit, notified' };
    }
    return res;
  }

  return { criteriaFor: criteriaFor, score: score, decide: decide, REC_BY_POP: REC_BY_POP };
});
