// Unit test for easy-apply.js pure answer mapper (no DOM).
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx=vm.createContext({ location:{ hostname:'www.linkedin.com' }, setInterval:()=>0 });
ctx.globalThis=ctx;
vm.runInContext(fs.readFileSync(`${__dirname}/easy-apply.js`,'utf8'), ctx);
const f=ctx.easyApplyAnswerFor;
assert.ok(typeof f==='function','mapper exported');
const ans={eaPhone:'+91-7888924374',eaLocation:'Gurugram',eaExperienceYears:'9 years',eaNotice:'60 days',eaCurrentCTC:'45 LPA',eaExpectedCTC:'60 LPA',eaWorkAuth:'Yes'};
const chk=(label,kind,value)=>{ const r=f(label,ans); assert.ok(r,'expected a match for: '+label); assert.equal(r.kind,kind); assert.equal(r.value,value); };
chk('Mobile phone number','text','+91-7888924374');
chk('What is your notice period?','text','60 days');
chk('Expected CTC (in LPA)','text','60 LPA');
chk('Current CTC','text','45 LPA');
chk('Current location','text','Gurugram');
chk('How many years of experience do you have in Python?','text','9'); // numeric-only
chk('Are you legally authorized to work in India?','choice','Yes');
chk('Expected salary','text','60 LPA');
chk('Current salary','text','45 LPA');
assert.equal(f('What is your favourite colour?', ans), null); // unmapped -> null
const ansL={eaLearned:{'what is your favourite colour?':'Green','do you have a driving licence?':'Yes'}};
var chk2=(label,value)=>{ const r=f(label,ansL); assert.ok(r,'learned match for: '+label); assert.equal(r.kind,'text'); assert.equal(r.value,value); };
chk2('What is your favourite colour?','Green'); // whitespace/case normalized
chk2('Do you have a driving licence?','Yes');
assert.equal(f('Totally unknown question', ansL), null); // not learned -> null

assert.equal(f('Phone', {}), null); // no saved value -> null
console.log('PASS: easy-apply answer mapping (phone, notice, CTC, location, numeric experience, work-auth choice, unmapped->null, empty->null) + learned-answer fallback (normalized match, miss->null).');
