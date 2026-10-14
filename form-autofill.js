// Universal application-form autofiller for job boards and common ATS (Greenhouse, Lever, Workday,
// SmartRecruiters, Ashby, Workable, iCIMS, etc.). LinkedIn is handled by easy-apply.js.
// It fills only fields it can confidently map from your saved answers and STOPS rather than guess;
// it never clicks Submit. Automating application forms can violate a site's terms — it runs only on
// your machine, on your click.
(() => {
  // ---- pure mapper (exported for tests) ----
  function formAutoAnswerFor(label, ans) {
    const t = String(label || '').toLowerCase();
    const numeric = v => String(v == null ? '' : v).replace(/[^\d.]/g, '');
    if (!t) return null;
    if (/phone|mobile|contact number/.test(t) && ans.eaPhone) return { kind: 'text', value: ans.eaPhone };
    if (/e-?mail/.test(t) && ans.eaEmail) return { kind: 'text', value: ans.eaEmail };
    if (/notice period/.test(t) && ans.eaNotice) return { kind: 'text', value: ans.eaNotice };
    if (/expected.*(ctc|salary|compensation|pay)/.test(t) && ans.eaExpectedCTC) return { kind: 'text', value: ans.eaExpectedCTC };
    if (/current.*(ctc|salary|compensation|pay)/.test(t) && ans.eaCurrentCTC) return { kind: 'text', value: ans.eaCurrentCTC };
    if (/(city|location|where are you|current location|based in|reside)/.test(t) && ans.eaLocation) return { kind: 'text', value: ans.eaLocation };
    if (/(year|experience)/.test(t) && ans.eaExperienceYears) return { kind: 'text', value: numeric(ans.eaExperienceYears) };
    if (/(authori[sz]ed to work|work authorization|legally authorized|right to work|eligible to work|require sponsor|need sponsor|visa)/.test(t) && ans.eaWorkAuth) return { kind: 'choice', value: ans.eaWorkAuth };
    if (ans.eaLearned) { const norm = t.replace(/\s+/g, ' ').trim(); if (ans.eaLearned[norm]) return { kind: 'text', value: ans.eaLearned[norm] }; }
    return null;
  }
  globalThis.formAutoAnswerFor = formAutoAnswerFor;
  if (location.hostname.includes('linkedin.com')) return; // easy-apply.js owns LinkedIn
  if (typeof document === 'undefined' || !document.querySelector) return;
  if (globalThis.__jmFormFill) return; globalThis.__jmFormFill = true;

  const read = n => (n?.innerText || n?.textContent || '').replace(/\s+/g, ' ').trim();
  const own = n => n?.nodeType === 1 && !!n.closest('[data-jm-form]');
  const FIELD = 'input[type="text"], input[type="tel"], input[type="email"], input[type="number"], input:not([type]), textarea, select';

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : (el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function labelFor(field) {
    if (field.id) { const l = document.querySelector(`label[for="${CSS.escape(field.id)}"]`); if (l) return read(l); }
    const al = field.getAttribute('aria-label') || field.getAttribute('placeholder'); if (al) return al;
    const g = field.closest('label, [class*="field" i], [class*="question" i], .form-group, div');
    return read(g).slice(0, 160);
  }
  function formScope() {
    let best = null, bestN = 0;
    for (const f of document.querySelectorAll('form')) {
      const n = [...f.querySelectorAll(FIELD)].filter(x => x.offsetParent && !own(x)).length;
      if (n > bestN) { best = f; bestN = n; }
    }
    return bestN >= 2 ? best : (document.querySelectorAll(FIELD).length >= 2 ? document.body : null);
  }
  function fillForm(scope, ans) {
    let filled = 0; const missing = [];
    for (const field of scope.querySelectorAll(FIELD)) {
      if (own(field) || !field.offsetParent) continue;
      const label = labelFor(field);
      const a = formAutoAnswerFor(label, ans);
      const required = field.required || field.getAttribute('aria-required') === 'true';
      if (a && (a.kind === 'text' || a.kind === 'choice')) {
        if (field.tagName === 'SELECT') {
          const opt = [...field.options].find(o => new RegExp('^' + a.value + '$', 'i').test(read(o)) || read(o).toLowerCase().includes(String(a.value).toLowerCase()));
          if (opt) { setNativeValue(field, opt.value); filled++; } else if (required && !field.value) missing.push(label);
        } else if (!field.value) { setNativeValue(field, a.value); filled++; }
      } else if (required && !field.value) missing.push(label);
    }
    const seen = new Set();
    for (const radio of scope.querySelectorAll('input[type="radio"]')) {
      const name = radio.name; if (!name || seen.has(name)) continue; seen.add(name);
      const group = radio.closest('fieldset') || scope;
      const label = read(group.querySelector('legend')) || labelFor(radio);
      const a = formAutoAnswerFor(label, ans);
      const checked = scope.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
      if (a && a.kind === 'choice') {
        const target = [...scope.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)].find(r => new RegExp('^' + a.value + '$', 'i').test(read(document.querySelector(`label[for="${CSS.escape(r.id)}"]`)) || ''));
        if (target && !target.checked) { target.click(); filled++; } else if (!checked && !target) missing.push(label);
      } else if (!checked) missing.push(label);
    }
    return { filled, missing };
  }
  function collectAnswers(scope) {
    const pairs = {};
    for (const field of scope.querySelectorAll(FIELD)) {
      if (own(field)) continue;
      const label = labelFor(field);
      const val = field.tagName === 'SELECT' ? read(field.options[field.selectedIndex]) : field.value;
      if (label && val && String(val).trim()) pairs[label] = String(val).trim();
    }
    const seen = new Set();
    for (const radio of scope.querySelectorAll('input[type="radio"]:checked')) {
      const name = radio.name; if (seen.has(name)) continue; seen.add(name);
      const label = labelFor(radio); const val = read(document.querySelector(`label[for="${CSS.escape(radio.id)}"]`));
      if (label && val) pairs[label] = val;
    }
    return pairs;
  }
  async function getAnswers() { try { const r = await chrome.runtime.sendMessage({ type: 'EA_ANSWERS' }); if (r?.ok) return r.answers || {}; } catch {} return {}; }

  let toastEl;
  function toast(msg, ok, action) {
    if (!toastEl) { const d = document.createElement('div'); d.setAttribute('data-jm-form', ''); d.style.cssText = 'position:fixed;bottom:112px;right:16px;z-index:2147483647;max-width:320px;background:#fff;border:2px solid #196b45;border-radius:10px;padding:10px 12px;font:13px/1.4 system-ui;color:#15211b;box-shadow:0 4px 20px #0003'; document.documentElement.append(d); toastEl = d; }
    toastEl.style.borderColor = ok ? '#196b45' : '#9d3025'; toastEl.textContent = '';
    const p = document.createElement('div'); p.textContent = msg; toastEl.append(p);
    if (action && action.label) { const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label; b.style.cssText = 'margin-top:8px;background:#196b45;color:#fff;border:0;border-radius:6px;padding:5px 10px;font:600 12px system-ui;cursor:pointer'; b.addEventListener('click', e => { if (e.isTrusted && action.fn) action.fn(); }); toastEl.append(b); }
  }
  async function remember(scope) {
    const pairs = collectAnswers(scope);
    if (!Object.keys(pairs).length) { toast('Nothing filled in yet to remember.', false); return; }
    try { const r = await chrome.runtime.sendMessage({ type: 'EA_LEARN', pairs }); toast(`Remembered ${r?.count ?? 0} answer(s) for next time.`, true); } catch { toast('Could not save answers.', false); }
  }
  globalThis.__jmFillForm = () => run();
  globalThis.__jmHasForm = () => !!formScope();
  async function run() {
    const scope = formScope(); if (!scope) { toast('No application form found on this page.', false); return; }
    const ans = await getAnswers();
    const { filled, missing } = fillForm(scope, ans);
    const act = { label: 'Remember my answers', fn: () => remember(scope) };
    if (missing.length) toast(`Filled ${filled}. Please answer: ${missing.slice(0, 4).join('; ')}${missing.length > 4 ? '…' : ''}. Review everything, then submit yourself.`, false, act);
    else toast(`Filled ${filled} field(s). Review everything, then submit yourself — nothing is sent automatically.`, true, act);
  }

  let btnHost;
  function showButton() {
    if (btnHost?.isConnected) return;
    if (globalThis.__jobMatchAnywhere) return; // board page: Analyze triggers fill
    if (!formScope()) return;
    const host = document.createElement('div'); host.setAttribute('data-jm-form', ''); btnHost = host;
    host.style.cssText = 'position:fixed!important;bottom:64px!important;right:16px!important;z-index:2147483647!important;display:block!important';
    const root = host.attachShadow({ mode: 'open' });
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '⚡ Fill application form';
    b.style.cssText = 'background:#196b45;color:#fff;border:0;border-radius:8px;padding:9px 12px;font:600 13px system-ui;cursor:pointer;box-shadow:0 4px 20px #0003';
    b.addEventListener('click', e => { if (e.isTrusted) run(); });
    root.append(b); document.documentElement.append(host);
  }
  let sched;
  const queue = () => { if (sched) return; sched = setTimeout(() => { sched = null; try { showButton(); } catch {} }, 600); };
  new MutationObserver(recs => { if (recs.some(r => !own(r.target))) queue(); }).observe(document.documentElement, { childList: true, subtree: true });
  queue();
})();
