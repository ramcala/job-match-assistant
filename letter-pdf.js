// Minimal dependency-free PDF writer for plain-text letters (A4, Helvetica, word-wrapped, multi-page).
(() => {
  const W = {32:278,33:278,34:355,35:556,36:556,37:889,38:667,39:191,40:333,41:333,42:389,43:584,44:278,45:333,46:278,47:278,58:278,59:278,60:584,61:584,62:584,63:556,64:1015,
    65:667,66:667,67:722,68:722,69:667,70:611,71:778,72:722,73:278,74:500,75:667,76:556,77:833,78:722,79:778,80:667,81:778,82:722,83:667,84:611,85:722,86:667,87:944,88:667,89:667,90:611,
    91:278,92:278,93:278,94:469,95:556,96:333,97:556,98:556,99:500,100:556,101:556,102:278,103:556,104:556,105:222,106:222,107:500,108:222,109:833,110:556,111:556,112:556,113:556,114:333,115:500,116:278,117:556,118:500,119:722,120:500,121:500,122:500,
    123:334,124:260,125:334,126:584};
  for (let c = 48; c <= 57; c++) W[c] = 556;
  const SPECIAL = {'‘':"'",'’':"'",'“':'"','”':'"','–':'-','—':'-','…':'...','•':'-',' ':' ','\t':'    '};
  // Keep to Latin-1 (valid in WinAnsi at the same code); anything else becomes "?".
  const clean = text => String(text || '').replace(/\r\n?/g, '\n').normalize('NFC').replace(/[^\n]/gu, ch => SPECIAL[ch] ?? (ch.charCodeAt(0) < 256 && (ch.charCodeAt(0) >= 32) ? ch : '?'));
  const width = (s, size) => { let t = 0; for (const ch of s) t += W[ch.charCodeAt(0)] ?? 556; return t * size / 1000; };
  const esc = s => s.replace(/[\\()]/g, '\\$&');

  function wrap(text, size, max) {
    const lines = [];
    for (const para of clean(text).split('\n')) {
      if (!para.trim()) { lines.push(''); continue; }
      let line = '';
      for (let word of para.split(/ +/)) {
        while (width(word, size) > max) { // break a single over-long word
          let n = word.length; while (n > 1 && width(word.slice(0, n), size) > max) n--;
          if (line) { lines.push(line); line = ''; }
          lines.push(word.slice(0, n)); word = word.slice(n);
        }
        const next = line ? line + ' ' + word : word;
        if (width(next, size) <= max) line = next; else { lines.push(line); line = word; }
      }
      lines.push(line);
    }
    return lines;
  }

  globalThis.makeLetterPdf = function (text, { size = 11, leading = 15, margin = 72 } = {}) {
    const pageW = 595, pageH = 842;
    const lines = wrap(text, size, pageW - margin * 2);
    const perPage = Math.floor((pageH - margin * 2) / leading);
    const pages = [];
    for (let i = 0; i < lines.length || !pages.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    const objs = []; // objs[n-1] = body of object n
    objs.push('<< /Type /Catalog /Pages 2 0 R >>');
    objs.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objs.push('<< /Producer (Job Match Assistant) >>');
    pages.forEach((pageLines, i) => {
      const stream = `BT /F1 ${size} Tf ${leading} TL ${margin} ${pageH - margin - size} Td ${pageLines.map(l => `(${esc(l)}) Tj T*`).join(' ')} ET`;
      objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${4 + i * 2} 0 R >>`);
    });
    let out = '%PDF-1.4\n'; const offsets = [];
    objs.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  };
})();
