// Local resume text extraction, nothing leaves the browser.
// PDF -> pdf.js with geometry-based column/line reconstruction. DOCX -> zip+inflate. TXT -> direct.
(() => {
  async function inflate(bytes, raw) {
    const ds = new DecompressionStream(raw ? 'deflate-raw' : 'deflate');
    const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(buf);
  }
  function latin1(u8){ let s=''; for(let i=0;i<u8.length;i+=8192) s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192)); return s; }

  // ---- geometry helpers for PDF layout ----
  function joinLine(line) {
    line.sort((a,b)=>a.x-b.x);
    let s='';
    for (let k=0;k<line.length;k++) {
      if (k>0) {
        const prev=line[k-1], cur=line[k];
        const gap=cur.x-(prev.x+prev.w);
        const touching=/\s$/.test(prev.str)||/^\s/.test(cur.str);
        if (gap > (prev.h||10)*0.25 && !touching) s+=' ';
      }
      s+=line[k].str;
    }
    return s.replace(/[ \t]+/g,' ').trim();
  }
  function renderColumn(items) {
    items.sort((a,b)=>(b.y-a.y)||(a.x-b.x)); // top-to-bottom, then left-to-right
    let out='', line=[], lastY=null;
    const flush=()=>{ if(line.length){ const t=joinLine(line); if(t) out+=t+'\n'; line=[]; } };
    for (const it of items) {
      const h=it.h||10;
      if (lastY===null) { lastY=it.y; line.push(it); continue; }
      if (Math.abs(it.y-lastY) <= Math.max(3,h*0.6)) { line.push(it); lastY=(lastY+it.y)/2; }
      else { const gap=lastY-it.y; flush(); if(gap>h*1.8) out+='\n'; line.push(it); lastY=it.y; }
    }
    flush();
    return out;
  }
  function columnize(items) {
    if (items.length < 8) return [items];
    const minX=Math.min(...items.map(i=>i.x)), maxX=Math.max(...items.map(i=>i.x+i.w));
    const span=(maxX-minX)||1;
    let best=null;
    for (let t=0.30; t<=0.70; t+=0.02) {
      const X=minX+span*t; let cross=0,left=0,right=0;
      for (const i of items) {
        const c=i.x+i.w/2;
        if (i.x<X && i.x+i.w>X) cross++;
        if (c<X) left++; else right++;
      }
      if (left>=4 && right>=4 && (best===null||cross<best.cross)) best={X,cross};
    }
    if (best && best.cross <= Math.max(2, Math.round(items.length*0.02))) {
      return [ items.filter(i=>i.x+i.w/2<best.X), items.filter(i=>i.x+i.w/2>=best.X) ];
    }
    return [items];
  }
  function layoutPage(items) { return columnize(items).map(renderColumn).join('\n'); }

  async function extractPdf(u8) {
    const lib = globalThis.pdfjsLib;
    if (!lib || !lib.getDocument) throw new Error('The PDF reader did not load. Reload the extension, or use a DOCX/TXT resume.');
    try { lib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js'); } catch (e) {}
    const doc = await lib.getDocument({ data: u8, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
    let out = '';
    for (let p=1; p<=doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items
        .filter(it => it && typeof it.str === 'string' && it.str.trim() !== '')
        .map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width||0, h: Math.abs(it.transform[3])||it.height||10 }));
      if (items.length) out += layoutPage(items) + '\n';
      try { page.cleanup(); } catch (e) {}
    }
    try { await doc.destroy(); } catch (e) {}
    return out;
  }

  // ---- DOCX ----
  const u16=(u8,o)=>u8[o]|u8[o+1]<<8;
  const u32=(u8,o)=>u8[o]|u8[o+1]<<8|u8[o+2]<<16|u8[o+3]*16777216;
  function findNextSig(u8,from){for(let i=from;i+4<=u8.length;i++)if(u8[i]===0x50&&u8[i+1]===0x4b&&(u8[i+2]===0x03||u8[i+2]===0x01)&&(u8[i+3]===0x04||u8[i+3]===0x02))return i;return u8.length;}
  async function extractDocx(u8) {
    for (let i=0;i+30<u8.length;i++) {
      if (!(u8[i]===0x50&&u8[i+1]===0x4b&&u8[i+2]===0x03&&u8[i+3]===0x04)) continue;
      const method=u16(u8,i+8); let compSize=u32(u8,i+18);
      const nameLen=u16(u8,i+26), extraLen=u16(u8,i+28);
      const nameStart=i+30; const name=latin1(u8.subarray(nameStart,nameStart+nameLen));
      const dataStart=nameStart+nameLen+extraLen;
      if (name!=='word/document.xml') continue;
      if (!compSize) compSize=findNextSig(u8,dataStart)-dataStart;
      const data=u8.subarray(dataStart,dataStart+compSize);
      const xmlBytes=method===0?data:await inflate(data,true);
      let xml=new TextDecoder('utf-8').decode(xmlBytes);
      xml=xml.replace(/<\/w:p>/g,'\n').replace(/<w:tab\b[^>]*\/>/g,'\t').replace(/<[^>]+>/g,'');
      return xml.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'");
    }
    return '';
  }

  async function extractResumeText(arrayBuffer, filename) {
    const u8=new Uint8Array(arrayBuffer);
    const ext=(String(filename).split('.').pop()||'').toLowerCase();
    let text='';
    if (ext==='txt') text=new TextDecoder('utf-8').decode(u8);
    else if (ext==='pdf') text=await extractPdf(u8);
    else if (ext==='docx') text=await extractDocx(u8);
    else throw new Error('Only PDF, DOCX or TXT can be read.');
    return text.replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ').trim();
  }
  globalThis.extractResumeText = extractResumeText;
})();
