# Development

Manifest V3 extension, no build step, no runtime dependencies. Edit files and reload at
`chrome://extensions`.

## Layout
| File | Role |
|------|------|
| `manifest.json` | MV3 manifest: permissions, content‑script matches, host permissions |
| `background.js` | Service worker: OpenAI calls, ChatGPT/Gemini automation, JSON extraction, email finder (+cache), message router |
| `gmail.js` | Gmail OAuth + MIME build + send/draft + job‑alert email parsing |
| `popup.html` / `popup.js` / `styles.css` | Toolbar popup: analysis UI, job boards, inbox, applied tracker, send/draft |
| `options.html` / `options.js` / `options.css` | Settings: résumé, keys, Gmail wizard, Easy Apply answers, portable folder |
| `search-posts.js` | LinkedIn feed/job decorations + inline job‑page **Analyze** button + hiring‑team capture |
| `analyze-anywhere.js` | Generic job‑card detector + floating Analyze on non‑LinkedIn boards |
| `easy-apply.js` | LinkedIn Easy Apply autofill + learner |
| `content.js` / `job-details.js` | Page job extraction + email/role inference |
| `resume-extract.js` | PDF (pdf.js) / DOCX text extraction with column ordering |
| `folder-sync.js` | File System Access portable‑folder sync (options + popup) |
| `letter-pdf.js` | Tiny dependency-free PDF writer used by the cover-letter download |
| `gmail-ui.js` | Gmail connect/compose/review/send UI wiring |
| `lib/` | Bundled pdf.js (legacy UMD build) |

## Storage model
- `chrome.storage.local` holds durable data (résumé, settings, `appliedJobs`, `emailCache`,
  `eaLearned`, …). It is set to `TRUSTED_CONTEXTS`, so content scripts request data via runtime
  messages to the background rather than reading it directly.
- `chrome.storage.session` holds per‑tab working state.
- The portable folder mirrors the durable keys to a JSON file (see FOLDER_SYNC.md).

## Tests
Plain Node, no dependencies. Run all suites:

```bash
for t in *.cjs; do node "$t"; done
```

Each `*-tests.cjs` loads a source file in a `vm` context with mocked `chrome`/`fetch` and asserts
behaviour (email finder ranking + providers + cache, Easy Apply mapping + learned answers, Gmail
MIME/parse, inbox parsing, model listing, post detection, JSON extraction). Keep them green before
committing.

## Conventions
- No external runtime libraries; everything is vanilla JS so it loads unpacked with no build.
- Injected UI uses shadow DOM and a marker attribute so the page's own scripts/observers ignore it.
- Bump `manifest.json` `version` with any user‑visible change and add a `CHANGELOG.md` entry: a **major** change (breaking or large redesign, new permissions/scopes that force users to reconnect, data-format changes) bumps the **major** number (e.g. 1.47.0 → 2.0.0); a new feature or notable improvement bumps the **minor** number (1.47.0 → 1.48.0); a very small fix (typo, tiny bug, styling tweak) bumps the **patch** number (1.47.0 → 1.47.1).

## Continuous build (ZIP)
`.github/workflows/build-zip.yml` rebuilds `job-match-assistant.zip` on every push that touches
runtime source and commits it back. It cannot loop, for several reasons:
- The `paths:` trigger lists only runtime files — the ZIP itself is **not** a trigger path, so the
  bot's commit (which changes only the ZIP) never starts a new run.
- Pushes made with the built-in `GITHUB_TOKEN` do not trigger further workflow runs.
- The commit message carries `[skip ci]`, and the job commits only when the ZIP actually changed.

One-time repo setting: **Settings → Actions → General → Workflow permissions → "Read and write
permissions"** must be enabled so the job can push the rebuilt ZIP. Rebuild locally anytime with
`bash scripts/build-zip.sh`.
