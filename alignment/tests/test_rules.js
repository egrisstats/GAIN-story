// The same hypothetical cases against the JavaScript rules used by the reviewer page. Run: node tests/test_rules.js
var path = require('path'), fs = require('fs');
var R = require(path.join(__dirname, '..', 'src', 'alignment_rules.js'));
var spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'spec', 'decision_tree.json'), 'utf8'));
var cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'hypothetical_cases.json'), 'utf8'));
var bad = 0;
cases.forEach(function (c) {
  var got = R.decide(spec, c.input), ok = got.outcome === c.expected;
  bad += ok ? 0 : 1;
  console.log((ok ? 'ok  ' : 'FAIL'), c.name, '->', got.outcome, got.score == null ? '' : got.score);
});
process.exit(bad);
