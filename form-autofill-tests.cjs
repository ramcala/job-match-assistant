// Unit test for form-autofill.js generic mapper (no DOM).
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx=vm.createContext({ location:{ hostname:'boards.greenhouse.io' }, setInterval:()=>0 });
ctx.globalThis=ctx;
vm.runInContext(fs.readFileSync(__dirname+'/form-autofill.js','utf8'), ctx);
const f=ctx.formAutoAnswerFor;
assert.ok(typeof f==='function','mapper exported');
const ans={eaPhone:'+91-7000',eaLocation:'Gurugram',eaExperienceYears:'9 years',eaNotice:'60 days',eaCurrentCTC:'45 LPA',eaExpectedCTC:'60 LPA',eaWorkAuth:'Yes',eaLearned:{'do you have a laptop?':'Yes'}};
const chk=(l,k,v)=>{const r=f(l,ans);assert.ok(r,'match: '+l);assert.equal(r.kind,k);assert.equal(r.value,v);};
chk('Mobile phone','text','+91-7000');
chk('Notice period','text','60 days');
chk('Expected CTC','text','60 LPA');
chk('Current location','text','Gurugram');
chk('Years of experience','text','9');
chk('Are you legally authorized to work?','choice','Yes');
chk('Do you have a laptop?','text','Yes'); // learned
assert.equal(f('Favourite colour?',ans),null);
assert.equal(f('Phone',{}),null);
console.log('PASS: form-autofill mapper (phone, notice, CTC, location, numeric years, work-auth, learned, unmapped->null).');
