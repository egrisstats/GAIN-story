/* The how-to deck for reviewers, linked from the review page ("How it works (slides)").

     PPTX_MODULE=<path to pptxgenjs> APPLY_THEME=<path to apply_theme.js> node alignment/review/guide_deck.js [out.pptx] [only slide n]

   Writes dashboard/review-guide.pptx by default. No respondent data: process and page instructions only. */
const path = require('path');
const pptxgen = require(process.env.PPTX_MODULE || 'pptxgenjs');
const out = process.argv[2] || path.resolve(__dirname, '..', '..', 'dashboard', 'review-guide.pptx');
const only = process.argv[3] ? +process.argv[3] : null;

const THEME = { name: 'EGRISS review guide', headFontFace: 'Arial', bodyFontFace: 'Arial',
  colors: { dk1: '14234C', lt1: 'FFFFFF', dk2: '1C2D5A', lt2: 'EFF7FF', accent1: '4CC3C9', accent2: '3B71B9', accent3: 'F06667', accent4: 'E0A93B', accent5: '8DB8E3', accent6: '5F6B87', hlink: '3B71B9', folHlink: '5F6B87' } };
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';            // 13.33 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'GAIN 2026 alignment review: how it works';
pres.author = 'EGRISS Secretariat';
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: 'Dark', background: { color: THEME.colors.dk2 },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.9, y: 2.3, w: 11.5, h: 1.6, fontSize: 44, bold: true, color: C.background1, align: 'left', valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.9, y: 4.1, w: 10.5, h: 1.4, fontSize: 20, color: C.accent5, align: 'left', valign: 'top' }, text: '' } }] });
pres.defineSlideMaster({ title: 'Content', background: { color: 'FFFFFF' },
  objects: [{ placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 0.45, w: 11.9, h: 0.95, fontSize: 34, bold: true, color: C.text1, align: 'left', valign: 'middle' }, text: '' } },
    { text: { text: 'GAIN 2026 alignment review · EGRISS Secretariat', options: { x: 0.7, y: 6.95, w: 8, h: 0.3, fontSize: 10, color: C.accent6, isTextBox: true, margin: 0 } } }],
  slideNumber: { x: 12.1, y: 6.95, w: 0.6, h: 0.3, fontSize: 10, color: THEME.colors.accent6, align: 'right' } });

let n = 0;
const want = () => { n += 1; return !only || only === n; };
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 15, color: C.text1, valign: 'top' }, o));
// a tinted card with a numbered circle, a heading and a few lines
function card(s, x, y, w, h, num, head, lines, tint) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: tint || C.background2 }, line: { color: tint || C.background2 }, objectName: 'card ' + head });
  let ty = y + 0.3;
  if (num != null) {
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: y + 0.3, w: 0.55, h: 0.55, fill: { color: C.text2 }, line: { color: C.text2 }, objectName: 'number ' + num });
    T(s, String(num), { x: x + 0.3, y: y + 0.3, w: 0.55, h: 0.55, fontSize: 16, bold: true, color: C.background1, align: 'center', valign: 'middle' });
    ty = y + 1.0;
  }
  T(s, head, { x: x + 0.3, y: ty, w: w - 0.6, h: 0.45, fontSize: 18, bold: true });
  T(s, lines.map((l, i) => ({ text: l, options: { breakLine: i < lines.length - 1 } })), { x: x + 0.3, y: ty + 0.55, w: w - 0.6, h: h - (ty - y) - 0.75, fontSize: 14, color: C.text1, paraSpaceAfter: 6 });
}

// 1
if (want()) { const s = pres.addSlide({ masterName: 'Dark' });
  s.addText('Reviewing No and Don’t know answers', { placeholder: 'title' });
  s.addText('GAIN 2026 · how the review works, and how to use the review page', { placeholder: 'body' });
  s.addNotes('A short guide for Secretariat reviewers. Open the tracker, press Review answers, and follow the five steps.'); }

// 2
if (want()) { const s = pres.addSlide({ masterName: 'Content' });
  s.addText('What we review, and why', { placeholder: 'title' });
  card(s, 0.7, 1.7, 3.8, 3.4, null, 'What', ['Every GAIN 2026 example where the respondent said the recommendations were not used, or that they don’t know.', 'One example at a time.']);
  card(s, 4.75, 1.7, 3.8, 3.4, null, 'Why', ['Some of these examples do follow the recommendations without naming them.', 'We check the evidence so the use figure reflects practice, not only awareness.']);
  card(s, 8.8, 1.7, 3.8, 3.4, null, 'What never changes', ['Their own answer stays on record.', 'If we count an example as using, we tell the organisation why, and they can ask us to restore it.', 'Suggestions on the page are hints. Every decision is yours.'], 'E3F4F5');
  s.addNotes('The review exists because respondents often apply the approach of the recommendations without knowing the documents by name.'); }

