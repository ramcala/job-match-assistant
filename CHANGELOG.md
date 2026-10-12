# Changelog

All notable changes are listed newest first. Versions match `manifest.json`.

## v1.48.0 — Cover letter as PDF
- **Download** now saves the cover letter as a **PDF** (A4, wrapped, multi-page) instead of a .txt file, using a small built-in PDF writer — no new library or permission.

## v1.47.5 — Clear progress while analyzing
- The **Analyze selected post** button now shows a pulsing **⏳ Analyzing… m:ss** timer while a run (including Gemini/ChatGPT browser sessions) is in progress.
- If a browser-session analysis fails, the popup explains how to finish manually — copy the prompt, paste it into the chat, then paste the reply under **Paste reply JSON** (that section opens automatically).

## v1.47.4 — LinkedIn past-day search
- The **LinkedIn Jobs** search shortcut now shows only jobs posted in the **past 24 hours**.

## v1.47.3 — Subject uses the AI's role and company
- The AI analysis now returns the **role** and **company** it inferred from the post, and the email subject uses them (e.g. `Application for Engineering Manager at Aurora Energy Research – Ram Pratap`) instead of "a role at …". Older results fall back to reading the summary.
- The subject no longer shows the placeholder name "Alex Carter"; it uses your saved or résumé-derived name.

## v1.47.2 — Old applied jobs get LinkedIn ids
- Applied jobs saved earlier (or restored from a backup / the portable folder file) are matched too: their LinkedIn job/post id is filled in from the saved URL the first time a LinkedIn page checks.

## v1.47.1 — Fix: every job shown as applied
- Applied detection no longer marks every job as applied. A job with a LinkedIn id now matches **only by that id**, and generic LinkedIn pages (feed, job lists) recorded as a URL are ignored.

## v1.47.0 — Sent check, smarter subject, Gmail badge
- After **Send email**, the extension checks your Gmail **Sent** folder, confirms the message landed, reports any replies already in the thread, and **marks the job as applied**.
- The email **subject is now dynamic**: `Application for <role> at <company> – <your name>`, built from the (editable) role and company fields; missing parts are dropped instead of showing "Open Role".
- The Send button is disabled and reads **Sending…** while the message goes out.
- New **Connect Gmail** button in the popup header that becomes your **Google avatar** once linked (adds the `userinfo.profile` scope; reconnect once to see the picture).
- **Applied jobs are detected by LinkedIn's own job/post id**, and their **Analyze** button becomes a disabled "✓ Applied" on feed posts and job pages.
- Fixed a console error on LinkedIn tabs left open after reloading the extension ("Extension context invalidated").
- **Sponsor** links on the settings page, popup, GitHub Pages site and README.

## v1.46.0 — ATS score in the popup
- The résumé **ATS score shows on the popup home** as a badge (score, summary, top missing keywords) with a **Check now** button, kept in sync with the Settings check.

## v1.45.0 — ATS score
- After saving/generating a résumé, get an **AI ATS score** (0–100) with summary, missing keywords,
  strengths and improvements — using your selected Analyze‑with provider (OpenAI or ChatGPT/Gemini).
- Added one‑click buttons to **external ATS checkers** (Resume Worded, Jobscan, Enhancv, SkillSyncer).

## v1.44.0 — Icons, GPL-3.0, public hygiene
- Added extension **icons** (16/48/128) and wired them into the manifest (required by the Chrome Web Store).
- Relicensed to **GPL-3.0** (copyleft): free to use and build on, but distributed versions must stay open source.
- Replaced the sample **default profile and candidate name** with a generic placeholder ("Alex Carter") so no personal data ships in the public repo.
- Added a **GitHub Pages landing page** (`index.html`) and a **Chrome Web Store publishing guide** (`docs/PUBLISHING.md`).

