/* Training deck for the intern, illustrated: the alignment review from first look to the edited Kobo record and the cleaning log.
   node deck2.js <out.pptx>   (NODE_PATH with pptxgenjs, react, react-dom, react-icons, sharp; APPLY_THEME optional).
   Illustrations are native shapes (editable in PowerPoint or a design tool); icons are PNGs. No speaker notes. */
const pptxgen = require('pptxgenjs');
const React = require('react'), RDS = require('react-dom/server'), sharp = require('sharp');
const fi = require('react-icons/fi');
const out = process.argv[2];
const K = { dk1: '14234C', lt1: 'FFFFFF', dk2: '1C2D5A', lt2: 'EFF7FF', accent1: '4CC3C9', accent2: '3B71B9', accent3: 'F06667', accent4: 'E0A93B', accent5: '8DB8E3', accent6: '5F6B87', hlink: '3B71B9', folHlink: '5F6B87' };
const THEME = { name: 'EGRISS training', headFontFace: 'Arial', bodyFontFace: 'Arial', colors: K };
const pres = new pptxgen(); pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' }; pres.title = 'GAIN 2026 alignment review: training'; pres.author = 'EGRISS Secretariat';
const C = pres.SchemeColor, MUTE = C.accent6, SH = pres.ShapeType;
const TEALBG = 'E3F4F5', GREEN = 'E3F4EE', GREEND = '1F8A68', RED = 'FDECEC', AMBER = 'FBF0DC', GREY = 'EEF1F6', LINE = 'DDE4EF', BLUEBG = 'E6EEF9';
pres.defineSlideMaster({ title: 'Dark', background: { color: K.dk2 },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.9, y: 2.0, w: 6.6, h: 2.2, fontSize: 40, bold: true, color: C.background1, align: 'left', valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.9, y: 4.4, w: 6.4, h: 1.8, fontSize: 18, color: C.accent5, align: 'left', valign: 'top' }, text: '' } }] });
pres.defineSlideMaster({ title: 'Content', background: { color: 'FFFFFF' },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 0.4, w: 11.9, h: 0.9, fontSize: 30, bold: true, color: C.text1, align: 'left', valign: 'middle' }, text: '' } },
    { text: { text: 'GAIN 2026 alignment review · training', options: { x: 0.7, y: 6.98, w: 8, h: 0.3, fontSize: 10, color: C.accent6, isTextBox: true, margin: 0 } } }],
  slideNumber: { x: 12.1, y: 6.98, w: 0.6, h: 0.3, fontSize: 10, color: K.accent6, align: 'right' } });

const ICONS = {};
async function loadIcons() {
  const want = { search: 'FiSearch', send: 'FiSend', mail: 'FiMail', clock: 'FiClock', edit: 'FiEdit3', grid: 'FiGrid', chart: 'FiBarChart2', help: 'FiHelpCircle', check2: 'FiCheckSquare', shield: 'FiShield',
    monitor: 'FiMonitor', file: 'FiFileText', db: 'FiDatabase', inbox: 'FiInbox', lock: 'FiLock', compass: 'FiCompass', play: 'FiPlayCircle', pause: 'FiPauseCircle', msg: 'FiMessageSquare',
    up: 'FiThumbsUp', x: 'FiXCircle', flag: 'FiFlag', check: 'FiCheck', minus: 'FiMinus', user: 'FiUser', alert: 'FiAlertTriangle' };
  const cols = { w: '#FFFFFF', n: '#1C2D5A', g: '#1F8A68', m: '#9AA5BA', r: '#C0392B' };
  for (const [k, name] of Object.entries(want)) for (const [ck, col] of Object.entries(cols)) {
    const svg = RDS.renderToStaticMarkup(React.createElement(fi[name], { size: 256, color: col }));
    ICONS[k + '_' + ck] = 'image/png;base64,' + (await sharp(Buffer.from(svg)).png().toBuffer()).toString('base64');
  }
}
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 14, color: C.text1, valign: 'top' }, o));
const box = (s, x, y, w, h, fill, name, line) => s.addShape(SH.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: fill || C.background2 }, line: { color: line || fill || C.background2, width: line ? 1 : 0.75 }, objectName: name || 'box' });
const rect = (s, x, y, w, h, fill, name, line) => s.addShape(SH.rect, { x, y, w, h, fill: { color: fill }, line: { color: line || fill, width: 0.75 }, objectName: name || 'shape' });
const pill = (s, x, y, w, h, text, fill, color, fs, bold) => { s.addShape(SH.roundRect, { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: { color: fill }, objectName: 'pill ' + text }); if (text) T(s, text, { x, y, w, h, fontSize: fs || 10, color: color || K.dk1, align: 'center', valign: 'middle', bold: !!bold }); };
const bar = (s, x, y, w, h) => s.addShape(SH.roundRect, { x, y, w, h: h || 0.09, rectRadius: 0.04, fill: { color: LINE }, line: { color: LINE }, objectName: 'text line' });
const img = (s, key, x, y, d) => s.addImage({ data: ICONS[key], x, y, w: d, h: d });
const ic = (s, key, x, y, d, fill) => { d = d || 0.62; s.addShape(SH.ellipse, { x, y, w: d, h: d, fill: { color: fill || C.text2 }, line: { color: fill || C.text2 }, objectName: 'icon circle ' + key }); img(s, key + '_w', x + d * 0.24, y + d * 0.24, d * 0.52); };
const num = (s, x, y, n, d, fill) => { d = d || 0.42; s.addShape(SH.ellipse, { x, y, w: d, h: d, fill: { color: fill || K.accent3 }, line: { color: 'FFFFFF', width: 1.5 }, objectName: 'callout ' + n }); T(s, String(n), { x, y, w: d, h: d, fontSize: 13, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }); };
const lines = (arr) => arr.map((l, i) => typeof l === 'string' ? { text: l, options: { breakLine: i < arr.length - 1 } } : { text: l.t, options: Object.assign({ breakLine: i < arr.length - 1 }, l.o) });
const bullets = (arr) => arr.map((l, i) => ({ text: l, options: { bullet: true, breakLine: i < arr.length - 1 } }));
const content = (title) => { const s = pres.addSlide({ masterName: 'Content' }); s.addText(title, { placeholder: 'title' }); return s; };
function card(s, x, y, w, h, icon, head, body, fill) {
  box(s, x, y, w, h, fill, 'card ' + head); let hx = x + 0.25;
  if (icon) { ic(s, icon, x + 0.25, y + 0.25); hx = x + 1.05; }
  T(s, head, { x: hx, y: y + 0.25, w: w - (hx - x) - 0.2, h: 0.62, fontSize: 17, bold: true, valign: 'middle' });
  const ind = Array.isArray(body) ? 0.3 : 0;
  T(s, Array.isArray(body) ? bullets(body) : body, { x: x + 0.25 + ind, y: y + 1.05, w: w - 0.5 - ind, h: h - 1.25, fontSize: 13, paraSpaceAfter: 5 });
}

