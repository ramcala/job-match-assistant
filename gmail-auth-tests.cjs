// OAuth boundary tests with no live Google connection.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const local={},session={};let callbackMode='ok',launches=0,listener;
const area=data=>({get:async key=>({[key]:data[key]}),set:async values=>Object.assign(data,values),remove:async key=>delete data[key]});
const client='123-example.apps.googleusercontent.com';
const context=vm.createContext({URL,URLSearchParams,Date,crypto:require('node:crypto').webcrypto,chrome:{
 storage:{local:area(local),session:area(session)},runtime:{getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener:fn=>listener=fn}},
 identity:{getRedirectURL:()=> 'https://test.chromiumapp.org/gmail',clearAllCachedAuthTokens:async()=>{},launchWebAuthFlow:async({url})=>{
  launches++;const auth=new URL(url);assert.equal(auth.searchParams.get('client_id'),client);
  if(callbackMode==='cancel')return undefined;
  const state=callbackMode==='state'?'wrong':auth.searchParams.get('state');
  if(callbackMode==='changed')local.gmailClientId='456-other.apps.googleusercontent.com';
  return (callbackMode==='redirect'?'https://evil.example/gmail':'https://test.chromiumapp.org/gmail')+'#'+new URLSearchParams({state,access_token:'mock-token',token_type:'Bearer',expires_in:'3600',scope:callbackMode==='scope'?'email':'https://www.googleapis.com/auth/gmail.send'});
 }}}});
vm.runInContext(fs.readFileSync(__dirname+'/gmail.js','utf8'),context);
(async()=>{
 context.client=client;
 await assert.rejects(vm.runInContext('saveGmailClient("fake")',context),/Paste/);
 await vm.runInContext('saveGmailClient(client)',context);assert.equal(local.gmailClientId,client);
 await assert.rejects(vm.runInContext('gmailToken(false)',context),/Connect Gmail/);assert.equal(launches,0);
 assert.equal(await vm.runInContext('gmailToken(true)',context),'mock-token');
 assert.equal(await vm.runInContext('gmailToken(false)',context),'mock-token');assert.equal(launches,1);
 session.gmailAuth.expiresAt=0;await assert.rejects(vm.runInContext('gmailToken(false)',context),/expired/);
 for(callbackMode of ['state','redirect','scope','cancel','changed']){
  await vm.runInContext('saveGmailClient(client)',context);
  await assert.rejects(vm.runInContext('gmailToken(true)',context));assert.equal(session.gmailAuth,undefined);
 }
 await vm.runInContext('saveGmailClient(client)',context);await vm.runInContext('clearGmailAuth()',context);assert.equal(local.gmailClientId,client);
 assert.equal(listener({type:'GMAIL_SAVE_CLIENT',clientId:client},{url:'chrome-extension://test/popup.html'},()=>{}),undefined);
 console.log('PASS: saved client persistence, validation, auth state/redirect/scope, token cache/expiry, cancellation, config changes, settings-only writes.');
})().catch(error=>{console.error(error);process.exitCode=1});
