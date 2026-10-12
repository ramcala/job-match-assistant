# Setup & first run

## 1. Load the extension
1. Download/clone the repo.
2. Go to `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable **Developer mode**.
4. Click **Load unpacked** → select the folder containing `manifest.json`.
5. Pin **Job Match Assistant** to the toolbar.

Keep the same folder location. The extension ID is derived from it; moving it changes the ID and
breaks the Gmail OAuth redirect and saved connections.

## 2. Add your résumé
Open **Settings** (⚙). Either:
- paste plain résumé text into **Résumé text**, or
- upload a **PDF/DOCX** and click **Generate & clean résumé text from file** (uses pdf.js locally;
  the cleanup step uses your selected analysis provider).

This text is reused for every analysis, so you only do it once.

## 3. Pick an analysis mode
In the popup, choose **Analyze with**: Local (no key), OpenAI API, ChatGPT, or Gemini.
See [ANALYSIS_MODES.md](ANALYSIS_MODES.md).

## 4. (Optional) Connect the extras
- **Gmail** to send/draft applications — [GMAIL.md](GMAIL.md)
- **Email finder** to look up recruiter emails — [EMAIL_FINDER.md](EMAIL_FINDER.md)
- **Portable folder** to sync across laptops — [FOLDER_SYNC.md](FOLDER_SYNC.md)

## Updating
After editing files, return to `chrome://extensions` and click the **reload** icon on the card.
The version shown should match `manifest.json`.