// 3
if (want()) { const s = pres.addSlide({ masterName: 'Content' });
  s.addText('Five steps for each example', { placeholder: 'title' });
  const steps = [['Read', 'What they wrote, what we found online, and how similar examples answered.'], ['Three questions', 'Is it statistics? Do they say why not? Which groups does it cover?'],
    ['Checklist', 'Mark each item found, not found or can’t tell, and where you saw it.'], ['Decide', 'The page shows the result and writes the reason. Edit it if needed.'], ['Submit', 'Save, then press Submit in the Kobo tab that opens.']];
  steps.forEach((st, i) => {
    const x = 0.7 + i * 2.42;
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.9, w: 2.2, h: 3.9, rectRadius: 0.12, fill: { color: i === 4 ? 'E3F4F5' : C.background2 }, line: { color: i === 4 ? 'E3F4F5' : C.background2 }, objectName: 'step ' + (i + 1) });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: 2.15, w: 0.7, h: 0.7, fill: { color: C.text2 }, line: { color: C.text2 }, objectName: 'step number ' + (i + 1) });
    T(s, String(i + 1), { x: x + 0.25, y: 2.15, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: C.background1, align: 'center', valign: 'middle' });
    T(s, st[0], { x: x + 0.25, y: 3.1, w: 1.7, h: 0.8, fontSize: 19, bold: true });
    T(s, st[1], { x: x + 0.25, y: 3.95, w: 1.7, h: 1.7, fontSize: 14 });
  });
  T(s, 'The evidence stays beside you from step 2 on. A “no” or a stated reason at step 2 ends the review there, and the checklist is skipped.', { x: 0.7, y: 6.05, w: 11.9, h: 0.6, fontSize: 14, color: C.accent6 });
  s.addNotes('The step strip at the top of each example shows where you are. Back and Next move between steps.'); }

// 4
if (want()) { const s = pres.addSlide({ masterName: 'Content' });
  s.addText('Before you start', { placeholder: 'title' });
  card(s, 0.7, 1.7, 3.8, 3.7, 1, 'Open the review', ['Go to the GAIN 2026 tracker.', 'Press Review answers at the top.', 'No sign-in is needed.']);
  card(s, 4.75, 1.7, 3.8, 3.7, 2, 'Type your initials', ['They are saved with your decisions so colleagues see who reviewed what.', 'Nothing else about you is recorded.']);
  card(s, 8.8, 1.7, 3.8, 3.7, 3, 'Open the descriptions file', ['It holds what respondents wrote and what we found online.', 'The file is called review-evidence.json. Ask the Secretariat where it is kept.', 'It is read on your computer and never uploaded.']);
  s.addNotes('Without the descriptions file the page shows titles and similar examples only, which is not enough to review.'); }

// 5
if (want()) { const s = pres.addSlide({ masterName: 'Content' });
  s.addText('The three questions', { placeholder: 'title' });
  const rows = [['a', 'Is it about producing statistics?', 'Yes for data, registers, surveys, censuses, or guidance and training on them.', 'No: keep their answer and flag it for the validity check.'],
    ['b', 'Do they say why they didn’t use the recommendations?', 'No reason, or another framework: go on.', 'They don’t know them: send the recommendations. They chose not to: keep their answer.'],
    ['c', 'Which groups does it cover?', 'Refugees and related groups (IRRS), IDPs (IRIS), stateless people (IROSS).', 'None of these: keep their answer.']];
  T(s, 'Question', { x: 1.5, y: 1.65, w: 4, h: 0.35, fontSize: 12, bold: true, color: C.accent6 });
  T(s, 'Go on when', { x: 5.6, y: 1.65, w: 3.3, h: 0.35, fontSize: 12, bold: true, color: C.accent6 });
  T(s, 'The review stops when', { x: 9.1, y: 1.65, w: 3.5, h: 0.35, fontSize: 12, bold: true, color: C.accent6 });
  rows.forEach((r, i) => {
    const y = 2.1 + i * 1.5;
    s.addShape(pres.ShapeType.roundRect, { x: 0.7, y, w: 11.9, h: 1.3, rectRadius: 0.1, fill: { color: C.background2 }, line: { color: C.background2 }, objectName: 'question ' + r[0] });
    s.addShape(pres.ShapeType.ellipse, { x: 0.9, y: y + 0.35, w: 0.45, h: 0.45, fill: { color: C.text2 }, line: { color: C.text2 }, objectName: 'letter ' + r[0] });
    T(s, r[0], { x: 0.9, y: y + 0.35, w: 0.45, h: 0.45, fontSize: 15, bold: true, color: C.background1, align: 'center', valign: 'middle' });
    T(s, r[1], { x: 1.5, y: y + 0.15, w: 3.9, h: 1.0, fontSize: 16, bold: true, valign: 'middle' });
    T(s, r[2], { x: 5.6, y: y + 0.15, w: 3.3, h: 1.0, fontSize: 14, valign: 'middle' });
    T(s, r[3], { x: 9.1, y: y + 0.15, w: 3.3, h: 1.0, fontSize: 14, valign: 'middle' });
  });
  s.addNotes('Suggested answers appear under each question when the descriptions file is open. Change any of them.'); }

