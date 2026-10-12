// Unit test for gmail.js parseJobEmailLinks (pure HTML parsing).
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const c=vm.createContext({console, chrome:{storage:{local:{setAccessLevel(){}}},runtime:{onMessage:{addListener(){}},getManifest:()=>({oauth2:{}}),getURL:p=>'x/'+p},identity:{}, }, atob:s=>Buffer.from(s,'base64').toString('binary'), TextDecoder, AbortSignal, fetch:async()=>({}) });
c.globalThis=c;
vm.runInContext(fs.readFileSync(`${__dirname}/gmail.js`,'utf8'), c);
const p=c.parseJobEmailLinks; assert.ok(typeof p==='function','exported');
const html=`
  <a href="https://www.linkedin.com/comm/jobs/view/3899?trk=abc">Senior Backend Engineer at Acme</a>
  <a href="https://www.linkedin.com/comm/unsubscribe?x=1">Unsubscribe</a>
  <a href="https://in.indeed.com/rc/clk?jk=123">Software Engineer III</a>
  <a href="https://www.linkedin.com/help/answer">Help</a>
  <a href="https://www.naukri.com/job-listings-backend-xyz">Backend Developer - Gurugram</a>
  <a href="https://www.linkedin.com/comm/jobs/view/3899?trk=dup">Senior Backend Engineer at Acme</a>
`;
const r=p(html);
const urls=r.map(x=>x.url.split('?')[0]);
assert.ok(r.find(x=>/Senior Backend Engineer/.test(x.title)),'linkedin job captured');
assert.ok(r.find(x=>/Software Engineer III/.test(x.title)),'indeed job captured');
assert.ok(r.find(x=>/Backend Developer/.test(x.title)),'naukri job captured');
assert.ok(!r.find(x=>/Unsubscribe|Help/i.test(x.title)),'noise filtered');
assert.equal(new Set(urls).size, urls.length, 'deduped');
assert.equal(r.length,3,'exactly the 3 real jobs');
assert.equal(p('').length,0); assert.equal(p(null).length,0);
console.log('PASS: inbox job-email parsing (linkedin/indeed/naukri captured, unsubscribe/help filtered, dedup, empty-safe).');
