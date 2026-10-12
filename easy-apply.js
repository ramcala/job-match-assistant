// LinkedIn Easy Apply helper. Fills the Easy Apply modal from saved answers and (only when the
// user has explicitly enabled auto-submit) advances and submits. It STOPS rather than guess when a
// required field is blank/unmapped, so it never submits an incomplete or fabricated application.
// Automating LinkedIn's UI is against their ToS and can risk the account; this runs only on the
// user's own machine, on their click.
(() => {
  if (!location.hostname.includes('linkedin.com')) return;

  // ---- pure answer mapper (also exported for tests) ----
  function easyApplyAnswerFor(label, ans) {
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
  globalThis.easyApplyAnswerFor = easyApplyAnswerFor;
  if (typeof document === 'undefined' || !document.querySelector) return; // test/non-DOM context

  const read = n => (n?.innerText || n?.textContent || '').replace(/\s+/g, ' ').trim();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const own = n => n?.nodeType === 1 && !!n.closest('[data-jm-ea]');

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : (el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function labelFor(field, group) {
    if (field.id) { const l = document.querySelector(`label[for="${CSS.escape(field.id)}"]`); if (l) return read(l); }
    const al = field.getAttribute('aria-label'); if (al) return al;
    const g = field.closest('[data-test-form-element], .fb-dash-form-element, .jobs-easy-apply-form-element, fieldset, .artdeco-text-input--container, div');
    return read(g).slice(0, 160);
  }
  function modal() { return document.querySelector('.jobs-easy-apply-modal, [aria-label*="Easy Apply" i][role="dialog"], [role="dialog"] .jobs-easy-apply-content')?.closest('[role="dialog"]') || document.querySelector('[role="dialog"]'); }

  function fillModal(ans) {
    const box = modal(); if (!box) return { filled: 0, missing: [] };
    let filled = 0; const missing = [];
    // text/number/textarea/select
    for (const field of box.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input[type="number"], input:not([type]), textarea, select')) {
      if (own(field)) continue;
      const label = labelFor(field, box);
      const a = easyApplyAnswerFor(label, ans);
      const required = field.required || field.getAttribute('aria-required') === 'true';
      if (a && a.kind === 'text') {
        if (field.tagName === 'SELECT') {
          const opt = [...field.options].find(o => new RegExp('^' + a.value + '$', 'i').test(read(o)) || read(o).toLowerCase().includes(String(a.value).toLowerCase()));
          if (opt) { setNativeValue(field, opt.value); filled++; } else if (required && !field.value) missing.push(label);
        } else if (!field.value) { setNativeValue(field, a.value); filled++; }
      } else if (a && a.kind === 'choice' && field.tagName === 'SELECT') {
        const opt = [...field.options].find(o => new RegExp('^' + a.value + '$', 'i').test(read(o)));
        if (opt) { setNativeValue(field, opt.value); filled++; } else if (required && !field.value) missing.push(label);
      } else if (required && !field.value) missing.push(label);
    }
    // radio groups (yes/no work auth etc.)
    const seen = new Set();
    for (const radio of box.querySelectorAll('input[type="radio"]')) {
      const name = radio.name; if (!name || seen.has(name)) continue; seen.add(name);
      const group = radio.closest('fieldset') || box;
      const label = read(group.querySelector('legend')) || labelFor(radio, box);
      const a = easyApplyAnswerFor(label, ans);
      const checked = box.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
      if (a && a.kind === 'choice') {
        const target = [...box.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)].find(r => new RegExp('^' + a.value + '$', 'i').test(read(document.querySelector(`label[for="${CSS.escape(r.id)}"]`)) || ''));
        if (target && !target.checked) { target.click(); filled++; }
        else if (!checked && !target) missing.push(label);
      } else if (!checked) missing.push(label);
    }
    // required checkboxes (e.g. terms) — leave unchecked for the user unless explicitly a consent we won't auto-agree to
    return { filled, missing };
  }

  function actionButton() {
    const box = modal(); if (!box) return null;
    const byLabel = re => [...box.querySelectorAll('button')].find(b => b.offsetParent && re.test((b.getAttribute('aria-label') || '') + ' ' + read(b)));
    return {
      submit: byLabel(/submit application/i),
      review: byLabel(/^review$|review your application/i),
      next: byLabel(/continue to next step|^next$|continue/i),
      dismiss: byLabel(/dismiss|^close$/i)
    };
  }

  function currentJob() {
    const title = read(document.querySelector('.job-details-jobs-unified-top-card__job-title, h1'));
    const company = read(document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name'));
    return { title, company, url: location.href };
  }

  async function getAnswers() {
    try { const r = await chrome.runtime.sendMessage({ type: 'EA_ANSWERS' }); if (r?.ok) return r.answers || {}; } catch {}
    return {};
  }

  let toastEl;
  function toast(msg, ok, action) {
    if (!toastEl) { const d = document.createElement('div'); d.setAttribute('data-jm-ea', ''); d.style.cssText = 'position:fixed;bottom:70px;right:16px;z-index:2147483647;max-width:320px;background:#fff;border:2px solid #196b45;border-radius:10px;padding:10px 12px;font:13px/1.4 system-ui;color:#15211b;box-shadow:0 4px 20px #0003'; document.documentElement.append(d); toastEl = d; }
    toastEl.style.borderColor = ok ? '#196b45' : '#9d3025';
    toastEl.textContent = '';
    const p = document.createElement('div'); p.textContent = msg; toastEl.append(p);
    if (action && action.label) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label;
      b.style.cssText = 'margin-top:8px;background:#196b45;color:#fff;border:0;border-radius:6px;padding:5px 10px;font:600 12px system-ui;cursor:pointer';
      b.addEventListener('click', e => { if (e.isTrusted && action.fn) action.fn(); });
      toastEl.append(b);
    }
  }

  function collectAnswers() {
    const box = modal(); if (!box) return {};
    const pairs = {};
    for (const field of box.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input[type="number"], input:not([type]), textarea, select')) {
      if (own(field)) continue;
      const label = labelFor(field, box);
      let val = field.tagName === 'SELECT' ? read(field.options[field.selectedIndex]) : field.value;
      if (label && val && String(val).trim()) pairs[label] = String(val).trim();
    }
    const seen = new Set();
    for (const radio of box.querySelectorAll('input[type="radio"]:checked')) {
      const name = radio.name; if (seen.has(name)) continue; seen.add(name);
      const group = radio.closest('fieldset') || box;
      const label = read(group.querySelector('legend')) || labelFor(radio, box);
      const val = read(document.querySelector(`label[for="${CSS.escape(radio.id)}"]`));
      if (label && val) pairs[label] = val;
    }
    return pairs;
  }
  async function rememberAnswers() {
    const pairs = collectAnswers();
    if (!Object.keys(pairs).length) { toast('Nothing filled in yet to remember.', false); return; }
    try { const r = await chrome.runtime.sendMessage({ type: 'EA_LEARN', pairs }); toast(`Remembered ${r?.count ?? 0} answer(s) for next time.`, true); }
    catch { toast('Could not save answers.', false); }
  }

  async function run() {
    const ans = await getAnswers();
    // open the modal if not open
    if (!modal()) {
      const ea = [...document.querySelectorAll('button')].find(b => b.offsetParent && /easy apply/i.test((b.getAttribute('aria-label') || '') + ' ' + read(b)) && !own(b));
      if (!ea) { toast('No Easy Apply button on this job.', false); return; }
      ea.click(); await sleep(1200);
    }
    if (!modal()) { toast('Could not open the Easy Apply dialog.', false); return; }
    const job = currentJob();
    for (let step = 0; step < 12; step++) {
      await sleep(500);
      const { missing } = fillModal(ans);
      const btn = actionButton();
      if (!btn) { toast('Application form changed — finish it manually.', false); return; }
      if (missing.length) {
        toast('Paused — please answer: ' + missing.slice(0, 4).join('; ') + (missing.length > 4 ? '…' : '') + '. Answer in the dialog, then click below to teach them.', false, { label: 'Remember my answers', fn: rememberAnswers });
        return;
      }
      if (btn.submit) {
        if (ans.eaAutoSubmit === true) {
          btn.submit.click();
          try { await chrome.runtime.sendMessage({ type: 'RECORD_APPLIED', job }); } catch {}
          toast('Submitted via Easy Apply and logged to your tracker.', true);
        } else {
          toast('Ready to submit — review and click Submit yourself (enable auto-submit in Settings to skip this).', true, { label: 'Remember my answers', fn: rememberAnswers });
        }
        return;
      }
      if (btn.review) { btn.review.click(); continue; }
      if (btn.next) { btn.next.click(); continue; }
      toast('Reached a step with no Next/Submit — finish manually.', false);
      return;
    }
    toast('Too many steps — finish the application manually.', false);
  }

  function scan() {
    const ea = [...document.querySelectorAll('button.jobs-apply-button, button[aria-label*="Easy Apply" i]')].find(b => b.offsetParent && !own(b));
    if (!ea) return;
    if (document.querySelector('[data-jm-ea-btn]')) return;
    const hostBtn = document.createElement('span'); hostBtn.setAttribute('data-jm-ea', ''); hostBtn.setAttribute('data-jm-ea-btn', '');
    const root = hostBtn.attachShadow({ mode: 'open' });
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '⚡ Auto Easy Apply';
    b.style.cssText = 'background:#196b45;color:#fff;border:0;border-radius:8px;padding:8px 12px;margin:6px 0;font:600 13px system-ui;cursor:pointer';
    b.addEventListener('click', e => { if (e.isTrusted) run(); });
    root.append(b);
    try { ea.parentElement.insertBefore(hostBtn, ea.nextSibling); } catch { document.documentElement.append(hostBtn); }
  }

  let sched;
  const queue = () => { if (sched) return; sched = setTimeout(() => { sched = null; try { scan(); } catch {} }, 500); };
  try { new MutationObserver(() => queue()).observe(document.documentElement, { childList: true, subtree: true }); } catch {}
  let prev = location.href;
  setInterval(() => { if (location.href !== prev) { prev = location.href; queue(); } }, 1000);
  globalThis.__jmEasyApply = { scan, run };
  try { scan(); } catch {}
})();
