# Roadmap

This roadmap describes the intended direction for Gongkao Mistake Review PWA. It separates current early-stage capabilities from future ideas so the project is not presented as more mature than it is.

## Stage 1: Local Mistake Review Workflow

Status: mostly implemented, still early-stage.

- Local mistake storage in browser `localStorage`.
- Mistake card structure with source, subject, module, error tags, formula, summary, correct answer, wrong path, trap, answer, images, and review metadata.
- Review schedule based on simple interval lists for mistake nature.
- Review feedback with `wrong`, `shaky`, and `solid`.
- Backup and restore through JSON export/import.
- Mobile-first PWA interface with app manifest and service worker.
- Configurable AI-assisted organization through a browser-side `/chat/completions` request.
- Task planning by day, week, and month.

## Stage 2: Reliability And Review Quality

Status: planned or experimental.

- Better AI-assisted organization with clearer prompt boundaries and safer validation.
- Duplicate detection improvement beyond simple title checks.
- Image import improvement with file size guidance, clearer limits, and better failure handling.
- Review analytics for progress, weak modules, and recurring error causes.
- Better import/export, including schema validation and clearer migration notes.
- Documentation examples that stay fictional and copyright-safe.

## Stage 3: Reusable Learning Workflow

Status: future direction.

- More exam categories without hard-coding assumptions too deeply.
- Stronger privacy controls and clearer API-key handling.
- Better offline support and update behavior.
- Reusable local-first learning workflow beyond one personal study setup.
- Improved contributor documentation, issue templates, and release notes.
- Optional richer data portability, while preserving user control.

## Non-Goals

- This project is not a full public bank of civil service exam questions.
- This project does not redistribute official exam questions or copyrighted explanations.
- This project does not guarantee score improvement.
- This project is not affiliated with an exam authority.
- This project is not a mature cloud service.
