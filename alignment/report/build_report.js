/* The yearly alignment review report, from an export of the review store.

     node alignment/report/build_report.js <export_dir> <out_dir>

   <export_dir> holds queue/*.json, decisions/*.json and meta/run.json (an ArtifactData export).
   Writes <out_dir>/gain2026_alignment_review.docx and <out_dir>/report.json; build_xlsx.py turns
   report.json into the workbook. The reason for each decision is the one saved with it, or the
   same text the review page writes from the checklist (src/alignment_text.js).
   The model and the document come from report_lib.js, shared with the standalone review page.
   Holds titles, organisations and reasons, no personal data. Keep it out of the public repos. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const R = require(path.join(ROOT, 'alignment/src/alignment_rules.js'));
const T = require(path.join(ROOT, 'alignment/src/alignment_text.js'));
const LIB = require(path.join(ROOT, 'alignment/report/report_lib.js'));
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

const model = LIB.buildModel({ queue, dec, meta, spec, excerpts, rules: R, text: T });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(model, null, 1));
const doc = LIB.buildDocx(D, model);
const rows = model.rows, reviewed = rows.filter((r) => r.outcome !== 'open');
D.Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(path.join(out, 'gain2026_alignment_review.docx'), buf); console.log(rows.length + ' examples, ' + reviewed.length + ' reviewed ->', out); });