async function main() {
  await loadIcons();

  // 1 title, with the review drawn as a tube: answers go in, outcomes come out
  { const s = pres.addSlide({ masterName: 'Dark' });
    s.addText('From a “No” to a corrected record', { placeholder: 'title' });
    s.addText('GAIN 2026 alignment review: review an example, tell the organisation, edit the Kobo record, document it in the cleaning log', { placeholder: 'body' });
    const dots = [[8.0, 2.55, K.accent3], [8.38, 2.55, K.accent2], [8.0, 2.95, K.accent2], [8.38, 2.95, K.accent3], [8.0, 3.35, K.accent3], [8.38, 3.35, K.accent3], [8.0, 3.75, K.accent2], [8.38, 3.75, K.accent3]];
    box(s, 7.75, 2.3, 1.15, 2.0, '263A6E', 'waiting box', '3B4F85'); dots.forEach((d) => s.addShape(SH.ellipse, { x: d[0], y: d[1], w: 0.26, h: 0.26, fill: { color: d[2] }, line: { color: d[2] }, objectName: 'example dot' }));
    T(s, 'Said No or Don’t know', { x: 7.45, y: 4.4, w: 1.75, h: 0.5, fontSize: 11, color: K.accent5, align: 'center' });
    s.addShape(SH.roundRect, { x: 9.15, y: 3.0, w: 2.0, h: 0.6, rectRadius: 0.3, fill: { color: '2E4379' }, line: { color: K.accent5, width: 1 }, objectName: 'tube' });
    [9.5, 10.0, 10.5].forEach((x) => s.addShape(SH.ellipse, { x, y: 2.95, w: 0.18, h: 0.7, fill: { color: '2E4379' }, line: { color: K.accent5, width: 1 }, objectName: 'gate' }));
    s.addShape(SH.ellipse, { x: 9.24, y: 3.17, w: 0.26, h: 0.26, fill: { color: K.accent3 }, line: { color: 'FFFFFF', width: 1.5 }, objectName: 'example in review' });
    T(s, 'questions · checklist', { x: 9.0, y: 3.72, w: 2.3, h: 0.3, fontSize: 11, color: K.accent5, align: 'center' });
    [['Count as using', GREEND, 2.05], ['Aligned', K.accent2, 3.02], ['Answer kept', K.accent6, 3.99]].forEach((o) => { box(s, 11.4, o[2], 1.45, 0.8, '263A6E', 'outcome ' + o[0], '3B4F85'); rect(s, 11.4, o[2], 1.45, 0.07, o[1], 'outcome colour'); T(s, o[0], { x: 11.48, y: o[2] + 0.14, w: 1.3, h: 0.56, fontSize: 11, bold: true, color: 'FFFFFF', valign: 'middle' }); }); }

  // 2
  { const s = content('What this work is, and why we do it');
    card(s, 0.7, 1.6, 3.8, 3.6, 'help', 'The problem', 'In GAIN, each example asks whether the EGRISS recommendations (IRRS, IRIS, IROSS) were used. Some respondents answer “No” or “Don’t know” although their example follows the recommendations’ approach.');
    card(s, 4.75, 1.6, 3.8, 3.6, 'check2', 'What we do', 'We check each of those examples against a fixed checklist. Where the evidence is strong enough, we record the example as using the recommendations, after telling the organisation and giving them time to object.');
    card(s, 8.8, 1.6, 3.8, 3.6, 'shield', 'Why it must be careful', 'We are changing an answer someone gave us. So every change needs evidence, an email to the organisation, a waiting period, and a line in the cleaning log that shows the original answer.', TEALBG);
    box(s, 0.7, 5.45, 11.9, 0.95, GREY, 'your part'); img(s, 'user_n', 0.95, 5.67, 0.5);
    T(s, 'Your part: review examples, send the emails, wait, edit the Kobo record when there is no objection, and document each step.', { x: 1.65, y: 5.45, w: 10.7, h: 0.95, fontSize: 15, bold: true, valign: 'middle' }); }

  // 3 process
  { const s = content('The whole process on one page');
    const st = [['search', 'Review', 'Go through the example on the review page.'], ['send', 'Submit', 'Save, then Submit in the Kobo tab.'], ['mail', 'Email', 'Send the draft from your own mailbox.'], ['clock', 'Wait', '10 working days for an objection.'], ['edit', 'Edit in Kobo', 'Only if there is no objection.'], ['grid', 'Log', 'Fill the row in the cleaning log.'], ['chart', 'Check', 'The dashboard shows the new answer.']];
    st.forEach((x, i) => { const px = 0.7 + i * 1.72; box(s, px, 1.75, 1.5, 3.0, i === 4 ? AMBER : i === 5 ? TEALBG : null, 'step ' + (i + 1)); ic(s, x[0], px + 0.39, 1.95, 0.72);
      T(s, String(i + 1), { x: px + 0.1, y: 1.8, w: 0.3, h: 0.3, fontSize: 11, bold: true, color: MUTE }); T(s, x[1], { x: px + 0.12, y: 2.85, w: 1.26, h: 0.5, fontSize: 14, bold: true, align: 'center', valign: 'middle' }); T(s, x[2], { x: px + 0.12, y: 3.4, w: 1.26, h: 1.25, fontSize: 11.5, align: 'center' });
      if (i < 6) s.addShape(SH.chevron, { x: px + 1.53, y: 3.1, w: 0.16, h: 0.3, fill: { color: K.accent5 }, line: { color: K.accent5 }, objectName: 'arrow' }); });
    box(s, 0.7, 5.25, 11.9, 1.3, GREY, 'note');
    T(s, lines([{ t: 'Steps 3 to 5 happen only for some outcomes.', o: { bold: true } }, 'An email is sent for “Count as using” and for “Send the recommendations”. The Kobo record is edited only for “Count as using”, and only after the waiting period passes with no objection. Every reviewed example gets a line in the log, whatever the outcome.']), { x: 0.95, y: 5.33, w: 11.4, h: 1.15, fontSize: 12.5, paraSpaceAfter: 3, valign: 'middle' }); }

  // 4 where things live
  { const s = content('Where everything lives');
    const it = [['monitor', 'Dashboard and review page', 'egrisstats.github.io/GAIN-story/dashboard, then “Review answers”', 'Anyone with the link, no sign-in. Never shows descriptions.', null],
      ['file', 'Descriptions file', '06 Data Cleaning › 02 Alignment Review › review-evidence.json', 'Secretariat only. What respondents wrote and what we found online. You open it inside the review page.', RED],
      ['db', 'GAIN 2026 survey in Kobo', 'kobo.unhcr.org · “Global Annual Inclusion Survey 2026”', 'Secretariat accounts. This is the record you edit in step 5.', null],
      ['inbox', 'Review decisions in Kobo', 'kobo.unhcr.org · “GAIN 2026 alignment review decisions”', 'Filled by the review page when you press Submit. You never type in it.', null],
      ['grid', 'Cleaning log', '06 Data Cleaning › 01 Input › EGRISS_GAIN_2026_-_Data Clean.xlsx', 'Secretariat only. Holds names and emails.', RED],
      ['mail', 'Email drafts', 'Review page › “Emails to send”', 'Drafts only. You send from your own mailbox.', null]];
    it.forEach((r, i) => { const x = 0.7 + (i % 3) * 4.05, y = 1.55 + Math.floor(i / 3) * 2.4; box(s, x, y, 3.8, 2.2, r[4], 'place ' + r[1]); ic(s, r[0], x + 0.22, y + 0.22, 0.58);
      T(s, r[1], { x: x + 0.95, y: y + 0.22, w: 2.7, h: 0.58, fontSize: 15, bold: true, valign: 'middle' }); T(s, r[2], { x: x + 0.22, y: y + 0.95, w: 3.36, h: 0.5, fontSize: 11, color: K.accent2 }); T(s, r[3], { x: x + 0.22, y: y + 1.45, w: 3.36, h: 0.7, fontSize: 11.5 }); });
    T(s, 'Pink cards hold respondents’ own words or contact details: they stay on the Secretariat’s drive. A second survey, “GAIN 2026 + ESCWA regional module”, feeds the same dashboard; its examples are tagged UNESCWA and reviewed the same way.', { x: 0.7, y: 6.38, w: 11.9, h: 0.5, fontSize: 11, color: MUTE }); }

  // 5 the review page, drawn
  { const s = content('What the review page looks like');
    const X = 0.7, Y = 1.5, W = 8.2, H = 5.3;
    box(s, X, Y, W, H, 'FFFFFF', 'screen', 'B8C6DC'); rect(s, X + 0.02, Y + 0.02, W - 0.04, 0.45, K.dk2, 'top bar');
    T(s, 'EGRISS', { x: X + 0.2, y: Y + 0.02, w: 1.2, h: 0.45, fontSize: 12, bold: true, color: 'FFFFFF', valign: 'middle' }); T(s, 'Review     Overview     Emails to send     Results', { x: X + 3.9, y: Y + 0.02, w: 4.2, h: 0.45, fontSize: 9.5, color: 'FFFFFF', valign: 'middle', align: 'right' });
    rect(s, X + 0.02, Y + 0.47, W - 0.04, 0.3, K.lt2, 'status band'); T(s, '33 in the review · 29 to review · 1 parked · 4 reviewed · descriptions file open', { x: X + 0.2, y: Y + 0.47, w: 7.6, h: 0.3, fontSize: 8.5, color: K.accent6, valign: 'middle' });
    pill(s, X + 0.2, Y + 0.87, 0.95, 0.28, '← Dashboard', 'FFFFFF', K.dk1, 8); s.addShape(SH.roundRect, { x: X + 0.2, y: Y + 0.87, w: 0.95, h: 0.28, rectRadius: 0.14, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 }, objectName: 'button outline' }); T(s, '← Dashboard', { x: X + 0.2, y: Y + 0.87, w: 0.95, h: 0.28, fontSize: 8, align: 'center', valign: 'middle' });
    T(s, 'Your initials', { x: X + 1.3, y: Y + 0.87, w: 0.8, h: 0.28, fontSize: 8, color: K.accent6, valign: 'middle' }); rect(s, X + 2.05, Y + 0.89, 0.4, 0.24, 'FFFFFF', 'initials field', 'B8C6DC'); T(s, 'RK', { x: X + 2.05, y: Y + 0.89, w: 0.4, h: 0.24, fontSize: 8, align: 'center', valign: 'middle' });
    pill(s, X + 2.6, Y + 0.87, 1.5, 0.28, 'Open descriptions file', K.accent1, K.dk1, 8, true);
    T(s, 'Reports:', { x: X + 5.0, y: Y + 0.87, w: 0.6, h: 0.28, fontSize: 8, color: K.accent6, valign: 'middle' }); ['Emails', 'Word', 'Excel', 'Slides'].forEach((b, i) => pill(s, X + 5.6 + i * 0.63, Y + 0.87, 0.57, 0.28, b, GREY, K.dk1, 8));
    T(s, 'Central Statistical Bureau of Latvia', { x: X + 0.25, y: Y + 1.3, w: 5, h: 0.2, fontSize: 8, color: K.accent6 }); T(s, 'About 4,000 Ukrainian citizens in Latvian education…', { x: X + 0.25, y: Y + 1.5, w: 7.5, h: 0.3, fontSize: 12, bold: true });
    ['Read', 'Three questions', 'Checklist', 'Decide', 'Submit'].forEach((n, i) => pill(s, X + 0.25 + [0, 0.75, 2.05, 3.05, 3.85][i], Y + 1.92, [0.68, 1.22, 0.92, 0.72, 0.75][i], 0.27, (i + 1) + ' ' + n, i === 2 ? K.dk2 : 'FFFFFF', i === 2 ? 'FFFFFF' : K.accent6, 8.5, i === 2));
    [0, 1, 3, 4].forEach((i) => s.addShape(SH.roundRect, { x: X + 0.25 + [0, 0.75, 2.05, 3.05, 3.85][i], y: Y + 1.92, w: [0.68, 1.22, 0.92, 0.72, 0.75][i], h: 0.27, rectRadius: 0.13, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: i < 2 ? K.accent1 : LINE, width: 1 }, objectName: 'step outline' }));
    // evidence, left
    box(s, X + 0.25, Y + 2.35, 3.2, 2.2, K.lt2, 'evidence panel'); T(s, 'THE EVIDENCE', { x: X + 0.4, y: Y + 2.43, w: 2, h: 0.2, fontSize: 7.5, color: K.accent6, bold: true });
    T(s, 'What they wrote', { x: X + 0.4, y: Y + 2.66, w: 2.5, h: 0.2, fontSize: 9, bold: true }); [0, 1, 2].forEach((i) => bar(s, X + 0.4, Y + 2.92 + i * 0.14, [2.8, 2.6, 1.9][i], 0.07));
    rect(s, X + 0.4, Y + 3.42, 2.9, 0.48, 'FFFFFF', 'online card', LINE); T(s, 'Online', { x: X + 0.5, y: Y + 3.46, w: 1, h: 0.2, fontSize: 9, bold: true }); pill(s, X + 2.05, Y + 3.47, 1.15, 0.2, 'Points to use', GREEN, GREEND, 7.5, true); bar(s, X + 0.5, Y + 3.74, 2.2, 0.06);
    rect(s, X + 0.4, Y + 3.98, 2.9, 0.48, 'FFFFFF', 'similar card', LINE); T(s, 'Similar examples', { x: X + 0.5, y: Y + 4.02, w: 2, h: 0.2, fontSize: 9, bold: true }); [0, 1, 2, 3, 4].forEach((i) => s.addShape(SH.ellipse, { x: X + 0.5 + i * 0.2, y: Y + 4.27, w: 0.13, h: 0.13, fill: { color: i < 3 ? K.accent1 : 'FFFFFF' }, line: { color: i < 3 ? K.accent1 : K.accent6, width: 1 }, objectName: 'peer dot' }));
    // current step, right
    T(s, 'What the example shows', { x: X + 3.7, y: Y + 2.38, w: 4, h: 0.25, fontSize: 10.5, bold: true });
    [['Uses the recommendation categories by name', 0], ['Identifies them the recommended way', 0], ['The data reach the statistical office', 1], ['They are published as statistics', 2]].forEach((r, i) => { const y = Y + 2.72 + i * 0.46; rect(s, X + 3.7, y, 4.25, 0.4, 'FFFFFF', 'checklist row', LINE); T(s, r[0], { x: X + 3.8, y, w: 2.2, h: 0.4, fontSize: 8, valign: 'middle' });
      ['Found', 'Not found', 'Can’t tell'].forEach((b, j) => pill(s, X + 6.0 + j * 0.64, y + 0.09, 0.6, 0.22, b, j === r[1] ? (j === 0 ? GREEND : K.accent6) : GREY, j === r[1] ? 'FFFFFF' : K.accent6, 7, j === r[1])); });
    // dock
    rect(s, X + 0.02, Y + 4.62, W - 0.04, 0.04, K.accent1, 'dock line'); pill(s, X + 0.25, Y + 4.78, 1.75, 0.26, 'Count as using · tell them', GREEN, GREEND, 8, true); T(s, 'Enough evidence to count it as using the recommendations.', { x: X + 2.15, y: Y + 4.78, w: 3.6, h: 0.26, fontSize: 8.5, valign: 'middle' });
    pill(s, X + 6.1, Y + 4.74, 0.8, 0.34, '← Back', GREY, K.dk1, 9); pill(s, X + 7.0, Y + 4.74, 0.95, 0.34, 'Next →', K.accent1, K.dk1, 9, true);
    // callouts
    num(s, X + 4.2, Y + 0.8, 1); num(s, X + 4.75, Y + 1.85, 2); num(s, X + 3.1, Y + 2.2, 3); num(s, X + 7.75, Y + 2.2, 4); num(s, X + 5.55, Y + 4.55, 5);
    const L = [['Start here', 'Type your initials (you cannot save without them) and open the descriptions file. If an example says it is newer than the file, ask for a new file.'], ['The five steps', 'Shows where you are. Checklist says “not needed” when the questions end the review.'], ['The evidence', 'Stays beside you from step 2: their text, what we found online, and similar examples.'], ['The current step', 'Only one step is shown at a time. Mark each item, and answer “Where did you see it?” for each one found.'], ['Result and buttons', 'Says where the example is heading and what it still needs. Save and Park for consultation appear at step 4.']];
    L.forEach((l, i) => { const y = 1.5 + i * 1.07; num(s, 9.15, y + 0.04, i + 1, 0.4); T(s, l[0], { x: 9.7, y, w: 2.9, h: 0.3, fontSize: 13, bold: true }); T(s, l[1], { x: 9.7, y: y + 0.3, w: 2.9, h: 0.72, fontSize: 11 }); }); }

  // 6 outcomes
  { const s = content('What each outcome means for you');
    T(s, 'Outcome on the review page', { x: 0.7, y: 1.42, w: 3.9, h: 0.3, fontSize: 11, bold: true, color: MUTE }); T(s, 'When it happens', { x: 4.8, y: 1.42, w: 4, h: 0.3, fontSize: 11, bold: true, color: MUTE }); T(s, 'Email', { x: 9.9, y: 1.42, w: 1.2, h: 0.3, fontSize: 11, bold: true, color: MUTE, align: 'center' }); T(s, 'Edit Kobo', { x: 11.25, y: 1.42, w: 1.35, h: 0.3, fontSize: 11, bold: true, color: MUTE, align: 'center' });
    const R = [['Count as using · tell them', GREEN, GREEND, 'Said “don’t know” and two strong items found; or said “not used”, more evidence found and a sign they already use them', 'Yes', 'After the wait'],
      ['Aligned · not counted as use', BLUEBG, K.accent2, 'Some evidence, below the bar', '', ''], ['Keep their answer · send the recommendations', AMBER, 'C27A00', 'They don’t know the recommendations', 'Outreach', ''],
      ['Keep their answer', GREY, K.accent6, 'Too little evidence either way', '', ''], ['Keep · they chose not to use them', GREY, K.accent6, 'They state a reason for not using them', '', ''],
      ['Keep · no matching groups', GREY, K.accent6, 'It doesn’t cover refugees, IDPs or stateless people', '', ''], ['Keep · not statistics (check if valid)', GREY, K.accent6, 'A programme or service, not statistics. Park it for consultation.', '', '']];
    R.forEach((r, i) => { const h = i === 0 ? 0.78 : 0.56, y = 1.78 + (i === 0 ? 0 : 0.86 + (i - 1) * 0.64); box(s, 0.7, y, 11.9, h, 'FFFFFF', 'outcome row', LINE);
      s.addShape(SH.roundRect, { x: 0.85, y: y + h / 2 - 0.2, w: 3.75, h: 0.4, rectRadius: 0.2, fill: { color: r[1] }, line: { color: r[1] }, objectName: 'outcome chip' }); T(s, r[0], { x: 0.95, y: y + h / 2 - 0.2, w: 3.55, h: 0.4, fontSize: 11, bold: true, color: r[2], valign: 'middle' });
      T(s, r[3], { x: 4.8, y, w: 4.9, h, fontSize: 11.5, valign: 'middle' });
      [[r[4], 9.9, 1.2, 'mail'], [r[5], 11.25, 1.35, 'edit']].forEach((c) => { if (c[0]) { img(s, c[3] + '_g', c[1] + 0.05, y + h / 2 - 0.14, 0.28); T(s, c[0], { x: c[1] + 0.38, y, w: c[2] - 0.38, h, fontSize: 11, bold: true, color: GREEND, valign: 'middle' }); } else img(s, 'minus_m', c[1] + c[2] / 2 - 0.13, y + h / 2 - 0.13, 0.26); }); });
    T(s, 'Strong items are what the recommendations specifically ask for, and signs the organisation already uses them.', { x: 0.7, y: 6.5, w: 11.9, h: 0.35, fontSize: 11, color: MUTE }); }

  // 7 email
  { const s = content('Step 3: the email that says what we changed');
    box(s, 0.7, 1.55, 5.5, 5.1, null, 'how to send'); T(s, 'How to send it', { x: 0.95, y: 1.75, w: 5, h: 0.4, fontSize: 17, bold: true });
    const st = ['Open the Emails to send tab. One draft per organisation covers all its examples.', 'Find the focal point’s name and email in Kobo. The review page never shows them.', 'Press Copy draft, paste it into a new email in your own mailbox, replace [Name], read it once.', 'Send it the same day: the draft gives a reply date 10 working days ahead. Then press Mark as sent today and Submit in the Kobo tab.', 'Write the date in the cleaning log. The page now shows “Reply due” beside “Sent”.'];
    st.forEach((t, i) => { const y = 2.3 + i * 0.84; s.addShape(SH.ellipse, { x: 0.95, y: y + 0.05, w: 0.4, h: 0.4, fill: { color: K.dk2 }, line: { color: K.dk2 }, objectName: 'step number' }); T(s, String(i + 1), { x: 0.95, y: y + 0.05, w: 0.4, h: 0.4, fontSize: 12, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }); T(s, t, { x: 1.5, y, w: 4.5, h: 0.74, fontSize: 12, valign: 'middle' }); });
    // the email, drawn
    const X = 6.5, Y = 1.55, W = 6.1; box(s, X, Y, W, 5.1, 'FFFFFF', 'email window', 'B8C6DC'); rect(s, X + 0.02, Y + 0.02, W - 0.04, 0.4, GREY, 'email title bar'); img(s, 'mail_n', X + 0.18, Y + 0.1, 0.24); T(s, 'New message', { x: X + 0.5, y: Y + 0.02, w: 3, h: 0.4, fontSize: 10, bold: true, valign: 'middle' });
    [['To', 'the focal point · from Kobo'], ['Subject', 'GAIN 2026: how we recorded your example']].forEach((r, i) => { const y = Y + 0.5 + i * 0.34; T(s, r[0], { x: X + 0.2, y, w: 0.7, h: 0.3, fontSize: 9.5, color: K.accent6, valign: 'middle' }); T(s, r[1], { x: X + 0.95, y, w: 5, h: 0.3, fontSize: 10, bold: i === 1, valign: 'middle' }); s.addShape(SH.line, { x: X + 0.2, y: y + 0.32, w: W - 0.4, h: 0, line: { color: LINE, width: 0.75 }, objectName: 'rule' }); });
    T(s, 'Dear [Name],', { x: X + 0.2, y: Y + 1.28, w: 3, h: 0.25, fontSize: 10 }); T(s, 'You indicated that the recommendations were not used. We looked at the example against the recommendations, and here is what we found.', { x: X + 0.2, y: Y + 1.55, w: W - 0.4, h: 0.5, fontSize: 9.5 });
    ['Uses the recommendation categories by name', 'Identifies them the recommended way', 'The data reach the statistical office'].forEach((t, i) => { const y = Y + 2.12 + i * 0.27; img(s, 'check_g', X + 0.22, y + 0.03, 0.18); T(s, t + '  (IRRS paragraphs…)', { x: X + 0.48, y, w: 5.3, h: 0.24, fontSize: 9.5, valign: 'middle' }); });
    T(s, 'So we have recorded it as using the IRRS.', { x: X + 0.2, y: Y + 2.98, w: 5.5, h: 0.25, fontSize: 9.5, bold: true });
    box(s, X + 0.2, Y + 3.3, W - 0.4, 0.78, K.lt2, 'quote'); T(s, lines([{ t: 'What the recommendations say:', o: { bold: true } }, { t: '“The following question topics … are recommended as core topics in a population census…”', o: { italic: true } }]), { x: X + 0.32, y: Y + 3.34, w: W - 0.64, h: 0.7, fontSize: 9, valign: 'middle' });
    T(s, 'If a point is wrong, reply by 25 November 2026. If not, we update your survey answer.', { x: X + 0.2, y: Y + 4.16, w: W - 0.4, h: 0.3, fontSize: 9.5 }); bar(s, X + 0.2, Y + 4.56, 3.4, 0.07); bar(s, X + 0.2, Y + 4.72, 2.2, 0.07);
    num(s, X + 5.5, Y + 0.48, 'A', 0.36, K.accent2); num(s, X + 5.5, Y + 2.3, 'B', 0.36, K.accent2); num(s, X + 5.5, Y + 3.5, 'C', 0.36, K.accent2); num(s, X + 5.5, Y + 4.12, 'D', 0.36, K.accent2);
    T(s, 'A  address from Kobo   B  what we found   C  the paragraphs, quoted   D  how to object.   Don’t rewrite the evidence: if the draft looks wrong, fix the decision.', { x: 0.7, y: 6.68, w: 11.9, h: 0.28, fontSize: 10.5, color: MUTE }); }

  // 8 wait and replies
  { const s = content('Step 4: wait, and what to do with the reply');
    // timeline
    s.addShape(SH.line, { x: 1.5, y: 2.05, w: 10.3, h: 0, line: { color: K.accent5, width: 3 }, objectName: 'timeline' }); rect(s, 3.3, 1.9, 6.3, 0.3, TEALBG, '10 working days', K.accent1); T(s, '10 working days', { x: 3.3, y: 1.9, w: 6.3, h: 0.3, fontSize: 11, bold: true, align: 'center', valign: 'middle' });
    ic(s, 'mail', 1.2, 1.72, 0.66); T(s, 'Email sent', { x: 0.7, y: 2.45, w: 1.7, h: 0.3, fontSize: 12, bold: true, align: 'center' }); ic(s, 'clock', 10.9, 1.72, 0.66, K.accent2); T(s, 'Reply due', { x: 10.4, y: 2.45, w: 1.7, h: 0.3, fontSize: 12, bold: true, align: 'center' });
    T(s, 'The email, the review page and the log all show the “Reply due” date. Nothing is edited in Kobo before it, unless they agree sooner.', { x: 2.6, y: 2.45, w: 7.7, h: 0.3, fontSize: 11.5, color: MUTE, align: 'center' });
    const R = [['up', 'They agree', 'Edit the Kobo record now.', 'Reply = agrees\nStatus = Received response; revised in Kobo', GREEN, GREEND], ['clock', 'No reply by the date', 'Edit the Kobo record.', 'Reply = no reply by the due date\nStatus = No objection; revised in Kobo', GREEN, GREEND],
      ['x', 'They object', 'Do not edit. Thank them. If clear, paste the reply in the note and press Undo this decision.', 'Reply = objects\nStatus = Objection; answer kept', RED, 'C0392B'], ['help', 'They ask a question', 'Do not edit. Answer if you can from the email; otherwise park it.', 'Reply = asks a question\nStatus = Parked for consultation', AMBER, 'C27A00']];
    R.forEach((r, i) => { const x = 0.7 + i * 3.02; box(s, x, 3.05, 2.85, 3.1, r[4], 'reply ' + r[1]); ic(s, r[0], x + 0.2, 3.25, 0.56, r[5]); T(s, r[1], { x: x + 0.9, y: 3.25, w: 1.85, h: 0.56, fontSize: 14, bold: true, valign: 'middle' });
      T(s, r[2], { x: x + 0.2, y: 3.95, w: 2.45, h: 1.0, fontSize: 12 }); s.addShape(SH.line, { x: x + 0.2, y: 5.02, w: 2.45, h: 0, line: { color: 'FFFFFF', width: 1.5 }, objectName: 'divider' }); T(s, 'In the log', { x: x + 0.2, y: 5.08, w: 2.45, h: 0.22, fontSize: 9.5, bold: true, color: MUTE }); T(s, r[3], { x: x + 0.2, y: 5.3, w: 2.45, h: 0.8, fontSize: 10.5 }); });
    T(s, 'If the email bounces: look for another contact in Kobo. If there is none, do not edit; write what happened in Comment and leave Status as pending.', { x: 0.7, y: 6.35, w: 11.9, h: 0.45, fontSize: 11.5, color: MUTE }); }

  // 9 edit kobo
  { const s = content('Step 5: edit the Kobo record');
    box(s, 0.7, 1.5, 11.9, 0.8, RED, 'first'); img(s, 'alert_r', 0.95, 1.68, 0.44); T(s, lines([{ t: 'First, write the original answers in the cleaning log.', o: { bold: true } }, 'After the edit, the log is the only place that shows what the respondent originally said.']), { x: 1.6, y: 1.5, w: 10.8, h: 0.8, fontSize: 12.5, valign: 'middle' });
    box(s, 0.7, 2.5, 4.9, 4.2, null, 'how'); T(s, 'How', { x: 0.95, y: 2.68, w: 3, h: 0.35, fontSize: 16, bold: true });
    ['In Kobo, open the GAIN 2026 survey (the ESCWA one if the example is tagged UNESCWA) and go to Data.', 'Find the submission by organisation and date. Copy its _submission__id into the log.', 'Press Edit and go to the right example in the list of examples.', 'Change the three answers, then press Submit.', 'Open the record again to confirm the change.'].forEach((t, i) => { const y = 3.12 + i * 0.7; s.addShape(SH.ellipse, { x: 0.95, y: y + 0.08, w: 0.36, h: 0.36, fill: { color: K.dk2 }, line: { color: K.dk2 }, objectName: 'step number' }); T(s, String(i + 1), { x: 0.95, y: y + 0.08, w: 0.36, h: 0.36, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }); T(s, t, { x: 1.45, y, w: 4.0, h: 0.62, fontSize: 11.5, valign: 'middle' }); });
    // before and after, drawn
    const form = (X, title, after) => { box(s, X, 2.5, 3.2, 3.55, 'FFFFFF', 'kobo form ' + title, 'B8C6DC'); rect(s, X + 0.02, 2.52, 3.16, 0.36, after ? GREEN : GREY, 'form header'); T(s, title, { x: X + 0.15, y: 2.52, w: 3, h: 0.36, fontSize: 11, bold: true, color: after ? GREEND : K.dk1, valign: 'middle' });
      T(s, 'PRO09 · Were the recommendations used?', { x: X + 0.15, y: 2.98, w: 3.1, h: 0.25, fontSize: 9.5, bold: true });
      ['Yes', 'No', 'Don’t know'].forEach((o, i) => { const on = after ? i === 0 : i === 1; s.addShape(SH.ellipse, { x: X + 0.2 + i * 0.95, y: 3.3, w: 0.18, h: 0.18, fill: { color: on ? K.accent2 : 'FFFFFF' }, line: { color: on ? K.accent2 : K.accent6, width: 1 }, objectName: 'radio' }); T(s, o, { x: X + 0.44 + i * 0.95, y: 3.25, w: 0.75, h: 0.28, fontSize: 9.5, bold: on, valign: 'middle' }); });
      T(s, 'PRO10 · Which recommendations?', { x: X + 0.15, y: 3.68, w: 3.1, h: 0.25, fontSize: 9.5, bold: true });
      ['IRRS', 'IRIS', 'IROSS', 'None'].forEach((o, i) => { const on = after ? i === 0 : i === 3; rect(s, X + 0.2 + i * 0.74, 4.0, 0.18, 0.18, on ? K.accent2 : 'FFFFFF', 'checkbox', on ? K.accent2 : K.accent6); T(s, o, { x: X + 0.43 + i * 0.74, y: 3.95, w: 0.5, h: 0.28, fontSize: 9.5, bold: on, valign: 'middle' }); });
      T(s, 'PRO12 · How were they used?', { x: X + 0.15, y: 4.38, w: 3.1, h: 0.25, fontSize: 9.5, bold: true });
      if (after) ['Population categories', 'Identification questions'].forEach((o, i) => { rect(s, X + 0.2, 4.7 + i * 0.3, 0.18, 0.18, K.accent2, 'checkbox', K.accent2); T(s, o, { x: X + 0.44, y: 4.65 + i * 0.3, w: 2.7, h: 0.28, fontSize: 9.5, valign: 'middle' }); });
      else T(s, '(not asked: the answer was No)', { x: X + 0.2, y: 4.68, w: 3, h: 0.28, fontSize: 9.5, color: K.accent6, italic: true });
      if (after) pill(s, X + 2.05, 5.55, 0.95, 0.34, 'Submit', K.accent2, 'FFFFFF', 10, true); };
    form(5.85, 'Before', false); form(9.4, 'After your edit', true); s.addShape(SH.rightArrow, { x: 9.08, y: 4.1, w: 0.29, h: 0.34, fill: { color: K.accent1 }, line: { color: K.accent1 }, objectName: 'arrow' });
    T(s, 'Change only PRO09, PRO10 and PRO12, using what the review page shows under “What gets recorded”. Never touch the title, the description, the contact questions or another example. If Kobo asks for something you don’t know, stop and park the example.', { x: 5.85, y: 6.12, w: 6.75, h: 0.62, fontSize: 10.5, color: MUTE }); }

  // 10 log
  { const s = content('Step 6: document it in the cleaning log');
    T(s, '06 Data Cleaning › 01 Input › EGRISS_GAIN_2026_-_Data Clean.xlsx. One row per example; the examples in the review are already there.', { x: 0.7, y: 1.35, w: 11.9, h: 0.35, fontSize: 12, color: MUTE });
    const cols = [['Organization', 1.5, 0], ['Example Title', 1.75, 0], ['Action', 1.15, 0], ['Status', 1.6, 0], ['PRO09 original', 1.1, 1], ['PRO09 after review', 1.2, 1], ['Date emailed', 1.0, 1], ['Reply due', 0.95, 1], ['Reply received', 0.85, 1], ['Date edited', 0.8, 1]];
    const vals = ['CSB Latvia', 'About 4,000 Ukrainian citizens…', 'revised in Kobo', 'No objection; revised in Kobo', 'No', 'Yes', '2026-11-12', '2026-11-26', 'no reply', '2026-11-27'];
    let x = 0.7; cols.forEach((c, i) => { rect(s, x, 1.85, c[1], 0.42, c[2] ? K.accent2 : K.dk2, 'header ' + c[0], 'FFFFFF'); T(s, c[0], { x: x + 0.05, y: 1.85, w: c[1] - 0.1, h: 0.42, fontSize: 9, bold: true, color: 'FFFFFF', valign: 'middle' });
      rect(s, x, 2.27, c[1], 0.5, 'FFFFFF', 'cell', LINE); T(s, vals[i], { x: x + 0.05, y: 2.27, w: c[1] - 0.1, h: 0.5, fontSize: 9, valign: 'middle' }); x += c[1]; });
    T(s, 'Navy: the same columns as the GAIN 2025 log.   Blue: new for this review.   (Some columns are left out of this picture.)', { x: 0.7, y: 2.83, w: 11.9, h: 0.28, fontSize: 10.5, color: MUTE });
    const R = [['search', 'After you submit the review', 'Review outcome · PRO09 and PRO10 after review · Why (evidence): copy the text under “Why we decided this”.'], ['mail', 'When you send the email', 'Action = emailed focal point · Status = Emailed; waiting for reply · Date emailed. “Reply due” fills in by itself.'],
      ['clock', 'When they reply, or the date passes', 'Reply received = agrees · objects · asks a question · no reply by the due date.'], ['edit', 'After the Kobo edit', '_submission__id · Action = revised in Kobo · Status = No objection; revised in Kobo · Date edited · Edited by.'], ['minus', 'No edit needed', 'Action = no action · Status = Checked. Unsure? Status = Parked for consultation, question in Comment.']];
    R.forEach((r, i) => { const y = 3.2 + i * 0.66; box(s, 0.7, y, 11.9, 0.58, null, 'log step'); ic(s, r[0], 0.85, y + 0.07, 0.44); T(s, r[1], { x: 1.45, y, w: 3.1, h: 0.58, fontSize: 12.5, bold: true, valign: 'middle' }); T(s, r[2], { x: 4.6, y, w: 7.85, h: 0.58, fontSize: 11.5, valign: 'middle' }); });
    T(s, 'Use the drop-down lists in Action, Status and Reply received so the wording is the same on every row.', { x: 0.7, y: 6.55, w: 11.9, h: 0.3, fontSize: 11, color: MUTE }); }

  // 11, 12 worked examples
  const worked = (title, sub, chip, rows, moral) => { const s = content(title); T(s, sub, { x: 0.7, y: 1.32, w: 9.2, h: 0.5, fontSize: 12, color: MUTE, valign: 'middle' });
    s.addShape(SH.roundRect, { x: 10.0, y: 1.37, w: 2.6, h: 0.4, rectRadius: 0.2, fill: { color: chip[1] }, line: { color: chip[1] }, objectName: 'outcome chip' }); T(s, chip[0], { x: 10.0, y: 1.37, w: 2.6, h: 0.4, fontSize: 11, bold: true, color: chip[2], align: 'center', valign: 'middle' });
    const icons = ['search', 'flag', 'mail', 'clock', 'edit', 'grid']; let y = 1.98;
    rows.forEach((r, i) => { const h = i === 0 ? 1.0 : 0.6; box(s, 0.7, y, 11.9, h, i === 1 ? chip[1] : null, 'row ' + r[0]); ic(s, icons[i], 0.88, y + h / 2 - 0.22, 0.44, r[2] ? K.accent6 : undefined);
      T(s, r[0], { x: 1.5, y, w: 1.6, h, fontSize: 13.5, bold: true, valign: 'middle' }); T(s, r[1], { x: 3.15, y, w: 9.3, h, fontSize: 12, valign: 'middle', color: r[2] ? K.accent6 : K.dk1 }); y += h + 0.1; });
    if (moral) T(s, moral, { x: 0.7, y: y + 0.02, w: 11.9, h: 0.4, fontSize: 12.5, bold: true, valign: 'middle' }); };
  worked('Worked example A: counted as using', 'Central Statistical Bureau of Latvia · “About 4,000 Ukrainian citizens in Latvian education and 8,700 registered as employees” · said: not used', ['Count as using · tell them', GREEN, GREEND],
    [['Review', 'Statistics: yes. No reason given. Groups: refugees and people under temporary protection (IRRS). Kind: administrative data. Seven checklist items found, including the groups named, the recommended way of identifying them, and an earlier example from the same office that used the IRRS.'],
     ['Result', 'Count as using · tell them. Recommendation: IRRS.'], ['Email', 'One draft for the office. Sent from your mailbox to the focal point found in Kobo. Marked as sent.'], ['Wait', '10 working days. No reply.'],
     ['Edit in Kobo', 'PRO09 from “No” to “Yes”; PRO10 to IRRS; PRO12 as listed under “What gets recorded”.'], ['Log', 'Original: No / None of these. After review: Yes / IRRS. Action: revised in Kobo. Status: No objection; revised in Kobo. Dates and initials filled.']]);
  worked('Worked example B: the answer is kept', 'Central Statistical Bureau of Latvia · “Around 9 000 citizens of Ukraine work in Latvia (press release)” · said: not used', ['Keep their answer', GREY, K.accent6],
    [['Review', 'Statistics: yes. No reason given. Groups: IRRS groups. Kind: administrative data. No checklist item could be confirmed from the description, online or similar examples.'],
     ['Result', 'Keep their answer. Too little evidence either way.'], ['Email', 'None. Nothing changes for the organisation.', 1], ['Wait', 'Not needed.', 1], ['Edit in Kobo', 'None. The record stays exactly as submitted.', 1],
     ['Log', 'Original: No / None of these. After review: no change. Action: no action. Status: Checked. The row still shows the example was looked at, and why.']],
    'Same office, two examples, two outcomes: the decision is about the evidence for each example, not about the organisation.');

  // 13 checklist
  { const s = content('Checklist for one example');
    const L = ['Descriptions file open, initials typed', 'Example read: description, online, similar examples', 'Three questions answered; checklist marked with where each item was seen', 'Result and reason read; note added, or parked if unsure', 'Save (or Park) pressed, then Submit in the Kobo tab', 'Log: outcome, answers after review and reason filled'];
    const Rr = ['If an email is due: contact found in Kobo, draft sent from my mailbox', 'Marked as sent on the review page; date in the log', 'Waited until the “Reply due” date, or got a reply', 'Reply recorded in the log', 'If no objection: original answers in the log, Kobo record edited, edit confirmed', 'Log: Action, Status, date edited and initials filled; dashboard checked'];
    [[L, 0.7, 'Every example', 'search'], [Rr, 6.75, 'When the outcome is “Count as using” (emails also for “Send the recommendations”)', 'mail']].forEach(([arr, x, head, icn]) => { ic(s, icn, x, 1.52, 0.5); T(s, head, { x: x + 0.65, y: 1.5, w: 5.2, h: 0.55, fontSize: 13.5, bold: true, valign: 'middle' });
      arr.forEach((t, i) => { const y = 2.2 + i * 0.74; box(s, x, y, 5.85, 0.64, null, 'check'); rect(s, x + 0.2, y + 0.17, 0.3, 0.3, 'FFFFFF', 'tick box', K.dk2); T(s, t, { x: x + 0.7, y, w: 5.0, h: 0.64, fontSize: 12.5, valign: 'middle' }); }); }); }

  // 14 rules
  { const s = content('Rules that protect respondents');
    card(s, 0.7, 1.55, 3.8, 4.45, 'lock', 'Their data', ['The descriptions file and the cleaning log stay on the Secretariat’s drive.', 'Never put them in GitHub, in a chat, or as an email attachment.', 'Notes you write on the review page can be read by anyone with the link: keep them factual.'], RED);
    card(s, 4.75, 1.55, 3.8, 4.45, 'edit', 'Their answer', ['Never edit Kobo before the email is sent and the waiting period has passed.', 'Never edit if they object.', 'Write the original answer in the log before you change anything.', 'Change only PRO09, PRO10 and PRO12.']);
    card(s, 8.8, 1.55, 3.8, 4.45, 'compass', 'Your decisions', ['Suggestions on the page are hints. Mark only what you can actually see in the evidence.', 'Between two outcomes, choose the more cautious one and say why in the note.', 'A decision can be changed or undone. A wrong email cannot be unsent.']);
    T(s, 'Always say “recommendations”, never “standards”, when you write to organisations.', { x: 0.7, y: 6.2, w: 11.9, h: 0.5, fontSize: 13, bold: true }); }

  // 15 while away
  { const s = content('While Filip is away: carry on, park the unsure ones');
    card(s, 0.7, 1.55, 3.8, 5.1, 'play', 'You do the whole process', ['Review examples and submit decisions.', 'Send the emails, for both “Count as using” and “Send the recommendations”.', 'Wait for the reply date, record replies, and edit the Kobo record when there is no objection.', 'Fill the log at every step.', 'You don’t need a go-ahead for any of this.'], GREEN);
    card(s, 4.75, 1.55, 3.8, 5.1, 'pause', 'Park an example when…', ['you can’t decide between two outcomes;', 'the evidence is only in a similar example, or only online;', 'an organisation objects, or asks something you can’t answer from the email;', 'the outcome is “not statistics (check if valid)”;', 'Kobo asks for something you don’t know during an edit.'], AMBER);
    card(s, 8.8, 1.55, 3.8, 5.1, 'msg', 'How to park', ['On the review page: write your doubt in the reviewer note, press Park for consultation, then Submit in Kobo. No email, no Kobo edit.', 'In the log: Status = Parked for consultation, with your question in Comment.', 'Move on to the next example.', 'Go through the parked ones together when Filip is back.']);
    box(s, 9.05, 5.3, 3.3, 1.15, 'FFFFFF', 'known questions'); T(s, lines([{ t: 'Already known open points', o: { bold: true } }, 'Surveys run only by an international organisation; a census with no forced displacement option; the length of the wait.']), { x: 9.2, y: 5.34, w: 3.0, h: 1.07, fontSize: 10.5, valign: 'middle' }); }

  // 16 close
  { const s = pres.addSlide({ masterName: 'Dark' });
    s.addText('One example at a time: evidence, email, wait, edit, log', { placeholder: 'title' });
    s.addText('Dashboard: egrisstats.github.io/GAIN-story/dashboard · Files: EGRISS GAIN Survey 2026 › 06 Data Cleaning · Guide: the “Guide” button on the review page', { placeholder: 'body' });
    ['search', 'mail', 'clock', 'edit', 'grid'].forEach((k, i) => { const y = 1.2 + i * 1.08; s.addShape(SH.ellipse, { x: 9.6, y, w: 0.8, h: 0.8, fill: { color: i === 3 ? K.accent4 : K.accent1 }, line: { color: i === 3 ? K.accent4 : K.accent1 }, objectName: 'step ' + k }); img(s, k + '_n', 9.8, y + 0.2, 0.4);
      T(s, ['Evidence', 'Email', 'Wait', 'Edit', 'Log'][i], { x: 10.6, y, w: 2, h: 0.8, fontSize: 18, bold: true, color: 'FFFFFF', valign: 'middle' }); if (i < 4) s.addShape(SH.line, { x: 10.0, y: y + 0.82, w: 0, h: 0.24, line: { color: K.accent5, width: 2 }, objectName: 'connector' }); }); }

  await pres.writeFile({ fileName: out });
  if (process.env.APPLY_THEME) await require(process.env.APPLY_THEME).applyTheme(out, THEME);
  console.log('wrote', out);
}
main().catch((e) => { console.error(e); process.exit(1); });
