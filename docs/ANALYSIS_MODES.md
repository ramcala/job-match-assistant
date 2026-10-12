# Analysis modes

Choose the mode in the popup's **Analyze with** dropdown. The choice is saved and persists.

## Local keyword matching
No key, nothing leaves the browser. Scores overlap between your résumé and the job text. Good for a
fast, private first pass; it does not write a real cover letter (keyword overlap only).

## OpenAI API
Uses the official API. In **Settings**, paste your OpenAI API key and pick a model (default
`gpt-5-mini`). Your résumé and the job text are sent to OpenAI for that request only.
Get a key at <https://platform.openai.com/api-keys>.

## ChatGPT / Gemini (browser session)
Runs analysis through your **already‑signed‑in** ChatGPT or Gemini tab — no API key. Clicking
Analyze opens a pinned background tab, types in your résumé + the job, submits, and reads the
structured JSON reply back into the popup.

- Keep the popup open while it runs (up to ~2 minutes).
- You must be logged in to chatgpt.com / gemini.google.com in this browser.
- This automates the consumer web UI, which is against those sites' terms of service and depends on
  their current page markup; it can break when they change their layout.
- If the reply doesn't come back automatically, copy it from the opened tab and use **Paste reply
  JSON** in the popup — it extracts the result for you.

Selectors for the browser‑session automation live at the top of the browser‑session section in
`background.js`; update them if a site changes its markup.
