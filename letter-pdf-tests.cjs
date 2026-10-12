const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/letter-pdf.js','utf8'),ctx);
const text=s=>Buffer.from(s).toString('latin1');
let pdf=text(vm.runInContext('makeLetterPdf',ctx)('Dear Hiring Manager,\n\nI’m applying (urgently) — café 中文 \\ done.'));
assert.match(pdf,/^%PDF-1\.4/);assert.match(pdf,/%%EOF\n$/);assert.match(pdf,/I'm applying \\\(urgently\\\) - café \?\? \\\\ done\./);
const long=Array.from({length:400},(_,i)=>'word'+i).join(' ');
pdf=text(vm.runInContext('makeLetterPdf',ctx)(long));assert.match(pdf,/\/Count (\d+)/);assert(Number(pdf.match(/\/Count (\d+)/)[1])>=2,'long text paginates');
// xref offsets must point at "N 0 obj"
const start=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(start,start+4),'xref');
const offs=[...pdf.slice(start).matchAll(/(\d{10}) 00000 n/g)].map(m=>Number(m[1]));offs.forEach((o,i)=>assert.equal(pdf.slice(o,o+(String(i+1).length+6)),`${i+1} 0 obj`));
assert.doesNotThrow(()=>vm.runInContext('makeLetterPdf',ctx)(''));
console.log('PASS: letter PDF header/trailer, xref offsets, escaping, Latin-1 mapping, word wrap and pagination.');
