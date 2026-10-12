#!/usr/bin/env bash
# Rebuild the ready-to-load extension ZIP (runtime files only).
set -e
cd "$(dirname "$0")/.."
rm -f job-match-assistant.zip
zip -q -r job-match-assistant.zip \
  manifest.json background.js \
  popup.html popup.js letter-pdf.js styles.css \
  options.html options.js options.css \
  content.js job-details.js search-posts.js analyze-anywhere.js easy-apply.js resume-extract.js \
  gmail.js gmail-ui.js folder-sync.js GMAIL_SETUP.html \
  icons lib LICENSE
echo "Built job-match-assistant.zip"
