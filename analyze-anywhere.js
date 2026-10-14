// Generic "Analyze with Job Match" injector for non-LinkedIn job/opportunity sites.
// Site-agnostic: detects likely job cards by heuristics and always offers a floating
// "Analyze this page" fallback. LinkedIn is handled by search-posts.js, so skip it here.
(() => {
  if (location.hostname.includes('linkedin.com') && !/^\/jobs(\/|$)/.test(location.pathname)) return;
  if (globalThis.__jobMatchAnywhere?.refresh) { globalThis.__jobMatchAnywhere.refresh(); return; }

  const CARD_SEL = 'article, li, [role="article"], [class*="job" i], [class*="listing" i], [class*="card" i], [class*="opening" i], [data-testid*="job" i], [data-test*="job" i]';
  const JOBWORDS = /\b(apply|job|role|position|opening|hiring|full[- ]?time|part[- ]?time|contract|internship|remote|hybrid|on[- ]?site|salary|stipend|experience|responsibilit|requirement|qualificat|engineer|developer|manager|designer|analyst|architect|scientist|lead|consultant)\b/i;
  const HEADING = 'h1,h2,h3,h4,[role="heading"],a[href]';

  let scheduled, badge, label, floatBtn, appliedUrls = new Set(), appliedAt = 0;
  const read = n => (n?.innerText || n?.textContent || '').replace(/\s+/g, ' ').trim();
  async function expandLinkedIn() {
    if (!location.hostname.includes('linkedin.com')) return;
    const sels = ['button.jobs-description__footer-button', 'button.show-more-less-html__button--more', '[data-tracking-control-name*="show-more" i]', 'button[aria-label*="see more" i]', 'button[aria-label*="show more" i]'];
    let clicked = false;
    for (const s of sels) for (const b of document.querySelectorAll(s)) {
      const lbl = (b.textContent || '') + ' ' + (b.getAttribute('aria-label') || '');
      if (b.offsetParent && /\bmore\b/i.test(lbl)) { try { b.click(); clicked = true; } catch (e) {} }
    }
    if (clicked) await new Promise(r => setTimeout(r, 400));
  }
  function linkedinContact() {
    if (!location.hostname.includes('linkedin.com')) return '';
    const region = document.querySelector('.jobs-details, #job-details, .jobs-search__job-details, main') || document.body;
    const a = [...region.querySelectorAll('a[href*="/in/"]')].find(x => read(x).length > 1 && !own(x));
    if (!a) return '';
    const name = read(a).split(/\n|\u00b7/)[0].slice(0, 80);
    const url = a.href.split('?')[0];
    return name ? `\n\nHiring contact (LinkedIn): ${name} \u2014 ${url}` : `\n\nHiring contact (LinkedIn): ${url}`;
  }
  function pageText() {
    const sels = ['#job-details', '.jobs-description-content__text', '.jobs-description__container', '.jobs-search__job-details', '[class*="job-details" i]', '[class*="jobDescription" i]', '[data-testid*="jobDescription" i]', 'main', 'article', '[role="main"]'];
    let best = '';
    for (const s of sels) { const t = read(document.querySelector(s)); if (t.length > best.length) best = t; if (best.length > 400) break; }
    best = (best || read(document.body)).replace(/(?:\u2026|\.{3})?\s*(?:see|show)\s+more\s*$/i, '').trim();
    return best + linkedinContact();
  }
  const own = n => n?.nodeType === 1 && !!n.closest('[data-jm-ui]');
  const normUrl = u => { try { const x = new URL(u, location.href); return (x.origin + x.pathname).replace(/\/+$/, ''); } catch { return (u || '').split(/[?#]/)[0].replace(/\/+$/, ''); } };

  function button(text) {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = text;
    el.style.cssText = 'background:#196b45;color:#fff;border:0;border-radius:8px;padding:8px 12px;margin:4px;font:600 13px system-ui;cursor:pointer';
    return el;
  }
  function host() {
    const el = document.createElement('div'); el.setAttribute('data-jm-ui', '');
    el.style.setProperty('display', 'block', 'important');
    return { el, root: el.attachShadow({ mode: 'open' }) };
  }
  async function refreshApplied() {
    if (Date.now() - appliedAt < 15000) return;
    appliedAt = Date.now();
    try { const r = await chrome.runtime.sendMessage({ type: 'APPLIED_URLS' }); if (r?.ok) appliedUrls = new Set((r.urls || []).map(normUrl)); } catch {}
  }
  function maybeFillForm() { try { if (globalThis.__jmHasForm && globalThis.__jmHasForm()) globalThis.__jmFillForm(); } catch (e) {} }
  async function open(description, url) {
    if (description.length < 30) throw new Error('Not enough text to analyze on this element.');
    if (!chrome.runtime?.id) throw new Error('Extension updated. Refresh this tab.');
    const platform = location.hostname.replace(/^www\./, '');
    const res = await chrome.runtime.sendMessage({ type: 'OPEN_POST', job: { title: '', company: '', location: '', description: description.slice(0, 30000), url, source: platform } });
    if (!res?.ok) throw new Error(res?.error || 'Unable to open analysis.');
  }

  function findCards() {
    const result = new Set();
    for (const el of document.querySelectorAll(CARD_SEL)) {
      if (own(el)) continue;
      const text = read(el);
      if (text.length < 120 || text.length > 8000) continue;
      if (!JOBWORDS.test(text)) continue;
      if (!el.querySelector(HEADING)) continue;
      result.add(el);
    }
    // keep only outermost (non-nested) candidates
    const arr = [...result];
    return arr.filter(c => !arr.some(o => o !== c && o.contains(c))).slice(0, 40);
  }
  function cardTitle(card) { const h = card.querySelector(HEADING); return h ? read(h).slice(0, 140) : ""; }
  function cardUrl(card) {
    const a = card.matches('a[href]') ? card : card.querySelector('a[href]');
    return a?.href || location.href;
  }

  async function autoScroll(status) {
    let last = -1, stable = 0;
    for (let i = 0; i < 40 && stable < 3; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 700));
      const h = document.body.scrollHeight;
      if (h === last) stable++; else { stable = 0; last = h; }
      if (status) { try { status.textContent = `Loading… ${findCards().length} jobs`; } catch (e) {} }
    }
    window.scrollTo(0, 0);
  }
  function makeFloating() {
    if (floatBtn?.isConnected) return;
    const { el, root } = host(); floatBtn = el;
    el.style.cssText = 'position:fixed!important;bottom:16px!important;right:16px!important;z-index:2147483647!important;display:block!important;max-width:320px!important';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;color:#15211b;border:2px solid #196b45;border-radius:12px;padding:10px;box-shadow:0 4px 20px #0003;font:13px/1.4 system-ui';
    label = document.createElement('div'); label.style.cssText = 'margin:2px 4px 4px;font-weight:600';
    const analyze = button('Analyze this page'); const status = document.createElement('div'); status.setAttribute('role', 'status'); status.style.cssText = 'font:12px system-ui;color:#9d3025;margin:2px 4px';
    analyze.addEventListener('click', async e => {
      if (!e.isTrusted) return; analyze.disabled = true; status.textContent = '';
      try {
        await expandLinkedIn();
        await open(pageText(), location.href);
        maybeFillForm();
      } catch (err) { status.textContent = err.message; } finally { analyze.disabled = false; }
    });
    const loadAll = button('Load all jobs'); loadAll.style.background = '#334155';
    loadAll.addEventListener('click', async e => {
      if (!e.isTrusted) return; loadAll.disabled = true; status.textContent = 'Loading…';
      try { await autoScroll(status); refresh(); status.textContent = ''; } catch (err) { status.textContent = err.message; } finally { loadAll.disabled = false; }
    });
    box.append(label, analyze, loadAll, status); root.append(box); document.documentElement.append(el);
  }

  async function analyzeAndApply(desc, url, status, title) {
    if (desc.length < 30) throw new Error('Not enough text to analyze.');
    status.textContent = 'Analyzing…'; status.style.color = '#334155';
    const resp = await chrome.runtime.sendMessage({ type: 'ANALYZE_JOB', job: { title: '', company: '', location: '', description: desc.slice(0, 30000), url } });
    if (!resp || !resp.ok) throw new Error((resp && resp.error) || 'Analysis failed.');
    if (resp.needsPopup) { await open(desc, url); maybeFillForm(); window.open(url, '_blank', 'noopener'); try { chrome.runtime.sendMessage({ type: 'RECORD_APPLIED', job: { title: title || '', company: '', url, score: null, via: 'analyze-apply' } }); } catch (e) {} status.style.color = '#334155'; status.textContent = 'Opened analysis + apply (browser mode can\'t gate on score).'; return; }
    const score = (resp.result && Number(resp.result.score)) || 0;
    const thr = resp.threshold || 0;
    if (score >= thr) { window.open(url, '_blank', 'noopener'); try { chrome.runtime.sendMessage({ type: 'RECORD_APPLIED', job: { title: (resp.result && resp.result.role) || title || '', company: (resp.result && resp.result.company) || '', url, score, via: 'analyze-apply' } }); } catch (e) {} status.style.color = '#196b45'; status.textContent = `Match ${score}%${thr ? ` ≥ ${thr}%` : ''} — opening apply…`; }
    else { status.style.color = '#9d3025'; status.textContent = `Match ${score}% < ${thr}% — not opening apply.`; }
  }
  function decorate(card) {
    if (card.querySelector('[data-jm-btn]')) return;
    const { el, root } = host(); el.setAttribute('data-jm-btn', '');
    const analyze = button('Analyze'); const applied = document.createElement('span');
    applied.setAttribute('data-applied', ''); applied.style.cssText = 'font:600 12px system-ui;color:#196b45;margin-left:6px;display:none';
    const status = document.createElement('span'); status.style.cssText = 'font:12px system-ui;color:#9d3025';
    analyze.addEventListener('click', async e => {
      if (!e.isTrusted) return; e.preventDefault(); e.stopPropagation(); analyze.disabled = true; status.textContent = '';
      try { await open(read(card), cardUrl(card)); maybeFillForm(); } catch (err) { status.textContent = err.message; } finally { analyze.disabled = false; }
    });
    const applyBtn = button('Apply'); applyBtn.style.background = '#0a66c2';
    applyBtn.addEventListener('click', e => { if (!e.isTrusted) return; e.preventDefault(); e.stopPropagation(); const u = cardUrl(card); if (u) window.open(u, '_blank', 'noopener'); });
    const aaBtn = button('Analyze & Apply'); aaBtn.style.background = '#196b45';
    aaBtn.addEventListener('click', async e => { if (!e.isTrusted) return; e.preventDefault(); e.stopPropagation(); aaBtn.disabled = true; try { await analyzeAndApply(read(card), cardUrl(card), status, cardTitle(card)); } catch (err) { status.style.color = '#9d3025'; status.textContent = err.message; } finally { aaBtn.disabled = false; } });
    root.append(analyze, applyBtn, aaBtn, applied, status);
    try { card.prepend(el); } catch { card.parentNode?.insertBefore(el, card); }
  }
  function markApplied(card) {
    const span = card.querySelector('[data-jm-btn]')?.shadowRoot?.querySelector('[data-applied]');
    if (!span) return;
    const on = appliedUrls.has(normUrl(cardUrl(card)));
    span.textContent = on ? '✓ Applied' : ''; span.style.display = on ? 'inline-block' : 'none';
  }

  function injectLinkedInTop() {
    if (!location.hostname.includes('linkedin.com')) return;
    if (document.querySelector('[data-jm-top]')) return;
    const cards = document.querySelectorAll('.jobs-unified-top-card, .job-details-jobs-unified-top-card__container--two-pane, .jobs-details__main-content, main');
    let anchor = null, scope = null;
    for (const c of cards) {
      const hit = [...c.querySelectorAll('a, button')].find(b => {
        if (!b.offsetParent || own(b)) return false;
        const lbl = ((b.getAttribute('aria-label') || '') + ' ' + read(b)).trim();
        return /jobs-apply-button|jobs-save-button/.test(b.className || '') || /^(apply|save)(\s|$)/i.test(lbl);
      });
      if (hit) { anchor = hit; scope = c; break; }
    }
    if (!anchor) return;
    const row = anchor.closest('.display-flex, [class*="actions" i], [class*="apply" i]') || anchor.parentElement;
    if (!row) return;
    const { el, root } = host(); el.setAttribute('data-jm-top', ''); el.style.setProperty('display', 'inline-flex', 'important'); el.style.setProperty('align-items', 'center', 'important');
    const analyze = button('\u26a1 Analyze'); analyze.style.margin = '0 0 0 8px';
    const status = document.createElement('span'); status.style.cssText = 'font:12px system-ui;color:#9d3025;margin-left:4px';
    analyze.addEventListener('click', async e => {
      if (!e.isTrusted) return; analyze.disabled = true; status.textContent = '';
      try { await expandLinkedIn(); await open(pageText(), location.href); }
      catch (err) { status.textContent = err.message; } finally { analyze.disabled = false; }
    });
    root.append(analyze, status);
    try { row.appendChild(el); } catch { (anchor.parentElement || row).appendChild(el); }
  }

  async function refresh() {
    await refreshApplied();
    makeFloating();
    const cards = findCards();
    for (const card of cards) { decorate(card); markApplied(card); }
    const msg = `Job Match · ${cards.length} ${cards.length === 1 ? 'listing' : 'listings'} detected`;
    if (label && label.textContent !== msg) label.textContent = msg;
  }
  function queue() { if (scheduled) return; scheduled = setTimeout(() => { scheduled = null; refresh(); }, 300); }

  new MutationObserver(recs => { if (recs.some(r => !own(r.target))) queue(); }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', queue);
  let prev = location.href;
  setInterval(() => { if (location.href !== prev) { prev = location.href; queue(); } }, 1000);
  globalThis.__jobMatchAnywhere = { refresh };
  refresh();
  (async () => {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'CONSUME_AUTO_ANALYZE' });
      if (r && r.ok && r.go) {
        for (let i = 0; i < 16; i++) {
          await expandLinkedIn();
          if (pageText().length > 400) break;
          await new Promise(res => setTimeout(res, 500));
        }
        await open(pageText(), location.href);
      }
    } catch (e) {}
  })();
})();