// 6
if (want()) { const s = pres.addSlide({ masterName: 'Content' });
  s.addText('The checklist, and how the result is decided', { placeholder: 'title' });
  card(s, 0.7, 1.7, 5.7, 4.6, null, 'Marking the checklist', ['Choose what the example really is: a survey, a register, a census, training, and so on. The list depends on it.', 'Mark each item Found, Not found or Can’t tell.', 'For each item found, say where you saw it: their description, online, or a similar example.', 'Strong items are what the recommendations specifically ask for, and signs they already use them. Supporting items are good practice.']);
  const res = [['Said “don’t know”', 'Two strong items are enough to count it as using.'], ['Said “not used”', 'We ask for more, including a sign they already use them.'], ['Some evidence, below that', 'Recorded as aligned: it counts for alignment, not for use.']];
  res.forEach((r, i) => {
    const y = 1.7 + i * 1.57;
    s.addShape(pres.ShapeType.roundRect, { x: 6.7, y, w: 5.9, h: 1.42, rectRadius: 0.1, fill: { color: i === 2 ? 'E6EEF9' : 'E3F4EE' }, line: { color: i === 2 ? 'E6EEF9' : 'E3F4EE' }, objectName: 'rule ' + (i + 1) });
    T(s, r[0], { x: 6.95, y: y + 0.18, w: 5.4, h: 0.4, fontSize: 17, bold: true });
    T(s, r[1], { x: 6.95, y: y + 0.65, w: 5.4, h: 0.65, fontSize: 14 });
  });
  s.addNotes('The line at the bottom of the page always says where the example is heading and what it still needs.'); }

// 7
if (want()) { const s = pres.addSlide({ masterName: 'Content' });
  s.addText('Saving takes two presses', { placeholder: 'title' });
  card(s, 0.7, 1.7, 3.8, 3.3, 1, 'Press Save', ['The Kobo form opens in a new tab with everything filled in.']);
  card(s, 4.75, 1.7, 3.8, 3.3, 2, 'Press Submit in Kobo', ['Then come back to the review and go to the next example.'], 'E3F4F5');
  card(s, 8.8, 1.7, 3.8, 3.3, 3, 'It is shared', ['You see your decision straight away. Colleagues see it within about 20 minutes.']);
  s.addShape(pres.ShapeType.roundRect, { x: 0.7, y: 5.25, w: 11.9, h: 1.25, rectRadius: 0.1, fill: { color: 'FDECEC' }, line: { color: 'FDECEC' }, objectName: 'warning' });
  T(s, [{ text: 'If you close the Kobo tab without Submit, ', options: { bold: true } }, { text: 'the decision stays on your computer only. The page tells you “not received by Kobo” and gives you the form again. To avoid two people reviewing the same example, agree who takes which organisations.' }], { x: 0.95, y: 5.4, w: 11.4, h: 0.95, fontSize: 14, valign: 'middle' });
  s.addNotes('Undo and Mark as sent work the same way: a Kobo tab opens and you press Submit.'); }

// 8
if (want()) { const s = pres.addSlide({ masterName: 'Content' });
  s.addText('After the review: emails and reports', { placeholder: 'title' });
  card(s, 0.7, 1.7, 5.8, 4.6, null, 'Emails to send', ['A draft appears for each organisation with an example counted as using, or one that should receive the recommendations.', 'Copy the draft into your own email. Nothing is sent from the page.', 'The page never reads contact details: find the focal point’s name and email in Kobo.', 'Press Mark as sent, then Submit, so colleagues don’t send it twice.']);
  card(s, 6.8, 1.7, 5.8, 4.6, null, 'Reports', ['Word: every decision with its reason, for the yearly report.', 'Excel: one row per example, with counts by outcome.', 'Print checklist: one example’s checklist, on paper or as PDF.', 'Backup: a file with every decision shown on the page.'], 'E3F4F5');
  s.addNotes('Questions on a decision, or on what counts as evidence: ask the Secretariat before saving. A decision can always be changed or undone.'); }

pres.writeFile({ fileName: out }).then(async () => {
  if (process.env.APPLY_THEME) await require(process.env.APPLY_THEME).applyTheme(out, THEME);
  console.log('wrote', out);
});
