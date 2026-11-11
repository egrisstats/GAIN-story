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
  // a newer saved_at from Kobo retires them. A save Kobo still doesn't have 40 minutes on was probably never
  // submitted: it stays here, flagged, until the reviewer submits it again or forgets it.
  function mergeDecisions(server) {
    var out = {}, p = readPending(), fetched = PUB.fetched ? Date.parse(PUB.fetched) : 0, changed = false;
    Object.keys(server).forEach(function (k) { out[k] = server[k]; });
    Object.keys(p).forEach(function (k) {
      var x = p[k], s = server[k], at = Date.parse(x.saved_at || 0);
      var caught = (s && s.saved_at && Date.parse(s.saved_at) >= at && x.action === 'save') ||
        (x.action === 'sent' && s && s.notified_on) || (x.action === 'unsent' && s && !s.notified_on) || (x.action === 'undo' && !s && fetched > at) ||
        (x.action !== 'save' && fetched - at > 40 * 60000);
      var late = x.action === 'save' && fetched - at > 40 * 60000;
      if (caught) { delete p[k]; changed = true; return; }
      if (x.action === 'save') out[k] = Object.assign({}, x.doc, { pending: true, unsent: late });
      else if (x.action === 'undo') delete out[k];
      else if (x.action === 'sent' && out[k]) out[k] = Object.assign({}, out[k], { notified_on: x.saved_at.slice(0, 10), pending: true });
      else if (x.action === 'unsent' && out[k]) out[k] = Object.assign({}, out[k], { notified_on: null, pending: true });
    });
    if (changed) writePending(p); else PUB.pending = p;
    return out;
  }
  function pendingCount() { return Object.keys(PUB.pending).length; }
  function lateCount() { return Object.keys(S.dec).filter(function (k) { return S.dec[k].unsent; }).length; }
  function storeNote() {
    var when = PUB.fetched ? new Date(PUB.fetched).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    var n = pendingCount();
    return (when ? 'Decisions from Kobo as of ' + when : 'No decisions from Kobo yet') + (n ? ' · <b>' + n + '</b> being shared' : '') + (lateCount() ? ' · <b style="color:var(--coral)">' + lateCount() + ' not received by Kobo: open and submit again</b>' : '') +
      (PUB.evidence ? ' · descriptions file from ' + esc(PUB.evidence.pulled_at.slice(0, 10)) + ' open' : ' · <b>no descriptions file open</b>');
  }

  // The same files are published on two sites; a publish on one can lag behind the other (GitHub's deploy step
  // sometimes stalls). Read this site's copy and the other site's, and use whichever is newer.
  var MIRRORS = ['https://egrisstats.github.io/GAIN-story/dashboard/data/', 'https://mitrovif.github.io/GAIN-story/dashboard/data/'];
  function freshest(file, stamp) {
    var bases = [PUB.base].concat(location.protocol === 'https:' ? MIRRORS.filter(function (m) { return new URL(m).host !== location.host; }) : []);
    return Promise.all(bases.map(function (b) {
      return fetch(b + file + '?x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    })).then(function (js) {
      var best = null; js.forEach(function (j) { if (j && (!best || String(stamp(j) || '') > String(stamp(best) || ''))) best = j; });
      return best;
    });
  }
  function loadQueue() {
    return freshest('review_queue.json', function (j) { return j.meta && (j.meta.published_at || j.meta.pulled_at); }).then(function (j) { if (!j) throw new Error('no queue'); return j; }).then(function (j) {
      var q = {}; (j.queue || []).forEach(function (e) { q[e.key] = e; });
      S.queue = q; S.meta = j.meta || null; PUB.form = j.meta && j.meta.form || null; S.loaded = true; clearTimeout(timer); note('');
      applyEvidence(); render();
    });
  }
  function loadDecisions() {
    return freshest('review_decisions.json', function (j) { return j.fetched_at; }).then(function (j) { return j || { decisions: {} }; }).then(function (j) {
      PUB.fetched = j.fetched_at || null; S.dec = mergeDecisions(j.decisions || {}); S.decLoaded = true;
      Object.keys(S.dec).forEach(function (k) { var r = S.dec[k].reviewer; if (r) S.names[r] = r; });
      S.storeNote = storeNote(); render();
    });
  }
  loadQueue().catch(function () { clearTimeout(timer); note('The review queue (data/review_queue.json) didn’t load. It is written by the publish workflow; if the page has just been set up, wait for the next publish.'); $('qlist').innerHTML = '<div class="empty"><b>No review queue yet.</b><span>The publish workflow writes it from Kobo every 15 minutes during collection.</span></div>'; });
  loadDecisions().catch(function () {});
  PUB.refresh = setInterval(function () { loadDecisions().catch(function () {}); loadQueue().catch(function () {}); }, 5 * 60000);

  // why an example shows no description: no file open, or the file was made before the example arrived
  S.evidenceNote = function (q, what) {
    var ev = PUB.evidence, thing = what === 'online' ? 'what was found online for this example' : 'what they wrote and what was found online';
    if (!ev) return 'Open the descriptions file (top of the page) to see ' + thing + '.';
    return 'This example arrived after your descriptions file was made (' + esc(String(ev.pulled_at || ev.made_at || '').slice(0, 10)) + '), so the file does not cover it. Ask the Secretariat for a newer file before you review it.';
  };
  // ---------- the evidence file ----------
  function applyEvidence() {
    var ev = PUB.evidence; if (!ev) return;
    Object.keys(ev.items || {}).forEach(function (k) { if (S.queue[k]) Object.assign(S.queue[k], ev.items[k]); });
    if (S.meta && ev.context) S.meta.context = Object.assign({}, S.meta.context || {}, ev.context);
  }
  function openEvidence(text) {
    var j; try { j = JSON.parse(text); } catch (x) { note('That isn’t the descriptions file. It is called review-evidence.json; ask the Secretariat where it is kept.'); return; }
    if (!j || j.kind !== 'gain-review-evidence' || !j.items) { note('That isn’t the descriptions file. It is called review-evidence.json; ask the Secretariat where it is kept.'); return; }
    PUB.evidence = j; try { sessionStorage.setItem(EVID_KEY, text); } catch (x) {}
    applyEvidence(); S.storeNote = storeNote(); note(''); render();
  }
  try { var kept = sessionStorage.getItem(EVID_KEY); if (kept) { PUB.evidence = JSON.parse(kept); } } catch (x) {}

  // ---------- saving through the Kobo form ----------
  // The Kobo web form server refuses links over about 2,000 characters, and text that looks like markup or script.
  // So the link carries the decision itself, never the reason the page writes from the checklist (that text is
  // rebuilt from the answers wherever it is shown). A reason the reviewer edited, and the note, are sent and
  // shortened only if they would not fit; PUB.cut says when that happened.
  var URL_MAX = 1950;
  function clean(v) { return String(v).replace(/</g, '‹').replace(/>/g, '›').replace(/\b(on[a-z]+)\s*=/gi, '$1 :').replace(/javascript:/gi, 'javascript '); }
  function formUrl(fields) {
    if (!PUB.form || !PUB.form.url) return null;
    var root = PUB.form.root || 'data', f = Object.assign({}, fields);
    if (f.rationale_edited !== 'yes') delete f.rationale;
    if (f.title) f.title = String(f.title).slice(0, 80);
    var build = function () {
      var qs = Object.keys(f).filter(function (n) { return f[n] != null && f[n] !== ''; })
        .map(function (n) { return 'd[/' + root + '/' + n + ']=' + encodeURIComponent(clean(f[n])); });
      // back to the dashboard, review open, after Submit; the Kobo server refuses local (http) return addresses, so only when published
      if (location.protocol === 'https:') qs.push('returnUrl=' + encodeURIComponent(new URL('../#review', location.href).href));
      return PUB.form.url + (PUB.form.url.indexOf('?') >= 0 ? '&' : '?') + qs.join('&');
    };
    PUB.cut = false;
    if (f.note && String(f.note).length > 300) { f.note = String(f.note).slice(0, 300).replace(/\s+\S*$/, '') + ' […]'; PUB.cut = true; }
    var url = build();
    ['rationale', 'note', 'title'].forEach(function (n) {
      var guard = 0;
      while (url.length > URL_MAX && f[n] && guard++ < 40) {
        var over = url.length - URL_MAX, keep = Math.max(0, String(f[n]).length - Math.ceil(over / 3) - 12);
        f[n] = keep > 20 ? String(f[n]).slice(0, keep).replace(/\s+\S*$/, '') + ' […]' : ''; PUB.cut = true; url = build();
      }
    });
    return url;
  }
  function setMe(v) {
    S.me = (v || '').trim().slice(0, 12) || null;
    if (S.me) S.names[S.me] = S.me;
    try { if (S.me) localStorage.setItem(ME_KEY, S.me); else localStorage.removeItem(ME_KEY); } catch (x) {}
  }
  function askMe() { var i = $('meInput'); if (i && i.value.trim() && !S.me) setMe(i.value); return S.me; }
  if ($('meInput') && S.me) $('meInput').value = S.me;
  function submit(k, action, doc, extra) {
    var ks = [].concat(k), q = S.queue[ks[0]], at = new Date().toISOString();
    var fields = Object.assign({ example_key: ks.join('|'), title: (q.title || '').slice(0, 200), answer: q.answer, action: action, saved_at: at, reviewer: S.me || '', spec_version: S.spec && S.spec.version || '', source: 'page' }, extra || {});
    var url = formUrl(fields);
    var p = readPending(); ks.forEach(function (x) { p[x] = { action: action, saved_at: at, doc: doc || null, url: url }; }); writePending(p);
    S.dec = mergeDecisions(Object.keys(S.dec).reduce(function (m, x) { if (!S.dec[x].pending) m[x] = S.dec[x]; return m; }, {}));
    S.storeNote = storeNote();
    if (url) {
      var w = null; try { w = window.open(url, '_blank'); } catch (x) {}
      var n = $('note');
      if (!w) { n.innerHTML = 'Your browser blocked the Kobo form. <a href="' + esc(url) + '" target="_blank" rel="noopener">Open the Kobo form</a> and press Submit there.'; n.hidden = false; }
      else { n.innerHTML = 'One more step: press <b>Submit</b> in the Kobo tab that just opened. If it didn’t open, <a href="' + esc(url) + '" target="_blank" rel="noopener">open the Kobo form</a>.'; n.hidden = false; }
      if (PUB.cut) n.innerHTML += ' <b>Your reason or note was too long for the Kobo form and was shortened there.</b> The full text stays on this computer; keep edits under about 600 characters.';
      return true;
    }
    note('The Kobo review form isn’t set up yet (no form link in the queue file), so this is saved on this computer only.');
    return false;
  }
  // step 5 of the guided review: what is left to do, and whether Kobo has the decision
  S.submitPanel = function (k, saved) {
    var p = PUB.pending[k], link = p && p.url ? '<a class="btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">Open the Kobo form again</a>' : '';
    if (saved && saved.unsent) return '<div class="gsub warn"><h3>Kobo has not received this decision</h3><div>It is saved on this computer only. The Kobo tab was probably closed before Submit was pressed.</div><div class="save">' + link + '<button class="btn" data-forget="' + esc(k) + '">Forget this decision</button></div></div>';
    if (saved && saved.pending) return '<div class="gsub"><h3>One more step: press Submit in the Kobo tab</h3><div>The form opened in a new tab with everything filled in. Press <b>Submit</b> there, then come back here.</div><div class="hint">Your decision shows here straight away, and for colleagues within about 20 minutes.</div><div class="save">' + link + '</div></div>';
    return '<div class="gsub ok"><h3>Shared</h3><div>Kobo has this decision, and colleagues can see it.</div></div>';
  };
  var saving = false;
  function save(then, opt) {
    if (saving || !S.sel) return;
    var q = S.queue[S.sel], a = S.draft, res = decideFor(S.sel, a);
    if (!res.outcome) return;
    if (!askMe()) {   // every decision carries who made it
      var mi = $('meInput'); if (mi) { mi.focus(); mi.style.outline = '2px solid var(--coral)'; mi.scrollIntoView({ block: 'center' }); }
      if ($('saveStatus')) $('saveStatus').textContent = 'Type your initials at the top of the page first, then save.';
      return;
    }
    var park = !!(opt && opt.park);
    var prev = S.dec[S.sel] || {};
    var doc = { key: S.sel, response_id: q.response_id, title_start: q.title_start, answer: q.answer, outcome: res.outcome, score: res.score, use_sign: res.use_sign,
      answers: { q1: a.q1, q2: a.q2 || 'none', kind: a.kind, q4: a.q4, ticks: a.ticks.slice(), states: a.states || {}, where: a.where || {}, populations: a.populations || '' }, note: a.note || '',
      fill: res.fill || null, reviewer: S.me || null, saved_at: new Date().toISOString(), spec_version: S.spec.version || null,
      notified_on: prev.notified_on || null, objection: prev.objection || null,
      rationale: a.rationale != null ? a.rationale : (S.genWhy || ''), rationale_edited: a.rationale != null };
    // parked: the form still gets the checklist's outcome (it only knows those); the note's opening words mark it as parked
    if (park) { doc.outcome = 'parked'; doc.note = PARK + (a.note || ''); }
    var sent = submit(S.sel, 'save', doc, { outcome: res.outcome, score: res.score, use_sign: yn(res.use_sign), q1: yn(a.q1), q2: a.q2 || 'none', q4: yn(a.q4),
      populations: a.populations || '', kind: a.kind || '', ticks: encodeTicks(a), rationale: doc.rationale, rationale_edited: yn(doc.rationale_edited), note: doc.note });
    if (guided()) S.step = 5;
    if (then) then(); else render();
  }
  function clearDecision() {
    if (!S.sel) return;
    submit(S.sel, 'undo', null, {});
    S.draft = blankDraft(S.queue[S.sel]); render();
  }
  function markSent(ks) {
    var unset = ks.every(function (k) { return S.dec[k] && S.dec[k].notified_on; });
    submit(ks, unset ? 'unsent' : 'sent', null, {});
    render();
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
  var PPTX_SRC = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
  function downloadPptx() {
    lib('PowerPoint', PPTX_SRC, function () { return !!window.PptxGenJS; }).then(function () {
      return window.AlignmentReport.buildPptx(window.PptxGenJS, reportModel()).write({ outputType: 'blob' });
    }).then(function (b) { saveFile('gain2026_alignment_review_' + today() + '.pptx', b); }).catch(function () {});
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
    if (b.id === 'dlDocx') downloadDocx(); else if (b.id === 'dlPptx') downloadPptx(); else if (b.id === 'dlXlsx') downloadXlsx(); else if (b.id === 'dlMails') downloadMails(); else if (b.id === 'dlJson') downloadDecisions();
    else if (b.id === 'printChk') printChecklist(); else if (b.id === 'evOpen') $('evFile').click();
    else if (b.dataset.forget) { var pp = readPending(); delete pp[b.dataset.forget]; writePending(pp); loadDecisions().then(function () { if (!S.dec[S.sel]) select(S.sel); }).catch(function () {}); }
    else if (b.id === 'tubeBtn') { document.body.classList.toggle('show-tube'); renderTube(); }
    else if (b.id === 'toDash') { if (window.top !== window.self) window.parent.postMessage('gain-review-close', location.origin); else location.href = '../'; }
    else if (b.id === 'evClose') { PUB.evidence = null; try { sessionStorage.removeItem(EVID_KEY); } catch (x) {} loadQueue().catch(function () {}); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'meInput') { e.target.style.outline = ''; setMe(e.target.value); render(); }
    if (e.target.id === 'evFile' && e.target.files && e.target.files[0]) { var f = e.target.files[0], rd = new FileReader(); rd.onload = function () { openEvidence(String(rd.result)); }; rd.readAsText(f); e.target.value = ''; }
  });
  window.addEventListener('focus', function () { loadDecisions().catch(function () {}); });
  // opened on its own rather than inside the dashboard: send the visitor to the dashboard, review open
  if (window.top === window.self && !/[?&]standalone=1/.test(location.search) && location.protocol === 'https:') location.replace(new URL('../#review', location.href).href);

  // ---------- first visit: three short cards on what this is, how a decision is made, and how saving works ----------
  var INTRO_KEY = 'gainReviewIntroSeen', introAt = 0;
  var INTRO = [
    ['What we check', '<p>Some respondents say the recommendations were <b>not used</b>, or that they <b>don’t know</b>. Some of those examples follow the recommendations’ approach without naming them.</p><ul><li>You look at one example at a time and decide what the evidence shows.</li><li>If we count an example as using, we email the organisation why. If they do not object within 10 working days, their answer is edited in Kobo; the original is kept in the cleaning log.</li><li>Suggestions on the page are hints. Every decision is yours.</li></ul>'],
    ['How a decision is made', '<div class="flow"><span>1 Read</span><span>2 Three questions</span><span>3 Checklist</span><span>4 Decide</span><span>5 Submit</span></div><ul><li>The evidence stays beside you while you answer.</li><li>Said <b>don’t know</b>: two strong items are enough to count it as using.</li><li>Said <b>not used</b>: we ask for more, including a sign they already use them.</li><li>Some evidence below that is recorded as <b>aligned</b>.</li><li>Not sure? Write why in the note and press <b>Park for consultation</b>.</li></ul>'],
    ['Before you start, and when you save', '<ul><li>Type <b>your initials</b> at the top, and press <b>Open descriptions file</b>: it holds what respondents wrote and what we found online. Ask the Secretariat where it is kept.</li><li>Saving takes two presses: <b>Save</b> here, then <b>Submit</b> in the Kobo tab that opens.</li><li>Colleagues see your decision within about 20 minutes.</li></ul>']
  ];
  function showIntro(i) {
    introAt = i; var el = $('intro');
    if (!el) { el = document.createElement('div'); el.id = 'intro'; el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'How the review works'); document.body.appendChild(el); }
    var c = INTRO[i], last = i === INTRO.length - 1;
    el.innerHTML = '<div class="box"><div class="n">How the review works · ' + (i + 1) + ' of ' + INTRO.length + '</div><h2>' + c[0] + '</h2>' + c[1] +
      '<div class="foot"><span class="dots">' + INTRO.map(function (_, x) { return '<i class="' + (x === i ? 'on' : '') + '"></i>'; }).join('') + '</span>' +
      (i ? '<button class="btn" id="introBack">← Back</button>' : '<button class="btn" id="introSkip">Skip</button>') +
      (last ? '<button class="btn" id="introPractice">Try the practice example</button><button class="btn primary" id="introDone">Start reviewing</button>' : '<button class="btn primary" id="introNext">Next →</button>') + '</div></div>';
    el.hidden = false; var f = el.querySelector('.btn.primary'); if (f) f.focus();
  }
  function closeIntro() { var el = $('intro'); if (el) el.hidden = true; try { localStorage.setItem(INTRO_KEY, '1'); } catch (x) {} }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'introNext') showIntro(introAt + 1); else if (b.id === 'introBack') showIntro(introAt - 1);
    else if (b.id === 'introDone' || b.id === 'introSkip') closeIntro();
    else if (b.id === 'introPractice') { closeIntro(); S.startPractice(); }
    else if (b.id === 'howBtn') showIntro(0);
  });
  document.addEventListener('keydown', function (e) { var el = $('intro'); if (e.key === 'Escape' && el && !el.hidden) { e.stopPropagation(); closeIntro(); } }, true);
  var seenIntro = false; try { seenIntro = !!localStorage.getItem(INTRO_KEY); } catch (x) {}
  if (!seenIntro) showIntro(0);
