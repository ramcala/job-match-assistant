const defaultProfile = `Alex Carter — Software Engineer. 5+ years building web and backend applications. Skills: JavaScript, TypeScript, Python, React, Node.js, SQL, REST APIs, Git, Docker, AWS, CI/CD, testing and agile delivery. This is placeholder text — replace it with your own résumé in Settings.`;
const el = id => document.getElementById(id);
function currentModel() {
  const value=el('model').value==='__custom__'?el('customModel').value.trim():el('model').value;
  if(!value || /\s/.test(value)) throw new Error('Enter a model ID without spaces.');
  return value;
}
function fillModels(ids, selected) {
  el('model').replaceChildren();
  for(const id of [...new Set([selected,...ids].filter(Boolean))]) {
    const option=document.createElement('option');option.value=id;option.textContent=id;el('model').append(option);
  }
  const custom=document.createElement('option');custom.value='__custom__';custom.textContent='Enter a custom model ID…';el('model').append(custom);
  el('model').value=selected;el('customModelRow').hidden=true;
}
el('model').addEventListener('change',()=>{el('customModelRow').hidden=el('model').value!=='__custom__';});
el('loadModels').addEventListener('click',async()=>{
  el('loadModels').disabled=true;el('modelStatus').textContent='Loading models…';
  try {
    const apiKey=el('apiKey').value.trim();if(!apiKey)throw new Error('Enter your API key first.');
    const selected=currentModel();
    const response=await chrome.runtime.sendMessage({type:'LIST_MODELS',apiKey});
    if(!response?.ok)throw new Error(response?.error||'Unable to load models.');
    fillModels(response.models,selected);
    el('modelStatus').textContent=`Loaded ${response.models.length} model IDs. Your selection is unchanged until you choose and save a model.`;
  }catch(error){el('modelStatus').textContent=error.message;}
  finally{el('loadModels').disabled=false;}
});
chrome.storage.local.get(['apiKey','model','resume','resumeText','autoBackup','jobKeywords','jobLocation','emailFinderKey','emailFinderProvider','apolloKey','rocketreachKey','eaPhone','eaEmail','eaExperienceYears','eaNotice','eaCurrentCTC','eaExpectedCTC','eaLocation','eaWorkAuth','eaAutoSubmit']).then(s => {
  el('apiKey').value=s.apiKey||'';
  fillModels(['gpt-5-mini'],s.model||'gpt-5-mini'); el('resumeText').value=s.resumeText||'';
  el('resumeStatus').textContent=s.resume ? `Saved: ${s.resume.name}` : 'No resume saved.';
  el('autoBackup').checked = s.autoBackup !== false;
  el('jobKeywords').value = s.jobKeywords || '';
  el('jobLocation').value = s.jobLocation || '';
  el('emailFinderKey').value = s.emailFinderKey || '';
  if (el('emailFinderProvider')) el('emailFinderProvider').value = s.emailFinderProvider || 'hunter';
  if (el('apolloKey')) el('apolloKey').value = s.apolloKey || '';
  if (el('rocketreachKey')) el('rocketreachKey').value = s.rocketreachKey || '';
  for(const k of ['eaPhone','eaEmail','eaExperienceYears','eaNotice','eaCurrentCTC','eaExpectedCTC','eaLocation','eaWorkAuth','eaAutoSubmit']){ const e=el(k); if(!e) continue; if(e.type==='checkbox') e.checked=!!s[k]; else e.value=s[k]||''; }
});
el('save').addEventListener('click', async () => {
 try {
  const ea={}; for(const k of ['eaPhone','eaEmail','eaExperienceYears','eaNotice','eaCurrentCTC','eaExpectedCTC','eaLocation','eaWorkAuth','eaAutoSubmit']){ const e=el(k); if(!e) continue; ea[k]= e.type==='checkbox'? e.checked : e.value.trim(); }
  await chrome.storage.local.set({apiKey:el('apiKey').value.trim(),model:currentModel(),resumeText:el('resumeText').value.trim(),autoBackup:el('autoBackup').checked,jobKeywords:el('jobKeywords').value.trim(),jobLocation:el('jobLocation').value.trim(),emailFinderKey:el('emailFinderKey').value.trim(),emailFinderProvider:(el('emailFinderProvider')?el('emailFinderProvider').value:'hunter'),apolloKey:(el('apolloKey')?el('apolloKey').value.trim():''),rocketreachKey:(el('rocketreachKey')?el('rocketreachKey').value.trim():''),...ea});
  el('saved').textContent='Saved';
  try { if (window.JMFolderSync) await window.JMFolderSync.saveAll(false); } catch(e) {}
 } catch (error) { el('saved').textContent=error.message; }
});
el('resumeFile').addEventListener('change', async () => {
 const file=el('resumeFile').files[0]; if (!file) return;
 el('save').disabled=true;
 try {
  if (!/\.(pdf|docx|txt)$/i.test(file.name)) throw new Error('Choose PDF, DOCX or TXT.');
  if (!file.size || file.size>3*1024*1024) throw new Error('Choose a non-empty file under 3 MB.');
  const data=await new Promise((resolve,reject)=>{
   const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error('Could not read file')); reader.readAsDataURL(file);
  });
  const text=/\.txt$/i.test(file.name) ? (await file.text()).slice(0,60000) : '';
  await chrome.storage.local.set({resume:{name:file.name,size:file.size,data},resumeText:text});
  el('resumeText').value=text;
  el('resumeStatus').textContent=`Saved: ${file.name}. ${text ? 'Text imported.' : 'Paste resume text below and Save settings to enable matching.'}`;
 } catch(error) { el('resumeStatus').textContent=`Not saved: ${error.message}`; }
 finally { el('save').disabled=false; el('resumeFile').value=''; }
});


