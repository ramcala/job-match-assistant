// Tests background.js buildConnectNote (template fill + char cap).
const vm = require('node:vm'), fs = require('node:fs'), assert = require('node:assert/strict');
const chrome = {
  storage: { local: { setAccessLevel() {}, get: async () => ({}) }, session: { get: async () => ({}), set: async () => {} } },
  tabs: { onRemoved: { addListener() {} } },
  runtime: { onMessage: { addListener() {} }, getURL: p => 'x/' + p },
  action: { openPopup: async () => {} },
  scripting: { executeScript: async () => [{ result: '' }] }
};
const c = vm.createContext({ console, AbortSignal, URLSearchParams, fetch: async () => ({}), importScripts() {}, chrome });
vm.runInContext(fs.readFileSync(__dirname + '/background.js', 'utf8'), c);
const b = (tpl, name) => vm.runInContext('buildConnectNote(' + JSON.stringify(tpl) + ',' + JSON.stringify(name) + ')', c);
assert.equal(b("Hi {firstName}, let's connect.", 'Priya Sharma'), "Hi Priya, let's connect.");
assert.equal(b('Hello {name}!', 'Ravi Kumar'), 'Hello Ravi Kumar!');
assert.ok(b('Hi {firstName}', '').startsWith('Hi there'));
assert.ok(b('', 'Jane Doe').length > 0);
assert.ok(b('x'.repeat(400), 'A B').length <= 290);
console.log('PASS: connect-note builder (firstName/name fill, empty-name fallback, default template, 290 cap).');
