// OAuth boundary tests with no live Google connection.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/gmail.js','utf8');
const local={},session={};let callbackMode='ok',silentMode='ok',launches=0,lastLaunch,tokens=0;const revoked=new Set();
const area=data=>({get:async key=>key===null?data:Object.fromEntries((Array.isArray(key)?key:[key]).map(k=>[k,data[k]])),set:async values=>Object.assign(data,values),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data[key];}});
const client='123-example.apps.googleusercontent.com',email='me@example.com';
const grantedScope='email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly openid';
const identity={getRedirectURL:()=> 'https://test.chromiumapp.org/gmail',clearAllCachedAuthTokens:async()=>{},removeCachedAuthToken:async()=>{},launchWebAuthFlow:async details=>{
 launches++;lastLaunch=details;const auth=new URL(details.url);assert.equal(auth.searchParams.get('client_id'),client);
 const state=auth.searchParams.get('state'),reply=values=>'https://test.chromiumapp.org/gmail#'+new URLSearchParams({state,...values});
 if(!details.interactive) {
  assert.equal(auth.searchParams.get('prompt'),'none');
  if(silentMode==='throw')throw new Error('User interaction required.');
  if(silentMode!=='ok')return reply({error:silentMode});
  return reply({access_token:'silent-'+(++tokens),token_type:'Bearer',expires_in:'3599',scope:grantedScope});
 }
 if(callbackMode==='cancel')return undefined;
 if(callbackMode==='changed')local.gmailClientId='456-other.apps.googleusercontent.com';
 return (callbackMode==='redirect'?'https://evil.example/gmail':'https://test.chromiumapp.org/gmail')+'#'+new URLSearchParams({state:callbackMode==='state'?'wrong':state,access_token:'mock-token',token_type:'Bearer',expires_in:'3600',scope:callbackMode==='scope'?'email':grantedScope});
}};
const fetch=async(url,options)=>{
 assert.equal(url,'https://www.googleapis.com/oauth2/v2/userinfo');
 if(revoked.has(options.headers.Authorization.slice(7)))return {ok:false,status:401};
 return {ok:true,json:async()=>({email,verified_email:true,picture:''})};
};
// A service worker started from scratch: fresh module state, same chrome.storage areas.
function worker() {
 let listener;
 const context=vm.createContext({URL,URLSearchParams,Date,AbortSignal,fetch,crypto:require('node:crypto').webcrypto,chrome:{
  storage:{local:area(local),session:area(session)},runtime:{getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener:fn=>listener=fn}},identity}});
 vm.runInContext(source,context);context.client=client;
 return {run:code=>vm.runInContext(code,context),listener:(...args)=>listener(...args),
  send:(message,page='popup.html')=>new Promise(resolve=>listener(message,{url:'chrome-extension://test/'+page},resolve))};
}
// Closing Chrome wipes chrome.storage.session; reopening starts a new service worker.
function restartBrowser(){for(const key of Object.keys(session))delete session[key];return worker();}
(async()=>{
 let w=worker();
 await assert.rejects(w.run('saveGmailClient("fake")'),/Paste/);
 await w.run('saveGmailClient(client)');assert.equal(local.gmailClientId,client);
 await assert.rejects(w.run('gmailToken(false)'),/Connect Gmail/);assert.equal(launches,0);
 assert.equal(await w.run('gmailToken(true)'),'mock-token');
 assert.equal(await w.run('gmailToken(false)'),'mock-token');assert.equal(launches,1);

 // Connect stores only a non-secret marker in local storage; the token stays in session storage.
 let reply=await w.send({type:'GMAIL_CONNECT'},'options.html');assert.equal(reply.ok,true);assert.equal(reply.result.email,email);
 assert.deepEqual({...local.gmailConnection},{client,email,scope:grantedScope});
 assert.ok(!JSON.stringify(local).includes('mock-token'),'access token must not be persisted in local storage');

 // Browser restart: still connected, renewed with one hidden prompt=none flow for the same account and granted scopes.
 w=restartBrowser();const before=launches;
 reply=await w.send({type:'GMAIL_STATUS'});assert.equal(reply.ok,true);assert.equal(reply.result.email,email);
 assert.equal(launches,before+1);assert.equal(lastLaunch.interactive,false);assert.equal(lastLaunch.abortOnLoadForNonInteractive,false);
 let auth=new URL(lastLaunch.url).searchParams;
 assert.equal(auth.get('login_hint'),email);
 assert.equal(auth.get('scope'),'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
 assert.equal(session.gmailAuth.token,'silent-1');
 assert.equal((await w.run('gmailAccount()')).token,'silent-1');assert.equal(launches,before+1);

 // Several pages asking at once after a restart share one silent attempt.
 w=restartBrowser();
 const [a,b]=await Promise.all([w.run('gmailToken(false)'),w.run('gmailToken(false)')]);assert.equal(a,b);assert.equal(launches,before+2);

 // Hourly expiry and a rejected (401) token renew silently instead of reporting "not connected".
 session.gmailAuth.expiresAt=0;assert.equal(await w.run('gmailToken(false)'),'silent-3');
 revoked.add('silent-3');assert.equal((await w.run('gmailAccount()')).token,'silent-4');

 // Signed out of Google (or cookies cleared on exit): not connected now, but the link is kept for next time.
 silentMode='login_required';w=restartBrowser();
 reply=await w.send({type:'GMAIL_STATUS'});assert.equal(reply.result.email,null);assert.match(reply.result.message,/sign in again/);
 assert.equal(local.gmailConnection.client,client);
 silentMode='throw';w=restartBrowser();
 reply=await w.send({type:'GMAIL_STATUS'});assert.match(reply.result.message,/could not reconnect automatically \(User interaction required\)/);
 silentMode='ok';w=restartBrowser();
 reply=await w.send({type:'GMAIL_STATUS'});assert.equal(reply.result.email,email);

 // A revoked or expired Google grant forgets the link, so later checks don't keep trying.
 silentMode='consent_required';w=restartBrowser();
 reply=await w.send({type:'GMAIL_STATUS'});assert.equal(reply.result.email,null);assert.match(reply.result.message,/revoked/);
 assert.equal(local.gmailConnection,undefined);
 let count=launches;reply=await w.send({type:'GMAIL_STATUS'});assert.match(reply.result.message,/Connect Gmail/);assert.equal(launches,count);
 silentMode='ok';

 // Disconnect forgets the link: after a restart nothing is renewed.
 await w.send({type:'GMAIL_CONNECT'},'options.html');assert.equal(local.gmailConnection.email,email);
 reply=await w.send({type:'GMAIL_DISCONNECT'},'options.html');assert.equal(reply.ok,true);
 assert.equal(local.gmailConnection,undefined);assert.equal(session.gmailAuth,undefined);assert.equal(local.gmailClientId,client);
 w=restartBrowser();count=launches;
 reply=await w.send({type:'GMAIL_STATUS'});assert.equal(reply.result.email,null);assert.match(reply.result.message,/Connect Gmail/);assert.equal(launches,count);

 // Saving a client ID (even the same one) also requires a new Connect.
 await w.send({type:'GMAIL_CONNECT'},'options.html');await w.run('saveGmailClient(client)');assert.equal(local.gmailConnection,undefined);

 for(callbackMode of ['state','redirect','scope','cancel','changed']){
  w=worker();await w.run('saveGmailClient(client)');
  await assert.rejects(w.run('gmailToken(true)'));assert.equal(session.gmailAuth,undefined);assert.equal(local.gmailConnection,undefined);
 }
 local.gmailClientId=client;callbackMode='ok';
 await w.run('saveGmailClient(client)');await w.run('clearGmailAuth()');assert.equal(local.gmailClientId,client);
 assert.equal(w.listener({type:'GMAIL_SAVE_CLIENT',clientId:client},{url:'chrome-extension://test/popup.html'},()=>{}),undefined);
 console.log('PASS: saved client persistence, validation, auth state/redirect/scope, token cache, silent renewal after browser restart/expiry/401, signed-out and revoked grants, disconnect, cancellation, config changes, settings-only writes.');
})().catch(error=>{console.error(error);process.exitCode=1});
