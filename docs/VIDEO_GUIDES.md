# Guide video scripts

Ready‑to‑record scripts for the Job Match Assistant guide videos. Each one is short (60–120s),
screen‑recorded. You read the narration while doing the steps. On‑screen text = captions/titles to
overlay.

## Recording setup (once)
- **Tool:** OBS Studio (free) or Loom / QuickTime screen recording.
- **Resolution:** 1920×1080, record the Chrome window only.
- **Zoom:** bump Chrome to 110–125% so text is readable on small screens.
- **Privacy:** use a throwaway résumé, a test Gmail, and blur/skip real API keys. Never show a real
  key on screen — paste it off‑camera or blur it in edit.
- **Pace:** pause ~1s after each click so viewers can follow.
- **Export:** MP4, upload to YouTube (unlisted or public) and link each one in the README table.

---

## 0. Overview (90s) — "What it does"
On‑screen title: *Job Match Assistant — analyze, tailor, apply.*
Narration:
> "Job Match Assistant is a free, open‑source Chrome extension. Open any job, click Analyze, and it
> scores the role against your résumé, writes a cover letter, finds the recruiter's email, and lets
> you send the application over your own Gmail — without leaving the page. Everything runs in your
> browser with your own keys. Let's set it up."
Shots: open a LinkedIn job → click ⚡ Analyze → show score + cover letter → show the Send button.

---

## 1. Install from source (60s)
On‑screen title: *Install in 5 steps.*
Steps / narration:
1. "Download the repo from GitHub and unzip it." (show the green Code → Download ZIP)
2. "Go to chrome://extensions." (type it in the address bar)
3. "Turn on Developer mode, top right." (toggle it)
4. "Click Load unpacked and pick the folder with manifest.json." (select folder)
5. "Pin it to the toolbar. Done." (pin icon)
Caption: *Keep the folder where it is — moving it changes the extension ID.*

---

## 2. Add your résumé (60s)
On‑screen title: *One‑time résumé setup.*
Narration:
> "Click the gear to open Settings. Either paste your résumé text, or upload a PDF and click
> Generate & clean — it extracts and tidies the text locally. This is reused for every job, so you
> only do it once."
Shots: Settings → upload PDF → Generate & clean → show cleaned text → Save.

---

## 3. Analysis modes (90s)
On‑screen title: *Pick how it analyzes.*
Narration:
> "In the popup, choose Analyze with. Local keyword matching is instant and private — nothing leaves
> your browser. OpenAI API uses your key for a full cover letter. Or ChatGPT and Gemini run through
> a tab you're already logged into — no API key. Pick one and click Analyze."
Shots: open the dropdown showing all four → run Local → then run OpenAI → show the richer result.
Caption on browser modes: *Automates the consumer site; keep the popup open while it runs.*

---

## 4. Analyze a job + send the application (120s) — the main one
On‑screen title: *Analyze → cover letter → send.*
Narration:
> "On a job page, click Analyze with Job Match, right by Apply and Save. You get a match score,
> matched and missing skills, and a tailored cover letter. If the post has an email it's filled in
> automatically; otherwise click Find email. Then click Send email — review the exact message — and
> send it from your own Gmail. Prefer a draft? Use Save as draft instead."
Shots: ⚡ Analyze → score + letter → recipient auto‑filled → ✉️ Send email → review panel → Send →
"Sent successfully" → show it logged in the applied tracker.

---

## 5. Connect Gmail (120s)
On‑screen title: *Send over your own Gmail.*
Narration (follow docs/GMAIL.md):
> "Sending uses your own Gmail through Google OAuth. In Google Cloud Console, enable the Gmail API,
> set up the consent screen, add yourself as a test user, and create an OAuth client of type Web
> application. Copy the redirect URI from the extension's Settings into the client. Paste the Client
> ID back into Settings, Save, then Connect Gmail."
Shots: Cloud Console (enable API → consent → test user → create Web client → paste redirect URI) →
Settings (paste client ID → Save → Connect → Google consent → connected).
Caption: *Blur your Client ID in editing. Use a Web application client, not Chrome extension.*

---

## 6. Find recruiter emails (75s)
On‑screen title: *Find the email.*
Narration:
> "In Settings, pick a provider — Hunter searches by company domain, Apollo and RocketReach match a
> named person. Paste the key. Back on an analysis, click Find email. Results are cached, so the same
> company never costs a second lookup."
Shots: Settings → provider dropdown + key → analysis → Find email → result → show "(saved from an
earlier search)" on a repeat.

---

## 7. LinkedIn Easy Apply (75s)
On‑screen title: *Easy Apply, safely.*
Narration:
> "Fill your standard answers once in Settings. On an Easy Apply job, click Auto Easy Apply — it
> fills what it's sure of and stops when a required field is blank, so it never submits a guess. Hit
> a new screening question? Answer it, then click Remember my answers and it learns it for next
> time. Auto‑submit is off by default."
Shots: Settings answers → Easy Apply job → Auto Easy Apply → it pauses → Remember my answers.

---

## 8. Portable folder — switch laptops (75s)
On‑screen title: *Take your data anywhere.*
Narration:
> "In Settings, under Portable folder, click Link folder and pick one inside Google Drive or
> Dropbox. Click Save to folder. On another laptop, install the extension, link the same folder, and
> click Load from folder — résumé, settings, and your applied list all come back."
Shots: link folder → Save → (second machine) link same folder → Load → data restored.

---

## README video table (paste once you have links)
```
## Guide videos
| Topic | Video |
|-------|-------|
| Overview | <link> |
| Install | <link> |
| Résumé setup | <link> |
| Analysis modes | <link> |
| Analyze & send | <link> |
| Connect Gmail | <link> |
| Find emails | <link> |
| Easy Apply | <link> |
| Portable folder | <link> |
```