el('extractResume').addEventListener('click', async () => {
 el('extractResume').disabled=true; el('extractStatus').textContent='Reading résumé…';
 try {
  let buf, name;
  const f=el('resumeFile').files[0];
  if(f){ buf=await f.arrayBuffer(); name=f.name; }
  else {
   const {resume}=await chrome.storage.local.get('resume');
   if(!resume) throw new Error('Upload a résumé file first, then click Generate.');
   const m=resume.data && resume.data.match(/^data:[^,]*;base64,(.+)$/);
   if(!m) throw new Error('Saved résumé is not readable. Re-upload the file.');
   const bin=atob(m[1]); const u8=new Uint8Array(bin.length);
   for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
   buf=u8.buffer; name=resume.name;
  }
  let text=await extractResumeText(buf,name);
  if(!text || text.replace(/\s/g,'').length<40) throw new Error('Could not extract enough text — this may be a scanned/image PDF. Paste the text manually below.');
  const bad=(text.match(/[\x00-\x08\x0e-\x1f\ufffd\ue000-\uf8ff]/g)||[]).length;
  if(bad/text.length>0.08) throw new Error('The extracted text looks unreadable (unusual embedded fonts). Save your résumé as DOCX or TXT and try again, or paste the text below.');
  el('extractStatus').textContent='Extracted. Polishing with AI… keep this page open (a browser session can take up to ~2 minutes).';
  try {
   const cfg=await chrome.storage.local.get(['analysisMode','apiKey','model']);
   const mode=cfg.analysisMode||(cfg.apiKey?'openai':'local');
   let resp=null;
   if(mode==='openai' && cfg.apiKey) resp=await chrome.runtime.sendMessage({type:'OPENAI_CLEAN',apiKey:cfg.apiKey,model:cfg.model,text});
   else if(mode==='chatgpt-browser'||mode==='gemini-browser') resp=await chrome.runtime.sendMessage({type:'BROWSER_CLEAN',provider:mode==='chatgpt-browser'?'chatgpt':'gemini',text});
   if(resp && resp.ok && resp.result && String(resp.result).replace(/\s/g,'').length>40){ text=String(resp.result); el('extractStatus').textContent='Extracted and polished with AI, then saved. Review below.'; }
   else if(resp && !resp.ok){ el('extractStatus').textContent='Extracted and saved. AI polish failed ('+resp.error+') — raw text kept; you can edit it.'; }
   else { el('extractStatus').textContent='Extracted and saved. To auto-polish the wording, pick ChatGPT/Gemini (browser session) or OpenAI in the popup\'s "Analyze with" dropdown, then Generate again.'; }
  } catch(e){ el('extractStatus').textContent='Extracted and saved. AI polish unavailable ('+e.message+') — raw text kept.'; }
  el('resumeText').value=text.slice(0,60000);
  await chrome.storage.local.set({resumeText:el('resumeText').value});
  try { if(typeof runAts==='function') runAts(); } catch(e){}
 } catch(error){ el('extractStatus').textContent=error.message; }
 finally { el('extractResume').disabled=false; }
});

