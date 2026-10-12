# Contributing

Thanks for your interest! This is an open project (GPL‑3.0 copyleft — distributed derivatives must stay open source).

1. Fork and create a branch.
2. Make your change — keep it vanilla JS (no build step, no runtime deps).
3. Run the tests: `for t in *.cjs; do node "$t"; done` — all must pass.
4. Bump the `version` in `manifest.json` for any user‑visible change.
5. Open a pull request describing what changed and how you tested it.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the architecture and file map.

Please don't commit personal data (résumé, API keys, `job-match-assistant-data.json`,
`applied-jobs-backup.json`) — they're covered by `.gitignore`.
