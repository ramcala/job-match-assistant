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
- Bump `manifest.json` `version` with any user‑visible change.
