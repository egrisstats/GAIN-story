  // ---------- store: the standalone page (GitHub Pages + Kobo) ----------
  // Queue and decisions come from files the publish workflow writes next to the page (review_sync.py).
  // Saving opens the Kobo review form, prefilled, in a new tab; the decision is kept on this computer
  // as "pending" until the next publish brings it back from Kobo. Descriptions and web findings only
  // ever enter the page from the evidence file the reviewer opens (they stay in this browser tab).
  var PUB = { base: '../data/', form: null, fetched: null, pending: {}, evidence: null, refresh: null };
  var PENDING_KEY = 'gainReviewPending', EVID_KEY = 'gainReviewEvidence', ME_KEY = 'gainReviewer';
  var TICK_ST = { found: 'f', not: 'n', unsure: 'u' }, WHERE_K = { desc: 'desc', web: 'web', similar: 'similar', other: 'other' };
  function readPending() { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}'); } catch (x) { return {}; } }
  function writePending(p) { PUB.pending = p; try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch (x) {} }
  try { S.me = localStorage.getItem(ME_KEY) || null; } catch (x) {}
  if (S.me) S.names[S.me] = S.me;

  function encodeTicks(a) {
    var st = a.states || {}, wh = a.where || {}, ids = {};
    Object.keys(st).forEach(function (i) { ids[i] = 1; }); (a.ticks || []).forEach(function (i) { ids[i] = 1; });
    return Object.keys(ids).sort().map(function (i) { var s = st[i] || ((a.ticks || []).indexOf(i) >= 0 ? 'found' : 'not'); return i + ':' + (TICK_ST[s] || 'f') + ':' + (WHERE_K[wh[i]] || ''); }).join(';');
  }
  function yn(v) { return v === true ? 'yes' : v === false ? 'no' : ''; }

  // pending entries are applied on top of the published decisions until Kobo has caught up:
  // a newer saved_at from Kobo, or a publish made more than 40 minutes after the action, retires them
  function mergeDecisions(server) {
    var out = {}, p = readPending(), fetched = PUB.fetched ? Date.parse(PUB.fetched) : 0, changed = false;
    Object.keys(server).forEach(function (k) { out[k] = server[k]; });
    Object.keys(p).forEach(function (k) {
      var x = p[k], s = server[k], at = Date.parse(x.saved_at || 0);
      var caught = (s && s.saved_at && Date.parse(s.saved_at) >= at && x.action === 'save') ||
        (x.action === 'sent' && s && s.notified_on) || (x.action === 'unsent' && s && !s.notified_on) || (x.action === 'undo' && !s && fetched > at) ||
        (fetched - at > 40 * 60000);
      if (caught) { delete p[k]; changed = true; return; }
      if (x.action === 'save') out[k] = Object.assign({}, x.doc, { pending: true });
      else if (x.action === 'undo') delete out[k];
      else if (x.action === 'sent' && out[k]) out[k] = Object.assign({}, out[k], { notified_on: x.saved_at.slice(0, 10), pending: true });
      else if (x.action === 'unsent' && out[k]) out[k] = Object.assign({}, out[k], { notified_on: null, pending: true });
    });
    if (changed) writePending(p); else PUB.pending = p;
    return out;
  }
  function pendingCount() { return Object.keys(PUB.pending).length; }
  function storeNote() {
    var when = PUB.fetched ? new Date(PUB.fetched).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    var n = pendingCount();
    return (when ? 'Decisions from Kobo as of ' + when : 'No decisions from Kobo yet') + (n ? ' · <b>' + n + '</b> saved here, waiting for Kobo' : '') +
      (PUB.evidence ? ' · evidence file from ' + esc(PUB.evidence.pulled_at.slice(0, 10)) + ' open' : ' · <b>no evidence file open</b>');
  }

  function loadQueue() {
    return fetch(PUB.base + 'review_queue.json?x=' + Date.now()).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      var q = {}; (j.queue || []).forEach(function (e) { q[e.key] = e; });
      S.queue = q; S.meta = j.meta || null; PUB.form = j.meta && j.meta.form || null; S.loaded = true; clearTimeout(timer); note('');
      applyEvidence(); render();
    });
  }
  function loadDecisions() {
    return fetch(PUB.base + 'review_decisions.json?x=' + Date.now()).then(function (r) { return r.ok ? r.json() : { decisions: {} }; }).then(function (j) {
      PUB.fetched = j.fetched_at || null; S.dec = mergeDecisions(j.decisions || {}); S.decLoaded = true;
      Object.keys(S.dec).forEach(function (k) { var r = S.dec[k].reviewer; if (r) S.names[r] = r; });
      S.storeNote = storeNote(); render();
    });
  }
  loadQueue().catch(function () { clearTimeout(timer); note('The review queue (data/review_queue.json) didn’t load. It is written by the publish workflow; if the page has just been set up, wait for the next publish.'); $('qlist').innerHTML = '<div class="empty"><b>No review queue yet.</b><span>The publish workflow writes it from Kobo every 15 minutes during collection.</span></div>'; });
  loadDecisions().catch(function () {});
  PUB.refresh = setInterval(function () { loadDecisions().catch(function () {}); }, 5 * 60000);

  // ---------- the evidence file ----------
  function applyEvidence() {
    var ev = PUB.evidence; if (!ev) return;
    Object.keys(ev.items || {}).forEach(function (k) { if (S.queue[k]) Object.assign(S.queue[k], ev.items[k]); });
    if (S.meta && ev.context) S.meta.context = Object.assign({}, S.meta.context || {}, ev.context);
  }
  function openEvidence(text) {
    var j; try { j = JSON.parse(text); } catch (x) { note('That file isn’t the evidence file: it should be the review-evidence.json written by review_sync.py.'); return; }
    if (!j || j.kind !== 'gain-review-evidence' || !j.items) { note('That file isn’t the evidence file: it should be the review-evidence.json written by review_sync.py.'); return; }
    PUB.evidence = j; try { sessionStorage.setItem(EVID_KEY, text); } catch (x) {}
    applyEvidence(); S.storeNote = storeNote(); note(''); render();
  }
  try { var kept = sessionStorage.getItem(EVID_KEY); if (kept) { PUB.evidence = JSON.parse(kept); } } catch (x) {}

  // ---------- saving through the Kobo form ----------
  function formUrl(fields) {
    if (!PUB.form || !PUB.form.url) return null;
    var root = PUB.form.root || 'data';
    var qs = Object.keys(fields).filter(function (n) { return fields[n] != null && fields[n] !== ''; })
      .map(function (n) { return 'd[/' + root + '/' + n + ']=' + encodeURIComponent(String(fields[n])); });
    // back to this page after Submit; the Kobo server refuses local (http) return addresses, so only when published
    if (location.protocol === 'https:') qs.push('returnUrl=' + encodeURIComponent(location.href.split('#')[0].split('?')[0]));
    return PUB.form.url + (PUB.form.url.indexOf('?') >= 0 ? '&' : '?') + qs.join('&');
  }
  function setMe(v) {
    S.me = (v || '').trim().slice(0, 12) || null;
    if (S.me) S.names[S.me] = S.me;
    try { if (S.me) localStorage.setItem(ME_KEY, S.me); else localStorage.removeItem(ME_KEY); } catch (x) {}
  }
  function askMe() { var i = $('meInput'); if (i && i.value.trim() && !S.me) setMe(i.value); return S.me; }
  if ($('meInput') && S.me) $('meInput').value = S.me;
  function submit(k, action, doc, extra) {
    var q = S.queue[k], at = new Date().toISOString();
    var fields = Object.assign({ example_key: k, title: (q.title || '').slice(0, 200), answer: q.answer, action: action, saved_at: at, reviewer: S.me || '', spec_version: S.spec && S.spec.version || '', source: 'page' }, extra || {});
    var p = readPending(); p[k] = { action: action, saved_at: at, doc: doc || null }; writePending(p);
    S.dec = mergeDecisions(Object.keys(S.dec).reduce(function (m, x) { if (!S.dec[x].pending) m[x] = S.dec[x]; return m; }, {}));
    S.storeNote = storeNote();
    var url = formUrl(fields);
    if (url) {
      var w = null; try { w = window.open(url, '_blank'); } catch (x) {}
      var n = $('note');
      if (!w) { n.innerHTML = 'Your browser blocked the Kobo form window. <a href="' + esc(url) + '" target="_blank" rel="noopener">Open the Kobo form</a> and press Submit there, or allow pop-ups for this page.'; n.hidden = false; }
      else { n.innerHTML = 'The Kobo form opened in a new tab: press <b>Submit</b> there. If it didn’t open, <a href="' + esc(url) + '" target="_blank" rel="noopener">open the Kobo form</a>.'; n.hidden = false; }
      return true;
    }
    note('The Kobo review form isn’t set up yet (no form link in the queue file), so this is saved on this computer only.');
    return false;
  }
  var saving = false;
  function save(then) {
    if (saving || !S.sel) return;
    var q = S.queue[S.sel], a = S.draft, res = decideFor(S.sel, a);
    if (!res.outcome) return;
    askMe();
    var prev = S.dec[S.sel] || {};
    var doc = { key: S.sel, response_id: q.response_id, title_start: q.title_start, answer: q.answer, outcome: res.outcome, score: res.score, use_sign: res.use_sign,
      answers: { q1: a.q1, q2: a.q2 || 'none', kind: a.kind, q4: a.q4, ticks: a.ticks.slice(), states: a.states || {}, where: a.where || {}, populations: a.populations || '' }, note: a.note || '',
      fill: res.fill || null, reviewer: S.me || null, saved_at: new Date().toISOString(), spec_version: S.spec.version || null,
      notified_on: prev.notified_on || null, objection: prev.objection || null,
      rationale: a.rationale != null ? a.rationale : (S.genWhy || ''), rationale_edited: a.rationale != null };
    var sent = submit(S.sel, 'save', doc, { outcome: res.outcome, score: res.score, use_sign: yn(res.use_sign), q1: yn(a.q1), q2: a.q2 || 'none', q4: yn(a.q4),
      populations: a.populations || '', kind: a.kind || '', ticks: encodeTicks(a), rationale: doc.rationale, rationale_edited: yn(doc.rationale_edited), note: doc.note });
    $('saveStatus').textContent = sent ? 'Saved here: ' + OUT[res.outcome].label + '. Press Submit in the Kobo tab; it shows for everyone within about 20 minutes.' : 'Saved on this computer only.';
    if (then) then(); else render();
  }
  function clearDecision() {
    if (!S.sel) return;
    submit(S.sel, 'undo', null, {});
    S.draft = blankDraft(S.queue[S.sel]); render();
  }
  function markSent(ks) {
    var unset = ks.every(function (k) { return S.dec[k] && S.dec[k].notified_on; });
    ks.forEach(function (k) { submit(k, unset ? 'unsent' : 'sent', null, {}); });
    render();
    if (ks.length > 1) note('One Kobo tab opened per example (' + ks.length + '): press Submit in each.');
  }

  // ---------- downloads: emails, report, checklist ----------
  function saveFile(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  function lib(name, src, test) {
    if (test()) return Promise.resolve();
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = function () { test() ? ok() : bad(new Error(name)); }; s.onerror = function () { bad(new Error(name)); }; document.head.appendChild(s); })
      .catch(function () { note('The ' + name + ' library didn’t load from the CDN. Check your connection and try again.'); throw new Error(name); });
  }
  var DOCX_SRC = 'https://cdn.jsdelivr.net/npm/docx@9.1.1/dist/index.iife.js', XLSX_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  function reportModel() {
    var dec = {}; Object.keys(S.dec).forEach(function (k) { dec[k] = S.dec[k]; });
    return window.AlignmentReport.buildModel({ queue: S.queue, dec: dec, meta: S.meta || {}, spec: S.spec, excerpts: S.excerpts || {}, rules: window.AlignmentRules, text: window.AlignmentText });
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function downloadDocx() {
    lib('Word', DOCX_SRC, function () { return !!window.docx; }).then(function () {
      var doc = window.AlignmentReport.buildDocx(window.docx, reportModel());
      return window.docx.Packer.toBlob(doc);
    }).then(function (b) { saveFile('gain2026_alignment_review_' + today() + '.docx', b); }).catch(function () {});
  }
  function downloadXlsx() {
    lib('Excel', XLSX_SRC, function () { return !!window.XLSX; }).then(function () {
      var wb = window.AlignmentReport.buildXlsx(window.XLSX, reportModel());
      var out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveFile('gain2026_alignment_review_' + today() + '.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    }).catch(function () {});
  }
  function downloadMails() {
    var ds = mailDrafts();
    if (!ds.length) { note('No email drafts yet: they appear once an example is saved as Count as using or Send the recommendations.'); return; }
    var txt = ds.map(function (d) { return '==== ' + d.org + ' (' + d.ks.length + ' example' + (d.ks.length > 1 ? 's' : '') + (d.sent ? ', sent ' + d.sent : ', to send') + ') ====\n\n' + d.parts.join('\n\n- - -\n\n') + '\n\n' + d.notes; }).join('\n\n\n');
    saveFile('gain2026_review_emails_' + today() + '.txt', new Blob([txt], { type: 'text/plain;charset=utf-8' }));
  }
  function downloadDecisions() {
    saveFile('gain2026_review_decisions_' + today() + '.json', new Blob([JSON.stringify({ exported_at: new Date().toISOString(), decisions: S.dec }, null, 1)], { type: 'application/json' }));
  }
  function printChecklist() { if (!S.sel) return; document.body.classList.add('print-detail'); window.print(); setTimeout(function () { document.body.classList.remove('print-detail'); }, 500); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'dlDocx') downloadDocx(); else if (b.id === 'dlXlsx') downloadXlsx(); else if (b.id === 'dlMails') downloadMails(); else if (b.id === 'dlJson') downloadDecisions();
    else if (b.id === 'printChk') printChecklist(); else if (b.id === 'evOpen') $('evFile').click();
    else if (b.id === 'evClose') { PUB.evidence = null; try { sessionStorage.removeItem(EVID_KEY); } catch (x) {} loadQueue().catch(function () {}); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'meInput') { setMe(e.target.value); render(); }
    if (e.target.id === 'evFile' && e.target.files && e.target.files[0]) { var f = e.target.files[0], rd = new FileReader(); rd.onload = function () { openEvidence(String(rd.result)); }; rd.readAsText(f); e.target.value = ''; }
  });
  window.addEventListener('focus', function () { loadDecisions().catch(function () {}); });
