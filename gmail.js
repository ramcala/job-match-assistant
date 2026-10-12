// Loaded only in the service worker. Tokens never leave Chrome Identity / this worker.
const gmailScope='https://www.googleapis.com/auth/gmail.send';
const gmailReadScope='https://www.googleapis.com/auth/gmail.readonly';
const gmailLocks=new Set();
async function gmailToken(interactive=false) {
  const {gmailClientId}=await chrome.storage.local.get('gmailClientId');
  if(gmailClientId)return savedClientToken(gmailClientId,interactive);
  const client=chrome.runtime.getManifest().oauth2?.client_id;
  if(!client||client.startsWith('REPLACE_'))throw new Error('Save your Google OAuth Web application client ID in Settings, then Connect Gmail.');
  const result=await chrome.identity.getAuthToken({interactive});
  if(!result.token)throw new Error('Connect Gmail in Settings first.');
  if(result.grantedScopes&&!result.grantedScopes.includes(gmailScope))throw new Error('Gmail send permission was not granted. Reconnect in Settings.');
  return result.token;
}
let gmailAuthBusy=false;
let gmailAuthGeneration=0;
async function clearGmailAuth() {
  gmailAuthGeneration++;
  await chrome.storage.session.remove('gmailAuth');
  await chrome.identity.clearAllCachedAuthTokens();
}
async function invalidateGmailToken(token) {
  await chrome.storage.session.remove('gmailAuth');
  await chrome.identity.removeCachedAuthToken({token});
}
async function saveGmailClient(value) {
  const client=typeof value==='string'?value.trim():'';
  if(!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(client))throw new Error('Paste the Web application client ID issued by Google, ending in .apps.googleusercontent.com.');
  await clearGmailAuth();
  await chrome.storage.local.set({gmailClientId:client});
  return {saved:true};
}
async function savedClientToken(client,interactive) {
  const {gmailAuth}=await chrome.storage.session.get('gmailAuth');
  if(!interactive&&gmailAuth?.client===client&&gmailAuth.expiresAt>Date.now()+60000)return gmailAuth.token;
  if(!interactive)throw new Error('Connect Gmail in Settings. Your connection may have expired; the saved client ID is retained.');
  if(gmailAuthBusy)throw new Error('Google sign-in is already in progress.');
  gmailAuthBusy=true;const generation=gmailAuthGeneration;
  try {
    const redirect=chrome.identity.getRedirectURL('gmail');
    const state=crypto.randomUUID();
    const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.search=new URLSearchParams({client_id:client,redirect_uri:redirect,response_type:'token',scope:gmailScope+' '+gmailReadScope+' https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',state,prompt:'select_account consent'}).toString();
    const result=await chrome.identity.launchWebAuthFlow({url:auth.href,interactive:true});
    if(!result)throw new Error('Google sign-in was cancelled.');
    const callback=new URL(result),expected=new URL(redirect),params=new URLSearchParams(callback.hash.slice(1));
    if(callback.origin!==expected.origin||callback.pathname!==expected.pathname||callback.search||params.get('state')!==state)throw new Error('Google sign-in response validation failed.');
    if(params.has('error'))throw new Error('Google authorization was declined or failed. Check your client setup and try Connect Gmail again.');
    const token=params.get('access_token'),seconds=Number(params.get('expires_in'));
    if(!token||params.get('token_type')?.toLowerCase()!=='bearer'||!Number.isFinite(seconds)||seconds<=0)throw new Error('Google returned an invalid token response.');
    if(!params.get('scope')?.split(' ').includes(gmailScope))throw new Error('Gmail send permission was not granted. Reconnect in Settings.');
    const current=await chrome.storage.local.get('gmailClientId');
    if(generation!==gmailAuthGeneration||current.gmailClientId!==client)throw new Error('Connection settings changed. Connect Gmail again.');
    await chrome.storage.session.set({gmailAuth:{client,token,expiresAt:Date.now()+Math.min(seconds,86400)*1000}});
    return token;
  } finally {gmailAuthBusy=false;}
}
async function gmailAccount(interactive=false) {
  const token=await gmailToken(interactive);
  const response=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
  if(response.status===401)await invalidateGmailToken(token);
  if(!response.ok)throw new Error(`Cannot verify Gmail account (${response.status}). Reconnect in Settings.`);
  const account=await response.json();
  if(!account.email||account.verified_email===false)throw new Error('Could not verify the connected email address.');
  return {token,email:account.email,picture:account.picture||''};
}
function mailAddress(value) {
  if(typeof value!=='string'||! /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)||/[\r\n]/.test(value))throw new Error('Enter one valid recipient email address.');
  return value;
}
function mailAddressList(value) {
  if (value == null || value === '') return [];
  const out = [], seen = new Set();
  for (const part of String(value).split(/[,;\s]+/)) {
    const v = part.trim();
    if (!v) continue;
    const a = mailAddress(v); // throws on any invalid address or CR/LF, blocking header injection
    const k = a.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(a); }
  }
  return out;
}
function utf8Base64(text) {
  const bytes=new TextEncoder().encode(text);let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
function folded(text){return text.match(/.{1,76}/g)?.join('\r\n')||'';}
function encodedSubject(text) {
  const chunks=[];let chunk='';
  for(const char of text){if(new TextEncoder().encode(chunk+char).length>42){chunks.push(chunk);chunk='';}chunk+=char;}
  if(chunk)chunks.push(chunk);
  return chunks.map(value=>`=?UTF-8?B?${utf8Base64(value)}?=`).join('\r\n ');
}
function gmailMime(review) {
  const boundary='jobmatch_'+crypto.randomUUID();
  const headers=[`From: ${mailAddress(review.from)}`,`To: ${mailAddress(review.to)}`,
    ...(Array.isArray(review.cc)&&review.cc.length?[`Cc: ${review.cc.map(mailAddress).join(', ')}`]:[]),
    `Subject: ${encodedSubject(review.subject)}`, 'MIME-Version: 1.0',`Content-Type: multipart/mixed; boundary="${boundary}"`];
  const parts=[...headers,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',folded(utf8Base64(review.body))];
  if(review.attachment)parts.push(`--${boundary}`,`Content-Type: ${review.attachment.type}`,`Content-Disposition: attachment; filename="${review.attachment.name}"`,'Content-Transfer-Encoding: base64','',folded(review.attachment.base64));
  parts.push(`--${boundary}--`,'');
  return utf8Base64(parts.join('\r\n')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function prepareGmail(draft) {
  const to=mailAddress(draft?.to?.trim());
  const cc=mailAddressList(draft?.cc).filter(a=>a.toLowerCase()!==to.toLowerCase());
  if(typeof draft.subject!=='string'||!draft.subject.trim()||draft.subject.length>150||/[\r\n]/.test(draft.subject))throw new Error('Use a subject of 1–150 characters without line breaks.');
  if(typeof draft.body!=='string'||!draft.body.trim()||draft.body.length>60000)throw new Error('Enter an email body up to 60,000 characters.');
  const {email}=await gmailAccount();
  let attachment=null;
  if(draft.attachResume) {
    const {resume}=await chrome.storage.local.get('resume');
    if(!resume)throw new Error('No resume file saved. Upload it in Settings or uncheck Attach saved resume.');
    const match=resume.data?.match(/^data:[^,]*;base64,([A-Za-z0-9+/=]+)$/);
    if(!match||!resume.size||resume.size>3*1024*1024)throw new Error('Saved resume is invalid or exceeds 3 MB. Upload it again.');
    const ext=resume.name.split('.').pop().toLowerCase();
    const type={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain'}[ext];
    if(!type)throw new Error('Resume must be PDF, DOCX or TXT.');
    attachment={name:resume.name.replace(/[^a-zA-Z0-9._-]/g,'_'),size:resume.size,type,base64:match[1]};
  }
  const id=crypto.randomUUID();
  // Keep session storage bounded: supersede old, unsent review snapshots.
  const existing=await chrome.storage.session.get(null);
  const stale=Object.keys(existing).filter(key=>key.startsWith('gmailReview:')&&existing[key]?.status==='ready');
  if(stale.length)await chrome.storage.session.remove(stale);
  const review={id,from:email,to,cc,subject:draft.subject.trim(),body:draft.body,attachment,createdAt:Date.now(),status:'ready'};
  await chrome.storage.session.set({['gmailReview:'+id]:review});
  return {...review,attachment:attachment?{name:attachment.name,size:attachment.size}:null};
}
async function sendGmail(id) {
  if(typeof id!=='string'||gmailLocks.has(id))throw new Error('This send is already in progress.');
  gmailLocks.add(id);let submitted=false;
  const key='gmailReview:'+id;
  try {
    const state=await chrome.storage.session.get(key), review=state[key];
    if(!review||review.status!=='ready')throw new Error('This review was already used or is unavailable. Check send status before trying again.');
    if(Date.now()-review.createdAt>30*60*1000)throw new Error('Review expired. Review the email again.');
    const {token,email}=await gmailAccount();
    if(email!==review.from)throw new Error('The connected account changed. Review the email again before sending.');
    const raw=gmailMime(review);
    await chrome.storage.session.set({[key]:{...review,status:'sending'}});
    await chrome.storage.local.set({gmailLastSend:{status:'sending',to:review.to,subject:review.subject,at:Date.now()}});
    submitted=true;
    const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(25000)});
    if(!response.ok) {
      if(response.status===401)await invalidateGmailToken(token);
      if(response.status>=500)throw new Error('Gmail server error. Delivery is uncertain; check Gmail Sent before trying again.');
      const failure=`Gmail rejected the request (HTTP ${response.status}). ${response.status===401?'Reconnect Gmail.':response.status===403?'Check Gmail API enablement and send permission.':response.status===429?'Wait before trying again.':'Review the account and message.'}`;
      await chrome.storage.session.set({[key]:{status:'failed'}});
      await chrome.storage.local.set({gmailLastSend:{status:'failed',to:review.to,subject:review.subject,at:Date.now(),message:failure}});
      submitted=false;throw new Error(failure);
    }
    const sent=await response.json();
    if(!sent.id)throw new Error('Gmail response had no message ID. Check Sent before trying again.');
    await chrome.storage.session.set({[key]:{status:'sent',messageId:sent.id}});
    await chrome.storage.local.set({gmailLastSend:{status:'sent',messageId:sent.id,to:review.to,subject:review.subject,at:Date.now()}});
    return {messageId:sent.id,threadId:sent.threadId||''};
  } catch(error) {
    if(submitted) {
      await chrome.storage.session.set({[key]:{status:'unknown'}});
      await chrome.storage.local.set({gmailLastSend:{status:'unknown',at:Date.now(),message:'Delivery could not be confirmed. Check Gmail Sent before trying again.'}});
      throw new Error('Delivery could not be confirmed. Check Gmail Sent before trying again; no automatic retry was made.');
    }
    throw error;
  } finally {gmailLocks.delete(id);}
}
function b64urlToText(data){
  try { const b64=(data||'').replace(/-/g,'+').replace(/_/g,'/'); const bin=atob(b64); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i); return new TextDecoder('utf-8').decode(bytes); } catch { return ''; }
}
function mailHeader(payload,name){ const h=(payload?.headers||[]).find(x=>x.name.toLowerCase()===name.toLowerCase()); return h?h.value:''; }
function collectParts(payload,acc){
  if(!payload) return;
  const mt=payload.mimeType||'';
  if(payload.body&&payload.body.data){ if(mt==='text/html') acc.html+=b64urlToText(payload.body.data); else if(mt==='text/plain') acc.text+=b64urlToText(payload.body.data); }
  for(const p of payload.parts||[]) collectParts(p,acc);
}
// Pure: extract job links + titles from a job-alert email's HTML. Exposed for tests.
function parseJobEmailLinks(html){
  if(typeof html!=='string'||!html) return [];
  const jobRe=/(jobs\/view|comm\/jobs\/view|viewjob|indeed\.com\/(rc|company|viewjob|cmp)|naukri\.com\/job|wellfound\.com\/jobs|instahyre\.com\/job|\/jobs?\/)/i;
  const skip=/unsubscribe|manage.*alert|notification-settings|help\.|privacy|settings|see all|view all|update your|email preferences/i;
  const out=[]; const seen=new Set(); const re=/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(html))){
    let url=m[1].replace(/&amp;/g,'&');
    if(!/^https?:/i.test(url)||!jobRe.test(url)||skip.test(url)) continue;
    let title=m[2].replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&rsquo;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    if(!title||title.length<3||skip.test(title)||/^(view|apply|see|jobs?|view job|apply now)$/i.test(title)) continue;
    if(title.length>140) title=title.slice(0,140);
    const key=url.split('?')[0];
    if(seen.has(key)) continue; seen.add(key);
    out.push({title,url});
    if(out.length>=40) break;
  }
  return out;
}
if(typeof globalThis!=='undefined') globalThis.parseJobEmailLinks=parseJobEmailLinks;
async function gmailApiGet(path){
  const token=await gmailToken(false);
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
  if(response.status===401){await invalidateGmailToken(token);throw new Error('Gmail session expired. Click Connect Gmail again.');}
  if(response.status===403)throw new Error('Gmail read permission is missing. Disconnect and Connect Gmail again to grant read access.');
  if(!response.ok)throw new Error(`Gmail read failed (HTTP ${response.status}).`);
  return response.json();
}
async function verifySent(messageId,threadId){
  if(typeof messageId!=='string'||!/^[\w-]+$/.test(messageId))throw new Error('Invalid message ID.');
  const msg=await gmailApiGet('messages/'+messageId+'?format=minimal');
  const inSent=(msg.labelIds||[]).includes('SENT');
  let replies=0;
  const tid=msg.threadId||threadId;
  if(tid&&/^[\w-]+$/.test(tid)){
    try{const thread=await gmailApiGet('threads/'+tid+'?format=minimal');
      replies=(thread.messages||[]).filter(m=>m.id!==messageId&&!(m.labelIds||[]).some(l=>l==='SENT'||l==='DRAFT')).length;}catch{/* replies are best-effort */}
  }
  return {inSent,replies};
}
async function fetchJobEmails(){
  const q='newer_than:21d ('+['from:linkedin.com','from:indeed.com','from:naukri.com','from:wellfound.com','from:instahyre.com','subject:"job alert"','subject:"jobs for you"','subject:"job recommendations"'].join(' OR ')+')';
  const list=await gmailApiGet('messages?maxResults=25&q='+encodeURIComponent(q));
  const ids=(list.messages||[]).map(m=>m.id).slice(0,15);
  const jobs=[]; const seen=new Set();
  for(const id of ids){
    let msg; try{ msg=await gmailApiGet('messages/'+id+'?format=full'); }catch(e){ continue; }
    const acc={html:'',text:''}; collectParts(msg.payload,acc);
    const from=mailHeader(msg.payload,'From'); const date=Number(msg.internalDate)||Date.now();
    const src=/linkedin/i.test(from)?'LinkedIn':/indeed/i.test(from)?'Indeed':/naukri/i.test(from)?'Naukri':/wellfound/i.test(from)?'Wellfound':/instahyre/i.test(from)?'Instahyre':((from.match(/@([^>\s]+)/)||[])[1]||'Email');
    for(const j of parseJobEmailLinks(acc.html)){ const k=j.url.split('?')[0]; if(seen.has(k))continue; seen.add(k); jobs.push({title:j.title,url:j.url,source:src,date}); if(jobs.length>=60)break; }
    if(jobs.length>=60) break;
  }
  return jobs;
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  const page=sender.url?.split('?')[0];
  if(page!==chrome.runtime.getURL('popup.html')&&page!==chrome.runtime.getURL('options.html'))return;
  let action;
  if(message.type==='GMAIL_CONNECT')action=async()=>{const a=await gmailAccount(true);return {email:a.email,picture:a.picture};};
  else if(message.type==='GMAIL_SAVE_CLIENT'&&page===chrome.runtime.getURL('options.html'))action=()=>saveGmailClient(message.clientId);
  else if(message.type==='GMAIL_DISCONNECT')action=async()=>{await clearGmailAuth();return {disconnected:true};};
  else if(message.type==='GMAIL_STATUS')action=async()=>{
    const {gmailLastSend}=await chrome.storage.local.get('gmailLastSend');
    try{const a=await gmailAccount();return {email:a.email,picture:a.picture,lastSend:gmailLastSend};}catch(error){return {email:null,message:error.message,lastSend:gmailLastSend};}
  };
  else if(message.type==='GMAIL_PREPARE'&&page===chrome.runtime.getURL('popup.html'))action=()=>prepareGmail(message.draft);
  else if(message.type==='GMAIL_SEND'&&page===chrome.runtime.getURL('popup.html'))action=()=>sendGmail(message.reviewId);
  else if(message.type==='GMAIL_VERIFY_SENT'&&page===chrome.runtime.getURL('popup.html'))action=()=>verifySent(message.messageId,message.threadId);
  else if(message.type==='FETCH_JOB_EMAILS'&&page===chrome.runtime.getURL('popup.html'))action=()=>fetchJobEmails();
  else return;
  action().then(result=>reply({ok:true,result})).catch(error=>reply({ok:false,error:error.message}));return true;
});
