const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let textNodes=[],cards=[],timers=0;
const context=vm.createContext({console,location:{pathname:'/search/results/content/',href:'https://www.linkedin.com/search/results/content/'},document:{querySelectorAll:selector=>selector.includes('.update-components-text')?textNodes:cards,addEventListener(){},documentElement:{}},window:{addEventListener(){}},MutationObserver:class{observe(){}},setInterval(){},setTimeout(){timers++;return timers;}});
const code=fs.readFileSync(`${__dirname}/search-posts.js`,'utf8').replace('globalThis.__jobMatchPosts={refresh};refresh();','globalThis.__jobMatchPosts={refresh,findCards,capture,queue};');
vm.runInContext(code,context);const api=context.__jobMatchPosts;
function card(urn,link=null){return {nodeType:1,closest:()=>null,contains:()=>false,getAttribute:name=>name==='data-urn'?urn:null,querySelector:selector=>selector.includes('.update-components-text')?null:link,querySelectorAll:()=>[]};}
function text(parent,value){return {nodeType:1,innerText:value,closest:selector=>selector==='[data-job-match-ui]'?null:parent,contains:()=>false};}
const first=card('urn:li:activity:123'),second=card('urn:li:activity:456');
const a=text(first,'First job requires Kubernetes, AWS and Terraform.'),b=text(second,'Second job requires Azure, Python and Linux.');
first.querySelectorAll=()=>[a];second.querySelectorAll=()=>[b];
cards=[first,second];textNodes=[a,b];
assert.equal(api.findCards().length,2);
assert.equal(api.capture(first).description,a.innerText);
assert.equal(api.capture(first).url,'https://www.linkedin.com/feed/update/urn:li:activity:123/');
assert.ok(!api.capture(first).description.includes('Azure'));
const original=a.innerText;
a.innerText=original+' …more';
assert.equal(api.capture(first).collapsed,true);
assert.equal(api.capture(first).description,original);
a.innerText=original+' More experience is preferred.';
assert.equal(api.capture(first).collapsed,false);
assert.ok(api.capture(first).description.includes('More experience'));
a.innerText=original;
// Nested card with no text used to make the old implementation skip a valid parent.
const emptyNested=card('urn:li:activity:999');cards.push(emptyNested);
assert.equal(api.findCards().length,2);
// A repost/text wrapper must not create a second Analyze control.
const nested=card('urn:li:activity:777');first.contains=node=>node===nested;
textNodes.push(text(nested,'Nested repost content with enough text to recognize.'));cards.push(nested);
assert.equal(api.findCards().length,2);
// Semantic card / permalink fallback when familiar text classes are absent.
textNodes=[];cards=[card(null,{href:'https://www.linkedin.com/posts/example'})];cards[0].innerText='A job post with an unfamiliar layout but a valid permalink.';
assert.equal(api.findCards().length,1);
api.queue();api.queue();api.queue();assert.equal(timers,1);
console.log('PASS: post isolation, permalink, nested wrappers, semantic fallback, non-starving rescan scheduling.');
