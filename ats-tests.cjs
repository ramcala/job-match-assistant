// Exercises background.js ATS JSON extraction/validation (no network).
const vm = require('node:vm'), fs = require('node:fs'), assert = require('node:assert/strict');
const SRC = fs.readFileSync(__dirname + '/background.js', 'utf8');
const chrome = {
  storage: { local: { setAccessLevel() {}, get: async () => ({}) }, session: { get: async () => ({}), set: async () => {} } },
  tabs: { onRemoved: { addListener() {} } },
  runtime: { onMessage: { addListener() {} }, getURL: p => 'x/' + p },
  action: { openPopup: async () => {} },
  scripting: { executeScript: async () => [{ result: '' }] }
};
const c = vm.createContext({ console, AbortSignal, URLSearchParams, fetch: async () => ({}), importScripts() {}, chrome });
vm.runInContext(SRC, c);

const fenced = 'here you go\n```json\n{"score":82,"summary":"Good.","missingKeywords":["Kubernetes"],"strengths":["Impact"],"improvements":["Add metrics"]}\n```';
let r = vm.runInContext('extractAtsJson(' + JSON.stringify(fenced) + ')', c);
assert.equal(r.score, 82);
assert.equal(r.missingKeywords[0], 'Kubernetes');
assert.equal(r.strengths.length, 1);

const bare = '{"score":90.6,"summary":"x","missingKeywords":[],"strengths":[],"improvements":[],}';
r = vm.runInContext('extractAtsJson(' + JSON.stringify(bare) + ')', c);
assert.equal(r.score, 91);

assert.throws(() => vm.runInContext('extractAtsJson(' + JSON.stringify('{"score":150}') + ')', c));
assert.throws(() => vm.runInContext('extractAtsJson(' + JSON.stringify('no json here') + ')', c));

console.log('PASS: ATS extraction (fenced, bare+trailing-comma+round, invalid-score guard, no-json guard).');
