// Fills a personalized note into LinkedIn's "Add a note to your invitation?" dialog so a connection
// request is never sent blank. Template by default; optional AI rewrite via your selected provider.
(() => {
  if (!location.hostname.includes('linkedin.com')) return;
  if (typeof document === 'undefined' || !document.querySelector) return;
  if (globalThis.__jmConnectNote) return; globalThis.__jmConnectNote = true;

  const read = n => (n?.innerText || n?.textContent || '').replace(/\s+/g, ' ').trim();
  const own = n => n?.nodeType === 1 && !!n.closest('[data-jm-note]');

  function noteField() {
    return document.querySelector('#custom-message') ||
      [...document.querySelectorAll('[role="dialog"] textarea, .send-invite textarea, textarea[name="message"]')].find(t => t.offsetParent) || null;
  }
  function inviteeName() {
    const dlg = (noteField() && noteField().closest('[role="dialog"]')) || document.querySelector('[role="dialog"]') || document;
    const txt = read(dlg);
    let m = txt.match(/invitation to (.+?) by adding a note/i) || txt.match(/note to (.+?)[.?]/i) || txt.match(/connect with (.+?)[.?]/i);
    if (m) return m[1].trim().slice(0, 80);
    const h = dlg.querySelector('strong, h2, .artdeco-entity-lockup__title');
    return h ? read(h).slice(0, 80) : '';
  }
  function setValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function fill(ai, btn, status) {
    const ta = noteField();
    if (!ta) { if (status) status.textContent = 'Open the "Add a note" box first.'; return; }
    if (btn) btn.disabled = true; if (status) status.textContent = ai ? 'Writing…' : '';
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'CONNECT_NOTE', name: inviteeName(), headline: '', ai: !!ai });
      if (!resp || !resp.ok) throw new Error((resp && resp.error) || 'Could not build a note.');
      setValue(ta, resp.note.slice(0, 290)); ta.focus();
      if (status) status.textContent = `${resp.note.length} chars${resp.viaAi ? ' (AI)' : ''}. Review, then Send.`;
    } catch (e) { if (status) status.textContent = e.message; }
    finally { if (btn) btn.disabled = false; }
  }

  function inject() {
    const ta = noteField(); if (!ta) return;
    const box = ta.closest('[role="dialog"], .send-invite, form, div') || ta.parentElement;
    if (!box || box.querySelector('[data-jm-note]')) return;
    const host = document.createElement('div'); host.setAttribute('data-jm-note', '');
    host.style.cssText = 'margin:6px 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap';
    const mk = (label, ai) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'background:#196b45;color:#fff;border:0;border-radius:16px;padding:6px 12px;font:600 12px system-ui;cursor:pointer'; b.addEventListener('click', e => { if (e.isTrusted) fill(ai, b, status); }); return b; };
    const status = document.createElement('span'); status.style.cssText = 'font:12px system-ui;color:#196b45';
    host.append(mk('✍️ Add note', false), mk('✨ AI note', true), status);
    try { ta.parentElement.insertBefore(host, ta); } catch { box.prepend(host); }
  }
  let sched;
  const queue = () => { if (sched) return; sched = setTimeout(() => { sched = null; try { inject(); } catch {} }, 400); };
  new MutationObserver(recs => { if (recs.some(r => !own(r.target))) queue(); }).observe(document.documentElement, { childList: true, subtree: true });
  queue();
})();
