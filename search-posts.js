// Decorate loaded posts only. No fetching or auto-scrolling.
(() => {
  if (globalThis.__jobMatchPosts?.refresh) { globalThis.__jobMatchPosts.refresh(); return; }
  const cards = '[role="listitem"][componentkey^="update-card-focus"], .feed-shared-update-v2, .update-components-update-v2, [data-urn^="urn:li:activity:"], [data-urn^="urn:li:share:"], [data-id^="urn:li:activity:"], .search-results__list > li, .reusable-search__result-container, [role="article"], article';
  const texts = '.update-components-text, .feed-shared-update-v2__description, .feed-shared-text, .break-words, [data-testid="expandable-text-box"]';
  const links = 'a[href*="/feed/update/"], a[href*="/posts/"]';
  let scheduled, badge, label, selection = '';
  const supported = () => /^\/(feed|search\/results\/content|posts|in\/[^/]+\/recent-activity)/.test(location.pathname);
  const read = node => (node?.innerText || node?.textContent || '').trim();
  const own = node => node?.nodeType === 1 && !!node.closest('[data-job-match-ui]');
  let appliedUrls = new Set(), appliedFetchedAt = 0;
  const normUrl = u => { try { const x = new URL(u); return (x.origin + x.pathname).replace(/\/+$/, ''); } catch { return (u || '').split(/[?#]/)[0].replace(/\/+$/, ''); } };
  const cardUrl = card => { const link = card.querySelector(links), urn = card.getAttribute('data-urn') || card.getAttribute('data-id'); return link?.href || (/^urn:li:(activity|share):\d+$/.test(urn || '') ? `https://www.linkedin.com/feed/update/${urn}/` : ''); };
  async function refreshApplied() {
    // Content scripts can't read the protected local store, so ask the background for just the URLs.
    if (Date.now() - appliedFetchedAt < 15000) return;
    appliedFetchedAt = Date.now();
    try { const r = await chrome.runtime.sendMessage({ type: 'APPLIED_URLS' }); if (r?.ok) appliedUrls = new Set((r.urls || []).map(normUrl)); } catch { /* extension offline/updated */ }
  }
  function markApplied(card, span) {
    const applied = appliedUrls.has(normUrl(cardUrl(card)));
    span.textContent = applied ? '✓ Applied' : '';
    span.style.display = applied ? 'inline-block' : 'none';
  }
  function button(text) {
    const el=document.createElement('button');el.type='button';el.textContent=text;
    el.style.cssText='background:#196b45;color:white;border:0;border-radius:8px;padding:9px 12px;margin:4px;font:600 13px system-ui;cursor:pointer';return el;
  }
  function host() {
    const el=document.createElement('div');el.setAttribute('data-job-match-ui','');
    el.style.setProperty('display','block','important');
    return {el,root:el.attachShadow({mode:'open'})};
  }
  async function open(description,url,meta) {
    if(description.length<30) throw new Error('Select or expand at least 30 characters of the post first.');
    if(!chrome.runtime?.id) throw new Error('Extension updated. Refresh this LinkedIn tab.');
    const m=meta||{};
    const result=await chrome.runtime.sendMessage({type:'OPEN_POST',job:{title:m.title||'',company:m.company||'',location:m.location||'',description:description.slice(0,30000),url,source:m.source||'LinkedIn post'}});
    if(!result?.ok) throw new Error(result?.error||'Unable to open analysis window.');
  }
  function makeBadge() {
    if(badge?.isConnected) return;
    const {el,root}=host();badge=el;el.id='job-match-status';
    el.style.cssText='position:fixed!important;bottom:16px!important;right:16px!important;z-index:2147483647!important;display:block!important;max-width:340px!important';
    const box=document.createElement('div');box.style.cssText='background:white;color:#15211b;border:2px solid #196b45;border-radius:12px;padding:12px;box-shadow:0 4px 20px #0003;font:13px/1.5 system-ui';
    label=document.createElement('div');const status=document.createElement('div');status.setAttribute('role','status');
    const retry=button('Rescan posts'), selected=button('Analyze selected text');
    selected.addEventListener('mousedown',event=>event.preventDefault());
    retry.addEventListener('click',event=>{if(event.isTrusted) refresh();});
    selected.addEventListener('click',async event=>{
      if(!event.isTrusted)return;status.textContent='';selected.disabled=true;
      try{await open(selection,location.href);}catch(error){status.textContent=error.message;}finally{selected.disabled=false;}
    });
    const hint=document.createElement('div');hint.textContent='No post button? Highlight the job text, then click Analyze selected text.';
    box.append(label,retry,selected,hint,status);root.append(box);document.documentElement.append(el);
  }
  function findCards() {
    const result=new Set();
    for(const text of document.querySelectorAll(texts)) {
      if(own(text))continue;
      const card=text.closest(cards);
      if(card && read(text).length>=30)result.add(card);
    }
    for(const card of document.querySelectorAll(cards)) {
      if(own(card)||card.querySelector(texts))continue;
      if(card.querySelector(links)&&read(card).length>=30)result.add(card);
    }
    return [...result].filter(card=>![...result].some(other=>other!==card&&other.contains(card)));
  }
  function capture(card) {
    const matches=[...card.querySelectorAll(texts)].filter(node=>!own(node));
    const outer=matches.filter(node=>!matches.some(other=>other!==node&&other.contains(node)));
    const raw=outer.length?outer.map(read).join('\n\n'):read(card);
    const moreLabel=/^(?:(?:\.{3}|…)\s*)?(?:see\s+)?more$/i;
    const controls=[...card.querySelectorAll('button, [role="button"]')].filter(node=>!own(node));
    const collapsed=controls.some(node=>node.getClientRects?.().length && moreLabel.test(read(node))) || /(?:\.{3}|…)\s*(?:see\s+)?more\s*$/i.test(raw);
    const description=raw.replace(/(?:\.{3}|…)\s*(?:see\s+)?more\s*$/i,'').trim();
    const link=card.querySelector(links), urn=card.getAttribute('data-urn')||card.getAttribute('data-id');
    const url=link?.href||(/^urn:li:(activity|share):\d+$/.test(urn||'')?`https://www.linkedin.com/feed/update/${urn}/`:location.href);
    return {description,url,collapsed};
  }
  const isJobPage = () => /^\/jobs(\/|$)/.test(location.pathname);
  async function expandJob() {
    const sels = ['button.jobs-description__footer-button','button.show-more-less-html__button--more','button[aria-label*="see more" i]','button[aria-label*="show more" i]'];
    let clicked = false;
    for (const s of sels) for (const b of document.querySelectorAll(s)) {
      if (b.offsetParent && /\bmore\b/i.test((b.textContent || '') + ' ' + (b.getAttribute('aria-label') || ''))) { try { b.click(); clicked = true; } catch (e) {} }
    }
    if (clicked) await new Promise(r => setTimeout(r, 400));
  }
  function hiringPeople() {
    const headingRe = /meet the hiring team|people you can reach out to|who can help you get an interview|hiring team/i;
    const containers = [...document.querySelectorAll('section, .artdeco-card, [class*="hiring" i], [class*="hirer" i], [class*="people" i]')]
      .filter(s => !own(s) && headingRe.test((s.querySelector('h2,h3,header,[role="heading"]') || {}).textContent || s.getAttribute('aria-label') || ''));
    const scopes = containers.length ? containers : [document.querySelector('.jobs-poster, .hirer-card__container, .jobs-company__hiring-team') ].filter(Boolean);
    const search = scopes.length ? scopes : [document.querySelector('.jobs-details, #job-details, main') || document.body];
    const people = []; const seen = new Set();
    for (const sc of search) {
      for (const a of sc.querySelectorAll('a[href*="/in/"]')) {
        if (own(a)) continue;
        const name = read(a).split(/\n|·/)[0].replace(/\s+/g, ' ').trim();
        const url = a.href.split('?')[0];
        if (!name || name.length < 2 || name.length > 80 || /view|see |profile$/i.test(name)) continue;
        if (seen.has(url)) continue; seen.add(url);
        people.push({ name, url });
        if (people.length >= 4) break;
      }
      if (people.length) break;
    }
    return people;
  }
  function jobText() {
    const sels = ['#job-details','.jobs-description-content__text','.jobs-description__container','.jobs-box__html-content','[class*="jobs-description" i]','main'];
    let best = '';
    for (const s of sels) { const t = read(document.querySelector(s)); if (t.length > best.length) best = t; if (best.length > 400) break; }
    best = (best || read(document.querySelector('main') || document.body)).replace(/(?:…|\.{3})?\s*(?:see|show)\s+more\s*$/i, '').trim();
    const people = hiringPeople();
    if (people.length) {
      best += `\n\nHiring contact (LinkedIn): ${people[0].name} — ${people[0].url}`;
      if (people.length > 1) best += `\n\nPeople you can reach out to:\n` + people.map(p => `- ${p.name} — ${p.url}`).join('\n');
    }
    const compSel = ['.jobs-company__company-description', '.jobs-company-information__description', '.jobs-company__box', '.jobs-company', '[class*="jobs-company" i]'];
    let about = '';
    for (const s of compSel) { const t = read(document.querySelector(s)); if (t.length > about.length) about = t; if (about.length > 300) break; }
    about = about.replace(/(?:…|\.{3})?\s*(?:see|show)\s+more\s*$/i, '').trim();
    if (about.length > 60) best += `\n\nAbout the company:\n${about.slice(0, 2500)}`;
    return best;
  }
  function jobMeta() {
    const scope = document.querySelector('.job-details-jobs-unified-top-card__container--two-pane, .jobs-unified-top-card, .jobs-details__main-content') || document;
    const title = read(scope.querySelector('.job-details-jobs-unified-top-card__job-title, h1, [class*="job-title" i]'));
    let company = read(scope.querySelector('.job-details-jobs-unified-top-card__company-name, [class*="company-name" i], a[href*="/company/"]'));
    company = company.split('\n')[0].split('\u00b7')[0].trim();
    return { title: title.slice(0, 200), company: company.slice(0, 120), source: 'LinkedIn job' };
  }
  function injectJobTop() {
    if (document.querySelector('[data-job-match-top]')) return;
    const scopes = document.querySelectorAll('.jobs-unified-top-card, .job-details-jobs-unified-top-card__container--two-pane, .jobs-details__main-content, main');
    let apply = null, save = null, scope = null;
    for (const c of scopes) {
      const btns = [...c.querySelectorAll('a, button')].filter(b => b.offsetParent && !own(b));
      apply = apply || btns.find(b => /jobs-apply-button/.test(b.className || '') || /^apply(\s|$)/i.test(((b.getAttribute('aria-label') || '') + ' ' + read(b)).trim()));
      save  = save  || btns.find(b => /jobs-save-button/.test(b.className || '') || /^save(\s|$)/i.test(((b.getAttribute('aria-label') || '') + ' ' + read(b)).trim()));
      if (apply || save) { scope = c; break; }
    }
    const refBtn = save || apply;
    if (!refBtn) return;
    const h = refBtn.offsetHeight || 40;
    const { el, root } = host(); el.setAttribute('data-job-match-top', '');
    el.style.setProperty('display', 'inline-flex', 'important'); el.style.setProperty('align-items', 'center', 'important');
    el.style.setProperty('vertical-align', 'middle', 'important'); el.style.setProperty('flex', '0 0 auto', 'important'); el.style.setProperty('margin', '0 0 0 8px', 'important');
    const analyze = button('⚡ Analyze');
    analyze.style.cssText = `background:#196b45;color:#fff;border:0;border-radius:${Math.round(h / 2)}px;height:${h}px;padding:0 16px;margin:0;font:600 14px system-ui;cursor:pointer;white-space:nowrap`;
    const status = document.createElement('span'); status.style.cssText = 'font:12px system-ui;color:#9d3025;margin-left:8px';
    analyze.addEventListener('click', async e => {
      if (!e.isTrusted) return; analyze.disabled = true; status.textContent = '';
      try { await expandJob(); await open(jobText(), location.href, jobMeta()); } catch (err) { status.textContent = err.message; } finally { analyze.disabled = false; }
    });
    root.append(analyze, status);
    // Each LinkedIn action button is wrapped in its own div; find the real flex ROW that holds
    // the buttons, then insert our element as a direct child right after Save's wrapper so it sits
    // inline in the row instead of stacking inside a wrapper.
    let row = refBtn.parentElement;
    for (let n = refBtn.parentElement; n && n !== scope && n !== document.body; n = n.parentElement) {
      let disp = ''; try { disp = getComputedStyle(n).display; } catch (e) {}
      if ((disp === 'flex' || disp === 'inline-flex') && (!apply || n.contains(apply))) { row = n; break; }
    }
    let childOfRow = refBtn;
    while (childOfRow.parentElement && childOfRow.parentElement !== row) childOfRow = childOfRow.parentElement;
    try { row.insertBefore(el, childOfRow.nextSibling); } catch { (refBtn.parentElement || scope).appendChild(el); }
  }
  async function refresh() {
    if(isJobPage()) injectJobTop();
    if(!supported()) {badge?.remove();document.querySelectorAll('[data-job-match-button]').forEach(el=>el.remove());return;}
    await refreshApplied();
    makeBadge();const found=findCards();
    for(const card of found) {
      if(card.querySelector('[data-job-match-button]'))continue;
      const {el,root}=host();el.setAttribute('data-job-match-button','');
      const analyze=button('Analyze'),status=document.createElement('span');status.style.cssText='font:12px system-ui;color:#9d3025';
      const applied=document.createElement('span');applied.setAttribute('data-applied','');applied.style.cssText='font:600 12px system-ui;color:#196b45;margin-left:6px;display:none';
      root.append(analyze,applied,status);card.prepend(el);
      analyze.addEventListener('click',async event=>{
        if(!event.isTrusted)return;event.preventDefault();event.stopPropagation();analyze.disabled=true;status.textContent='';
        try{
          const post=capture(card);
          if(post.collapsed)throw new Error('This post appears collapsed. Click “…more” on LinkedIn, then Analyze again to include the full description.');
          await open(post.description,post.url);
        }catch(error){status.textContent=error.message;}finally{analyze.disabled=false;}
      });
    }
    for(const card of found){const span=card.querySelector('[data-job-match-button]')?.shadowRoot?.querySelector('[data-applied]');if(span)markApplied(card,span);}
    const version=(chrome.runtime?.getManifest?.().version)||'';
    const message=`Job Match${version?` ${version}`:''} · ${found.length} post${found.length===1?'':'s'} detected`;
    if(label.textContent!==message)label.textContent=message;
  }
  function queue() {
    // Do not postpone indefinitely when a feed mutates continuously.
    if(scheduled)return;scheduled=setTimeout(()=>{scheduled=null;refresh();},250);
  }
  document.addEventListener('selectionchange',()=>{const value=window.getSelection()?.toString().trim();if(value)selection=value.slice(0,30000);});
  new MutationObserver(records=>{if(records.some(record=>!own(record.target)))queue();}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',queue);
  let previous=location.href;
  setInterval(()=>{if(location.href!==previous){previous=location.href;queue();}},1000);
  globalThis.__jobMatchPosts={refresh};refresh();
})();
