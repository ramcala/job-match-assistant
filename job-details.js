// Conservative offline extraction: unknown employers stay blank, never use author names.
function inferJobDetails(job, resumeText = '') {
  const text = job.description || '';
  const roles = [...text.matchAll(/\b(?:(?:senior|sr\.?|junior|jr\.?|lead|staff|principal|associate)\s+)?(?:(?:manager\s*[-–:]\s*)?(?:devops|platform|cloud(?:\s+infrastructure)?|infrastructure|site\s+reliability|software)\s+(?:engineer|architect|developer|manager)|SRE)\b/gi)].map(match => match[0]);
  const unique = [...new Map(roles.map(role => [role.toLowerCase(),role])).values()];
  const score = role => role.toLowerCase().split(/\W+/).filter(word => word.length > 2 && resumeText.toLowerCase().includes(word)).length;
  unique.sort((a,b) => score(b)-score(a));
  const labeledRole = text.match(/(?:^|\n)\s*(?:job title|position|role)\s*[:–-]\s*([^\n|]{3,100})/i)?.[1];
  const labeledCompany = text.match(/(?:^|\n)\s*(?:company|employer|organization)\s*[:–-]\s*([^\n|]{2,100})/i)?.[1];
  const hiringCompany = text.match(/(?:^|\n)\s*([\p{L}\d][\p{L}\d &.,'’()-]{1,70}?)\s+(?:is|are)\s+(?:looking for|hiring|seeking)\b/iu)?.[1];
  let company = job.company || labeledCompany || hiringCompany || '';
  if (/^(?:we|our team|our client|the company|they|client)$/i.test(company.trim())) company='';
  const atCompany = text.match(/\b(?:engineer|architect|developer|SRE)\s+(?:at|with)\s+([\p{Lu}][\p{L}\d&.'’()-]*(?:\s+[\p{Lu}][\p{L}\d&.'’()-]*){0,5})/u)?.[1];
  return {...job, title:(job.title || labeledRole || unique[0] || '').trim(),company:(company || atCompany || '').trim(),detectedRoles:unique};
}

// Pull application emails from the post text. Primary = an address that looks like an application
// mailbox (careers@, hr@, jobs@…) or sits next to "apply/send your resume" wording; the rest go to Cc.
function extractPostEmails(text) {
  if (typeof text !== 'string' || !text) return { primary: '', cc: [] };
  const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const found = []; const seen = new Set(); let m;
  while ((m = re.exec(text))) {
    const email = m[0].replace(/[.,;:)\]}>'"]+$/, '');
    const key = email.toLowerCase();
    if (!seen.has(key)) { seen.add(key); found.push({ email, index: m.index }); }
  }
  if (!found.length) return { primary: '', cc: [] };
  const mailbox = /^(careers?|jobs?|recruit\w*|talent|hiring|hr|apply|applications?|resume|cv|joinus|work|career)@/i;
  const applyKw = /(apply|application|resume|cv|send (?:your|the|us)|email (?:your|us|to|me|at)|reach out|contact|share your|forward your|drop your|mail (?:your|us))/i;
  const score = ({ email, index }) => {
    let s = 0;
    if (mailbox.test(email)) s += 100;
    if (applyKw.test(text.slice(Math.max(0, index - 90), index))) s += 50;
    return s;
  };
  const ranked = [...found].sort((a, b) => score(b) - score(a) || a.index - b.index);
  const primary = ranked[0].email;
  const cc = found.filter(f => f.email !== primary).map(f => f.email);
  return { primary, cc };
}
