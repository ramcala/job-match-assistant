(() => {
 const $=id=>document.getElementById(id);let reviewId=null;
 async function request(type,extra={}) {
  const response=await chrome.runtime.sendMessage({type,...extra});
  if(!response?.ok)throw new Error(response?.error||'No response from Gmail connection.');return response.result;
 }
 async function status() {
  try {
   const info=await request('GMAIL_STATUS');
   const connected=!!info.email;
   $('gmailAccountStatus').textContent=connected?`Connected: ${info.email}`:`Not connected. ${info.message||'Connect Gmail in Settings.'}`;
   if($('gmailSettings'))$('gmailSettings').hidden=connected; // show Connect button only when not connected
   if($('gmailCompose'))$('gmailCompose').hidden=!connected; // API send controls need a connection
   if($('gmailSendStatus')&&info.lastSend) {
    const last=info.lastSend;
    $('gmailSendStatus').textContent=`Last send: ${last.status}${last.to?` to ${last.to}`:''}. ${last.message||''}${last.status==='sending'?'If this status persists, check Gmail Sent before retrying.':''}${last.messageId?` Gmail message ID: ${last.messageId}`:''}`;
   }
  }catch(error){$('gmailAccountStatus').textContent=error.message;if($('gmailSettings'))$('gmailSettings').hidden=false;if($('gmailCompose'))$('gmailCompose').hidden=true;}
 }
 if($('gmailExtensionId'))$('gmailExtensionId').textContent=chrome.runtime.id;
 if($('gmailClientId')) {
  $('gmailRedirectUri').textContent=chrome.identity.getRedirectURL('gmail');
  chrome.storage.local.get('gmailClientId').then(data=>{$('gmailClientId').value=data.gmailClientId||'';});
  $('gmailCopyRedirect').addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(chrome.identity.getRedirectURL('gmail'));$('gmailClientStatus').textContent='Redirect URI copied.';}catch{$('gmailClientStatus').textContent='Select and copy the redirect URI above.';}
  });
  $('gmailSaveClient').addEventListener('click',async()=>{
   $('gmailSaveClient').disabled=true;
   try{await request('GMAIL_SAVE_CLIENT',{clientId:$('gmailClientId').value});$('gmailClientStatus').textContent='Client ID saved. Click Connect Gmail.';await status();}
   catch(error){$('gmailClientStatus').textContent=error.message;}finally{$('gmailSaveClient').disabled=false;}
  });
 }
 if($('gmailConnect'))$('gmailConnect').addEventListener('click',async()=>{
  $('gmailConnect').disabled=true;$('gmailAccountStatus').textContent='Connecting to Google…';
  try{const info=await request('GMAIL_CONNECT');$('gmailAccountStatus').textContent=`Connected: ${info.email}`;}
  catch(error){$('gmailAccountStatus').textContent=error.message;}finally{$('gmailConnect').disabled=false;}
 });
 if($('gmailDisconnect'))$('gmailDisconnect').addEventListener('click',async()=>{
  try{await request('GMAIL_DISCONNECT');$('gmailAccountStatus').textContent='Disconnected locally.';}catch(error){$('gmailAccountStatus').textContent=error.message;}
 });
 if($('gmailRefreshStatus'))$('gmailRefreshStatus').addEventListener('click',async()=>{
  $('gmailRefreshStatus').disabled=true;$('gmailAccountStatus').textContent='Checking…';
  try{await status();}finally{$('gmailRefreshStatus').disabled=false;}
 });
 if($('gmailSettings'))$('gmailSettings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
 if($('gmailCompose')) {
  $('gmailCompose').addEventListener('click',()=>{
   reviewId=null;$('gmailEditor').hidden=false;$('gmailReviewPanel').hidden=true;
   $('gmailSubject').value=`Application – ${currentJob?.title||'Open Role'} – ${candidateName}`.slice(0,150);
   $('gmailBody').value=$('letter').value+(currentJob?.url?`\n\nJob link: ${currentJob.url}`:'');
   $('gmailSendStatus').textContent='Verify the recipient above, then review your email.';
  });
  $('gmailReview').addEventListener('click',async()=>{
   $('gmailReview').disabled=true;
   try {
    const preview=await request('GMAIL_PREPARE',{draft:{to:$('email').value,cc:$('emailCc')?$('emailCc').value:'',subject:$('gmailSubject').value,body:$('gmailBody').value,attachResume:$('gmailAttach').checked}});
    reviewId=preview.id;
    $('gmailPreview').textContent=`From: ${preview.from}\nTo: ${preview.to}${preview.cc&&preview.cc.length?`\nCc: ${preview.cc.join(', ')}`:''}\nSubject: ${preview.subject}\nAttachment: ${preview.attachment?`${preview.attachment.name} (${Math.ceil(preview.attachment.size/1024)} KB)`:'None'}\n\n${preview.body}`;
    $('gmailEditor').hidden=true;$('gmailReviewPanel').hidden=false;$('gmailConfirm').disabled=false;
    $('gmailSendStatus').textContent='Only the exact message shown above will be sent.';
   }catch(error){$('gmailSendStatus').textContent=error.message;}finally{$('gmailReview').disabled=false;}
  });
  $('gmailEdit').addEventListener('click',()=>{reviewId=null;$('gmailReviewPanel').hidden=true;$('gmailEditor').hidden=false;});
  $('gmailConfirm').addEventListener('click',async()=>{
   if(!reviewId)return;
   $('gmailConfirm').disabled=true;$('gmailEdit').disabled=true;$('gmailCompose').disabled=true;
   $('gmailSendStatus').textContent='Sending… Do not send a second copy.';
   try{const sent=await request('GMAIL_SEND',{reviewId});reviewId=null;$('gmailReviewPanel').hidden=true;$('gmailSendStatus').textContent=`Sent successfully. Gmail message ID: ${sent.messageId}`;if(globalThis.__recordApplied)globalThis.__recordApplied('gmail-send');}
   catch(error){reviewId=null;$('gmailSendStatus').textContent=error.message;}
   finally{$('gmailEdit').disabled=false;$('gmailCompose').disabled=false;}
  });
 }
 globalThis.__refreshGmailStatus=status; // let the popup re-check after an analysis completes
 status();
})();
