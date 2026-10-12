// Run: node tests.cjs. No network requests or real messages are sent.
const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
const source=name=>fs.readFileSync(`${__dirname}/${name}`,'utf8');
const nodes=new Map();
const node=id=>{
 if(!nodes.has(id)) nodes.set(id,{value:'',textContent:'',classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this[type]=fn},style:{},focus(){}});
 return nodes.get(id);
};
let clipboard='',opened,downloaded;
let settings={resume:{name:'resume.pdf',data:'data:application/pdf;base64,JVBERg=='},resumeText:'Candidate with Python and Terraform experience.',candidateName:'Test Candidate'};
const records={};
const context=vm.createContext({document:{getElementById:node,querySelectorAll:()=>[],body:{style:{}}},location:{search:''},URLSearchParams,URL,Blob,console,navigator:{clipboard:{writeText:async text=>clipboard=text}},chrome:{storage:{local:{get:async()=>settings,set:async s=>Object.assign(settings,s)},session:{get:async()=>records,set:async s=>Object.assign(records,s),remove:async()=>{}}},runtime:{openOptionsPage(){}},tabs:{query:async()=>[],create:async data=>opened=data},downloads:{download:async data=>downloaded=data}}});
vm.runInContext(source('job-details.js'),context);
vm.runInContext(source('popup.js'),context);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(node('analysisModeSelect').value,'local'); // no apiKey/analysisMode saved yet -> defaults to local
 node('analysisModeSelect').value='chatgpt-browser';await node('analysisModeSelect').change();
 assert.equal(settings.analysisMode,'chatgpt-browser'); // popup persists the pick immediately, no Settings page involved
 node('analysisModeSelect').value='local';await node('analysisModeSelect').change();
 assert.equal(settings.analysisMode,'local');
 vm.runInContext("showAPIError('Quota reached\\nHTTP 429 · insufficient_quota\\nCheck credits')",context);
 assert.equal(node('apiErrorCode').textContent,'insufficient_quota');assert.equal(node('apiBillingLink').hidden,false);assert.equal(node('apiErrorBox').hidden,false);
 vm.runInContext("showAPIError('Rate exceeded\\nHTTP 429 · rate_limit_exceeded · Retry-After: 30')",context);
 assert.equal(node('apiErrorCode').textContent,'rate_limit');assert.equal(node('apiBillingLink').hidden,true);assert.equal(node('apiRetryAfter').textContent,'Retry-After: 30');
 vm.runInContext("showAPIError('Could be exhausted quota or rate limiting\\nHTTP 429')",context);
 assert.equal(node('apiErrorCode').textContent,'unknown_429');
 vm.runInContext(`currentJob={title:'DevOps Engineer',company:'Example',description:'Terraform Python AWS and Kubernetes required for this role.',url:'https://www.linkedin.com/feed/update/urn:li:activity:123/',source:'LinkedIn post'}`,context);
 await vm.runInContext("runAnalysis(currentJob,'status')",context);
 assert.equal(node('apiErrorBox').hidden,true);
 assert.equal(node('score').textContent,50);
 assert.match(node('letter').value,/Test Candidate/);
 assert.ok(!node('letter').value.includes('five years'));
 assert.match(node('resumeInfo').textContent,/resume.pdf/);
 await node('getResume').click(); assert.equal(downloaded.filename,'resume.pdf');
 await node('resultChatGPT').click();
 assert.match(clipboard,/Candidate with Python/); assert.match(clipboard,/Terraform Python AWS/);
 assert.equal(opened.url,'https://chatgpt.com/');
 settings={...settings,resumeText:''};
 await assert.rejects(vm.runInContext("runAnalysis(currentJob,'status')",context),/text is missing/);
 settings={...settings,resumeText:'DevOps Engineer with AWS and Terraform'};
 settings.analysisMode='openai';
 await assert.rejects(vm.runInContext("runAnalysis(currentJob,'status')",context),/Add your OpenAI API key/);
 settings.analysisMode='local';
 const inferred=vm.runInContext(`inferJobDetails({description:'HIRING | DEVOPS ENGINEER\\nDRC Systems is looking for a skilled DevOps Engineer.\\nTerraform and AWS required.'},'DevOps Engineer')`,context);
 assert.equal(inferred.title.toLowerCase(),'devops engineer');assert.equal(inferred.company,'DRC Systems');
 const unknown=vm.runInContext(`inferJobDetails({description:'We are hiring a DevOps Engineer. Kubernetes required.'})`,context);
 assert.equal(unknown.company,'');
 vm.runInContext(`currentJob={description:'HIRING | DEVOPS ENGINEER\\nDRC Systems is looking for a skilled DevOps Engineer. Terraform required.',source:'LinkedIn post',url:'https://example.com'}`,context);
 node('postTitle').value='';node('postCompany').value='';node('postText').value=vm.runInContext('currentJob.description',context);
 await node('postAnalyze').click();assert.equal(node('jobTitle').textContent.toLowerCase(),'devops engineer');assert.match(node('jobMeta').textContent,/DRC Systems/);
 let handler,stored,popupData;
 const bg=vm.createContext({importScripts(){},console,chrome:{storage:{local:{setAccessLevel:async()=>{}},session:{get:async()=>({}),set:async s=>stored=s,remove:async()=>{}}},tabs:{onRemoved:{addListener(){}},get:async()=>({}),update:async()=>{},create:async()=>({id:1})},runtime:{getURL:p=>'chrome-extension://test/'+p,onMessage:{addListener:fn=>handler=fn}},action:{openPopup:async d=>popupData=d}}});
 vm.runInContext(source('background.js'),bg);
 const job={description:'Selected post has enough text for validation and extraction.',url:'https://www.linkedin.com/feed/update/123'};
 const response=await new Promise(resolve=>handler({type:'OPEN_POST',job},{tab:{id:1,windowId:42},url:'https://www.linkedin.com/search/results/content/'},resolve));
 assert.equal(response.ok,true); assert.equal(popupData.windowId,42);
 assert.equal(stored['postForTab:1'].job.description,job.description);
 bg.chrome.action.openPopup=async()=>{throw new Error('Blocked')};
 const fallback=await new Promise(resolve=>handler({type:'OPEN_POST',job},{tab:{id:2,windowId:42},url:'https://www.linkedin.com/search/results/content/'},resolve));
 assert.equal(fallback.ok,false);assert.match(fallback.error,/toolbar icon/);assert.ok(stored['postForTab:2']);
 context.chrome.tabs.query=async()=>[{id:1}];
 records['postForTab:1']={job:{...job,title:'Retained role'},result:{score:80,summary:'Cached',matchedSkills:[],missingSkills:[],coverLetter:'Saved letter'},candidateName:'Test Candidate'};
 await vm.runInContext('loadSelectedPost()',context);
 assert.equal(node('letter').value,'Saved letter');
 node('letter').value='Edited letter';await node('letter').input();
 assert.equal(records['postForTab:1'].result.coverLetter,'Edited letter');
 records['postForTab:1']={job,pending:true};
 await vm.runInContext('loadSelectedPost()',context);assert.match(node('postStatus').textContent,/still running or was interrupted/);
 records['postForTab:1']={job,pending:false,error:'Gemini reply had no JSON.',rawReply:'raw text here'};
 await vm.runInContext('loadSelectedPost()',context);assert.match(node('postStatus').textContent,/Gemini reply had no JSON/);assert.match(node('postStatus').textContent,/raw text here/);
 bg.chrome.action.openPopup=async d=>popupData=d;
 const wf=await new Promise(resolve=>handler({type:'OPEN_POST',job},{tab:{id:9,windowId:1},url:'https://wellfound.com/jobs/123'},resolve));
 assert.equal(wf.ok,true);assert.ok(stored['postForTab:9']); // non-LinkedIn supported site accepted
 assert.equal(handler({type:'OPEN_POST',job},{url:'https://evil.example/'},()=>{}),undefined); // a message with no tab is ignored
 assert.equal(handler({type:'OPENAI_ANALYZE'},{url:'https://www.linkedin.com/'},()=>{}),undefined);
 console.log('PASS: resume-first scoring, evidence-only letter, resume download, ChatGPT clipboard handoff, missing-text guard, isolated post window and sender checks, popup mode selector persistence, and missing-API-key guard.');
})().catch(e=>{console.error(e);process.exitCode=1});
