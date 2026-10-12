# Contributing

Thanks for your interest! This is an open project (GPL‑3.0 copyleft — distributed derivatives must stay open source).

1. Fork and create a branch.
2. Make your change — keep it vanilla JS (no build step, no runtime deps).
3. Run the tests: `for t in *.cjs; do node "$t"; done` — all must pass.
4. Bump the `version` in `manifest.json` with any user‑visible change and add a `CHANGELOG.md` entry: a **major** change (breaking or large redesign, new permissions/scopes that force users to reconnect, data-format changes) bumps the **major** number (e.g. 1.47.0 → 2.0.0); a new feature or notable improvement bumps the **minor** number (1.47.0 → 1.48.0); a very small fix (typo, tiny bug, styling tweak) bumps the **patch** number (1.47.0 → 1.47.1).
5. Open a pull request describing what changed and how you tested it.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the architecture and file map.

Please don't commit personal data (résumé, API keys, `job-match-assistant-data.json`,
`applied-jobs-backup.json`) — they're covered by `.gitignore`.
