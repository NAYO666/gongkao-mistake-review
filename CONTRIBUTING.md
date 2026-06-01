# Contributing

Thanks for considering a contribution. This project is an early-stage local-first PWA for mistake-centered review, so contributions should keep the scope careful and honest.

## Project Boundaries

Please keep these boundaries in mind:

- Do not add full civil service exam papers, official question sets, paid course materials, or large copyrighted excerpts.
- Do not commit API keys, private screenshots, personal study records, exported backups, or local machine paths.
- Do not describe experimental features as stable.
- Do not present the project as official, broadly adopted, mature for critical use, or able to promise score outcomes.
- Do not change the existing `localStorage` key or data structure without a migration plan.

## Good Contributions

Useful contribution areas include:

- clearer documentation;
- fictional examples and schemas;
- safer import/export behavior;
- better AI-result validation;
- improved local-first privacy notes;
- accessibility and mobile PWA refinements;
- tests or lightweight checks for parsing and data migration;
- issue reports with steps to reproduce.

## AI And API Keys

The app lets users configure a browser-side AI endpoint. Never paste a real API key into:

- source files;
- README or docs;
- examples;
- issues;
- screenshots;
- commit messages.

AI output should be treated as a draft. The user should confirm the final mistake card before saving.

## Example Content

Examples should be mock, fictional, or clearly sample-only. If a sample mentions a civil service exam context, keep it generic and avoid copying real questions, answer explanations, or proprietary material.

## Development Notes

This folder currently contains a static front-end app:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `icon.svg`

No build step or package dependency is required for the current app. PWA behavior works best when the folder is served over HTTP or HTTPS.