## v1.43.0 — Send first, public release
- **Send email** is now the primary action in the email panel; **Save as draft** is secondary.
- Added public‑release docs: full `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `.gitignore`,
  a `docs/` folder (setup, analysis modes, Gmail, email finder, Easy Apply, job boards, portable
  folder, development, video scripts), and animated GIF guides under `assets/`.

## v1.42.0 — In‑app board search + portable folder
- Job boards section now has one **search bar** (keywords + location) and an **Open all** button;
  every portal opens pre‑filled from one place.
- **Portable folder**: link a cloud‑synced folder (Drive/Dropbox/OneDrive) once via the File System
  Access API; all durable data (résumé, settings, applied jobs, learned answers, email cache) is
  saved there and can be loaded on another laptop.

## v1.41.0 — Email lookup cache
- Successful **Find email** results are cached locally (provider + company/domain + name), so the
  same lookup never calls the API or spends quota twice.

## v1.40.0 — Home button + quieter backups
- Added a **Home** button in the popup to return to the inbox/boards/tools/applied tracker.
- Auto‑backup to Downloads now runs **at most once a day** instead of on every apply.

## v1.39.0 — Hiring team + clearer errors
- Captures the LinkedIn **"People you can reach out to" / hiring team** (name + profile) to feed the
  cover letter and Find email.
- Friendlier Hunter.io key error (tells you to re‑copy the key or switch provider).

## v1.38.0 — Paste‑reply fallback
- Added **Paste reply JSON** in the popup: if browser‑session scraping can't read the reply, paste
  it and the same tolerant extractor parses the result.
- Patches 1.38.1–1.38.2: inline LinkedIn Analyze button repositioned and sized to match Apply/Save.

## v1.37.0 — Company context
- Captures the job page's **"About the company"** section and includes it in the analysis for a
  more specific cover letter.

## v1.36.0 — Inline Analyze on LinkedIn jobs
- Added an inline **⚡ Analyze** button on LinkedIn job pages (in `search-posts.js` so it survives
  in‑app navigation) and passes the detected **company/title** through so Find email works.
- Patches 1.36.1–1.36.2: button placement/layout fixes next to Apply/Save.

## v1.35.0 — Robust reply reading
- Hardened the ChatGPT/Gemini reply scraper to read **code blocks** and the richest text, returning
  the moment valid result JSON appears (fixes "no readable reply text" when Gemini rendered JSON in
  a code block). Patch 1.35.1 followed with layout tweaks.

## v1.34.0 — Easy Apply learning + more email providers
- **Easy Apply "remember my answers"**: learns new screening questions and auto‑fills them next
  time; added a **Clear learned answers** control.
- **Apollo.io** and **RocketReach** added as email‑finder providers alongside Hunter.io.
- Auto‑analyze now **waits for the page to load** (polls content length) instead of a fixed delay.


## v1.10.0 – v1.33.0 — earlier incremental releases
- Applied‑jobs tracking on disk, multi‑platform job boards, Gmail job‑alert inbox import, résumé PDF/DOCX extraction, email finder (Hunter), LinkedIn Easy Apply, and many smaller fixes. See git history for per‑commit detail.

# v1.9.0 — Analysis mode moved into the popup

"Analyze with" is now a dropdown right in the toolbar popup (under the header), not a radio picker
in Settings. Pick Local keyword matching, OpenAI API, ChatGPT (browser session), or Gemini (browser
session) right before clicking Analyze — no need to open Settings first. The choice is saved
immediately and persists across popup opens. Settings still holds the OpenAI API key/model (used
when OpenAI API mode is selected) and the explanation of how the ChatGPT/Gemini browser-session
modes work and their trade-offs, but no longer has a mode picker of its own.

# v1.8.1 — Gmail "Refresh status" button

Settings now has a **Refresh status** button next to the Gmail connection line, so you can re-check
whether you're currently connected (and see the exact signed-in email) without reloading the whole
Settings page.

# v1.8.0 — ChatGPT / Gemini browser-session analysis (no API key)

Settings now has an **Analysis mode** picker: Local keyword matching, OpenAI API (unchanged), or
ChatGPT / Gemini via **browser session**. The two browser-session modes run analysis without any
API key: clicking Analyze opens a new background tab at chatgpt.com or gemini.google.com, types in
your resume and the job post, submits it, and reads the structured reply back into the popup — you
need to already be signed in to that site in this browser. The tab is left open afterward so you can
review the actual conversation. Keep the extension popup open while it runs (it can take up to ~2
minutes); closing the popup loses that in-flight result and you'd need to click Analyze again.

Read the "Analysis mode" notes in Settings before relying on this: it automates the consumer web
app rather than an official API (a terms-of-service risk to your own account there, distinct from
anything to do with the extension), and it depends on that site's current page markup, which
ChatGPT and Gemini change without notice. If it stops working, open the left-open tab, inspect the
message box / send button / reply container with DevTools, and update the selector lists at the top
of the browser-session section in `background.js`. This mode is separate from the existing "Copy
prompt & open ChatGPT" manual handoff button, which still works the same as before.

# v1.7.0 — Gmail client ID in Settings

Create a Google OAuth **Web application** client using the setup link in Settings, register the displayed redirect URI, paste the issued ID and click **Save Gmail client ID**, then **Connect Gmail**. Google issues the ID; this extension cannot mint a valid Google credential. No client secret or manifest editing is needed. Existing Chrome Extension clients need replacement with a Web application client for this flow.

The ID persists in local extension settings when reloading/updating the same installed extension. Do not uninstall or change its folder/ID. Tokens are session-only and short-lived: reconnect after restart/expiry. Google consent can open its own authentication window; analysis stays in the toolbar popup. Auth callback state, redirect, scope, expiry and settings changes are validated. Legacy configured manifests still work when no saved ID exists.

# Job Match Assistant — Chrome Extension

## Version 1.6.1: Library resume instructions in the ChatGPT prompt

Copy prompt & open ChatGPT now asks ChatGPT to inspect the current Library folder
named "resume". One resume is selected automatically; several resumes require
your choice by exact filename. The selected file is read and used as the source
for the final analysis/letter, then attached to the application draft if tools
support it. Missing folder/files or unavailable Library/attachment tools are
reported rather than pretending attachment succeeded. No email is sent by this
prompt. This is an instruction in the copied prompt, not direct Library access
from the extension. Direct extension Gmail sending still uses its locally saved
resume. Preserve your configured oauth2.client_id when updating manifest.json.

## Version 1.6.0: Gmail OAuth and sending inside the extension

Follow GMAIL_SETUP.html (also linked from Settings). Register a Google OAuth
Chrome Extension client for your installed extension ID, replace the client_id
placeholder in manifest.json, enable Gmail API, configure consent/test users,
reload, then Connect Gmail in Settings. This setup requires your Google account;
the ZIP does not contain configured Google credentials. No password or client
secret is used. Tokens stay in the Chrome Identity/worker context.

In the popup: Prepare email to send here > edit > Review email > Send this email.
The review shows the verified sending account, explicit recipient, subject/body,
and saved resume attachment. gmail.send and userinfo.email are the only OAuth
scopes. Recipient is entered and verified by you; never inferred or auto-sent.
The older Gmail compose link remains available as an alternative.

Successful sends record Gmail's message ID locally. Concurrent/repeated sends of
the same review are blocked. Timeouts/server errors are marked uncertain and are
never automatically retried. Check Gmail Sent before trying again. The most recent
send state is shown when you reopen the popup. Review snapshots expire after
30 minutes and are cleared when the browser session ends. Delivery after a service
worker crash can be uncertain; a lingering sending state requires a Sent check.

Creating a new review supersedes any older unsent review snapshot to keep session
storage bounded. Always send from the latest review. Tests use mock Google
responses; real OAuth consent and Gmail delivery require your configured client.

## Version 1.5.0: Analysis inside the extension

Analyze now opens the native extension toolbar popup in your current browser
window. No separate analysis window or tab is created. Pin Job Match Assistant
for easy access. Requires Chrome 127+. If Chrome cannot open the popup, the post
is retained: click the toolbar icon manually. Captured posts and completed
results are isolated per browser tab for the current browser session. Closing
and reopening the popup restores completed results and edited cover-letter text.
An interrupted request is not automatically retried on reopening; use Analyze
selected post if needed. Chrome closes toolbar popups when they lose focus.

Includes all earlier changes: saved-resume matching, inferred job details,
model selection, quota/rate-limit badges, and detection of collapsed “…more” posts.
ChatGPT handoff and Gmail compose still open their respective websites when you
choose those actions. Gmail attachments and sending remain manual.

UPDATE: overwrite files in your existing unpacked folder, Reload the extension,
confirm version 1.5.0, and refresh LinkedIn. No uninstall is needed.

## Version 1.4.2

Includes per-post Analyze buttons for the supplied LinkedIn layout, saved resume
text matching, inferred role/company, cover letters, Gmail compose, the manual
ChatGPT handoff, API model selection, and prominent insufficient_quota/rate_limit
error badges. Resume attachments and sending are manual in Gmail.

If a visible “…more” control or trailing “…more” text is detected, Analyze asks
you to expand the LinkedIn post first rather than analyzing a known partial post.
Trailing control labels are removed from extracted text. The extension does not
auto-click expansion controls; it cannot recover text that LinkedIn has not loaded.
Unknown layouts may still require you to expand the post manually.

UPDATE: overwrite the files in the SAME existing unpacked extension folder;
click Reload at chrome://extensions; confirm 1.4.2; refresh LinkedIn. Keep the
existing installation to retain your saved resume, API key and model settings.

## Version 1.4.1: Prominent error badges in the popup

Analysis errors now appear at the top of both the toolbar popup and post-analysis
window. A recognized quota code shows insufficient_quota with a billing link;
a recognized throttling code shows rate_limit with Retry-After when supplied.
An unclassified 429 shows unknown_429 rather than guessing. Expand Error details
to see the original provider code and message. The badge clears when a new
analysis starts. No automatic retry or account billing change occurs.

## Version 1.4.0: Model selection and actionable API errors

Settings now has an API model dropdown. Enter your API key, click Load models
available to my API key, select a compatible text model, and Save settings.
Your existing model is preserved; Custom model ID permits typing another ID.
The account list includes non-text models, so select one that supports the
Responses API and JSON output. No generation occurs when loading the list.
The choice applies to API analysis only. In the manual ChatGPT workflow, choose
the model inside ChatGPT. Removing the API key retains local matching.

API errors now show the provider error code/message and Retry-After if provided.
429 insufficient_quota indicates quota/billing; rate_limit_exceeded indicates
throttling. Unknown 429 errors are not assumed to mean either one. There are no
automatic retries or silent switches to another model. Billing/usage links are
in Settings. Changing the model cannot repair exhausted API quota.

## Version 1.3.0: Use saved resume, no role/company questions

Clicking Analyze on a post opens the window and immediately analyzes it using
saved resume text. The role and employer are inferred from the post; no field is
required. Optional corrections are under Correct detected details. Unrecognized
fields stay generic instead of blocking or assuming the post author is the employer.
For example, the supplied DRC Systems post resolves to DEVOPS ENGINEER at DRC Systems.

Resume text is now required once in Settings. There is no silent fallback to the
built-in example profile. PDF/DOCX originals remain stored for attachment; paste
their text once as before. Local mode uses conservative title/company patterns
and keyword scoring, not semantic AI. Multiple-role posts are flagged. ChatGPT
handoff asks for inferred details without follow-up questions and remains manual.

## Version 1.2.2: Fix confirmed against supplied LinkedIn HTML

Supports search posts identified by role="listitem" and a componentkey beginning
with update-card-focus. The supplied layout uses hashed class names, so matching
uses these attributes and data-testid="expandable-text-box" for the post body.
The previous selector set matched zero cards in that HTML.

Overwrite the files in the SAME installed extension folder, click Reload at
chrome://extensions, confirm version 1.2.2, and refresh LinkedIn. The badge should
show 1.2.2 and a nonzero post count. Your settings and resume remain in place.
No need to uninstall. Live LinkedIn testing is still not performed here; the
actual supplied HTML is used for selector/extraction regression testing.

## Version 1.2.1: Missing button repair

Overwrite the files in your existing unpacked extension folder, then Reload at
chrome://extensions and refresh LinkedIn. Do not uninstall if you want to keep
your saved resume/settings. Confirm version 1.2.1. In Details > Site access permit
LinkedIn if access is withheld.

The bottom-right badge on content search says “Job Match 1.2.1 loaded” and shows
the detected post count. No badge? Click the toolbar extension and Enable / rescan
LinkedIn post buttons. Badge but 0 posts? Highlight just the job post text and use
Analyze selected text. This fallback does not rely on LinkedIn class names.

Detection now starts from post text, handles more wrappers and semantic cards,
does not discard valid cards just because a nested element also matches a card
selector, and throttles rescans so continuous mutations cannot starve detection.

## Version 1.2: Resume storage

### Use your signed-in ChatGPT in the browser

Click Copy prompt & open ChatGPT after reviewing the captured post. The extension
copies your resume text plus that post to the clipboard and opens https://chatgpt.com/.
Paste and submit the prompt there using your signed-in account. No API key is
needed for this manual handoff. Results stay in ChatGPT; automatic readback into
the extension is not implemented. The extension never reads ChatGPT cookies,
tokens or private endpoints. Clipboard contents include resume text: paste only
where intended. The separate Analyze button uses local matching or the API key.

In Settings upload a PDF, DOCX or TXT (up to 3 MB). The original file is stored in
Chrome local extension storage, not synced or encrypted by this extension. TXT
text is imported automatically. For PDF/DOCX, paste the full resume text in the
Resume text box and click Save settings. This version does not parse PDF/DOCX.
Analysis uses saved resume text ahead of the fallback profile. A saved file with
no text blocks analysis to prevent accidentally using an outdated profile.
Set your signature name too. Replace or remove the resume from Settings.

Download saved resume to attach makes the original available for manual Gmail
attachment. Gmail compose links cannot attach it automatically. No Gmail OAuth,
Gmail API or automatic sending is included. The API mode uses an OpenAI API key,
not the ChatGPT website session. Local mode is explicitly keyword-only, with a
short evidence-based letter template. Review all output before applying.
The raw resume file stays local; API mode sends the saved resume text and selected
job text to OpenAI. Removing the extension clears its local data. Keep a backup.

## Version 1.1: Analyze individual search posts

Replace the unpacked extension files with these files, click Reload at
chrome://extensions, and refresh your LinkedIn tab. Allow the new LinkedIn site
permission if Chrome asks. On /search/results/content/ an Analyze button appears
on supported post cards, including cards added as you scroll manually.

Click Analyze to open a dedicated extension popup window containing ONLY that
post. Expand LinkedIn's “see more” yourself first. Review/edit the captured text,
enter the role and company (the post author is not assumed to be the employer),
then click Analyze selected post. Matching, cover letter, and Gmail compose work
as before. No emails are automatically sent. API generation transmits the reviewed
post and profile only when you click Analyze selected post with a key configured.

This is a popup window, not the toolbar's transient popup. The toolbar remains
available for individual job-detail pages. Unknown LinkedIn layouts may require
selector changes; no live signed-in LinkedIn testing has been performed.
Manual capture is not a guarantee of compliance with LinkedIn's terms.

This extension analyzes the job page you explicitly open, compares it with your DevOps profile, creates a tailored cover letter, and opens a prefilled Gmail application draft for your review.

## Install

1. Extract the ZIP file.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted `job-match-assistant` folder.
5. Pin **Job Match Assistant** to the toolbar.

## Use

1. Open an individual job-detail page on LinkedIn or a company careers site.
2. Click the extension, then **Analyze this job**.
3. Review the match score, matched skills, gaps, and cover letter.
4. Enter a verified recruiter or hiring email and click **Create Gmail draft**.
5. In Gmail, verify the content, attach your resume, and send it yourself.

## Optional OpenAI generation

Open the extension settings and add an OpenAI API key. With a key configured, the job description and candidate profile are sent to the OpenAI API for a more tailored analysis and cover letter. Without a key, all matching and writing happen locally using the built-in profile and template.

Do not commit or share a configured API key. For a production/team deployment, use a small authenticated backend rather than storing the key in the extension.

## Scope and safety

- The extension reads only the active page after you click Analyze.
- It does not crawl listings, automate LinkedIn navigation, click Easy Apply, or submit forms.
- Gmail opens as a draft for human review; nothing is sent automatically.
- Site layouts change. If extraction stops working, update the selectors in `content.js`.

## Files

- `manifest.json` — Chrome Manifest V3 configuration
- `content.js` — active-page job extraction
- `popup.*` — matching, cover letter, and Gmail-draft interface
- `background.js` — optional OpenAI API call
- `options.*` — profile and AI settings
