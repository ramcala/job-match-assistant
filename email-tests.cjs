// Mocked network only. Exercises background.js findEmail (Hunter.io) logic.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const SRC=fs.readFileSync(`${__dirname}/background.js`,'utf8');
function ctx(store, fetchImpl){
  const chrome={
    storage:{ local:{ setAccessLevel(){}, get:async()=>store }, session:{ get:async()=>({}), set:async()=>{}, remove:async()=>{} } },
    runtime:{ onMessage:{ addListener(){} }, getURL:p=>'x/'+p },
    tabs:{ onRemoved:{ addListener(){} } },
    action:{ openPopup:async()=>{} },
    scripting:{ executeScript:async()=>[{result:''}] }
  };
  const c=vm.createContext({ console, AbortSignal, URLSearchParams, importScripts(){}, chrome, fetch:fetchImpl });
  vm.runInContext(SRC,c);
  return c;
}
(async()=>{
  // 1) missing key
  let c=ctx({}, async()=>({ok:true,json:async()=>({})}));
  await assert.rejects(vm.runInContext("findEmail({company:'Acme'})",c),/Hunter\.io API key/);

  // 2) domain-search prefers recruiter/talent role over higher-confidence CEO
  const ds={data:{domain:'acme.com',emails:[
    {value:'ceo@acme.com',position:'CEO',confidence:99},
    {value:'talent@acme.com',position:'Talent Acquisition',confidence:50},
    {value:'info@acme.com',position:'',confidence:80}]}};
  c=ctx({emailFinderKey:'k'}, async(url)=>{assert.ok(url.includes('domain-search'));assert.ok(url.includes('domain=acme.com'));return {ok:true,json:async()=>ds};});
  let r=await vm.runInContext("findEmail({domain:'acme.com'})",c);
  assert.equal(r.primary,'talent@acme.com'); assert.equal(r.others.length,2);

  // 3) email-finder direct name match wins
  c=ctx({emailFinderKey:'k'}, async(url)=>{
    if(url.includes('email-finder')){assert.ok(url.includes('first_name=Jane'));return {ok:true,json:async()=>({data:{email:'jane@acme.com',score:95}})};}
    return {ok:true,json:async()=>({data:{emails:[]}})};
  });
  r=await vm.runInContext("findEmail({domain:'acme.com',firstName:'Jane',lastName:'Doe'})",c);
  assert.equal(r.primary,'jane@acme.com');

  // 4) API error surfaced
  c=ctx({emailFinderKey:'k'}, async()=>({ok:false,status:401,json:async()=>({errors:[{details:'Invalid API key'}]})}));
  await assert.rejects(vm.runInContext("findEmail({domain:'acme.com'})",c),/Invalid API key/);

  // 5) no company/domain
  c=ctx({emailFinderKey:'k'}, async()=>({ok:true,json:async()=>({})}));
  await assert.rejects(vm.runInContext("findEmail({})",c),/No company or domain/);

  // 6) Apollo provider: POSTs people/match and returns person.email
  c=ctx({emailFinderProvider:'apollo',apolloKey:'ak'}, async(url,opts)=>{
    assert.ok(url.includes('api.apollo.io'));
    assert.equal(opts.method,'POST');
    assert.equal(opts.headers['X-Api-Key'],'ak');
    const body=JSON.parse(opts.body); assert.equal(body.first_name,'Jane');
    return {ok:true,json:async()=>({person:{email:'jane@acme.com'}})};
  });
  r=await vm.runInContext("findEmail({company:'Acme',firstName:'Jane',lastName:'Doe'})",c);
  assert.equal(r.primary,'jane@acme.com');

  // 7) Apollo requires a first name
  c=ctx({emailFinderProvider:'apollo',apolloKey:'ak'}, async()=>({ok:true,json:async()=>({})}));
  await assert.rejects(vm.runInContext("findEmail({company:'Acme'})",c),/first name/i);

  // 8) Apollo missing key
  c=ctx({emailFinderProvider:'apollo'}, async()=>({ok:true,json:async()=>({})}));
  await assert.rejects(vm.runInContext("findEmail({company:'Acme',firstName:'Jane'})",c),/Apollo\.io API key/);

  // 9) RocketReach provider: GET lookup returns first email
  c=ctx({emailFinderProvider:'rocketreach',rocketreachKey:'rk'}, async(url)=>{
    assert.ok(url.includes('api.rocketreach.co'));
    assert.ok(url.includes('api_key=rk'));
    return {ok:true,json:async()=>({emails:[{email:'jane@acme.com'},{email:'j.doe@acme.com'}]})};
  });
  r=await vm.runInContext("findEmail({company:'Acme',firstName:'Jane',lastName:'Doe'})",c);
  assert.equal(r.primary,'jane@acme.com'); assert.equal(r.others.length,1);

  // 10) RocketReach requires a first name
  c=ctx({emailFinderProvider:'rocketreach',rocketreachKey:'rk'}, async()=>({ok:true,json:async()=>({})}));
  await assert.rejects(vm.runInContext("findEmail({company:'Acme'})",c),/first name/i);

  // 11) cache hit returns stored result without any network call
  let called=false;
  c=ctx({emailFinderKey:'k', emailCache:{ 'hunter|acme.com||': { primary:'cached@acme.com', others:[], note:'cached' } }}, async()=>{ called=true; return {ok:true,json:async()=>({})}; });
  r=await vm.runInContext("findEmail({domain:'acme.com'})",c);
  assert.equal(r.primary,'cached@acme.com'); assert.equal(called,false,'should not hit network on cache hit');

  console.log('PASS: email-finder hunter (key guard, recruiter ranking, name match, API error, missing target) + Apollo (match, needs-name, missing-key) + RocketReach (match, needs-name).');
})().catch(e=>{console.error(e);process.exitCode=1});
