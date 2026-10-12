# Publishing to the Chrome Web Store (one-click install)

"Load unpacked" needs Developer mode. For a true **Add to Chrome** button with no local steps, publish
the extension to the Chrome Web Store.

## One-time setup
1. Create a **Chrome Web Store developer account** at
   <https://chrome.google.com/webstore/devconsole> (one-time **$5** registration fee).
2. Prepare store assets: a 128×128 icon, at least one 1280×800 (or 640×400) screenshot, a short and a
   detailed description, and a privacy policy URL (you can host one on this GitHub Pages site).

## Package & upload
1. Zip the extension folder (the one with `manifest.json` at its root — not a parent folder):
   ```
   cd job-match-assistant
   zip -r ../job-match-assistant.zip . -x ".git/*" "assets/*.gif" "docs/*" "*.cjs" "*.md" "index.html" ".nojekyll"
   ```
   (Keep the zip to runtime files: manifest, JS, HTML, CSS, `lib/`, icons. Docs/tests aren't needed.)
2. In the developer console, **Add new item** and upload the zip.
3. Fill in the listing, category, screenshots, and privacy fields.
4. Add an **icons** block to `manifest.json` first (the store requires icons) — e.g. `icons/16.png`,
   `48.png`, `128.png`.
5. Submit for review. Approval usually takes a few days.

## After it's live
- Replace the **Add to Chrome** button links in `index.html` and `README.md` with your store URL
  (`https://chromewebstore.google.com/detail/<your-extension-id>`).
- Users then install with one click; no Developer mode, no cloning.

## Notes
- The Gmail OAuth redirect URI changes to the store-assigned extension ID; update your Google Cloud
  OAuth client's redirect URI to match after publishing.
- GitHub Pages is only the landing/marketing page; it cannot serve an installable extension (Chrome
  blocks off-store installs).
