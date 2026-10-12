// Portable folder sync via the File System Access API.
// Lets the user link a real directory once (ideally one that lives inside Google Drive / Dropbox /
// OneDrive). All durable extension data is written to a JSON file there, so switching laptops is a
// matter of linking the same cloud-synced folder and loading. The directory handle is remembered in
// IndexedDB (shared across the extension's pages), and readwrite permission, once granted on the
// options page, lets later saves (even from the popup) run without a prompt within the session.
(function () {
  const DB = 'jm-fs', STORE = 'handles', HKEY = 'dir', FILE = 'job-match-assistant-data.json';
  const KEYS = ['apiKey','model','resume','resumeText','autoBackup','jobKeywords','jobLocation',
    'emailFinderKey','emailFinderProvider','apolloKey','rocketreachKey',
    'eaPhone','eaEmail','eaExperienceYears','eaNotice','eaCurrentCTC','eaExpectedCTC','eaLocation','eaWorkAuth','eaAutoSubmit',
    'eaLearned','emailCache','appliedJobs','candidateName','analysisMode','profile'];

  function openDb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(k) {
    const db = await openDb();
    return new Promise((res, rej) => { const t = db.transaction(STORE, 'readonly').objectStore(STORE).get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); });
  }
  async function idbSet(k, v) {
    const db = await openDb();
    return new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite').objectStore(STORE).put(v, k); t.onsuccess = () => res(); t.onerror = () => rej(t.error); });
  }
  async function idbDel(k) {
    const db = await openDb();
    return new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(k); t.onsuccess = () => res(); t.onerror = () => rej(t.error); });
  }

  const supported = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

  async function ensurePerm(handle, write, allowPrompt) {
    const opts = { mode: write ? 'readwrite' : 'read' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if (!allowPrompt) return false;
    return (await handle.requestPermission(opts)) === 'granted';
  }

  async function linkFolder() {
    if (!supported()) throw new Error('This browser does not support linking a folder. Use Chrome/Edge on desktop.');
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    await idbSet(HKEY, dir);
    return dir.name;
  }
  async function unlink() { await idbDel(HKEY); }
  async function linkedName() { try { const d = await idbGet(HKEY); return d ? d.name : ''; } catch { return ''; } }

  async function saveAll(allowPrompt) {
    const dir = await idbGet(HKEY);
    if (!dir) { if (allowPrompt) throw new Error('Link a folder first.'); return false; }
    if (!(await ensurePerm(dir, true, allowPrompt))) { if (allowPrompt) throw new Error('Permission to write to the folder was denied.'); return false; }
    const data = await chrome.storage.local.get(KEYS);
    const fh = await dir.getFileHandle(FILE, { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify({ _format: 'job-match-assistant', _v: 1, savedAt: Date.now(), data }, null, 2));
    await w.close();
    return true;
  }
  async function loadAll(allowPrompt) {
    const dir = await idbGet(HKEY);
    if (!dir) throw new Error('Link a folder first.');
    if (!(await ensurePerm(dir, false, allowPrompt))) throw new Error('Permission to read the folder was denied.');
    let fh;
    try { fh = await dir.getFileHandle(FILE); }
    catch { throw new Error('No saved data file in that folder yet. Click "Save to folder" on your other laptop first.'); }
    const f = await fh.getFile();
    const j = JSON.parse(await f.text());
    const data = (j && j.data) ? j.data : j;
    if (!data || typeof data !== 'object') throw new Error('The data file looks corrupted.');
    await chrome.storage.local.set(data);
    return Object.keys(data).length;
  }

  window.JMFolderSync = { supported, linkFolder, unlink, linkedName, saveAll, loadAll };
})();
