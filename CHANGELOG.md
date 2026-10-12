# Changelog

All notable changes are listed newest first. Versions match `manifest.json`.

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

## v1.33.0 and earlier
Early development: applied-jobs tracking, multi-platform job boards, Gmail job-alert inbox import, résumé PDF/DOCX extraction, email finder, and LinkedIn Easy Apply. See the commit history for detail.