const _eaClear = el('eaClearLearned');
if (_eaClear) _eaClear.addEventListener('click', async () => {
  try { await chrome.storage.local.remove('eaLearned'); if (el('eaClearStatus')) el('eaClearStatus').textContent = 'Cleared.'; }
  catch (error) { if (el('eaClearStatus')) el('eaClearStatus').textContent = error.message; }
});

// ---- Portable folder sync ----
(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const S = document.getElementById('fsStatus');
  const say = (m) => { if (S) S.textContent = m; };
  async function refreshName(){ try { const n = await window.JMFolderSync.linkedName(); if (n) say('Linked folder: ' + n); } catch(e){} }
  if (window.JMFolderSync && !window.JMFolderSync.supported()) say('Your browser can\'t link a folder — use Chrome or Edge on desktop. (Settings still save normally.)');
  else refreshName();
  const link = document.getElementById('fsLink');
  if (link) link.addEventListener('click', async () => { try { const n = await window.JMFolderSync.linkFolder(); say('Linked folder: ' + n + '. Now click Save to folder.'); } catch(e){ say(e.message || 'Could not link folder.'); } });
  const save = document.getElementById('fsSave');
  if (save) save.addEventListener('click', async () => { say('Saving…'); try { const ok = await window.JMFolderSync.saveAll(true); say(ok ? 'Saved to folder.' : 'Link a folder first.'); } catch(e){ say(e.message || 'Save failed.'); } });
  const load = document.getElementById('fsLoad');
  if (load) load.addEventListener('click', async () => { if(!confirm('Load data from the folder? This overwrites the data on THIS laptop with the folder copy.')) return; say('Loading…'); try { const n = await window.JMFolderSync.loadAll(true); say('Loaded ' + n + ' items from folder. Reloading…'); setTimeout(() => location.reload(), 800); } catch(e){ say(e.message || 'Load failed.'); } });
})();

// ---- ATS score ----
function renderAts(r){
  const box=el('atsResult'); if(!box) return;
  const esc=s=>String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  const list=(t,a)=>a&&a.length?`<p style="margin:8px 0 2px"><strong>${t}</strong></p><ul style="margin:0 0 6px 18px">${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  const col=r.score>=80?'#196b45':r.score>=60?'#9a7d00':'#9d3025';
  box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;margin:8px 0"><div style="font:800 28px system-ui;color:${col}">${r.score}<span style="font-size:15px">/100</span></div><div>${esc(r.summary||'')}</div></div>`
    +list('Missing keywords',r.missingKeywords)+list('Strengths',r.strengths)+list('Improvements',r.improvements);
  box.hidden=false;
}
async function runAts(){
  const text=(el('resumeText')?el('resumeText').value:'').trim();
  if(text.length<40){ el('atsStatus').textContent='Add your résumé text first.'; return; }
  const cfg=await chrome.storage.local.get(['analysisMode','apiKey','model']);
  const mode=cfg.analysisMode||(cfg.apiKey?'openai':'local');
  let payload;
  if(mode==='openai'){ if(!cfg.apiKey){ el('atsStatus').textContent='Add an OpenAI key, or pick ChatGPT/Gemini in the popup, or use a site below.'; return; } payload={provider:'openai',apiKey:cfg.apiKey,model:cfg.model,text}; }
  else if(mode==='chatgpt-browser'||mode==='gemini-browser'){ payload={provider:mode==='chatgpt-browser'?'chatgpt':'gemini',text}; }
  else { el('atsStatus').textContent='Local mode can\'t score ATS. Pick OpenAI or ChatGPT/Gemini in the popup, or use a site below.'; return; }
  if(el('atsCheck')) el('atsCheck').disabled=true;
  el('atsStatus').textContent='Scoring your résumé… keep this page open (a browser session can take up to ~2 minutes).';
  try{
    const resp=await chrome.runtime.sendMessage({type:'ATS_SCORE',...payload});
    if(!resp||!resp.ok) throw new Error(resp&&resp.error||'ATS check failed.');
    renderAts(resp.result); el('atsStatus').textContent='ATS score ready.';
    try{ await chrome.storage.local.set({atsScore:{...resp.result,ts:Date.now()}}); }catch(e){}
  }catch(e){ el('atsStatus').textContent=e.message; }
  finally{ if(el('atsCheck')) el('atsCheck').disabled=false; }
}
if(el('atsCheck')) el('atsCheck').addEventListener('click', runAts);
if (typeof document !== 'undefined' && document.querySelectorAll) document.querySelectorAll('.ats-site').forEach(b=>b.addEventListener('click',()=>{ const u=b.dataset.url; if(u) chrome.tabs.create({url:u}); }));
